// super submarine!

function createSphereWireframe(position, params){
	var geometry = new THREE.SphereGeometry(4, 8, 6, 0, 6.3, 0, 3.1);
	var material = new THREE.MeshBasicMaterial({color: 0x3333ff});
	var sphere = new THREE.LineSegments(new THREE.WireframeGeometry(geometry)); // new THREE.Mesh(geometry, material)
	var x = position.x || 0;
	var y = position.y || 8;
	var z = position.z || -25;
	sphere.position.set(x, y, z);
	return sphere;
}

//https://stackoverflow.com/questions/38305408/threejs-get-center-of-object
function getCenter(mesh){
	var mid = new THREE.Vector3();
	var geometry = mesh.geometry;
	
	geometry.computeBoundingBox();
	mid.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x)/2;
	mid.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y)/2;
	mid.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z)/2;
	
	mesh.localToWorld(mid);
	return mid;
}

function getForward(mesh){
	var forwardVec = new THREE.Vector3();
	mesh.getWorldDirection(forwardVec);	
	return forwardVec;
}

function checkCollision(mesh, raycaster){
	var top = new THREE.Vector3(0, 1, 0);
	var bottom = new THREE.Vector3(0, -1, 0);
	var left = new THREE.Vector3(-1, 0, 0);
	var right = new THREE.Vector3(1, 0, 0);
	var front = new THREE.Vector3(0, 0, -1);
	var back = new THREE.Vector3(0, 0, 1);
	var dirToCheck = [
		top,
		bottom,
		left,
		right,
		front,
		back
	];
	var objCenter = getCenter(mesh);
	
	for(var i = 0; i < dirToCheck.length; i++){
		var dir = dirToCheck[i];
		raycaster.set(objCenter, dir);
		var intersects = raycaster.intersectObjects(scene.children);
		for(var j = 0; j < intersects.length; j++){
			//console.log(intersects[j]);
			if(objCenter.distanceTo(intersects[j].point) < 2.0){
				//console.log("object collided! direction: " + dir.x + ", " + dir.y + ", " + dir.z);
				return true;
			}
		}
	}
	return false;
}

function drawForwardVector(mesh){
	var forwardVec = new THREE.Vector3();
	forwardVec.applyQuaternion(mesh.quaternion);
	
	// create a vector 
	var point1 = getCenter(mesh); //new THREE.Vector3(forwardVec.x, forwardVec.y, forwardVec.z);
	var point2 = new THREE.Vector3(forwardVec.x, forwardVec.y, forwardVec.z); 
	point2.multiplyScalar(2);
	
	var points = [point1, point2];
	
	var material = new THREE.LineBasicMaterial({color: 0x0000ff});
	var geometry = new THREE.BufferGeometry().setFromPoints(points);
	var line = new THREE.Line(geometry, material);
	scene.add(line);
}

function createSpotlight(){
	var spotlight = new THREE.SpotLight(0xffffff, 1.8, 50, 0.35, 1.0, 1.2);
	spotlight.castShadow = true;
	
	spotlight.shadow.mapSize.width = 20;
	spotlight.shadow.mapSize.height = 20;
	
	spotlight.shadow.camera.near = 10;
	spotlight.shadow.camera.far = 20;
	spotlight.shadow.camera.fov = 10;
	
	return spotlight;
}

//import { Water } from '/node_modules/three/examples/jsm/objects/Water.js';
// https://forums.ogre3d.org/viewtopic.php?t=47645

// https://stemkoski.github.io/Three.js/Shader-Animate.html
var waterShader = {

	vertexShader: [
		'varying vec2 vUv;',
		'void main(){',
		'   vUv = uv;',
		'   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );}'
	].join('\n'),
	
	fragmentShader: [
		'uniform sampler2D baseTexture;',
		'uniform float baseSpeed;',
		'uniform sampler2D noiseTexture;',
		'uniform float noiseScale;',
		'uniform float alpha;',
		'uniform float time;',
		'varying vec2 vUv;',
		'void main() {',
		'	vec2 uvTimeShift = vUv + vec2( -0.7, 1.2 ) * time * baseSpeed;'	,
		'	vec4 noiseGeneratorTimeShift = texture2D( noiseTexture, uvTimeShift );',
		'	vec2 uvNoiseTimeShift = vUv + noiseScale * vec2( noiseGeneratorTimeShift.r, noiseGeneratorTimeShift.b );',
		'	vec4 baseColor = texture2D( baseTexture, uvNoiseTimeShift );',
		'	baseColor.a = alpha;',
		'	gl_FragColor = baseColor;}',
	].join('\n')
}

// https://github.com/evanw/webgl-water
// https://github.com/donmccurdy/three-gltf-viewer/blob/master/src/viewer.js
const el = document.getElementById("container");
const fov = 60;
const defaultCamera = new THREE.PerspectiveCamera(fov, el.clientWidth / el.clientHeight, 0.01, 1000);
const keyboard = new THREEx.KeyboardState();
const container = document.querySelector('#container');
const raycaster = new THREE.Raycaster();
const loader = new THREE.GLTFLoader();

const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize(el.clientWidth, el.clientHeight);	
container.appendChild(renderer.domElement);

//https://threejs.org/docs/#examples/en/controls/OrbitControls
// or this?: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/TrackballControls.js
//const controls = new OrbitControls(defaultCamera, renderer.domElement);

const camera = defaultCamera;
camera.position.set(0,2,0);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);	
scene.add(camera);


let pointLight = new THREE.PointLight(0xffffff, 1, 0); //new THREE.pointLight( 0xffffff );
pointLight.position.set(0, 10, -35);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 512;
pointLight.shadow.mapSize.height = 512;
pointLight.shadow.camera.near = 10;
pointLight.shadow.camera.far = 100;
pointLight.shadow.camera.fov = 30;
scene.add(pointLight);

const clock = new THREE.Clock();
let sec = clock.getDelta();
let moveDistance = 60 * sec;
let rotationAngle = (Math.PI / 2) * sec;

// need to keep some state 
const state = {
}

let loadedModels = [];

function getModel(modelFilePath, side, name){
	return new Promise((resolve, reject) => {
		loader.load(
			modelFilePath,
			function(gltf){
				gltf.scene.traverse((child) => {
					if(child.type === "Mesh"){
					
						let material = child.material;
						//console.log(material)
						let geometry = child.geometry;
						let obj = new THREE.Mesh(geometry, material);
						
						obj.scale.x = child.scale.x * 20;
						obj.scale.y = child.scale.y * 20;
						obj.scale.z = child.scale.z * 20;
						obj.rotateOnAxis(new THREE.Vector3(0,1,0), Math.PI / 2);
					
						obj.side = side; // player or enemy mesh?
						obj.name = name;
						resolve(obj);
					}
				});
			},
			// called while loading is progressing
			function(xhr){
				console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
			},
			// called when loading has errors
			function(error){
				console.log('An error happened');
				console.log(error);
			}
		);
	});
}

var newSphere = createSphereWireframe({}, {});
var newSphere2 = createSphereWireframe({x: 5, y: 6, z: -45}, {});
scene.add(newSphere);
scene.add(newSphere2);

// https://threejs.org/docs/#api/en/textures/Texture
// create a mesh, apply ocean shader on it 
loadedModels.push(getModel('models/submarine1.glb', 'player', 'p1'));
loadedModels.push(getModel('models/battleship2.glb', 'player2', 'p2'));
loadedModels.push(getModel('models/oceanfloor.glb', 'none', 'bg'));
loadedModels.push(getModel('models/whale-shark-final.glb', 'none', 'npc'));
let thePlayer = null;

Promise.all(loadedModels).then((objects) => {
	objects.forEach((mesh) => {
		if(mesh.name === "p2"){
			// battleship
			mesh.position.set(-15, 25, -50);
			mesh.scale.x *= 3;
			mesh.scale.y *= 3;
			mesh.scale.z *= 3;
		}else if(mesh.name === "bg"){
			// ocean floor
			mesh.position.set(0, -20, 0);
		}else if(mesh.name === "npc"){
			// whale shark
			mesh.position.set(-80, 2, -120);
			mesh.scale.x /= 2;
			mesh.scale.y /= 2;
			mesh.scale.z /= 2;
		}else{
			// the local axis of the imported mesh is a bit weird and not consistent with the world axis. so, to fix that,
			// put it in a group object and just control the group object! the mesh is also just orientated properly initially when placed in the group.
			var group = new THREE.Group();
			group.add(mesh);
			thePlayer = group;
			mesh = group;
			mesh.position.set(0, 0, -10);
			mesh.originalColor = group.children[0].material; // this should only be temporary
			//console.log(group.children[0].material);
			
			// alternate materials used for the sub depending on condition 
			var hitMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
			mesh.hitMaterial = hitMaterial;
			mesh.originalMaterial = mesh.children[0].material;
			
			// give the submarine a spotlight
			// the spotlight should be facing downwards!
			var spotlight = createSpotlight(); //createSphereWireframe({}, {});
			thePlayer.spotlight = spotlight;
			thePlayer.spotlightVisible = false;
			spotlight.visible = false;
			scene.add(spotlight);
			
			keyboard.domElement.addEventListener("keydown", (evt) => {
				// this is supposed to turn on headlights for the sub?
				if(keyboard.eventMatches(evt, "X")){
					// we do this stuff here instead of update because on keyup, the state of key X in the keyboard object gets reset to false, 
					// which we don't want (since we're trying to set a state)
					if(!thePlayer.spotlightVisible){
						thePlayer.spotlightVisible = true;
						thePlayer.spotlight.visible = true;
					}else{
						// make sure spotlight is not visible
						thePlayer.spotlight.visible = false;
						thePlayer.spotlightVisible = false;
					}
				}
			});
			
			animate();
		}
		
		mesh.castShadow = true;
		//mesh.receiveShadow = true;
		scene.add(mesh);
		renderer.render(scene, camera);
	})
});

function update(){
	sec = clock.getDelta();
	moveDistance = 20 * sec;
	rotationAngle = (Math.PI / 2) * sec;
	var changeCameraView = false;
	
	if(keyboard.pressed("shift")){
		changeCameraView = true;
	}
	
	if(keyboard.pressed("W")){
		// note that this gets called several times with one key press!
		// I think it's because update() in requestAnimationFrames gets called quite a few times per second
		thePlayer.translateZ(-moveDistance);
	}
	
	if(keyboard.pressed("S")){
		thePlayer.translateZ(moveDistance);
	}
	
	if(keyboard.pressed("A")){
		// rotate the sub and the camera appropriately
		var axis = new THREE.Vector3(0, 1, 0);
		thePlayer.rotateOnAxis(axis, rotationAngle);
	}
	
	if(keyboard.pressed("D")){
		var axis = new THREE.Vector3(0, 1, 0);
		thePlayer.rotateOnAxis(axis, -rotationAngle);
	}
	
	if(keyboard.pressed("Q")){
		var axis = new THREE.Vector3(0, 0, 1);
		thePlayer.rotateOnAxis(axis, rotationAngle);
	}
	
	if(keyboard.pressed("E")){
		var axis = new THREE.Vector3(0, 0, 1);
		thePlayer.rotateOnAxis(axis, -rotationAngle);
	}
	
	if(keyboard.pressed("up")){
		// rotate up (note that we're rotating on the mesh's axis. its axes might be configured weird)
		// the forward vector for the mesh might be backwards and perpendicular to the front of the sub
		// up arrow key
		// NEED TO CLAMP ANGLE
		var axis = new THREE.Vector3(1, 0, 0);
		thePlayer.rotateOnAxis(axis, rotationAngle);
	}
	
	if(keyboard.pressed("down")){
		// down arrow key
		// CLAMP ANGLE!
		var axis = new THREE.Vector3(1, 0, 0);
		thePlayer.rotateOnAxis(axis, -rotationAngle);
	}
	
	// make sure sub spotlight stays with the sub
	if(thePlayer.spotlightVisible){
		// make sure the spotlight is visible
		var spotlight = thePlayer.spotlight;
		var pos = getCenter(thePlayer.children[0]); // the submarine's group obj should only have 1 child
		spotlight.position.x = pos.x;
		spotlight.position.y = pos.y;
		spotlight.position.z = pos.z;
	}
	
	// check for collision?
	// check top, left, right, bottom, front, back? 
	var hasCollision = checkCollision(thePlayer.children[0], raycaster);
	if(hasCollision){
		thePlayer.children[0].material = thePlayer.hitMaterial;
	}else{
		thePlayer.children[0].material = thePlayer.originalMaterial;
	}
	
	// how about first-person view?
	var relCameraOffset;
	if(!changeCameraView){
		relCameraOffset = new THREE.Vector3(0, 3, 12);
	}else{
		relCameraOffset = new THREE.Vector3(0, 3, -12);
	}
	
	var cameraOffset = relCameraOffset.applyMatrix4(thePlayer.matrixWorld);
	camera.position.x = cameraOffset.x;
	camera.position.y = cameraOffset.y;
	camera.position.z = cameraOffset.z;
	camera.lookAt(thePlayer.position);

}

function animate(){
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
	update();
}
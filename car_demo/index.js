

const el = document.getElementById("container");
const fov = 60;
const defaultCamera = new THREE.PerspectiveCamera(fov, el.clientWidth / el.clientHeight, 0.01, 1000);
const keyboard = new THREEx.KeyboardState();
const container = document.querySelector('#container');
const raycaster = new THREE.Raycaster();
const loadingManager = new THREE.LoadingManager();

loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
	// set up a loading bar
	let container = document.getElementById("container");
	let containerDimensions = container.getBoundingClientRect();
	let left = (containerDimensions.left + Math.round(.40 * containerDimensions.width)) + "px";
	let top = (containerDimensions.top + Math.round(.50 * containerDimensions.height)) + "px";
	let loadingBarContainer = createProgressBar("loading", "#00ff00");
	loadingBarContainer.style.left = left;
	loadingBarContainer.style.top = top;
	container.appendChild(loadingBarContainer);
}

loadingManager.onLoad = () => {
	document.getElementById("container").removeChild(
		document.getElementById("loadingBarContainer")
	);
}

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
	let bar = document.getElementById("loadingBar");
	bar.style.width = (parseInt(bar.parentNode.style.width) * (itemsLoaded/itemsTotal)) + 'px';
}

loadingManager.onError = (url) => {
	console.log("there was an error loading :(");
}

const loader = new THREE.GLTFLoader(loadingManager);

const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize(el.clientWidth, el.clientHeight);	
container.appendChild(renderer.domElement);

const camera = defaultCamera;
camera.position.set(0,5,20);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);	
scene.add(camera);


let pointLight = new THREE.PointLight(0xffffff, 1, 0);
pointLight.position.set(0, 20, -25);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 0;
pointLight.shadow.mapSize.height = 0;
pointLight.shadow.camera.near = 10;
pointLight.shadow.camera.far = 100;
pointLight.shadow.camera.fov = 70;
scene.add(pointLight);


let hemiLight = new THREE.HemisphereLight(0xffffff);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const clock = new THREE.Clock();
let sec = clock.getDelta();
let moveDistance = 60 * sec;
let rotationAngle = (Math.PI / 2) * sec;

let loadedModels = [];

function getModel(modelFilePath, name){
	
	return new Promise((resolve, reject) => {
		loader.load(
			modelFilePath,
			function(gltf){	
			
				let car = new THREE.Group();
				
				// the car and its wheels are separate meshes.
				// make a group and add all of them to it
				gltf.scene.traverse((child) => {
					
					if(child.type === "Mesh"){
						
						if(name === "car"){
							
							let geometry = child.geometry;
							let material = child.material;
							let obj = new THREE.Mesh(geometry, material);
							
							obj.scale.x = child.scale.x * 1.3;
							obj.scale.y = child.scale.y * 1.3;
							obj.scale.z = child.scale.z * 1.3;
							
							obj.name = child.name;
							
							car.add(obj);
						}
					}
				});
				
				// for the car (or really any scene with multiple meshes)
				if(name === "car"){
					console.log(car);
					resolve(car);
				}
				
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


// https://threejs.org/docs/#api/en/textures/Texture
loadedModels.push(getModel('models/porsche.gltf', 'car'));

let thePlayer = null;
let terrain = null;
let wheelAxesHelper = new THREE.AxesHelper(2);
let carAxesHelper = new THREE.AxesHelper(4);

let firstPersonViewOn = false;
let sideViewOn = false;
let bottomViewOn = false;

Promise.all(loadedModels).then((objects) => {
	objects.forEach((mesh) => {
		if(mesh.name === "bg"){
			mesh.position.set(0, 0, 0);
			mesh.receiveShadow = true;
			terrain = mesh;
			scene.add(mesh);
		}else{
			console.log(mesh);
			thePlayer = mesh;

			// add a plane
			let planeGeometry = new THREE.PlaneGeometry(80, 80);
			let texture = new THREE.TextureLoader().load('depositphotos_65970561-stock-photo-asphalt-texture.jpg');
			let material = new THREE.MeshBasicMaterial({map: texture}); //color: 0x787878});
			let plane = new THREE.Mesh(planeGeometry, material); 
			plane.position.set(0, -1, 0);
			plane.rotateX((3*Math.PI)/2);
			scene.add(plane);
			
			// remember that the car is a THREE.Group!
			thePlayer.position.set(0, -0.5, -8);
			
			thePlayer.frontWheels = [];
			thePlayer.wheels = [];
			
			// set the wheels right 
			thePlayer.children.forEach((child) => {
				
				if(child.name.indexOf("Cube") === 0){
					thePlayer.wheels.push(child);
				}
				
				if(child.name === "Cube001"){
					// front
					child.position.set(2, 0, -1.8);
					thePlayer.frontWheels.push(child);
					child.add(wheelAxesHelper); // good for debugging rotations!
				}else if(child.name === "Cube002"){
					// front
					child.rotateY(Math.PI);
					child.position.set(2, 0, 1.8);
					thePlayer.frontWheels.push(child);
				}else if(child.name === "Cube003"){
					// rear
					child.rotateY(Math.PI);
					child.position.set(-2.9, 0, 1.7);
				}else if(child.name === "Cube004"){
					// rear
					child.position.set(-2.9, 0, -1.7);
				}else{
					// car body
					child.add(carAxesHelper);
					thePlayer.body = child;
				}
			});

			thePlayer.castShadow = true;
			scene.add(thePlayer);
			
			animate();
		}
	})
});


function keydown(evt){
	if(evt.keyCode === 16){
		// shift key	
	}else if(evt.keyCode === 49){
		// toggle first-person view
	}else if(evt.keyCode === 50){
		// toggle side view
		firstPersonViewOn = false;
		bottomViewOn = false;
		sideViewOn = !sideViewOn;
	}else if(evt.keyCode === 51){
		firstPersonViewOn = false;
		sideViewOn = false;
		bottomViewOn = !bottomViewOn;
	}
}

document.addEventListener("keydown", keydown);



function move(car, rotationAngle){
	// rotate the wheels of the car
	// the rear wheels should act as a pivot point for the front wheels to go around!
	// so that way when the front wheels are turned, they will always end up moving in a 
	// circle, as what happens in real life :)
	
	car.wheels.forEach((wheel) => {
		wheel.rotateZ(rotationAngle*5);
	});
	
	let wheelForward = getForward(car.frontWheels[0]);
	
	// since the forward is based off the z-axis, and the z-axis for the wheel (and all the meshes in this case)
	// actually is perpendicular to the 'front' of the wheel, rotate the forward
	// so we get it pointing in the direction we want
	// this issue probably has to do with the model?
	wheelForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2);
	console.log(wheelForward);
	
	// also rotate the car so it eventually lines up with the
	// front wheels in terms of angle (their forward vectors should be parallel)
	let carForward = getForward(car.body);
	carForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2);
	console.log(carForward);
	console.log("-----------");
	
	console.log(carForward.angleTo(wheelForward));
	let angleToWheel = carForward.angleTo(wheelForward);
	if(angleToWheel > 0.17){
		car.rotateY(rotationAngle/2);
	}
	
	// move car based on wheel forward vector
	wheelForward.multiplyScalar(0.2 * (rotationAngle < 0 ? 1 : -1)); // we should allow variable speed?
	car.position.add(wheelForward);
}


function update(){
	
	sec = clock.getDelta();
	moveDistance = 8 * sec;
	rotationAngle = (Math.PI / 2) * sec;
	let changeCameraView = false;
	let maxRad = 0.56; // max/min radians for wheel angle
	
	if(keyboard.pressed("z")){
		changeCameraView = true;
	}
	
	if(keyboard.pressed("W")){
		
		// check alignment of car body with the front wheels!
		// if they are NOT parallel, rotate the body slowly? so
		// that it eventually aligns with the direction and angle of the
		// front wheels.
		
		/*
		// we can just use one of the front wheels since they should always be parallel
		let frontWheelVec = thePlayer.frontWheels[0].internalVectorPts.map(x => x.position);
		let wheelDirection = getInternalVectorDirection(...frontWheelVec)
		
		let carVec = thePlayer.body.internalVectorPts.map(x => x.position);
		let carDirection = getInternalVectorDirection(...carVec);
		let y = getForward(thePlayer);

		//console.log(wheelDirection.dot(carDirection));
		
		if(wheelDirection.dot(carDirection) !== 1){
			thePlayer.rotateY(rotationAngle/1.8);
		}
		
		//console.log("------------");
		*/
		
		move(thePlayer, -rotationAngle);
		
	}else if(keyboard.pressed("S")){
		move(thePlayer, rotationAngle);
	}
	
	if(keyboard.pressed("A")){
		thePlayer.frontWheels.forEach((wheel) => {
			// check this out: https://stackoverflow.com/questions/56426088/rotate-around-world-axis
			// I was a bit confused by the behavior of rotateOnWorldAxis because I thought it meant
			// rotate about the world's axis, which I think would be at 0,0,0 of the whole scene.
			// glad the function works the way it does but was a bit surprised. :)
			// was worried I'd have to do a pivot point thing and a bunch of transformations
			
			if(wheel.rotation.y >= -maxRad && wheel.rotation.y <= maxRad){
				wheel.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotationAngle/1.8);
				
				if(Math.abs(wheel.rotation.y) > maxRad){
					wheel.rotation.y = wheel.rotation.y < 0 ? -maxRad + 0.01 : maxRad - 0.01;
				}
			}
		});
		// also this movement isn't quite right (I think it's easier to see going backwards)
		// the front wheels should rotate and then the direction of the car should align to the 
		// direction of the wheels I think?
		//thePlayer.rotateY(rotationAngle);
	}
	
	if(keyboard.pressed("D")){
		thePlayer.frontWheels.forEach((wheel) => {
			if(wheel.rotation.y >= -maxRad && wheel.rotation.y <= maxRad){
				wheel.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -rotationAngle/1.8);
				
				if(Math.abs(wheel.rotation.y) > maxRad){
					wheel.rotation.y = wheel.rotation.y < 0 ? -maxRad + 0.01 : maxRad - 0.01;
				}
			}
		});
	}
	
	let relCameraOffset;
	
	if(firstPersonViewOn){
		// nothing to do
	}else if(sideViewOn){
		relCameraOffset = new THREE.Vector3(-10, 3, 0);
	}else if(bottomViewOn){
		relCameraOffset = new THREE.Vector3(0, -6, 0);
	}else if(!changeCameraView){
		relCameraOffset = new THREE.Vector3(0, 3, -12);
	}else{
		relCameraOffset = new THREE.Vector3(0, 3, 12);
	}
	
	if(!firstPersonViewOn){
		let cameraOffset = relCameraOffset.applyMatrix4(thePlayer.matrixWorld);
		camera.position.x = cameraOffset.x;
		camera.position.y = cameraOffset.y;
		camera.position.z = cameraOffset.z;
	}
	
	if(!firstPersonViewOn) camera.lookAt(thePlayer.position);

}

function animate(){
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
	update();
}
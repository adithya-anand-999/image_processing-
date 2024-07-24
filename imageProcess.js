// import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import Stats from 'three/examples/jsm/libs/stats.module.js';
// import { GUI } from 'dat.gui';
// import { output } from 'three/examples/jsm/nodes/Nodes.js';


const input_image_names = ["monalisa.jpg", "girl_at_window.jpg", "dali_outer_space.jpg", "8k_mountain_image.jpg"];
let input_images = [];
let input = null;
let output = null;

function brighten(input, output, brightness) {
	let ip = input.pixels;  // an alias for input pixels array
	let op = output.pixels; // an alias for output pixels array
	for(let i=0; i<input.width*input.height; i++)	{
		let idx=i*4;  // each pixel takes 4 bytes: red, green, blue, alpha
		op[idx+0] = pixelClamp(ip[idx+0]*brightness); // red
		op[idx+1] = pixelClamp(ip[idx+1]*brightness); // green
		op[idx+2] = pixelClamp(ip[idx+2]*brightness); // blue
	}
}

function adjustContrast(input, output, contrast) {
	let ip = input.pixels;
	let op = output.pixels;

	for(let i = 0; i < input.width*input.height; i++){
		let idx = i*4;
		op[idx+0] = pixelClamp(contrast*ip[idx+0] + (1-contrast)*127);
		op[idx+1] = pixelClamp(contrast*ip[idx+1] + (1-contrast)*127);
		op[idx+2] = pixelClamp(contrast*ip[idx+2] + (1-contrast)*127);
	}
}

function adjustSaturation(input, output, saturation) {
	let ip = input.pixels;
	let op = output.pixels;

	for(let i =0; i < input.width*input.height; i++){
		let idx = i*4;
		let L = 0.3*ip[idx+0] + 0.59*ip[idx+1] + 0.11*ip[idx+2];
		op[idx+0] = saturation*ip[idx+0] + (1-saturation)*L;
		op[idx+1] = saturation*ip[idx+1] + (1-saturation)*L;
		op[idx+2] = saturation*ip[idx+2] + (1-saturation)*L;
	}
}

function boxBlur(input, output, ksize) {
	// create box kernel of ksize x ksize, each element of value 1/(ksize*ksize)
	let boxkernel = Array(ksize).fill().map(()=>Array(ksize).fill(1.0/ksize/ksize));
	filterImage(input, output, boxkernel);
}

function gaussianBlur(input, output, sigma) {
	let gkernel = gaussianKernel(sigma);	// compute Gaussian kernel using sigma
	filterImage(input, output, gkernel);
}

function edgeDetect(input, output) {
	let ekernel = [[0, -2, 0], [-2, 8, -2], [0, -2, 0]];
	filterImage(input, output, ekernel);	
}

function sharpen(input, output, sharpness) {
	let skernal = [[0, -sharpness, 0], [-sharpness, 1+4*sharpness, -sharpness], [0, -sharpness, 0]];
	filterImage(input, output, skernal);
}	

function uniformQuantization(input, output) {
	let ip = input.pixels;
	let op = output.pixels;

	for(let i = 0; i < input.width*input.height; i++){
		let idx = i*4;
		luminance = 0.3*ip[idx+0] + 0.59*ip[idx+1] + 0.11*ip[idx+2];
		luminance > 127 ? (op[idx+0] = op[idx+1] = op[idx+2] = 255):(op[idx+0] = op[idx+1] = op[idx+2] = 0);
	}
}

function randomDither(input, output) {
	let ip = input.pixels;
	let op = output.pixels;

	for(let i = 0; i < input.width*input.height; i++){
		let idx = i*4;
		luminance = 0.3*ip[idx+0] + 0.59*ip[idx+1] + 0.11*ip[idx+2];
		let e = Math.random() * 255;
		luminance > e ? (op[idx+0] = op[idx+1] = op[idx+2] = 255):(op[idx+0] = op[idx+1] = op[idx+2] = 0);
	}
}

function orderedDither(input, output) {
	// Please use the 4x4 ordered dither matrix presented in lecture slides
	let ip = input.pixels;
	let op = output.pixels;
	let D4 = [[15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0],
			 [3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0],
			 [12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0],
			 [0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0]]

	for(let k = 0; k < input.width; k++){
		for(let i = 0; i < input.height; i++) {
			let idx = (i*input.width+k)*4;
			let e = D4[i%4][k%4] * 255;
			luminance = 0.3*ip[idx+0] + 0.59*ip[idx+1] + 0.11*ip[idx+2];
			luminance > e ? (op[idx+0] = op[idx+1] = op[idx+2] = 255)
			:(op[idx+0] = op[idx+1] = op[idx+2] = 0);
		}

	}
}

function loadInputImages() {
  for (let i = 0; i < input_image_names.length; i++) {
    let imageName = input_image_names[i];
    loadImage('./sampleImages/' + imageName, function(img) {
		let maxWidth = window.innerWidth - 200;
		let maxHeight = window.innerHeight - 200;
		const ratio = Math.min(maxWidth/img.width, maxHeight/img.height);
		img.resize(img.width*ratio, img.height*ratio);
    	input_images[imageName] = img;
    });
  }
}
//dont know point of this function

function applyPixelOperations() {
	brighten(input, output, params.brightness);
	adjustContrast(output, output, params.contrast); // output of the previous operation is fed as input
	adjustSaturation(output, output, params.saturation); // output of the previous operation is fed as input
	output.updatePixels();
}
//dont know point of this function

function pixelClamp(value) {
	return(value<0?0:(value>255?255:(value>>0)));
}

function preload() { 
	// for(let mosaic_id=0; mosaic_id<mosaic_names.length; mosaic_id++) {
	// 	mosaic_montages[mosaic_id] = loadImage(mosaic_files[mosaic_id]);
	// }
	loadInputImages();
}
//dont know point of this function, and not being invoked

function loadSelectedInput() {
	input = input_images[params.Image];
	input.loadPixels();
	output = createImage(input.width, input.height);
	// output = createImage(200,200)
	output.copy(input, 0, 0, input.width, input.height, 0, 0, input.width, input.height);
	// output.copy(input, 0, 0, 200, 200, 0, 0, 200, 200);
	output.loadPixels();
	params.Reset(true);
//   resizeImageToFitWindow();
}

// function resizeImageToFitWindow() {
//   let canvasRatio = window.innerWidth / window.innerHeight;
//   let imageRatio = input.width / input.height;

//   let newWidth, newHeight;

//   if (imageRatio > canvasRatio) {
//       newWidth = window.innerWidth;
//       newHeight = window.innerWidth / imageRatio;
//   } else {
//       newHeight = window.innerHeight;
//       newWidth = window.innerHeight * imageRatio;
//   }

//   let resizedImage = createImage(newWidth, newHeight);
//   resizedImage.copy(output, 0, 0, output.width, output.height, 0, 0, newWidth, newHeight);
//   resizedImage.loadPixels();
//   output = resizedImage;
// }

let ParameterControl = function() {
	this.Image = 'monalisa.jpg';
	this.brightness = 1.0;
	this.contrast = 1.0;
	this.saturation = 1.0;   //what do these values up here do
	this.boxsize = 2;
	this.sigma = 1;
	this.sharpness = 0.3;
	this.Reset = function(partial) {
		this.brightness = 1.0;
		this.contrast = 1.0;   //these are the initial values in the control panel
		this.saturation = 1.0;
		if(partial=='undefined' || partial==false) {
			this.boxsize = 2;    
			this.sigma = 1;
			this.sharpness = 0.3;
		}
		output.copy(input, 0, 0, input.width, input.height, 0, 0, input.width, input.height);
		// output.copy(input, 0, 0, 200, 200, 0, 0, 200, 200);
		output.loadPixels();
	}
	this['Apply Box Blur'] = function() { boxBlur(input, output, this.boxsize*2+1); };
	this['Apply Gaussian Blur'] = function() { gaussianBlur(input, output, this.sigma); };
	this['Apply Sharpen'] = function() { sharpen(input, output, this.sharpness); };
	this['Edge Detect'] = function() { edgeDetect(input, output); output.updatePixels(); };
	this.uniform = function() { uniformQuantization(input, output);	output.updatePixels(); };
	this.random = function() { randomDither(input, output); 	output.updatePixels(); };
	this.ordered = function() { orderedDither(input, output); output.updatePixels(); };	
	// this['Mosaic Dataset'] = 'musicBig';
	// this['Apply Mosaic'] = function() { imageMosaic(input, output, this['Mosaic Dataset']); };
	this['Save Image'] = function() {output.save('output.png');}
}
//


let params = new ParameterControl();



function setup() {

	// loadMosaicImages();

	let canvas = createCanvas( window.innerWidth, window.innerHeight );
	loadSelectedInput();
	// let x = (windowWidth - input.width) /2;
	// let y = (windowHeight - input.height)/2
	// canvas.position(x,y)
	// canvas = createCanvas(200,200)

	let gui = new dat.GUI();
	let ctrl = gui.add(params, 'Image', input_image_names);
	ctrl.onFinishChange(function(value) { loadSelectedInput(); });
	
	let panel1 = gui.addFolder('Pixel Operations');
	ctrl = panel1.add(params, 'brightness', 0, 4.0).step(0.05).listen();
	ctrl.onFinishChange(function(value) { applyPixelOperations(); });
	ctrl = panel1.add(params, 'contrast', 0, 4.0).step(0.05).listen();
	ctrl.onFinishChange(function(value) { applyPixelOperations(); });
	ctrl = panel1.add(params, 'saturation', 0, 4.0).step(0.05).listen();
	ctrl.onFinishChange(function(value) { applyPixelOperations(); });
	panel1.add(params, 'Reset');
	// panel1.open();		
	
	let panel2 = gui.addFolder('Image Convolution');
	panel2.add(params, 'boxsize', 1, 7).step(1).listen();
	panel2.add(params, 'Apply Box Blur');
	panel2.add(params, 'sigma', 0.1, 4.0).step(0.1).listen();
	panel2.add(params, 'Apply Gaussian Blur');
	panel2.add(params, 'sharpness', 0, 1.0).step(0.05).listen();
	panel2.add(params, 'Apply Sharpen');
	panel2.add(params, 'Edge Detect');
  	panel2.add(params, 'Reset');
	// panel2.open();

	let panel3 = gui.addFolder('Dither');
	panel3.add(params, 'uniform');
	panel3.add(params, 'random');
	panel3.add(params, 'ordered');		
  	panel3.add(params, 'Reset');
	// panel3.open();

	// let panel4 = gui.addFolder('Image Mosaic');
	// panel4.add(params, 'Mosaic Dataset', mosaic_names);
	// panel4.add(params, 'Apply Mosaic');
	// panel4.add(params, 'Save Image');
	// panel4.open();

	
}

function draw(){
  clear()
  if (output){
	let x = (window.innerWidth - output.width)/2
	let y = (window.innerHeight - output.height)/2
	image(output,x,y)
  }
}


function gaussianKernel(std) { // compute Gaussian kernel
	let sigma = std;
	let ksize = Math.floor(6.0*std) % 2 ? Math.floor(6.0*std) : Math.floor(6.0*std)+1;
	if(ksize<1) ksize=1;
	let r = 0.0;
	let s = 2.0 * sigma * sigma;
	let sum = 0.0;
	let gkernel = Array(ksize).fill().map(() => Array(ksize)); // create 2D array
	let offset = Math.floor(ksize / 2);

	if (ksize == 1)	{ gkernel[0][0] = 1; return gkernel; }

	for(let x = -offset; x <= offset; x++) {
		for(let y = -offset; y <= offset; y++){
			r = Math.sqrt(x * x + y * y);
			gkernel[x+offset][y+offset] = (Math.exp(-(r*r) / s)) / Math.PI * s;
			sum += gkernel[x+offset][y+offset];
		}
	}
	// normalize coefficients
	for(let x = 0; x < ksize; x++){
		for(let y = 0; y < ksize; y++){
			gkernel[x][y] /= sum;
		}
	}
	return gkernel;
}

function filterImage(input, output, kernel, ) {
	console.log('Computing Image Convolution...');
	input.loadPixels();
	output.loadPixels();
	let ip = input.pixels;
	let op = output.pixels;
	let index = 0;
	for(let y=0; y<input.height; y++) {
		for(let x=0; x<input.width; x++, index+=4) {
			op.set(applyKernel(input, x, y, kernel), index);
		}
	}
	output.updatePixels();
	console.log('Done.');	
}
//dont know point of this function

function applyKernel(image, x, y, kernel) {
	let ksize = kernel.length;
	let rtotal = 0, gtotal = 0, btotal = 0;
	let xloc = 0, yloc = 0, idx = 0, coeff = 0;
	let offset = (ksize/2)>>0;
	let p = image.pixels;
  
	for(let i = 0; i<ksize; i++) {
		for(let j = 0; j<ksize; j++) {
			xloc = x + i-offset;
			xloc = (xloc<0)?0:((xloc>image.width-1)?image.width-1:xloc); // constant border extension
			yloc = y + j-offset;
			yloc = (yloc<0)?0:((yloc>image.height-1)?image.height-1:yloc);
			
			idx = (yloc*image.width+xloc)*4;
			coff = kernel[i][j];
			rtotal += p[idx+0] * coff;
			gtotal += p[idx+1] * coff;
			btotal += p[idx+2] * coff;
		}
	}
	// technically for certain operations like edge detection
	// we should take the absolute value of the result
	// will ignore that for now
	return [pixelClamp(rtotal), pixelClamp(gtotal), pixelClamp(btotal)]; // return resulting color as 3-element array
}
//dont know point of this function











// const scene = new THREE.Scene();

// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// camera.position.z = 2;

// const renderer = new THREE.WebGLRenderer();
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);

// const controls = new OrbitControls(camera, renderer.domElement);

// const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshBasicMaterial({
//   color: 0x00ff00,
//   wireframe: true,
// });

// const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);

// window.addEventListener('resize', onWindowResize, false);
// function onWindowResize() {
//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();
//   renderer.setSize(window.innerWidth, window.innerHeight);
//   render();
// }

// const stats = Stats();
// document.body.appendChild(stats.dom);

// const gui = new GUI();
// const cubeFolder = gui.addFolder('Cube');
// cubeFolder.add(cube.rotation, 'x', 0, Math.PI * 2);
// cubeFolder.add(cube.rotation, 'y', 0, Math.PI * 2);
// cubeFolder.add(cube.rotation, 'z', 0, Math.PI * 2);
// cubeFolder.open();
// const cameraFolder = gui.addFolder('Camera');
// cameraFolder.add(camera.position, 'z', 0, 10);
// cameraFolder.open();

// function animate() {
//   requestAnimationFrame(animate);
//   render();
//   stats.update();
// }

// function render() {
//   renderer.render(scene, camera);
// }

// animate();

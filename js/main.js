// get the DOM element to attach to
var $container = $('container');

// set the scene size
var WIDTH = $container.getSize().x,
    HEIGHT = $container.getSize().y;

// set some camera attributes
var VIEW_ANGLE = 25,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.1,
    FAR = 1200;

// create a WebGL renderer, camera
// and a scene
var renderer = new THREE.WebGLRenderer();
var camera = new THREE.PerspectiveCamera(  VIEW_ANGLE,
                                ASPECT,
                                NEAR,
                                FAR  );
var scene = new THREE.Scene();
var models = ['mainau.js', 'festland.js', 'festland_hg.js', 'wasser.js', 'foto.js'];
var images = ['lim_mainau.png', 'lim_festland.png', 'lim_festland_hg.png', 'lim_wasser.png', 'luftaufnahme_insel_mainau.jpg'];
var mouse = {
	x: 0, y: 0
}
var sceneElements = [];
var hideSceneElements = false;
var showSceneElements = true;
var sceneElementsOpacity = 0.0;

var mouseFactor = 1.2;
var currentItem = 0;
var lastTimestamp = 0;

init();
animate();
init3dText();
initMenu();

function init3dText() {
	var els = $$('.three-d')
	els.each(function(el) {
		sceneElements.push(el);
		
		var pos = {}
		var classes = el.get('class').split(' ');
		
		// parse coordinates from class
		for ( var i = 0; i < classes.length; i++) {
			var klass = classes[i];
			if (klass.contains('pos_')) {
				klass = klass.split('_');
				el.pos = new THREE.Vector3(
						klass[1].replace('p', '.').toFloat(),
						klass[2].replace('p', '.').toFloat(),
						klass[3].replace('p', '.').toFloat());
				break;
			}
		}
	});
}

function initMenu() {
	var items = $$('#menu div');
	items.each(function(item, index) {
		item.addEvent('click', function() {
			if (currentItem == index) {
				return;
			}
			
			if (currentItem == 0) {
				hideSceneElements = true;
			} else if (index == 0) {
				showSceneElements = true;
			}
			
			currentItem = index;
		});
	});
}

function init() {
//	camera.position.x = -0.6;
//	camera.position.y = 0.4;
//	camera.position.z = 3;

	camera.position.x = 0;
	camera.position.y = 10;
	camera.position.z = 10;

	camera.rotation.x = -0.1;
//	camera.target.z = 3;
//	camera.target.y = 0.4;
//	camera.target.x = -0.6;

	camera.useTarget = false;
	
	// start the renderer
	renderer.setSize(WIDTH, HEIGHT);
	renderer.sortObjects = true;
	
	// attach the render-supplied DOM element
	$container.appendChild(renderer.domElement);
	
	var loader = new THREE.JSONLoader();
	for (var i = 0; i < models.length; ++i) {
		models[i] = {
			geometry: models[i]
		}
		loader.load( { model: "3d/" + models[i].geometry, callback: createScene.bind(window, i) } );
	}
	
//	// create a point light
//	var pointLight = new THREE.PointLight( 0xFFFFFF );
//	
//	// set its position
//	pointLight.position.x = 10;
//	pointLight.position.y = 50;
//	pointLight.position.z = 130;
//	
//	// add to the scene
//	scene.addLight(pointLight);
}

function createScene(index, geometry) {
	
//	geometry.materials[0][0].shading = THREE.FlatShading;
//	var material = [ new THREE.MeshFaceMaterial(), new THREE.MeshLambertMaterial( { color: 0xffffff, opacity:0.9, shading:THREE.FlatShading, wireframe: true, wireframeLinewidth: 2 } ) ];
	
	models[index].material = new THREE.ShaderMaterial({
		vertexShader: $('shader-vs').get('text'),
		fragmentShader: $('shader-fs').get('text'),
		uniforms: {
			texture: {
				type: 't',
				value: 0,
				texture: THREE.ImageUtils.loadTexture( "img/" + images[index], THREE.UVMapping, callbackTex.bind(window, index) )
			}
		}
	}); //new THREE.MeshBasicMaterial( { color:0xffffff, map: texture } );
	models[index].geometry = geometry;
}

function callbackTex(index, image) {
	var mesh = new THREE.Mesh(models[index].geometry, models[index].material);
	scene.add(mesh);
}


function animate() {
	var date = new Date();
	var curTime = date.getTime();
	var deltaT = curTime - lastTimestamp;
	lastTimestamp = curTime;
	
	requestAnimationFrame( animate );
	render();
	
	if (hideSceneElements || showSceneElements) {
		var inc = deltaT / 1000;
		sceneElementsOpacity += inc * (showSceneElements ? 1 : -1);
		if (sceneElementsOpacity < 0) {
			sceneElementsOpacity = 0;
			hideSceneElements = false;
		}
		if (sceneElementsOpacity > 1) {
			sceneElementsOpacity = 1;
			showSceneElements = false;
		}
		for ( var i = 0; i < sceneElements.length; i++) {
			var el = sceneElements[i];
			el.setStyle('opacity', sceneElementsOpacity);
		}
	}
//	stats.update();
}

function render() {
	renderer.render(scene, camera);
}

function updateBg() {
	var y = window.getScroll().y + mouse.y * mouseFactor;
	var x = mouse.x * mouseFactor;
	
	camera.position.y = 10 - y / 1500;
	camera.position.x = x / 1500;
	
	updateSceneElements();
}

function updateSceneElements() {
	for ( var i = 0; i < sceneElements.length; i++) {
		var el = sceneElements[i];
		var projScreenMatrix = new THREE.Matrix4();
		projScreenMatrix.multiply( camera.projectionMatrix, camera.matrixWorldInverse );
		var pos = projScreenMatrix.multiplyVector3(el.pos.clone());
		el.setStyle('-moz-transform', 'translate(' + (pos.x+1)*WIDTH/2  + 'px, ' + 	(-pos.y+1)*HEIGHT/2 + 'px)');
	}
}

window.addEvent('mousemove', function(event) {
	mouse = event.client;
	updateBg();
});

window.addEvent('scroll', function() {
	updateBg();
});
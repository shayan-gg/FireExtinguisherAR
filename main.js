// Three JS Modules
import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { AnimationMixer } from "three";

// Post Processing
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Debugging Tools
import Stats from 'three/examples/jsm/libs/stats.module.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

// Particle System File
import { getParticleSystem } from "./getParticleSystem.js";

let camera, scene, renderer, composer, controls, model
let modelCircle, baseCircle;
let gui, guiCam;

let mixerSmoke, mixerFire, mixerFE
let modelSmoke, modelFire, modelFE, modelWood
const clock = new THREE.Clock();
let deltaTime

const statsEnable = true;
const guiEnable = true;
const toneMapping = THREE.ACESFilmicToneMapping;
const antialiasing = false;
const AmbientOcclusion = false;

const loader = new GLTFLoader().setPath( '/assets/3D/' );
const texLoader = new THREE.TextureLoader().setPath( '/assets/textures/' )
const hdriLoader = new RGBELoader().setPath( '/assets/hdri/' )

const fileFE = 'FE8.glb'
const fileBase = 'circle.glb'

let fireEffect, smokeEffect, feEffect
let velocityRotation = new THREE.Vector3()
let FEAnimations

let fireEnable = true;
let smokeEnable = true;
let feEnable = true;

const fireRateValue = 30;
const smokeRateValue = 10;
const feRateValue = 1000;

let fireRate = fireRateValue;
let smokeRate = smokeRateValue;
let feRate = feRateValue;

const cubeGeometry = new THREE.BoxGeometry();
const cubeMaterial = new THREE.MeshStandardMaterial({color: 0x000000,});

// Fire Particles
const fireSpawn = new THREE.Mesh(cubeGeometry, cubeMaterial);
fireSpawn.position.set(0, 0, 0)
fireSpawn.scale.set(.1, .1, .1);

const fireSpeed = .5;
const fireRotationSpeed = 10;
const fireVelocity = new THREE.Vector3(0, .3, 0);

// Smoke Particles
const smokeSpawn = new THREE.Mesh(cubeGeometry, cubeMaterial);
smokeSpawn.position.set(0, 0, 0)
smokeSpawn.scale.set(.1, .1, .1);

const smokeSpeed = .5;
const smokeRotationSpeed = 10;
const smokeVelocity = new THREE.Vector3(0, .3, 0);

// Fire Extinguisher Particles
const feSpawn = new THREE.Mesh(cubeGeometry, cubeMaterial);
feSpawn.position.set(.2, 0, 0)
feSpawn.scale.set(.1, .1, .1);

const feSpeed = .5;
const feRotationSpeed = 10;
const feVelocity = new THREE.Vector3(0, 1, 0);
const FeRotation = new THREE.Vector3(.6, 0, 0);

let feRoot = []

// -------------------- GUI --------------------  

const guiObject = {
  fireBoolean: true,
  smokeBoolean: true,
  feBoolean: true,
  pauseBoolean: false,
  value1: 1, 
  value2: 1, 
  value3: .6, 
  value4: .01, 
  color: { r: 0.01, g: 0.01, b: 0.01 },
};

addGUI();

init();

function init() {

  // ------------------- Scene Setup -----------------------

  const container = document.createElement( 'div' );
  document.body.appendChild( container );

  camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.01, 20 );
  camera.position.set( 0, .5, 1.5 );

  scene = new THREE.Scene();

  // -------------------- Particles --------------------


  fireEffect = getParticleSystem({
    camera,
    emitter: fireSpawn,
    parent: scene,
    rate: fireRate,
    texture: './assets/img/fire.png',
    radius: .0001,
    maxLife: 2,
    maxSize: 4,
    maxVelocity: fireVelocity,
    colorA: new THREE.Color(0xffffff),
    colorB: new THREE.Color(0xff8080),
    alphaMax: 1.0,
  });

  smokeEffect = getParticleSystem({
    camera,
    emitter: smokeSpawn,
    parent: scene,
    rate: smokeRate,
    texture: './assets/img/smoke.png',
    radius: .0001,
    maxLife: 4,
    maxSize: 3.5,
    maxVelocity: smokeVelocity,
    colorA: new THREE.Color(0x000000),
    colorB: new THREE.Color(0xffffff),
    alphaMax: 0.8,
  });

  feEffect = getParticleSystem({
    camera,
    emitter: feSpawn,
    parent: scene,
    rate: feRate,
    texture: './assets/img/smoke.png',
    radius: .01,
    maxLife: .8,
    maxSize: 2,
    maxVelocity: feVelocity,
    colorA: new THREE.Color(0x000000),
    colorB: new THREE.Color(0xffffff),
    alphaMax: 0.8,
  });

  // -------------------- Import Assets --------------------

  // FE
  loader.load(fileFE, async function ( gltf ) {

    modelFE = gltf.scene;
    // modelFE.scale.set( .1,.1,.1 );
    modelFE.position.set( 0,1,-1 );

    modelFE.traverse((child) => {
      if (child.isMesh) {
          child.castShadow = true;
          // child.receiveShadow = true;
      }
      if (child.name === 'Fire_Extinguisher_Base') {
        feRoot[0] = child;
        console.log('feRoot[0] : ', feRoot[0]);
      }
      if (child.name === 'FE_Origin') {
        feRoot[1] = child;
        feRoot[1].rotation.set(FeRotation.x + feRoot[1].rotation.x, FeRotation.y + feRoot[1].rotation.y, FeRotation.z + feRoot[1].rotation.z);
        // feRoot[1].rotation.add(FeRotation);
        console.log('feRoot[1] : ', feRoot[1]);
      }
    });

    await renderer.compileAsync( modelFE, camera, scene );

    // gltf.animations.name = 'FEAnimation';
    
    mixerFE = new AnimationMixer(modelFE);
    mixerFE.loop = false;
    FEAnimations = gltf.animations;

    scene.add( modelFE );
    console.log('modelFE : ', modelFE);
    console.log(gltf.animations);
    console.log('mixerFE : ', mixerFE);
  } );

  // Circle
  loader.load( fileBase, async function ( gltf ) {

    modelCircle = gltf.scene;

    modelCircle.traverse((child) => {
      if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = true;
          child.material.renderOrder = 0;
          child.material.depthWrite = true;
          // child.material.depthTest = false;
          child.material.transparent = false;
          child.material.color = new THREE.Color(guiObject.color.r, guiObject.color.g, guiObject.color.b);
          baseCircle = child
      }
    });

    await renderer.compileAsync( modelCircle, camera, scene );

    scene.add( modelCircle );
  } );

  hdriLoader.load( 'Env.hdr', function ( texture ) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
    } );

  hdriLoader.load( 'blur.hdr', function ( backgroundHDRI ) {

    backgroundHDRI.mapping = THREE.EquirectangularReflectionMapping;
    // backgroundHDRI.colorSpace = "srgb";

    scene.background = backgroundHDRI;
  });
  
 // ------------------- Render Starts --------------------------------  

  renderer = new THREE.WebGLRenderer( { antialias: antialiasing } );
  renderer.setPixelRatio( window.devicePixelRatio );
  // renderer.setPixelRatio(window.devicePixelRatio > 1 ? 1 : window.devicePixelRatio); // Optimize for mobile
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.toneMapping = toneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild( renderer.domElement );

  // ---------------------------- controls --------------------------------

  controls = new OrbitControls( camera, renderer.domElement );
  // controls.addEventListener( 'change', render );

  controls.target.set( 0, .1, 0);

  controls.minDistance = .5;
  
  controls.maxDistance = .9;
  controls.update();
  controls.maxDistance = 20.1;

  controls.enableDamping = true;
  controls.dampingFactor = guiObject.value4;

  controls.autoRotate = false;
  controls.autoRotateSpeed = 2;

  controls.enablePan = false;
  controls.maxTargetRadius = .1;
  controls.maxPolarAngle = Math.PI / 1.9;
  
  controls.update();


  // ---------------------------- scene --------------------------------

  window.addEventListener( 'resize', onWindowResize );

  // Studio lighting setup

  const HemisphereLight = new THREE.HemisphereLight( 0xffffbb, 0x080820, 5 );
  scene.add( HemisphereLight );

  const helperHemisphereLight = new THREE.HemisphereLightHelper( HemisphereLight, 5 );

  // Ambient Light (fill light)
  const ambientLight = new THREE.AmbientLight(0xaaaaff, 2); 
  scene.add(ambientLight);

  // Key Light (main light source)
  const keyLight = new THREE.RectAreaLight(0x333333, 20, 20, 20); 
  keyLight.position.set(5, 5, 5); 
  // keyLight.castShadow = true; 
  scene.add(keyLight);
  
  // Fill Light
  const fillLight = new THREE.DirectionalLight(0xffffff, 8);
  fillLight.position.set(-5, 5, 10);
  fillLight.castShadow = true;
  fillLight.shadow.mapSize.width = 2000;
  fillLight.shadow.mapSize.height = 2000;
  fillLight.lookAt(0, 0, 0);
  scene.add(fillLight);

  // Back Light (rim light)
  const backLight = new THREE.DirectionalLight(0xffffff, 1);
  backLight.position.set(0, 10, -10);
  backLight.castShadow = false;
  scene.add(backLight);

  const helperBackLight = new THREE.DirectionalLightHelper( backLight, 2 );

  // Back Light (rim light)
  const backLight2 = new THREE.DirectionalLight(0xffffff, 15);
  backLight2.position.set(-5, 10, -10);
  backLight2.castShadow = false;
  scene.add(backLight2);

  // --------------------------------- post --------------------------------

  // Enable shadow maps for the renderer
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Set up post-processing
  composer = new EffectComposer(renderer);
  composer.setPixelRatio( 1 ); // ensure pixel ratio is always 1 for performance reasons
  
  // Create and add render pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Create and add bloom pass
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .05, .7, .4);
  composer.addPass(bloomPass);

  if (AmbientOcclusion) {
    const ssaoPass = new SSAOPass(scene, camera);
    ssaoPass.kernelRadius = .01; // Adjust for effect strength
    ssaoPass.minDistance = 0.0001; // Minimum distance for AO
    ssaoPass.maxDistance = .1; // Maximum distance for AO
    composer.addPass(ssaoPass);
  }
}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

  composer.setSize(window.innerWidth, window.innerHeight); // Update composer size

  render();

}

function playFeAnimations() {
  FEAnimations.forEach((clip3) => {
    console.log('clip3: ', clip3)
    clip3.loop = false
    mixerFE.clipAction(clip3).play();
  });
}

function stopFeAnimations() {
  FEAnimations.forEach((clip3) => {
    console.log('clip3: ', clip3)
    clip3.loop = false
    mixerFE.clipAction(clip3).stop();
  });
}

// ----------------- GUI ------------------------

function addGUI() {
  if(guiEnable) {
  gui = new GUI();
    guiCam = gui.addFolder('FireAR');

    // guiCam.add( guiObject, 'value1', 1, textureCount, 1 ).name('Texture');
    // guiCam.add( guiObject, 'value2', 0, 1 ).name('Box Brightness');
    guiCam.add( guiObject, 'value3', 0, 10 ).name('Scene Brightness');  
    // guiCam.add( guiObject, 'value4', 0, 1 ).name('Camera Damping');
    guiCam.addColor( guiObject, 'color', 255 );
    guiCam.add( guiObject, 'fireBoolean' ).name('Fire');  
    guiCam.add( guiObject, 'smokeBoolean' ).name('Smoke');  
    guiCam.add( guiObject, 'feBoolean' ).name('Fire Extinguisher');  
    guiCam.add( guiObject, 'pauseBoolean' ).name('Pause');  


    gui.onChange( event => {
      console.log(event.property)
      if (event.property == 'feBoolean' && guiObject.feBoolean == true)
        playFeAnimations();
      else
        stopFeAnimations();
    } );
  }
}

// ----------------- Stats ---------------------

const stats = () => {
  if (statsEnable){
    const stats1 = new Stats();
    stats1.showPanel(0);
    const stats2 = new Stats();
    stats2.showPanel(1);
    stats2.dom.style.cssText = 'position:absolute;top:0px;left:80px;';
    const stats3 = new Stats();
    stats3.showPanel(2);
    stats3.dom.style.cssText = 'position:absolute;top:0px;left:160px;';
    document.body.appendChild(stats1.dom);
    document.body.appendChild(stats2.dom);
    document.body.appendChild(stats3.dom);
    
    function statsUpdate() {
      requestAnimationFrame(statsUpdate);
      stats1.update();
      stats2.update();
      stats3.update();
    }statsUpdate();
  }
}; stats();

function animate() {
  requestAnimationFrame(animate);

  deltaTime = clock.getDelta();
  
  controls.update();
  controls.dampingFactor = guiObject.value4;

  renderer.render( scene, camera );

  if (composer) {
    composer.render();
  }

  if(mixerSmoke) {
    mixerSmoke.update(deltaTime);
    // console.log('mixerSmoke : ', mixerSmoke);
  }
  if(mixerFire) {
    // console.log('mixerFire : ', mixerFire);
  }
  if(mixerFE && modelFE) {
    mixerFE.update(deltaTime);
  }

  if(baseCircle)
  modelCircle.children[0].material.color = new THREE.Color(guiObject.color.r, guiObject.color.g, guiObject.color.b);

  if(!guiObject.pauseBoolean) {
   fireEffect.update(deltaTime * fireSpeed, fireRate);
   smokeEffect.update(deltaTime * smokeSpeed, smokeRate);
   feEffect.update(deltaTime * feSpeed, feRate);
  }

  fireRate = guiObject.fireBoolean ? fireRateValue : 0;
  smokeRate = guiObject.smokeBoolean ? smokeRateValue : 0;
  feRate = guiObject.feBoolean ? feRateValue : 0;

  // console.log('fireRate : ', fireRate);

  if(feRoot.length) {
    // feSpawn.position.copy(feRoot[0].position).add(feRoot[1].position)

    // FE Model Origin + Local Location of Hose
    feSpawn.position.copy(modelFE.position).add(feRoot[0].position).sub(new THREE.Vector3(0,.1,0))
    // feVelocity.copy(feRoot[0].rotation).sub(feRoot[1].rotation).add(new THREE.Vector3(.6,-1,0))
    // feVelocity.copy(feRoot[0].rotation).add(new THREE.Vector3(0,0,1))
    velocityRotation.copy(modelFE.rotation)
    velocityRotation.normalize();
    feVelocity.copy(velocityRotation).add(new THREE.Vector3(0,-1,1))
    // console.log(velocityRotation)
  }

  // modelFE.rotation.y += .01

  renderer.toneMappingExposure = guiObject.value3;
}

// Start animation
animate();
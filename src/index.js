"use strict";
import * as THREE from "three";
import * as dat from "dat.gui";

import { initLight } from "../public/helpers";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";

import {SceneUtils} from "three/examples/jsm/utils/SceneUtils.js"

//------------------------ Start Shader  --------------------
 let vertShader = `
    varying vec2 vPos;
    void main() {
      vPos = position.xz;
      gl_Position = projectionMatrix *
                    modelViewMatrix *
                    vec4(position,1.0);
    }
  `;

  let fragShader = `
  	#define PI 3.1415926 * 2.

    uniform vec3 center;
    uniform vec2 size;
    uniform float lineHalfWidth;
    uniform float theta;

    varying vec2 vPos;

    void main() {

    	float cs = cos(theta), sn = sin(theta);
      mat2 m = mat2(cs, -sn, sn, cs);

      vec2 Ro = size * .5;
      vec2 Uo = abs( (vPos - center.xz) * m ) - Ro;

      vec3 c = vec3((sin(vPos.x * PI) * .5 + .5) * (cos(vPos.y * PI) * .5 + .5)); // surface pattern


      float border = float(abs(max(Uo.x,Uo.y)) < lineHalfWidth);
      c = mix(c, vec3(0.,1.,1.), border);

      gl_FragColor = vec4(c, 1.  );
    }

  `;
// --------------------End Shader-----------------------------

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
let scene = new THREE.Scene();
scene.background = new THREE.Color(0xb0b0b0);
// Light
let lightArr = initLight();
for (let lightSource of lightArr) {
  scene.add(lightSource);
}
// Camera and control
let camera = new THREE.PerspectiveCamera(
  // 60,
  30,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.position.set(0, 0, 100);
let cameraCtrl = new TrackballControls(camera, renderer.domElement);

const size = 100;
const divisions = 10;
const gridHelper = new THREE.GridHelper(size, divisions);
scene.add(gridHelper);

// ---------------- current code----------------------
let geom = new THREE.PlaneGeometry(20, 20, 10, 10);
geom.vertices.forEach(v => {
  v.z = THREE.Math.randFloat(-1, 1);
});
geom.rotateX(-Math.PI * .5);
geom.computeFaceNormals();
geom.computeVertexNormals();

let uniforms = {
  center: {
    value: new THREE.Vector3()
  },
  size: {
    value: new THREE.Vector2(4, 3)
  },
  lineHalfWidth: {
    value: 0.1
  },
  theta: {
    value: 0
  }
}

let matShader = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: vertShader,
  fragmentShader: fragShader
});

// let matWire = new THREE.MeshBasicMaterial({
//   color: "gray",
//   wireframe: true
// });
let matWire = new THREE.MeshPhongMaterial({
  color: "gray",
  wireframe: true
});

let obj = SceneUtils.createMultiMaterialObject(geom, [matShader, matWire]);

scene.add(obj);

let gui = new dat.GUI();
gui.add(uniforms.size.value, "x", .5, 5.0).name("size.x");
gui.add(uniforms.size.value, "y", .5, 5.0).name("size.y");
gui.add(uniforms.lineHalfWidth, "value", .05, 2.0).name("line half-width");

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let intersects = [];
let point = new THREE.Vector3();

window.addEventListener("mousemove", function(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  intersects = raycaster.intersectObject(obj, true);
  if (intersects.length === 0) return;
  obj.worldToLocal(point.copy(intersects[0].point));
  uniforms.center.value.copy(point);

}, false);


let spherical = new THREE.Spherical();
let tempVector = new THREE.Vector3();

// --------------------end current code---------------------

renderer.setAnimationLoop(() => {
  cameraCtrl.update();
  camera.updateProjectionMatrix();
  uniforms.theta.value = spherical.setFromVector3(tempVector.subVectors(camera.position, obj.position)).theta;
  renderer.render(scene, camera);
});

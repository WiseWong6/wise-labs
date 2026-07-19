// main.js — 场景引导：渲染器、辉光后期、循环
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { createSky, createGround } from './materials.js';
import { buildCity } from './city.js';
import { createBuildingParticles, createDust, createBeams } from './particles.js';
import { createCrowd } from './people.js';
import { FirstPerson } from './controls.js';
import { Labels } from './labels.js';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.42;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05070e, 0.00118);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 4000);
camera.position.set(0, 1.7, 330);

// ---------- 微弱环境光：暖色地反射 + 冷色月光 ----------
scene.add(new THREE.AmbientLight(0x46301f, 2.05));
scene.add(new THREE.HemisphereLight(0xa8bbef, 0x3c1808, 0.55));
const moon = new THREE.DirectionalLight(0xb8c9ff, 1.28);
moon.position.set(70, 390, -560);
scene.add(moon);

// ---------- 天空 & 地面 ----------
const sky = createSky();
scene.add(sky);
scene.add(createGround());

// ---------- 城市 ----------
const city = buildCity();
scene.add(city.group);

// ---------- 粒子 ----------
const buildingPts = createBuildingParticles(city);
scene.add(buildingPts.points);
const dust = createDust({ count: 2200 });
scene.add(dust.points);
const beams = createBeams(city.beams);
scene.add(beams.mesh);

// ---------- 提灯人群 ----------
const crowd = createCrowd({ heightZones: city.heightZones });
scene.add(crowd.group);

console.log(`[故宫夜游] 建筑粒子 ${buildingPts.count} 个，游人 ${crowd.count} 个`);

// ---------- 后期辉光 ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.82,   // strength
  0.54,   // radius
  0.30    // threshold
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- 漫游 & 标注 ----------
const fp = new FirstPerson(camera, renderer.domElement, {
  heightZones: city.heightZones,
  blockers: city.blockers,
  waterZone: city.waterZone,
  waterZones: city.waterZones,
});
const labels = new Labels(city.labels, camera, document.getElementById('labels'));
document.getElementById('mode').textContent = '步行模式 · F 切换飞行';

// ---------- 循环 ----------
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  fp.update(dt);
  crowd.update(t, dt);

  const pix = renderer.getPixelRatio();
  buildingPts.uniforms.uTime.value = t;
  buildingPts.uniforms.uPix.value = pix;
  dust.uniforms.uTime.value = t;
  dust.uniforms.uPix.value = pix;
  beams.uniforms.uTime.value = t;
  sky.material.uniforms.uTime.value = t;
  city.waterUniforms.uTime.value = t;

  labels.update(camera.position);
  composer.render();
}
tick();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

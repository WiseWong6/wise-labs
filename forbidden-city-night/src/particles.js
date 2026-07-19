// particles.js — 核心夜景：建筑金色点云、飘浮光尘、竖直光束
import * as THREE from 'three';
import { createBeamMaterial } from './materials.js';

// 折线按间距重采样
function resample(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = a.distanceTo(b);
    const n = Math.max(1, Math.round(d / step));
    for (let k = 0; k < n; k++) out.push(a.clone().lerp(b, k / n));
  }
  out.push(pts[pts.length - 1].clone());
  return out;
}

function makePointsMaterial(uniforms, extra = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uPix;
      attribute float aPhase;
      attribute float aSize;
      attribute float aMix;
      varying float vMix;
      varying float vTw;
      varying float vFade;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = -mv.z;
        float tw = 0.60 + 0.40 * sin(uTime * (1.2 + aPhase * 2.4) + aPhase * 39.0);
        vTw = tw;
        vMix = aMix;
        vFade = 1.0 - smoothstep(260.0, 950.0, dist);
        gl_PointSize = aSize * uPix * (0.75 + 0.25 * tw) * (260.0 / max(dist, 1.0));
        gl_PointSize = min(gl_PointSize, 8.0 * uPix);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vMix;
      varying float vTw;
      varying float vFade;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.06, d) * vTw * vFade;
        if (a < 0.01) discard;
        vec3 gold = mix(vec3(1.0, 0.58, 0.15), vec3(1.0, 0.86, 0.58), vMix);
        gl_FragColor = vec4(gold * (0.7 + 0.9 * vTw), a);
      }`,
    ...extra,
  });
}

/**
 * 建筑点云：lines（脊/檐/柱/轮廓）+ surf（屋面散布）
 */
export function createBuildingParticles({ lines, surf }) {
  const pts = [];
  for (const l of lines) pts.push(...resample(l.pts, l.step ?? 0.8));
  pts.push(...surf);

  const n = pts.length;
  const pos = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  const size = new Float32Array(n);
  const mixv = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    phase[i] = Math.random();
    size[i] = 0.45 + Math.random() * 0.95;
    mixv[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aMix', new THREE.BufferAttribute(mixv, 1));

  const uniforms = { uTime: { value: 0 }, uPix: { value: 1 } };
  const points = new THREE.Points(geo, makePointsMaterial(uniforms));
  points.frustumCulled = false;
  return { points, uniforms, count: n };
}

/**
 * 飘浮光尘：在中轴上空缓慢上升
 */
export function createDust({ count = 2200 }) {
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  const mixv = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * 150;
    pos[i * 3 + 1] = Math.random() * 70;
    pos[i * 3 + 2] = 260 - Math.random() * 780;
    phase[i] = Math.random();
    size[i] = 0.5 + Math.random() * 1.1;
    mixv[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aMix', new THREE.BufferAttribute(mixv, 1));

  const uniforms = { uTime: { value: 0 }, uPix: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uPix;
      attribute float aPhase;
      attribute float aSize;
      attribute float aMix;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.5 + aPhase * 0.8), 70.0);
        p.x += sin(uTime * 0.3 + aPhase * 20.0) * 2.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        float tw = 0.4 + 0.6 * sin(uTime * (0.8 + aPhase) + aPhase * 31.0);
        vA = tw * (1.0 - smoothstep(200.0, 700.0, dist)) * (1.0 - p.y / 75.0);
        gl_PointSize = min(aSize * uPix * (240.0 / max(dist, 1.0)), 7.0 * uPix);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA * 0.5;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(1.0, 0.7, 0.35), a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, uniforms };
}

/**
 * 竖直光束群（合并为一个 BufferGeometry）
 */
export function createBeams(list) {
  const geos = [];
  for (const b of list) {
    const g = new THREE.CylinderGeometry(0.9, 0.35, b.h, 6, 1, true);
    g.translate(b.x, b.base + b.h / 2, b.z);
    const n = g.attributes.position.count;
    const phaseArr = new Float32Array(n).fill(Math.random());
    g.setAttribute('aPhase', new THREE.BufferAttribute(phaseArr, 1));
    geos.push(g);
  }
  // 手工合并（属性一致：position/normal/uv/aPhase）
  let vCount = 0, iCount = 0;
  for (const g of geos) { vCount += g.attributes.position.count; iCount += g.index.count; }
  const pos = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const ph = new Float32Array(vCount);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, vo * 3);
    uv.set(g.attributes.uv.array, vo * 2);
    ph.set(g.attributes.aPhase.array, vo);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count;
    io += gi.length;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  merged.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));

  const mat = createBeamMaterial();
  const mesh = new THREE.Mesh(merged, mat);
  mesh.frustumCulled = false;
  return { mesh, uniforms: mat.uniforms };
}

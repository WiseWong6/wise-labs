// materials.js — 全部程序化材质，零贴图
import * as THREE from 'three';

// ---------- 夜空（渐变 + 程序星 + 月 + 地平线暖光） ----------
export function createSky() {
  const geo = new THREE.SphereGeometry(2600, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      varying vec3 vDir;
      float hash3(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.45, 37.719))) * 43758.5453);
      }
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        // 地平线暖光 → 天顶深蓝；保留夜色但不再压成纯黑
        vec3 horizon = vec3(0.105, 0.064, 0.038);
        vec3 zenith  = vec3(0.014, 0.020, 0.052);
        vec3 col = mix(horizon, zenith, pow(h, 0.45));
        col *= smoothstep(-0.08, 0.02, d.y);
        // 星
        if (d.y > 0.02) {
          vec3 cell = floor(d * 260.0);
          float s = hash3(cell);
          float star = smoothstep(0.9965, 1.0, s);
          float tw = 0.5 + 0.5 * sin(uTime * 1.7 + s * 91.0);
          col += vec3(0.82, 0.88, 1.0) * star * tw * 0.78 * smoothstep(0.02, 0.2, d.y);
        }
        // 月：放在入城初始视线前上方，抬头即可看到
        vec3 moonDir = normalize(vec3(0.10, 0.56, -0.82));
        float m = dot(d, moonDir);
        float moonDisk = smoothstep(0.99905, 0.99942, m);
        float moonCore = smoothstep(0.99942, 0.99972, m);
        float moonHalo = pow(max(m, 0.0), 260.0);
        col += vec3(1.00, 0.92, 0.72) * moonDisk * 0.92;
        col += vec3(1.00, 0.98, 0.88) * moonCore * 0.34;
        col += vec3(0.50, 0.56, 0.78) * moonHalo * 0.15;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  return mesh;
}

// ---------- 实体材质（夜色中可读的剪影，受环境光/月光） ----------
export const MAT = {
  roof: new THREE.MeshStandardMaterial({
    color: 0x191f2d, roughness: 0.82, metalness: 0.25, side: THREE.DoubleSide,
  }),
  ridge: new THREE.MeshStandardMaterial({
    color: 0x171b26, roughness: 0.8, metalness: 0.25,
  }),
  wallRed: new THREE.MeshStandardMaterial({
    color: 0x421811, roughness: 0.95, metalness: 0.0,
  }),
  plaster: new THREE.MeshStandardMaterial({
    color: 0x2c1a10, roughness: 0.95, metalness: 0.0,
  }),
  stone: new THREE.MeshStandardMaterial({           // 汉白玉台基（夜里偏冷灰）
    color: 0x343945, roughness: 0.9, metalness: 0.05,
  }),
  stoneDark: new THREE.MeshStandardMaterial({
    color: 0x22252e, roughness: 0.95, metalness: 0.0,
  }),
  column: new THREE.MeshStandardMaterial({
    color: 0x3b130c, roughness: 0.9, metalness: 0.0,
  }),
  gable: new THREE.MeshStandardMaterial({           // 歇山山花
    color: 0x2a190f, roughness: 0.95, side: THREE.DoubleSide,
  }),
  // 门窗暖光（唯一自发光实体，映出殿内灯火）
  windowGlow: new THREE.MeshBasicMaterial({ color: 0x4a2408 }),
  finial: new THREE.MeshBasicMaterial({ color: 0x7a4b14 }),  // 宝顶
};

// ---------- 地面（金砖广场，近黑微蓝） ----------
export function createGround() {
  const geo = new THREE.PlaneGeometry(4000, 4000, 1, 1);
  const mat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec2 vXZ;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vXZ = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vXZ;
      float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        // 夜色基底，砖缝为暗沟
        vec3 col = vec3(0.014, 0.016, 0.022);
        vec2 g = abs(fract(vXZ / 8.0) - 0.5);
        float seam = smoothstep(0.47, 0.5, max(g.x, g.y));
        col *= 1.0 - seam * 0.55;
        // 中轴御道略亮
        float axis = smoothstep(5.0, 0.0, abs(vXZ.x));
        col += vec3(0.012, 0.010, 0.006) * axis;
        // 远处彻底暗下去
        float r = length(vXZ);
        col *= 1.0 - smoothstep(360.0, 1300.0, r) * 0.72;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;
  return mesh;
}

// ---------- 金水河 / 护城河水面（程序波纹；可传共享 uniforms 统一驱动） ----------
export function createWater(width, length, uniforms) {
  const geo = new THREE.PlaneGeometry(width, length, 1, 1);
  const mat = new THREE.ShaderMaterial({
    fog: false,
    transparent: false,
    uniforms: uniforms ?? { uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec2 vXZ;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vXZ = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      varying vec2 vXZ;
      void main() {
        vec3 col = vec3(0.016, 0.025, 0.045);
        // 缓慢波纹，反射两岸灯火的碎金
        float w = sin(vXZ.x * 1.4 + uTime * 0.7) * sin(vXZ.y * 2.3 - uTime * 0.5);
        w += 0.5 * sin(vXZ.x * 3.7 - uTime * 1.1);
        float glint = smoothstep(0.75, 0.98, w);
        col += vec3(0.75, 0.48, 0.18) * glint * 0.55;
        col += vec3(0.08, 0.11, 0.18) * (0.5 + 0.5 * w) * 0.22;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// ---------- 竖直光束 ----------
export function createBeamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aPhase;
      varying float vY;
      varying float vPhase;
      void main() {
        vY = uv.y;
        vPhase = aPhase;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      varying float vY;
      varying float vPhase;
      void main() {
        float a = pow(1.0 - vY, 2.4) * 0.085;
        a *= 0.65 + 0.35 * sin(uTime * 0.6 + vPhase * 20.0);
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.35) * a, a);
      }`,
  });
}

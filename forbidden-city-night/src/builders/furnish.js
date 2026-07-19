// furnish.js — 殿前陈设：华表 / 石狮 / 铜缸 / 日晷 / 嘉量 / 铜鹤 / 铜龟 / 香炉
// 全部为暗色剪影实体 + 关键轮廓进金色点云；baseY 为放置面标高
import * as THREE from 'three';
import { MAT } from '../materials.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const B = (x, z, hw, hd, y0, y1) => ({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, minY: y0, maxY: y1 });

// 华表：八角须弥座 + 八棱柱身 + 云板 + 望天吼
export function huabiao({ baseY = 0 } = {}) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.6, 1.1, 8), MAT.stone);
  base.position.y = baseY + 0.55;
  group.add(base);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 7.2, 8), MAT.stone);
  col.position.y = baseY + 1.1 + 3.6;
  group.add(col);
  const cloud = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.16), MAT.stoneDark);
  cloud.position.set(0, baseY + 6.4, 0.34);
  cloud.rotation.x = 0.18;
  group.add(cloud);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.5, 0.5, 8), MAT.stoneDark);
  cap.position.y = baseY + 8.55;
  group.add(cap);
  const beast = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 6), MAT.stoneDark);
  beast.scale.set(0.8, 1.15, 1.1);
  beast.position.y = baseY + 9.25;
  group.add(beast);

  const lines = [
    { pts: [V3(-0.5, baseY + 1.1, 0), V3(-0.44, baseY + 8.3, 0)], step: 0.7 },
    { pts: [V3(0.5, baseY + 1.1, 0), V3(0.44, baseY + 8.3, 0)], step: 0.7 },
    { pts: [V3(-1.3, baseY + 6.4, 0.34), V3(1.3, baseY + 6.4, 0.34)], step: 0.4 },
    { pts: [V3(0, baseY + 8.6, 0), V3(0, baseY + 9.8, 0)], step: 0.3 },
  ];
  return { group, lines, blockers: [B(0, 0, 1.5, 1.5, baseY, baseY + 1.1)] };
}

// 石狮：须弥座 + 蹲坐身 + 鬃首 + 爪下绣球（面朝 +Z）
export function stoneLion({ baseY = 0 } = {}) {
  const group = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 2.0), MAT.stone);
  ped.position.y = baseY + 0.5;
  group.add(ped);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 7), MAT.stone);
  body.scale.set(0.85, 1.05, 1.25);
  body.position.set(0, baseY + 1.55, -0.15);
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 7), MAT.stone);
  head.position.set(0, baseY + 2.35, 0.45);
  group.add(head);
  const mane = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.17, 6, 10), MAT.stoneDark);
  mane.position.set(0, baseY + 2.3, 0.36);
  group.add(mane);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), MAT.stoneDark);
  ball.position.set(0.32, baseY + 1.12, 0.72);
  group.add(ball);

  const surf = [
    V3(0, baseY + 1.0, 0.95), V3(0, baseY + 1.9, 0.8), V3(0, baseY + 2.85, 0.45),
    V3(0, baseY + 2.7, -0.35), V3(0, baseY + 1.85, -0.85),
  ];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    surf.push(V3(Math.cos(a) * 0.45, baseY + 2.35 + Math.sin(a) * 0.45, 0.45));
  }
  return { group, lines: [], surf, blockers: [B(0, 0, 0.8, 1.0, baseY, baseY + 2.9)] };
}

// 铜缸：鼓腹旋成 + 缸口沿一圈金线
export function bronzeVat({ baseY = 0 } = {}) {
  const prof = [[0.05, 0], [0.62, 0.02], [0.88, 0.3], [1.0, 0.65], [0.92, 0.95], [0.78, 1.05], [0.82, 1.12]];
  const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  const group = new THREE.Group();
  const vat = new THREE.Mesh(geo, MAT.ridge);
  vat.position.y = baseY;
  group.add(vat);

  const rim = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rim.push(V3(Math.cos(a) * 0.82, baseY + 1.12, Math.sin(a) * 0.82));
  }
  return { group, lines: [{ pts: rim, step: 0.35 }], blockers: [B(0, 0, 1.0, 1.0, baseY, baseY + 1.1)] };
}

// 日晷：方座 + 赤道式斜盘 + 晷针
export function sundial({ baseY = 0 } = {}) {
  const group = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), MAT.stone);
  ped.position.y = baseY + 0.7;
  group.add(ped);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 16), MAT.stone);
  disc.position.y = baseY + 1.62;
  disc.rotation.x = 0.6;
  group.add(disc);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5), MAT.ridge);
  pin.position.y = baseY + 1.68;
  pin.rotation.x = 0.6;
  group.add(pin);

  const surf = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    surf.push(V3(Math.cos(a) * 0.75, baseY + 1.62 + Math.sin(a) * 0.45, Math.sin(a) * 0.6));
  }
  return { group, lines: [], surf, blockers: [B(0, 0, 0.6, 0.6, baseY, baseY + 2.1)] };
}

// 嘉量：方座 + 斛身 + 双耳
export function measure({ baseY = 0 } = {}) {
  const group = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 1.1), MAT.stone);
  ped.position.y = baseY + 0.65;
  group.add(ped);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.85, 8), MAT.ridge);
  body.position.y = baseY + 1.72;
  group.add(body);
  const ears = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.12), MAT.ridge);
  ears.position.y = baseY + 2.0;
  group.add(ears);

  const surf = [V3(-0.57, baseY + 2.0, 0), V3(0.57, baseY + 2.0, 0), V3(0, baseY + 2.2, 0), V3(0, baseY + 1.35, 0)];
  return { group, lines: [], surf, blockers: [B(0, 0, 0.55, 0.55, baseY, baseY + 2.1)] };
}

// 铜鹤：磬石 + 长腿 + 曲颈 + 尖喙
export function crane({ baseY = 0 } = {}) {
  const group = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), MAT.stoneDark);
  rock.position.y = baseY + 0.25;
  group.add(rock);
  for (const lx of [-0.14, 0.14]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5), MAT.ridge);
    leg.position.set(lx, baseY + 0.9, 0);
    group.add(leg);
  }
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 7), MAT.ridge);
  body.scale.set(0.8, 0.9, 1.25);
  body.position.y = baseY + 1.55;
  group.add(body);
  let ny = baseY + 1.8, nz = 0.3;
  for (let k = 0; k < 4; k++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.14 - k * 0.018, 6, 5), MAT.ridge);
    ny += 0.24; nz += 0.12 - k * 0.05;
    seg.position.set(0, ny, nz);
    group.add(seg);
  }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 5), MAT.ridge);
  beak.position.set(0, ny + 0.04, nz + 0.26);
  beak.rotation.x = Math.PI / 2.2;
  group.add(beak);

  const surf = [V3(0, baseY + 1.55, 0.62), V3(0, ny + 0.12, nz), V3(0, baseY + 1.85, -0.5), V3(0, ny + 0.04, nz + 0.42)];
  return { group, lines: [], surf, blockers: [B(0, 0, 0.5, 0.5, baseY, baseY + 3)] };
}

// 铜龟：磬石 + 扁圆甲 + 伸首
export function turtle({ baseY = 0 } = {}) {
  const group = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.4), MAT.stoneDark);
  rock.position.y = baseY + 0.2;
  group.add(rock);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 9, 7), MAT.ridge);
  shell.scale.set(1, 0.55, 1.3);
  shell.position.y = baseY + 0.72;
  group.add(shell);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), MAT.ridge);
  head.position.set(0, baseY + 0.72, 0.85);
  group.add(head);

  const surf = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    surf.push(V3(Math.cos(a) * 0.55, baseY + 0.78, Math.sin(a) * 0.72));
  }
  surf.push(V3(0, baseY + 0.78, 0.95));
  return { group, lines: [], surf, blockers: [B(0, 0, 0.6, 0.7, baseY, baseY + 1.1)] };
}

// 香炉：三足 + 圆腹 + 盖珠（殿门前成对）
export function censer({ baseY = 0 } = {}) {
  const group = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.75, 5), MAT.ridge);
    leg.position.set(Math.cos(a) * 0.32, baseY + 0.37, Math.sin(a) * 0.32);
    group.add(leg);
  }
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 9, 7), MAT.ridge);
  belly.scale.set(1, 0.82, 1);
  belly.position.y = baseY + 1.0;
  group.add(belly);
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.45, 8), MAT.ridge);
  lid.position.y = baseY + 1.55;
  group.add(lid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), MAT.finial);
  knob.position.y = baseY + 1.85;
  group.add(knob);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 5, 8), MAT.ridge);
    ear.position.set(sx * 0.55, baseY + 1.25, 0);
    ear.rotation.y = Math.PI / 2;
    group.add(ear);
  }

  const surf = [V3(0, baseY + 1.85, 0), V3(0.5, baseY + 1.1, 0), V3(-0.5, baseY + 1.1, 0), V3(0, baseY + 1.1, 0.5), V3(0, baseY + 1.1, -0.5)];
  return { group, lines: [], surf, blockers: [B(0, 0, 0.6, 0.6, baseY, baseY + 1.9)] };
}

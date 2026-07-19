// flora.js — 植被系统：古松 / 古柏 / 阔叶树（按部位 InstancedMesh 合批，整片一次调用）
import * as THREE from 'three';
import { MAT } from '../materials.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// 夜色叶冠剪影（与御花园旧树同一深绿）
const leafMat = new THREE.MeshStandardMaterial({ color: 0x0a140c, roughness: 1 });

// 单位几何（底点为原点，按实例缩放）
const trunkGeo = new THREE.CylinderGeometry(0.72, 1, 1, 5);
trunkGeo.translate(0, 0.5, 0);
const pineGeo = new THREE.ConeGeometry(1, 1, 7);   // 松伞：压扁成浅碟
pineGeo.translate(0, 0.5, 0);
const cypGeo = new THREE.ConeGeometry(1, 1, 7);    // 柏锥：高瘦尖塔
cypGeo.translate(0, 0.5, 0);
const leafGeo = new THREE.SphereGeometry(1, 7, 6); // 阔叶球冠

// 树冠金绿光点（进建筑点云 surf）
function specks(surf, rand, x, y, z, r, h) {
  const n = 8 + Math.floor(rand() * 7);
  for (let k = 0; k < n; k++) {
    const a = rand() * Math.PI * 2, rr = r * (0.3 + rand() * 0.7);
    surf.push(V3(x + Math.cos(a) * rr, y + (rand() - 0.5) * h, z + Math.sin(a) * rr));
  }
}

/**
 * trees: [{ type: 'pine' | 'cypress' | 'broadleaf', x, z, s? }]
 * 局部坐标，由 city.place() 统一布局。返回 { group, surf, blockers }
 */
export function flora({ trees = [], seed = 31 }) {
  const group = new THREE.Group();
  const surf = [], blockers = [];
  let s0 = seed;
  const rand = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;

  const trunkM = [], pineM = [], cypM = [], leafM = [];
  const d = new THREE.Object3D();
  const push = (arr, x, y, z, sx, sy, sz, ry = 0, rz = 0) => {
    d.position.set(x, y, z);
    d.rotation.set(0, ry, rz);
    d.scale.set(sx, sy, sz);
    d.updateMatrix();
    arr.push(d.matrix.clone());
  };

  for (const t of trees) {
    const s = t.s ?? 1;
    const { x, z } = t;
    if (t.type === 'pine') {
      // 古松：微弯两段干 + 3~4 层错位扁伞盖
      const h = (6.5 + rand() * 2.5) * s;
      const lean = (rand() - 0.5) * 0.16;
      push(trunkM, x, 0, z, 0.26 * s, h * 0.4, 0.26 * s, rand() * 6.28, lean);
      push(trunkM, x + lean * h * 0.35, h * 0.36, z, 0.18 * s, h * 0.36, 0.18 * s, 0, -lean * 0.8);
      const layers = 3 + (rand() > 0.5 ? 1 : 0);
      for (let k = 0; k < layers; k++) {
        const rr = (2.4 - k * 0.45) * s;
        push(pineM,
          x + (rand() - 0.5) * 0.8 * s, h * (0.4 + k * 0.17), z + (rand() - 0.5) * 0.8 * s,
          rr, (0.5 + rand() * 0.25) * s, rr, rand() * 6.28);
      }
      specks(surf, rand, x, h * 0.72, z, 2.2 * s, h * 0.4);
    } else if (t.type === 'cypress') {
      // 古柏：单短干 + 三层窄锥叠成尖塔
      const h = (7.5 + rand() * 2.5) * s;
      push(trunkM, x, 0, z, 0.2 * s, h * 0.26, 0.2 * s);
      for (let k = 0; k < 3; k++) {
        const rr = (1.35 - k * 0.3) * s;
        push(cypM, x + (rand() - 0.5) * 0.3, h * (0.18 + k * 0.25), z + (rand() - 0.5) * 0.3,
          rr, h * 0.45, rr, rand() * 6.28);
      }
      specks(surf, rand, x, h * 0.6, z, 1.2 * s, h * 0.5);
    } else {
      // 阔叶树：单干 + 2~3 个错位球冠
      const h = (5 + rand() * 2) * s;
      push(trunkM, x, 0, z, 0.24 * s, h * 0.42, 0.24 * s, 0, (rand() - 0.5) * 0.12);
      const balls = 2 + (rand() > 0.4 ? 1 : 0);
      for (let k = 0; k < balls; k++) {
        const rr = (1.7 + rand() * 0.9) * s;
        push(leafM,
          x + (rand() - 0.5) * 1.7 * s, h * (0.55 + k * 0.18), z + (rand() - 0.5) * 1.7 * s,
          rr, rr * 0.72, rr);
      }
      specks(surf, rand, x, h * 0.7, z, 2.0 * s, h * 0.35);
    }
    blockers.push({ minX: x - 0.4 * s, maxX: x + 0.4 * s, minZ: z - 0.4 * s, maxZ: z + 0.4 * s, minY: 0, maxY: 3 });
  }

  for (const [geo, mat, mats] of [
    [trunkGeo, MAT.column, trunkM],
    [pineGeo, leafMat, pineM],
    [cypGeo, leafMat, cypM],
    [leafGeo, leafMat, leafM],
  ]) {
    if (!mats.length) continue;
    const inst = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  }

  return { group, surf, blockers };
}

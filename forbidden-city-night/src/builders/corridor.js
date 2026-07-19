// corridor.js — 连廊庑房：开间重复的柱廊 + 双坡屋顶（围合广场的「全貌」骨架）
import * as THREE from 'three';
import { MAT } from '../materials.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * 沿 Z 向的廊子（局部坐标，中心在原点）
 * opt: len 总长, bayW 开间, w 廊宽, colH 柱高
 */
export function corridor({ len = 60, bayW = 4.4, w = 3.4, colH = 3.3 }) {
  const group = new THREE.Group();
  const lines = [], blockers = [];
  const rise = 1.5, eave = 0.7;

  // ---------- 檐柱（两侧，InstancedMesh） ----------
  const bays = Math.max(2, Math.round(len / bayW));
  const step = len / bays;
  const colGeo = new THREE.CylinderGeometry(0.15, 0.18, colH, 6);
  const inst = new THREE.InstancedMesh(colGeo, MAT.column, (bays + 1) * 2);
  const m4 = new THREE.Matrix4();
  let i = 0;
  for (let k = 0; k <= bays; k++) {
    const z = -len / 2 + k * step;
    for (const sx of [-1, 1]) {
      m4.makeTranslation(sx * (w / 2 - 0.25), colH / 2, z);
      inst.setMatrixAt(i++, m4);
      lines.push({ pts: [V3(sx * (w / 2 - 0.25), 0.05, z), V3(sx * (w / 2 - 0.25), colH, z)], step: 0.8 });
    }
  }
  group.add(inst);

  // ---------- 双坡屋顶（两块斜板）+ 正脊 ----------
  const slope = Math.hypot(w / 2 + eave, rise);
  const ang = Math.atan2(rise, w / 2 + eave);
  for (const sx of [-1, 1]) {
    const g = new THREE.BoxGeometry(slope, 0.16, len);
    const m = new THREE.Mesh(g, MAT.roof);
    m.position.set(sx * (w / 4 + eave / 2), colH + rise / 2, 0);
    m.rotation.z = -sx * ang;
    group.add(m);
  }
  const ridge = new THREE.BoxGeometry(0.5, 0.32, len);
  ridge.translate(0, colH + rise + 0.1, 0);
  group.add(new THREE.Mesh(ridge, MAT.ridge));

  // ---------- 金色勾边：两檐口 + 正脊 + 两端博缝 ----------
  for (const sx of [-1, 1]) {
    lines.push({ pts: [V3(sx * (w / 2 + eave), colH + 0.05, -len / 2), V3(sx * (w / 2 + eave), colH + 0.05, len / 2)], step: 0.9 });
    for (const ez of [-len / 2, len / 2]) {
      lines.push({ pts: [V3(sx * (w / 2 + eave), colH + 0.05, ez), V3(0, colH + rise + 0.26, ez)], step: 0.6 });
    }
  }
  lines.push({ pts: [V3(0, colH + rise + 0.28, -len / 2), V3(0, colH + rise + 0.28, len / 2)], step: 0.8 });

  blockers.push({ minX: -w / 2 - 0.2, maxX: w / 2 + 0.2, minZ: -len / 2, maxZ: len / 2, minY: 0, maxY: colH + rise });
  return { group, lines, blockers };
}

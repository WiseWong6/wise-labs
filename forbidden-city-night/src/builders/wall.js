// wall.js — 环绕宫墙 + 角楼
import * as THREE from 'three';
import { MAT } from '../materials.js';
import { hall } from './hall.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * 宫墙一段（沿 Z 或 X）
 */
export function wallSegment({ x0, z0, x1, z1, h = 8 }) {
  const group = new THREE.Group();
  const lines = [], blockers = [];

  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const alongX = Math.abs(dx) > Math.abs(dz);

  const g = new THREE.BoxGeometry(alongX ? len : 1.6, h, alongX ? 1.6 : len);
  g.translate(cx, h / 2, cz);
  group.add(new THREE.Mesh(g, MAT.wallRed));
  // 墙帽
  const cap = new THREE.BoxGeometry(alongX ? len : 2.2, 0.7, alongX ? 2.2 : len);
  cap.translate(cx, h + 0.3, cz);
  group.add(new THREE.Mesh(cap, MAT.ridge));

  // 墙顶两条沿口线 + 墙帽脊线
  const n = Math.max(2, Math.round(len / 4));
  const topA = [], topB = [], capL = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + dx * t, z = z0 + dz * t;
    const ox = alongX ? 0 : 0.9, oz = alongX ? 0.9 : 0;
    topA.push(V3(x + ox, h + 0.7, z + oz));
    topB.push(V3(x - ox, h + 0.7, z - oz));
    capL.push(V3(x, h + 0.75, z));
  }
  lines.push({ pts: topA, step: 1.1 }, { pts: topB, step: 1.1 }, { pts: capL, step: 0.9 });

  blockers.push({
    minX: Math.min(x0, x1) - 0.8, maxX: Math.max(x0, x1) + 0.8,
    minZ: Math.min(z0, z1) - 0.8, maxZ: Math.max(z0, z1) + 0.8,
    minY: 0, maxY: h,
  });

  return { group, lines, blockers };
}

/**
 * 角楼（风格化）：方座 + 双层歇山式屋顶 + 宝顶
 */
export function cornerTower({ h = 9 }) {
  const group = new THREE.Group();
  const lines = [], surf = [], blockers = [];

  // 城台座
  const base = new THREE.BoxGeometry(12, h, 12);
  base.translate(0, h / 2, 0);
  group.add(new THREE.Mesh(base, MAT.wallRed));

  const t = hall({
    W: 9, D: 9, baseY: h, baseH: 0.5, colH: 4,
    type: 'xieshan', stories: 2, roofRise: 4.2, ov: 2.6, qiao: 1.0,
  });
  group.add(t.group);
  lines.push(...t.lines); surf.push(...t.surf);

  // 顶部小宝顶
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), MAT.finial);
  finial.position.set(0, t.topY + 0.5, 0);
  group.add(finial);
  lines.push({ pts: [V3(0, t.topY - 0.3, 0), V3(0, t.topY + 1.1, 0)], step: 0.3 });

  blockers.push({ minX: -6, maxX: 6, minZ: -6, maxZ: 6, minY: 0, maxY: h });
  return { group, lines, surf, blockers };
}

// platform.js — 三层须弥座台基（三大殿）与单层台基
import * as THREE from 'three';
import { MAT } from '../materials.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// 矩形轮廓线
function rectLine(w, d, y, step = 0.9) {
  const pts = [];
  const per = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, -d / 2]];
  for (let k = 0; k < 4; k++) {
    const [x0, z0] = per[k], [x1, z1] = per[k + 1];
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 3));
    for (let i = 0; i <= n; i++) pts.push(V3(x0 + (x1 - x0) * i / n, y, z0 + (z1 - z0) * i / n));
  }
  return { pts, step };
}

/**
 * 多层台基。tiers: [{w, d, h}] 自下而上；y0 为底标高。
 * 带每层拦板顶沿粒子线、望柱点、正面踏跺。
 */
export function platform({ tiers, y0 = 0 }) {
  const group = new THREE.Group();
  const lines = [], surf = [], heightZones = [];
  let y = y0;

  for (const t of tiers) {
    const g = new THREE.BoxGeometry(t.w, t.h, t.d);
    g.translate(0, y + t.h / 2, 0);
    const mesh = new THREE.Mesh(g, MAT.stone);
    group.add(mesh);
    // 顶部挑檐线脚（略宽薄板）
    const lip = new THREE.BoxGeometry(t.w + 0.9, 0.35, t.d + 0.9);
    lip.translate(0, y + t.h - 0.17, 0);
    group.add(new THREE.Mesh(lip, MAT.stoneDark));

    const topY = y + t.h;
    lines.push(rectLine(t.w + 0.9, t.d + 0.9, topY + 0.05));
    // 望柱：沿顶沿均布短竖线
    const posts = rectLine(t.w + 0.6, t.d + 0.6, topY);
    for (const p of posts.pts.filter((_, i) => i % 6 === 0))
      lines.push({ pts: [p.clone(), p.clone().add(V3(0, 1.1, 0))], step: 0.35 });

    heightZones.push({ minX: -t.w / 2, maxX: t.w / 2, minZ: -t.d / 2, maxZ: t.d / 2, h: topY });
    y = topY;
  }

  // 正面踏跺（南中、北中各一）
  for (const sign of [1, -1]) {
    const topT = tiers[tiers.length - 1];
    const stairW = 8, steps = 10;
    const totalH = y - y0;
    for (let i = 0; i < steps; i++) {
      const sh = totalH * (1 - (i + 1) / steps);
      const sz = sign * (topT.d / 2 + (i + 0.5) * (totalH / steps) * 1.2);
      const sg = new THREE.BoxGeometry(stairW, totalH / steps, (totalH / steps) * 1.2 + 0.05);
      sg.translate(0, y0 + totalH - sh - (totalH / steps) / 2, sz);
      group.add(new THREE.Mesh(sg, MAT.stoneDark));
    }
    // 踏跺边线
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push(V3(stairW / 2, y0 + totalH * (1 - t), sign * (topT.d / 2 + t * totalH * 1.2)));
      pts.push(V3(-stairW / 2, y0 + totalH * (1 - t), sign * (topT.d / 2 + t * totalH * 1.2)));
    }
    lines.push({ pts, step: 0.7 });
  }

  return { group, lines, surf, heightZones, topY: y };
}

// hall.js — 殿宇：台基 + 柱网 + 墙身门窗 + 屋顶（庑殿/歇山/攒尖，单檐/重檐）
import * as THREE from 'three';
import { MAT } from '../materials.js';
import { roof } from './roof.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * opt:
 *  W, D        面阔 / 进深（柱网外皮）
 *  baseY       台基顶面标高（局部坐标）
 *  baseH       台基高（0 表示无台基）
 *  colH        柱高（檐口下皮）
 *  type        'wudian' | 'xieshan' | 'zanjian'
 *  stories     1 | 2（2 = 重檐）
 *  roofRise    屋顶举高（默认按面阔估算）
 */
export function hall(opt) {
  const {
    W = 30, D = 18, baseY = 0, baseH = 1.2, colH = 7,
    type = 'wudian', stories = 1, roofRise = null,
    ov = Math.min(3.2, D * 0.16 + 1.6), qiao = 1.1,
  } = opt;

  const group = new THREE.Group();
  const lines = [], surf = [], blockers = [];

  // ---------- 台基 ----------
  let floorY = baseY;
  if (baseH > 0) {
    const bw = W + 5, bd = D + 5;
    const g = new THREE.BoxGeometry(bw, baseH, bd);
    g.translate(0, baseY + baseH / 2, 0);
    group.add(new THREE.Mesh(g, MAT.stone));
    const lip = new THREE.BoxGeometry(bw + 0.8, 0.3, bd + 0.8);
    lip.translate(0, baseY + baseH - 0.15, 0);
    group.add(new THREE.Mesh(lip, MAT.stoneDark));
    // 台基顶沿轮廓
    const per = [[-bw / 2, -bd / 2], [bw / 2, -bd / 2], [bw / 2, bd / 2], [-bw / 2, bd / 2], [-bw / 2, -bd / 2]];
    const pts = [];
    for (let k = 0; k < 4; k++) {
      const n = Math.max(2, Math.round(Math.hypot(per[k + 1][0] - per[k][0], per[k + 1][1] - per[k][1]) / 3));
      for (let i = 0; i <= n; i++)
        pts.push(V3(per[k][0] + (per[k + 1][0] - per[k][0]) * i / n, baseY + baseH + 0.05, per[k][1] + (per[k + 1][1] - per[k][1]) * i / n));
    }
    lines.push({ pts, step: 1.0 });
    blockers.push({ minX: -bw / 2, maxX: bw / 2, minZ: -bd / 2, maxZ: bd / 2, minY: baseY, maxY: baseY + baseH });
    floorY = baseY + baseH;
  }

  // ---------- 墙身 + 柱网（一层或多层） ----------
  const storyW = stories === 2 ? [W, W * 0.74] : [W];
  const storyD = stories === 2 ? [D, D * 0.74] : [D];
  const storyColH = stories === 2 ? [colH, colH * 0.66] : [colH];

  let cursorY = floorY;
  const eaves = []; // 各层檐口标高

  for (let s = 0; s < stories; s++) {
    const w = storyW[s], d = storyD[s], ch = storyColH[s];

    // 墙体（暗红剪影）
    const wallG = new THREE.BoxGeometry(w - 1.2, ch, d - 1.2);
    wallG.translate(0, cursorY + ch / 2, 0);
    group.add(new THREE.Mesh(wallG, MAT.wallRed));

    // 门窗暖光带（前后檐墙）
    for (const sign of [1, -1]) {
      const win = new THREE.BoxGeometry(w - 2.5, ch * 0.4, 0.25);
      win.translate(0, cursorY + ch * 0.38, sign * (d / 2 - 0.72));
      group.add(new THREE.Mesh(win, MAT.windowGlow));
    }

    // 檐柱环（InstancedMesh）+ 柱列粒子线
    const nx = Math.max(2, Math.round(w / 4.2)), nz = Math.max(2, Math.round(d / 4.2));
    const colGeo = new THREE.CylinderGeometry(0.32, 0.36, ch, 6);
    const cols = [];
    for (let i = 0; i <= nx; i++) {
      const x = -w / 2 + (i / nx) * w;
      cols.push([x, d / 2], [x, -d / 2]);
    }
    for (let i = 1; i < nz; i++) {
      const z = -d / 2 + (i / nz) * d;
      cols.push([w / 2, z], [-w / 2, z]);
    }
    const inst = new THREE.InstancedMesh(colGeo, MAT.column, cols.length);
    const m4 = new THREE.Matrix4();
    cols.forEach(([x, z], i) => {
      m4.makeTranslation(x, cursorY + ch / 2, z);
      inst.setMatrixAt(i, m4);
      lines.push({ pts: [V3(x, cursorY, z), V3(x, cursorY + ch, z)], step: 0.85 });
    });
    group.add(inst);

    // 阑额（柱顶水平连线）
    lines.push({ pts: [V3(-w / 2, cursorY + ch, d / 2), V3(w / 2, cursorY + ch, d / 2)], step: 0.8 });
    lines.push({ pts: [V3(-w / 2, cursorY + ch, -d / 2), V3(w / 2, cursorY + ch, -d / 2)], step: 0.8 });
    lines.push({ pts: [V3(-w / 2, cursorY + ch, -d / 2), V3(-w / 2, cursorY + ch, d / 2)], step: 0.8 });
    lines.push({ pts: [V3(w / 2, cursorY + ch, -d / 2), V3(w / 2, cursorY + ch, d / 2)], step: 0.8 });

    blockers.push({ minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2, minY: cursorY, maxY: cursorY + ch });
    cursorY += ch;
    eaves.push(cursorY);
  }

  // ---------- 屋顶 ----------
  const rise = roofRise ?? THREE.MathUtils.clamp(W * 0.20, 4.0, 9.5);

  if (stories === 2) {
    // 下檐裙屋顶：檐口在一层柱顶，顶矩形为上层墙身外皮
    const lower = roof({
      W: storyW[0], D: storyD[0], H: eaves[0] + 2.1, E: eaves[0] - 0.4,
      topW: storyW[1] + 0.6, topD: storyD[1] + 0.6,
      ov: ov * 0.9, qiao: qiao * 0.8, ridgeMesh: false, surfStep: 2.0,
    });
    addRoof(group, lines, surf, lower);
  }

  const upper = roof({
    W: storyW[stories - 1], D: storyD[stories - 1],
    H: eaves[stories - 1] + rise, E: eaves[stories - 1] - 0.3,
    topW: type === 'zanjian' ? 0 : null, topD: 0,
    ov, qiao, gable: type === 'xieshan' ? 1 : 0,
    surfStep: 1.7,
  });
  addRoof(group, lines, surf, upper);

  // 攒尖宝顶
  if (type === 'zanjian') {
    const topY = eaves[stories - 1] + rise;
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 1.6, 8), MAT.finial);
    fin.position.set(0, topY + 0.8, 0);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), MAT.finial);
    ball.position.set(0, topY + 2.1, 0);
    group.add(fin, ball);
    lines.push({ pts: [V3(0, topY, 0), V3(0, topY + 2.9, 0)], step: 0.35 });
  }

  return { group, lines, surf, blockers, topY: eaves[stories - 1] + rise };
}

function addRoof(group, lines, surf, r) {
  for (const g of r.roofGeos) group.add(new THREE.Mesh(g, MAT.roof));
  for (const g of r.ridgeGeos) group.add(new THREE.Mesh(g, MAT.ridge));
  for (const g of r.gableGeos) group.add(new THREE.Mesh(g, MAT.gable));
  lines.push(...r.lines);
  surf.push(...r.surf);
}

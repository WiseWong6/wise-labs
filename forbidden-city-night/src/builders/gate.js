// gate.js — 城门：城台（含拱券门洞轮廓）+ 门楼；午门为凹字形组合
import * as THREE from 'three';
import { MAT } from '../materials.js';
import { hall } from './hall.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// 拱券轮廓（xz 平面内的门洞，生成在 z = ±d/2 面上）
function archLine(cx, baseY, w, h, zFace) {
  const pts = [];
  const r = w / 2, straightH = h - r;
  pts.push(V3(cx - r, baseY, zFace), V3(cx - r, baseY + straightH, zFace));
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI - (i / 10) * Math.PI;
    pts.push(V3(cx + Math.cos(a) * r, baseY + straightH + Math.sin(a) * r, zFace));
  }
  pts.push(V3(cx + r, baseY, zFace));
  return { pts, step: 0.5 };
}

/**
 * 城门 = 城台 + 顶部门楼
 * opt: W, D, podH 城台高, gateHalls 传给 hall 的参数, arches 门洞数
 */
export function gateTower(opt) {
  const {
    W = 46, D = 22, podH = 10, arches = 3,
    tower = {},
  } = opt;

  const group = new THREE.Group();
  const lines = [], surf = [], blockers = [];

  // 城台
  const pod = new THREE.BoxGeometry(W, podH, D);
  pod.translate(0, podH / 2, 0);
  group.add(new THREE.Mesh(pod, MAT.wallRed));
  // 城台顶沿女墙
  const parapet = new THREE.BoxGeometry(W + 0.6, 0.9, D + 0.6);
  parapet.translate(0, podH + 0.45, 0);
  group.add(new THREE.Mesh(parapet, MAT.stoneDark));
  lines.push({ pts: [V3(-W / 2, podH + 0.9, D / 2), V3(W / 2, podH + 0.9, D / 2)], step: 0.9 });
  lines.push({ pts: [V3(-W / 2, podH + 0.9, -D / 2), V3(W / 2, podH + 0.9, -D / 2)], step: 0.9 });
  // 城台底沿
  lines.push({ pts: [V3(-W / 2, 0.1, D / 2), V3(W / 2, 0.1, D / 2)], step: 1.2 });
  lines.push({ pts: [V3(-W / 2, 0.1, -D / 2), V3(W / 2, 0.1, -D / 2)], step: 1.2 });

  // 门洞（黑色凹入 + 拱券轮廓线）
  const gapHalf = 2.6;
  for (let a = 0; a < arches; a++) {
    const cx = (a - (arches - 1) / 2) * (W / (arches + 0.5));
    for (const sign of [1, -1]) {
      const dark = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 6.4), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      dark.position.set(cx, 3.2, sign * (D / 2 + 0.03));
      if (sign < 0) dark.rotation.y = Math.PI;
      group.add(dark);
      lines.push(archLine(cx, 0, 5.2, 6.4, sign * (D / 2 + 0.06)));
    }
    if (a === Math.floor(arches / 2)) {
      // 中门可通行：blockers 留 gap
    }
  }
  blockers.push({
    minX: -W / 2, maxX: W / 2, minZ: -D / 2, maxZ: D / 2, minY: 0, maxY: podH,
    gapX: [-gapHalf, gapHalf],   // 中门通道
  });

  // 顶部门楼
  const t = hall({
    W: tower.W ?? W * 0.62, D: tower.D ?? D * 0.7,
    baseY: podH + 0.9, baseH: 0.8, colH: tower.colH ?? 6,
    type: tower.type ?? 'xieshan', stories: tower.stories ?? 1,
    roofRise: tower.roofRise, ov: tower.ov, qiao: tower.qiao,
  });
  group.add(t.group);
  lines.push(...t.lines);
  surf.push(...t.surf);
  blockers.push(...t.blockers);

  return { group, lines, surf, blockers, topY: podH + t.topY };
}

/**
 * 午门：凹字形 —— 中央城台 + 两侧向南伸出的雁翅楼城台，上建五凤楼（一中四隅）
 */
export function meridianGate() {
  const group = new THREE.Group();
  const lines = [], surf = [], blockers = [];

  // 中央城台
  const center = gateTower({
    W: 62, D: 26, podH: 12, arches: 3,
    tower: { W: 40, D: 18, colH: 7, type: 'wudian', stories: 2, roofRise: 7 },
  });
  group.add(center.group);
  lines.push(...center.lines); surf.push(...center.surf); blockers.push(...center.blockers);

  // 两翼城台（向南伸出）
  for (const s of [-1, 1]) {
    const wing = gateTower({
      W: 22, D: 46, podH: 12, arches: 0,
      tower: { W: 15, D: 30, colH: 5.5, type: 'xieshan', stories: 1, roofRise: 5 },
    });
    wing.group.position.set(s * 42, 0, 30);
    group.add(wing.group);
    const off = new THREE.Vector3(s * 42, 0, 30);
    for (const l of wing.lines) lines.push({ pts: l.pts.map(p => p.clone().add(off)), step: l.step });
    surf.push(...wing.surf.map(p => p.clone().add(off)));
    for (const b of wing.blockers)
      blockers.push({ ...b, minX: b.minX + off.x, maxX: b.maxX + off.x, minZ: b.minZ + off.z, maxZ: b.maxZ + off.z, gapX: undefined });

    // 隅楼（角亭，攒尖）立于转角
    const corner = hall({
      W: 10, D: 10, baseY: 12.9, baseH: 0.6, colH: 4.5,
      type: 'zanjian', stories: 1, roofRise: 4.5, ov: 2.2, qiao: 0.9,
    });
    corner.group.position.set(s * 42, 0, 6);
    group.add(corner.group);
    const coff = new THREE.Vector3(s * 42, 0, 6);
    for (const l of corner.lines) lines.push({ pts: l.pts.map(p => p.clone().add(coff)), step: l.step });
    surf.push(...corner.surf.map(p => p.clone().add(coff)));
  }

  return { group, lines, surf, blockers };
}

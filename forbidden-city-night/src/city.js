// city.js — 中轴线布局：午门→金水桥→太和门→三大殿→乾清门→乾清宫→坤宁宫→御花园→神武门
import * as THREE from 'three';
import { hall } from './builders/hall.js';
import { platform } from './builders/platform.js';
import { gateTower, meridianGate } from './builders/gate.js';
import { wallSegment, cornerTower } from './builders/wall.js';
import { river, bridge } from './builders/bridge.js';
import { corridor } from './builders/corridor.js';
import { flora } from './builders/flora.js';
import * as F from './builders/furnish.js';
import { MAT, createWater } from './materials.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildCity() {
  const group = new THREE.Group();
  const lines = [], surf = [], blockers = [], heightZones = [], labels = [], beams = [];
  // 全城水面共用一份时间（内金水河 + 护城河）
  const waterUniforms = { uTime: { value: 0 } };

  // 把子建造物放到 (x, z)，采样点同步平移
  function place(obj, x, z, rotY = 0) {
    obj.group.position.set(x, 0, z);
    obj.group.rotation.y = rotY;
    group.add(obj.group);
    const off = V3(x, 0, z);
    const rot = new THREE.Matrix4().makeRotationY(rotY);
    const xform = (p) => p.clone().applyMatrix4(rot).add(off);
    for (const l of obj.lines || []) lines.push({ pts: l.pts.map(xform), step: l.step });
    for (const p of obj.surf || []) surf.push(xform(p));
    for (const b of obj.blockers || []) {
      if (rotY !== 0) continue; // 本布局不旋转
      blockers.push({
        ...b,
        minX: b.minX + x, maxX: b.maxX + x,
        minZ: b.minZ + z, maxZ: b.maxZ + z,
        gapX: b.gapX ? [b.gapX[0] + x, b.gapX[1] + x] : undefined,
      });
    }
    for (const hz of obj.heightZones || []) {
      heightZones.push({
        ...hz,
        minX: hz.minX + x, maxX: hz.maxX + x,
        minZ: hz.minZ + z, maxZ: hz.maxZ + z,
      });
    }
    return obj;
  }

  // ============ 午门（南正门，z=235） ============
  const wumen = place(meridianGate(), 0, 235);
  labels.push({ name: '午门', pos: V3(0, 34, 235), maxDist: 200 });
  beams.push({ x: 0, z: 235, base: 40, h: 90 }, { x: -42, z: 265, base: 25, h: 70 }, { x: 42, z: 265, base: 25, h: 70 });

  // ============ 内金水河 + 五桥（z=170） ============
  place(river({ width: 250, span: 16, uniforms: waterUniforms }), 0, 170);
  const bridgeXs = [-30, -15, 0, 15, 30];
  for (const bx of bridgeXs) {
    const b = place(bridge({ w: bx === 0 ? 6.5 : 4.5, span: 22, rise: 1.25 }), bx, 170);
  }
  labels.push({ name: '金水桥', pos: V3(0, 6, 170), maxDist: 120 });
  // 水面行走禁区（步行时）
  const waterZone = { minX: -125, maxX: 125, minZ: 162, maxZ: 178 };

  // ============ 太和门（z=95） ============
  place(gateTower({
    W: 50, D: 24, podH: 4.5, arches: 3,
    tower: { W: 36, D: 16, colH: 7.5, type: 'xieshan', stories: 2, roofRise: 6.5 },
  }), 0, 95);
  labels.push({ name: '太和门', pos: V3(0, 24, 95), maxDist: 160 });
  beams.push({ x: 0, z: 95, base: 25, h: 70 });

  // ============ 三大殿三层台基（中心 z=-55） ============
  const terr = platform({
    tiers: [
      { w: 150, d: 110, h: 2.3 },
      { w: 128, d: 90, h: 2.3 },
      { w: 106, d: 72, h: 2.6 },
    ],
    y0: 0,
  });
  place(terr, 0, -55);
  const terrTop = terr.topY; // ≈7.2

  // 太和殿（重檐庑殿，z=-30）
  place(hall({
    W: 64, D: 37, baseY: terrTop, baseH: 0.9, colH: 11,
    type: 'wudian', stories: 2, roofRise: 9.2, ov: 4.2, qiao: 1.3,
  }), 0, -30);
  labels.push({ name: '太和殿', pos: V3(0, terrTop + 26, -30), maxDist: 260 });
  beams.push({ x: 0, z: -30, base: terrTop + 24, h: 110 });

  // 中和殿（四角攒尖，z=-62）
  place(hall({
    W: 19, D: 19, baseY: terrTop, baseH: 0.9, colH: 8,
    type: 'zanjian', stories: 1, roofRise: 7.5, ov: 3, qiao: 1.1,
  }), 0, -62);
  labels.push({ name: '中和殿', pos: V3(0, terrTop + 18, -62), maxDist: 160 });

  // 保和殿（重檐歇山，z=-88）
  place(hall({
    W: 50, D: 28, baseY: terrTop, baseH: 0.9, colH: 9.5,
    type: 'xieshan', stories: 2, roofRise: 8, ov: 3.8, qiao: 1.2,
  }), 0, -88);
  labels.push({ name: '保和殿', pos: V3(0, terrTop + 22, -88), maxDist: 220 });
  beams.push({ x: 0, z: -88, base: terrTop + 20, h: 90 });

  // ============ 乾清门（z=-165） ============
  place(gateTower({
    W: 36, D: 16, podH: 3.5, arches: 3,
    tower: { W: 28, D: 12, colH: 6.5, type: 'xieshan', stories: 1, roofRise: 5.5 },
  }), 0, -165);
  labels.push({ name: '乾清门', pos: V3(0, 16, -165), maxDist: 140 });

  // ============ 乾清宫（重檐庑殿，z=-215） ============
  place(hall({
    W: 46, D: 26, baseY: 0, baseH: 2.2, colH: 9,
    type: 'wudian', stories: 2, roofRise: 7.5, ov: 3.6, qiao: 1.15,
  }), 0, -215);
  labels.push({ name: '乾清宫', pos: V3(0, 24, -215), maxDist: 200 });
  beams.push({ x: 0, z: -215, base: 22, h: 85 });

  // ============ 坤宁宫（z=-285） ============
  place(hall({
    W: 40, D: 22, baseY: 0, baseH: 2.0, colH: 8,
    type: 'wudian', stories: 1, roofRise: 7, ov: 3.4, qiao: 1.1,
  }), 0, -285);
  labels.push({ name: '坤宁宫', pos: V3(0, 19, -285), maxDist: 180 });

  // ============ 御花园（z=-330..-430）：程序化林木 ============
  const garden = buildGarden();
  place(garden, 0, -380);
  labels.push({ name: '御花园', pos: V3(0, 14, -380), maxDist: 160 });

  // ============ 神武门（北，z=-470） ============
  place(gateTower({
    W: 52, D: 24, podH: 11, arches: 3,
    tower: { W: 38, D: 17, colH: 7, type: 'xieshan', stories: 2, roofRise: 7 },
  }), 0, -470);
  labels.push({ name: '神武门', pos: V3(0, 30, -470), maxDist: 200 });
  beams.push({ x: 0, z: -470, base: 30, h: 90 });

  // ============ 东西配殿与楼阁（丰富建筑群） ============
  for (const sx of [-1, 1]) {
    // 太和门广场两侧配殿
    place(hall({ W: 24, D: 12, baseH: 1.2, colH: 5.5, type: 'xieshan', stories: 1, roofRise: 4.5 }), sx * 70, 130);
    place(hall({ W: 24, D: 12, baseH: 1.2, colH: 5.5, type: 'xieshan', stories: 1, roofRise: 4.5 }), sx * 105, 130);
    // 体仁阁 / 弘义阁（三大殿台基两侧楼阁）
    place(hall({ W: 20, D: 14, baseH: 1.6, colH: 6, type: 'xieshan', stories: 2, roofRise: 5.5 }), sx * 95, -30);
    place(hall({ W: 20, D: 14, baseH: 1.6, colH: 6, type: 'xieshan', stories: 2, roofRise: 5.5 }), sx * 95, -88);
    // 东西六宫意象（乾清宫、坤宁宫两侧）
    place(hall({ W: 26, D: 16, baseH: 1.2, colH: 6, type: 'wudian', stories: 1, roofRise: 5.5 }), sx * 75, -215);
    place(hall({ W: 26, D: 16, baseH: 1.2, colH: 6, type: 'wudian', stories: 1, roofRise: 5.5 }), sx * 75, -285);
    // 御花园攒尖亭
    place(hall({ W: 9, D: 9, baseH: 0.8, colH: 3.6, type: 'zanjian', stories: 1, roofRise: 4 }), sx * 45, -355);
    place(hall({ W: 9, D: 9, baseH: 0.8, colH: 3.6, type: 'zanjian', stories: 1, roofRise: 4 }), sx * 45, -405);
  }
  labels.push({ name: '体仁阁', pos: V3(95, 18, -30), maxDist: 140 });
  labels.push({ name: '弘义阁', pos: V3(-95, 18, -30), maxDist: 140 });
  beams.push({ x: 95, z: -30, base: 16, h: 50 }, { x: -95, z: -30, base: 16, h: 50 });

  // ============ 连廊庑房（围合三大广场） ============
  place(corridor({ len: 76 }), 55, 101);    // 太和门广场东庑
  place(corridor({ len: 76 }), -55, 101);   // 太和门广场西庑
  place(corridor({ len: 122 }), 82, -50);   // 三大殿广场东庑
  place(corridor({ len: 122 }), -82, -50);  // 三大殿广场西庑
  place(corridor({ len: 48 }), 45, -164);   // 乾清门广场东庑
  place(corridor({ len: 48 }), -45, -164);  // 乾清门广场西庑

  // ============ 殿前陈设 ============
  for (const sx of [-1, 1]) {
    place(F.huabiao(), sx * 18, 258);              // 午门外华表
    place(F.huabiao(), sx * 8, 184);               // 金水桥北岸华表
    place(F.stoneLion(), sx * 13, 113);            // 太和门前石狮
    place(F.stoneLion(), sx * 10, -146);           // 乾清门前石狮
    place(F.stoneLion(), sx * 16, 214);            // 午门内石狮
    place(F.censer({ baseY: 2.3 }), sx * 14, -5.5);// 太和殿前香炉（台基一层顶）
    place(F.censer(), sx * 5, -197);               // 乾清宫前香炉
    place(F.censer(), sx * 5, -267);               // 坤宁宫前香炉
    place(F.crane({ baseY: 2.3 }), sx * 5.5, -5.5);// 铜鹤
    place(F.turtle({ baseY: 2.3 }), sx * 2.8, -5.5);// 铜龟
  }
  place(F.sundial({ baseY: 2.3 }), 10, -5.5);      // 日晷
  place(F.measure({ baseY: 2.3 }), -10, -5.5);     // 嘉量
  // 铜缸沿中轴阵列
  const vatSpots = [
    [16, 6], [-16, 6], [16, -118], [-16, -118],
    [14, -186], [-14, -186], [14, -238], [-14, -238], [14, -262], [-14, -262],
    [20, 118], [-20, 118], [20, 60], [-20, 60],
  ];
  for (const [vx, vz] of vatSpots) place(F.bronzeVat(), vx, vz);

  // ============ 宫区植被（太和门/三大殿广场保持空旷） ============
  {
    let ts = 421;
    const trand = () => (ts = (ts * 16807) % 2147483647) / 2147483647;
    const trees = [];
    // 金水河南北两岸：古柏列植
    for (const bz of [152, 188]) {
      for (let bx = -115; bx <= 115; bx += 22) {
        if (Math.abs(bx) < 42) continue;
        trees.push({ type: 'cypress', x: bx + (trand() - 0.5) * 3, z: bz + (trand() - 0.5) * 4, s: 0.9 + trand() * 0.3 });
      }
    }
    // 后三宫两侧：古松组团
    for (const [px, pz] of [[34, -215], [34, -285], [36, -245], [-34, -215], [-34, -285], [-36, -245]])
      trees.push({ type: 'pine', x: px + (trand() - 0.5) * 3, z: pz + (trand() - 0.5) * 6, s: 1 + trand() * 0.35 });
    // 午门内广场边缘：古柏
    for (const sx of [-1, 1]) for (const bz of [206, 222])
      trees.push({ type: 'cypress', x: sx * (50 + trand() * 4), z: bz, s: 0.95 + trand() * 0.25 });
    // 城墙内侧散植松柏
    for (const sx of [-1, 1]) for (const wz of [-150, -60, 60, 150])
      trees.push({ type: trand() > 0.5 ? 'pine' : 'cypress', x: sx * (112 + trand() * 8), z: wz + (trand() - 0.5) * 14, s: 0.9 + trand() * 0.4 });
    // 神武门内两侧
    for (const sx of [-1, 1]) for (const gz of [-442, -452])
      trees.push({ type: 'pine', x: sx * (36 + trand() * 22), z: gz, s: 0.95 + trand() * 0.3 });
    place(flora({ trees, seed: 1231 }), 0, 0);
  }

  // ============ 火树银花：御道灯杆 + 灯树 ============
  place(buildLanternPoles(), 0, 0);
  const treeSpots = [
    [-25, 205], [25, 205],      // 午门内广场
    [-25, 145], [25, 145],      // 金水河北岸
    [-42, 55], [42, 55],        // 太和门广场
    [-38, 25], [38, 25],        // 三大殿广场南
    [-30, -140], [30, -140],    // 乾清门广场
    [-18, -325], [18, -325],    // 御花园入口
    [-70, -250], [70, -250],    // 东西六宫之间
  ];
  for (const [tx, tz] of treeSpots) place(buildLanternTree(), tx, tz);

  // ============ 宫墙 + 四角楼 ============
  const WALL_X = 135, WALL_S = 235, WALL_N = -470, WALL_H = 8;
  // 南墙（午门两侧）
  place(wallSegment({ x0: -WALL_X, z0: WALL_S, x1: -53, z1: WALL_S, h: WALL_H }), 0, 0);
  place(wallSegment({ x0: 53, z0: WALL_S, x1: WALL_X, z1: WALL_S, h: WALL_H }), 0, 0);
  // 北墙（神武门两侧）
  place(wallSegment({ x0: -WALL_X, z0: WALL_N, x1: -28, z1: WALL_N, h: WALL_H }), 0, 0);
  place(wallSegment({ x0: 28, z0: WALL_N, x1: WALL_X, z1: WALL_N, h: WALL_H }), 0, 0);
  // 东西墙
  place(wallSegment({ x0: -WALL_X, z0: WALL_S, x1: -WALL_X, z1: WALL_N, h: WALL_H }), 0, 0);
  place(wallSegment({ x0: WALL_X, z0: WALL_S, x1: WALL_X, z1: WALL_N, h: WALL_H }), 0, 0);
  // 角楼
  for (const [cx, cz] of [[-WALL_X, WALL_S], [WALL_X, WALL_S], [-WALL_X, WALL_N], [WALL_X, WALL_N]]) {
    place(cornerTower({ h: WALL_H }), cx, cz);
    beams.push({ x: cx, z: cz, base: 20, h: 55 });
  }
  labels.push({ name: '角楼', pos: V3(-WALL_X, 18, WALL_N), maxDist: 220 });

  // ============ 护城河（筒子河）+ 南北石桥 ============
  const moat = buildMoat(waterUniforms);
  place(moat, 0, 0);
  const waterZones = [waterZone, ...moat.waterZones];

  return { group, lines, surf, blockers, heightZones, labels, beams, waterZone, waterZones, waterUniforms };
}

// 御花园：flora 混交密林（松/柏/阔叶）+ 假山
function buildGarden() {
  const group = new THREE.Group();
  const lines = [], surf = [], blockers = [];

  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const trees = [];
  for (let i = 0; i < 60; i++) {
    const x = (rand() * 2 - 1) * 55;
    const z = (rand() * 2 - 1) * 45;
    if (Math.abs(x) < 6) continue;                          // 让出御道
    if (Math.abs(Math.abs(x) - 45) < 9 && Math.abs(Math.abs(z) - 25) < 9) continue; // 让出四角亭
    const r = rand();
    trees.push({
      type: r < 0.42 ? 'pine' : r < 0.68 ? 'cypress' : 'broadleaf',
      x, z, s: 0.8 + rand() * 0.55,
    });
  }
  const fl = flora({ trees, seed: 7 });
  group.add(fl.group);
  surf.push(...fl.surf);
  blockers.push(...fl.blockers);

  // 假山（堆叠错位的暗色方块）
  for (const [rx, rz, s] of [[-28, -18, 7], [30, 12, 9], [-32, 22, 6]]) {
    for (let k = 0; k < 5; k++) {
      const g = new THREE.BoxGeometry(s * (1 - k * 0.15), s * 0.36, s * (0.8 - k * 0.12));
      g.translate(rx + (rand() - 0.5) * 2, k * s * 0.3 + s * 0.18, rz + (rand() - 0.5) * 2);
      group.add(new THREE.Mesh(g, MAT.stoneDark));
    }
    blockers.push({ minX: rx - s / 2, maxX: rx + s / 2, minZ: rz - s / 2, maxZ: rz + s / 2, minY: 0, maxY: s * 1.5 });
  }

  return { group, lines, surf, blockers };
}

// 护城河（筒子河）：宫墙外一周水带 + 岸条石金线 + 南北石桥
function buildMoat(waterUniforms) {
  const group = new THREE.Group();
  const lines = [], heightZones = [], waterZones = [];
  const W = 34;                       // 水面宽
  // 四段水面（南段避开午门雁翅楼，北段避开神武门城台）
  const segs = [
    { cx: 0, cz: 309, w: 358, l: W },        // 南：z 292..326
    { cx: 0, cz: -505, w: 358, l: W },       // 北：z -488..-522
    { cx: 158, cz: -98, w: W, l: 780 },      // 东：x 141..175, z 292..-488
    { cx: -158, cz: -98, w: W, l: 780 },     // 西
  ];
  for (const s of segs) {
    const water = createWater(s.w, s.l, waterUniforms);
    water.position.set(s.cx, -0.9, s.cz);
    group.add(water);
    // 两岸条石 + 沿口金线
    for (const sign of [1, -1]) {
      const alongX = s.w > s.l;
      const off = (alongX ? s.l : s.w) / 2 + 0.7;
      const bank = new THREE.BoxGeometry(alongX ? s.w : 1.4, 1.1, alongX ? 1.4 : s.l);
      bank.translate(s.cx + (alongX ? 0 : sign * off), -0.55, s.cz + (alongX ? sign * off : 0));
      group.add(new THREE.Mesh(bank, MAT.stoneDark));
      const pts = [];
      const n = Math.max(8, Math.round((alongX ? s.w : s.l) / 6));
      for (let i = 0; i <= n; i++) {
        const t = i / n - 0.5;
        pts.push(alongX
          ? V3(s.cx + t * s.w, 0.1, s.cz + sign * off)
          : V3(s.cx + sign * off, 0.1, s.cz + t * s.l));
      }
      lines.push({ pts, step: 1.6 });
    }
    // 水面禁区（步行，桥面由 heightZones 豁免）
    waterZones.push({
      minX: s.cx - s.w / 2, maxX: s.cx + s.w / 2,
      minZ: s.cz - s.l / 2, maxZ: s.cz + s.l / 2,
    });
  }
  // 南北石桥（平板石桥，可通行）
  for (const bz of [309, -505]) {
    const deck = new THREE.BoxGeometry(11, 0.5, 46);
    deck.translate(0, 0.25, bz);
    group.add(new THREE.Mesh(deck, MAT.stone));
    heightZones.push({ minX: -5.5, maxX: 5.5, minZ: bz - 23, maxZ: bz + 23, h: 0.5 });
    for (const sx of [-1, 1]) {
      lines.push({ pts: [V3(sx * 5.2, 1.1, bz - 23), V3(sx * 5.2, 1.1, bz + 23)], step: 1.2 });
      for (let pz = bz - 20; pz <= bz + 20; pz += 5)
        lines.push({ pts: [V3(sx * 5.2, 0.5, pz), V3(sx * 5.2, 1.2, pz)], step: 0.4 });
    }
  }
  return { group, lines, heightZones, waterZones };
}

// 御道灯杆：细杆 + 顶端暖光灯笼（灯笼光点进入金色点云）
function buildLanternPoles() {
  const group = new THREE.Group();
  const surf = [], blockers = [];
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 4.6, 5);
  const lampGeo = new THREE.SphereGeometry(0.55, 8, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff7a26 });
  // 跳过：午门城台 / 太和门 / 金水河 / 三大殿台基 / 乾清门
  const skips = [[215, 250], [80, 110], [150, 185], [-115, 10], [-180, -150]];
  for (let z = 225; z >= -450; z -= 27) {
    if (skips.some(([a, b]) => z > a && z < b)) continue;
    for (const x of [-9, 9]) {
      const pole = new THREE.Mesh(poleGeo, MAT.column);
      pole.position.set(x, 2.3, z);
      group.add(pole);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(x, 5.0, z);
      group.add(lamp);
      // 灯笼周围的光点簇
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        surf.push(V3(x + Math.cos(a) * 0.7, 5.0 + (k % 2) * 0.5 - 0.25, z + Math.sin(a) * 0.7));
      }
      blockers.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3, minY: 0, maxY: 4.6 });
    }
  }
  return { group, surf, blockers };
}

// 火树银花：暗色树形 + 满树金银灯珠（密集点云）+ 悬挂小红灯笼
function buildLanternTree() {
  const group = new THREE.Group();
  const surf = [], blockers = [];
  const h = 6.5, r = 2.6;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, h * 0.4, 5), MAT.column);
  trunk.position.y = h * 0.2;
  group.add(trunk);
  for (let k = 0; k < 3; k++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(r * (1 - k * 0.26), h * 0.34, 7),
      new THREE.MeshStandardMaterial({ color: 0x0a140c, roughness: 1 })
    );
    cone.position.y = h * (0.42 + k * 0.19);
    group.add(cone);
  }
  // 满树灯珠（金银双色靠点云 aMix 随机）
  for (let k = 0; k < 90; k++) {
    const a = Math.random() * Math.PI * 2;
    const yy = h * (0.35 + Math.random() * 0.55);
    const rr = r * (1 - (yy / h - 0.35) * 0.9) * (0.4 + Math.random() * 0.65);
    surf.push(V3(Math.cos(a) * rr, yy, Math.sin(a) * rr));
  }
  // 悬挂小红灯笼
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff4a1a });
  const lampGeo = new THREE.SphereGeometry(0.32, 7, 5);
  for (let k = 0; k < 6; k++) {
    const a = Math.random() * Math.PI * 2;
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(Math.cos(a) * r * 0.9, h * (0.4 + Math.random() * 0.3), Math.sin(a) * r * 0.9);
    group.add(lamp);
  }
  blockers.push({ minX: -0.4, maxX: 0.4, minZ: -0.4, maxZ: 0.4, minY: 0, maxY: 3 });
  return { group, surf, blockers };
}

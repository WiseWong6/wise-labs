// bridge.js — 内金水河 + 五座拱桥
import * as THREE from 'three';
import { MAT, createWater } from '../materials.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * 金水河（局部坐标，河沿 X 向，中心 z=0，水面 y=-1.2）
 */
export function river({ width = 240, span = 16, uniforms } = {}) {
  const group = new THREE.Group();
  const lines = [];

  const water = createWater(width, span, uniforms);
  water.position.y = -1.2;
  group.add(water);

  // 两岸条石
  for (const sign of [1, -1]) {
    const bank = new THREE.BoxGeometry(width, 1.5, 1.2);
    bank.translate(0, -0.75, sign * (span / 2 + 0.6));
    group.add(new THREE.Mesh(bank, MAT.stoneDark));
    const pts = [];
    for (let i = 0; i <= 60; i++) pts.push(V3(-width / 2 + (i / 60) * width, 0.12, sign * (span / 2 + 0.4)));
    lines.push({ pts, step: 1.4 });
  }
  return { group, lines };
}

/**
 * 单座拱桥（跨河沿 Z 向）。w 桥宽，span 跨长，rise 拱高
 */
export function bridge({ w = 5, span = 22, rise = 1.3 }) {
  const group = new THREE.Group();
  const lines = [], heightZones = [];

  // 拱形桥面：沿 z 的弧形条带
  const seg = 14;
  const positions = [], indices = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg * 2 - 1;              // -1..1
    const z = t * span / 2;
    const y = rise * (1 - t * t);
    positions.push(-w / 2, y, z, w / 2, y, z);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const deck = new THREE.BufferGeometry();
  deck.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  deck.setIndex(indices);
  deck.computeVertexNormals();
  group.add(new THREE.Mesh(deck, MAT.stone));

  // 两侧栏杆线 + 望柱
  for (const sx of [-1, 1]) {
    const rail = [], posts = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg * 2 - 1;
      const z = t * span / 2;
      const y = rise * (1 - t * t);
      rail.push(V3(sx * (w / 2 - 0.2), y + 1.0, z));
      if (i % 2 === 0) posts.push([sx * (w / 2 - 0.2), y, z]);
    }
    lines.push({ pts: rail, step: 0.6 });
    for (const [x, y, z] of posts)
      lines.push({ pts: [V3(x, y + 0.1, z), V3(x, y + 1.1, z)], step: 0.4 });
  }

  // 行走高度场（桥面弧形）
  heightZones.push({
    minX: -w / 2, maxX: w / 2, minZ: -span / 2, maxZ: span / 2,
    fn: (x, z) => Math.max(0, rise * (1 - (z / (span / 2)) ** 2)),
  });

  return { group, lines, heightZones };
}

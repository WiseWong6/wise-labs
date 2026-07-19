// people.js — 提灯夜游人群：InstancedMesh 剪影 + 暖光灯笼
// 行为三类：御道往返（穿过门洞/上桥）· 广场流散（waypoint 漫游）· 驻足组团
import * as THREE from 'three';

const _d = new THREE.Object3D();

export function createCrowd({ heightZones = [] }) {
  const group = new THREE.Group();

  let seed = 97;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---------- 花名册 ----------
  const persons = [];

  // 御道往返（z0→z1 长走廊，只在 |x|≈0 御道上，穿中门洞、过金水桥）
  const loops = [
    { n: 26, jit: 1.7, z0: 216, z1: 14, speed: [0.9, 1.5] },     // 午门内 ↔ 三大殿广场
    { n: 12, jit: 1.5, z0: -136, z1: -196, speed: [0.7, 1.1] },   // 乾清门 ↔ 乾清宫前
    { n: 12, jit: 1.8, z0: -302, z1: -446, speed: [0.8, 1.3] },   // 坤宁宫南 ↔ 神武门
  ];
  for (const L of loops) {
    for (let i = 0; i < L.n; i++) {
      persons.push({
        kind: 'walk',
        x: (rand() * 2 - 1) * L.jit,
        z: L.z0 + rand() * (L.z1 - L.z0),
        lo: Math.min(L.z0, L.z1), hi: Math.max(L.z0, L.z1),
        dir: rand() > 0.5 ? 1 : -1,
        speed: L.speed[0] + rand() * (L.speed[1] - L.speed[0]),
        phase: rand() * 6.28,
        s: 0.92 + rand() * 0.14,
      });
    }
  }

  // 广场流散（矩形区内随机 waypoint，走走停停）
  const wanderZones = [
    { n: 16, minX: -40, maxX: 40, minZ: 110, maxZ: 150 },    // 太和门广场
    { n: 12, minX: -30, maxX: 30, minZ: -194, maxZ: -178 },  // 乾清门广场
    { n: 10, minX: -3.5, maxX: 3.5, minZ: -416, maxZ: -344 },// 御花园御道
  ];
  for (const Z of wanderZones) {
    for (let i = 0; i < Z.n; i++) {
      persons.push({
        kind: 'wander', zone: Z,
        x: Z.minX + rand() * (Z.maxX - Z.minX),
        z: Z.minZ + rand() * (Z.maxZ - Z.minZ),
        tx: 0, tz: 0, moving: false, pause: rand() * 5,
        yaw: rand() * 6.28,
        speed: 0.5 + rand() * 0.6,
        phase: rand() * 6.28,
        s: 0.92 + rand() * 0.14,
      });
    }
  }

  // 驻足组团（面向焦点：灯树 / 殿宇 / 星空）
  const standGroups = [
    { cx: 25, cz: 202, n: 4, fx: 25, fz: 205 },      // 午门内灯树
    { cx: -25, cz: 142, n: 3, fx: -25, fz: 145 },    // 金水河北岸灯树
    { cx: 4, cz: 8, n: 5, fx: 0, fz: -30 },          // 太和殿台基前仰望
    { cx: -36, cz: 30, n: 3, fx: 0, fz: -30 },
    { cx: 28, cz: -136, n: 4, fx: 30, fz: -140 },    // 乾清门广场灯树
    { cx: -16, cz: -322, n: 3, fx: -18, fz: -325 },  // 御花园入口
    { cx: 7, cz: -352, n: 4, fx: 45, fz: -355 },     // 御花园内望亭
    { cx: -68, cz: -246, n: 3, fx: -70, fz: -250 },  // 东西六宫灯树
  ];
  for (const G of standGroups) {
    for (let i = 0; i < G.n; i++) {
      const x = G.cx + (rand() * 2 - 1) * 2.2;
      const z = G.cz + (rand() * 2 - 1) * 2.2;
      persons.push({
        kind: 'stand', x, z,
        yaw: Math.atan2(-(G.fx - x), -(G.fz - z)),
        phase: rand() * 6.28,
        s: 0.92 + rand() * 0.14,
      });
    }
  }

  // ---------- 几何与材质 ----------
  const N = persons.length;
  // 长袍（下宽上窄圆锥）+ 球头：两个 InstancedMesh 共用同一组位姿矩阵
  const robeGeo = new THREE.ConeGeometry(0.27, 1.18, 7);
  robeGeo.translate(0, 0.59, 0);
  const headGeo = new THREE.SphereGeometry(0.14, 7, 6);
  headGeo.translate(0, 1.32, 0);
  const lanternGeo = new THREE.SphereGeometry(0.13, 7, 6);

  const robes = new THREE.InstancedMesh(robeGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), N);
  const heads = new THREE.InstancedMesh(headGeo,
    new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 }), N);
  const lanterns = new THREE.InstancedMesh(lanternGeo,
    new THREE.MeshBasicMaterial({ color: 0xff9435 }), N);
  robes.frustumCulled = heads.frustumCulled = lanterns.frustumCulled = false;

  // 深夜衣色（墨蓝 / 绛紫 / 暗褐 / 黛绿）
  const palette = [0x131a2a, 0x221428, 0x241609, 0x12211a, 0x1a1220];
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    robes.setColorAt(i, c.setHex(palette[Math.floor(rand() * palette.length)]));
  }
  robes.instanceColor.needsUpdate = true;
  group.add(robes, heads, lanterns);

  // ---------- 贴地（与 controls.js 同一套高度场语义） ----------
  function groundAt(x, z) {
    let h = 0;
    for (const hz of heightZones) {
      if (x >= hz.minX && x <= hz.maxX && z >= hz.minZ && z <= hz.maxZ) {
        const v = hz.fn ? hz.fn(x, z) : hz.h;
        if (v > h) h = v;
      }
    }
    return h;
  }

  function pickTarget(p) {
    const Z = p.zone;
    p.tx = Z.minX + rand() * (Z.maxX - Z.minX);
    p.tz = Z.minZ + rand() * (Z.maxZ - Z.minZ);
  }

  // ---------- 每帧更新 ----------
  function update(t, dt) {
    for (let i = 0; i < N; i++) {
      const p = persons[i];
      let yaw = p.yaw ?? 0, moveAmt = 0;

      if (p.kind === 'walk') {
        p.z += p.dir * p.speed * dt;
        if (p.z < p.lo) { p.z = p.lo; p.dir = 1; }
        if (p.z > p.hi) { p.z = p.hi; p.dir = -1; }
        yaw = p.dir > 0 ? Math.PI : 0;      // forward = (-sinYaw, -cosYaw)
        moveAmt = 1;
      } else if (p.kind === 'wander') {
        if (p.pause > 0) {
          p.pause -= dt;
        } else {
          if (!p.moving) { pickTarget(p); p.moving = true; }
          const dx = p.tx - p.x, dz = p.tz - p.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.4) {
            p.moving = false;
            p.pause = 1.5 + rand() * 5;
          } else {
            yaw = Math.atan2(-dx / d, -dz / d);
            p.yaw = yaw;
            p.x += (dx / d) * p.speed * dt;
            p.z += (dz / d) * p.speed * dt;
            moveAmt = 1;
          }
        }
      }
      // stand：yaw 固定，仅呼吸与灯笼微晃

      const g = groundAt(p.x, p.z);
      const bob = Math.sin(t * (3.2 + p.speed * 2) + p.phase) * 0.045 * (moveAmt ? 1 : 0.25);

      _d.position.set(p.x, g + bob, p.z);
      _d.rotation.set(0, yaw, 0);
      _d.scale.setScalar(p.s);
      _d.updateMatrix();
      robes.setMatrixAt(i, _d.matrix);
      heads.setMatrixAt(i, _d.matrix);

      // 灯笼：右手侧前方，行走时轻摆
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = -fz, rz = fx;              // 右手方向
      const sway = Math.sin(t * 2.1 + p.phase) * 0.08 * (moveAmt ? 1 : 0.5);
      _d.position.set(
        p.x + rx * 0.38 + fx * (0.14 + sway),
        g + 1.04 + bob * 0.5 + Math.sin(t * 1.6 + p.phase) * 0.03,
        p.z + rz * 0.38 + fz * (0.14 + sway)
      );
      _d.rotation.set(0, 0, 0);
      _d.scale.setScalar(1);
      _d.updateMatrix();
      lanterns.setMatrixAt(i, _d.matrix);
    }
    robes.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    lanterns.instanceMatrix.needsUpdate = true;
  }

  return { group, update, count: N };
}

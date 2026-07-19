// controls.js — 第一人称：指针锁定 + WASD + 步行/飞行切换 + 高度场与简单碰撞
import * as THREE from 'three';

export class FirstPerson {
  constructor(camera, dom, world) {
    this.camera = camera;
    this.dom = dom;
    this.world = world; // { heightZones, blockers, waterZone }

    this.pos = new THREE.Vector3(0, 1.7, 330); // 午门外南侧
    this.yaw = 0;                              // 面向 -Z（北，中轴线方向）
    this.pitch = 0;
    this.vel = new THREE.Vector3();
    this.fly = false;
    this.keys = new Set();
    this.enabled = false;
    this.eyeH = 1.7;

    const helpEl = document.getElementById('help');
    const crosshair = document.getElementById('crosshair');
    this.drag = false;   // 兜底模式：指针锁定不可用时用拖拽转视角

    const enter = () => {
      this.enabled = true;
      helpEl.style.display = 'none';
      crosshair.style.display = 'block';
    };
    const tryLock = () => {
      try {
        const p = dom.requestPointerLock();
        if (p && p.catch) p.catch(() => enter());   // 锁定被拒 → 兜底模式
      } catch (_) { enter(); }
      // 某些环境不抛错但也不生效，300ms 后检查
      setTimeout(() => {
        if (document.pointerLockElement !== dom && !this.enabled) enter();
      }, 300);
    };

    // 点击遮罩（或画布）均可入城；遮罩层在画布之上，必须监听它
    helpEl.addEventListener('click', tryLock);
    helpEl.addEventListener('keydown', (event) => {
      if (event.code !== 'Enter' && event.code !== 'Space') return;
      event.preventDefault();
      tryLock();
    });
    dom.addEventListener('click', () => { if (!this.enabled) tryLock(); });

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === dom;
      if (locked) enter();
      else if (!this.drag) {
        this.enabled = false;
        helpEl.style.display = 'flex';
        crosshair.style.display = 'none';
      }
    });
    document.addEventListener('pointerlockerror', () => enter());

    document.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      const locked = document.pointerLockElement === dom;
      if (!locked && !this.drag) return;           // 兜底模式下仅按住拖拽时转视角
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });
    dom.addEventListener('mousedown', () => { this.drag = true; });
    window.addEventListener('mouseup', () => { this.drag = false; });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.enabled && document.pointerLockElement !== dom) {
        this.enabled = false;
        this.drag = false;
        this.keys.clear();
        helpEl.style.display = 'flex';
        crosshair.style.display = 'none';
        return;
      }
      if (e.code === 'KeyF' && this.enabled) {
        this.fly = !this.fly;
        document.getElementById('mode').textContent = this.fly
          ? '飞行模式 · Space 升 / C 降 · F 返回步行'
          : '步行模式 · F 切换飞行';
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  groundAt(x, z) {
    let h = 0;
    for (const hz of this.world.heightZones) {
      if (x >= hz.minX && x <= hz.maxX && z >= hz.minZ && z <= hz.maxZ) {
        const v = hz.fn ? hz.fn(x, z) : hz.h;
        if (v > h) h = v;
      }
    }
    return h;
  }

  collide(x, z, eyeY) {
    const R = 0.55;
    for (const b of this.world.blockers) {
      if (x + R < b.minX || x - R > b.maxX || z + R < b.minZ || z - R > b.maxZ) continue;
      if (eyeY > b.maxY + 0.3) continue;                 // 在顶部之上可行走
      if (eyeY < b.minY - 0.5) continue;                 // 在高架之物（城楼）之下可穿行
      // 门洞通道
      if (b.gapX && x > b.gapX[0] + R && x < b.gapX[1] - R && Math.abs(z - (b.minZ + b.maxZ) / 2) < (b.maxZ - b.minZ) / 2 + R) continue;
      return true;
    }
    return false;
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    let speed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) ? 26 : 9;
    if (this.fly) speed *= 2.2;
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(-f.z, 0, f.x);

    const move = new THREE.Vector3();
    if (this.enabled) {
      if (this.keys.has('KeyW')) move.add(f);
      if (this.keys.has('KeyS')) move.sub(f);
      if (this.keys.has('KeyD')) move.add(r);
      if (this.keys.has('KeyA')) move.sub(r);
    }
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);

    let vy = 0;
    if (this.fly) {
      if (this.keys.has('Space')) vy += speed * 0.9;
      if (this.keys.has('KeyC')) vy -= speed * 0.9;
    }

    // 轴分离碰撞
    const eyeY = this.pos.y;
    const nx = this.pos.x + move.x * dt;
    if (!this.collide(nx, this.pos.z, eyeY)) this.pos.x = nx;
    const nz = this.pos.z + move.z * dt;
    if (!this.collide(this.pos.x, nz, eyeY)) this.pos.z = nz;

    // 水面禁区（步行时不可下水）
    if (!this.fly) {
      const zones = this.world.waterZones || (this.world.waterZone ? [this.world.waterZone] : []);
      for (const wz of zones) {
        if (this.pos.x > wz.minX && this.pos.x < wz.maxX && this.pos.z > wz.minZ && this.pos.z < wz.maxZ) {
          const g = this.groundAt(this.pos.x, this.pos.z);
          if (g < 0.3) { // 不在桥上 → 退回
            this.pos.x -= move.x * dt; this.pos.z -= move.z * dt;
          }
          break;
        }
      }
    }

    if (this.fly) {
      this.pos.y += vy * dt;
      this.pos.y = Math.max(1.2, Math.min(500, this.pos.y));
    } else {
      const target = this.groundAt(this.pos.x, this.pos.z) + this.eyeH;
      this.pos.y += (target - this.pos.y) * Math.min(1, dt * 9);
    }

    // 场地边界
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -800, 800);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -800, 800);

    this.camera.position.copy(this.pos);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(this.pitch);
  }
}

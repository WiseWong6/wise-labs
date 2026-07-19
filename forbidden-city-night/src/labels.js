// labels.js — 建筑名称标注：3D → 2D 投影，距离淡入
import * as THREE from 'three';

export class Labels {
  constructor(list, camera, container) {
    this.camera = camera;
    this.items = list.map((it) => {
      const el = document.createElement('div');
      el.className = 'blabel';
      el.textContent = it.name;
      container.appendChild(el);
      return { ...it, el, v: new THREE.Vector3() };
    });
    this._proj = new THREE.Vector3();
  }

  update(camPos) {
    const w = window.innerWidth, h = window.innerHeight;
    for (const it of this.items) {
      const dist = camPos.distanceTo(it.pos);
      const maxD = it.maxDist ?? 160;
      if (dist > maxD || dist < 6) { it.el.style.opacity = 0; continue; }
      this._proj.copy(it.pos).project(this.camera);
      const p = this._proj;
      if (p.z > 1 || p.x < -1.05 || p.x > 1.05 || p.y < -1.05 || p.y > 1.05) {
        it.el.style.opacity = 0; continue;
      }
      it.el.style.opacity = Math.min(1, (maxD - dist) / (maxD * 0.55)) * 0.95;
      it.el.style.left = ((p.x + 1) / 2 * w) + 'px';
      it.el.style.top = ((-p.y + 1) / 2 * h) + 'px';
    }
  }
}

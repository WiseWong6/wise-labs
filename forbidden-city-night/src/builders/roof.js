// roof.js — 参数化中式屋顶：庑殿 / 歇山 / 攒尖 / 重檐下裙，共用一套举折曲线
import * as THREE from 'three';

// 举折：近脊陡、近檐缓的凹曲屋面
export function roofCurve(t, n = 1.85) { return 1 - Math.pow(1 - t, n); }

// 檐口起翘（靠近角部急剧上扬）
function upturn(t, qiao) {
  const a = Math.max(0, (t - 0.5) / 0.5);
  return qiao * a * a;
}

/**
 * 统一屋顶生成器。
 * 顶部为一矩形（topW × topD，位于高度 H），底部为带反翘的檐口矩形
 * （(W+2ov) × (D+2ov)，高度 E 附近）。
 * - topD = 0, topW > 0  → 庑殿/歇山（顶部退为正脊线）
 * - topW = topD = 0       → 攒尖（顶部退为宝顶一点）
 * - topW/topD 为上层墙身尺寸 → 重檐下裙屋顶
 *
 * 返回 { meshes, lines, surf }：
 *   meshes — 屋面 BufferGeometry 网格（暗色剪影）
 *   lines  — 折线数组 [{pts, step}]（正脊/垂脊/檐口/瓦垄，供粒子采样）
 *   surf   — 屋面散布点数组（点云）
 */
export function roof(opt) {
  const {
    W = 30, D = 18, H = 8, E = 0, ov = 3, qiao = 1.0,
    topW = null, topD = 0,
    curveN = 1.85, segU = 26, segS = 9, surfStep = 1.7,
    gable = 0,           // >0 时加歇山山花（三角形墙，进深占比）
    ridgeMesh = true,    // 是否生成正脊实体（下裙屋顶应关闭）
  } = opt;

  const We = W + 2 * ov, De = D + 2 * ov;
  const tw = topW == null ? Math.max(W - D * 0.9, W * 0.3) : topW; // 默认庑殿脊长
  const td = topD;
  const hw0 = tw / 2, hd0 = td / 2;

  const positions = [], indices = [];
  const roofGeos = [], ridgeGeos = [], gableGeos = [];
  const lines = [], surf = [];

  function addGrid(cols, rows, fn) {
    const base = positions.length / 3;
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const p = fn((i / cols) * 2 - 1, j / rows);
        positions.push(p.x, p.y, p.z);
      }
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const a = base + j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
  }

  // 前/后坡：u∈[-1,1] 沿面阔，s∈[0,1] 脊→檐
  const slope = (sign) => (u, s) => {
    const hw = hw0 + (We / 2 - hw0) * s;
    const x = u * hw;
    const z = sign * (hd0 + (De / 2 - hd0) * s);
    const ey = E + upturn(Math.abs(x / (We / 2)), qiao);
    return new THREE.Vector3(x, H - (H - ey) * roofCurve(s, curveN), z);
  };
  // 两山头坡：u∈[-1,1] 沿进深，s∈[0,1] 顶角→檐
  const hip = (sign) => (u, s) => {
    const x = sign * (hw0 + (We / 2 - hw0) * s);
    const z = u * (hd0 + (De / 2 - hd0) * s);
    const ey = E + upturn(Math.abs(z / (De / 2)), qiao);
    return new THREE.Vector3(x, H - (H - ey) * roofCurve(s, curveN), z);
  };

  addGrid(segU, segS, slope(1));
  addGrid(segU, segS, slope(-1));
  addGrid(segU, segS, hip(1));
  addGrid(segU, segS, hip(-1));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  roofGeos.push(geo);

  // ---- 正脊实体 + 鸱吻 ----
  if (ridgeMesh && td === 0 && tw > 0.5) {
    const ridge = new THREE.BoxGeometry(tw + 1.6, 1.0, 1.1);
    ridge.translate(0, H + 0.35, 0);
    ridgeGeos.push(ridge);
    for (const s of [-1, 1]) {
      const chi = new THREE.BoxGeometry(1.2, 1.9, 1.3);
      chi.translate(s * (hw0 + 0.5), H + 0.9, 0);
      ridgeGeos.push(chi);
    }
  }

  // ---- 歇山山花（垂直三角墙） ----
  if (gable > 0 && td === 0) {
    const gh = (H - E) * 0.42, gd = De * 0.52 / 2;
    for (const s of [-1, 1]) {
      const g = new THREE.BufferGeometry();
      const v = new Float32Array([
        s * hw0, H, 0,
        s * hw0, H - gh, -gd,
        s * hw0, H - gh, gd,
      ]);
      g.setAttribute('position', new THREE.BufferAttribute(v, 3));
      g.setIndex([0, 1, 2]);
      g.computeVertexNormals();
      gableGeos.push(g);
      // 博风板边线
      lines.push({ pts: [new THREE.Vector3(s * hw0, H, 0), new THREE.Vector3(s * hw0, H - gh, -gd)], step: 0.5 });
      lines.push({ pts: [new THREE.Vector3(s * hw0, H, 0), new THREE.Vector3(s * hw0, H - gh, gd)], step: 0.5 });
    }
  }

  // ================= 粒子采样线 =================
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // 正脊线
  if (td === 0 && tw > 0.5) {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(V3(-hw0 + (i / 24) * tw, H + 0.85, 0));
    lines.push({ pts, step: 0.55 });
    // 鸱吻竖线
    for (const s of [-1, 1]) lines.push({ pts: [V3(s * (hw0 + 0.5), H + 0.2, 0), V3(s * (hw0 + 0.5), H + 1.9, 0)], step: 0.4 });
  } else if (td > 0) {
    // 下裙屋顶：顶矩形与上层墙相交处微光轮廓
    const pts = [];
    const per = [[-hw0, -hd0], [hw0, -hd0], [hw0, hd0], [-hw0, hd0], [-hw0, -hd0]];
    for (let k = 0; k < 4; k++)
      for (let i = 0; i <= 8; i++)
        pts.push(V3(per[k][0] + (per[k + 1][0] - per[k][0]) * i / 8, H, per[k][1] + (per[k + 1][1] - per[k][1]) * i / 8));
    lines.push({ pts, step: 1.2 });
  }

  // 四条垂脊/戗脊（顶角 → 檐角，随举折曲线）
  const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [sx, sz] of corners) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const s = i / 16;
      const x = sx * (hw0 + (We / 2 - hw0) * s);
      const z = sz * (hd0 + (De / 2 - hd0) * s);
      const ey = E + upturn(Math.max(Math.abs(x / (We / 2)), Math.abs(z / (De / 2))), qiao) + qiao * 0.35 * s;
      pts.push(V3(x, H - (H - ey) * roofCurve(s, curveN) + 0.25, z));
    }
    lines.push({ pts, step: 0.55 });
  }

  // 檐口轮廓（含起翘）
  {
    const pts = [];
    const N = 30;
    for (let i = 0; i <= N; i++) { const u = i / N * 2 - 1; pts.push(V3(u * We / 2, E + upturn(Math.abs(u), qiao), De / 2)); }
    for (let i = 0; i <= N; i++) { const u = i / N * 2 - 1; pts.push(V3(We / 2, E + upturn(Math.abs(u), qiao), De / 2 - (i / N) * De)); }
    for (let i = 0; i <= N; i++) { const u = i / N * 2 - 1; pts.push(V3(We / 2 - (i / N) * We, E + upturn(Math.abs(u), qiao), -De / 2)); }
    for (let i = 0; i <= N; i++) { const u = i / N * 2 - 1; pts.push(V3(-We / 2, E + upturn(Math.abs(u), qiao), -De / 2 + (i / N) * De)); }
    lines.push({ pts, step: 0.55 });
  }

  // 瓦垄放射线（前/后坡按 u，山面按扇形）
  for (const sign of [1, -1])
    for (let k = -4; k <= 4; k++) {
      const u = k / 5, pts = [];
      for (let i = 0; i <= 10; i++) pts.push(slope(sign)(u, i / 10));
      lines.push({ pts, step: 1.1 });
    }
  for (const sign of [1, -1])
    for (let k = -3; k <= 3; k++) {
      const u = k / 4, pts = [];
      for (let i = 0; i <= 10; i++) pts.push(hip(sign)(u, i / 10));
      lines.push({ pts, step: 1.1 });
    }

  // 屋面散布点云
  {
    const cols = Math.max(4, Math.round(We / surfStep));
    const rows = Math.max(3, Math.round((De / 2) / surfStep));
    for (const sign of [1, -1])
      for (let j = 0; j <= rows; j++)
        for (let i = 0; i <= cols; i++)
          surf.push(slope(sign)((i / cols) * 2 - 1, j / rows));
    const hc = Math.max(3, Math.round(De / surfStep));
    for (const sign of [1, -1])
      for (let j = 1; j <= rows; j++)
        for (let i = 0; i <= hc; i++)
          surf.push(hip(sign)((i / hc) * 2 - 1, j / rows));
  }

  return { roofGeos, ridgeGeos, gableGeos, lines, surf };
}

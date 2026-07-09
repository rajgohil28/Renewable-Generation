/**
 * Procedural canvas textures — asphalt site plan (roads, markings,
 * boundaries, landscaping), roughness map and solar cell face.
 * Everything is generated at runtime: zero external assets.
 */
import * as THREE from 'three';
import { PLATFORM, PLATFORM_OUTLINE } from '../config/settings.js';

const W = 2048;
const H = 1332;

/** World XZ → canvas pixel space. */
function toPx(x, z) {
  return [
    ((x - PLATFORM.minX) / (PLATFORM.maxX - PLATFORM.minX)) * W,
    ((z - PLATFORM.minZ) / (PLATFORM.maxZ - PLATFORM.minZ)) * H,
  ];
}
const sx = W / (PLATFORM.maxX - PLATFORM.minX); // px per world unit

function speckle(ctx, count, alpha, size = 1.6) {
  for (let i = 0; i < count; i++) {
    const v = Math.random();
    ctx.fillStyle = `rgba(${v > 0.5 ? '255,255,255' : '0,0,0'},${(Math.random() * alpha).toFixed(3)})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * size + 0.5, Math.random() * size + 0.5);
  }
}

function tracePlatform(ctx, inset = 0) {
  const cx = (PLATFORM.minX + PLATFORM.maxX) / 2;
  const cz = (PLATFORM.minZ + PLATFORM.maxZ) / 2;
  ctx.beginPath();
  PLATFORM_OUTLINE.forEach(([x, z], i) => {
    // Shrink towards centroid for inset boundary lines
    const px = x + (cx - x) * inset;
    const pz = z + (cz - z) * inset;
    const [a, b] = toPx(px, pz);
    i === 0 ? ctx.moveTo(a, b) : ctx.lineTo(a, b);
  });
  ctx.closePath();
}

function road(ctx, pts, width, { center = true } = {}) {
  const px = pts.map(([x, z]) => toPx(x, z));
  // Bed
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#101216';
  ctx.lineWidth = width * sx;
  ctx.setLineDash([]);
  ctx.beginPath();
  px.forEach(([a, b], i) => (i === 0 ? ctx.moveTo(a, b) : ctx.lineTo(a, b)));
  ctx.stroke();
  // Edge lines
  ctx.strokeStyle = 'rgba(200,210,225,0.16)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Dashed centre line
  if (center) {
    ctx.strokeStyle = 'rgba(225,232,242,0.5)';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([26, 20]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function landscapePatch(ctx, x, z, r) {
  const [a, b] = toPx(x, z);
  const g = ctx.createRadialGradient(a, b, r * sx * 0.2, a, b, r * sx);
  g.addColorStop(0, 'rgba(38,58,40,0.95)');
  g.addColorStop(1, 'rgba(24,36,26,0.0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(a, b, r * sx, r * sx * 0.8, Math.random() * 3, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 260; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * r * sx * 0.85;
    ctx.fillStyle = `rgba(${40 + Math.random() * 40 | 0},${70 + Math.random() * 50 | 0},${40 + Math.random() * 25 | 0},${0.25 + Math.random() * 0.4})`;
    ctx.fillRect(a + Math.cos(ang) * rr, b + Math.sin(ang) * rr * 0.8, 2.4, 2.4);
  }
}

function parkingBay(ctx, x, z, slots, angleDeg = 0) {
  const [a, b] = toPx(x, z);
  ctx.save();
  ctx.translate(a, b);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.strokeStyle = 'rgba(215,224,238,0.4)';
  ctx.lineWidth = 2;
  const slotW = 2.6 * sx, slotD = 5 * sx;
  for (let i = 0; i <= slots; i++) {
    ctx.beginPath();
    ctx.moveTo(i * slotW, 0);
    ctx.lineTo(i * slotW, slotD);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(slots * slotW, 0);
  ctx.stroke();
  ctx.restore();
}

/** Main diffuse site-plan texture painted onto the platform top. */
export function createSitePlanTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // — Asphalt base —
  ctx.fillStyle = '#191b20';
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, 26000, 0.055);

  // Large tonal variation blotches
  for (let i = 0; i < 40; i++) {
    const g = ctx.createRadialGradient(
      Math.random() * W, Math.random() * H, 10,
      Math.random() * W, Math.random() * H, 140 + Math.random() * 260,
    );
    const dark = Math.random() > 0.5;
    g.addColorStop(0, dark ? 'rgba(8,9,12,0.16)' : 'rgba(80,86,98,0.07)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // — Lighter concrete apron where the engraved text lives —
  {
    const [a, b] = toPx(60, 8);
    const g = ctx.createRadialGradient(a, b, 60, a, b, 560);
    g.addColorStop(0, 'rgba(72,77,88,0.34)');
    g.addColorStop(1, 'rgba(72,77,88,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // — Roads —
  road(ctx, [[-92, -20], [-70, -46], [-34, -56], [24, -58], [76, -56], [98, -40]], 5);
  road(ctx, [[-92, -20], [-88, 22], [-64, 46], [-24, 56], [22, 58], [70, 54], [96, 34]], 5);
  road(ctx, [[6, -58], [8, -20], [10, 30], [12, 58]], 4.4);
  road(ctx, [[-88, 20], [-40, 16], [4, 12]], 3.6, { center: false });

  // — Cable trenches (subtle darker channels) —
  ctx.strokeStyle = 'rgba(6,7,10,0.5)';
  ctx.lineWidth = 1.2 * sx;
  ctx.setLineDash([]);
  [[[-80, -10], [-30, -6], [14, 0]], [[-60, 30], [-20, 26], [16, 22]]].forEach((pts) => {
    ctx.beginPath();
    pts.forEach(([x, z], i) => { const [a, b] = toPx(x, z); i === 0 ? ctx.moveTo(a, b) : ctx.lineTo(a, b); });
    ctx.stroke();
  });

  // — Landscaping —
  landscapePatch(ctx, 96, 52, 14);
  landscapePatch(ctx, -98, 40, 10);
  landscapePatch(ctx, 30, 66, 9);
  landscapePatch(ctx, 104, -30, 8);

  // — Parking bays —
  parkingBay(ctx, 26, 44, 8, 4);
  parkingBay(ctx, 62, 40, 6, -4);

  // — Perimeter markings —
  // Red hazard line
  tracePlatform(ctx, 0.018);
  ctx.strokeStyle = 'rgba(255,64,74,0.75)';
  ctx.lineWidth = 3.2;
  ctx.setLineDash([]);
  ctx.stroke();
  // White dashed boundary
  tracePlatform(ctx, 0.045);
  ctx.strokeStyle = 'rgba(226,233,244,0.42)';
  ctx.lineWidth = 2.4;
  ctx.setLineDash([18, 14]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Solar field boundary (dashed white box, like the reference)
  {
    ctx.save();
    const [a, b] = toPx(-46, -2);
    ctx.translate(a, b);
    ctx.rotate(-0.06);
    ctx.strokeStyle = 'rgba(226,233,244,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(-44 * sx, -42 * sx, 88 * sx, 84 * sx);
    ctx.restore();
    ctx.setLineDash([]);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Matching roughness map — roads slightly smoother than raw asphalt. */
export function createSiteRoughnessTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = W / 2; canvas.height = H / 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 9000; i++) {
    const v = 190 + Math.random() * 65 | 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/** Solar cell face — dark blue silicon with busbar grid. */
export function createSolarCellTexture() {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#0d2f68');
  g.addColorStop(0.5, '#0a2145');
  g.addColorStop(1, '#123a7e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // Cell grid
  ctx.strokeStyle = 'rgba(160,190,235,0.5)';
  ctx.lineWidth = 2;
  const cells = 6;
  for (let i = 0; i <= cells; i++) {
    const p = (i / cells) * S;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
  }
  // Fine busbars
  ctx.strokeStyle = 'rgba(150,180,225,0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < cells * 4; i++) {
    const p = (i / (cells * 4)) * S;
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Weathered white concrete for utility buildings. */
export function createBuildingWallTexture() {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c9ccd2';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 2200; i++) {
    const v = Math.random();
    ctx.fillStyle = `rgba(${v > 0.6 ? '90,95,105' : '235,238,244'},${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, Math.random() * 3, Math.random() * 3);
  }
  // Weathering streaks from the top edge
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * S;
    const grad = ctx.createLinearGradient(0, 0, 0, 40 + Math.random() * 120);
    grad.addColorStop(0, 'rgba(70,74,82,0.20)');
    grad.addColorStop(1, 'rgba(70,74,82,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 1.5 + Math.random() * 3, S);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Tileable dry cracked-earth wasteland texture. */
export function createWastelandTexture() {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');

  // Dry sandy/clay base
  ctx.fillStyle = '#bf8e69';
  ctx.fillRect(0, 0, S, S);

  // Speckle noise
  for (let i = 0; i < 8000; i++) {
    const v = Math.random();
    ctx.fillStyle = v > 0.5 ? 'rgba(77,50,33,0.12)' : 'rgba(223,177,148,0.15)';
    ctx.fillRect(Math.random() * S, Math.random() * S, Math.random() * 2 + 1, Math.random() * 2 + 1);
  }

  // Draw cracked clay veins
  ctx.strokeStyle = 'rgba(74,51,36,0.32)';
  ctx.lineWidth = 1.4;
  const points = [];
  const cells = 8;
  const step = S / cells;
  for (let r = 0; r <= cells; r++) {
    for (let c = 0; c <= cells; c++) {
      points.push({
        x: c * step + (Math.random() - 0.5) * step * 0.7,
        y: r * step + (Math.random() - 0.5) * step * 0.7,
      });
    }
  }

  // Connect neighboring points to form crack patterns
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const idx = r * (cells + 1) + c;
      const p1 = points[idx];
      const p2 = points[idx + 1];
      const p3 = points[idx + cells + 1];
      const p4 = points[idx + cells + 2];

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // Add some secondary, finer micro-cracks
  ctx.strokeStyle = 'rgba(74,51,36,0.18)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 35; i++) {
    let cx = Math.random() * S;
    let cy = Math.random() * S;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 4; j++) {
      cx += (Math.random() - 0.5) * 20;
      cy += (Math.random() - 0.5) * 20;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(50, 50);
  tex.anisotropy = 8;
  return tex;
}

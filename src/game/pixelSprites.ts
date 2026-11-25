import { normalizeBadgeSpriteKey } from './clientFeatures';
import {
  ditherIsoFace,
  drawExtendedBadgeSprite,
  drawExtendedFurniSprite,
  drawSelOutIsoBox,
  drawSelOutRect,
  fillIsoDiamond,
  renderExtendedAvatarSprite,
} from './pixelSpritesExtended';
import type {
  AvatarPose,
  BanzaiTileState,
  CustomBadgeDef,
  Direction,
  LookConfig,
  PetAnim,
  PetSpecies,
  RoomDef,
  RoomFloorTheme,
  RoomWallTheme,
} from './types';

const OUTLINE = '#1b1922';
const spriteCache = new Map<string, HTMLCanvasElement>();
const previewDataUrlCache = new Map<string, string>();
const roomThumbCache = new Map<string, string>();

const FURNI_SPRITE_ALIASES: Record<string, string> = {
  rare_dragon_fire: 'fire_dragon',
  dragon_fire: 'fire_dragon',
  rare_dragon_jade: 'jade_dragon',
  dragon_jade: 'jade_dragon',
  rare_dragon_silver: 'silver_dragon',
  dragon_silver: 'silver_dragon',
  rare_dragon_gold: 'gold_dragon',
  dragon_gold: 'gold_dragon',
  rare_dragon_frost: 'frost_dragon',
  dragon_frost: 'frost_dragon',
  club_sofa: 'hc_sofa',
  rare_throne: 'throne',
  throne_gold: 'throne',
  rare_amber_red: 'amber_lamp',
  rare_fountain_gold: 'golden_fountain',
  royal_persian_rug: 'persian_rug',
  hc_dicemaster: 'holo_dice',
  hc_imperial_teleporter: 'imperial_teleporter',
  imperial_teleport: 'imperial_teleporter',
  disco_tile: 'disco_floor',
  dj_turntable: 'dj_booth',
  plant_bonsai: 'bonsai',
};

function resolveFurniSpriteId(id: string): string {
  return FURNI_SPRITE_ALIASES[id] ?? id;
}

export function isDragonLampId(furniId: string): boolean {
  const lower = resolveFurniSpriteId(furniId).toLowerCase();
  if (lower === 'pet_dragon' || lower === 'baby_dragon' || lower === 'badge_dragon') {
    return false;
  }
  return (
    lower === 'fire_dragon' ||
    lower === 'jade_dragon' ||
    lower === 'silver_dragon' ||
    lower === 'gold_dragon' ||
    lower === 'frost_dragon' ||
    lower.includes('dragon')
  );
}

function makeOffscreen(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function outlinedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  highlight?: string,
  shadow?: string
) {
  px(ctx, x, y, w, h, OUTLINE);
  if (w > 2 && h > 2) {
    px(ctx, x + 1, y + 1, w - 2, h - 2, fill);
    if (highlight) px(ctx, x + 1, y + 1, w - 2, 1, highlight);
    if (shadow) px(ctx, x + w - 2, y + 2, 1, h - 3, shadow);
  }
}

function drawIsoPoly(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  fill: string,
  stroke?: string
) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Automatic 1px Outer Silhouette Only (`applyPixelOutline`):
 * Places a crisp 1px solid #141414 outline strictly around the outer non-transparent
 * silhouette of the furniture scratch canvas, leaving all internal sel-out seams untouched.
 */
export function applyPixelOutline(
  srcCanvas: HTMLCanvasElement,
  targetCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
  outlineRgb: [number, number, number] = [0x14, 0x14, 0x14]
) {
  const sCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
  const srcImg = sCtx.getImageData(0, 0, w, h);
  const srcData = srcImg.data;
  const outLayer = makeOffscreen(w, h);
  const outImg = outLayer.ctx.createImageData(w, h);
  const outData = outImg.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (srcData[idx + 3] > 100) {
        outData[idx] = srcData[idx];
        outData[idx + 1] = srcData[idx + 1];
        outData[idx + 2] = srcData[idx + 2];
        outData[idx + 3] = srcData[idx + 3];
      } else {
        const hasNeighbor =
          (x > 0 && srcData[idx - 4 + 3] > 100) ||
          (x < w - 1 && srcData[idx + 4 + 3] > 100) ||
          (y > 0 && srcData[idx - w * 4 + 3] > 100) ||
          (y < h - 1 && srcData[idx + w * 4 + 3] > 100);
        if (hasNeighbor) {
          outData[idx] = outlineRgb[0];
          outData[idx + 1] = outlineRgb[1];
          outData[idx + 2] = outlineRgb[2];
          outData[idx + 3] = 255;
        }
      }
    }
  }

  outLayer.ctx.putImageData(outImg, 0, 0);
  targetCtx.drawImage(outLayer.canvas, 0, 0);
}

export function getLookHash(look: LookConfig): string {
  return [
    look.gender ?? 'M',
    look.skinColor,
    look.hairStyle,
    look.hairColor,
    look.expression,
    look.shirtStyle,
    look.shirtColor,
    look.pantsColor,
    look.shoesColor,
    look.accessory,
  ].join('|');
}

/**
 * Renders an authentic 2008 Habbo 3/4 isometric pixel character onto a 52x76 offscreen canvas.
 * Feet anchor point is (26, 66). Uses a scratch canvas + 1px #141414 silhouette outline pass.
 */
export function getAvatarSprite(
  look: LookConfig,
  dir: Direction,
  pose: AvatarPose,
  frame: number,
  inWater = false,
  swimwearColor = '#0ea5e9',
  wearingSwimwear = false,
  danceStyle: 1 | 2 | 3 | 4 = 1
): HTMLCanvasElement {
  const animStep = frame % 4;
  const swimKey = inWater
    ? `water:${swimwearColor}`
    : wearingSwimwear
    ? `decksw:${swimwearColor}`
    : '0';
  const danceKey = pose === 'dance' ? danceStyle : 0;
  const key = `av52v2|${getLookHash(look)}|${dir}|${pose}|d${danceKey}|${animStep}|${swimKey}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const rendered = renderExtendedAvatarSprite(
    look,
    dir,
    pose,
    frame,
    inWater,
    swimwearColor,
    wearingSwimwear,
    danceStyle
  );
  spriteCache.set(key, rendered);
  return rendered;
}

/**
 * Renders just the 3/4 isometric head & collar portrait (26x26) for Speech Bubbles, Friends, and Housekeeping rows.
 */
export function getAvatarHeadSprite(look: LookConfig): HTMLCanvasElement {
  const key = `head52v2|${getLookHash(look)}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const full = getAvatarSprite(look, 0, 'stand', 0);
  const { canvas, ctx } = makeOffscreen(26, 26);
  ctx.drawImage(full, 13, 5, 26, 26, 0, 0, 26, 26);
  spriteCache.set(key, canvas);
  return canvas;
}

export interface DragonLampPalette {
  scaleBase: string;
  scaleHi: string;
  scaleMid: string;
  scaleLo: string;
  bellyBase: string;
  bellyHi: string;
  bellyLo: string;
  hornTip: string;
  hornMid: string;
  hornBase: string;
  eyeIris: string;
  eyeGlow: string;
  rivet: string;
  flameCore: string;
  flameMid: string;
  flameOuter: string;
  floorGlow: string;
}

export function getDragonLampPalette(furniId: string): DragonLampPalette {
  const canonical = resolveFurniSpriteId(furniId).toLowerCase();
  if (canonical === 'jade_dragon' || canonical.includes('jade')) {
    return {
      scaleBase: '#059669',
      scaleHi: '#34d399',
      scaleMid: '#047857',
      scaleLo: '#064e3b',
      bellyBase: '#f59e0b',
      bellyHi: '#fef3c7',
      bellyLo: '#92400e',
      hornTip: '#fef3c7',
      hornMid: '#f59e0b',
      hornBase: '#78350f',
      eyeIris: '#ef4444',
      eyeGlow: '#fef08a',
      rivet: '#fbbf24',
      flameCore: '#fef08a',
      flameMid: '#4ade80',
      flameOuter: '#16a34a',
      floorGlow: 'rgba(74, 222, 128, 0.24)',
    };
  }
  if (
    canonical === 'silver_dragon' ||
    canonical === 'frost_dragon' ||
    canonical.includes('silver') ||
    canonical.includes('frost')
  ) {
    return {
      scaleBase: '#94a3b8',
      scaleHi: '#f8fafc',
      scaleMid: '#64748b',
      scaleLo: '#334155',
      bellyBase: '#bae6fd',
      bellyHi: '#f8fafc',
      bellyLo: '#0284c7',
      hornTip: '#fef3c7',
      hornMid: '#e2e8f0',
      hornBase: '#475569',
      eyeIris: '#38bdf8',
      eyeGlow: '#fef08a',
      rivet: '#94a3b8',
      flameCore: '#fef08a',
      flameMid: '#38bdf8',
      flameOuter: '#0284c7',
      floorGlow: 'rgba(56, 189, 248, 0.25)',
    };
  }
  if (canonical === 'gold_dragon' || canonical.includes('gold')) {
    return {
      scaleBase: '#eab308',
      scaleHi: '#fef9c3',
      scaleMid: '#ca8a04',
      scaleLo: '#854d0e',
      bellyBase: '#f59e0b',
      bellyHi: '#fef9c3',
      bellyLo: '#92400e',
      hornTip: '#fef3c7',
      hornMid: '#fbbf24',
      hornBase: '#78350f',
      eyeIris: '#ef4444',
      eyeGlow: '#fef08a',
      rivet: '#fbbf24',
      flameCore: '#fef08a',
      flameMid: '#f59e0b',
      flameOuter: '#d97706',
      floorGlow: 'rgba(250, 204, 21, 0.26)',
    };
  }
  // Default: fire_dragon (Fire Dragon Lamp)
  return {
    scaleBase: '#dc2626',
    scaleHi: '#f87171',
    scaleMid: '#b91c1c',
    scaleLo: '#7f1d1d',
    bellyBase: '#fbbf24',
    bellyHi: '#fef3c7',
    bellyLo: '#b45309',
    hornTip: '#fef3c7',
    hornMid: '#fbbf24',
    hornBase: '#78350f',
    eyeIris: '#ef4444',
    eyeGlow: '#fef08a',
    rivet: '#fbbf24',
    flameCore: '#fef08a',
    flameMid: '#fb923c',
    flameOuter: '#dc2626',
    floorGlow: 'rgba(251, 146, 60, 0.25)',
  };
}

/**
 * Dedicated 1:1 2008 Sulake Habbo Hotel Rare Dragon Lamp pixel-art sculpting routine (`72x96` integer canvas).
 * Supports all 4 rotations (`rot = 0` Front-Left, `rot = 1` Front-Right, `rot = 2` Back-Right, `rot = 3` Back-Left),
 * stepped obsidian plinth, S-curved scaled torso, 6 segmented belly plates, 4 curved dorsal spines,
 * fierce roaring head with swept horns & fangs, layered scalloped wings, and 4-frame animated pixel flame.
 */
export function drawDragonLamp(
  s: CanvasRenderingContext2D,
  outCtx: CanvasRenderingContext2D,
  furniId: string,
  rot: Direction,
  state: number,
  animTick: number,
  cx = 36,
  cy = 72
): void {
  const pal = getDragonLampPalette(furniId);
  const facingBack = rot === 2 || rot === 3;
  // rot = 0 (Front-Left) and rot = 3 (Back-Left) point along -X; rot = 1 (Front-Right) and rot = 2 (Back-Right) point along +X
  const fx = rot === 1 || rot === 2 ? 1 : -1;
  const plot = (dx: number, dyFromCy: number, w: number, h: number, color: string) => {
    const x = fx === 1 ? cx + dx : cx - dx - w;
    px(s, x, cy + dyFromCy, w, h, color);
  };

  // Warm floor light pool cast on the tile in front when Dragon Lamp is ON (state === 1)
  if (state === 1) {
    const glowX = cx + fx * 15;
    const glowY = facingBack ? cy - 6 : cy + 8;
    outCtx.fillStyle = pal.floorGlow;
    outCtx.beginPath();
    outCtx.ellipse(glowX, glowY, 18, 9, 0, 0, Math.PI * 2);
    outCtx.fill();
  }

  // ============================================================================
  // 1. STEPPED ISOMETRIC STONE/OBSIDIAN PLINTH (64x32 Base Footprint)
  // ============================================================================
  // Tier 1: Lower wide octagonal/isometric carved obsidian base (#27272a top, #18181b left, #09090b right)
  const r1x = 26;
  const r1y = 13;
  const h1 = 6;
  const top1Y = cy - h1;
  for (let dx = -r1x; dx < 0; dx++) {
    const yEdge = top1Y + r1y - Math.floor(((dx + r1x) * r1y) / r1x);
    px(s, cx + dx, yEdge, 1, h1, '#18181b');
    px(s, cx + dx, yEdge, 1, 1, '#3f3f46');
    // Carved horizontal stone groove line along left face
    px(s, cx + dx, yEdge + 3, 1, 1, '#09090b');
    px(s, cx + dx, yEdge + 4, 1, 1, '#27272a');
    px(s, cx + dx, yEdge + h1 - 1, 1, 1, '#09090b');
  }
  for (let dx = 0; dx < r1x; dx++) {
    const yEdge = top1Y + r1y - Math.floor(((r1x - 1 - dx) * r1y) / r1x);
    px(s, cx + dx, yEdge, 1, h1, '#09090b');
    px(s, cx + dx, yEdge, 1, 1, '#27272a');
    // Carved horizontal stone groove line along right shadow face
    px(s, cx + dx, yEdge + 3, 1, 1, '#18181b');
  }
  fillIsoDiamond(s, cx, top1Y, r1x, r1y, '#27272a', '#3f3f46', '#18181b');

  // Tier 2: Upper stepped octagonal plinth block
  const r2x = 19;
  const r2y = 9;
  const h2 = 6;
  const top2Y = cy - h1 - h2;
  for (let dx = -r2x; dx < 0; dx++) {
    const yEdge = top2Y + r2y - Math.floor(((dx + r2x) * r2y) / r2x);
    px(s, cx + dx, yEdge, 1, h2, '#18181b');
    px(s, cx + dx, yEdge, 1, 1, '#3f3f46');
    px(s, cx + dx, yEdge + 3, 1, 1, '#09090b');
    px(s, cx + dx, yEdge + h2 - 1, 1, 1, '#09090b');
  }
  for (let dx = 0; dx < r2x; dx++) {
    const yEdge = top2Y + r2y - Math.floor(((r2x - 1 - dx) * r2y) / r2x);
    px(s, cx + dx, yEdge, 1, h2, '#09090b');
    px(s, cx + dx, yEdge, 1, 1, '#27272a');
    px(s, cx + dx, yEdge + 3, 1, 1, '#18181b');
  }
  fillIsoDiamond(s, cx, top2Y, r2x, r2y, '#27272a', '#52525b', '#18181b');
  fillIsoDiamond(s, cx, top2Y, 14, 7, '#18181b', '#3f3f46', '#09090b');

  // 4 Metallic Corner Rivets on the Stepped Stone Plinth (#fbbf24 / #94a3b8)
  px(s, cx - 22, cy - 6, 2, 2, pal.rivet);
  px(s, cx - 22, cy - 6, 1, 1, '#ffffff');
  px(s, cx - 1, cy + 3, 2, 2, pal.rivet);
  px(s, cx - 1, cy + 3, 1, 1, '#ffffff');
  px(s, cx + 20, cy - 6, 2, 2, pal.rivet);
  px(s, cx - 15, cy - 11, 2, 2, pal.rivet);
  px(s, cx + 13, cy - 11, 2, 2, pal.rivet);

  // ============================================================================
  // 2. COILED TAIL BASE, CLAWED FEET & S-CURVED TORSO / NECK (34px Tall)
  // ============================================================================
  if (!facingBack) {
    // Far wing tip peeking behind the upper chest/neck for deep 3D parallax
    plot(7, -45, 7, 11, pal.scaleLo);
    plot(8, -46, 6, 2, pal.bellyLo);
    plot(9, -43, 6, 8, pal.scaleMid);
    plot(13, -47, 2, 2, pal.hornTip);

    // Coiled muscular dragon tail wrapping around the rear of the upper plinth
    plot(-17, -18, 12, 6, pal.scaleLo);
    plot(-16, -19, 10, 5, pal.scaleBase);
    plot(-15, -20, 8, 2, pal.scaleHi);
    // Barbed curled tail tip on pedestal corner
    plot(-20, -21, 4, 4, pal.scaleMid);
    plot(-21, -23, 3, 2, pal.hornMid);
    plot(-22, -24, 2, 2, pal.hornTip);

    // Muscular dragon haunches & 3-toed talons gripping the plinth rim
    plot(-9, -20, 14, 8, pal.scaleBase);
    plot(-8, -21, 11, 3, pal.scaleHi);
    plot(-9, -14, 14, 2, pal.scaleLo);
    // Front & side clawed talons gripping the obsidian rim
    plot(2, -13, 2, 3, pal.hornMid);
    plot(4, -12, 2, 3, pal.hornTip);
    plot(7, -13, 2, 3, pal.hornMid);
    plot(-8, -12, 2, 3, pal.hornMid);
    plot(-5, -11, 2, 3, pal.hornTip);

    // Muscular S-Curved Dragon Torso & Arched Neck rising 34px above the pedestal (cy - 14 to cy - 48)
    for (let dy = 0; dy < 34; dy++) {
      const y = -14 - dy;
      // Organic S-curve center X offset: swells forward at chest (dy=10..15), arches back at neck (dy=22..27), leans forward at head (dy=31..33)
      const sCurve = Math.round(
        Math.sin((dy / 17) * Math.PI) * 4.5 - Math.sin(((dy - 14) / 18) * Math.PI) * 2.2
      );
      const halfW = dy < 14 ? 7 - Math.floor(dy * 0.08) : Math.max(5, 7 - Math.floor((dy - 10) * 0.12));
      const leftX = sCurve - halfW;
      const totalW = halfW * 2 + 1;

      // Deep back shadow edge
      plot(leftX, y, totalW, 1, pal.scaleBase);
      plot(leftX, y, 3, 1, pal.scaleLo);
      // Staggered isometric scale dithering on the muscular side
      if (dy % 3 === 0) {
        plot(leftX + 3, y, Math.max(2, totalW - 6), 1, pal.scaleHi);
      } else if (dy % 3 === 1) {
        plot(leftX + 2, y, Math.max(2, totalW - 5), 1, pal.scaleMid);
        plot(leftX + 4, y, 2, 1, pal.scaleHi);
      }
      // Front under-shadow before belly plates
      plot(leftX + totalW - 3, y, 3, 1, pal.scaleMid);
    }

    // 4 Sharp Curved Dorsal Pixel Spines along the back ridge of the neck
    const spineHeights = [7, 15, 23, 30];
    for (const sDy of spineHeights) {
      const sy = -14 - sDy;
      const sCurve = Math.round(
        Math.sin((sDy / 17) * Math.PI) * 4.5 - Math.sin(((sDy - 14) / 18) * Math.PI) * 2.2
      );
      const halfW = sDy < 14 ? 7 : 5;
      const spineX = sCurve - halfW;
      plot(spineX - 2, sy - 1, 3, 2, pal.hornBase);
      plot(spineX - 4, sy - 2, 3, 2, pal.hornMid);
      plot(spineX - 5, sy - 3, 2, 1, pal.hornTip);
    }

    // 6 Distinct Horizontal Segmented Belly-Scale Plates along the front chest & throat curve
    const plateRows = [3, 8, 13, 18, 23, 28];
    for (let pIdx = 0; pIdx < plateRows.length; pIdx++) {
      const pDy = plateRows[pIdx];
      const py = -14 - pDy;
      const sCurve = Math.round(
        Math.sin((pDy / 17) * Math.PI) * 4.5 - Math.sin(((pDy - 14) / 18) * Math.PI) * 2.2
      );
      const plateW = pIdx < 3 ? 8 : 7;
      const plateX = sCurve + 1;
      // Top 1px bright bevel
      plot(plateX, py - 3, plateW, 1, pal.bellyHi);
      // Middle 2px burnished plate body
      plot(plateX, py - 2, plateW, 2, pal.bellyBase);
      plot(plateX + plateW - 2, py - 2, 2, 2, pal.bellyHi);
      // Bottom 1px darker sel-out crevice (no black internal lines)
      plot(plateX - 1, py, plateW + 1, 1, pal.bellyLo);
    }

    // ============================================================================
    // 3. LAYERED SCALLOPED DRAGON WING (rot = 0, 1 Near Shoulder 3D Relief)
    // ============================================================================
    // Shaded scalloped wing membrane fan stretching from shoulder (-4, -37) back to (-23, -24)
    for (let wx = -22; wx <= -5; wx++) {
      const dist = Math.abs(wx + 5);
      const topArch = -38 - Math.round(Math.sin((dist / 17) * Math.PI) * 10);
      // Scalloped 3-arch bottom membrane edge
      const scallop = Math.round(Math.abs(Math.sin(((dist - 1) / 5.5) * Math.PI)) * 3);
      const botArch = -22 - Math.floor(dist * 0.25) - scallop;
      const memH = Math.max(2, botArch - topArch);
      plot(wx, topArch, 1, memH, dist % 2 === 0 ? pal.scaleMid : pal.scaleLo);
      // Highlighted upper wing-bone ridge (2px thick)
      plot(wx, topArch, 1, 2, pal.scaleHi);
      plot(wx, topArch + 2, 1, 1, pal.bellyBase);
      // Bottom scalloped membrane sel-out rim
      plot(wx, botArch - 1, 1, 1, pal.scaleLo);
    }
    // Sharp wing-apex thumb claw at (-17, -50)
    plot(-18, -50, 2, 3, pal.hornTip);
    plot(-16, -49, 2, 2, pal.hornMid);
    // 3 internal wing-bone finger struts radiating down to the scalloped tips
    for (let step = 0; step < 14; step++) {
      plot(-15 - Math.floor(step * 0.45), -45 + step, 2, 1, pal.bellyBase);
      plot(-14 - Math.floor(step * 0.1), -45 + step, 1, 1, pal.scaleHi);
      plot(-12 + Math.floor(step * 0.25), -44 + step, 1, 1, pal.scaleHi);
    }

    // ============================================================================
    // 4. FIERCE DRAGON HEAD, SWEPT HORNS & ROARING OPEN JAWS
    // ============================================================================
    // Far Swept-Back Tapered Horn (offset behind brow)
    plot(-5, -57, 4, 3, pal.hornBase);
    plot(-9, -60, 5, 3, pal.hornMid);
    plot(-13, -63, 5, 2, pal.hornTip);
    plot(-15, -64, 3, 2, pal.hornTip);

    // Near Swept-Back Tapered Horn (#fef3c7 ivory/gold tips -> #78350f / #475569 base)
    plot(-3, -55, 5, 3, pal.hornBase);
    plot(-8, -57, 6, 3, pal.hornMid);
    plot(-13, -59, 6, 2, pal.hornTip);
    plot(-17, -61, 5, 2, pal.hornTip);
    plot(-19, -62, 2, 1, '#ffffff');

    // Sculpted Dragon Cranium & Cheek Armor
    plot(-3, -54, 12, 9, pal.scaleBase);
    plot(-2, -55, 10, 2, pal.scaleHi);
    plot(-3, -47, 10, 2, pal.scaleLo);
    // Cheek spikes along rear jaw
    plot(-5, -49, 3, 2, pal.hornMid);
    plot(-6, -48, 2, 2, pal.hornTip);

    // Fierce Overhanging Brow Ridge & Bright Glowing Pixel Eye
    plot(3, -54, 7, 2, pal.scaleHi);
    plot(4, -52, 6, 1, pal.scaleLo);
    // Glowing Eye (#ffffff catchlight + #fef08a / #ef4444 iris)
    plot(4, -51, 3, 2, pal.eyeIris);
    plot(5, -51, 2, 1, pal.eyeGlow);
    plot(4, -51, 1, 1, '#ffffff');

    // Upper Snout, Flared Nostril & Upper White Pixel Fangs
    plot(8, -52, 10, 5, pal.scaleBase);
    plot(8, -53, 8, 2, pal.scaleHi);
    plot(16, -54, 3, 3, pal.scaleHi);
    // Flared nostril pixel
    plot(15, -52, 2, 2, pal.scaleLo);
    plot(15, -52, 1, 1, '#450a0a');
    // Upper jaw gum line
    plot(8, -48, 10, 1, pal.scaleLo);
    // Upper White Pixel Fangs (#ffffff)
    plot(11, -47, 2, 2, '#ffffff');
    plot(16, -47, 2, 3, '#ffffff');

    // Dark Crimson Throat Interior (#450a0a) inside roaring open jaws
    plot(6, -47, 8, 5, '#450a0a');

    // Hinged Open Lower Jaw, Lower Fangs & Pointed Chin Spikes
    plot(5, -43, 12, 3, pal.scaleBase);
    plot(6, -41, 10, 2, pal.bellyBase);
    plot(5, -40, 9, 1, pal.bellyLo);
    // Lower White Pixel Fangs (#ffffff)
    plot(13, -45, 1, 2, '#ffffff');
    plot(16, -44, 2, 2, '#ffffff');
    // Pointed Chin Spikes underneath
    plot(7, -39, 2, 2, pal.hornTip);
    plot(11, -39, 2, 2, pal.hornTip);

    // ============================================================================
    // 5. ANIMATED FLICKERING PIXEL FLAME (state === 1) OR THROAT EMBER (state === 0)
    // ============================================================================
    if (state === 1) {
      const fTick = animTick % 4;
      const dyShift = fTick === 0 ? 0 : fTick === 1 ? -1 : fTick === 2 ? 1 : -2;
      const lenBoost = fTick === 1 || fTick === 3 ? 2 : 0;

      // Outer flickering flame envelope & tongues
      plot(13, -47 + dyShift, 6, 6, pal.flameOuter);
      plot(18, -48 + dyShift, 8 + lenBoost, 9, pal.flameOuter);
      plot(24, -46 + dyShift, 7 + lenBoost, 7, pal.flameOuter);
      // Flickering upper & lower flame tongues
      plot(20 + (fTick % 2), -51 + dyShift, 4, 3, pal.flameOuter);
      plot(26 + lenBoost, -49 - (fTick % 2), 4, 3, pal.flameOuter);
      plot(22, -39 + dyShift, 5, 2, pal.flameOuter);
      plot(30 + lenBoost, -44 + dyShift, 3, 3, pal.flameOuter);

      // Vibrant mid-flame
      plot(12, -46 + dyShift, 7, 4, pal.flameMid);
      plot(18, -46 + dyShift, 8 + lenBoost, 6, pal.flameMid);
      plot(24, -45 + dyShift, 5 + lenBoost, 4, pal.flameMid);
      plot(21, -49 + dyShift, 3, 2, pal.flameMid);

      // Bright white-yellow inner plasma core (#ffffff -> #fef08a)
      plot(10, -46, 5, 3, '#ffffff');
      plot(14, -45 + dyShift, 6, 3, '#ffffff');
      plot(18, -45 + dyShift, 6 + lenBoost, 3, pal.flameCore);
      plot(23, -44 + dyShift, 3, 2, pal.flameCore);

      // Floating pixel embers
      plot(28 + (fTick % 3), -53 + dyShift, 2, 2, pal.flameMid);
      plot(32, -48 - (fTick % 2), 2, 2, pal.flameOuter);
      plot(25 + (fTick % 2), -36 + dyShift, 2, 1, pal.flameCore);
    } else {
      // OFF (state === 0): Tiny glowing ember deep inside the #450a0a throat
      plot(8, -45, 3, 2, pal.flameOuter);
      plot(9, -45, 2, 1, pal.flameCore);
    }
  } else {
    // ============================================================================
    // BACK / REAR-3/4 ROTATIONS (rot = 2 Back-Right, rot = 3 Back-Left)
    // ============================================================================
    // Coiled tail & muscular rear torso rising 34px above pedestal
    plot(-14, -19, 18, 7, pal.scaleLo);
    plot(-12, -20, 14, 5, pal.scaleBase);
    plot(-17, -22, 5, 4, pal.scaleMid);
    plot(-19, -24, 3, 2, pal.hornTip);

    for (let dy = 0; dy < 34; dy++) {
      const y = -14 - dy;
      const sCurve = Math.round(Math.sin((dy / 18) * Math.PI) * 3);
      const halfW = dy < 16 ? 7 : 5;
      plot(sCurve - halfW, y, halfW * 2 + 1, 1, pal.scaleBase);
      plot(sCurve - halfW, y, 3, 1, pal.scaleLo);
      if (dy % 2 === 0) {
        plot(sCurve - 2, y, 5, 1, pal.scaleMid);
      }
      plot(sCurve + halfW - 2, y, 2, 1, pal.scaleHi);
    }

    // Both Spread Back Wings flanking left and right shoulders (rot = 2, 3)
    for (let wx = -23; wx <= -5; wx++) {
      const dist = Math.abs(wx + 5);
      const topY = -39 - Math.round(Math.sin((dist / 18) * Math.PI) * 10);
      const scallop = Math.round(Math.abs(Math.sin(((dist - 1) / 5.5) * Math.PI)) * 3);
      const botY = -23 - Math.floor(dist * 0.25) - scallop;
      plot(wx, topY, 1, Math.max(2, botY - topY), dist % 2 === 0 ? pal.scaleMid : pal.scaleLo);
      plot(wx, topY, 1, 2, pal.scaleHi);
      plot(wx, topY + 2, 1, 1, pal.bellyBase);
    }
    plot(-19, -51, 2, 3, pal.hornTip);

    for (let wx = 5; wx <= 21; wx++) {
      const dist = wx - 5;
      const topY = -43 - Math.round(Math.sin((dist / 16) * Math.PI) * 9);
      const scallop = Math.round(Math.abs(Math.sin(((dist - 1) / 5) * Math.PI)) * 3);
      const botY = -28 - Math.floor(dist * 0.25) - scallop;
      plot(wx, topY, 1, Math.max(2, botY - topY), dist % 2 === 0 ? pal.scaleBase : pal.scaleMid);
      plot(wx, topY, 1, 2, pal.scaleHi);
      plot(wx, topY + 2, 1, 1, pal.bellyBase);
    }
    plot(16, -54, 2, 3, pal.hornTip);

    // 4 Sharp Curved Dorsal Pixel Spines prominent down the center-back spine
    for (const sDy of [7, 15, 23, 30]) {
      const sy = -14 - sDy;
      const sCurve = Math.round(Math.sin((sDy / 18) * Math.PI) * 3);
      plot(sCurve - 2, sy - 1, 4, 3, pal.hornBase);
      plot(sCurve - 3, sy - 2, 3, 2, pal.hornMid);
      plot(sCurve - 4, sy - 3, 2, 2, pal.hornTip);
    }

    // Rear Dragon Skull, Swept-Back Horns & Angled Snout
    plot(-5, -55, 13, 9, pal.scaleBase);
    plot(-4, -56, 10, 2, pal.scaleHi);
    // Twin Swept-Back Horns from rear view
    plot(-8, -58, 5, 3, pal.hornBase);
    plot(-13, -61, 6, 3, pal.hornMid);
    plot(-17, -63, 5, 2, pal.hornTip);
    plot(3, -59, 4, 3, pal.hornBase);
    plot(6, -62, 5, 2, pal.hornMid);
    plot(9, -64, 4, 2, pal.hornTip);
    // Forward-angled snout & open jaw
    plot(7, -54, 9, 5, pal.scaleBase);
    plot(7, -55, 7, 2, pal.scaleHi);
    plot(8, -49, 6, 3, '#450a0a');
    plot(12, -50, 2, 2, '#ffffff');
    plot(7, -46, 8, 2, pal.scaleMid);

    if (state === 1) {
      const fTick = animTick % 4;
      const dyShift = fTick % 2 === 0 ? 0 : -2;
      plot(14, -54 + dyShift, 11, 7, pal.flameOuter);
      plot(21, -56 + dyShift, 9, 6, pal.flameOuter);
      plot(15, -53 + dyShift, 9, 5, pal.flameMid);
      plot(13, -52 + dyShift, 6, 3, '#ffffff');
      plot(18, -53 + dyShift, 6, 3, pal.flameCore);
      plot(28, -59 + dyShift, 2, 2, pal.flameMid);
    } else {
      plot(10, -49, 2, 2, pal.flameCore);
    }
  }
}

/**
 * Renders authentic 2008 Sulake Habbo Hotel 2:1 isometric pixel-art furniture onto a 72x96 offscreen canvas.
 * Tile base diamond center is at (36, 72).
 * Uses selective internal shading ("sel-out") + automatic 1px #141414 outer silhouette pass (`applyPixelOutline`).
 */
export function getFurniSprite(
  rawFurniId: string,
  dir: Direction,
  state = 0,
  animTick = 0
): HTMLCanvasElement {
  const furniId = resolveFurniSpriteId(rawFurniId);
  const isDragon = isDragonLampId(furniId);
  const frame = isDragon ? animTick % 4 : animTick % 3;
  const key = `furni2008v3|${furniId}|${dir}|${state}|${frame}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const W = 72;
  const H = 96;
  const { canvas, ctx } = makeOffscreen(W, H);
  const { canvas: scratch, ctx: s } = makeOffscreen(W, H);
  const cx = 36;
  const cy = 72;

  if (isDragon) {
    // Grounded contact shadow under the 64x32 dragon pedestal
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 25, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    drawDragonLamp(s, ctx, furniId, dir, state, animTick, cx, cy);
    applyPixelOutline(scratch, ctx, W, H, [0x14, 0x14, 0x14]);
    spriteCache.set(key, canvas);
    return canvas;
  }

  const isFlatFloorRugOrTile =
    furniId === 'disco_floor' ||
    furniId === 'petal_patch' ||
    furniId === 'persian_rug' ||
    furniId === 'hc_rug' ||
    furniId === 'flower_bed' ||
    furniId === 'koi_pond' ||
    furniId === 'lodge_bear_rug' ||
    furniId === 'pet_cushion' ||
    furniId.startsWith('rug_');

  const isWallItem =
    furniId === 'sticky_note' ||
    furniId.startsWith('poster_') ||
    furniId === 'neon_habbo_sign' ||
    furniId === 'lifebuoy_wall' ||
    furniId === 'vintage_wall_clock' ||
    furniId === 'gold_record_disc';

  // Sel-out isometric box helper bound to scratch canvas (zero black internal outlines)
  const drawIsoBox = (
    topY: number,
    height: number,
    rx: number,
    ry: number,
    topColor: string,
    leftColor: string,
    rightColor: string,
    offsetX = 0,
    offsetY = 0
  ) => {
    void leftColor;
    void rightColor;
    drawSelOutIsoBox(s, cx, cy, topY, height, rx, ry, topColor, offsetX, offsetY);
  };

  if (furniId === 'disco_floor') {
    // Walkable 2:1 Isometric Disco Floor Tile (3px thick) with 2x2 glowing neon sub-diamonds & 1px silver rim (NO thick black borders!)
    const palette = [
      ['#ec4899', '#38bdf8', '#facc15', '#84cc16'],
      ['#38bdf8', '#facc15', '#84cc16', '#ec4899'],
      ['#facc15', '#84cc16', '#ec4899', '#38bdf8'],
    ][frame % 3];
    // 3px metallic silver/slate slab base
    drawSelOutIsoBox(s, cx, cy, 3, 3, 30, 15, '#cbd5e1');
    fillIsoDiamond(s, cx, cy - 3, 28, 14, '#1e293b', '#f8fafc', '#64748b');
    // 2x2 grid of glowing neon sub-diamonds separated by 1px silver frame
    fillIsoDiamond(s, cx, cy - 10, 12, 6, palette[0], '#ffffff', shadeHex(palette[0], -25));
    fillIsoDiamond(s, cx + 13, cy - 3, 12, 6, palette[1], '#ffffff', shadeHex(palette[1], -25));
    fillIsoDiamond(s, cx - 13, cy - 3, 12, 6, palette[2], '#ffffff', shadeHex(palette[2], -25));
    fillIsoDiamond(s, cx, cy + 4, 12, 6, palette[3], '#ffffff', shadeHex(palette[3], -25));
    // Directly composite Disco Tile onto canvas with silver 1px outer silhouette (no black border)
    applyPixelOutline(scratch, ctx, W, H, [0x94, 0xa3, 0xb8]);
    spriteCache.set(key, canvas);
    return canvas;
  }

  if (furniId === 'hc_sofa') {
    // Authentic 2008 PIXL Club (HC) Crimson Velvet Sofa with golden-oak side panels & gold studs
    drawSelOutRect(s, cx - 22, cy - 3, 4, 4, '#451a03');
    drawSelOutRect(s, cx + 18, cy - 3, 4, 4, '#451a03');
    drawSelOutIsoBox(s, cx, cy, 11, 9, 25, 12, '#991b1b');
    // Plush dithered crimson velvet seat cushions (divided into 2 cushions with sel-out seam)
    drawSelOutIsoBox(s, cx, cy, 15, 5, 11, 5, '#dc2626', -6, 3, true);
    drawSelOutIsoBox(s, cx, cy, 15, 5, 11, 5, '#dc2626', 6, -3, true);
    // Tufted crimson backrest aligned to 2:1 isometric axis
    drawSelOutIsoBox(s, cx, cy, 29, 15, 22, 11, '#ef4444', -6, -3, true);
    // Gold tufting buttons on backrest
    px(s, cx - 12, cy - 23, 2, 2, '#facc15');
    px(s, cx - 5, cy - 26, 2, 2, '#facc15');
    px(s, cx + 2, cy - 29, 2, 2, '#facc15');
    // Curved golden-oak armrests with brass studs
    drawSelOutIsoBox(s, cx, cy, 19, 10, 6, 3, '#b45309', -17, 6);
    drawSelOutIsoBox(s, cx, cy, 19, 10, 6, 3, '#b45309', 17, -6);
    px(s, cx - 18, cy - 13, 2, 2, '#fef08a');
    px(s, cx + 16, cy - 25, 2, 2, '#fef08a');
  } else if (furniId === 'throne' || furniId === 'ice_throne') {
    const isIce = furniId === 'ice_throne';
    const frameCol = isIce ? '#38bdf8' : '#eab308';
    const frameHi = isIce ? '#e0f2fe' : '#fef08a';
    const frameLo = isIce ? '#0284c7' : '#a16207';
    const velvet = isIce ? '#bae6fd' : '#dc2626';
    // Lion-paw gilded base & steps
    drawSelOutIsoBox(s, cx, cy, 10, 9, 22, 11, frameCol);
    // Plush tufted crimson/crystal velvet seat cushion
    drawSelOutIsoBox(s, cx, cy, 15, 5, 16, 8, velvet, 0, 0, true);
    // Tall gothic arched backrest angled along 2:1 isometric plane
    for (let dx = -12; dx <= 12; dx++) {
      const yIso = Math.round(-dx * 0.5);
      const archLift = Math.max(0, 6 - Math.floor(Math.abs(dx) * 0.5));
      const col = dx < -4 ? frameHi : dx > 6 ? frameLo : frameCol;
      px(s, cx - 8 + dx, cy - 54 + yIso - archLift, 1, 38 + archLift, col);
      if (Math.abs(dx) <= 9) {
        const vCol = (dx + yIso) % 2 === 0 ? velvet : shadeHex(velvet, -16);
        px(s, cx - 8 + dx, cy - 49 + yIso - archLift, 1, 29 + archLift, vCol);
      }
    }
    // Tufting gems on backrest
    px(s, cx - 12, cy - 38, 2, 2, frameHi);
    px(s, cx - 6, cy - 41, 2, 2, frameHi);
    px(s, cx - 9, cy - 31, 2, 2, frameHi);
    // Twin gothic spire finials + royal crest gem at peak
    drawSelOutRect(s, cx - 21, cy - 54, 4, 9, frameCol, frameHi, frameLo);
    drawSelOutRect(s, cx + 2, cy - 66, 4, 9, frameCol, frameHi, frameLo);
    drawSelOutRect(s, cx - 11, cy - 64, 7, 7, frameCol, frameHi, frameLo);
    px(s, cx - 9, cy - 62, 3, 3, isIce ? '#ffffff' : '#2563eb');
    // Sculpted armrests with lion-paw fronts
    drawSelOutIsoBox(s, cx, cy, 21, 10, 6, 3, frameCol, -13, 5);
    drawSelOutIsoBox(s, cx, cy, 21, 10, 6, 3, frameCol, 13, -5);
  } else if (furniId === 'majestic_chair') {
    // Deep royal purple/gold tufted Majestic Chair with carved walnut frame
    drawSelOutIsoBox(s, cx, cy, 10, 8, 20, 10, '#78350f', 0, 0, true);
    drawSelOutIsoBox(s, cx, cy, 15, 5, 15, 7, '#7e22ce', 0, 0, true);
    drawSelOutIsoBox(s, cx, cy, 34, 19, 13, 6, '#92400e', -7, -4);
    drawSelOutIsoBox(s, cx, cy, 31, 15, 10, 5, '#9333ea', -6, -3, true);
    px(s, cx - 9, cy - 26, 2, 2, '#facc15');
    px(s, cx - 4, cy - 28, 2, 2, '#facc15');
    drawSelOutIsoBox(s, cx, cy, 19, 9, 5, 3, '#b45309', -12, 4);
    drawSelOutIsoBox(s, cx, cy, 19, 9, 5, 3, '#b45309', 12, -4);
  } else if (furniId === 'amber_lamp') {
    // Ornate brass claw tripod base + glowing translucent egg-shaped red amber glass globe
    drawSelOutIsoBox(s, cx, cy, 8, 7, 15, 7, '#b45309');
    drawSelOutRect(s, cx - 4, cy - 23, 8, 15, '#eab308', '#fef08a', '#78350f');
    const glow = state === 1 ? (frame === 1 ? '#ef4444' : '#f87171') : '#b91c1c';
    const hi = state === 1 ? '#fecaca' : '#ef4444';
    // Egg-shaped amber globe
    drawSelOutRect(s, cx - 9, cy - 49, 18, 26, glow, hi, '#7f1d1d');
    drawSelOutRect(s, cx - 12, cy - 44, 24, 16, glow, hi, '#7f1d1d');
    if (state === 1) {
      px(s, cx - 5, cy - 42, 10, 12, '#fca5a5');
      px(s, cx - 3, cy - 39, 6, 6, '#fef08a');
    }
    px(s, cx - 6, cy - 45, 3, 6, '#ffffff');
    drawSelOutRect(s, cx - 3, cy - 54, 6, 5, '#eab308', '#fef08a', '#78350f');
  } else if (furniId === 'golden_fountain') {
    // 2-tier sculpted 24k Gold Basin Fountain with animated cascading pixel water droplets
    drawSelOutIsoBox(s, cx, cy, 12, 11, 25, 12, '#eab308');
    fillIsoDiamond(s, cx, cy - 12, 20, 10, '#0284c7', '#7dd3fc', '#0369a1', '#38bdf8');
    drawSelOutRect(s, cx - 4, cy - 38, 8, 26, '#facc15', '#fef08a', '#a16207');
    drawSelOutIsoBox(s, cx, cy, 40, 5, 14, 7, '#eab308');
    fillIsoDiamond(s, cx, cy - 40, 11, 5, '#38bdf8', '#e0f2fe', '#0284c7');
    // Cascading water arcs & droplets
    const sprayY = cy - 54 - (frame % 2) * 3;
    px(s, cx - 2, sprayY, 4, 14, '#bae6fd');
    px(s, cx - 1, sprayY, 2, 8, '#ffffff');
    px(s, cx - 9, cy - 38 + frame * 2, 2, 22, '#7dd3fc');
    px(s, cx + 7, cy - 38 + ((frame + 1) % 3) * 2, 2, 22, '#7dd3fc');
    px(s, cx - 12, cy - 14 + frame, 4, 2, '#ffffff');
    px(s, cx + 9, cy - 13 - frame, 4, 2, '#ffffff');
  } else if (furniId === 'imperial_teleporter') {
    // Tall Octagonal Red & Gold Imperial Teleport Booth with windowed double doors
    drawSelOutIsoBox(s, cx, cy, 9, 8, 22, 11, '#78350f');
    drawSelOutIsoBox(s, cx, cy, 60, 51, 18, 9, '#b45309');
    // Windowed double doors on front face
    drawSelOutRect(s, cx - 10, cy - 50, 20, 40, '#991b1b', '#ef4444', '#450a0a');
    drawSelOutRect(
      s,
      cx - 7,
      cy - 46,
      6,
      14,
      state === 1 ? '#fef08a' : '#38bdf8',
      '#ffffff',
      '#0284c7'
    );
    drawSelOutRect(
      s,
      cx + 1,
      cy - 46,
      6,
      14,
      state === 1 ? '#fef08a' : '#38bdf8',
      '#ffffff',
      '#0284c7'
    );
    if (state === 1) {
      const shimmerY = cy - 44 + frame * 10;
      px(s, cx - 8, shimmerY, 16, 5, '#fef08a');
      px(s, cx - 5, shimmerY + 1, 10, 2, '#ffffff');
    }
    // Crowned gold roof pediment
    drawSelOutIsoBox(s, cx, cy, 65, 5, 21, 10, '#eab308');
    px(s, cx + 5, cy - 28, 2, 4, '#facc15');
  } else if (
    furniId === 'gold_trophy' ||
    furniId === 'silver_trophy' ||
    furniId === 'bronze_trophy'
  ) {
    const cupMain =
      furniId === 'gold_trophy'
        ? '#eab308'
        : furniId === 'silver_trophy'
        ? '#cbd5e1'
        : '#d97706';
    const cupHi =
      furniId === 'gold_trophy'
        ? '#fef9c3'
        : furniId === 'silver_trophy'
        ? '#ffffff'
        : '#fed7aa';
    const cupDark =
      furniId === 'gold_trophy'
        ? '#854d0e'
        : furniId === 'silver_trophy'
        ? '#64748b'
        : '#7c2d12';
    drawSelOutIsoBox(s, cx, cy, 15, 14, 14, 7, '#e2e8f0');
    px(s, cx - 5, cy - 9, 10, 5, cupHi);
    px(s, cx - 4, cy - 8, 8, 1, cupDark);
    drawSelOutRect(s, cx - 3, cy - 29, 6, 14, cupMain, cupHi, cupDark);
    drawSelOutRect(s, cx - 10, cy - 47, 20, 18, cupMain, cupHi, cupDark);
    drawSelOutRect(s, cx - 14, cy - 44, 4, 10, cupMain, cupHi, cupDark);
    drawSelOutRect(s, cx + 10, cy - 44, 4, 10, cupMain, cupHi, cupDark);
    px(s, cx - 6, cy - 44, 3, 9, '#ffffff');
  } else if (furniId === 'banzai_barrier') {
    drawSelOutIsoBox(s, cx, cy, 10, 9, 18, 9, '#1e1b4b');
    const neonCol = frame % 2 === 0 ? '#22d3ee' : '#ec4899';
    drawSelOutRect(s, cx - 14, cy - 34, 6, 25, '#475569', '#94a3b8', '#0f172a');
    drawSelOutRect(s, cx + 8, cy - 34, 6, 25, '#475569', '#94a3b8', '#0f172a');
    drawSelOutRect(s, cx - 11, cy - 29, 22, 5, neonCol, '#ffffff', '#0f172a');
    drawSelOutRect(s, cx - 11, cy - 19, 22, 4, '#38bdf8', '#e0f2fe', '#0369a1');
    px(s, cx - 13, cy - 37, 4, 3, neonCol);
    px(s, cx + 9, cy - 37, 4, 3, neonCol);
  } else if (furniId === 'mode_sofa') {
    // Sleek tubular steel-frame Mode Sofa (#8c96a4) with dark charcoal/crimson cushions
    drawSelOutIsoBox(s, cx, cy, 10, 8, 25, 12, '#8c96a4');
    drawSelOutIsoBox(s, cx, cy, 15, 5, 11, 5, '#334155', -6, 3, true);
    drawSelOutIsoBox(s, cx, cy, 15, 5, 11, 5, '#334155', 6, -3, true);
    drawSelOutIsoBox(s, cx, cy, 29, 14, 21, 10, '#475569', -6, -3, true);
    drawSelOutIsoBox(s, cx, cy, 18, 9, 5, 3, '#cbd5e1', -17, 6);
    drawSelOutIsoBox(s, cx, cy, 18, 9, 5, 3, '#cbd5e1', 17, -6);
  } else if (furniId === 'mode_bar') {
    drawSelOutIsoBox(s, cx, cy, 24, 22, 26, 13, '#64748b');
    drawSelOutIsoBox(s, cx, cy, 27, 3, 27, 13, '#cbd5e1');
    px(s, cx - 16, cy - 5, 14, 2, '#f8fafc');
    drawSelOutRect(s, cx + 5, cy - 37, 6, 10, '#38bdf8', '#e0f2fe', '#0284c7');
    drawSelOutRect(s, cx - 7, cy - 35, 5, 8, '#f8fafc', '#ffffff', '#94a3b8');
  } else if (furniId === 'exec_desk') {
    drawSelOutRect(s, cx - 19, cy - 14, 4, 14, '#78350f', '#b45309', '#451a03');
    drawSelOutRect(s, cx + 15, cy - 14, 4, 14, '#78350f', '#b45309', '#451a03');
    drawSelOutIsoBox(s, cx, cy, 19, 6, 25, 12, '#c67d38', 0, 0, true);
    drawSelOutRect(s, cx - 3, cy - 26, 6, 6, '#f8fafc', '#ffffff', '#cbd5e1');
    px(s, cx - 2, cy - 25, 4, 2, '#78350f');
  } else if (furniId === 'fireplace') {
    drawSelOutIsoBox(s, cx, cy, 14, 12, 26, 13, '#78716c', 0, 0, true);
    drawSelOutIsoBox(s, cx, cy, 54, 40, 20, 10, '#a8a29e', 0, 0, true);
    drawSelOutIsoBox(s, cx, cy, 58, 4, 23, 11, '#c67d38');
    drawSelOutRect(s, cx - 10, cy - 34, 20, 22, '#1c1917', '#44403c', '#09090b');
    const h = 8 + (frame % 3) * 3;
    px(s, cx - 7, cy - 16, 14, 4, '#78350f');
    px(s, cx - 5, cy - 16 - h, 10, h, '#ea580c');
    px(s, cx - 3, cy - 15 - Math.max(4, h - 3), 6, Math.max(4, h - 3), '#facc15');
  } else if (furniId === 'jukebox') {
    // True 3D isometric Wurlitzer Jukebox with glowing neon rainbow arch
    drawSelOutIsoBox(s, cx, cy, 10, 9, 20, 10, '#451a03');
    drawSelOutIsoBox(s, cx, cy, 52, 42, 16, 8, '#92400e');
    const neonColors = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#c084fc'];
    const cShift = animTick % neonColors.length;
    drawSelOutRect(s, cx - 11, cy - 50, 22, 20, neonColors[cShift], '#ffffff', '#78350f');
    drawSelOutRect(s, cx - 7, cy - 46, 14, 13, '#0f172a', '#334155', '#020617');
    px(s, cx - 4, cy - 42, 8, 5, '#fef08a');
    for (let y = -26; y <= -14; y += 3) {
      px(s, cx - 9, cy + y, 18, 1, '#facc15');
    }
    if (state === 1) {
      const ny = cy - 64 - frame * 3;
      px(s, cx + 6, ny, 2, 6, '#38bdf8');
      px(s, cx + 4, ny + 4, 3, 3, '#38bdf8');
    }
  } else if (furniId === 'palm_tree') {
    // Terracotta isometric planter + curved ringed trunk + organic multi-layered pixel palm fronds
    drawSelOutIsoBox(s, cx, cy, 12, 11, 13, 6, '#c2410c');
    drawSelOutIsoBox(s, cx, cy, 15, 3, 15, 7, '#ea580c');
    fillIsoDiamond(s, cx, cy - 15, 11, 5, '#451a03');
    for (let i = 0; i < 6; i++) {
      const shiftX = Math.round(Math.sin(i * 0.5) * 2);
      drawSelOutRect(
        s,
        cx - 3 + shiftX,
        cy - 21 - i * 6,
        6,
        6,
        i % 2 === 0 ? '#92400e' : '#78350f',
        '#b45309',
        '#451a03'
      );
    }
    const frondY = cy - 58;
    fillIsoDiamond(s, cx - 13, frondY + 4, 13, 6, '#15803d', '#22c55e', '#14532d');
    fillIsoDiamond(s, cx + 13, frondY + 4, 13, 6, '#15803d', '#22c55e', '#14532d');
    fillIsoDiamond(s, cx - 9, frondY - 2, 12, 6, '#16a34a', '#4ade80', '#15803d');
    fillIsoDiamond(s, cx + 9, frondY - 2, 12, 6, '#16a34a', '#4ade80', '#15803d');
    fillIsoDiamond(s, cx, frondY - 7, 11, 5, '#22c55e', '#86efac', '#16a34a');
  } else if (furniId === 'bonsai') {
    // Glazed cobalt-blue ceramic isometric pot + twisted bark trunk + 3 organic foliage clouds
    drawSelOutIsoBox(s, cx, cy, 9, 8, 14, 7, '#1d4ed8');
    fillIsoDiamond(s, cx, cy - 9, 11, 5, '#451a03');
    drawSelOutRect(s, cx - 3, cy - 26, 6, 17, '#78350f', '#a16207', '#451a03');
    drawSelOutRect(s, cx - 6, cy - 30, 5, 6, '#78350f', '#a16207', '#451a03');
    fillIsoDiamond(s, cx - 8, cy - 33, 12, 6, '#15803d', '#4ade80', '#14532d', '#16a34a');
    fillIsoDiamond(s, cx + 6, cy - 38, 12, 6, '#16a34a', '#86efac', '#15803d', '#22c55e');
    fillIsoDiamond(s, cx - 1, cy - 44, 10, 5, '#22c55e', '#bbf7d0', '#16a34a', '#4ade80');
  } else if (furniId === 'holo_dice') {
    drawSelOutIsoBox(s, cx, cy, 10, 9, 16, 8, '#334155');
    const glow = frame === 1 ? '#67e8f9' : '#22d3ee';
    drawSelOutIsoBox(s, cx, cy, 28, 16, 12, 6, glow);
    // Pixel pip dots on cube faces instead of vector text
    const val = Math.max(1, Math.min(6, state || 1));
    const pipOffsets: Record<number, [number, number][]> = {
      1: [[0, -28]],
      2: [[-4, -29], [4, -27]],
      3: [[-5, -29], [0, -28], [5, -27]],
      4: [[-5, -28], [5, -28], [0, -31], [0, -25]],
      5: [[-5, -28], [5, -28], [0, -28], [0, -31], [0, -25]],
      6: [[-6, -29], [-2, -27], [2, -29], [6, -27], [-2, -31], [2, -25]],
    };
    for (const [pxOff, pyOff] of pipOffsets[val] ?? pipOffsets[1]) {
      px(s, cx + pxOff - 1, cy + pyOff - 1, 2, 2, '#0f172a');
    }
  } else if (furniId === 'persian_rug') {
    fillIsoDiamond(s, cx, cy, 29, 14, '#991b1b', '#facc15', '#7f1d1d', '#b91c1c');
    fillIsoDiamond(s, cx, cy, 19, 9, '#dc2626', '#fef08a', '#991b1b');
    fillIsoDiamond(s, cx, cy, 8, 4, '#f59e0b', '#ffffff', '#b45309');
  } else if (furniId === 'petal_patch') {
    // Lush multi-shade dithered grass carpet studded with yellow/white pixel daisies
    fillIsoDiamond(s, cx, cy, 30, 15, '#228b22', '#4ade80', '#14532d', '#2ea82e');
    fillIsoDiamond(s, cx, cy, 25, 12, '#34a832', '#86efac', '#166534', '#228b22');
    const daisies: [number, number][] = [
      [-12, -1],
      [3, -6],
      [13, 1],
      [-3, 5],
      [-5, -4],
      [7, 4],
    ];
    for (const [dx, dy] of daisies) {
      px(s, cx + dx - 1, cy + dy - 1, 4, 4, '#ffffff');
      px(s, cx + dx, cy + dy, 2, 2, '#facc15');
    }
  } else if (furniId === 'pod_chair') {
    // Glossy molded Aqua Pod Chair on central pedestal
    fillIsoDiamond(s, cx, cy, 11, 5, '#0284c7', '#7dd3fc', '#0369a1');
    drawSelOutIsoBox(s, cx, cy, 18, 14, 18, 9, '#0ea5e9');
    fillIsoDiamond(s, cx, cy - 18, 14, 7, '#0369a1', '#bae6fd', '#0c4a6e');
    px(s, cx - 12, cy - 15, 5, 3, '#ffffff');
  } else if (furniId === 'lodge_bench') {
    drawSelOutRect(s, cx - 19, cy - 12, 4, 12, '#78350f', '#b45309', '#451a03');
    drawSelOutRect(s, cx + 15, cy - 12, 4, 12, '#78350f', '#b45309', '#451a03');
    drawSelOutIsoBox(s, cx, cy, 14, 6, 24, 12, '#b45309', 0, 0, true);
    drawSelOutIsoBox(s, cx, cy, 17, 3, 18, 9, '#b91c1c', 0, 0, true);
  } else if (furniId === 'area_table') {
    // Warm honey oak (#c67d38) Area Coffee Table with wood grain & fruit bowl
    drawSelOutRect(s, cx - 20, cy - 15, 5, 15, '#92400e', '#c67d38', '#451a03');
    drawSelOutRect(s, cx + 15, cy - 15, 5, 15, '#92400e', '#c67d38', '#451a03');
    drawSelOutIsoBox(s, cx, cy, 18, 6, 24, 12, '#c67d38', 0, 0, true);
    fillIsoDiamond(s, cx, cy - 20, 8, 4, '#475569', '#94a3b8', '#1e293b');
    px(s, cx - 4, cy - 24, 4, 4, '#ef4444');
    px(s, cx, cy - 25, 4, 4, '#facc15');
    px(s, cx + 3, cy - 23, 3, 3, '#22c55e');
  } else if (furniId === 'mini_fridge') {
    drawSelOutIsoBox(s, cx, cy, 38, 36, 18, 9, '#e0f2fe');
    if (state === 1) {
      drawSelOutRect(s, cx - 10, cy - 32, 14, 24, '#0284c7', '#38bdf8', '#0369a1');
      px(s, cx - 8, cy - 28, 4, 5, '#ef4444');
      px(s, cx - 2, cy - 28, 4, 5, '#22c55e');
      px(s, cx - 8, cy - 18, 4, 5, '#facc15');
      drawSelOutRect(s, cx + 5, cy - 34, 9, 28, '#bae6fd', '#ffffff', '#0ea5e9');
    } else {
      drawSelOutRect(s, cx + 6, cy - 26, 2, 9, '#64748b', '#f8fafc', '#334155');
      px(s, cx - 6, cy - 30, 5, 5, '#dc2626');
    }
  } else if (furniId === 'arcade_cabinet') {
    // True 3D Isometric Arcade Cabinet with slanted CRT screen & joystick deck
    drawSelOutIsoBox(s, cx, cy, 24, 22, 18, 9, '#3730a3');
    drawSelOutIsoBox(s, cx, cy, 56, 32, 14, 7, '#4f46e5', -3, -2);
    // Glowing top marquee in 2:1 perspective
    drawSelOutIsoBox(s, cx, cy, 62, 6, 16, 8, '#facc15', -2, -1);
    // Slanted CRT screen
    drawSelOutRect(s, cx - 9, cy - 48, 18, 15, '#020617', '#38bdf8', '#1e1b4b');
    const alienX = cx - 5 + frame * 3;
    px(s, alienX, cy - 44, 4, 4, '#4ade80');
    px(s, cx - 4, cy - 37, 8, 2, '#38bdf8');
    // Control deck joystick & buttons
    px(s, cx - 6, cy - 28, 2, 4, '#ef4444');
    px(s, cx + 2, cy - 26, 2, 2, '#facc15');
    px(s, cx + 6, cy - 27, 2, 2, '#22c55e');
  } else if (furniId === 'plasma_tv') {
    // Sleek Silver Widescreen Plasma TV angled in 2:1 isometric perspective (dy = dx / 2)
    drawSelOutIsoBox(s, cx, cy, 7, 6, 16, 8, '#64748b');
    drawSelOutRect(s, cx - 3, cy - 18, 6, 11, '#94a3b8', '#f8fafc', '#475569');
    const channels = ['#0284c7', '#7c3aed', '#059669'];
    const bgScreen = state === 1 ? channels[frame % channels.length] : '#0f172a';
    for (let dx = -22; dx <= 22; dx++) {
      const yIso = Math.round(dx * 0.5);
      // 3D back thickness of panel
      px(s, cx + dx - 2, cy - 48 + yIso - 1, 2, 26, '#334155');
      // Silver bezel front
      px(s, cx + dx, cy - 48 + yIso, 1, 26, dx < 0 ? '#e2e8f0' : '#94a3b8');
      if (dx >= -19 && dx <= 19) {
        px(s, cx + dx, cy - 45 + yIso, 1, 20, bgScreen);
        if (state === 1 && dx >= -19 && dx <= 19) {
          // Live pixel beach / sun broadcast scene
          if (dx >= -6 && dx <= 2) {
            px(s, cx + dx, cy - 41 + yIso, 1, 6, '#fde047');
          }
          px(s, cx + dx, cy - 31 + yIso, 1, 5, '#facc15');
        }
      }
    }
    px(s, cx + 18, cy - 14, 2, 2, state === 1 ? '#22c55e' : '#ef4444');
  } else if (furniId === 'lava_lamp') {
    drawSelOutIsoBox(s, cx, cy, 7, 6, 12, 6, '#64748b');
    drawSelOutRect(s, cx - 5, cy - 18, 10, 11, '#94a3b8', '#f8fafc', '#475569');
    drawSelOutRect(
      s,
      cx - 6,
      cy - 46,
      12,
      28,
      state === 1 ? '#312e81' : '#1e293b',
      '#818cf8',
      '#0f172a'
    );
    if (state === 1) {
      const b1Y = cy - 26 - frame * 5;
      const b2Y = cy - 40 + frame * 4;
      px(s, cx - 3, b1Y, 6, 6, '#f472b6');
      px(s, cx - 2, b2Y, 5, 5, '#22d3ee');
    }
    drawSelOutRect(s, cx - 4, cy - 52, 8, 6, '#94a3b8', '#f8fafc', '#475569');
  } else if (furniId === 'hc_minibar') {
    drawSelOutIsoBox(s, cx, cy, 26, 24, 22, 11, '#78350f', 0, 0, true);
    drawSelOutIsoBox(s, cx, cy, 29, 3, 24, 12, '#eab308');
    drawSelOutRect(s, cx - 9, cy - 41, 5, 12, '#16a34a', '#4ade80', '#14532d');
    drawSelOutRect(s, cx - 2, cy - 38, 5, 9, '#38bdf8', '#e0f2fe', '#0284c7');
    drawSelOutRect(s, cx + 5, cy - 36, 4, 7, '#f8fafc', '#ffffff', '#94a3b8');
    px(s, cx - 6, cy - 15, 4, 2, '#facc15');
  } else if (furniId === 'hc_study_desk') {
    drawSelOutRect(s, cx - 20, cy - 16, 5, 16, '#451a03', '#78350f', '#270e02');
    drawSelOutRect(s, cx + 15, cy - 16, 5, 16, '#451a03', '#78350f', '#270e02');
    drawSelOutIsoBox(s, cx, cy, 20, 6, 26, 13, '#92400e', 0, 0, true);
    fillIsoDiamond(s, cx, cy - 20, 14, 7, '#166534', '#4ade80', '#14532d');
    drawSelOutRect(s, cx + 7, cy - 36, 3, 13, '#eab308', '#fef08a', '#854d0e');
    fillIsoDiamond(s, cx + 8, cy - 38, 8, 4, '#16a34a', '#86efac', '#14532d');
  } else if (furniId === 'hc_lantern') {
    drawSelOutIsoBox(s, cx, cy, 8, 7, 12, 6, '#78350f');
    drawSelOutRect(s, cx - 2, cy - 38, 4, 30, '#ca8a04', '#fef08a', '#78350f');
    const glow = state === 1 ? '#fef08a' : '#d97706';
    drawSelOutIsoBox(s, cx, cy, 56, 18, 11, 5, glow);
    drawSelOutIsoBox(s, cx, cy, 60, 4, 13, 6, '#78350f');
  } else if (furniId === 'hc_rug') {
    fillIsoDiamond(s, cx, cy, 29, 14, '#14532d', '#eab308', '#052e16', '#166534');
    fillIsoDiamond(s, cx, cy, 19, 9, '#166534', '#fef08a', '#14532d');
    fillIsoDiamond(s, cx, cy, 8, 4, '#eab308', '#ffffff', '#a16207');
  } else if (furniId === 'gold_typewriter') {
    drawSelOutIsoBox(s, cx, cy, 11, 9, 18, 9, '#eab308');
    drawSelOutRect(s, cx - 8, cy - 34, 16, 16, '#f8fafc', '#ffffff', '#cbd5e1');
    px(s, cx - 5, cy - 30, 10, 1, '#64748b');
    px(s, cx - 5, cy - 26, 8, 1, '#64748b');
    drawSelOutIsoBox(s, cx, cy, 17, 6, 14, 7, '#ca8a04', -2, -1);
  } else if (furniId === 'purple_pillow') {
    drawSelOutIsoBox(s, cx, cy, 9, 7, 22, 11, '#9333ea', 0, 0, true);
    fillIsoDiamond(s, cx, cy - 10, 16, 8, '#c084fc', '#f3e8ff', '#6b21a8');
    px(s, cx - 22, cy - 7, 3, 4, '#facc15');
    px(s, cx + 19, cy - 7, 3, 4, '#facc15');
    px(s, cx - 1, cy + 2, 3, 4, '#facc15');
  } else if (furniId === 'pura_sofa') {
    drawSelOutIsoBox(s, cx, cy, 10, 8, 25, 12, '#f1f5f9');
    drawSelOutIsoBox(s, cx, cy, 15, 5, 11, 5, '#38bdf8', -6, 3, true);
    drawSelOutIsoBox(s, cx, cy, 15, 5, 11, 5, '#38bdf8', 6, -3, true);
    drawSelOutIsoBox(s, cx, cy, 29, 14, 21, 10, '#e0f2fe', -6, -3);
    drawSelOutIsoBox(s, cx, cy, 18, 9, 5, 3, '#ffffff', -17, 6);
    drawSelOutIsoBox(s, cx, cy, 18, 9, 5, 3, '#ffffff', 17, -6);
  } else if (furniId === 'pura_lamp') {
    drawSelOutIsoBox(s, cx, cy, 8, 7, 12, 6, '#cbd5e1');
    drawSelOutRect(s, cx - 2, cy - 42, 4, 34, '#e2e8f0', '#ffffff', '#94a3b8');
    const shade = state === 1 ? '#fef08a' : '#38bdf8';
    drawSelOutIsoBox(s, cx, cy, 56, 16, 13, 6, shade);
  } else if (furniId === 'lido_lounger') {
    drawSelOutIsoBox(s, cx, cy, 8, 6, 26, 13, '#f8fafc');
    drawSelOutIsoBox(s, cx, cy, 11, 3, 22, 11, '#0ea5e9', 0, 0, true);
    drawSelOutIsoBox(s, cx, cy, 17, 6, 10, 5, '#38bdf8', -10, -5);
    px(s, cx - 14, cy - 21, 8, 3, '#ffffff');
  } else if (furniId === 'beach_umbrella') {
    drawSelOutIsoBox(s, cx, cy, 6, 5, 12, 6, '#94a3b8');
    drawSelOutRect(s, cx - 2, cy - 54, 4, 48, '#f1f5f9', '#ffffff', '#94a3b8');
    fillIsoDiamond(s, cx, cy - 54, 28, 14, '#ef4444', '#fca5a5', '#991b1b');
    fillIsoDiamond(s, cx, cy - 58, 16, 8, '#ffffff', '#ffffff', '#cbd5e1');
    px(s, cx - 2, cy - 66, 4, 4, '#facc15');
  } else if (furniId === 'pool_ring_duck') {
    drawSelOutIsoBox(s, cx, cy, 8, 6, 18, 9, '#facc15');
    drawSelOutIsoBox(s, cx, cy, 18, 10, 12, 6, '#fef08a');
    drawSelOutRect(s, cx + 4, cy - 30, 10, 11, '#facc15', '#fef9c3', '#ca8a04');
    px(s, cx + 13, cy - 26, 5, 4, '#f97316');
    px(s, cx + 10, cy - 28, 2, 2, '#141414');
  } else if (furniId === 'tiki_torch') {
    drawSelOutIsoBox(s, cx, cy, 6, 5, 11, 5, '#78350f');
    drawSelOutRect(s, cx - 3, cy - 46, 6, 40, '#92400e', '#d97706', '#451a03');
    drawSelOutIsoBox(s, cx, cy, 52, 7, 8, 4, '#b45309');
    if (state === 1) {
      const f = frame % 3;
      px(s, cx - 4, cy - 64 - f, 8, 12 + f, '#ea580c');
      px(s, cx - 2, cy - 61 - f, 4, 8, '#facc15');
      px(s, cx - 1, cy - 59 - f, 2, 4, '#fef9c3');
    }
  } else if (furniId === 'pine_tree') {
    // Organic layered evergreen pine needles (no black internal triangle strokes)
    drawSelOutIsoBox(s, cx, cy, 12, 11, 10, 5, '#78350f');
    fillIsoDiamond(s, cx, cy - 18, 22, 11, '#14532d', '#22c55e', '#052e16', '#166534');
    fillIsoDiamond(s, cx, cy - 28, 19, 9, '#15803d', '#4ade80', '#14532d', '#16a34a');
    fillIsoDiamond(s, cx, cy - 38, 15, 7, '#16a34a', '#86efac', '#15803d', '#22c55e');
    fillIsoDiamond(s, cx, cy - 48, 11, 5, '#22c55e', '#bbf7d0', '#16a34a');
    fillIsoDiamond(s, cx, cy - 56, 6, 3, '#4ade80', '#ffffff', '#22c55e');
  } else if (furniId === 'flower_bed') {
    drawSelOutIsoBox(s, cx, cy, 5, 4, 28, 14, '#78350f');
    fillIsoDiamond(s, cx, cy - 5, 24, 12, '#15803d', '#4ade80', '#14532d', '#16a34a');
    const blooms: [number, number, string][] = [
      [-12, -6, '#f43f5e'],
      [-3, -10, '#facc15'],
      [7, -8, '#ec4899'],
      [14, -4, '#38bdf8'],
      [0, 0, '#f43f5e'],
      [-8, -2, '#facc15'],
    ];
    for (const [bx, by, bcol] of blooms) {
      px(s, cx + bx - 2, cy + by - 2, 5, 4, bcol);
      px(s, cx + bx, cy + by - 1, 2, 2, '#ffffff');
    }
  } else if (furniId === 'disco_ball') {
    drawSelOutIsoBox(s, cx, cy, 6, 5, 12, 6, '#334155');
    drawSelOutRect(s, cx - 1, cy - 72, 2, 20, '#94a3b8', '#f8fafc', '#475569');
    drawSelOutRect(s, cx - 12, cy - 53, 24, 24, '#cbd5e1', '#ffffff', '#64748b');
    const glint = frame === 0 ? '#38bdf8' : frame === 1 ? '#f472b6' : '#fef08a';
    for (let yy = -49; yy <= -33; yy += 4) {
      for (let xx = -8; xx <= 6; xx += 4) {
        px(s, cx + xx, cy + yy, 2, 2, (xx + yy + frame) % 3 === 0 ? glint : '#ffffff');
      }
    }
  } else if (furniId === 'dj_booth') {
    // True 3D Isometric DJ Booth with dual vinyl platters, crossfader & LED spectrum
    drawSelOutIsoBox(s, cx, cy, 22, 20, 28, 14, '#1e293b');
    drawSelOutIsoBox(s, cx, cy, 25, 3, 29, 14, '#475569');
    // Dual isometric vinyl turntables on top deck
    fillIsoDiamond(s, cx - 10, cy - 23, 8, 4, '#09090b', '#38bdf8', '#334155');
    px(s, cx - 11, cy - 24, 2, 2, '#38bdf8');
    fillIsoDiamond(s, cx + 10, cy - 23, 8, 4, '#09090b', '#ec4899', '#334155');
    px(s, cx + 9, cy - 24, 2, 2, '#ec4899');
    // Center mixer crossfader
    fillIsoDiamond(s, cx, cy - 25, 5, 3, '#cbd5e1', '#ffffff', '#64748b');
    // Animated LED equalizer bars on front panel
    const eqColors = ['#22c55e', '#facc15', '#ec4899', '#38bdf8'];
    for (let i = 0; i < 4; i++) {
      px(s, cx - 14 + i * 7, cy - 14, 4, 7, eqColors[(i + frame) % eqColors.length]);
    }
  } else if (furniId === 'pet_bowl') {
    drawSelOutIsoBox(s, cx, cy, 8, 7, 15, 7, '#dc2626');
    fillIsoDiamond(s, cx, cy - 8, 10, 5, '#92400e', '#facc15', '#451a03');
    px(s, cx - 3, cy - 9, 4, 2, '#facc15');
    px(s, cx + 1, cy - 8, 3, 2, '#fde047');
  } else if (furniId === 'pet_cushion') {
    drawSelOutIsoBox(s, cx, cy, 5, 4, 22, 11, '#0284c7');
    fillIsoDiamond(s, cx, cy - 5, 16, 8, '#38bdf8', '#e0f2fe', '#0369a1', '#0ea5e9');
  } else if (furniId === 'velvet_rope') {
    drawSelOutIsoBox(s, cx, cy, 5, 4, 8, 4, '#eab308', -14, 5);
    drawSelOutIsoBox(s, cx, cy, 5, 4, 8, 4, '#eab308', 14, -5);
    drawSelOutRect(s, cx - 16, cy - 30, 4, 28, '#facc15', '#fef9c3', '#854d0e');
    drawSelOutRect(s, cx + 12, cy - 38, 4, 28, '#facc15', '#fef9c3', '#854d0e');
    // Pixel-stepped crimson velvet rope curve
    for (let dx = -12; dx <= 12; dx++) {
      const sag = Math.round(6 * (1 - (dx / 12) * (dx / 12)));
      const ry = cy - 28 - Math.round(dx * 0.35) + sag;
      px(s, cx + dx, ry, 2, 4, '#991b1b');
      px(s, cx + dx, ry, 2, 1, '#ef4444');
    }
  } else if (furniId === 'frank_bust') {
    drawSelOutIsoBox(s, cx, cy, 20, 18, 14, 7, '#e2e8f0');
    drawSelOutIsoBox(s, cx, cy, 36, 16, 12, 6, '#cbd5e1');
    drawSelOutRect(s, cx - 7, cy - 52, 14, 15, '#f1f5f9', '#ffffff', '#64748b');
    drawSelOutRect(s, cx - 6, cy - 58, 12, 6, '#991b1b', '#ef4444', '#450a0a');
    px(s, cx - 4, cy - 42, 8, 2, '#334155');
  } else if (furniId === 'sticky_note') {
    const palette =
      state === 1
        ? { fill: '#f9a8d4', hi: '#fce7f3', sh: '#db2777' }
        : state === 2
        ? { fill: '#93c5fd', hi: '#dbeafe', sh: '#2563eb' }
        : state === 3
        ? { fill: '#86efac', hi: '#dcfce7', sh: '#16a34a' }
        : { fill: '#fef08a', hi: '#fef9c3', sh: '#ca8a04' };
    drawSelOutRect(s, cx - 11, cy - 36, 22, 22, palette.fill, palette.hi, palette.sh);
    px(s, cx - 10, cy - 35, 20, 3, palette.sh);
    px(s, cx - 8, cy - 29, 14, 1, '#334155');
    px(s, cx - 8, cy - 25, 11, 1, '#334155');
    px(s, cx - 8, cy - 21, 13, 1, '#475569');
  } else if (!drawExtendedFurniSprite(s, furniId, dir, state, frame, cx, cy, drawIsoBox)) {
    drawSelOutIsoBox(s, cx, cy, 16, 14, 20, 10, '#cbd5e1');
  }

  // Apply 4-direction rotation (dir === 1 || dir === 2 mirrors horizontally around cx = 36)
  const oriented = makeOffscreen(W, H);
  if (dir === 1 || dir === 2) {
    oriented.ctx.translate(W, 0);
    oriented.ctx.scale(-1, 1);
  }
  oriented.ctx.drawImage(scratch, 0, 0);

  // Grounded contact shadow ellipse under 3D floor furniture
  if (!isFlatFloorRugOrTile && !isWallItem) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Final 1px solid #141414 outer silhouette pass
  applyPixelOutline(oriented.canvas, ctx, W, H, [0x14, 0x14, 0x14]);

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Generates & caches crisp, centered 2x zoomed base64 PNG preview URLs for Catalogue, Inventory, Trading, and Housekeeping
 * so thumbnails match the placed room pixel-art sprites 100%.
 */
export function getItemPreviewImage(itemType: string, state = '1'): string {
  const resolved = resolveFurniSpriteId(itemType);
  const isDragon = isDragonLampId(resolved);
  const effectiveState = isDragon ? '1' : state;
  const key = `preview2008v3|${resolved}|${effectiveState}`;
  const cached = previewDataUrlCache.get(key);
  if (cached) return cached;

  let sourceCanvas: HTMLCanvasElement;
  if (itemType === 'pet_dog') {
    sourceCanvas = getPetSprite('golden_terrier', 0, 'stand', 0);
  } else if (itemType === 'pet_cat') {
    sourceCanvas = getPetSprite('tabby_kitten', 0, 'stand', 0);
  } else if (itemType === 'pet_dragon') {
    sourceCanvas = getPetSprite('baby_dragon', 0, 'stand', 0);
  } else {
    const numState = isDragon ? 1 : Number(effectiveState);
    sourceCanvas = getFurniSprite(resolved, 0, Number.isFinite(numState) ? numState : 1, 0);
  }

  // Find non-transparent bounding box and render a centered crisp pixel-art preview
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })!;
  const imgData = sCtx.getImageData(0, 0, sw, sh).data;
  let minX = sw;
  let minY = sh;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (imgData[(y * sw + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    const fallbackUrl = sourceCanvas.toDataURL('image/png');
    previewDataUrlCache.set(key, fallbackUrl);
    return fallbackUrl;
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const outW = 128;
  const outH = 128;
  const { canvas: previewCanvas, ctx: pCtx } = makeOffscreen(outW, outH);
  pCtx.imageSmoothingEnabled = false;
  const scale = bw <= 56 && bh <= 56 ? 2 : Math.min(2, (outW - 8) / Math.max(bw, bh));
  const dw = Math.round(bw * scale);
  const dh = Math.round(bh * scale);
  const dx = Math.round((outW - dw) / 2);
  const dy = Math.round((outH - dh) / 2);
  pCtx.drawImage(sourceCanvas, minX, minY, bw, bh, dx, dy, dw, dh);

  const url = previewCanvas.toDataURL('image/png');
  previewDataUrlCache.set(key, url);
  return url;
}

/**
 * Draws a single isometric floor slab with 3D beveled side thickness, multi-level water/stairs/booth,
 * and rich Habbo pixel textures.
 */
export function drawIsoFloorTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  gx: number,
  gy: number,
  theme: RoomFloorTheme,
  isHovered: boolean,
  tileChar = '0',
  animTick = 0
) {
  const hw = 32;
  const hh = 16;
  const slabH =
    tileChar === '3' || tileChar === 'd'
      ? 38
      : tileChar === '2'
      ? 26
      : tileChar === 's'
      ? 20
      : tileChar === '1' || tileChar === 'b' || tileChar === 'c'
      ? 16
      : tileChar === 'l'
      ? 14
      : tileChar === 'w'
      ? 10
      : 10;

  const isEven = (gx + gy) % 2 === 0;
  let topColor = '#d6c7a9';
  let leftEdge = '#9b8d72';
  let rightEdge = '#b4a588';
  let border = 'rgba(0,0,0,0.18)';

  if (tileChar === 'w') {
    // Animated Sunken Pool / Pond Water Tile
    const wave = (animTick + gx + gy) % 3;
    topColor = wave === 0 ? '#0288d1' : wave === 1 ? '#29b6f6' : '#039be5';
    leftEdge = '#01579b';
    rightEdge = '#0277bd';
    border = 'rgba(224, 242, 254, 0.35)';
  } else if (tileChar === 'l') {
    // Pool ladder transition step
    topColor = '#0ea5e9';
    leftEdge = '#0369a1';
    rightEdge = '#0284c7';
    border = 'rgba(224, 242, 254, 0.45)';
  } else if (tileChar === '3') {
    // Rooftop Pool rocky cliff top
    topColor = isEven ? '#78909c' : '#607d8b';
    leftEdge = '#37474f';
    rightEdge = '#455a64';
    border = '#263238';
  } else if (tileChar === 'b') {
    // Changing Booth bright checkerboard pad
    topColor = isEven ? '#facc15' : '#2563eb';
    leftEdge = '#1e3a8a';
    rightEdge = '#1d4ed8';
  } else if (tileChar === 'd') {
    // Diving board stone tower top matching Lido upper terrace
    topColor = '#d7ccc8';
    leftEdge = '#8b7355';
    rightEdge = '#a68f68';
  } else if (tileChar === 'c') {
    // Peaceful Park Cobblestone path
    topColor = isEven ? '#cbd5e1' : '#b8c4d4';
    leftEdge = '#64748b';
    rightEdge = '#94a3b8';
    border = 'rgba(51, 65, 85, 0.35)';
  } else if (theme === 'wood_deck') {
    // Warm sunlit teak rooftop wood planks
    topColor = tileChar === '2' ? '#b87638' : isEven ? '#c88b4b' : '#bc7e40';
    leftEdge = '#6b3e16';
    rightEdge = '#875121';
    border = 'rgba(72, 34, 8, 0.25)';
  } else if (theme === 'lido_deck') {
    topColor = tileChar === 's' ? '#e2c08d' : tileChar === '2' ? '#d7ccc8' : isEven ? '#f5ebd6' : '#e6d8be';
    leftEdge = '#8b7355';
    rightEdge = '#a68f68';
  } else if (theme === 'park_grass') {
    topColor = tileChar === 's' ? '#cbb896' : isEven ? '#4da342' : '#419238';
    leftEdge = '#275920';
    rightEdge = '#34732b';
    border = 'rgba(20, 50, 15, 0.22)';
  } else if (theme === 'disco') {
    const discoStep = (animTick + gx + gy) % 4;
    topColor =
      discoStep === 0
        ? '#312e81'
        : discoStep === 1
        ? '#4c1d95'
        : discoStep === 2
        ? '#701a75'
        : '#1e1b4b';
    leftEdge = '#0f172a';
    rightEdge = '#1e1b4b';
    border = 'rgba(244, 114, 182, 0.32)';
  } else if (theme === 'marble') {
    topColor =
      tileChar === 's'
        ? '#e5dec9'
        : tileChar === '2'
        ? isEven
          ? '#f8f5ec'
          : '#e7dfcd'
        : isEven
        ? '#f1efe8'
        : '#dbd7cc';
    leftEdge = '#8f8b80';
    rightEdge = '#aca79a';
  } else if (theme === 'parquet') {
    topColor = isEven ? '#c89254' : '#b47c3e';
    leftEdge = '#6b421c';
    rightEdge = '#885626';
  } else if (theme === 'rooftop') {
    topColor = tileChar === '2' ? '#7a889e' : tileChar === '1' ? '#68768c' : isEven ? '#525e70' : '#455061';
    leftEdge = '#242b36';
    rightEdge = '#343e4d';
    border = 'rgba(255,255,255,0.10)';
  } else if (theme === 'tatami') {
    topColor = isEven ? '#a3b87c' : '#90a668';
    leftEdge = '#55663a';
    rightEdge = '#6c804b';
  } else if (theme === 'banzai') {
    topColor = isEven ? '#1c243b' : '#151c2f';
    leftEdge = '#090d16';
    rightEdge = '#101726';
    border = 'rgba(56, 189, 248, 0.25)';
  }

  // Top diamond (zero heavy dark grid outline; uses subtle 1px inner bevels below)
  drawIsoPoly(
    ctx,
    [
      [sx, sy],
      [sx + hw, sy + hh],
      [sx, sy + hh * 2],
      [sx - hw, sy + hh],
    ],
    topColor
  );

  // Subtle 1px inner bevel highlight (+12% brightness on top-left edges)
  ctx.strokeStyle =
    tileChar === 'w'
      ? 'rgba(224,242,254,0.68)'
      : shadeHex(topColor, 16);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx - hw + 1, sy + hh);
  ctx.lineTo(sx, sy + 1);
  ctx.lineTo(sx + hw - 1, sy + hh);
  ctx.stroke();

  // Subtle 1px inner bevel shadow (-12% brightness on bottom-right edges)
  ctx.strokeStyle =
    tileChar === 'w'
      ? 'rgba(1,87,155,0.55)'
      : shadeHex(topColor, -16);
  ctx.beginPath();
  ctx.moveTo(sx - hw + 1, sy + hh);
  ctx.lineTo(sx, sy + hh * 2 - 1);
  ctx.lineTo(sx + hw - 1, sy + hh);
  ctx.stroke();

  // Left thickness edge
  drawIsoPoly(
    ctx,
    [
      [sx - hw, sy + hh],
      [sx, sy + hh * 2],
      [sx, sy + hh * 2 + slabH],
      [sx - hw, sy + hh + slabH],
    ],
    leftEdge,
    '#1b1922'
  );

  // Right thickness edge
  drawIsoPoly(
    ctx,
    [
      [sx, sy + hh * 2],
      [sx + hw, sy + hh],
      [sx + hw, sy + hh + slabH],
      [sx, sy + hh * 2 + slabH],
    ],
    rightEdge,
    '#1b1922'
  );

  // Surface textures by tileChar / theme
  if (tileChar === 'w') {
    // Submerged mosaic pool floor grid + shimmering white pixel ripples
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.2)';
    ctx.beginPath();
    ctx.moveTo(sx - 16, sy + hh - 8);
    ctx.lineTo(sx + 16, sy + hh + 8);
    ctx.moveTo(sx + 16, sy + hh - 8);
    ctx.lineTo(sx - 16, sy + hh + 8);
    ctx.stroke();
    const sh = ((animTick + gx) % 3) * 4;
    px(ctx, sx - 10 + sh, sy + hh - 3, 7, 2, 'rgba(255,255,255,0.62)');
    px(ctx, sx - 3, sy + hh + 4, 6, 1, 'rgba(186,230,253,0.72)');
  } else if (tileChar === 'l') {
    // Chrome pool ladder twin rails + 3 rungs connecting sunken water to deck
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 9, sy + hh - 10);
    ctx.lineTo(sx - 9, sy + hh + 9);
    ctx.moveTo(sx + 5, sy + hh - 4);
    ctx.lineTo(sx + 5, sy + hh + 13);
    ctx.stroke();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    for (const rOff of [-4, 2, 7]) {
      px(ctx, sx - 9, sy + hh + rOff, 14, 2, '#f8fafc');
    }
  } else if (tileChar === '3') {
    // Rocky cliff striations & mossy green tufts
    px(ctx, sx - 12, sy + hh - 2, 10, 3, '#546e7a');
    px(ctx, sx + 2, sy + hh + 2, 8, 2, '#90a4ae');
    px(ctx, sx - 6, sy + hh - 7, 6, 3, '#4ade80');
    px(ctx, sx + 6, sy + hh - 3, 5, 2, '#22c55e');
    // Rock cliff face cracks
    px(ctx, sx - 18, sy + hh + 14, 10, 2, '#263238');
    px(ctx, sx + 8, sy + hh + 18, 10, 2, '#263238');
  } else if (tileChar === 'c') {
    // Cobblestone bricks
    px(ctx, sx - 10, sy + hh - 3, 6, 3, '#94a3b8');
    px(ctx, sx + 1, sy + hh - 1, 7, 3, '#e2e8f0');
    px(ctx, sx - 4, sy + hh + 4, 6, 3, '#94a3b8');
  } else if (tileChar === 's') {
    // Crisp 3D isometric staircase steps between split-level floor heights
    const treadHi = shadeHex(topColor, 18);
    const riserLo = shadeHex(leftEdge, -14);
    for (let st = 0; st < 3; st++) {
      const yOff = -4 + st * 5;
      // Vertical step riser
      ctx.strokeStyle = riserLo;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 18 + st * 2, sy + hh + yOff - 5);
      ctx.lineTo(sx + 18 - st * 2, sy + hh + yOff + 11);
      ctx.stroke();
      // Sunlit step nose highlight
      ctx.strokeStyle = treadHi;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 18 + st * 2, sy + hh + yOff - 6);
      ctx.lineTo(sx + 18 - st * 2, sy + hh + yOff + 10);
      ctx.stroke();
    }
  } else if (theme === 'wood_deck') {
    // Wooden deck planks along isometric lines
    ctx.strokeStyle = 'rgba(72, 34, 8, 0.26)';
    ctx.beginPath();
    ctx.moveTo(sx - 20, sy + hh - 5);
    ctx.lineTo(sx + 12, sy + hh + 11);
    ctx.moveTo(sx - 10, sy + hh - 10);
    ctx.lineTo(sx + 20, sy + hh + 5);
    ctx.stroke();
    px(ctx, sx - 6, sy + hh + 1, 4, 1, 'rgba(255, 224, 178, 0.4)');
  } else if (theme === 'parquet') {
    ctx.strokeStyle = 'rgba(72, 34, 8, 0.18)';
    ctx.beginPath();
    ctx.moveTo(sx - 16, sy + hh - 3);
    ctx.lineTo(sx + 10, sy + hh + 9);
    ctx.moveTo(sx - 6, sy + hh - 8);
    ctx.lineTo(sx + 18, sy + hh + 3);
    ctx.stroke();
    px(ctx, sx - 8, sy + hh + 1, 3, 1, 'rgba(255, 224, 178, 0.35)');
  } else if (theme === 'marble') {
    ctx.strokeStyle = isEven ? 'rgba(148, 140, 124, 0.18)' : 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.moveTo(sx - 12, sy + hh + 2);
    ctx.lineTo(sx - 2, sy + hh - 3);
    ctx.lineTo(sx + 10, sy + hh + 3);
    ctx.stroke();
    px(ctx, sx - 1, sy + hh - 8, 2, 1, 'rgba(255,255,255,0.65)');
  } else if (theme === 'lido_deck') {
    px(ctx, sx - 9, sy + hh - 2, 4, 1, 'rgba(166, 143, 104, 0.35)');
    px(ctx, sx + 4, sy + hh + 3, 4, 1, 'rgba(255, 255, 255, 0.45)');
  } else if (theme === 'park_grass') {
    px(ctx, sx - 8, sy + hh - 2, 2, 2, '#65a30d');
    px(ctx, sx + 6, sy + hh + 2, 2, 2, '#84cc16');
  } else if (theme === 'rooftop') {
    px(ctx, sx - 10, sy + hh - 2, 2, 1, 'rgba(255,255,255,0.14)');
    px(ctx, sx + 6, sy + hh + 3, 2, 1, 'rgba(15,23,42,0.35)');
  } else if (theme === 'tatami') {
    for (let i = -10; i <= 10; i += 5) {
      px(ctx, sx + i, sy + hh - 3 + Math.abs(i) / 3, 3, 1, 'rgba(70, 88, 42, 0.28)');
    }
  }

  // Authentic 2008 Habbo crisp white isometric diamond tile cursor (2px white pixel border)
  if (isHovered) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx, sy + 2);
    ctx.lineTo(sx + hw - 3, sy + hh);
    ctx.lineTo(sx, sy + hh * 2 - 2);
    ctx.lineTo(sx - hw + 3, sy + hh);
    ctx.closePath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Draws the interactive Lido Changing Booth ('b') or Diving Board ('d') 3D architectural pixel prop.
 */
export function drawLidoTileProp(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileChar: string,
  animTick: number
) {
  const cx = sx;
  const cy = sy + 16;

  if (tileChar === 'b') {
    // Classic Habbo Lido Changing Booth with striped blue/yellow awning & curtain
    outlinedRect(ctx, cx - 15, cy - 58, 30, 56, '#fef3c7', '#ffffff', '#b45309');
    // Striped canvas awning top
    for (let i = -15; i < 15; i += 6) {
      px(ctx, cx + i, cy - 64, 6, 8, (i / 6) % 2 === 0 ? '#2563eb' : '#facc15');
    }
    ctx.strokeStyle = OUTLINE;
    ctx.strokeRect(cx - 15, cy - 64, 30, 8);
    // Blue shower curtain doorway
    outlinedRect(ctx, cx - 9, cy - 48, 18, 44, '#0284c7', '#38bdf8', '#1e3a8a');
    px(ctx, cx - 7, cy - 46, 3, 38, '#7dd3fc');
    px(ctx, cx - 1, cy - 46, 3, 38, '#0369a1');
    // "SWIM" hanger icon badge
    px(ctx, cx - 5, cy - 55, 10, 4, '#facc15');
  } else if (tileChar === 'd') {
    // Lido High Diving Board Platform jutting out over the pool!
    outlinedRect(ctx, cx - 8, cy - 16, 4, 20, '#94a3b8', '#f8fafc');
    outlinedRect(ctx, cx + 4, cy - 16, 4, 20, '#94a3b8', '#f8fafc');
    // Steel safety rails
    outlinedRect(ctx, cx - 12, cy - 28, 3, 18, '#cbd5e1');
    outlinedRect(ctx, cx - 12, cy - 28, 16, 3, '#e2e8f0');
    // Springboard plank angled out to the right (+x, +y)
    drawIsoPoly(
      ctx,
      [
        [cx - 10, cy - 12],
        [cx + 28, cy + 4],
        [cx + 22, cy + 10],
        [cx - 16, cy - 6],
      ],
      '#38bdf8',
      OUTLINE
    );
    drawIsoPoly(
      ctx,
      [
        [cx + 10, cy - 4],
        [cx + 28, cy + 4],
        [cx + 22, cy + 10],
        [cx + 4, cy + 2],
      ],
      animTick % 2 === 0 ? '#fef08a' : '#facc15',
      OUTLINE
    );
  }
}

/**
 * Draws Battle Banzai tile progression: 0 idle pad, 1 glowing, 2 bright, 3 locked with team color.
 */
export function drawBanzaiTileOverlay(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileState: BanzaiTileState,
  animTick: number
) {
  const hw = 28;
  const hh = 14;
  const cy = sy + 16;

  const teamPalette = {
    blue: { glow: 'rgba(59, 130, 246, 0.45)', bright: '#3b82f6', locked: '#1d4ed8', rim: '#93c5fd' },
    red: { glow: 'rgba(239, 68, 68, 0.45)', bright: '#ef4444', locked: '#b91c1c', rim: '#fca5a5' },
    yellow: { glow: 'rgba(250, 204, 21, 0.48)', bright: '#eab308', locked: '#ca8a04', rim: '#fef08a' },
  };

  if (tileState.level === 0 || !tileState.team) {
    // Idle neon Banzai pad outline
    drawIsoPoly(
      ctx,
      [
        [sx, cy - hh + 2],
        [sx + hw - 4, cy],
        [sx, cy + hh - 2],
        [sx - hw + 4, cy],
      ],
      'rgba(30, 41, 59, 0.72)',
      animTick % 4 < 2 ? '#22d3ee' : '#0284c7'
    );
    px(ctx, sx - 2, cy - 1, 4, 2, 'rgba(34, 211, 238, 0.55)');
    return;
  }

  const pal = teamPalette[tileState.team];

  if (tileState.level === 1) {
    // 1 step = glowing rim & soft inner core
    drawIsoPoly(
      ctx,
      [
        [sx, cy - hh + 2],
        [sx + hw - 4, cy],
        [sx, cy + hh - 2],
        [sx - hw + 4, cy],
      ],
      pal.glow,
      pal.rim
    );
    px(ctx, sx - 4, cy - 2, 8, 4, pal.rim);
  } else if (tileState.level === 2) {
    // 2 steps = bright double ring
    drawIsoPoly(
      ctx,
      [
        [sx, cy - hh + 1],
        [sx + hw - 2, cy],
        [sx, cy + hh - 1],
        [sx - hw + 2, cy],
      ],
      pal.bright,
      '#ffffff'
    );
    drawIsoPoly(
      ctx,
      [
        [sx, cy - 6],
        [sx + 12, cy],
        [sx, cy + 6],
        [sx - 12, cy],
      ],
      pal.rim
    );
  } else {
    // 3 steps = LOCKED tile in team color with crisp lock star
    drawIsoPoly(
      ctx,
      [
        [sx, cy - hh],
        [sx + hw, cy],
        [sx, cy + hh],
        [sx - hw, cy],
      ],
      pal.locked,
      '#141414'
    );
    drawIsoPoly(
      ctx,
      [
        [sx, cy - hh + 3],
        [sx + hw - 5, cy],
        [sx, cy + hh - 3],
        [sx - hw + 5, cy],
      ],
      pal.bright,
      pal.rim
    );
    // Tiny pixel padlock icon in center
    px(ctx, sx - 3, cy - 4, 6, 3, '#ffffff');
    px(ctx, sx - 2, cy - 3, 4, 2, pal.locked);
    px(ctx, sx - 4, cy - 1, 8, 5, '#141414');
    px(ctx, sx - 3, cy, 6, 3, '#fef08a');
  }
}

function getHeightForChar(ch: string): number {
  switch (ch) {
    case 'w':
      return 0.125;
    case 'l':
      return 0.55;
    case '0':
      return 0;
    case '1':
    case 'b':
    case 'c':
      return 1;
    case 's':
      return 1.5;
    case '2':
      return 2;
    case '3':
    case 'd':
      return 3;
    default:
      return 0;
  }
}

function getLayoutChar(layout: string[], x: number, y: number): string {
  if (y < 0 || y >= layout.length) return 'x';
  const row = layout[y];
  if (!row || x < 0 || x >= row.length) return 'x';
  return row[x];
}

/**
 * Draws either:
 * - Outdoor ornate rooftop parapets / railings (+ classic orange Habbo Hotel facade on Rooftop Pool), OR
 * - Perimeter-following indoor 3D Habbo walls with arched windows & pixel art.
 */
export function drawRoomWallsOrParapets(
  ctx: CanvasRenderingContext2D,
  room: RoomDef,
  originX: number,
  originY: number,
  animTick: number
) {
  const hw = 32;
  const hh = 16;
  const layout = room.layout;
  const theme = room.wallTheme;

  if (room.outdoor) {
    const railH = 16;
    let railLeft = '#b0bec5';
    let railRight = '#cfd8dc';
    let railCap = '#eceff1';
    let balusterCol = '#607d8b';

    if (theme === 'rooftop_hotel') {
      railLeft = '#8d6e63';
      railRight = '#a1887f';
      railCap = '#d7ccc8';
      balusterCol = '#4e342e';
    } else if (theme === 'neon') {
      railLeft = '#1e1b4b';
      railRight = '#312e81';
      railCap = animTick % 2 === 0 ? '#22d3ee' : '#ec4899';
      balusterCol = '#0f172a';
    } else if (theme === 'nightsky') {
      railLeft = '#334155';
      railRight = '#475569';
      railCap = '#94a3b8';
      balusterCol = '#1e293b';
    } else if (theme === 'park_hedge') {
      railLeft = '#15803d';
      railRight = '#16a34a';
      railCap = '#4ade80';
      balusterCol = '#14532d';
    }

    for (let y = 0; y < layout.length; y++) {
      for (let x = 0; x < layout[y].length; x++) {
        const ch = layout[y][x];
        if (ch === 'x' || ch === '3') continue;
        const z = getHeightForChar(ch);
        const sx = originX + (x - y) * hw;
        const sy = originY + (x + y) * hh - z * 16;

        const leftVoid = getLayoutChar(layout, x - 1, y) === 'x';
        const topVoid = getLayoutChar(layout, x, y - 1) === 'x';

        // Classic Orange Habbo Hotel Facade along upper-left wing of Rooftop Pool (x=1, y=1..7)
        if (room.rooftopHotelFacade && leftVoid && x === 1 && y >= 1 && y <= 7) {
          const facadeH = 112;
          drawIsoPoly(
            ctx,
            [
              [sx - hw, sy + hh],
              [sx, sy],
              [sx, sy - facadeH],
              [sx - hw, sy + hh - facadeH],
            ],
            '#f57c00',
            '#b45309'
          );
          // Orange roof coping cap
          drawIsoPoly(
            ctx,
            [
              [sx - hw, sy + hh - facadeH],
              [sx, sy - facadeH],
              [sx - 6, sy - facadeH - 3],
              [sx - hw - 6, sy + hh - facadeH - 3],
            ],
            '#ffb74d',
            '#1b1922'
          );
          // Horizontal facade ribbing
          for (let h = 24; h < facadeH - 12; h += 26) {
            ctx.strokeStyle = '#e65100';
            ctx.beginPath();
            ctx.moveTo(sx - hw + 1, sy + hh - h);
            ctx.lineTo(sx - 1, sy - h);
            ctx.stroke();
          }
          // Glowing hotel guest-room pixel windows!
          const winLit = (y + Math.floor(animTick / 8)) % 2 === 0;
          drawIsoPoly(
            ctx,
            [
              [sx - hw + 6, sy + hh - 34],
              [sx - 6, sy - 26],
              [sx - 6, sy - 62],
              [sx - hw + 6, sy + hh - 70],
            ],
            winLit ? '#fef08a' : '#38bdf8',
            '#7c2d12'
          );
          drawIsoPoly(
            ctx,
            [
              [sx - hw + 6, sy + hh - 74],
              [sx - 6, sy - 66],
              [sx - 6, sy - 96],
              [sx - hw + 6, sy + hh - 104],
            ],
            y % 2 === 0 ? '#7dd3fc' : '#fde047',
            '#7c2d12'
          );
          continue;
        }

        if (leftVoid) {
          // Left-back rooftop parapet railing with stone balusters
          drawIsoPoly(
            ctx,
            [
              [sx - hw, sy + hh],
              [sx, sy],
              [sx, sy - railH],
              [sx - hw, sy + hh - railH],
            ],
            railLeft,
            '#1b1922'
          );
          drawIsoPoly(
            ctx,
            [
              [sx - hw, sy + hh - railH],
              [sx, sy - railH],
              [sx - 4, sy - railH - 2],
              [sx - hw - 4, sy + hh - railH - 2],
            ],
            railCap,
            '#1b1922'
          );
          // Baluster cutouts / pillars
          for (const t of [0.25, 0.65]) {
            const bx = sx - hw * (1 - t);
            const by = sy + hh * (1 - t);
            px(ctx, bx - 2, by - railH + 4, 4, railH - 6, balusterCol);
          }
        }

        if (topVoid) {
          // Right-back rooftop parapet railing with stone balusters
          drawIsoPoly(
            ctx,
            [
              [sx, sy],
              [sx + hw, sy + hh],
              [sx + hw, sy + hh - railH],
              [sx, sy - railH],
            ],
            railRight,
            '#1b1922'
          );
          drawIsoPoly(
            ctx,
            [
              [sx, sy - railH],
              [sx + hw, sy + hh - railH],
              [sx + hw + 4, sy + hh - railH - 2],
              [sx + 4, sy - railH - 2],
            ],
            railCap,
            '#1b1922'
          );
          for (const t of [0.25, 0.65]) {
            const bx = sx + hw * t;
            const by = sy + hh * t;
            px(ctx, bx - 2, by - railH + 4, 4, railH - 6, balusterCol);
          }
        }
      }
    }
    return;
  }

  // Indoor perimeter-following 3D Habbo walls
  const wallH = 104;
  let leftWall = '#b9c9d6';
  let rightWall = '#d7e3ec';
  let capColor = '#eef4f8';
  let trimColor = '#64748b';
  let stripeColor = 'rgba(255,255,255,0.16)';

  if (theme === 'navy') {
    leftWall = '#2b4768';
    rightWall = '#395b82';
    capColor = '#5b82ad';
    trimColor = '#1e293b';
    stripeColor = 'rgba(255,255,255,0.08)';
  } else if (theme === 'brick') {
    leftWall = '#8c4438';
    rightWall = '#a85648';
    capColor = '#c47163';
    trimColor = '#4a231c';
    stripeColor = 'rgba(40,12,8,0.22)';
  } else if (theme === 'nightsky') {
    leftWall = '#232b42';
    rightWall = '#2f3a57';
    capColor = '#47557a';
    trimColor = '#0f172a';
    stripeColor = 'rgba(148,163,184,0.12)';
  } else if (theme === 'neon') {
    leftWall = '#1b1636';
    rightWall = '#271f4d';
    capColor = '#4c1d95';
    trimColor = '#0f172a';
    stripeColor = 'rgba(34, 211, 238, 0.22)';
  } else if (theme === 'cream') {
    leftWall = '#c8beae';
    rightWall = '#e3dacb';
    capColor = '#f5efe6';
    trimColor = '#78350f';
    stripeColor = 'rgba(120, 53, 15, 0.08)';
  }

  // Determine the entrance doorway wall tile on the upper-left wall (y === room.spawn.y)
  const spawnY = room.spawn?.y ?? 2;

  for (let y = 0; y < layout.length; y++) {
    for (let x = 0; x < layout[y].length; x++) {
      const ch = layout[y][x];
      if (ch === 'x') continue;
      const z = getHeightForChar(ch);
      const sx = originX + (x - y) * hw;
      const sy = originY + (x + y) * hh - z * 16;

      const leftVoid = getLayoutChar(layout, x - 1, y) === 'x';
      const topVoid = getLayoutChar(layout, x, y - 1) === 'x';

      if (leftVoid) {
        const isDoorwayTile = y === spawnY;

        // Main left wall panel
        drawIsoPoly(
          ctx,
          [
            [sx - hw, sy + hh],
            [sx, sy],
            [sx, sy - wallH],
            [sx - hw, sy + hh - wallH],
          ],
          leftWall,
          'rgba(0,0,0,0.14)'
        );

        // 7px thick 3D isometric top rim/cap (sunlit top bevel + shaded inner edge)
        drawIsoPoly(
          ctx,
          [
            [sx - hw, sy + hh - wallH],
            [sx, sy - wallH],
            [sx - 7, sy - wallH - 4],
            [sx - hw - 7, sy + hh - wallH - 4],
          ],
          capColor,
          '#141414'
        );
        // Left outer thickness drop of the 7px wall cap
        drawIsoPoly(
          ctx,
          [
            [sx - hw - 7, sy + hh - wallH - 4],
            [sx - hw, sy + hh - wallH],
            [sx - hw, sy + hh],
            [sx - hw - 7, sy + hh - 4],
          ],
          shadeHex(leftWall, -22),
          '#141414'
        );

        ctx.strokeStyle = stripeColor;
        ctx.beginPath();
        ctx.moveTo(sx - hw / 2, sy + hh / 2 - 12);
        ctx.lineTo(sx - hw / 2, sy + hh / 2 - wallH + 6);
        ctx.stroke();

        // 3px dark baseboard trim where wall meets the floor
        drawIsoPoly(
          ctx,
          [
            [sx - hw, sy + hh],
            [sx, sy],
            [sx, sy - 4],
            [sx - hw, sy + hh - 4],
          ],
          trimColor
        );

        if (isDoorwayTile) {
          // Authentic 2008 Habbo 3D Recessed Isometric Entrance Doorway
          const doorH = 68;
          // Beveled wooden/steel outer doorframe
          drawIsoPoly(
            ctx,
            [
              [sx - hw + 4, sy + hh - 2],
              [sx - 4, sy - 2],
              [sx - 4, sy - doorH - 4],
              [sx - hw + 4, sy + hh - doorH - 4],
            ],
            '#5c4033',
            '#141414'
          );
          // Dark shaded 3D doorway recess (#1a1a1a)
          drawIsoPoly(
            ctx,
            [
              [sx - hw + 7, sy + hh - 3],
              [sx - 7, sy - 3],
              [sx - 7, sy - doorH],
              [sx - hw + 7, sy + hh - doorH],
            ],
            '#141414',
            '#000000'
          );
          // 3D recessed inner jamb thickness on the right side of the doorway
          drawIsoPoly(
            ctx,
            [
              [sx - 12, sy - 1],
              [sx - 7, sy - 3],
              [sx - 7, sy - doorH],
              [sx - 12, sy - doorH + 2],
            ],
            shadeHex(leftWall, -36),
            '#000000'
          );
          // Inner recessed door panel slightly ajar with brass handle
          drawIsoPoly(
            ctx,
            [
              [sx - hw + 9, sy + hh - 4],
              [sx - 13, sy - 2],
              [sx - 13, sy - doorH + 3],
              [sx - hw + 9, sy + hh - doorH + 1],
            ],
            '#292524'
          );
          // Golden/brass door handle pixel glint
          px(ctx, sx - 16, sy - 32, 3, 2, '#facc15');
          px(ctx, sx - 16, sy - 33, 2, 1, '#fef9c3');
        } else if (y === 3 || y === 6) {
          // Arched / Skyline Windows on non-door left wall segments
          const skyColor = theme === 'nightsky' ? '#0f172a' : '#7dd3fc';
          drawIsoPoly(
            ctx,
            [
              [sx - hw + 5, sy + hh - 30],
              [sx - 5, sy - 22],
              [sx - 5, sy - 76],
              [sx - hw + 5, sy + hh - 84],
            ],
            '#475569',
            '#1b1922'
          );
          drawIsoPoly(
            ctx,
            [
              [sx - hw + 7, sy + hh - 33],
              [sx - 7, sy - 25],
              [sx - 7, sy - 73],
              [sx - hw + 7, sy + hh - 81],
            ],
            skyColor,
            '#334155'
          );
          px(ctx, sx - 21, sy - 56, 7, 3, '#ffffff');
        }
      }

      if (topVoid) {
        drawIsoPoly(
          ctx,
          [
            [sx, sy],
            [sx + hw, sy + hh],
            [sx + hw, sy + hh - wallH],
            [sx, sy - wallH],
          ],
          rightWall,
          'rgba(0,0,0,0.14)'
        );
        // 7px thick 3D isometric top rim/cap
        drawIsoPoly(
          ctx,
          [
            [sx, sy - wallH],
            [sx + hw, sy + hh - wallH],
            [sx + hw + 7, sy + hh - wallH - 4],
            [sx + 7, sy - wallH - 4],
          ],
          capColor,
          '#141414'
        );
        ctx.strokeStyle = stripeColor;
        ctx.beginPath();
        ctx.moveTo(sx + hw / 2, sy + hh / 2 - 12);
        ctx.lineTo(sx + hw / 2, sy + hh / 2 - wallH + 6);
        ctx.stroke();

        // 3px dark baseboard trim where wall meets the floor
        drawIsoPoly(
          ctx,
          [
            [sx, sy],
            [sx + hw, sy + hh],
            [sx + hw, sy + hh - 4],
            [sx, sy - 4],
          ],
          trimColor
        );

        // Arched Welcome Lounge windows or framed Habbo art
        if (x === 3 || x === 6) {
          if (theme === 'cream') {
            drawIsoPoly(
              ctx,
              [
                [sx + 6, sy - 24],
                [sx + hw - 6, sy + hh - 32],
                [sx + hw - 6, sy + hh - 78],
                [sx + 6, sy - 70],
              ],
              '#7dd3fc',
              '#78350f'
            );
            px(ctx, sx + 12, sy - 56, 8, 3, '#ffffff');
          } else {
            drawIsoPoly(
              ctx,
              [
                [sx + 6, sy - 34],
                [sx + hw - 6, sy + hh - 42],
                [sx + hw - 6, sy + hh - 76],
                [sx + 6, sy - 68],
              ],
              '#f59e0b',
              '#451a03'
            );
            drawIsoPoly(
              ctx,
              [
                [sx + 9, sy - 39],
                [sx + hw - 9, sy + hh - 46],
                [sx + hw - 9, sy + hh - 71],
                [sx + 9, sy - 64],
              ],
              x === 3 ? '#1d4ed8' : '#991b1b'
            );
            px(ctx, sx + 14, sy - 50, 5, 5, '#fef08a');
          }
        }
      }
    }
  }
}

/**
 * Draws the crimson & gold patterned Habbo entrance doormat on the doorstep tile in front of the 3D doorway,
 * plus the floating golden-yellow downward destination arrow when walking.
 */
export function drawRoomDoorMat(
  ctx: CanvasRenderingContext2D,
  room: RoomDef,
  originX: number,
  originY: number
) {
  if (room.outdoor) return;
  const hw = 32;
  const hh = 16;
  const spawnY = room.spawn?.y ?? 2;
  const row = room.layout[spawnY];
  if (!row) return;
  let doorX = room.spawn?.x ?? 1;
  for (let x = 0; x < row.length; x++) {
    if (row[x] !== 'x') {
      doorX = x;
      break;
    }
  }
  const z = getHeightForChar(row[doorX] ?? '0');
  const sx = originX + (doorX - spawnY) * hw;
  const sy = originY + (doorX + spawnY) * hh - z * 16;

  // Crimson & gold trimmed isometric doormat on the doorstep tile
  drawIsoPoly(
    ctx,
    [
      [sx, sy + 4],
      [sx + 20, sy + 14],
      [sx, sy + 24],
      [sx - 20, sy + 14],
    ],
    '#991b1b',
    '#450a0a'
  );
  drawIsoPoly(
    ctx,
    [
      [sx, sy + 6],
      [sx + 15, sy + 14],
      [sx, sy + 22],
      [sx - 15, sy + 14],
    ],
    '#dc2626',
    '#facc15'
  );
}

export function drawDestinationArrow(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  animTick: number
) {
  const bob = (animTick % 4 < 2 ? 0 : -3);
  const ax = Math.round(sx);
  const ay = Math.round(sy + 6 + bob);
  // Crisp 1px #000000 outline + golden-yellow downward arrow
  px(ctx, ax - 3, ay - 10, 6, 6, '#000000');
  px(ctx, ax - 6, ay - 5, 12, 3, '#000000');
  px(ctx, ax - 4, ay - 2, 8, 2, '#000000');
  px(ctx, ax - 2, ay, 4, 2, '#000000');
  px(ctx, ax - 2, ay - 9, 4, 5, '#facc15');
  px(ctx, ax - 1, ay - 9, 2, 4, '#fef08a');
  px(ctx, ax - 5, ay - 4, 10, 2, '#facc15');
  px(ctx, ax - 3, ay - 2, 6, 2, '#eab308');
  px(ctx, ax - 1, ay, 2, 1, '#ca8a04');
}

export function drawRoomWalls(
  ctx: CanvasRenderingContext2D,
  layout: string[],
  originX: number,
  originY: number,
  theme: RoomWallTheme,
  animTick: number
) {
  drawRoomWallsOrParapets(
    ctx,
    {
      id: 'compat',
      name: 'Room',
      owner: 'Hotel',
      description: '',
      category: 'public',
      floorTheme: 'marble',
      wallTheme: theme,
      layout,
      spawn: { x: 2, y: 2 },
      baseOccupancy: 1,
      initialFurni: [],
    },
    originX,
    originY,
    animTick
  );
}

/**
 * Draws the animated turquoise waterfall tumbling from the rocky cliff into the Rooftop Pool,
 * plus floating orange & yellow swimming lane buoys.
 */
export function drawRooftopWaterfall(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  animTick: number
) {
  const shift = (animTick % 3) * 4;
  // Mossy rock lip overhang where the spring spills out
  outlinedRect(ctx, sx - 12, sy - 4, 20, 7, '#607d8b', '#90a4ae', '#263238');
  px(ctx, sx - 10, sy - 4, 6, 2, '#4ade80');
  // Cascading turquoise water sheet pouring down-left along cliff face into pool tile (9,2)
  drawIsoPoly(
    ctx,
    [
      [sx - 10, sy + 2],
      [sx + 8, sy + 6],
      [sx - 8, sy + 52],
      [sx - 24, sy + 44],
    ],
    '#0288d1',
    '#01579b'
  );
  // White rushing foam streaks
  px(ctx, sx - 12, sy + 10 + shift, 3, 18, '#e0f2fe');
  px(ctx, sx - 6, sy + 16 + ((shift + 4) % 10), 3, 18, '#bae6fd');
  px(ctx, sx - 1, sy + 12 + shift, 2, 16, '#ffffff');
  // Splash foam ring at bottom inside pool
  px(ctx, sx - 28, sy + 44 + (animTick % 2), 26, 6, '#e0f2fe');
  px(ctx, sx - 23, sy + 42 - (animTick % 2), 16, 3, '#ffffff');
}

export function drawPoolLaneBuoy(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  animTick: number,
  index = 0
) {
  const bob = (animTick + index) % 2 === 0 ? 0 : 1;
  const col = index % 2 === 0 ? '#f97316' : '#facc15';
  const hi = index % 2 === 0 ? '#fdba74' : '#fef08a';
  outlinedRect(ctx, sx - 5, sy + 9 + bob, 10, 6, col, hi, '#7c2d12');
  px(ctx, sx - 3, sy + 15 + bob, 6, 1, 'rgba(224,242,254,0.8)');
}

const TINY_PIXEL_FONT: Record<string, string[]> = {
  A: ['010', '101', '111', '101', '101'],
  D: ['110', '101', '101', '101', '110'],
  M: ['101', '111', '111', '101', '101'],
  H: ['101', '101', '111', '101', '101'],
  C: ['011', '100', '100', '100', '011'],
  V: ['101', '101', '101', '101', '010'],
  I: ['111', '010', '010', '010', '111'],
  P: ['110', '101', '110', '100', '100'],
  $: ['0111', '1100', '0110', '0011', '1110'],
};

function drawTinyText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  shadowColor?: string
) {
  let cx = x;
  for (const ch of text) {
    const glyph = TINY_PIXEL_FONT[ch];
    if (!glyph) {
      cx += 3;
      continue;
    }
    const gw = glyph[0].length;
    for (let ry = 0; ry < glyph.length; ry++) {
      for (let rx = 0; rx < gw; rx++) {
        if (glyph[ry][rx] === '1') {
          if (shadowColor) px(ctx, cx + rx, y + ry + 1, 1, 1, shadowColor);
          px(ctx, cx + rx, y + ry, 1, 1, color);
        }
      }
    }
    cx += gw + 1;
  }
}

function finalizeShapedBadge40(
  srcCanvas: HTMLCanvasElement,
  unlocked: boolean
): HTMLCanvasElement {
  const W = 40;
  const H = 40;
  const { canvas: out, ctx: outCtx } = makeOffscreen(W, H);
  const sCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
  const img = sCtx.getImageData(0, 0, W, H);
  const data = img.data;

  // Desaturate pixels cleanly when locked before drawing crisp #111111 outline
  if (!unlocked) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const toned = Math.max(52, Math.min(182, Math.round(lum * 0.72 + 24)));
      data[i] = Math.max(40, toned - 8);
      data[i + 1] = toned;
      data[i + 2] = Math.min(200, toned + 12);
    }
    sCtx.putImageData(img, 0, 0);
  }

  // 1px #111111 silhouette outline around any opaque pixel shape
  const copy = data;
  const outlineColor = unlocked ? '#111111' : '#1e293b';
  outCtx.fillStyle = outlineColor;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      if (copy[idx + 3] > 20) continue;
      const hasNeighbor =
        (x > 0 && copy[(y * W + (x - 1)) * 4 + 3] > 20) ||
        (x < W - 1 && copy[(y * W + (x + 1)) * 4 + 3] > 20) ||
        (y > 0 && copy[((y - 1) * W + x) * 4 + 3] > 20) ||
        (y < H - 1 && copy[((y + 1) * W + x) * 4 + 3] > 20);
      if (hasNeighbor) {
        outCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  outCtx.drawImage(srcCanvas, 0, 0);

  if (!unlocked) {
    // Crisp mini corner padlock
    px(outCtx, 27, 26, 11, 12, '#111111');
    px(outCtx, 29, 23, 7, 4, '#111111');
    px(outCtx, 30, 24, 5, 3, '#cbd5e1');
    px(outCtx, 31, 25, 3, 2, '#111111');
    px(outCtx, 28, 27, 9, 10, '#94a3b8');
    px(outCtx, 28, 27, 9, 2, '#e2e8f0');
    px(outCtx, 32, 30, 2, 4, '#1e293b');
  }

  return out;
}

/**
 * Renders an authentic 40x40 shaped Habbo pixel-art badge (with 1px #111111 outline,
 * multi-tone metallic shading, specular glints, and custom 16x16 minting support).
 */
export function getBadgeSprite(
  badgeId: string,
  unlocked = true,
  customBadges: CustomBadgeDef[] = []
): HTMLCanvasElement {
  const customMatch = customBadges.find((b) => b.id === badgeId);
  if (customMatch) {
    const hash = customMatch.pixels.map((p) => p ?? '_').join(',');
    const cKey = `cbadge40|${badgeId}|${unlocked ? '1' : '0'}|${hash}`;
    const cCached = spriteCache.get(cKey);
    if (cCached) return cCached;

    const { canvas: src, ctx: s } = makeOffscreen(40, 40);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const col = customMatch.pixels[y * 16 + x];
        if (!col) continue;
        px(s, 4 + x * 2, 4 + y * 2, 2, 2, col);
      }
    }
    const out = finalizeShapedBadge40(src, unlocked);
    spriteCache.set(cKey, out);
    return out;
  }

  const normalizedId = normalizeBadgeSpriteKey(badgeId);
  const key = `badge40v2|${normalizedId}|${unlocked ? '1' : '0'}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const { canvas: src, ctx: s } = makeOffscreen(40, 40);

  const GOLD_HI = '#fffbeb';
  const GOLD_1 = '#ffd400';
  const GOLD_2 = '#d97706';
  const GOLD_3 = '#78350f';

  const SLV_HI = '#ffffff';
  const SLV_1 = '#f8fafc';
  const SLV_2 = '#94a3b8';
  const SLV_3 = '#334155';

  if (normalizedId === 'badge_admin') {
    // Ornate Gold & Crimson Winged Staff Shield with tiny pixel crown + ADM ribbon
    // Left & right feathered gold wings
    for (let i = 0; i < 4; i++) {
      const wy = 11 + i * 3;
      px(s, 2 + i * 2, wy, 10 - i * 2, 3, GOLD_1);
      px(s, 2 + i * 2, wy, 8 - i * 2, 1, GOLD_HI);
      px(s, 2 + i * 2, wy + 2, 9 - i * 2, 1, GOLD_2);
      px(s, 28, wy, 10 - i * 2, 3, GOLD_1);
      px(s, 29, wy, 8 - i * 2, 1, GOLD_HI);
      px(s, 28, wy + 2, 9 - i * 2, 1, GOLD_2);
    }
    // Tiny pixel crown on top
    px(s, 14, 3, 2, 4, GOLD_1);
    px(s, 19, 2, 2, 5, GOLD_1);
    px(s, 24, 3, 2, 4, GOLD_1);
    px(s, 14, 6, 12, 3, GOLD_2);
    px(s, 15, 6, 10, 1, GOLD_HI);
    px(s, 19, 7, 2, 2, '#ef4444');
    // Shield outer gold frame
    px(s, 10, 9, 20, 16, GOLD_2);
    px(s, 12, 25, 16, 4, GOLD_2);
    px(s, 15, 29, 10, 3, GOLD_3);
    px(s, 18, 32, 4, 2, GOLD_3);
    px(s, 11, 10, 18, 14, GOLD_1);
    px(s, 11, 10, 18, 2, GOLD_HI);
    // Crimson shield core
    px(s, 13, 12, 14, 11, '#b91c1c');
    px(s, 15, 23, 10, 4, '#991b1b');
    px(s, 17, 27, 6, 2, '#7f1d1d');
    px(s, 14, 13, 4, 8, '#ef4444');
    px(s, 14, 13, 2, 2, '#ffffff');
    // Bold pixel ADM ribbon across shield bottom
    px(s, 9, 20, 22, 9, '#78350f');
    px(s, 10, 21, 20, 7, GOLD_1);
    px(s, 10, 21, 20, 1, GOLD_HI);
    drawTinyText(s, 'ADM', 14, 22, '#7f1d1d', '#fef08a');
  } else if (normalizedId === 'badge_mod') {
    // Silver & Royal Blue Shield Crest with crossed pixel sword/keys bevels
    // Crossed sword hilts sticking out top-left & top-right
    px(s, 6, 6, 5, 3, GOLD_1);
    px(s, 8, 5, 2, 5, GOLD_2);
    px(s, 29, 6, 5, 3, GOLD_1);
    px(s, 30, 5, 2, 5, GOLD_2);
    px(s, 9, 9, 4, 4, SLV_1);
    px(s, 27, 9, 4, 4, SLV_1);
    // Shield outer silver rim
    px(s, 9, 8, 22, 15, SLV_2);
    px(s, 11, 23, 18, 5, SLV_2);
    px(s, 14, 28, 12, 4, SLV_3);
    px(s, 17, 32, 6, 3, SLV_3);
    px(s, 10, 9, 20, 13, SLV_1);
    px(s, 10, 9, 10, 2, SLV_HI);
    // Royal blue inner crest
    px(s, 12, 11, 16, 11, '#1d4ed8');
    px(s, 14, 22, 12, 4, '#1e40af');
    px(s, 16, 26, 8, 4, '#1e3a8a');
    px(s, 18, 30, 4, 2, '#172554');
    // Diagonal gleaming silver sword blades inside shield
    for (let i = 0; i < 12; i++) {
      px(s, 14 + i, 13 + i, 2, 2, SLV_HI);
      px(s, 24 - i, 13 + i, 2, 2, SLV_1);
    }
    // Center sapphire/gold emblem
    px(s, 18, 17, 4, 4, GOLD_1);
    px(s, 19, 18, 2, 2, '#ffffff');
  } else if (normalizedId === 'badge_evt') {
    // Gold Starburst Trophy Medallion with twin crimson ribbons
    // Twin bottom tails
    px(s, 11, 26, 6, 10, '#b91c1c');
    px(s, 12, 27, 2, 7, '#ef4444');
    px(s, 11, 35, 3, 2, '#991b1b');
    px(s, 23, 26, 6, 10, '#b91c1c');
    px(s, 24, 27, 2, 7, '#ef4444');
    px(s, 26, 35, 3, 2, '#991b1b');
    // 8-point starburst rays
    px(s, 18, 3, 4, 30, GOLD_2);
    px(s, 5, 16, 30, 4, GOLD_2);
    px(s, 9, 7, 22, 22, GOLD_1);
    px(s, 7, 11, 26, 14, GOLD_1);
    px(s, 11, 5, 18, 26, GOLD_1);
    // Trophy cup silhouette inside medallion
    px(s, 13, 11, 14, 7, GOLD_3);
    px(s, 14, 12, 12, 6, GOLD_HI);
    px(s, 15, 13, 10, 5, GOLD_1);
    px(s, 11, 12, 2, 4, GOLD_1);
    px(s, 27, 12, 2, 4, GOLD_1);
    px(s, 16, 18, 8, 3, GOLD_2);
    px(s, 18, 21, 4, 3, GOLD_2);
    px(s, 15, 24, 10, 3, GOLD_3);
    px(s, 16, 13, 2, 3, '#ffffff');
  } else if (normalizedId === 'badge_hc') {
    // Ornate Gold & Orange PIXL Club Clover/Crown Shield with embossed pixel PC lettering
    // Crown/Clover crest lobes on top
    px(s, 15, 4, 10, 5, GOLD_1);
    px(s, 16, 4, 8, 2, GOLD_HI);
    px(s, 8, 8, 8, 7, GOLD_1);
    px(s, 24, 8, 8, 7, GOLD_1);
    px(s, 9, 9, 5, 2, GOLD_HI);
    px(s, 25, 9, 5, 2, GOLD_HI);
    // Shield body
    px(s, 7, 11, 26, 15, GOLD_2);
    px(s, 9, 26, 22, 5, GOLD_2);
    px(s, 13, 31, 14, 3, GOLD_3);
    px(s, 17, 34, 6, 2, GOLD_3);
    // Inner orange-amber enamel
    px(s, 9, 13, 22, 12, '#ea580c');
    px(s, 11, 25, 18, 4, '#c2410c');
    px(s, 15, 29, 10, 3, '#9a3412');
    // Shiny bevel rim & corner glints
    px(s, 9, 11, 22, 2, GOLD_HI);
    px(s, 10, 14, 2, 2, '#ffffff');
    // Bold embossed pixel PC
    px(s, 12, 15, 3, 10, GOLD_3);
    px(s, 15, 15, 4, 2, GOLD_3);
    px(s, 17, 17, 2, 2, GOLD_3);
    px(s, 15, 19, 4, 2, GOLD_3);
    px(s, 21, 15, 7, 10, GOLD_3);
    // Letter P highlight
    px(s, 12, 14, 3, 10, GOLD_HI);
    px(s, 15, 14, 4, 2, GOLD_HI);
    px(s, 17, 16, 2, 2, GOLD_1);
    px(s, 15, 18, 4, 2, GOLD_1);
    // Letter C highlight
    px(s, 21, 14, 7, 2, GOLD_HI);
    px(s, 21, 16, 3, 6, GOLD_1);
    px(s, 21, 22, 7, 2, GOLD_1);
  } else if (normalizedId === 'badge_vip') {
    // Purple & Gold Jeweled Royal Crown with red/cyan pixel gems
    // Crown base velvet & gold band
    px(s, 5, 13, 4, 13, GOLD_1);
    px(s, 11, 9, 4, 17, GOLD_1);
    px(s, 18, 5, 4, 21, GOLD_1);
    px(s, 25, 9, 4, 17, GOLD_1);
    px(s, 31, 13, 4, 13, GOLD_1);
    // Velvet purple interior arches
    px(s, 8, 16, 24, 10, '#7e22ce');
    px(s, 12, 13, 16, 5, '#9333ea');
    // Crown pearls & specular highlights
    px(s, 6, 11, 3, 3, GOLD_HI);
    px(s, 12, 7, 3, 3, GOLD_HI);
    px(s, 18, 3, 4, 3, GOLD_HI);
    px(s, 25, 7, 3, 3, GOLD_HI);
    px(s, 31, 11, 3, 3, GOLD_HI);
    // Thick gold rim base
    px(s, 5, 25, 30, 8, GOLD_2);
    px(s, 6, 26, 28, 5, GOLD_1);
    px(s, 6, 26, 28, 1, GOLD_HI);
    px(s, 7, 32, 26, 2, GOLD_3);
    // Ruby & cyan pixel gems
    px(s, 10, 27, 3, 3, '#ef4444');
    px(s, 10, 27, 1, 1, '#ffffff');
    px(s, 18, 26, 4, 4, '#22d3ee');
    px(s, 18, 26, 1, 1, '#ffffff');
    px(s, 27, 27, 3, 3, '#ef4444');
    px(s, 27, 27, 1, 1, '#ffffff');
    px(s, 19, 17, 2, 3, '#facc15');
  } else if (normalizedId === 'badge_dragon') {
    // Detailed Roaring Fire Dragon Head silhouette with scales & pixel flame
    // Neck & armored bronze/crimson scales
    px(s, 6, 21, 11, 15, '#991b1b');
    px(s, 8, 18, 12, 16, '#dc2626');
    px(s, 7, 23, 3, 11, '#f97316');
    px(s, 9, 25, 5, 3, GOLD_1);
    px(s, 9, 30, 5, 3, GOLD_1);
    // Curved golden horns on back of skull
    px(s, 7, 7, 5, 4, GOLD_1);
    px(s, 5, 5, 4, 4, GOLD_HI);
    px(s, 11, 10, 5, 8, GOLD_2);
    px(s, 15, 6, 4, 6, GOLD_1);
    px(s, 16, 4, 3, 3, GOLD_HI);
    // Dragon skull & upper jaw
    px(s, 12, 12, 14, 9, '#ef4444');
    px(s, 13, 12, 12, 3, '#f87171');
    px(s, 22, 14, 8, 5, '#dc2626');
    // Fierce glowing gold eye
    px(s, 17, 15, 4, 3, '#111111');
    px(s, 18, 15, 2, 2, GOLD_HI);
    // Open lower jaw + white fangs
    px(s, 18, 23, 11, 4, '#991b1b');
    px(s, 24, 19, 2, 2, '#ffffff');
    px(s, 27, 19, 2, 2, '#ffffff');
    px(s, 25, 22, 2, 2, '#ffffff');
    // Roaring pixel fire breath!
    px(s, 28, 17, 6, 6, '#f97316');
    px(s, 31, 15, 6, 8, GOLD_1);
    px(s, 34, 13, 4, 6, GOLD_HI);
    px(s, 30, 19, 3, 3, '#ffffff');
  } else if (normalizedId === 'badge_lido') {
    // Circular Tropical Sun, Blue Wave & Golden Rubber Duck Medallion with palm fronds
    // Circular rim
    px(s, 11, 4, 18, 32, GOLD_2);
    px(s, 7, 7, 26, 26, GOLD_2);
    px(s, 4, 11, 32, 18, GOLD_2);
    px(s, 11, 5, 18, 30, GOLD_1);
    px(s, 8, 8, 24, 24, GOLD_1);
    px(s, 6, 11, 28, 18, GOLD_1);
    // Sky interior
    px(s, 11, 7, 18, 18, '#38bdf8');
    px(s, 8, 10, 24, 15, '#38bdf8');
    // Tropical sun
    px(s, 22, 9, 6, 6, '#fef08a');
    px(s, 23, 10, 4, 4, '#ffffff');
    // Palm fronds on left edge
    px(s, 8, 13, 6, 2, '#16a34a');
    px(s, 7, 15, 4, 2, '#22c55e');
    px(s, 9, 17, 2, 7, '#854d0e');
    // Blue ocean waves at bottom
    px(s, 8, 24, 24, 7, '#0284c7');
    px(s, 11, 29, 18, 4, '#0369a1');
    px(s, 9, 24, 5, 2, '#bae6fd');
    px(s, 20, 25, 6, 2, '#bae6fd');
    // Golden rubber duck floating in center
    px(s, 14, 19, 11, 7, '#facc15');
    px(s, 15, 19, 9, 2, '#fef9c3');
    px(s, 20, 13, 6, 6, '#facc15');
    px(s, 26, 15, 3, 2, '#f97316');
    px(s, 23, 14, 1, 2, '#111111');
  } else if (normalizedId === 'badge_banzai') {
    // Glowing Cyan & Magenta Neon Banzai Orb / Lightning Bolt crest
    // Octagonal dark neon frame
    px(s, 12, 4, 16, 32, '#1e1b4b');
    px(s, 7, 8, 26, 24, '#1e1b4b');
    px(s, 4, 13, 32, 14, '#1e1b4b');
    // Neon outer rim split magenta/cyan
    px(s, 12, 5, 8, 2, '#ec4899');
    px(s, 20, 5, 8, 2, '#22d3ee');
    px(s, 6, 13, 2, 14, '#ec4899');
    px(s, 32, 13, 2, 14, '#22d3ee');
    // Inner glowing orb core
    px(s, 9, 9, 22, 22, '#312e81');
    px(s, 12, 10, 16, 10, '#db2777');
    px(s, 12, 20, 16, 10, '#0891b2');
    // Crisp high-voltage electric lightning bolt cutting across
    px(s, 21, 7, 5, 6, '#fef08a');
    px(s, 16, 12, 8, 6, '#ffffff');
    px(s, 13, 17, 13, 4, '#22d3ee');
    px(s, 18, 21, 7, 6, '#fef08a');
    px(s, 15, 27, 5, 6, '#ffffff');
  } else if (normalizedId === 'badge_architect') {
    // Golden Isometric Tile & Blueprint Compass emblem
    // Isometric gold/teal diamond floor tile base
    for (let dy = 0; dy < 8; dy++) {
      const halfW = 3 + dy * 2;
      px(s, 20 - halfW, 17 + dy, halfW * 2, 1, dy % 2 === 0 ? '#16a34a' : '#22c55e');
      px(s, 20 - halfW, 31 - dy, halfW * 2, 1, '#15803d');
    }
    px(s, 6, 24, 28, 3, GOLD_2);
    px(s, 8, 23, 24, 2, GOLD_1);
    // Golden architect drafting compass standing over the isometric tile
    px(s, 18, 4, 4, 4, GOLD_HI);
    px(s, 16, 8, 8, 4, GOLD_1);
    for (let i = 0; i < 14; i++) {
      px(s, 17 - Math.floor(i * 0.5), 12 + i, 3, 2, GOLD_1);
      px(s, 20 + Math.floor(i * 0.5), 12 + i, 3, 2, GOLD_2);
    }
    px(s, 13, 18, 14, 2, SLV_1);
    px(s, 19, 10, 2, 2, '#ef4444');
  } else if (normalizedId === 'badge_stylist') {
    // Shaped Pixel Sunglasses & Diamond Star badge
    // Sparkling pink/cyan diamond star behind sunglasses
    px(s, 18, 3, 4, 16, '#f472b6');
    px(s, 14, 7, 12, 8, '#ec4899');
    px(s, 18, 5, 4, 6, '#ffffff');
    // Cool angular retro pixel sunglasses
    px(s, 4, 15, 32, 4, '#18181b');
    px(s, 5, 16, 13, 10, '#18181b');
    px(s, 22, 16, 13, 10, '#18181b');
    px(s, 7, 26, 9, 3, '#18181b');
    px(s, 24, 26, 9, 3, '#18181b');
    // Glossy cyan & purple gradient lenses with white diagonal pixel glint
    px(s, 7, 18, 9, 7, '#0284c7');
    px(s, 24, 18, 9, 7, '#7c3aed');
    px(s, 8, 19, 3, 2, '#ffffff');
    px(s, 10, 21, 2, 2, '#bae6fd');
    px(s, 25, 19, 3, 2, '#ffffff');
    px(s, 27, 21, 2, 2, '#e9d5ff');
    // Gold bridge accent
    px(s, 18, 16, 4, 2, GOLD_1);
  } else if (normalizedId === 'badge_gold') {
    // Overflowing Gold Coin Sack with $ pixel emblem
    // Tied sack top ruffles
    px(s, 13, 5, 14, 5, '#d97706');
    px(s, 15, 4, 10, 3, '#fbbf24');
    px(s, 14, 10, 12, 3, '#b91c1c'); // crimson tie ribbon
    // Fat bulging burlap/gold sack body
    px(s, 8, 13, 24, 18, '#b45309');
    px(s, 6, 17, 28, 12, '#d97706');
    px(s, 9, 31, 22, 4, '#92400e');
    px(s, 10, 15, 16, 12, '#f59e0b');
    // Gold coins spilling out top & front
    px(s, 26, 26, 9, 8, GOLD_1);
    px(s, 27, 26, 6, 2, GOLD_HI);
    px(s, 23, 29, 8, 7, GOLD_2);
    px(s, 24, 29, 5, 2, GOLD_1);
    px(s, 5, 28, 7, 7, GOLD_1);
    px(s, 6, 28, 4, 2, GOLD_HI);
    // Crisp $ pixel emblem in center of sack
    drawTinyText(s, '$', 17, 19, GOLD_HI, '#78350f');
  } else if (normalizedId === 'badge_checkin') {
    // Classic Habbo Miniature Golden Hotel Tower silhouette against sky-blue crest
    // Sky-blue circular crest backdrop behind tower
    px(s, 9, 8, 22, 24, '#0284c7');
    px(s, 6, 12, 28, 16, '#38bdf8');
    px(s, 11, 6, 18, 28, '#38bdf8');
    // Classic Habbo miniature golden hotel tower
    px(s, 17, 3, 6, 3, '#ef4444'); // rooftop beacon
    px(s, 14, 6, 12, 27, GOLD_2);
    px(s, 15, 7, 10, 25, GOLD_1);
    px(s, 15, 7, 3, 25, GOLD_HI);
    // Side hotel wings
    px(s, 9, 16, 5, 17, '#ea580c');
    px(s, 26, 16, 5, 17, '#c2410c');
    // Glowing hotel windows
    for (let wy = 10; wy <= 24; wy += 4) {
      px(s, 17, wy, 2, 2, '#fef08a');
      px(s, 21, wy, 2, 2, '#bae6fd');
    }
    px(s, 11, 19, 2, 3, '#fef08a');
    px(s, 27, 19, 2, 3, '#fef08a');
    // Hotel entrance awning
    px(s, 17, 29, 6, 4, '#1e3a8a');
    px(s, 16, 28, 8, 2, '#ffffff');
  } else if (normalizedId === 'badge_social') {
    // Double Speech-Bubble with Crimson Heart
    px(s, 5, 7, 24, 17, '#0d9488');
    px(s, 7, 8, 20, 14, '#ffffff');
    px(s, 10, 24, 5, 4, '#ffffff');
    px(s, 17, 14, 18, 14, '#0f766e');
    px(s, 19, 15, 14, 11, '#99f6e4');
    px(s, 27, 28, 4, 4, '#99f6e4');
    // Pixel heart inside bubble
    px(s, 12, 12, 4, 3, '#ef4444');
    px(s, 18, 12, 4, 3, '#ef4444');
    px(s, 11, 14, 12, 4, '#ef4444');
    px(s, 13, 18, 8, 3, '#dc2626');
    px(s, 15, 21, 4, 2, '#dc2626');
    px(s, 13, 13, 2, 1, '#ffffff');
  } else if (normalizedId === 'badge_voucher') {
    // Gift Box with Golden Ribbon Bow
    px(s, 11, 6, 7, 5, GOLD_1);
    px(s, 22, 6, 7, 5, GOLD_1);
    px(s, 17, 8, 6, 4, GOLD_HI);
    px(s, 6, 12, 28, 6, '#ef4444');
    px(s, 8, 18, 24, 16, '#dc2626');
    px(s, 17, 12, 6, 22, GOLD_1);
    px(s, 18, 12, 2, 22, GOLD_HI);
  } else if (normalizedId === 'badge_throne') {
    // 24K Gilded Royal Throne silhouette
    px(s, 11, 4, 18, 18, GOLD_2);
    px(s, 13, 6, 14, 14, GOLD_1);
    px(s, 15, 8, 10, 12, '#991b1b');
    px(s, 18, 11, 4, 4, GOLD_HI);
    px(s, 7, 18, 26, 7, GOLD_1);
    px(s, 9, 20, 22, 5, '#dc2626');
    px(s, 8, 25, 24, 5, GOLD_2);
    px(s, 9, 30, 5, 6, GOLD_3);
    px(s, 26, 30, 5, 6, GOLD_3);
  } else if (normalizedId === 'badge_dj') {
    // Vinyl Turntable + Neon Headphones Crest
    px(s, 10, 6, 20, 6, '#ec4899');
    px(s, 6, 11, 6, 13, '#db2777');
    px(s, 28, 11, 6, 13, '#db2777');
    px(s, 11, 12, 18, 20, '#0f172a');
    px(s, 13, 14, 14, 16, '#334155');
    px(s, 16, 17, 8, 8, '#ec4899');
    px(s, 19, 20, 2, 2, '#ffffff');
    px(s, 14, 15, 3, 2, '#ffffff');
  } else if (normalizedId === 'badge_new') {
    // Emerald Four-Leaf Clover / Park Crest
    px(s, 12, 5, 16, 10, '#22c55e');
    px(s, 6, 12, 12, 12, '#16a34a');
    px(s, 22, 12, 12, 12, '#22c55e');
    px(s, 12, 20, 16, 10, '#15803d');
    px(s, 18, 28, 4, 8, '#166534');
    px(s, 15, 13, 10, 10, '#bbf7d0');
    px(s, 18, 16, 4, 4, '#ffffff');
  } else if (!drawExtendedBadgeSprite(s, normalizedId)) {
    // Ornate Star Shield fallback for any unknown ID
    px(s, 10, 6, 20, 20, '#2b6ca3');
    px(s, 12, 26, 16, 5, '#1d4e78');
    px(s, 16, 31, 8, 3, '#1d4e78');
    px(s, 18, 11, 4, 12, GOLD_1);
    px(s, 14, 15, 12, 4, GOLD_1);
    px(s, 19, 16, 2, 2, '#ffffff');
  }

  const out = finalizeShapedBadge40(src, unlocked);
  spriteCache.set(key, out);
  return out;
}

/**
 * Renders a crisp miniature isometric room thumbnail (84x52) for the 2-tab Habbo Navigator.
 */
export function getRoomThumbnailImage(room: RoomDef): string {
  const key = `rthumb|${room.id}|${room.floorTheme}|${room.wallTheme}|${room.outdoor ? '1' : '0'}`;
  const cached = roomThumbCache.get(key);
  if (cached) return cached;

  const { canvas, ctx } = makeOffscreen(84, 52);
  const bg = room.outdoor
    ? '#000000'
    : room.floorTheme === 'banzai'
    ? '#0f172a'
    : '#141414';
  px(ctx, 0, 0, 84, 52, bg);

  if (!room.outdoor) {
    const wallCol =
      room.wallTheme === 'nightsky' || room.wallTheme === 'neon'
        ? '#312e81'
        : room.wallTheme === 'cream'
        ? '#e3dacb'
        : '#b9c9d6';
    drawIsoPoly(ctx, [[42, 6], [72, 20], [72, 32], [42, 18]], wallCol);
    drawIsoPoly(ctx, [[42, 6], [12, 20], [12, 32], [42, 18]], shadeHex(wallCol, -18));
  } else if (room.rooftopHotelFacade) {
    // Classic orange hotel facade wing on upper-left
    drawIsoPoly(ctx, [[42, 4], [12, 18], [12, 32], [42, 18]], '#f57c00', '#7c2d12');
    px(ctx, 20, 18, 4, 4, '#fef08a');
    px(ctx, 30, 13, 4, 4, '#7dd3fc');
  } else {
    // Low outdoor rooftop parapet rim
    drawIsoPoly(ctx, [[42, 14], [72, 28], [72, 32], [42, 18]], '#90a4ae');
    drawIsoPoly(ctx, [[42, 14], [12, 28], [12, 32], [42, 18]], '#607d8b');
  }

  // Mini floor diamond
  const floorCol =
    room.floorTheme === 'lido_deck'
      ? '#f5ebd6'
      : room.floorTheme === 'wood_deck'
      ? '#c88b4b'
      : room.floorTheme === 'park_grass'
      ? '#4da342'
      : room.floorTheme === 'disco'
      ? '#a855f7'
      : room.floorTheme === 'rooftop'
      ? '#64748b'
      : room.floorTheme === 'banzai'
      ? '#1d4ed8'
      : '#e2dcd0';

  drawIsoPoly(ctx, [[42, 18], [72, 32], [42, 46], [12, 32]], floorCol, '#141414');

  // Pool / Pond / Waterfall accents
  if (room.floorTheme === 'lido_deck' || room.floorTheme === 'wood_deck' || room.floorTheme === 'park_grass') {
    drawIsoPoly(ctx, [[45, 24], [61, 32], [45, 40], [29, 32]], '#0288d1', '#01579b');
  }
  if (room.rooftopHotelFacade) {
    drawIsoPoly(ctx, [[56, 15], [66, 20], [56, 25], [46, 20]], '#78909c', '#37474f');
    px(ctx, 54, 22, 4, 9, '#29b6f6');
  }

  const url = canvas.toDataURL('image/png');
  roomThumbCache.set(key, url);
  return url;
}

/**
 * Renders detailed 3/4 isometric pixel-art pets onto a 40x40 offscreen canvas with soft oval shadow
 * and crisp 1px #141414 silhouette outline. Base feet anchor at (20, 34).
 */
export function getPetSprite(
  species: PetSpecies,
  dir: Direction,
  anim: PetAnim,
  frame = 0
): HTMLCanvasElement {
  const step = frame % 4;
  const key = `pet34|${species}|${dir}|${anim}|${step}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const W = 40;
  const H = 40;
  const { canvas, ctx } = makeOffscreen(W, H);
  const { canvas: scratch, ctx: s } = makeOffscreen(W, H);

  // Soft isometric shadow at ground level
  ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.beginPath();
  ctx.ellipse(20, 34, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const mirrorX = dir === 1 || dir === 2;
  const facingBack = dir === 2 || dir === 3;

  const jumpOffset = anim === 'jump' ? (step % 2 === 0 ? -7 : -3) : 0;
  const walkBob = anim === 'walk' && step % 2 === 1 ? -1 : 0;
  const layShift = anim === 'lay' ? 4 : 0;
  const sitShift = anim === 'sit' ? 2 : 0;
  const dy = jumpOffset + walkBob + layShift + sitShift;

  const cx = 20;
  const baseY = 33;

  if (species === 'golden_terrier') {
    const fur = '#e09f3e';
    const furHi = '#f7d08a';
    const furLo = '#b37422';

    // Wagging tail
    const tailWag = step % 2 === 0 ? -2 : 0;
    px(s, cx - 11, baseY - 12 + dy + tailWag, 4, 3, furLo);
    px(s, cx - 12, baseY - 14 + dy + tailWag, 3, 3, fur);

    // Body (compact or stretched when laying)
    if (anim === 'lay') {
      px(s, cx - 10, baseY - 8, 18, 6, fur);
      px(s, cx - 9, baseY - 8, 16, 2, furHi);
      px(s, cx + 6, baseY - 4, 5, 3, furHi); // stretched front paws
    } else if (anim === 'sit') {
      px(s, cx - 7, baseY - 13 + jumpOffset, 10, 9, fur);
      px(s, cx - 6, baseY - 13 + jumpOffset, 7, 3, furHi);
      // Seated paws
      px(s, cx - 3, baseY - 4 + jumpOffset, 3, 4, furHi);
      px(s, cx + 2, baseY - 4 + jumpOffset, 3, 4, furHi);
    } else {
      px(s, cx - 9, baseY - 12 + dy, 14, 8, fur);
      px(s, cx - 8, baseY - 12 + dy, 12, 2, furHi);
      // Legs
      const legSwap = anim === 'walk' ? (step % 2 === 0 ? 1 : -1) : 0;
      px(s, cx - 8 + legSwap, baseY - 5 + dy, 3, 5, furLo);
      px(s, cx - 3 - legSwap, baseY - 4 + dy, 3, 4, fur);
      px(s, cx + 2 + legSwap, baseY - 4 + dy, 3, 4, furHi);
    }

    // Red collar
    px(s, cx + 1, baseY - 13 + dy, 5, 2, '#dc2626');

    // Head (3/4 isometric angle facing +x/+y)
    const hx = cx + 1;
    const hy = anim === 'sit' ? baseY - 22 + jumpOffset : baseY - 21 + dy;
    px(s, hx, hy, 10, 9, fur);
    px(s, hx + 1, hy, 8, 2, furHi);
    // Snout
    px(s, hx + 8, hy + 4, 4, 4, furHi);
    if (!facingBack) {
      px(s, hx + 11, hy + 4, 2, 2, '#141414'); // nose
      px(s, hx + 6, hy + 3, 2, 2, '#141414'); // eye
      if (anim === 'speak' && step % 2 === 0) {
        px(s, hx + 8, hy + 7, 3, 2, '#fb7185'); // tongue bark!
      }
    }
    // Floppy ear
    px(s, hx - 1, hy + 2, 3, 6, furLo);
  } else if (species === 'tabby_kitten') {
    const coat = '#f97316';
    const coatHi = '#fdba74';
    const stripe = '#9a3412';
    const cream = '#fef3c7';

    // Curled tail
    const tailShift = step % 2 === 0 ? -2 : 0;
    px(s, cx - 10, baseY - 12 + dy + tailShift, 3, 7, coat);
    px(s, cx - 11, baseY - 14 + dy + tailShift, 3, 3, stripe);

    if (anim === 'lay') {
      px(s, cx - 9, baseY - 7, 16, 6, coat);
      px(s, cx - 5, baseY - 7, 2, 4, stripe);
      px(s, cx, baseY - 7, 2, 4, stripe);
      px(s, cx + 5, baseY - 3, 4, 2, cream);
    } else if (anim === 'sit') {
      px(s, cx - 6, baseY - 12 + jumpOffset, 9, 9, coat);
      px(s, cx - 1, baseY - 10 + jumpOffset, 4, 6, cream);
      px(s, cx - 4, baseY - 4 + jumpOffset, 3, 3, cream);
      px(s, cx + 1, baseY - 3 + jumpOffset, 3, 3, cream);
    } else {
      px(s, cx - 8, baseY - 11 + dy, 12, 7, coat);
      px(s, cx - 4, baseY - 11 + dy, 2, 4, stripe);
      px(s, cx + 1, baseY - 11 + dy, 2, 4, stripe);
      px(s, cx - 7, baseY - 4 + dy, 2, 4, cream);
      px(s, cx - 2, baseY - 4 + dy, 2, 4, cream);
      px(s, cx + 2, baseY - 4 + dy, 2, 4, cream);
    }

    const hx = cx + 1;
    const hy = anim === 'sit' ? baseY - 20 + jumpOffset : baseY - 19 + dy;
    // Pointed cat ears
    px(s, hx, hy - 3, 3, 4, coat);
    px(s, hx + 6, hy - 3, 3, 4, coat);
    px(s, hx + 1, hy - 2, 1, 2, '#fda4af');
    px(s, hx + 7, hy - 2, 1, 2, '#fda4af');
    // Rounded head
    px(s, hx, hy, 10, 8, coat);
    px(s, hx + 2, hy, 6, 2, coatHi);
    px(s, hx + 4, hy + 1, 1, 2, stripe);
    px(s, hx + 6, hy + 1, 1, 2, stripe);
    if (!facingBack) {
      px(s, hx + 4, hy + 3, 2, 2, '#10b981');
      px(s, hx + 8, hy + 3, 2, 2, '#10b981');
      px(s, hx + 6, hy + 5, 2, 1, '#fb7185'); // pink nose
      if (anim === 'speak' && step % 2 === 0) {
        px(s, hx + 6, hy + 6, 2, 2, '#ef4444');
      }
    }
  } else {
    // Baby Fire Dragon
    const scale = '#16a34a';
    const scaleHi = '#4ade80';
    const scaleLo = '#166534';
    const belly = '#fde047';
    const wing = '#dc2626';

    // Fiery tail
    px(s, cx - 12, baseY - 10 + dy, 5, 3, scaleLo);
    px(s, cx - 14, baseY - 12 + dy - (step % 2), 3, 3, '#f97316');
    px(s, cx - 14, baseY - 13 + dy - (step % 2), 2, 2, '#fde047');

    // Wing flapping
    const wingY = baseY - 18 + dy - (step % 2) * 2;
    px(s, cx - 7, wingY, 7, 6, wing);
    px(s, cx - 6, wingY + 1, 4, 2, '#f87171');

    // Body
    if (anim === 'lay') {
      px(s, cx - 9, baseY - 8, 16, 7, scale);
      px(s, cx - 6, baseY - 4, 10, 3, belly);
    } else {
      px(s, cx - 7, baseY - 13 + dy, 12, 9, scale);
      px(s, cx - 2, baseY - 11 + dy, 6, 6, belly);
      px(s, cx - 5, baseY - 4 + dy, 3, 4, scaleLo);
      px(s, cx + 1, baseY - 4 + dy, 3, 4, scale);
    }

    // Dragon head & horns
    const hx = cx + 1;
    const hy = baseY - 22 + dy;
    px(s, hx, hy - 3, 2, 3, '#fde047'); // horn 1
    px(s, hx + 5, hy - 3, 2, 3, '#fde047'); // horn 2
    px(s, hx, hy, 10, 9, scale);
    px(s, hx + 1, hy, 7, 2, scaleHi);
    px(s, hx + 8, hy + 3, 4, 5, scaleHi); // snout
    if (!facingBack) {
      px(s, hx + 5, hy + 3, 2, 2, '#fef08a'); // glowing eye
      px(s, hx + 6, hy + 3, 1, 1, '#141414');
      if (anim === 'speak') {
        // Puff of smoke / mini fire!
        px(s, hx + 12, hy + 4, 3, 2, '#f97316');
        px(s, hx + 14, hy + 2, 3, 3, '#cbd5e1');
      }
    }
  }

  // Mirror horizontally for SW/NW directions
  const oriented = makeOffscreen(W, H);
  if (mirrorX) {
    oriented.ctx.translate(W, 0);
    oriented.ctx.scale(-1, 1);
  }
  oriented.ctx.drawImage(scratch, 0, 0);

  // Crisp 1px #141414 outline pass
  const srcImg = oriented.ctx.getImageData(0, 0, W, H);
  const srcData = srcImg.data;
  const outlined = makeOffscreen(W, H);
  const outImg = outlined.ctx.createImageData(W, H);
  const outData = outImg.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      if (srcData[idx + 3] > 128) {
        outData[idx] = srcData[idx];
        outData[idx + 1] = srcData[idx + 1];
        outData[idx + 2] = srcData[idx + 2];
        outData[idx + 3] = 255;
      } else {
        const hasNeighbor =
          (x > 0 && srcData[idx - 4 + 3] > 128) ||
          (x < W - 1 && srcData[idx + 4 + 3] > 128) ||
          (y > 0 && srcData[idx - W * 4 + 3] > 128) ||
          (y < H - 1 && srcData[idx + W * 4 + 3] > 128);
        if (hasNeighbor) {
          outData[idx] = 0x14;
          outData[idx + 1] = 0x14;
          outData[idx + 2] = 0x14;
          outData[idx + 3] = 255;
        }
      }
    }
  }
  outlined.ctx.putImageData(outImg, 0, 0);
  ctx.drawImage(outlined.canvas, 0, 0);

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Renders detailed pixel-art hand-held drinks & snacks with sipping raise animation.
 */
export function drawCarryHandItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  avatarBaseX: number,
  avatarBaseY: number,
  dir: Direction,
  isSipping = false
) {
  if (!itemId || itemId === 'none') return;
  const facingLeft = dir === 1 || dir === 2;
  const hx = Math.round(avatarBaseX + (facingLeft ? (isSipping ? -8 : -11) : isSipping ? 3 : 6));
  const hy = Math.round(avatarBaseY - (isSipping ? 26 : 19));

  if (itemId === 'cola') {
    outlinedRect(ctx, hx, hy, 6, 9, '#dc2626', '#f87171', '#991b1b');
    px(ctx, hx + 1, hy + 1, 4, 1, '#e2e8f0');
    px(ctx, hx + 1, hy + 4, 4, 2, '#ffffff');
  } else if (itemId === 'coffee') {
    outlinedRect(ctx, hx, hy + 1, 7, 7, '#78350f', '#b45309', '#451a03');
    px(ctx, hx + 1, hy + 2, 4, 1, '#fef3c7');
    px(ctx, hx + (facingLeft ? -2 : 7), hy + 3, 2, 3, '#78350f');
    px(ctx, hx + 2, hy - 2, 1, 2, 'rgba(255,255,255,0.75)');
    px(ctx, hx + 4, hy - 3, 1, 2, 'rgba(255,255,255,0.55)');
  } else if (itemId === 'champagne') {
    outlinedRect(ctx, hx + 1, hy - 2, 5, 6, '#fef08a', '#ffffff', '#ca8a04');
    px(ctx, hx + 3, hy + 4, 1, 4, '#e2e8f0');
    px(ctx, hx + 1, hy + 8, 5, 1, '#cbd5e1');
  } else if (itemId === 'icecream') {
    // Waffle cone + strawberry & vanilla scoops
    px(ctx, hx + 2, hy + 5, 3, 4, '#d97706');
    px(ctx, hx + 3, hy + 8, 1, 2, '#92400e');
    outlinedRect(ctx, hx + 1, hy + 1, 5, 4, '#f472b6', '#fbcfe8');
    px(ctx, hx + 2, hy - 1, 3, 2, '#fef9c3');
    px(ctx, hx + 3, hy - 2, 1, 1, '#ef4444');
  } else if (itemId === 'carrot') {
    outlinedRect(ctx, hx + 1, hy + 2, 4, 7, '#f97316', '#fdba74', '#c2410c');
    px(ctx, hx + 1, hy - 1, 4, 3, '#22c55e');
    px(ctx, hx + 2, hy - 2, 2, 2, '#4ade80');
  } else if (itemId === 'rose') {
    px(ctx, hx + 3, hy + 2, 1, 7, '#16a34a');
    px(ctx, hx + 4, hy + 5, 2, 1, '#22c55e');
    outlinedRect(ctx, hx + 1, hy - 2, 5, 5, '#e11d48', '#fda4af', '#881337');
  }
}

/**
 * Renders classic Habbo sign card held above avatar (:sign 1..10, heart, skull).
 */
export function drawAvatarSign(
  ctx: CanvasRenderingContext2D,
  signCode: string,
  centerX: number,
  topY: number
) {
  const bx = Math.round(centerX - 11);
  const by = Math.round(topY - 26);
  // Wooden pole
  px(ctx, centerX - 1, by + 18, 2, 8, '#78350f');
  // White pixel placard
  outlinedRect(ctx, bx, by, 22, 18, '#ffffff', '#f8fafc', '#cbd5e1');
  if (signCode === 'heart') {
    // Pixel Heart
    px(ctx, bx + 6, by + 5, 4, 3, '#e11d48');
    px(ctx, bx + 12, by + 5, 4, 3, '#e11d48');
    px(ctx, bx + 5, by + 7, 12, 4, '#e11d48');
    px(ctx, bx + 7, by + 11, 8, 2, '#be123c');
    px(ctx, bx + 9, by + 13, 4, 2, '#9f1239');
    px(ctx, bx + 7, by + 6, 2, 1, '#fda4af');
  } else if (signCode === 'skull') {
    // Pixel Skull
    px(ctx, bx + 7, by + 4, 8, 6, '#1e293b');
    px(ctx, bx + 8, by + 3, 6, 1, '#334155');
    px(ctx, bx + 8, by + 6, 2, 2, '#ffffff');
    px(ctx, bx + 12, by + 6, 2, 2, '#ffffff');
    px(ctx, bx + 8, by + 10, 6, 3, '#1e293b');
    px(ctx, bx + 9, by + 11, 1, 2, '#ffffff');
    px(ctx, bx + 11, by + 11, 1, 2, '#ffffff');
    px(ctx, bx + 13, by + 11, 1, 2, '#ffffff');
  } else {
    ctx.font = 'bold 11px Tahoma, Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText(signCode, centerX, by + 9);
  }
}



import { normalizeBadgeSpriteKey } from './clientFeatures';
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
  rare_dragon_jade: 'jade_dragon',
  rare_dragon_silver: 'silver_dragon',
  club_sofa: 'hc_sofa',
  rare_throne: 'throne',
  rare_amber_red: 'amber_lamp',
  rare_fountain_gold: 'golden_fountain',
};

function resolveFurniSpriteId(id: string): string {
  return FURNI_SPRITE_ALIASES[id] ?? id;
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

export function getLookHash(look: LookConfig): string {
  return [
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
 * Renders an authentic 45-degree 3/4 isometric Habbo pixel character onto a 44x76 offscreen canvas.
 * Feet anchor point is (22, 66). Uses a scratch canvas + 1px #141414 silhouette outline pass.
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
  const hasSwimwear = inWater || wearingSwimwear;
  const swimKey = inWater
    ? `water:${swimwearColor}`
    : wearingSwimwear
    ? `decksw:${swimwearColor}`
    : '0';
  const danceKey = pose === 'dance' ? danceStyle : 0;
  const key = `av34|${getLookHash(look)}|${dir}|${pose}|d${danceKey}|${animStep}|${swimKey}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const W = 44;
  const H = 76;
  const { canvas, ctx } = makeOffscreen(W, H);
  const { canvas: scratch, ctx: s } = makeOffscreen(W, H);

  const facingBack = dir === 2 || dir === 3;
  const mirrorX = dir === 1 || dir === 2;

  const skin = look.skinColor;
  const skinHi = shadeHex(skin, 20);
  const skinLo = shadeHex(skin, -28);
  const skinDeep = shadeHex(skin, -45);

  const shirt = hasSwimwear ? skin : look.shirtColor;
  const shirtHi = shadeHex(shirt, 24);
  const shirtLo = shadeHex(shirt, -28);
  const shirtDeep = shadeHex(shirt, -44);

  const pants = hasSwimwear ? swimwearColor : look.pantsColor;
  const pantsHi = shadeHex(pants, 22);
  const pantsLo = shadeHex(pants, -26);

  const shoes = hasSwimwear ? skinLo : look.shoesColor;
  const shoesHi = shadeHex(shoes, 22);
  const shoesLo = shadeHex(shoes, -22);

  const hair = look.hairColor;
  const hairHi = shadeHex(hair, 26);
  const hairLo = shadeHex(hair, -28);

  const cx = 22;
  const baseY = 66;

  // Special horizontal reclining pose (:lay / lounger)
  if (pose === 'lay') {
    // Extended legs & shoes toward +x
    px(s, cx + 4, baseY - 14, 11, 5, hasSwimwear ? skin : pants);
    px(s, cx + 5, baseY - 14, 9, 2, hasSwimwear ? skinHi : pantsHi);
    px(s, cx + 4, baseY - 10, 11, 2, hasSwimwear ? skinLo : pantsLo);
    if (hasSwimwear) {
      px(s, cx + 3, baseY - 14, 5, 5, pants);
    }
    px(s, cx + 15, baseY - 15, 4, 6, shoes);
    px(s, cx + 16, baseY - 15, 2, 2, shoesHi);

    // Reclining torso
    px(s, cx - 7, baseY - 16, 12, 8, shirt);
    px(s, cx - 6, baseY - 17, 10, 2, shirtHi);
    px(s, cx - 7, baseY - 10, 12, 2, shirtLo);
    // Relaxed arm resting on side
    px(s, cx - 4, baseY - 12, 8, 3, shirtHi);
    px(s, cx + 4, baseY - 12, 3, 3, skin);

    // Head propped slightly up on the left
    const hx = cx - 18;
    const hy = baseY - 24;
    px(s, hx + 2, hy, 10, 1, skinHi);
    px(s, hx + 1, hy + 1, 12, 11, skin);
    px(s, hx + 2, hy + 12, 9, 2, skinLo);
    if (!facingBack) {
      px(s, hx + 6, hy + 6, 2, 2, '#141414');
      px(s, hx + 10, hy + 6, 2, 2, '#141414');
      px(s, hx + 7, hy + 10, 3, 1, '#7c2d12');
    }
    // Hair & crown/cap/shades
    px(s, hx, hy - 2, 13, 5, hair);
    px(s, hx + 2, hy - 2, 8, 2, hairHi);
    if (look.hairStyle === 'long' || look.hairStyle === 'bob') {
      px(s, hx - 1, hy + 2, 4, 10, hairLo);
    }
    if (look.accessory === 'sunglasses' && !facingBack) {
      px(s, hx + 5, hy + 5, 8, 3, '#09090b');
    } else if (look.accessory === 'crown') {
      px(s, hx + 2, hy - 5, 9, 3, '#facc15');
    }

    const oriented = makeOffscreen(W, H);
    if (mirrorX) {
      oriented.ctx.translate(W, 0);
      oriented.ctx.scale(-1, 1);
    }
    oriented.ctx.drawImage(scratch, 0, 0);

    ctx.fillStyle = 'rgba(15, 20, 35, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY - 3, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

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

  // Animation offsets (staggered diagonal stride / 4 distinct dance styles)
  let bobY = 0;
  let nearLegDX = 0;
  let nearLegDY = 0;
  let farLegDX = 0;
  let farLegDY = 0;
  let nearArmDY = 0;
  let farArmDY = 0;
  let waveUp = false;

  if (pose === 'walk') {
    if (animStep === 1) {
      bobY = -1;
      nearLegDX = 2;
      nearLegDY = -1;
      farLegDX = -2;
      farLegDY = 1;
      nearArmDY = -2;
      farArmDY = 2;
    } else if (animStep === 3) {
      bobY = -1;
      nearLegDX = -2;
      nearLegDY = 1;
      farLegDX = 2;
      farLegDY = -1;
      nearArmDY = 2;
      farArmDY = -2;
    }
  } else if (pose === 'dance') {
    if (danceStyle === 2) {
      // Pogo Mogo: energetic crouch & high pogo leap
      bobY = animStep === 0 ? 2 : animStep === 1 ? -6 : animStep === 2 ? -3 : 0;
      nearLegDY = animStep === 1 ? -3 : 0;
      farLegDY = animStep === 1 ? -3 : 0;
      nearArmDY = animStep === 1 || animStep === 2 ? -6 : 2;
      farArmDY = animStep === 1 || animStep === 2 ? -6 : 2;
    } else if (danceStyle === 3) {
      // Duck Funk: wide side-step & flapping elbows
      bobY = animStep % 2 === 0 ? -1 : 1;
      nearLegDX = animStep === 0 ? -2 : animStep === 2 ? 2 : 0;
      farLegDX = animStep === 0 ? -2 : animStep === 2 ? 2 : 0;
      nearArmDY = animStep % 2 === 0 ? -4 : 2;
      farArmDY = animStep % 2 === 0 ? -4 : 2;
    } else if (danceStyle === 4) {
      // The Rollie: alternating foot tap & shoulder roll
      bobY = animStep === 1 || animStep === 3 ? -2 : 0;
      nearLegDY = animStep === 1 ? -2 : 0;
      farLegDY = animStep === 3 ? -2 : 0;
      nearArmDY = animStep === 0 ? -5 : animStep === 2 ? 3 : -1;
      farArmDY = animStep === 2 ? -5 : animStep === 0 ? 3 : -1;
    } else {
      // Classic Habbo Hop (:dance 1)
      bobY = animStep % 2 === 0 ? -2 : 0;
      nearLegDX = animStep === 1 ? -1 : 0;
      farLegDX = animStep === 3 ? 1 : 0;
      nearArmDY = animStep < 2 ? -5 : 1;
      farArmDY = animStep >= 2 ? -5 : 1;
    }
  } else if (pose === 'wave') {
    waveUp = animStep % 2 === 0;
    bobY = waveUp ? -1 : 0;
  }

  // Draw SE (dir=0) or NE (dir=3) in local +x facing orientation on scratch canvas
  const torsoY = (pose === 'sit' ? baseY - 33 : baseY - 32) + bobY;

  const drawFarArm = () => {
    // Far shoulder sits on right side (+x) slightly behind torso
    const ax = cx + 4;
    const ay = torsoY + 2 + farArmDY;
    if (pose === 'wave' && !facingBack) {
      const wy = waveUp ? torsoY - 8 : torsoY - 5;
      px(s, cx + 5, wy + 2, 3, 9, shirtLo);
      px(s, cx + 6, wy + 2, 2, 7, shirt);
      px(s, cx + 5, wy - 1, 3, 3, skin);
      return;
    }
    if (pose === 'dance' && farArmDY < 0) {
      px(s, ax, ay, 3, 6, shirtLo);
      px(s, ax, ay - 3, 3, 3, skin);
      return;
    }
    px(s, ax, ay, 3, 6, shirtLo);
    px(s, ax + 1, ay + 5, 3, 5, shirtDeep);
    px(s, ax + 1, ay + 10, 3, 3, skinLo);
  };

  const drawNearArm = () => {
    // Near arm sits on left/foreground shoulder, bent slightly at elbow
    const ax = cx - 8;
    const ay = torsoY + 2 + nearArmDY;
    if (pose === 'dance' && nearArmDY < 0) {
      px(s, ax - 1, ay, 3, 6, shirt);
      px(s, ax - 1, ay - 3, 3, 3, skinHi);
      return;
    }
    // Upper arm
    px(s, ax, ay, 4, 6, shirt);
    px(s, ax + 1, ay, 2, 5, shirtHi);
    // Forearm bent forward (+x) at elbow
    px(s, ax + 1, ay + 6, 4, 5, shirt);
    px(s, ax + 2, ay + 6, 2, 4, shirtHi);
    // Hand
    px(s, ax + 2, ay + 11, 3, 3, skin);
    px(s, ax + 3, ay + 11, 2, 2, skinHi);
  };

  // 1. LEGS & STAGGERED DIAGONAL SHOES
  if (inWater) {
    // Legs are completely hidden beneath the pool waterline; subtle swim waistband at waterline
    const swimBob = animStep % 2 === 0 ? 0 : 1;
    px(s, cx - 5, torsoY + 13 + swimBob, 10, 4, pants);
    px(s, cx - 5, torsoY + 15 + swimBob, 10, 1, '#fef08a');
  } else if (pose === 'sit') {
    const sy = baseY - 16;
    // Far leg tucked forward-right
    px(s, cx + 1, sy, 5, 5, pantsLo);
    px(s, cx + 3, sy + 4, 4, 6, pantsLo);
    px(s, cx + 3, sy + 9, 6, 3, shoesLo);
    px(s, cx + 7, sy + 10, 2, 2, '#d4d4d8');
    // Near leg foreground staggered slightly left-down
    px(s, cx - 5, sy + 2, 5, 5, pants);
    px(s, cx - 3, sy + 6, 4, 6, pants);
    px(s, cx - 2, sy + 6, 2, 5, pantsHi);
    px(s, cx - 3, sy + 11, 6, 3, shoes);
    px(s, cx - 2, sy + 11, 3, 1, shoesHi);
    px(s, cx + 1, sy + 12, 2, 2, '#f8fafc');
  } else {
    // Far leg (back-right, slightly higher by 2px for 3/4 depth)
    const flx = cx + 1 + farLegDX;
    const fly = baseY - 17 + farLegDY;
    px(s, flx, fly, 4, 11, hasSwimwear ? skinLo : pantsLo);
    px(s, flx + 1, fly + 1, 2, 9, hasSwimwear ? skin : pants);
    if (hasSwimwear) {
      px(s, flx, fly, 4, 5, pantsLo); // Swim shorts upper leg
    }
    // Angled shoe/sandal pointing down-right
    px(s, flx, fly + 11, 6, 3, shoesLo);
    if (!hasSwimwear) px(s, flx + 4, fly + 12, 2, 2, '#e2e8f0');

    // Near leg (foreground-left, 2px lower for true staggered isometric stance)
    const nlx = cx - 5 + nearLegDX;
    const nly = baseY - 15 + nearLegDY;
    px(s, nlx, nly, 5, 11, hasSwimwear ? skin : pants);
    px(s, nlx + 1, nly + 1, 2, 9, hasSwimwear ? skinHi : pantsHi);
    px(s, nlx, nly + 1, 1, 9, hasSwimwear ? skinLo : pantsLo);
    if (hasSwimwear) {
      px(s, nlx, nly, 5, 5, pants);
      px(s, nlx + 1, nly, 3, 4, pantsHi);
    }
    // Near angled isometric sneaker/sandal
    px(s, nlx, nly + 11, 7, 3, shoes);
    px(s, nlx + 1, nly + 11, 4, 1, shoesHi);
    if (!hasSwimwear) px(s, nlx + 5, nly + 12, 2, 2, '#f8fafc');
  }

  // 2. FAR ARM (behind torso)
  drawFarArm();

  // 3. ANGLED ISOMETRIC TORSO & SHOULDERS
  // Tapered, sloped 3/4 silhouette instead of a flat rectangle
  px(s, cx - 6, torsoY + 1, 12, 15, shirt);
  px(s, cx - 5, torsoY, 9, 2, shirtHi); // Angled top shoulder line
  px(s, cx - 6, torsoY + 2, 2, 13, shirtLo); // Back edge shading
  px(s, cx + 2, torsoY + 2, 3, 13, shirtHi); // Lit 3/4 front chest
  px(s, cx - 5, torsoY + 15, 10, 2, shirtDeep); // Hem shadow

  if (inWater) {
    // Classic Habbo yellow duck swim ring around waist at waterline
    const swimBob = animStep % 2 === 0 ? 0 : 1;
    px(s, cx - 6, torsoY + 9 + swimBob, 12, 4, pants);
    px(s, cx - 9, torsoY + 11 + swimBob, 18, 5, '#eab308');
    px(s, cx - 8, torsoY + 12 + swimBob, 16, 3, '#facc15');
    px(s, cx - 6, torsoY + 12 + swimBob, 10, 2, '#fef08a');
    // Mini duck head & orange beak perched on front of float ring
    if (!facingBack) {
      px(s, cx + 4, torsoY + 7 + swimBob, 5, 5, '#facc15');
      px(s, cx + 5, torsoY + 8 + swimBob, 3, 2, '#fef9c3');
      px(s, cx + 9, torsoY + 9 + swimBob, 3, 2, '#f97316');
      px(s, cx + 7, torsoY + 8 + swimBob, 1, 1, '#141414');
    }
  } else if (wearingSwimwear) {
    // Bright resort swimwear trunks/suit on deck
    px(s, cx - 6, torsoY + 11, 12, 5, pants);
    px(s, cx - 5, torsoY + 12, 10, 2, pantsHi);
    px(s, cx - 6, torsoY + 11, 12, 1, '#fef08a');
  } else if (!facingBack) {
    if (look.shirtStyle === 'suit') {
      // Crisply angled suit jacket with white V-shirt, diagonal lapels, and necktie
      px(s, cx + 1, torsoY + 1, 4, 8, '#f8fafc');
      px(s, cx + 2, torsoY + 2, 2, 8, '#b91c1c'); // Tie
      px(s, cx + 2, torsoY + 1, 2, 2, '#991b1b'); // Tie knot
      px(s, cx, torsoY + 2, 1, 6, shirtDeep); // Left lapel
      px(s, cx + 4, torsoY + 2, 1, 6, shirtDeep); // Right lapel
      px(s, cx + 2, torsoY + 11, 1, 1, '#cbd5e1'); // Suit button
    } else if (look.shirtStyle === 'hoodie') {
      px(s, cx + 1, torsoY + 1, 1, 6, '#f8fafc');
      px(s, cx + 3, torsoY + 1, 1, 6, '#f8fafc');
      px(s, cx - 2, torsoY + 10, 7, 4, shirtLo); // Front pocket
      px(s, cx - 4, torsoY - 1, 8, 2, shirtLo); // Hood rim
    } else if (look.shirtStyle === 'stripes') {
      px(s, cx - 5, torsoY + 4, 11, 2, '#f8fafc');
      px(s, cx - 5, torsoY + 9, 11, 2, '#f8fafc');
      px(s, cx - 5, torsoY + 13, 10, 1, '#f8fafc');
    } else if (look.shirtStyle === 'tank') {
      px(s, cx - 1, torsoY + 1, 5, 2, skin);
      px(s, cx - 5, torsoY + 1, 2, 4, skin);
      px(s, cx + 4, torsoY + 1, 2, 4, skin);
    } else {
      // Classic tee angled V-neck collar
      px(s, cx + 1, torsoY + 1, 4, 2, skin);
      px(s, cx + 2, torsoY + 3, 2, 1, skinLo);
    }
  } else {
    // Back of hoodie/suit seam
    if (look.shirtStyle === 'hoodie') {
      px(s, cx - 5, torsoY, 10, 4, shirtLo);
      px(s, cx - 4, torsoY + 1, 7, 2, shirtDeep);
    } else if (look.shirtStyle === 'suit') {
      px(s, cx - 1, torsoY + 10, 1, 6, shirtDeep);
    }
  }

  // 4. NEAR ARM (drawn over torso edge for authentic 3/4 overlap)
  drawNearArm();

  // 5. ROUNDED / OVAL 3/4 ISOMETRIC HEAD + VISIBLE SIDE EAR
  const hx = cx - 7;
  const hy = torsoY - 18;
  // Chamfered oval silhouette (no boxy corners!)
  px(s, hx + 2, hy, 11, 1, skinHi);
  px(s, hx + 1, hy + 1, 13, 2, skin);
  px(s, hx, hy + 3, 15, 11, skin);
  px(s, hx + 1, hy + 14, 13, 2, skin);
  px(s, hx + 2, hy + 16, 10, 2, skinLo);
  px(s, hx + 4, hy + 17, 6, 1, skinDeep);

  // 3/4 volumetric cheek/crown shading
  px(s, hx + 3, hy + 1, 8, 2, skinHi);
  px(s, hx, hy + 4, 2, 10, skinLo);
  px(s, hx + 12, hy + 4, 3, 9, skinHi);
  px(s, hx + 2, hy + 14, 9, 2, skinLo);

  // Visible side ear (on the left side of the 3/4 head)
  px(s, hx - 2, hy + 8, 2, 4, skin);
  px(s, hx - 1, hy + 9, 1, 2, skinLo);

  // 6. ASYMMETRIC 3/4 FACE DETAILS (shifted toward right cheek)
  if (!facingBack) {
    const eyeY = hy + 8;
    const nearEyeX = hx + 7;
    const farEyeX = hx + 12;

    if (look.expression === 'serene') {
      px(s, nearEyeX, eyeY + 1, 2, 1, '#141414');
      px(s, farEyeX, eyeY + 1, 2, 1, '#141414');
      px(s, nearEyeX + 2, hy + 13, 3, 1, '#9a3412');
    } else {
      // Classic vertical Habbo eyes with white shine pixel
      px(s, nearEyeX, eyeY, 2, 3, '#141414');
      px(s, nearEyeX, eyeY, 1, 1, '#ffffff');
      px(s, farEyeX, eyeY, 2, 3, '#141414');
      px(s, farEyeX, eyeY, 1, 1, '#ffffff');

      if (look.expression === 'cool') {
        px(s, nearEyeX - 1, eyeY - 2, 3, 1, hairLo);
        px(s, farEyeX - 1, eyeY - 2, 3, 1, hairLo);
        px(s, nearEyeX + 2, hy + 13, 4, 1, '#7c2d12');
      } else if (look.expression === 'cheeky') {
        px(s, nearEyeX + 1, hy + 13, 5, 2, '#991b1b');
        px(s, nearEyeX + 2, hy + 13, 3, 1, '#ffffff');
      } else {
        // happy
        px(s, nearEyeX + 1, hy + 13, 4, 1, '#7c2d12');
        px(s, nearEyeX + 2, hy + 14, 2, 1, '#dc2626');
      }
    }
    // Subtle nose highlight pixel
    px(s, hx + 11, hy + 10, 1, 2, skinLo);
  }

  // 7. MULTI-LAYERED 3/4 PIXEL HAIR WITH VOLUME, SHADING & BANGS
  if (facingBack) {
    // Full back coverage + nape contour
    px(s, hx + 1, hy - 2, 13, 3, hairHi);
    px(s, hx - 1, hy + 1, 16, 12, hair);
    px(s, hx - 1, hy + 3, 3, 9, hairLo);
    if (look.hairStyle === 'long') {
      px(s, hx - 1, hy + 11, 15, 11, hair);
      px(s, hx, hy + 12, 3, 10, hairLo);
      px(s, hx + 10, hy + 12, 2, 9, hairHi);
    } else if (look.hairStyle === 'mohawk') {
      // Shaved sides, tall crest
      px(s, hx, hy + 2, 14, 11, skinLo);
      px(s, hx + 5, hy - 6, 4, 16, hair);
      px(s, hx + 6, hy - 5, 2, 13, hairHi);
    } else if (look.hairStyle === 'spiky') {
      px(s, hx + 2, hy - 5, 3, 4, hairHi);
      px(s, hx + 7, hy - 6, 3, 5, hair);
      px(s, hx + 11, hy - 4, 3, 3, hairHi);
    }
  } else {
    if (look.hairStyle === 'spiky') {
      px(s, hx + 1, hy - 2, 13, 6, hair);
      px(s, hx - 1, hy + 2, 4, 6, hairLo); // Back/sideburn
      px(s, hx + 3, hy + 3, 11, 3, hairHi); // Angled front bangs
      px(s, hx + 2, hy - 5, 3, 4, hairHi);
      px(s, hx + 6, hy - 6, 3, 5, hair);
      px(s, hx + 10, hy - 5, 3, 4, hairHi);
    } else if (look.hairStyle === 'quiff') {
      px(s, hx, hy - 1, 14, 5, hair);
      px(s, hx - 1, hy + 2, 3, 6, hairLo); // Tapered sideburn
      px(s, hx + 5, hy - 5, 9, 5, hair); // Swept 3/4 quiff volume
      px(s, hx + 6, hy - 4, 7, 2, hairHi);
      px(s, hx + 4, hy + 3, 9, 2, hairLo);
    } else if (look.hairStyle === 'bob') {
      px(s, hx, hy - 2, 15, 6, hair);
      px(s, hx + 2, hy - 1, 10, 2, hairHi);
      px(s, hx - 2, hy + 3, 5, 12, hairLo); // Framing back lock
      px(s, hx + 13, hy + 3, 2, 11, hair); // Far front lock
      px(s, hx + 4, hy + 3, 9, 3, hairHi); // Bangs
    } else if (look.hairStyle === 'long') {
      px(s, hx, hy - 2, 15, 6, hair);
      px(s, hx + 2, hy - 1, 10, 2, hairHi);
      px(s, hx - 2, hy + 3, 5, 19, hairLo); // Flowing back curtain
      px(s, hx - 1, hy + 5, 2, 16, hair);
      px(s, hx + 13, hy + 3, 2, 17, hair);
      px(s, hx + 5, hy + 3, 8, 3, hairHi);
    } else if (look.hairStyle === 'mohawk') {
      px(s, hx + 4, hy - 7, 6, 11, hair);
      px(s, hx + 6, hy - 6, 3, 9, hairHi);
      px(s, hx, hy + 3, 2, 4, hairLo);
    } else {
      // curls
      px(s, hx - 1, hy - 3, 16, 7, hair);
      px(s, hx + 2, hy - 3, 4, 3, hairHi);
      px(s, hx + 8, hy - 2, 4, 3, hairHi);
      px(s, hx - 2, hy + 3, 4, 6, hairLo);
      px(s, hx + 13, hy + 3, 2, 5, hair);
    }
  }

  // 8. 3/4 ANGLED ACCESSORIES
  if (look.accessory === 'crown') {
    px(s, hx + 2, hy - 6, 11, 5, '#facc15');
    px(s, hx + 3, hy - 8, 2, 3, '#fef08a');
    px(s, hx + 7, hy - 9, 2, 4, '#fef08a');
    px(s, hx + 11, hy - 8, 2, 3, '#facc15');
    px(s, hx + 7, hy - 4, 2, 2, '#dc2626');
    px(s, hx + 2, hy - 2, 11, 1, '#ca8a04');
  } else if (look.accessory === 'headphones') {
    px(s, hx + 1, hy - 3, 13, 3, '#475569');
    px(s, hx - 2, hy + 6, 4, 7, '#1e293b');
    px(s, hx - 1, hy + 7, 2, 4, '#38bdf8');
    px(s, hx + 13, hy + 6, 3, 6, '#1e293b');
    px(s, hx + 14, hy + 7, 1, 3, '#38bdf8');
  } else if (look.accessory === 'sunglasses' && !facingBack) {
    px(s, hx + 6, hy + 7, 5, 4, '#09090b');
    px(s, hx + 11, hy + 7, 5, 4, '#09090b');
    px(s, hx + 7, hy + 8, 2, 1, '#e4e4e7');
    px(s, hx + 12, hy + 8, 2, 1, '#e4e4e7');
    px(s, hx, hy + 8, 6, 1, '#18181b'); // Temple arm to ear
  } else if (look.accessory === 'cap') {
    px(s, hx, hy - 3, 14, 6, '#dc2626');
    px(s, hx + 2, hy - 3, 9, 2, '#f87171');
    if (!facingBack) {
      // Angled 3/4 cap brim jutting toward +x
      px(s, hx + 6, hy + 2, 11, 3, '#991b1b');
      px(s, hx + 7, hy + 2, 9, 1, '#ef4444');
    }
  }

  // Mirror horizontally for SW (dir=1) and NW (dir=2)
  const oriented = makeOffscreen(W, H);
  if (mirrorX) {
    oriented.ctx.translate(W, 0);
    oriented.ctx.scale(-1, 1);
  }
  oriented.ctx.drawImage(scratch, 0, 0);

  // 9. Draw soft isometric oval ground shadow (or turquoise water ripple if submerged in pool)
  if (inWater) {
    ctx.strokeStyle = animStep % 2 === 0 ? 'rgba(224, 242, 254, 0.92)' : 'rgba(125, 211, 252, 0.78)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, baseY - 11, 14 + (animStep % 2) * 2, 6 + (animStep % 2), 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(15, 20, 35, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 1, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 10. Crisp 1px #141414 silhouette outline pass around all opaque character pixels
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
  if (inWater) {
    // Submerge lower torso below pool surface & add crisp white water foam collar
    const clipH = baseY - 14;
    ctx.drawImage(outlined.canvas, 0, 0, W, clipH, 0, 8, W, clipH);
    px(ctx, cx - 10, baseY - 7, 20, 2, 'rgba(224, 242, 254, 0.85)');
  } else {
    ctx.drawImage(outlined.canvas, 0, 0);
  }

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Renders just the 3/4 isometric head & collar portrait (26x26) for Speech Bubbles, Friends, and Housekeeping rows.
 */
export function getAvatarHeadSprite(look: LookConfig): HTMLCanvasElement {
  const key = `head34|${getLookHash(look)}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const full = getAvatarSprite(look, 0, 'stand', 0);
  const { canvas, ctx } = makeOffscreen(26, 26);
  ctx.drawImage(full, 9, 6, 26, 26, 0, 0, 26, 26);
  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Renders detailed pixel-art isometric furniture onto a 68x86 offscreen canvas.
 * Tile base diamond center is at (34, 68).
 */
export function getFurniSprite(
  rawFurniId: string,
  dir: Direction,
  state = 0,
  animTick = 0
): HTMLCanvasElement {
  const furniId = resolveFurniSpriteId(rawFurniId);
  const frame = animTick % 3;
  const key = `furni|${furniId}|${dir}|${state}|${frame}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const { canvas, ctx } = makeOffscreen(72, 92);
  const cx = 36;
  const cy = 72;

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
    const ox = cx + offsetX;
    const oy = cy + offsetY - topY;
    // Top face
    drawIsoPoly(
      ctx,
      [
        [ox, oy - ry],
        [ox + rx, oy],
        [ox, oy + ry],
        [ox - rx, oy],
      ],
      topColor,
      OUTLINE
    );
    // Left face
    drawIsoPoly(
      ctx,
      [
        [ox - rx, oy],
        [ox, oy + ry],
        [ox, oy + ry + height],
        [ox - rx, oy + height],
      ],
      leftColor,
      OUTLINE
    );
    // Right face
    drawIsoPoly(
      ctx,
      [
        [ox, oy + ry],
        [ox + rx, oy],
        [ox + rx, oy + height],
        [ox, oy + ry + height],
      ],
      rightColor,
      OUTLINE
    );
  };

  if (furniId === 'hc_sofa') {
    // Classic red velvet HC Club Sofa with wooden feet & curved arms
    drawIsoBox(12, 10, 24, 12, '#dc2626', '#991b1b', '#b91c1c');
    // Plush seat cushion highlight dither
    drawIsoBox(15, 4, 20, 10, '#ef4444', '#b91c1c', '#dc2626');
    // Backrest oriented by dir
    if (dir === 0 || dir === 3) {
      drawIsoBox(30, 16, 12, 6, '#ef4444', '#7f1d1d', '#b91c1c', -11, -6);
    } else {
      drawIsoBox(30, 16, 12, 6, '#ef4444', '#991b1b', '#7f1d1d', 11, -6);
    }
    // Mahogany armrests & gold studs
    outlinedRect(ctx, cx - 25, cy - 22, 6, 14, '#78350f', '#b45309', '#451a03');
    outlinedRect(ctx, cx + 19, cy - 22, 6, 14, '#78350f', '#b45309', '#451a03');
    px(ctx, cx - 23, cy - 17, 2, 2, '#facc15');
    px(ctx, cx + 21, cy - 17, 2, 2, '#facc15');
  } else if (furniId === 'throne') {
    // Iconic 24k Golden Habbo Throne
    drawIsoBox(10, 10, 22, 11, '#eab308', '#a16207', '#ca8a04');
    // Crimson velvet seat cushion
    drawIsoBox(16, 5, 16, 8, '#dc2626', '#991b1b', '#b91c1c');
    // Tall ornate gold backrest
    const backShiftX = dir === 1 || dir === 2 ? 10 : -10;
    outlinedRect(ctx, cx + backShiftX - 11, cy - 58, 22, 42, '#eab308', '#fef08a', '#854d0e');
    outlinedRect(ctx, cx + backShiftX - 7, cy - 52, 14, 30, '#b91c1c', '#ef4444', '#7f1d1d');
    // Royal crown crest at top
    outlinedRect(ctx, cx + backShiftX - 5, cy - 64, 10, 6, '#facc15', '#fef9c3');
    px(ctx, cx + backShiftX - 1, cy - 62, 2, 2, '#2563eb');
    // Golden armrests
    outlinedRect(ctx, cx - 20, cy - 25, 6, 14, '#facc15', '#fef08a', '#a16207');
    outlinedRect(ctx, cx + 14, cy - 25, 6, 14, '#facc15', '#fef08a', '#a16207');
  } else if (furniId === 'majestic_chair') {
    // Walnut & gold damask armchair
    drawIsoBox(10, 8, 20, 10, '#f59e0b', '#78350f', '#92400e');
    drawIsoBox(14, 4, 15, 7, '#fcd34d', '#d97706', '#f59e0b');
    const backX = dir === 1 || dir === 2 ? 9 : -9;
    outlinedRect(ctx, cx + backX - 9, cy - 42, 18, 26, '#78350f', '#b45309', '#451a03');
    outlinedRect(ctx, cx + backX - 6, cy - 38, 12, 18, '#fbbf24', '#fef3c7', '#b45309');
  } else if (furniId === 'fire_dragon') {
    // Bronze pedestal + sculpted dragon head + animated pixel flame
    drawIsoBox(12, 12, 18, 9, '#57534e', '#292524', '#44403c');
    // Coiled dragon body
    outlinedRect(ctx, cx - 10, cy - 38, 20, 26, '#b45309', '#f59e0b', '#78350f');
    outlinedRect(ctx, cx - 12, cy - 52, 24, 16, '#92400e', '#fbbf24', '#451a03');
    // Horns & glowing eyes
    px(ctx, cx - 11, cy - 58, 3, 6, '#fde047');
    px(ctx, cx + 8, cy - 58, 3, 6, '#fde047');
    px(ctx, cx - 5, cy - 46, 3, 2, '#ef4444');
    px(ctx, cx + 3, cy - 46, 3, 2, '#ef4444');
    // Animated fire breath when active (state === 1)
    if (state === 1) {
      const fShift = frame === 0 ? 0 : frame === 1 ? -2 : 2;
      const fx = dir === 1 ? cx - 22 : cx + 10;
      px(ctx, fx, cy - 42 + fShift, 12, 8, '#ea580c');
      px(ctx, fx + 2, cy - 40 + fShift, 8, 5, '#facc15');
      px(ctx, fx + 4, cy - 39 + fShift, 4, 2, '#fef9c3');
    }
  } else if (furniId === 'mode_bar') {
    drawIsoBox(24, 24, 26, 13, '#cbd5e1', '#475569', '#64748b');
    // Top stainless steel bevel & chrome footrail
    drawIsoBox(26, 3, 26, 13, '#f1f5f9', '#94a3b8', '#cbd5e1');
    px(ctx, cx - 18, cy - 4, 14, 2, '#e2e8f0');
    px(ctx, cx + 6, cy - 36, 8, 10, '#38bdf8');
    outlinedRect(ctx, cx - 8, cy - 34, 6, 8, '#94a3b8', '#f8fafc');
  } else if (furniId === 'exec_desk') {
    // 4 oak legs
    outlinedRect(ctx, cx - 18, cy - 14, 4, 14, '#78350f');
    outlinedRect(ctx, cx + 14, cy - 14, 4, 14, '#78350f');
    outlinedRect(ctx, cx - 2, cy - 6, 4, 12, '#451a03');
    drawIsoBox(18, 5, 24, 12, '#d97706', '#78350f', '#92400e');
    // Coffee mug on table
    outlinedRect(ctx, cx - 3, cy - 26, 6, 6, '#f8fafc', '#ffffff', '#cbd5e1');
    px(ctx, cx - 2, cy - 25, 4, 2, '#78350f');
  } else if (furniId === 'fireplace') {
    drawIsoBox(14, 14, 26, 13, '#78716c', '#44403c', '#57534e');
    outlinedRect(ctx, cx - 18, cy - 58, 36, 44, '#78716c', '#a8a29e', '#44403c');
    // Mantelpiece
    outlinedRect(ctx, cx - 21, cy - 62, 42, 6, '#57534e', '#d6d3d1', '#292524');
    // Hearth opening
    outlinedRect(ctx, cx - 11, cy - 38, 22, 24, '#1c1917');
    // Animated embers & flames
    const h = 8 + (frame % 3) * 3;
    px(ctx, cx - 7, cy - 20, 14, 4, '#78350f');
    px(ctx, cx - 5, cy - 20 - h, 10, h, '#ea580c');
    px(ctx, cx - 3, cy - 19 - Math.max(4, h - 3), 6, Math.max(4, h - 3), '#facc15');
  } else if (furniId === 'jukebox') {
    drawIsoBox(10, 10, 20, 10, '#451a03', '#292524', '#1c1917');
    outlinedRect(ctx, cx - 15, cy - 58, 30, 48, '#78350f', '#b45309', '#451a03');
    // Neon arch rainbow
    const neonColors = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#c084fc'];
    const cShift = animTick % neonColors.length;
    outlinedRect(ctx, cx - 11, cy - 54, 22, 22, neonColors[cShift]);
    outlinedRect(ctx, cx - 7, cy - 50, 14, 14, '#0f172a');
    px(ctx, cx - 4, cy - 46, 8, 6, '#f8fafc');
    // Speaker grille
    for (let y = -28; y <= -16; y += 3) {
      px(ctx, cx - 10, cy + y, 20, 1, '#facc15');
    }
    if (state === 1) {
      // Musical pixel note floating
      const ny = cy - 68 - (frame * 3);
      px(ctx, cx + 6, ny, 2, 6, '#38bdf8');
      px(ctx, cx + 4, ny + 4, 3, 3, '#38bdf8');
    }
  } else if (furniId === 'palm_tree') {
    // Terracotta pot
    outlinedRect(ctx, cx - 10, cy - 16, 20, 16, '#c2410c', '#ea580c', '#7c2d12');
    outlinedRect(ctx, cx - 12, cy - 18, 24, 4, '#ea580c', '#fb923c', '#9a3412');
    // Ringed palm trunk
    for (let i = 0; i < 6; i++) {
      outlinedRect(ctx, cx - 3 + (i % 2), cy - 22 - i * 6, 6, 7, i % 2 === 0 ? '#92400e' : '#78350f');
    }
    // Tropical fronds
    const frondY = cy - 62;
    outlinedRect(ctx, cx - 24, frondY + 4, 18, 6, '#15803d', '#22c55e');
    outlinedRect(ctx, cx + 6, frondY + 4, 18, 6, '#15803d', '#22c55e');
    outlinedRect(ctx, cx - 18, frondY - 4, 16, 6, '#16a34a', '#4ade80');
    outlinedRect(ctx, cx + 2, frondY - 4, 16, 6, '#16a34a', '#4ade80');
    outlinedRect(ctx, cx - 7, frondY - 10, 14, 7, '#22c55e', '#86efac');
  } else if (furniId === 'bonsai') {
    outlinedRect(ctx, cx - 11, cy - 12, 22, 12, '#1d4ed8', '#3b82f6', '#1e3a8a');
    outlinedRect(ctx, cx - 3, cy - 28, 6, 17, '#78350f', '#92400e');
    outlinedRect(ctx, cx - 15, cy - 36, 16, 9, '#15803d', '#4ade80');
    outlinedRect(ctx, cx - 2, cy - 42, 16, 9, '#16a34a', '#86efac');
    outlinedRect(ctx, cx - 9, cy - 47, 14, 8, '#22c55e', '#bbf7d0');
  } else if (furniId === 'holo_dice') {
    drawIsoBox(10, 10, 16, 8, '#334155', '#0f172a', '#1e293b');
    const glow = frame === 1 ? '#67e8f9' : '#22d3ee';
    drawIsoBox(30, 18, 13, 7, glow, '#0891b2', '#06b6d4');
    // Pip value displayed in center
    const val = Math.max(1, Math.min(6, state || 1));
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(val), cx, cy - 22);
  } else if (furniId === 'persian_rug') {
    drawIsoPoly(
      ctx,
      [
        [cx, cy - 14],
        [cx + 28, cy],
        [cx, cy + 14],
        [cx - 28, cy],
      ],
      '#991b1b',
      '#facc15'
    );
    drawIsoPoly(
      ctx,
      [
        [cx, cy - 9],
        [cx + 18, cy],
        [cx, cy + 9],
        [cx - 18, cy],
      ],
      '#dc2626',
      '#fef08a'
    );
    drawIsoPoly(
      ctx,
      [
        [cx, cy - 4],
        [cx + 8, cy],
        [cx, cy + 4],
        [cx - 8, cy],
      ],
      '#f59e0b'
    );
  } else if (furniId === 'petal_patch') {
    // Classic Habbo Meadow Petal Patch (walkable turf + white daisies + dither blades)
    drawIsoPoly(
      ctx,
      [
        [cx, cy - 15],
        [cx + 30, cy],
        [cx, cy + 15],
        [cx - 30, cy],
      ],
      '#228b22',
      '#14532d'
    );
    drawIsoPoly(
      ctx,
      [
        [cx, cy - 13],
        [cx + 26, cy],
        [cx, cy + 13],
        [cx - 26, cy],
      ],
      '#34a832'
    );
    // Grass blade dither pixels
    const tufts: [number, number, string][] = [
      [-14, -2, '#4ade80'],
      [-8, 4, '#166534'],
      [10, -3, '#4ade80'],
      [16, 2, '#166534'],
      [0, -7, '#86efac'],
      [-3, 6, '#15803d'],
      [6, 5, '#4ade80'],
    ];
    for (const [dx, dy, col] of tufts) {
      px(ctx, cx + dx, cy + dy, 2, 2, col);
    }
    // Iconic white daisies with yellow centers
    const daisies: [number, number][] = [
      [-11, 0],
      [2, -5],
      [12, 1],
      [-2, 5],
    ];
    for (const [dx, dy] of daisies) {
      px(ctx, cx + dx - 1, cy + dy - 1, 4, 4, '#ffffff');
      px(ctx, cx + dx, cy + dy, 2, 2, '#facc15');
    }
  } else if (furniId === 'amber_lamp') {
    // Classic Habbo Red Amber Lamp
    drawIsoBox(8, 8, 16, 8, '#78350f', '#451a03', '#5c2d0c');
    // Brass pedestal stem
    outlinedRect(ctx, cx - 4, cy - 26, 8, 18, '#d97706', '#fde047', '#92400e');
    // Glowing crimson crystal globe
    const glow = state === 1 ? (frame === 1 ? '#ef4444' : '#f87171') : '#991b1b';
    const core = state === 1 ? '#fecaca' : '#dc2626';
    outlinedRect(ctx, cx - 12, cy - 52, 24, 26, glow, core, '#7f1d1d');
    px(ctx, cx - 8, cy - 48, 6, 8, '#ffffff');
    px(ctx, cx - 5, cy - 38, 10, 8, state === 1 ? '#fca5a5' : '#b91c1c');
    // Top bronze finial
    outlinedRect(ctx, cx - 4, cy - 57, 8, 5, '#f59e0b', '#fef08a');
  } else if (furniId === 'golden_fountain') {
    // 24k Golden Habbo Fountain with animated pixel water
    drawIsoBox(12, 12, 24, 12, '#eab308', '#a16207', '#ca8a04');
    // Basin water pool
    drawIsoPoly(
      ctx,
      [
        [cx, cy - 20],
        [cx + 18, cy - 11],
        [cx, cy - 2],
        [cx - 18, cy - 11],
      ],
      '#38bdf8',
      '#0284c7'
    );
    // Central gold pillar & upper bowl
    outlinedRect(ctx, cx - 4, cy - 40, 8, 28, '#facc15', '#fef08a', '#a16207');
    outlinedRect(ctx, cx - 12, cy - 46, 24, 7, '#eab308', '#fef08a', '#854d0e');
    // Animated water arcs
    const sprayY = cy - 56 - (frame % 2) * 3;
    px(ctx, cx - 2, sprayY, 4, 10, '#bae6fd');
    px(ctx, cx - 9, cy - 42 + frame * 2, 2, 12, '#7dd3fc');
    px(ctx, cx + 7, cy - 42 + ((frame + 1) % 3) * 2, 2, 12, '#7dd3fc');
    px(ctx, cx - 13, cy - 14 + frame, 3, 2, '#e0f2fe');
    px(ctx, cx + 10, cy - 13 - frame, 3, 2, '#e0f2fe');
  } else if (furniId === 'imperial_teleporter') {
    // Ornate Mahogany & Crimson Velvet Teleport Booth
    drawIsoBox(8, 8, 22, 11, '#451a03', '#291203', '#3b1806');
    outlinedRect(ctx, cx - 15, cy - 64, 30, 56, '#78350f', '#b45309', '#451a03');
    // Arched velvet door + shimmer
    outlinedRect(ctx, cx - 10, cy - 54, 20, 44, '#991b1b', '#dc2626', '#450a0a');
    if (state === 1) {
      const shimmerY = cy - 50 + (frame * 12);
      px(ctx, cx - 8, shimmerY, 16, 4, '#fef08a');
    }
    // Gold pediment & handle
    outlinedRect(ctx, cx - 17, cy - 68, 34, 6, '#eab308', '#fef08a', '#854d0e');
    px(ctx, cx + 5, cy - 34, 3, 4, '#facc15');
  } else if (furniId === 'gold_trophy' || furniId === 'silver_trophy' || furniId === 'bronze_trophy') {
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
        ? '#f8fafc'
        : '#fed7aa';
    const cupDark =
      furniId === 'gold_trophy'
        ? '#854d0e'
        : furniId === 'silver_trophy'
        ? '#64748b'
        : '#7c2d12';
    // Marble / Walnut plinth + Habbo Trophy Chalice
    drawIsoBox(16, 16, 14, 7, '#e2e8f0', '#64748b', '#94a3b8');
    // Engraved plaque
    px(ctx, cx - 6, cy - 10, 12, 5, cupHi);
    px(ctx, cx - 5, cy - 9, 10, 1, cupDark);
    // Cup stem & chalice bowl
    outlinedRect(ctx, cx - 3, cy - 30, 6, 12, cupMain, cupHi, cupDark);
    outlinedRect(ctx, cx - 10, cy - 48, 20, 18, cupMain, cupHi, cupDark);
    // Handles
    outlinedRect(ctx, cx - 14, cy - 46, 4, 10, cupMain, cupHi, cupDark);
    outlinedRect(ctx, cx + 10, cy - 46, 4, 10, cupMain, cupHi, cupDark);
    // Specular glint
    px(ctx, cx - 6, cy - 44, 3, 8, '#ffffff');
  } else if (furniId === 'banzai_barrier') {
    // Glowing Neon Battle Banzai cyber rail pylon
    drawIsoBox(10, 10, 18, 9, '#1e1b4b', '#09090b', '#312e81');
    const neonCol = frame % 2 === 0 ? '#22d3ee' : '#ec4899';
    outlinedRect(ctx, cx - 14, cy - 34, 6, 26, '#334155', '#94a3b8', '#0f172a');
    outlinedRect(ctx, cx + 8, cy - 34, 6, 26, '#334155', '#94a3b8', '#0f172a');
    outlinedRect(ctx, cx - 12, cy - 30, 24, 6, neonCol, '#ffffff', '#0f172a');
    outlinedRect(ctx, cx - 12, cy - 20, 24, 4, '#38bdf8', '#e0f2fe', '#0369a1');
    px(ctx, cx - 13, cy - 37, 4, 3, neonCol);
    px(ctx, cx + 9, cy - 37, 4, 3, neonCol);
  } else if (furniId === 'mode_sofa') {
    // Sleek steel-frame Mode Black Sofa
    drawIsoBox(11, 9, 24, 12, '#334155', '#0f172a', '#1e293b');
    drawIsoBox(15, 4, 20, 10, '#475569', '#1e293b', '#334155');
    if (dir === 0 || dir === 3) {
      drawIsoBox(29, 15, 11, 6, '#334155', '#0f172a', '#1e293b', -11, -6);
    } else {
      drawIsoBox(29, 15, 11, 6, '#334155', '#1e293b', '#0f172a', 11, -6);
    }
    // Brushed steel armrests
    outlinedRect(ctx, cx - 25, cy - 22, 6, 15, '#94a3b8', '#f1f5f9', '#475569');
    outlinedRect(ctx, cx + 19, cy - 22, 6, 15, '#94a3b8', '#f1f5f9', '#475569');
  } else if (furniId === 'pod_chair') {
    // Glossy 2000s Aqua Pod Chair
    drawIsoBox(8, 8, 15, 8, '#0284c7', '#0369a1', '#0ea5e9');
    outlinedRect(ctx, cx - 15, cy - 34, 30, 24, '#38bdf8', '#bae6fd', '#0284c7');
    outlinedRect(ctx, cx - 11, cy - 28, 22, 14, '#7dd3fc', '#e0f2fe', '#0ea5e9');
    // Glossy white plastic highlight
    px(ctx, cx - 12, cy - 31, 6, 3, '#ffffff');
  } else if (furniId === 'lodge_bench') {
    // Hand-carved Lodge Pine Bench
    outlinedRect(ctx, cx - 18, cy - 12, 4, 12, '#78350f');
    outlinedRect(ctx, cx + 14, cy - 12, 4, 12, '#78350f');
    drawIsoBox(14, 6, 24, 12, '#b45309', '#78350f', '#92400e');
    // Cozy tartan/checkered cushion
    drawIsoBox(17, 3, 18, 9, '#b91c1c', '#7f1d1d', '#991b1b');
    px(ctx, cx - 4, cy - 17, 8, 2, '#fde047');
  } else if (furniId === 'area_table') {
    // Chunky Area Coffee Table with fruit bowl
    outlinedRect(ctx, cx - 20, cy - 16, 5, 16, '#92400e', '#d97706');
    outlinedRect(ctx, cx + 15, cy - 16, 5, 16, '#92400e', '#d97706');
    drawIsoBox(18, 6, 24, 12, '#d97706', '#78350f', '#b45309');
    // Pixel fruit bowl
    outlinedRect(ctx, cx - 7, cy - 24, 14, 6, '#334155', '#64748b');
    px(ctx, cx - 5, cy - 28, 4, 4, '#ef4444');
    px(ctx, cx, cy - 29, 4, 5, '#facc15');
    px(ctx, cx + 3, cy - 27, 4, 3, '#22c55e');
  } else if (furniId === 'mini_fridge') {
    // Iced Mini Fridge (state === 1 shows door ajar with sodas!)
    drawIsoBox(34, 34, 18, 9, '#e0f2fe', '#7dd3fc', '#bae6fd');
    outlinedRect(ctx, cx - 15, cy - 42, 30, 38, '#f0f9ff', '#ffffff', '#7dd3fc');
    if (state === 1) {
      // Open door revealing icy blue interior & soda cans
      outlinedRect(ctx, cx - 11, cy - 38, 16, 30, '#0284c7', '#38bdf8');
      px(ctx, cx - 9, cy - 32, 4, 6, '#ef4444');
      px(ctx, cx - 3, cy - 32, 4, 6, '#22c55e');
      px(ctx, cx - 9, cy - 20, 4, 6, '#facc15');
      px(ctx, cx - 3, cy - 20, 4, 6, '#38bdf8');
      // Swung-open door flap
      outlinedRect(ctx, cx + 6, cy - 40, 10, 34, '#bae6fd', '#ffffff', '#0ea5e9');
    } else {
      // Chrome handle + Habbo Cola magnet
      outlinedRect(ctx, cx + 7, cy - 28, 3, 10, '#64748b', '#f8fafc');
      px(ctx, cx - 7, cy - 34, 5, 5, '#dc2626');
    }
  } else if (furniId === 'arcade_cabinet') {
    // Retro Habbo Coin-Op Arcade Cabinet
    drawIsoBox(10, 10, 18, 9, '#1e1b4b', '#0f172a', '#312e81');
    outlinedRect(ctx, cx - 15, cy - 62, 30, 52, '#3730a3', '#6366f1', '#1e1b4b');
    // Glowing Marquee Sign
    outlinedRect(ctx, cx - 13, cy - 60, 26, 8, '#facc15', '#fef08a', '#ca8a04');
    px(ctx, cx - 9, cy - 57, 18, 2, '#dc2626');
    // Animated CRT Game Screen
    outlinedRect(ctx, cx - 11, cy - 49, 22, 18, '#020617');
    const alienX = cx - 6 + frame * 4;
    px(ctx, alienX, cy - 44, 4, 4, '#4ade80');
    px(ctx, cx - 5, cy - 36, 10, 2, '#38bdf8');
    px(ctx, cx - 1, cy - 40 + (frame % 2) * 2, 2, 3, '#facc15');
    // Control deck & joystick
    outlinedRect(ctx, cx - 14, cy - 29, 28, 7, '#475569', '#94a3b8');
    px(ctx, cx - 8, cy - 32, 3, 4, '#ef4444');
    px(ctx, cx + 3, cy - 27, 3, 2, '#facc15');
    px(ctx, cx + 8, cy - 27, 3, 2, '#22c55e');
  } else if (furniId === 'plasma_tv') {
    // Wide Habbo Plasma TV on metallic stand
    drawIsoBox(8, 8, 16, 8, '#334155', '#0f172a', '#1e293b');
    outlinedRect(ctx, cx - 3, cy - 20, 6, 12, '#64748b', '#cbd5e1');
    outlinedRect(ctx, cx - 23, cy - 52, 46, 32, '#18181b', '#52525b', '#09090b');
    // Animated screen broadcast
    const channels = ['#0284c7', '#7c3aed', '#059669'];
    const bgScreen = state === 1 ? channels[frame % channels.length] : '#09090b';
    outlinedRect(ctx, cx - 19, cy - 48, 38, 24, bgScreen);
    if (state === 1) {
      px(ctx, cx - 14 + frame * 4, cy - 42, 8, 10, '#fde047');
      px(ctx, cx - 17, cy - 29, 34, 3, '#ffffff');
      px(ctx, cx - 15, cy - 28, 14, 1, '#dc2626');
    }
    px(ctx, cx + 16, cy - 22, 2, 2, state === 1 ? '#22c55e' : '#ef4444');
  } else if (furniId === 'lava_lamp') {
    // Groovy Magenta & Cyan Lava Lamp
    drawIsoBox(6, 6, 12, 6, '#334155', '#0f172a', '#1e293b');
    outlinedRect(ctx, cx - 7, cy - 20, 14, 14, '#475569', '#94a3b8');
    outlinedRect(ctx, cx - 6, cy - 48, 12, 28, state === 1 ? '#312e81' : '#1e293b', '#6366f1');
    if (state === 1) {
      // Floating wax blobs
      const b1Y = cy - 28 - frame * 5;
      const b2Y = cy - 42 + frame * 4;
      px(ctx, cx - 3, b1Y, 6, 6, '#f472b6');
      px(ctx, cx - 2, b2Y, 5, 5, '#22d3ee');
    }
    outlinedRect(ctx, cx - 4, cy - 54, 8, 6, '#64748b', '#cbd5e1');
  } else if (furniId === 'disco_floor') {
    // Walkable Color-Cycling Pixel Disco Tile
    const palette = [
      ['#ec4899', '#38bdf8', '#facc15', '#a855f7'],
      ['#38bdf8', '#facc15', '#a855f7', '#ec4899'],
      ['#facc15', '#a855f7', '#ec4899', '#38bdf8'],
    ][frame % 3];
    drawIsoPoly(
      ctx,
      [
        [cx, cy - 15],
        [cx + 30, cy],
        [cx, cy + 15],
        [cx - 30, cy],
      ],
      '#0f172a',
      '#94a3b8'
    );
    // 4 glowing colored sub-diamonds
    drawIsoPoly(ctx, [[cx, cy - 12], [cx + 12, cy - 6], [cx, cy], [cx - 12, cy - 6]], palette[0]);
    drawIsoPoly(ctx, [[cx + 13, cy - 5], [cx + 25, cy], [cx + 13, cy + 6], [cx + 1, cy]], palette[1]);
    drawIsoPoly(ctx, [[cx - 13, cy - 5], [cx - 1, cy], [cx - 13, cy + 6], [cx - 25, cy]], palette[2]);
    drawIsoPoly(ctx, [[cx, cy + 1], [cx + 12, cy + 7], [cx, cy + 13], [cx - 12, cy + 7]], palette[3]);
  } else if (furniId === 'hc_minibar') {
    // Classic Habbo Club Mahogany & Gold Bar Fridge / Cabinet
    drawIsoBox(26, 26, 22, 11, '#78350f', '#451a03', '#5c2d0c');
    drawIsoBox(28, 3, 24, 12, '#eab308', '#a16207', '#ca8a04');
    // Bottled drinks & glasses on counter
    outlinedRect(ctx, cx - 10, cy - 42, 6, 13, '#16a34a', '#4ade80', '#14532d');
    outlinedRect(ctx, cx - 2, cy - 39, 5, 10, '#38bdf8', '#e0f2fe', '#0284c7');
    outlinedRect(ctx, cx + 6, cy - 36, 5, 7, '#f8fafc', '#ffffff');
    // Brass bar handle on cabinet
    px(ctx, cx - 6, cy - 16, 4, 2, '#facc15');
  } else if (furniId === 'hc_study_desk') {
    outlinedRect(ctx, cx - 20, cy - 16, 5, 16, '#451a03');
    outlinedRect(ctx, cx + 15, cy - 16, 5, 16, '#451a03');
    drawIsoBox(20, 6, 26, 13, '#92400e', '#451a03', '#78350f');
    // Green leather blotter + brass study lamp
    drawIsoPoly(ctx, [[cx, cy - 26], [cx + 14, cy - 19], [cx, cy - 12], [cx - 14, cy - 19]], '#166534', '#14532d');
    outlinedRect(ctx, cx + 7, cy - 38, 4, 14, '#ca8a04', '#fef08a');
    outlinedRect(ctx, cx + 2, cy - 44, 14, 7, '#16a34a', '#4ade80', '#14532d');
  } else if (furniId === 'hc_lantern') {
    drawIsoBox(8, 8, 12, 6, '#78350f', '#451a03', '#5c2d0c');
    outlinedRect(ctx, cx - 3, cy - 38, 6, 30, '#a16207', '#facc15', '#78350f');
    const glow = state === 1 ? '#fef08a' : '#d97706';
    outlinedRect(ctx, cx - 9, cy - 58, 18, 20, glow, '#ffffff', '#b45309');
    outlinedRect(ctx, cx - 11, cy - 62, 22, 5, '#451a03', '#92400e');
  } else if (furniId === 'hc_rug') {
    drawIsoPoly(ctx, [[cx, cy - 15], [cx + 30, cy], [cx, cy + 15], [cx - 30, cy]], '#14532d', '#eab308');
    drawIsoPoly(ctx, [[cx, cy - 10], [cx + 20, cy], [cx, cy + 10], [cx - 20, cy]], '#166534', '#fef08a');
    drawIsoPoly(ctx, [[cx, cy - 4], [cx + 8, cy], [cx, cy + 4], [cx - 8, cy]], '#ca8a04');
  } else if (furniId === 'jade_dragon') {
    drawIsoBox(12, 12, 18, 9, '#1e293b', '#0f172a', '#334155');
    outlinedRect(ctx, cx - 10, cy - 38, 20, 26, '#15803d', '#4ade80', '#14532d');
    outlinedRect(ctx, cx - 12, cy - 52, 24, 16, '#16a34a', '#86efac', '#14532d');
    px(ctx, cx - 11, cy - 58, 3, 6, '#bef264');
    px(ctx, cx + 8, cy - 58, 3, 6, '#bef264');
    px(ctx, cx - 5, cy - 46, 3, 2, '#facc15');
    px(ctx, cx + 3, cy - 46, 3, 2, '#facc15');
    if (state === 1) {
      const fx = dir === 1 ? cx - 22 : cx + 10;
      px(ctx, fx, cy - 42 + (frame - 1), 12, 8, '#22c55e');
      px(ctx, fx + 3, cy - 40 + (frame - 1), 6, 4, '#bbf7d0');
    }
  } else if (furniId === 'silver_dragon') {
    drawIsoBox(12, 12, 18, 9, '#334155', '#1e293b', '#475569');
    outlinedRect(ctx, cx - 10, cy - 38, 20, 26, '#94a3b8', '#f1f5f9', '#475569');
    outlinedRect(ctx, cx - 12, cy - 52, 24, 16, '#cbd5e1', '#ffffff', '#64748b');
    px(ctx, cx - 11, cy - 58, 3, 6, '#e2e8f0');
    px(ctx, cx + 8, cy - 58, 3, 6, '#e2e8f0');
    px(ctx, cx - 5, cy - 46, 3, 2, '#38bdf8');
    px(ctx, cx + 3, cy - 46, 3, 2, '#38bdf8');
    if (state === 1) {
      const fx = dir === 1 ? cx - 22 : cx + 10;
      px(ctx, fx, cy - 42 + (frame - 1), 12, 8, '#38bdf8');
      px(ctx, fx + 3, cy - 40 + (frame - 1), 6, 4, '#e0f2fe');
    }
  } else if (furniId === 'ice_throne') {
    drawIsoBox(10, 10, 22, 11, '#38bdf8', '#0284c7', '#0ea5e9');
    drawIsoBox(16, 5, 16, 8, '#e0f2fe', '#7dd3fc', '#bae6fd');
    const backShiftX = dir === 1 || dir === 2 ? 10 : -10;
    outlinedRect(ctx, cx + backShiftX - 11, cy - 58, 22, 42, '#7dd3fc', '#f0f9ff', '#0284c7');
    outlinedRect(ctx, cx + backShiftX - 7, cy - 52, 14, 30, '#0ea5e9', '#bae6fd', '#0369a1');
    outlinedRect(ctx, cx + backShiftX - 5, cy - 64, 10, 6, '#e0f2fe', '#ffffff');
    px(ctx, cx + backShiftX - 1, cy - 62, 2, 2, '#22d3ee');
    outlinedRect(ctx, cx - 20, cy - 25, 6, 14, '#7dd3fc', '#e0f2fe', '#0284c7');
    outlinedRect(ctx, cx + 14, cy - 25, 6, 14, '#7dd3fc', '#e0f2fe', '#0284c7');
  } else if (furniId === 'gold_typewriter') {
    drawIsoBox(10, 10, 18, 9, '#eab308', '#854d0e', '#ca8a04');
    // Paper sheet sticking out top
    outlinedRect(ctx, cx - 9, cy - 38, 18, 18, '#f8fafc', '#ffffff', '#cbd5e1');
    px(ctx, cx - 6, cy - 34, 12, 1, '#64748b');
    px(ctx, cx - 6, cy - 30, 10, 1, '#64748b');
    // Roller & golden keyboard
    outlinedRect(ctx, cx - 13, cy - 23, 26, 6, '#ca8a04', '#fef08a', '#78350f');
    outlinedRect(ctx, cx - 14, cy - 16, 28, 10, '#facc15', '#fef9c3', '#a16207');
    for (let kx = -10; kx <= 8; kx += 4) {
      px(ctx, cx + kx, cy - 14, 2, 2, '#1e293b');
      px(ctx, cx + kx + 1, cy - 10, 2, 2, '#1e293b');
    }
  } else if (furniId === 'purple_pillow') {
    drawIsoBox(10, 8, 20, 10, '#a855f7', '#6b21a8', '#7e22ce');
    drawIsoPoly(ctx, [[cx, cy - 18], [cx + 16, cy - 10], [cx, cy - 2], [cx - 16, cy - 10]], '#c084fc', '#581c87');
    px(ctx, cx - 18, cy - 8, 3, 3, '#facc15');
    px(ctx, cx + 15, cy - 8, 3, 3, '#facc15');
    px(ctx, cx - 2, cy - 11, 4, 2, '#f3e8ff');
  } else if (furniId === 'pura_sofa') {
    drawIsoBox(11, 9, 24, 12, '#f1f5f9', '#94a3b8', '#cbd5e1');
    drawIsoBox(15, 4, 20, 10, '#38bdf8', '#0284c7', '#0ea5e9');
    if (dir === 0 || dir === 3) {
      drawIsoBox(29, 15, 11, 6, '#e0f2fe', '#94a3b8', '#cbd5e1', -11, -6);
    } else {
      drawIsoBox(29, 15, 11, 6, '#e0f2fe', '#cbd5e1', '#94a3b8', 11, -6);
    }
    outlinedRect(ctx, cx - 25, cy - 22, 6, 15, '#ffffff', '#ffffff', '#cbd5e1');
    outlinedRect(ctx, cx + 19, cy - 22, 6, 15, '#ffffff', '#ffffff', '#cbd5e1');
  } else if (furniId === 'pura_lamp') {
    drawIsoBox(8, 8, 12, 6, '#cbd5e1', '#64748b', '#94a3b8');
    outlinedRect(ctx, cx - 2, cy - 42, 4, 34, '#e2e8f0', '#ffffff', '#94a3b8');
    const shade = state === 1 ? '#fef08a' : '#bae6fd';
    outlinedRect(ctx, cx - 11, cy - 58, 22, 18, shade, '#ffffff', '#0284c7');
  } else if (furniId === 'lido_lounger') {
    // Sunlit white & turquoise Lido pool deck sunbed
    drawIsoBox(8, 6, 25, 12, '#f8fafc', '#94a3b8', '#cbd5e1');
    drawIsoBox(11, 3, 22, 10, '#0ea5e9', '#0369a1', '#0284c7');
    // Raised headrest pillow
    const headX = dir === 1 || dir === 2 ? 10 : -10;
    drawIsoBox(17, 6, 10, 5, '#38bdf8', '#0284c7', '#0ea5e9', headX, -5);
    px(ctx, cx + headX - 4, cy - 22, 8, 3, '#ffffff');
  } else if (furniId === 'beach_umbrella') {
    // Cast base + tall pole + red/white striped beach parasol
    drawIsoBox(6, 5, 12, 6, '#94a3b8', '#475569', '#64748b');
    outlinedRect(ctx, cx - 2, cy - 54, 4, 48, '#f1f5f9', '#ffffff', '#94a3b8');
    drawIsoPoly(
      ctx,
      [
        [cx, cy - 72],
        [cx + 28, cy - 52],
        [cx, cy - 40],
        [cx - 28, cy - 52],
      ],
      '#ef4444',
      OUTLINE
    );
    drawIsoPoly(ctx, [[cx, cy - 72], [cx + 12, cy - 55], [cx - 12, cy - 55]], '#ffffff');
    drawIsoPoly(ctx, [[cx, cy - 72], [cx + 4, cy - 42], [cx - 4, cy - 42]], '#fef08a');
  } else if (furniId === 'pool_ring_duck') {
    // Classic Habbo Giant Yellow Rubber Duck Float
    drawIsoBox(7, 6, 18, 9, '#facc15', '#ca8a04', '#eab308');
    outlinedRect(ctx, cx - 10, cy - 22, 18, 13, '#fef08a', '#ffffff', '#ca8a04');
    // Duck head + orange bill
    outlinedRect(ctx, cx + 4, cy - 34, 11, 12, '#facc15', '#fef9c3', '#ca8a04');
    px(ctx, cx + 14, cy - 29, 6, 4, '#f97316');
    px(ctx, cx + 10, cy - 31, 2, 2, '#141414');
  } else if (furniId === 'tiki_torch') {
    drawIsoBox(6, 6, 11, 5, '#78350f', '#451a03', '#5c2d0c');
    outlinedRect(ctx, cx - 3, cy - 46, 6, 40, '#92400e', '#d97706', '#451a03');
    outlinedRect(ctx, cx - 6, cy - 52, 12, 8, '#78350f', '#b45309');
    if (state === 1) {
      const f = frame % 3;
      px(ctx, cx - 4, cy - 64 - f, 8, 12 + f, '#ea580c');
      px(ctx, cx - 2, cy - 61 - f, 4, 8, '#facc15');
      px(ctx, cx - 1, cy - 59 - f, 2, 4, '#fef9c3');
    }
  } else if (furniId === 'pine_tree') {
    outlinedRect(ctx, cx - 5, cy - 20, 10, 20, '#78350f', '#92400e', '#451a03');
    drawIsoPoly(ctx, [[cx, cy - 50], [cx + 22, cy - 18], [cx - 22, cy - 18]], '#14532d', OUTLINE);
    drawIsoPoly(ctx, [[cx, cy - 64], [cx + 18, cy - 34], [cx - 18, cy - 34]], '#15803d', OUTLINE);
    drawIsoPoly(ctx, [[cx, cy - 76], [cx + 13, cy - 50], [cx - 13, cy - 50]], '#22c55e', OUTLINE);
    px(ctx, cx - 3, cy - 60, 4, 3, '#86efac');
  } else if (furniId === 'flower_bed') {
    drawIsoPoly(ctx, [[cx, cy - 14], [cx + 28, cy], [cx, cy + 14], [cx - 28, cy]], '#78350f', '#451a03');
    drawIsoPoly(ctx, [[cx, cy - 12], [cx + 24, cy], [cx, cy + 12], [cx - 24, cy]], '#15803d', '#14532d');
    const blooms: [number, number, string][] = [
      [-12, -1, '#f43f5e'],
      [-3, -5, '#facc15'],
      [7, -3, '#ec4899'],
      [14, 1, '#38bdf8'],
      [0, 5, '#f43f5e'],
      [-8, 3, '#facc15'],
    ];
    for (const [bx, by, bcol] of blooms) {
      px(ctx, cx + bx - 2, cy + by - 3, 5, 5, bcol);
      px(ctx, cx + bx, cy + by - 1, 2, 2, '#ffffff');
    }
  } else if (furniId === 'disco_ball') {
    drawIsoBox(6, 6, 12, 6, '#1e293b', '#0f172a', '#334155');
    // Thin suspension stand/glitter sphere
    outlinedRect(ctx, cx - 1, cy - 72, 2, 20, '#94a3b8');
    outlinedRect(ctx, cx - 13, cy - 54, 26, 26, '#cbd5e1', '#ffffff', '#64748b');
    const glint = frame === 0 ? '#38bdf8' : frame === 1 ? '#f472b6' : '#fef08a';
    for (let yy = -50; yy <= -34; yy += 4) {
      for (let xx = -9; xx <= 7; xx += 4) {
        px(ctx, cx + xx, cy + yy, 2, 2, (xx + yy + frame) % 3 === 0 ? glint : '#ffffff');
      }
    }
  } else if (furniId === 'dj_booth') {
    drawIsoBox(22, 22, 28, 14, '#0f172a', '#020617', '#1e293b');
    drawIsoBox(24, 4, 26, 13, '#334155', '#1e293b', '#475569');
    // Dual vinyl turntables + glowing equalizer bar
    outlinedRect(ctx, cx - 16, cy - 32, 11, 8, '#020617', '#38bdf8');
    outlinedRect(ctx, cx + 5, cy - 32, 11, 8, '#020617', '#ec4899');
    const eqColors = ['#22c55e', '#facc15', '#ec4899', '#38bdf8'];
    for (let i = 0; i < 4; i++) {
      px(ctx, cx - 14 + i * 7, cy - 16, 4, 6, eqColors[(i + frame) % eqColors.length]);
    }
  } else if (furniId === 'pet_bowl') {
    drawIsoBox(8, 7, 16, 8, '#dc2626', '#7f1d1d', '#991b1b');
    drawIsoPoly(ctx, [[cx, cy - 12], [cx + 10, cy - 7], [cx, cy - 2], [cx - 10, cy - 7]], '#92400e', '#451a03');
    px(ctx, cx - 3, cy - 9, 4, 2, '#facc15');
    px(ctx, cx + 1, cy - 7, 3, 2, '#fde047');
  } else if (furniId === 'pet_cushion') {
    drawIsoPoly(ctx, [[cx, cy - 12], [cx + 22, cy], [cx, cy + 12], [cx - 22, cy]], '#0284c7', '#0369a1');
    drawIsoPoly(ctx, [[cx, cy - 8], [cx + 16, cy], [cx, cy + 8], [cx - 16, cy]], '#38bdf8', '#e0f2fe');
    px(ctx, cx - 3, cy - 1, 6, 2, '#ffffff');
  } else if (furniId === 'velvet_rope') {
    // Two gold brass stanchions + draped crimson velvet rope
    drawIsoBox(5, 4, 8, 4, '#eab308', '#854d0e', '#ca8a04', -14, 4);
    drawIsoBox(5, 4, 8, 4, '#eab308', '#854d0e', '#ca8a04', 14, -4);
    outlinedRect(ctx, cx - 16, cy - 32, 4, 30, '#facc15', '#fef9c3', '#854d0e');
    outlinedRect(ctx, cx + 12, cy - 38, 4, 30, '#facc15', '#fef9c3', '#854d0e');
    // Draped crimson velvet rope
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy - 26);
    ctx.quadraticCurveTo(cx, cy - 16, cx + 13, cy - 32);
    ctx.stroke();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (furniId === 'frank_bust') {
    // Marble column + Iconic Bellhop Frank Pixel Bust
    drawIsoBox(20, 20, 14, 7, '#e2e8f0', '#64748b', '#94a3b8');
    outlinedRect(ctx, cx - 9, cy - 42, 18, 20, '#94a3b8', '#ffffff', '#475569');
    outlinedRect(ctx, cx - 8, cy - 58, 16, 16, '#cbd5e1', '#f8fafc', '#64748b');
    // Frank bellhop cap + mustache
    outlinedRect(ctx, cx - 6, cy - 64, 12, 6, '#7f1d1d', '#ef4444');
    px(ctx, cx - 4, cy - 46, 8, 2, '#334155');
  } else if (furniId === 'sticky_note') {
    const palette =
      state === 1
        ? { fill: '#f9a8d4', hi: '#fce7f3', sh: '#db2777' }
        : state === 2
        ? { fill: '#93c5fd', hi: '#dbeafe', sh: '#2563eb' }
        : state === 3
        ? { fill: '#86efac', hi: '#dcfce7', sh: '#16a34a' }
        : { fill: '#fef08a', hi: '#fef9c3', sh: '#ca8a04' };
    // Crisp retro Post-It square with shadow & ruled pixel notes
    px(ctx, cx - 10, cy - 34, 22, 22, 'rgba(0,0,0,0.28)');
    outlinedRect(ctx, cx - 12, cy - 36, 22, 22, palette.fill, palette.hi, palette.sh);
    px(ctx, cx - 11, cy - 35, 20, 3, palette.sh);
    px(ctx, cx - 9, cy - 29, 14, 1, '#334155');
    px(ctx, cx - 9, cy - 25, 11, 1, '#334155');
    px(ctx, cx - 9, cy - 21, 13, 1, '#475569');
    // Folded bottom-right corner
    px(ctx, cx + 5, cy - 19, 4, 4, palette.hi);
  } else {
    drawIsoBox(16, 16, 20, 10, '#cbd5e1', '#64748b', '#94a3b8');
  }

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Generates & caches crisp base64 PNG preview URLs for Catalogue, Inventory, Trading, and Housekeeping.
 */
export function getItemPreviewImage(itemType: string, state = '1'): string {
  const key = `preview|${itemType}|${state}`;
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
    const resolved = resolveFurniSpriteId(itemType);
    const numState = Number(state);
    sourceCanvas = getFurniSprite(resolved, 0, Number.isFinite(numState) ? numState : 1, 0);
  }

  const url = sourceCanvas.toDataURL('image/png');
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

  // Top diamond
  drawIsoPoly(
    ctx,
    [
      [sx, sy],
      [sx + hw, sy + hh],
      [sx, sy + hh * 2],
      [sx - hw, sy + hh],
    ],
    topColor,
    border
  );

  // Subtle top-left bevel highlight so every tile pops crisply
  ctx.strokeStyle =
    tileChar === 'w'
      ? 'rgba(224,242,254,0.72)'
      : theme === 'rooftop'
      ? 'rgba(255,255,255,0.16)'
      : 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx - hw + 2, sy + hh);
  ctx.lineTo(sx, sy + 1);
  ctx.lineTo(sx + hw - 2, sy + hh);
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
    // Stair step lines
    ctx.strokeStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.moveTo(sx - 16, sy + hh - 6);
    ctx.lineTo(sx + 16, sy + hh + 10);
    ctx.moveTo(sx - 16, sy + hh);
    ctx.lineTo(sx + 16, sy + hh + 16);
    ctx.stroke();
  } else if (theme === 'wood_deck') {
    // Wooden deck planks along isometric lines
    ctx.strokeStyle = 'rgba(72, 34, 8, 0.34)';
    ctx.beginPath();
    ctx.moveTo(sx - 20, sy + hh - 5);
    ctx.lineTo(sx + 12, sy + hh + 11);
    ctx.moveTo(sx - 10, sy + hh - 10);
    ctx.lineTo(sx + 20, sy + hh + 5);
    ctx.stroke();
    px(ctx, sx - 6, sy + hh + 1, 4, 1, 'rgba(255, 224, 178, 0.4)');
  } else if (theme === 'parquet') {
    ctx.strokeStyle = 'rgba(72, 34, 8, 0.22)';
    ctx.beginPath();
    ctx.moveTo(sx - 16, sy + hh - 3);
    ctx.lineTo(sx + 10, sy + hh + 9);
    ctx.moveTo(sx - 6, sy + hh - 8);
    ctx.lineTo(sx + 18, sy + hh + 3);
    ctx.stroke();
    px(ctx, sx - 8, sy + hh + 1, 3, 1, 'rgba(255, 224, 178, 0.35)');
  } else if (theme === 'marble') {
    ctx.strokeStyle = isEven ? 'rgba(148, 140, 124, 0.22)' : 'rgba(255, 255, 255, 0.32)';
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

  if (isHovered) {
    drawIsoPoly(
      ctx,
      [
        [sx, sy + 1],
        [sx + hw - 2, sy + hh],
        [sx, sy + hh * 2 - 1],
        [sx - hw + 2, sy + hh],
      ],
      'rgba(255, 255, 255, 0.25)',
      '#fef08a'
    );
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
        drawIsoPoly(
          ctx,
          [
            [sx - hw, sy + hh],
            [sx, sy],
            [sx, sy - wallH],
            [sx - hw, sy + hh - wallH],
          ],
          leftWall,
          'rgba(0,0,0,0.12)'
        );
        drawIsoPoly(
          ctx,
          [
            [sx - hw, sy + hh - wallH],
            [sx, sy - wallH],
            [sx - 5, sy - wallH - 3],
            [sx - hw - 5, sy + hh - wallH - 3],
          ],
          capColor,
          '#1b1922'
        );
        ctx.strokeStyle = stripeColor;
        ctx.beginPath();
        ctx.moveTo(sx - hw / 2, sy + hh / 2 - 12);
        ctx.lineTo(sx - hw / 2, sy + hh / 2 - wallH + 6);
        ctx.stroke();

        drawIsoPoly(
          ctx,
          [
            [sx - hw, sy + hh],
            [sx, sy],
            [sx, sy - 11],
            [sx - hw, sy + hh - 11],
          ],
          trimColor
        );

        // Arched / Skyline Windows on left wall segments
        if (y === 3 || y === 6) {
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
          'rgba(0,0,0,0.12)'
        );
        drawIsoPoly(
          ctx,
          [
            [sx, sy - wallH],
            [sx + hw, sy + hh - wallH],
            [sx + hw + 5, sy + hh - wallH - 3],
            [sx + 5, sy - wallH - 3],
          ],
          capColor,
          '#1b1922'
        );
        ctx.strokeStyle = stripeColor;
        ctx.beginPath();
        ctx.moveTo(sx + hw / 2, sy + hh / 2 - 12);
        ctx.lineTo(sx + hw / 2, sy + hh / 2 - wallH + 6);
        ctx.stroke();

        drawIsoPoly(
          ctx,
          [
            [sx, sy],
            [sx + hw, sy + hh],
            [sx + hw, sy + hh - 11],
            [sx, sy - 11],
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
    // Ornate Gold & Orange HC Clover/Crown Shield with embossed pixel HC lettering
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
    // Bold embossed pixel HC
    px(s, 12, 15, 3, 11, GOLD_3);
    px(s, 18, 15, 3, 11, GOLD_3);
    px(s, 15, 19, 3, 3, GOLD_3);
    px(s, 22, 15, 7, 11, GOLD_3);
    px(s, 12, 14, 3, 10, GOLD_HI);
    px(s, 18, 14, 3, 10, GOLD_HI);
    px(s, 15, 18, 3, 3, GOLD_1);
    px(s, 22, 14, 7, 3, GOLD_HI);
    px(s, 22, 17, 3, 5, GOLD_1);
    px(s, 22, 21, 7, 3, GOLD_1);
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
  } else {
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



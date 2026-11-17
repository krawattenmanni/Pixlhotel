import type {
  AvatarPose,
  BanzaiTileState,
  CustomBadgeDef,
  Direction,
  LookConfig,
  PetAnim,
  PetSpecies,
  RoomFloorTheme,
  RoomWallTheme,
} from './types';

const OUTLINE = '#1b1922';
const spriteCache = new Map<string, HTMLCanvasElement>();

function makeOffscreen(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
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
  frame: number
): HTMLCanvasElement {
  const animStep = frame % 4;
  const key = `av34|${getLookHash(look)}|${dir}|${pose}|${animStep}`;
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

  const shirt = look.shirtColor;
  const shirtHi = shadeHex(shirt, 28);
  const shirtLo = shadeHex(shirt, -30);
  const shirtDeep = shadeHex(shirt, -48);

  const pants = look.pantsColor;
  const pantsHi = shadeHex(pants, 18);
  const pantsLo = shadeHex(pants, -26);

  const shoes = look.shoesColor;
  const shoesHi = shadeHex(shoes, 28);
  const shoesLo = shadeHex(shoes, -28);

  const hair = look.hairColor;
  const hairHi = shadeHex(hair, 26);
  const hairLo = shadeHex(hair, -28);

  // Animation offsets (staggered diagonal stride / groove)
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
    bobY = animStep % 2 === 0 ? -2 : 0;
    nearLegDX = animStep === 1 ? -1 : 0;
    farLegDX = animStep === 3 ? 1 : 0;
    nearArmDY = animStep < 2 ? -5 : 1;
    farArmDY = animStep >= 2 ? -5 : 1;
  } else if (pose === 'wave') {
    waveUp = animStep % 2 === 0;
    bobY = waveUp ? -1 : 0;
  }

  // Draw SE (dir=0) or NE (dir=3) in local +x facing orientation on scratch canvas
  const cx = 22;
  const baseY = 66;
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
  if (pose === 'sit') {
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
    px(s, flx, fly, 4, 11, pantsLo);
    px(s, flx + 1, fly + 1, 2, 9, pants);
    // Angled shoe pointing down-right
    px(s, flx, fly + 11, 6, 3, shoesLo);
    px(s, flx + 4, fly + 12, 2, 2, '#e2e8f0');

    // Near leg (foreground-left, 2px lower for true staggered isometric stance)
    const nlx = cx - 5 + nearLegDX;
    const nly = baseY - 15 + nearLegDY;
    px(s, nlx, nly, 5, 11, pants);
    px(s, nlx + 1, nly + 1, 2, 9, pantsHi);
    px(s, nlx, nly + 1, 1, 9, pantsLo);
    // Near angled isometric sneaker/dress shoe
    px(s, nlx, nly + 11, 7, 3, shoes);
    px(s, nlx + 1, nly + 11, 4, 1, shoesHi);
    px(s, nlx + 5, nly + 12, 2, 2, '#f8fafc');
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

  if (!facingBack) {
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

  // 9. Draw soft isometric oval ground shadow on final canvas
  ctx.fillStyle = 'rgba(15, 20, 35, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 1, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

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
  ctx.drawImage(outlined.canvas, 0, 0);

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
  furniId: string,
  dir: Direction,
  state = 0,
  animTick = 0
): HTMLCanvasElement {
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
  } else {
    drawIsoBox(16, 16, 20, 10, '#cbd5e1', '#64748b', '#94a3b8');
  }

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Draws a single isometric floor slab with 3D beveled side thickness and rich Habbo pixel textures.
 */
export function drawIsoFloorTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  gx: number,
  gy: number,
  theme: RoomFloorTheme,
  isHovered: boolean
) {
  const hw = 32;
  const hh = 16;
  const slabH = 8;

  const isEven = (gx + gy) % 2 === 0;
  let topColor = '#d6c7a9';
  let leftEdge = '#9b8d72';
  let rightEdge = '#b4a588';
  let border = 'rgba(0,0,0,0.18)';

  if (theme === 'marble') {
    topColor = isEven ? '#f1efe8' : '#dbd7cc';
    leftEdge = '#8f8b80';
    rightEdge = '#aca79a';
  } else if (theme === 'parquet') {
    topColor = isEven ? '#c89254' : '#b47c3e';
    leftEdge = '#6b421c';
    rightEdge = '#885626';
  } else if (theme === 'rooftop') {
    topColor = isEven ? '#525e70' : '#455061';
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
  ctx.strokeStyle = theme === 'rooftop' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.35)';
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

  // Per-theme pixel surface textures
  if (theme === 'parquet') {
    // Staggered herringbone oak plank lines & subtle grain dots
    ctx.strokeStyle = 'rgba(72, 34, 8, 0.22)';
    ctx.beginPath();
    ctx.moveTo(sx - 16, sy + hh - 3);
    ctx.lineTo(sx + 10, sy + hh + 9);
    ctx.moveTo(sx - 6, sy + hh - 8);
    ctx.lineTo(sx + 18, sy + hh + 3);
    ctx.stroke();
    px(ctx, sx - 8, sy + hh + 1, 3, 1, 'rgba(255, 224, 178, 0.35)');
    px(ctx, sx + 5, sy + hh - 4, 3, 1, 'rgba(92, 46, 12, 0.25)');
  } else if (theme === 'marble') {
    // Polished marble diagonal veining & specular dots
    ctx.strokeStyle = isEven ? 'rgba(148, 140, 124, 0.22)' : 'rgba(255, 255, 255, 0.32)';
    ctx.beginPath();
    ctx.moveTo(sx - 12, sy + hh + 2);
    ctx.lineTo(sx - 2, sy + hh - 3);
    ctx.lineTo(sx + 10, sy + hh + 3);
    ctx.stroke();
    px(ctx, sx - 1, sy + hh - 8, 2, 1, 'rgba(255,255,255,0.65)');
  } else if (theme === 'rooftop') {
    // Concrete stipple & paver joints
    px(ctx, sx - 10, sy + hh - 2, 2, 1, 'rgba(255,255,255,0.14)');
    px(ctx, sx + 6, sy + hh + 3, 2, 1, 'rgba(15,23,42,0.35)');
    px(ctx, sx + 2, sy + hh - 6, 2, 1, 'rgba(255,255,255,0.12)');
  } else if (theme === 'tatami') {
    // Woven reed pattern + dark green trim band
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

/**
 * Draws authentic 3D Habbo isometric back walls with top thickness cap, textured wallpaper, windows & pixel art.
 */
export function drawRoomWalls(
  ctx: CanvasRenderingContext2D,
  layout: string[],
  originX: number,
  originY: number,
  theme: RoomWallTheme,
  animTick: number
) {
  const wallH = 108;
  const hw = 32;
  const hh = 16;

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
  }

  // Find bounding walkable rectangle for classic Habbo L-wall
  let minX = 999;
  let maxX = -1;
  let minY = 999;
  let maxY = -1;
  for (let y = 0; y < layout.length; y++) {
    for (let x = 0; x < layout[y].length; x++) {
      if (layout[y][x] !== 'x') {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Left wall runs along x = minX, y = minY..maxY
  for (let y = minY; y <= maxY; y++) {
    const sx = originX + (minX - y) * hw;
    const sy = originY + (minX + y) * hh;
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

    // Top wall thickness bevel cap
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

    // Wallpaper texture stripes/bricks
    if (theme === 'brick') {
      for (let h = 18; h < wallH - 8; h += 12) {
        ctx.strokeStyle = stripeColor;
        ctx.beginPath();
        ctx.moveTo(sx - hw + 2, sy + hh - h);
        ctx.lineTo(sx - 2, sy - h);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = stripeColor;
      ctx.beginPath();
      ctx.moveTo(sx - hw / 2, sy + hh / 2 - 12);
      ctx.lineTo(sx - hw / 2, sy + hh / 2 - wallH + 6);
      ctx.stroke();
    }

    // Wainscoting chair rail & baseboard
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

    // Classic Habbo Skyline Windows
    if (y === minY + 2 || y === minY + 5) {
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
      // Window mullion crossbars
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(sx - hw / 2, sy + hh / 2 - 29);
      ctx.lineTo(sx - hw / 2, sy + hh / 2 - 77);
      ctx.moveTo(sx - hw + 7, sy + hh - 53);
      ctx.lineTo(sx - 7, sy - 49);
      ctx.stroke();
      if (theme === 'nightsky') {
        const starBright = animTick % 2 === 0 ? '#fef08a' : '#bae6fd';
        px(ctx, sx - 18, sy - 58, 2, 2, starBright);
        px(ctx, sx - 12, sy - 42, 2, 2, '#ffffff');
      } else {
        // Distant sunlit cloud in window
        px(ctx, sx - 21, sy - 56, 7, 3, '#ffffff');
      }
    }
  }

  // Right wall runs along y = minY, x = minX..maxX
  for (let x = minX; x <= maxX; x++) {
    const sx = originX + (x - minY) * hw;
    const sy = originY + (x + minY) * hh;
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

    // Top wall thickness bevel cap
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

    if (theme === 'brick') {
      for (let h = 18; h < wallH - 8; h += 12) {
        ctx.strokeStyle = stripeColor;
        ctx.beginPath();
        ctx.moveTo(sx + 2, sy - h);
        ctx.lineTo(sx + hw - 2, sy + hh - h);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = stripeColor;
      ctx.beginPath();
      ctx.moveTo(sx + hw / 2, sy + hh / 2 - 12);
      ctx.lineTo(sx + hw / 2, sy + hh / 2 - wallH + 6);
      ctx.stroke();
    }

    // Baseboard
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

    // Pixel paintings on walls (Duck & Hotel Dragon portraits)
    if (x === minX + 3 || x === minX + 6) {
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
        x === minX + 3 ? '#1d4ed8' : '#991b1b'
      );
      px(ctx, sx + 14, sy - 50, 5, 5, '#fef08a');
    }
  }
}

/**
 * Renders an authentic 24x24 pixel-art Habbo badge (or custom 16x16 minted badge) onto an offscreen canvas.
 */
export function getBadgeSprite(
  badgeId: string,
  unlocked = true,
  customBadges: CustomBadgeDef[] = []
): HTMLCanvasElement {
  const customMatch = customBadges.find((b) => b.id === badgeId);
  if (customMatch) {
    const hash = customMatch.pixels.map((p) => p ?? '_').join(',');
    const cKey = `cbadge|${badgeId}|${unlocked ? '1' : '0'}|${hash}`;
    const cCached = spriteCache.get(cKey);
    if (cCached) return cCached;

    const { canvas, ctx } = makeOffscreen(16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const col = customMatch.pixels[y * 16 + x];
        if (!col) continue;
        px(ctx, x, y, 1, 1, unlocked ? col : '#64748b');
      }
    }
    spriteCache.set(cKey, canvas);
    return canvas;
  }

  const key = `badge|${badgeId}|${unlocked ? '1' : '0'}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const { canvas, ctx } = makeOffscreen(24, 24);

  const bgMap: Record<string, [string, string, string]> = {
    badge_checkin: ['#2b7de9', '#1e3a8a', '#fef08a'],
    badge_hc: ['#eab308', '#854d0e', '#fef9c3'],
    badge_stylist: ['#9333ea', '#581c87', '#f5d0fe'],
    badge_social: ['#0d9488', '#115e59', '#99f6e4'],
    badge_voucher: ['#e06d1b', '#7c2d12', '#fde68a'],
    badge_dragon: ['#dc2626', '#7f1d1d', '#facc15'],
    badge_architect: ['#16a34a', '#14532d', '#bbf7d0'],
    badge_throne: ['#ca8a04', '#451a03', '#ffffff'],
    badge_dj: ['#db2777', '#831843', '#fbcfe8'],
    badge_admin: ['#991b1b', '#450a0a', '#fde047'],
  };

  const [rawBg, rawBorder, rawAccent] = bgMap[badgeId] ?? ['#475569', '#1e293b', '#e2e8f0'];
  const bg = unlocked ? rawBg : '#64748b';
  const border = unlocked ? rawBorder : '#334155';
  const accent = unlocked ? rawAccent : '#94a3b8';
  const hi = unlocked ? shadeHex(bg, 35) : '#94a3b8';

  // Shield / Crest outer silhouette with 1px dark outline
  px(ctx, 3, 1, 18, 22, OUTLINE);
  px(ctx, 1, 3, 22, 18, OUTLINE);
  px(ctx, 2, 2, 20, 20, border);
  px(ctx, 3, 3, 18, 18, bg);
  // Top highlight & inner bevel
  px(ctx, 4, 3, 16, 2, hi);
  px(ctx, 3, 4, 1, 15, hi);

  // Bespoke 1px pixel emblem per badge
  if (badgeId === 'badge_checkin') {
    // Golden Hotel Key
    px(ctx, 6, 8, 5, 6, OUTLINE);
    px(ctx, 7, 9, 3, 4, accent);
    px(ctx, 8, 10, 1, 2, bg);
    px(ctx, 11, 10, 7, 3, OUTLINE);
    px(ctx, 11, 11, 6, 1, accent);
    px(ctx, 14, 13, 2, 2, accent);
    px(ctx, 16, 13, 1, 2, accent);
  } else if (badgeId === 'badge_hc') {
    // Classic Gold HC Monogram Crown
    px(ctx, 5, 7, 2, 10, accent);
    px(ctx, 9, 7, 2, 10, accent);
    px(ctx, 7, 11, 2, 2, accent);
    px(ctx, 13, 7, 5, 2, accent);
    px(ctx, 13, 9, 2, 6, accent);
    px(ctx, 13, 15, 5, 2, accent);
  } else if (badgeId === 'badge_stylist') {
    // Pixel T-shirt & hanger hook
    px(ctx, 11, 5, 2, 2, accent);
    px(ctx, 6, 8, 12, 4, accent);
    px(ctx, 8, 11, 8, 7, accent);
    px(ctx, 10, 9, 4, 2, bg);
  } else if (badgeId === 'badge_social') {
    // Pixel speech bubble
    px(ctx, 5, 6, 14, 9, OUTLINE);
    px(ctx, 6, 7, 12, 7, '#ffffff');
    px(ctx, 8, 15, 3, 3, '#ffffff');
    px(ctx, 8, 10, 2, 2, border);
    px(ctx, 11, 10, 2, 2, border);
    px(ctx, 14, 10, 2, 2, border);
  } else if (badgeId === 'badge_voucher') {
    // Gift Box with Ribbon
    px(ctx, 6, 9, 12, 9, accent);
    px(ctx, 5, 8, 14, 3, '#ffffff');
    px(ctx, 11, 6, 2, 12, border);
    px(ctx, 8, 6, 3, 2, '#ffffff');
    px(ctx, 13, 6, 3, 2, '#ffffff');
  } else if (badgeId === 'badge_dragon') {
    // Dragon Flame Emblem
    px(ctx, 10, 5, 4, 3, accent);
    px(ctx, 8, 8, 8, 5, '#f97316');
    px(ctx, 6, 12, 12, 6, accent);
    px(ctx, 9, 14, 6, 4, '#ffffff');
  } else if (badgeId === 'badge_architect') {
    // Brick / Wrench Builder Icon
    px(ctx, 6, 12, 12, 6, accent);
    px(ctx, 6, 15, 12, 1, border);
    px(ctx, 11, 12, 1, 3, border);
    px(ctx, 9, 6, 6, 4, '#ffffff');
    px(ctx, 11, 9, 2, 4, '#fde047');
  } else if (badgeId === 'badge_throne') {
    // Royal Crown with Ruby
    px(ctx, 6, 9, 12, 8, '#fde047');
    px(ctx, 6, 7, 2, 3, '#fef08a');
    px(ctx, 11, 6, 2, 4, '#fef08a');
    px(ctx, 16, 7, 2, 3, '#fef08a');
    px(ctx, 11, 12, 2, 2, '#dc2626');
  } else if (badgeId === 'badge_dj') {
    // Spinning Vinyl Record + Note
    px(ctx, 6, 6, 12, 12, '#0f172a');
    px(ctx, 8, 8, 8, 8, '#334155');
    px(ctx, 10, 10, 4, 4, accent);
    px(ctx, 11, 11, 2, 2, '#0f172a');
  } else if (badgeId === 'badge_admin') {
    // Creator & Admin Crest: Necktie (Krawatte!) + Crown Accent
    px(ctx, 8, 5, 8, 3, '#fde047');
    px(ctx, 10, 8, 4, 3, '#ffffff');
    px(ctx, 10, 11, 4, 5, accent);
    px(ctx, 11, 16, 2, 3, accent);
    px(ctx, 9, 12, 1, 3, accent);
    px(ctx, 14, 12, 1, 3, accent);
  }

  if (!unlocked) {
    // Subtle dark lock overlay in bottom-right corner
    px(ctx, 15, 14, 7, 8, OUTLINE);
    px(ctx, 16, 16, 5, 5, '#cbd5e1');
    px(ctx, 17, 13, 3, 3, '#cbd5e1');
    px(ctx, 18, 14, 1, 2, OUTLINE);
  }

  spriteCache.set(key, canvas);
  return canvas;
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


import type { AvatarPose, Direction, LookConfig } from './types';

function makeOffscreen(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function renderExtendedAvatarSprite(
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
  const W = 52;
  const H = 76;
  const { canvas, ctx } = makeOffscreen(W, H);
  const { canvas: scratch, ctx: s } = makeOffscreen(W, H);

  const facingBack = dir === 2 || dir === 3;
  const mirrorX = dir === 1 || dir === 2;
  const isFemale = look.gender === 'F';

  const skin = look.skinColor || '#f5cba7';
  const skinHi = shadeHex(skin, 18);
  const skinSoftLo = shadeHex(skin, -12);
  const skinLo = shadeHex(skin, isFemale ? -14 : -22);
  // Female avatars never use dark brown/black chin pixels
  const skinChin = isFemale ? skinSoftLo : shadeHex(skin, -24);

  const shirt = hasSwimwear ? skin : look.shirtColor || '#2b7de9';
  const shirtHi = shadeHex(shirt, 22);
  const shirtLo = shadeHex(shirt, -24);
  const shirtDeep = shadeHex(shirt, -38);

  const pants = hasSwimwear ? swimwearColor : look.pantsColor || '#343a40';
  const pantsHi = shadeHex(pants, 20);
  const pantsLo = shadeHex(pants, -24);

  const shoes = hasSwimwear ? skinLo : look.shoesColor || '#232024';
  const shoesHi = shadeHex(shoes, 24);
  const shoesLo = shadeHex(shoes, -20);

  const hair = look.hairColor || '#6e3f23';
  const hairHi = shadeHex(hair, 26);
  const hairLo = shadeHex(hair, -26);

  const cx = 26;
  const baseY = 66;

  const hairStyle = (look.hairStyle || 'quiff') as string;
  const shirtStyle = (look.shirtStyle || 'tee') as string;
  const expression = (look.expression || 'happy') as string;
  const rawAccessory = (look.accessory || 'none') as string;
  const accessory = isFemale && rawAccessory === 'beard' ? 'none' : rawAccessory;

  // Special horizontal reclining pose (:lay / lounger / bed)
  if (pose === 'lay') {
    px(s, cx + 4, baseY - 15, 13, 6, hasSwimwear ? skin : pants);
    px(s, cx + 5, baseY - 15, 11, 2, hasSwimwear ? skinHi : pantsHi);
    px(s, cx + 4, baseY - 11, 13, 2, hasSwimwear ? skinLo : pantsLo);
    if (hasSwimwear) {
      px(s, cx + 3, baseY - 15, 6, 6, pants);
    }
    // Chunky rounded shoes at foot end
    px(s, cx + 17, baseY - 16, 5, 7, shoes);
    px(s, cx + 18, baseY - 16, 2, 2, shoesHi);
    px(s, cx + 21, baseY - 15, 1, 5, '#f8fafc');

    // Reclining chunky torso
    px(s, cx - 9, baseY - 18, 14, 10, shirt);
    px(s, cx - 8, baseY - 19, 12, 2, shirtHi);
    px(s, cx - 9, baseY - 10, 14, 2, shirtLo);
    px(s, cx - 5, baseY - 14, 9, 4, shirtHi);
    px(s, cx + 4, baseY - 14, 4, 4, skin);

    // Chunky head propped on left
    const hx = cx - 22;
    const hy = baseY - 28;
    px(s, hx + 3, hy, 12, 1, skinHi);
    px(s, hx + 1, hy + 1, 16, 13, skin);
    px(s, hx + 2, hy + 14, 13, 2, skinChin);
    if (!facingBack) {
      px(s, hx + 7, hy + 7, 2, 3, '#141414');
      px(s, hx + 7, hy + 7, 1, 1, '#ffffff');
      px(s, hx + 12, hy + 7, 2, 3, '#141414');
      px(s, hx + 12, hy + 7, 1, 1, '#ffffff');
      px(s, hx + 9, hy + 12, 2, 1, isFemale ? '#e11d48' : '#9a3412');
    }
    px(s, hx, hy - 2, 17, 6, hair);
    px(s, hx + 2, hy - 2, 11, 2, hairHi);
    if (
      hairStyle === 'long' ||
      hairStyle === 'bob' ||
      hairStyle === 'ponytail' ||
      hairStyle === 'pigtails' ||
      hairStyle === 'side_fringe'
    ) {
      px(s, hx - 2, hy + 2, 5, 12, hairLo);
    }
    if (accessory === 'sunglasses' && !facingBack) {
      px(s, hx + 6, hy + 6, 10, 4, '#09090b');
    } else if (accessory === 'crown' || accessory === 'tiara') {
      px(s, hx + 3, hy - 6, 11, 4, '#facc15');
    }

    const oriented = makeOffscreen(W, H);
    if (mirrorX) {
      oriented.ctx.translate(W, 0);
      oriented.ctx.scale(-1, 1);
    }
    oriented.ctx.drawImage(scratch, 0, 0);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY - 3, 18, 5, 0, 0, Math.PI * 2);
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
    return canvas;
  }

  // Multi-frame animation offsets for walk, wave, and 4 Habbo dance styles
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
      nearLegDX = 3;
      nearLegDY = -1;
      farLegDX = -3;
      farLegDY = 1;
      nearArmDY = -2;
      farArmDY = 2;
    } else if (animStep === 3) {
      bobY = -1;
      nearLegDX = -3;
      nearLegDY = 1;
      farLegDX = 3;
      farLegDY = -1;
      nearArmDY = 2;
      farArmDY = -2;
    }
  } else if (pose === 'dance') {
    if (danceStyle === 2) {
      // Pogo Mogo
      bobY = animStep === 0 ? 2 : animStep === 1 ? -5 : animStep === 2 ? -3 : 0;
      nearLegDY = animStep === 1 ? -3 : 0;
      farLegDY = animStep === 1 ? -3 : 0;
      nearArmDY = animStep === 1 || animStep === 2 ? -6 : 2;
      farArmDY = animStep === 1 || animStep === 2 ? -6 : 2;
    } else if (danceStyle === 3) {
      // Duck Funk
      bobY = animStep % 2 === 0 ? -1 : 1;
      nearLegDX = animStep === 0 ? -2 : animStep === 2 ? 2 : 0;
      farLegDX = animStep === 0 ? -2 : animStep === 2 ? 2 : 0;
      nearArmDY = animStep % 2 === 0 ? -4 : 2;
      farArmDY = animStep % 2 === 0 ? -4 : 2;
    } else if (danceStyle === 4) {
      // The Rollie
      bobY = animStep === 1 || animStep === 3 ? -2 : 0;
      nearLegDY = animStep === 1 ? -2 : 0;
      farLegDY = animStep === 3 ? -2 : 0;
      nearArmDY = animStep === 0 ? -5 : animStep === 2 ? 3 : -1;
      farArmDY = animStep === 2 ? -5 : animStep === 0 ? 3 : -1;
    } else {
      // Classic Habbo Hop
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

  // Chunky 2008 Habbo proportions: 18px tall sturdy torso + 15px grounded legs + 20x21 rounded head
  const torsoY = (pose === 'sit' ? baseY - 32 : baseY - 31) + bobY;
  const bareShoulderStyle =
    !hasSwimwear &&
    (shirtStyle === 'tank' || shirtStyle === 'halter' || shirtStyle === 'offshoulder');

  const drawFarArm = () => {
    const ax = cx + 6;
    const ay = torsoY + 2 + farArmDY;
    const armUpper = bareShoulderStyle ? skinLo : shirtLo;
    const armMid = bareShoulderStyle ? skin : shirt;
    const armDeep = bareShoulderStyle ? skinLo : shirtDeep;
    if (pose === 'wave' && !facingBack) {
      const wy = waveUp ? torsoY - 9 : torsoY - 6;
      px(s, cx + 6, wy + 3, 4, 10, armUpper);
      px(s, cx + 7, wy + 3, 2, 8, armMid);
      // Open waving Habbo hand
      px(s, cx + 6, wy - 1, 4, 4, skin);
      px(s, cx + 7, wy - 1, 2, 2, skinHi);
      return;
    }
    if (pose === 'dance' && farArmDY < 0) {
      px(s, ax, ay, 4, 7, armUpper);
      px(s, ax, ay - 3, 4, 4, skin);
      return;
    }
    px(s, ax, ay, 4, 7, armUpper);
    px(s, ax + 1, ay + 6, 4, 5, armDeep);
    px(s, ax + 1, ay + 11, 4, 3, skinLo);
  };

  const drawNearArm = () => {
    const ax = cx - 10;
    const ay = torsoY + 2 + nearArmDY;
    const armBase = bareShoulderStyle ? skin : shirtStyle === 'varsity' ? '#f8fafc' : shirt;
    const armHi = bareShoulderStyle ? skinHi : shirtStyle === 'varsity' ? '#ffffff' : shirtHi;
    const armLo = bareShoulderStyle ? skinLo : shirtStyle === 'varsity' ? '#cbd5e1' : shirtLo;
    if (pose === 'dance' && nearArmDY < 0) {
      px(s, ax - 1, ay, 4, 7, armBase);
      px(s, ax, ay, 2, 6, armHi);
      px(s, ax - 1, ay - 3, 4, 4, skinHi);
      return;
    }
    // Chunky articulated upper arm + forearm + visible pixel hand
    px(s, ax, ay, 5, 6, armBase);
    px(s, ax, ay, 1, 6, armLo);
    px(s, ax + 1, ay, 2, 5, armHi);
    px(s, ax + 1, ay + 6, 5, 5, armBase);
    px(s, ax + 2, ay + 6, 2, 4, armHi);
    px(s, ax + 2, ay + 11, 4, 3, skin);
    px(s, ax + 3, ay + 11, 2, 2, skinHi);
  };

  const wearsSkirtOrDress =
    !hasSwimwear &&
    (shirtStyle === 'dress' ||
      (isFemale && (shirtStyle === 'sailor_blouse' || shirtStyle === 'crop_cardigan')));

  // 1. CHUNKY GROUNDED ISOMETRIC LEGS & ROUNDED HABBO SHOES
  if (inWater) {
    const swimBob = animStep % 2 === 0 ? 0 : 1;
    px(s, cx - 7, torsoY + 13 + swimBob, 14, 4, pants);
    px(s, cx - 7, torsoY + 15 + swimBob, 14, 1, '#fef08a');
  } else if (pose === 'sit') {
    const sy = baseY - 16;
    const legCol = wearsSkirtOrDress ? skin : pants;
    const legLo = wearsSkirtOrDress ? skinLo : pantsLo;
    const legHi = wearsSkirtOrDress ? skinHi : pantsHi;
    // Far seated leg bent at isometric knee
    px(s, cx + 1, sy, 6, 5, wearsSkirtOrDress ? pantsLo : legLo);
    px(s, cx + 3, sy + 4, 5, 6, legLo);
    px(s, cx + 3, sy + 9, 7, 4, shoesLo);
    px(s, cx + 3, sy + 12, 7, 1, '#e2e8f0');
    // Near seated leg
    px(s, cx - 6, sy + 2, 6, 5, wearsSkirtOrDress ? pants : legCol);
    px(s, cx - 4, sy + 6, 5, 6, legCol);
    px(s, cx - 3, sy + 6, 2, 5, legHi);
    px(s, cx - 4, sy + 11, 8, 4, shoes);
    px(s, cx - 3, sy + 11, 4, 1, shoesHi);
    px(s, cx - 4, sy + 14, 8, 1, '#f8fafc');
  } else {
    const legMain = hasSwimwear || wearsSkirtOrDress ? skin : pants;
    const legMainLo = hasSwimwear || wearsSkirtOrDress ? skinLo : pantsLo;
    const legMainHi = hasSwimwear || wearsSkirtOrDress ? skinHi : pantsHi;

    // Far leg (staggered 2px higher & right for 2:1 isometric depth)
    const flx = cx + 1 + farLegDX;
    const fly = baseY - 16 + farLegDY;
    px(s, flx, fly, 6, 11, legMainLo);
    px(s, flx + 1, fly + 1, 3, 9, legMain);
    if (hasSwimwear) {
      px(s, flx, fly, 6, 5, pantsLo);
    }
    // Chunky rounded far shoe with 1px light sole trim
    px(s, flx, fly + 10, 7, 4, shoesLo);
    px(s, flx + 2, fly + 10, 3, 1, shoes);
    if (!hasSwimwear) px(s, flx, fly + 13, 7, 1, '#e2e8f0');

    // Near leg (foreground-left, 2px lower)
    const nlx = cx - 6 + nearLegDX;
    const nly = baseY - 14 + nearLegDY;
    px(s, nlx, nly, 6, 11, legMain);
    px(s, nlx + 2, nly + 1, 2, 9, legMainHi);
    px(s, nlx, nly + 1, 1, 9, legMainLo);
    if (hasSwimwear) {
      px(s, nlx, nly, 6, 5, pants);
      px(s, nlx + 1, nly, 4, 4, pantsHi);
    }
    // Chunky rounded near shoe with white sole & toe shine
    px(s, nlx, nly + 10, 8, 4, shoes);
    px(s, nlx + 2, nly + 10, 4, 1, shoesHi);
    if (!hasSwimwear) {
      px(s, nlx + 5, nly + 11, 2, 1, '#ffffff');
      px(s, nlx, nly + 13, 8, 1, '#f8fafc');
    }

    // Pleated skirt / dress overlay
    if (wearsSkirtOrDress) {
      const skCol = shirtStyle === 'dress' ? shirt : pants;
      const skHi = shirtStyle === 'dress' ? shirtHi : pantsHi;
      const skLo = shirtStyle === 'dress' ? shirtLo : pantsLo;
      px(s, cx - 7, baseY - 17, 15, 7, skCol);
      px(s, cx - 6, baseY - 16, 3, 6, skLo);
      px(s, cx - 2, baseY - 16, 3, 6, skHi);
      px(s, cx + 2, baseY - 16, 3, 6, skLo);
      px(s, cx + 5, baseY - 16, 2, 6, skHi);
    }
  }

  // 2. FAR ARM
  drawFarArm();

  // 3. CHUNKY 3/4 ISOMETRIC TORSO (16-17px wide x 16px tall)
  const torsoW = isFemale ? 14 : 15;
  const torsoLeft = cx - 7;
  px(s, torsoLeft, torsoY + 1, torsoW, 15, shirt);
  px(s, torsoLeft + 1, torsoY, torsoW - 2, 2, shirtHi);
  px(s, torsoLeft, torsoY + 2, 2, 13, shirtLo);
  px(s, torsoLeft + torsoW - 5, torsoY + 2, 4, 13, shirtHi);
  px(s, torsoLeft + 1, torsoY + 15, torsoW - 2, 2, shirtDeep);
  if (isFemale && !inWater) {
    // Subtle feminine waist contour & bust highlight
    px(s, torsoLeft, torsoY + 9, 1, 4, shirtDeep);
    px(s, cx, torsoY + 4, 5, 3, shirtHi);
  }

  if (inWater) {
    const swimBob = animStep % 2 === 0 ? 0 : 1;
    px(s, cx - 7, torsoY + 9 + swimBob, 14, 4, pants);
    px(s, cx - 10, torsoY + 11 + swimBob, 20, 5, '#eab308');
    px(s, cx - 9, torsoY + 12 + swimBob, 18, 3, '#facc15');
    px(s, cx - 7, torsoY + 12 + swimBob, 12, 2, '#fef08a');
    if (!facingBack) {
      px(s, cx + 5, torsoY + 7 + swimBob, 5, 5, '#facc15');
      px(s, cx + 6, torsoY + 8 + swimBob, 3, 2, '#fef9c3');
      px(s, cx + 10, torsoY + 9 + swimBob, 3, 2, '#f97316');
      px(s, cx + 8, torsoY + 8 + swimBob, 1, 1, '#141414');
    }
  } else if (wearingSwimwear) {
    if (isFemale) {
      px(s, cx - 6, torsoY + 4, 12, 4, pants);
      px(s, cx - 6, torsoY + 8, 12, 3, skin);
    }
    px(s, cx - 7, torsoY + 11, 14, 5, pants);
    px(s, cx - 6, torsoY + 12, 12, 2, pantsHi);
    px(s, cx - 7, torsoY + 11, 14, 1, '#fef08a');
  } else if (!facingBack) {
    if (shirtStyle === 'suit') {
      px(s, cx, torsoY + 1, 5, 9, '#f8fafc');
      px(s, cx + 2, torsoY + 2, 2, 8, '#b91c1c');
      px(s, cx + 2, torsoY + 1, 2, 2, '#991b1b');
      px(s, cx - 1, torsoY + 2, 1, 7, shirtDeep);
      px(s, cx + 5, torsoY + 2, 1, 7, shirtDeep);
      px(s, cx + 2, torsoY + 11, 2, 1, '#cbd5e1');
    } else if (shirtStyle === 'hoodie') {
      px(s, cx + 1, torsoY + 2, 1, 6, '#f8fafc');
      px(s, cx + 4, torsoY + 2, 1, 6, '#f8fafc');
      px(s, cx - 3, torsoY + 10, 9, 4, shirtLo);
      px(s, cx - 5, torsoY - 1, 10, 2, shirtLo);
    } else if (shirtStyle === 'stripes') {
      px(s, torsoLeft + 1, torsoY + 4, torsoW - 2, 2, '#f8fafc');
      px(s, torsoLeft + 1, torsoY + 9, torsoW - 2, 2, '#f8fafc');
      px(s, torsoLeft + 1, torsoY + 13, torsoW - 2, 1, '#f8fafc');
    } else if (shirtStyle === 'tank') {
      px(s, cx - 1, torsoY + 1, 6, 2, skin);
      px(s, torsoLeft, torsoY + 1, 2, 4, skin);
      px(s, torsoLeft + torsoW - 2, torsoY + 1, 2, 4, skin);
    } else if (shirtStyle === 'dress') {
      px(s, cx, torsoY + 1, 5, 3, skin);
      px(s, torsoLeft + 1, torsoY + 9, torsoW - 2, 2, '#fef08a');
      px(s, cx + 1, torsoY + 9, 3, 3, '#facc15');
    } else if (shirtStyle === 'offshoulder') {
      px(s, torsoLeft + 1, torsoY, torsoW - 2, 3, skin);
      px(s, torsoLeft + 1, torsoY + 3, torsoW - 2, 2, shirtHi);
    } else if (shirtStyle === 'crop_cardigan') {
      px(s, cx, torsoY + 2, 5, 9, '#ffffff');
      px(s, torsoLeft + 2, torsoY + 12, torsoW - 4, 3, skin);
      px(s, cx - 1, torsoY + 4, 1, 7, shirtDeep);
    } else if (shirtStyle === 'halter') {
      px(s, torsoLeft, torsoY + 1, 3, 5, skin);
      px(s, torsoLeft + torsoW - 3, torsoY + 1, 3, 5, skin);
      px(s, cx, torsoY, 4, 2, shirtHi);
      px(s, torsoLeft + 2, torsoY + 12, torsoW - 4, 3, skin);
    } else if (shirtStyle === 'sailor_blouse') {
      px(s, cx - 5, torsoY + 1, 11, 4, '#1e3a8a');
      px(s, cx - 4, torsoY + 2, 9, 1, '#ffffff');
      px(s, cx + 1, torsoY + 4, 3, 3, '#ef4444');
    } else if (shirtStyle === 'varsity') {
      px(s, cx + 1, torsoY + 1, 2, 14, '#f8fafc');
      px(s, torsoLeft + 1, torsoY + 14, torsoW - 2, 2, '#f8fafc');
      px(s, cx - 3, torsoY + 5, 3, 4, '#fef08a');
    } else if (shirtStyle === 'leather_jacket') {
      px(s, cx, torsoY + 1, 5, 6, '#e2e8f0');
      px(s, cx + 2, torsoY + 3, 1, 11, '#cbd5e1');
      px(s, cx - 3, torsoY + 3, 2, 2, '#94a3b8');
    } else if (shirtStyle === 'track_jacket') {
      px(s, cx + 2, torsoY + 1, 1, 14, '#ffffff');
      px(s, torsoLeft + 1, torsoY + 3, 2, 11, '#ffffff');
    } else if (shirtStyle === 'turtleneck') {
      px(s, cx - 2, torsoY - 2, 6, 3, shirtHi);
      px(s, cx - 1, torsoY + 2, 5, 12, shirtHi);
    } else {
      // Classic crew tee collar
      px(s, cx + 1, torsoY + 1, 4, 2, skin);
      px(s, cx + 2, torsoY + 3, 2, 1, skinSoftLo);
    }

    if (accessory === 'gold_chain') {
      px(s, cx - 1, torsoY + 2, 7, 2, '#facc15');
      px(s, cx + 1, torsoY + 4, 3, 3, '#fef08a');
    } else if (accessory === 'scarf') {
      px(s, torsoLeft + 1, torsoY, torsoW - 2, 4, '#dc2626');
      px(s, torsoLeft + 2, torsoY + 1, torsoW - 4, 1, '#fca5a5');
      px(s, cx + 2, torsoY + 4, 3, 6, '#b91c1c');
    }
  } else {
    if (shirtStyle === 'hoodie') {
      px(s, cx - 5, torsoY, 11, 4, shirtLo);
      px(s, cx - 4, torsoY + 1, 8, 2, shirtDeep);
    } else if (shirtStyle === 'suit') {
      px(s, cx - 1, torsoY + 10, 1, 6, shirtDeep);
    } else if (shirtStyle === 'sailor_blouse') {
      px(s, cx - 5, torsoY + 1, 11, 5, '#1e3a8a');
      px(s, cx - 4, torsoY + 5, 9, 1, '#ffffff');
    }
  }

  // 4. NEAR ARM
  drawNearArm();

  // 5. VOLUMETRIC CHUNKY 2008 HABBO HEAD (18px wide x 19px tall, rounded jawline, clean chin)
  const hx = cx - 8;
  const hy = torsoY - 19;

  // Neck shadow under chin (warm skin tone so it never looks like a beard)
  px(s, hx + 6, hy + 18, 6, 2, skinSoftLo);

  // Rounded isometric head silhouette
  px(s, hx + 3, hy, 12, 1, skinHi);
  px(s, hx + 1, hy + 1, 16, 2, skin);
  px(s, hx, hy + 3, 18, 12, skin);
  px(s, hx + 1, hy + 15, 16, 2, skin);
  px(s, hx + 3, hy + 17, 11, 1, skinChin);

  // Volumetric 3/4 skin shading (sunlit forehead & near cheek, warm far-side contour)
  px(s, hx + 4, hy + 1, 10, 2, skinHi);
  px(s, hx, hy + 4, 2, 10, skinSoftLo);
  px(s, hx + 14, hy + 4, 3, 10, skinHi);
  // Subtle lower cheek contour (never dark brown/black on female avatars)
  if (!isFemale) {
    px(s, hx + 2, hy + 15, 11, 1, skinSoftLo);
  }

  // Shaded pixel ear on near side
  px(s, hx - 2, hy + 8, 2, 5, skin);
  px(s, hx - 1, hy + 9, 1, 3, skinSoftLo);

  // 6. EXPRESSIVE 3/4 EYES, EYEBROWS, NOSE BUMP & CLEAN MOUTH
  if (!facingBack) {
    const eyeY = hy + 8;
    const nearEyeX = hx + 8;
    const farEyeX = hx + 14;

    // Subtle pixel nose bump between eyes
    px(s, hx + 12, hy + 10, 1, 2, skinSoftLo);

    if (isFemale) {
      // Delicate 1px side eyelash & soft rosy cheek blush
      px(s, nearEyeX - 1, eyeY, 1, 1, '#141414');
      px(s, farEyeX + 2, eyeY, 1, 1, '#141414');
      px(s, nearEyeX - 2, eyeY + 3, 2, 1, '#fda4af');
    } else {
      // Subtle eyebrows for male avatars
      px(s, nearEyeX, eyeY - 2, 2, 1, hairLo);
      px(s, farEyeX, eyeY - 2, 2, 1, hairLo);
    }

    if (expression === 'serene') {
      px(s, nearEyeX, eyeY + 1, 2, 1, '#141414');
      px(s, farEyeX, eyeY + 1, 2, 1, '#141414');
      px(s, nearEyeX + 3, hy + 14, 2, 1, isFemale ? '#e11d48' : '#9a3412');
    } else if (expression === 'wink') {
      px(s, nearEyeX, eyeY + 1, 2, 1, '#141414');
      px(s, farEyeX, eyeY, 2, 3, '#141414');
      px(s, farEyeX, eyeY, 1, 1, '#ffffff');
      px(s, nearEyeX + 2, hy + 14, isFemale ? 2 : 3, 1, isFemale ? '#e11d48' : '#9a3412');
    } else if (expression === 'surprised') {
      px(s, nearEyeX, eyeY, 2, 3, '#141414');
      px(s, nearEyeX, eyeY, 1, 1, '#ffffff');
      px(s, farEyeX, eyeY, 2, 3, '#141414');
      px(s, farEyeX, eyeY, 1, 1, '#ffffff');
      px(s, nearEyeX + 3, hy + 13, 2, 2, isFemale ? '#e11d48' : '#7f1d1d');
    } else {
      px(s, nearEyeX, eyeY, 2, 3, '#141414');
      px(s, nearEyeX, eyeY, 1, 1, '#ffffff');
      px(s, farEyeX, eyeY, 2, 3, '#141414');
      px(s, farEyeX, eyeY, 1, 1, '#ffffff');

      if (expression === 'cool') {
        px(s, nearEyeX - 1, eyeY - 2, 3, 1, hairLo);
        px(s, farEyeX - 1, eyeY - 2, 3, 1, hairLo);
        px(s, nearEyeX + 3, hy + 14, isFemale ? 2 : 3, 1, isFemale ? '#e11d48' : '#9a3412');
      } else if (expression === 'cheeky') {
        if (isFemale) {
          px(s, nearEyeX + 2, hy + 14, 3, 1, '#e11d48');
          px(s, nearEyeX + 3, hy + 13, 2, 1, '#fda4af');
        } else {
          px(s, nearEyeX + 2, hy + 13, 4, 2, '#991b1b');
          px(s, nearEyeX + 3, hy + 13, 2, 1, '#ffffff');
        }
      } else {
        // Clean 2px rosy mouth for female, warm smile for male (never beard-like!)
        if (isFemale) {
          px(s, nearEyeX + 3, hy + 14, 2, 1, '#e11d48');
          px(s, nearEyeX + 3, hy + 13, 2, 1, '#fda4af');
        } else {
          px(s, nearEyeX + 2, hy + 14, 3, 1, '#9a3412');
        }
      }
    }

    // Optional beard ONLY when explicitly selected on a male avatar
    if (accessory === 'beard' && !isFemale) {
      px(s, hx + 6, hy + 14, 11, 4, hairLo);
      px(s, hx + 8, hy + 13, 7, 1, hair);
    }
  }

  // 7. VOLUMETRIC LAYERED HAIR (3-tone highlights & shadows)
  if (facingBack) {
    px(s, hx + 1, hy - 2, 16, 3, hairHi);
    px(s, hx - 1, hy + 1, 19, 13, hair);
    px(s, hx - 1, hy + 3, 3, 10, hairLo);
    if (hairStyle === 'long' || hairStyle === 'side_fringe') {
      px(s, hx - 1, hy + 12, 18, 11, hair);
      px(s, hx, hy + 13, 4, 10, hairLo);
      px(s, hx + 12, hy + 13, 3, 9, hairHi);
    } else if (hairStyle === 'ponytail') {
      px(s, hx + 5, hy + 4, 7, 15, hairLo);
      px(s, hx + 6, hy + 5, 5, 13, hairHi);
    } else if (hairStyle === 'pigtails') {
      px(s, hx - 4, hy + 4, 4, 14, hairLo);
      px(s, hx + 17, hy + 4, 4, 14, hair);
    } else if (hairStyle === 'princess_bun' || hairStyle === 'bun') {
      px(s, hx + 5, hy - 7, 8, 6, hair);
      px(s, hx + 6, hy - 6, 6, 3, hairHi);
    } else if (hairStyle === 'mohawk') {
      px(s, hx, hy + 2, 17, 11, skinSoftLo);
      px(s, hx + 6, hy - 6, 5, 17, hair);
      px(s, hx + 7, hy - 5, 3, 14, hairHi);
    } else if (hairStyle === 'spiky' || hairStyle === 'messy') {
      px(s, hx + 2, hy - 5, 4, 4, hairHi);
      px(s, hx + 8, hy - 6, 4, 5, hair);
      px(s, hx + 13, hy - 4, 3, 3, hairHi);
    }
  } else {
    if (hairStyle === 'spiky') {
      px(s, hx + 1, hy - 2, 16, 6, hair);
      px(s, hx - 1, hy + 2, 4, 7, hairLo);
      px(s, hx + 3, hy + 3, 13, 3, hairHi);
      px(s, hx + 2, hy - 5, 4, 4, hairHi);
      px(s, hx + 7, hy - 6, 4, 5, hair);
      px(s, hx + 12, hy - 5, 4, 4, hairHi);
    } else if (hairStyle === 'messy') {
      px(s, hx, hy - 3, 18, 7, hair);
      px(s, hx - 2, hy + 1, 4, 7, hairLo);
      px(s, hx + 2, hy - 5, 5, 3, hairHi);
      px(s, hx + 9, hy - 4, 6, 3, hairHi);
      px(s, hx + 4, hy + 3, 5, 3, hair);
      px(s, hx + 11, hy + 3, 5, 2, hairHi);
    } else if (hairStyle === 'quiff') {
      px(s, hx, hy - 1, 17, 5, hair);
      px(s, hx - 1, hy + 2, 3, 6, hairLo);
      px(s, hx + 5, hy - 5, 11, 5, hair);
      px(s, hx + 7, hy - 4, 8, 2, hairHi);
      px(s, hx + 4, hy + 3, 11, 2, hairLo);
    } else if (hairStyle === 'pompadour') {
      px(s, hx, hy - 2, 17, 6, hair);
      px(s, hx - 1, hy + 2, 3, 6, hairLo);
      px(s, hx + 3, hy - 7, 14, 6, hair);
      px(s, hx + 5, hy - 6, 11, 3, hairHi);
    } else if (hairStyle === 'side_part') {
      px(s, hx, hy - 2, 18, 5, hair);
      px(s, hx + 4, hy - 2, 11, 2, hairHi);
      px(s, hx - 1, hy + 2, 3, 5, hairLo);
      px(s, hx + 7, hy + 2, 10, 2, hair);
    } else if (hairStyle === 'buzzcut') {
      px(s, hx + 1, hy - 1, 16, 4, hairLo);
      px(s, hx + 3, hy - 1, 11, 2, hair);
      px(s, hx, hy + 2, 2, 4, hairLo);
    } else if (hairStyle === 'bob') {
      px(s, hx, hy - 2, 18, 6, hair);
      px(s, hx + 2, hy - 1, 12, 2, hairHi);
      px(s, hx - 2, hy + 3, 5, 13, hairLo);
      px(s, hx + 16, hy + 3, 2, 12, hair);
      px(s, hx + 4, hy + 3, 11, 3, hairHi);
    } else if (hairStyle === 'long') {
      px(s, hx, hy - 2, 18, 6, hair);
      px(s, hx + 2, hy - 1, 12, 2, hairHi);
      px(s, hx - 2, hy + 3, 5, 19, hairLo);
      px(s, hx - 1, hy + 5, 2, 16, hair);
      px(s, hx + 16, hy + 3, 2, 17, hair);
      px(s, hx + 5, hy + 3, 10, 3, hairHi);
    } else if (hairStyle === 'ponytail') {
      px(s, hx, hy - 2, 18, 6, hair);
      px(s, hx + 3, hy - 1, 11, 2, hairHi);
      px(s, hx + 4, hy + 3, 11, 2, hairHi);
      px(s, hx - 2, hy - 3, 4, 4, '#f43f5e');
      px(s, hx - 6, hy - 2, 5, 15, hairLo);
      px(s, hx - 5, hy - 1, 3, 12, hair);
    } else if (hairStyle === 'pigtails') {
      px(s, hx, hy - 2, 18, 6, hair);
      px(s, hx + 3, hy - 1, 11, 2, hairHi);
      px(s, hx + 4, hy + 3, 11, 2, hairHi);
      px(s, hx - 3, hy, 3, 3, '#ec4899');
      px(s, hx - 5, hy + 2, 4, 15, hairLo);
      px(s, hx - 4, hy + 3, 2, 13, hair);
      px(s, hx + 17, hy + 1, 3, 14, hair);
      px(s, hx + 18, hy + 2, 2, 11, hairHi);
    } else if (hairStyle === 'side_fringe' || hairStyle === 'fringe') {
      px(s, hx, hy - 2, 18, 6, hair);
      px(s, hx + 2, hy - 1, 13, 2, hairHi);
      px(s, hx - 2, hy + 3, 4, 15, hairLo);
      px(s, hx + 3, hy + 2, 13, 3, hair);
      px(s, hx + 9, hy + 4, 7, 3, hairHi);
    } else if (hairStyle === 'braided_crown' || hairStyle === 'braids') {
      px(s, hx, hy - 3, 18, 7, hair);
      for (let bx = 1; bx <= 14; bx += 3) {
        px(s, hx + bx, hy - 2, 2, 3, hairHi);
        px(s, hx + bx + 1, hy - 1, 2, 3, hairLo);
      }
      px(s, hx - 2, hy + 3, 4, 12, hairLo);
    } else if (hairStyle === 'princess_bun' || hairStyle === 'bun') {
      px(s, hx, hy - 2, 18, 6, hair);
      px(s, hx + 3, hy - 1, 11, 2, hairHi);
      px(s, hx + 4, hy - 8, 9, 6, hair);
      px(s, hx + 5, hy - 7, 7, 3, hairHi);
      px(s, hx + 6, hy - 3, 5, 1, '#fef08a');
      px(s, hx - 1, hy + 3, 3, 9, hairLo);
    } else if (hairStyle === 'mohawk') {
      px(s, hx + 5, hy - 7, 7, 11, hair);
      px(s, hx + 7, hy - 6, 4, 9, hairHi);
      px(s, hx, hy + 3, 2, 4, hairLo);
    } else {
      // curls / afro
      px(s, hx - 2, hy - 4, 21, 8, hair);
      px(s, hx + 2, hy - 4, 6, 3, hairHi);
      px(s, hx + 10, hy - 3, 6, 3, hairHi);
      px(s, hx - 3, hy + 2, 5, 8, hairLo);
      px(s, hx + 16, hy + 2, 3, 7, hair);
    }
  }

  // 8. 3/4 HEADWEAR & ACCESSORIES
  if (accessory === 'crown') {
    px(s, hx + 3, hy - 6, 13, 5, '#facc15');
    px(s, hx + 4, hy - 8, 2, 3, '#fef08a');
    px(s, hx + 8, hy - 9, 3, 4, '#fef08a');
    px(s, hx + 13, hy - 8, 2, 3, '#facc15');
    px(s, hx + 8, hy - 4, 2, 2, '#dc2626');
    px(s, hx + 5, hy - 4, 1, 1, '#38bdf8');
    px(s, hx + 12, hy - 4, 1, 1, '#38bdf8');
    px(s, hx + 3, hy - 2, 13, 1, '#ca8a04');
  } else if (accessory === 'tiara') {
    px(s, hx + 4, hy - 5, 11, 3, '#e2e8f0');
    px(s, hx + 6, hy - 7, 7, 3, '#f8fafc');
    px(s, hx + 8, hy - 8, 3, 3, '#ffffff');
    px(s, hx + 8, hy - 5, 2, 2, '#ec4899');
  } else if (accessory === 'headphones') {
    px(s, hx + 1, hy - 3, 16, 3, '#475569');
    px(s, hx - 2, hy + 6, 4, 7, '#1e293b');
    px(s, hx - 1, hy + 7, 2, 4, '#38bdf8');
    px(s, hx + 16, hy + 6, 3, 6, '#1e293b');
    px(s, hx + 17, hy + 7, 1, 3, '#38bdf8');
  } else if (accessory === 'sunglasses' && !facingBack) {
    px(s, hx + 7, hy + 7, 5, 4, '#09090b');
    px(s, hx + 13, hy + 7, 5, 4, '#09090b');
    px(s, hx + 8, hy + 8, 2, 1, '#e4e4e7');
    px(s, hx + 14, hy + 8, 2, 1, '#e4e4e7');
    px(s, hx + 1, hy + 8, 6, 1, '#18181b');
  } else if (accessory === 'cap') {
    px(s, hx, hy - 3, 17, 6, '#dc2626');
    px(s, hx + 2, hy - 3, 11, 2, '#f87171');
    if (!facingBack) {
      px(s, hx + 7, hy + 2, 12, 3, '#991b1b');
      px(s, hx + 8, hy + 2, 10, 1, '#ef4444');
    }
  } else if (accessory === 'beanie') {
    px(s, hx, hy - 5, 18, 7, '#0284c7');
    px(s, hx + 2, hy - 5, 12, 3, '#38bdf8');
    px(s, hx - 1, hy, 19, 3, '#0369a1');
    px(s, hx + 6, hy - 8, 5, 3, '#f8fafc');
  } else if (accessory === 'beret') {
    px(s, hx - 2, hy - 4, 19, 5, '#be123c');
    px(s, hx, hy - 4, 13, 2, '#f43f5e');
    px(s, hx + 6, hy - 6, 3, 2, '#881337');
  } else if (accessory === 'top_hat') {
    px(s, hx - 2, hy, 22, 2, '#1e293b');
    px(s, hx + 1, hy - 10, 16, 10, '#0f172a');
    px(s, hx + 3, hy - 9, 5, 8, '#334155');
    px(s, hx + 1, hy - 2, 16, 2, '#dc2626');
  } else if (accessory === 'devil_horns') {
    px(s, hx + 1, hy - 6, 3, 5, '#dc2626');
    px(s, hx, hy - 8, 2, 3, '#ef4444');
    px(s, hx + 14, hy - 6, 3, 5, '#dc2626');
    px(s, hx + 16, hy - 8, 2, 3, '#ef4444');
  } else if (accessory === 'angel_halo') {
    px(s, hx + 3, hy - 8, 12, 2, '#fde047');
    px(s, hx + 5, hy - 9, 8, 1, '#ffffff');
    px(s, hx + 5, hy - 6, 8, 1, '#ca8a04');
  } else if (accessory === 'cat_ears' || accessory === 'bunny_ears') {
    px(s, hx + 1, hy - 6, 4, 5, '#18181b');
    px(s, hx + 2, hy - 4, 2, 3, '#f472b6');
    px(s, hx + 13, hy - 6, 4, 5, '#18181b');
    px(s, hx + 14, hy - 4, 2, 3, '#f472b6');
  } else if (accessory === 'flower_clip') {
    px(s, hx + 1, hy, 5, 5, '#fb7185');
    px(s, hx + 2, hy + 1, 3, 3, '#fda4af');
    px(s, hx + 3, hy + 2, 1, 1, '#fef08a');
  }

  const oriented = makeOffscreen(W, H);
  if (mirrorX) {
    oriented.ctx.translate(W, 0);
    oriented.ctx.scale(-1, 1);
  }
  oriented.ctx.drawImage(scratch, 0, 0);

  if (inWater) {
    ctx.strokeStyle = animStep % 2 === 0 ? 'rgba(224, 242, 254, 0.92)' : 'rgba(125, 211, 252, 0.78)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, baseY - 11, 15 + (animStep % 2) * 2, 6 + (animStep % 2), 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 1, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp 1px solid #141414 outer silhouette outline pass
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
    const clipH = baseY - 14;
    ctx.drawImage(outlined.canvas, 0, 0, W, clipH, 0, 8, W, clipH);
    px(ctx, cx - 11, baseY - 7, 22, 2, 'rgba(224, 242, 254, 0.85)');
  } else {
    ctx.drawImage(outlined.canvas, 0, 0);
  }

  return canvas;
}

function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function ditherIsoFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c1: string,
  c2: string
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  for (let py = 0; py < rh; py++) {
    for (let pxOff = 0; pxOff < rw; pxOff++) {
      ctx.fillStyle = (pxOff + py) % 2 === 0 ? c1 : c2;
      ctx.fillRect(rx + pxOff, ry + py, 1, 1);
    }
  }
}

export function fillIsoDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  hiRidge?: string,
  loRidge?: string,
  ditherColor?: string
) {
  const irx = Math.max(2, Math.round(rx));
  const iry = Math.max(1, Math.round(ry));
  const icx = Math.round(cx);
  const icy = Math.round(cy);

  for (let dy = -iry; dy <= iry; dy++) {
    const span = Math.round(irx * (1 - Math.abs(dy) / iry));
    for (let dx = -span; dx <= span; dx++) {
      const pxX = icx + dx;
      const pxY = icy + dy;
      if (ditherColor && (pxX + pxY) % 2 === 0) {
        ctx.fillStyle = ditherColor;
      } else {
        ctx.fillStyle = fill;
      }
      ctx.fillRect(pxX, pxY, 1, 1);
    }
    if (hiRidge && dy < 0 && span > 0) {
      ctx.fillStyle = hiRidge;
      ctx.fillRect(icx - span, icy + dy, 1, 1);
      ctx.fillRect(icx + span, icy + dy, 1, 1);
    }
    if (loRidge && dy >= 0 && span > 0) {
      ctx.fillStyle = loRidge;
      ctx.fillRect(icx - span, icy + dy, 1, 1);
      ctx.fillRect(icx + span, icy + dy, 1, 1);
    }
  }
}

export function drawSelOutIsoBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  topY: number,
  height: number,
  rx: number,
  ry: number,
  baseColor: string,
  offsetX = 0,
  offsetY = 0,
  ditherTop = false
) {
  const ox = Math.round(cx + offsetX);
  const oy = Math.round(cy + offsetY - topY);
  const irx = Math.max(2, Math.round(rx));
  const iry = Math.max(1, Math.round(ry));
  const ih = Math.max(1, Math.round(height));

  const topCol = baseColor;
  const topDither = ditherTop ? shadeHex(baseColor, 10) : undefined;
  const ridgeHi = shadeHex(baseColor, 32);
  const seamMid = shadeHex(baseColor, 16);
  const leftCol = shadeHex(baseColor, -18);
  const rightCol = shadeHex(baseColor, -42);
  const creviceLo = shadeHex(baseColor, -56);

  // Left-Front face (82% brightness)
  for (let dx = -irx; dx <= 0; dx++) {
    const edgeY = oy + Math.round(((dx + irx) / irx) * iry);
    ctx.fillStyle = dx === -irx ? shadeHex(leftCol, 12) : leftCol;
    ctx.fillRect(ox + dx, edgeY, 1, ih);
    ctx.fillStyle = creviceLo;
    ctx.fillRect(ox + dx, edgeY + ih - 1, 1, 1);
  }

  // Right-Front face (62% brightness)
  for (let dx = 0; dx <= irx; dx++) {
    const edgeY = oy + Math.round(((irx - dx) / irx) * iry);
    ctx.fillStyle = dx === 0 ? creviceLo : rightCol;
    ctx.fillRect(ox + dx, edgeY, 1, ih);
    ctx.fillStyle = creviceLo;
    ctx.fillRect(ox + dx, edgeY + ih - 1, 1, 1);
  }

  // Top face (100% brightness + sel-out specular ridges)
  fillIsoDiamond(ctx, ox, oy, irx, iry, topCol, ridgeHi, seamMid, topDither);
}

export function drawSelOutRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  hi?: string,
  lo?: string
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.max(1, Math.round(w));
  const rh = Math.max(1, Math.round(h));
  const hiCol = hi ?? shadeHex(fill, 28);
  const loCol = lo ?? shadeHex(fill, -32);
  px(ctx, rx, ry, rw, rh, fill);
  if (rw >= 2 && rh >= 2) {
    px(ctx, rx, ry, rw, 1, hiCol);
    px(ctx, rx, ry, 1, rh, hiCol);
    px(ctx, rx + rw - 1, ry + 1, 1, rh - 1, loCol);
    px(ctx, rx + 1, ry + rh - 1, rw - 1, 1, loCol);
  }
}

export function drawExtendedFurniSprite(
  ctx: CanvasRenderingContext2D,
  furniId: string,
  dir: Direction,
  state: number,
  frame: number,
  cx: number,
  cy: number,
  drawIsoBox: (
    topY: number,
    height: number,
    rx: number,
    ry: number,
    topColor: string,
    leftColor: string,
    rightColor: string,
    offsetX?: number,
    offsetY?: number
  ) => void
): boolean {
  // Void unused legacy callback parameter while keeping signature compatibility
  void drawIsoBox;
  void dir;

  // --- PIXL CLUB (PC) & VIP EXCLUSIVES ---
  if (furniId === 'hc_armchair') {
    // Plush crimson velvet PIXL Club armchair with mahogany side panels & gold studs
    drawSelOutRect(ctx, cx - 14, cy - 4, 4, 4, '#451a03');
    drawSelOutRect(ctx, cx + 10, cy - 4, 4, 4, '#451a03');
    drawSelOutIsoBox(ctx, cx, cy, 10, 8, 16, 8, '#991b1b');
    drawSelOutIsoBox(ctx, cx, cy, 14, 5, 13, 6, '#dc2626', 0, 0, true);
    // Tufted crimson backrest
    drawSelOutIsoBox(ctx, cx, cy, 28, 14, 10, 5, '#ef4444', -6, -3, true);
    px(ctx, cx - 8, cy - 23, 2, 2, '#991b1b');
    px(ctx, cx - 3, cy - 21, 2, 2, '#991b1b');
    // Curved oak armrests with gold trim studs
    drawSelOutIsoBox(ctx, cx, cy, 18, 9, 5, 3, '#b45309', -11, 2);
    drawSelOutIsoBox(ctx, cx, cy, 18, 9, 5, 3, '#b45309', 11, -2);
    px(ctx, cx - 12, cy - 13, 2, 2, '#facc15');
    px(ctx, cx + 10, cy - 17, 2, 2, '#facc15');
    return true;
  }

  if (furniId === 'holoboy' || furniId === 'hologirl') {
    const isGirl = furniId === 'hologirl';
    const holoMain = isGirl ? '#f472b6' : '#38bdf8';
    const holoHi = isGirl ? '#fbcfe8' : '#e0f2fe';
    const holoLo = isGirl ? '#db2777' : '#0284c7';
    // Octagonal brushed bronze/steel emitter pedestal
    drawSelOutIsoBox(ctx, cx, cy, 8, 7, 15, 7, '#64748b');
    drawSelOutIsoBox(ctx, cx, cy, 11, 3, 11, 5, '#94a3b8');
    fillIsoDiamond(ctx, cx, cy - 11, 8, 4, state === 1 ? holoHi : holoLo, '#ffffff');
    // Rotating translucent scanline hologram figure above pedestal
    const bob = frame % 2 === 0 ? 0 : -1;
    const hBase = cy - 15 + bob;
    // Legs & pedestal beam
    px(ctx, cx - 4, hBase - 6, 8, 6, holoLo);
    px(ctx, cx - 3, hBase - 14, 6, 8, holoMain);
    // Torso & arms
    px(ctx, cx - 6, hBase - 24, 12, 10, holoMain);
    px(ctx, cx - 4, hBase - 23, 8, 8, holoHi);
    if (isGirl) {
      // Flared holo skirt
      px(ctx, cx - 6, hBase - 15, 12, 4, holoHi);
    }
    // Head
    px(ctx, cx - 5, hBase - 34, 10, 9, holoHi);
    px(ctx, cx - 3, hBase - 32, 6, 5, '#ffffff');
    if (isGirl) {
      px(ctx, cx - 6, hBase - 31, 2, 7, holoMain);
      px(ctx, cx + 4, hBase - 31, 2, 7, holoMain);
    }
    // Horizontal hologram scanlines
    for (let sy = hBase - 33; sy <= hBase - 8; sy += 3) {
      px(ctx, cx - 5, sy, 10, 1, holoLo);
    }
    return true;
  }

  if (furniId === 'samovar') {
    // Ornate Russian Brass Samovar Tea Urn
    drawSelOutIsoBox(ctx, cx, cy, 7, 6, 12, 6, '#b45309');
    drawSelOutIsoBox(ctx, cx, cy, 11, 4, 8, 4, '#d97706');
    // Sculpted brass urn belly with specular vertical highlight
    drawSelOutRect(ctx, cx - 9, cy - 34, 18, 22, '#eab308', '#fef08a', '#92400e');
    drawSelOutRect(ctx, cx - 11, cy - 30, 22, 14, '#f59e0b', '#fef08a', '#92400e');
    px(ctx, cx - 5, cy - 32, 3, 18, '#fef9c3');
    // Curved side handles & spout
    drawSelOutRect(ctx, cx - 14, cy - 29, 3, 9, '#ca8a04', '#fef08a', '#78350f');
    drawSelOutRect(ctx, cx + 11, cy - 29, 3, 9, '#ca8a04', '#fef08a', '#78350f');
    px(ctx, cx - 2, cy - 18, 4, 4, '#92400e');
    // Crowned chimney & tiny teapot on top
    drawSelOutRect(ctx, cx - 6, cy - 41, 12, 7, '#d97706', '#fef08a', '#78350f');
    drawSelOutRect(ctx, cx - 4, cy - 47, 8, 6, '#facc15', '#ffffff', '#b45309');
    if (state === 1) {
      // Rising pixel steam puffs
      px(ctx, cx - 2 + (frame % 2), cy - 53 - frame * 2, 3, 3, '#f8fafc');
      px(ctx, cx + 1, cy - 58 - frame * 2, 4, 3, '#e2e8f0');
    }
    return true;
  }

  if (furniId === 'yukka_plant' || furniId === 'pineapple_plant') {
    const isPineapple = furniId === 'pineapple_plant';
    // Terracotta isometric planter pot
    drawSelOutIsoBox(ctx, cx, cy, 10, 9, 12, 6, '#c2410c');
    drawSelOutIsoBox(ctx, cx, cy, 13, 3, 14, 7, '#ea580c');
    fillIsoDiamond(ctx, cx, cy - 13, 11, 5, '#451a03');

    if (isPineapple) {
      // Spiky rosette of arching tropical leaves + golden pineapple fruit in center
      const leafOffsets: [number, number, number, number, string][] = [
        [-16, -20, 12, 4, '#15803d'],
        [4, -20, 12, 4, '#15803d'],
        [-14, -25, 11, 4, '#16a34a'],
        [3, -25, 11, 4, '#16a34a'],
        [-10, -30, 8, 4, '#22c55e'],
        [2, -30, 8, 4, '#22c55e'],
      ];
      for (const [lx, ly, lw, lh, lcol] of leafOffsets) {
        drawSelOutRect(ctx, cx + lx, cy + ly, lw, lh, lcol);
      }
      // Golden diamond-patterned pineapple in center
      drawSelOutRect(ctx, cx - 5, cy - 33, 10, 13, '#eab308', '#fef08a', '#a16207');
      ditherIsoFace(ctx, cx - 4, cy - 31, 8, 10, '#facc15', '#ca8a04');
      // Green crown tuft on top of pineapple
      drawSelOutRect(ctx, cx - 4, cy - 40, 8, 7, '#22c55e', '#86efac', '#15803d');
      px(ctx, cx - 6, cy - 38, 12, 3, '#16a34a');
    } else {
      // Dual woody Yukka trunks + lush multi-shade sword-leaf rosettes
      drawSelOutRect(ctx, cx - 4, cy - 32, 4, 19, '#78350f', '#a16207', '#451a03');
      drawSelOutRect(ctx, cx + 1, cy - 25, 4, 12, '#92400e', '#b45309', '#451a03');
      const clusters: [number, number][] = [
        [cx - 3, cy - 35],
        [cx + 3, cy - 27],
      ];
      for (const [rcx, rcy] of clusters) {
        px(ctx, rcx - 11, rcy - 2, 10, 4, '#14532d');
        px(ctx, rcx + 2, rcy - 2, 10, 4, '#14532d');
        px(ctx, rcx - 9, rcy - 6, 9, 4, '#16a34a');
        px(ctx, rcx + 1, rcy - 6, 9, 4, '#16a34a');
        px(ctx, rcx - 5, rcy - 10, 10, 5, '#22c55e');
        px(ctx, rcx - 3, rcy - 12, 6, 3, '#86efac');
      }
    }
    return true;
  }

  if (furniId === 'lodge_bear_rug') {
    // Cozy woodland Grizzly Bear Pelt Rug on 2:1 isometric floor
    fillIsoDiamond(ctx, cx, cy, 26, 13, '#78350f', '#92400e', '#451a03', '#854d0e');
    fillIsoDiamond(ctx, cx, cy, 18, 9, '#92400e', '#b45309', '#78350f', '#a16207');
    // Outstretched bear paws with cream claws
    const paws: [number, number][] = [
      [-18, -6],
      [14, -6],
      [-18, 5],
      [14, 5],
    ];
    for (const [pxOff, pyOff] of paws) {
      drawSelOutRect(ctx, cx + pxOff, cy + pyOff, 6, 4, '#78350f', '#a16207', '#451a03');
      px(ctx, cx + pxOff, cy + pyOff + 2, 1, 2, '#fef3c7');
      px(ctx, cx + pxOff + 2, cy + pyOff + 2, 1, 2, '#fef3c7');
    }
    // Sculpted 3D bear head at front-left of rug
    drawSelOutIsoBox(ctx, cx, cy, 9, 7, 9, 5, '#78350f', -12, 4);
    drawSelOutRect(ctx, cx - 19, cy - 7, 4, 4, '#451a03', '#92400e');
    drawSelOutRect(ctx, cx - 10, cy - 7, 4, 4, '#451a03', '#92400e');
    px(ctx, cx - 18, cy + 1, 5, 3, '#d97706'); // snout
    px(ctx, cx - 17, cy + 1, 2, 2, '#141414'); // nose
    px(ctx, cx - 15, cy - 2, 1, 2, '#141414');
    px(ctx, cx - 12, cy - 2, 1, 2, '#141414');
    return true;
  }

  if (furniId === 'plasto_table') {
    // Classic 2008 Habbo Round Molded Plastic Table on central tulip pedestal
    fillIsoDiamond(ctx, cx, cy, 11, 5, '#cbd5e1', '#ffffff', '#64748b');
    drawSelOutRect(ctx, cx - 3, cy - 18, 6, 16, '#e2e8f0', '#ffffff', '#94a3b8');
    // Thick glossy circular/octagonal table top
    drawSelOutIsoBox(ctx, cx, cy, 21, 4, 24, 12, '#0ea5e9');
    fillIsoDiamond(ctx, cx, cy - 21, 22, 11, '#38bdf8', '#e0f2fe', '#0284c7');
    // Glossy white plastic specular reflection streak
    px(ctx, cx - 10, cy - 25, 9, 2, '#ffffff');
    px(ctx, cx - 6, cy - 23, 5, 1, '#bae6fd');
    return true;
  }

  if (furniId === 'hc_nordic_table') {
    drawSelOutRect(ctx, cx - 22, cy - 15, 5, 15, '#451a03', '#78350f', '#270e02');
    drawSelOutRect(ctx, cx + 17, cy - 15, 5, 15, '#451a03', '#78350f', '#270e02');
    drawSelOutIsoBox(ctx, cx, cy, 18, 6, 26, 13, '#b45309', 0, 0, true);
    fillIsoDiamond(ctx, cx, cy - 18, 20, 10, '#d97706', '#fef08a', '#78350f');
    px(ctx, cx - 3, cy - 19, 6, 3, '#fef08a');
    return true;
  }
  if (furniId === 'hc_butler_statue') {
    drawSelOutIsoBox(ctx, cx, cy, 8, 8, 16, 8, '#78350f');
    drawSelOutRect(ctx, cx - 9, cy - 46, 18, 36, '#1e293b', '#475569', '#0f172a');
    px(ctx, cx - 3, cy - 44, 6, 12, '#ffffff');
    px(ctx, cx - 2, cy - 42, 4, 2, '#dc2626');
    drawSelOutRect(ctx, cx - 7, cy - 58, 14, 12, '#f5d0a9', '#fde68a', '#d97706');
    drawSelOutRect(ctx, cx + 6, cy - 34, 12, 4, '#cbd5e1', '#ffffff', '#64748b');
    px(ctx, cx + 10, cy - 41, 4, 7, '#22c55e');
    return true;
  }
  if (furniId === 'hc_fireplace') {
    drawSelOutIsoBox(ctx, cx, cy, 34, 34, 24, 12, '#9a3412', 0, 0, true);
    drawSelOutIsoBox(ctx, cx, cy, 36, 5, 26, 13, '#eab308');
    drawSelOutRect(ctx, cx - 12, cy - 28, 24, 22, '#1c1917', '#451a03', '#09090b');
    if (state === 1) {
      const f = frame % 3;
      px(ctx, cx - 8, cy - 22 - f, 16, 14 + f, '#ea580c');
      px(ctx, cx - 5, cy - 19 - f, 10, 10 + f, '#facc15');
      px(ctx, cx - 2, cy - 15 - f, 4, 6, '#fef9c3');
    }
    return true;
  }
  if (furniId === 'hc_grand_chandelier') {
    drawSelOutIsoBox(ctx, cx, cy, 6, 5, 12, 6, '#eab308');
    drawSelOutRect(ctx, cx - 2, cy - 66, 4, 58, '#ca8a04', '#fef08a', '#78350f');
    drawSelOutRect(ctx, cx - 20, cy - 52, 40, 8, '#eab308', '#fef08a', '#854d0e');
    const cCol = state === 1 ? '#fef08a' : '#cbd5e1';
    for (const lx of [-17, -7, 5, 15]) {
      drawSelOutRect(ctx, cx + lx, cy - 62, 4, 10, '#ffffff', cCol, '#94a3b8');
      if (state === 1) px(ctx, cx + lx + 1, cy - 66 - (frame % 2), 2, 4, '#f97316');
    }
    return true;
  }
  if (furniId === 'hc_globe') {
    drawSelOutIsoBox(ctx, cx, cy, 10, 10, 16, 8, '#92400e');
    drawSelOutRect(ctx, cx - 13, cy - 44, 26, 26, '#ca8a04', '#fef08a', '#78350f');
    drawSelOutRect(ctx, cx - 10, cy - 41, 20, 20, '#0284c7', '#38bdf8', '#0369a1');
    px(ctx, cx - 6 + frame * 2, cy - 36, 7, 6, '#22c55e');
    px(ctx, cx + 1 - frame, cy - 29, 6, 5, '#16a34a');
    return true;
  }
  if (furniId === 'hc_gramophone') {
    drawSelOutIsoBox(ctx, cx, cy, 14, 14, 16, 8, '#92400e');
    fillIsoDiamond(ctx, cx, cy - 15, 10, 5, '#18181b', '#475569');
    px(ctx, cx - 1, cy - 16, 2, 2, '#ef4444');
    // Sculpted brass horn
    drawSelOutRect(ctx, cx + 2, cy - 38, 4, 20, '#ca8a04', '#fef08a', '#78350f');
    drawSelOutRect(ctx, cx + 4, cy - 54, 14, 16, '#eab308', '#fef08a', '#92400e');
    drawSelOutRect(ctx, cx + 7, cy - 51, 9, 10, '#b45309', '#f59e0b', '#78350f');
    if (state === 1) {
      px(ctx, cx + 18, cy - 58 - frame * 2, 4, 4, '#38bdf8');
      px(ctx, cx + 12, cy - 64 - frame, 4, 4, '#ec4899');
    }
    return true;
  }
  if (furniId === 'gold_dragon' || furniId === 'frost_dragon') {
    const isGold = furniId === 'gold_dragon';
    const main = isGold ? '#eab308' : '#38bdf8';
    const hi = isGold ? '#fef08a' : '#e0f2fe';
    const lo = isGold ? '#854d0e' : '#0284c7';
    // Clawed metallic pedestal
    drawSelOutIsoBox(ctx, cx, cy, 11, 10, 18, 9, isGold ? '#78350f' : '#0369a1');
    // S-curve coiled dragon tail & body
    drawSelOutRect(ctx, cx - 12, cy - 24, 22, 12, main, hi, lo);
    drawSelOutRect(ctx, cx - 8, cy - 38, 16, 16, main, hi, lo);
    // Sculpted dragon wings on back
    drawSelOutRect(ctx, cx - 18, cy - 44, 10, 14, lo, main, '#0f172a');
    drawSelOutRect(ctx, cx - 10, cy - 52, 22, 15, main, hi, lo);
    // Snout, horns & glowing eyes
    drawSelOutRect(ctx, cx + 6, cy - 48, 10, 9, main, hi, lo);
    px(ctx, cx - 8, cy - 58, 3, 6, '#ffffff');
    px(ctx, cx + 2, cy - 58, 3, 6, '#ffffff');
    px(ctx, cx + 2, cy - 48, 3, 2, isGold ? '#dc2626' : '#ffffff');
    if (state === 1) {
      const fShift = frame === 0 ? 0 : frame === 1 ? -2 : 2;
      px(ctx, cx + 16, cy - 46 + fShift, 12, 8, isGold ? '#f97316' : '#22d3ee');
      px(ctx, cx + 18, cy - 44 + fShift, 8, 5, isGold ? '#fef08a' : '#ffffff');
    }
    return true;
  }
  if (furniId === 'blue_amber_lamp') {
    // Ornate brass claw tripod base + glowing translucent egg-shaped blue amber globe
    drawSelOutIsoBox(ctx, cx, cy, 8, 7, 15, 7, '#d97706');
    drawSelOutRect(ctx, cx - 4, cy - 22, 8, 14, '#eab308', '#fef08a', '#92400e');
    const c = state === 1 ? '#38bdf8' : '#0284c7';
    const hi = state === 1 ? '#e0f2fe' : '#7dd3fc';
    // Egg-shaped translucent globe
    drawSelOutRect(ctx, cx - 9, cy - 48, 18, 26, c, hi, '#0369a1');
    drawSelOutRect(ctx, cx - 12, cy - 43, 24, 16, c, hi, '#0369a1');
    if (state === 1) {
      px(ctx, cx - 5, cy - 41, 10, 12, '#bae6fd');
      px(ctx, cx - 3, cy - 38, 6, 6, '#ffffff');
    }
    px(ctx, cx - 6, cy - 44, 3, 6, '#ffffff');
    drawSelOutRect(ctx, cx - 3, cy - 53, 6, 5, '#eab308', '#fef08a', '#92400e');
    return true;
  }
  if (furniId === 'emerald_pillow' || furniId === 'white_lace_pillow') {
    const isEm = furniId === 'emerald_pillow';
    const base = isEm ? '#16a34a' : '#f1f5f9';
    drawSelOutIsoBox(ctx, cx, cy, 9, 7, 22, 11, base, 0, 0, true);
    fillIsoDiamond(
      ctx,
      cx,
      cy - 10,
      16,
      8,
      isEm ? '#22c55e' : '#ffffff',
      '#ffffff',
      isEm ? '#15803d' : '#cbd5e1'
    );
    // Gold corner tassels
    px(ctx, cx - 22, cy - 7, 3, 4, '#facc15');
    px(ctx, cx + 19, cy - 7, 3, 4, '#facc15');
    px(ctx, cx - 1, cy + 2, 3, 4, '#facc15');
    return true;
  }
  if (furniId === 'dino_egg') {
    drawSelOutIsoBox(ctx, cx, cy, 8, 7, 16, 8, '#92400e');
    // Oval dinosaur egg silhouette
    drawSelOutRect(ctx, cx - 8, cy - 44, 16, 34, '#16a34a', '#4ade80', '#14532d');
    drawSelOutRect(ctx, cx - 11, cy - 38, 22, 22, '#22c55e', '#86efac', '#15803d');
    px(ctx, cx - 6, cy - 38, 4, 4, '#facc15');
    px(ctx, cx + 3, cy - 32, 5, 5, '#facc15');
    px(ctx, cx - 4, cy - 24, 4, 4, '#fde047');
    if (state === 1) {
      px(ctx, cx - 8, cy - 30, 16, 2, '#14532d');
      px(ctx, cx - 2, cy - 33, 4, 3, '#fef08a');
    }
    return true;
  }
  if (furniId === 'habbo_cola_machine') {
    drawSelOutIsoBox(ctx, cx, cy, 46, 44, 18, 9, '#dc2626');
    drawSelOutRect(ctx, cx - 10, cy - 42, 20, 12, '#ffffff', '#ffffff', '#fca5a5');
    px(ctx, cx - 7, cy - 38, 14, 4, '#dc2626');
    drawSelOutRect(ctx, cx - 7, cy - 18, 14, 9, '#1e293b', '#475569', '#09090b');
    if (state === 1) px(ctx, cx - 2, cy - 15, 4, 5, '#facc15');
    return true;
  }
  if (furniId === 'smoke_machine') {
    drawSelOutIsoBox(ctx, cx, cy, 14, 12, 18, 9, '#475569');
    drawSelOutIsoBox(ctx, cx, cy, 18, 5, 12, 6, '#64748b');
    px(ctx, cx - 4, cy - 14, 3, 3, state === 1 ? '#22c55e' : '#ef4444');
    if (state === 1) {
      const puff = frame * 3;
      drawSelOutRect(ctx, cx - 14, cy - 36 - puff, 12, 9, '#e2e8f0', '#ffffff', '#94a3b8');
      drawSelOutRect(ctx, cx - 4, cy - 44 - puff, 16, 11, '#f8fafc', '#ffffff', '#cbd5e1');
      drawSelOutRect(ctx, cx + 4, cy - 34 - puff, 10, 8, '#cbd5e1', '#f8fafc', '#94a3b8');
    }
    return true;
  }
  if (
    furniId === 'mode_armchair' ||
    furniId === 'mode_bar' ||
    furniId === 'mode_corner' ||
    furniId === 'mode_dining_table' ||
    furniId === 'mode_dining_chair' ||
    furniId === 'mode_hatch' ||
    furniId === 'mode_minibar' ||
    furniId === 'mode_bookshelf' ||
    furniId === 'mode_fireplace' ||
    furniId === 'mode_bed' ||
    furniId === 'mode_coffee_table'
  ) {
    // Mode line: brushed grey tubular steel frames (#8c96a4) + dark charcoal/crimson cushions
    if (furniId === 'mode_armchair' || furniId === 'mode_dining_chair') {
      drawSelOutIsoBox(ctx, cx, cy, 10, 8, 16, 8, '#64748b');
      drawSelOutIsoBox(ctx, cx, cy, 14, 4, 13, 6, '#dc2626', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 28, 14, 10, 5, '#475569', -5, -3);
      drawSelOutIsoBox(ctx, cx, cy, 17, 7, 4, 2, '#94a3b8', -10, 2);
      drawSelOutIsoBox(ctx, cx, cy, 17, 7, 4, 2, '#94a3b8', 10, -2);
    } else if (furniId === 'mode_bed') {
      drawSelOutIsoBox(ctx, cx, cy, 11, 9, 28, 14, '#64748b');
      drawSelOutIsoBox(ctx, cx, cy, 15, 4, 24, 12, '#dc2626', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 20, 4, 10, 5, '#f8fafc', -10, -5);
      drawSelOutIsoBox(ctx, cx, cy, 32, 16, 12, 6, '#475569', -14, -7);
    } else if (
      furniId === 'mode_bookshelf' ||
      furniId === 'mode_fireplace' ||
      furniId === 'mode_minibar'
    ) {
      drawSelOutIsoBox(ctx, cx, cy, 40, 38, 20, 10, '#475569');
      drawSelOutRect(ctx, cx - 12, cy - 36, 24, 26, '#1e293b', '#64748b', '#09090b');
      if (furniId === 'mode_fireplace' && state === 1) {
        px(ctx, cx - 7, cy - 22, 14, 10, '#f97316');
        px(ctx, cx - 4, cy - 19, 8, 7, '#facc15');
      } else {
        px(ctx, cx - 10, cy - 33, 5, 8, '#ef4444');
        px(ctx, cx - 3, cy - 33, 5, 8, '#38bdf8');
        px(ctx, cx + 4, cy - 33, 5, 8, '#facc15');
        px(ctx, cx - 9, cy - 21, 6, 8, '#22c55e');
        px(ctx, cx, cy - 21, 7, 8, '#a855f7');
      }
    } else {
      drawSelOutIsoBox(ctx, cx, cy, 22, 20, 22, 11, '#64748b');
      drawSelOutIsoBox(ctx, cx, cy, 25, 3, 24, 12, '#94a3b8');
    }
    return true;
  }
  if (furniId.startsWith('pura_') || furniId === 'glass_divider' || furniId === 'bubble_lamp') {
    // Pura line: rounded white modular blocks with crisp sky-blue (#38bdf8) cushions
    if (furniId === 'pura_chair' || furniId === 'pura_egg_chair') {
      drawSelOutIsoBox(ctx, cx, cy, 10, 8, 16, 8, '#f1f5f9');
      drawSelOutIsoBox(ctx, cx, cy, 14, 4, 14, 7, '#38bdf8', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 27, 13, 10, 5, '#38bdf8', -5, -3);
    } else if (furniId === 'pura_bed') {
      drawSelOutIsoBox(ctx, cx, cy, 11, 9, 28, 14, '#f1f5f9');
      drawSelOutIsoBox(ctx, cx, cy, 15, 4, 24, 12, '#38bdf8', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 20, 5, 10, 5, '#ffffff', -10, -5);
    } else if (furniId === 'pura_minibar' || furniId === 'pura_fridge') {
      drawSelOutIsoBox(ctx, cx, cy, 36, 34, 18, 9, '#f1f5f9');
      drawSelOutRect(ctx, cx - 10, cy - 32, 20, 24, '#e0f2fe', '#ffffff', '#38bdf8');
      px(ctx, cx + 6, cy - 24, 2, 8, '#0284c7');
    } else if (furniId === 'pura_hydro_tub') {
      drawSelOutIsoBox(ctx, cx, cy, 14, 12, 28, 14, '#f1f5f9');
      fillIsoDiamond(
        ctx,
        cx,
        cy - 14,
        22,
        11,
        state === 1 ? '#38bdf8' : '#0284c7',
        '#bae6fd',
        '#0369a1'
      );
      if (state === 1) {
        px(ctx, cx - 8 + frame * 2, cy - 16, 5, 3, '#ffffff');
        px(ctx, cx + 3 - frame * 2, cy - 12, 4, 3, '#e0f2fe');
      }
    } else if (furniId === 'pura_bookshelf') {
      drawSelOutIsoBox(ctx, cx, cy, 38, 36, 18, 9, '#f1f5f9');
      drawSelOutRect(ctx, cx - 11, cy - 34, 22, 24, '#e0f2fe', '#ffffff', '#38bdf8');
      px(ctx, cx - 8, cy - 30, 5, 8, '#ec4899');
      px(ctx, cx - 1, cy - 30, 5, 8, '#38bdf8');
      px(ctx, cx + 5, cy - 30, 4, 8, '#facc15');
    } else if (furniId === 'bubble_lamp') {
      drawSelOutIsoBox(ctx, cx, cy, 8, 7, 12, 6, '#cbd5e1');
      drawSelOutRect(
        ctx,
        cx - 6,
        cy - 52,
        12,
        44,
        state === 1 ? '#22d3ee' : '#0284c7',
        '#e0f2fe',
        '#0369a1'
      );
      if (state === 1) {
        px(ctx, cx - 2, cy - 20 - frame * 10, 4, 4, '#ffffff');
        px(ctx, cx, cy - 34 - frame * 5, 3, 3, '#bae6fd');
      }
      drawSelOutIsoBox(ctx, cx, cy, 55, 4, 9, 4, '#cbd5e1');
    } else {
      drawSelOutIsoBox(ctx, cx, cy, 28, 26, 22, 11, '#bae6fd');
    }
    return true;
  }
  if (furniId.startsWith('area_') || furniId.startsWith('lodge_')) {
    const isLodge = furniId.startsWith('lodge_');
    const wood = isLodge ? '#b45309' : '#c67d38';
    if (furniId === 'area_sofa') {
      drawSelOutIsoBox(ctx, cx, cy, 11, 9, 24, 12, wood, 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 15, 4, 20, 10, '#16a34a', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 28, 14, 11, 6, '#15803d', -10, -5, true);
      drawSelOutIsoBox(ctx, cx, cy, 18, 8, 5, 3, wood, -16, 4);
      drawSelOutIsoBox(ctx, cx, cy, 18, 8, 5, 3, wood, 16, -4);
    } else if (furniId === 'area_armchair') {
      drawSelOutIsoBox(ctx, cx, cy, 11, 9, 16, 8, wood, 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 15, 4, 13, 6, '#16a34a', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 28, 14, 10, 5, '#15803d', -5, -3, true);
    } else if (furniId === 'lodge_bed') {
      drawSelOutIsoBox(ctx, cx, cy, 12, 10, 28, 14, wood, 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 16, 4, 24, 12, '#b91c1c', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 20, 5, 10, 5, '#fef3c7', -10, -5);
      drawSelOutIsoBox(ctx, cx, cy, 32, 16, 12, 6, wood, -14, -7);
    } else if (furniId === 'lodge_fireplace') {
      drawSelOutIsoBox(ctx, cx, cy, 42, 40, 22, 11, '#78716c', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 45, 4, 24, 12, wood);
      drawSelOutRect(ctx, cx - 10, cy - 26, 20, 20, '#1c1917', '#57534e', '#09090b');
      if (state === 1) {
        px(ctx, cx - 6, cy - 20 - (frame % 2) * 2, 12, 12, '#ea580c');
        px(ctx, cx - 3, cy - 16, 6, 8, '#facc15');
      }
    } else if (furniId === 'lodge_candle_chandelier') {
      drawSelOutIsoBox(ctx, cx, cy, 6, 5, 12, 6, wood);
      drawSelOutRect(ctx, cx - 2, cy - 60, 4, 52, '#78350f', wood, '#451a03');
      drawSelOutRect(ctx, cx - 18, cy - 46, 36, 6, wood, '#facc15', '#78350f');
      for (const lx of [-14, -5, 5, 13]) {
        px(ctx, cx + lx, cy - 54, 3, 8, '#fef3c7');
        if (state === 1) px(ctx, cx + lx, cy - 58 - (frame % 2), 3, 4, '#f97316');
      }
    } else if (
      furniId === 'area_bookcase' ||
      furniId === 'lodge_bookcase' ||
      furniId === 'area_sideboard'
    ) {
      drawSelOutIsoBox(ctx, cx, cy, 38, 36, 20, 10, wood, 0, 0, true);
      drawSelOutRect(ctx, cx - 11, cy - 34, 22, 24, '#451a03', wood, '#270e02');
      px(ctx, cx - 8, cy - 30, 5, 8, '#ef4444');
      px(ctx, cx - 1, cy - 30, 5, 8, '#facc15');
      px(ctx, cx + 5, cy - 30, 4, 8, '#22c55e');
    } else {
      drawSelOutIsoBox(ctx, cx, cy, 22, 20, 22, 11, wood, 0, 0, true);
    }
    return true;
  }
  if (furniId.startsWith('iced_') || furniId.startsWith('plasto_')) {
    const isPlasto = furniId.startsWith('plasto_');
    const col =
      furniId === 'plasto_chair_pink'
        ? '#ec4899'
        : furniId === 'plasto_chair_lime'
        ? '#84cc16'
        : furniId === 'plasto_parasol'
        ? '#f97316'
        : isPlasto
        ? '#0ea5e9'
        : '#bae6fd';
    if (furniId === 'iced_sofa') {
      drawSelOutIsoBox(ctx, cx, cy, 11, 9, 24, 12, '#bae6fd');
      drawSelOutIsoBox(ctx, cx, cy, 15, 4, 20, 10, '#ffffff', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 28, 14, 11, 6, '#7dd3fc', -10, -5);
    } else if (
      furniId === 'iced_chair' ||
      furniId.startsWith('plasto_chair') ||
      furniId === 'plasto_pod'
    ) {
      // Molded colorful Plasto Chair on central tulip pedestal stem
      fillIsoDiamond(ctx, cx, cy, 9, 4, '#cbd5e1', '#ffffff', '#64748b');
      drawSelOutRect(ctx, cx - 2, cy - 12, 4, 11, '#e2e8f0', '#ffffff', '#94a3b8');
      drawSelOutIsoBox(ctx, cx, cy, 14, 4, 14, 7, col);
      drawSelOutIsoBox(ctx, cx, cy, 27, 13, 9, 5, col, -5, -3);
      px(ctx, cx - 7, cy - 24, 4, 2, '#ffffff');
    } else if (furniId === 'plasto_parasol') {
      fillIsoDiamond(ctx, cx, cy, 11, 5, '#f8fafc', '#ffffff', '#94a3b8');
      drawSelOutRect(ctx, cx - 2, cy - 54, 4, 48, '#ffffff', '#ffffff', '#cbd5e1');
      fillIsoDiamond(ctx, cx, cy - 54, 26, 13, '#f97316', '#fdba74', '#c2410c');
      fillIsoDiamond(ctx, cx, cy - 58, 16, 8, '#fef08a', '#ffffff', '#eab308');
    } else {
      drawSelOutIsoBox(ctx, cx, cy, 18, 16, 22, 11, col);
    }
    return true;
  }
  if (
    furniId === 'speaker_tower' ||
    furniId === 'neon_bar_counter' ||
    furniId === 'bar_stool_chrome' ||
    furniId === 'pinball_machine' ||
    furniId === 'laser_gate' ||
    furniId === 'stage_spotlight' ||
    furniId === 'vip_rope_divider'
  ) {
    if (furniId === 'speaker_tower') {
      drawSelOutIsoBox(ctx, cx, cy, 46, 44, 18, 9, '#1e293b');
      const pulse = state === 1 ? (frame % 2) * 2 : 0;
      drawSelOutRect(ctx, cx - 7 - pulse / 2, cy - 40, 14 + pulse, 12, '#334155', '#38bdf8', '#09090b');
      drawSelOutRect(ctx, cx - 8 - pulse / 2, cy - 24, 16 + pulse, 14, '#334155', '#ec4899', '#09090b');
    } else if (furniId === 'pinball_machine') {
      drawSelOutIsoBox(ctx, cx, cy, 18, 14, 24, 12, '#4338ca');
      drawSelOutIsoBox(ctx, cx, cy, 42, 24, 10, 5, '#4f46e5', -10, -5);
      px(ctx, cx - 8 + frame * 3, cy - 22, 6, 4, '#ec4899');
      px(ctx, cx - 2, cy - 18, 10, 4, '#22d3ee');
    } else if (furniId === 'laser_gate') {
      drawSelOutIsoBox(ctx, cx, cy, 8, 7, 18, 9, '#334155');
      drawSelOutRect(ctx, cx - 15, cy - 44, 6, 36, '#475569', '#94a3b8', '#0f172a');
      drawSelOutRect(ctx, cx + 9, cy - 44, 6, 36, '#475569', '#94a3b8', '#0f172a');
      if (state === 1) {
        for (let ly = -38; ly <= -16; ly += 7) {
          px(ctx, cx - 9, cy + ly, 18, 3, frame % 2 === 0 ? '#ef4444' : '#fca5a5');
        }
      }
    } else if (furniId === 'bar_stool_chrome') {
      fillIsoDiamond(ctx, cx, cy, 11, 5, '#94a3b8', '#f8fafc', '#475569');
      drawSelOutRect(ctx, cx - 2, cy - 26, 4, 20, '#e2e8f0', '#ffffff', '#64748b');
      drawSelOutIsoBox(ctx, cx, cy, 28, 5, 12, 6, '#dc2626');
    } else {
      drawSelOutIsoBox(ctx, cx, cy, 24, 22, 24, 12, '#312e81');
      drawSelOutIsoBox(ctx, cx, cy, 27, 3, 25, 12, '#ec4899');
    }
    return true;
  }
  if (
    furniId === 'tiki_bar' ||
    furniId === 'bamboo_chair' ||
    furniId === 'sand_castle' ||
    furniId === 'surfboard_deco' ||
    furniId === 'koi_pond' ||
    furniId === 'campfire_pit' ||
    furniId === 'hammock_palm' ||
    furniId === 'bonsai_tree'
  ) {
    if (furniId === 'tiki_bar') {
      drawSelOutIsoBox(ctx, cx, cy, 24, 22, 24, 12, '#b45309', 0, 0, true);
      drawSelOutRect(ctx, cx - 18, cy - 56, 4, 34, '#78350f', '#d97706', '#451a03');
      drawSelOutRect(ctx, cx + 14, cy - 56, 4, 34, '#78350f', '#d97706', '#451a03');
      fillIsoDiamond(ctx, cx, cy - 58, 26, 13, '#eab308', '#fef08a', '#a16207', '#ca8a04');
    } else if (furniId === 'sand_castle') {
      drawSelOutIsoBox(ctx, cx, cy, 12, 10, 22, 11, '#eab308', 0, 0, true);
      drawSelOutRect(ctx, cx - 14, cy - 30, 8, 18, '#facc15', '#fef9c3', '#ca8a04');
      drawSelOutRect(ctx, cx + 6, cy - 30, 8, 18, '#facc15', '#fef9c3', '#ca8a04');
      drawSelOutRect(ctx, cx - 5, cy - 38, 10, 26, '#eab308', '#fef08a', '#a16207');
      px(ctx, cx - 1, cy - 45, 6, 4, '#ef4444');
    } else if (furniId === 'koi_pond') {
      fillIsoDiamond(ctx, cx, cy, 28, 14, '#64748b', '#94a3b8', '#334155');
      fillIsoDiamond(ctx, cx, cy, 21, 10, '#0284c7', '#38bdf8', '#0369a1');
      px(ctx, cx - 6 + frame * 3, cy - 2, 6, 3, '#f97316');
      px(ctx, cx + 2 - frame * 2, cy + 3, 5, 3, '#ffffff');
    } else if (furniId === 'campfire_pit') {
      fillIsoDiamond(ctx, cx, cy, 20, 10, '#57534e', '#78716c', '#292524');
      drawSelOutRect(ctx, cx - 9, cy - 9, 18, 5, '#78350f', '#b45309', '#451a03');
      if (state === 1) {
        const f = frame % 3;
        px(ctx, cx - 7, cy - 25 - f, 14, 16 + f, '#ea580c');
        px(ctx, cx - 4, cy - 21 - f, 8, 12 + f, '#facc15');
      }
    } else if (furniId === 'bonsai_tree') {
      drawSelOutIsoBox(ctx, cx, cy, 9, 8, 14, 7, '#1d4ed8');
      drawSelOutRect(ctx, cx - 3, cy - 26, 6, 17, '#78350f', '#a16207', '#451a03');
      fillIsoDiamond(ctx, cx - 6, cy - 30, 12, 6, '#16a34a', '#4ade80', '#14532d');
      fillIsoDiamond(ctx, cx + 5, cy - 35, 12, 6, '#22c55e', '#86efac', '#15803d');
      fillIsoDiamond(ctx, cx - 1, cy - 40, 10, 5, '#4ade80', '#bbf7d0', '#16a34a');
    } else {
      drawSelOutIsoBox(ctx, cx, cy, 12, 10, 20, 10, '#d97706', 0, 0, true);
      drawSelOutIsoBox(ctx, cx, cy, 26, 14, 12, 6, '#facc15', -6, -3);
    }
    return true;
  }
  if (
    furniId.startsWith('trophy_') ||
    furniId.startsWith('poster_') ||
    furniId === 'neon_habbo_sign' ||
    furniId === 'lifebuoy_wall' ||
    furniId === 'vintage_wall_clock' ||
    furniId === 'gold_record_disc'
  ) {
    if (furniId.startsWith('trophy_')) {
      const isGold =
        furniId === 'trophy_gold' || furniId === 'trophy_duck' || furniId === 'trophy_globe';
      const isSlv = furniId === 'trophy_silver';
      const c1 = isGold ? '#eab308' : isSlv ? '#cbd5e1' : '#d97706';
      const cHi = isGold ? '#fef9c3' : isSlv ? '#ffffff' : '#fde68a';
      const cLo = isGold ? '#854d0e' : isSlv ? '#475569' : '#78350f';
      drawSelOutIsoBox(ctx, cx, cy, 12, 11, 14, 7, '#78350f');
      drawSelOutRect(ctx, cx - 3, cy - 28, 6, 16, c1, cHi, cLo);
      drawSelOutRect(ctx, cx - 10, cy - 46, 20, 18, c1, cHi, cLo);
      px(ctx, cx - 5, cy - 43, 3, 10, '#ffffff');
    } else {
      // Angled 2:1 isometric wall poster/sign
      const inner =
        furniId === 'neon_habbo_sign'
          ? state === 1
            ? '#ec4899'
            : '#831843'
          : furniId === 'poster_habbo_babes'
          ? '#db2777'
          : furniId === 'poster_scifi_rocket'
          ? '#1d4ed8'
          : furniId === 'gold_record_disc'
          ? '#facc15'
          : '#0284c7';
      for (let dx = -16; dx <= 16; dx++) {
        const ySkew = Math.round(dx * 0.5);
        px(ctx, cx + dx, cy - 48 + ySkew, 1, 26, '#334155');
        if (dx >= -13 && dx <= 13) {
          px(ctx, cx + dx, cy - 45 + ySkew, 1, 20, inner);
        }
      }
      px(ctx, cx - 5, cy - 38, 10, 6, '#fef08a');
    }
    return true;
  }
  if (furniId.startsWith('rug_') || furniId === 'persian_rug') {
    const rCol =
      furniId === 'rug_red_velvet' || furniId === 'persian_rug'
        ? '#991b1b'
        : furniId === 'rug_ocean_blue'
        ? '#0284c7'
        : furniId === 'rug_emerald_diamond'
        ? '#15803d'
        : furniId === 'rug_pink_faux_fur'
        ? '#ec4899'
        : furniId === 'rug_gold_palace'
        ? '#ca8a04'
        : furniId === 'rug_bamboo_tatami'
        ? '#84cc16'
        : furniId === 'rug_neon_cyber'
        ? '#4f46e5'
        : '#f8fafc';
    const rTrim =
      furniId === 'rug_neon_cyber'
        ? '#22d3ee'
        : furniId === 'rug_zebra_print'
        ? '#18181b'
        : '#facc15';
    fillIsoDiamond(ctx, cx, cy, 28, 14, rCol, rTrim, shadeHex(rCol, -25), shadeHex(rCol, 12));
    fillIsoDiamond(ctx, cx, cy, 18, 9, shadeHex(rCol, 22), '#ffffff', rTrim);
    return true;
  }
  return false;
}

export function drawExtendedBadgeSprite(s: CanvasRenderingContext2D, badgeId: string): boolean {
  const upper = badgeId.trim().toUpperCase();
  const GOLD_HI = '#fffbeb';
  const GOLD_1 = '#ffd400';
  const GOLD_2 = '#d97706';
  const GOLD_3 = '#78350f';

  // Staff & VIP extended badges (HOBBA, GUIDE, BUILD1, PC2, HC2)
  if (upper === 'HOBBA' || upper === 'GUIDE' || upper === 'BUILD1' || upper === 'PC2' || upper === 'HC2') {
    const main =
      upper === 'HOBBA'
        ? '#eab308'
        : upper === 'GUIDE'
        ? '#16a34a'
        : upper === 'BUILD1'
        ? '#f97316'
        : '#a855f7';
    const lo = shadeHex(main, -36);
    const hi = shadeHex(main, 32);
    // Winged star shield silhouette
    px(s, 4, 12, 32, 6, GOLD_1);
    px(s, 7, 18, 26, 5, GOLD_2);
    px(s, 11, 7, 18, 20, main);
    px(s, 14, 27, 12, 5, lo);
    px(s, 17, 32, 6, 3, lo);
    px(s, 12, 8, 16, 3, hi);
    if (upper === 'PC2' || upper === 'HC2') {
      // Crisp embossed pixel "PC" inside winged veteran shield
      px(s, 13, 13, 2, 9, GOLD_HI);
      px(s, 15, 13, 4, 2, GOLD_HI);
      px(s, 17, 15, 2, 2, GOLD_HI);
      px(s, 15, 17, 4, 2, GOLD_HI);
      px(s, 21, 13, 6, 2, GOLD_HI);
      px(s, 21, 15, 2, 5, GOLD_HI);
      px(s, 21, 20, 6, 2, GOLD_HI);
    } else {
      // Center emblem
      px(s, 18, 11, 4, 14, GOLD_HI);
      px(s, 13, 16, 14, 4, GOLD_HI);
      px(s, 19, 17, 2, 2, '#ffffff');
    }
    return true;
  }

  // Achievements extended badges (ACH_*)
  if (upper.startsWith('ACH_')) {
    const isGold = upper.endsWith('2') || upper === 'ACH_RESPECT2' || upper === 'ACH_NIGHT';
    const rim = isGold ? GOLD_1 : '#38bdf8';
    const rimLo = isGold ? GOLD_2 : '#0284c7';
    const core =
      upper.includes('RESPECT')
        ? '#ef4444'
        : upper.includes('FRIEND')
        ? '#10b981'
        : upper.includes('PET')
        ? '#f97316'
        : upper.includes('DANCE')
        ? '#ec4899'
        : upper.includes('SWIM')
        ? '#0ea5e9'
        : upper.includes('NIGHT')
        ? '#312e81'
        : '#2563eb';
    // Shaped octagonal/starburst medallion with bottom ribbon tails
    px(s, 12, 28, 5, 9, '#b91c1c');
    px(s, 23, 28, 5, 9, '#b91c1c');
    px(s, 11, 5, 18, 24, rimLo);
    px(s, 7, 9, 26, 16, rim);
    px(s, 12, 6, 16, 22, rim);
    px(s, 11, 9, 18, 16, core);
    px(s, 12, 10, 6, 2, '#ffffff');
    // Trophy / star / heart icon in center
    if (upper.includes('RESPECT') || upper.includes('FRIEND')) {
      px(s, 15, 13, 4, 3, '#ffffff');
      px(s, 21, 13, 4, 3, '#ffffff');
      px(s, 14, 15, 12, 4, '#fef08a');
      px(s, 16, 19, 8, 3, GOLD_1);
      px(s, 18, 22, 4, 2, GOLD_1);
    } else {
      px(s, 18, 11, 4, 12, GOLD_HI);
      px(s, 14, 15, 12, 4, GOLD_HI);
      px(s, 16, 13, 8, 8, GOLD_1);
      px(s, 19, 16, 2, 2, '#ffffff');
    }
    return true;
  }

  // Games & Rooms extended badges (LDO2, ROOF1, BNZ2, BNZ3, WEL1, SKY1, ORIENT1, ARC1, DJ2)
  if (
    upper === 'LDO2' ||
    upper === 'ROOF1' ||
    upper === 'BNZ2' ||
    upper === 'BNZ3' ||
    upper === 'WEL1' ||
    upper === 'SKY1' ||
    upper === 'ORIENT1' ||
    upper === 'ARC1' ||
    upper === 'DJ2'
  ) {
    const c1 =
      upper.startsWith('BNZ')
        ? '#ec4899'
        : upper === 'LDO2' || upper === 'ROOF1'
        ? '#0ea5e9'
        : upper === 'ORIENT1'
        ? '#16a34a'
        : upper === 'ARC1'
        ? '#6366f1'
        : '#f59e0b';
    // Shaped crest / trophy silhouette
    px(s, 9, 6, 22, 22, GOLD_2);
    px(s, 6, 10, 28, 14, GOLD_1);
    px(s, 10, 7, 20, 20, c1);
    px(s, 12, 8, 16, 3, shadeHex(c1, 35));
    px(s, 14, 28, 12, 6, GOLD_3);
    px(s, 12, 33, 16, 3, GOLD_1);
    // Iconic center motif
    px(s, 16, 12, 8, 10, '#fef08a');
    px(s, 14, 15, 12, 4, '#ffffff');
    px(s, 18, 14, 2, 2, '#ffffff');
    return true;
  }

  // Rares extended badges (DRG2, DRG3, DRG4, THR2, AMB1, FNT1, DINO1, COLA1)
  if (
    upper === 'DRG2' ||
    upper === 'DRG3' ||
    upper === 'DRG4' ||
    upper === 'THR2' ||
    upper === 'AMB1' ||
    upper === 'FNT1' ||
    upper === 'DINO1' ||
    upper === 'COLA1'
  ) {
    if (upper.startsWith('DRG')) {
      const drgCol = upper === 'DRG2' ? '#16a34a' : upper === 'DRG3' ? '#94a3b8' : '#eab308';
      const drgHi = shadeHex(drgCol, 36);
      const drgLo = shadeHex(drgCol, -34);
      px(s, 6, 21, 11, 15, drgLo);
      px(s, 8, 18, 12, 16, drgCol);
      px(s, 7, 7, 5, 4, GOLD_1);
      px(s, 11, 10, 5, 8, GOLD_2);
      px(s, 12, 12, 14, 9, drgCol);
      px(s, 13, 12, 12, 3, drgHi);
      px(s, 17, 15, 4, 3, '#111111');
      px(s, 18, 15, 2, 2, '#ffffff');
      px(s, 18, 23, 11, 4, drgLo);
      px(s, 28, 17, 7, 6, upper === 'DRG2' ? '#4ade80' : upper === 'DRG3' ? '#38bdf8' : '#fef08a');
      px(s, 31, 15, 5, 6, '#ffffff');
      return true;
    }
    // Crowned rare gem crest
    const rCol =
      upper === 'THR2'
        ? '#38bdf8'
        : upper === 'AMB1'
        ? '#f59e0b'
        : upper === 'FNT1'
        ? '#eab308'
        : upper === 'DINO1'
        ? '#22c55e'
        : '#ef4444';
    px(s, 12, 4, 16, 5, GOLD_1);
    px(s, 9, 9, 22, 20, GOLD_2);
    px(s, 11, 11, 18, 16, rCol);
    px(s, 13, 13, 14, 12, shadeHex(rCol, 28));
    px(s, 15, 29, 10, 5, GOLD_3);
    px(s, 14, 14, 3, 3, '#ffffff');
    return true;
  }

  // Events & Seasonal extended badges (XMAS*, HWN*, VAL*, SUM*, NYE*, DISCO1,ARCADE1,TIKI1,PETS1,RETRO1,DUCK1,FRANK1)
  const evCol =
    upper.startsWith('XMAS')
      ? '#dc2626'
      : upper.startsWith('HWN')
      ? '#f97316'
      : upper.startsWith('VAL')
      ? '#ec4899'
      : upper.startsWith('SUM') || upper === 'TIKI1'
      ? '#0ea5e9'
      : upper === 'DUCK1' || upper.startsWith('NYE')
      ? '#eab308'
      : '#8b5cf6';
  const evHi = shadeHex(evCol, 34);
  const evLo = shadeHex(evCol, -34);

  // Festive shaped crest with gold top star & bottom ribbon
  px(s, 17, 3, 6, 5, GOLD_1);
  px(s, 8, 8, 24, 20, evLo);
  px(s, 6, 11, 28, 14, evCol);
  px(s, 10, 9, 20, 18, evCol);
  px(s, 12, 10, 16, 3, evHi);
  px(s, 14, 28, 12, 6, GOLD_2);
  px(s, 16, 14, 8, 8, GOLD_HI);
  px(s, 14, 16, 12, 4, '#ffffff');
  px(s, 18, 15, 2, 2, '#ffffff');
  return true;
}

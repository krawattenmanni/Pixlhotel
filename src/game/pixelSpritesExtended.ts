import type { AvatarPose, Direction, LookConfig } from './types';

const OUTLINE = '#1b1922';

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
  const W = 44;
  const H = 76;
  const { canvas, ctx } = makeOffscreen(W, H);
  const { canvas: scratch, ctx: s } = makeOffscreen(W, H);

  const facingBack = dir === 2 || dir === 3;
  const mirrorX = dir === 1 || dir === 2;
  const isFemale = look.gender === 'F';

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

  if (pose === 'lay') {
    px(s, cx + 4, baseY - 14, 11, 5, hasSwimwear ? skin : pants);
    px(s, cx + 5, baseY - 14, 9, 2, hasSwimwear ? skinHi : pantsHi);
    px(s, cx + 4, baseY - 10, 11, 2, hasSwimwear ? skinLo : pantsLo);
    if (hasSwimwear) {
      px(s, cx + 3, baseY - 14, 5, 5, pants);
    }
    px(s, cx + 15, baseY - 15, 4, 6, shoes);
    px(s, cx + 16, baseY - 15, 2, 2, shoesHi);

    px(s, cx - 7, baseY - 16, 12, 8, shirt);
    px(s, cx - 6, baseY - 17, 10, 2, shirtHi);
    px(s, cx - 7, baseY - 10, 12, 2, shirtLo);
    px(s, cx - 4, baseY - 12, 8, 3, shirtHi);
    px(s, cx + 4, baseY - 12, 3, 3, skin);

    const hx = cx - 18;
    const hy = baseY - 24;
    px(s, hx + 2, hy, 10, 1, skinHi);
    px(s, hx + 1, hy + 1, 12, 11, skin);
    px(s, hx + 2, hy + 12, 9, 2, skinLo);
    if (!facingBack) {
      px(s, hx + 6, hy + 6, 2, 2, '#141414');
      px(s, hx + 10, hy + 6, 2, 2, '#141414');
      px(s, hx + 7, hy + 10, 3, 1, isFemale ? '#e11d48' : '#7c2d12');
    }
    px(s, hx, hy - 2, 13, 5, hair);
    px(s, hx + 2, hy - 2, 8, 2, hairHi);
    if (
      look.hairStyle === 'long' ||
      look.hairStyle === 'bob' ||
      look.hairStyle === 'ponytail' ||
      look.hairStyle === 'pigtails' ||
      look.hairStyle === 'side_fringe'
    ) {
      px(s, hx - 1, hy + 2, 4, 10, hairLo);
    }
    if (look.accessory === 'sunglasses' && !facingBack) {
      px(s, hx + 5, hy + 5, 8, 3, '#09090b');
    } else if (look.accessory === 'crown' || look.accessory === 'tiara') {
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
    return canvas;
  }

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
      bobY = animStep === 0 ? 2 : animStep === 1 ? -6 : animStep === 2 ? -3 : 0;
      nearLegDY = animStep === 1 ? -3 : 0;
      farLegDY = animStep === 1 ? -3 : 0;
      nearArmDY = animStep === 1 || animStep === 2 ? -6 : 2;
      farArmDY = animStep === 1 || animStep === 2 ? -6 : 2;
    } else if (danceStyle === 3) {
      bobY = animStep % 2 === 0 ? -1 : 1;
      nearLegDX = animStep === 0 ? -2 : animStep === 2 ? 2 : 0;
      farLegDX = animStep === 0 ? -2 : animStep === 2 ? 2 : 0;
      nearArmDY = animStep % 2 === 0 ? -4 : 2;
      farArmDY = animStep % 2 === 0 ? -4 : 2;
    } else if (danceStyle === 4) {
      bobY = animStep === 1 || animStep === 3 ? -2 : 0;
      nearLegDY = animStep === 1 ? -2 : 0;
      farLegDY = animStep === 3 ? -2 : 0;
      nearArmDY = animStep === 0 ? -5 : animStep === 2 ? 3 : -1;
      farArmDY = animStep === 2 ? -5 : animStep === 0 ? 3 : -1;
    } else {
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

  const torsoY = (pose === 'sit' ? baseY - 33 : baseY - 32) + bobY;
  const bareShoulderStyle =
    !hasSwimwear &&
    (look.shirtStyle === 'tank' || look.shirtStyle === 'halter' || look.shirtStyle === 'offshoulder');

  const drawFarArm = () => {
    const ax = cx + 4;
    const ay = torsoY + 2 + farArmDY;
    const armUpper = bareShoulderStyle ? skinLo : shirtLo;
    const armMid = bareShoulderStyle ? skin : shirt;
    const armDeep = bareShoulderStyle ? skinDeep : shirtDeep;
    if (pose === 'wave' && !facingBack) {
      const wy = waveUp ? torsoY - 8 : torsoY - 5;
      px(s, cx + 5, wy + 2, 3, 9, armUpper);
      px(s, cx + 6, wy + 2, 2, 7, armMid);
      px(s, cx + 5, wy - 1, 3, 3, skin);
      return;
    }
    if (pose === 'dance' && farArmDY < 0) {
      px(s, ax, ay, 3, 6, armUpper);
      px(s, ax, ay - 3, 3, 3, skin);
      return;
    }
    px(s, ax, ay, 3, 6, armUpper);
    px(s, ax + 1, ay + 5, 3, 5, armDeep);
    px(s, ax + 1, ay + 10, 3, 3, skinLo);
  };

  const drawNearArm = () => {
    const ax = cx - 8;
    const ay = torsoY + 2 + nearArmDY;
    const armBase = bareShoulderStyle ? skin : look.shirtStyle === 'varsity' ? '#f8fafc' : shirt;
    const armHi = bareShoulderStyle ? skinHi : look.shirtStyle === 'varsity' ? '#ffffff' : shirtHi;
    if (pose === 'dance' && nearArmDY < 0) {
      px(s, ax - 1, ay, 3, 6, armBase);
      px(s, ax - 1, ay - 3, 3, 3, skinHi);
      return;
    }
    px(s, ax, ay, 4, 6, armBase);
    px(s, ax + 1, ay, 2, 5, armHi);
    px(s, ax + 1, ay + 6, 4, 5, armBase);
    px(s, ax + 2, ay + 6, 2, 4, armHi);
    px(s, ax + 2, ay + 11, 3, 3, skin);
    px(s, ax + 3, ay + 11, 2, 2, skinHi);
  };

  const wearsSkirtOrDress =
    !hasSwimwear && (look.shirtStyle === 'dress' || (isFemale && (look.shirtStyle === 'sailor_blouse' || look.shirtStyle === 'crop_cardigan')));
  if (inWater) {
    const swimBob = animStep % 2 === 0 ? 0 : 1;
    px(s, cx - 5, torsoY + 13 + swimBob, 10, 4, pants);
    px(s, cx - 5, torsoY + 15 + swimBob, 10, 1, '#fef08a');
  } else if (pose === 'sit') {
    const sy = baseY - 16;
    const legCol = wearsSkirtOrDress ? skin : pants;
    const legLo = wearsSkirtOrDress ? skinLo : pantsLo;
    const legHi = wearsSkirtOrDress ? skinHi : pantsHi;
    px(s, cx + 1, sy, 5, 5, wearsSkirtOrDress ? pantsLo : legLo);
    px(s, cx + 3, sy + 4, 4, 6, legLo);
    px(s, cx + 3, sy + 9, 6, 3, shoesLo);
    px(s, cx + 7, sy + 10, 2, 2, '#d4d4d8');
    px(s, cx - 5, sy + 2, 5, 5, wearsSkirtOrDress ? pants : legCol);
    px(s, cx - 3, sy + 6, 4, 6, legCol);
    px(s, cx - 2, sy + 6, 2, 5, legHi);
    px(s, cx - 3, sy + 11, 6, 3, shoes);
    px(s, cx - 2, sy + 11, 3, 1, shoesHi);
    px(s, cx + 1, sy + 12, 2, 2, '#f8fafc');
  } else {
    const flx = cx + 1 + farLegDX;
    const fly = baseY - 17 + farLegDY;
    const legMain = hasSwimwear || wearsSkirtOrDress ? skin : pants;
    const legMainLo = hasSwimwear || wearsSkirtOrDress ? skinLo : pantsLo;
    const legMainHi = hasSwimwear || wearsSkirtOrDress ? skinHi : pantsHi;

    px(s, flx, fly, 4, 11, legMainLo);
    px(s, flx + 1, fly + 1, 2, 9, legMain);
    if (hasSwimwear) {
      px(s, flx, fly, 4, 5, pantsLo);
    }
    px(s, flx, fly + 11, 6, 3, shoesLo);
    if (!hasSwimwear) px(s, flx + 4, fly + 12, 2, 2, '#e2e8f0');

    const nlx = cx - 5 + nearLegDX;
    const nly = baseY - 15 + nearLegDY;
    px(s, nlx, nly, 5, 11, legMain);
    px(s, nlx + 1, nly + 1, 2, 9, legMainHi);
    px(s, nlx, nly + 1, 1, 9, legMainLo);
    if (hasSwimwear) {
      px(s, nlx, nly, 5, 5, pants);
      px(s, nlx + 1, nly, 3, 4, pantsHi);
    }
    px(s, nlx, nly + 11, 7, 3, shoes);
    px(s, nlx + 1, nly + 11, 4, 1, shoesHi);
    if (!hasSwimwear) px(s, nlx + 5, nly + 12, 2, 2, '#f8fafc');

    if (wearsSkirtOrDress) {
      const skCol = look.shirtStyle === 'dress' ? shirt : pants;
      const skHi = look.shirtStyle === 'dress' ? shirtHi : pantsHi;
      const skLo = look.shirtStyle === 'dress' ? shirtLo : pantsLo;
      px(s, cx - 6, baseY - 18, 13, 6, skCol);
      px(s, cx - 5, baseY - 17, 3, 5, skLo);
      px(s, cx - 1, baseY - 17, 3, 5, skHi);
      px(s, cx + 3, baseY - 17, 3, 5, skLo);
    }
  }

  drawFarArm();

  px(s, cx - 6, torsoY + 1, 12, 15, shirt);
  px(s, cx - 5, torsoY, 9, 2, shirtHi);
  px(s, cx - 6, torsoY + 2, 2, 13, shirtLo);
  px(s, cx + 2, torsoY + 2, 3, 13, shirtHi);
  px(s, cx - 5, torsoY + 15, 10, 2, shirtDeep);
  if (isFemale && !inWater) {
    px(s, cx - 6, torsoY + 9, 1, 4, shirtDeep);
    px(s, cx + 1, torsoY + 4, 4, 3, shirtHi);
  }

  if (inWater) {
    const swimBob = animStep % 2 === 0 ? 0 : 1;
    px(s, cx - 6, torsoY + 9 + swimBob, 12, 4, pants);
    px(s, cx - 9, torsoY + 11 + swimBob, 18, 5, '#eab308');
    px(s, cx - 8, torsoY + 12 + swimBob, 16, 3, '#facc15');
    px(s, cx - 6, torsoY + 12 + swimBob, 10, 2, '#fef08a');
    if (!facingBack) {
      px(s, cx + 4, torsoY + 7 + swimBob, 5, 5, '#facc15');
      px(s, cx + 5, torsoY + 8 + swimBob, 3, 2, '#fef9c3');
      px(s, cx + 9, torsoY + 9 + swimBob, 3, 2, '#f97316');
      px(s, cx + 7, torsoY + 8 + swimBob, 1, 1, '#141414');
    }
  } else if (wearingSwimwear) {
    if (isFemale) {
      px(s, cx - 5, torsoY + 4, 10, 4, pants);
      px(s, cx - 5, torsoY + 8, 10, 3, skin);
    }
    px(s, cx - 6, torsoY + 11, 12, 5, pants);
    px(s, cx - 5, torsoY + 12, 10, 2, pantsHi);
    px(s, cx - 6, torsoY + 11, 12, 1, '#fef08a');
  } else if (!facingBack) {
    if (look.shirtStyle === 'suit') {
      px(s, cx + 1, torsoY + 1, 4, 8, '#f8fafc');
      px(s, cx + 2, torsoY + 2, 2, 8, '#b91c1c');
      px(s, cx + 2, torsoY + 1, 2, 2, '#991b1b');
      px(s, cx, torsoY + 2, 1, 6, shirtDeep);
      px(s, cx + 4, torsoY + 2, 1, 6, shirtDeep);
      px(s, cx + 2, torsoY + 11, 1, 1, '#cbd5e1');
    } else if (look.shirtStyle === 'hoodie') {
      px(s, cx + 1, torsoY + 1, 1, 6, '#f8fafc');
      px(s, cx + 3, torsoY + 1, 1, 6, '#f8fafc');
      px(s, cx - 2, torsoY + 10, 7, 4, shirtLo);
      px(s, cx - 4, torsoY - 1, 8, 2, shirtLo);
    } else if (look.shirtStyle === 'stripes') {
      px(s, cx - 5, torsoY + 4, 11, 2, '#f8fafc');
      px(s, cx - 5, torsoY + 9, 11, 2, '#f8fafc');
      px(s, cx - 5, torsoY + 13, 10, 1, '#f8fafc');
    } else if (look.shirtStyle === 'tank') {
      px(s, cx - 1, torsoY + 1, 5, 2, skin);
      px(s, cx - 5, torsoY + 1, 2, 4, skin);
      px(s, cx + 4, torsoY + 1, 2, 4, skin);
    } else if (look.shirtStyle === 'dress') {
      px(s, cx, torsoY + 1, 5, 3, skin);
      px(s, cx - 5, torsoY + 9, 11, 2, '#fef08a');
      px(s, cx + 1, torsoY + 9, 3, 3, '#facc15');
    } else if (look.shirtStyle === 'offshoulder') {
      px(s, cx - 5, torsoY, 10, 3, skin);
      px(s, cx - 5, torsoY + 3, 11, 2, shirtHi);
    } else if (look.shirtStyle === 'crop_cardigan') {
      px(s, cx, torsoY + 2, 4, 9, '#ffffff');
      px(s, cx - 4, torsoY + 12, 9, 3, skin);
      px(s, cx - 1, torsoY + 4, 1, 7, shirtDeep);
    } else if (look.shirtStyle === 'halter') {
      px(s, cx - 5, torsoY + 1, 3, 5, skin);
      px(s, cx + 4, torsoY + 1, 2, 5, skin);
      px(s, cx, torsoY, 3, 2, shirtHi);
      px(s, cx - 4, torsoY + 12, 9, 3, skin);
    } else if (look.shirtStyle === 'sailor_blouse') {
      px(s, cx - 4, torsoY + 1, 9, 4, '#1e3a8a');
      px(s, cx - 3, torsoY + 2, 7, 1, '#ffffff');
      px(s, cx + 1, torsoY + 4, 3, 3, '#ef4444');
    } else if (look.shirtStyle === 'varsity') {
      px(s, cx + 1, torsoY + 1, 2, 14, '#f8fafc');
      px(s, cx - 5, torsoY + 14, 11, 2, '#f8fafc');
      px(s, cx - 3, torsoY + 5, 3, 4, '#fef08a');
    } else if (look.shirtStyle === 'leather_jacket') {
      px(s, cx, torsoY + 1, 4, 6, '#e2e8f0');
      px(s, cx + 2, torsoY + 3, 1, 11, '#cbd5e1');
      px(s, cx - 3, torsoY + 3, 2, 2, '#94a3b8');
    } else if (look.shirtStyle === 'track_jacket') {
      px(s, cx + 2, torsoY + 1, 1, 14, '#ffffff');
      px(s, cx - 5, torsoY + 3, 2, 11, '#ffffff');
    } else if (look.shirtStyle === 'turtleneck') {
      px(s, cx - 2, torsoY - 2, 6, 3, shirtHi);
      px(s, cx - 1, torsoY + 2, 4, 12, shirtHi);
    } else {
      px(s, cx + 1, torsoY + 1, 4, 2, skin);
      px(s, cx + 2, torsoY + 3, 2, 1, skinLo);
    }

    if (look.accessory === 'gold_chain') {
      px(s, cx - 1, torsoY + 2, 6, 2, '#facc15');
      px(s, cx + 1, torsoY + 4, 3, 3, '#fef08a');
    } else if (look.accessory === 'scarf') {
      px(s, cx - 5, torsoY, 11, 4, '#dc2626');
      px(s, cx - 4, torsoY + 1, 9, 1, '#fca5a5');
      px(s, cx + 2, torsoY + 4, 3, 6, '#b91c1c');
    }
  } else {
    if (look.shirtStyle === 'hoodie') {
      px(s, cx - 5, torsoY, 10, 4, shirtLo);
      px(s, cx - 4, torsoY + 1, 7, 2, shirtDeep);
    } else if (look.shirtStyle === 'suit') {
      px(s, cx - 1, torsoY + 10, 1, 6, shirtDeep);
    } else if (look.shirtStyle === 'sailor_blouse') {
      px(s, cx - 5, torsoY + 1, 10, 5, '#1e3a8a');
      px(s, cx - 4, torsoY + 5, 8, 1, '#ffffff');
    }
  }

  drawNearArm();

  const hx = cx - 7;
  const hy = torsoY - 18;
  px(s, hx + 2, hy, 11, 1, skinHi);
  px(s, hx + 1, hy + 1, 13, 2, skin);
  px(s, hx, hy + 3, 15, 11, skin);
  px(s, hx + 1, hy + 14, 13, 2, skin);
  px(s, hx + 2, hy + 16, 10, 2, skinLo);
  px(s, hx + 4, hy + 17, 6, 1, skinDeep);

  px(s, hx + 3, hy + 1, 8, 2, skinHi);
  px(s, hx, hy + 4, 2, 10, skinLo);
  px(s, hx + 12, hy + 4, 3, 9, skinHi);
  px(s, hx + 2, hy + 14, 9, 2, skinLo);

  px(s, hx - 2, hy + 8, 2, 4, skin);
  px(s, hx - 1, hy + 9, 1, 2, skinLo);

  if (!facingBack) {
    const eyeY = hy + 8;
    const nearEyeX = hx + 7;
    const farEyeX = hx + 12;

    if (isFemale) {
      px(s, nearEyeX - 2, eyeY + 3, 2, 1, '#fda4af');
      px(s, farEyeX + 1, eyeY + 3, 2, 1, '#fda4af');
      px(s, nearEyeX - 1, eyeY, 1, 1, '#141414');
      px(s, farEyeX + 2, eyeY, 1, 1, '#141414');
    }

    if (look.expression === 'serene') {
      px(s, nearEyeX, eyeY + 1, 2, 1, '#141414');
      px(s, farEyeX, eyeY + 1, 2, 1, '#141414');
      px(s, nearEyeX + 2, hy + 13, 3, 1, isFemale ? '#e11d48' : '#9a3412');
    } else if (look.expression === 'wink') {
      px(s, nearEyeX, eyeY + 1, 2, 1, '#141414');
      px(s, farEyeX, eyeY, 2, 3, '#141414');
      px(s, farEyeX, eyeY, 1, 1, '#ffffff');
      px(s, nearEyeX + 1, hy + 13, 4, 1, isFemale ? '#e11d48' : '#7c2d12');
      px(s, nearEyeX + 2, hy + 14, 2, 1, '#fb7185');
    } else if (look.expression === 'surprised') {
      px(s, nearEyeX, eyeY, 2, 3, '#141414');
      px(s, nearEyeX, eyeY, 1, 1, '#ffffff');
      px(s, farEyeX, eyeY, 2, 3, '#141414');
      px(s, farEyeX, eyeY, 1, 1, '#ffffff');
      px(s, nearEyeX + 2, hy + 13, 3, 3, '#7f1d1d');
      px(s, nearEyeX + 3, hy + 14, 1, 1, '#ef4444');
    } else {
      px(s, nearEyeX, eyeY, 2, 3, '#141414');
      px(s, nearEyeX, eyeY, 1, 1, '#ffffff');
      px(s, farEyeX, eyeY, 2, 3, '#141414');
      px(s, farEyeX, eyeY, 1, 1, '#ffffff');

      if (look.expression === 'cool') {
        px(s, nearEyeX - 1, eyeY - 2, 3, 1, hairLo);
        px(s, farEyeX - 1, eyeY - 2, 3, 1, hairLo);
        px(s, nearEyeX + 2, hy + 13, 4, 1, isFemale ? '#be123c' : '#7c2d12');
      } else if (look.expression === 'cheeky') {
        px(s, nearEyeX + 1, hy + 13, 5, 2, '#991b1b');
        px(s, nearEyeX + 2, hy + 13, 3, 1, '#ffffff');
      } else {
        px(s, nearEyeX + 1, hy + 13, 4, 1, isFemale ? '#be123c' : '#7c2d12');
        px(s, nearEyeX + 2, hy + 14, 2, 1, isFemale ? '#f43f5e' : '#dc2626');
      }
    }
    px(s, hx + 11, hy + 10, 1, 2, skinLo);
  }

  if (facingBack) {
    px(s, hx + 1, hy - 2, 13, 3, hairHi);
    px(s, hx - 1, hy + 1, 16, 12, hair);
    px(s, hx - 1, hy + 3, 3, 9, hairLo);
    if (look.hairStyle === 'long' || look.hairStyle === 'side_fringe') {
      px(s, hx - 1, hy + 11, 15, 11, hair);
      px(s, hx, hy + 12, 3, 10, hairLo);
      px(s, hx + 10, hy + 12, 2, 9, hairHi);
    } else if (look.hairStyle === 'ponytail') {
      px(s, hx + 4, hy + 4, 6, 15, hairLo);
      px(s, hx + 5, hy + 5, 4, 13, hairHi);
    } else if (look.hairStyle === 'pigtails') {
      px(s, hx - 4, hy + 4, 4, 14, hairLo);
      px(s, hx + 14, hy + 4, 4, 14, hair);
    } else if (look.hairStyle === 'princess_bun') {
      px(s, hx + 4, hy - 7, 7, 6, hair);
      px(s, hx + 5, hy - 6, 5, 3, hairHi);
    } else if (look.hairStyle === 'mohawk') {
      px(s, hx, hy + 2, 14, 11, skinLo);
      px(s, hx + 5, hy - 6, 4, 16, hair);
      px(s, hx + 6, hy - 5, 2, 13, hairHi);
    } else if (look.hairStyle === 'spiky' || look.hairStyle === 'messy') {
      px(s, hx + 2, hy - 5, 3, 4, hairHi);
      px(s, hx + 7, hy - 6, 3, 5, hair);
      px(s, hx + 11, hy - 4, 3, 3, hairHi);
    }
  } else {
    if (look.hairStyle === 'spiky') {
      px(s, hx + 1, hy - 2, 13, 6, hair);
      px(s, hx - 1, hy + 2, 4, 6, hairLo);
      px(s, hx + 3, hy + 3, 11, 3, hairHi);
      px(s, hx + 2, hy - 5, 3, 4, hairHi);
      px(s, hx + 6, hy - 6, 3, 5, hair);
      px(s, hx + 10, hy - 5, 3, 4, hairHi);
    } else if (look.hairStyle === 'messy') {
      px(s, hx, hy - 3, 15, 7, hair);
      px(s, hx - 2, hy + 1, 4, 7, hairLo);
      px(s, hx + 2, hy - 5, 4, 3, hairHi);
      px(s, hx + 8, hy - 4, 5, 3, hairHi);
      px(s, hx + 3, hy + 3, 4, 3, hair);
      px(s, hx + 9, hy + 3, 5, 2, hairHi);
    } else if (look.hairStyle === 'quiff') {
      px(s, hx, hy - 1, 14, 5, hair);
      px(s, hx - 1, hy + 2, 3, 6, hairLo);
      px(s, hx + 5, hy - 5, 9, 5, hair);
      px(s, hx + 6, hy - 4, 7, 2, hairHi);
      px(s, hx + 4, hy + 3, 9, 2, hairLo);
    } else if (look.hairStyle === 'pompadour') {
      px(s, hx, hy - 2, 14, 6, hair);
      px(s, hx - 1, hy + 2, 3, 6, hairLo);
      px(s, hx + 3, hy - 7, 12, 6, hair);
      px(s, hx + 5, hy - 6, 9, 3, hairHi);
    } else if (look.hairStyle === 'side_part') {
      px(s, hx, hy - 2, 15, 5, hair);
      px(s, hx + 4, hy - 2, 9, 2, hairHi);
      px(s, hx - 1, hy + 2, 3, 5, hairLo);
      px(s, hx + 6, hy + 2, 8, 2, hair);
    } else if (look.hairStyle === 'buzzcut') {
      px(s, hx + 1, hy - 1, 13, 4, hairLo);
      px(s, hx + 3, hy - 1, 9, 2, hair);
      px(s, hx, hy + 2, 2, 4, hairLo);
    } else if (look.hairStyle === 'bob') {
      px(s, hx, hy - 2, 15, 6, hair);
      px(s, hx + 2, hy - 1, 10, 2, hairHi);
      px(s, hx - 2, hy + 3, 5, 12, hairLo);
      px(s, hx + 13, hy + 3, 2, 11, hair);
      px(s, hx + 4, hy + 3, 9, 3, hairHi);
    } else if (look.hairStyle === 'long') {
      px(s, hx, hy - 2, 15, 6, hair);
      px(s, hx + 2, hy - 1, 10, 2, hairHi);
      px(s, hx - 2, hy + 3, 5, 19, hairLo);
      px(s, hx - 1, hy + 5, 2, 16, hair);
      px(s, hx + 13, hy + 3, 2, 17, hair);
      px(s, hx + 5, hy + 3, 8, 3, hairHi);
    } else if (look.hairStyle === 'ponytail') {
      px(s, hx, hy - 2, 15, 6, hair);
      px(s, hx + 3, hy - 1, 9, 2, hairHi);
      px(s, hx + 4, hy + 3, 9, 2, hairHi);
      px(s, hx - 2, hy - 3, 4, 4, '#f43f5e');
      px(s, hx - 6, hy - 2, 5, 15, hairLo);
      px(s, hx - 5, hy - 1, 3, 12, hair);
    } else if (look.hairStyle === 'pigtails') {
      px(s, hx, hy - 2, 15, 6, hair);
      px(s, hx + 3, hy - 1, 9, 2, hairHi);
      px(s, hx + 4, hy + 3, 9, 2, hairHi);
      px(s, hx - 3, hy, 3, 3, '#ec4899');
      px(s, hx - 5, hy + 2, 4, 15, hairLo);
      px(s, hx - 4, hy + 3, 2, 13, hair);
      px(s, hx + 14, hy + 1, 3, 14, hair);
      px(s, hx + 15, hy + 2, 2, 11, hairHi);
    } else if (look.hairStyle === 'side_fringe') {
      px(s, hx, hy - 2, 15, 6, hair);
      px(s, hx + 2, hy - 1, 11, 2, hairHi);
      px(s, hx - 2, hy + 3, 4, 15, hairLo);
      px(s, hx + 3, hy + 2, 11, 3, hair);
      px(s, hx + 8, hy + 4, 6, 3, hairHi);
    } else if (look.hairStyle === 'braided_crown') {
      px(s, hx, hy - 3, 15, 7, hair);
      for (let bx = 1; bx <= 12; bx += 3) {
        px(s, hx + bx, hy - 2, 2, 3, hairHi);
        px(s, hx + bx + 1, hy - 1, 2, 3, hairLo);
      }
      px(s, hx - 2, hy + 3, 4, 12, hairLo);
    } else if (look.hairStyle === 'princess_bun') {
      px(s, hx, hy - 2, 15, 6, hair);
      px(s, hx + 3, hy - 1, 9, 2, hairHi);
      px(s, hx + 3, hy - 8, 8, 6, hair);
      px(s, hx + 4, hy - 7, 6, 3, hairHi);
      px(s, hx + 5, hy - 3, 4, 1, '#fef08a');
      px(s, hx - 1, hy + 3, 3, 9, hairLo);
    } else if (look.hairStyle === 'mohawk') {
      px(s, hx + 4, hy - 7, 6, 11, hair);
      px(s, hx + 6, hy - 6, 3, 9, hairHi);
      px(s, hx, hy + 3, 2, 4, hairLo);
    } else {
      px(s, hx - 2, hy - 4, 18, 8, hair);
      px(s, hx + 2, hy - 4, 5, 3, hairHi);
      px(s, hx + 9, hy - 3, 5, 3, hairHi);
      px(s, hx - 3, hy + 2, 5, 8, hairLo);
      px(s, hx + 13, hy + 2, 3, 7, hair);
    }
  }

  if (look.accessory === 'crown') {
    px(s, hx + 2, hy - 6, 11, 5, '#facc15');
    px(s, hx + 3, hy - 8, 2, 3, '#fef08a');
    px(s, hx + 7, hy - 9, 2, 4, '#fef08a');
    px(s, hx + 11, hy - 8, 2, 3, '#facc15');
    px(s, hx + 7, hy - 4, 2, 2, '#dc2626');
    px(s, hx + 2, hy - 2, 11, 1, '#ca8a04');
  } else if (look.accessory === 'tiara') {
    px(s, hx + 3, hy - 5, 10, 3, '#e2e8f0');
    px(s, hx + 5, hy - 7, 6, 3, '#f8fafc');
    px(s, hx + 7, hy - 8, 2, 3, '#ffffff');
    px(s, hx + 7, hy - 5, 2, 2, '#ec4899');
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
    px(s, hx, hy + 8, 6, 1, '#18181b');
  } else if (look.accessory === 'cap') {
    px(s, hx, hy - 3, 14, 6, '#dc2626');
    px(s, hx + 2, hy - 3, 9, 2, '#f87171');
    if (!facingBack) {
      px(s, hx + 6, hy + 2, 11, 3, '#991b1b');
      px(s, hx + 7, hy + 2, 9, 1, '#ef4444');
    }
  } else if (look.accessory === 'beanie') {
    px(s, hx, hy - 5, 15, 7, '#0284c7');
    px(s, hx + 2, hy - 5, 10, 3, '#38bdf8');
    px(s, hx - 1, hy, 16, 3, '#0369a1');
    px(s, hx + 5, hy - 8, 4, 3, '#f8fafc');
  } else if (look.accessory === 'beret') {
    px(s, hx - 2, hy - 4, 16, 5, '#be123c');
    px(s, hx, hy - 4, 11, 2, '#f43f5e');
    px(s, hx + 5, hy - 6, 2, 2, '#881337');
  } else if (look.accessory === 'top_hat') {
    px(s, hx - 2, hy, 19, 2, '#1e293b');
    px(s, hx + 1, hy - 10, 13, 10, '#0f172a');
    px(s, hx + 3, hy - 9, 4, 8, '#334155');
    px(s, hx + 1, hy - 2, 13, 2, '#dc2626');
  } else if (look.accessory === 'devil_horns') {
    px(s, hx + 1, hy - 6, 3, 5, '#dc2626');
    px(s, hx, hy - 8, 2, 3, '#ef4444');
    px(s, hx + 11, hy - 6, 3, 5, '#dc2626');
    px(s, hx + 13, hy - 8, 2, 3, '#ef4444');
  } else if (look.accessory === 'angel_halo') {
    px(s, hx + 2, hy - 8, 11, 2, '#fde047');
    px(s, hx + 4, hy - 9, 7, 1, '#ffffff');
    px(s, hx + 4, hy - 6, 7, 1, '#ca8a04');
  } else if (look.accessory === 'cat_ears') {
    px(s, hx + 1, hy - 6, 4, 5, '#18181b');
    px(s, hx + 2, hy - 4, 2, 3, '#f472b6');
    px(s, hx + 10, hy - 6, 4, 5, '#18181b');
    px(s, hx + 11, hy - 4, 2, 3, '#f472b6');
  } else if (look.accessory === 'flower_clip') {
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
    ctx.ellipse(cx, baseY - 11, 14 + (animStep % 2) * 2, 6 + (animStep % 2), 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(15, 20, 35, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 1, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

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
    px(ctx, cx - 10, baseY - 7, 20, 2, 'rgba(224, 242, 254, 0.85)');
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
  // Grounded contact shadow ellipse under every furniture piece
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (furniId === 'hc_nordic_table') {
    outlinedRect(ctx, cx - 22, cy - 15, 5, 15, '#451a03');
    outlinedRect(ctx, cx + 17, cy - 15, 5, 15, '#451a03');
    drawIsoBox(18, 6, 26, 13, '#92400e', '#451a03', '#78350f');
    drawIsoPoly(ctx, [[cx, cy - 26], [cx + 20, cy - 16], [cx, cy - 6], [cx - 20, cy - 16]], '#b45309', '#facc15');
    px(ctx, cx - 3, cy - 19, 6, 4, '#fef08a');
    return true;
  }
  if (furniId === 'hc_butler_statue') {
    drawIsoBox(8, 8, 16, 8, '#78350f', '#451a03', '#5c2d0c');
    outlinedRect(ctx, cx - 9, cy - 46, 18, 36, '#1e293b', '#475569', '#0f172a');
    px(ctx, cx - 3, cy - 44, 6, 12, '#ffffff');
    px(ctx, cx - 2, cy - 42, 4, 2, '#dc2626');
    outlinedRect(ctx, cx - 7, cy - 58, 14, 12, '#f5d0a9', '#fde68a', '#d97706');
    outlinedRect(ctx, cx + 6, cy - 34, 12, 4, '#cbd5e1', '#ffffff', '#64748b');
    px(ctx, cx + 10, cy - 41, 4, 7, '#22c55e');
    return true;
  }
  if (furniId === 'hc_fireplace') {
    drawIsoBox(34, 34, 24, 12, '#7c2d12', '#431407', '#9a3412');
    drawIsoBox(36, 5, 26, 13, '#facc15', '#a16207', '#ca8a04');
    outlinedRect(ctx, cx - 12, cy - 28, 24, 22, '#09090b', '#451a03');
    if (state === 1) {
      const f = frame % 3;
      px(ctx, cx - 8, cy - 22 - f, 16, 14 + f, '#ea580c');
      px(ctx, cx - 5, cy - 19 - f, 10, 10 + f, '#facc15');
      px(ctx, cx - 2, cy - 15 - f, 4, 6, '#fef9c3');
    }
    return true;
  }
  if (furniId === 'hc_grand_chandelier') {
    drawIsoBox(6, 5, 12, 6, '#ca8a04', '#78350f', '#eab308');
    outlinedRect(ctx, cx - 2, cy - 66, 4, 58, '#ca8a04', '#fef08a', '#78350f');
    outlinedRect(ctx, cx - 20, cy - 52, 40, 8, '#eab308', '#fef08a', '#854d0e');
    const cCol = state === 1 ? '#fef08a' : '#cbd5e1';
    for (const lx of [-17, -7, 5, 15]) {
      outlinedRect(ctx, cx + lx, cy - 62, 4, 10, '#ffffff', cCol);
      if (state === 1) px(ctx, cx + lx + 1, cy - 66 - (frame % 2), 2, 4, '#f97316');
    }
    return true;
  }
  if (furniId === 'hc_globe') {
    drawIsoBox(10, 10, 16, 8, '#78350f', '#451a03', '#92400e');
    outlinedRect(ctx, cx - 13, cy - 44, 26, 26, '#ca8a04', '#fef08a', '#78350f');
    outlinedRect(ctx, cx - 10, cy - 41, 20, 20, '#0284c7', '#38bdf8', '#0369a1');
    px(ctx, cx - 6 + frame * 2, cy - 36, 7, 6, '#22c55e');
    px(ctx, cx + 1 - frame, cy - 29, 6, 5, '#16a34a');
    return true;
  }
  if (furniId === 'hc_gramophone') {
    drawIsoBox(14, 14, 16, 8, '#78350f', '#451a03', '#92400e');
    outlinedRect(ctx, cx - 8, cy - 22, 16, 4, '#09090b', '#334155');
    drawIsoPoly(ctx, [[cx, cy - 24], [cx + 18, cy - 52], [cx + 4, cy - 58], [cx - 4, cy - 30]], '#facc15', OUTLINE);
    drawIsoPoly(ctx, [[cx + 6, cy - 42], [cx + 16, cy - 51], [cx + 6, cy - 56], [cx, cy - 46]], '#b45309', OUTLINE);
    if (state === 1) {
      px(ctx, cx + 18, cy - 58 - frame * 2, 4, 4, '#38bdf8');
      px(ctx, cx + 12, cy - 64 - frame, 4, 4, '#ec4899');
    }
    return true;
  }
  if (furniId === 'gold_dragon' || furniId === 'frost_dragon') {
    const isGold = furniId === 'gold_dragon';
    drawIsoBox(12, 12, 18, 9, isGold ? '#451a03' : '#0c4a6e', '#09090b', isGold ? '#78350f' : '#0369a1');
    outlinedRect(ctx, cx - 10, cy - 38, 20, 26, isGold ? '#eab308' : '#38bdf8', isGold ? '#fef08a' : '#e0f2fe', isGold ? '#854d0e' : '#0284c7');
    outlinedRect(ctx, cx - 12, cy - 52, 24, 16, isGold ? '#facc15' : '#7dd3fc', '#ffffff', isGold ? '#a16207' : '#0369a1');
    px(ctx, cx - 11, cy - 58, 3, 6, '#ffffff');
    px(ctx, cx + 8, cy - 58, 3, 6, '#ffffff');
    px(ctx, cx - 5, cy - 46, 3, 2, isGold ? '#dc2626' : '#f0f9ff');
    px(ctx, cx + 3, cy - 46, 3, 2, isGold ? '#dc2626' : '#f0f9ff');
    if (state === 1) {
      const fx = dir === 1 ? cx - 22 : cx + 10;
      px(ctx, fx, cy - 42 + (frame - 1), 12, 8, isGold ? '#facc15' : '#22d3ee');
      px(ctx, fx + 3, cy - 40 + (frame - 1), 6, 4, '#ffffff');
    }
    return true;
  }
  if (furniId === 'blue_amber_lamp') {
    drawIsoBox(10, 10, 16, 8, '#eab308', '#854d0e', '#ca8a04');
    const c = state === 1 ? '#38bdf8' : '#0284c7';
    outlinedRect(ctx, cx - 10, cy - 44, 20, 32, c, '#e0f2fe', '#0369a1');
    if (state === 1) px(ctx, cx - 4, cy - 36, 8, 16, '#ffffff');
    return true;
  }
  if (furniId === 'emerald_pillow' || furniId === 'white_lace_pillow') {
    const isEm = furniId === 'emerald_pillow';
    drawIsoBox(10, 8, 20, 10, isEm ? '#16a34a' : '#f8fafc', isEm ? '#14532d' : '#94a3b8', isEm ? '#15803d' : '#cbd5e1');
    drawIsoPoly(ctx, [[cx, cy - 18], [cx + 16, cy - 10], [cx, cy - 2], [cx - 16, cy - 10]], isEm ? '#4ade80' : '#ffffff', isEm ? '#14532d' : '#64748b');
    px(ctx, cx - 18, cy - 8, 3, 3, '#facc15');
    px(ctx, cx + 15, cy - 8, 3, 3, '#facc15');
    return true;
  }
  if (furniId === 'dino_egg') {
    drawIsoBox(8, 8, 16, 8, '#78350f', '#451a03', '#92400e');
    outlinedRect(ctx, cx - 11, cy - 44, 22, 32, '#16a34a', '#4ade80', '#14532d');
    px(ctx, cx - 6, cy - 38, 4, 4, '#facc15');
    px(ctx, cx + 3, cy - 32, 5, 5, '#facc15');
    px(ctx, cx - 4, cy - 24, 4, 4, '#fde047');
    if (state === 1) {
      px(ctx, cx - 8, cy - 30, 16, 2, '#141414');
      px(ctx, cx - 2, cy - 33, 4, 3, '#fef08a');
    }
    return true;
  }
  if (furniId === 'habbo_cola_machine') {
    drawIsoBox(44, 44, 18, 9, '#dc2626', '#7f1d1d', '#b91c1c');
    outlinedRect(ctx, cx - 14, cy - 52, 28, 46, '#ef4444', '#fca5a5', '#991b1b');
    outlinedRect(ctx, cx - 11, cy - 46, 22, 14, '#ffffff', '#ffffff', '#fca5a5');
    px(ctx, cx - 8, cy - 41, 16, 4, '#dc2626');
    outlinedRect(ctx, cx - 8, cy - 20, 16, 10, '#1e293b', '#475569');
    if (state === 1) px(ctx, cx - 2, cy - 16, 4, 6, '#facc15');
    return true;
  }
  if (furniId === 'smoke_machine') {
    drawIsoBox(14, 12, 18, 9, '#334155', '#0f172a', '#1e293b');
    outlinedRect(ctx, cx - 8, cy - 22, 16, 10, '#475569', '#94a3b8', '#0f172a');
    px(ctx, cx - 4, cy - 19, 3, 3, state === 1 ? '#22c55e' : '#ef4444');
    if (state === 1) {
      const puff = frame * 3;
      outlinedRect(ctx, cx - 14, cy - 38 - puff, 12, 10, '#e2e8f0', '#ffffff', '#94a3b8');
      outlinedRect(ctx, cx - 4, cy - 46 - puff, 16, 12, '#f8fafc', '#ffffff', '#cbd5e1');
      outlinedRect(ctx, cx + 4, cy - 36 - puff, 10, 9, '#cbd5e1', '#f8fafc', '#94a3b8');
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
    if (furniId === 'mode_armchair' || furniId === 'mode_dining_chair') {
      drawIsoBox(11, 9, 16, 8, '#334155', '#0f172a', '#1e293b');
      drawIsoBox(15, 4, 13, 6, '#dc2626', '#7f1d1d', '#991b1b');
      outlinedRect(ctx, cx - 11, cy - 36, 22, 16, '#475569', '#94a3b8', '#0f172a');
    } else if (furniId === 'mode_bed') {
      drawIsoBox(12, 10, 28, 14, '#334155', '#0f172a', '#1e293b');
      drawIsoBox(16, 4, 24, 12, '#dc2626', '#7f1d1d', '#b91c1c');
      drawIsoBox(21, 5, 10, 5, '#f8fafc', '#cbd5e1', '#e2e8f0', -10, -5);
      outlinedRect(ctx, cx - 24, cy - 38, 16, 18, '#475569', '#94a3b8', '#0f172a');
    } else if (furniId === 'mode_bookshelf' || furniId === 'mode_fireplace' || furniId === 'mode_minibar') {
      drawIsoBox(38, 38, 20, 10, '#334155', '#0f172a', '#1e293b');
      outlinedRect(ctx, cx - 14, cy - 46, 28, 36, '#1e293b', '#64748b', '#09090b');
      if (furniId === 'mode_fireplace' && state === 1) {
        px(ctx, cx - 7, cy - 22, 14, 10, '#f97316');
        px(ctx, cx - 4, cy - 19, 8, 7, '#facc15');
      } else {
        px(ctx, cx - 10, cy - 40, 5, 8, '#ef4444');
        px(ctx, cx - 3, cy - 40, 5, 8, '#38bdf8');
        px(ctx, cx + 4, cy - 40, 5, 8, '#facc15');
        px(ctx, cx - 9, cy - 26, 6, 8, '#22c55e');
        px(ctx, cx, cy - 26, 7, 8, '#a855f7');
      }
    } else {
      drawIsoBox(22, 20, 22, 11, '#475569', '#0f172a', '#334155');
      drawIsoBox(24, 3, 24, 12, '#94a3b8', '#475569', '#64748b');
    }
    return true;
  }
  if (furniId.startsWith('pura_') || furniId === 'glass_divider' || furniId === 'bubble_lamp') {
    if (furniId === 'pura_chair' || furniId === 'pura_egg_chair') {
      drawIsoBox(10, 8, 16, 8, '#f8fafc', '#94a3b8', '#cbd5e1');
      outlinedRect(ctx, cx - 13, cy - 36, 26, 22, '#38bdf8', '#bae6fd', '#0284c7');
      outlinedRect(ctx, cx - 9, cy - 31, 18, 13, '#ffffff', '#ffffff', '#bae6fd');
    } else if (furniId === 'pura_bed') {
      drawIsoBox(11, 9, 28, 14, '#f8fafc', '#94a3b8', '#cbd5e1');
      drawIsoBox(15, 4, 24, 12, '#38bdf8', '#0284c7', '#0ea5e9');
      drawIsoBox(20, 5, 10, 5, '#ffffff', '#cbd5e1', '#e2e8f0', -10, -5);
    } else if (furniId === 'pura_minibar' || furniId === 'pura_fridge') {
      drawIsoBox(34, 34, 18, 9, '#f1f5f9', '#94a3b8', '#cbd5e1');
      outlinedRect(ctx, cx - 13, cy - 42, 26, 34, '#e0f2fe', '#ffffff', '#38bdf8');
      px(ctx, cx + 6, cy - 28, 2, 10, '#0284c7');
    } else if (furniId === 'pura_hydro_tub') {
      drawIsoBox(14, 12, 28, 14, '#f8fafc', '#94a3b8', '#cbd5e1');
      drawIsoPoly(ctx, [[cx, cy - 25], [cx + 22, cy - 14], [cx, cy - 3], [cx - 22, cy - 14]], state === 1 ? '#38bdf8' : '#0284c7', '#0369a1');
      if (state === 1) {
        px(ctx, cx - 8 + frame * 2, cy - 16, 5, 3, '#ffffff');
        px(ctx, cx + 3 - frame * 2, cy - 12, 4, 3, '#e0f2fe');
      }
    } else if (furniId === 'pura_bookshelf') {
      drawIsoBox(38, 38, 18, 9, '#f8fafc', '#94a3b8', '#cbd5e1');
      outlinedRect(ctx, cx - 12, cy - 44, 24, 32, '#e0f2fe', '#ffffff', '#38bdf8');
      px(ctx, cx - 9, cy - 38, 5, 8, '#ec4899');
      px(ctx, cx - 2, cy - 38, 5, 8, '#38bdf8');
      px(ctx, cx + 5, cy - 38, 4, 8, '#facc15');
    } else if (furniId === 'bubble_lamp') {
      drawIsoBox(8, 8, 12, 6, '#cbd5e1', '#64748b', '#94a3b8');
      outlinedRect(ctx, cx - 6, cy - 52, 12, 44, state === 1 ? '#22d3ee' : '#0284c7', '#e0f2fe', '#0369a1');
      if (state === 1) {
        px(ctx, cx - 2, cy - 20 - frame * 10, 4, 4, '#ffffff');
        px(ctx, cx, cy - 34 - frame * 5, 3, 3, '#bae6fd');
      }
    } else {
      drawIsoBox(28, 26, 22, 11, '#bae6fd', '#0284c7', '#38bdf8');
    }
    return true;
  }
  if (furniId.startsWith('area_') || furniId.startsWith('lodge_')) {
    const isLodge = furniId.startsWith('lodge_');
    const wTop = isLodge ? '#b45309' : '#d97706';
    const wLeft = isLodge ? '#78350f' : '#92400e';
    const wRight = isLodge ? '#92400e' : '#b45309';
    if (furniId === 'area_sofa') {
      drawIsoBox(11, 9, 24, 12, wTop, wLeft, wRight);
      drawIsoBox(15, 4, 20, 10, '#16a34a', '#14532d', '#15803d');
      drawIsoBox(28, 14, 11, 6, '#15803d', '#14532d', '#166534', -10, -5);
    } else if (furniId === 'area_armchair') {
      drawIsoBox(11, 9, 16, 8, wTop, wLeft, wRight);
      drawIsoBox(15, 4, 13, 6, '#16a34a', '#14532d', '#15803d');
      outlinedRect(ctx, cx - 10, cy - 34, 20, 15, '#15803d', '#4ade80', '#14532d');
    } else if (furniId === 'lodge_bed') {
      drawIsoBox(12, 10, 28, 14, wTop, wLeft, wRight);
      drawIsoBox(16, 4, 24, 12, '#b91c1c', '#7f1d1d', '#991b1b');
      drawIsoBox(20, 5, 10, 5, '#fef3c7', '#d97706', '#fde68a', -10, -5);
    } else if (furniId === 'lodge_fireplace') {
      drawIsoBox(40, 40, 22, 11, '#78716c', '#44403c', '#57534e');
      outlinedRect(ctx, cx - 10, cy - 26, 20, 20, '#1c1917', '#57534e');
      if (state === 1) {
        px(ctx, cx - 6, cy - 20 - (frame % 2) * 2, 12, 12, '#ea580c');
        px(ctx, cx - 3, cy - 16, 6, 8, '#facc15');
      }
    } else if (furniId === 'lodge_candle_chandelier') {
      drawIsoBox(6, 5, 12, 6, wTop, wLeft, wRight);
      outlinedRect(ctx, cx - 2, cy - 60, 4, 52, wLeft, wTop);
      outlinedRect(ctx, cx - 18, cy - 46, 36, 6, wTop, '#facc15', wLeft);
      for (const lx of [-14, -5, 5, 13]) {
        px(ctx, cx + lx, cy - 54, 3, 8, '#fef3c7');
        if (state === 1) px(ctx, cx + lx, cy - 58 - (frame % 2), 3, 4, '#f97316');
      }
    } else if (furniId === 'area_bookcase' || furniId === 'lodge_bookcase' || furniId === 'area_sideboard') {
      drawIsoBox(36, 36, 20, 10, wTop, wLeft, wRight);
      outlinedRect(ctx, cx - 12, cy - 42, 24, 30, wLeft, wTop);
      px(ctx, cx - 9, cy - 36, 5, 8, '#ef4444');
      px(ctx, cx - 2, cy - 36, 5, 8, '#facc15');
      px(ctx, cx + 5, cy - 36, 4, 8, '#22c55e');
    } else {
      drawIsoBox(22, 20, 22, 11, wTop, wLeft, wRight);
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
      drawIsoBox(11, 9, 24, 12, '#e0f2fe', '#7dd3fc', '#bae6fd');
      drawIsoBox(15, 4, 20, 10, '#ffffff', '#bae6fd', '#e0f2fe');
      drawIsoBox(28, 14, 11, 6, '#bae6fd', '#38bdf8', '#7dd3fc', -10, -5);
    } else if (furniId === 'iced_chair' || furniId.startsWith('plasto_chair') || furniId === 'plasto_pod') {
      drawIsoBox(9, 8, 15, 8, col, shadeHex(col, -30), shadeHex(col, 20));
      outlinedRect(ctx, cx - 12, cy - 34, 24, 20, col, shadeHex(col, 35), shadeHex(col, -25));
    } else if (furniId === 'plasto_parasol') {
      drawIsoBox(6, 5, 12, 6, '#f8fafc', '#94a3b8', '#cbd5e1');
      outlinedRect(ctx, cx - 2, cy - 54, 4, 48, '#ffffff', '#cbd5e1');
      drawIsoPoly(ctx, [[cx, cy - 70], [cx + 26, cy - 50], [cx, cy - 38], [cx - 26, cy - 50]], '#f97316', OUTLINE);
      drawIsoPoly(ctx, [[cx, cy - 70], [cx + 10, cy - 42], [cx - 10, cy - 42]], '#fef08a');
    } else {
      drawIsoBox(18, 16, 22, 11, col, shadeHex(col, -28), shadeHex(col, 18));
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
      drawIsoBox(44, 44, 18, 9, '#1e293b', '#09090b', '#0f172a');
      outlinedRect(ctx, cx - 11, cy - 48, 22, 40, '#0f172a', '#475569');
      const pulse = state === 1 ? (frame % 2) * 2 : 0;
      outlinedRect(ctx, cx - 8 - pulse / 2, cy - 44, 16 + pulse, 14, '#334155', '#38bdf8');
      outlinedRect(ctx, cx - 9 - pulse / 2, cy - 26, 18 + pulse, 16, '#334155', '#ec4899');
    } else if (furniId === 'pinball_machine') {
      drawIsoBox(18, 14, 24, 12, '#312e81', '#1e1b4b', '#4338ca');
      outlinedRect(ctx, cx - 14, cy - 56, 20, 34, '#4f46e5', '#facc15', '#1e1b4b');
      px(ctx, cx - 10 + frame * 3, cy - 44, 6, 6, '#ec4899');
      px(ctx, cx - 4, cy - 22, 14, 6, '#22d3ee');
    } else if (furniId === 'laser_gate') {
      drawIsoBox(8, 8, 18, 9, '#334155', '#0f172a', '#1e293b');
      outlinedRect(ctx, cx - 16, cy - 44, 6, 36, '#475569', '#94a3b8');
      outlinedRect(ctx, cx + 10, cy - 44, 6, 36, '#475569', '#94a3b8');
      if (state === 1) {
        for (let ly = -38; ly <= -16; ly += 7) {
          px(ctx, cx - 10, cy + ly, 20, 3, frame % 2 === 0 ? '#ef4444' : '#fca5a5');
        }
      }
    } else if (furniId === 'bar_stool_chrome') {
      drawIsoBox(6, 4, 12, 6, '#94a3b8', '#475569', '#cbd5e1');
      outlinedRect(ctx, cx - 2, cy - 26, 4, 20, '#e2e8f0', '#ffffff', '#64748b');
      drawIsoBox(26, 5, 13, 7, '#dc2626', '#7f1d1d', '#ef4444');
    } else {
      drawIsoBox(24, 22, 24, 12, '#312e81', '#0f172a', '#ec4899');
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
      drawIsoBox(24, 22, 24, 12, '#b45309', '#78350f', '#92400e');
      outlinedRect(ctx, cx - 18, cy - 58, 4, 36, '#78350f', '#d97706');
      outlinedRect(ctx, cx + 14, cy - 58, 4, 36, '#78350f', '#d97706');
      drawIsoPoly(ctx, [[cx, cy - 72], [cx + 28, cy - 54], [cx, cy - 44], [cx - 28, cy - 54]], '#eab308', OUTLINE);
    } else if (furniId === 'sand_castle') {
      drawIsoBox(12, 10, 22, 11, '#fde047', '#ca8a04', '#eab308');
      outlinedRect(ctx, cx - 14, cy - 32, 9, 20, '#facc15', '#fef9c3', '#ca8a04');
      outlinedRect(ctx, cx + 5, cy - 32, 9, 20, '#facc15', '#fef9c3', '#ca8a04');
      outlinedRect(ctx, cx - 5, cy - 40, 10, 28, '#eab308', '#fef08a', '#a16207');
      px(ctx, cx - 1, cy - 48, 6, 5, '#ef4444');
    } else if (furniId === 'koi_pond') {
      drawIsoPoly(ctx, [[cx, cy - 15], [cx + 30, cy], [cx, cy + 15], [cx - 30, cy]], '#64748b', '#334155');
      drawIsoPoly(ctx, [[cx, cy - 11], [cx + 22, cy], [cx, cy + 11], [cx - 22, cy]], '#0284c7', '#0369a1');
      px(ctx, cx - 6 + frame * 3, cy - 2, 6, 3, '#f97316');
      px(ctx, cx + 2 - frame * 2, cy + 3, 5, 3, '#ffffff');
    } else if (furniId === 'campfire_pit') {
      drawIsoPoly(ctx, [[cx, cy - 12], [cx + 22, cy], [cx, cy + 12], [cx - 22, cy]], '#57534e', '#1c1917');
      outlinedRect(ctx, cx - 10, cy - 10, 20, 6, '#78350f', '#92400e');
      if (state === 1) {
        const f = frame % 3;
        px(ctx, cx - 7, cy - 26 - f, 14, 16 + f, '#ea580c');
        px(ctx, cx - 4, cy - 22 - f, 8, 12 + f, '#facc15');
      }
    } else if (furniId === 'bonsai_tree') {
      drawIsoBox(8, 7, 14, 7, '#1e3a8a', '#172554', '#1d4ed8');
      outlinedRect(ctx, cx - 3, cy - 26, 6, 18, '#78350f', '#a16207');
      outlinedRect(ctx, cx - 14, cy - 38, 18, 12, '#16a34a', '#4ade80', '#14532d');
      outlinedRect(ctx, cx - 2, cy - 44, 18, 12, '#22c55e', '#86efac', '#15803d');
    } else {
      drawIsoBox(12, 10, 20, 10, '#d97706', '#78350f', '#b45309');
      outlinedRect(ctx, cx - 12, cy - 34, 24, 20, '#facc15', '#fef9c3', '#a16207');
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
      const isGold = furniId === 'trophy_gold' || furniId === 'trophy_duck' || furniId === 'trophy_globe';
      const isSlv = furniId === 'trophy_silver';
      const c1 = isGold ? '#facc15' : isSlv ? '#e2e8f0' : '#d97706';
      const cHi = isGold ? '#fef9c3' : isSlv ? '#ffffff' : '#fde68a';
      const cLo = isGold ? '#854d0e' : isSlv ? '#475569' : '#78350f';
      drawIsoBox(10, 10, 14, 7, '#78350f', '#451a03', '#92400e');
      outlinedRect(ctx, cx - 3, cy - 28, 6, 18, c1, cHi, cLo);
      outlinedRect(ctx, cx - 11, cy - 48, 22, 20, c1, cHi, cLo);
      px(ctx, cx - 6, cy - 44, 4, 10, '#ffffff');
    } else {
      outlinedRect(ctx, cx - 18, cy - 54, 36, 32, '#1e293b', '#94a3b8', '#09090b');
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
      outlinedRect(ctx, cx - 15, cy - 51, 30, 26, inner, '#ffffff');
      px(ctx, cx - 8, cy - 42, 16, 8, '#fef08a');
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
    drawIsoPoly(ctx, [[cx, cy - 15], [cx + 30, cy], [cx, cy + 15], [cx - 30, cy]], rCol, rTrim);
    drawIsoPoly(ctx, [[cx, cy - 9], [cx + 18, cy], [cx, cy + 9], [cx - 18, cy]], shadeHex(rCol, 22), rTrim);
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

  // Staff & VIP extended badges (HOBBA, GUIDE, BUILD1, HC2)
  if (upper === 'HOBBA' || upper === 'GUIDE' || upper === 'BUILD1' || upper === 'HC2') {
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
    // Center emblem
    px(s, 18, 11, 4, 14, GOLD_HI);
    px(s, 13, 16, 14, 4, GOLD_HI);
    px(s, 19, 17, 2, 2, '#ffffff');
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

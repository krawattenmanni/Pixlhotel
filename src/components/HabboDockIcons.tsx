import { useEffect, useRef } from 'react';

function applyPixelOutline(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const out = img.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (src[idx + 3] > 20) continue;
      const hasNeighbor =
        (x > 0 && src[(y * w + (x - 1)) * 4 + 3] > 20) ||
        (x < w - 1 && src[(y * w + (x + 1)) * 4 + 3] > 20) ||
        (y > 0 && src[((y - 1) * w + x) * 4 + 3] > 20) ||
        (y < h - 1 && src[((y + 1) * w + x) * 4 + 3] > 20);
      if (hasNeighbor) {
        out[idx] = 0x11;
        out[idx + 1] = 0x11;
        out[idx + 2] = 0x11;
        out[idx + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * 1. Yellow Habbo Console (Handheld Messenger / Pager)
 */
export function ConsolePhoneIcon({ unread = false }: { unread?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 30, 30);

    const bodyCol = unread ? '#f97316' : '#facc15';
    const hiCol = unread ? '#fed7aa' : '#fef08a';
    const loCol = unread ? '#c2410c' : '#ca8a04';

    // Stubby antenna on top-right
    px(ctx, 19, 2, 3, 4, '#334155');
    px(ctx, 19, 2, 2, 1, '#94a3b8');

    // Rounded yellow console shell
    px(ctx, 8, 5, 14, 21, bodyCol);
    px(ctx, 7, 6, 16, 19, bodyCol);
    // Top & left highlight bevel
    px(ctx, 8, 5, 13, 2, hiCol);
    px(ctx, 7, 7, 2, 17, hiCol);
    // Right & bottom shadow bevel
    px(ctx, 21, 7, 2, 18, loCol);
    px(ctx, 8, 24, 14, 2, loCol);

    // Dark LCD pixel screen
    px(ctx, 10, 8, 10, 7, '#0f172a');
    px(ctx, 11, 9, 8, 5, unread ? '#fde047' : '#38bdf8');
    // Tiny envelope / message lines on screen
    px(ctx, 12, 10, 6, 1, '#0f172a');
    px(ctx, 12, 12, 4, 1, '#0f172a');

    // Keypad buttons (3x2 grid)
    for (const ky of [17, 20]) {
      for (const kx of [10, 14, 18]) {
        px(ctx, kx, ky, 2, 2, '#ffffff');
      }
    }

    applyPixelOutline(ctx, 30, 30);
  }, [unread]);

  return <canvas ref={ref} width={30} height={30} className="pixelated block" />;
}

/**
 * 2. Hotel Navigator Building (Isometric Steel-Blue & Gold Habbo Hotel Tower)
 */
export function HotelNavigatorIcon() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 30, 30);

    // Rooftop sign & beacon
    px(ctx, 12, 3, 6, 3, '#dc2626');
    px(ctx, 13, 3, 4, 1, '#fca5a5');

    // Upper tower tier
    px(ctx, 9, 6, 12, 4, '#60a5fa');
    px(ctx, 9, 6, 12, 1, '#bae6fd');

    // Main isometric tower left (sunlit) & right (shaded) wings
    px(ctx, 6, 10, 9, 16, '#3b82f6');
    px(ctx, 6, 10, 2, 16, '#93c5fd');
    px(ctx, 15, 10, 9, 16, '#1d4ed8');
    px(ctx, 22, 10, 2, 16, '#1e3a8a');

    // Lit yellow pixel windows (2 columns per wing)
    for (const wy of [12, 16, 20]) {
      px(ctx, 8, wy, 2, 2, '#fde047');
      px(ctx, 12, wy, 2, 2, '#fef08a');
      px(ctx, 17, wy, 2, 2, '#fde047');
      px(ctx, 20, wy, 2, 2, '#38bdf8');
    }

    // Ground lobby awning & gold doors
    px(ctx, 11, 22, 8, 2, '#ef4444');
    px(ctx, 13, 24, 4, 3, '#facc15');
    px(ctx, 5, 26, 20, 2, '#94a3b8');

    applyPixelOutline(ctx, 30, 30);
  }, []);

  return <canvas ref={ref} width={30} height={30} className="pixelated block" />;
}

/**
 * 3. Brown Coin Purse & Stacked Gold Coins
 */
export function CoinPurseIcon() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 30, 30);

    // Gold clasp & neck of pouch
    px(ctx, 9, 5, 8, 3, '#facc15');
    px(ctx, 10, 5, 6, 1, '#fef9c3');
    px(ctx, 8, 8, 10, 2, '#dc2626'); // red drawstring tie

    // Plump brown leather coin pouch
    px(ctx, 6, 10, 14, 14, '#92400e');
    px(ctx, 5, 12, 16, 11, '#92400e');
    px(ctx, 7, 24, 12, 2, '#78350f');
    // Leather highlight & shading
    px(ctx, 7, 11, 5, 10, '#b45309');
    px(ctx, 8, 12, 3, 6, '#d97706');
    px(ctx, 17, 12, 3, 11, '#78350f');

    // Two gleaming stacked gold coins in front-right
    px(ctx, 16, 17, 9, 9, '#d97706');
    px(ctx, 17, 16, 7, 9, '#facc15');
    px(ctx, 18, 17, 5, 2, '#fef9c3');
    px(ctx, 19, 19, 2, 4, '#b45309');

    applyPixelOutline(ctx, 30, 30);
  }, []);

  return <canvas ref={ref} width={30} height={30} className="pixelated block" />;
}

/**
 * 4. Open Catalogue Book (Open Binder with Red Bookmark & Pixel Furni Icons)
 */
export function CatalogueBookIcon() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 30, 30);

    // Outer hardcover binder
    px(ctx, 3, 6, 24, 19, '#1e3a8a');
    px(ctx, 14, 5, 2, 21, '#0f172a'); // center spine

    // Left open cream page
    px(ctx, 5, 7, 9, 16, '#fefce8');
    px(ctx, 6, 7, 7, 1, '#ffffff');
    // Right open cream page
    px(ctx, 16, 7, 9, 16, '#fef9c3');
    px(ctx, 16, 7, 8, 1, '#ffffff');

    // Tiny pixel furni illustrations on left page (red sofa + text lines)
    px(ctx, 7, 10, 5, 4, '#dc2626');
    px(ctx, 8, 10, 3, 1, '#fca5a5');
    px(ctx, 7, 16, 5, 1, '#64748b');
    px(ctx, 7, 18, 4, 1, '#94a3b8');

    // Tiny pixel furni illustrations on right page (gold trophy + cyan pod)
    px(ctx, 18, 10, 4, 4, '#eab308');
    px(ctx, 19, 10, 2, 1, '#fef9c3');
    px(ctx, 18, 16, 5, 4, '#0ea5e9');
    px(ctx, 19, 16, 3, 1, '#bae6fd');

    // Red bookmark ribbon hanging below spine
    px(ctx, 14, 22, 3, 5, '#dc2626');
    px(ctx, 14, 22, 2, 3, '#ef4444');

    applyPixelOutline(ctx, 30, 30);
  }, []);

  return <canvas ref={ref} width={30} height={30} className="pixelated block" />;
}

/**
 * 5. The Iconic Big Pixel Hand (Skin-Toned Horizontal Hand Pointing Left)
 */
export function HabboHandIcon() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 30, 30);

    const skin = '#f5cba7';
    const skinHi = '#fdebd0';
    const skinLo = '#c9966b';

    // Shirt cuff on right edge
    px(ctx, 22, 11, 4, 11, '#2563eb');
    px(ctx, 22, 11, 4, 2, '#60a5fa');
    px(ctx, 20, 12, 2, 9, '#ffffff');

    // Thumb angled up-left
    px(ctx, 12, 6, 4, 5, skin);
    px(ctx, 13, 6, 2, 2, skinHi);

    // Extended index finger pointing left
    px(ctx, 4, 10, 16, 4, skin);
    px(ctx, 5, 10, 14, 1, skinHi);

    // Palm & curled lower fingers
    px(ctx, 8, 14, 12, 4, skin);
    px(ctx, 10, 18, 10, 4, skin);
    px(ctx, 12, 21, 7, 2, skinLo);
    // Finger crease lines
    px(ctx, 8, 14, 4, 1, skinLo);
    px(ctx, 10, 18, 4, 1, skinLo);

    applyPixelOutline(ctx, 30, 30);
  }, []);

  return <canvas ref={ref} width={30} height={30} className="pixelated block" />;
}

/**
 * 6. Blue/Silver Speaker (With Blue Soundwaves or Red Mute X)
 */
export function SpeakerIcon({ muted = false }: { muted?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 30, 30);

    // Speaker magnet back box (royal blue)
    px(ctx, 5, 11, 5, 8, '#2563eb');
    px(ctx, 5, 11, 5, 2, '#60a5fa');
    px(ctx, 5, 17, 5, 2, '#1d4ed8');

    // Metallic silver speaker cone flaring right
    px(ctx, 10, 9, 3, 12, '#cbd5e1');
    px(ctx, 13, 7, 3, 16, '#e2e8f0');
    px(ctx, 16, 6, 2, 18, '#94a3b8');
    // Top cone highlight
    px(ctx, 10, 9, 3, 2, '#ffffff');
    px(ctx, 13, 7, 3, 2, '#ffffff');

    if (muted) {
      // Crisp red pixel X on right
      for (let i = 0; i < 7; i++) {
        px(ctx, 20 + i, 11 + i, 2, 2, '#ef4444');
        px(ctx, 20 + i, 17 - i, 2, 2, '#ef4444');
      }
    } else {
      // Bright cyan/blue soundwave pixels
      px(ctx, 20, 12, 2, 6, '#38bdf8');
      px(ctx, 23, 9, 2, 3, '#60a5fa');
      px(ctx, 24, 12, 2, 6, '#93c5fd');
      px(ctx, 23, 18, 2, 3, '#60a5fa');
    }

    applyPixelOutline(ctx, 30, 30);
  }, [muted]);

  return <canvas ref={ref} width={30} height={30} className="pixelated block" />;
}

/**
 * 7. Big Blue Question Mark (3D Beveled Royal-Blue Pixel ?)
 */
export function BlueQuestionIcon() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 30, 30);

    const blue = '#3b82f6';
    const hi = '#93c5fd';
    const lo = '#1d4ed8';

    // Top arch of ?
    px(ctx, 9, 4, 12, 4, blue);
    px(ctx, 10, 4, 10, 1, hi);
    // Left tip of ?
    px(ctx, 7, 6, 4, 5, blue);
    px(ctx, 7, 6, 2, 2, hi);
    px(ctx, 7, 10, 4, 1, lo);
    // Right curve of ?
    px(ctx, 18, 6, 5, 7, blue);
    px(ctx, 21, 7, 2, 6, lo);
    // Middle inward stem
    px(ctx, 13, 12, 7, 4, blue);
    px(ctx, 13, 12, 4, 1, hi);
    px(ctx, 13, 15, 4, 4, blue);
    px(ctx, 15, 16, 2, 3, lo);

    // Matching 3D pixel dot underneath
    px(ctx, 13, 22, 4, 4, blue);
    px(ctx, 13, 22, 3, 1, hi);
    px(ctx, 15, 25, 2, 1, lo);

    applyPixelOutline(ctx, 30, 30);
  }, []);

  return <canvas ref={ref} width={30} height={30} className="pixelated block" />;
}

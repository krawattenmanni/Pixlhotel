import type { StorageLike } from './accountsDb';
import { BADGE_CATALOGUE } from './data';
import type { BadgeDef, CustomBadgeDef, UserAccount } from './types';

export const CUSTOM_BADGES_STORAGE_KEY = 'pixlhotel_custom_badges_v1';

export const BADGE_EDITOR_PALETTE: string[] = [
  '#141414', // Pixel Outline Black
  '#ffffff', // Crisp White
  '#fde047', // PIXL Gold
  '#f59e0b', // Amber
  '#ef4444', // Crimson Red
  '#991b1b', // Dark Ruby
  '#f472b6', // Bubblegum Pink
  '#9333ea', // Royal Purple
  '#2b7de9', // PIXL Blue
  '#1e3a8a', // Navy
  '#38bdf8', // Sky Cyan
  '#16a34a', // Emerald Green
  '#84cc16', // Lime
  '#b45309', // Warm Bronze
  '#94a3b8', // Silver Slate
  '#475569', // Charcoal
];

export function createEmptyBadgeGrid(): (string | null)[] {
  return Array.from({ length: 256 }, () => null);
}

export function createStarterCrownGrid(): (string | null)[] {
  const g = createEmptyBadgeGrid();
  const put = (x: number, y: number, c: string) => {
    g[y * 16 + x] = c;
  };
  // Cute 16x16 PIXL star/crown crest starter
  for (let x = 2; x <= 13; x++) {
    put(x, 2, '#141414');
    put(x, 13, '#141414');
  }
  for (let y = 3; y <= 12; y++) {
    put(1, y, '#141414');
    put(14, y, '#141414');
    for (let x = 2; x <= 13; x++) {
      put(x, y, '#2b7de9');
    }
  }
  // Golden crown motif inside
  for (let x = 4; x <= 11; x++) put(x, 10, '#fde047');
  for (let x = 4; x <= 11; x++) put(x, 9, '#f59e0b');
  put(4, 7, '#fde047');
  put(4, 8, '#fde047');
  put(7, 6, '#fde047');
  put(8, 6, '#fde047');
  put(7, 7, '#fde047');
  put(8, 7, '#fde047');
  put(7, 8, '#ef4444');
  put(8, 8, '#ef4444');
  put(11, 7, '#fde047');
  put(11, 8, '#fde047');
  return g;
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  return null;
}

export function loadCustomBadges(storage: StorageLike | null = getDefaultStorage()): CustomBadgeDef[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CUSTOM_BADGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b): b is CustomBadgeDef =>
        Boolean(b && typeof b.id === 'string' && typeof b.code === 'string' && Array.isArray(b.pixels))
    );
  } catch {
    return [];
  }
}

export function saveCustomBadges(
  badges: CustomBadgeDef[],
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(CUSTOM_BADGES_STORAGE_KEY, JSON.stringify(badges));
  } catch {
    // Ignore quota errors safely
  }
}

export function customBadgeToBadgeDef(custom: CustomBadgeDef): BadgeDef {
  return {
    id: custom.id,
    code: custom.code,
    name: custom.name,
    description: custom.description,
    unlockHint: `Custom Housekeeping badge minted by ${custom.createdBy} (${custom.createdAt}).`,
    category: 'Custom',
    palette: {
      bg: '#2b7de9',
      border: '#1e3a8a',
      accent: '#fde047',
    },
    customPixels: custom.pixels,
  };
}

export function getAllBadgeDefs(customBadges: CustomBadgeDef[] = []): BadgeDef[] {
  return [...BADGE_CATALOGUE, ...customBadges.map(customBadgeToBadgeDef)];
}

const LEGACY_BADGE_CODE_TO_ID: Record<string, string> = {
  HTL: 'badge_checkin',
  ACH_LOGIN1: 'badge_checkin',
  PC: 'badge_hc',
  PC1: 'badge_hc',
  HC: 'badge_hc',
  HC1: 'badge_hc',
  PC2: 'PC2',
  HC2: 'PC2',
  ADM: 'badge_admin',
  MOD: 'badge_mod',
  EVT: 'badge_evt',
  VIP: 'badge_vip',
  LDO: 'badge_lido',
  LDO1: 'badge_lido',
  BNZ: 'badge_banzai',
  BNZ1: 'badge_banzai',
  DRG: 'badge_dragon',
  DRG1: 'badge_dragon',
  ROY: 'badge_throne',
  THR1: 'badge_throne',
  DJ: 'badge_dj',
  DJ1: 'badge_dj',
  CHT: 'badge_social',
  ACH_CHAT1: 'badge_social',
  STY: 'badge_stylist',
  ACH_LOOK1: 'badge_stylist',
  ARC: 'badge_architect',
  ACH_ROOM1: 'badge_architect',
  VCH: 'badge_voucher',
  ACH_VOUCH: 'badge_voucher',
  GLD: 'badge_gold',
  TRD: 'badge_gold',
  ACH_CRED1: 'badge_gold',
  NEW: 'badge_new',
  PRK1: 'badge_new',
};

export function resolveCanonicalBadgeId(badgeIdOrCode: string): string {
  const trimmed = badgeIdOrCode.trim();
  const upper = trimmed.toUpperCase();
  if (LEGACY_BADGE_CODE_TO_ID[upper]) {
    return LEGACY_BADGE_CODE_TO_ID[upper];
  }
  const byId = BADGE_CATALOGUE.find((b) => b.id === trimmed || b.id.toUpperCase() === upper);
  if (byId) return byId.id;
  const byCode = BADGE_CATALOGUE.find((b) => b.code.toUpperCase() === upper);
  if (byCode) return byCode.id;
  return trimmed;
}

export function findBadgeDefById(
  badgeId: string,
  customBadges: CustomBadgeDef[] = []
): BadgeDef | undefined {
  const canonical = resolveCanonicalBadgeId(badgeId);
  const staticFound = BADGE_CATALOGUE.find(
    (b) => b.id === canonical || b.id === badgeId || b.code.toUpperCase() === badgeId.trim().toUpperCase()
  );
  if (staticFound) return staticFound;
  const customFound = customBadges.find(
    (b) => b.id === badgeId || b.code.toUpperCase() === badgeId.trim().toUpperCase()
  );
  return customFound ? customBadgeToBadgeDef(customFound) : undefined;
}

export interface MintBadgeInput {
  code: string;
  name: string;
  pixels: (string | null)[];
  createdBy: string;
}

export function mintCustomBadge(
  existing: CustomBadgeDef[],
  input: MintBadgeInput
): { ok: boolean; message: string; badge?: CustomBadgeDef; badges: CustomBadgeDef[] } {
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 5);
  const name = input.name.trim().slice(0, 36);
  const filledCount = input.pixels.filter((p) => Boolean(p)).length;

  if (code.length < 2) {
    return {
      ok: false,
      message: 'Enter a Badge Code (2–5 letters/numbers, e.g. VIP1).',
      badges: existing,
    };
  }
  if (name.length < 2) {
    return {
      ok: false,
      message: 'Enter a Badge Title (at least 2 characters).',
      badges: existing,
    };
  }
  if (filledCount === 0) {
    return {
      ok: false,
      message: 'Draw at least 1 pixel on the 16x16 canvas before minting.',
      badges: existing,
    };
  }

  const normalizedPixels = Array.from({ length: 256 }, (_, idx) => input.pixels[idx] ?? null);
  const newBadge: CustomBadgeDef = {
    id: `custom_badge_${code.toLowerCase()}_${Date.now()}`,
    code,
    name,
    description: `Hand-crafted 16x16 Housekeeping badge awarded by ${input.createdBy}.`,
    pixels: normalizedPixels,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  return {
    ok: true,
    message: `Minted custom badge [${code}] "${name}"!`,
    badge: newBadge,
    badges: [...existing, newBadge],
  };
}

export function awardCustomBadgeToAccount(
  accounts: UserAccount[],
  accountId: string,
  badgeId: string
): UserAccount[] {
  return accounts.map((acc) => {
    if (acc.id !== accountId) return acc;
    const set = new Set(acc.playerState.unlockedBadges);
    set.add(badgeId);
    return {
      ...acc,
      playerState: {
        ...acc.playerState,
        unlockedBadges: Array.from(set),
        equippedBadgeId: badgeId,
      },
    };
  });
}

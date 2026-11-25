import { supabase } from '../lib/supabase';
import {
  ADMIN_PLAYER_STATE,
  BADGE_CATALOGUE,
  CATALOG_ITEMS_SEED,
  CATALOG_PAGES_SEED,
  DEFAULT_LOOK,
  INITIAL_ROOMS,
} from './data';
import type {
  AccountRank,
  BanRecord,
  CatalogItemRow,
  CatalogPageRow,
  CustomBadgeDef,
  Direction,
  HotelAlertPayload,
  InventoryEntry,
  LookConfig,
  NewsArticle,
  OwnedPet,
  PetSpecies,
  PlacedFurni,
  RankDef,
  RoomAccessMode,
  RoomDef,
  RoomFloorTheme,
  RoomSettingsPayload,
  RoomWallTheme,
  StickyNoteColor,
  StickyNoteData,
  TrophyMetadata,
  UserAccount,
  VoucherDef,
} from './types';

// ============================================================================
// Raw PhoenixEmu / HoloCMS PostgreSQL Row Shapes
// ============================================================================

export interface DbUserRow {
  id: number;
  username: string;
  password: string;
  mail: string | null;
  motto: string | null;
  look: (Partial<LookConfig> & { _pixlExtras?: UserLookExtras }) | null;
  gender: string | null;
  rank: number | null;
  credits: number | null;
  duckets: number | null;
  hc_days: number | null;
  online: boolean | null;
  account_created: string | null;
  last_online: string | null;
}

export interface UserLookExtras {
  redeemedVouchers?: string[];
  equippedBadgeId?: string;
  equippedBadges?: string[];
  currentRoomId?: string;
  npcFriendIds?: string[];
  respectCount?: number;
  incomingFriendRequests?: string[];
  outgoingFriendRequests?: string[];
}

export interface DbRankRow {
  id: number;
  name: string;
  badge_code: string | null;
}

export interface DbBanRow {
  id: number;
  bantype: string;
  value: string;
  reason: string | null;
  expire: string | null;
  added_by: string | null;
  added_date: string | null;
}

export interface DbRoomRow {
  id: number;
  caption: string;
  owner: string;
  description: string | null;
  model_name: string | null;
  state: string | null;
  users_now: number | null;
  users_max: number | null;
  category: number | null;
}

export interface DbItemRow {
  id: number;
  user_id: number;
  room_id: number;
  item_type: string;
  extra_data: string | null;
  x: number;
  y: number;
  z: number;
  rot: number;
}

export interface DbUserBadgeRow {
  id: number;
  user_id: number;
  badge_id: string;
  badge_slot: number;
  pixel_data: string | {
    id?: string;
    name?: string;
    description?: string;
    pixels?: (string | null)[];
    createdBy?: string;
    createdAt?: string;
  } | null;
}

export interface DbUserPetRow {
  id: number;
  user_id: number;
  room_id: number;
  name: string;
  type: string;
  color: string | null;
  nutrition: number;
  happiness: number;
  x: number;
  y: number;
}

export interface DbFriendshipRow {
  id: number;
  user_one_id: number;
  user_two_id: number;
}

export interface DbCmsNewsRow {
  id: number;
  title: string;
  shortstory: string | null;
  longstory: string | null;
  image: string | null;
  author: string | null;
  published: string | null;
}

export interface DbVoucherRow {
  id: number;
  code: string;
  credits: number | null;
  duckets: number | null;
  hc_days: number | null;
  badge_id: string | null;
  uses: number | null;
}

export interface DbCatalogPageRow {
  id: number;
  parent_id: number | null;
  caption: string;
  icon_image: number | null;
  visible: boolean | null;
  min_rank: number | null;
  order_num: number | null;
}

export interface DbCatalogItemRow {
  id: number;
  page_id: number;
  catalog_name: string;
  cost_credits: number | null;
  cost_duckets: number | null;
  amount: number | null;
  item_type: string;
}

export interface RetroDatabaseSnapshot {
  ranks: RankDef[];
  accounts: UserAccount[];
  bans: BanRecord[];
  rooms: RoomDef[];
  allItems: DbItemRow[];
  roomFurniMap: Record<string, PlacedFurni[]>;
  customBadges: CustomBadgeDef[];
  news: NewsArticle[];
  vouchers: VoucherDef[];
  catalogPages: CatalogPageRow[];
  catalogItems: CatalogItemRow[];
}

// ============================================================================
// Pure Relational Row Mappers (Unit-tested in gameLogic.test.ts)
// ============================================================================

const STANDARD_ROOM_LAYOUT = [
  'xxxxxxxxxx',
  'x00000000x',
  'x00000000x',
  'x00000000x',
  'x00000000x',
  'x00000000x',
  'x00000000x',
  'x00000000x',
  'x00000000x',
  'xxxxxxxxxx',
];

function clampRank(raw: number | null | undefined): AccountRank {
  if (raw === 1 || raw === 2 || raw === 3 || raw === 4 || raw === 5) return raw;
  const n = Number(raw);
  if (n >= 5) return 5;
  if (n >= 4) return 4;
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

export function sanitizeUserLook(
  raw: Partial<LookConfig> | null | undefined,
  username?: string
): LookConfig {
  const base =
    username?.toLowerCase() === 'krawattenmanni'
      ? ADMIN_PLAYER_STATE.look
      : DEFAULT_LOOK;
  if (!raw || typeof raw !== 'object') return { ...base };
  return {
    gender: raw.gender === 'F' ? 'F' : raw.gender === 'M' ? 'M' : base.gender ?? 'M',
    skinColor: typeof raw.skinColor === 'string' ? raw.skinColor : base.skinColor,
    hairStyle: raw.hairStyle ?? base.hairStyle,
    hairColor: typeof raw.hairColor === 'string' ? raw.hairColor : base.hairColor,
    expression: raw.expression ?? base.expression,
    shirtStyle: raw.shirtStyle ?? base.shirtStyle,
    shirtColor: typeof raw.shirtColor === 'string' ? raw.shirtColor : base.shirtColor,
    pantsColor: typeof raw.pantsColor === 'string' ? raw.pantsColor : base.pantsColor,
    shoesColor: typeof raw.shoesColor === 'string' ? raw.shoesColor : base.shoesColor,
    accessory: raw.accessory ?? base.accessory,
  };
}

export function mapRankRow(row: DbRankRow): RankDef {
  return {
    id: clampRank(row.id),
    name: row.name,
    badgeCode: (row.badge_code ?? '').trim(),
  };
}

export function mapBanRow(row: DbBanRow): BanRecord {
  return {
    id: row.id,
    bantype: row.bantype || 'user',
    value: row.value,
    reason: row.reason || 'Violated the PIXL Way.',
    expire: row.expire || '0',
    addedBy: row.added_by || 'Staff',
    addedDate: row.added_date ? String(row.added_date).slice(0, 10) : '',
  };
}

export function getRoomThemeFromModel(modelName: string | null | undefined): {
  floorTheme: RoomFloorTheme;
  wallTheme: RoomWallTheme;
  spawn: { x: number; y: number };
  outdoor: boolean;
  rooftopHotelFacade?: boolean;
} {
  switch (modelName) {
    case 'model_lido':
      return { floorTheme: 'lido_deck', wallTheme: 'lido_sky', spawn: { x: 4, y: 5 }, outdoor: true };
    case 'model_rooftop':
      return {
        floorTheme: 'wood_deck',
        wallTheme: 'rooftop_hotel',
        spawn: { x: 4, y: 6 },
        outdoor: true,
        rooftopHotelFacade: true,
      };
    case 'model_b':
    case 'model_mammoth':
      return { floorTheme: 'rooftop', wallTheme: 'nightsky', spawn: { x: 5, y: 7 }, outdoor: true };
    case 'model_disco':
      return { floorTheme: 'disco', wallTheme: 'neon', spawn: { x: 5, y: 7 }, outdoor: true };
    case 'model_park':
      return { floorTheme: 'park_grass', wallTheme: 'park_hedge', spawn: { x: 6, y: 7 }, outdoor: true };
    case 'model_banzai':
      return { floorTheme: 'banzai', wallTheme: 'neon', spawn: { x: 4, y: 8 }, outdoor: true };
    case 'model_c':
      return { floorTheme: 'parquet', wallTheme: 'navy', spawn: { x: 4, y: 6 }, outdoor: false };
    case 'model_tatami':
      return { floorTheme: 'tatami', wallTheme: 'brick', spawn: { x: 4, y: 6 }, outdoor: false };
    case 'model_a':
    case 'model_welcome':
    default:
      return { floorTheme: 'marble', wallTheme: 'cream', spawn: { x: 5, y: 7 }, outdoor: false };
  }
}

function matchPublicTemplateForRow(row: DbRoomRow): RoomDef | undefined {
  const cap = row.caption.trim().toLowerCase();
  const model = (row.model_name ?? '').trim().toLowerCase();
  return INITIAL_ROOMS.find((r) => {
    if (r.category !== 'public') return false;
    if (model && r.modelName && r.modelName.toLowerCase() === model) return true;
    if (r.name.toLowerCase() === cap) return true;
    if (r.id === 'the_lido' && (cap === 'the lido' || cap === 'lido deck')) return true;
    if (r.id === 'welcome_lounge' && (model === 'model_a' || cap === 'welcome lounge')) return true;
    return false;
  });
}

export function parseRoomStateField(rawState: string | null | undefined): RoomSettingsPayload {
  const raw = (rawState ?? '').trim();
  if (!raw || raw === 'open') {
    return { accessMode: 'open', rights: [] };
  }
  if (raw === 'doorbell') {
    return { accessMode: 'doorbell', rights: [] };
  }
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Partial<RoomSettingsPayload> & { mode?: RoomAccessMode };
      const mode: RoomAccessMode =
        parsed.accessMode === 'doorbell' ||
        parsed.accessMode === 'password' ||
        parsed.mode === 'doorbell' ||
        parsed.mode === 'password'
          ? (parsed.accessMode ?? parsed.mode)!
          : 'open';
      return {
        accessMode: mode,
        password: typeof parsed.password === 'string' ? parsed.password : '',
        rights: Array.isArray(parsed.rights)
          ? parsed.rights.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
          : [],
      };
    } catch {
      // Fallback
    }
  }
  if (raw.startsWith('password:')) {
    return { accessMode: 'password', password: raw.slice('password:'.length), rights: [] };
  }
  return { accessMode: 'open', rights: [] };
}

export function serializeRoomStateField(settings: RoomSettingsPayload): string {
  const cleanRights = Array.from(new Set(settings.rights.map((r) => r.trim()).filter(Boolean)));
  if (settings.accessMode === 'open' && cleanRights.length === 0) return 'open';
  if (settings.accessMode === 'doorbell' && cleanRights.length === 0) return 'doorbell';
  return JSON.stringify({
    accessMode: settings.accessMode,
    password: settings.accessMode === 'password' ? settings.password ?? '' : undefined,
    rights: cleanRights,
  });
}

export function mapRoomRowToRoomDef(row: DbRoomRow): RoomDef {
  const theme = getRoomThemeFromModel(row.model_name);
  const category: 'public' | 'private' = row.category === 3 ? 'private' : 'public';
  const matchedTemplate = category === 'public' ? matchPublicTemplateForRow(row) : undefined;
  const parsedSettings = parseRoomStateField(row.state);

  return {
    id: String(row.id),
    numericId: row.id,
    name: matchedTemplate?.name ?? row.caption,
    owner: matchedTemplate?.owner ?? row.owner,
    description: matchedTemplate?.description ?? row.description ?? 'Welcome to this PIXL Hotel room!',
    category,
    categoryNum: row.category ?? 1,
    modelName: matchedTemplate?.modelName ?? row.model_name ?? 'model_a',
    state: row.state || 'open',
    accessMode: category === 'public' ? 'open' : parsedSettings.accessMode,
    accessPassword: parsedSettings.password,
    roomRights: parsedSettings.rights,
    usersMax: row.users_max ?? 25,
    outdoor: matchedTemplate?.outdoor ?? theme.outdoor,
    rooftopHotelFacade: matchedTemplate?.rooftopHotelFacade ?? theme.rooftopHotelFacade ?? false,
    floorTheme: matchedTemplate?.floorTheme ?? theme.floorTheme,
    wallTheme: matchedTemplate?.wallTheme ?? theme.wallTheme,
    layout: matchedTemplate?.layout ?? STANDARD_ROOM_LAYOUT,
    spawn: matchedTemplate?.spawn ?? theme.spawn,
    initialFurni: [],
    baseOccupancy: 0,
  };
}

const STICKY_COLOR_STATE_MAP: Record<StickyNoteColor, number> = {
  yellow: 0,
  pink: 1,
  blue: 2,
  green: 3,
};

export function parseItemExtraData(raw: string | null | undefined): {
  state: number;
  customData?: TrophyMetadata;
  stickyNote?: StickyNoteData;
} {
  if (!raw) return { state: 0 };
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<TrophyMetadata> &
        Partial<StickyNoteData> & { _kind?: string };
      if (parsed && (parsed._kind === 'sticky' || (typeof parsed.text === 'string' && typeof parsed.color === 'string'))) {
        const col: StickyNoteColor =
          parsed.color === 'pink' || parsed.color === 'blue' || parsed.color === 'green'
            ? parsed.color
            : 'yellow';
        return {
          state: STICKY_COLOR_STATE_MAP[col],
          stickyNote: {
            color: col,
            text: typeof parsed.text === 'string' ? parsed.text : '',
            author: typeof parsed.author === 'string' ? parsed.author : 'PIXL Citizen',
            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
          },
        };
      }
      if (parsed && typeof parsed.inscription === 'string') {
        return {
          state: 1,
          customData: {
            inscription: parsed.inscription,
            engravedBy: parsed.engravedBy || 'PIXL Citizen',
            engravedAt: parsed.engravedAt || new Date().toISOString().slice(0, 10),
          },
        };
      }
    } catch {
      // Fallback to numeric state parse
    }
  }
  const num = Number(trimmed);
  return { state: Number.isFinite(num) ? num : 0 };
}

export function serializeItemExtraData(
  state: number,
  customData?: TrophyMetadata,
  stickyNote?: StickyNoteData
): string {
  if (stickyNote) {
    return JSON.stringify({ _kind: 'sticky', ...stickyNote });
  }
  if (customData && customData.inscription) {
    return JSON.stringify(customData);
  }
  return String(state ?? 0);
}

export function mapItemRowToPlacedFurni(
  row: DbItemRow,
  ownerNameById?: Map<number, string>
): PlacedFurni {
  const dirNum = ((Number(row.rot) % 4) + 4) % 4;
  const parsed = parseItemExtraData(row.extra_data);
  return {
    uid: String(row.id),
    itemId: row.id,
    userId: row.user_id,
    dbId: String(row.id),
    owner: ownerNameById?.get(row.user_id) ?? `User #${row.user_id}`,
    furniId: row.item_type,
    x: Number(row.x) || 0,
    y: Number(row.y) || 0,
    z: Number(row.z) || 0,
    dir: dirNum as Direction,
    state: parsed.state,
    customData: parsed.customData,
    stickyNote: parsed.stickyNote,
  };
}

export function groupInventoryFromItemRows(
  itemRows: DbItemRow[],
  userId: number
): {
  inventory: InventoryEntry[];
  pendingEngravings: Record<string, TrophyMetadata[]>;
} {
  const byType = new Map<string, number[]>();
  const pendingEngravings: Record<string, TrophyMetadata[]> = {};

  for (const row of itemRows) {
    if (row.user_id !== userId || row.room_id !== 0) continue;
    const list = byType.get(row.item_type) ?? [];
    list.push(row.id);
    byType.set(row.item_type, list);

    const parsed = parseItemExtraData(row.extra_data);
    if (parsed.customData) {
      pendingEngravings[row.item_type] = [
        ...(pendingEngravings[row.item_type] ?? []),
        parsed.customData,
      ];
    }
  }

  const inventory: InventoryEntry[] = Array.from(byType.entries()).map(
    ([furniId, ids]) => ({
      furniId,
      quantity: ids.length,
      itemIds: ids,
    })
  );

  return { inventory, pendingEngravings };
}

export function groupPlacedItemsByRoom(
  itemRows: DbItemRow[],
  rooms: RoomDef[],
  ownerNameById?: Map<number, string>
): Record<string, PlacedFurni[]> {
  const map: Record<string, PlacedFurni[]> = {};
  for (const r of rooms) {
    map[r.id] = [];
  }
  for (const row of itemRows) {
    if (row.room_id <= 0) continue;
    const key = String(row.room_id);
    if (!map[key]) map[key] = [];
    map[key].push(mapItemRowToPlacedFurni(row, ownerNameById));
  }
  return map;
}

export function mapBadgeCodeToCatalogId(codeOrId: string): string {
  const norm = codeOrId.trim();
  if (!norm) return '';
  const upper = norm.toUpperCase();
  const legacyMap: Record<string, string> = {
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
  if (legacyMap[upper]) return legacyMap[upper];
  const direct = BADGE_CATALOGUE.find(
    (b) => b.id === norm || b.id.toUpperCase() === upper || b.code.toUpperCase() === upper
  );
  if (direct) return direct.id;
  return norm;
}

export function mapCatalogIdToBadgeCode(badgeIdOrCode: string): string {
  const norm = badgeIdOrCode.trim();
  const found = BADGE_CATALOGUE.find(
    (b) => b.id === norm || b.code.toUpperCase() === norm.toUpperCase()
  );
  return found ? found.code.toUpperCase() : norm.toUpperCase();
}

export function mapUserBadgeRowToCustomBadge(
  row: DbUserBadgeRow
): CustomBadgeDef | null {
  if (!row.pixel_data) return null;
  try {
    const parsed =
      typeof row.pixel_data === 'string'
        ? (JSON.parse(row.pixel_data) as Record<string, unknown>)
        : (row.pixel_data as Record<string, unknown>);
    if (!parsed || !Array.isArray(parsed.pixels)) return null;
    const id = typeof parsed.id === 'string' ? parsed.id : `custom-${row.badge_id}-${row.id}`;
    return {
      id,
      code: row.badge_id.toUpperCase(),
      name: typeof parsed.name === 'string' ? parsed.name : row.badge_id,
      description:
        typeof parsed.description === 'string'
          ? parsed.description
          : `Custom minted pixel badge [${row.badge_id}].`,
      pixels: parsed.pixels as (string | null)[],
      createdBy: typeof parsed.createdBy === 'string' ? parsed.createdBy : 'Krawattenmanni',
      createdAt:
        typeof parsed.createdAt === 'string'
          ? parsed.createdAt
          : new Date().toISOString().slice(0, 10),
    };
  } catch {
    return null;
  }
}

function normalizePetSpecies(rawType: string): PetSpecies {
  const t = rawType.toLowerCase();
  if (t === '1' || t === 'tabby_kitten') return 'tabby_kitten';
  if (t === '2' || t === 'baby_dragon') return 'baby_dragon';
  return 'golden_terrier';
}

export function mapUserPetRowToOwnedPet(
  row: DbUserPetRow,
  ownerUsername: string
): OwnedPet {
  return {
    id: `pet-${row.id}`,
    numericId: row.id,
    species: normalizePetSpecies(row.type),
    name: row.name,
    owner: ownerUsername,
    roomId: String(row.room_id || 1),
    x: Number(row.x) || 4,
    y: Number(row.y) || 5,
    dir: 0,
    hunger: Number(row.nutrition) || 100,
    happiness: Number(row.happiness) || 100,
    anim: 'stand',
  };
}

export function mapCmsNewsRowToNewsArticle(row: DbCmsNewsRow): NewsArticle {
  const palette: NewsArticle['bannerPalette'] =
    row.image === 'crimson' || row.image === 'news_promo_crimson'
      ? 'crimson'
      : row.image === 'teal' || row.image === 'news_promo_teal'
      ? 'teal'
      : 'gold';
  const rawDate = row.published ? String(row.published).slice(0, 10) : '2026-11-16';
  const longText = row.longstory || row.shortstory || '';
  const paragraphs = longText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    id: `news-${row.id}`,
    numericId: row.id,
    title: row.title,
    date: rawDate,
    tag: row.author ? `By ${row.author}` : 'Hotel News',
    author: row.author ?? 'Hotel Management',
    summary: row.shortstory || row.title,
    body: paragraphs.length > 0 ? paragraphs : [row.shortstory || row.title],
    bannerPalette: palette,
  };
}

export function mapVoucherRow(row: DbVoucherRow): VoucherDef {
  return {
    id: row.id,
    code: row.code.trim().toUpperCase(),
    credits: Number(row.credits) || 0,
    duckets: Number(row.duckets) || 0,
    hcDays: Number(row.hc_days) || 0,
    badgeId: (row.badge_id ?? '').trim(),
    uses: Number(row.uses) || 0,
  };
}

export function mapUserRowToUserAccount(params: {
  row: DbUserRow;
  bans: BanRecord[];
  itemRows: DbItemRow[];
  badgeRows: DbUserBadgeRow[];
  petRows: DbUserPetRow[];
  friendshipRows: DbFriendshipRow[];
  defaultRoomId?: string;
}): UserAccount {
  const { row, bans, itemRows, badgeRows, petRows, friendshipRows, defaultRoomId = '1' } = params;
  const rank = clampRank(row.rank);
  const role = rank >= 4 ? 'admin' : 'player';
  const extras = row.look?._pixlExtras ?? {};
  const look = sanitizeUserLook(row.look, row.username);

  const activeBan = bans.find(
    (b) => b.value.toLowerCase() === row.username.toLowerCase()
  );

  const { inventory, pendingEngravings } = groupInventoryFromItemRows(itemRows, row.id);

  // Badges from user_badges + automatic rank/HC starter badges
  const badgeIds = new Set<string>(['badge_checkin']);
  if ((row.hc_days ?? 0) > 0) badgeIds.add('badge_hc');
  if (rank >= 2) badgeIds.add('badge_vip');
  if (rank >= 4) badgeIds.add('badge_mod');
  if (rank >= 5) badgeIds.add('badge_admin');

  for (const bRow of badgeRows) {
    if (bRow.user_id !== row.id) continue;
    const custom = mapUserBadgeRowToCustomBadge(bRow);
    if (custom) {
      badgeIds.add(custom.id);
    } else {
      const mapped = mapBadgeCodeToCatalogId(bRow.badge_id);
      if (mapped) badgeIds.add(mapped);
    }
  }

  // Friendships from messenger_friendships -> mapped to directory `acc-${otherId}`
  const friendIdSet = new Set<string>(
    Array.isArray(extras.npcFriendIds) ? extras.npcFriendIds : ['npc-marco', 'npc-pixie']
  );
  for (const fr of friendshipRows) {
    if (fr.user_one_id === row.id) friendIdSet.add(`acc-${fr.user_two_id}`);
    else if (fr.user_two_id === row.id) friendIdSet.add(`acc-${fr.user_one_id}`);
  }

  const pets = petRows
    .filter((p) => p.user_id === row.id)
    .map((p) => mapUserPetRowToOwnedPet(p, row.username));

  const displayId = `#${row.id}`;
  const createdAt = row.account_created
    ? String(row.account_created).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const lastSeen = row.online
    ? 'Online now'
    : row.last_online
    ? String(row.last_online).slice(0, 10)
    : 'Recently';

  const unlockedList = Array.from(badgeIds);
  const storedEquipped = Array.isArray(extras.equippedBadges)
    ? extras.equippedBadges.filter((id) => unlockedList.includes(id)).slice(0, 5)
    : [];
  const primaryEquipped =
    storedEquipped[0] ??
    (extras.equippedBadgeId && unlockedList.includes(extras.equippedBadgeId)
      ? extras.equippedBadgeId
      : unlockedList[0] ?? 'badge_checkin');
  const equippedBadges =
    storedEquipped.length > 0 ? storedEquipped : unlockedList.slice(0, 5);

  return {
    id: String(row.id),
    numericId: row.id,
    displayId,
    username: row.username,
    password: row.password,
    mail: row.mail ?? `${row.username.toLowerCase()}@pixlhotel.ch`,
    gender: row.gender === 'F' ? 'F' : 'M',
    rank,
    role,
    banned: Boolean(activeBan),
    banReason: activeBan?.reason,
    online: Boolean(row.online) && !activeBan,
    createdAt,
    lastSeen,
    playerState: {
      numericId: row.id,
      username: row.username,
      rank,
      role,
      motto: row.motto || 'Living the retro pixel dream!',
      credits: typeof row.credits === 'number' ? row.credits : 250,
      duckets: typeof row.duckets === 'number' ? row.duckets : 150,
      hcDays: typeof row.hc_days === 'number' ? row.hc_days : 0,
      look: {
        ...look,
        gender: row.gender === 'F' ? 'F' : look.gender ?? 'M',
      },
      inventory,
      redeemedVouchers: Array.isArray(extras.redeemedVouchers)
        ? extras.redeemedVouchers
        : [],
      unlockedBadges: unlockedList,
      equippedBadgeId: primaryEquipped,
      equippedBadges,
      friendIds: Array.from(friendIdSet),
      incomingFriendRequests: Array.isArray(extras.incomingFriendRequests)
        ? extras.incomingFriendRequests
        : [],
      outgoingFriendRequests: Array.isArray(extras.outgoingFriendRequests)
        ? extras.outgoingFriendRequests
        : [],
      respectCount: typeof extras.respectCount === 'number' ? extras.respectCount : 0,
      currentRoomId: extras.currentRoomId || defaultRoomId,
      pets,
      pendingEngravings,
    },
  };
}

export function mapAccountToUserDbUpdate(account: UserAccount) {
  const { playerState } = account;
  const npcFriendIds = playerState.friendIds.filter((fid) => !fid.startsWith('acc-'));
  const equippedBadges =
    Array.isArray(playerState.equippedBadges) && playerState.equippedBadges.length > 0
      ? playerState.equippedBadges.slice(0, 5)
      : [playerState.equippedBadgeId || 'badge_checkin'];
  const resolvedGender: 'M' | 'F' =
    playerState.look.gender === 'F' || account.gender === 'F' ? 'F' : 'M';
  return {
    motto: playerState.motto,
    gender: resolvedGender,
    rank: account.rank,
    credits: playerState.credits,
    duckets: playerState.duckets,
    hc_days: playerState.hcDays,
    online: account.online,
    last_online: new Date().toISOString(),
    look: {
      ...playerState.look,
      gender: resolvedGender,
      _pixlExtras: {
        redeemedVouchers: playerState.redeemedVouchers,
        equippedBadgeId: equippedBadges[0] ?? playerState.equippedBadgeId,
        equippedBadges,
        currentRoomId: playerState.currentRoomId,
        npcFriendIds,
        respectCount: playerState.respectCount ?? 0,
        incomingFriendRequests: playerState.incomingFriendRequests ?? [],
        outgoingFriendRequests: playerState.outgoingFriendRequests ?? [],
      },
    },
  };
}

// ============================================================================
// Live Supabase Relational Queries & Mutations
// ============================================================================

export function mapCatalogPageRow(row: DbCatalogPageRow): CatalogPageRow {
  return {
    id: row.id,
    parent_id: row.parent_id ?? -1,
    caption: row.caption,
    icon_image: row.icon_image ?? 1,
    visible: row.visible ?? true,
    min_rank: row.min_rank ?? 1,
    order_num: row.order_num ?? row.id,
  };
}

export function mapCatalogItemRow(row: DbCatalogItemRow): CatalogItemRow {
  return {
    id: row.id,
    page_id: row.page_id,
    catalog_name: row.catalog_name,
    cost_credits: Number(row.cost_credits) || 0,
    cost_duckets: Number(row.cost_duckets) || 0,
    amount: Number(row.amount) || 1,
    item_type: row.item_type,
  };
}

async function ensurePublicRoomsAndItemsInSupabase(
  existingRoomRows: DbRoomRow[],
  existingItemRows: DbItemRow[]
): Promise<{ roomRows: DbRoomRow[]; itemRows: DbItemRow[] }> {
  let roomRows = [...existingRoomRows];
  let itemRows = [...existingItemRows];

  try {
    const publicTemplates = INITIAL_ROOMS.filter((r) => r.category === 'public');
    const missingRoomPayloads: Omit<DbRoomRow, 'id'>[] = [];

    for (const tpl of publicTemplates) {
      const matched = roomRows.find((r) => matchPublicTemplateForRow(r)?.id === tpl.id);
      if (!matched) {
        missingRoomPayloads.push({
          caption: tpl.name,
          owner: tpl.owner,
          description: tpl.description,
          model_name: tpl.modelName || 'model_a',
          state: 'open',
          users_now: 0,
          users_max: tpl.usersMax ?? 25,
          category: tpl.categoryNum ?? 1,
        });
      } else {
        // Force-update existing public room metadata / model_name so updated 2008 heightmaps apply live
        const targetModel = tpl.modelName || 'model_a';
        if (
          matched.caption !== tpl.name ||
          matched.description !== tpl.description ||
          matched.model_name !== targetModel ||
          matched.owner !== tpl.owner ||
          (matched.users_now ?? 0) > 0
        ) {
          const { data: updatedRow } = await supabase
            .from('rooms')
            .update({
              caption: tpl.name,
              owner: tpl.owner,
              description: tpl.description,
              model_name: targetModel,
              users_now: 0,
            })
            .eq('id', matched.id)
            .select('*')
            .single();
          if (updatedRow) {
            roomRows = roomRows.map((r) =>
              r.id === matched.id ? (updatedRow as DbRoomRow) : r
            );
          }
        }
      }
    }

    if (missingRoomPayloads.length > 0) {
      const { data: insertedRooms } = await supabase
        .from('rooms')
        .insert(missingRoomPayloads)
        .select('*');
      if (insertedRooms && insertedRooms.length > 0) {
        roomRows = [...roomRows, ...(insertedRooms as DbRoomRow[])];
      }
    }

    // Force-sync public template furniture (user_id === 1) if missing or layout signature changed
    const itemsToInsert: Omit<DbItemRow, 'id'>[] = [];
    for (const tpl of publicTemplates) {
      const matchedRoom = roomRows.find((r) => matchPublicTemplateForRow(r)?.id === tpl.id);
      if (!matchedRoom) continue;

      const adminRoomItems = itemRows.filter(
        (it) => it.room_id === matchedRoom.id && it.user_id === 1
      );
      const existingSig = adminRoomItems
        .map((it) => `${it.x},${it.y},${it.item_type}`)
        .sort()
        .join('|');
      const expectedSig = tpl.initialFurni
        .map((f) => `${f.x},${f.y},${f.furniId}`)
        .sort()
        .join('|');

      if (existingSig !== expectedSig) {
        if (adminRoomItems.length > 0) {
          await supabase
            .from('items')
            .delete()
            .eq('room_id', matchedRoom.id)
            .eq('user_id', 1);
          itemRows = itemRows.filter(
            (it) => !(it.room_id === matchedRoom.id && it.user_id === 1)
          );
        }
        for (const f of tpl.initialFurni) {
          itemsToInsert.push({
            user_id: 1,
            room_id: matchedRoom.id,
            item_type: f.furniId,
            extra_data: serializeItemExtraData(f.state, f.customData),
            x: f.x,
            y: f.y,
            z: 0,
            rot: f.dir,
          });
        }
      }
    }

    // Give User #1 starter inventory items only if entire items table was previously empty
    if (existingItemRows.length === 0) {
      const starterInv: { item_type: string; qty: number }[] = [
        { item_type: 'throne', qty: 2 },
        { item_type: 'fire_dragon', qty: 2 },
        { item_type: 'hc_sofa', qty: 3 },
        { item_type: 'holo_dice', qty: 2 },
      ];
      for (const st of starterInv) {
        for (let i = 0; i < st.qty; i++) {
          itemsToInsert.push({
            user_id: 1,
            room_id: 0,
            item_type: st.item_type,
            extra_data: '0',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
          });
        }
      }
    }

    if (itemsToInsert.length > 0) {
      const { data: insertedItems, error } = await supabase
        .from('items')
        .insert(itemsToInsert)
        .select('*');
      if (!error && insertedItems) {
        itemRows = [...itemRows, ...(insertedItems as DbItemRow[])];
      }
    }
  } catch (err) {
    console.warn('[Supabase sync] ensurePublicRoomsAndItems error:', err);
  }

  return { roomRows, itemRows };
}

async function ensureCatalogSeededInSupabase(
  existingPages: DbCatalogPageRow[],
  existingItems: DbCatalogItemRow[]
): Promise<{ catalogPages: CatalogPageRow[]; catalogItems: CatalogItemRow[] }> {
  let pageRows = [...existingPages];
  let itemRows = [...existingItems];

  try {
    // Ensure all 7 canonical sections exist in `catalog_pages`
    const missingPages = CATALOG_PAGES_SEED.filter(
      (seed) => !pageRows.some((p) => p.caption.trim().toLowerCase() === seed.caption.toLowerCase())
    );

    if (missingPages.length > 0) {
      let maxPageId = pageRows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      const usedPageIds = new Set(pageRows.map((r) => r.id));
      const payloads = missingPages.map((p) => {
        const assignedId = !usedPageIds.has(p.id) ? p.id : ++maxPageId;
        usedPageIds.add(assignedId);
        return {
          id: assignedId,
          parent_id: p.parent_id,
          caption: p.caption,
          icon_image: p.icon_image,
          visible: p.visible,
          min_rank: p.min_rank,
          order_num: p.order_num,
        };
      });
      const { data: insertedPages, error } = await supabase
        .from('catalog_pages')
        .insert(payloads)
        .select('*');
      if (!error && insertedPages) {
        pageRows = [...pageRows, ...(insertedPages as DbCatalogPageRow[])];
      } else if (error) {
        console.warn('[Supabase catalog_pages] seed error:', error.message);
      }
    }

    // Build seedId -> real PostgreSQL page.id map via caption
    const seedToDbPageId = new Map<number, number>();
    for (const seedPage of CATALOG_PAGES_SEED) {
      const realPage = pageRows.find(
        (p) => p.caption.trim().toLowerCase() === seedPage.caption.toLowerCase()
      );
      if (realPage) {
        seedToDbPageId.set(seedPage.id, realPage.id);
      }
    }

    // Seed missing items from CATALOG_ITEMS_SEED whenever < 100 items exist in the database
    const existingTypes = new Set(itemRows.map((it) => it.item_type));
    const missingItems = CATALOG_ITEMS_SEED.filter(
      (seed) => (itemRows.length < 100 || !existingTypes.has(seed.item_type)) && !existingTypes.has(seed.item_type)
    ).map((seed) => ({
      page_id: seedToDbPageId.get(seed.page_id) ?? pageRows[0]?.id ?? seed.page_id,
      catalog_name: seed.catalog_name,
      cost_credits: seed.cost_credits,
      cost_duckets: seed.cost_duckets,
      amount: seed.amount,
      item_type: seed.item_type,
    }));

    if (missingItems.length > 0) {
      const { data: insertedItems, error } = await supabase
        .from('catalog_items')
        .insert(missingItems)
        .select('*');
      if (!error && insertedItems) {
        itemRows = [...itemRows, ...(insertedItems as DbCatalogItemRow[])];
      } else if (error) {
        console.warn('[Supabase catalog_items] seed error:', error.message);
      }
    }
  } catch (err) {
    console.warn('[Supabase catalog] seed error:', err);
  }

  const mappedPages = (pageRows.length >= 10 ? pageRows.map(mapCatalogPageRow) : [...CATALOG_PAGES_SEED]).sort(
    (a, b) => a.order_num - b.order_num || a.id - b.id
  );
  const mappedItems = itemRows.length >= 100 ? itemRows.map(mapCatalogItemRow) : [...CATALOG_ITEMS_SEED];

  return { catalogPages: mappedPages, catalogItems: mappedItems };
}

let hasAttemptedInitialSeed = false;

export async function fetchAllRetroStateFromSupabase(): Promise<RetroDatabaseSnapshot | null> {
  try {
    const [
      ranksRes,
      usersRes,
      bansRes,
      roomsRes,
      itemsRes,
      badgesRes,
      petsRes,
      friendsRes,
      newsRes,
      vouchersRes,
      catalogPagesRes,
      catalogItemsRes,
    ] = await Promise.all([
      supabase.from('ranks').select('*').order('id', { ascending: true }),
      supabase.from('users').select('*').order('id', { ascending: true }),
      supabase.from('bans').select('*').order('id', { ascending: false }),
      supabase.from('rooms').select('*').order('id', { ascending: true }),
      supabase.from('items').select('*').order('id', { ascending: true }),
      supabase.from('user_badges').select('*').order('id', { ascending: true }),
      supabase.from('user_pets').select('*').order('id', { ascending: true }),
      supabase.from('messenger_friendships').select('*').order('id', { ascending: true }),
      supabase.from('cms_news').select('*').order('id', { ascending: false }),
      supabase.from('vouchers').select('*').order('id', { ascending: true }),
      supabase.from('catalog_pages').select('*').order('order_num', { ascending: true }),
      supabase.from('catalog_items').select('*').order('id', { ascending: true }),
    ]);

    if (usersRes.error || roomsRes.error || ranksRes.error) {
      console.warn(
        '[Supabase retro] core fetch error:',
        usersRes.error?.message || roomsRes.error?.message || ranksRes.error?.message
      );
      return null;
    }

    const ranks = ((ranksRes.data ?? []) as DbRankRow[]).map(mapRankRow);
    const bans = ((bansRes.data ?? []) as DbBanRow[]).map(mapBanRow);
    let roomRows = (roomsRes.data ?? []) as DbRoomRow[];
    let itemRows = (itemsRes.data ?? []) as DbItemRow[];
    const dbCatalogPages = (catalogPagesRes.data ?? []) as DbCatalogPageRow[];
    const dbCatalogItems = (catalogItemsRes.data ?? []) as DbCatalogItemRow[];

    if (!hasAttemptedInitialSeed) {
      hasAttemptedInitialSeed = true;
      const ensuredRooms = await ensurePublicRoomsAndItemsInSupabase(roomRows, itemRows);
      roomRows = ensuredRooms.roomRows;
      itemRows = ensuredRooms.itemRows;
    }

    const ensuredCatalog = await ensureCatalogSeededInSupabase(dbCatalogPages, dbCatalogItems);
    const rooms = roomRows.map(mapRoomRowToRoomDef);

    const badgeRows = (badgesRes.data ?? []) as DbUserBadgeRow[];
    const petRows = (petsRes.data ?? []) as DbUserPetRow[];
    const friendshipRows = (friendsRes.data ?? []) as DbFriendshipRow[];
    const userRows = (usersRes.data ?? []) as DbUserRow[];

    const ownerNameById = new Map<number, string>();
    for (const u of userRows) {
      ownerNameById.set(u.id, u.username);
    }

    const lidoOrWelcome =
      rooms.find((r) => r.modelName === 'model_a') ??
      rooms.find((r) => r.modelName === 'model_lido') ??
      rooms[0];
    const defaultRoomId = lidoOrWelcome?.id ?? '1';

    const accounts = userRows.map((row) =>
      mapUserRowToUserAccount({
        row,
        bans,
        itemRows,
        badgeRows,
        petRows,
        friendshipRows,
        defaultRoomId,
      })
    );

    const customBadges: CustomBadgeDef[] = [];
    const seenCustomIds = new Set<string>();
    for (const br of badgeRows) {
      const cb = mapUserBadgeRowToCustomBadge(br);
      if (cb && !seenCustomIds.has(cb.id)) {
        seenCustomIds.add(cb.id);
        customBadges.push(cb);
      }
    }

    const roomFurniMap = groupPlacedItemsByRoom(itemRows, rooms, ownerNameById);
    const news = ((newsRes.data ?? []) as DbCmsNewsRow[]).map(mapCmsNewsRowToNewsArticle);
    const vouchers = ((vouchersRes.data ?? []) as DbVoucherRow[]).map(mapVoucherRow);

    return {
      ranks,
      accounts,
      bans,
      rooms,
      allItems: itemRows,
      roomFurniMap,
      customBadges,
      news,
      vouchers,
      catalogPages: ensuredCatalog.catalogPages,
      catalogItems: ensuredCatalog.catalogItems,
    };
  } catch (err) {
    console.warn('[Supabase retro] fetch error:', err);
    return null;
  }
}

export async function registerUserInSupabase(params: {
  username: string;
  password: string;
  motto: string;
  look: LookConfig;
  mail?: string;
  gender?: 'M' | 'F';
  rank?: AccountRank;
  credits?: number;
  duckets?: number;
  hcDays?: number;
}): Promise<{ ok: boolean; user?: DbUserRow; message?: string }> {
  try {
    const resolvedGender: 'M' | 'F' =
      params.gender === 'F' || params.look.gender === 'F' ? 'F' : 'M';
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: params.username,
        password: params.password,
        mail: params.mail ?? `${params.username.toLowerCase()}@pixlhotel.ch`,
        motto: params.motto || 'New guest at PIXL Hotel!',
        look: {
          ...params.look,
          gender: resolvedGender,
        },
        gender: resolvedGender,
        rank: params.rank ?? 1,
        credits: params.credits ?? 250,
        duckets: params.duckets ?? 150,
        hc_days: params.hcDays ?? 3,
        online: true,
      })
      .select('*')
      .single();

    if (error || !data) {
      return { ok: false, message: error?.message || 'Could not register user in Supabase.' };
    }

    const newUser = data as DbUserRow;

    // Seed starter inventory items (room_id = 0) & welcome badge in relational tables
    await Promise.all([
      supabase.from('items').insert([
        { user_id: newUser.id, room_id: 0, item_type: 'hc_sofa', extra_data: '0', x: 0, y: 0, z: 0, rot: 0 },
        { user_id: newUser.id, room_id: 0, item_type: 'palm_tree', extra_data: '0', x: 0, y: 0, z: 0, rot: 0 },
      ]),
      supabase.from('user_badges').insert({
        user_id: newUser.id,
        badge_id: 'HTL',
        badge_slot: 1,
        pixel_data: null,
      }),
    ]);

    return { ok: true, user: newUser };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export async function updateAccountInSupabase(account: UserAccount): Promise<boolean> {
  try {
    const payload = mapAccountToUserDbUpdate(account);
    const q = supabase.from('users').update(payload);
    const { error } = account.numericId
      ? await q.eq('id', account.numericId)
      : await q.eq('username', account.username);
    if (error) {
      console.warn('[Supabase users] update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase users] update unexpected:', err);
    return false;
  }
}

export async function insertBanInSupabase(params: {
  username: string;
  reason: string;
  addedBy: string;
}): Promise<boolean> {
  try {
    // Avoid duplicate bans for same username
    await supabase.from('bans').delete().ilike('value', params.username);
    const { error } = await supabase.from('bans').insert({
      bantype: 'user',
      value: params.username,
      reason: params.reason || 'Suspended by Hotel Management.',
      expire: '0',
      added_by: params.addedBy,
    });
    if (error) {
      console.warn('[Supabase bans] insert error:', error.message);
      return false;
    }
    await supabase.from('users').update({ online: false }).ilike('username', params.username);
    return true;
  } catch (err) {
    console.warn('[Supabase bans] insert unexpected:', err);
    return false;
  }
}

export async function deleteBanInSupabase(username: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('bans').delete().ilike('value', username);
    if (error) {
      console.warn('[Supabase bans] delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase bans] delete unexpected:', err);
    return false;
  }
}

export async function createRoomInSupabase(params: {
  caption: string;
  owner: string;
  description: string;
  modelName: string;
  category?: number;
}): Promise<RoomDef | null> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        caption: params.caption.trim().slice(0, 48),
        owner: params.owner,
        description: params.description.trim().slice(0, 120) || 'Custom private suite!',
        model_name: params.modelName || 'model_c',
        state: 'open',
        users_now: 0,
        users_max: 25,
        category: params.category ?? 3,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.warn('[Supabase rooms] create error:', error?.message);
      return null;
    }
    return mapRoomRowToRoomDef(data as DbRoomRow);
  } catch (err) {
    console.warn('[Supabase rooms] create unexpected:', err);
    return null;
  }
}

export async function insertCatalogueItemsInSupabase(params: {
  userId: number;
  furniId: string;
  quantity: number;
  extraData: string;
}): Promise<DbItemRow[]> {
  try {
    const rows = Array.from({ length: Math.max(1, params.quantity) }, () => ({
      user_id: params.userId,
      room_id: 0,
      item_type: params.furniId,
      extra_data: params.extraData,
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }));
    const { data, error } = await supabase.from('items').insert(rows).select('*');
    if (error || !data) {
      console.warn('[Supabase items] buy insert error:', error?.message);
      return [];
    }
    return data as DbItemRow[];
  } catch (err) {
    console.warn('[Supabase items] buy unexpected:', err);
    return [];
  }
}

export async function placeItemInSupabase(params: {
  itemId: number;
  roomId: number;
  x: number;
  y: number;
  z?: number;
  rot: number;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('items')
      .update({
        room_id: params.roomId,
        x: Math.round(params.x),
        y: Math.round(params.y),
        z: Number(params.z ?? 0),
        rot: Number(params.rot) || 0,
      })
      .eq('id', params.itemId);
    if (error) {
      console.warn('[Supabase items] place error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase items] place unexpected:', err);
    return false;
  }
}

export async function moveItemInSupabase(params: {
  itemId: number;
  x: number;
  y: number;
  z: number;
  rot?: number;
}): Promise<boolean> {
  try {
    const patch: Record<string, unknown> = {
      x: Math.round(params.x),
      y: Math.round(params.y),
      z: Number(params.z) || 0,
    };
    if (typeof params.rot === 'number') patch.rot = params.rot;
    const { error } = await supabase.from('items').update(patch).eq('id', params.itemId);
    if (error) {
      console.warn('[Supabase items] move error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase items] move unexpected:', err);
    return false;
  }
}

export async function updateRoomSettingsInSupabase(params: {
  roomId: number;
  caption: string;
  description: string;
  usersMax: number;
  state: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({
        caption: params.caption.trim().slice(0, 48),
        description: params.description.trim().slice(0, 140),
        users_max: Math.max(5, Math.min(100, Math.round(params.usersMax))),
        state: params.state,
      })
      .eq('id', params.roomId);
    if (error) {
      console.warn('[Supabase rooms] settings update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase rooms] settings update unexpected:', err);
    return false;
  }
}

export async function updateItemInSupabase(params: {
  itemId: number;
  rot?: number;
  extraData?: string;
}): Promise<boolean> {
  try {
    const patch: Record<string, unknown> = {};
    if (typeof params.rot === 'number') patch.rot = params.rot;
    if (typeof params.extraData === 'string') patch.extra_data = params.extraData;
    const { error } = await supabase.from('items').update(patch).eq('id', params.itemId);
    if (error) {
      console.warn('[Supabase items] update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase items] update unexpected:', err);
    return false;
  }
}

export async function pickupItemInSupabase(itemId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('items')
      .update({ room_id: 0, x: 0, y: 0, rot: 0 })
      .eq('id', itemId);
    if (error) {
      console.warn('[Supabase items] pickup error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase items] pickup unexpected:', err);
    return false;
  }
}

export async function pickupAllRoomItemsInSupabase(roomId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('items')
      .update({ room_id: 0, x: 0, y: 0, rot: 0 })
      .eq('room_id', roomId);
    if (error) {
      console.warn('[Supabase items] pickall error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase items] pickall unexpected:', err);
    return false;
  }
}

export async function transferItemsOwnershipInSupabase(
  itemIds: number[],
  newUserId: number | null
): Promise<boolean> {
  if (itemIds.length === 0) return true;
  try {
    const query =
      typeof newUserId === 'number' && newUserId > 0
        ? supabase
            .from('items')
            .update({ user_id: newUserId, room_id: 0, x: 0, y: 0, rot: 0 })
            .in('id', itemIds)
        : supabase.from('items').delete().in('id', itemIds);
    const { error } = await query;
    if (error) {
      console.warn('[Supabase items] transfer error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase items] transfer unexpected:', err);
    return false;
  }
}

export async function insertUserBadgeInSupabase(params: {
  userId: number;
  badgeCode: string;
  badgeSlot?: number;
  pixelData?: CustomBadgeDef | null;
}): Promise<boolean> {
  try {
    const resolvedCode = mapCatalogIdToBadgeCode(params.badgeCode);
    const { error } = await supabase.from('user_badges').insert({
      user_id: params.userId,
      badge_id: resolvedCode,
      badge_slot: params.badgeSlot ?? 1,
      pixel_data: params.pixelData ? JSON.stringify(params.pixelData) : null,
    });
    if (error) {
      console.warn('[Supabase user_badges] insert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase user_badges] insert unexpected:', err);
    return false;
  }
}

export async function awardBadgeInSupabase(
  userId: number,
  badgeIdOrCode: string
): Promise<boolean> {
  return insertUserBadgeInSupabase({
    userId,
    badgeCode: mapCatalogIdToBadgeCode(badgeIdOrCode),
    badgeSlot: 1,
  });
}

export async function insertUserPetInSupabase(params: {
  userId: number;
  roomId: number;
  name: string;
  species: PetSpecies;
  color: string;
  x: number;
  y: number;
}): Promise<DbUserPetRow | null> {
  try {
    const { data, error } = await supabase
      .from('user_pets')
      .insert({
        user_id: params.userId,
        room_id: params.roomId,
        name: params.name,
        type: params.species,
        color: params.color,
        nutrition: 100,
        happiness: 100,
        x: Math.round(params.x),
        y: Math.round(params.y),
      })
      .select('*')
      .single();
    if (error || !data) {
      console.warn('[Supabase user_pets] insert error:', error?.message);
      return null;
    }
    return data as DbUserPetRow;
  } catch (err) {
    console.warn('[Supabase user_pets] insert unexpected:', err);
    return null;
  }
}

export async function updateUserPetInSupabase(
  petNumericId: number,
  patch: { room_id?: number; nutrition?: number; happiness?: number; x?: number; y?: number }
): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_pets').update(patch).eq('id', petNumericId);
    if (error) {
      console.warn('[Supabase user_pets] update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase user_pets] update unexpected:', err);
    return false;
  }
}

export async function toggleFriendshipInSupabase(
  userOneId: number,
  userTwoId: number,
  shouldAdd: boolean
): Promise<boolean> {
  try {
    if (shouldAdd) {
      const { error } = await supabase.from('messenger_friendships').insert({
        user_one_id: userOneId,
        user_two_id: userTwoId,
      });
      if (error) {
        console.warn('[Supabase messenger_friendships] add error:', error.message);
        return false;
      }
      return true;
    } else {
      const { error } = await supabase
        .from('messenger_friendships')
        .delete()
        .or(
          `and(user_one_id.eq.${userOneId},user_two_id.eq.${userTwoId}),and(user_one_id.eq.${userTwoId},user_two_id.eq.${userOneId})`
        );
      if (error) {
        console.warn('[Supabase messenger_friendships] remove error:', error.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.warn('[Supabase messenger_friendships] toggle unexpected:', err);
    return false;
  }
}

export async function insertCmsNewsInSupabase(params: {
  title: string;
  shortstory: string;
  longstory: string;
  image: string;
  author: string;
}): Promise<NewsArticle | null> {
  try {
    const { data, error } = await supabase
      .from('cms_news')
      .insert({
        title: params.title.trim().slice(0, 90),
        shortstory: params.shortstory.trim().slice(0, 180),
        longstory: params.longstory.trim().slice(0, 2000),
        image: params.image || 'gold',
        author: params.author,
      })
      .select('*')
      .single();
    if (error || !data) {
      console.warn('[Supabase cms_news] insert error:', error?.message);
      return null;
    }
    return mapCmsNewsRowToNewsArticle(data as DbCmsNewsRow);
  } catch (err) {
    console.warn('[Supabase cms_news] insert unexpected:', err);
    return null;
  }
}

export async function decrementVoucherUsesInSupabase(
  voucherId: number,
  currentUses: number
): Promise<boolean> {
  try {
    const nextUses = Math.max(0, currentUses - 1);
    const { error } = await supabase
      .from('vouchers')
      .update({ uses: nextUses })
      .eq('id', voucherId);
    if (error) {
      console.warn('[Supabase vouchers] update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase vouchers] update unexpected:', err);
    return false;
  }
}

// ============================================================================
// Catalogue & Rare Manager CRUD + Hotel-Wide Alert Broadcast
// ============================================================================

export async function upsertCatalogPageInSupabase(params: {
  id?: number;
  caption: string;
  minRank?: number;
  visible?: boolean;
  orderNum?: number;
}): Promise<CatalogPageRow | null> {
  try {
    if (params.id) {
      const { data, error } = await supabase
        .from('catalog_pages')
        .update({
          caption: params.caption.trim(),
          min_rank: params.minRank ?? 1,
          visible: params.visible ?? true,
          order_num: params.orderNum ?? params.id,
        })
        .eq('id', params.id)
        .select('*')
        .single();
      if (error || !data) return null;
      return mapCatalogPageRow(data as DbCatalogPageRow);
    } else {
      const { data: existingIds } = await supabase.from('catalog_pages').select('id');
      const nextId =
        ((existingIds ?? []) as { id: number }[]).reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
      const { data, error } = await supabase
        .from('catalog_pages')
        .insert({
          id: nextId,
          parent_id: -1,
          caption: params.caption.trim(),
          icon_image: 1,
          visible: params.visible ?? true,
          min_rank: params.minRank ?? 1,
          order_num: params.orderNum ?? nextId,
        })
        .select('*')
        .single();
      if (error || !data) return null;
      return mapCatalogPageRow(data as DbCatalogPageRow);
    }
  } catch (err) {
    console.warn('[Supabase catalog_pages] upsert error:', err);
    return null;
  }
}

export async function upsertCatalogItemInSupabase(params: {
  id?: number;
  pageId: number;
  catalogName: string;
  costCredits: number;
  costDuckets: number;
  amount?: number;
  itemType: string;
}): Promise<CatalogItemRow | null> {
  try {
    const payload = {
      page_id: params.pageId,
      catalog_name: params.catalogName.trim(),
      cost_credits: Math.max(0, Math.round(params.costCredits)),
      cost_duckets: Math.max(0, Math.round(params.costDuckets)),
      amount: Math.max(1, Math.round(params.amount ?? 1)),
      item_type: params.itemType.trim(),
    };
    if (params.id) {
      const { data, error } = await supabase
        .from('catalog_items')
        .update(payload)
        .eq('id', params.id)
        .select('*')
        .single();
      if (error || !data) return null;
      return mapCatalogItemRow(data as DbCatalogItemRow);
    } else {
      const { data, error } = await supabase
        .from('catalog_items')
        .insert(payload)
        .select('*')
        .single();
      if (!error && data) {
        return mapCatalogItemRow(data as DbCatalogItemRow);
      }
      // Fallback if catalog_items.id lacks auto-increment sequence
      const { data: existingIds } = await supabase.from('catalog_items').select('id');
      const nextId =
        ((existingIds ?? []) as { id: number }[]).reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
      const retry = await supabase
        .from('catalog_items')
        .insert({ id: nextId, ...payload })
        .select('*')
        .single();
      if (retry.error || !retry.data) return null;
      return mapCatalogItemRow(retry.data as DbCatalogItemRow);
    }
  } catch (err) {
    console.warn('[Supabase catalog_items] upsert error:', err);
    return null;
  }
}

export async function deleteCatalogItemInSupabase(itemId: number): Promise<boolean> {
  try {
    const { error } = await supabase.from('catalog_items').delete().eq('id', itemId);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteRoomInSupabase(roomId: string): Promise<boolean> {
  try {
    const numericRoomId = Number(roomId);
    const dbRoomId = Number.isFinite(numericRoomId) ? numericRoomId : null;

    if (dbRoomId) {
      await supabase.from('items').update({ room_id: 0, x: 0, y: 0, z: 0, rot: 0 }).eq('room_id', dbRoomId);
      const { error: roomErr } = await supabase.from('rooms').delete().eq('id', dbRoomId);
      if (roomErr) {
        console.warn('[Supabase rooms] delete error:', roomErr.message);
        return false;
      }
    } else {
      const { error: roomErr } = await supabase.from('rooms').delete().eq('id', roomId);
      if (roomErr) {
        console.warn('[Supabase rooms] delete error:', roomErr.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase rooms] delete unexpected:', err);
    return false;
  }
}

export async function broadcastHotelAlertViaChannel(
  channel: ReturnType<typeof supabase.channel> | null,
  alert: HotelAlertPayload
): Promise<boolean> {
  if (!channel) return false;
  try {
    await channel.send({
      type: 'broadcast',
      event: 'hotel:alert',
      payload: alert,
    });
    return true;
  } catch {
    return false;
  }
}

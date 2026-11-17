export type CmsTab = 'me' | 'friends' | 'wardrobe' | 'community' | 'staff' | 'shop' | 'housekeeping';

export type AppScreen = 'cms' | 'loading' | 'hotel';

export type Direction = 0 | 1 | 2 | 3; // 0: SE (front-right), 1: SW (front-left), 2: NW (back-left), 3: NE (back-right)

export type AvatarPose = 'stand' | 'walk' | 'sit' | 'wave' | 'dance' | 'lay';

export type HairStyle = 'spiky' | 'bob' | 'quiff' | 'long' | 'mohawk' | 'curls';
export type ShirtStyle = 'tee' | 'hoodie' | 'suit' | 'stripes' | 'tank';
export type ExpressionStyle = 'happy' | 'cool' | 'cheeky' | 'serene';
export type AccessoryStyle = 'none' | 'crown' | 'headphones' | 'sunglasses' | 'cap';

export interface LookConfig {
  gender?: 'M' | 'F';
  skinColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  expression: ExpressionStyle;
  shirtStyle: ShirtStyle;
  shirtColor: string;
  pantsColor: string;
  shoesColor: string;
  accessory: AccessoryStyle;
}

export type FurniCategory = 'seating' | 'rares' | 'tables' | 'lighting' | 'decor' | 'trophies';

export interface TrophyMetadata {
  inscription: string;
  engravedBy: string;
  engravedAt: string;
}

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface StickyNoteData {
  color: StickyNoteColor;
  text: string;
  author: string;
  updatedAt?: string;
}

export type RoomAccessMode = 'open' | 'doorbell' | 'password';

export interface RoomSettingsPayload {
  accessMode: RoomAccessMode;
  password?: string;
  rights: string[];
}

export interface FurniItemDef {
  id: string;
  name: string;
  description: string;
  category: FurniCategory;
  costCredits: number;
  costDuckets: number;
  catalogAmount?: number;
  hcOnly?: boolean;
  walkable: boolean;
  sittable: boolean;
  layable?: boolean;
  stackable?: boolean;
  isSurface?: boolean;
  stackHeight?: number;
  seatHeight?: number;
  width: number;
  depth: number;
  isRare?: boolean;
  isLtd?: boolean;
  catalogSection?: string;
  animated?: boolean;
  engravable?: boolean;
  isStickyNote?: boolean;
}

export interface CatalogPageRow {
  id: number;
  parent_id: number;
  caption: string;
  icon_image: number;
  visible: boolean;
  min_rank: number;
  order_num: number;
}

export interface CatalogItemRow {
  id: number;
  page_id: number;
  catalog_name: string;
  cost_credits: number;
  cost_duckets: number;
  amount: number;
  item_type: string;
}

export interface CatalogEntryView {
  dbId?: number;
  pageId: number;
  furniId: string;
  catalogName: string;
  description: string;
  costCredits: number;
  costDuckets: number;
  amount: number;
  category: FurniCategory;
  isRare?: boolean;
  isLtd?: boolean;
  hcOnly?: boolean;
  engravable?: boolean;
}

export interface HotelAlertPayload {
  id: string;
  title: string;
  message: string;
  sender: string;
  timestamp: string;
}

export interface PlacedFurni {
  uid: string;
  itemId?: number;
  userId?: number;
  dbId?: string;
  owner?: string;
  furniId: string;
  x: number;
  y: number;
  z?: number;
  dir: Direction;
  state: number; // e.g., 0 off, 1 on/active
  customData?: TrophyMetadata;
  stickyNote?: StickyNoteData;
}

export interface InventoryEntry {
  furniId: string;
  quantity: number;
  itemIds?: number[];
}

export type PetSpecies = 'golden_terrier' | 'tabby_kitten' | 'baby_dragon';
export type PetAnim = 'stand' | 'walk' | 'sit' | 'lay' | 'jump' | 'speak';

export interface PetDef {
  species: PetSpecies;
  name: string;
  description: string;
  costCredits: number;
  costDuckets: number;
  reactionLine: string;
}

export interface OwnedPet {
  id: string;
  numericId?: number;
  species: PetSpecies;
  name: string;
  owner: string;
  roomId: string;
  x: number;
  y: number;
  dir: Direction;
  hunger: number;
  happiness: number;
  anim: PetAnim;
}

export interface CustomBadgeDef {
  id: string;
  code: string;
  name: string;
  description: string;
  pixels: (string | null)[]; // 16x16 = 256 hex colors or null
  createdBy: string;
  createdAt: string;
}

export interface TradeSlotItem {
  furniId: string;
  quantity: number;
}

export type BanzaiTeam = 'blue' | 'red' | 'yellow';

export interface BanzaiTileState {
  level: 0 | 1 | 2 | 3;
  team: BanzaiTeam | null;
}

export type RoomFloorTheme =
  | 'lido_deck'
  | 'wood_deck'
  | 'parquet'
  | 'marble'
  | 'rooftop'
  | 'disco'
  | 'park_grass'
  | 'tatami'
  | 'banzai';

export type RoomWallTheme =
  | 'lido_sky'
  | 'rooftop_hotel'
  | 'cream'
  | 'navy'
  | 'brick'
  | 'nightsky'
  | 'neon'
  | 'park_hedge';

export interface RoomDef {
  id: string;
  numericId?: number;
  name: string;
  owner: string;
  description: string;
  category: 'public' | 'private';
  categoryNum?: number;
  modelName?: string;
  state?: string;
  accessMode?: RoomAccessMode;
  accessPassword?: string;
  roomRights?: string[];
  usersMax?: number;
  outdoor?: boolean;
  rooftopHotelFacade?: boolean;
  floorTheme: RoomFloorTheme;
  wallTheme: RoomWallTheme;
  /** Row-major heightmap: 'x' void, 'w' sunken water, '0' flat floor, 'l' pool ladder, 'c' cobble path, '1' main deck, 's' stairs, '2' raised terrace, '3' cliff top, 'b' changing booth, 'd' diving board */
  layout: string[];
  spawn: { x: number; y: number };
  initialFurni: PlacedFurni[];
  baseOccupancy: number;
}

export interface HabboNPC {
  id: string;
  name: string;
  motto: string;
  role: 'friend' | 'staff' | 'guest';
  roomId: string;
  look: LookConfig;
  x: number;
  y: number;
  dir: Direction;
  pose: AvatarPose;
  chatLines: string[];
  badge?: string;
  badges?: string[];
  respectCount?: number;
}

export interface SpeechBubble {
  id: string;
  senderId: string;
  senderName: string;
  look: LookConfig;
  text: string;
  timestamp: number;
  isWhisper?: boolean;
  mode?: 'say' | 'shout' | 'whisper';
  bubbleStyle?: string;
}

export interface NewsArticle {
  id: string;
  numericId?: number;
  title: string;
  date: string;
  tag: string;
  author?: string;
  summary: string;
  body: string[];
  bannerPalette: 'gold' | 'teal' | 'crimson';
}

export interface StaffMember {
  id: string;
  accountId?: string;
  name: string;
  role: string;
  department: 'Hotel Managers' | 'Moderators' | 'Event Team';
  motto: string;
  badgeCode: string;
  badgeLabel: string;
  online: boolean;
  roomId: string;
  look: LookConfig;
  badges?: string[];
}

export interface RareValueItem {
  furniId: string;
  name: string;
  creditsValue: number;
  trend: 'up' | 'down' | 'stable';
  changePct: string;
  edition: string;
}

export type AccountRank = 1 | 2 | 3 | 4 | 5;
export type UserRole = 'admin' | 'player';

export interface BadgeDef {
  id: string;
  code: string;
  name: string;
  description: string;
  unlockHint: string;
  category: 'Starter' | 'Collector' | 'Social' | 'VIP & Staff' | 'Custom';
  palette: {
    bg: string;
    border: string;
    accent: string;
  };
  customPixels?: (string | null)[];
}

export interface RankDef {
  id: AccountRank;
  name: string;
  badgeCode: string;
}

export interface BanRecord {
  id: number;
  bantype: string;
  value: string;
  reason: string;
  expire: string;
  addedBy: string;
  addedDate: string;
}

export interface VoucherDef {
  id: number;
  code: string;
  credits: number;
  duckets: number;
  hcDays: number;
  badgeId: string;
  uses: number;
}

export interface UserAccount {
  id: string;
  numericId?: number;
  displayId?: string;
  username: string;
  password: string;
  mail?: string;
  gender?: 'M' | 'F';
  rank: AccountRank;
  role: UserRole;
  banned: boolean;
  banReason?: string;
  online: boolean;
  createdAt: string;
  lastSeen: string;
  playerState: PlayerState;
}

export interface RemotePlayerState {
  sessionId: string;
  username: string;
  motto: string;
  look: LookConfig;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  dir: Direction;
  pose: AvatarPose;
  danceStyle?: 1 | 2 | 3 | 4;
  activeSign?: string | null;
  carryItem: string;
  moonwalk: boolean;
  swimming?: boolean;
  swimwearColor?: string;
  badge?: string;
  badges: string[];
  rank: AccountRank;
  respectCount?: number;
  updatedAt: number;
}

export interface PlayerState {
  numericId?: number;
  username: string;
  rank: AccountRank;
  role: UserRole;
  motto: string;
  credits: number;
  duckets: number;
  hcDays: number;
  look: LookConfig;
  inventory: InventoryEntry[];
  redeemedVouchers: string[];
  unlockedBadges: string[];
  equippedBadgeId: string;
  equippedBadges?: string[];
  friendIds: string[];
  incomingFriendRequests?: string[];
  outgoingFriendRequests?: string[];
  respectCount?: number;
  currentRoomId: string;
  pets: OwnedPet[];
  pendingEngravings: Record<string, TrophyMetadata[]>;
}

export interface PlayerProfileRecord {
  id: string;
  accountId?: string;
  numericUserId?: number;
  name: string;
  motto: string;
  look: LookConfig;
  badges: string[];
  roleBadge?: string;
  roleLabel: string;
  rank?: AccountRank;
  banned?: boolean;
  online: boolean;
  roomId?: string;
  isStaff?: boolean;
  npcId?: string;
  respectCount?: number;
}

export interface VoucherResult {
  ok: boolean;
  message: string;
  player: PlayerState;
}

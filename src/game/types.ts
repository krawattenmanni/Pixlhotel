export type CmsTab = 'me' | 'friends' | 'wardrobe' | 'community' | 'staff' | 'shop' | 'housekeeping';

export type AppScreen = 'cms' | 'loading' | 'hotel';

export type Direction = 0 | 1 | 2 | 3; // 0: SE (front-right), 1: SW (front-left), 2: NW (back-left), 3: NE (back-right)

export type AvatarPose = 'stand' | 'walk' | 'sit' | 'wave' | 'dance';

export type HairStyle = 'spiky' | 'bob' | 'quiff' | 'long' | 'mohawk' | 'curls';
export type ShirtStyle = 'tee' | 'hoodie' | 'suit' | 'stripes' | 'tank';
export type ExpressionStyle = 'happy' | 'cool' | 'cheeky' | 'serene';
export type AccessoryStyle = 'none' | 'crown' | 'headphones' | 'sunglasses' | 'cap';

export interface LookConfig {
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

export interface FurniItemDef {
  id: string;
  name: string;
  description: string;
  category: FurniCategory;
  costCredits: number;
  costDuckets: number;
  hcOnly?: boolean;
  walkable: boolean;
  sittable: boolean;
  seatHeight?: number;
  width: number;
  depth: number;
  isRare?: boolean;
  animated?: boolean;
  engravable?: boolean;
}

export interface PlacedFurni {
  uid: string;
  furniId: string;
  x: number;
  y: number;
  dir: Direction;
  state: number; // e.g., 0 off, 1 on/active
  customData?: TrophyMetadata;
}

export interface InventoryEntry {
  furniId: string;
  quantity: number;
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

export type RoomFloorTheme = 'parquet' | 'marble' | 'rooftop' | 'tatami' | 'banzai';
export type RoomWallTheme = 'cream' | 'navy' | 'brick' | 'nightsky' | 'neon';

export interface RoomDef {
  id: string;
  name: string;
  owner: string;
  description: string;
  category: 'public' | 'private';
  floorTheme: RoomFloorTheme;
  wallTheme: RoomWallTheme;
  /** Row-major grid of tile characters: 'x' void, '0' walkable floor, '1' raised terrace */
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
  title: string;
  date: string;
  tag: string;
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

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  rank: AccountRank;
  role: UserRole;
  banned: boolean;
  banReason?: string;
  online: boolean;
  createdAt: string;
  lastSeen: string;
  playerState: PlayerState;
}

export interface PlayerState {
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
  friendIds: string[];
  currentRoomId: string;
  pets: OwnedPet[];
  pendingEngravings: Record<string, TrophyMetadata[]>;
}

export interface PlayerProfileRecord {
  id: string;
  accountId?: string;
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
}

export interface VoucherResult {
  ok: boolean;
  message: string;
  player: PlayerState;
}

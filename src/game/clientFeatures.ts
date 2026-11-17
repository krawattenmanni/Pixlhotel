import type { AvatarPose, RoomFloorTheme, RoomWallTheme } from './types';

export type ChatBubbleStyle = 'classic' | 'gold' | 'sky' | 'pink' | 'emerald' | 'dark';
export type ChatDeliveryMode = 'say' | 'shout' | 'whisper';
export type CarryItemId = 'none' | 'cola' | 'coffee' | 'champagne' | 'icecream' | 'carrot' | 'rose';

export interface CarryItemDef {
  id: CarryItemId;
  name: string;
  shortLabel: string;
  color: string;
  accentColor: string;
}

export const CARRY_ITEMS: CarryItemDef[] = [
  { id: 'none', name: 'Empty Hands', shortLabel: 'None', color: '#94a3b8', accentColor: '#cbd5e1' },
  { id: 'cola', name: 'Pixel Cola', shortLabel: 'Cola', color: '#dc2626', accentColor: '#fef08a' },
  { id: 'coffee', name: 'Espresso Cup', shortLabel: 'Coffee', color: '#78350f', accentColor: '#f59e0b' },
  { id: 'champagne', name: 'VIP Bubbly', shortLabel: 'Bubbly', color: '#eab308', accentColor: '#fef9c3' },
  { id: 'icecream', name: 'Vanilla Cone', shortLabel: 'Ice Cream', color: '#f472b6', accentColor: '#fde68a' },
  { id: 'carrot', name: 'Crunchy Carrot', shortLabel: 'Carrot', color: '#f97316', accentColor: '#22c55e' },
  { id: 'rose', name: 'Crimson Rose', shortLabel: 'Rose', color: '#e11d48', accentColor: '#16a34a' },
];

export interface MoodlightConfig {
  enabled: boolean;
  colorHex: string;
  colorName: string;
  intensity: number; // 0.18 to 0.55
  backgroundOnly: boolean;
}

export const MOODLIGHT_PRESETS: { name: string; hex: string }[] = [
  { name: 'Ocean Blue', hex: '#1d4ed8' },
  { name: 'Neon Purple', hex: '#7c3aed' },
  { name: 'Crimson Lounge', hex: '#dc2626' },
  { name: 'Emerald Club', hex: '#059669' },
  { name: 'Sunset Amber', hex: '#d97706' },
  { name: 'Midnight Cyan', hex: '#0891b2' },
];

export const DEFAULT_MOODLIGHT: MoodlightConfig = {
  enabled: false,
  colorHex: '#1d4ed8',
  colorName: 'Ocean Blue',
  intensity: 0.32,
  backgroundOnly: false,
};

export const CHAT_BUBBLE_STYLES: {
  id: ChatBubbleStyle;
  label: string;
  bg: string;
  border: string;
  text: string;
  accent: string;
}[] = [
  {
    id: 'classic',
    label: 'Classic White',
    bg: '#ffffff',
    border: '#1b1922',
    text: '#0f172a',
    accent: '#22c55e',
  },
  {
    id: 'gold',
    label: 'VIP Gold',
    bg: '#fef9c3',
    border: '#a16207',
    text: '#422006',
    accent: '#eab308',
  },
  {
    id: 'sky',
    label: 'Ice Blue',
    bg: '#e0f2fe',
    border: '#0369a1',
    text: '#0c4a6e',
    accent: '#0284c7',
  },
  {
    id: 'pink',
    label: 'Bubblegum',
    bg: '#fce7f3',
    border: '#be185d',
    text: '#831843',
    accent: '#ec4899',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    bg: '#dcfce7',
    border: '#15803d',
    text: '#14532d',
    accent: '#16a34a',
  },
  {
    id: 'dark',
    label: 'Cyber Dark',
    bg: '#0f172a',
    border: '#38bdf8',
    text: '#f8fafc',
    accent: '#38bdf8',
  },
];

export type DanceStyleId = 1 | 2 | 3 | 4;

export const VALID_SIGN_CODES = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'heart',
  'skull',
] as const;

export type ParsedClientCommand =
  | { type: 'pose'; pose: AvatarPose }
  | { type: 'dance'; style: DanceStyleId }
  | { type: 'sign'; sign: string }
  | { type: 'moonwalk' }
  | { type: 'carry'; item: CarryItemId }
  | { type: 'roll'; rolled: number }
  | { type: 'user_chooser' }
  | { type: 'furni_chooser' }
  | { type: 'commands_help' }
  | { type: 'moodlight_toggle' }
  | { type: 'clear_chat' }
  | { type: 'pickall' };

export function parseClientCommand(rawText: string, rng: () => number = Math.random): ParsedClientCommand | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  if (lower === 'o/' || lower === ':wave') {
    return { type: 'pose', pose: 'wave' };
  }
  if (lower === ':sit') {
    return { type: 'pose', pose: 'sit' };
  }
  if (lower === ':lay') {
    return { type: 'pose', pose: 'lay' };
  }
  if (lower === ':stand') {
    return { type: 'pose', pose: 'stand' };
  }
  if (lower === ':dance' || lower === ':habnam' || lower === ':pogo') {
    return { type: 'dance', style: lower === ':pogo' ? 2 : 1 };
  }
  if (lower.startsWith(':dance ')) {
    const arg = Number(lower.slice(7).trim());
    if (arg >= 1 && arg <= 4) {
      return { type: 'dance', style: Math.round(arg) as DanceStyleId };
    }
    return { type: 'dance', style: 1 };
  }
  if (lower.startsWith(':sign ')) {
    const arg = lower.slice(6).trim();
    if ((VALID_SIGN_CODES as readonly string[]).includes(arg)) {
      return { type: 'sign', sign: arg };
    }
    if (arg === 'love') return { type: 'sign', sign: 'heart' };
    if (arg === 'danger' || arg === 'dead') return { type: 'sign', sign: 'skull' };
    return { type: 'sign', sign: '1' };
  }
  if (lower === ':moonwalk') {
    return { type: 'moonwalk' };
  }
  if (lower === ':drop' || lower === ':empty') {
    return { type: 'carry', item: 'none' };
  }
  if (lower === ':drink') {
    return { type: 'carry', item: 'cola' };
  }
  if (lower === ':cola' || lower === ':drink cola') {
    return { type: 'carry', item: 'cola' };
  }
  if (lower === ':coffee' || lower === ':drink coffee') {
    return { type: 'carry', item: 'coffee' };
  }
  if (lower === ':champagne' || lower === ':bubbly') {
    return { type: 'carry', item: 'champagne' };
  }
  if (lower === ':icecream') {
    return { type: 'carry', item: 'icecream' };
  }
  if (lower === ':carrot') {
    return { type: 'carry', item: 'carrot' };
  }
  if (lower === ':rose') {
    return { type: 'carry', item: 'rose' };
  }
  if (lower.startsWith(':drink ')) {
    const arg = lower.slice(7).trim();
    const found = CARRY_ITEMS.find(
      (c) => c.id === arg || c.name.toLowerCase().includes(arg) || c.shortLabel.toLowerCase() === arg
    );
    return { type: 'carry', item: found ? found.id : 'cola' };
  }
  if (lower === ':roll' || lower === ':dice') {
    const rolled = Math.floor(rng() * 6) + 1;
    return { type: 'roll', rolled };
  }
  if (lower === ':chooser') {
    return { type: 'user_chooser' };
  }
  if (lower === ':furni') {
    return { type: 'furni_chooser' };
  }
  if (lower === ':commands' || lower === ':help') {
    return { type: 'commands_help' };
  }
  if (lower === ':moodlight' || lower === ':dimmer') {
    return { type: 'moodlight_toggle' };
  }
  if (lower === ':clear') {
    return { type: 'clear_chat' };
  }
  if (lower === ':pickall') {
    return { type: 'pickall' };
  }

  return null;
}

export function getCarryItemDef(id: CarryItemId): CarryItemDef {
  return CARRY_ITEMS.find((c) => c.id === id) ?? CARRY_ITEMS[0];
}

export const FLOOR_THEME_OPTIONS: { id: RoomFloorTheme; label: string }[] = [
  { id: 'parquet', label: 'Oak Parquet' },
  { id: 'marble', label: 'Royal Marble' },
  { id: 'rooftop', label: 'Terrace Stone' },
  { id: 'tatami', label: 'Zen Tatami' },
  { id: 'banzai', label: 'Neon Arena' },
];

export const WALL_THEME_OPTIONS: { id: RoomWallTheme; label: string }[] = [
  { id: 'cream', label: 'Classic Cream' },
  { id: 'navy', label: 'VIP Navy' },
  { id: 'brick', label: 'Loft Brick' },
  { id: 'nightsky', label: 'Starlight Sky' },
  { id: 'neon', label: 'Cyber Neon' },
];

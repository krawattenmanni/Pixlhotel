import { CLOTHING_PALETTE, HAIR_PALETTE, SKIN_PALETTE } from './data';
import type { AccessoryStyle, ExpressionStyle, HairStyle, ShirtStyle } from './types';

export interface WardrobeStyleOption<T extends string> {
  id: T;
  label: string;
  hcOnly?: boolean;
  genderHint?: 'M' | 'F';
}

export interface WardrobeColorOption {
  name: string;
  hex: string;
  hcOnly?: boolean;
}

export const WARDROBE_HAIR_STYLES: WardrobeStyleOption<HairStyle>[] = [
  { id: 'quiff', label: 'Classic Quiff', genderHint: 'M' },
  { id: 'spiky', label: 'Spiky Gel', genderHint: 'M' },
  { id: 'bob', label: 'Retro Bob', genderHint: 'F' },
  { id: 'long', label: 'Long Flowing', genderHint: 'F' },
  { id: 'mohawk', label: 'Punk Mohawk', hcOnly: true },
  { id: 'curls', label: 'Soft Curls', hcOnly: true },
];

export const WARDROBE_EXPRESSIONS: WardrobeStyleOption<ExpressionStyle>[] = [
  { id: 'happy', label: 'Happy Grin' },
  { id: 'cool', label: 'Cool Focus' },
  { id: 'cheeky', label: 'Cheeky Smile' },
  { id: 'serene', label: 'Chill Calm', hcOnly: true },
];

export const WARDROBE_SHIRT_STYLES: WardrobeStyleOption<ShirtStyle>[] = [
  { id: 'tee', label: 'Classic Tee' },
  { id: 'hoodie', label: 'HC Hoodie' },
  { id: 'suit', label: 'VIP Suit', hcOnly: true },
  { id: 'stripes', label: 'Sailor Stripes' },
  { id: 'tank', label: 'Summer Tank' },
];

export const WARDROBE_ACCESSORIES: WardrobeStyleOption<AccessoryStyle>[] = [
  { id: 'none', label: 'None' },
  { id: 'cap', label: 'Retro Cap' },
  { id: 'sunglasses', label: 'Cool Shades' },
  { id: 'headphones', label: 'DJ Headphones', hcOnly: true },
  { id: 'crown', label: 'Golden Crown', hcOnly: true },
];

const HC_COLOR_HEXES = new Set(['#f59e0b', '#7c3aed', '#0ea5e9', '#ec4899', '#e5e7eb']);

export const WARDROBE_SKIN_COLORS: WardrobeColorOption[] = SKIN_PALETTE.map((c) => ({ ...c }));

export const WARDROBE_HAIR_COLORS: WardrobeColorOption[] = HAIR_PALETTE.map((c) => ({
  ...c,
  hcOnly: HC_COLOR_HEXES.has(c.hex.toLowerCase()),
}));

export const WARDROBE_CLOTHING_COLORS: WardrobeColorOption[] = CLOTHING_PALETTE.map((c) => ({
  ...c,
  hcOnly: HC_COLOR_HEXES.has(c.hex.toLowerCase()),
}));

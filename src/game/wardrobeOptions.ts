import { CLOTHING_PALETTE, HAIR_PALETTE, SKIN_PALETTE } from './data';
import type { AccessoryStyle, ExpressionStyle, HairStyle, LookConfig, ShirtStyle } from './types';

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
  // Women's / Long Styles
  { id: 'long', label: 'Long Wavy Locks', genderHint: 'F' },
  { id: 'ponytail', label: 'High Ponytail', genderHint: 'F' },
  { id: 'pigtails', label: 'Twin Pigtails', genderHint: 'F' },
  { id: 'bob', label: 'Sleek Bob', genderHint: 'F' },
  { id: 'side_fringe', label: 'Side-Swept Fringe', genderHint: 'F' },
  { id: 'curls', label: 'Curly Afro Puff' },
  { id: 'braided_crown', label: 'Braided Crown (PC)', genderHint: 'F', hcOnly: true },
  { id: 'princess_bun', label: 'Princess Bun (PC)', genderHint: 'F', hcOnly: true },
  // Men's / Short Styles
  { id: 'quiff', label: 'Classic Quiff', genderHint: 'M' },
  { id: 'spiky', label: 'Spiky Punk', genderHint: 'M' },
  { id: 'messy', label: 'Messy Fringe', genderHint: 'M' },
  { id: 'buzzcut', label: 'Fade Buzzcut', genderHint: 'M' },
  { id: 'side_part', label: 'Side Part', genderHint: 'M' },
  { id: 'mohawk', label: 'Punk Mohawk (PC)', hcOnly: true },
  { id: 'pompadour', label: 'Retro Pompadour (PC)', genderHint: 'M', hcOnly: true },
];

export const WARDROBE_EXPRESSIONS: WardrobeStyleOption<ExpressionStyle>[] = [
  { id: 'happy', label: 'Happy Grin' },
  { id: 'cool', label: 'Cool Focus' },
  { id: 'cheeky', label: 'Cheeky Smile' },
  { id: 'serene', label: 'Chill Calm (PC)', hcOnly: true },
  { id: 'wink', label: 'Playful Wink' },
  { id: 'surprised', label: 'Surprised O!' },
];

export const WARDROBE_SHIRT_STYLES: WardrobeStyleOption<ShirtStyle>[] = [
  // Women's / Feminine Tops & Dresses
  { id: 'dress', label: 'Cocktail Dress', genderHint: 'F' },
  { id: 'offshoulder', label: 'Off-Shoulder Top', genderHint: 'F' },
  { id: 'crop_cardigan', label: 'Cropped Cardigan', genderHint: 'F' },
  { id: 'halter', label: 'Summer Halter', genderHint: 'F' },
  { id: 'sailor_blouse', label: 'Sailor Ribbon Blouse', genderHint: 'F' },
  { id: 'tank', label: 'Ribbed Tank Top' },
  // Men's / Unisex Tops & Jackets
  { id: 'tee', label: 'Classic Crew Tee' },
  { id: 'hoodie', label: 'PIXL Club Hoodie' },
  { id: 'suit', label: 'PIXL Club Tuxedo (PC)', hcOnly: true },
  { id: 'stripes', label: 'Retro Rugby Stripes' },
  { id: 'varsity', label: 'Varsity Jacket', genderHint: 'M' },
  { id: 'leather_jacket', label: 'Biker Jacket (PC)', hcOnly: true },
  { id: 'track_jacket', label: 'Sport Track Jacket' },
  { id: 'turtleneck', label: 'Cozy Turtleneck' },
];

export const WARDROBE_ACCESSORIES: WardrobeStyleOption<AccessoryStyle>[] = [
  { id: 'none', label: 'None' },
  { id: 'crown', label: 'Gold Royal Crown (PC)', hcOnly: true },
  { id: 'tiara', label: 'Diamond Tiara (PC)', genderHint: 'F', hcOnly: true },
  { id: 'cap', label: 'Snapback Cap' },
  { id: 'beanie', label: 'Winter Beanie' },
  { id: 'beret', label: 'French Beret', genderHint: 'F' },
  { id: 'top_hat', label: 'PIXL Club Top Hat (PC)', hcOnly: true },
  { id: 'devil_horns', label: 'Crimson Devil Horns (PC)', hcOnly: true },
  { id: 'angel_halo', label: 'Glowing Angel Halo (PC)', hcOnly: true },
  { id: 'cat_ears', label: 'Pixel Cat Ears', genderHint: 'F' },
  { id: 'flower_clip', label: 'Hibiscus Hair Flower', genderHint: 'F' },
  { id: 'sunglasses', label: 'Aviator Shades' },
  { id: 'headphones', label: 'DJ Headphones (PC)', hcOnly: true },
  { id: 'gold_chain', label: 'Gold Bling Chain (PC)', hcOnly: true },
  { id: 'scarf', label: 'Cozy Knit Scarf' },
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

export const MALE_STARTER_PRESETS: LookConfig[] = [
  {
    gender: 'M',
    skinColor: '#f5cba7',
    hairStyle: 'quiff',
    hairColor: '#6e3f23',
    expression: 'happy',
    shirtStyle: 'hoodie',
    shirtColor: '#2b7de9',
    pantsColor: '#343a40',
    shoesColor: '#232024',
    accessory: 'none',
  },
  {
    gender: 'M',
    skinColor: '#e0ac69',
    hairStyle: 'spiky',
    hairColor: '#f2c94c',
    expression: 'cool',
    shirtStyle: 'varsity',
    shirtColor: '#c83232',
    pantsColor: '#2b7de9',
    shoesColor: '#f3efe0',
    accessory: 'sunglasses',
  },
  {
    gender: 'M',
    skinColor: '#c68642',
    hairStyle: 'messy',
    hairColor: '#232024',
    expression: 'cheeky',
    shirtStyle: 'stripes',
    shirtColor: '#1e9d54',
    pantsColor: '#343a40',
    shoesColor: '#232024',
    accessory: 'cap',
  },
];

export const FEMALE_STARTER_PRESETS: LookConfig[] = [
  {
    gender: 'F',
    skinColor: '#ffdfc4',
    hairStyle: 'long',
    hairColor: '#6e3f23',
    expression: 'happy',
    shirtStyle: 'dress',
    shirtColor: '#eb6fa8',
    pantsColor: '#c83232',
    shoesColor: '#eb6fa8',
    accessory: 'none',
  },
  {
    gender: 'F',
    skinColor: '#f5cba7',
    hairStyle: 'ponytail',
    hairColor: '#f2c94c',
    expression: 'cheeky',
    shirtStyle: 'offshoulder',
    shirtColor: '#7c3aed',
    pantsColor: '#2b7de9',
    shoesColor: '#f3efe0',
    accessory: 'sunglasses',
  },
  {
    gender: 'F',
    skinColor: '#e0ac69',
    hairStyle: 'pigtails',
    hairColor: '#d9622b',
    expression: 'happy',
    shirtStyle: 'crop_cardigan',
    shirtColor: '#0ea5e9',
    pantsColor: '#343a40',
    shoesColor: '#c83232',
    accessory: 'none',
  },
];

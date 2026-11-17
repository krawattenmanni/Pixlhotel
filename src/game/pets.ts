import type { OwnedPet, PetAnim, PetDef, PetSpecies, PlayerState } from './types';

export const PET_CATALOGUE: PetDef[] = [
  {
    species: 'golden_terrier',
    name: 'Golden Terrier',
    description: 'Loyal honey-gold puppy that wags its tail and responds to chat tricks!',
    costCredits: 60,
    costDuckets: 0,
    reactionLine: '*woof!*',
  },
  {
    species: 'tabby_kitten',
    name: 'Tabby Kitten',
    description: 'Playful striped ginger kitten who loves naps, jumps, and cozy sofas.',
    costCredits: 55,
    costDuckets: 0,
    reactionLine: '*purr~*',
  },
  {
    species: 'baby_dragon',
    name: 'Baby Fire Dragon',
    description: 'Rare emerald-and-crimson hatchling dragon that puffs warm pixel smoke!',
    costCredits: 120,
    costDuckets: 0,
    reactionLine: '*puffs smoke*',
  },
];

export function getPetDef(species: PetSpecies): PetDef {
  return PET_CATALOGUE.find((p) => p.species === species) ?? PET_CATALOGUE[0];
}

export function buyPet(
  player: PlayerState,
  species: PetSpecies,
  rawName: string,
  roomId: string,
  spawnTile = { x: 4, y: 5 }
): { ok: boolean; message: string; pet?: OwnedPet; player: PlayerState } {
  const def = PET_CATALOGUE.find((p) => p.species === species);
  if (!def) {
    return { ok: false, message: 'Pet species not found.', player };
  }

  const cleanName = rawName.trim().slice(0, 18) || def.name;
  if (player.credits < def.costCredits) {
    return {
      ok: false,
      message: `Need ${def.costCredits} Credits to adopt a ${def.name}.`,
      player,
    };
  }
  if (player.duckets < def.costDuckets) {
    return {
      ok: false,
      message: `Need ${def.costDuckets} Duckets to adopt a ${def.name}.`,
      player,
    };
  }

  const newPet: OwnedPet = {
    id: `pet-${species}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    species,
    name: cleanName,
    owner: player.username,
    roomId,
    x: spawnTile.x,
    y: spawnTile.y,
    dir: 0,
    hunger: 85,
    happiness: 90,
    anim: 'stand',
  };

  return {
    ok: true,
    message: `Adopted ${cleanName} the ${def.name}! They joined you in the room.`,
    pet: newPet,
    player: {
      ...player,
      credits: player.credits - def.costCredits,
      duckets: player.duckets - def.costDuckets,
      pets: [...(player.pets ?? []), newPet],
    },
  };
}

export interface PetCommandOutcome {
  anim: PetAnim;
  reaction: string;
  happinessBoost: number;
}

export function parsePetChatCommand(
  chatText: string,
  species: PetSpecies
): PetCommandOutcome | null {
  const normalized = chatText.trim().toLowerCase();
  if (!normalized) return null;

  // Match standalone command words or "petname command"
  const tokens = normalized.split(/\s+/);
  const last = tokens[tokens.length - 1];
  const has = (words: string[]) => words.some((w) => normalized === w || last === w || tokens.includes(w));

  const def = getPetDef(species);

  if (has(['sit', 'sitz'])) {
    return {
      anim: 'sit',
      reaction: def.reactionLine,
      happinessBoost: 4,
    };
  }
  if (has(['lay', 'platz'])) {
    return {
      anim: 'lay',
      reaction: def.reactionLine,
      happinessBoost: 4,
    };
  }
  if (has(['jump', 'spring'])) {
    return {
      anim: 'jump',
      reaction: def.reactionLine,
      happinessBoost: 6,
    };
  }
  if (has(['speak', 'sprich'])) {
    return {
      anim: 'speak',
      reaction: def.reactionLine,
      happinessBoost: 5,
    };
  }
  return null;
}

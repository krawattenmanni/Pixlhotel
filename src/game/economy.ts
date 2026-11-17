import { FURNI_CATALOGUE } from './data';
import type {
  Direction,
  InventoryEntry,
  LookConfig,
  PlacedFurni,
  PlayerState,
  RoomDef,
  TrophyMetadata,
  VoucherResult,
} from './types';

export function redeemVoucher(player: PlayerState, rawCode: string): VoucherResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, message: 'Enter a voucher code first.', player };
  }

  if (player.redeemedVouchers.includes(code)) {
    return { ok: false, message: `Voucher "${code}" was already redeemed on your account.`, player };
  }

  const nextInventory = [...player.inventory];
  const addFurni = (furniId: string, qty: number) => {
    const idx = nextInventory.findIndex((i) => i.furniId === furniId);
    if (idx >= 0) {
      nextInventory[idx] = { ...nextInventory[idx], quantity: nextInventory[idx].quantity + qty };
    } else {
      nextInventory.push({ furniId, quantity: qty });
    }
  };

  if (code === 'PIXL2026' || code === 'PIXLHOTEL') {
    return {
      ok: true,
      message: `Redeemed ${code}: +250 Credits and +100 Duckets added!`,
      player: {
        ...player,
        credits: player.credits + 250,
        duckets: player.duckets + 100,
        redeemedVouchers: [...player.redeemedVouchers, code],
      },
    };
  }

  if (code === 'DAILY') {
    return {
      ok: true,
      message: 'Daily PIXL Check-In claimed: +75 Credits & +50 Duckets!',
      player: {
        ...player,
        credits: player.credits + 75,
        duckets: player.duckets + 50,
        redeemedVouchers: [...player.redeemedVouchers, code],
      },
    };
  }

  if (code === 'FREEHC') {
    return {
      ok: true,
      message: 'Redeemed FREEHC: +14 Days of PIXL Club activated!',
      player: {
        ...player,
        hcDays: player.hcDays + 14,
        redeemedVouchers: [...player.redeemedVouchers, code],
      },
    };
  }

  if (code === 'DRAGON') {
    addFurni('fire_dragon', 1);
    return {
      ok: true,
      message: 'Redeemed DRAGON: Rare Fire Dragon Lamp placed into your Inventory!',
      player: {
        ...player,
        inventory: nextInventory,
        redeemedVouchers: [...player.redeemedVouchers, code],
      },
    };
  }

  if (code === 'DUCKETS') {
    return {
      ok: true,
      message: 'Redeemed DUCKETS: +200 Duckets added to your purse!',
      player: {
        ...player,
        duckets: player.duckets + 200,
        redeemedVouchers: [...player.redeemedVouchers, code],
      },
    };
  }

  return {
    ok: false,
    message: `Unknown voucher "${code}". Try PIXL2026, FREEHC, or DRAGON.`,
    player,
  };
}

export function purchaseHC(player: PlayerState, days = 31, costCredits = 50): VoucherResult {
  if (player.credits < costCredits) {
    return {
      ok: false,
      message: `Not enough Credits! You need ${costCredits} Credits to extend PIXL Club.`,
      player,
    };
  }
  return {
    ok: true,
    message: `PIXL Club extended by ${days} days!`,
    player: {
      ...player,
      credits: player.credits - costCredits,
      hcDays: player.hcDays + days,
    },
  };
}

export function buyCatalogueItem(
  player: PlayerState,
  furniId: string,
  rawQty = 1,
  engravingMessage?: string
): VoucherResult {
  const def = FURNI_CATALOGUE.find((f) => f.id === furniId);
  if (!def) {
    return { ok: false, message: 'Catalogue item not found.', player };
  }
  const quantity = Math.max(1, Math.min(20, Math.floor(rawQty)));
  const totalCredits = def.costCredits * quantity;
  const totalDuckets = def.costDuckets * quantity;

  if (player.credits < totalCredits) {
    return {
      ok: false,
      message: `Need ${totalCredits} Credits to purchase ${quantity}x ${def.name}.`,
      player,
    };
  }
  if (player.duckets < totalDuckets) {
    return {
      ok: false,
      message: `Need ${totalDuckets} Duckets to purchase ${quantity}x ${def.name}.`,
      player,
    };
  }

  const nextInventory = [...player.inventory];
  const existingIdx = nextInventory.findIndex((i) => i.furniId === furniId);
  if (existingIdx >= 0) {
    nextInventory[existingIdx] = {
      ...nextInventory[existingIdx],
      quantity: nextInventory[existingIdx].quantity + quantity,
    };
  } else {
    nextInventory.push({ furniId, quantity });
  }

  let nextPendingEngravings = { ...(player.pendingEngravings ?? {}) };
  if (def.engravable) {
    const cleanInscription =
      (engravingMessage ?? '').trim().slice(0, 80) ||
      `Awarded to ${player.username} for Hotel Excellence!`;
    const meta: TrophyMetadata = {
      inscription: cleanInscription,
      engravedBy: player.username,
      engravedAt: new Date().toISOString().slice(0, 10),
    };
    const queue = [...(nextPendingEngravings[furniId] ?? [])];
    for (let i = 0; i < quantity; i++) queue.push(meta);
    nextPendingEngravings = { ...nextPendingEngravings, [furniId]: queue };
  }

  return {
    ok: true,
    message: def.engravable
      ? `Purchased & engraved ${quantity > 1 ? `${quantity}x ` : ''}${def.name}! Place it in a room to read the plaque.`
      : `Purchased ${quantity > 1 ? `${quantity}x ` : ''}${def.name}! Added to your Inventory.`,
    player: {
      ...player,
      credits: player.credits - totalCredits,
      duckets: player.duckets - totalDuckets,
      inventory: nextInventory,
      pendingEngravings: nextPendingEngravings,
    },
  };
}

export function canPlaceFurniAt(
  room: RoomDef,
  placedFurni: PlacedFurni[],
  x: number,
  y: number
): boolean {
  if (y < 0 || y >= room.layout.length) return false;
  const row = room.layout[y];
  if (!row || x < 0 || x >= row.length) return false;
  if (row[x] === 'x') return false;

  // Allow placing on top of walkable rugs, disallow stacking solid items on solid items
  const existing = placedFurni.filter((f) => f.x === x && f.y === y);
  for (const item of existing) {
    const def = FURNI_CATALOGUE.find((d) => d.id === item.furniId);
    if (def && !def.walkable) return false;
  }
  return true;
}

export function placeFurniFromInventory(
  inventory: InventoryEntry[],
  placedFurni: PlacedFurni[],
  room: RoomDef,
  furniId: string,
  x: number,
  y: number,
  dir: Direction = 0,
  pendingEngravings: Record<string, TrophyMetadata[]> = {}
): {
  ok: boolean;
  inventory: InventoryEntry[];
  placedFurni: PlacedFurni[];
  pendingEngravings: Record<string, TrophyMetadata[]>;
  message: string;
} {
  const entry = inventory.find((e) => e.furniId === furniId && e.quantity > 0);
  if (!entry) {
    return {
      ok: false,
      inventory,
      placedFurni,
      pendingEngravings,
      message: 'No remaining item in inventory.',
    };
  }
  if (!canPlaceFurniAt(room, placedFurni, x, y)) {
    return {
      ok: false,
      inventory,
      placedFurni,
      pendingEngravings,
      message: 'Cannot place furniture on that tile.',
    };
  }

  const nextInventory = inventory
    .map((e) => (e.furniId === furniId ? { ...e, quantity: e.quantity - 1 } : e))
    .filter((e) => e.quantity > 0);

  let nextPending = pendingEngravings;
  let customData: TrophyMetadata | undefined;
  const queue = pendingEngravings[furniId];
  if (queue && queue.length > 0) {
    customData = queue[0];
    nextPending = { ...pendingEngravings, [furniId]: queue.slice(1) };
  }

  const newUid = `placed-${furniId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nextPlaced: PlacedFurni[] = [
    ...placedFurni,
    { uid: newUid, furniId, x, y, dir, state: 1, customData },
  ];

  return {
    ok: true,
    inventory: nextInventory,
    placedFurni: nextPlaced,
    pendingEngravings: nextPending,
    message: customData ? 'Engraved Trophy placed!' : 'Furniture placed!',
  };
}

export function pickupFurniToInventory(
  inventory: InventoryEntry[],
  placedFurni: PlacedFurni[],
  uid: string,
  pendingEngravings: Record<string, TrophyMetadata[]> = {}
): {
  ok: boolean;
  inventory: InventoryEntry[];
  placedFurni: PlacedFurni[];
  pendingEngravings: Record<string, TrophyMetadata[]>;
} {
  const target = placedFurni.find((p) => p.uid === uid);
  if (!target) return { ok: false, inventory, placedFurni, pendingEngravings };

  const nextPlaced = placedFurni.filter((p) => p.uid !== uid);
  const nextInventory = [...inventory];
  const idx = nextInventory.findIndex((e) => e.furniId === target.furniId);
  if (idx >= 0) {
    nextInventory[idx] = { ...nextInventory[idx], quantity: nextInventory[idx].quantity + 1 };
  } else {
    nextInventory.push({ furniId: target.furniId, quantity: 1 });
  }

  let nextPending = pendingEngravings;
  if (target.customData) {
    nextPending = {
      ...pendingEngravings,
      [target.furniId]: [...(pendingEngravings[target.furniId] ?? []), target.customData],
    };
  }

  return {
    ok: true,
    inventory: nextInventory,
    placedFurni: nextPlaced,
    pendingEngravings: nextPending,
  };
}

export function rotatePlacedFurni(placedFurni: PlacedFurni[], uid: string): PlacedFurni[] {
  return placedFurni.map((f) =>
    f.uid === uid ? { ...f, dir: (((f.dir + 1) % 4) as Direction) } : f
  );
}

export function sanitizeMotto(motto: string): string {
  return motto.trim().slice(0, 64);
}

export function updatePlayerLook(player: PlayerState, look: LookConfig): PlayerState {
  return { ...player, look: { ...look } };
}

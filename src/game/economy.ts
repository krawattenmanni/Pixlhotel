import { findFurniDef } from './data';
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
  engravingMessage?: string,
  priceOverride?: { costCredits?: number; costDuckets?: number; amount?: number; name?: string }
): VoucherResult {
  const def = findFurniDef(furniId);
  if (!def) {
    return { ok: false, message: 'Catalogue item not found.', player };
  }
  const unitCredits = priceOverride?.costCredits ?? def.costCredits;
  const unitDuckets = priceOverride?.costDuckets ?? def.costDuckets;
  const bundleAmount = Math.max(1, priceOverride?.amount ?? def.catalogAmount ?? 1);
  const displayName = priceOverride?.name ?? def.name;

  const purchases = Math.max(1, Math.min(20, Math.floor(rawQty)));
  const totalCredits = unitCredits * purchases;
  const totalDuckets = unitDuckets * purchases;
  const addedItems = purchases * bundleAmount;

  if (player.credits < totalCredits) {
    return {
      ok: false,
      message: `Need ${totalCredits} Credits to purchase ${addedItems}x ${displayName}.`,
      player,
    };
  }
  if (player.duckets < totalDuckets) {
    return {
      ok: false,
      message: `Need ${totalDuckets} Duckets to purchase ${addedItems}x ${displayName}.`,
      player,
    };
  }

  const nextInventory = [...player.inventory];
  const existingIdx = nextInventory.findIndex((i) => i.furniId === def.id);
  if (existingIdx >= 0) {
    nextInventory[existingIdx] = {
      ...nextInventory[existingIdx],
      quantity: nextInventory[existingIdx].quantity + addedItems,
    };
  } else {
    nextInventory.push({ furniId: def.id, quantity: addedItems });
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
    const queue = [...(nextPendingEngravings[def.id] ?? [])];
    for (let i = 0; i < addedItems; i++) queue.push(meta);
    nextPendingEngravings = { ...nextPendingEngravings, [def.id]: queue };
  }

  return {
    ok: true,
    message: def.engravable
      ? `Purchased & engraved ${addedItems > 1 ? `${addedItems}x ` : ''}${displayName}! Place it in a room to read the plaque.`
      : `Purchased ${addedItems > 1 ? `${addedItems}x ` : ''}${displayName}! Added to your Inventory.`,
    player: {
      ...player,
      credits: player.credits - totalCredits,
      duckets: player.duckets - totalDuckets,
      inventory: nextInventory,
      pendingEngravings: nextPendingEngravings,
    },
  };
}

export function computeFurniPlacement(
  room: RoomDef,
  placedFurni: PlacedFurni[],
  furniId: string | undefined,
  x: number,
  y: number,
  ignoreUid?: string
): { ok: boolean; z: number; reason?: string } {
  if (y < 0 || y >= room.layout.length) {
    return { ok: false, z: 0, reason: 'Tile out of room bounds.' };
  }
  const row = room.layout[y];
  if (!row || x < 0 || x >= row.length) {
    return { ok: false, z: 0, reason: 'Tile out of room bounds.' };
  }
  if (row[x] === 'x' || row[x] === '3') {
    return { ok: false, z: 0, reason: 'Cannot place furniture on void or cliff tile.' };
  }

  const existing = placedFurni.filter((f) => f.x === x && f.y === y && f.uid !== ignoreUid);
  const solidExisting = existing.filter((item) => {
    const def = findFurniDef(item.furniId);
    return def ? !def.walkable : true;
  });

  if (solidExisting.length === 0) {
    return { ok: true, z: 0 };
  }

  const incomingDef = furniId ? findFurniDef(furniId) : undefined;
  if (!incomingDef?.stackable) {
    return { ok: false, z: 0, reason: 'Tile is already occupied by solid furniture.' };
  }

  // Stackable small furni can sit on top of surfaces (tables, bars, desks)
  let highestItem: PlacedFurni | null = null;
  let highestZ = -1;
  for (const item of solidExisting) {
    const zVal = item.z ?? 0;
    if (zVal >= highestZ) {
      highestZ = zVal;
      highestItem = item;
    }
  }

  if (!highestItem) return { ok: true, z: 0 };
  const topDef = findFurniDef(highestItem.furniId);
  if (topDef?.isSurface) {
    const nextZ = Number(((highestItem.z ?? 0) + (topDef.stackHeight ?? 0.68)).toFixed(2));
    if (nextZ <= 1.6) {
      return { ok: true, z: nextZ };
    }
  }

  return { ok: false, z: 0, reason: 'Cannot stack that item higher here.' };
}

export function canPlaceFurniAt(
  room: RoomDef,
  placedFurni: PlacedFurni[],
  x: number,
  y: number,
  furniId?: string,
  ignoreUid?: string
): boolean {
  return computeFurniPlacement(room, placedFurni, furniId, x, y, ignoreUid).ok;
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
  const placement = computeFurniPlacement(room, placedFurni, furniId, x, y);
  if (!placement.ok) {
    return {
      ok: false,
      inventory,
      placedFurni,
      pendingEngravings,
      message: placement.reason || 'Cannot place furniture on that tile.',
    };
  }

  const consumedItemId = entry.itemIds && entry.itemIds.length > 0 ? entry.itemIds[0] : undefined;
  const nextInventory = inventory
    .map((e) => {
      if (e.furniId !== furniId) return e;
      return {
        ...e,
        quantity: e.quantity - 1,
        itemIds: e.itemIds ? e.itemIds.slice(1) : undefined,
      };
    })
    .filter((e) => e.quantity > 0);

  let nextPending = pendingEngravings;
  let customData: TrophyMetadata | undefined;
  const queue = pendingEngravings[furniId];
  if (queue && queue.length > 0) {
    customData = queue[0];
    nextPending = { ...pendingEngravings, [furniId]: queue.slice(1) };
  }

  const def = findFurniDef(furniId);
  const newUid = consumedItemId
    ? String(consumedItemId)
    : `placed-${furniId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nextPlaced: PlacedFurni[] = [
    ...placedFurni,
    {
      uid: newUid,
      itemId: consumedItemId,
      furniId,
      x,
      y,
      z: placement.z,
      dir,
      state: def?.isStickyNote ? 0 : 1,
      customData,
      stickyNote: def?.isStickyNote
        ? {
            color: 'yellow',
            text: 'Leave a note for visitors!',
            author: 'PIXL Citizen',
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        : undefined,
    },
  ];

  return {
    ok: true,
    inventory: nextInventory,
    placedFurni: nextPlaced,
    pendingEngravings: nextPending,
    message: customData
      ? 'Engraved Trophy placed!'
      : placement.z > 0
      ? 'Stacked item neatly on surface!'
      : 'Furniture placed!',
  };
}

export function moveFurniInRoom(
  placedFurni: PlacedFurni[],
  room: RoomDef,
  uid: string,
  x: number,
  y: number
): {
  ok: boolean;
  placedFurni: PlacedFurni[];
  moved?: PlacedFurni;
  message: string;
} {
  const target = placedFurni.find((f) => f.uid === uid);
  if (!target) {
    return { ok: false, placedFurni, message: 'Furniture not found in room.' };
  }
  const placement = computeFurniPlacement(room, placedFurni, target.furniId, x, y, uid);
  if (!placement.ok) {
    return {
      ok: false,
      placedFurni,
      message: placement.reason || 'Cannot move furniture onto that tile.',
    };
  }
  const moved: PlacedFurni = { ...target, x, y, z: placement.z };
  return {
    ok: true,
    placedFurni: placedFurni.map((f) => (f.uid === uid ? moved : f)),
    moved,
    message: placement.z > 0 ? 'Stacked furniture on surface!' : 'Furniture moved!',
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
  const returnedId =
    typeof target.itemId === 'number'
      ? target.itemId
      : /^\d+$/.test(target.uid)
      ? Number(target.uid)
      : undefined;

  if (idx >= 0) {
    const cur = nextInventory[idx];
    nextInventory[idx] = {
      ...cur,
      quantity: cur.quantity + 1,
      itemIds:
        returnedId !== undefined
          ? [...(cur.itemIds ?? []), returnedId]
          : cur.itemIds,
    };
  } else {
    nextInventory.push({
      furniId: target.furniId,
      quantity: 1,
      itemIds: returnedId !== undefined ? [returnedId] : undefined,
    });
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

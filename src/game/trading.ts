import { FURNI_CATALOGUE, RARE_VALUES } from './data';
import type { InventoryEntry, PlayerState, TradeSlotItem } from './types';

export const MAX_TRADE_SLOTS = 6;

export function getFurniTradeValue(furniId: string): number {
  const rare = RARE_VALUES.find((r) => r.furniId === furniId);
  if (rare) return rare.creditsValue;
  const def = FURNI_CATALOGUE.find((f) => f.id === furniId);
  if (!def) return 10;
  return Math.max(8, def.costCredits + Math.round(def.costDuckets / 10));
}

export function computeOfferTotalValue(items: TradeSlotItem[], credits: number): number {
  const furniTotal = items.reduce(
    (sum, slot) => sum + getFurniTradeValue(slot.furniId) * slot.quantity,
    0
  );
  return furniTotal + Math.max(0, Math.floor(credits));
}

const PARTNER_TRADE_STASH: Record<string, string[]> = {
  'npc-pixie': ['throne', 'fire_dragon', 'petal_patch', 'amber_lamp', 'hc_sofa', 'gold_trophy'],
  'npc-bobby': ['holo_dice', 'hc_sofa', 'majestic_chair', 'golden_fountain', 'silver_trophy', 'mode_bar'],
  'npc-marco': ['mode_bar', 'mini_fridge', 'palm_tree', 'area_table', 'bronze_trophy', 'pod_chair'],
  'npc-frank': ['jukebox', 'disco_floor', 'lava_lamp', 'plasma_tv', 'arcade_cabinet', 'hc_sofa'],
  default: ['hc_sofa', 'holo_dice', 'majestic_chair', 'palm_tree', 'petal_patch', 'silver_trophy'],
};

/**
 * Generates a fair AI partner counter-offer based on the player's offered items + credits.
 */
export function generateAiCounterOffer(
  partnerId: string,
  playerItems: TradeSlotItem[],
  playerCredits: number
): { items: TradeSlotItem[]; credits: number; greeting: string } {
  const targetValue = computeOfferTotalValue(playerItems, playerCredits);
  if (targetValue <= 0) {
    return {
      items: [],
      credits: 0,
      greeting: 'Place items or Credit Sacks in your trade box to start trading!',
    };
  }

  const stashIds = PARTNER_TRADE_STASH[partnerId] ?? PARTNER_TRADE_STASH.default;
  const sortedPool = stashIds
    .map((id) => ({ id, val: getFurniTradeValue(id) }))
    .sort((a, b) => b.val - a.val);

  const offered: TradeSlotItem[] = [];
  let remaining = targetValue;

  // Pick up to MAX_TRADE_SLOTS items whose combined value approximates targetValue
  for (const candidate of sortedPool) {
    if (offered.length >= MAX_TRADE_SLOTS) break;
    if (candidate.val <= remaining + 6) {
      // Avoid echoing back the exact single item if player offered only 1 of it
      const playerOnlyOfferedThis =
        playerCredits === 0 && playerItems.length === 1 && playerItems[0].furniId === candidate.id;
      if (playerOnlyOfferedThis && sortedPool.length > 1) continue;

      offered.push({ furniId: candidate.id, quantity: 1 });
      remaining -= candidate.val;
    }
  }

  // If still short, top up with affordable furni or credits
  if (offered.length === 0 && sortedPool.length > 0) {
    const cheapest = sortedPool[sortedPool.length - 1];
    if (targetValue >= Math.round(cheapest.val * 0.7)) {
      offered.push({ furniId: cheapest.id, quantity: 1 });
      remaining = targetValue - cheapest.val;
    }
  }

  const extraCredits = remaining >= 4 ? Math.min(250, Math.round(remaining)) : 0;

  return {
    items: offered,
    credits: extraCredits,
    greeting:
      offered.length > 0
        ? 'That looks like a fair swap! Click Accept when you are ready.'
        : `Fair deal! I can match that with ${extraCredits} Credits.`,
  };
}

export function executeTradeTransfer(
  player: PlayerState,
  offeredItems: TradeSlotItem[],
  offeredCredits: number,
  receivedItems: TradeSlotItem[],
  receivedCredits: number
): { ok: boolean; message: string; player: PlayerState } {
  const cleanOfferedCredits = Math.max(0, Math.floor(offeredCredits));
  const cleanReceivedCredits = Math.max(0, Math.floor(receivedCredits));

  if (offeredItems.length === 0 && cleanOfferedCredits === 0) {
    return { ok: false, message: 'Add at least 1 item or Credit Sack to trade.', player };
  }
  if (player.credits < cleanOfferedCredits) {
    return { ok: false, message: 'Not enough Credits for your trade offer.', player };
  }

  const nextInvMap = new Map<string, number>();
  for (const entry of player.inventory) {
    nextInvMap.set(entry.furniId, entry.quantity);
  }

  // Validate & deduct player's offered items
  for (const slot of offeredItems) {
    const current = nextInvMap.get(slot.furniId) ?? 0;
    if (current < slot.quantity) {
      return {
        ok: false,
        message: `You don't have enough ${slot.furniId} in your inventory.`,
        player,
      };
    }
    const rem = current - slot.quantity;
    if (rem > 0) nextInvMap.set(slot.furniId, rem);
    else nextInvMap.delete(slot.furniId);
  }

  // Grant partner's offered items
  for (const slot of receivedItems) {
    nextInvMap.set(slot.furniId, (nextInvMap.get(slot.furniId) ?? 0) + slot.quantity);
  }

  const nextInventory: InventoryEntry[] = Array.from(nextInvMap.entries()).map(
    ([furniId, quantity]) => ({ furniId, quantity })
  );

  const nextCredits = player.credits - cleanOfferedCredits + cleanReceivedCredits;

  return {
    ok: true,
    message: 'Trade completed! Items and Credits have been permanently transferred.',
    player: {
      ...player,
      credits: nextCredits,
      inventory: nextInventory,
    },
  };
}

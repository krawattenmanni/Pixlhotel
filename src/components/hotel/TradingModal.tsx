import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Coins,
  Lock,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import { FURNI_CATALOGUE } from '../../game/data';
import {
  computeOfferTotalValue,
  generateAiCounterOffer,
  MAX_TRADE_SLOTS,
} from '../../game/trading';
import type { HabboNPC, PlayerState, TradeSlotItem } from '../../game/types';
import { FurniPreviewImg, PixelHeadCanvas } from '../PixelSpriteCanvas';

interface TradingModalProps {
  player: PlayerState;
  partner: HabboNPC;
  onConfirmTrade: (
    offeredItems: TradeSlotItem[],
    offeredCredits: number,
    receivedItems: TradeSlotItem[],
    receivedCredits: number
  ) => { ok: boolean; message: string };
  onClose: () => void;
}

export function TradingModal({
  player,
  partner,
  onConfirmTrade,
  onClose,
}: TradingModalProps) {
  const [myItems, setMyItems] = useState<TradeSlotItem[]>([]);
  const [myCredits, setMyCredits] = useState<number>(0);
  const [playerAccepted, setPlayerAccepted] = useState(false);
  const [partnerAccepted, setPartnerAccepted] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const partnerOffer = useMemo(
    () => generateAiCounterOffer(partner.id, myItems, myCredits),
    [partner.id, myItems, myCredits]
  );

  const myOfferValue = useMemo(
    () => computeOfferTotalValue(myItems, myCredits),
    [myItems, myCredits]
  );
  const partnerOfferValue = useMemo(
    () => computeOfferTotalValue(partnerOffer.items, partnerOffer.credits),
    [partnerOffer]
  );

  const getOfferedCount = (furniId: string) =>
    myItems.find((s) => s.furniId === furniId)?.quantity ?? 0;

  const unlockBoth = () => {
    setPlayerAccepted(false);
    setPartnerAccepted(false);
    setFeedback(null);
  };

  const handleAddItem = (furniId: string) => {
    const invEntry = player.inventory.find((i) => i.furniId === furniId);
    if (!invEntry) return;
    const already = getOfferedCount(furniId);
    if (already >= invEntry.quantity) return;

    const existingIdx = myItems.findIndex((s) => s.furniId === furniId);
    if (existingIdx >= 0) {
      setMyItems((prev) =>
        prev.map((s, idx) => (idx === existingIdx ? { ...s, quantity: s.quantity + 1 } : s))
      );
      unlockBoth();
      return;
    }

    if (myItems.length >= MAX_TRADE_SLOTS) {
      setFeedback({ ok: false, text: 'All 6 trade slots are full! Remove an item first.' });
      return;
    }
    setMyItems((prev) => [...prev, { furniId, quantity: 1 }]);
    unlockBoth();
  };

  const handleRemoveSlot = (furniId: string) => {
    setMyItems((prev) =>
      prev
        .map((s) => (s.furniId === furniId ? { ...s, quantity: s.quantity - 1 } : s))
        .filter((s) => s.quantity > 0)
    );
    unlockBoth();
  };

  const handleAddCredits = (delta: number) => {
    const next = Math.min(player.credits, myCredits + delta);
    if (next === myCredits) return;
    setMyCredits(next);
    unlockBoth();
  };

  const handleAcceptToggle = () => {
    if (myOfferValue <= 0) {
      setFeedback({ ok: false, text: 'Place at least 1 furniture item or Credit Sack first!' });
      return;
    }
    const nextAccepted = !playerAccepted;
    setPlayerAccepted(nextAccepted);
    setPartnerAccepted(nextAccepted && partnerOfferValue > 0);
    setFeedback(null);
  };

  const bothLocked = playerAccepted && partnerAccepted && myOfferValue > 0;

  const handleConfirm = () => {
    if (!bothLocked) return;
    const res = onConfirmTrade(
      myItems,
      myCredits,
      partnerOffer.items,
      partnerOffer.credits
    );
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      setTimeout(() => {
        onClose();
      }, 650);
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="PIXL Hotel Trading Window"
      data-testid="trading-modal"
    >
      <div className="client-window w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="client-window-bar flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-3.5 w-3.5 text-[#fef08a]" />
            <span className="font-pixel text-[11px] text-white">
              Trading (&ldquo;Tauschen&rdquo;) with {partner.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel Trade"
            className="client-close-btn"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="p-3 space-y-3 bg-[#ececec]">
          {/* 2-COLUMN TRADE BOXES */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* LEFT COLUMN: YOUR OFFER */}
            <div
              data-testid="trade-box-player"
              className={`border p-2.5 rounded-[2px] ${
                playerAccepted
                  ? 'border-[#1f5c0c] bg-[#dcfce7]'
                  : 'border-[#8f8f8f] bg-[#f7f7f7]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PixelHeadCanvas look={player.look} size={26} />
                  <span className="truncate text-[11px] font-bold text-[#111827]">
                    Your Offer ({player.username})
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold rounded-[2px] ${
                    playerAccepted
                      ? 'border-[#1f5c0c] bg-[#2f7d12] text-white'
                      : 'border-[#9ca3af] bg-[#e5e7eb] text-[#374151]'
                  }`}
                >
                  {playerAccepted ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  {playerAccepted ? 'Accepted' : 'Unlocked'}
                </span>
              </div>

              {/* 6 Trade Slots */}
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: MAX_TRADE_SLOTS }).map((_, idx) => {
                  const slot = myItems[idx];
                  const def = slot ? FURNI_CATALOGUE.find((f) => f.id === slot.furniId) : null;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!slot}
                      onClick={() => slot && handleRemoveSlot(slot.furniId)}
                      title={def ? `Remove ${def.name}` : 'Empty trade slot'}
                      className={`relative flex h-16 flex-col items-center justify-center border rounded-[2px] ${
                        slot
                          ? 'border-[#1d4e78] bg-white hover:border-[#b91c1c] cursor-pointer'
                          : 'border-dashed border-[#a3a3a3] bg-[#e5e5e5] cursor-default'
                      }`}
                    >
                      {slot && def && (
                        <>
                          <span className="absolute right-1 top-0.5 font-mono-num text-[9px] font-bold text-[#1d4e78]">
                            x{slot.quantity}
                          </span>
                          <FurniPreviewImg itemType={slot.furniId} alt={def.name} size={34} />
                          <span className="w-full truncate px-1 text-center text-[9px] font-bold text-[#111827]">
                            {def.name}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Credit Sack Offer Controls */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border border-[#b5b5b5] bg-white px-2 py-1.5 rounded-[2px]">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#92400e]">
                  <Coins className="h-3.5 w-3.5 text-[#d97706]" />
                  <span data-testid="trade-my-credits">{myCredits}</span>c offered
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {[10, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={player.credits < myCredits + amt}
                      onClick={() => handleAddCredits(amt)}
                      className="habbo-btn-gold px-1.5 py-0.5 font-mono-num text-[10px] font-bold disabled:opacity-40 cursor-pointer"
                    >
                      +{amt}c
                    </button>
                  ))}
                  {myCredits > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMyCredits(0);
                        unlockBoth();
                      }}
                      className="habbo-btn-silver px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#4b5563]">
                  Est. Value: <strong className="font-mono-num text-[#111827]">{myOfferValue}c</strong>
                </span>
                <button
                  type="button"
                  data-testid="trade-accept-btn"
                  onClick={handleAcceptToggle}
                  className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold cursor-pointer ${
                    playerAccepted ? 'habbo-btn-silver' : 'habbo-btn-green'
                  }`}
                >
                  {playerAccepted ? <Lock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {playerAccepted ? 'Accepted' : 'Accept'}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: PARTNER OFFER */}
            <div
              data-testid="trade-box-partner"
              className={`border p-2.5 rounded-[2px] ${
                partnerAccepted
                  ? 'border-[#1f5c0c] bg-[#dcfce7]'
                  : 'border-[#8f8f8f] bg-[#f7f7f7]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PixelHeadCanvas look={partner.look} size={26} />
                  <span className="truncate text-[11px] font-bold text-[#111827]">
                    {partner.name}&apos;s Offer
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold rounded-[2px] ${
                    partnerAccepted
                      ? 'border-[#1f5c0c] bg-[#2f7d12] text-white'
                      : 'border-[#9ca3af] bg-[#e5e7eb] text-[#374151]'
                  }`}
                >
                  {partnerAccepted ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  {partnerAccepted ? 'Accepted' : 'Waiting'}
                </span>
              </div>

              {/* 6 Partner Slots */}
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: MAX_TRADE_SLOTS }).map((_, idx) => {
                  const slot = partnerOffer.items[idx];
                  const def = slot ? FURNI_CATALOGUE.find((f) => f.id === slot.furniId) : null;
                  return (
                    <div
                      key={idx}
                      className={`relative flex h-16 flex-col items-center justify-center border rounded-[2px] ${
                        slot
                          ? 'border-[#b45309] bg-white'
                          : 'border-dashed border-[#a3a3a3] bg-[#e5e5e5]'
                      }`}
                    >
                      {slot && def && (
                        <>
                          <span className="absolute right-1 top-0.5 font-mono-num text-[9px] font-bold text-[#92400e]">
                            x{slot.quantity}
                          </span>
                          <FurniPreviewImg itemType={slot.furniId} alt={def.name} size={34} />
                          <span className="w-full truncate px-1 text-center text-[9px] font-bold text-[#111827]">
                            {def.name}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between border border-[#b5b5b5] bg-white px-2 py-1.5 rounded-[2px]">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#92400e]">
                  <Coins className="h-3.5 w-3.5 text-[#d97706]" />
                  {partnerOffer.credits}c Credit Sacks
                </span>
                <span className="text-[11px] font-bold text-[#4b5563]">
                  Est. Value: <strong className="font-mono-num text-[#111827]">{partnerOfferValue}c</strong>
                </span>
              </div>

              <p className="mt-2 border border-[#b5b5b5] bg-white px-2.5 py-1.5 text-[11px] italic text-[#374151] rounded-[2px]">
                {partner.name}: &ldquo;{partnerOffer.greeting}&rdquo;
              </p>
            </div>
          </div>

          {/* INVENTORY PICKER TO PLACE ITEMS INTO YOUR TRADE BOX */}
          <div className="border border-[#8f8f8f] bg-[#e0e0e0] p-2.5 rounded-[2px]">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1f2937]">
              Tap Your Inventory Items to Offer ({player.credits}c available)
            </p>
            {player.inventory.length === 0 ? (
              <p className="py-2 text-[11px] text-[#4b5563]">
                Your furniture inventory is empty—you can still offer Credit Sacks above!
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {player.inventory.map((entry) => {
                  const def = FURNI_CATALOGUE.find((f) => f.id === entry.furniId);
                  if (!def) return null;
                  const available = entry.quantity - getOfferedCount(entry.furniId);
                  return (
                    <button
                      key={entry.furniId}
                      type="button"
                      disabled={available <= 0}
                      data-testid={`trade-inv-${entry.furniId}`}
                      onClick={() => handleAddItem(entry.furniId)}
                      className="flex items-center gap-1.5 border border-[#8f8f8f] bg-white px-2 py-1 text-left text-[11px] font-bold text-[#111827] hover:border-[#1d4e78] disabled:opacity-45 cursor-pointer rounded-[2px]"
                    >
                      <FurniPreviewImg itemType={entry.furniId} alt={def.name} size={24} />
                      <span>{def.name}</span>
                      <span className="border border-[#000] bg-[#2b6ca3] px-1 font-mono-num text-[9px] text-white rounded-[2px]">
                        x{available}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {feedback && (
            <p
              role="status"
              className={`border px-3 py-1.5 text-[11px] font-bold rounded-[2px] ${
                feedback.ok
                  ? 'border-[#1f5c0c] bg-[#dcfce7] text-[#14532d]'
                  : 'border-[#991b1b] bg-[#fee2e2] text-[#7f1d1d]'
              }`}
            >
              {feedback.text}
            </p>
          )}

          {/* 2-STEP SAFETY CONFIRMATION BAR */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#b5b5b5] pt-2.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#374151]">
              <ShieldCheck className="h-4 w-4 text-[#166534]" />
              2-Step Lock: Both traders must Accept before Confirm Trade unlocks.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="habbo-btn-silver px-3.5 py-1 text-[11px] font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="trade-confirm-btn"
                disabled={!bothLocked}
                onClick={handleConfirm}
                className="habbo-btn-green px-4 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                Confirm Trade
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
import { PixelFurniCanvas, PixelHeadCanvas } from '../PixelSpriteCanvas';

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

  // Remaining quantity of each inventory item available to add
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
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="PIXL Hotel Trading Window"
      data-testid="trading-modal"
    >
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg border-2 border-[#1b1922] bg-[#e9e4d5] shadow-[0_14px_40px_rgba(0,0,0,0.65)]">
        {/* Window Title Bar */}
        <div className="flex items-center justify-between border-b-2 border-[#1b1922] bg-gradient-to-b from-[#45484d] to-[#2b2d31] px-3.5 py-2 text-white">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-[#facc15]" />
            <span className="font-pixel text-xs sm:text-sm">
              Trading (&ldquo;Tauschen&rdquo;) with {partner.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel Trade"
            className="rounded border border-white/30 bg-[#b91c1c] p-1 hover:bg-[#dc2626] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          {/* 2-COLUMN TRADE BOXES */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* LEFT COLUMN: YOUR OFFER */}
            <div
              data-testid="trade-box-player"
              className={`rounded-md border-2 p-2.5 transition-colors ${
                playerAccepted
                  ? 'border-emerald-700 bg-emerald-100/85'
                  : 'border-[#a8a29e] bg-[#f7f4ec]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PixelHeadCanvas look={player.look} size={26} />
                  <span className="truncate text-xs font-extrabold text-slate-900">
                    Your Offer ({player.username})
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-extrabold ${
                    playerAccepted
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-700'
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
                      className={`relative flex h-16 flex-col items-center justify-center rounded border-2 ${
                        slot
                          ? 'border-[#2563eb] bg-white hover:border-rose-500 cursor-pointer'
                          : 'border-dashed border-[#c4bead] bg-[#ece8dc] cursor-default'
                      }`}
                    >
                      {slot && def && (
                        <>
                          <span className="absolute right-1 top-0.5 font-mono-num text-[9px] font-extrabold text-blue-800">
                            x{slot.quantity}
                          </span>
                          <PixelFurniCanvas furniId={slot.furniId} size={34} />
                          <span className="w-full truncate px-1 text-center text-[9px] font-bold text-slate-800">
                            {def.name}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Credit Sack Offer Controls */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 rounded border border-[#d6d0c0] bg-white px-2 py-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-800">
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
                      className="rounded border border-amber-400 bg-amber-100 px-1.5 py-0.5 font-mono-num text-[10px] font-extrabold text-amber-900 hover:bg-amber-200 disabled:opacity-40 cursor-pointer"
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
                      className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">
                  Est. Value: <strong className="font-mono-num text-slate-900">{myOfferValue}c</strong>
                </span>
                <button
                  type="button"
                  data-testid="trade-accept-btn"
                  onClick={handleAcceptToggle}
                  className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-extrabold cursor-pointer ${
                    playerAccepted
                      ? 'border border-emerald-800 bg-emerald-700 text-white'
                      : 'habbo-btn-green'
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
              className={`rounded-md border-2 p-2.5 transition-colors ${
                partnerAccepted
                  ? 'border-emerald-700 bg-emerald-100/85'
                  : 'border-[#a8a29e] bg-[#f7f4ec]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PixelHeadCanvas look={partner.look} size={26} />
                  <span className="truncate text-xs font-extrabold text-slate-900">
                    {partner.name}&apos;s Offer
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-extrabold ${
                    partnerAccepted
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-700'
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
                      className={`relative flex h-16 flex-col items-center justify-center rounded border-2 ${
                        slot
                          ? 'border-[#d97706] bg-white'
                          : 'border-dashed border-[#c4bead] bg-[#ece8dc]'
                      }`}
                    >
                      {slot && def && (
                        <>
                          <span className="absolute right-1 top-0.5 font-mono-num text-[9px] font-extrabold text-amber-800">
                            x{slot.quantity}
                          </span>
                          <PixelFurniCanvas furniId={slot.furniId} size={34} />
                          <span className="w-full truncate px-1 text-center text-[9px] font-bold text-slate-800">
                            {def.name}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-2.5 flex items-center justify-between rounded border border-[#d6d0c0] bg-white px-2 py-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-800">
                  <Coins className="h-3.5 w-3.5 text-[#d97706]" />
                  {partnerOffer.credits}c Credit Sacks
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  Est. Value: <strong className="font-mono-num text-slate-900">{partnerOfferValue}c</strong>
                </span>
              </div>

              <p className="mt-2 rounded border border-[#d6d0c0] bg-white/80 px-2.5 py-1.5 text-[11px] italic text-slate-700">
                {partner.name}: &ldquo;{partnerOffer.greeting}&rdquo;
              </p>
            </div>
          </div>

          {/* INVENTORY PICKER TO PLACE ITEMS INTO YOUR TRADE BOX */}
          <div className="rounded-md border border-[#b5afa0] bg-[#dfd9c8] p-2.5">
            <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-700">
              Tap Your Inventory Items to Offer ({player.credits}c available)
            </p>
            {player.inventory.length === 0 ? (
              <p className="py-2 text-xs text-slate-600">
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
                      className="flex items-center gap-1.5 rounded border border-[#b5afa0] bg-white px-2 py-1 text-left text-[11px] font-bold text-slate-900 hover:border-[#2563eb] disabled:opacity-45 cursor-pointer"
                    >
                      <PixelFurniCanvas furniId={entry.furniId} size={24} />
                      <span>{def.name}</span>
                      <span className="rounded bg-[#235c8a] px-1 font-mono-num text-[9px] text-white">
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
              className={`rounded border px-3 py-1.5 text-xs font-bold ${
                feedback.ok
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                  : 'border-rose-400 bg-rose-50 text-rose-900'
              }`}
            >
              {feedback.text}
            </p>
          )}

          {/* 2-STEP SAFETY CONFIRMATION BAR */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#c4bead] pt-2.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              2-Step Lock: Both traders must Accept before Confirm Trade unlocks.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-400 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="trade-confirm-btn"
                disabled={!bothLocked}
                onClick={handleConfirm}
                className="habbo-btn-green rounded px-4 py-1.5 text-xs font-extrabold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
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

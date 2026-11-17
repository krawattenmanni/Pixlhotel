import { Check, Lock, Sparkles, X } from 'lucide-react';
import { findBadgeDefById } from '../game/customBadges';
import type { CustomBadgeDef } from '../game/types';
import { PixelBadgeSprite } from './PixelSpriteCanvas';

interface BadgeInfoModalProps {
  badgeId: string | null;
  unlocked?: boolean;
  equipped?: boolean;
  customBadges?: CustomBadgeDef[];
  onEquip?: (badgeId: string) => void;
  onClose: () => void;
}

export function BadgeInfoModal({
  badgeId,
  unlocked = true,
  equipped = false,
  customBadges = [],
  onEquip,
  onClose,
}: BadgeInfoModalProps) {
  if (!badgeId) return null;

  const def = findBadgeDefById(badgeId, customBadges) ?? {
    id: badgeId,
    code: badgeId.toUpperCase().slice(0, 6),
    name: badgeId.toUpperCase(),
    description: 'Exclusive PIXL Hotel achievement badge earned by community members.',
    unlockHint: 'Participate in official PIXL Hotel events or redeem a special voucher.',
    category: 'Special' as const,
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
      data-testid="badge-info-modal"
    >
      <div
        className="client-window w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="client-window-bar flex items-center justify-between px-2.5 py-1.5">
          <span className="text-[11px] font-bold">Badge Information</span>
          <button
            type="button"
            aria-label="Close badge popup"
            onClick={onClose}
            className="client-close-btn"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="p-3.5 space-y-3 bg-[#ececec]">
          <div className="flex items-start gap-3.5 border border-[#b5b5b5] bg-white p-3 rounded-[3px]">
            <div className="flex h-24 w-24 items-center justify-center border border-[#000000] bg-gradient-to-b from-[#d8ebfc] to-[#eef7ff] shrink-0 rounded-[2px] shadow-[inset_0_1px_0_#ffffff]">
              <PixelBadgeSprite
                badgeId={def.id}
                unlocked={unlocked}
                size={80}
                customBadges={customBadges}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="border border-[#000000] bg-[#2b6ca3] px-1.5 py-0.5 font-pixel text-[9px] text-white rounded-[2px]">
                  {def.code}
                </span>
                <span className="text-[10px] font-bold text-[#555555]">{def.category}</span>
              </div>
              <h3 className="mt-1 text-[14px] font-bold text-[#111827] leading-tight">
                {def.name}
              </h3>
              <p className="mt-1 text-[11px] text-[#374151] leading-snug">{def.description}</p>
            </div>
          </div>

          <div className="border border-[#b5b5b5] bg-[#f7f7f7] px-2.5 py-2 text-[11px] text-[#1f2937] rounded-[3px]">
            <span className="inline-flex items-center gap-1 font-bold text-[#1d4e78]">
              {unlocked ? <Sparkles className="h-3 w-3 text-[#d97706]" /> : <Lock className="h-3 w-3 text-[#475569]" />}
              {unlocked ? 'How it was earned:' : 'How to unlock:'}
            </span>
            <p className="mt-0.5 text-[#374151]">{def.unlockHint}</p>
          </div>

          <div className="flex items-center justify-end gap-2">
            {unlocked && onEquip && (
              <button
                type="button"
                onClick={() => onEquip(def.id)}
                className={`${equipped ? 'habbo-btn-silver' : 'habbo-btn-green'} px-3 py-1 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1`}
              >
                {equipped ? (
                  <>
                    <Check className="h-3 w-3" /> Unequip Badge
                  </>
                ) : (
                  'Equip Badge'
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="habbo-btn-blue px-3 py-1 text-[11px] font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

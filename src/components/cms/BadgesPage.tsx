import { useState } from 'react';
import { Award, Check, Lock } from 'lucide-react';
import { findBadgeDefById, getAllBadgeDefs } from '../../game/customBadges';
import { getEquippedBadges } from '../../game/data';
import type { CustomBadgeDef, PlayerState } from '../../game/types';
import { BadgeInfoModal } from '../BadgeInfoModal';
import { PixelBadgeSprite } from '../PixelSpriteCanvas';

interface BadgesPageProps {
  player: PlayerState;
  customBadges?: CustomBadgeDef[];
  onEquipBadge: (badgeId: string) => void;
}

type BadgeFilter = 'all' | 'collected' | 'missing';

export function BadgesPage({ player, customBadges = [], onEquipBadge }: BadgesPageProps) {
  const [filter, setFilter] = useState<BadgeFilter>('all');
  const [inspectBadgeId, setInspectBadgeId] = useState<string | null>(null);

  const allBadges = getAllBadgeDefs(customBadges);
  const collectedSet = new Set(player.unlockedBadges);
  const equippedList = getEquippedBadges(player);
  const collectedCount = allBadges.filter((b) => collectedSet.has(b.id)).length;
  const missingCount = allBadges.length - collectedCount;
  const pct = allBadges.length > 0 ? Math.round((collectedCount / allBadges.length) * 100) : 0;

  const visibleBadges = allBadges.filter((b) => {
    const has = collectedSet.has(b.id);
    if (filter === 'collected') return has;
    if (filter === 'missing') return !has;
    return true;
  });

  const equippedDef = findBadgeDefById(player.equippedBadgeId, customBadges) ?? allBadges[0];

  return (
    <div className="space-y-5">
      {/* BADGE PROGRESS OVERVIEW */}
      <section className="habbo-box">
        <div className="habbo-box-header habbo-header-dark flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <Award className="h-4 w-4 text-[#fde047]" />
            PIXL Badge Showcase &amp; 5-Slot Display
          </span>
          <span className="font-mono-num text-[11px] font-bold text-[#fef08a]">
            {collectedCount} / {allBadges.length} Collected ({pct}%)
          </span>
        </div>

        <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setInspectBadgeId(equippedDef.id)}
              className="rounded-[3px] border border-[#000000] bg-[#fefce8] p-1.5 shrink-0 cursor-pointer hover:bg-[#fef08a]/40"
              title="Click to inspect badge details"
            >
              <PixelBadgeSprite
                badgeId={equippedDef.id}
                unlocked
                size={44}
                customBadges={customBadges}
              />
            </button>
            <div>
              <p className="text-[11px] font-bold text-[#475569]">
                Active Equipped Slots ({equippedList.length}/5) — Click any badge to inspect!
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {Array.from({ length: 5 }).map((_, slotIdx) => {
                  const slotId = equippedList[slotIdx];
                  const slotDef = slotId ? findBadgeDefById(slotId, customBadges) : null;
                  return (
                    <button
                      key={slotIdx}
                      type="button"
                      disabled={!slotId}
                      onClick={() => slotId && setInspectBadgeId(slotId)}
                      title={slotDef ? `${slotDef.name} [${slotDef.code}]` : 'Empty badge slot'}
                      className={`flex h-12 w-12 items-center justify-center rounded-[2px] border ${
                        slotId
                          ? 'border-[#000000] bg-gradient-to-b from-[#dbeafe] to-[#eff6ff] cursor-pointer hover:from-[#bfdbfe]'
                          : 'border-[#cbd5e1] bg-[#f8fafc] cursor-default'
                      }`}
                    >
                      {slotId ? (
                        <PixelBadgeSprite badgeId={slotId} unlocked size={40} customBadges={customBadges} />
                      ) : (
                        <span className="text-[9px] font-bold text-[#94a3b8]">#{slotIdx + 1}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
                filter === 'all'
                  ? 'border-[#000000] bg-[#2b6ca3] text-white'
                  : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
              }`}
            >
              All ({allBadges.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('collected')}
              className={`rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
                filter === 'collected'
                  ? 'border-[#000000] bg-[#3d8b18] text-white'
                  : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
              }`}
            >
              Collected ({collectedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('missing')}
              className={`rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
                filter === 'missing'
                  ? 'border-[#000000] bg-[#475569] text-white'
                  : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
              }`}
            >
              Missing ({missingCount})
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="h-3 w-full overflow-hidden rounded-[2px] border border-[#000000] bg-[#e2e8f0]">
            <div
              className="h-full bg-gradient-to-r from-[#2b6ca3] to-[#5bb52c] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>

      {/* BADGE GRID */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {visibleBadges.map((badge) => {
          const isUnlocked = collectedSet.has(badge.id);
          const isEquipped = equippedList.includes(badge.id);

          return (
            <div
              key={badge.id}
              data-testid={`badge-card-${badge.id}`}
              className={`habbo-box flex items-center justify-between gap-3.5 p-3.5 ${
                isUnlocked ? 'bg-white' : 'bg-[#f1f5f9] opacity-90'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setInspectBadgeId(badge.id)}
                  className={`flex h-14 w-14 items-center justify-center rounded-[2px] border border-[#000000] shrink-0 cursor-pointer ${
                    isUnlocked
                      ? 'bg-gradient-to-b from-[#dbeafe] to-[#ffffff] hover:from-[#bfdbfe]'
                      : 'bg-[#cbd5e1]'
                  }`}
                  title={`Click to view ${badge.name} info`}
                >
                  <PixelBadgeSprite
                    badgeId={badge.id}
                    unlocked={isUnlocked}
                    size={40}
                    customBadges={customBadges}
                  />
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInspectBadgeId(badge.id)}
                      className="text-[13px] font-bold text-[#111827] hover:underline text-left cursor-pointer"
                    >
                      {badge.name}
                    </button>
                    <span className="font-mono-num text-[10px] font-bold text-[#475569]">
                      [{badge.code}]
                    </span>
                    <span className="text-[10px] font-semibold text-[#64748b]">· {badge.category}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#475569]">{badge.description}</p>
                  {!isUnlocked && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#334155]">
                      <Lock className="h-3 w-3 text-[#64748b] shrink-0" />
                      How to unlock: {badge.unlockHint}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onEquipBadge(badge.id)}
                    className={`px-3 py-1 text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                      isEquipped
                        ? 'habbo-btn-silver'
                        : 'habbo-btn-blue'
                    }`}
                  >
                    {isEquipped ? (
                      <span className="inline-flex items-center gap-1 text-[#14532d]">
                        <Check className="h-3 w-3" /> In Slot
                      </span>
                    ) : (
                      'Equip Slot'
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setInspectBadgeId(badge.id)}
                    className="inline-flex items-center gap-1 rounded-[2px] border border-[#94a3b8] bg-[#e2e8f0] px-2.5 py-1 text-[10px] font-bold text-[#334155] cursor-pointer hover:bg-[#cbd5e1]"
                  >
                    <Lock className="h-3 w-3" /> Info
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BadgeInfoModal
        badgeId={inspectBadgeId}
        unlocked={inspectBadgeId ? collectedSet.has(inspectBadgeId) : false}
        equipped={inspectBadgeId ? equippedList.includes(inspectBadgeId) : false}
        customBadges={customBadges}
        onEquip={(id) => onEquipBadge(id)}
        onClose={() => setInspectBadgeId(null)}
      />
    </div>
  );
}

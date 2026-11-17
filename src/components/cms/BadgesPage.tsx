import { useState } from 'react';
import { Award, Check, Lock } from 'lucide-react';
import { findBadgeDefById, getAllBadgeDefs } from '../../game/customBadges';
import type { CustomBadgeDef, PlayerState } from '../../game/types';
import { PixelBadgeSprite } from '../PixelSpriteCanvas';

interface BadgesPageProps {
  player: PlayerState;
  customBadges?: CustomBadgeDef[];
  onEquipBadge: (badgeId: string) => void;
}

type BadgeFilter = 'all' | 'collected' | 'missing';

export function BadgesPage({ player, customBadges = [], onEquipBadge }: BadgesPageProps) {
  const [filter, setFilter] = useState<BadgeFilter>('all');

  const allBadges = getAllBadgeDefs(customBadges);
  const collectedSet = new Set(player.unlockedBadges);
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
    <div className="space-y-6">
      {/* BADGE PROGRESS OVERVIEW */}
      <section className="habbo-box">
        <div className="habbo-box-header flex flex-wrap items-center justify-between gap-2 bg-[#7c3aed]">
          <span className="inline-flex items-center gap-2">
            <Award className="h-4 w-4 text-[#fde047]" />
            PIXL Badge Showcase &amp; Collector Guide
          </span>
          <span className="font-mono-num text-xs font-bold text-purple-100">
            {collectedCount} / {allBadges.length} Collected ({pct}%)
          </span>
        </div>

        <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="rounded-md border-2 border-[#ca8a04] bg-[#fefce8] p-1.5 shrink-0">
              <PixelBadgeSprite
                badgeId={equippedDef.id}
                unlocked
                size={48}
                customBadges={customBadges}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Currently Equipped Profile Badge</p>
              <h2 className="text-base font-extrabold text-slate-900">
                {equippedDef.name}{' '}
                <span className="font-pixel text-xs text-[#7c3aed]">[{equippedDef.code}]</span>
              </h2>
              <p className="text-xs text-slate-600">{equippedDef.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                filter === 'all'
                  ? 'border-[#1d4ed8] bg-[#2b7de9] text-white'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              All ({allBadges.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('collected')}
              className={`rounded border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                filter === 'collected'
                  ? 'border-emerald-700 bg-emerald-600 text-white'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Collected ({collectedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('missing')}
              className={`rounded border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                filter === 'missing'
                  ? 'border-slate-700 bg-slate-700 text-white'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Missing ({missingCount})
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="h-3 w-full overflow-hidden rounded border border-slate-300 bg-slate-200">
            <div
              className="h-full bg-gradient-to-r from-[#7c3aed] to-[#2b7de9] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>

      {/* BADGE GRID */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleBadges.map((badge) => {
          const isUnlocked = collectedSet.has(badge.id);
          const isEquipped = player.equippedBadgeId === badge.id;

          return (
            <div
              key={badge.id}
              data-testid={`badge-card-${badge.id}`}
              className={`habbo-box flex items-center justify-between gap-4 p-4 ${
                isUnlocked ? 'bg-white' : 'bg-slate-100/90 opacity-90'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-md border-2 shrink-0 ${
                    isUnlocked
                      ? 'border-amber-300 bg-gradient-to-b from-[#eff6ff] to-white'
                      : 'border-slate-300 bg-slate-200'
                  }`}
                >
                  <PixelBadgeSprite
                    badgeId={badge.id}
                    unlocked={isUnlocked}
                    size={48}
                    customBadges={customBadges}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">{badge.name}</h3>
                    <span className="font-mono-num text-[11px] font-bold text-slate-500">
                      [{badge.code}]
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">· {badge.category}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{badge.description}</p>
                  {!isUnlocked && (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                      <Lock className="h-3 w-3 text-slate-500 shrink-0" />
                      How to unlock: {badge.unlockHint}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {isUnlocked ? (
                  <button
                    type="button"
                    disabled={isEquipped}
                    onClick={() => onEquipBadge(badge.id)}
                    className={`rounded px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
                      isEquipped
                        ? 'border border-emerald-400 bg-emerald-50 text-emerald-800 cursor-default'
                        : 'habbo-btn-blue cursor-pointer'
                    }`}
                  >
                    {isEquipped ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Equipped
                      </span>
                    ) : (
                      'Equip'
                    )}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    <Lock className="h-3 w-3" /> Missing
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

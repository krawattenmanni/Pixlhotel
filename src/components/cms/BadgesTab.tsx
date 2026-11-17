import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Lock, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { getAllBadgeDefs } from '../../game/customBadges';
import {
  getLocalizedBadgeMeta,
  normalizeBadgeCategoryGroup,
  t,
  type CanonicalBadgeCategory,
} from '../../game/i18n';
import type { BadgeDef, CustomBadgeDef, LanguageCode, PlayerState } from '../../game/types';
import { PixelBadgeSprite } from '../PixelSpriteCanvas';

interface BadgesTabProps {
  player: PlayerState;
  customBadges: CustomBadgeDef[];
  lang: LanguageCode;
  onEquipBadge: (badgeId: string) => void;
}

type FilterGroup = 'All' | CanonicalBadgeCategory;

const FILTER_GROUPS: FilterGroup[] = [
  'All',
  'Achievements',
  'Games & Rooms',
  'Rares',
  'Events & Seasonal',
  'Staff & VIP',
];

export const BadgesTab: React.FC<BadgesTabProps> = ({
  player,
  customBadges,
  lang,
  onEquipBadge,
}) => {
  const allBadges = useMemo(() => getAllBadgeDefs(customBadges), [customBadges]);
  const [selectedCategory, setSelectedCategory] = useState<FilterGroup>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>(
    player.equippedBadgeId || allBadges[0]?.id || 'badge_checkin'
  );

  const equippedList = useMemo(() => {
    if (Array.isArray(player.equippedBadges) && player.equippedBadges.length > 0) {
      return player.equippedBadges.slice(0, 5);
    }
    return player.equippedBadgeId ? [player.equippedBadgeId] : ['badge_checkin'];
  }, [player.equippedBadges, player.equippedBadgeId]);

  const unlockedSet = useMemo(() => new Set(player.unlockedBadges), [player.unlockedBadges]);

  const unlockedCount = useMemo(
    () => allBadges.filter((b) => unlockedSet.has(b.id)).length,
    [allBadges, unlockedSet]
  );

  const totalCount = allBadges.length;
  const progressPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const categoryCounts = useMemo(() => {
    const counts: Record<FilterGroup, number> = {
      All: allBadges.length,
      Achievements: 0,
      'Games & Rooms': 0,
      Rares: 0,
      'Events & Seasonal': 0,
      'Staff & VIP': 0,
    };
    for (const b of allBadges) {
      const grp = normalizeBadgeCategoryGroup(b.category);
      counts[grp] = (counts[grp] ?? 0) + 1;
    }
    return counts;
  }, [allBadges]);

  const filteredBadges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allBadges.filter((b) => {
      if (selectedCategory !== 'All') {
        const grp = normalizeBadgeCategoryGroup(b.category);
        if (grp !== selectedCategory) return false;
      }
      if (!q) return true;
      const meta = getLocalizedBadgeMeta(b, lang);
      return (
        meta.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q) ||
        meta.unlockHint.toLowerCase().includes(q)
      );
    });
  }, [allBadges, selectedCategory, searchQuery, lang]);

  const selectedBadge: BadgeDef =
    allBadges.find((b) => b.id === selectedBadgeId) ??
    filteredBadges[0] ??
    allBadges[0];

  const selectedMeta = getLocalizedBadgeMeta(selectedBadge, lang);
  const selectedUnlocked = unlockedSet.has(selectedBadge.id);
  const selectedEquipped =
    equippedList.includes(selectedBadge.id) || player.equippedBadgeId === selectedBadge.id;

  const getCategoryLabel = (cat: FilterGroup): string => {
    switch (cat) {
      case 'All':
        return t(lang, 'cat_all');
      case 'Achievements':
        return t(lang, 'cat_achievements');
      case 'Games & Rooms':
        return t(lang, 'cat_games_rooms');
      case 'Rares':
        return t(lang, 'cat_rares');
      case 'Events & Seasonal':
        return t(lang, 'cat_events');
      case 'Staff & VIP':
        return t(lang, 'cat_staff_vip');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Progress Header Banner */}
      <div className="holo-box overflow-hidden">
        <div className="holo-box-header blue flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#fde047]" />
            {t(lang, 'badges_page_title')}
          </span>
          <span className="text-[11px] font-bold text-[#fef08a]">
            {t(lang, 'badges_progress', { unlocked: unlockedCount, total: totalCount })} ({progressPct}%)
          </span>
        </div>

        <div className="p-4 bg-gradient-to-b from-[#f8fafc] to-[#eef2f6] space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">
                {t(lang, 'badges_progress', { unlocked: unlockedCount, total: totalCount })}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {t(lang, 'badges_page_subtitle')}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(lang, 'badges_search_placeholder')}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-400 rounded text-xs text-slate-900 focus:outline-none focus:border-[#2b6ca3]"
              />
            </div>
          </div>

          {/* Classic Green Habbo Progress Bar */}
          <div className="w-full h-5 bg-[#1e293b] border border-black rounded p-0.5 shadow-inner">
            <div
              className="h-full rounded-xs transition-all duration-300 flex items-center justify-end pr-2 text-[10px] font-black text-white"
              style={{
                width: `${Math.max(4, progressPct)}%`,
                background: 'linear-gradient(180deg, #4ade80 0%, #16a34a 55%, #15803d 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              {progressPct >= 10 && `${progressPct}%`}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {FILTER_GROUPS.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#2b6ca3] text-white border-black shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>{getCategoryLabel(cat)}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                      active ? 'bg-black/25 text-[#fde047]' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {categoryCounts[cat]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2008 HoloCMS 2-Column Layout: Left All Badges Grid (8 cols) + Right Sticky Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left/Main Column: All Badges Grid */}
        <div className="lg:col-span-8 holo-box overflow-hidden">
          <div className="holo-box-header orange flex items-center justify-between">
            <span>
              {getCategoryLabel(selectedCategory)} ({filteredBadges.length})
            </span>
            <span className="text-[10px] font-normal opacity-95">
              {unlockedCount} {t(lang, 'unlocked')} / {totalCount - unlockedCount} {t(lang, 'locked')}
            </span>
          </div>

          <div className="p-3.5 bg-[#f8fafc] grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[680px] overflow-y-auto">
            {filteredBadges.map((badge) => {
              const isUnlocked = unlockedSet.has(badge.id);
              const isEquipped =
                equippedList.includes(badge.id) || player.equippedBadgeId === badge.id;
              const isSelected = selectedBadge.id === badge.id;
              const meta = getLocalizedBadgeMeta(badge, lang);

              return (
                <div
                  key={badge.id}
                  onClick={() => setSelectedBadgeId(badge.id)}
                  className={`p-2.5 rounded border text-left transition cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[#eff6ff] border-[#1d4ed8] ring-2 ring-[#3b82f6]/35 shadow-sm'
                      : isUnlocked
                      ? 'bg-white border-slate-300 hover:border-[#2b6ca3] hover:bg-slate-50/80'
                      : 'bg-slate-100/90 border-slate-300/80 hover:border-slate-400'
                  }`}
                >
                  {/* 40x40 Shaped Pixel Badge Canvas */}
                  <div
                    className={`w-12 h-12 rounded border flex items-center justify-center shrink-0 relative ${
                      isUnlocked
                        ? 'bg-[#eef2f6] border-slate-300 shadow-inner'
                        : 'bg-slate-200/80 border-slate-300 opacity-60 grayscale'
                    }`}
                  >
                    <PixelBadgeSprite
                      badgeId={badge.id}
                      unlocked={isUnlocked}
                      customBadges={customBadges}
                      size={40}
                    />
                    {!isUnlocked && (
                      <span
                        title={t(lang, 'locked')}
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-black text-white flex items-center justify-center"
                      >
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Badge Info & How to Obtain */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {meta.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[#fde047] font-mono text-[9px] font-bold shrink-0">
                        [{badge.code}]
                      </span>
                    </div>

                    {/* Status Tag Row */}
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-400 text-emerald-900 text-[9px] font-black uppercase">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          {t(lang, 'unlocked')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 border border-slate-400 text-slate-700 text-[9px] font-bold uppercase">
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          {t(lang, 'locked')}
                        </span>
                      )}

                      {isEquipped && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-400 text-amber-900 text-[9px] font-black uppercase">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          {t(lang, 'equipped')}
                        </span>
                      )}
                    </div>

                    {/* How to obtain description */}
                    <div className="mt-1.5 text-[11px] leading-snug text-slate-700">
                      <span className="font-bold text-slate-900">{t(lang, 'how_to_obtain')} </span>
                      <span>{meta.unlockHint}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Badge Inspector & Active 5-Slot Equip Box */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          <div className="holo-box overflow-hidden">
            <div className="holo-box-header green flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t(lang, 'badge_inspector_title')}
              </span>
              <span className="font-mono text-[10px]">[{selectedBadge.code}]</span>
            </div>

            <div className="p-4 bg-white space-y-3.5">
              {/* Enlarged 80x80 Shaped PixelBadgeSprite Preview */}
              <div className="flex items-center gap-3.5 p-3 rounded bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-black text-white shadow-inner">
                <div className="w-20 h-20 rounded bg-black/40 border border-white/15 flex items-center justify-center shrink-0">
                  <PixelBadgeSprite
                    badgeId={selectedBadge.id}
                    unlocked={selectedUnlocked}
                    customBadges={customBadges}
                    size={80}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="inline-block px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/50 text-[#fde047] font-mono text-[10px] font-bold">
                    [{selectedBadge.code}]
                  </div>
                  <h3 className="text-sm font-black text-white mt-1 leading-tight">
                    {selectedMeta.name}
                  </h3>
                  <div className="text-[11px] text-sky-300 font-semibold mt-0.5">
                    {normalizeBadgeCategoryGroup(selectedBadge.category)}
                  </div>
                </div>
              </div>

              {/* Lore Description */}
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {selectedMeta.description}
              </div>

              {/* Exact Unlock Condition */}
              <div className="p-2.5 rounded bg-amber-50/90 border border-amber-300 text-xs text-amber-950">
                <div className="font-black text-[10px] uppercase tracking-wider text-amber-800 mb-0.5">
                  {t(lang, 'how_to_obtain')}
                </div>
                <div className="font-semibold leading-snug">{selectedMeta.unlockHint}</div>
              </div>

              {/* Action Button: Wear Badge / Unequip / Locked */}
              {selectedUnlocked ? (
                <button
                  type="button"
                  data-testid="badges-tab-wear-btn"
                  onClick={() => onEquipBadge(selectedBadge.id)}
                  className={`w-full py-2 px-3 rounded text-xs font-black uppercase tracking-wide cursor-pointer transition ${
                    selectedEquipped
                      ? 'habbo-btn-blue'
                      : 'habbo-btn-green'
                  }`}
                >
                  {selectedEquipped ? t(lang, 'unequip_badge') : t(lang, 'wear_badge')}
                </button>
              ) : (
                <div className="w-full py-2 px-3 rounded bg-slate-200 border border-slate-400 text-slate-600 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  {t(lang, 'locked')} — {selectedMeta.unlockHint}
                </div>
              )}
            </div>
          </div>

          {/* Active 5 Profile Badge Slots */}
          <div className="holo-box overflow-hidden">
            <div className="holo-box-header dark flex items-center justify-between">
              <span>{t(lang, 'active_badge_slots')}</span>
              <span className="text-[10px] text-[#fde047] font-bold">
                {equippedList.length} / 5
              </span>
            </div>
            <div className="p-3.5 bg-white">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const slotBadgeId = equippedList[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (slotBadgeId) setSelectedBadgeId(slotBadgeId);
                      }}
                      title={
                        slotBadgeId
                          ? `${slotBadgeId} (Click to inspect)`
                          : `Empty Slot #${idx + 1}`
                      }
                      className={`h-12 rounded border flex items-center justify-center cursor-pointer transition ${
                        slotBadgeId
                          ? 'bg-[#eef2f6] border-slate-400 hover:border-[#2b6ca3] shadow-xs'
                          : 'bg-slate-100 border-dashed border-slate-300 text-[10px] text-slate-400 font-bold'
                      }`}
                    >
                      {slotBadgeId ? (
                        <PixelBadgeSprite
                          badgeId={slotBadgeId}
                          unlocked={true}
                          customBadges={customBadges}
                          size={40}
                        />
                      ) : (
                        idx + 1
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

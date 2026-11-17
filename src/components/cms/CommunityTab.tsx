import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Coins,
  Crown,
  Minus,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { RANK_META } from '../../game/accountsDb';
import type {
  CustomBadgeDef,
  NewsArticle,
  PlayerState,
  RareValueItem,
  UserAccount,
} from '../../game/types';
import { PixelBadge, PixelFurniCanvas, PixelHeadCanvas } from '../PixelSpriteCanvas';
import { BadgesPage } from './BadgesPage';

interface CommunityTabProps {
  rareValues: RareValueItem[];
  news: NewsArticle[];
  player: PlayerState;
  accounts?: UserAccount[];
  customBadges?: CustomBadgeDef[];
  onEquipBadge: (badgeId: string) => void;
}

export function CommunityTab({
  rareValues,
  news,
  player,
  accounts = [],
  customBadges = [],
  onEquipBadge,
}: CommunityTabProps) {
  const [subTab, setSubTab] = useState<'rares' | 'leaderboard' | 'badges'>('rares');

  const richestCitizens = useMemo(
    () =>
      [...accounts]
        .filter((a) => !a.banned)
        .sort((a, b) => b.playerState.credits - a.playerState.credits)
        .slice(0, 8),
    [accounts]
  );

  const topBadgeCollectors = useMemo(
    () =>
      [...accounts]
        .filter((a) => !a.banned)
        .sort(
          (a, b) =>
            b.playerState.unlockedBadges.length - a.playerState.unlockedBadges.length ||
            b.playerState.duckets - a.playerState.duckets
        )
        .slice(0, 8),
    [accounts]
  );

  return (
    <div className="space-y-5">
      {/* Sub-navigation under Community */}
      <div className="habbo-box flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('rares')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
              subTab === 'rares'
                ? 'bg-[#235c8a] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Rare Values &amp; News
          </button>
          <button
            type="button"
            data-testid="community-hall-of-fame-btn"
            onClick={() => setSubTab('leaderboard')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
              subTab === 'leaderboard'
                ? 'bg-[#d97706] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            PIXL Hall of Fame
          </button>
          <button
            type="button"
            onClick={() => setSubTab('badges')}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
              subTab === 'badges'
                ? 'bg-[#7c3aed] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Badges ({player.unlockedBadges.length})
          </button>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          PIXL Community Hub · Rare Index, Leaderboards &amp; Pixel Badges
        </span>
      </div>

      {subTab === 'badges' && (
        <BadgesPage player={player} customBadges={customBadges} onEquipBadge={onEquipBadge} />
      )}

      {subTab === 'leaderboard' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" data-testid="community-hall-of-fame">
          {/* Richest PIXL Citizens */}
          <section className="habbo-box lg:col-span-6">
            <div className="habbo-box-header flex items-center justify-between bg-[#d97706]">
              <span className="inline-flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#fef08a]" />
                Richest PIXL Citizens (Credits)
              </span>
              <span className="text-xs text-amber-100">Live Account DB</span>
            </div>
            <div className="divide-y divide-slate-200">
              {richestCitizens.map((acc, index) => {
                const rankMeta = RANK_META[acc.rank];
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between gap-3 p-3.5 hover:bg-amber-50/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full font-mono-num text-xs font-extrabold shrink-0 ${
                          index === 0
                            ? 'bg-[#ffd400] text-slate-950 border border-[#b45309]'
                            : index === 1
                            ? 'bg-slate-200 text-slate-800 border border-slate-400'
                            : index === 2
                            ? 'bg-amber-200 text-amber-950 border border-amber-500'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <div className="rounded border border-slate-300 bg-[#e8f4fc] p-0.5 shrink-0">
                        <PixelHeadCanvas look={acc.playerState.look} size={34} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-extrabold text-slate-900">
                            {acc.username}
                          </span>
                          <PixelBadge code={rankMeta.badgeCode} />
                        </div>
                        <p className="truncate text-[11px] italic text-slate-500">
                          &ldquo;{acc.playerState.motto}&rdquo;
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 font-mono-num text-sm font-extrabold text-amber-800">
                        <Coins className="h-3.5 w-3.5 text-[#d97706]" />
                        {acc.playerState.credits.toLocaleString()}c
                      </span>
                      <p className="font-mono-num text-[10px] font-bold text-slate-500">
                        {acc.playerState.hcDays}d VIP
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top Badge & Ducket Collectors */}
          <section className="habbo-box lg:col-span-6">
            <div className="habbo-box-header flex items-center justify-between bg-[#7c3aed]">
              <span className="inline-flex items-center gap-2">
                <Crown className="h-4 w-4 text-[#fde047]" />
                Top Badge &amp; Ducket Collectors
              </span>
              <span className="text-xs text-purple-100">Ranked by Unlocked Crests</span>
            </div>
            <div className="divide-y divide-slate-200">
              {topBadgeCollectors.map((acc, index) => {
                const rankMeta = RANK_META[acc.rank];
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between gap-3 p-3.5 hover:bg-purple-50/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full font-mono-num text-xs font-extrabold shrink-0 ${
                          index === 0
                            ? 'bg-[#7c3aed] text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <div className="rounded border border-slate-300 bg-[#e8f4fc] p-0.5 shrink-0">
                        <PixelHeadCanvas look={acc.playerState.look} size={34} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-extrabold text-slate-900">
                            {acc.username}
                          </span>
                          <PixelBadge code={rankMeta.badgeCode} />
                        </div>
                        <p className="truncate text-[11px] text-slate-500">
                          {rankMeta.label}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 font-mono-num text-sm font-extrabold text-[#7c3aed]">
                        <Award className="h-3.5 w-3.5" />
                        {acc.playerState.unlockedBadges.length} badges
                      </span>
                      <p className="inline-flex items-center justify-end gap-1 w-full font-mono-num text-[10px] font-bold text-slate-500">
                        <Sparkles className="h-2.5 w-2.5 text-[#a855f7]" />
                        {acc.playerState.duckets.toLocaleString()}d
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {subTab === 'rares' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* RARE VALUES WATCH */}
          <section className="habbo-box lg:col-span-8">
            <div className="habbo-box-header flex items-center justify-between bg-[#b45309]">
              <span className="inline-flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#fef08a]" />
                Official PIXL Rare Values
              </span>
              <span className="text-xs text-amber-100">Updated Daily by PIXL Traders</span>
            </div>

            <div className="divide-y divide-slate-200">
              {rareValues.map((rare) => (
                <div
                  key={rare.furniId}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-amber-50/40"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-md border border-slate-200 bg-[#f8fafc] shrink-0">
                      <PixelFurniCanvas furniId={rare.furniId} size={50} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">{rare.name}</h3>
                      <p className="text-xs font-medium text-slate-500">{rare.edition}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Coins className="h-4 w-4 text-[#d97706]" />
                        <span className="font-mono-num text-lg font-extrabold text-slate-900">
                          {rare.creditsValue}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">c</span>
                      </div>
                      <div
                        className={`mt-0.5 inline-flex items-center gap-1 text-xs font-bold ${
                          rare.trend === 'up'
                            ? 'text-emerald-700'
                            : rare.trend === 'down'
                            ? 'text-rose-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {rare.trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5" />}
                        {rare.trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5" />}
                        {rare.trend === 'stable' && <Minus className="h-3.5 w-3.5" />}
                        <span className="font-mono-num">{rare.changePct}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* COMMUNITY HIGHLIGHTS & PIXL WAY */}
          <aside className="space-y-6 lg:col-span-4">
            <section className="habbo-box">
              <div className="habbo-box-header bg-[#235c8a]">Recent PIXL Bulletins</div>
              <div className="divide-y divide-slate-200">
                {news.map((item) => (
                  <div key={item.id} className="p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      {item.tag} · {item.date}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.summary}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="habbo-box">
              <div className="habbo-box-header bg-[#1e9d54]">The PIXL Way</div>
              <div className="p-4 text-xs leading-relaxed text-slate-700 space-y-2">
                <p>
                  <strong>1. Chat &amp; Make Friends:</strong> Welcome new PIXLs in the Lobby and keep conversations friendly.
                </p>
                <p>
                  <strong>2. Trade Fairly:</strong> Check Rare Values before swapping Thrones, Dragon Lamps, or Club Sofas.
                </p>
                <p>
                  <strong>3. Respect Staff:</strong> Hotel Managers &amp; Moderators carry official pixel badges.
                </p>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

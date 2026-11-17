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
import { FurniPreviewImg, PixelBadge, PixelHeadCanvas } from '../PixelSpriteCanvas';
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
      <div className="habbo-box flex flex-wrap items-center justify-between gap-3 bg-white px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('rares')}
            className={`inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
              subTab === 'rares'
                ? 'border-[#000000] bg-[#2b6ca3] text-white'
                : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Rare Values &amp; News
          </button>
          <button
            type="button"
            data-testid="community-hall-of-fame-btn"
            onClick={() => setSubTab('leaderboard')}
            className={`inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
              subTab === 'leaderboard'
                ? 'border-[#000000] bg-[#d9660b] text-white'
                : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            PIXL Hall of Fame
          </button>
          <button
            type="button"
            onClick={() => setSubTab('badges')}
            className={`inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
              subTab === 'badges'
                ? 'border-[#000000] bg-[#365672] text-white'
                : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Badges ({player.unlockedBadges.length})
          </button>
        </div>
        <span className="text-[11px] font-bold text-[#475569]">
          PIXL Community Hub · Rare Index, Leaderboards &amp; Pixel Badges
        </span>
      </div>

      {subTab === 'badges' && (
        <BadgesPage player={player} customBadges={customBadges} onEquipBadge={onEquipBadge} />
      )}

      {subTab === 'leaderboard' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12" data-testid="community-hall-of-fame">
          <section className="habbo-box lg:col-span-6">
            <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-[#fef08a]" />
                Richest PIXL Citizens (Credits)
              </span>
              <span className="text-[10px] text-amber-100">Live Account DB</span>
            </div>
            <div className="divide-y divide-[#cbd5e1]">
              {richestCitizens.map((acc, index) => {
                const rankMeta = RANK_META[acc.rank];
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-[#fffbeb]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-[2px] border font-mono-num text-[11px] font-bold shrink-0 ${
                          index === 0
                            ? 'bg-[#ffd400] text-[#111827] border-[#000000]'
                            : index === 1
                            ? 'bg-[#e2e8f0] text-[#1f2937] border-[#000000]'
                            : index === 2
                            ? 'bg-[#fde68a] text-[#78350f] border-[#000000]'
                            : 'bg-[#f1f5f9] text-[#475569] border-[#94a3b8]'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <div className="rounded-[2px] border border-[#000000] bg-[#e8f4fc] p-0.5 shrink-0">
                        <PixelHeadCanvas look={acc.playerState.look} size={32} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-bold text-[#111827]">
                            {acc.username}
                          </span>
                          <PixelBadge code={rankMeta.badgeCode} />
                        </div>
                        <p className="truncate text-[10px] italic text-[#475569]">
                          &ldquo;{acc.playerState.motto}&rdquo;
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 font-mono-num text-[13px] font-bold text-[#92400e]">
                        <Coins className="h-3.5 w-3.5 text-[#d97706]" />
                        {acc.playerState.credits.toLocaleString()}c
                      </span>
                      <p className="font-mono-num text-[10px] font-bold text-[#64748b]">
                        {acc.playerState.hcDays}d HC
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="habbo-box lg:col-span-6">
            <div className="habbo-box-header habbo-header-dark flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 text-[#fde047]" />
                Top Badge &amp; Ducket Collectors
              </span>
              <span className="text-[10px] text-sky-100">Ranked by Unlocked Crests</span>
            </div>
            <div className="divide-y divide-[#cbd5e1]">
              {topBadgeCollectors.map((acc, index) => {
                const rankMeta = RANK_META[acc.rank];
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-[#f8fafc]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-[2px] border font-mono-num text-[11px] font-bold shrink-0 ${
                          index === 0
                            ? 'bg-[#365672] text-white border-[#000000]'
                            : 'bg-[#f1f5f9] text-[#334155] border-[#94a3b8]'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <div className="rounded-[2px] border border-[#000000] bg-[#e8f4fc] p-0.5 shrink-0">
                        <PixelHeadCanvas look={acc.playerState.look} size={32} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-bold text-[#111827]">
                            {acc.username}
                          </span>
                          <PixelBadge code={rankMeta.badgeCode} />
                        </div>
                        <p className="truncate text-[10px] text-[#475569]">{rankMeta.label}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 font-mono-num text-[12px] font-bold text-[#1d4e78]">
                        <Award className="h-3.5 w-3.5 text-[#d97706]" />
                        {acc.playerState.unlockedBadges.length} badges
                      </span>
                      <p className="inline-flex items-center justify-end gap-1 w-full font-mono-num text-[10px] font-bold text-[#64748b]">
                        <Sparkles className="h-2.5 w-2.5 text-[#7c3aed]" />
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="habbo-box lg:col-span-8">
            <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-[#fef08a]" />
                Official PIXL Rare Values
              </span>
              <span className="text-[10px] text-amber-100">Updated Daily by PIXL Traders</span>
            </div>

            <div className="divide-y divide-[#cbd5e1]">
              {rareValues.map((rare) => (
                <div
                  key={rare.furniId}
                  className="flex items-center justify-between gap-4 p-3.5 hover:bg-[#fffbeb]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[2px] border border-[#000000] bg-[#f8fafc] shrink-0">
                      <FurniPreviewImg itemType={rare.furniId} alt={rare.name} size={46} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#111827]">{rare.name}</h3>
                      <p className="text-[11px] font-semibold text-[#64748b]">{rare.edition}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Coins className="h-3.5 w-3.5 text-[#d97706]" />
                      <span className="font-mono-num text-[16px] font-bold text-[#111827]">
                        {rare.creditsValue}
                      </span>
                      <span className="text-[11px] font-bold text-[#64748b]">c</span>
                    </div>
                    <div
                      className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold ${
                        rare.trend === 'up'
                          ? 'text-[#15803d]'
                          : rare.trend === 'down'
                          ? 'text-[#b91c1c]'
                          : 'text-[#64748b]'
                      }`}
                    >
                      {rare.trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5" />}
                      {rare.trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5" />}
                      {rare.trend === 'stable' && <Minus className="h-3.5 w-3.5" />}
                      <span className="font-mono-num">{rare.changePct}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-5 lg:col-span-4">
            <section className="habbo-box">
              <div className="habbo-box-header habbo-header-blue">Recent PIXL Bulletins</div>
              <div className="divide-y divide-[#cbd5e1]">
                {news.map((item) => (
                  <div key={item.id} className="p-3.5">
                    <span className="text-[10px] font-bold text-[#64748b]">
                      {item.tag} · {item.date}
                    </span>
                    <h3 className="mt-1 text-[13px] font-bold text-[#111827]">{item.title}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#475569]">{item.summary}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="habbo-box">
              <div className="habbo-box-header habbo-header-green">The PIXL Way</div>
              <div className="p-3.5 text-[11px] leading-relaxed text-[#334155] space-y-2">
                <p>
                  <strong>1. Chat &amp; Make Friends:</strong> Welcome new PIXLs in The Lido or Welcome Lounge.
                </p>
                <p>
                  <strong>2. Trade Fairly:</strong> Check Rare Values before swapping Thrones or Dragon Lamps.
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

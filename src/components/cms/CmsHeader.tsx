import {
  Globe,
  LogOut,
  Shield,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  User,
  Users,
} from 'lucide-react';
import { getRankBadgeCode } from '../../game/accountsDb';
import { formatOnlineCountLabel } from '../../game/clientFeatures';
import type { AccountRank, CmsTab } from '../../game/types';
import { PixelBadge } from '../PixelSpriteCanvas';

interface CmsHeaderProps {
  activeTab: CmsTab;
  onSelectTab: (tab: CmsTab) => void;
  onEnterHotel: () => void;
  onlineCount: number;
  username: string;
  rank: AccountRank;
  credits?: number;
  duckets?: number;
  hcDays?: number;
  friendsCount?: number;
  muted?: boolean;
  onToggleMute?: () => void;
  onSignOut: () => void;
}

const BASE_TABS: {
  id: CmsTab;
  label: string;
  icon: 'me' | 'community' | 'staff' | 'friends' | 'wardrobe' | 'shop';
}[] = [
  { id: 'me', label: 'Me', icon: 'me' },
  { id: 'community', label: 'Community', icon: 'community' },
  { id: 'staff', label: 'Staff', icon: 'staff' },
  { id: 'friends', label: 'Players', icon: 'friends' },
  { id: 'wardrobe', label: 'Wardrobe', icon: 'wardrobe' },
  { id: 'shop', label: 'Shop', icon: 'shop' },
];

function TabIcon({ icon }: { icon: (typeof BASE_TABS)[number]['icon'] }) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  if (icon === 'me') return <User className={cls} />;
  if (icon === 'community') return <Globe className={cls} />;
  if (icon === 'staff') return <ShieldCheck className={cls} />;
  if (icon === 'friends') return <Users className={cls} />;
  if (icon === 'wardrobe') return <Shirt className={cls} />;
  return <ShoppingBag className={cls} />;
}

export function CmsHeader({
  activeTab,
  onSelectTab,
  onEnterHotel,
  onlineCount,
  username,
  rank,
  credits = 0,
  duckets = 0,
  hcDays = 0,
  friendsCount = 0,
  onSignOut,
}: CmsHeaderProps) {
  const showHousekeeping = rank >= 4;
  const rankBadge = rank >= 2 ? getRankBadgeCode(rank) : null;
  const onlineLabel = formatOnlineCountLabel(onlineCount);

  return (
    <header className="relative w-full max-w-full overflow-hidden bg-gradient-to-b from-[#5ab4f2] via-[#8fd0fb] to-[#bce0fd]">
      {/* Classic Top Utility Strip */}
      <div className="relative z-20 border-b border-[#000000] bg-[#173e62] text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-1 text-[11px] sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-pixel text-[10px] tracking-wider text-[#ffd400]">PIXL HOTEL</span>
            <span className="text-sky-300/60" aria-hidden="true">
              ·
            </span>
            <span className="truncate font-semibold text-sky-100">
              Welcome, <strong className="text-white">{username}</strong>
            </span>
            {rankBadge && <PixelBadge code={rankBadge} />}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-2.5 sm:flex text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 font-mono-num text-[#fde047]">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-[#78350f] bg-[#ffd400]" />
                {credits.toLocaleString()}c
              </span>
              <span className="text-sky-300/40" aria-hidden="true">
                |
              </span>
              <span className="inline-flex items-center gap-1 font-mono-num text-[#e9d5ff]">
                <span className="inline-block h-2.5 w-2.5 rotate-45 border border-[#581c87] bg-[#c084fc]" />
                {duckets.toLocaleString()}d
              </span>
              <span className="text-sky-300/40" aria-hidden="true">
                |
              </span>
              <span className="inline-flex items-center gap-1 font-mono-num text-amber-200">
                {hcDays}d HC
              </span>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              aria-label="Logout / Switch Account"
              title="Logout"
              className="inline-flex items-center gap-1 rounded-[2px] border border-[#000000] bg-[#245987] px-2 py-0.5 text-[10px] font-bold text-white hover:bg-[#2f6ea4] cursor-pointer"
            >
              <LogOut className="h-3 w-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Pixel Clouds & Detailed Pixel-Art Habbo Skyline */}
      <div className="pointer-events-none absolute inset-x-0 top-6 bottom-8 overflow-hidden" aria-hidden="true">
        <svg className="absolute left-6 top-2 h-9 w-36 opacity-90" viewBox="0 0 120 32" shapeRendering="crispEdges">
          <rect x="20" y="8" width="60" height="16" fill="#ffffff" />
          <rect x="8" y="14" width="84" height="12" fill="#ffffff" />
          <rect x="32" y="2" width="32" height="10" fill="#ffffff" />
          <rect x="8" y="24" width="84" height="3" fill="#d8efff" />
        </svg>
        <svg className="absolute left-1/3 top-1 h-8 w-32 opacity-85 hidden md:block" viewBox="0 0 120 32" shapeRendering="crispEdges">
          <rect x="24" y="10" width="52" height="14" fill="#ffffff" />
          <rect x="12" y="15" width="76" height="11" fill="#ffffff" />
          <rect x="36" y="4" width="24" height="8" fill="#ffffff" />
        </svg>
        <svg className="absolute right-8 top-2 h-10 w-44 opacity-90" viewBox="0 0 140 32" shapeRendering="crispEdges">
          <rect x="30" y="6" width="72" height="16" fill="#ffffff" />
          <rect x="14" y="13" width="104" height="13" fill="#ffffff" />
          <rect x="48" y="1" width="34" height="8" fill="#ffffff" />
          <rect x="14" y="24" width="104" height="3" fill="#d8efff" />
        </svg>

        {/* Bottom Horizon Skyline across full header width */}
        <svg
          className="absolute bottom-0 left-0 h-14 w-full"
          viewBox="0 0 1200 56"
          preserveAspectRatio="xMidYMax slice"
          shapeRendering="crispEdges"
        >
          {/* Distant pastel buildings */}
          <rect x="0" y="42" width="1200" height="14" fill="#89bee8" />
          <rect x="24" y="26" width="36" height="30" fill="#77b0de" />
          <rect x="68" y="18" width="44" height="38" fill="#68a3d3" />
          <rect x="124" y="30" width="32" height="26" fill="#77b0de" />
          <rect x="240" y="22" width="48" height="34" fill="#68a3d3" />
          <rect x="310" y="28" width="36" height="28" fill="#77b0de" />
          <rect x="415" y="16" width="56" height="40" fill="#68a3d3" />
          <rect x="492" y="26" width="34" height="30" fill="#77b0de" />

          {/* Detailed Pixel Hotel Complex (Center-Right) */}
          <rect x="570" y="20" width="44" height="36" fill="#4f83ae" />
          <rect x="576" y="26" width="6" height="6" fill="#fef08a" />
          <rect x="588" y="26" width="6" height="6" fill="#bae6fd" />
          <rect x="600" y="26" width="6" height="6" fill="#fef08a" />

          {/* Iconic Orange Main Hotel Tower + Rooftop Pool */}
          <rect x="620" y="6" width="68" height="50" fill="#d9660b" />
          <rect x="624" y="8" width="60" height="48" fill="#f58220" />
          <rect x="638" y="2" width="32" height="6" fill="#1d4e78" />
          <rect x="646" y="4" width="16" height="4" fill="#38bdf8" />
          <rect x="630" y="14" width="8" height="6" fill="#fef08a" />
          <rect x="644" y="14" width="8" height="6" fill="#fef08a" />
          <rect x="658" y="14" width="8" height="6" fill="#bae6fd" />
          <rect x="672" y="14" width="6" height="6" fill="#fef08a" />
          <rect x="630" y="24" width="8" height="6" fill="#bae6fd" />
          <rect x="644" y="24" width="8" height="6" fill="#fef08a" />
          <rect x="658" y="24" width="8" height="6" fill="#fef08a" />
          <rect x="672" y="24" width="6" height="6" fill="#bae6fd" />
          <rect x="630" y="34" width="8" height="6" fill="#fef08a" />
          <rect x="644" y="34" width="8" height="6" fill="#bae6fd" />
          <rect x="658" y="34" width="8" height="6" fill="#fef08a" />

          {/* Lido Sun Deck Terrace Wing + Palm Tree */}
          <rect x="694" y="24" width="58" height="32" fill="#2b6ca3" />
          <rect x="694" y="20" width="58" height="5" fill="#e2d9c5" />
          <rect x="702" y="20" width="32" height="3" fill="#29b6f6" />
          <rect x="738" y="10" width="4" height="12" fill="#78350f" />
          <rect x="732" y="6" width="16" height="5" fill="#22c55e" />
          <rect x="700" y="30" width="6" height="6" fill="#fef08a" />
          <rect x="712" y="30" width="6" height="6" fill="#bae6fd" />
          <rect x="724" y="30" width="6" height="6" fill="#fef08a" />
          <rect x="736" y="30" width="6" height="6" fill="#fef08a" />

          {/* Far Right Buildings */}
          <rect x="768" y="14" width="46" height="42" fill="#5b8db8" />
          <rect x="776" y="20" width="6" height="6" fill="#fef08a" />
          <rect x="790" y="20" width="6" height="6" fill="#bae6fd" />
          <rect x="830" y="22" width="40" height="34" fill="#68a3d3" />
          <rect x="910" y="18" width="54" height="38" fill="#5b8db8" />
          <rect x="984" y="28" width="42" height="28" fill="#77b0de" />
          <rect x="1060" y="16" width="52" height="40" fill="#68a3d3" />
          <rect x="1132" y="24" width="46" height="32" fill="#77b0de" />
        </svg>
      </div>

      {/* Main Banner Row: Classic Gold/Orange PIXL Logo + White Online Speech Bubble + Enter Hotel */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 pt-4 pb-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onSelectTab('me')}
            className="group relative flex items-center gap-2 rounded-[3px] border border-[#000000] bg-gradient-to-b from-[#ffe259] via-[#ffd400] to-[#f59e0b] px-3 py-1.5 shadow-[inset_0_1px_0_#fff9c4,0_3px_0_#78350f] sm:px-4 sm:py-2 cursor-pointer"
          >
            <svg className="h-6 w-6 sm:h-7 sm:w-7 shrink-0" viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
              <rect x="6" y="2" width="12" height="3" fill="#dc2626" />
              <rect x="4" y="5" width="16" height="14" fill="#1e3a8a" />
              <rect x="6" y="7" width="12" height="10" fill="#38bdf8" />
              <rect x="8" y="9" width="4" height="4" fill="#fef08a" />
              <rect x="12" y="13" width="4" height="3" fill="#ffffff" />
            </svg>
            <div className="flex items-baseline gap-1.5">
              <span className="font-pixel text-lg tracking-wider text-[#111827] drop-shadow-[1px_1px_0_#ffffff] sm:text-2xl">
                PIXL
              </span>
              <span className="rounded-[2px] border border-[#000000] bg-[#991b1b] px-1.5 py-0.5 font-pixel text-[8px] font-bold text-[#fef08a] sm:text-[10px]">
                HOTEL
              </span>
            </div>
          </button>

          {/* Classic Glossy White Speech Bubble: "1 PIXL online now!" / "X PIXLs online now!" */}
          <div className="relative hidden sm:inline-flex items-center gap-2 rounded-[4px] border border-[#000000] bg-gradient-to-b from-[#ffffff] to-[#f1f5f9] px-3 py-1.5 text-[11px] font-bold text-[#0f3454] shadow-[inset_0_1px_0_#ffffff,0_2px_0_rgba(0,0,0,0.22)]">
            <span className="inline-block h-2.5 w-2.5 rounded-[1px] border border-[#14532d] bg-[#22c55e]" />
            <span data-testid="cms-online-count-label">{onlineLabel}</span>
            <span
              aria-hidden="true"
              className="absolute -bottom-[6px] left-4 h-2.5 w-2.5 rotate-45 border-b border-r border-[#000000] bg-[#f1f5f9]"
            />
          </div>
        </div>

        {/* Compact Top-Right Enter Hotel Button (also visible on narrow screens) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex sm:hidden items-center gap-1 rounded-[3px] border border-[#000000] bg-white px-2 py-1 text-[10px] font-bold text-[#0f3454]">
            <span className="inline-block h-2 w-2 rounded-[1px] bg-[#22c55e] border border-[#14532d]" />
            <span>{onlineCount}</span>
          </div>

          <button
            type="button"
            data-start="true"
            onClick={onEnterHotel}
            className="habbo-btn-green px-3 py-1.5 font-pixel text-[10px] tracking-tight sm:px-4 sm:py-2 sm:text-xs sm:tracking-wide whitespace-nowrap shrink-0 cursor-pointer"
          >
            ENTER HOTEL &raquo;
          </button>
        </div>
      </div>

      {/* Classic 2008 HoloCMS Folder Tabs — Active white tab connects seamlessly into the white page body */}
      <nav
        aria-label="CMS sections"
        className="relative z-10 w-full max-w-full overflow-x-auto whitespace-nowrap no-scrollbar border-b border-[#000000]"
      >
        <div className="mx-auto flex w-max min-w-full max-w-6xl flex-nowrap items-end gap-1 px-3 pt-1 sm:px-6">
          {BASE_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-t-[4px] border-t border-x border-[#000000] px-3 py-1.5 text-[11px] sm:px-4 sm:text-[12px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'relative -mb-[1px] border-b border-b-[#ffffff] bg-[#ffffff] pb-[7px] text-[#0f3454] shadow-[inset_0_2px_0_#f58220]'
                    : 'bg-gradient-to-b from-[#3d7eb8] to-[#23598a] text-white shadow-[inset_0_1px_0_#7eb6e6] hover:from-[#4b8ec7] hover:to-[#2b6ca3]'
                }`}
              >
                <TabIcon icon={tab.icon} />
                <span>{tab.label}</span>
                {tab.id === 'friends' && friendsCount > 0 && (
                  <span
                    className={`ml-0.5 rounded-[2px] border border-[#000000]/30 px-1 py-0.2 font-mono-num text-[10px] font-bold ${
                      active ? 'bg-[#dbeafe] text-[#1d4e78]' : 'bg-[#123656] text-sky-200'
                    }`}
                  >
                    {friendsCount}
                  </span>
                )}
              </button>
            );
          })}

          {showHousekeeping && (
            <button
              key="housekeeping"
              type="button"
              data-testid="nav-housekeeping-tab"
              onClick={() => onSelectTab('housekeeping')}
              className={`ml-auto inline-flex items-center gap-1.5 rounded-t-[4px] border-t border-x border-[#000000] px-3 py-1.5 text-[11px] sm:px-4 sm:text-[12px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'housekeeping'
                  ? 'relative -mb-[1px] border-b border-b-[#ffffff] bg-[#ffffff] pb-[7px] text-[#991b1b] shadow-[inset_0_2px_0_#dc2626]'
                  : 'bg-gradient-to-b from-[#b91c1c] to-[#7f1d1d] text-white shadow-[inset_0_1px_0_#f87171] hover:from-[#dc2626] hover:to-[#991b1b]'
              }`}
            >
              <Shield className={`h-3.5 w-3.5 ${activeTab === 'housekeeping' ? 'text-[#b91c1c]' : 'text-[#fde047]'}`} />
              Housekeeping
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

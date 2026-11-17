import {
  Coins,
  Crown,
  Globe,
  LogOut,
  Shield,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { getRankBadgeCode } from '../../game/accountsDb';
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
  icon: 'me' | 'friends' | 'wardrobe' | 'community' | 'staff' | 'shop';
}[] = [
  { id: 'me', label: 'Me', icon: 'me' },
  { id: 'friends', label: 'Players & Friends', icon: 'friends' },
  { id: 'wardrobe', label: 'Wardrobe', icon: 'wardrobe' },
  { id: 'community', label: 'Community', icon: 'community' },
  { id: 'staff', label: 'Staff', icon: 'staff' },
  { id: 'shop', label: 'Shop & Vouchers', icon: 'shop' },
];

function TabIcon({ icon }: { icon: (typeof BASE_TABS)[number]['icon'] }) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  if (icon === 'me') return <User className={cls} />;
  if (icon === 'friends') return <Users className={cls} />;
  if (icon === 'wardrobe') return <Shirt className={cls} />;
  if (icon === 'community') return <Globe className={cls} />;
  if (icon === 'staff') return <ShieldCheck className={cls} />;
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

  return (
    <header className="relative w-full max-w-full overflow-hidden border-b-4 border-[#154c79] bg-gradient-to-b from-[#55b6f6] via-[#89cdfa] to-[#bce0fd]">
      {/* Top Account & Live Wallet Utility Bar */}
      <div className="relative z-10 border-b border-[#3a8bc2]/50 bg-[#0f3454]/90 text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-1.5 text-xs sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-pixel text-[10px] tracking-wider text-[#ffd400]">PIXL CMS v2.6</span>
            <span className="text-sky-300/60" aria-hidden="true">
              ·
            </span>
            <span className="truncate font-semibold text-sky-100">
              Signed in as <strong className="text-white">{username}</strong>
            </span>
            {rankBadge && <PixelBadge code={rankBadge} />}
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <span className="inline-flex items-center gap-1 font-mono-num font-bold text-[#fde047]">
              <Coins className="h-3.5 w-3.5 text-[#f59e0b]" />
              {credits.toLocaleString()}c
            </span>
            <span className="text-sky-300/40" aria-hidden="true">
              |
            </span>
            <span className="inline-flex items-center gap-1 font-mono-num font-bold text-[#e9d5ff]">
              <Sparkles className="h-3.5 w-3.5 text-[#c084fc]" />
              {duckets.toLocaleString()}d
            </span>
            <span className="text-sky-300/40" aria-hidden="true">
              |
            </span>
            <span className="inline-flex items-center gap-1 font-mono-num font-bold text-amber-200">
              <Crown className="h-3.5 w-3.5 text-[#facc15]" />
              {hcDays}d VIP
            </span>
          </div>
        </div>
      </div>

      {/* Decorative Pixel Clouds */}
      <div className="pointer-events-none absolute inset-0 top-7 overflow-hidden opacity-85" aria-hidden="true">
        <svg className="absolute left-4 top-2 h-9 w-32 sm:left-8 sm:top-3 sm:h-10 sm:w-36" viewBox="0 0 120 32" shapeRendering="crispEdges">
          <rect x="20" y="8" width="60" height="16" fill="#ffffff" />
          <rect x="8" y="14" width="84" height="12" fill="#ffffff" />
          <rect x="32" y="2" width="32" height="10" fill="#ffffff" />
          <rect x="8" y="24" width="84" height="3" fill="#d8efff" />
        </svg>
        <svg className="absolute right-8 top-3 h-9 w-36 sm:right-20 sm:top-4 sm:h-10 sm:w-44" viewBox="0 0 140 32" shapeRendering="crispEdges">
          <rect x="30" y="6" width="72" height="16" fill="#ffffff" />
          <rect x="14" y="13" width="104" height="13" fill="#ffffff" />
          <rect x="48" y="1" width="34" height="8" fill="#ffffff" />
          <rect x="14" y="24" width="104" height="3" fill="#d8efff" />
        </svg>
      </div>

      {/* PIXL Hotel Skyline Banner */}
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 pt-3 pb-2.5 sm:gap-4 sm:px-6 sm:pt-4 sm:pb-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => onSelectTab('me')}
            className="group relative flex items-center gap-2 rounded-lg border-2 border-[#1b1922] bg-gradient-to-b from-[#ffe14d] via-[#ffd400] to-[#f59e0b] px-2.5 py-1.5 shadow-[0_3px_0_#92400e] sm:px-3.5 sm:py-2 sm:shadow-[0_4px_0_#92400e] cursor-pointer"
          >
            {/* Isometric Pixel Cube + Crown Crest */}
            <svg className="h-6 w-6 sm:h-7 sm:w-7 shrink-0" viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
              <rect x="6" y="2" width="12" height="3" fill="#dc2626" />
              <rect x="4" y="5" width="16" height="14" fill="#1e3a8a" />
              <rect x="6" y="7" width="12" height="10" fill="#38bdf8" />
              <rect x="8" y="9" width="4" height="4" fill="#fef08a" />
              <rect x="12" y="13" width="4" height="3" fill="#ffffff" />
            </svg>
            <div className="flex items-baseline gap-1.5">
              <span className="font-pixel text-base tracking-wider text-[#1b1922] drop-shadow-[1px_1px_0_#ffffff] sm:text-2xl">
                PIXL
              </span>
              <span className="rounded bg-[#991b1b] px-1.5 py-0.5 font-pixel text-[8px] font-bold text-[#fef08a] sm:text-[10px]">
                HOTEL
              </span>
            </div>
          </button>

          <div className="hidden items-center gap-2 rounded-md border border-[#4a8ec2] bg-white/95 px-3 py-1.5 text-xs font-bold text-[#0f3454] shadow-sm sm:flex">
            <span className="font-mono-num text-[#0284c7]">{onlineCount}</span>
            <span>PIXLs online</span>
          </div>
        </div>

        {/* Panoramic Pixel Resort Skyline */}
        <div className="hidden items-end gap-1 lg:flex" aria-hidden="true">
          <svg className="h-14 w-64" viewBox="0 0 220 48" shapeRendering="crispEdges">
            <rect x="10" y="18" width="24" height="30" fill="#5b8db8" />
            <rect x="14" y="22" width="4" height="4" fill="#fef08a" />
            <rect x="24" y="22" width="4" height="4" fill="#bae6fd" />
            <rect x="14" y="30" width="4" height="4" fill="#bae6fd" />
            <rect x="44" y="6" width="52" height="42" fill="#3b6e9c" />
            <rect x="48" y="2" width="44" height="4" fill="#eab308" />
            <rect x="52" y="12" width="6" height="6" fill="#fef08a" />
            <rect x="64" y="12" width="6" height="6" fill="#fef08a" />
            <rect x="76" y="12" width="6" height="6" fill="#bae6fd" />
            <rect x="52" y="22" width="6" height="6" fill="#bae6fd" />
            <rect x="64" y="22" width="6" height="6" fill="#fef08a" />
            <rect x="76" y="22" width="6" height="6" fill="#fef08a" />
            <rect x="62" y="34" width="16" height="14" fill="#1e3a5f" />
            <rect x="104" y="14" width="42" height="34" fill="#4f83ae" />
            <rect x="110" y="20" width="6" height="5" fill="#fef08a" />
            <rect x="122" y="20" width="6" height="5" fill="#fef08a" />
            <rect x="134" y="20" width="6" height="5" fill="#bae6fd" />
            <rect x="154" y="22" width="34" height="26" fill="#6395bf" />
            <rect x="160" y="28" width="8" height="8" fill="#fef08a" />
            <rect x="174" y="28" width="8" height="20" fill="#38bdf8" />
          </svg>
        </div>

        {/* Right Actions — compact & unclipped on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Logout / Switch Account"
            title="Logout"
            className="inline-flex h-8 sm:h-10 items-center gap-1 rounded-md border border-[#5d9ec9] bg-white/95 px-2 sm:px-2.5 text-xs font-bold text-[#1e4a6d] hover:bg-white cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          <button
            type="button"
            data-start="true"
            onClick={onEnterHotel}
            className="habbo-btn-green rounded-md px-2.5 py-1.5 font-pixel text-[11px] tracking-tight sm:px-5 sm:py-2.5 sm:text-sm sm:tracking-wide whitespace-nowrap shrink-0 cursor-pointer"
          >
            ENTER HOTEL
          </button>
        </div>
      </div>

      {/* Sub-navigation Tab Bar */}
      <nav
        aria-label="CMS sections"
        className="w-full max-w-full overflow-x-auto whitespace-nowrap no-scrollbar bg-[#1d507a] border-t-2 border-[#3979ac]"
      >
        <div className="mx-auto flex w-max min-w-full max-w-6xl flex-nowrap items-center gap-1.5 px-3 pt-2 sm:px-6">
          {BASE_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-t-md px-3.5 py-2 text-xs sm:px-4 sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-white text-[#0f3454] shadow-[inset_0_2px_0_#38bdf8]'
                    : 'bg-[#153e61] text-white/95 hover:bg-[#266191] hover:text-white'
                }`}
              >
                <TabIcon icon={tab.icon} />
                <span>{tab.label}</span>
                {tab.id === 'friends' && friendsCount > 0 && (
                  <span
                    className={`ml-0.5 rounded px-1.5 py-0.2 font-mono-num text-[10px] font-extrabold ${
                      active ? 'bg-[#e0f2fe] text-[#0369a1]' : 'bg-[#0f2c47] text-sky-200'
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
              className={`ml-auto inline-flex items-center gap-1.5 rounded-t-md px-3.5 py-2 text-xs sm:px-4 sm:text-sm font-extrabold whitespace-nowrap shrink-0 transition-all cursor-pointer border-t-2 border-x-2 ${
                activeTab === 'housekeeping'
                  ? 'border-[#fca5a5] bg-[#9e1b1b] text-white shadow-[inset_0_2px_0_#ef4444]'
                  : 'border-[#7f1d1d] bg-[#9e1b1b] text-white hover:bg-[#b91c1c]'
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-[#fde047]" />
              Housekeeping
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

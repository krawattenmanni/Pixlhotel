import { useEffect, useState } from 'react';
import {
  Award,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  DoorOpen,
  Gift,
  Heart,
  Newspaper,
  PawPrint,
  RotateCw,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { findBadgeDefById } from '../../game/customBadges';
import { getPetDef } from '../../game/pets';
import type {
  AvatarPose,
  CustomBadgeDef,
  Direction,
  NewsArticle,
  PlayerProfileRecord,
  PlayerState,
  RoomDef,
} from '../../game/types';
import {
  PixelAvatarCanvas,
  PixelBadge,
  PixelBadgeSprite,
  PixelHeadCanvas,
  PixelPetCanvas,
} from '../PixelSpriteCanvas';

interface MeDashboardProps {
  player: PlayerState;
  rooms: RoomDef[];
  friends: PlayerProfileRecord[];
  news: NewsArticle[];
  customBadges?: CustomBadgeDef[];
  onSaveMotto: (motto: string) => void;
  onEnterHotel: (roomId?: string) => void;
  onRedeemVoucher: (code: string) => { ok: boolean; message: string };
  onExtendHC: () => { ok: boolean; message: string };
  onOpenWardrobe: () => void;
  onInspectPlayer: (profileId: string) => void;
  onEquipBadge?: (badgeId: string) => void;
  onCarePet?: (petId: string, kind: 'feed' | 'play') => void;
}

type HomeBackdropTheme = 'sunny' | 'sunset' | 'starlight';
type RoomFilter = 'all' | 'public' | 'games' | 'private';

const PROMO_VOUCHERS = [
  { code: 'PIXL2026', reward: '+250c & +100d' },
  { code: 'FREEHC', reward: '+14d VIP Club' },
  { code: 'DRAGON', reward: 'Rare Dragon Lamp' },
  { code: 'DUCKETS', reward: '+200 Duckets' },
];

export function MeDashboard({
  player,
  rooms,
  friends,
  news,
  customBadges = [],
  onSaveMotto,
  onEnterHotel,
  onRedeemVoucher,
  onExtendHC,
  onOpenWardrobe,
  onInspectPlayer,
  onEquipBadge,
  onCarePet,
}: MeDashboardProps) {
  const [mottoDraft, setMottoDraft] = useState(player.motto);
  const [mottoSavedTick, setMottoSavedTick] = useState(false);

  // Interactive PIXL Home stage controls
  const [backdropTheme, setBackdropTheme] = useState<HomeBackdropTheme>('sunny');
  const [stagePose, setStagePose] = useState<AvatarPose>('wave');
  const [stageDir, setStageDir] = useState<Direction>(0);
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('all');

  useEffect(() => {
    setMottoDraft(player.motto);
  }, [player.motto, player.username]);

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherFeedback, setVoucherFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [hcFeedback, setHcFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [dailyFeedback, setDailyFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [openArticle, setOpenArticle] = useState<NewsArticle | null>(null);

  const handleMottoCommit = () => {
    onSaveMotto(mottoDraft);
    setMottoSavedTick(true);
    setTimeout(() => setMottoSavedTick(false), 1800);
  };

  const handleVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onRedeemVoucher(voucherCode);
    setVoucherFeedback({ ok: res.ok, text: res.message });
    if (res.ok) setVoucherCode('');
  };

  const handleQuickVoucher = (code: string) => {
    const res = onRedeemVoucher(code);
    setVoucherFeedback({ ok: res.ok, text: res.message });
    if (res.ok) setVoucherCode('');
  };

  const handleClaimDaily = () => {
    const res = onRedeemVoucher('DAILY');
    setDailyFeedback({ ok: res.ok, text: res.message });
  };

  const handleExtendHC = () => {
    const res = onExtendHC();
    setHcFeedback({ ok: res.ok, text: res.message });
  };

  const currentNews = news[activeSlide] ?? news[0];
  const dailyClaimed = player.redeemedVouchers.includes('DAILY');

  const filteredRooms = rooms.filter((r) => {
    if (roomFilter === 'public') return r.category === 'public' && r.id !== 'battle_banzai';
    if (roomFilter === 'games') return r.id === 'battle_banzai';
    if (roomFilter === 'private') return r.category === 'private';
    return true;
  });

  const ownedPets = player.pets ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT MAIN COLUMN */}
      <div className="space-y-6 lg:col-span-8">
        {/* HERO AVATAR CARD — Interactive PIXL Home */}
        <section className="habbo-box">
          <div className="habbo-box-header flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-[#1e4e79] via-[#28669c] to-[#1e4e79]">
            <span className="inline-flex items-center gap-2">
              <PixelBadgeSprite
                badgeId={player.equippedBadgeId}
                unlocked
                size={18}
                customBadges={customBadges}
              />
              My PIXL Home — {player.username}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {/* Backdrop Theme Switcher */}
              <div className="inline-flex items-center rounded border border-white/25 bg-black/20 p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setBackdropTheme('sunny')}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold cursor-pointer ${
                    backdropTheme === 'sunny' ? 'bg-white text-[#0f3454]' : 'text-white/90 hover:text-white'
                  }`}
                >
                  <Sun className="h-3 w-3" /> Day
                </button>
                <button
                  type="button"
                  onClick={() => setBackdropTheme('sunset')}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold cursor-pointer ${
                    backdropTheme === 'sunset' ? 'bg-white text-[#9a3412]' : 'text-white/90 hover:text-white'
                  }`}
                >
                  <Sunset className="h-3 w-3" /> Dusk
                </button>
                <button
                  type="button"
                  onClick={() => setBackdropTheme('starlight')}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold cursor-pointer ${
                    backdropTheme === 'starlight' ? 'bg-white text-[#1e1b4b]' : 'text-white/90 hover:text-white'
                  }`}
                >
                  <Moon className="h-3 w-3" /> Night
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {player.role === 'admin' && <PixelBadge code="ADM" label="Creator & Hotel Admin" />}
                {player.hcDays > 0 && <PixelBadge code="HC" label="PIXL Club VIP" />}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch">
              {/* Interactive Pixel-Art PIXL Hotel Rooftop Terrace Stage */}
              <div
                className={`relative flex flex-col items-center justify-end overflow-hidden rounded-lg border px-5 pt-6 pb-3 sm:w-60 shrink-0 transition-colors ${
                  backdropTheme === 'sunny'
                    ? 'border-[#9cc2df] bg-gradient-to-b from-[#69c2fa] via-[#9fd9fc] to-[#d6efff]'
                    : backdropTheme === 'sunset'
                    ? 'border-[#f97316] bg-gradient-to-b from-[#7c2d12] via-[#ea580c] to-[#fde047]'
                    : 'border-[#312e81] bg-gradient-to-b from-[#090d1a] via-[#1e1b4b] to-[#312e81]'
                }`}
              >
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 220 220"
                  preserveAspectRatio="xMidYMax slice"
                  shapeRendering="crispEdges"
                  aria-hidden="true"
                >
                  {backdropTheme === 'starlight' ? (
                    <>
                      {/* Pixel Moon & Stars */}
                      <rect x="176" y="16" width="18" height="18" fill="#fef08a" />
                      <rect x="182" y="18" width="12" height="12" fill="#1e1b4b" />
                      <rect x="24" y="20" width="3" height="3" fill="#ffffff" />
                      <rect x="64" y="14" width="4" height="4" fill="#fde047" />
                      <rect x="108" y="26" width="3" height="3" fill="#ffffff" />
                      <rect x="142" y="16" width="3" height="3" fill="#bae6fd" />
                    </>
                  ) : (
                    <>
                      {/* Sun & Clouds */}
                      <rect
                        x="176"
                        y="14"
                        width="22"
                        height="22"
                        fill={backdropTheme === 'sunset' ? '#fb923c' : '#fde047'}
                      />
                      <rect x="180" y="18" width="14" height="14" fill="#fef08a" />
                      <rect
                        x="16"
                        y="18"
                        width="54"
                        height="12"
                        fill={backdropTheme === 'sunset' ? '#fed7aa' : '#ffffff'}
                      />
                      <rect
                        x="26"
                        y="12"
                        width="30"
                        height="8"
                        fill={backdropTheme === 'sunset' ? '#ffedd5' : '#ffffff'}
                      />
                      <rect
                        x="116"
                        y="34"
                        width="44"
                        height="10"
                        fill={backdropTheme === 'sunset' ? '#fed7aa' : '#ffffff'}
                      />
                    </>
                  )}
                  {/* Distant PIXL Hotel Towers */}
                  <rect
                    x="12"
                    y="78"
                    width="30"
                    height="72"
                    fill={backdropTheme === 'starlight' ? '#1e293b' : '#7aa9ce'}
                  />
                  <rect x="18" y="86" width="5" height="5" fill="#fef08a" />
                  <rect x="29" y="86" width="5" height="5" fill="#e0f2fe" />
                  <rect x="18" y="98" width="5" height="5" fill="#fef08a" />
                  <rect
                    x="156"
                    y="64"
                    width="38"
                    height="86"
                    fill={backdropTheme === 'starlight' ? '#0f172a' : '#6b9bc2'}
                  />
                  <rect x="162" y="58" width="26" height="6" fill="#eab308" />
                  <rect x="164" y="74" width="6" height="6" fill="#fef08a" />
                  <rect x="178" y="74" width="6" height="6" fill="#fef08a" />
                  <rect x="164" y="88" width="6" height="6" fill="#38bdf8" />
                  {/* Palm Tree on Left */}
                  <rect x="24" y="102" width="6" height="44" fill="#854d0e" />
                  <rect x="8" y="96" width="18" height="6" fill="#16a34a" />
                  <rect x="28" y="96" width="18" height="6" fill="#22c55e" />
                  <rect x="14" y="90" width="26" height="6" fill="#4ade80" />
                  {/* Classic Terracotta Brick Parapet Wall */}
                  <rect x="0" y="140" width="220" height="22" fill="#b45309" />
                  <rect x="0" y="136" width="220" height="5" fill="#e5e7eb" />
                  <rect x="8" y="144" width="14" height="5" fill="#92400e" />
                  <rect x="64" y="144" width="14" height="5" fill="#92400e" />
                  <rect x="146" y="144" width="14" height="5" fill="#92400e" />
                  {/* Tiled Rooftop Terrace Floor */}
                  <rect x="0" y="162" width="220" height="58" fill="#e2d9c5" />
                  <rect x="0" y="162" width="220" height="4" fill="#c7bba4" />
                </svg>

                {/* Avatar standing on stage + Pose/Rotation controls */}
                <div className="relative z-10 flex flex-col items-center w-full">
                  <PixelAvatarCanvas
                    look={player.look}
                    dir={stageDir}
                    pose={stagePose}
                    frame={0}
                    scale={2}
                  />
                  <div className="relative -mt-2 h-4 w-28 rounded-sm border border-[#64748b] bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8] shadow-sm" />

                  {/* Interactive Stage Pose & Rotate Bar */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1">
                    {(['wave', 'stand', 'dance', 'sit'] as AvatarPose[]).map((pose) => (
                      <button
                        key={pose}
                        type="button"
                        onClick={() => setStagePose(pose)}
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-bold capitalize cursor-pointer ${
                          stagePose === pose
                            ? 'border-[#0f3454] bg-[#0f3454] text-white'
                            : 'border-[#1e4a6d]/40 bg-white/90 text-[#0f3454] hover:bg-white'
                        }`}
                      >
                        {pose}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setStageDir(((stageDir + 1) % 4) as Direction)}
                      aria-label="Rotate avatar on stage"
                      title="Rotate"
                      className="rounded border border-[#1e4a6d]/40 bg-white/90 p-1 text-[#0f3454] hover:bg-white cursor-pointer"
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenWardrobe}
                    className="mt-1.5 rounded border border-[#1e4a6d] bg-white/95 px-2.5 py-0.5 text-[11px] font-extrabold text-[#1e4a6d] shadow-sm hover:bg-white cursor-pointer"
                  >
                    Change Look in Wardrobe
                  </button>
                </div>
              </div>

              {/* Profile Info, Daily Check-In, Quick Badge Strip, Motto & Enter CTA */}
              <div className="flex flex-1 min-w-0 flex-col justify-between gap-3.5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PixelBadgeSprite
                        badgeId={player.equippedBadgeId}
                        unlocked
                        size={36}
                        customBadges={customBadges}
                      />
                      <div className="min-w-0">
                        <h1 className="font-pixel text-xl sm:text-2xl text-[#0f3454] break-words">
                          {player.username}
                        </h1>
                        <p className="text-xs font-semibold text-slate-500">
                          {player.role === 'admin'
                            ? 'Hotel Manager & Founder'
                            : 'PIXL Hotel Citizen'}{' '}
                          · {player.unlockedBadges.length} Badges · {ownedPets.length} Pets
                        </p>
                      </div>
                    </div>

                    {/* Daily Check-In Reward Button */}
                    <button
                      type="button"
                      disabled={dailyClaimed}
                      onClick={handleClaimDaily}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-extrabold whitespace-nowrap shrink-0 ${
                        dailyClaimed
                          ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 cursor-default'
                          : 'habbo-btn-gold cursor-pointer'
                      }`}
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                      {dailyClaimed ? 'Daily Reward Claimed' : 'Claim Daily (+75c / +50d)'}
                    </button>
                  </div>

                  {dailyFeedback && (
                    <p className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      {dailyFeedback.text}
                    </p>
                  )}

                  {/* Quick-Equip Unlocked Badges Strip */}
                  <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-[#7c3aed]" />
                        My Unlocked Badges (Click to Equip)
                      </span>
                      <span className="font-mono-num text-[10px] text-slate-500">
                        Active: {findBadgeDefById(player.equippedBadgeId, customBadges)?.code ?? 'HTL'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {player.unlockedBadges.map((bId) => {
                        const def = findBadgeDefById(bId, customBadges);
                        if (!def) return null;
                        const active = player.equippedBadgeId === bId;
                        return (
                          <button
                            key={bId}
                            type="button"
                            title={`${def.name} [${def.code}] — Click to equip`}
                            onClick={() => onEquipBadge?.(bId)}
                            className={`rounded border p-1 transition-all cursor-pointer ${
                              active
                                ? 'border-[#2563eb] bg-[#dbeafe] ring-1 ring-[#2563eb]'
                                : 'border-slate-200 bg-white hover:border-slate-400'
                            }`}
                          >
                            <PixelBadgeSprite
                              badgeId={def.id}
                              unlocked
                              size={24}
                              customBadges={customBadges}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Wide Mobile-Safe Inline Editable Motto */}
                  <div className="rounded-md border border-[#c8d6e5] bg-[#f4f8fc] p-3">
                    <label htmlFor="motto-input" className="block text-xs font-extrabold text-[#2c6e9b]">
                      My PIXL Motto (updates live in-game)
                    </label>
                    <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        id="motto-input"
                        type="text"
                        maxLength={64}
                        value={mottoDraft}
                        onChange={(e) => setMottoDraft(e.target.value)}
                        onBlur={handleMottoCommit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleMottoCommit();
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-full min-w-0 flex-1 rounded border-2 border-[#b8cde0] bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
                        placeholder="Enter your PIXL Hotel motto..."
                      />
                      <button
                        type="button"
                        onClick={handleMottoCommit}
                        className="habbo-btn-blue rounded px-4 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {mottoSavedTick ? (
                          <span className="inline-flex items-center justify-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Saved
                          </span>
                        ) : (
                          'Save Motto'
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Currency Counters & Big Green Enter Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-md border border-[#e5c158] bg-[#fffbeb] px-3 py-1.5">
                      <Coins className="h-4 w-4 text-[#d97706]" />
                      <span className="font-mono-num text-sm font-extrabold text-[#92400e]">
                        {player.credits}
                      </span>
                      <span className="text-xs font-semibold text-amber-800">Credits</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md border border-[#d8b4fe] bg-[#faf5ff] px-3 py-1.5">
                      <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                      <span className="font-mono-num text-sm font-extrabold text-[#5b21b6]">
                        {player.duckets}
                      </span>
                      <span className="text-xs font-semibold text-violet-800">Duckets</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md border border-[#c8d6e5] bg-[#f8fafc] px-3 py-1.5">
                      <Crown className="h-4 w-4 text-[#ca8a04]" />
                      <span className="font-mono-num text-sm font-extrabold text-slate-900">
                        {player.hcDays}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">VIP Days</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEnterHotel()}
                    className="habbo-btn-green habbo-pulse rounded-lg px-6 py-2.5 font-pixel text-sm sm:text-base tracking-wide cursor-pointer whitespace-nowrap"
                  >
                    Enter Hotel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NEWS & CAMPAIGNS SLIDER */}
        <section className="habbo-box">
          <div className="habbo-box-header flex items-center justify-between bg-[#f37021]">
            <span className="inline-flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              PIXL Hotel News &amp; Events
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous news story"
                onClick={() => setActiveSlide((prev) => (prev - 1 + news.length) % news.length)}
                className="rounded bg-black/20 p-1 hover:bg-black/35 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {news.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`View news slide ${idx + 1}: ${item.title}`}
                  className={`h-2.5 w-6 rounded-sm transition-colors cursor-pointer ${
                    idx === activeSlide ? 'bg-white' : 'bg-black/30 hover:bg-white/60'
                  }`}
                />
              ))}
              <button
                type="button"
                aria-label="Next news story"
                onClick={() => setActiveSlide((prev) => (prev + 1) % news.length)}
                className="rounded bg-black/20 p-1 hover:bg-black/35 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              {/* Pixel Art Banner Illustration */}
              <div
                className={`sm:col-span-5 flex items-center justify-center rounded-md border-2 border-[#1b1922] p-4 ${
                  currentNews.bannerPalette === 'crimson'
                    ? 'bg-gradient-to-br from-[#7f1d1d] to-[#dc2626]'
                    : currentNews.bannerPalette === 'teal'
                    ? 'bg-gradient-to-br from-[#0f172a] to-[#0d9488]'
                    : 'bg-gradient-to-br from-[#92400e] to-[#f59e0b]'
                }`}
              >
                <svg className="h-28 w-44" viewBox="0 0 160 100" shapeRendering="crispEdges">
                  <rect x="8" y="8" width="144" height="84" fill="rgba(0,0,0,0.22)" />
                  {currentNews.bannerPalette === 'crimson' ? (
                    <>
                      <rect x="44" y="28" width="44" height="50" fill="#b45309" />
                      <rect x="40" y="20" width="52" height="16" fill="#d97706" />
                      <rect x="52" y="24" width="6" height="4" fill="#fef08a" />
                      <rect x="92" y="26" width="38" height="16" fill="#f97316" />
                      <rect x="98" y="29" width="24" height="9" fill="#fde047" />
                      <rect x="34" y="74" width="68" height="10" fill="#44403c" />
                    </>
                  ) : currentNews.bannerPalette === 'teal' ? (
                    <>
                      <rect x="52" y="18" width="56" height="68" fill="#78350f" />
                      <rect x="58" y="24" width="44" height="32" fill="#38bdf8" />
                      <rect x="64" y="30" width="32" height="20" fill="#0f172a" />
                      <rect x="60" y="64" width="40" height="4" fill="#facc15" />
                      <rect x="60" y="72" width="40" height="4" fill="#facc15" />
                      <rect x="26" y="34" width="6" height="14" fill="#fde047" />
                      <rect x="128" y="28" width="6" height="14" fill="#f472b6" />
                    </>
                  ) : (
                    <>
                      <rect x="50" y="22" width="60" height="62" fill="#fde047" />
                      <rect x="58" y="30" width="44" height="44" fill="#1d4ed8" />
                      <rect x="70" y="14" width="20" height="10" fill="#f59e0b" />
                      <rect x="76" y="42" width="8" height="16" fill="#fef9c3" />
                    </>
                  )}
                </svg>
              </div>

              <div className="sm:col-span-7 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>{currentNews.tag}</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentNews.date}</span>
                  </div>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                    {currentNews.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {currentNews.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setOpenArticle(currentNews)}
                    className="habbo-btn-blue rounded px-4 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    Read Full Story &rsaquo;
                  </button>
                  <div className="flex gap-2">
                    {news.map((n, idx) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        className={`text-xs font-bold cursor-pointer ${
                          idx === activeSlide
                            ? 'text-[#235c8a] underline'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MY ROOMS & HOT ROOMS EXPLORER */}
        <section className="habbo-box">
          <div className="habbo-box-header flex flex-wrap items-center justify-between gap-2 bg-[#2c6e9b]">
            <span className="inline-flex items-center gap-2">
              <DoorOpen className="h-4 w-4" />
              PIXL Navigator — Hot Rooms &amp; Suites
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All Rooms' },
                  { id: 'public', label: 'Lounges' },
                  { id: 'games', label: 'Battle Banzai' },
                  { id: 'private', label: 'My Suite' },
                ] as { id: RoomFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoomFilter(tab.id)}
                  className={`rounded px-2.5 py-0.5 text-[11px] font-bold cursor-pointer ${
                    roomFilter === tab.id
                      ? 'bg-white text-[#0f3454]'
                      : 'bg-black/20 text-white/90 hover:bg-black/35'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredRooms.map((room) => {
              const occPct = Math.min(100, Math.round((room.baseOccupancy / 75) * 100));
              return (
                <div
                  key={room.id}
                  className="flex flex-col justify-between gap-3 p-4 hover:bg-slate-50 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{room.name}</h3>
                      <span className="text-xs font-semibold text-slate-500">
                        · Host: {room.owner === 'PixelGuest' ? player.username : room.owner}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{room.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 hidden sm:block">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 mb-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="font-mono-num">{room.baseOccupancy}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Live</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded bg-slate-200">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${occPct}%` }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEnterHotel(room.id)}
                      className="habbo-btn-green rounded px-3.5 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      Go to Room
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* RIGHT SIDEBAR */}
      <aside className="space-y-6 lg:col-span-4">
        {/* VOUCHER CODE REDEEMER WITH 1-CLICK CHIPS */}
        <section className="habbo-box">
          <div className="habbo-box-header flex items-center gap-2 bg-[#549600]">
            <Gift className="h-4 w-4" />
            PIXL Voucher Redeemer
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs leading-relaxed text-slate-600">
              Enter a voucher code below or tap any active promo code to claim instant rewards:
            </p>

            {/* Quick-Tap Voucher Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {PROMO_VOUCHERS.map((v) => {
                const claimed =
                  player.redeemedVouchers.includes(v.code) ||
                  (v.code === 'PIXL2026' && player.redeemedVouchers.includes('PIXLHOTEL'));
                return (
                  <button
                    key={v.code}
                    type="button"
                    disabled={claimed}
                    onClick={() => handleQuickVoucher(v.code)}
                    className={`flex flex-col items-start rounded border px-2.5 py-1.5 text-left transition-colors ${
                      claimed
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-default'
                        : 'border-emerald-300 bg-emerald-50/70 text-slate-900 hover:bg-emerald-100 cursor-pointer'
                    }`}
                  >
                    <span className="font-mono-num text-xs font-extrabold">{v.code}</span>
                    <span className="text-[10px] font-semibold text-slate-600">
                      {claimed ? 'Claimed ✓' : v.reward}
                    </span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleVoucherSubmit} className="flex gap-2">
              <label htmlFor="voucher-input" className="sr-only">
                Voucher Code
              </label>
              <input
                id="voucher-input"
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Enter voucher code..."
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-slate-900 focus:border-[#0d9488] focus:outline-none"
              />
              <button
                type="submit"
                className="habbo-btn-green rounded px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Redeem
              </button>
            </form>
            {voucherFeedback && (
              <p
                role="status"
                className={`rounded border px-2.5 py-1.5 text-xs font-semibold ${
                  voucherFeedback.ok
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-rose-300 bg-rose-50 text-rose-800'
                }`}
              >
                {voucherFeedback.text}
              </p>
            )}
          </div>
        </section>

        {/* MY PIXL PETS & COMPANIONS WIDGET */}
        <section className="habbo-box">
          <div className="habbo-box-header flex items-center justify-between bg-[#d97706]">
            <span className="inline-flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-[#fef08a]" />
              My PIXL Pets ({ownedPets.length})
            </span>
            <span className="text-xs font-semibold text-amber-100">Live Companion Care</span>
          </div>
          <div className="divide-y divide-slate-200">
            {ownedPets.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
                  <PixelPetCanvas species="golden_terrier" size={44} />
                </div>
                <p className="text-xs text-slate-600">
                  You haven&apos;t adopted a pet yet! Open the Hotel Catalogue to adopt a Golden Terrier, Tabby Kitten, or Baby Fire Dragon.
                </p>
                <button
                  type="button"
                  onClick={() => onEnterHotel()}
                  className="habbo-btn-blue rounded px-3 py-1.5 text-xs font-bold cursor-pointer"
                >
                  Adopt in Hotel Catalogue
                </button>
              </div>
            ) : (
              ownedPets.map((pet) => {
                const def = getPetDef(pet.species);
                const petRoom =
                  rooms.find((r) => r.id === pet.roomId)?.name ?? 'Welcome Lounge';
                return (
                  <div key={pet.id} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded border border-amber-300 bg-amber-50/70 shrink-0">
                          <PixelPetCanvas species={pet.species} size={42} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-900">
                            {pet.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {def.name} · In {petRoom}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCarePet?.(pet.id, 'feed')}
                        className="habbo-btn-green rounded px-2.5 py-1 text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Feed Treat
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
                      <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                        <span className="inline-flex items-center gap-1">
                          <Utensils className="h-3 w-3 text-amber-600" /> Fullness
                        </span>
                        <span className="font-mono-num">{pet.hunger}%</span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3 text-rose-500" /> Mood
                        </span>
                        <span className="font-mono-num">{pet.happiness}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* FRIENDS ONLINE */}
        <section className="habbo-box">
          <div className="habbo-box-header flex items-center justify-between bg-[#1e9d54]">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              Friends ({friends.length})
            </span>
            <span className="font-mono-num text-xs">
              {friends.filter((f) => f.online).length} online
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {friends.length === 0 ? (
              <p className="p-4 text-xs text-slate-500">
                No friends added yet. Visit Players &amp; Friends to add PIXLs!
              </p>
            ) : (
              friends.map((friend) => {
                const roomName = friend.roomId
                  ? rooms.find((r) => r.id === friend.roomId)?.name ?? 'Hotel Lobby'
                  : 'Offline';
                return (
                  <div key={friend.id} className="flex items-center justify-between gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => onInspectPlayer(friend.id)}
                      className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
                    >
                      <div className="rounded border border-slate-300 bg-[#e8f4fc] p-0.5 shrink-0">
                        <PixelHeadCanvas look={friend.look} size={34} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 group-hover:underline">
                          {friend.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {friend.online ? `In ${roomName}` : 'Offline'}
                        </p>
                      </div>
                    </button>
                    {friend.online && friend.roomId && (
                      <button
                        type="button"
                        onClick={() => onEnterHotel(friend.roomId)}
                        className="habbo-btn-blue rounded px-2.5 py-1 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Follow into Hotel
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* PIXL CLUB VIP MEMBERSHIP BOX */}
        <section className="habbo-box">
          <div className="habbo-box-header flex items-center gap-2 bg-[#f37021]">
            <Crown className="h-4 w-4 text-[#fef08a]" />
            PIXL Club (HC) VIP Membership
          </div>
          <div className="bg-gradient-to-b from-[#fffbeb] to-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Current VIP Balance</span>
              <span className="font-mono-num text-base font-extrabold text-amber-700">
                {player.hcDays} days left
              </span>
            </div>
            <ul className="mt-2.5 space-y-1 text-xs text-slate-700">
              <li>· Exclusive golden HC badge &amp; profile trim</li>
              <li>· Priority access to Club Mammoth &amp; VIP Rares</li>
              <li>· Bonus Wardrobe accessories &amp; suite layouts</li>
            </ul>
            <button
              type="button"
              onClick={handleExtendHC}
              className="habbo-btn-gold mt-3.5 w-full rounded py-2 text-xs font-extrabold cursor-pointer"
            >
              Join / Extend PIXL Club (+31 Days · 50 Credits)
            </button>
            {hcFeedback && (
              <p
                role="status"
                className={`mt-2 rounded border px-2.5 py-1.5 text-xs font-semibold ${
                  hcFeedback.ok
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-rose-300 bg-rose-50 text-rose-800'
                }`}
              >
                {hcFeedback.text}
              </p>
            )}
          </div>
        </section>
      </aside>

      {/* NEWS ARTICLE MODAL */}
      {openArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="news-modal-title"
        >
          <div className="habbo-box w-full max-w-lg bg-white">
            <div className="habbo-box-header flex items-center justify-between bg-[#e06d1b]">
              <span>{openArticle.tag}</span>
              <button
                type="button"
                onClick={() => setOpenArticle(null)}
                aria-label="Close news article"
                className="rounded p-1 hover:bg-black/20 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold text-slate-500">{openArticle.date}</p>
              <h2 id="news-modal-title" className="mt-1 text-xl font-extrabold text-slate-900">
                {openArticle.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
                {openArticle.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenArticle(null)}
                  className="rounded border border-slate-300 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenArticle(null);
                    onEnterHotel();
                  }}
                  className="habbo-btn-green rounded px-4 py-1.5 text-xs font-bold cursor-pointer"
                >
                  Enter Hotel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

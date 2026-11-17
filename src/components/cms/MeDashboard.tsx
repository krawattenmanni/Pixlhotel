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
  Moon,
  Newspaper,
  PawPrint,
  RotateCw,
  Sparkles,
  Sun,
  Sunset,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { findBadgeDefById } from '../../game/customBadges';
import { getEquippedBadges } from '../../game/data';
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
import { BadgeInfoModal } from '../BadgeInfoModal';
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
  const [inspectBadgeId, setInspectBadgeId] = useState<string | null>(null);

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
  const equippedBadges = getEquippedBadges(player);

  const filteredRooms = rooms.filter((r) => {
    const isBanzai = r.modelName === 'model_banzai' || r.id === 'battle_banzai' || r.numericId === 3;
    if (roomFilter === 'public') return r.category === 'public' && !isBanzai;
    if (roomFilter === 'games') return isBanzai;
    if (roomFilter === 'private') return r.category === 'private';
    return true;
  });

  const ownedPets = player.pets ?? [];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* LEFT MAIN COLUMN */}
      <div className="space-y-5 lg:col-span-8">
        {/* HERO ME CARD — Classic 2009 HoloCMS Home Box */}
        <section className="habbo-box">
          <div className="habbo-box-header habbo-header-blue flex flex-wrap items-center justify-between gap-2">
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
              <div className="inline-flex items-center rounded-[2px] border border-[#000000]/50 bg-[#0f2c47] p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setBackdropTheme('sunny')}
                  className={`inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 font-bold cursor-pointer ${
                    backdropTheme === 'sunny' ? 'bg-white text-[#0f3454]' : 'text-white/90 hover:text-white'
                  }`}
                >
                  <Sun className="h-3 w-3" /> Day
                </button>
                <button
                  type="button"
                  onClick={() => setBackdropTheme('sunset')}
                  className={`inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 font-bold cursor-pointer ${
                    backdropTheme === 'sunset' ? 'bg-white text-[#9a3412]' : 'text-white/90 hover:text-white'
                  }`}
                >
                  <Sunset className="h-3 w-3" /> Dusk
                </button>
                <button
                  type="button"
                  onClick={() => setBackdropTheme('starlight')}
                  className={`inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 font-bold cursor-pointer ${
                    backdropTheme === 'starlight' ? 'bg-white text-[#1e1b4b]' : 'text-white/90 hover:text-white'
                  }`}
                >
                  <Moon className="h-3 w-3" /> Night
                </button>
              </div>

              <div className="flex items-center gap-1">
                {player.role === 'admin' && <PixelBadge code="ADM" label="Hotel Manager" />}
                {player.hcDays > 0 && <PixelBadge code="HC" label="PIXL Club VIP" />}
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
              {/* Interactive Pixel-Art PIXL Hotel Rooftop Terrace Stage */}
              <div
                className={`relative flex flex-col items-center justify-end overflow-hidden rounded-[3px] border border-[#000000] px-4 pt-5 pb-3 sm:w-56 shrink-0 ${
                  backdropTheme === 'sunny'
                    ? 'bg-gradient-to-b from-[#69c2fa] via-[#9fd9fc] to-[#d6efff]'
                    : backdropTheme === 'sunset'
                    ? 'bg-gradient-to-b from-[#7c2d12] via-[#ea580c] to-[#fde047]'
                    : 'bg-gradient-to-b from-[#090d1a] via-[#1e1b4b] to-[#312e81]'
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
                      <rect x="176" y="16" width="18" height="18" fill="#fef08a" />
                      <rect x="182" y="18" width="12" height="12" fill="#1e1b4b" />
                      <rect x="24" y="20" width="3" height="3" fill="#ffffff" />
                      <rect x="64" y="14" width="4" height="4" fill="#fde047" />
                      <rect x="108" y="26" width="3" height="3" fill="#ffffff" />
                      <rect x="142" y="16" width="3" height="3" fill="#bae6fd" />
                    </>
                  ) : (
                    <>
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
                  <rect x="24" y="102" width="6" height="44" fill="#854d0e" />
                  <rect x="8" y="96" width="18" height="6" fill="#16a34a" />
                  <rect x="28" y="96" width="18" height="6" fill="#22c55e" />
                  <rect x="14" y="90" width="26" height="6" fill="#4ade80" />
                  <rect x="0" y="140" width="220" height="22" fill="#b45309" />
                  <rect x="0" y="136" width="220" height="5" fill="#e5e7eb" />
                  <rect x="8" y="144" width="14" height="5" fill="#92400e" />
                  <rect x="64" y="144" width="14" height="5" fill="#92400e" />
                  <rect x="146" y="144" width="14" height="5" fill="#92400e" />
                  <rect x="0" y="162" width="220" height="58" fill="#e2d9c5" />
                  <rect x="0" y="162" width="220" height="4" fill="#c7bba4" />
                </svg>

                <div className="relative z-10 flex flex-col items-center w-full">
                  <PixelAvatarCanvas
                    look={player.look}
                    dir={stageDir}
                    pose={stagePose}
                    frame={0}
                    scale={2}
                  />
                  <div className="relative -mt-2 h-3.5 w-24 rounded-[2px] border border-[#000000] bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8]" />

                  <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                    {(['wave', 'stand', 'dance', 'sit'] as AvatarPose[]).map((pose) => (
                      <button
                        key={pose}
                        type="button"
                        onClick={() => setStagePose(pose)}
                        className={`rounded-[2px] border px-1.5 py-0.5 text-[10px] font-bold capitalize cursor-pointer ${
                          stagePose === pose
                            ? 'border-[#000000] bg-[#1d4e78] text-white'
                            : 'border-[#000000]/60 bg-white text-[#111827] hover:bg-[#f1f5f9]'
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
                      className="rounded-[2px] border border-[#000000]/60 bg-white p-1 text-[#111827] hover:bg-[#f1f5f9] cursor-pointer"
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenWardrobe}
                    className="habbo-btn-silver mt-1.5 px-2.5 py-0.5 text-[10px] font-bold cursor-pointer"
                  >
                    Change Look
                  </button>
                </div>
              </div>

              {/* Profile Info, Check-In CTA, 5 Equipped Badges, Motto */}
              <div className="flex flex-1 min-w-0 flex-col justify-between gap-3">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => setInspectBadgeId(player.equippedBadgeId)}
                        className="rounded-[2px] border border-[#000000] bg-[#fefce8] p-1 shrink-0 cursor-pointer hover:bg-[#fef08a]/50"
                        title="Click to view badge info"
                      >
                        <PixelBadgeSprite
                          badgeId={player.equippedBadgeId}
                          unlocked
                          size={34}
                          customBadges={customBadges}
                        />
                      </button>
                      <div className="min-w-0">
                        <h1 className="font-pixel text-lg sm:text-xl text-[#0f3454] break-words">
                          {player.username}
                        </h1>
                        <p className="text-[11px] font-bold text-[#475569]">
                          {player.role === 'admin' ? 'Hotel Manager & Founder' : 'PIXL Hotel Citizen'} ·{' '}
                          {player.unlockedBadges.length} Badges · {ownedPets.length} Pets
                        </p>
                      </div>
                    </div>

                    {/* Oversized Classic Glossy Green CHECK IN CTA */}
                    <button
                      type="button"
                      onClick={() => onEnterHotel()}
                      className="habbo-btn-green habbo-pulse px-4 py-2 font-pixel text-[11px] sm:text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0"
                    >
                      ENTER PIXLHOTEL / CHECK IN
                    </button>
                  </div>

                  {/* Equipped 5 Badge Slots + All Unlocked Clickable Strip */}
                  <div className="rounded-[2px] border border-[#94a3b8] bg-[#f8fafc] px-2.5 py-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#1d4e78] mb-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-[#d97706]" />
                        Equipped Badges ({equippedBadges.length}/5) — Click any badge to inspect
                      </span>
                      <button
                        type="button"
                        disabled={dailyClaimed}
                        onClick={handleClaimDaily}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold ${
                          dailyClaimed
                            ? 'rounded-[2px] border border-[#94a3b8] bg-[#e2e8f0] text-[#475569] cursor-default'
                            : 'habbo-btn-gold cursor-pointer'
                        }`}
                      >
                        <CalendarCheck className="h-3 w-3" />
                        {dailyClaimed ? 'Daily Claimed' : 'Daily +75c'}
                      </button>
                    </div>

                    {dailyFeedback && (
                      <p className="mb-1.5 rounded-[2px] border border-[#1f4f09] bg-[#ecfdf5] px-2 py-1 text-[10px] font-bold text-[#14532d]">
                        {dailyFeedback.text}
                      </p>
                    )}

                    {/* 5 Active Slots */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const bId = equippedBadges[idx];
                        const def = bId ? findBadgeDefById(bId, customBadges) : null;
                        return (
                          <button
                            key={`slot-${idx}`}
                            type="button"
                            disabled={!bId}
                            onClick={() => bId && setInspectBadgeId(bId)}
                            title={def ? `${def.name} [${def.code}] — Click for info` : 'Empty slot'}
                            className={`flex h-9 w-9 items-center justify-center rounded-[2px] border ${
                              bId
                                ? 'border-[#000000] bg-[#dbeafe] cursor-pointer hover:bg-[#bfdbfe]'
                                : 'border-[#cbd5e1] bg-white cursor-default'
                            }`}
                          >
                            {bId ? (
                              <PixelBadgeSprite
                                badgeId={bId}
                                unlocked
                                size={26}
                                customBadges={customBadges}
                              />
                            ) : (
                              <span className="text-[9px] font-bold text-[#94a3b8]">#{idx + 1}</span>
                            )}
                          </button>
                        );
                      })}

                      <span className="mx-1 text-[#94a3b8]">|</span>

                      {player.unlockedBadges.map((bId) => {
                        const def = findBadgeDefById(bId, customBadges);
                        if (!def) return null;
                        const active = equippedBadges.includes(bId);
                        return (
                          <button
                            key={bId}
                            type="button"
                            title={`${def.name} [${def.code}] — Click to inspect or toggle slot`}
                            onClick={() => setInspectBadgeId(bId)}
                            className={`rounded-[2px] border p-1 cursor-pointer ${
                              active
                                ? 'border-[#000000] bg-[#fef08a]'
                                : 'border-[#94a3b8] bg-white hover:border-[#000000]'
                            }`}
                          >
                            <PixelBadgeSprite
                              badgeId={def.id}
                              unlocked
                              size={22}
                              customBadges={customBadges}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Wide Mobile-Safe Inline Editable Motto */}
                  <div className="rounded-[2px] border border-[#94a3b8] bg-[#f4f8fc] p-2.5">
                    <label htmlFor="motto-input" className="block text-[11px] font-bold text-[#1d4e78]">
                      My PIXL Motto (updates live in-game)
                    </label>
                    <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:items-center">
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
                        className="w-full min-w-0 flex-1 rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#111827] focus:border-[#2b6ca3] focus:outline-none"
                        placeholder="Enter your PIXL Hotel motto..."
                      />
                      <button
                        type="button"
                        onClick={handleMottoCommit}
                        className="habbo-btn-blue px-3.5 py-1 text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
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

                {/* Currency Counters Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#cbd5e1] pt-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-[2px] border border-[#000000] bg-[#fffbeb] px-2.5 py-1">
                      <Coins className="h-3.5 w-3.5 text-[#d97706]" />
                      <span className="font-mono-num text-[12px] font-bold text-[#92400e]">
                        {player.credits}
                      </span>
                      <span className="text-[11px] font-bold text-[#b45309]">Credits</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-[2px] border border-[#000000] bg-[#faf5ff] px-2.5 py-1">
                      <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
                      <span className="font-mono-num text-[12px] font-bold text-[#5b21b6]">
                        {player.duckets}
                      </span>
                      <span className="text-[11px] font-bold text-[#6d28d9]">Duckets</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-[2px] border border-[#000000] bg-[#f8fafc] px-2.5 py-1">
                      <Crown className="h-3.5 w-3.5 text-[#ca8a04]" />
                      <span className="font-mono-num text-[12px] font-bold text-[#111827]">
                        {player.hcDays}
                      </span>
                      <span className="text-[11px] font-bold text-[#475569]">HC Days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NEWS & CAMPAIGNS SLIDER */}
        <section className="habbo-box">
          <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <Newspaper className="h-3.5 w-3.5" />
              PIXL Hotel News &amp; Events
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous news story"
                onClick={() => setActiveSlide((prev) => (prev - 1 + news.length) % news.length)}
                className="rounded-[2px] border border-[#000000]/40 bg-black/20 p-0.5 hover:bg-black/35 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {news.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`View news slide ${idx + 1}: ${item.title}`}
                  className={`h-2 w-5 rounded-[1px] cursor-pointer ${
                    idx === activeSlide ? 'bg-white' : 'bg-black/35 hover:bg-white/60'
                  }`}
                />
              ))}
              <button
                type="button"
                aria-label="Next news story"
                onClick={() => setActiveSlide((prev) => (prev + 1) % news.length)}
                className="rounded-[2px] border border-[#000000]/40 bg-black/20 p-0.5 hover:bg-black/35 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-12">
              <div
                className={`sm:col-span-5 flex items-center justify-center rounded-[2px] border border-[#000000] p-3 ${
                  currentNews.bannerPalette === 'crimson'
                    ? 'bg-gradient-to-br from-[#7f1d1d] to-[#dc2626]'
                    : currentNews.bannerPalette === 'teal'
                    ? 'bg-gradient-to-br from-[#0f172a] to-[#0d9488]'
                    : 'bg-gradient-to-br from-[#92400e] to-[#f59e0b]'
                }`}
              >
                <svg className="h-24 w-40" viewBox="0 0 160 100" shapeRendering="crispEdges">
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

              <div className="sm:col-span-7 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[#64748b]">
                    <span>{currentNews.tag}</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentNews.date}</span>
                  </div>
                  <h2 className="mt-1 text-[15px] font-bold text-[#111827]">{currentNews.title}</h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#374151]">{currentNews.summary}</p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setOpenArticle(currentNews)}
                    className="habbo-btn-blue px-3.5 py-1 text-[11px] font-bold cursor-pointer"
                  >
                    Read more &raquo;
                  </button>
                  <div className="flex gap-2">
                    {news.map((n, idx) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        className={`text-[11px] font-bold cursor-pointer ${
                          idx === activeSlide ? 'text-[#1d4e78] underline' : 'text-[#64748b] hover:text-[#111827]'
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
          <div className="habbo-box-header habbo-header-blue flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <DoorOpen className="h-3.5 w-3.5" />
              PIXL Navigator — Public &amp; Guest Rooms
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All Rooms' },
                  { id: 'public', label: 'Public Rooms' },
                  { id: 'games', label: 'Battle Banzai' },
                  { id: 'private', label: 'Guest Suites' },
                ] as { id: RoomFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoomFilter(tab.id)}
                  className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                    roomFilter === tab.id
                      ? 'border-[#000000] bg-white text-[#0f3454]'
                      : 'border-transparent bg-black/25 text-white/95 hover:bg-black/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#cbd5e1]">
            {filteredRooms.map((room) => {
              const occPct = Math.min(100, Math.round((room.baseOccupancy / 75) * 100));
              return (
                <div
                  key={room.id}
                  className="flex flex-col justify-between gap-2.5 p-3 hover:bg-[#f8fafc] sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-bold text-[#111827]">{room.name}</h3>
                      <span className="text-[11px] font-semibold text-[#64748b]">
                        · Owner: {room.owner === 'PixelGuest' ? player.username : room.owner}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#475569]">{room.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 hidden sm:block">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#15803d] mb-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="font-mono-num">{room.baseOccupancy}</span>
                        </span>
                        <span className="text-[9px] text-[#64748b]">Online</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-[1px] border border-[#000000]/40 bg-[#e2e8f0]">
                        <div className="h-full bg-[#22c55e]" style={{ width: `${occPct}%` }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEnterHotel(room.id)}
                      className="habbo-btn-green px-3 py-1 text-[11px] font-bold whitespace-nowrap cursor-pointer"
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
      <aside className="space-y-5 lg:col-span-4">
        {/* VOUCHER CODE REDEEMER */}
        <section className="habbo-box">
          <div className="habbo-box-header habbo-header-green flex items-center gap-2">
            <Gift className="h-3.5 w-3.5" />
            PIXL Voucher Redeemer
          </div>
          <div className="p-3.5 space-y-2.5">
            <p className="text-[11px] leading-relaxed text-[#475569]">
              Enter a voucher code below or click any active promo chip:
            </p>

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
                    className={`flex flex-col items-start rounded-[2px] border px-2 py-1 text-left ${
                      claimed
                        ? 'border-[#cbd5e1] bg-[#f1f5f9] text-[#94a3b8] cursor-default'
                        : 'border-[#000000] bg-[#ecfdf5] text-[#111827] hover:bg-[#d1fae5] cursor-pointer'
                    }`}
                  >
                    <span className="font-mono-num text-[11px] font-bold">{v.code}</span>
                    <span className="text-[10px] font-semibold text-[#475569]">
                      {claimed ? 'Claimed ✓' : v.reward}
                    </span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleVoucherSubmit} className="flex gap-1.5">
              <label htmlFor="voucher-input" className="sr-only">
                Voucher Code
              </label>
              <input
                id="voucher-input"
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Enter voucher code..."
                className="w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[12px] font-bold uppercase text-[#111827] focus:border-[#3d8b18] focus:outline-none"
              />
              <button
                type="submit"
                className="habbo-btn-green px-3 py-1 text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Redeem
              </button>
            </form>
            {voucherFeedback && (
              <p
                role="status"
                className={`rounded-[2px] border px-2.5 py-1 text-[11px] font-bold ${
                  voucherFeedback.ok
                    ? 'border-[#1f4f09] bg-[#ecfdf5] text-[#14532d]'
                    : 'border-[#7f1d1d] bg-[#fef2f2] text-[#991b1b]'
                }`}
              >
                {voucherFeedback.text}
              </p>
            )}
          </div>
        </section>

        {/* MY PIXL PETS & COMPANIONS WIDGET */}
        <section className="habbo-box">
          <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <PawPrint className="h-3.5 w-3.5 text-[#fef08a]" />
              My PIXL Pets ({ownedPets.length})
            </span>
            <span className="text-[10px] font-bold text-amber-100">Companion Care</span>
          </div>
          <div className="divide-y divide-[#cbd5e1]">
            {ownedPets.length === 0 ? (
              <div className="p-3.5 text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[2px] border border-[#000000] bg-[#fffbeb]">
                  <PixelPetCanvas species="golden_terrier" size={40} />
                </div>
                <p className="text-[11px] text-[#475569]">
                  Adopt a Golden Terrier, Tabby Kitten, or Baby Fire Dragon inside the Hotel Catalogue!
                </p>
                <button
                  type="button"
                  onClick={() => onEnterHotel()}
                  className="habbo-btn-blue px-3 py-1 text-[11px] font-bold cursor-pointer"
                >
                  Open Hotel Catalogue
                </button>
              </div>
            ) : (
              ownedPets.map((pet) => {
                const def = getPetDef(pet.species);
                const petRoom = rooms.find((r) => r.id === pet.roomId)?.name ?? 'Welcome Lounge';
                return (
                  <div key={pet.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-[#000000] bg-[#fffbeb] shrink-0">
                          <PixelPetCanvas species={pet.species} size={38} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#111827]">{pet.name}</p>
                          <p className="truncate text-[11px] text-[#475569]">
                            {def.name} · In {petRoom}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCarePet?.(pet.id, 'feed')}
                        className="habbo-btn-green px-2.5 py-1 text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        Feed
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-[#334155]">
                      <div className="flex items-center justify-between rounded-[2px] border border-[#cbd5e1] bg-[#f8fafc] px-2 py-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Utensils className="h-3 w-3 text-[#d97706]" /> Fullness
                        </span>
                        <span className="font-mono-num">{pet.hunger}%</span>
                      </div>
                      <div className="flex items-center justify-between rounded-[2px] border border-[#cbd5e1] bg-[#f8fafc] px-2 py-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3 text-[#e11d48]" /> Mood
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
          <div className="habbo-box-header habbo-header-green flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Friends ({friends.length})
            </span>
            <span className="font-mono-num text-[11px]">
              {friends.filter((f) => f.online).length} online
            </span>
          </div>
          <div className="divide-y divide-[#cbd5e1]">
            {friends.length === 0 ? (
              <p className="p-3.5 text-[11px] text-[#64748b]">
                No friends added yet. Visit Players &amp; Friends to add PIXLs!
              </p>
            ) : (
              friends.map((friend) => {
                const roomName = friend.roomId
                  ? rooms.find((r) => r.id === friend.roomId)?.name ?? 'Hotel Lobby'
                  : 'Offline';
                return (
                  <div key={friend.id} className="flex items-center justify-between gap-2 p-2.5">
                    <button
                      type="button"
                      onClick={() => onInspectPlayer(friend.id)}
                      className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
                    >
                      <div className="rounded-[2px] border border-[#000000] bg-[#e8f4fc] p-0.5 shrink-0">
                        <PixelHeadCanvas look={friend.look} size={32} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-bold text-[#111827] group-hover:underline">
                          {friend.name}
                        </p>
                        <p className="truncate text-[10px] text-[#475569]">
                          {friend.online ? `In ${roomName}` : 'Offline'}
                        </p>
                      </div>
                    </button>
                    {friend.online && friend.roomId && (
                      <button
                        type="button"
                        onClick={() => onEnterHotel(friend.roomId)}
                        className="habbo-btn-blue px-2.5 py-1 text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Follow
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
          <div className="habbo-box-header habbo-header-orange flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-[#fef08a]" />
            PIXL Club (HC) Membership
          </div>
          <div className="bg-gradient-to-b from-[#fffbeb] to-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#78350f]">Current HC Balance</span>
              <span className="font-mono-num text-[14px] font-bold text-[#b45309]">
                {player.hcDays} days left
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-[#374151]">
              <li>· Exclusive golden HC badge &amp; profile trim</li>
              <li>· Priority access to Club Mammoth &amp; HC Rares</li>
              <li>· Bonus Wardrobe accessories &amp; suite layouts</li>
            </ul>
            <button
              type="button"
              onClick={handleExtendHC}
              className="habbo-btn-gold mt-3 w-full py-1.5 text-[11px] font-bold cursor-pointer"
            >
              Join / Extend PIXL Club (+31 Days · 50 Credits)
            </button>
            {hcFeedback && (
              <p
                role="status"
                className={`mt-2 rounded-[2px] border px-2.5 py-1 text-[11px] font-bold ${
                  hcFeedback.ok
                    ? 'border-[#1f4f09] bg-[#ecfdf5] text-[#14532d]'
                    : 'border-[#7f1d1d] bg-[#fef2f2] text-[#991b1b]'
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="news-modal-title"
        >
          <div className="client-window w-full max-w-lg overflow-hidden">
            <div className="client-window-bar flex items-center justify-between px-3 py-1.5">
              <span className="text-[11px] font-bold">{openArticle.tag}</span>
              <button
                type="button"
                onClick={() => setOpenArticle(null)}
                aria-label="Close news article"
                className="client-close-btn"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="bg-white p-4">
              <p className="text-[11px] font-bold text-[#64748b]">{openArticle.date}</p>
              <h2 id="news-modal-title" className="mt-1 text-[16px] font-bold text-[#111827]">
                {openArticle.title}
              </h2>
              <div className="mt-2.5 space-y-2.5 text-[12px] leading-relaxed text-[#374151]">
                {openArticle.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenArticle(null)}
                  className="habbo-btn-silver px-3.5 py-1 text-[11px] font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenArticle(null);
                    onEnterHotel();
                  }}
                  className="habbo-btn-green px-3.5 py-1 text-[11px] font-bold cursor-pointer"
                >
                  Enter Hotel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BadgeInfoModal
        badgeId={inspectBadgeId}
        unlocked={inspectBadgeId ? player.unlockedBadges.includes(inspectBadgeId) : false}
        equipped={inspectBadgeId ? equippedBadges.includes(inspectBadgeId) : false}
        customBadges={customBadges}
        onEquip={(id) => onEquipBadge?.(id)}
        onClose={() => setInspectBadgeId(null)}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Crown,
  DoorOpen,
  Gift,
  Heart,
  Newspaper,
  PawPrint,
  Pencil,
  Plus,
  RotateCw,
  Tag,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import {
  addPlayerTag,
  DEFAULT_PLAYER_TAGS,
  removePlayerTag,
} from '../../game/clientFeatures';
import { findBadgeDefById } from '../../game/customBadges';
import { getEquippedBadges } from '../../game/data';
import { normalizeBadgeCategoryGroup, type BadgeCategoryFilter } from '../../game/i18n';
import { getPetDef } from '../../game/pets';
import { getRoomThumbnailImage } from '../../game/pixelSprites';
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

type RoomFilter = 'all' | 'public' | 'games' | 'private';

const PROMO_VOUCHERS = [
  { code: 'PIXL2026', reward: '+250c / +100d' },
  { code: 'FREEHC', reward: '+14d VIP' },
  { code: 'DRAGON', reward: 'Fire Dragon' },
  { code: 'DUCKETS', reward: '+200d' },
];

function PixelCoinIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="4" y="1" width="8" height="14" fill="#111111" />
      <rect x="2" y="3" width="12" height="10" fill="#111111" />
      <rect x="1" y="5" width="14" height="6" fill="#111111" />
      <rect x="4" y="2" width="8" height="12" fill="#d97706" />
      <rect x="2" y="4" width="12" height="8" fill="#ffd400" />
      <rect x="5" y="3" width="6" height="2" fill="#fffbeb" />
      <rect x="7" y="5" width="2" height="6" fill="#92400e" />
      <rect x="6" y="5" width="2" height="5" fill="#fef08a" />
    </svg>
  );
}

function PixelDucketIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="5" y="1" width="6" height="14" fill="#111111" />
      <rect x="3" y="3" width="10" height="10" fill="#111111" />
      <rect x="1" y="5" width="14" height="6" fill="#111111" />
      <rect x="5" y="2" width="6" height="12" fill="#7e22ce" />
      <rect x="3" y="4" width="10" height="8" fill="#a855f7" />
      <rect x="5" y="4" width="4" height="2" fill="#f3e8ff" />
      <rect x="6" y="6" width="4" height="4" fill="#e9d5ff" />
    </svg>
  );
}

function PixelHcCrownIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="4" width="14" height="10" fill="#111111" />
      <rect x="2" y="5" width="2" height="6" fill="#ffd400" />
      <rect x="7" y="3" width="2" height="8" fill="#ffd400" />
      <rect x="12" y="5" width="2" height="6" fill="#ffd400" />
      <rect x="3" y="7" width="10" height="4" fill="#f59e0b" />
      <rect x="2" y="11" width="12" height="2" fill="#d97706" />
      <rect x="7" y="8" width="2" height="2" fill="#ef4444" />
    </svg>
  );
}

function NewsPixelBanner({ article }: { article: NewsArticle }) {
  const palette = article.bannerPalette;
  if (palette === 'teal') {
    // Lido Pool Deck Grand Opening pixel illustration
    return (
      <svg
        className="h-full w-full block"
        viewBox="0 0 320 156"
        preserveAspectRatio="xMidYMid slice"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect x="0" y="0" width="320" height="156" fill="#5ec0f9" />
        <rect x="0" y="54" width="320" height="30" fill="#8bd7fd" />
        {/* Clouds & Sun */}
        <rect x="262" y="12" width="28" height="28" fill="#fde047" />
        <rect x="268" y="18" width="16" height="16" fill="#fef9c3" />
        <rect x="24" y="16" width="54" height="12" fill="#ffffff" />
        <rect x="34" y="10" width="32" height="8" fill="#ffffff" />
        <rect x="150" y="22" width="44" height="10" fill="#ffffff" />
        {/* Hotel wing & palm */}
        <rect x="0" y="38" width="56" height="68" fill="#2b6ca3" />
        <rect x="8" y="48" width="10" height="10" fill="#fef08a" />
        <rect x="24" y="48" width="10" height="10" fill="#bae6fd" />
        <rect x="40" y="48" width="10" height="10" fill="#fef08a" />
        <rect x="8" y="66" width="10" height="10" fill="#bae6fd" />
        <rect x="24" y="66" width="10" height="10" fill="#fef08a" />
        {/* Lido Sun Deck & Turquoise Pool */}
        <rect x="0" y="84" width="320" height="72" fill="#e6dcc6" />
        <rect x="0" y="80" width="320" height="5" fill="#cbd5e1" />
        <rect x="64" y="96" width="210" height="48" fill="#0284c7" />
        <rect x="68" y="100" width="202" height="40" fill="#29b6f6" />
        <rect x="84" y="108" width="24" height="3" fill="#bae6fd" />
        <rect x="174" y="118" width="32" height="3" fill="#bae6fd" />
        <rect x="122" y="130" width="28" height="3" fill="#7dd3fc" />
        {/* Striped Beach Parasol */}
        <rect x="34" y="64" width="4" height="32" fill="#78350f" />
        <rect x="14" y="54" width="44" height="12" fill="#dc2626" />
        <rect x="22" y="54" width="10" height="12" fill="#ffffff" />
        <rect x="40" y="54" width="10" height="12" fill="#ffffff" />
        {/* Diving Board & Rubber Duck */}
        <rect x="252" y="60" width="8" height="38" fill="#94a3b8" />
        <rect x="218" y="66" width="40" height="6" fill="#fef08a" />
        <rect x="218" y="66" width="12" height="6" fill="#0284c7" />
        <rect x="144" y="108" width="14" height="10" fill="#facc15" />
        <rect x="152" y="102" width="8" height="7" fill="#facc15" />
        <rect x="160" y="105" width="4" height="3" fill="#f97316" />
      </svg>
    );
  }
  if (palette === 'crimson') {
    // Fire Dragon Rare Drop pixel illustration
    return (
      <svg
        className="h-full w-full block"
        viewBox="0 0 320 156"
        preserveAspectRatio="xMidYMid slice"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect x="0" y="0" width="320" height="156" fill="#3b0712" />
        <rect x="0" y="92" width="320" height="64" fill="#5b121b" />
        {/* Vault pillars */}
        <rect x="20" y="12" width="22" height="92" fill="#7f1d1d" />
        <rect x="278" y="12" width="22" height="92" fill="#7f1d1d" />
        <rect x="112" y="88" width="96" height="24" fill="#44403c" />
        <rect x="120" y="84" width="80" height="6" fill="#d97706" />
        {/* Roaring Bronze Dragon + Flame */}
        <rect x="130" y="34" width="46" height="50" fill="#b45309" />
        <rect x="122" y="22" width="60" height="22" fill="#dc2626" />
        <rect x="136" y="12" width="10" height="12" fill="#f59e0b" />
        <rect x="156" y="10" width="10" height="14" fill="#f59e0b" />
        <rect x="162" y="28" width="8" height="6" fill="#fef08a" />
        <rect x="180" y="30" width="52" height="22" fill="#f97316" />
        <rect x="190" y="34" width="38" height="14" fill="#fde047" />
        <rect x="210" y="28" width="32" height="10" fill="#fef9c3" />
        {/* Sparks */}
        <rect x="86" y="38" width="5" height="5" fill="#fde047" />
        <rect x="248" y="42" width="6" height="6" fill="#fb923c" />
        <rect x="234" y="20" width="4" height="4" fill="#fef08a" />
      </svg>
    );
  }
  // Gold / Battle Banzai / Club Mammoth Night illustration
  return (
    <svg
      className="h-full w-full block"
      viewBox="0 0 320 156"
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="320" height="156" fill="#17153b" />
      {/* Spotlight Beams */}
      <polygon points="80,0 138,110 92,110" fill="rgba(56,189,248,0.22)" />
      <polygon points="240,0 228,110 182,110" fill="rgba(236,72,153,0.22)" />
      {/* Disco Mirror Ball */}
      <rect x="158" y="0" width="4" height="14" fill="#94a3b8" />
      <rect x="148" y="14" width="24" height="24" fill="#e2e8f0" />
      <rect x="152" y="18" width="6" height="6" fill="#38bdf8" />
      <rect x="162" y="18" width="6" height="6" fill="#ffffff" />
      <rect x="152" y="28" width="6" height="6" fill="#f472b6" />
      <rect x="162" y="28" width="6" height="6" fill="#fde047" />
      {/* Neon Club Stage & Banzai Floor Tiles */}
      <rect x="0" y="92" width="320" height="64" fill="#1e1b4b" />
      <rect x="34" y="98" width="38" height="18" fill="#06b6d4" />
      <rect x="78" y="98" width="38" height="18" fill="#ec4899" />
      <rect x="122" y="98" width="38" height="18" fill="#facc15" />
      <rect x="166" y="98" width="38" height="18" fill="#22c55e" />
      <rect x="210" y="98" width="38" height="18" fill="#06b6d4" />
      <rect x="254" y="98" width="38" height="18" fill="#ec4899" />
      {/* DJ Console */}
      <rect x="116" y="62" width="88" height="32" fill="#0f172a" />
      <rect x="122" y="66" width="76" height="8" fill="#38bdf8" />
      <rect x="130" y="78" width="16" height="12" fill="#facc15" />
      <rect x="174" y="78" width="16" height="12" fill="#f472b6" />
    </svg>
  );
}

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
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoSavedTick, setMottoSavedTick] = useState(false);

  const [stagePose, setStagePose] = useState<AvatarPose>('wave');
  const [stageDir, setStageDir] = useState<Direction>(0);
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('all');

  const tagStorageKey = `pixl_tags_${player.username.toLowerCase()}`;
  const [tags, setTags] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PLAYER_TAGS;
    try {
      const raw = window.localStorage.getItem(`pixl_tags_${player.username.toLowerCase()}`);
      if (!raw) return DEFAULT_PLAYER_TAGS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PLAYER_TAGS;
    } catch {
      return DEFAULT_PLAYER_TAGS;
    }
  });
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    setMottoDraft(player.motto);
  }, [player.motto, player.username]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(tagStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setTags(parsed);
          return;
        }
      }
      setTags(DEFAULT_PLAYER_TAGS);
    } catch {
      setTags(DEFAULT_PLAYER_TAGS);
    }
  }, [tagStorageKey]);

  const updateAndSaveTags = (next: string[]) => {
    setTags(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(tagStorageKey, JSON.stringify(next));
      } catch {
        // Ignore quota errors
      }
    }
  };

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherFeedback, setVoucherFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [hcFeedback, setHcFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [dailyFeedback, setDailyFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [openArticle, setOpenArticle] = useState<NewsArticle | null>(null);
  const [inspectBadgeId, setInspectBadgeId] = useState<string | null>(null);
  const [badgeCategoryFilter, setBadgeCategoryFilter] = useState<BadgeCategoryFilter>('all');

  const handleMottoCommit = () => {
    const clean = mottoDraft.trim() || 'Living the retro pixel dream!';
    onSaveMotto(clean);
    setEditingMotto(false);
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

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const next = addPlayerTag(tags, newTagInput);
    if (next !== tags) {
      updateAndSaveTags(next);
      setNewTagInput('');
    }
  };

  const currentNews = news[activeSlide] ?? news[0];
  const dailyClaimed = player.redeemedVouchers.includes('DAILY');
  const equippedBadges = getEquippedBadges(player);
  const ownedPets = player.pets ?? [];

  const filteredRooms = rooms.filter((r) => {
    const isBanzai = r.modelName === 'model_banzai' || r.id === 'battle_banzai' || r.numericId === 3;
    if (roomFilter === 'public') return r.category === 'public' && !isBanzai;
    if (roomFilter === 'games') return isBanzai;
    if (roomFilter === 'private') return r.category === 'private';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* TOP HERO ROW: 2008 HoloCMS Personal Plate (Left) + Detailed Pixel News Slider (Right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ICONIC HABBO "PERSONAL PLATE" HERO CARD */}
        <section className="habbo-box lg:col-span-7 flex flex-col justify-between">
          {/* Scenic Isometric Terrace Banner (165px+ tall) */}
          <div className="relative min-h-[180px] overflow-hidden bg-gradient-to-b from-[#55b7f7] via-[#9bd6fb] to-[#e4f5ff] p-3.5 sm:p-4">
            {/* Pixel Rooftop / Terrace Scenic Backdrop SVG */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 560 190"
              preserveAspectRatio="xMinYMax slice"
              shapeRendering="crispEdges"
              aria-hidden="true"
            >
              {/* Clouds & Distant Hotel */}
              <rect x="28" y="14" width="54" height="12" fill="#ffffff" />
              <rect x="40" y="8" width="28" height="8" fill="#ffffff" />
              <rect x="220" y="18" width="48" height="10" fill="#ffffff" />
              <rect x="442" y="12" width="60" height="12" fill="#ffffff" />
              {/* Left Pixel Hotel Wing Windows */}
              <rect x="0" y="28" width="68" height="106" fill="#6396bf" />
              <rect x="10" y="40" width="12" height="12" fill="#fef08a" />
              <rect x="30" y="40" width="12" height="12" fill="#bae6fd" />
              <rect x="10" y="62" width="12" height="12" fill="#bae6fd" />
              <rect x="30" y="62" width="12" height="12" fill="#fef08a" />
              <rect x="10" y="84" width="12" height="12" fill="#fef08a" />
              {/* Palm Tree */}
              <rect x="136" y="66" width="8" height="68" fill="#854d0e" />
              <rect x="118" y="56" width="24" height="8" fill="#16a34a" />
              <rect x="138" y="58" width="24" height="8" fill="#22c55e" />
              <rect x="126" y="48" width="26" height="8" fill="#4ade80" />
              {/* Terrace Stone Parapet & Tiled Isometric Deck */}
              <rect x="0" y="132" width="560" height="58" fill="#e6dcc6" />
              <rect x="0" y="126" width="560" height="7" fill="#cbd5e1" />
              <rect x="0" y="132" width="560" height="3" fill="#94a3b8" />
              {/* Checkerboard isometric terrace tiles */}
              <rect x="16" y="144" width="38" height="10" fill="#d6cab1" />
              <rect x="92" y="144" width="38" height="10" fill="#d6cab1" />
              <rect x="168" y="144" width="38" height="10" fill="#d6cab1" />
              <rect x="244" y="144" width="38" height="10" fill="#d6cab1" />
              <rect x="54" y="162" width="38" height="10" fill="#d6cab1" />
              <rect x="130" y="162" width="38" height="10" fill="#d6cab1" />
              <rect x="206" y="162" width="38" height="10" fill="#d6cab1" />
            </svg>

            {/* Micro Pose & Wardrobe Controls in Top-Left Corner */}
            <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
              <div className="inline-flex items-center gap-1 rounded-[2px] border border-[#000000]/60 bg-white/90 px-1.5 py-0.5 text-[10px]">
                {(['wave', 'dance'] as AvatarPose[]).map((pose) => (
                  <button
                    key={pose}
                    type="button"
                    onClick={() => setStagePose(pose)}
                    className={`rounded-[2px] px-1.5 py-0.5 font-bold capitalize cursor-pointer ${
                      stagePose === pose ? 'bg-[#1d4e78] text-white' : 'text-[#1e293b] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    {pose}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setStageDir(((stageDir + 1) % 4) as Direction)}
                  aria-label="Rotate avatar on plate"
                  title="Rotate Avatar"
                  className="rounded-[2px] p-0.5 text-[#1e293b] hover:bg-[#e2e8f0] cursor-pointer"
                >
                  <RotateCw className="h-3 w-3" />
                </button>
                <span className="text-[#cbd5e1]">|</span>
                <button
                  type="button"
                  onClick={onOpenWardrobe}
                  className="rounded-[2px] px-1.5 py-0.5 font-bold text-[#1d4e78] hover:bg-[#dbeafe] cursor-pointer"
                >
                  Looks
                </button>
              </div>

              <div className="flex items-center gap-1">
                {player.role === 'admin' && <PixelBadge code="ADM" label="Hotel Manager" />}
                {player.hcDays > 0 && <PixelBadge code="HC" label="PIXL Club VIP" />}
              </div>
            </div>

            {/* Avatar + Name + Speech-Bubble Motto + Overlapping Green ENTER PIXLHOTEL CTA */}
            <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-3 min-w-0 flex-1">
                {/* Standing Avatar on Left Terrace */}
                <div className="flex flex-col items-center shrink-0 -mb-2">
                  <PixelAvatarCanvas
                    look={player.look}
                    dir={stageDir}
                    pose={stagePose}
                    frame={0}
                    scale={2}
                  />
                </div>

                {/* Username + Online Status + Classic Habbo Speech-Bubble Motto */}
                <div className="min-w-0 flex-1 pb-1 space-y-1.5">
                  <div className="inline-block rounded-[3px] border border-[#000000] bg-[#ffffff]/95 px-2.5 py-1 shadow-[0_1px_0_rgba(0,0,0,0.2)]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h1 className="font-pixel text-base sm:text-lg text-[#0f3454] leading-none">
                        {player.username}
                      </h1>
                    </div>
                    <p className="mt-0.5 text-[10px] font-bold text-[#15803d]">
                      Last signed in: Online now
                    </p>
                  </div>

                  {/* Classic Habbo Speech-Bubble Motto (click text to edit inline!) */}
                  <div className="relative w-full max-w-[280px]">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[6px] top-3 h-2.5 w-2.5 rotate-45 border-b border-l border-[#000000] bg-[#ffffff]"
                    />
                    {editingMotto ? (
                      <div className="relative z-10 flex items-center gap-1 rounded-[4px] border border-[#000000] bg-white px-2 py-1 shadow-sm">
                        <input
                          id="motto-input"
                          data-testid="inline-motto-input"
                          type="text"
                          autoFocus
                          maxLength={64}
                          value={mottoDraft}
                          onChange={(e) => setMottoDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleMottoCommit();
                            if (e.key === 'Escape') {
                              setMottoDraft(player.motto);
                              setEditingMotto(false);
                            }
                          }}
                          className="min-w-0 flex-1 text-[11px] font-bold text-[#111827] focus:outline-none"
                          aria-label="Edit Motto"
                        />
                        <button
                          type="button"
                          onClick={handleMottoCommit}
                          aria-label="Save Motto"
                          className="habbo-btn-green inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                        >
                          <Check className="h-3 w-3" /> Save
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingMotto(true)}
                        data-testid="inline-motto-trigger"
                        title="Click to edit your motto"
                        className="relative z-10 flex w-full items-center justify-between gap-2 rounded-[4px] border border-[#000000] bg-white px-2.5 py-1.5 text-left text-[11px] font-semibold italic text-[#1f2937] hover:bg-[#fefce8] cursor-pointer shadow-[0_1px_0_rgba(0,0,0,0.18)]"
                      >
                        <span className="truncate">&ldquo;{player.motto}&rdquo;</span>
                        <span className="inline-flex items-center gap-1 text-[9px] not-italic font-bold text-[#2b6ca3] shrink-0">
                          {mottoSavedTick ? (
                            <span className="text-[#15803d]">Saved ✓</span>
                          ) : (
                            <Pencil className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Iconic Overlapping Glossy 3D Green "ENTER PIXLHOTEL" Button */}
              <div className="shrink-0 sm:-mr-1 sm:-mb-1">
                <button
                  type="button"
                  onClick={() => onEnterHotel()}
                  className="habbo-btn-green habbo-pulse flex h-[52px] items-center justify-center px-5 font-pixel text-[12px] sm:text-[13px] tracking-wide cursor-pointer whitespace-nowrap"
                >
                  ENTER PIXLHOTEL &raquo;
                </button>
              </div>
            </div>
          </div>

          {/* Sleek Dark Habbo Purse Strip Attached Directly Underneath Terrace */}
          <div className="border-t border-[#000000] bg-[#2b2d31] px-3.5 py-2 text-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1.5">
                  <PixelCoinIcon />
                  <span className="font-mono-num text-[#fde047]">{player.credits}</span>
                  <span className="text-slate-200">Credits</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PixelDucketIcon />
                  <span className="font-mono-num text-[#e9d5ff]">{player.duckets}</span>
                  <span className="text-slate-200">Duckets</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PixelHcCrownIcon />
                  <span className="font-mono-num text-[#fcd34d]">{player.hcDays}</span>
                  <span className="text-slate-200">HC Days</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={dailyClaimed}
                  onClick={handleClaimDaily}
                  className={`px-2.5 py-1 text-[10px] font-bold ${
                    dailyClaimed
                      ? 'rounded-[2px] border border-[#52525b] bg-[#3f3f46] text-[#a1a1aa] cursor-default'
                      : 'habbo-btn-gold cursor-pointer'
                  }`}
                >
                  {dailyClaimed ? 'Claimed ✓' : 'Claim +75c'}
                </button>
                <button
                  type="button"
                  onClick={handleExtendHC}
                  title="Extend PIXL Club (+31 days for 50 Credits)"
                  className="habbo-btn-blue px-2 py-1 text-[10px] font-bold cursor-pointer"
                >
                  +HC (50c)
                </button>
              </div>
            </div>
            {(dailyFeedback || hcFeedback) && (
              <p className="mt-1.5 text-[10px] font-bold text-[#fde047]">
                {(dailyFeedback ?? hcFeedback)?.text}
              </p>
            )}
          </div>
        </section>

        {/* TOP-RIGHT: DETAILED PIXEL-ART NEWS SLIDER + CLICKABLE HEADLINE LIST */}
        <section className="habbo-box lg:col-span-5 flex flex-col justify-between">
          <div>
            {/* Rich Multi-Layered Pixel Scenic Banner */}
            <div className="relative h-[156px] w-full overflow-hidden border-b border-[#000000] bg-[#0f172a]">
              <NewsPixelBanner article={currentNews} />
              {/* Semi-transparent bottom caption overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-black/75 px-3 py-2 text-white">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#fde047]">
                      {currentNews.tag} · {currentNews.date}
                    </p>
                    <h2 className="truncate text-[13px] font-bold text-white leading-tight">
                      {currentNews.title}
                    </h2>
                    <p className="truncate text-[10px] text-slate-200">
                      {currentNews.summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenArticle(currentNews)}
                    className="habbo-btn-blue px-2.5 py-1 text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Read more &raquo;
                  </button>
                </div>
              </div>
            </div>

            {/* Clean Clickable List of 3 Latest News Headlines */}
            <div className="divide-y divide-[#cbd5e1] bg-white">
              {news.slice(0, 3).map((item, idx) => {
                const isSelected = idx === activeSlide;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer ${
                      isSelected ? 'bg-[#e8f4fc]' : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <Newspaper
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isSelected ? 'text-[#d9660b]' : 'text-[#64748b]'
                        }`}
                      />
                      <span
                        className={`truncate text-[11px] font-bold ${
                          isSelected ? 'text-[#0f3454]' : 'text-[#1f2937]'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#64748b] whitespace-nowrap shrink-0">
                      {item.date.replace(', 2026', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* CLEAN SEPARATED BADGE SHOWCASE — Equipped 5/5 Slot Bar on Top + Collection Grid Below */}
      <section className="habbo-box" data-testid="me-badges-section">
        <div className="habbo-box-header habbo-header-dark flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-[#fde047]" />
            Equipped Badges ({equippedBadges.length}/5) &amp; My Badge Collection ({player.unlockedBadges.length})
          </span>
          <span className="text-[10px] font-semibold text-sky-100">
            Click any badge for 80x80 preview &amp; Equip/Unequip
          </span>
        </div>

        <div className="p-3.5 space-y-3 bg-white">
          {/* Equipped Badges (5/5) Slot Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2">
            <span className="text-[11px] font-bold text-[#1d4e78]">
              Equipped Badges ({equippedBadges.length}/5)
            </span>
            <div className="flex flex-wrap items-center gap-2" data-testid="equipped-badges-bar">
              {Array.from({ length: 5 }).map((_, idx) => {
                const bId = equippedBadges[idx];
                const def = bId ? findBadgeDefById(bId, customBadges) : null;
                return (
                  <button
                    key={`slot-${idx}`}
                    type="button"
                    disabled={!bId}
                    onClick={() => bId && setInspectBadgeId(bId)}
                    title={def ? `${def.name} [${def.code}] — Click for info` : `Empty badge slot #${idx + 1}`}
                    className={`flex h-12 w-12 items-center justify-center rounded-[2px] border ${
                      bId
                        ? 'border-[#000000] bg-gradient-to-b from-[#dbeafe] to-[#eff6ff] cursor-pointer hover:from-[#bfdbfe]'
                        : 'border-[#cbd5e1] bg-white cursor-default'
                    }`}
                  >
                    {bId ? (
                      <PixelBadgeSprite
                        badgeId={bId}
                        unlocked
                        size={40}
                        customBadges={customBadges}
                      />
                    ) : (
                      <span className="text-[9px] font-bold text-[#94a3b8]">#{idx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clearly Separated "My Badge Collection" Grid Below with Category Filter Pills */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-[#334155]">
                My Badge Collection ({player.unlockedBadges.length})
              </p>
              <div className="flex flex-wrap items-center gap-1" data-testid="me-badge-category-pills">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'Achievements', label: 'Achievements' },
                    { id: 'Games & Rooms', label: 'Games & Rooms' },
                    { id: 'Rares', label: 'Rares' },
                    { id: 'Events & Seasonal', label: 'Seasonal' },
                    { id: 'Staff & VIP', label: 'Staff & VIP' },
                  ] as { id: BadgeCategoryFilter; label: string }[]
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setBadgeCategoryFilter(cat.id)}
                    className={`rounded-[2px] border px-2 py-0.5 text-[9px] font-bold cursor-pointer ${
                      badgeCategoryFilter === cat.id
                        ? 'border-[#000000] bg-[#2b6ca3] text-white'
                        : 'border-[#cbd5e1] bg-[#f8fafc] text-[#334155] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10" data-testid="badge-collection-grid">
              {player.unlockedBadges
                .filter((bId) => {
                  if (badgeCategoryFilter === 'all') return true;
                  const def = findBadgeDefById(bId, customBadges);
                  return def ? normalizeBadgeCategoryGroup(def.category) === badgeCategoryFilter : false;
                })
                .map((bId) => {
                  const def = findBadgeDefById(bId, customBadges);
                  if (!def) return null;
                  const active = equippedBadges.includes(bId);
                  return (
                    <button
                      key={bId}
                      type="button"
                      data-testid={`me-badge-${bId}`}
                      title={`${def.name} [${def.code}] — Click to inspect`}
                      onClick={() => setInspectBadgeId(bId)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-[2px] border p-1.5 cursor-pointer ${
                        active
                          ? 'border-[#000000] bg-[#fef9c3] shadow-[inset_0_1px_0_#ffffff]'
                          : 'border-[#cbd5e1] bg-[#f8fafc] hover:border-[#000000] hover:bg-[#e8f4fc]'
                      }`}
                    >
                      <PixelBadgeSprite
                        badgeId={def.id}
                        unlocked
                        size={40}
                        customBadges={customBadges}
                      />
                      <span className="font-mono-num text-[9px] font-bold text-[#334155]">
                        {def.code}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </section>

      {/* CLASSIC HOLOCMS 2-COLUMN COMMUNITY WIDGETS GRID */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN (7 cols): Hot Rooms + My Tags */}
        <div className="space-y-4 lg:col-span-7">
          {/* HOT ROOMS / FEATURED ROOMS WIDGET */}
          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-blue flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2">
                <DoorOpen className="h-3.5 w-3.5" />
                Hot Rooms &amp; Featured Spaces
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'public', label: 'Public' },
                    { id: 'games', label: 'Games' },
                    { id: 'private', label: 'Suites' },
                  ] as { id: RoomFilter; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRoomFilter(tab.id)}
                    className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                      roomFilter === tab.id
                        ? 'border-[#000000] bg-white text-[#0f3454]'
                        : 'border-transparent bg-black/25 text-white hover:bg-black/40'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-[#cbd5e1] bg-white">
              {filteredRooms.map((room) => {
                const occ = room.baseOccupancy;
                const maxOcc = room.usersMax ?? 25;
                const occTone =
                  occ >= 15
                    ? 'border-[#7c2d12] bg-[#ffedd5] text-[#c2410c]'
                    : 'border-[#14532d] bg-[#dcfce7] text-[#15803d]';
                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between gap-3 p-2.5 hover:bg-[#f8fafc]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getRoomThumbnailImage(room)}
                        alt={room.name}
                        className="pixelated h-11 w-[72px] rounded-[2px] border border-[#000000] object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[12px] font-bold text-[#111827] truncate">
                            {room.name}
                          </h3>
                          <span
                            className={`rounded-[2px] border px-1.5 py-0.2 font-mono-num text-[9px] font-bold ${occTone}`}
                          >
                            {occ}/{maxOcc}
                          </span>
                        </div>
                        <p className="truncate text-[10px] text-[#475569]">{room.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEnterHotel(room.id)}
                      className="habbo-btn-green px-3 py-1 text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Enter Room
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* MY TAGS WIDGET (Authentic 2008 Habbo Tag Cloud) */}
          <section className="habbo-box" data-testid="me-tags-widget">
            <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-[#fef08a]" />
                My Tags
              </span>
              <span className="text-[10px] font-semibold text-amber-100">
                What are your favorite things?
              </span>
            </div>
            <div className="bg-white p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag, idx) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => updateAndSaveTags(removePlayerTag(tags, tag))}
                    title={`Remove tag "${tag}"`}
                    className={`inline-flex items-center gap-1 rounded-[2px] border border-[#94a3b8] px-2 py-0.5 font-bold hover:border-[#991b1b] hover:bg-[#fef2f2] hover:text-[#991b1b] cursor-pointer ${
                      idx % 3 === 0
                        ? 'bg-[#e8f4fc] text-[#1d4e78] text-[12px]'
                        : 'bg-[#f1f5f9] text-[#2b6ca3] text-[11px]'
                    }`}
                  >
                    <span>#{tag}</span>
                    <span className="text-[9px] opacity-60">×</span>
                  </button>
                ))}
              </div>
              <form onSubmit={handleAddTag} className="flex gap-1.5">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  maxLength={18}
                  placeholder="Add a tag (e.g. thrones, rooftop)..."
                  className="w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#111827] focus:border-[#eb7614] focus:outline-none"
                />
                <button
                  type="submit"
                  className="habbo-btn-blue inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold shrink-0 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add tag
                </button>
              </form>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (5 cols): Friends Online + Quick Vouchers + My Pets */}
        <aside className="space-y-4 lg:col-span-5">
          {/* FRIENDS ONLINE WIDGET */}
          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-green flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                Friends Online ({friends.filter((f) => f.online).length}/{friends.length})
              </span>
            </div>
            <div className="bg-white p-3">
              {friends.length === 0 ? (
                <p className="text-[11px] text-[#64748b]">
                  No friends added yet. Visit Players to add friends!
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {friends.map((friend) => {
                    const roomName = friend.roomId
                      ? rooms.find((r) => r.id === friend.roomId)?.name ?? 'Hotel Lobby'
                      : 'Offline';
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between gap-2 rounded-[2px] border border-[#cbd5e1] bg-[#f8fafc] p-2"
                      >
                        <button
                          type="button"
                          onClick={() => onInspectPlayer(friend.id)}
                          className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
                        >
                          <div className="relative rounded-[2px] border border-[#000000] bg-[#e8f4fc] p-0.5 shrink-0">
                            <PixelHeadCanvas look={friend.look} size={28} />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-[1px] border ${
                                friend.online
                                  ? 'bg-[#22c55e] border-[#14532d]'
                                  : 'bg-[#94a3b8] border-[#475569]'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-[#111827] group-hover:underline">
                              {friend.name}
                            </p>
                            <p className="truncate text-[9px] text-[#475569]">
                              {friend.online ? roomName : 'Offline'}
                            </p>
                          </div>
                        </button>
                        {friend.online && friend.roomId && (
                          <button
                            type="button"
                            onClick={() => onEnterHotel(friend.roomId)}
                            className="habbo-btn-blue px-2 py-0.5 text-[10px] font-bold shrink-0 cursor-pointer"
                          >
                            Follow
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* QUICK VOUCHER REDEEMER (Staff only: rank >= 4) */}
          {player.rank >= 4 && (
            <section className="habbo-box" data-testid="voucher-code-box">
              <div className="habbo-box-header habbo-header-blue flex items-center gap-2">
                <Gift className="h-3.5 w-3.5 text-[#fde047]" />
                Voucher Code Box
              </div>
              <div className="bg-white p-3 space-y-2">
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
                        <span className="font-mono-num text-[10px] font-bold">{v.code}</span>
                        <span className="text-[9px] font-semibold text-[#475569]">
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
                    className="w-full rounded-[2px] border border-[#000000] bg-white px-2 py-1 text-[11px] font-bold uppercase text-[#111827] focus:border-[#3d8b18] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="habbo-btn-green px-3 py-1 text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Redeem
                  </button>
                </form>
                {voucherFeedback && (
                  <p
                    role="status"
                    className={`rounded-[2px] border px-2 py-1 text-[10px] font-bold ${
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
          )}

          {/* MY PIXL PETS */}
          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <PawPrint className="h-3.5 w-3.5 text-[#fef08a]" />
                My PIXL Pets ({ownedPets.length})
              </span>
              <Crown className="h-3.5 w-3.5 text-[#fef08a]" />
            </div>
            <div className="divide-y divide-[#cbd5e1] bg-white">
              {ownedPets.length === 0 ? (
                <div className="p-3 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#000000] bg-[#fffbeb] shrink-0">
                      <PixelPetCanvas species="golden_terrier" size={34} />
                    </div>
                    <p className="text-[10px] text-[#475569]">
                      Adopt a Terrier, Kitten, or Baby Fire Dragon in the Hotel Catalogue!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEnterHotel()}
                    className="habbo-btn-blue px-2.5 py-1 text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Adopt
                  </button>
                </div>
              ) : (
                ownedPets.map((pet) => {
                  const def = getPetDef(pet.species);
                  const petRoom = rooms.find((r) => r.id === pet.roomId)?.name ?? 'Welcome Lounge';
                  return (
                    <div key={pet.id} className="p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#000000] bg-[#fffbeb] shrink-0">
                            <PixelPetCanvas species={pet.species} size={34} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-bold text-[#111827]">{pet.name}</p>
                            <p className="truncate text-[10px] text-[#475569]">
                              {def.name} · {petRoom}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onCarePet?.(pet.id, 'feed')}
                          className="habbo-btn-green px-2.5 py-0.5 text-[10px] font-bold shrink-0 cursor-pointer"
                        >
                          Feed
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-[#334155]">
                        <div className="flex items-center justify-between rounded-[2px] border border-[#cbd5e1] bg-[#f8fafc] px-2 py-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Utensils className="h-3 w-3 text-[#d97706]" /> Full
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
        </aside>
      </div>

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
            <div className="h-28 w-full border-b border-[#000000] overflow-hidden">
              <NewsPixelBanner article={openArticle} />
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

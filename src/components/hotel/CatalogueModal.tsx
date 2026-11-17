import { useState } from 'react';
import {
  Armchair,
  Coins,
  Crown,
  Flame,
  Lamp,
  Layers,
  PawPrint,
  Sparkles,
  Star,
  Table2,
  Trophy,
  X,
} from 'lucide-react';
import { FURNI_CATALOGUE } from '../../game/data';
import { PET_CATALOGUE } from '../../game/pets';
import type { FurniCategory, FurniItemDef, PetSpecies, PlayerState } from '../../game/types';
import { PixelFurniCanvas, PixelPetCanvas } from '../PixelSpriteCanvas';

interface CatalogueModalProps {
  player: PlayerState;
  onBuy: (
    furniId: string,
    quantity?: number,
    engravingMessage?: string
  ) => { ok: boolean; message: string };
  onBuyPet?: (species: PetSpecies, customName: string) => { ok: boolean; message: string };
  onClose: () => void;
}

type CatalogueSectionId =
  | 'front'
  | 'rares'
  | 'hc'
  | 'trophies'
  | 'pets'
  | 'seating'
  | 'tables'
  | 'lighting'
  | 'decor';

interface CatalogueSectionDef {
  id: CatalogueSectionId;
  label: string;
  tag?: 'NEW' | 'RARE' | 'HC';
  headerBg: string;
  tagline: string;
  bannerDesc: string;
  icon: 'star' | 'flame' | 'crown' | 'trophy' | 'pets' | 'chair' | 'table' | 'lamp' | 'decor';
  filter: (item: FurniItemDef) => boolean;
}

const SECTIONS: CatalogueSectionDef[] = [
  {
    id: 'front',
    label: 'Front Page',
    tag: 'NEW',
    headerBg: 'from-[#0d9488] to-[#0f766e]',
    tagline: 'PIXL Catalogue — Furni & Rares!',
    bannerDesc:
      'Hot pixel arrivals: PIXL Pets, Engraved Gold/Silver/Bronze Trophies, Petal Patches & Arcade Cabinets!',
    icon: 'star',
    filter: () => true,
  },
  {
    id: 'pets',
    label: 'Pets & Dragons',
    tag: 'NEW',
    headerBg: 'from-[#16a34a] to-[#15803d]',
    tagline: 'Adopt a Pixel Pet Companion!',
    bannerDesc:
      'Golden Terriers, Tabby Kittens & Baby Fire Dragons roam your room and obey chat commands (sit, lay, jump, speak)!',
    icon: 'pets',
    filter: () => false,
  },
  {
    id: 'trophies',
    label: 'Engraved Trophies',
    tag: 'NEW',
    headerBg: 'from-[#ca8a04] to-[#854d0e]',
    tagline: 'Custom Engraved PIXL Trophies',
    bannerDesc:
      'Inscribe your own dedication on Gold, Silver & Bronze Trophies—click any placed trophy to read its plaque!',
    icon: 'trophy',
    filter: (item) => item.category === 'trophies' || item.engravable === true,
  },
  {
    id: 'rares',
    label: 'Rares & Vault',
    tag: 'RARE',
    headerBg: 'from-[#b91c1c] to-[#7f1d1d]',
    tagline: 'Limited Hotel Vault Rares',
    bannerDesc:
      'Collector Thrones, Fire Dragon Lamps, Red Amber Lamps, Golden Fountains & Petal Patches.',
    icon: 'flame',
    filter: (item) => item.category === 'rares' || item.isRare === true,
  },
  {
    id: 'hc',
    label: 'PIXL Club (HC)',
    tag: 'HC',
    headerBg: 'from-[#d97706] to-[#92400e]',
    tagline: 'PIXL Club Luxury Couture',
    bannerDesc:
      'Exclusive scarlet velvet HC Sofas, Imperial Teleporters & Majestic Walnut seating.',
    icon: 'crown',
    filter: (item) => item.hcOnly === true || item.id === 'hc_sofa' || item.id === 'majestic_chair',
  },
  {
    id: 'seating',
    label: 'Seating & Sofas',
    headerBg: 'from-[#2563eb] to-[#1d4ed8]',
    tagline: 'Chairs, Pods & Lounge Sofas',
    bannerDesc:
      'Clickable sittable sofas and chairs—Mode Black, Aqua Pods, Lodge Benches & Club Sofas.',
    icon: 'chair',
    filter: (item) => item.category === 'seating',
  },
  {
    id: 'tables',
    label: 'Tables & Bars',
    headerBg: 'from-[#475569] to-[#334155]',
    tagline: 'Mode Bars, Tables & Fridges',
    bannerDesc:
      'Build your own cafe or suite bar with Mode Counters, Area Tables & Iced Mini Fridges.',
    icon: 'table',
    filter: (item) => item.category === 'tables',
  },
  {
    id: 'lighting',
    label: 'Lighting & Tech',
    tag: 'NEW',
    headerBg: 'from-[#7c3aed] to-[#5b21b6]',
    tagline: 'Arcade, Plasma TV & Disco',
    bannerDesc:
      'Animated pixel machines, Neon Banzai Barriers, Disco Floors, Lava Lamps & Retro Jukeboxes.',
    icon: 'lamp',
    filter: (item) => item.category === 'lighting' || item.id === 'jukebox',
  },
  {
    id: 'decor',
    label: 'Plants, Rugs & Decor',
    headerBg: 'from-[#15803d] to-[#166534]',
    tagline: 'Garden Turf, Rugs & Hearths',
    bannerDesc:
      'Walkable Crimson Carpets, Tropical Palms, Zen Bonsais & crackling Lodge Fireplaces.',
    icon: 'decor',
    filter: (item) =>
      (item.category as FurniCategory) === 'decor' || item.id === 'petal_patch',
  },
];

function SectionIcon({ icon }: { icon: CatalogueSectionDef['icon'] }) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  if (icon === 'star') return <Star className={cls} />;
  if (icon === 'pets') return <PawPrint className={cls} />;
  if (icon === 'trophy') return <Trophy className={cls} />;
  if (icon === 'flame') return <Flame className={cls} />;
  if (icon === 'crown') return <Crown className={cls} />;
  if (icon === 'chair') return <Armchair className={cls} />;
  if (icon === 'table') return <Table2 className={cls} />;
  if (icon === 'lamp') return <Lamp className={cls} />;
  return <Layers className={cls} />;
}

export function CatalogueModal({ player, onBuy, onBuyPet, onClose }: CatalogueModalProps) {
  const [sectionId, setSectionId] = useState<CatalogueSectionId>('front');
  const [selectedId, setSelectedId] = useState<string>(FURNI_CATALOGUE[0].id);
  const [selectedSpecies, setSelectedSpecies] = useState<PetSpecies>('golden_terrier');
  const [petName, setPetName] = useState('Bello');
  const [engravingText, setEngravingText] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const activeSection = SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0];
  const isPetsSection = sectionId === 'pets';
  const items = FURNI_CATALOGUE.filter(activeSection.filter);
  const selected = items.find((i) => i.id === selectedId) ?? items[0] ?? FURNI_CATALOGUE[0];
  const selectedPet = PET_CATALOGUE.find((p) => p.species === selectedSpecies) ?? PET_CATALOGUE[0];

  const handlePurchase = () => {
    if (isPetsSection) {
      if (!onBuyPet) return;
      const res = onBuyPet(selectedPet.species, petName);
      setFeedback({ ok: res.ok, text: res.message });
      return;
    }
    if (!selected) return;
    const res = onBuy(
      selected.id,
      quantity,
      selected.engravable ? engravingText : undefined
    );
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok && selected.engravable) setEngravingText('');
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="PIXL Catalogue"
    >
      {/* Classic PIXL Cream-Beige Catalogue Window */}
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-lg border-2 border-[#1b1922] bg-[#ece8dc] shadow-[0_14px_38px_rgba(0,0,0,0.65)]">
        {/* Authentic PIXL Charcoal Window Bar */}
        <div className="flex items-center justify-between border-b-2 border-[#1b1922] bg-gradient-to-b from-[#45484d] to-[#2b2d31] px-3.5 py-2 text-white">
          <div className="flex items-center gap-2.5">
            <span className="rounded border border-[#854d0e] bg-[#facc15] px-1.5 py-0.5 font-pixel text-[10px] text-[#1b1922]">
              SHOP
            </span>
            <span className="font-pixel text-sm tracking-wide">PIXL Catalogue</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded border border-black/40 bg-black/35 px-2 py-0.5 font-mono-num text-[#ffd400]">
              <Coins className="h-3.5 w-3.5" /> {player.credits}
            </span>
            <span className="inline-flex items-center gap-1 rounded border border-black/40 bg-black/35 px-2 py-0.5 font-mono-num text-[#d8b4fe]">
              <Sparkles className="h-3.5 w-3.5" /> {player.duckets}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Catalogue"
              className="rounded border border-white/30 bg-[#b91c1c] p-1 hover:bg-[#dc2626] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Classic Two-Pane Book Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* LEFT PANE: CATALOGUE NAVIGATION TREE */}
          <aside className="border-b-2 md:border-b-0 md:border-r-2 border-[#b5afa0] bg-[#dfd9c8] p-2.5 md:col-span-4 flex flex-col justify-between">
            <div>
              <p className="px-2 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-[#57534e]">
                Browse Sections
              </p>
              <nav aria-label="Catalogue sections" className="space-y-1">
                {SECTIONS.map((sec) => {
                  const active = sec.id === sectionId;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      data-testid={`cat-section-${sec.id}`}
                      onClick={() => {
                        setSectionId(sec.id);
                        setFeedback(null);
                        if (sec.id === 'pets') {
                          setSelectedSpecies('golden_terrier');
                          setPetName('Bello');
                        } else {
                          const firstMatch = FURNI_CATALOGUE.find(sec.filter);
                          if (firstMatch) setSelectedId(firstMatch.id);
                        }
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded border px-2.5 py-2 text-left text-xs font-bold cursor-pointer transition-colors ${
                        active
                          ? 'border-[#1d4ed8] bg-[#2b7de9] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                          : 'border-[#c4bead] bg-[#f7f4ec] text-slate-800 hover:bg-white'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <SectionIcon icon={sec.icon} />
                        <span className="truncate">{sec.label}</span>
                      </span>
                      {sec.tag && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-pixel text-[8px] leading-none ${
                            sec.tag === 'RARE'
                              ? 'bg-[#dc2626] text-white'
                              : sec.tag === 'HC'
                              ? 'bg-[#eab308] text-[#1c1917]'
                              : 'bg-[#16a34a] text-white'
                          }`}
                        >
                          {sec.tag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Classic PIXL Purse Note at bottom-left */}
            <div className="mt-4 rounded border border-[#b5afa0] bg-[#f7f4ec] p-2.5 text-[11px] text-slate-700">
              <p className="font-extrabold text-slate-900">Your PIXL Purse</p>
              <p className="mt-0.5">
                Furni goes directly to your <strong>Inventory</strong>. Adopted <strong>Pets</strong> join you straight inside the room!
              </p>
            </div>
          </aside>

          {/* RIGHT PANE: SECTION BANNER + ITEM GRID + STAGE PREVIEW */}
          <div className="p-3.5 md:col-span-8 space-y-3">
            {/* Classic Habbo Section Promo Header Banner */}
            <div
              className={`relative overflow-hidden rounded border-2 border-[#1b1922] bg-gradient-to-r ${activeSection.headerBg} px-4 py-3 text-white shadow-inner`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-pixel text-sm sm:text-base drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]">
                    {activeSection.tagline}
                  </h2>
                  <p className="mt-0.5 text-xs text-white/90">{activeSection.bannerDesc}</p>
                </div>
                <span className="hidden sm:inline-block rounded border border-white/40 bg-black/25 px-2.5 py-1 font-mono-num text-xs font-bold shrink-0">
                  {isPetsSection ? `${PET_CATALOGUE.length} pets` : `${items.length} items`}
                </span>
              </div>
            </div>

            {/* PETS SELECTION OR FURNI SELECTION */}
            {isPetsSection ? (
              <>
                <div className="grid grid-cols-3 gap-2 rounded border border-[#c4bead] bg-[#d5cfc0] p-2">
                  {PET_CATALOGUE.map((pet) => {
                    const active = selectedSpecies === pet.species;
                    return (
                      <button
                        key={pet.species}
                        type="button"
                        data-testid={`cat-pet-${pet.species}`}
                        onClick={() => {
                          setSelectedSpecies(pet.species);
                          setPetName(
                            pet.species === 'golden_terrier'
                              ? 'Bello'
                              : pet.species === 'tabby_kitten'
                              ? 'Mimi'
                              : 'Sparky'
                          );
                          setFeedback(null);
                        }}
                        className={`flex flex-col items-center justify-between rounded border-2 p-2.5 text-center cursor-pointer transition-all ${
                          active
                            ? 'border-[#1d4ed8] bg-white shadow-[0_0_0_2px_#93c5fd]'
                            : 'border-[#b5afa0] bg-[#f9f7f2] hover:bg-white'
                        }`}
                      >
                        <PixelPetCanvas species={pet.species} size={52} />
                        <span className="mt-1 w-full truncate text-[11px] font-extrabold text-slate-900">
                          {pet.name}
                        </span>
                        <span className="mt-0.5 font-mono-num text-[10px] font-extrabold text-amber-800">
                          {pet.costCredits}c
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Pet Pedestal Showcase + Custom Pet Name */}
                <div className="rounded border-2 border-[#b5afa0] bg-white p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex h-28 w-full sm:w-32 items-center justify-center rounded border-2 border-[#8eb5d3] bg-gradient-to-b from-[#1e3a5f] to-[#2e5d8c] shrink-0 overflow-hidden">
                      <PixelPetCanvas species={selectedPet.species} size={74} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="text-base font-extrabold text-slate-900">{selectedPet.name}</h3>
                      <p className="text-xs leading-relaxed text-slate-600">
                        {selectedPet.description}
                      </p>

                      <div>
                        <label htmlFor="cat-pet-name" className="block text-[11px] font-extrabold text-slate-700">
                          Custom Pet Name
                        </label>
                        <input
                          id="cat-pet-name"
                          data-testid="cat-pet-name-input"
                          type="text"
                          maxLength={18}
                          value={petName}
                          onChange={(e) => setPetName(e.target.value)}
                          placeholder="Name your pet..."
                          className="mt-1 w-full rounded border-2 border-[#c4bead] bg-[#faf8f4] px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-[#2b7de9] focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="inline-flex items-center gap-1 font-mono-num text-xs font-extrabold text-amber-700">
                          <Coins className="h-3.5 w-3.5" /> {selectedPet.costCredits} Credits
                        </span>
                        <button
                          type="button"
                          data-testid="cat-adopt-pet-btn"
                          onClick={handlePurchase}
                          className="habbo-btn-green rounded px-5 py-2 font-pixel text-xs cursor-pointer"
                        >
                          Adopt Pet
                        </button>
                      </div>

                      {feedback && (
                        <p
                          role="status"
                          className={`rounded border px-2.5 py-1 text-[11px] font-bold ${
                            feedback.ok
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-rose-300 bg-rose-50 text-rose-800'
                          }`}
                        >
                          {feedback.text}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Item Selection Grid */}
                <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto rounded border border-[#c4bead] bg-[#d5cfc0] p-2 sm:grid-cols-4">
                  {items.map((item) => {
                    const active = selected?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`cat-item-${item.id}`}
                        onClick={() => {
                          setSelectedId(item.id);
                          setQuantity(1);
                          setFeedback(null);
                        }}
                        className={`relative flex flex-col items-center justify-between rounded border-2 p-2 text-center cursor-pointer transition-all ${
                          active
                            ? 'border-[#1d4ed8] bg-white shadow-[0_0_0_2px_#93c5fd]'
                            : 'border-[#b5afa0] bg-[#f9f7f2] hover:bg-white'
                        }`}
                      >
                        {item.isRare && (
                          <span className="absolute top-1 left-1 rounded bg-[#dc2626] px-1 py-0.5 font-pixel text-[7px] leading-none text-white">
                            RARE
                          </span>
                        )}
                        {item.hcOnly && (
                          <span className="absolute top-1 right-1 rounded bg-[#eab308] px-1 py-0.5 font-pixel text-[7px] leading-none text-slate-950">
                            HC
                          </span>
                        )}
                        <PixelFurniCanvas furniId={item.id} size={46} />
                        <span className="mt-1 w-full truncate text-[11px] font-extrabold text-slate-900">
                          {item.name}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 font-mono-num text-[10px] font-extrabold text-amber-800">
                          {item.costCredits > 0 ? `${item.costCredits}c` : ''}
                          {item.costCredits > 0 && item.costDuckets > 0 ? ' + ' : ''}
                          {item.costDuckets > 0 ? `${item.costDuckets}d` : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Furni Isometric Showcase + Buy Controls */}
                {selected && (
                  <div className="rounded border-2 border-[#b5afa0] bg-white p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {/* Isometric Room-Tile Pedestal Preview */}
                      <div className="relative flex h-28 w-full sm:w-32 items-center justify-center rounded border-2 border-[#8eb5d3] bg-gradient-to-b from-[#1e3a5f] to-[#2e5d8c] shrink-0 overflow-hidden">
                        <svg
                          className="pointer-events-none absolute bottom-2 h-10 w-24 opacity-85"
                          viewBox="0 0 64 32"
                          shapeRendering="crispEdges"
                        >
                          <polygon
                            points="32,2 62,16 32,30 2,16"
                            fill="#c89254"
                            stroke="#1b1922"
                            strokeWidth="1.5"
                          />
                          <polygon points="2,16 32,30 32,32 2,18" fill="#6b421c" />
                          <polygon points="32,30 62,16 62,18 32,32" fill="#885626" />
                        </svg>
                        <div className="relative z-10 -mt-3">
                          <PixelFurniCanvas furniId={selected.id} size={68} />
                        </div>
                      </div>

                      {/* Description, Quantity, Engraving & Purchase */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-base font-extrabold text-slate-900">{selected.name}</h3>
                          <div className="flex items-center gap-1">
                            {[1, 2, 5].map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => setQuantity(q)}
                                className={`rounded border px-2 py-0.5 font-mono-num text-[11px] font-bold cursor-pointer ${
                                  quantity === q
                                    ? 'border-[#235c8a] bg-[#235c8a] text-white'
                                    : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {q}x
                              </button>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-600">{selected.description}</p>

                        {selected.engravable && (
                          <div>
                            <label
                              htmlFor="cat-trophy-engraving"
                              className="block text-[11px] font-extrabold text-amber-900"
                            >
                              Custom Engraving Message
                            </label>
                            <input
                              id="cat-trophy-engraving"
                              data-testid="cat-trophy-engraving-input"
                              type="text"
                              maxLength={80}
                              value={engravingText}
                              onChange={(e) => setEngravingText(e.target.value)}
                              placeholder="Enter plaque inscription (e.g. Best Room 2026)..."
                              className="mt-1 w-full rounded border-2 border-amber-300 bg-amber-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-600 focus:outline-none"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2 font-mono-num text-xs font-extrabold">
                            <span className="text-slate-500 font-sans">Total:</span>
                            {selected.costCredits > 0 && (
                              <span className="inline-flex items-center gap-1 text-amber-700">
                                <Coins className="h-3.5 w-3.5" /> {selected.costCredits * quantity} Credits
                              </span>
                            )}
                            {selected.costDuckets > 0 && (
                              <span className="inline-flex items-center gap-1 text-violet-700">
                                <Sparkles className="h-3.5 w-3.5" /> {selected.costDuckets * quantity} Duckets
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handlePurchase}
                            className="habbo-btn-green rounded px-6 py-2 font-pixel text-xs cursor-pointer"
                          >
                            Buy Item
                          </button>
                        </div>

                        {feedback && (
                          <p
                            role="status"
                            className={`rounded border px-2.5 py-1 text-[11px] font-bold ${
                              feedback.ok
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : 'border-rose-300 bg-rose-50 text-rose-800'
                            }`}
                          >
                            {feedback.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Coins, Crown, Flame, PawPrint, Sparkles, Star, Trophy } from 'lucide-react';
import {
  CATALOG_ITEMS_SEED,
  CATALOG_PAGES_SEED,
  findFurniDef,
  FURNI_CATALOGUE,
} from '../../game/data';
import { PET_CATALOGUE } from '../../game/pets';
import type {
  CatalogEntryView,
  CatalogItemRow,
  CatalogPageRow,
  PetSpecies,
  PlayerState,
} from '../../game/types';
import { FurniPreviewImg, PixelPetCanvas } from '../PixelSpriteCanvas';

interface CatalogueModalProps {
  player: PlayerState;
  catalogPages?: CatalogPageRow[];
  catalogItems?: CatalogItemRow[];
  onBuy: (
    furniId: string,
    quantity?: number,
    engravingMessage?: string
  ) => { ok: boolean; message: string };
  onBuyPet?: (species: PetSpecies, customName: string) => { ok: boolean; message: string };
  onClose: () => void;
}

const SECTION_DESCRIPTIONS: Record<string, { banner: string; headerBg: string; tag?: string }> = {
  'PIXL Club': {
    banner: 'Iconic velvet PIXL Club Sofas, Imperial Teleporters, Mahogany Desks, Butler Statues & Gramophones.',
    headerBg: 'from-[#d97706] to-[#92400e]',
    tag: 'PC',
  },
  'HC Classics': {
    banner: 'Iconic velvet PIXL Club Sofas, Imperial Teleporters, Mahogany Desks, Butler Statues & Gramophones.',
    headerBg: 'from-[#d97706] to-[#92400e]',
    tag: 'PC',
  },
  'Rares & Dragons': {
    banner: 'Collector Thrones, Fire/Jade/Silver/Gold/Sky/Frost Dragon Lamps, Dino Eggs & Habbo Colas.',
    headerBg: 'from-[#b91c1c] to-[#7f1d1d]',
    tag: 'RARE',
  },
  'Mode & Industrial': {
    banner: 'Brushed-steel Mode Sofas, Mode Bars, Corner Counters, Dining Sets & Industrial Dividers.',
    headerBg: 'from-[#334155] to-[#1e293b]',
  },
  'Pura & Modern': {
    banner: 'Clean cyan & magenta Pura Sofas, Aqua Pod Chairs, Pura Double Beds, Bubble Lamps & Fridges.',
    headerBg: 'from-[#0284c7] to-[#1d4e78]',
  },
  'Area & Lodge': {
    banner: 'Warm timber Lodge Bars, Roaring Stone Fireplaces, Green Area Sofas, Bookcases &Rustic Tables.',
    headerBg: 'from-[#92400e] to-[#78350f]',
  },
  'Iced & Plasto': {
    banner: 'Translucent colourful Plasto Pod Chairs, Round Tables, Iced Sofas, Solariums & Shutters.',
    headerBg: 'from-[#2563eb] to-[#1e40af]',
  },
  'Club, Disco & Arcade': {
    banner: 'Neon Disco Floors, DJ Decks, Jukeboxes, Smoke Machines, Laser Gates & Retro Arcade Cabinets.',
    headerBg: 'from-[#7c3aed] to-[#4c1d95]',
    tag: 'NEW',
  },
  'Beach, Tiki & Nature': {
    banner: 'The Lido Sun Loungers, Tiki Bars, Flaming Torches, Waterfall Rocks, Duck Floats & Palms.',
    headerBg: 'from-[#0d9488] to-[#115e59]',
    tag: 'NEW',
  },
  'Trophies & Wall Decor': {
    banner: 'Custom-engraved Gold/Silver/Bronze/Diamond Trophies, Wall Posters, Flags, Clocks &Plaques.',
    headerBg: 'from-[#ca8a04] to-[#854d0e]',
    tag: 'NEW',
  },
  'Rugs & Floor Mats': {
    banner: 'Royal Red Carpets, Persian Rugs, Bearskin Rugs, Dance Floor Tiles, Ice Rinks & Cobblestones.',
    headerBg: 'from-[#16a34a] to-[#15803d]',
  },
  'Mode & Pura': {
    banner: 'Brushed-steel Mode Bars, Aqua Pod Chairs, Iced Mini Fridges & Pura Couches.',
    headerBg: 'from-[#2b6ca3] to-[#1d4e78]',
  },
  'Nature & Beach': {
    banner: 'The Lido Sun Loungers, Beach Parasols, Duck Floats, Tropical Palms & Pine Trees.',
    headerBg: 'from-[#0284c7] to-[#0369a1]',
  },
  'Club & Disco': {
    banner: 'Neon Disco Floors, Chrome Disco Balls, DJ Booths, Arcade Cabinets & Plasma TVs.',
    headerBg: 'from-[#7c3aed] to-[#4c1d95]',
  },
  'Pets & Trophies': {
    banner: 'Custom-engraved Gold/Silver/Bronze Trophies, Crimson Rugs, Pet Bowls & Fireplaces.',
    headerBg: 'from-[#16a34a] to-[#15803d]',
  },
  'Staff Super Rares': {
    banner: 'Ultra-rare LTD Glacial Thrones, Silver Dragons, Golden Frank & Velvet Stanchions.',
    headerBg: 'from-[#4b708f] to-[#1e293b]',
    tag: 'LTD',
  },
};

export function CatalogueModal({
  player,
  catalogPages,
  catalogItems,
  onBuy,
  onBuyPet,
  onClose,
}: CatalogueModalProps) {
  const pages = useMemo(() => {
    const src = catalogPages && catalogPages.length > 0 ? catalogPages : CATALOG_PAGES_SEED;
    return src.filter((p) => p.visible && p.min_rank <= player.rank);
  }, [catalogPages, player.rank]);

  const allEntries = useMemo<CatalogEntryView[]>(() => {
    const rawItems = catalogItems && catalogItems.length > 0 ? catalogItems : CATALOG_ITEMS_SEED;
    return rawItems.map((row) => {
      const def = findFurniDef(row.item_type);
      return {
        dbId: row.id,
        pageId: row.page_id,
        furniId: def?.id ?? row.item_type,
        catalogName: row.catalog_name,
        description: def?.description ?? 'Classic PIXL Hotel catalog item ready for your suite.',
        costCredits: row.cost_credits,
        costDuckets: row.cost_duckets,
        amount: row.amount || 1,
        category: def?.category ?? 'decor',
        isRare: def?.isRare,
        isLtd: def?.isLtd,
        hcOnly: def?.hcOnly,
        engravable: def?.engravable,
      };
    });
  }, [catalogItems]);

  const [selectedTab, setSelectedTab] = useState<'page' | 'pets'>('page');
  const [activePageId, setActivePageId] = useState<number>(() => pages[0]?.id ?? 1);
  const [selectedFurniId, setSelectedFurniId] = useState<string>(
    () => allEntries.find((e) => e.pageId === (pages[0]?.id ?? 1))?.furniId ?? FURNI_CATALOGUE[0].id
  );
  const [selectedSpecies, setSelectedSpecies] = useState<PetSpecies>('golden_terrier');
  const [petName, setPetName] = useState('Bello');
  const [engravingText, setEngravingText] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0] ?? CATALOG_PAGES_SEED[0];
  const pageItems = allEntries.filter((e) => e.pageId === activePage.id);
  const selectedEntry =
    pageItems.find((e) => e.furniId === selectedFurniId) ?? pageItems[0] ?? allEntries[0];
  const selectedPet = PET_CATALOGUE.find((p) => p.species === selectedSpecies) ?? PET_CATALOGUE[0];
  const meta = SECTION_DESCRIPTIONS[activePage.caption] ?? {
    banner: 'Browse official PIXL Hotel furniture and collector items.',
    headerBg: 'from-[#4b708f] to-[#365672]',
  };

  const handlePurchase = () => {
    if (selectedTab === 'pets') {
      if (!onBuyPet) return;
      const res = onBuyPet(selectedPet.species, petName);
      setFeedback({ ok: res.ok, text: res.message });
      return;
    }
    if (!selectedEntry) return;
    const res = onBuy(
      selectedEntry.furniId,
      quantity,
      selectedEntry.engravable ? engravingText : undefined
    );
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok && selectedEntry.engravable) setEngravingText('');
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="PIXL Catalogue"
      data-testid="client-catalogue-modal"
    >
      {/* Classic 2008 Habbo Shockwave #ececec Window with 1px black border + pixel bevel */}
      <div className="client-window w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="client-window-bar relative flex items-center justify-between px-3 py-1.5">
          <span className="font-bold text-[11px] text-white">
            PIXL Hotel Catalogue ({allEntries.length} Items)
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Catalogue"
            className="client-close-btn"
          >
            ×
          </button>
        </div>

        {/* Classic Habbo Catalogue Top Purse Strip (Taler, Duckets & PIXL Club) */}
        <div
          data-testid="catalogue-purse-strip"
          className="flex flex-wrap items-center justify-between gap-2 border-b border-[#999999] bg-[#dfdfdf] px-3 py-1.5 text-[11px] font-bold text-[#111827]"
        >
          <span>Your PIXL Purse:</span>
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="catalogue-credits"
              className="inline-flex items-center gap-1 border border-[#000000] bg-[#fef08a] px-2 py-0.5 font-mono-num text-[11px] font-bold text-[#111827]"
            >
              {player.credits} Taler (Credits)
            </span>
            <span
              data-testid="catalogue-duckets"
              className="inline-flex items-center gap-1 border border-[#000000] bg-[#e9d5ff] px-2 py-0.5 font-mono-num text-[11px] font-bold text-[#111827]"
            >
              {player.duckets} Duckets
            </span>
            <span
              data-testid="catalogue-pc-days"
              className="inline-flex items-center gap-1 border border-[#000000] bg-[#fed7aa] px-2 py-0.5 font-mono-num text-[11px] font-bold text-[#111827]"
            >
              {player.hcDays}d PIXL Club (PC)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* LEFT PANE: 7 DATABASE SECTIONS + PETS ADOPTION TAB */}
          <aside className="border-b md:border-b-0 md:border-r border-[#999999] bg-[#dfdfdf] p-2.5 md:col-span-4 flex flex-col justify-between">
            <div>
              <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#374151]">
                Catalogue Sections ({pages.length})
              </p>
              <nav aria-label="Catalogue sections" className="space-y-1">
                {pages.map((pg) => {
                  const active = selectedTab === 'page' && activePage.id === pg.id;
                  const count = allEntries.filter((e) => e.pageId === pg.id).length;
                  const sMeta = SECTION_DESCRIPTIONS[pg.caption];
                  return (
                    <button
                      key={pg.id}
                      type="button"
                      data-testid={`cat-page-${pg.id}`}
                      onClick={() => {
                        setSelectedTab('page');
                        setActivePageId(pg.id);
                        setFeedback(null);
                        const first = allEntries.find((e) => e.pageId === pg.id);
                        if (first) setSelectedFurniId(first.furniId);
                      }}
                      className={`flex w-full items-center justify-between gap-2 border px-2 py-1.5 text-left text-[11px] font-bold cursor-pointer rounded-[2px] ${
                        active
                          ? 'border-[#000000] bg-[#2b6ca3] text-white'
                          : 'border-[#a3a3a3] bg-[#ffffff] text-[#111827] hover:bg-[#eef6fd]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 truncate">
                        {sMeta?.tag === 'RARE' || sMeta?.tag === 'LTD' ? (
                          <Flame className="h-3.5 w-3.5 shrink-0 text-[#f59e0b]" />
                        ) : sMeta?.tag === 'PC' || sMeta?.tag === 'HC' ? (
                          <Crown className="h-3.5 w-3.5 shrink-0 text-[#eab308]" />
                        ) : pg.caption.includes('Trophies') ? (
                          <Trophy className="h-3.5 w-3.5 shrink-0 text-[#d97706]" />
                        ) : (
                          <Star className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]" />
                        )}
                        <span className="truncate">{pg.caption === 'HC Classics' ? 'PIXL Club' : pg.caption}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {sMeta?.tag && (
                          <span
                            className={`border border-[#000000] px-1 py-0.5 font-pixel text-[7px] leading-none rounded-[2px] ${
                              sMeta.tag === 'RARE' || sMeta.tag === 'LTD'
                                ? 'bg-[#b91c1c] text-white'
                                : sMeta.tag === 'PC' || sMeta.tag === 'HC'
                                ? 'bg-[#eab308] text-[#111827]'
                                : 'bg-[#3d8b18] text-white'
                            }`}
                          >
                            {sMeta.tag}
                          </span>
                        )}
                        <span
                          className={`font-mono-num text-[10px] ${
                            active ? 'text-[#dbeafe]' : 'text-[#64748b]'
                          }`}
                        >
                          ({count})
                        </span>
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  data-testid="cat-section-pets"
                  onClick={() => {
                    setSelectedTab('pets');
                    setFeedback(null);
                  }}
                  className={`flex w-full items-center justify-between gap-2 border px-2 py-1.5 text-left text-[11px] font-bold cursor-pointer rounded-[2px] ${
                    selectedTab === 'pets'
                      ? 'border-[#000000] bg-[#3d8b18] text-white'
                      : 'border-[#a3a3a3] bg-[#ffffff] text-[#111827] hover:bg-[#ecfdf5]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <PawPrint className="h-3.5 w-3.5 shrink-0 text-[#f59e0b]" />
                    Adopt a Pet
                  </span>
                  <span className="border border-[#000000] bg-[#5bb52c] px-1 py-0.5 font-pixel text-[7px] text-white rounded-[2px]">
                    PETS
                  </span>
                </button>
              </nav>
            </div>

            <div className="mt-3 border border-[#999999] bg-[#ffffff] p-2 text-[11px] text-[#374151] rounded-[2px]">
              <p className="font-bold text-[#111827]">Classic Catalogue Info</p>
              <p className="mt-0.5 leading-snug">
                Purchased furni goes to your <strong>Inventory</strong>. Adopted pets appear straight inside your current room!
              </p>
            </div>
          </aside>

          {/* RIGHT PANE: BANNER + ITEM GRID + PREVIEW */}
          <div className="p-3 md:col-span-8 space-y-2.5 bg-[#ececec]">
            <div
              className={`border border-[#000000] bg-gradient-to-r ${
                selectedTab === 'pets' ? 'from-[#5bb52c] to-[#3d8b18]' : meta.headerBg
              } px-3.5 py-2.5 text-white rounded-[2px]`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-pixel text-sm leading-tight">
                    {selectedTab === 'pets' ? 'Adopt a PIXL Pet!' : activePage.caption}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-white/95">
                    {selectedTab === 'pets'
                      ? 'Golden Terriers, Tabby Kittens & Baby Fire Dragons roam and obey chat commands (sit, lay, jump, speak)!'
                      : meta.banner}
                  </p>
                </div>
                <span className="hidden sm:inline-block border border-[#000000] bg-black/35 px-2 py-0.5 font-mono-num text-[11px] font-bold shrink-0 rounded-[2px]">
                  {selectedTab === 'pets' ? `${PET_CATALOGUE.length} pets` : `${pageItems.length} items`}
                </span>
              </div>
            </div>

            {selectedTab === 'pets' ? (
              <>
                <div className="grid grid-cols-3 gap-2 border border-[#999999] bg-[#d4d4d4] p-2 rounded-[2px]">
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
                        className={`flex flex-col items-center justify-between border p-2 text-center cursor-pointer rounded-[2px] ${
                          active
                            ? 'border-[#000000] bg-[#ffffff] ring-2 ring-[#2b6ca3]'
                            : 'border-[#999999] bg-[#f7f7f7] hover:bg-white'
                        }`}
                      >
                        <PixelPetCanvas species={pet.species} size={48} />
                        <span className="mt-1 w-full truncate text-[11px] font-bold text-[#111827]">
                          {pet.name}
                        </span>
                        <span className="mt-0.5 font-mono-num text-[10px] font-bold text-[#b45309]">
                          {pet.costCredits}c
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="border border-[#999999] bg-[#ffffff] p-3 rounded-[2px]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-full sm:w-28 items-center justify-center border border-[#000000] bg-[#1d4e78] shrink-0 rounded-[2px]">
                      <PixelPetCanvas species={selectedPet.species} size={68} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="text-[13px] font-bold text-[#111827]">{selectedPet.name}</h3>
                      <p className="text-[11px] text-[#4b5563]">{selectedPet.description}</p>
                      <div>
                        <label htmlFor="cat-pet-name" className="block text-[11px] font-bold text-[#111827]">
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
                          className="mt-1 w-full border border-[#6b7280] bg-white px-2.5 py-1 text-xs font-bold text-[#111827] focus:border-[#2b6ca3] focus:outline-none rounded-[2px]"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 font-mono-num text-xs font-bold text-[#b45309]">
                          <Coins className="h-3.5 w-3.5" /> {selectedPet.costCredits} Credits
                        </span>
                        <button
                          type="button"
                          data-testid="cat-adopt-pet-btn"
                          onClick={handlePurchase}
                          className="habbo-btn-green px-4 py-1.5 font-pixel text-[11px] cursor-pointer"
                        >
                          Adopt Pet
                        </button>
                      </div>
                      {feedback && (
                        <p
                          role="status"
                          className={`border px-2.5 py-1 text-[11px] font-bold rounded-[2px] ${
                            feedback.ok
                              ? 'border-[#16a34a] bg-[#f0fdf4] text-[#14532d]'
                              : 'border-[#dc2626] bg-[#fef2f2] text-[#7f1d1d]'
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
                {/* Item Grid using real PNG FurniPreviewImg */}
                <div className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto border border-[#999999] bg-[#d4d4d4] p-2 sm:grid-cols-4 rounded-[2px]">
                  {pageItems.map((item) => {
                    const active = selectedEntry?.furniId === item.furniId;
                    return (
                      <button
                        key={`${item.pageId}-${item.furniId}-${item.dbId ?? ''}`}
                        type="button"
                        data-testid={`cat-item-${item.furniId}`}
                        onClick={() => {
                          setSelectedFurniId(item.furniId);
                          setQuantity(1);
                          setFeedback(null);
                        }}
                        className={`relative flex flex-col items-center justify-between border p-1.5 text-center cursor-pointer rounded-[2px] ${
                          active
                            ? 'border-[#000000] bg-[#ffffff] ring-2 ring-[#2b6ca3]'
                            : 'border-[#a3a3a3] bg-[#f9fafb] hover:bg-white'
                        }`}
                      >
                        {(item.isLtd || item.isRare) && (
                          <span
                            className={`absolute top-1 left-1 border border-[#000000] px-1 py-0.5 font-pixel text-[7px] leading-none text-white rounded-[1px] ${
                              item.isLtd ? 'bg-[#7c3aed]' : 'bg-[#b91c1c]'
                            }`}
                          >
                            {item.isLtd ? 'LTD' : 'RARE'}
                          </span>
                        )}
                        {item.hcOnly && (
                          <span className="absolute top-1 right-1 border border-[#000000] bg-[#eab308] px-1 py-0.5 font-pixel text-[7px] leading-none text-[#111827] rounded-[1px]">
                            PC
                          </span>
                        )}
                        {item.amount > 1 && (
                          <span className="absolute top-1 left-1 border border-[#000000] bg-[#ca8a04] px-1 py-0.5 font-pixel text-[7px] leading-none text-white rounded-[1px]">
                            {item.amount}x
                          </span>
                        )}
                        <FurniPreviewImg itemType={item.furniId} alt={item.catalogName} size={46} />
                        <span className="mt-1 w-full truncate text-[10px] font-bold text-[#111827]">
                          {item.catalogName}
                        </span>
                        <span className="mt-0.5 font-mono-num text-[10px] font-bold text-[#b45309]">
                          {item.costCredits > 0 ? `${item.costCredits}c` : ''}
                          {item.costCredits > 0 && item.costDuckets > 0 ? '+' : ''}
                          {item.costDuckets > 0 ? `${item.costDuckets}d` : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Item Preview & Buy Controls */}
                {selectedEntry && (
                  <div className="border border-[#999999] bg-[#ffffff] p-3 rounded-[2px]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative flex h-24 w-full sm:w-28 items-center justify-center border border-[#000000] bg-[#1d4e78] shrink-0 overflow-hidden rounded-[2px]">
                        <FurniPreviewImg
                          itemType={selectedEntry.furniId}
                          alt={selectedEntry.catalogName}
                          size={72}
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-[13px] font-bold text-[#111827]">
                            {selectedEntry.catalogName}
                          </h3>
                          <div className="flex items-center gap-1">
                            {[1, 2, 5].map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => setQuantity(q)}
                                className={`border px-2 py-0.5 font-mono-num text-[10px] font-bold cursor-pointer rounded-[2px] ${
                                  quantity === q
                                    ? 'border-[#000000] bg-[#2b6ca3] text-white'
                                    : 'border-[#a3a3a3] bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb]'
                                }`}
                              >
                                {q}x
                              </button>
                            ))}
                          </div>
                        </div>

                        <p className="text-[11px] text-[#4b5563] leading-snug">
                          {selectedEntry.description}
                          {selectedEntry.amount > 1 && (
                            <span className="ml-1 font-bold text-[#0f766e]">
                              (Pack grants {selectedEntry.amount * quantity}x items)
                            </span>
                          )}
                        </p>

                        {selectedEntry.engravable && (
                          <div>
                            <label
                              htmlFor="cat-trophy-engraving"
                              className="block text-[10px] font-bold text-[#92400e]"
                            >
                              Custom Engraving Inscription
                            </label>
                            <input
                              id="cat-trophy-engraving"
                              data-testid="cat-trophy-engraving-input"
                              type="text"
                              maxLength={80}
                              value={engravingText}
                              onChange={(e) => setEngravingText(e.target.value)}
                              placeholder="Enter dedication (e.g. Best Room 2026)..."
                              className="mt-1 w-full border border-[#d97706] bg-[#fffbeb] px-2 py-1 text-xs font-semibold text-[#111827] focus:outline-none rounded-[2px]"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2 font-mono-num text-xs font-bold">
                            <span className="text-[#4b5563] font-sans text-[11px]">Total:</span>
                            {selectedEntry.costCredits > 0 && (
                              <span className="inline-flex items-center gap-1 text-[#b45309]">
                                <Coins className="h-3.5 w-3.5" /> {selectedEntry.costCredits * quantity}c
                              </span>
                            )}
                            {selectedEntry.costDuckets > 0 && (
                              <span className="inline-flex items-center gap-1 text-[#6d28d9]">
                                <Sparkles className="h-3.5 w-3.5" /> {selectedEntry.costDuckets * quantity}d
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handlePurchase}
                            className="habbo-btn-green px-5 py-1.5 text-[12px] font-bold uppercase tracking-wide cursor-pointer"
                          >
                            Buy Now
                          </button>
                        </div>

                        {feedback && (
                          <p
                            role="status"
                            className={`border px-2.5 py-1 text-[11px] font-bold rounded-[2px] ${
                              feedback.ok
                                ? 'border-[#16a34a] bg-[#f0fdf4] text-[#14532d]'
                                : 'border-[#dc2626] bg-[#fef2f2] text-[#7f1d1d]'
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

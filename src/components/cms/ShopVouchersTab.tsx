import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Coins,
  Gift,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import {
  CATALOG_ITEMS_SEED,
  CATALOG_PAGES_SEED,
  findFurniDef,
} from '../../game/data';
import type {
  CatalogItemRow,
  CatalogPageRow,
  PlayerState,
} from '../../game/types';
import { FurniPreviewImg } from '../PixelSpriteCanvas';

interface ShopVouchersTabProps {
  player: PlayerState;
  catalogPages?: CatalogPageRow[];
  catalogItems?: CatalogItemRow[];
  onBuyItem: (furniId: string, quantity?: number) => { ok: boolean; message: string };
  onRedeemVoucher: (code: string) => { ok: boolean; message: string };
}

type ShopSortMode = 'featured' | 'price-asc' | 'price-desc' | 'rares-first';

const PROMO_CHIPS: { code: string; reward: string }[] = [
  { code: 'PIXL2026', reward: '+250c / +100d' },
  { code: 'FREEHC', reward: '+31d VIP' },
  { code: 'DRAGON', reward: 'Fire Dragon' },
  { code: 'DUCKETS', reward: '+300 Duckets' },
];

export function ShopVouchersTab({
  player,
  catalogPages,
  catalogItems,
  onBuyItem,
  onRedeemVoucher,
}: ShopVouchersTabProps) {
  const [voucherCode, setVoucherCode] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<ShopSortMode>('featured');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const visiblePages = useMemo(() => {
    const pages = catalogPages && catalogPages.length > 0 ? catalogPages : CATALOG_PAGES_SEED;
    return pages.filter((p) => p.visible && p.min_rank <= player.rank);
  }, [catalogPages, player.rank]);

  const mergedItems = useMemo(() => {
    const rawItems = catalogItems && catalogItems.length > 0 ? catalogItems : CATALOG_ITEMS_SEED;
    const allowedPageIds = new Set(visiblePages.map((p) => p.id));
    return rawItems
      .filter((it) => allowedPageIds.has(it.page_id) || visiblePages.length === 0)
      .map((it) => {
        const def = findFurniDef(it.item_type);
        return {
          key: `${it.id}-${it.item_type}`,
          pageId: it.page_id,
          furniId: it.item_type,
          name: it.catalog_name || def.name,
          description: def.description,
          category: def.category,
          costCredits: it.cost_credits,
          costDuckets: it.cost_duckets,
          isRare: def.isRare,
          isLtd: def.isLtd,
        };
      });
  }, [catalogItems, visiblePages]);

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = mergedItems.filter((item) => {
      if (selectedPageId !== 'all' && item.pageId !== selectedPageId) return false;
      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortMode === 'price-asc') {
      return [...filtered].sort((a, b) => a.costCredits - b.costCredits);
    }
    if (sortMode === 'price-desc') {
      return [...filtered].sort((a, b) => b.costCredits - a.costCredits);
    }
    if (sortMode === 'rares-first') {
      return [...filtered].sort(
        (a, b) => Number(Boolean(b.isRare)) - Number(Boolean(a.isRare)) || b.costCredits - a.costCredits
      );
    }
    return filtered;
  }, [mergedItems, selectedPageId, searchQuery, sortMode]);

  const handleBuy = (id: string) => {
    const res = onBuyItem(id, 1);
    setStatusMsg({ ok: res.ok, text: res.message });
  };

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onRedeemVoucher(voucherCode);
    setStatusMsg({ ok: res.ok, text: res.message });
    if (res.ok) setVoucherCode('');
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-8">
        <section className="habbo-box">
          <div className="habbo-box-header habbo-header-blue flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5 text-[#fef08a]" />
              PIXL Web Furni Catalogue ({mergedItems.length} items)
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1 font-mono-num">
                <Coins className="h-3.5 w-3.5 text-[#ffd400]" /> {player.credits}c
              </span>
              <span className="inline-flex items-center gap-1 font-mono-num">
                <Sparkles className="h-3.5 w-3.5 text-[#e9d5ff]" /> {player.duckets}d
              </span>
            </div>
          </div>

          <div className="border-b border-[#cbd5e1] bg-[#f4f8fc] px-3.5 py-3 space-y-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748b]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search furniture by name or style..."
                  className="w-full rounded-[2px] border border-[#000000] bg-white py-1 pl-8 pr-2.5 text-[11px] font-semibold text-[#111827] focus:border-[#2b6ca3] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#475569]" />
                <select
                  aria-label="Sort furniture"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as ShopSortMode)}
                  className="rounded-[2px] border border-[#000000] bg-white px-2 py-1 text-[11px] font-bold text-[#1f2937] focus:border-[#2b6ca3] focus:outline-none"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rares-first">Rares First</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedPageId('all')}
                className={`rounded-[2px] border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                  selectedPageId === 'all'
                    ? 'border-[#000000] bg-[#2b6ca3] text-white'
                    : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
                }`}
              >
                All Sections ({mergedItems.length})
              </button>
              {visiblePages.map((pg) => (
                <button
                  key={pg.id}
                  type="button"
                  onClick={() => setSelectedPageId(pg.id)}
                  className={`rounded-[2px] border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                    selectedPageId === pg.id
                      ? 'border-[#000000] bg-[#2b6ca3] text-white'
                      : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
                  }`}
                >
                  {pg.caption}
                </button>
              ))}
            </div>
          </div>

          {statusMsg && (
            <div
              role="status"
              className={`mx-3.5 mt-3 rounded-[2px] border px-3 py-1.5 text-[11px] font-bold ${
                statusMsg.ok
                  ? 'border-[#1f4f09] bg-[#ecfdf5] text-[#14532d]'
                  : 'border-[#7f1d1d] bg-[#fef2f2] text-[#991b1b]'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {visibleItems.length === 0 ? (
            <div className="p-8 text-center text-[11px] font-bold text-[#64748b]">
              No furniture items match your search filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-3.5 sm:grid-cols-2">
              {visibleItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2.5 rounded-[2px] border border-[#000000] bg-[#f8fafc] p-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-[2px] border border-[#000000] bg-gradient-to-b from-[#d8ebfc] to-[#eef7ff] shrink-0">
                      <FurniPreviewImg itemType={item.furniId} alt={item.name} size={46} />
                      {item.isLtd && (
                        <span className="absolute -top-1.5 -left-1.5 rounded-[2px] border border-[#000000] bg-[#b91c1c] px-1 py-0.2 font-pixel text-[7px] text-[#fef08a]">
                          LTD
                        </span>
                      )}
                      {!item.isLtd && item.isRare && (
                        <span className="absolute -top-1.5 -left-1.5 rounded-[2px] border border-[#000000] bg-[#d9660b] px-1 py-0.2 font-pixel text-[7px] text-white">
                          RARE
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[12px] font-bold text-[#111827] truncate">{item.name}</h3>
                      <p className="mt-0.5 text-[10px] text-[#475569] line-clamp-2">{item.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-bold">
                        {item.costCredits > 0 && (
                          <span className="inline-flex items-center gap-1 text-[#92400e] font-mono-num">
                            <Coins className="h-3 w-3 text-[#d97706]" /> {item.costCredits}c
                          </span>
                        )}
                        {item.costDuckets > 0 && (
                          <span className="inline-flex items-center gap-1 text-[#6d28d9] font-mono-num">
                            <Sparkles className="h-3 w-3 text-[#7c3aed]" /> {item.costDuckets}d
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuy(item.furniId)}
                    className="habbo-btn-green px-3 py-1 text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Buy
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-5 lg:col-span-4">
        <section className="habbo-box">
          <div className="habbo-box-header habbo-header-orange flex items-center gap-2">
            <Gift className="h-3.5 w-3.5" />
            Redeem PIXL Voucher
          </div>
          <div className="p-3.5 space-y-2.5">
            <p className="text-[11px] text-[#475569]">
              Tap a promo chip below or enter a voucher code manually:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PROMO_CHIPS.map((v) => {
                const claimed =
                  player.redeemedVouchers.includes(v.code) ||
                  (v.code === 'PIXL2026' && player.redeemedVouchers.includes('PIXLHOTEL'));
                return (
                  <button
                    key={v.code}
                    type="button"
                    disabled={claimed}
                    onClick={() => {
                      const res = onRedeemVoucher(v.code);
                      setStatusMsg({ ok: res.ok, text: res.message });
                    }}
                    className={`flex flex-col items-start rounded-[2px] border px-2 py-1 text-left ${
                      claimed
                        ? 'border-[#cbd5e1] bg-[#ecfdf5] text-[#15803d] cursor-default'
                        : 'border-[#000000] bg-[#f8fafc] hover:bg-[#fffbeb] cursor-pointer'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 font-mono-num text-[11px] font-bold text-[#111827]">
                      {v.code}
                      {claimed && <Check className="h-3 w-3 text-[#15803d]" />}
                    </span>
                    <span className="text-[10px] font-semibold text-[#475569]">
                      {claimed ? 'Claimed' : v.reward}
                    </span>
                  </button>
                );
              })}
            </div>
            <form onSubmit={handleRedeem} className="flex gap-1.5">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Voucher code..."
                className="w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[12px] font-bold uppercase text-[#111827] focus:border-[#d9660b] focus:outline-none"
              />
              <button
                type="submit"
                className="habbo-btn-green px-3 py-1 text-[11px] font-bold shrink-0 cursor-pointer"
              >
                Redeem
              </button>
            </form>
          </div>
        </section>

        <section className="habbo-box">
          <div className="habbo-box-header habbo-header-blue flex items-center gap-2">
            <Package className="h-3.5 w-3.5" />
            My Furniture Inventory
          </div>
          <div className="divide-y divide-[#cbd5e1] max-h-96 overflow-y-auto">
            {player.inventory.length === 0 ? (
              <p className="p-3.5 text-[11px] text-[#64748b]">
                Your inventory is empty. Buy furni or redeem DRAGON!
              </p>
            ) : (
              player.inventory.map((entry) => {
                const def = findFurniDef(entry.furniId);
                return (
                  <div key={entry.furniId} className="flex items-center justify-between gap-2.5 p-2.5">
                    <div className="flex items-center gap-2">
                      <FurniPreviewImg itemType={entry.furniId} alt={def.name} size={34} />
                      <span className="text-[11px] font-bold text-[#111827]">{def.name}</span>
                    </div>
                    <span className="font-mono-num text-[11px] font-bold text-[#1d4e78]">
                      x{entry.quantity}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

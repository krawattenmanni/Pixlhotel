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
import { FURNI_CATALOGUE } from '../../game/data';
import type { FurniCategory, PlayerState } from '../../game/types';
import { PixelFurniCanvas } from '../PixelSpriteCanvas';

interface ShopVouchersTabProps {
  player: PlayerState;
  onBuyItem: (furniId: string, quantity?: number) => { ok: boolean; message: string };
  onRedeemVoucher: (code: string) => { ok: boolean; message: string };
}

const SHOP_CATEGORIES: { id: FurniCategory | 'all'; label: string }[] = [
  { id: 'all', label: `All Furni (${FURNI_CATALOGUE.length})` },
  { id: 'rares', label: 'Rares' },
  { id: 'seating', label: 'Seating' },
  { id: 'tables', label: 'Tables & Bars' },
  { id: 'lighting', label: 'Lighting & Tech' },
  { id: 'decor', label: 'Garden & Decor' },
];

type ShopSortMode = 'featured' | 'price-asc' | 'price-desc' | 'rares-first';

const PROMO_CHIPS: { code: string; reward: string }[] = [
  { code: 'PIXL2026', reward: '+250c / +100d' },
  { code: 'FREEHC', reward: '+31d VIP' },
  { code: 'DRAGON', reward: 'Fire Dragon' },
  { code: 'DUCKETS', reward: '+300 Duckets' },
];

export function ShopVouchersTab({ player, onBuyItem, onRedeemVoucher }: ShopVouchersTabProps) {
  const [voucherCode, setVoucherCode] = useState('');
  const [category, setCategory] = useState<FurniCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<ShopSortMode>('featured');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = FURNI_CATALOGUE.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
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
  }, [category, searchQuery, sortMode]);

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <section className="habbo-box">
          <div className="habbo-box-header flex flex-wrap items-center justify-between gap-2 bg-[#0d9488]">
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              PIXL Web Furni Catalogue
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 font-mono-num">
                <Coins className="h-3.5 w-3.5 text-[#ffd400]" /> {player.credits} Credits
              </span>
              <span className="inline-flex items-center gap-1 font-mono-num">
                <Sparkles className="h-3.5 w-3.5 text-[#e9d5ff]" /> {player.duckets} Duckets
              </span>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="border-b border-slate-200 bg-[#f4f8fc] px-4 py-3 space-y-2.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search furniture by name or style..."
                  className="w-full rounded border border-[#c8d6e5] bg-white py-1.5 pl-8 pr-3 text-xs font-semibold text-slate-900 focus:border-[#0d9488] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                <select
                  aria-label="Sort furniture"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as ShopSortMode)}
                  className="rounded border border-[#c8d6e5] bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:border-[#0d9488] focus:outline-none"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rares-first">Rares First</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SHOP_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded px-3 py-1 text-xs font-bold cursor-pointer ${
                    category === c.id
                      ? 'bg-[#235c8a] text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {statusMsg && (
            <div
              role="status"
              className={`mx-4 mt-4 rounded border px-3 py-2 text-xs font-bold ${
                statusMsg.ok
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-rose-300 bg-rose-50 text-rose-800'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {visibleItems.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-500">
              No furniture items match your search filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-[#f9f7f2] p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded border border-[#8eb5d3] bg-gradient-to-b from-[#d8ebfc] to-[#eef7ff] shrink-0">
                      <PixelFurniCanvas furniId={item.id} size={50} />
                      {item.isRare && (
                        <span className="absolute -top-1.5 -left-1.5 rounded bg-[#dc2626] px-1 py-0.5 font-pixel text-[7px] text-white">
                          RARE
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">{item.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs font-bold">
                        {item.costCredits > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-mono-num">
                            <Coins className="h-3.5 w-3.5" /> {item.costCredits}
                          </span>
                        )}
                        {item.costDuckets > 0 && (
                          <span className="inline-flex items-center gap-1 text-violet-700 font-mono-num">
                            <Sparkles className="h-3.5 w-3.5" /> {item.costDuckets}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuy(item.id)}
                    className="habbo-btn-green rounded px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Buy
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-6 lg:col-span-4">
        <section className="habbo-box">
          <div className="habbo-box-header flex items-center gap-2 bg-[#e06d1b]">
            <Gift className="h-4 w-4" />
            Redeem PIXL Voucher
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600">
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
                    className={`flex flex-col items-start rounded border px-2.5 py-1.5 text-left transition-colors ${
                      claimed
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 cursor-default'
                        : 'border-[#c8d6e5] bg-[#f8fbfe] hover:border-[#e06d1b] hover:bg-amber-50/50 cursor-pointer'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 font-mono-num text-[11px] font-extrabold text-slate-900">
                      {v.code}
                      {claimed && <Check className="h-3 w-3 text-emerald-600" />}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {claimed ? 'Claimed' : v.reward}
                    </span>
                  </button>
                );
              })}
            </div>
            <form onSubmit={handleRedeem} className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Voucher code..."
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold uppercase text-slate-900 focus:border-[#e06d1b] focus:outline-none"
              />
              <button
                type="submit"
                className="habbo-btn-green rounded px-3.5 py-1.5 text-xs font-bold shrink-0 cursor-pointer"
              >
                Redeem
              </button>
            </form>
          </div>
        </section>

        <section className="habbo-box">
          <div className="habbo-box-header flex items-center gap-2 bg-[#235c8a]">
            <Package className="h-4 w-4" />
            My Furniture Inventory
          </div>
          <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
            {player.inventory.length === 0 ? (
              <p className="p-4 text-xs text-slate-500">Your inventory is empty. Buy furni or redeem DRAGON!</p>
            ) : (
              player.inventory.map((entry) => {
                const def = FURNI_CATALOGUE.find((f) => f.id === entry.furniId);
                if (!def) return null;
                return (
                  <div key={entry.furniId} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex items-center gap-2.5">
                      <PixelFurniCanvas furniId={entry.furniId} size={36} />
                      <span className="text-xs font-bold text-slate-900">{def.name}</span>
                    </div>
                    <span className="font-mono-num text-xs font-extrabold text-[#235c8a]">
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

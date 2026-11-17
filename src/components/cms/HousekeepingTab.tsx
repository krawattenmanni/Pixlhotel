import { useMemo, useState } from 'react';
import {
  Award,
  Ban,
  CheckCircle2,
  Coins,
  Crown,
  Database,
  Edit3,
  Eraser,
  Megaphone,
  Newspaper,
  PackagePlus,
  Paintbrush,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Store,
  Ticket,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  getAccountsDbStats,
  RANK_META,
  type AdminUserEditPatch,
} from '../../game/accountsDb';
import {
  BADGE_EDITOR_PALETTE,
  createEmptyBadgeGrid,
  createStarterCrownGrid,
} from '../../game/customBadges';
import { BADGE_CATALOGUE, FURNI_CATALOGUE } from '../../game/data';
import type {
  AccountRank,
  BanRecord,
  CatalogItemRow,
  CatalogPageRow,
  CustomBadgeDef,
  RankDef,
  UserAccount,
  VoucherDef,
} from '../../game/types';
import {
  FurniPreviewImg,
  PixelAvatarCanvas,
  PixelBadge,
  PixelBadgeSprite,
  PixelHeadCanvas,
} from '../PixelSpriteCanvas';

interface HousekeepingTabProps {
  accounts: UserAccount[];
  ranks?: RankDef[];
  bans?: BanRecord[];
  vouchers?: VoucherDef[];
  catalogPages?: CatalogPageRow[];
  catalogItems?: CatalogItemRow[];
  customBadges: CustomBadgeDef[];
  currentUsername: string;
  onChangeRank: (accountId: string, rank: AccountRank) => void;
  onRemoveFromStaff: (accountId: string) => void;
  onEditUser: (accountId: string, patch: AdminUserEditPatch) => void;
  onUnbanUsername?: (username: string) => void;
  onRefreshDatabase: () => void;
  onPostNews?: (input: {
    title: string;
    shortstory: string;
    longstory: string;
    image: string;
  }) => Promise<{ ok: boolean; message: string }>;
  onMintAndAwardBadge: (input: {
    code: string;
    name: string;
    pixels: (string | null)[];
    recipientAccountId: string;
  }) => { ok: boolean; message: string };
  onAwardExistingBadge?: (
    accountId: string,
    badgeId: string
  ) => Promise<{ ok: boolean; message: string }> | { ok: boolean; message: string };
  onUpsertCatalogPage?: (params: {
    id?: number;
    caption: string;
    minRank?: number;
    visible?: boolean;
    orderNum?: number;
  }) => Promise<{ ok: boolean; message: string }>;
  onUpsertCatalogItem?: (params: {
    id?: number;
    pageId: number;
    catalogName: string;
    costCredits: number;
    costDuckets: number;
    amount?: number;
    itemType: string;
  }) => Promise<{ ok: boolean; message: string }>;
  onDeleteCatalogItem?: (itemId: number) => Promise<{ ok: boolean; message: string }>;
  onSendHotelAlert?: (message: string) => Promise<{ ok: boolean; message: string }>;
}

type HousekeepingFilter = 'all' | 'staff' | 'regular' | 'banned';
type HousekeepingSubTab = 'accounts' | 'catalog' | 'badges' | 'news_bans';

export function HousekeepingTab({
  accounts,
  ranks = [],
  bans = [],
  vouchers = [],
  catalogPages = [],
  catalogItems = [],
  customBadges,
  currentUsername,
  onChangeRank,
  onRemoveFromStaff,
  onEditUser,
  onUnbanUsername,
  onRefreshDatabase,
  onPostNews,
  onMintAndAwardBadge,
  onAwardExistingBadge,
  onUpsertCatalogPage,
  onUpsertCatalogItem,
  onDeleteCatalogItem,
  onSendHotelAlert,
}: HousekeepingTabProps) {
  const [subTab, setSubTab] = useState<HousekeepingSubTab>('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<HousekeepingFilter>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Hotel-Wide Alert Broadcaster
  const [alertText, setAlertText] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);

  // Catalogue & Rare Manager state
  const [catPageCaption, setCatPageCaption] = useState('');
  const [catPageMinRank, setCatPageMinRank] = useState(1);
  const [editingPageId, setEditingPageId] = useState<number | undefined>(undefined);
  const [catItemPageId, setCatItemPageId] = useState<number>(() => catalogPages[0]?.id ?? 1);
  const [catItemType, setCatItemType] = useState<string>('ice_throne');
  const [catItemName, setCatItemName] = useState<string>('Frost Crystal Throne (LTD)');
  const [catItemCredits, setCatItemCredits] = useState<string>('250');
  const [catItemDuckets, setCatItemDuckets] = useState<string>('0');
  const [catItemAmount, setCatItemAmount] = useState<string>('1');
  const [editingCatItemId, setEditingCatItemId] = useState<number | undefined>(undefined);
  const [catBusy, setCatBusy] = useState(false);

  // Badge Creator 16x16 state
  const [badgePixels, setBadgePixels] = useState<(string | null)[]>(() => createStarterCrownGrid());
  const [brushColor, setBrushColor] = useState<string>(BADGE_EDITOR_PALETTE[2]);
  const [eraserActive, setEraserActive] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [badgeCode, setBadgeCode] = useState('VIP1');
  const [badgeTitle, setBadgeTitle] = useState('Royal Pixel Medal');
  const [recipientAccountId, setRecipientAccountId] = useState<string>(
    () => accounts[0]?.id ?? '#001'
  );
  const [badgeFeedback, setBadgeFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Grant Official Badge state
  const [grantBadgeId, setGrantBadgeId] = useState<string>(() => BADGE_CATALOGUE[0]?.id ?? 'habbo_citizen');
  const [grantAccountId, setGrantAccountId] = useState<string>(() => accounts[0]?.id ?? '#001');
  const [grantBusy, setGrantBusy] = useState(false);

  // Quick "Add to Staff" state
  const [staffCandidateSearch, setStaffCandidateSearch] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(() => {
    const firstNonStaff = accounts.find((a) => a.rank < 3 && !a.banned);
    return firstNonStaff?.id ?? accounts[0]?.id ?? '';
  });
  const [promoteRank, setPromoteRank] = useState<3 | 4 | 5>(4);

  // Edit User modal state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState('0');
  const [editDuckets, setEditDuckets] = useState('0');
  const [editHcDays, setEditHcDays] = useState('0');
  const [editMotto, setEditMotto] = useState('');
  const [editBanned, setEditBanned] = useState(false);
  const [editBanReason, setEditBanReason] = useState('');

  // News Publisher state
  const [newsTitle, setNewsTitle] = useState('');
  const [newsShort, setNewsShort] = useState('');
  const [newsLong, setNewsLong] = useState('');
  const [newsPalette, setNewsPalette] = useState<'gold' | 'teal' | 'crimson'>('gold');
  const [postingNews, setPostingNews] = useState(false);

  const rankOptions = useMemo<RankDef[]>(() => {
    if (ranks.length > 0) return ranks;
    return ([1, 2, 3, 4, 5] as AccountRank[]).map((id) => ({
      id,
      name: RANK_META[id].shortLabel,
      badgeCode: RANK_META[id].badgeCode,
    }));
  }, [ranks]);

  const getRankDisplay = (rankNum: AccountRank) => {
    const dbRank = rankOptions.find((r) => r.id === rankNum);
    return {
      name: dbRank?.name ?? RANK_META[rankNum].shortLabel,
      badgeCode: dbRank?.badgeCode || RANK_META[rankNum].badgeCode,
    };
  };

  const stats = useMemo(() => getAccountsDbStats(accounts), [accounts]);

  const notify = (msg: string) => {
    setStatusMessage(msg);
  };

  const candidateOptions = useMemo(() => {
    const q = staffCandidateSearch.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (acc.banned) return false;
      if (!q) return true;
      const shownId = (acc.displayId ?? acc.id).toLowerCase();
      return acc.username.toLowerCase().includes(q) || shownId.includes(q);
    });
  }, [accounts, staffCandidateSearch]);

  const activeCandidateId =
    candidateOptions.find((c) => c.id === selectedCandidateId)?.id ?? candidateOptions[0]?.id ?? '';

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (filter === 'staff' && (acc.rank < 3 || acc.banned)) return false;
      if (filter === 'regular' && (acc.rank >= 3 || acc.banned)) return false;
      if (filter === 'banned' && !acc.banned) return false;
      if (q) {
        const shownId = (acc.displayId ?? acc.id).toLowerCase();
        return (
          acc.username.toLowerCase().includes(q) ||
          acc.playerState.motto.toLowerCase().includes(q) ||
          shownId.includes(q)
        );
      }
      return true;
    });
  }, [accounts, filter, searchQuery]);

  const regularCount = useMemo(
    () => accounts.filter((a) => a.rank < 3 && !a.banned).length,
    [accounts]
  );

  const editingAccount = editingAccountId
    ? accounts.find((a) => a.id === editingAccountId) ?? null
    : null;

  const activeCatPageId =
    catalogPages.some((p) => p.id === catItemPageId) ? catItemPageId : catalogPages[0]?.id ?? 1;

  const openEditModal = (acc: UserAccount) => {
    setEditingAccountId(acc.id);
    setEditCredits(String(acc.playerState.credits));
    setEditDuckets(String(acc.playerState.duckets));
    setEditHcDays(String(acc.playerState.hcDays));
    setEditMotto(acc.playerState.motto);
    setEditBanned(acc.banned);
    setEditBanReason(acc.banReason ?? 'Violated the PIXL Way.');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const isSelf = editingAccount.username.toLowerCase() === currentUsername.toLowerCase();
    const nextCredits = Number(editCredits);
    const nextDuckets = Number(editDuckets);
    const nextHcDays = Number(editHcDays);
    const trimmedMotto = editMotto.trim();
    const nextBanned = isSelf ? false : editBanned;

    const patch: AdminUserEditPatch = {};
    if (Number.isFinite(nextCredits) && nextCredits !== editingAccount.playerState.credits) {
      patch.credits = nextCredits;
    }
    if (Number.isFinite(nextDuckets) && nextDuckets !== editingAccount.playerState.duckets) {
      patch.duckets = nextDuckets;
    }
    if (Number.isFinite(nextHcDays) && nextHcDays !== editingAccount.playerState.hcDays) {
      patch.hcDays = nextHcDays;
    }
    if (trimmedMotto && trimmedMotto !== editingAccount.playerState.motto) {
      patch.motto = trimmedMotto;
    }
    if (nextBanned !== editingAccount.banned) {
      patch.banned = nextBanned;
      patch.banReason = editBanReason;
    } else if (nextBanned && editBanReason !== (editingAccount.banReason ?? '')) {
      patch.banned = true;
      patch.banReason = editBanReason;
    }

    onEditUser(editingAccount.id, patch);
    notify(
      `Saved account changes for ${editingAccount.username} (${editingAccount.displayId ?? editingAccount.id}).`
    );
    setEditingAccountId(null);
  };

  const handleQuickAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const target = accounts.find((a) => a.id === activeCandidateId);
    if (!target) return;
    onChangeRank(target.id, promoteRank);
    notify(
      `${target.username} (${target.displayId ?? target.id}) is now ${RANK_META[promoteRank].label} — Staff page synced live!`
    );
  };

  const handleSendAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSendHotelAlert || !alertText.trim()) return;
    setSendingAlert(true);
    const res = await onSendHotelAlert(alertText.trim());
    setSendingAlert(false);
    if (res.ok) setAlertText('');
    notify(res.message);
  };

  return (
    <div className="space-y-5" data-testid="housekeeping-panel">
      {/* DATABASE OVERVIEW HEADER + HOTEL-WIDE ALERT BROADCASTER */}
      <section className="habbo-box">
        <div className="habbo-box-header habbo-header-red flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#fde047]" />
            PIXL Housekeeping — Live Database, Catalogue &amp; Staff Admin
          </span>
          <button
            type="button"
            data-testid="hk-refresh-db-btn"
            onClick={() => {
              onRefreshDatabase();
              notify('Refreshed live PostgreSQL snapshot from Supabase.');
            }}
            className="inline-flex items-center gap-1 rounded-[2px] border border-[#000000] bg-[#7f1d1d] px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-[#5c1111] cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Live DB
          </button>
        </div>

        <div className="p-4 space-y-3.5 bg-[#f8fafc]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-[2px] border border-[#000000] bg-white p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#000000] bg-[#2b6ca3] text-white shrink-0">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                  Total Registered Accounts
                </p>
                <p className="font-mono-num text-xl font-bold text-[#0f3454]" data-testid="hk-total-accounts">
                  {stats.totalAccounts}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[2px] border border-[#000000] bg-white p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#000000] bg-[#9e1b1b] text-[#fde047] shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#7f1d1d]">
                  Active Staff Members
                </p>
                <p className="font-mono-num text-xl font-bold text-[#9e1b1b]" data-testid="hk-active-staff">
                  {stats.activeStaffCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[2px] border border-[#000000] bg-white p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#000000] bg-[#d9660b] text-white shrink-0">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#92400e]">
                  Total Credits in Circulation
                </p>
                <p className="font-mono-num text-xl font-bold text-[#92400e]" data-testid="hk-total-credits">
                  {stats.totalCreditsInCirculation.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Hotel-Wide Alert Broadcaster */}
          {onSendHotelAlert && (
            <form
              onSubmit={handleSendAlertSubmit}
              className="flex flex-col gap-2 rounded-[2px] border border-[#000000] bg-[#fffbeb] p-2.5 sm:flex-row sm:items-center"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#92400e] shrink-0">
                <Megaphone className="h-4 w-4 text-[#d97706]" />
                Hotel Alert:
              </span>
              <input
                type="text"
                maxLength={140}
                value={alertText}
                onChange={(e) => setAlertText(e.target.value)}
                placeholder="Broadcast a live Staff Alert to every online PIXL player..."
                data-testid="hk-hotel-alert-input"
                className="flex-1 rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#111827] focus:border-[#9e1b1b] focus:outline-none"
              />
              <button
                type="submit"
                disabled={sendingAlert || !alertText.trim()}
                data-testid="hk-hotel-alert-send"
                className="habbo-btn-orange px-3 py-1 text-[11px] font-bold whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {sendingAlert ? 'Sending...' : 'Send Hotel-Wide Alert'}
              </button>
            </form>
          )}

          {statusMessage && (
            <div
              role="status"
              className="flex items-center justify-between gap-2 rounded-[2px] border border-[#1f4f09] bg-[#ecfdf5] px-3 py-1.5 text-[11px] font-bold text-[#14532d]"
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#15803d] shrink-0" />
                {statusMessage}
              </span>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                aria-label="Dismiss notification"
                className="rounded-[2px] p-0.5 hover:bg-[#d1fae5] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Housekeeping Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[#cbd5e1] pt-3">
            <button
              type="button"
              data-testid="hk-subtab-accounts"
              onClick={() => setSubTab('accounts')}
              className={`inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
                subTab === 'accounts'
                  ? 'border-[#000000] bg-[#9e1b1b] text-white'
                  : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Accounts Database
            </button>
            <button
              type="button"
              data-testid="hk-subtab-catalog"
              onClick={() => setSubTab('catalog')}
              className={`inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
                subTab === 'catalog'
                  ? 'border-[#000000] bg-[#d9660b] text-white'
                  : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              Catalogue &amp; Rare Manager ({catalogItems.length})
            </button>
            <button
              type="button"
              data-testid="hk-subtab-badges"
              onClick={() => setSubTab('badges')}
              className={`inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
                subTab === 'badges'
                  ? 'border-[#000000] bg-[#365672] text-white'
                  : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
              }`}
            >
              <Paintbrush className="h-3.5 w-3.5" />
              Badge Creator (16x16)
            </button>
            <button
              type="button"
              data-testid="hk-subtab-news-bans"
              onClick={() => setSubTab('news_bans')}
              className={`inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
                subTab === 'news_bans'
                  ? 'border-[#000000] bg-[#2b6ca3] text-white'
                  : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
              }`}
            >
              <Newspaper className="h-3.5 w-3.5" />
              CMS News, Bans &amp; Vouchers
            </button>
          </div>
        </div>
      </section>

      {/* CATALOGUE & RARE MANAGER SUBTAB */}
      {subTab === 'catalog' && (
        <div className="space-y-5" data-testid="hk-catalog-manager">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Add / Edit Catalogue Item or Drop LTD Rare */}
            <section className="habbo-box lg:col-span-7">
              <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <PackagePlus className="h-3.5 w-3.5" />
                  {editingCatItemId ? `Edit Catalogue Item #${editingCatItemId}` : 'Add Catalogue Item / Drop New Rare'}
                </span>
                {editingCatItemId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatItemId(undefined);
                      setCatItemName('Frost Crystal Throne (LTD)');
                      setCatItemCredits('250');
                      setCatItemDuckets('0');
                    }}
                    className="text-[10px] underline cursor-pointer"
                  >
                    + New Item
                  </button>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!onUpsertCatalogItem || !catItemName.trim()) return;
                  setCatBusy(true);
                  const res = await onUpsertCatalogItem({
                    id: editingCatItemId,
                    pageId: activeCatPageId,
                    catalogName: catItemName.trim(),
                    costCredits: Number(catItemCredits) || 0,
                    costDuckets: Number(catItemDuckets) || 0,
                    amount: Number(catItemAmount) || 1,
                    itemType: catItemType,
                  });
                  setCatBusy(false);
                  if (res.ok) setEditingCatItemId(undefined);
                  notify(res.message);
                }}
                className="p-4 space-y-3"
              >
                <div className="flex items-center gap-3 rounded-[2px] border border-[#000000] bg-[#f4f8fc] p-2.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[2px] border border-[#000000] bg-white shrink-0">
                    <FurniPreviewImg itemType={catItemType} alt={catItemName} size={46} />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#475569]">
                        Catalogue Section (catalog_pages)
                      </label>
                      <select
                        value={activeCatPageId}
                        onChange={(e) => setCatItemPageId(Number(e.target.value))}
                        className="mt-0.5 w-full rounded-[2px] border border-[#000000] bg-white px-2 py-1 text-[11px] font-bold"
                      >
                        {catalogPages.map((pg) => (
                          <option key={pg.id} value={pg.id}>
                            #{pg.id} · {pg.caption}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#475569]">
                        Pixel Sprite (item_type)
                      </label>
                      <select
                        value={catItemType}
                        onChange={(e) => {
                          setCatItemType(e.target.value);
                          if (!editingCatItemId) {
                            const def = FURNI_CATALOGUE.find((f) => f.id === e.target.value);
                            if (def) {
                              setCatItemName(def.name);
                              setCatItemCredits(String(def.costCredits));
                              setCatItemDuckets(String(def.costDuckets));
                            }
                          }
                        }}
                        className="mt-0.5 w-full rounded-[2px] border border-[#000000] bg-white px-2 py-1 text-[11px] font-bold"
                      >
                        {FURNI_CATALOGUE.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#1f2937]">Display Name</label>
                    <input
                      type="text"
                      required
                      maxLength={48}
                      value={catItemName}
                      onChange={(e) => setCatItemName(e.target.value)}
                      className="mt-0.5 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[11px] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#1f2937]">Credits</label>
                    <input
                      type="number"
                      min={0}
                      value={catItemCredits}
                      onChange={(e) => setCatItemCredits(e.target.value)}
                      className="mt-0.5 w-full rounded-[2px] border border-[#000000] bg-white px-2 py-1 font-mono-num text-[11px] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#1f2937]">Duckets</label>
                    <input
                      type="number"
                      min={0}
                      value={catItemDuckets}
                      onChange={(e) => setCatItemDuckets(e.target.value)}
                      className="mt-0.5 w-full rounded-[2px] border border-[#000000] bg-white px-2 py-1 font-mono-num text-[11px] font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-[#1f2937]">Stack Qty:</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={catItemAmount}
                      onChange={(e) => setCatItemAmount(e.target.value)}
                      className="w-16 rounded-[2px] border border-[#000000] bg-white px-2 py-0.5 font-mono-num text-[11px] font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={catBusy || !onUpsertCatalogItem}
                    data-testid="hk-catalog-save-item-btn"
                    className="habbo-btn-green px-4 py-1.5 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    {catBusy ? 'Saving...' : editingCatItemId ? 'Update Item in DB' : 'Publish Item to Catalogue'}
                  </button>
                </div>
              </form>
            </section>

            {/* Manage Catalogue Pages */}
            <section className="habbo-box lg:col-span-5">
              <div className="habbo-box-header habbo-header-blue">
                Manage Catalogue Pages ({catalogPages.length})
              </div>
              <div className="p-3.5 space-y-3">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!onUpsertCatalogPage || !catPageCaption.trim()) return;
                    setCatBusy(true);
                    const res = await onUpsertCatalogPage({
                      id: editingPageId,
                      caption: catPageCaption.trim(),
                      minRank: catPageMinRank,
                      visible: true,
                    });
                    setCatBusy(false);
                    if (res.ok) {
                      setCatPageCaption('');
                      setEditingPageId(undefined);
                    }
                    notify(res.message);
                  }}
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <input
                    type="text"
                    placeholder={editingPageId ? 'Rename section...' : 'New section caption...'}
                    value={catPageCaption}
                    onChange={(e) => setCatPageCaption(e.target.value)}
                    className="flex-1 min-w-0 rounded-[2px] border border-[#000000] bg-white px-2 py-1 text-[11px] font-bold"
                  />
                  <select
                    value={catPageMinRank}
                    onChange={(e) => setCatPageMinRank(Number(e.target.value))}
                    className="rounded-[2px] border border-[#000000] bg-white px-1.5 py-1 text-[11px] font-bold"
                  >
                    <option value={1}>Rank 1+</option>
                    <option value={2}>VIP/HC</option>
                    <option value={3}>Staff 3+</option>
                  </select>
                  <button
                    type="submit"
                    disabled={catBusy || !catPageCaption.trim()}
                    className="habbo-btn-blue px-2.5 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    {editingPageId ? 'Save' : '+ Page'}
                  </button>
                </form>

                <div className="divide-y divide-[#cbd5e1] max-h-48 overflow-y-auto border border-[#94a3b8] rounded-[2px]">
                  {catalogPages.map((pg) => (
                    <div
                      key={pg.id}
                      className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 text-[11px]"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-[#111827]">{pg.caption}</span>
                        <span className="ml-1.5 text-[10px] text-[#64748b]">
                          (min rank {pg.min_rank})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPageId(pg.id);
                          setCatPageCaption(pg.caption);
                          setCatPageMinRank(pg.min_rank);
                        }}
                        className="habbo-btn-silver px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Live Catalogue Items List */}
          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-dark flex items-center justify-between">
              <span>Live catalog_items Table ({catalogItems.length} rows)</span>
              <span className="text-[10px] text-sky-100">Click Edit to adjust Credit/Ducket prices</span>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
              {catalogItems.map((it) => {
                const pgName = catalogPages.find((p) => p.id === it.page_id)?.caption ?? `Page ${it.page_id}`;
                return (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-2 rounded-[2px] border border-[#000000] bg-[#f8fafc] p-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#94a3b8] bg-white shrink-0">
                        <FurniPreviewImg itemType={it.item_type} alt={it.catalog_name} size={34} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-[#111827]">{it.catalog_name}</p>
                        <p className="truncate text-[10px] text-[#475569]">
                          {pgName} · {it.cost_credits}c / {it.cost_duckets}d
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatItemId(it.id);
                          setCatItemPageId(it.page_id);
                          setCatItemName(it.catalog_name);
                          setCatItemCredits(String(it.cost_credits));
                          setCatItemDuckets(String(it.cost_duckets));
                          setCatItemAmount(String(it.amount));
                          setCatItemType(it.item_type);
                        }}
                        className="habbo-btn-blue px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                      >
                        Edit
                      </button>
                      {onDeleteCatalogItem && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await onDeleteCatalogItem(it.id);
                            notify(res.message);
                          }}
                          className="rounded-[2px] border border-[#000000] bg-[#b91c1c] px-1.5 py-0.5 text-[10px] font-bold text-white cursor-pointer hover:bg-[#991b1b]"
                          title="Delete from catalog_items"
                        >
                          Del
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {subTab === 'badges' && (
        <div className="space-y-4">
          <section className="habbo-box" data-testid="hk-grant-existing-badge">
            <div className="habbo-box-header habbo-header-orange flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2">
                <Award className="h-4 w-4 text-white" />
                Grant Official Badge to User (64 Shaped Badges)
              </span>
              <span className="font-mono-num text-[11px] text-amber-100">
                {BADGE_CATALOGUE.length} official badges available
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-3.5 sm:grid-cols-12 items-end">
              <div className="sm:col-span-5">
                <label htmlFor="hk-grant-badge-select" className="block text-[11px] font-bold text-[#1f2937]">
                  Select Official Shaped Badge
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-[#000000] bg-[#1e293b]">
                    <PixelBadgeSprite
                      badgeId={grantBadgeId}
                      unlocked
                      customBadges={customBadges}
                      size={32}
                    />
                  </div>
                  <select
                    id="hk-grant-badge-select"
                    data-testid="hk-grant-badge-select"
                    value={grantBadgeId}
                    onChange={(e) => setGrantBadgeId(e.target.value)}
                    className="w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#111827]"
                  >
                    {BADGE_CATALOGUE.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.code}] {b.name} ({b.category ?? 'achievements'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="sm:col-span-4">
                <label htmlFor="hk-grant-account-select" className="block text-[11px] font-bold text-[#1f2937]">
                  Recipient PIXL Account
                </label>
                <select
                  id="hk-grant-account-select"
                  data-testid="hk-grant-account-select"
                  value={grantAccountId}
                  onChange={(e) => setGrantAccountId(e.target.value)}
                  className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#111827]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.displayId ?? acc.id} · {acc.username} ({RANK_META[acc.rank].badgeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <button
                  type="button"
                  data-testid="hk-grant-badge-btn"
                  disabled={grantBusy || !onAwardExistingBadge}
                  onClick={async () => {
                    if (!onAwardExistingBadge) return;
                    setGrantBusy(true);
                    const res = await onAwardExistingBadge(grantAccountId, grantBadgeId);
                    setGrantBusy(false);
                    setBadgeFeedback({ ok: res.ok, text: res.message });
                    notify(res.message);
                  }}
                  className="habbo-btn-green w-full py-2 font-pixel text-[11px] cursor-pointer disabled:opacity-50"
                >
                  {grantBusy ? 'Awarding...' : 'Grant Official Badge'}
                </button>
              </div>
            </div>
          </section>

        <section className="habbo-box" data-testid="hk-badge-creator">
          <div className="habbo-box-header habbo-header-dark flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <Award className="h-4 w-4 text-[#fde047]" />
              16x16 Pixel Badge Creator &amp; Award Tool
            </span>
            <span className="font-mono-num text-[11px] text-sky-100">
              {customBadges.length} custom badges minted
            </span>
          </div>

          <div
            className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-12"
            onPointerUp={() => setIsPainting(false)}
            onPointerLeave={() => setIsPainting(false)}
          >
            <div className="space-y-3 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-[#1f2937]">
                  Tap or drag on the 16&times;16 grid to draw pixels
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEraserActive((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-[2px] border px-2 py-1 text-[11px] font-bold cursor-pointer ${
                      eraserActive
                        ? 'border-[#000000] bg-[#2b6ca3] text-white'
                        : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    <Eraser className="h-3 w-3" />
                    Eraser
                  </button>
                  <button
                    type="button"
                    onClick={() => setBadgePixels(createStarterCrownGrid())}
                    className="rounded-[2px] border border-[#94a3b8] bg-white px-2 py-1 text-[11px] font-bold text-[#1f2937] hover:bg-[#e2e8f0] cursor-pointer"
                  >
                    Crown Preset
                  </button>
                  <button
                    type="button"
                    data-testid="hk-badge-clear-btn"
                    onClick={() => setBadgePixels(createEmptyBadgeGrid())}
                    className="inline-flex items-center gap-1 rounded-[2px] border border-[#991b1b] bg-[#fef2f2] px-2 py-1 text-[11px] font-bold text-[#991b1b] hover:bg-[#fee2e2] cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                </div>
              </div>

              <div
                className="mx-auto grid w-full max-w-[340px] grid-cols-16 gap-[1px] rounded-[2px] border border-[#000000] bg-[#94a3b8] p-1 touch-none select-none"
                style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
                data-testid="hk-badge-pixel-grid"
              >
                {badgePixels.map((cellColor, idx) => {
                  const paintCell = () => {
                    const nextColor = eraserActive ? null : brushColor;
                    setBadgePixels((prev) => {
                      if (prev[idx] === nextColor) return prev;
                      const copy = [...prev];
                      copy[idx] = nextColor;
                      return copy;
                    });
                  };

                  return (
                    <button
                      key={idx}
                      type="button"
                      data-testid={`badge-pixel-${idx}`}
                      aria-label={`Pixel ${idx % 16}, ${Math.floor(idx / 16)}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setIsPainting(true);
                        paintCell();
                      }}
                      onPointerEnter={() => {
                        if (isPainting) paintCell();
                      }}
                      className="aspect-square w-full cursor-crosshair"
                      style={{
                        backgroundColor:
                          cellColor ??
                          (((Math.floor(idx / 16) + (idx % 16)) % 2 === 0)
                            ? '#ffffff'
                            : '#f1f5f9'),
                      }}
                    />
                  );
                })}
              </div>

              <div>
                <p className="mb-1 text-[11px] font-bold text-[#475569]">Retro Color Palette</p>
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_EDITOR_PALETTE.map((hex) => {
                    const active = !eraserActive && brushColor === hex;
                    return (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Color ${hex}`}
                        onClick={() => {
                          setBrushColor(hex);
                          setEraserActive(false);
                        }}
                        className={`h-6 w-6 rounded-[2px] border cursor-pointer ${
                          active ? 'border-[#000000] ring-2 ring-[#f58220]' : 'border-[#475569]'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = onMintAndAwardBadge({
                  code: badgeCode,
                  name: badgeTitle,
                  pixels: badgePixels,
                  recipientAccountId,
                });
                setBadgeFeedback({ ok: res.ok, text: res.message });
                if (res.ok) notify(res.message);
              }}
              className="space-y-3.5 lg:col-span-5"
            >
              <div className="rounded-[2px] border border-[#000000] bg-[#f4f8fc] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                  Live Badge Preview
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[2px] border border-[#000000] bg-white p-1">
                    <canvas
                      width={48}
                      height={48}
                      ref={(el) => {
                        if (!el) return;
                        const ctx = el.getContext('2d');
                        if (!ctx) return;
                        ctx.imageSmoothingEnabled = false;
                        ctx.clearRect(0, 0, 48, 48);
                        for (let y = 0; y < 16; y++) {
                          for (let x = 0; x < 16; x++) {
                            const c = badgePixels[y * 16 + x];
                            if (c) {
                              ctx.fillStyle = c;
                              ctx.fillRect(x * 3, y * 3, 3, 3);
                            }
                          }
                        }
                      }}
                      className="pixelated h-11 w-11"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-pixel text-[11px] text-[#1d4e78]">
                      [{(badgeCode || 'CODE').toUpperCase()}]
                    </p>
                    <p className="text-[13px] font-bold text-[#111827] truncate">
                      {badgeTitle || 'Untitled Badge'}
                    </p>
                    <p className="text-[10px] text-[#64748b]">16&times;16 Pixel Crest</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="hk-badge-code" className="block text-[11px] font-bold text-[#1f2937]">
                    Badge Code (2–5 chars)
                  </label>
                  <input
                    id="hk-badge-code"
                    data-testid="hk-badge-code-input"
                    type="text"
                    maxLength={5}
                    value={badgeCode}
                    onChange={(e) => setBadgeCode(e.target.value.toUpperCase())}
                    placeholder="VIP1"
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 font-mono-num text-[11px] font-bold uppercase text-[#111827]"
                  />
                </div>
                <div>
                  <label htmlFor="hk-badge-title" className="block text-[11px] font-bold text-[#1f2937]">
                    Badge Title
                  </label>
                  <input
                    id="hk-badge-title"
                    data-testid="hk-badge-title-input"
                    type="text"
                    maxLength={36}
                    value={badgeTitle}
                    onChange={(e) => setBadgeTitle(e.target.value)}
                    placeholder="Royal Pixel Medal"
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[11px] font-bold text-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="hk-badge-recipient" className="block text-[11px] font-bold text-[#1f2937]">
                  Award Directly to PIXL Account
                </label>
                <select
                  id="hk-badge-recipient"
                  data-testid="hk-badge-recipient-select"
                  value={recipientAccountId}
                  onChange={(e) => setRecipientAccountId(e.target.value)}
                  className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#111827]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.displayId ?? acc.id} · {acc.username} ({RANK_META[acc.rank].badgeCode})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                data-testid="hk-mint-award-btn"
                className="habbo-btn-green w-full py-2 font-pixel text-[11px] cursor-pointer"
              >
                Mint &amp; Award Badge
              </button>

              {badgeFeedback && (
                <p
                  role="status"
                  className={`rounded-[2px] border px-2.5 py-1.5 text-[11px] font-bold ${
                    badgeFeedback.ok
                      ? 'border-[#1f4f09] bg-[#ecfdf5] text-[#14532d]'
                      : 'border-[#7f1d1d] bg-[#fef2f2] text-[#991b1b]'
                  }`}
                >
                  {badgeFeedback.text}
                </p>
              )}

              {customBadges.length > 0 && (
                <div className="border-t border-[#cbd5e1] pt-2.5">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                    Recently Minted Badges
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {customBadges.map((cb) => (
                      <div
                        key={cb.id}
                        className="flex items-center gap-1.5 rounded-[2px] border border-[#000000] bg-white px-2 py-1"
                      >
                        <PixelBadgeSprite
                          badgeId={cb.id}
                          unlocked
                          customBadges={customBadges}
                          size={22}
                        />
                        <div className="text-[10px]">
                          <p className="font-bold text-[#111827]">[{cb.code}]</p>
                          <p className="text-[#475569]">{cb.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
          </section>
        </div>
      )}

      {subTab === 'news_bans' && (
        <div className="space-y-5" data-testid="hk-news-bans-panel">
          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-blue flex items-center gap-2">
              <Newspaper className="h-3.5 w-3.5 text-[#fde047]" />
              Publish CMS News Article (cms_news)
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!onPostNews || !newsTitle.trim()) return;
                setPostingNews(true);
                const res = await onPostNews({
                  title: newsTitle,
                  shortstory: newsShort || newsTitle,
                  longstory: newsLong || newsShort || newsTitle,
                  image: newsPalette,
                });
                setPostingNews(false);
                if (res.ok) {
                  setNewsTitle('');
                  setNewsShort('');
                  setNewsLong('');
                }
                notify(res.message);
              }}
              className="p-4 space-y-3"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="hk-news-title" className="block text-[11px] font-bold text-[#1f2937]">
                    Headline
                  </label>
                  <input
                    id="hk-news-title"
                    data-testid="hk-news-title-input"
                    type="text"
                    required
                    maxLength={90}
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    placeholder="e.g. Weekend Double Credits & Lido Diving Party!"
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[11px] font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="hk-news-palette" className="block text-[11px] font-bold text-[#1f2937]">
                    Banner Theme
                  </label>
                  <select
                    id="hk-news-palette"
                    value={newsPalette}
                    onChange={(e) => setNewsPalette(e.target.value as 'gold' | 'teal' | 'crimson')}
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[11px] font-bold"
                  >
                    <option value="gold">Royal Amber</option>
                    <option value="teal">Ocean Teal</option>
                    <option value="crimson">Crimson Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="hk-news-short" className="block text-[11px] font-bold text-[#1f2937]">
                  Short Teaser (shortstory)
                </label>
                <input
                  id="hk-news-short"
                  data-testid="hk-news-short-input"
                  type="text"
                  maxLength={180}
                  value={newsShort}
                  onChange={(e) => setNewsShort(e.target.value)}
                  placeholder="Summary shown on the frontpage news carousel..."
                  className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[11px] font-semibold"
                />
              </div>

              <div>
                <label htmlFor="hk-news-long" className="block text-[11px] font-bold text-[#1f2937]">
                  Full Article Story (longstory)
                </label>
                <textarea
                  id="hk-news-long"
                  data-testid="hk-news-long-input"
                  rows={3}
                  maxLength={2000}
                  value={newsLong}
                  onChange={(e) => setNewsLong(e.target.value)}
                  placeholder="Write the full announcement for PIXL Hotel players..."
                  className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[11px] font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={postingNews || !newsTitle.trim()}
                data-testid="hk-news-publish-btn"
                className="habbo-btn-green px-4 py-1.5 font-pixel text-[11px] cursor-pointer disabled:opacity-50"
              >
                {postingNews ? 'Publishing...' : 'Publish to cms_news'}
              </button>
            </form>
          </section>

          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-red flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Ban className="h-3.5 w-3.5 text-[#fde047]" />
                Active Hotel Bans (bans table)
              </span>
              <span className="font-mono-num text-[11px] text-rose-100">{bans.length} active</span>
            </div>
            {bans.length === 0 ? (
              <div className="p-5 text-center text-[11px] font-bold text-[#64748b]">
                No active bans in the PostgreSQL bans table.
              </div>
            ) : (
              <div className="divide-y divide-[#cbd5e1]">
                {bans.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#fef2f2]"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#111827]">
                        {b.value}{' '}
                        <span className="ml-1 rounded-[2px] border border-[#000000]/40 bg-[#fecaca] px-1 py-0.2 font-mono-num text-[10px] text-[#7f1d1d]">
                          {b.bantype}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#7f1d1d] mt-0.5">Reason: {b.reason}</p>
                      <p className="text-[10px] text-[#64748b]">
                        Banned by {b.addedBy} {b.addedDate ? `on ${b.addedDate}` : ''}
                      </p>
                    </div>
                    {onUnbanUsername && (
                      <button
                        type="button"
                        onClick={() => {
                          onUnbanUsername(b.value);
                          notify(`Removed ban record for ${b.value}.`);
                        }}
                        className="habbo-btn-green px-3 py-1 text-[11px] font-bold cursor-pointer"
                      >
                        Unban
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Ticket className="h-3.5 w-3.5" />
                Live Database Vouchers (vouchers table)
              </span>
              <span className="font-mono-num text-[11px] text-amber-100">{vouchers.length} codes</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 p-3.5 sm:grid-cols-3">
              {vouchers.map((v) => (
                <div
                  key={v.id}
                  className="rounded-[2px] border border-[#000000] bg-[#f4f8fc] p-2.5 text-[11px]"
                >
                  <p className="font-pixel text-[11px] text-[#0f3454]">{v.code}</p>
                  <p className="mt-1 font-bold text-[#334155]">
                    +{v.credits}c · +{v.duckets}d · +{v.hcDays}d HC
                    {v.badgeId ? ` · [${v.badgeId}]` : ''}
                  </p>
                  <p className="mt-0.5 font-mono-num text-[10px] text-[#64748b]">
                    Remaining uses: {v.uses}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {subTab === 'accounts' && (
        <>
          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-blue flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5 text-[#fde047]" />
              Add to Staff — Quick Staff Assignment
            </div>
            <form
              onSubmit={handleQuickAddStaff}
              className="grid grid-cols-1 gap-3 p-3.5 md:grid-cols-12 md:items-end"
            >
              <div className="md:col-span-4">
                <label htmlFor="hk-staff-search" className="block text-[11px] font-bold text-[#1f2937]">
                  Filter Registered Citizen
                </label>
                <input
                  id="hk-staff-search"
                  type="text"
                  value={staffCandidateSearch}
                  onChange={(e) => setStaffCandidateSearch(e.target.value)}
                  placeholder="Type name or #ID..."
                  className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1 text-[11px] font-semibold"
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="hk-staff-user" className="block text-[11px] font-bold text-[#1f2937]">
                  Select Account
                </label>
                <select
                  id="hk-staff-user"
                  value={activeCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2 py-1 text-[11px] font-bold"
                >
                  {candidateOptions.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.displayId ?? acc.id} · {acc.username} ({RANK_META[acc.rank].badgeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label htmlFor="hk-staff-role" className="block text-[11px] font-bold text-[#1f2937]">
                  Assign Staff Rank
                </label>
                <select
                  id="hk-staff-role"
                  value={promoteRank}
                  onChange={(e) => setPromoteRank(Number(e.target.value) as 3 | 4 | 5)}
                  className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2 py-1 text-[11px] font-bold"
                >
                  {rankOptions
                    .filter((r) => r.id >= 3)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Rank {r.id}: {r.name}
                        {r.badgeCode ? ` (${r.badgeCode})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={!activeCandidateId}
                  data-testid="hk-quick-add-staff-btn"
                  className="habbo-btn-green w-full py-1.5 px-3 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                >
                  Add to Staff
                </button>
              </div>
            </form>
          </section>

          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-orange flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5" />
                Registered Accounts Overview
              </span>
              <span className="font-mono-num text-[11px] text-amber-100">
                Showing {filteredAccounts.length} of {accounts.length}
              </span>
            </div>

            <div className="border-b border-[#cbd5e1] bg-[#f4f8fc] p-3.5 space-y-2.5">
              <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-sm">
                  <label htmlFor="hk-accounts-search" className="sr-only">
                    Search accounts by username or motto
                  </label>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748b]" />
                  <input
                    id="hk-accounts-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search username, motto, or #ID..."
                    className="w-full rounded-[2px] border border-[#000000] bg-white py-1 pl-8 pr-2.5 text-[11px] font-semibold"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: `All Accounts (${accounts.length})` },
                      { id: 'staff', label: `Staff Team (${stats.activeStaffCount})` },
                      { id: 'regular', label: `Regular Users (${regularCount})` },
                      { id: 'banned', label: `Banned (${stats.bannedCount})` },
                    ] as { id: HousekeepingFilter; label: string }[]
                  ).map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setFilter(pill.id)}
                      className={`rounded-[2px] border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                        filter === pill.id
                          ? 'border-[#000000] bg-[#2b6ca3] text-white'
                          : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="p-6 text-center text-[12px] font-bold text-[#64748b]">
                No accounts match your search or filter.
              </div>
            ) : (
              <div className="divide-y divide-[#cbd5e1]">
                {filteredAccounts.map((acc) => {
                  const rankInfo = getRankDisplay(acc.rank);
                  const isSelf = acc.username.toLowerCase() === currentUsername.toLowerCase();
                  const isStaff = acc.rank >= 3;

                  return (
                    <div
                      key={acc.id}
                      data-testid={`hk-account-row-${acc.username}`}
                      className={`flex flex-col gap-2.5 p-3 lg:flex-row lg:items-center lg:justify-between ${
                        acc.banned ? 'bg-[#fef2f2]' : 'bg-white hover:bg-[#f8fafc]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="mt-1 rounded-[2px] border border-[#000000] bg-[#eef5fc] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#1d4e78] shrink-0">
                          {acc.displayId ?? acc.id}
                        </span>

                        <div className="relative rounded-[2px] border border-[#000000] bg-[#e6f3ff] p-0.5 shrink-0">
                          <PixelHeadCanvas look={acc.playerState.look} size={36} />
                          <span
                            title={acc.online ? 'Online' : 'Offline'}
                            className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-[1px] border ${
                              acc.online
                                ? 'bg-[#22c55e] border-[#14532d]'
                                : 'bg-[#94a3b8] border-[#475569]'
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[13px] font-bold text-[#111827] break-words">
                              {acc.username}
                            </span>
                            <PixelBadge code={rankInfo.badgeCode} label={rankInfo.name} />
                            {acc.banned && (
                              <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#000000] bg-[#b91c1c] px-1.5 py-0.5 font-pixel text-[8px] text-white">
                                <Ban className="h-2.5 w-2.5" /> BANNED
                              </span>
                            )}
                            {isSelf && (
                              <span className="rounded-[2px] border border-[#2b6ca3] bg-[#dbeafe] px-1.5 py-0.2 text-[10px] font-bold text-[#1d4e78]">
                                You
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 text-[11px] italic text-[#475569] truncate">
                            &ldquo;{acc.playerState.motto}&rdquo;
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-bold text-[#475569]">
                            <span className="inline-flex items-center gap-1 text-[#92400e]">
                              <Coins className="h-3 w-3 text-[#d97706]" />
                              <strong className="font-mono-num">{acc.playerState.credits}</strong>c
                            </span>
                            <span className="inline-flex items-center gap-1 text-[#6d28d9]">
                              <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                              <strong className="font-mono-num">{acc.playerState.duckets}</strong>d
                            </span>
                            <span className="inline-flex items-center gap-1 text-[#334155]">
                              <Crown className="h-3 w-3 text-[#ca8a04]" />
                              <strong className="font-mono-num">{acc.playerState.hcDays}d</strong> HC
                            </span>
                            <span>Registered: {acc.createdAt}</span>
                            <span>Seen: {acc.lastSeen}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <label htmlFor={`rank-select-${acc.id}`} className="sr-only">
                          Rank for {acc.username}
                        </label>
                        <select
                          id={`rank-select-${acc.id}`}
                          data-testid={`hk-rank-select-${acc.username}`}
                          value={acc.rank}
                          disabled={isSelf}
                          onChange={(e) => {
                            const nextRank = Number(e.target.value) as AccountRank;
                            const nextInfo = getRankDisplay(nextRank);
                            onChangeRank(acc.id, nextRank);
                            notify(
                              `Updated ${acc.username} (${acc.displayId ?? acc.id}) to ${nextInfo.name}.`
                            );
                          }}
                          className="rounded-[2px] border border-[#000000] bg-white px-2 py-1 text-[11px] font-bold text-[#1f2937] disabled:opacity-60"
                        >
                          {rankOptions.map((r) => (
                            <option key={r.id} value={r.id}>
                              Rank {r.id}: {r.name}
                              {r.badgeCode ? ` [${r.badgeCode}]` : ''}
                            </option>
                          ))}
                        </select>

                        {isStaff && (
                          <button
                            type="button"
                            data-testid={`hk-remove-staff-${acc.username}`}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? 'Cannot remove yourself from Staff while logged in'
                                : `Demote ${acc.username} to Rank 1: PIXL User`
                            }
                            onClick={() => {
                              onRemoveFromStaff(acc.id);
                              notify(
                                `Removed ${acc.username} from Staff — demoted to Rank 1: PIXL User.`
                              );
                            }}
                            className="inline-flex items-center gap-1 rounded-[2px] border border-[#000000] bg-[#b91c1c] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#991b1b] disabled:opacity-45 cursor-pointer"
                          >
                            <UserMinus className="h-3 w-3" />
                            Remove from Staff
                          </button>
                        )}

                        <button
                          type="button"
                          data-testid={`hk-edit-user-${acc.username}`}
                          onClick={() => openEditModal(acc)}
                          className="habbo-btn-blue inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit User
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {editingAccount && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="hk-edit-modal-title"
            >
              <div className="client-window w-full max-w-md overflow-hidden">
                <div className="client-window-bar flex items-center justify-between px-3 py-1.5">
                  <span id="hk-edit-modal-title" className="inline-flex items-center gap-1.5 text-[11px] font-bold">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#fde047]" />
                    Edit User · {editingAccount.username} ({editingAccount.displayId ?? editingAccount.id})
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingAccountId(null)}
                    aria-label="Close edit user modal"
                    className="client-close-btn"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="bg-white p-4 space-y-3.5">
                  <div className="flex items-center gap-3 rounded-[2px] border border-[#000000] bg-[#f4f8fc] p-2.5">
                    <div className="rounded-[2px] border border-[#000000] bg-gradient-to-b from-[#9fd9fc] to-[#e2f2fe] px-2 pt-2 pb-1 shrink-0">
                      <PixelAvatarCanvas look={editingAccount.playerState.look} dir={0} pose="stand" scale={1} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold text-[#111827]">{editingAccount.username}</p>
                        <PixelBadge code={RANK_META[editingAccount.rank].badgeCode} />
                      </div>
                      <p className="text-[11px] text-[#475569]">{RANK_META[editingAccount.rank].label}</p>
                      <p className="text-[10px] text-[#64748b]">Registered {editingAccount.createdAt}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="edit-user-credits" className="block text-[11px] font-bold text-[#1f2937]">
                        Credits
                      </label>
                      <input
                        id="edit-user-credits"
                        type="number"
                        min={0}
                        value={editCredits}
                        onChange={(e) => setEditCredits(e.target.value)}
                        className="mt-1 w-full rounded-[2px] border border-[#000000] px-2 py-1 font-mono-num text-[11px] font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-user-duckets" className="block text-[11px] font-bold text-[#1f2937]">
                        Duckets
                      </label>
                      <input
                        id="edit-user-duckets"
                        type="number"
                        min={0}
                        value={editDuckets}
                        onChange={(e) => setEditDuckets(e.target.value)}
                        className="mt-1 w-full rounded-[2px] border border-[#000000] px-2 py-1 font-mono-num text-[11px] font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-user-hc" className="block text-[11px] font-bold text-[#1f2937]">
                        HC Days
                      </label>
                      <input
                        id="edit-user-hc"
                        type="number"
                        min={0}
                        value={editHcDays}
                        onChange={(e) => setEditHcDays(e.target.value)}
                        className="mt-1 w-full rounded-[2px] border border-[#000000] px-2 py-1 font-mono-num text-[11px] font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="edit-user-motto" className="block text-[11px] font-bold text-[#1f2937]">
                      Motto
                    </label>
                    <input
                      id="edit-user-motto"
                      type="text"
                      maxLength={64}
                      value={editMotto}
                      onChange={(e) => setEditMotto(e.target.value)}
                      className="mt-1 w-full rounded-[2px] border border-[#000000] px-2.5 py-1 text-[11px] font-semibold"
                    />
                  </div>

                  <div
                    className={`rounded-[2px] border p-2.5 space-y-2 ${
                      editBanned ? 'border-[#991b1b] bg-[#fef2f2]' : 'border-[#94a3b8] bg-[#f8fafc]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold text-[#111827]">Account Suspension</p>
                        <p className="text-[10px] text-[#475569]">
                          Banned accounts cannot sign in to the Hotel.
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid="hk-toggle-ban-btn"
                        disabled={editingAccount.username.toLowerCase() === currentUsername.toLowerCase()}
                        onClick={() => setEditBanned((b) => !b)}
                        className={`rounded-[2px] border border-[#000000] px-3 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-45 ${
                          editBanned
                            ? 'bg-[#3d8b18] text-white hover:bg-[#337a12]'
                            : 'bg-[#b91c1c] text-white hover:bg-[#991b1b]'
                        }`}
                      >
                        {editBanned ? 'Unban User' : 'Ban User'}
                      </button>
                    </div>

                    {editBanned && (
                      <div>
                        <label htmlFor="edit-ban-reason" className="block text-[10px] font-bold text-[#7f1d1d]">
                          Ban Reason
                        </label>
                        <input
                          id="edit-ban-reason"
                          type="text"
                          value={editBanReason}
                          onChange={(e) => setEditBanReason(e.target.value)}
                          className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2 py-1 text-[11px]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingAccountId(null)}
                      className="habbo-btn-silver px-3.5 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      data-testid="hk-save-user-btn"
                      className="habbo-btn-green px-3.5 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

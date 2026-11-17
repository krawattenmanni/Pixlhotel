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
  Paintbrush,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
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
import type { AccountRank, CustomBadgeDef, UserAccount } from '../../game/types';
import {
  PixelAvatarCanvas,
  PixelBadge,
  PixelBadgeSprite,
  PixelHeadCanvas,
} from '../PixelSpriteCanvas';

interface HousekeepingTabProps {
  accounts: UserAccount[];
  customBadges: CustomBadgeDef[];
  currentUsername: string;
  onChangeRank: (accountId: string, rank: AccountRank) => void;
  onRemoveFromStaff: (accountId: string) => void;
  onEditUser: (accountId: string, patch: AdminUserEditPatch) => void;
  onResetDatabase: () => void;
  onMintAndAwardBadge: (input: {
    code: string;
    name: string;
    pixels: (string | null)[];
    recipientAccountId: string;
  }) => { ok: boolean; message: string };
}

type HousekeepingFilter = 'all' | 'staff' | 'regular' | 'banned';
type HousekeepingSubTab = 'accounts' | 'badges';

export function HousekeepingTab({
  accounts,
  customBadges,
  currentUsername,
  onChangeRank,
  onRemoveFromStaff,
  onEditUser,
  onResetDatabase,
  onMintAndAwardBadge,
}: HousekeepingTabProps) {
  const [subTab, setSubTab] = useState<HousekeepingSubTab>('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<HousekeepingFilter>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  const stats = useMemo(() => getAccountsDbStats(accounts), [accounts]);

  const notify = (msg: string) => {
    setStatusMessage(msg);
  };

  const candidateOptions = useMemo(() => {
    const q = staffCandidateSearch.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (acc.banned) return false;
      if (!q) return true;
      return acc.username.toLowerCase().includes(q) || acc.id.toLowerCase().includes(q);
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
        return (
          acc.username.toLowerCase().includes(q) ||
          acc.playerState.motto.toLowerCase().includes(q) ||
          acc.id.toLowerCase().includes(q)
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

  const openEditModal = (acc: UserAccount) => {
    setEditingAccountId(acc.id);
    setEditCredits(String(acc.playerState.credits));
    setEditDuckets(String(acc.playerState.duckets));
    setEditHcDays(String(acc.playerState.hcDays));
    setEditMotto(acc.playerState.motto);
    setEditBanned(acc.banned);
    setEditBanReason(acc.banReason ?? 'Violated the Habbo Way.');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const isSelf = editingAccount.username.toLowerCase() === currentUsername.toLowerCase();
    onEditUser(editingAccount.id, {
      credits: Number(editCredits),
      duckets: Number(editDuckets),
      hcDays: Number(editHcDays),
      motto: editMotto,
      banned: isSelf ? false : editBanned,
      banReason: editBanReason,
    });
    notify(`Saved account changes for ${editingAccount.username} (${editingAccount.id}).`);
    setEditingAccountId(null);
  };

  const handleQuickAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const target = accounts.find((a) => a.id === activeCandidateId);
    if (!target) return;
    onChangeRank(target.id, promoteRank);
    notify(
      `${target.username} (${target.id}) is now ${RANK_META[promoteRank].label} — Staff page synced live!`
    );
  };

  return (
    <div className="space-y-6" data-testid="housekeeping-panel">
      {/* DATABASE OVERVIEW HEADER */}
      <section className="habbo-box">
        <div className="habbo-box-header flex flex-wrap items-center justify-between gap-2 bg-[#9e1b1b]">
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#fde047]" />
            PIXL Housekeeping — Account Database &amp; Staff Manager
          </span>
          <button
            type="button"
            data-testid="hk-reset-db-btn"
            onClick={() => {
              onResetDatabase();
              notify('Accounts Database restored to default seeded hotel records.');
            }}
            className="inline-flex items-center gap-1.5 rounded border border-[#fca5a5]/50 bg-[#7f1d1d] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#5c1111] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Demo DB
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-[#c8d6e5] bg-[#f4f8fc] p-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[#9cc2df] bg-[#2c6e9b] text-white shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Total Registered Accounts
                </p>
                <p className="font-mono-num text-2xl font-extrabold text-[#0f3454]" data-testid="hk-total-accounts">
                  {stats.totalAccounts}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[#fca5a5] bg-[#fef2f2] p-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[#7f1d1d] bg-[#9e1b1b] text-[#fde047] shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-rose-800">
                  Active Staff Members
                </p>
                <p className="font-mono-num text-2xl font-extrabold text-[#9e1b1b]" data-testid="hk-active-staff">
                  {stats.activeStaffCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[#fcd34d] bg-[#fffbeb] p-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[#b45309] bg-[#f37021] text-white shrink-0">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-900">
                  Total Credits in Circulation
                </p>
                <p className="font-mono-num text-2xl font-extrabold text-[#92400e]" data-testid="hk-total-credits">
                  {stats.totalCreditsInCirculation.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div
              role="status"
              className="flex items-center justify-between gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900"
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                {statusMessage}
              </span>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                aria-label="Dismiss notification"
                className="rounded p-0.5 hover:bg-emerald-100 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Housekeeping Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[#dbe6f0] pt-3">
            <button
              type="button"
              data-testid="hk-subtab-accounts"
              onClick={() => setSubTab('accounts')}
              className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-extrabold cursor-pointer ${
                subTab === 'accounts'
                  ? 'bg-[#9e1b1b] text-white'
                  : 'border border-[#c8d6e5] bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Accounts Database
            </button>
            <button
              type="button"
              data-testid="hk-subtab-badges"
              onClick={() => setSubTab('badges')}
              className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-extrabold cursor-pointer ${
                subTab === 'badges'
                  ? 'bg-[#7c3aed] text-white'
                  : 'border border-[#c8d6e5] bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Paintbrush className="h-3.5 w-3.5" />
              Badge Creator (16x16)
            </button>
          </div>
        </div>
      </section>

      {subTab === 'badges' && (
        <section className="habbo-box" data-testid="hk-badge-creator">
          <div className="habbo-box-header flex flex-wrap items-center justify-between gap-2 bg-[#7c3aed]">
            <span className="inline-flex items-center gap-2">
              <Award className="h-4 w-4 text-[#fde047]" />
              16x16 Pixel Badge Creator &amp; Award Tool
            </span>
            <span className="font-mono-num text-xs text-purple-100">
              {customBadges.length} custom badges minted
            </span>
          </div>

          <div
            className="grid grid-cols-1 gap-6 p-4 sm:p-5 lg:grid-cols-12"
            onPointerUp={() => setIsPainting(false)}
            onPointerLeave={() => setIsPainting(false)}
          >
            {/* Left: Interactive 16x16 Pixel Canvas + Retro Palette */}
            <div className="space-y-3 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-slate-800">
                  Tap or drag on the 16&times;16 grid to draw pixels
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEraserActive((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-bold cursor-pointer ${
                      eraserActive
                        ? 'border-[#1d4ed8] bg-[#2b7de9] text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Eraser
                  </button>
                  <button
                    type="button"
                    onClick={() => setBadgePixels(createStarterCrownGrid())}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Crown Preset
                  </button>
                  <button
                    type="button"
                    data-testid="hk-badge-clear-btn"
                    onClick={() => setBadgePixels(createEmptyBadgeGrid())}
                    className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Touch-friendly 16x16 Grid */}
              <div
                className="mx-auto grid w-full max-w-[360px] grid-cols-16 gap-[1px] rounded border-2 border-[#1b1922] bg-slate-300 p-1 touch-none select-none"
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

              {/* Retro Color Palette */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-slate-600">Retro Color Palette</p>
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
                        className={`h-7 w-7 rounded border-2 cursor-pointer transition-transform ${
                          active ? 'scale-110 border-slate-950 ring-2 ring-[#7c3aed]' : 'border-slate-400'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Metadata, Live Preview, Recipient & Mint Button */}
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
              className="space-y-4 lg:col-span-5"
            >
              <div className="rounded-lg border border-[#c8d6e5] bg-[#f4f8fc] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Live Badge Preview
                </p>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded border-2 border-[#ca8a04] bg-white p-1">
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
                      className="pixelated h-12 w-12"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-pixel text-xs text-[#7c3aed]">
                      [{(badgeCode || 'CODE').toUpperCase()}]
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 truncate">
                      {badgeTitle || 'Untitled Badge'}
                    </p>
                    <p className="text-[11px] text-slate-500">16&times;16 Pixel Crest</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="hk-badge-code" className="block text-xs font-bold text-slate-700">
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
                    className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-1.5 font-mono-num text-xs font-extrabold uppercase text-slate-900 focus:border-[#7c3aed] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="hk-badge-title" className="block text-xs font-bold text-slate-700">
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
                    className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-[#7c3aed] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="hk-badge-recipient" className="block text-xs font-bold text-slate-700">
                  Award Directly to Habbo Account
                </label>
                <select
                  id="hk-badge-recipient"
                  data-testid="hk-badge-recipient-select"
                  value={recipientAccountId}
                  onChange={(e) => setRecipientAccountId(e.target.value)}
                  className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#7c3aed] focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.id} · {acc.username} ({RANK_META[acc.rank].badgeCode})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                data-testid="hk-mint-award-btn"
                className="habbo-btn-green w-full rounded py-2.5 font-pixel text-xs cursor-pointer"
              >
                Mint &amp; Award Badge
              </button>

              {badgeFeedback && (
                <p
                  role="status"
                  className={`rounded border px-3 py-2 text-xs font-bold ${
                    badgeFeedback.ok
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-rose-300 bg-rose-50 text-rose-900'
                  }`}
                >
                  {badgeFeedback.text}
                </p>
              )}

              {customBadges.length > 0 && (
                <div className="border-t border-[#dbe6f0] pt-3">
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                    Recently Minted Badges
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {customBadges.map((cb) => (
                      <div
                        key={cb.id}
                        className="flex items-center gap-2 rounded border border-[#c8d6e5] bg-white px-2 py-1"
                      >
                        <PixelBadgeSprite
                          badgeId={cb.id}
                          unlocked
                          customBadges={customBadges}
                          size={24}
                        />
                        <div className="text-[10px]">
                          <p className="font-extrabold text-slate-900">[{cb.code}]</p>
                          <p className="text-slate-500">{cb.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </section>
      )}

      {subTab === 'accounts' && (
        <>

      {/* QUICK "ADD TO STAFF" BAR */}
      <section className="habbo-box">
        <div className="habbo-box-header flex items-center gap-2 bg-[#2c6e9b]">
          <UserPlus className="h-4 w-4 text-[#fde047]" />
          Add to Staff — Quick Staff Assignment
        </div>
        <form
          onSubmit={handleQuickAddStaff}
          className="grid grid-cols-1 gap-3 p-4 md:grid-cols-12 md:items-end"
        >
          <div className="md:col-span-4">
            <label htmlFor="hk-staff-search" className="block text-xs font-bold text-slate-700">
              Filter Registered Citizen
            </label>
            <input
              id="hk-staff-search"
              type="text"
              value={staffCandidateSearch}
              onChange={(e) => setStaffCandidateSearch(e.target.value)}
              placeholder="Type name or #ID..."
              className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="hk-staff-user" className="block text-xs font-bold text-slate-700">
              Select Account
            </label>
            <select
              id="hk-staff-user"
              value={activeCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
            >
              {candidateOptions.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.id} · {acc.username} ({RANK_META[acc.rank].badgeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="hk-staff-role" className="block text-xs font-bold text-slate-700">
              Assign Staff Rank
            </label>
            <select
              id="hk-staff-role"
              value={promoteRank}
              onChange={(e) => setPromoteRank(Number(e.target.value) as 3 | 4 | 5)}
              className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
            >
              <option value={3}>Rank 3: Event Team (EVT)</option>
              <option value={4}>Rank 4: Moderator (MOD)</option>
              <option value={5}>Rank 5: Hotel Manager (ADM)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={!activeCandidateId}
              data-testid="hk-quick-add-staff-btn"
              className="habbo-btn-green w-full rounded py-2 px-3 text-xs font-extrabold cursor-pointer disabled:opacity-50"
            >
              Add to Staff
            </button>
          </div>
        </form>
      </section>

      {/* REGISTERED ACCOUNTS DATABASE */}
      <section className="habbo-box">
        <div className="habbo-box-header flex flex-wrap items-center justify-between gap-2 bg-[#f37021]">
          <span className="inline-flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Registered Accounts Overview
          </span>
          <span className="font-mono-num text-xs text-amber-100">
            Showing {filteredAccounts.length} of {accounts.length}
          </span>
        </div>

        {/* Search & Filter Pills */}
        <div className="border-b border-[#c8d6e5] bg-[#f8fbfe] p-4 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <label htmlFor="hk-accounts-search" className="sr-only">
                Search accounts by username or motto
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="hk-accounts-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search username, motto, or #ID..."
                className="w-full rounded border-2 border-[#c8d6e5] bg-white py-1.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
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
                  className={`rounded px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                    filter === pill.id
                      ? 'bg-[#2c6e9b] text-white'
                      : 'border border-[#c8d6e5] bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile-Friendly Cards + Responsive Desktop Rows */}
        {filteredAccounts.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-slate-500">
            No accounts match your search or filter.
          </div>
        ) : (
          <div className="divide-y divide-[#dbe6f0]">
            {filteredAccounts.map((acc) => {
              const meta = RANK_META[acc.rank];
              const isSelf = acc.username.toLowerCase() === currentUsername.toLowerCase();
              const isStaff = acc.rank >= 3;

              return (
                <div
                  key={acc.id}
                  data-testid={`hk-account-row-${acc.username}`}
                  className={`flex flex-col gap-3 p-3.5 transition-colors lg:flex-row lg:items-center lg:justify-between ${
                    acc.banned ? 'bg-rose-50/70' : 'bg-white hover:bg-[#f4f8fc]'
                  }`}
                >
                  {/* Left: ID, Mini 3/4 Avatar, Name, Badges, Motto */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="mt-1 rounded border border-[#c8d6e5] bg-[#eef5fc] px-1.5 py-0.5 font-mono-num text-[11px] font-extrabold text-[#1e4a6d] shrink-0">
                      {acc.id}
                    </span>

                    <div className="relative rounded border border-[#c8d6e5] bg-[#e6f3ff] p-0.5 shrink-0">
                      <PixelHeadCanvas look={acc.playerState.look} size={38} />
                      <span
                        title={acc.online ? 'Online' : 'Offline'}
                        className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-sm border ${
                          acc.online
                            ? 'bg-[#22c55e] border-[#14532d]'
                            : 'bg-slate-400 border-slate-600'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-extrabold text-slate-900 break-words">
                          {acc.username}
                        </span>
                        <PixelBadge code={meta.badgeCode} label={meta.label} />
                        {acc.banned && (
                          <span className="inline-flex items-center gap-1 rounded border border-rose-700 bg-rose-600 px-1.5 py-0.5 font-pixel text-[9px] text-white">
                            <Ban className="h-2.5 w-2.5" /> BANNED
                          </span>
                        )}
                        {isSelf && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                            You
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-xs italic text-slate-600 truncate">
                        &ldquo;{acc.playerState.motto}&rdquo;
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1 text-amber-800">
                          <Coins className="h-3 w-3 text-[#d97706]" />
                          <strong className="font-mono-num">{acc.playerState.credits}</strong>c
                        </span>
                        <span className="inline-flex items-center gap-1 text-violet-800">
                          <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                          <strong className="font-mono-num">{acc.playerState.duckets}</strong>d
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Crown className="h-3 w-3 text-[#ca8a04]" />
                          <strong className="font-mono-num">{acc.playerState.hcDays}d</strong> HC
                        </span>
                        <span>Registered: {acc.createdAt}</span>
                        <span>Seen: {acc.lastSeen}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Rank Dropdown, Remove from Staff, Edit User */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                        onChangeRank(acc.id, nextRank);
                        notify(
                          `Updated ${acc.username} (${acc.id}) to ${RANK_META[nextRank].label}.`
                        );
                      }}
                      className="rounded border-2 border-[#c8d6e5] bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-[#2c6e9b] focus:outline-none disabled:opacity-60"
                    >
                      <option value={1}>Rank 1: PIXL User</option>
                      <option value={2}>Rank 2: VIP</option>
                      <option value={3}>Rank 3: Event Team</option>
                      <option value={4}>Rank 4: Moderator</option>
                      <option value={5}>Rank 5: Hotel Manager [ADM]</option>
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
                        className="inline-flex items-center gap-1 rounded border border-[#7f1d1d] bg-[#b91c1c] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#991b1b] disabled:opacity-45 cursor-pointer"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        Remove from Staff
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid={`hk-edit-user-${acc.username}`}
                      onClick={() => openEditModal(acc)}
                      className="habbo-btn-blue inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit User
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* EDIT USER MODAL */}
      {editingAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hk-edit-modal-title"
        >
          <div className="habbo-box w-full max-w-md bg-white overflow-hidden">
            <div className="habbo-box-header flex items-center justify-between bg-[#9e1b1b]">
              <span id="hk-edit-modal-title" className="inline-flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#fde047]" />
                Edit User · {editingAccount.username} ({editingAccount.id})
              </span>
              <button
                type="button"
                onClick={() => setEditingAccountId(null)}
                aria-label="Close edit user modal"
                className="rounded p-1 hover:bg-black/20 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-[#c8d6e5] bg-[#f4f8fc] p-3">
                <div className="rounded border border-[#9cc2df] bg-gradient-to-b from-[#9fd9fc] to-[#e2f2fe] px-2 pt-2 pb-1 shrink-0">
                  <PixelAvatarCanvas look={editingAccount.playerState.look} dir={0} pose="stand" scale={1} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-extrabold text-slate-900">{editingAccount.username}</p>
                    <PixelBadge code={RANK_META[editingAccount.rank].badgeCode} />
                  </div>
                  <p className="text-xs text-slate-600">{RANK_META[editingAccount.rank].label}</p>
                  <p className="text-[11px] text-slate-500">Registered {editingAccount.createdAt}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="edit-user-credits" className="block text-xs font-bold text-slate-700">
                    Credits
                  </label>
                  <input
                    id="edit-user-credits"
                    type="number"
                    min={0}
                    value={editCredits}
                    onChange={(e) => setEditCredits(e.target.value)}
                    className="mt-1 w-full rounded border-2 border-[#c8d6e5] px-2.5 py-1.5 font-mono-num text-xs font-bold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-duckets" className="block text-xs font-bold text-slate-700">
                    Duckets
                  </label>
                  <input
                    id="edit-user-duckets"
                    type="number"
                    min={0}
                    value={editDuckets}
                    onChange={(e) => setEditDuckets(e.target.value)}
                    className="mt-1 w-full rounded border-2 border-[#c8d6e5] px-2.5 py-1.5 font-mono-num text-xs font-bold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-hc" className="block text-xs font-bold text-slate-700">
                    HC Days
                  </label>
                  <input
                    id="edit-user-hc"
                    type="number"
                    min={0}
                    value={editHcDays}
                    onChange={(e) => setEditHcDays(e.target.value)}
                    className="mt-1 w-full rounded border-2 border-[#c8d6e5] px-2.5 py-1.5 font-mono-num text-xs font-bold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-user-motto" className="block text-xs font-bold text-slate-700">
                  Motto
                </label>
                <input
                  id="edit-user-motto"
                  type="text"
                  maxLength={64}
                  value={editMotto}
                  onChange={(e) => setEditMotto(e.target.value)}
                  className="mt-1 w-full rounded border-2 border-[#c8d6e5] px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
                />
              </div>

              {/* Ban / Unban Toggle */}
              <div
                className={`rounded-md border p-3 space-y-2 ${
                  editBanned ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">Account Suspension</p>
                    <p className="text-[11px] text-slate-600">
                      Banned accounts cannot sign in to the Hotel.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="hk-toggle-ban-btn"
                    disabled={editingAccount.username.toLowerCase() === currentUsername.toLowerCase()}
                    onClick={() => setEditBanned((b) => !b)}
                    className={`rounded px-3 py-1.5 text-xs font-extrabold cursor-pointer disabled:opacity-45 ${
                      editBanned
                        ? 'border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-rose-800 bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    {editBanned ? 'Unban User' : 'Ban User'}
                  </button>
                </div>

                {editBanned && (
                  <div>
                    <label htmlFor="edit-ban-reason" className="block text-[11px] font-bold text-rose-900">
                      Ban Reason
                    </label>
                    <input
                      id="edit-ban-reason"
                      type="text"
                      value={editBanReason}
                      onChange={(e) => setEditBanReason(e.target.value)}
                      className="mt-1 w-full rounded border border-rose-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-rose-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingAccountId(null)}
                  className="rounded border border-slate-300 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="hk-save-user-btn"
                  className="habbo-btn-green rounded px-4 py-1.5 text-xs font-bold cursor-pointer"
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

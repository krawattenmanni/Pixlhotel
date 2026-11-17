import { ADMIN_PLAYER_STATE, DEFAULT_LOOK, INITIAL_PLAYER_STATE, STAFF_MEMBERS } from './data';
import type {
  AccountRank,
  LookConfig,
  PlayerState,
  RankDef,
  StaffMember,
  UserAccount,
} from './types';

export const ACCOUNTS_DB_STORAGE_KEY = 'pixlhotel_accounts_db_v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RankMetaInfo {
  rank: AccountRank;
  label: string;
  shortLabel: string;
  badgeCode: string;
  isStaff: boolean;
  department?: StaffMember['department'];
}

export const RANK_META: Record<AccountRank, RankMetaInfo> = {
  1: {
    rank: 1,
    label: 'Rank 1: PIXL User',
    shortLabel: 'PIXL User',
    badgeCode: 'USR',
    isStaff: false,
  },
  2: {
    rank: 2,
    label: 'Rank 2: VIP',
    shortLabel: 'VIP Member',
    badgeCode: 'VIP',
    isStaff: false,
  },
  3: {
    rank: 3,
    label: 'Rank 3: Event Team',
    shortLabel: 'Event Team',
    badgeCode: 'EVT',
    isStaff: true,
    department: 'Event Team',
  },
  4: {
    rank: 4,
    label: 'Rank 4: Moderator',
    shortLabel: 'Moderator',
    badgeCode: 'MOD',
    isStaff: true,
    department: 'Moderators',
  },
  5: {
    rank: 5,
    label: 'Rank 5: Hotel Manager [ADM]',
    shortLabel: 'Hotel Manager',
    badgeCode: 'ADM',
    isStaff: true,
    department: 'Hotel Managers',
  },
};

export function getRankBadgeCode(rank: AccountRank): string {
  return RANK_META[rank].badgeCode;
}

export function getRankLabel(rank: AccountRank): string {
  return RANK_META[rank].shortLabel;
}

function makeSeedAccount(params: {
  id: string;
  username: string;
  password: string;
  rank: AccountRank;
  motto: string;
  credits: number;
  duckets: number;
  hcDays: number;
  createdAt: string;
  lastSeen: string;
  online: boolean;
  look: LookConfig;
  badges: string[];
  roomId?: string;
  banned?: boolean;
  banReason?: string;
}): UserAccount {
  const role = params.rank >= 4 ? 'admin' : 'player';
  const playerState: PlayerState = {
    username: params.username,
    rank: params.rank,
    role,
    motto: params.motto,
    credits: params.credits,
    duckets: params.duckets,
    hcDays: params.hcDays,
    look: { ...params.look },
    inventory: [
      { furniId: 'hc_sofa', quantity: params.rank >= 3 ? 2 : 1 },
      { furniId: 'palm_tree', quantity: 1 },
    ],
    redeemedVouchers: [],
    unlockedBadges: [...params.badges],
    equippedBadgeId: params.badges[params.badges.length - 1] ?? 'badge_checkin',
    friendIds: ['npc-marco', 'npc-pixie'],
    currentRoomId: params.roomId ?? 'welcome_lounge',
    pets: [],
    pendingEngravings: {},
  };

  return {
    id: params.id,
    displayId: params.id,
    username: params.username,
    password: params.password,
    rank: params.rank,
    role,
    banned: Boolean(params.banned),
    banReason: params.banReason,
    online: params.online,
    createdAt: params.createdAt,
    lastSeen: params.lastSeen,
    playerState,
  };
}

export function getSeedAccountsDB(): UserAccount[] {
  const staffByName = (name: string) => STAFF_MEMBERS.find((s) => s.name === name);

  return [
    {
      id: '#001',
      displayId: '#001',
      username: 'Krawattenmanni',
      password: 'Manni123',
      rank: 5,
      role: 'admin',
      banned: false,
      online: true,
      createdAt: '2008-06-01',
      lastSeen: 'Online now',
      playerState: {
        ...ADMIN_PLAYER_STATE,
        username: 'Krawattenmanni',
        rank: 5,
        role: 'admin',
      },
    },
    {
      id: '#002',
      displayId: '#002',
      username: 'PixelGuest',
      password: 'pixlhotel',
      rank: 2,
      role: 'player',
      banned: false,
      online: true,
      createdAt: '2026-11-15',
      lastSeen: 'Online now',
      playerState: {
        ...INITIAL_PLAYER_STATE,
        rank: 2,
        role: 'player',
      },
    },
    makeSeedAccount({
      id: '#003',
      username: 'HotelManager_Kai',
      password: 'kai2009',
      rank: 5,
      motto: 'Architect of pixels & good vibes since 2008.',
      credits: 4200,
      duckets: 1800,
      hcDays: 180,
      createdAt: '2009-02-14',
      lastSeen: 'Online now',
      online: true,
      look: staffByName('HotelManager_Kai')?.look ?? DEFAULT_LOOK,
      badges: ['badge_checkin', 'badge_hc', 'badge_admin', 'badge_architect'],
      roomId: 'welcome_lounge',
    }),
    makeSeedAccount({
      id: '#004',
      username: 'LadyClover',
      password: 'clover88',
      rank: 5,
      motto: 'Curating Rare Values & weekly quests.',
      credits: 3150,
      duckets: 950,
      hcDays: 120,
      createdAt: '2009-04-22',
      lastSeen: '2h ago',
      online: false,
      look: staffByName('LadyClover')?.look ?? DEFAULT_LOOK,
      badges: ['badge_checkin', 'badge_admin', 'badge_stylist', 'badge_voucher'],
      roomId: 'welcome_lounge',
    }),
    makeSeedAccount({
      id: '#005',
      username: 'MOD-Vega',
      password: 'vega2010',
      rank: 4,
      motto: 'Keeping the Hotel safe & friendly',
      credits: 1450,
      duckets: 620,
      hcDays: 90,
      createdAt: '2010-08-19',
      lastSeen: 'Online now',
      online: true,
      look: staffByName('MOD-Vega')?.look ?? DEFAULT_LOOK,
      badges: ['badge_checkin', 'badge_hc', 'badge_social', 'badge_architect'],
      roomId: 'club_mammoth',
    }),
    makeSeedAccount({
      id: '#006',
      username: 'MOD-Orion',
      password: 'orion2011',
      rank: 4,
      motto: 'Always watching the Trade Rooms.',
      credits: 1120,
      duckets: 540,
      hcDays: 60,
      createdAt: '2011-01-09',
      lastSeen: 'Yesterday',
      online: false,
      look: staffByName('MOD-Orion')?.look ?? DEFAULT_LOOK,
      badges: ['badge_checkin', 'badge_social'],
      roomId: 'welcome_lounge',
    }),
    makeSeedAccount({
      id: '#007',
      username: 'EV-Bumble',
      password: 'bumble99',
      rank: 3,
      motto: 'Falling Furni starts at 8 PM!',
      credits: 890,
      duckets: 430,
      hcDays: 45,
      createdAt: '2011-09-03',
      lastSeen: 'Online now',
      online: true,
      look: staffByName('EV-Bumble')?.look ?? DEFAULT_LOOK,
      badges: ['badge_checkin', 'badge_dj', 'badge_social'],
      roomId: 'welcome_lounge',
    }),
    makeSeedAccount({
      id: '#008',
      username: 'DJ_Frank',
      password: 'beats123',
      rank: 3,
      motto: 'Spinning retro beats on the roof!',
      credits: 1640,
      duckets: 810,
      hcDays: 75,
      createdAt: '2010-05-12',
      lastSeen: 'Online now',
      online: true,
      look: staffByName('EV-DJFrank')?.look ?? DEFAULT_LOOK,
      badges: ['badge_checkin', 'badge_dj', 'badge_hc', 'badge_social'],
      roomId: 'club_mammoth',
    }),
    makeSeedAccount({
      id: '#009',
      username: 'Pixie',
      password: 'pixie123',
      rank: 2,
      motto: 'Collecting rares since 2008 <3',
      credits: 780,
      duckets: 390,
      hcDays: 30,
      createdAt: '2012-03-18',
      lastSeen: 'Online now',
      online: true,
      look: {
        skinColor: '#ffdfc4',
        hairStyle: 'long',
        hairColor: '#eb6fa8',
        expression: 'cheeky',
        shirtStyle: 'tank',
        shirtColor: '#7c3aed',
        pantsColor: '#343a40',
        shoesColor: '#eb6fa8',
        accessory: 'crown',
      },
      badges: ['badge_checkin', 'badge_hc', 'badge_dragon', 'badge_throne'],
      roomId: 'welcome_lounge',
    }),
    makeSeedAccount({
      id: '#010',
      username: 'BaristaMarco',
      password: 'marco123',
      rank: 1,
      motto: 'Fresh pixel espresso on the house!',
      credits: 410,
      duckets: 320,
      hcDays: 0,
      createdAt: '2024-07-04',
      lastSeen: 'Online now',
      online: true,
      look: {
        skinColor: '#e0ac69',
        hairStyle: 'curls',
        hairColor: '#232024',
        expression: 'happy',
        shirtStyle: 'stripes',
        shirtColor: '#c83232',
        pantsColor: '#343a40',
        shoesColor: '#232024',
        accessory: 'cap',
      },
      badges: ['badge_checkin', 'badge_social', 'badge_voucher'],
      roomId: 'welcome_lounge',
    }),
    makeSeedAccount({
      id: '#011',
      username: 'RetroNova',
      password: 'nova123',
      rank: 1,
      motto: 'Decorating suites and trading Petal Patches!',
      credits: 295,
      duckets: 180,
      hcDays: 0,
      createdAt: '2025-11-28',
      lastSeen: '15m ago',
      online: true,
      look: {
        skinColor: '#f5cba7',
        hairStyle: 'bob',
        hairColor: '#3fa7d6',
        expression: 'happy',
        shirtStyle: 'hoodie',
        shirtColor: '#0d9488',
        pantsColor: '#343a40',
        shoesColor: '#f3efe0',
        accessory: 'headphones',
      },
      badges: ['badge_checkin', 'badge_stylist', 'badge_architect'],
      roomId: 'my_room',
    }),
  ];
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  return null;
}

export function loadAccountsDB(storage: StorageLike | null = getDefaultStorage()): UserAccount[] {
  const seed = getSeedAccountsDB();
  if (!storage) return seed;

  try {
    const raw = storage.getItem(ACCOUNTS_DB_STORAGE_KEY);
    if (!raw) {
      storage.setItem(ACCOUNTS_DB_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      storage.setItem(ACCOUNTS_DB_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }

    // Normalize legacy entries so all required fields exist
    return parsed.map((item, idx) => {
      const rank = (item.rank ?? (item.role === 'admin' ? 5 : 1)) as AccountRank;
      const role = rank >= 4 ? 'admin' : 'player';
      const fallbackDisplay = `#${String(idx + 1).padStart(3, '0')}`;
      return {
        id: item.id ?? fallbackDisplay,
        displayId: item.displayId ?? (String(item.id ?? '').startsWith('#') ? item.id : fallbackDisplay),
        username: item.username,
        password: item.password,
        rank,
        role,
        banned: Boolean(item.banned),
        banReason: item.banReason,
        online: typeof item.online === 'boolean' ? item.online : true,
        createdAt: item.createdAt ?? '2026-11-15',
        lastSeen: item.lastSeen ?? 'Recently',
        playerState: {
          ...INITIAL_PLAYER_STATE,
          ...(item.playerState ?? {}),
          pets: Array.isArray(item.playerState?.pets) ? item.playerState.pets : [],
          pendingEngravings:
            item.playerState?.pendingEngravings && typeof item.playerState.pendingEngravings === 'object'
              ? item.playerState.pendingEngravings
              : {},
          username: item.username,
          rank,
          role,
        },
      } satisfies UserAccount;
    });
  } catch {
    return seed;
  }
}

export function saveAccountsDB(
  accounts: UserAccount[],
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(ACCOUNTS_DB_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage quota errors safely
  }
}

export function resetAccountsDB(storage: StorageLike | null = getDefaultStorage()): UserAccount[] {
  const seed = getSeedAccountsDB();
  saveAccountsDB(seed, storage);
  return seed;
}

export function nextAccountId(accounts: UserAccount[]): string {
  let maxNum = 0;
  for (const acc of accounts) {
    const m = /^#?(\d+)$/.exec(acc.id);
    if (m) {
      maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
  }
  return `#${String(Math.max(maxNum, accounts.length) + 1).padStart(3, '0')}`;
}

export function setAccountRank(
  accounts: UserAccount[],
  accountId: string,
  nextRank: AccountRank
): UserAccount[] {
  return accounts.map((acc) => {
    if (acc.id !== accountId) return acc;
    const role = nextRank >= 4 ? 'admin' : 'player';
    const badgeSet = new Set(acc.playerState.unlockedBadges);
    if (nextRank === 5) badgeSet.add('badge_admin');
    else if (acc.username.toLowerCase() !== 'krawattenmanni') badgeSet.delete('badge_admin');

    const nextEquipped =
      nextRank === 5
        ? 'badge_admin'
        : acc.playerState.equippedBadgeId === 'badge_admin'
        ? 'badge_checkin'
        : acc.playerState.equippedBadgeId;

    return {
      ...acc,
      rank: nextRank,
      role,
      playerState: {
        ...acc.playerState,
        rank: nextRank,
        role,
        unlockedBadges: Array.from(badgeSet),
        equippedBadgeId: nextEquipped,
      },
    };
  });
}

export function demoteFromStaff(accounts: UserAccount[], accountId: string): UserAccount[] {
  return setAccountRank(accounts, accountId, 1);
}

export interface AdminUserEditPatch {
  credits?: number;
  duckets?: number;
  hcDays?: number;
  motto?: string;
  banned?: boolean;
  banReason?: string;
}

export function updateAccountAdminFields(
  accounts: UserAccount[],
  accountId: string,
  patch: AdminUserEditPatch
): UserAccount[] {
  return accounts.map((acc) => {
    if (acc.id !== accountId) return acc;
    const nextCredits =
      typeof patch.credits === 'number' && Number.isFinite(patch.credits)
        ? Math.max(0, Math.round(patch.credits))
        : acc.playerState.credits;
    const nextDuckets =
      typeof patch.duckets === 'number' && Number.isFinite(patch.duckets)
        ? Math.max(0, Math.round(patch.duckets))
        : acc.playerState.duckets;
    const nextHcDays =
      typeof patch.hcDays === 'number' && Number.isFinite(patch.hcDays)
        ? Math.max(0, Math.round(patch.hcDays))
        : acc.playerState.hcDays;
    const nextMotto =
      typeof patch.motto === 'string'
        ? patch.motto.trim().slice(0, 64) || acc.playerState.motto
        : acc.playerState.motto;
    const nextBanned = typeof patch.banned === 'boolean' ? patch.banned : acc.banned;

    return {
      ...acc,
      banned: nextBanned,
      banReason: nextBanned ? patch.banReason?.trim() || acc.banReason || 'Suspended by Hotel Management.' : undefined,
      online: nextBanned ? false : acc.online,
      playerState: {
        ...acc.playerState,
        credits: nextCredits,
        duckets: nextDuckets,
        hcDays: nextHcDays,
        motto: nextMotto,
      },
    };
  });
}

export function deriveStaffMembersFromAccounts(
  accounts: UserAccount[],
  ranks?: RankDef[]
): StaffMember[] {
  return accounts
    .filter((acc) => acc.rank >= 3 && !acc.banned)
    .sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id))
    .map((acc) => {
      const meta = RANK_META[acc.rank];
      const dbRank = ranks?.find((r) => r.id === acc.rank);
      const department: StaffMember['department'] =
        acc.rank === 5 ? 'Hotel Managers' : acc.rank === 4 ? 'Moderators' : 'Event Team';
      const customRole =
        acc.username.toLowerCase() === 'krawattenmanni'
          ? 'Creator & Hotel Admin'
          : dbRank?.name ||
            (acc.rank === 5
              ? 'Hotel Manager'
              : acc.rank === 4
              ? 'Safety Moderator'
              : 'Event Team Host');
      const badgeLabel =
        acc.rank === 5 ? 'Admin Crest' : acc.rank === 4 ? 'Guardian Shield' : 'Golden Star';
      const badgeCode = dbRank?.badgeCode || meta.badgeCode;

      return {
        id: `staff-${acc.id}`,
        accountId: acc.id,
        name: acc.username,
        role: customRole,
        department,
        motto: acc.playerState.motto,
        badgeCode,
        badgeLabel,
        online: acc.online,
        roomId: acc.playerState.currentRoomId || '1',
        look: acc.playerState.look,
        badges: acc.playerState.unlockedBadges,
      };
    });
}

export function getAccountsDbStats(accounts: UserAccount[]) {
  const totalAccounts = accounts.length;
  const activeStaffCount = accounts.filter((a) => a.rank >= 3 && !a.banned).length;
  const totalCreditsInCirculation = accounts.reduce((sum, a) => sum + a.playerState.credits, 0);
  const bannedCount = accounts.filter((a) => a.banned).length;
  return {
    totalAccounts,
    activeStaffCount,
    totalCreditsInCirculation,
    bannedCount,
  };
}

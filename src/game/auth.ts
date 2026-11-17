import { getSeedAccountsDB, nextAccountId } from './accountsDb';
import { DEFAULT_LOOK } from './data';
import type { LookConfig, PlayerState, UserAccount } from './types';

export function getInitialAccounts(): UserAccount[] {
  return getSeedAccountsDB();
}

export interface AuthResult {
  ok: boolean;
  banned?: boolean;
  message: string;
  account?: UserAccount;
  accounts?: UserAccount[];
}

export function authenticateUser(
  accounts: UserAccount[],
  rawUsername: string,
  rawPassword: string
): AuthResult {
  const username = rawUsername.trim();
  if (!username || !rawPassword) {
    return { ok: false, message: 'Please enter both your PIXL name and password.' };
  }

  const found = accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
  if (!found || found.password !== rawPassword) {
    return { ok: false, message: 'Invalid PIXL name or password. Please check your credentials.' };
  }

  if (found.banned) {
    return {
      ok: false,
      banned: true,
      message: `ACCESS DENIED — Your PIXL Hotel account "${found.username}" is banned from the Hotel. Reason: ${
        found.banReason || 'Violation of the PIXL Way.'
      }`,
    };
  }

  const updatedAccount: UserAccount = {
    ...found,
    online: true,
    lastSeen: 'Online now',
  };

  return {
    ok: true,
    message:
      found.rank >= 4
        ? `Welcome back, ${found.rank === 5 ? 'Hotel Manager' : 'Moderator'} ${found.username}!`
        : `Welcome back, ${found.username}!`,
    account: updatedAccount,
    accounts: accounts.map((a) => (a.id === found.id ? updatedAccount : a)),
  };
}

export function registerUser(
  accounts: UserAccount[],
  rawUsername: string,
  rawPassword: string,
  confirmPassword: string,
  motto?: string,
  customLook?: LookConfig
): AuthResult {
  const username = rawUsername.trim();

  if (username.length < 3 || username.length > 18) {
    return { ok: false, message: 'PIXL name must be between 3 and 18 characters.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { ok: false, message: 'PIXL name may only use letters, numbers, underscores, or hyphens.' };
  }
  if (rawPassword.length < 4) {
    return { ok: false, message: 'Password must be at least 4 characters long.' };
  }
  if (rawPassword !== confirmPassword) {
    return { ok: false, message: 'Passwords do not match.' };
  }
  if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, message: `The name "${username}" is already taken.` };
  }

  const lookToUse = customLook ? { ...customLook } : { ...DEFAULT_LOOK };

  const newPlayer: PlayerState = {
    username,
    rank: 1,
    role: 'player',
    motto: (motto ?? '').trim().slice(0, 64) || 'New guest at PIXL Hotel!',
    credits: 250,
    duckets: 150,
    hcDays: 3,
    look: lookToUse,
    inventory: [
      { furniId: 'hc_sofa', quantity: 1 },
      { furniId: 'palm_tree', quantity: 1 },
    ],
    redeemedVouchers: [],
    unlockedBadges: ['badge_checkin', 'badge_hc'],
    equippedBadgeId: 'badge_checkin',
    friendIds: ['npc-marco', 'npc-pixie'],
    currentRoomId: 'welcome_lounge',
    pets: [],
    pendingEngravings: {},
  };

  const newAccount: UserAccount = {
    id: nextAccountId(accounts),
    username,
    password: rawPassword,
    rank: 1,
    role: 'player',
    banned: false,
    online: true,
    createdAt: new Date().toISOString().slice(0, 10),
    lastSeen: 'Online now',
    playerState: newPlayer,
  };

  return {
    ok: true,
    message: `Account "${username}" (${newAccount.id}) created! Welcome to PIXL Hotel.`,
    account: newAccount,
    accounts: [...accounts, newAccount],
  };
}

export function syncBadgesWithPlayer(player: PlayerState, extraBadgeId?: string): PlayerState {
  const badges = new Set(player.unlockedBadges);
  badges.add('badge_checkin');

  if (player.hcDays > 0) badges.add('badge_hc');
  if (player.rank === 5 || player.role === 'admin') badges.add('badge_admin');
  if (player.redeemedVouchers.length > 0) badges.add('badge_voucher');
  if (player.inventory.some((i) => i.furniId === 'fire_dragon' && i.quantity > 0)) {
    badges.add('badge_dragon');
  }
  if (player.inventory.some((i) => i.furniId === 'throne' && i.quantity > 0)) {
    badges.add('badge_throne');
  }
  if (extraBadgeId) badges.add(extraBadgeId);

  const nextList = Array.from(badges);
  if (
    nextList.length === player.unlockedBadges.length &&
    nextList.every((b) => player.unlockedBadges.includes(b))
  ) {
    return player;
  }

  return {
    ...player,
    unlockedBadges: nextList,
  };
}

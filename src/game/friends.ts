import { RANK_META } from './accountsDb';
import type {
  HabboNPC,
  PlayerProfileRecord,
  PlayerState,
  StaffMember,
  UserAccount,
} from './types';

export type PlayerDirectoryFilter = 'all' | 'friends' | 'online' | 'staff';

const NPC_LINKED_ACCOUNT_MAP: Record<string, string> = {
  baristamarco: 'npc-marco',
  pixie: 'npc-pixie',
  dj_frank: 'npc-frank',
  'mod-vega': 'npc-vega',
  retronova: 'npc-nova',
};

export function buildHotelPlayerDirectory(
  npcs: HabboNPC[],
  staff: StaffMember[],
  accounts: UserAccount[],
  currentUsername: string
): PlayerProfileRecord[] {
  const seenNames = new Set<string>();
  const profiles: PlayerProfileRecord[] = [];

  // 1. Live registered accounts from accountsDB (excluding current user & banned accounts from public Players view)
  for (const acc of accounts) {
    if (acc.username.toLowerCase() === currentUsername.toLowerCase()) continue;
    if (acc.banned) continue;
    const key = acc.username.toLowerCase();
    seenNames.add(key);

    const meta = RANK_META[acc.rank];
    const linkedNpcId = NPC_LINKED_ACCOUNT_MAP[key];
    const matchingNpc = linkedNpcId ? npcs.find((n) => n.id === linkedNpcId) : undefined;
    const roleBadge =
      acc.rank >= 3 ? meta.badgeCode : acc.rank === 2 ? 'VIP' : acc.playerState.hcDays > 0 ? 'PC' : undefined;

    profiles.push({
      id: linkedNpcId ?? (key === 'krawattenmanni' ? 'staff-krawattenmanni' : `acc-${acc.id}`),
      accountId: acc.id,
      numericUserId: acc.numericId,
      name: acc.username,
      motto: acc.playerState.motto,
      look: acc.playerState.look,
      badges: acc.playerState.unlockedBadges,
      roleBadge,
      roleLabel: meta.shortLabel,
      rank: acc.rank,
      banned: acc.banned,
      online: acc.online,
      roomId: acc.online ? matchingNpc?.roomId ?? acc.playerState.currentRoomId : undefined,
      isStaff: meta.isStaff,
      npcId: matchingNpc?.id,
      respectCount: acc.playerState.respectCount ?? 0,
    });
  }

  // 2. Active NPCs in rooms whose names aren't already represented by accountsDB
  for (const npc of npcs) {
    const key = npc.name.toLowerCase();
    const compactKey = key.replace(/\s+/g, '');
    if (seenNames.has(key) || seenNames.has(compactKey) || profiles.some((p) => p.id === npc.id)) {
      continue;
    }
    seenNames.add(key);
    profiles.push({
      id: npc.id,
      name: npc.name,
      motto: npc.motto,
      look: npc.look,
      badges: npc.badges ?? ['badge_checkin'],
      roleBadge: npc.badge,
      roleLabel:
        npc.role === 'staff'
          ? 'Hotel Moderator'
          : npc.role === 'friend'
          ? 'Hotel Regular'
          : 'Hotel Guest',
      online: true,
      roomId: npc.roomId,
      isStaff: npc.role === 'staff',
      npcId: npc.id,
    });
  }

  // 3. Derived live staff members not already present
  for (const member of staff) {
    const key = member.name.toLowerCase();
    if (key === currentUsername.toLowerCase() || seenNames.has(key)) continue;
    seenNames.add(key);
    profiles.push({
      id: `staff-${member.id}`,
      accountId: member.accountId,
      name: member.name,
      motto: member.motto,
      look: member.look,
      badges: member.badges ?? ['badge_checkin'],
      roleBadge: member.badgeCode,
      roleLabel: member.role,
      online: member.online,
      roomId: member.online ? member.roomId : undefined,
      isStaff: true,
    });
  }

  return profiles;
}

export function isFriend(player: PlayerState, profileId: string): boolean {
  return player.friendIds.includes(profileId);
}

export function toggleFriend(
  player: PlayerState,
  profileId: string
): { action: 'added' | 'removed'; player: PlayerState } {
  if (player.friendIds.includes(profileId)) {
    return {
      action: 'removed',
      player: {
        ...player,
        friendIds: player.friendIds.filter((id) => id !== profileId),
      },
    };
  }

  return {
    action: 'added',
    player: {
      ...player,
      friendIds: [...player.friendIds, profileId],
    },
  };
}

export function filterPlayerDirectory(
  directory: PlayerProfileRecord[],
  query: string,
  filter: PlayerDirectoryFilter,
  friendIds: string[]
): PlayerProfileRecord[] {
  const q = query.trim().toLowerCase();
  const friendSet = new Set(friendIds);

  return directory.filter((p) => {
    if (filter === 'friends' && !friendSet.has(p.id)) return false;
    if (filter === 'online' && !p.online) return false;
    if (filter === 'staff' && !p.isStaff) return false;
    if (q) {
      return (
        p.name.toLowerCase().includes(q) ||
        p.motto.toLowerCase().includes(q) ||
        p.roleLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

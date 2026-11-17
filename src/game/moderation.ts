import type { HabboNPC, PlayerState, RoomDef } from './types';

export interface ModerationLogEntry {
  id: string;
  action: 'kick' | 'ban' | 'unban';
  targetId: string;
  targetName: string;
  roomId: string;
  actorName: string;
  timestamp: number;
}

export interface RoomModerationState {
  kickedByRoom: Record<string, string[]>;
  bannedByRoom: Record<string, string[]>;
  logs: ModerationLogEntry[];
}

export function createInitialModerationState(): RoomModerationState {
  return {
    kickedByRoom: {},
    bannedByRoom: {},
    logs: [],
  };
}

export function isRoomOwnerOrAdmin(room: RoomDef, player: PlayerState): boolean {
  if (player.role === 'admin') return true;
  if (room.id === 'my_room') return true;
  return room.owner.toLowerCase() === player.username.toLowerCase();
}

const ROOM_NPC_ALIAS: Record<string, string> = {
  '1': 'welcome_lounge',
  '2': 'club_mammoth',
  '3': 'battle_banzai',
};

export function getActiveRoomNpcs(
  npcs: HabboNPC[],
  roomId: string,
  modState: RoomModerationState
): HabboNPC[] {
  const kicked = new Set(modState.kickedByRoom[roomId] ?? []);
  const banned = new Set(modState.bannedByRoom[roomId] ?? []);
  const aliasRoomId = ROOM_NPC_ALIAS[roomId];
  return npcs.filter(
    (n) =>
      (n.roomId === roomId || (aliasRoomId && n.roomId === aliasRoomId)) &&
      !kicked.has(n.id) &&
      !banned.has(n.id)
  );
}

export function kickUserFromRoom(
  modState: RoomModerationState,
  roomId: string,
  targetId: string,
  targetName: string,
  actorName: string
): RoomModerationState {
  const existing = modState.kickedByRoom[roomId] ?? [];
  if (existing.includes(targetId)) return modState;

  return {
    ...modState,
    kickedByRoom: {
      ...modState.kickedByRoom,
      [roomId]: [...existing, targetId],
    },
    logs: [
      {
        id: `mod-${Date.now()}-${Math.random()}`,
        action: 'kick',
        targetId,
        targetName,
        roomId,
        actorName,
        timestamp: Date.now(),
      },
      ...modState.logs.slice(0, 19),
    ],
  };
}

export function banUserFromRoom(
  modState: RoomModerationState,
  roomId: string,
  targetId: string,
  targetName: string,
  actorName: string
): RoomModerationState {
  const existingBanned = modState.bannedByRoom[roomId] ?? [];
  if (existingBanned.includes(targetId)) return modState;

  const existingKicked = modState.kickedByRoom[roomId] ?? [];
  return {
    ...modState,
    kickedByRoom: {
      ...modState.kickedByRoom,
      [roomId]: existingKicked.filter((id) => id !== targetId),
    },
    bannedByRoom: {
      ...modState.bannedByRoom,
      [roomId]: [...existingBanned, targetId],
    },
    logs: [
      {
        id: `mod-${Date.now()}-${Math.random()}`,
        action: 'ban',
        targetId,
        targetName,
        roomId,
        actorName,
        timestamp: Date.now(),
      },
      ...modState.logs.slice(0, 19),
    ],
  };
}

export function unbanUserFromRoom(
  modState: RoomModerationState,
  roomId: string,
  targetId: string,
  targetName: string,
  actorName: string
): RoomModerationState {
  const existingBanned = modState.bannedByRoom[roomId] ?? [];
  if (!existingBanned.includes(targetId)) return modState;

  return {
    ...modState,
    bannedByRoom: {
      ...modState.bannedByRoom,
      [roomId]: existingBanned.filter((id) => id !== targetId),
    },
    logs: [
      {
        id: `mod-${Date.now()}-${Math.random()}`,
        action: 'unban',
        targetId,
        targetName,
        roomId,
        actorName,
        timestamp: Date.now(),
      },
      ...modState.logs.slice(0, 19),
    ],
  };
}

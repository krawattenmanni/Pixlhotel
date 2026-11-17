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

const MODEL_TO_NPC_ROOM: Record<string, string> = {
  model_welcome: 'welcome_lounge',
  model_a: 'welcome_lounge',
  model_b: 'club_mammoth',
  model_banzai: 'battle_banzai',
  model_lido: 'the_lido',
  model_rooftop: 'rooftop_pool',
  model_disco: 'chromide_club',
  model_park: 'peaceful_park',
};

export function getActiveRoomNpcs(
  npcs: HabboNPC[],
  roomId: string,
  modState: RoomModerationState,
  modelName?: string
): HabboNPC[] {
  const kicked = new Set(modState.kickedByRoom[roomId] ?? []);
  const banned = new Set(modState.bannedByRoom[roomId] ?? []);
  const aliasRoomId = (modelName && MODEL_TO_NPC_ROOM[modelName]) || ROOM_NPC_ALIAS[roomId];
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

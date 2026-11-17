import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Coffee,
  Coins,
  Crown,
  Disc,
  DoorOpen,
  Gamepad2,
  Hand,
  Heart,
  Home,
  Info,
  Lightbulb,
  Music,
  Package,
  PawPrint,
  Send,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Smile,
  Sparkles,
  Terminal,
  ThumbsUp,
  User,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  banzaiTileKey,
  computeBanzaiScores,
  createInitialBanzaiTiles,
  isBanzaiTile,
  resolveBanzaiMatch,
  stepBanzaiTile,
} from '../../game/banzai';
import {
  CHAT_BUBBLE_STYLES,
  DEFAULT_MOODLIGHT,
  getCarryItemDef,
  parseClientCommand,
  type CarryItemId,
  type ChatBubbleStyle,
  type ChatDeliveryMode,
  type DanceStyleId,
  type MoodlightConfig,
} from '../../game/clientFeatures';
import { findFurniDef, getEquippedBadges } from '../../game/data';
import { computeFurniPlacement } from '../../game/economy';
import {
  canStepBetweenTiles,
  deltaToDirection,
  findPath,
  getSeatAtTile,
  getTileChar,
  getTileHeight,
  gridToScreen,
  isChangingBoothTile,
  isDivingBoardTile,
  isSwimTile,
  isTileWalkable,
  screenToGrid,
  type Point2D,
} from '../../game/isoMath';
import {
  getActiveRoomNpcs,
  isRoomOwnerOrAdmin,
  type RoomModerationState,
} from '../../game/moderation';
import { getPetDef, parsePetChatCommand } from '../../game/pets';
import {
  drawAvatarSign,
  drawBanzaiTileOverlay,
  drawCarryHandItem,
  drawIsoFloorTile,
  drawLidoTileProp,
  drawPoolLaneBuoy,
  drawRoomWallsOrParapets,
  drawRooftopWaterfall,
  getAvatarHeadSprite,
  getAvatarSprite,
  getFurniSprite,
  getPetSprite,
} from '../../game/pixelSprites';
import { habboAudio } from '../../game/habboAudio';
import { supabase } from '../../lib/supabase';
import type {
  AvatarPose,
  BanzaiTeam,
  BanzaiTileState,
  CatalogItemRow,
  CatalogPageRow,
  CustomBadgeDef,
  Direction,
  HabboNPC,
  HotelAlertPayload,
  LookConfig,
  OwnedPet,
  PetAnim,
  PetSpecies,
  PlacedFurni,
  PlayerProfileRecord,
  PlayerState,
  RemotePlayerState,
  RoomAccessMode,
  RoomDef,
  RoomFloorTheme,
  RoomWallTheme,
  SpeechBubble,
  StickyNoteData,
  TradeSlotItem,
} from '../../game/types';
import { BadgeInfoModal } from '../BadgeInfoModal';
import { PixelPetCanvas } from '../PixelSpriteCanvas';
import { AdminToolsPanel } from './AdminToolsPanel';
import { AvatarInfoStand, type InfoStandTarget } from './AvatarInfoStand';
import { CatalogueModal } from './CatalogueModal';
import {
  CommandsAndFurniModal,
  MoodlightModal,
  TraxmachineModal,
} from './ClientExtrasModals';
import { FriendsConsoleModal, type ConsoleMessage } from './FriendsConsoleModal';
import { FurniInfoStand } from './FurniInfoStand';
import { InventoryDock } from './InventoryDock';
import { RoomNavigatorModal } from './RoomNavigatorModal';
import {
  DoorbellPromptModal,
  RoomGateModal,
  RoomSettingsModal,
} from './RoomSettingsModal';
import { TradingModal } from './TradingModal';
import { UserChooserModal, type ChooserUserItem } from './UserChooserModal';
import { WardrobeModal } from './WardrobeModal';

interface HotelClientProps {
  player: PlayerState;
  rooms: RoomDef[];
  roomFurniMap: Record<string, PlacedFurni[]>;
  npcs: HabboNPC[];
  customBadges?: CustomBadgeDef[];
  catalogPages?: CatalogPageRow[];
  catalogItems?: CatalogItemRow[];
  muted: boolean;
  onToggleMute: () => void;
  onBackToCms: () => void;
  onSwitchRoom: (roomId: string) => void;
  onCreateRoom?: (params: {
    caption: string;
    description: string;
    modelName: string;
  }) => Promise<{ ok: boolean; message: string }>;
  onBuyCatalogueItem: (
    furniId: string,
    quantity?: number,
    engravingMessage?: string
  ) => { ok: boolean; message: string };
  onBuyPet: (species: PetSpecies, customName: string) => { ok: boolean; message: string };
  onSummonPetsToRoom: (roomId: string) => void;
  onCarePet: (petId: string, kind: 'feed' | 'play') => void;
  onConfirmTrade: (
    offeredItems: TradeSlotItem[],
    offeredCredits: number,
    receivedItems: TradeSlotItem[],
    receivedCredits: number
  ) => { ok: boolean; message: string };
  onAwardBanzaiReward: (credits: number, duckets: number) => void;
  onPlaceFurni: (
    roomId: string,
    furniId: string,
    x: number,
    y: number,
    dir: Direction
  ) => { ok: boolean; message: string };
  onMoveFurni?: (
    roomId: string,
    uid: string,
    x: number,
    y: number
  ) => { ok: boolean; message: string };
  onRotateFurni: (roomId: string, uid: string) => void;
  onPickupFurni: (roomId: string, uid: string) => void;
  onPickupAllFurni?: (roomId: string) => number;
  onToggleFurniState: (roomId: string, uid: string, nextState: number) => void;
  onUpdateStickyNote?: (roomId: string, uid: string, note: StickyNoteData) => void;
  onUpdateRoomSettings?: (
    roomId: string,
    patch: {
      name: string;
      description: string;
      usersMax: number;
      accessMode: RoomAccessMode;
      accessPassword: string;
      roomRights: string[];
    }
  ) => void;
  onToggleRoomRights?: (roomId: string, targetUsername: string) => boolean;
  onSaveMotto?: (nextMotto: string) => void;
  onSaveLook?: (look: LookConfig) => void;
  onGiveRespect?: (targetUsername: string) => void;
  onRefreshRoomFurni?: (roomId?: string) => void;
  onUnlockBadge?: (badgeId: string) => void;
  onEquipBadge?: (badgeId: string) => void;
  hotelAlert?: HotelAlertPayload | null;
  onDismissHotelAlert?: () => void;
  moderationState: RoomModerationState;
  onKickUser: (roomId: string, npc: HabboNPC) => void;
  onBanUser: (roomId: string, npc: HabboNPC) => void;
  onUnbanUser: (roomId: string, npc: HabboNPC) => void;
  directory: PlayerProfileRecord[];
  onToggleFriend: (profileId: string) => { action: 'added' | 'removed' };
  onFriendAction?: (
    profile: PlayerProfileRecord,
    action: 'send_request' | 'accept_request' | 'decline_request' | 'remove'
  ) => void;
  pmThreads?: Record<string, ConsoleMessage[]>;
  unreadPmCount?: number;
  onClearUnreadPms?: () => void;
  onSendPm?: (targetProfile: PlayerProfileRecord, text: string) => void;
  doorbellQueue?: {
    roomId: string;
    guestName: string;
  }[];
  doorbellOutcome?: { roomId: string; accepted: boolean } | null;
  onClearDoorbellOutcome?: () => void;
  onSendDoorbellRing?: (roomId: string) => void;
  onAnswerDoorbell?: (guestName: string, roomId: string, accepted: boolean) => void;
}

interface SimParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface RemotePlayerSim extends RemotePlayerState {
  path: Point2D[];
  targetPose: AvatarPose;
}

interface PetSimState {
  x: number;
  y: number;
  dir: Direction;
  anim: PetAnim;
  path: Point2D[];
  wanderTimer: number;
  animTimer: number;
}

interface BanzaiBotSim {
  team: 'red' | 'yellow';
  name: string;
  x: number;
  y: number;
  dir: Direction;
  path: Point2D[];
  lastTileKey: string;
  look: LookConfig;
  waitTimer: number;
}

const PARTICLE_POOL_SIZE = 64;
const SWIMWEAR_COLORS = ['#0ea5e9', '#ec4899', '#22c55e', '#f59e0b', '#7c3aed'];

const BANZAI_BOT_RED_LOOK: LookConfig = {
  skinColor: '#f5cfa0',
  hairStyle: 'spiky',
  hairColor: '#3b2416',
  expression: 'cool',
  shirtStyle: 'hoodie',
  shirtColor: '#dc2626',
  pantsColor: '#1e293b',
  shoesColor: '#111827',
  accessory: 'none',
};

const BANZAI_BOT_YELLOW_LOOK: LookConfig = {
  skinColor: '#e0ad7b',
  hairStyle: 'mohawk',
  hairColor: '#1f2937',
  expression: 'cheeky',
  shirtStyle: 'tee',
  shirtColor: '#eab308',
  pantsColor: '#1e293b',
  shoesColor: '#111827',
  accessory: 'sunglasses',
};

function createBanzaiBots(): { red: BanzaiBotSim; yellow: BanzaiBotSim } {
  return {
    red: {
      team: 'red',
      name: 'Red Bot',
      x: 7,
      y: 2,
      dir: 1,
      path: [],
      lastTileKey: '',
      look: BANZAI_BOT_RED_LOOK,
      waitTimer: 0.3,
    },
    yellow: {
      team: 'yellow',
      name: 'Yellow Bot',
      x: 2,
      y: 7,
      dir: 0,
      path: [],
      lastTileKey: '',
      look: BANZAI_BOT_YELLOW_LOOK,
      waitTimer: 0.4,
    },
  };
}

function findAdjacentPoolTarget(room: RoomDef, x: number, y: number): Point2D | null {
  const offsets: [number, number][] = [
    [1, 0],
    [0, 1],
    [2, 0],
    [0, 2],
    [-1, 0],
    [0, -1],
  ];
  for (const [dx, dy] of offsets) {
    if (isSwimTile(room, x + dx, y + dy)) {
      return { x: x + dx, y: y + dy };
    }
  }
  return null;
}

export function HotelClient({
  player,
  rooms,
  roomFurniMap,
  npcs,
  customBadges = [],
  catalogPages,
  catalogItems,
  muted,
  onToggleMute,
  onBackToCms,
  onSwitchRoom,
  onCreateRoom,
  onBuyCatalogueItem,
  onBuyPet,
  onSummonPetsToRoom,
  onCarePet,
  onConfirmTrade,
  onAwardBanzaiReward,
  onPlaceFurni,
  onMoveFurni,
  onRotateFurni,
  onPickupFurni,
  onPickupAllFurni,
  onToggleFurniState,
  onUpdateStickyNote,
  onUpdateRoomSettings,
  onToggleRoomRights,
  onSaveMotto,
  onSaveLook,
  onGiveRespect,
  onRefreshRoomFurni,
  onUnlockBadge,
  onEquipBadge,
  hotelAlert,
  onDismissHotelAlert,
  moderationState,
  onKickUser,
  onBanUser,
  onUnbanUser,
  directory,
  onToggleFriend,
  onFriendAction,
  pmThreads = {},
  unreadPmCount = 0,
  onClearUnreadPms,
  onSendPm,
  doorbellQueue = [],
  doorbellOutcome = null,
  onClearDoorbellOutcome,
  onSendDoorbellRing,
  onAnswerDoorbell,
}: HotelClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roomChannelSubscribedRef = useRef(false);
  const lastPresenceSigRef = useRef('');
  const [remotePlayersCount, setRemotePlayersCount] = useState(0);

  const [chatText, setChatText] = useState('');
  const [chatMode, setChatMode] = useState<ChatDeliveryMode>('say');
  const [bubbleStyle, setBubbleStyle] = useState<ChatBubbleStyle>('classic');

  const [showNavigator, setShowNavigator] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryTab, setInventoryTab] = useState<'furni' | 'badges'>('furni');
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showFriendsConsole, setShowFriendsConsole] = useState(false);
  const [showMoodlightModal, setShowMoodlightModal] = useState(false);
  const [showTraxModal, setShowTraxModal] = useState(false);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [commandsSubTab, setCommandsSubTab] = useState<'commands' | 'furni'>('commands');
  const [showRoomInfoPopover, setShowRoomInfoPopover] = useState(false);
  const [showActionsPopover, setShowActionsPopover] = useState(false);
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);
  const [showUserChooser, setShowUserChooser] = useState(false);
  const [showRoomSettingsModal, setShowRoomSettingsModal] = useState(false);
  const [pendingRoomGate, setPendingRoomGate] = useState<{
    room: RoomDef;
    mode: 'password' | 'doorbell_waiting' | 'doorbell_denied';
  } | null>(null);

  const [placingFurniId, setPlacingFurniId] = useState<string | null>(null);
  const [movingFurniUid, setMovingFurniUid] = useState<string | null>(null);
  const [selectedFurniUid, setSelectedFurniUid] = useState<string | null>(null);

  const [moodlight, setMoodlight] = useState<MoodlightConfig>(DEFAULT_MOODLIGHT);
  const [floorThemeOverride, setFloorThemeOverride] = useState<Record<string, RoomFloorTheme>>({});
  const [wallThemeOverride, setWallThemeOverride] = useState<Record<string, RoomWallTheme>>({});
  const [carryItem, setCarryItem] = useState<CarryItemId>('none');
  const [moonwalk, setMoonwalk] = useState(false);
  const [danceStyle, setDanceStyle] = useState<DanceStyleId>(1);
  const [activeSign, setActiveSign] = useState<string | null>(null);
  const [activeTrax, setActiveTrax] = useState<number | null>(null);
  const [respectLeft, setRespectLeft] = useState(3);
  const [npcRespectBonus, setNpcRespectBonus] = useState<Record<string, number>>({});
  const [roomLikes, setRoomLikes] = useState<Record<string, number>>({
    the_lido: 118,
    welcome_lounge: 42,
    club_mammoth: 68,
    chromide_club: 54,
    peaceful_park: 39,
    battle_banzai: 55,
    my_room: 19,
  });
  const [likedRooms, setLikedRooms] = useState<Record<string, boolean>>({});

  // Interaction Info-Stand & modals
  const [infoTarget, setInfoTarget] = useState<InfoStandTarget | null>(null);
  const [inspectedBadgeId, setInspectedBadgeId] = useState<string | null>(null);
  const [tradingPartner, setTradingPartner] = useState<HabboNPC | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  const [playerPoseUI, setPlayerPoseUI] = useState<AvatarPose>('stand');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Battle Banzai HUD state
  const [banzaiHud, setBanzaiHud] = useState<{
    active: boolean;
    timeLeft: number;
    scores: Record<BanzaiTeam, number>;
    resultSummary: string | null;
  }>({
    active: false,
    timeLeft: 60,
    scores: { blue: 0, red: 0, yellow: 0 },
    resultSummary: null,
  });

  const baseRoom = rooms.find((r) => r.id === player.currentRoomId) ?? rooms[0];
  const currentRoom: RoomDef = {
    ...baseRoom,
    floorTheme: floorThemeOverride[baseRoom.id] ?? baseRoom.floorTheme,
    wallTheme: wallThemeOverride[baseRoom.id] ?? baseRoom.wallTheme,
  };
  const currentFurni = roomFurniMap[currentRoom.id] ?? currentRoom.initialFurni;
  const roomNpcs = getActiveRoomNpcs(npcs, currentRoom.id, moderationState, currentRoom.modelName);
  const roomPets: OwnedPet[] = (player.pets ?? []).filter((p) => p.roomId === currentRoom.id);
  const bannedIds = new Set(moderationState.bannedByRoom[currentRoom.id] ?? []);
  const bannedRoomNpcs = npcs.filter((n) => n.roomId === currentRoom.id && bannedIds.has(n.id));
  const hasRoomRights = (currentRoom.roomRights ?? []).some(
    (u) => u.toLowerCase() === player.username.toLowerCase()
  );
  const canEditRoom =
    currentRoom.owner.toLowerCase() === player.username.toLowerCase() ||
    currentRoom.id === 'my_room' ||
    hasRoomRights ||
    player.role === 'admin' ||
    player.rank >= 4;
  const isBanzaiRoom =
    currentRoom.modelName === 'model_banzai' ||
    currentRoom.id === 'battle_banzai' ||
    currentRoom.numericId === 3;
  const isLidoRoom =
    currentRoom.modelName === 'model_lido' ||
    currentRoom.id === 'the_lido' ||
    currentRoom.floorTheme === 'lido_deck';
  const canModerateRoom =
    isRoomOwnerOrAdmin(currentRoom, player) ||
    currentRoom.owner.toLowerCase() === player.username.toLowerCase();

  // Enable habboAudio only while HotelClient is mounted
  useEffect(() => {
    habboAudio.setInGame(true);
    habboAudio.playEnterHotel();
    return () => {
      habboAudio.setInGame(false);
    };
  }, []);

  useEffect(() => {
    if (muted && activeTrax !== null) {
      setActiveTrax(null);
    }
  }, [muted, activeTrax]);

  // 60-second carry hand item timer
  useEffect(() => {
    if (carryItem === 'none') return;
    const timer = window.setTimeout(() => {
      setCarryItem('none');
      setStatusToast('Finished your hand item.');
      window.setTimeout(() => setStatusToast((prev) => (prev === 'Finished your hand item.' ? null : prev)), 2500);
    }, 60_000);
    return () => window.clearTimeout(timer);
  }, [carryItem]);

  // 5-second :sign clear timer
  useEffect(() => {
    if (!activeSign) return;
    const timer = window.setTimeout(() => {
      setActiveSign(null);
    }, 5_000);
    return () => window.clearTimeout(timer);
  }, [activeSign]);

  // Doorbell answer outcome listener
  useEffect(() => {
    if (!doorbellOutcome) return;
    if (pendingRoomGate && pendingRoomGate.room.id === doorbellOutcome.roomId) {
      if (doorbellOutcome.accepted) {
        habboAudio.playEnterHotel();
        setPendingRoomGate(null);
        onSwitchRoom(doorbellOutcome.roomId);
      } else {
        habboAudio.playError();
        setPendingRoomGate({ room: pendingRoomGate.room, mode: 'doorbell_denied' });
      }
    }
    onClearDoorbellOutcome?.();
  }, [doorbellOutcome, onClearDoorbellOutcome, onSwitchRoom, pendingRoomGate]);

  // Mutable simulation state decoupled from React renders
  const simRef = useRef({
    roomId: currentRoom.id,
    px: currentRoom.spawn.x,
    py: currentRoom.spawn.y,
    dir: 0 as Direction,
    pose: 'stand' as AvatarPose,
    path: [] as Point2D[],
    stepTimer: 0,
    waveTimer: 0,
    animTick: 0,
    animAccum: 0,
    hoverTile: null as Point2D | null,
    bubbles: [] as SpeechBubble[],
    keysHeld: new Set<string>(),
    keyStepCooldown: 0,
    swimwearActive: false,
    swimwearColor: SWIMWEAR_COLORS[0],
    swimwearColorIndex: 0,
    diveJump: null as null | {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      progress: number;
    },
    petSims: {} as Record<string, PetSimState>,
    remotePlayers: {} as Record<string, RemotePlayerSim>,
    particles: Array.from({ length: PARTICLE_POOL_SIZE }, (): SimParticle => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      color: '#facc15',
      size: 3,
    })),
    particleCursor: 0,
    npcChatterTimer: 4,
    userZoom: 1,
    panOffset: { x: 0, y: 0 },
    dragStart: null as null | {
      x: number;
      y: number;
      startPanX: number;
      startPanY: number;
      moved: boolean;
    },
    justDragged: false,
  });

  const banzaiRef = useRef({
    active: false,
    timeLeft: 60,
    tiles: createInitialBanzaiTiles() as Record<string, BanzaiTileState>,
    lastPlayerTileKey: '',
    hudSyncAccum: 0,
    bots: createBanzaiBots(),
  });

  // Keep latest props & callbacks accessible inside rAF loop without re-mounting canvas
  const latestRef = useRef({
    player,
    currentRoom,
    currentFurni,
    roomNpcs,
    roomPets,
    placingFurniId,
    movingFurniUid,
    showInventory,
    canEditRoom,
    moodlight,
    carryItem,
    moonwalk,
    danceStyle,
    activeSign,
    onAwardBanzaiReward,
    onRefreshRoomFurni,
    onUnlockBadge,
  });
  latestRef.current = {
    player,
    currentRoom,
    currentFurni,
    roomNpcs,
    roomPets,
    placingFurniId,
    movingFurniUid,
    showInventory,
    canEditRoom,
    moodlight,
    carryItem,
    moonwalk,
    danceStyle,
    activeSign,
    onAwardBanzaiReward,
    onRefreshRoomFurni,
    onUnlockBadge,
  };

  const getClientCamera = useCallback((vw: number, vh: number, roomOverride?: RoomDef) => {
    const room = roomOverride ?? latestRef.current.currentRoom;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        if (room.layout[y][x] === 'x') continue;
        const sx = (x - y) * 32;
        const sy = (x + y) * 16 - getTileHeight(room, x, y) * 16;
        minX = Math.min(minX, sx - 32);
        maxX = Math.max(maxX, sx + 32);
        minY = Math.min(minY, sy - (room.outdoor ? 44 : 110));
        maxY = Math.max(maxY, sy + 52);
      }
    }
    if (!Number.isFinite(minX)) {
      minX = -200;
      maxX = 200;
      minY = -80;
      maxY = 240;
    }
    const contentW = Math.max(240, maxX - minX + 24);
    const contentH = Math.max(200, maxY - minY + 40);
    const fitZoom = Math.min(
      vw < 640 ? 0.92 : 1.18,
      Math.max(0.48, (vw - 16) / contentW),
      Math.max(0.48, (vh - 108) / contentH)
    );
    const sim = simRef.current;
    const zoom = fitZoom * sim.userZoom;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return {
      zoom,
      originX: Math.round(vw / (2 * zoom) - cx + sim.panOffset.x / zoom),
      originY: Math.round((vh - 10) / (2 * zoom) - cy + sim.panOffset.y / zoom),
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast((prev) => (prev === msg ? null : prev)), 2800);
  }, []);

  const requestSwitchRoom = useCallback(
    (roomId: string) => {
      const target = rooms.find((r) => r.id === roomId);
      if (!target) {
        onSwitchRoom(roomId);
        return;
      }
      const isBypass =
        target.owner.toLowerCase() === player.username.toLowerCase() ||
        player.rank >= 4 ||
        player.role === 'admin' ||
        (target.roomRights ?? []).some((u) => u.toLowerCase() === player.username.toLowerCase());
      if (!isBypass && target.accessMode === 'password') {
        habboAudio.playWindowToggle(true);
        setPendingRoomGate({ room: target, mode: 'password' });
        return;
      }
      if (!isBypass && target.accessMode === 'doorbell') {
        habboAudio.playUiClick();
        onSendDoorbellRing?.(target.id);
        setPendingRoomGate({ room: target, mode: 'doorbell_waiting' });
        return;
      }
      habboAudio.playEnterHotel();
      onSwitchRoom(roomId);
    },
    [onSendDoorbellRing, onSwitchRoom, player.rank, player.role, player.username, rooms]
  );

  const spawnParticles = useCallback((sx: number, sy: number, color: string, count = 8) => {
    const sim = simRef.current;
    for (let i = 0; i < count; i++) {
      const p = sim.particles[sim.particleCursor];
      sim.particleCursor = (sim.particleCursor + 1) % PARTICLE_POOL_SIZE;
      p.active = true;
      p.x = sx + (Math.random() - 0.5) * 14;
      p.y = sy + (Math.random() - 0.5) * 8;
      p.vx = (Math.random() - 0.5) * 28;
      p.vy = -25 - Math.random() * 35;
      p.life = 0;
      p.maxLife = 0.45 + Math.random() * 0.35;
      p.color = color;
      p.size = 2 + Math.floor(Math.random() * 2);
    }
  }, []);

  const pushBubble = useCallback(
    (
      senderId: string,
      senderName: string,
      look: LookConfig,
      text: string,
      opts?: { mode?: ChatDeliveryMode; bubbleStyle?: ChatBubbleStyle }
    ) => {
      const clean = text.trim();
      if (!clean) return;
      const bubble: SpeechBubble = {
        id: `${senderId}-${Date.now()}-${Math.random()}`,
        senderId,
        senderName,
        look,
        text: clean.slice(0, 96),
        timestamp: Date.now(),
        mode: opts?.mode ?? 'say',
        isWhisper: opts?.mode === 'whisper',
        bubbleStyle: opts?.bubbleStyle ?? 'classic',
      };
      simRef.current.bubbles = [...simRef.current.bubbles.slice(-7), bubble];
      habboAudio.playChatPop(opts?.mode ?? 'say');
    },
    []
  );

  const buildLocalPresenceSnapshot = useCallback(
    (overrides?: {
      targetX?: number;
      targetY?: number;
      pose?: AvatarPose;
      danceStyle?: DanceStyleId;
      activeSign?: string | null;
      carryItem?: CarryItemId;
      moonwalk?: boolean;
      swimming?: boolean;
      swimwearColor?: string;
      dir?: Direction;
    }): RemotePlayerState => {
      const sim = simRef.current;
      const curX = Math.round(sim.px);
      const curY = Math.round(sim.py);
      const pBadge =
        player.rank >= 5
          ? 'ADM'
          : player.rank === 4
          ? 'MOD'
          : player.rank === 3
          ? 'EVT'
          : player.hcDays > 0
          ? 'HC'
          : undefined;
      const swimmingNow =
        overrides?.swimming ??
        (isSwimTile(latestRef.current.currentRoom, curX, curY) || sim.swimwearActive);
      return {
        sessionId: sessionIdRef.current,
        username: player.username,
        motto: player.motto,
        look: player.look,
        x: curX,
        y: curY,
        targetX: overrides?.targetX ?? curX,
        targetY: overrides?.targetY ?? curY,
        dir: overrides?.dir ?? sim.dir,
        pose: overrides?.pose ?? sim.pose,
        danceStyle: overrides?.danceStyle ?? danceStyle,
        activeSign: overrides?.activeSign !== undefined ? overrides.activeSign : activeSign,
        carryItem: overrides?.carryItem ?? carryItem,
        moonwalk: overrides?.moonwalk ?? moonwalk,
        swimming: swimmingNow,
        swimwearColor: overrides?.swimwearColor ?? sim.swimwearColor,
        badge: pBadge,
        badges: player.unlockedBadges,
        rank: player.rank,
        respectCount: player.respectCount ?? 0,
        updatedAt: Date.now(),
      };
    },
    [activeSign, carryItem, danceStyle, moonwalk, player]
  );

  const broadcastAvatarMove = useCallback(
    (overrides?: {
      targetX?: number;
      targetY?: number;
      pose?: AvatarPose;
      danceStyle?: DanceStyleId;
      activeSign?: string | null;
      carryItem?: CarryItemId;
      moonwalk?: boolean;
      swimming?: boolean;
      swimwearColor?: string;
      dir?: Direction;
    }) => {
      const ch = roomChannelRef.current;
      if (!ch || !roomChannelSubscribedRef.current) return;
      const snapshot = buildLocalPresenceSnapshot(overrides);
      ch.send({ type: 'broadcast', event: 'avatar:move', payload: snapshot }).catch(() => {});
      ch.track(snapshot).catch(() => {});
    },
    [buildLocalPresenceSnapshot]
  );

  const broadcastChatMessage = useCallback(
    (text: string, opts?: { mode?: ChatDeliveryMode; bubbleStyle?: ChatBubbleStyle }) => {
      const ch = roomChannelRef.current;
      if (!ch || !roomChannelSubscribedRef.current) return;
      ch.send({
        type: 'broadcast',
        event: 'avatar:chat',
        payload: {
          sessionId: sessionIdRef.current,
          username: player.username,
          look: player.look,
          text,
          mode: opts?.mode ?? 'say',
          bubbleStyle: opts?.bubbleStyle ?? 'classic',
        },
      }).catch(() => {});
    },
    [player.look, player.username]
  );

  // Supabase Realtime Multiplayer Presence & Broadcast per Room
  useEffect(() => {
    const roomId = currentRoom.id;
    const mySessionId = sessionIdRef.current;
    simRef.current.remotePlayers = {};
    setRemotePlayersCount(0);
    roomChannelSubscribedRef.current = false;

    const channel = supabase.channel(`pixl-room:${roomId}`, {
      config: {
        presence: { key: mySessionId },
        broadcast: { self: false },
      },
    });

    const syncPresenceMap = () => {
      const state = channel.presenceState<RemotePlayerState>();
      const existing = simRef.current.remotePlayers;
      const nextMap: Record<string, RemotePlayerSim> = {};

      for (const [key, presences] of Object.entries(state)) {
        if (key === mySessionId || !Array.isArray(presences) || presences.length === 0) continue;
        const p = presences[presences.length - 1];
        if (!p || p.sessionId === mySessionId) continue;

        const prev = existing[p.sessionId];
        if (prev) {
          nextMap[p.sessionId] = {
            ...prev,
            username: p.username,
            motto: p.motto,
            look: p.look,
            danceStyle: p.danceStyle,
            activeSign: p.activeSign,
            swimming: p.swimming,
            swimwearColor: p.swimwearColor,
            badge: p.badge,
            badges: p.badges,
            rank: p.rank,
            respectCount: p.respectCount,
          };
        } else {
          const roomDef = latestRef.current.currentRoom;
          const furniList = latestRef.current.currentFurni;
          const initPath =
            p.targetX !== p.x || p.targetY !== p.y
              ? findPath(roomDef, furniList, p.x, p.y, p.targetX, p.targetY)
              : [];
          nextMap[p.sessionId] = {
            ...p,
            path: initPath,
            targetPose: p.pose,
          };
        }
      }

      simRef.current.remotePlayers = nextMap;
      setRemotePlayersCount(Object.keys(nextMap).length);
    };

    channel
      .on('presence', { event: 'sync' }, syncPresenceMap)
      .on('presence', { event: 'join' }, syncPresenceMap)
      .on('presence', { event: 'leave' }, syncPresenceMap)
      .on('broadcast', { event: 'avatar:move' }, ({ payload }) => {
        const p = payload as RemotePlayerState | null;
        if (!p || !p.sessionId || p.sessionId === mySessionId) return;

        const existing = simRef.current.remotePlayers[p.sessionId];
        const roomDef = latestRef.current.currentRoom;
        const furniList = latestRef.current.currentFurni;

        if (!existing) {
          const path =
            p.targetX !== p.x || p.targetY !== p.y
              ? findPath(roomDef, furniList, p.x, p.y, p.targetX, p.targetY)
              : [];
          simRef.current.remotePlayers[p.sessionId] = {
            ...p,
            path,
            targetPose: p.pose,
          };
          setRemotePlayersCount(Object.keys(simRef.current.remotePlayers).length);
          return;
        }

        const curTileX = Math.round(existing.x);
        const curTileY = Math.round(existing.y);
        let nextPath = existing.path;
        if (p.targetX !== curTileX || p.targetY !== curTileY) {
          const computed = findPath(roomDef, furniList, curTileX, curTileY, p.targetX, p.targetY);
          if (computed.length > 0) {
            nextPath = computed;
          } else {
            existing.x = p.targetX;
            existing.y = p.targetY;
            nextPath = [];
          }
        } else {
          nextPath = [];
        }

        simRef.current.remotePlayers[p.sessionId] = {
          ...existing,
          username: p.username,
          motto: p.motto,
          look: p.look,
          targetX: p.targetX,
          targetY: p.targetY,
          dir: p.dir,
          pose: nextPath.length > 0 ? 'walk' : p.pose,
          targetPose: p.pose,
          danceStyle: p.danceStyle,
          activeSign: p.activeSign,
          carryItem: p.carryItem,
          moonwalk: p.moonwalk,
          swimming: p.swimming,
          swimwearColor: p.swimwearColor,
          badge: p.badge,
          badges: p.badges,
          rank: p.rank,
          respectCount: p.respectCount,
          updatedAt: p.updatedAt,
          path: nextPath,
        };
      })
      .on('broadcast', { event: 'room:kick' }, ({ payload }) => {
        const msg = payload as { targetUsername?: string; kickedBy?: string } | null;
        if (
          msg?.targetUsername &&
          msg.targetUsername.toLowerCase() === latestRef.current.player.username.toLowerCase()
        ) {
          habboAudio.playError();
          showToast(`You were kicked from the room by ${msg.kickedBy || 'Room Owner'}.`);
          onSwitchRoom('welcome_lounge');
        }
      })
      .on('broadcast', { event: 'avatar:chat' }, ({ payload }) => {
        const chat = payload as {
          sessionId?: string;
          username?: string;
          look?: LookConfig;
          text?: string;
          mode?: ChatDeliveryMode;
          bubbleStyle?: ChatBubbleStyle;
        } | null;
        if (!chat || !chat.sessionId || chat.sessionId === mySessionId || !chat.text) return;
        pushBubble(
          chat.sessionId,
          chat.username || 'Guest',
          chat.look || latestRef.current.player.look,
          chat.text,
          { mode: chat.mode ?? 'say', bubbleStyle: chat.bubbleStyle ?? 'classic' }
        );
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          roomChannelSubscribedRef.current = true;
          const snap = buildLocalPresenceSnapshot();
          lastPresenceSigRef.current = JSON.stringify({
            look: snap.look,
            motto: snap.motto,
            carryItem: snap.carryItem,
            moonwalk: snap.moonwalk,
            danceStyle: snap.danceStyle,
            activeSign: snap.activeSign,
          });
          channel
            .track(snap)
            .then(() => {
              syncPresenceMap();
            })
            .catch(() => {});
          latestRef.current.onRefreshRoomFurni?.(roomId);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          roomChannelSubscribedRef.current = false;
        }
      });

    roomChannelRef.current = channel;

    return () => {
      roomChannelSubscribedRef.current = false;
      roomChannelRef.current = null;
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [currentRoom.id, onSwitchRoom, pushBubble, showToast]);

  // Re-broadcast presence whenever local look, motto, carryItem, moonwalk, danceStyle, or activeSign changes
  useEffect(() => {
    if (!roomChannelRef.current || !roomChannelSubscribedRef.current) return;
    const sig = JSON.stringify({
      look: player.look,
      motto: player.motto,
      carryItem,
      moonwalk,
      danceStyle,
      activeSign,
    });
    if (sig === lastPresenceSigRef.current) return;
    lastPresenceSigRef.current = sig;
    broadcastAvatarMove();
  }, [player.look, player.motto, carryItem, moonwalk, danceStyle, activeSign, broadcastAvatarMove]);

  const handleSelectTrax = useCallback(
    (trackIndex: number | null) => {
      const nextTrack = habboAudio.toggleTraxMusic(trackIndex);
      setActiveTrax(nextTrack);
      if (nextTrack === null) {
        showToast('Traxmachine stopped.');
      } else {
        onUnlockBadge?.('badge_dj');
        showToast(`Traxmachine spinning Track #${nextTrack + 1}!`);
      }
    },
    [onUnlockBadge, showToast]
  );

  const handleStartBanzaiMatch = useCallback(() => {
    habboAudio.playEnterHotel();
    const freshTiles = createInitialBanzaiTiles();
    banzaiRef.current = {
      active: true,
      timeLeft: 60,
      tiles: freshTiles,
      lastPlayerTileKey: '',
      hudSyncAccum: 0,
      bots: createBanzaiBots(),
    };
    setBanzaiHud({
      active: true,
      timeLeft: 60,
      scores: { blue: 0, red: 0, yellow: 0 },
      resultSummary: null,
    });
    showToast('Battle Banzai started! Step on tiles 3 times to lock them Blue!');
  }, [showToast]);

  // Reset player position when switching rooms
  useEffect(() => {
    const sim = simRef.current;
    if (sim.roomId !== currentRoom.id) {
      sim.roomId = currentRoom.id;
      sim.px = currentRoom.spawn.x;
      sim.py = currentRoom.spawn.y;
      sim.dir = 0;
      sim.pose = 'stand';
      sim.path = [];
      sim.bubbles = [];
      sim.diveJump = null;
      sim.swimwearActive = false;
      sim.userZoom = 1;
      sim.panOffset = { x: 0, y: 0 };
      sim.dragStart = null;
      sim.justDragged = false;
      setPlayerPoseUI('stand');
      setPlacingFurniId(null);
      setMovingFurniUid(null);
      setSelectedFurniUid(null);
      setInfoTarget(null);
      setSelectedPetId(null);
      setShowRoomInfoPopover(false);
      setShowActionsPopover(false);
      setShowUserChooser(false);
      setShowRoomSettingsModal(false);

      banzaiRef.current = {
        active: false,
        timeLeft: 60,
        tiles: createInitialBanzaiTiles(),
        lastPlayerTileKey: '',
        hudSyncAccum: 0,
        bots: createBanzaiBots(),
      };
      setBanzaiHud({
        active: false,
        timeLeft: 60,
        scores: { blue: 0, red: 0, yellow: 0 },
        resultSummary: null,
      });

      const greeter = roomNpcs[0];
      if (greeter) {
        setTimeout(() => {
          if (simRef.current.roomId === currentRoom.id) {
            pushBubble(greeter.id, greeter.name, greeter.look, greeter.chatLines[0]);
          }
        }, 450);
      }
    }
  }, [currentRoom, roomNpcs, pushBubble]);

  // Initial room welcome greeting on mount
  useEffect(() => {
    const greeter = latestRef.current.roomNpcs[0];
    if (greeter) {
      const timer = setTimeout(() => {
        pushBubble(greeter.id, greeter.name, greeter.look, greeter.chatLines[0]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pushBubble]);

  // Keyboard listener (WASD / Arrows + focus loss release)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        setShowCatalogue(false);
        setShowNavigator(false);
        setShowFriendsConsole(false);
        setShowMoodlightModal(false);
        setShowTraxModal(false);
        setShowCommandsModal(false);
        setShowWardrobeModal(false);
        setShowUserChooser(false);
        setShowRoomSettingsModal(false);
        setTradingPartner(null);
        setPlacingFurniId(null);
        setMovingFurniUid(null);
        setSelectedFurniUid(null);
        setInfoTarget(null);
        setSelectedPetId(null);
        setInspectedBadgeId(null);
        return;
      }

      if (!isTyping && e.key === 'Enter') {
        e.preventDefault();
        chatInputRef.current?.focus();
        return;
      }

      if (!isTyping) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
          e.preventDefault();
          simRef.current.keysHeld.add(e.key);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.keysHeld.delete(e.key);
    };

    const clearKeys = () => {
      simRef.current.keysHeld.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', clearKeys);
    };
  }, []);

  // Main 60fps Canvas Loop (mounted once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const nextW = Math.max(1, Math.floor(rect.width * dpr));
      const nextH = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const sim = simRef.current;
      const {
        player: pState,
        currentRoom: room,
        currentFurni: furni,
        roomNpcs: npcsInRoom,
        roomPets: petsInRoom,
        placingFurniId: placingId,
        movingFurniUid: movingUid,
        moodlight: moodCfg,
        carryItem: heldItem,
        moonwalk: isMoonwalk,
        danceStyle: pDanceStyle,
        activeSign: pActiveSign,
      } = latestRef.current;

      const rect = canvas.getBoundingClientRect();
      const vw = rect.width;
      const vh = rect.height;
      const { zoom, originX, originY } = getClientCamera(vw, vh, room);

      // Update animation tick (~6 fps sprite cycles)
      sim.animAccum += dt;
      if (sim.animAccum >= 0.16) {
        sim.animAccum -= 0.16;
        sim.animTick = (sim.animTick + 1) % 60;
      }

      // Wave timer auto-ends
      if (sim.pose === 'wave') {
        sim.waveTimer -= dt;
        if (sim.waveTimer <= 0) {
          sim.pose = 'stand';
          setPlayerPoseUI('stand');
        }
      }

      // Handle Lido Diving Board parabolic jump arc!
      if (sim.diveJump) {
        sim.diveJump.progress = Math.min(1, sim.diveJump.progress + dt / 0.65);
        const t = sim.diveJump.progress;
        sim.px = sim.diveJump.startX + (sim.diveJump.endX - sim.diveJump.startX) * t;
        sim.py = sim.diveJump.startY + (sim.diveJump.endY - sim.diveJump.startY) * t;
        if (t >= 1) {
          const ex = sim.diveJump.endX;
          const ey = sim.diveJump.endY;
          sim.diveJump = null;
          sim.px = ex;
          sim.py = ey;
          sim.pose = 'stand';
          sim.swimwearActive = true;
          setPlayerPoseUI('stand');
          habboAudio.playDiveSplash();
          const tz = getTileHeight(room, ex, ey);
          const splashPos = gridToScreen(ex, ey, originX, originY, tz);
          spawnParticles(splashPos.x, splashPos.y + 8, '#7dd3fc', 16);
          spawnParticles(splashPos.x, splashPos.y + 4, '#ffffff', 10);
          latestRef.current.onUnlockBadge?.('badge_lido');
          showToast('SPLASH! Awesome dive into The Lido Pool!');
          broadcastAvatarMove({
            targetX: ex,
            targetY: ey,
            pose: 'stand',
            swimming: true,
            swimwearColor: sim.swimwearColor,
          });
        }
      }

      // Keyboard step movement
      sim.keyStepCooldown = Math.max(0, sim.keyStepCooldown - dt);
      if (!sim.diveJump && sim.path.length === 0 && sim.keyStepCooldown <= 0 && sim.keysHeld.size > 0) {
        let dx = 0;
        let dy = 0;
        if (sim.keysHeld.has('ArrowUp') || sim.keysHeld.has('w')) dy -= 1;
        if (sim.keysHeld.has('ArrowDown') || sim.keysHeld.has('s')) dy += 1;
        if (sim.keysHeld.has('ArrowLeft') || sim.keysHeld.has('a')) dx -= 1;
        if (sim.keysHeld.has('ArrowRight') || sim.keysHeld.has('d')) dx += 1;
        if (dx !== 0 || dy !== 0) {
          const curX = Math.round(sim.px);
          const curY = Math.round(sim.py);
          const tx = curX + dx;
          const ty = curY + dy;
          if (
            isTileWalkable(room, furni, tx, ty, true) &&
            canStepBetweenTiles(room, curX, curY, tx, ty)
          ) {
            sim.path = [{ x: tx, y: ty }];
            sim.keyStepCooldown = 0.18;
            broadcastAvatarMove({ targetX: tx, targetY: ty, pose: 'walk' });
          }
        }
      }

      // Advance player along A* path
      if (!sim.diveJump && sim.path.length > 0) {
        const target = sim.path[0];
        const dx = target.x - sim.px;
        const dy = target.y - sim.py;
        const dist = Math.hypot(dx, dy);
        const speed = 3.6;

        const naturalDir = deltaToDirection(dx, dy, sim.dir);
        sim.dir = isMoonwalk ? (((naturalDir + 2) % 4) as Direction) : naturalDir;
        if (sim.pose !== 'walk') {
          sim.pose = 'walk';
          setPlayerPoseUI('walk');
        }

        sim.stepTimer += dt;
        if (sim.stepTimer >= 0.26) {
          sim.stepTimer = 0;
          if (isSwimTile(room, Math.round(sim.px), Math.round(sim.py))) {
            habboAudio.playWaterStep();
          } else {
            habboAudio.playStep();
          }
        }

        const moveDist = speed * dt;
        if (dist <= moveDist) {
          sim.px = target.x;
          sim.py = target.y;
          sim.path.shift();
          if (sim.path.length === 0) {
            const arrX = Math.round(sim.px);
            const arrY = Math.round(sim.py);
            const seat = getSeatAtTile(furni, arrX, arrY);
            const arrChar = getTileChar(room, arrX, arrY);

            if (isChangingBoothTile(room, arrX, arrY)) {
              sim.swimwearColorIndex = (sim.swimwearColorIndex + 1) % SWIMWEAR_COLORS.length;
              sim.swimwearColor = SWIMWEAR_COLORS[sim.swimwearColorIndex];
              sim.swimwearActive = true;
              sim.pose = 'stand';
              setPlayerPoseUI('stand');
              habboAudio.playCoinsPurchase();
              const boothPt = gridToScreen(arrX, arrY, originX, originY, getTileHeight(room, arrX, arrY));
              spawnParticles(boothPt.x, boothPt.y - 8, '#facc15', 12);
              showToast('Changed into Lido swimwear! Step onto the Diving Board or Pool!');
              broadcastAvatarMove({
                targetX: arrX,
                targetY: arrY,
                pose: 'stand',
                swimming: true,
                swimwearColor: sim.swimwearColor,
              });
            } else if (isDivingBoardTile(room, arrX, arrY)) {
              const poolTarget = findAdjacentPoolTarget(room, arrX, arrY);
              if (poolTarget) {
                sim.swimwearActive = true;
                sim.dir = deltaToDirection(poolTarget.x - arrX, poolTarget.y - arrY, 0);
                sim.diveJump = {
                  startX: arrX,
                  startY: arrY,
                  endX: poolTarget.x,
                  endY: poolTarget.y,
                  progress: 0,
                };
                habboAudio.playUiClick();
              }
            } else if (arrChar === 'w') {
              sim.swimwearActive = true;
              sim.pose = 'stand';
              setPlayerPoseUI('stand');
              habboAudio.playDiveSplash();
              const poolPt = gridToScreen(arrX, arrY, originX, originY, getTileHeight(room, arrX, arrY));
              spawnParticles(poolPt.x, poolPt.y + 8, '#7dd3fc', 10);
              latestRef.current.onUnlockBadge?.('badge_lido');
              broadcastAvatarMove({
                targetX: arrX,
                targetY: arrY,
                pose: 'stand',
                swimming: true,
                swimwearColor: sim.swimwearColor,
              });
            } else if (seat) {
              sim.pose = 'sit';
              sim.dir = seat.dir;
              setPlayerPoseUI('sit');
              broadcastAvatarMove({ targetX: arrX, targetY: arrY, pose: 'sit', dir: seat.dir });
            } else {
              sim.pose = 'stand';
              setPlayerPoseUI('stand');
              broadcastAvatarMove({ targetX: arrX, targetY: arrY, pose: 'stand' });
            }
          }
        } else {
          sim.px += (dx / dist) * moveDist;
          sim.py += (dy / dist) * moveDist;
        }
      }

      // Smoothly advance remote multiplayer players along their paths
      for (const rp of Object.values(sim.remotePlayers)) {
        if (rp.path.length > 0) {
          const target = rp.path[0];
          const dx = target.x - rp.x;
          const dy = target.y - rp.y;
          const dist = Math.hypot(dx, dy);
          const speed = 3.6;
          const naturalDir = deltaToDirection(dx, dy, rp.dir);
          rp.dir = rp.moonwalk ? (((naturalDir + 2) % 4) as Direction) : naturalDir;
          rp.pose = 'walk';
          const moveDist = speed * dt;
          if (dist <= moveDist) {
            rp.x = target.x;
            rp.y = target.y;
            rp.path.shift();
            if (rp.path.length === 0) {
              const seat = getSeatAtTile(furni, Math.round(rp.x), Math.round(rp.y));
              if (seat) {
                rp.pose = 'sit';
                rp.dir = seat.dir;
              } else {
                rp.pose = rp.targetPose === 'walk' ? 'stand' : rp.targetPose;
              }
            }
          } else {
            rp.x += (dx / dist) * moveDist;
            rp.y += (dy / dist) * moveDist;
          }
        }
      }

      // Autonomous A* roaming & trick animation for owned pets in room
      for (const pet of petsInRoom) {
        let ps = sim.petSims[pet.id];
        if (!ps) {
          ps = {
            x: pet.x,
            y: pet.y,
            dir: pet.dir,
            anim: pet.anim,
            path: [],
            wanderTimer: 1.8 + Math.random() * 2,
            animTimer: 0,
          };
          sim.petSims[pet.id] = ps;
        }

        if (ps.animTimer > 0) {
          ps.animTimer -= dt;
          if (ps.animTimer <= 0) {
            ps.anim = 'stand';
          }
        }

        if (ps.path.length > 0) {
          const target = ps.path[0];
          const dx = target.x - ps.x;
          const dy = target.y - ps.y;
          const dist = Math.hypot(dx, dy);
          const petSpeed = 2.3;
          ps.dir = deltaToDirection(dx, dy, ps.dir);
          ps.anim = 'walk';

          const moveDist = petSpeed * dt;
          if (dist <= moveDist) {
            ps.x = target.x;
            ps.y = target.y;
            ps.path.shift();
            if (ps.path.length === 0) {
              ps.anim = 'stand';
              ps.wanderTimer = 2.5 + Math.random() * 3.5;
            }
          } else {
            ps.x += (dx / dist) * moveDist;
            ps.y += (dy / dist) * moveDist;
          }
        } else if (ps.anim === 'stand') {
          ps.wanderTimer -= dt;
          if (ps.wanderTimer <= 0) {
            const candidates: Point2D[] = [];
            for (let ty = 1; ty < room.layout.length - 1; ty++) {
              for (let tx = 1; tx < room.layout[ty].length - 1; tx++) {
                if (isTileWalkable(room, furni, tx, ty, false) && !isSwimTile(room, tx, ty)) {
                  candidates.push({ x: tx, y: ty });
                }
              }
            }
            if (candidates.length > 0) {
              const goal = candidates[Math.floor(Math.random() * candidates.length)];
              const path = findPath(room, furni, Math.round(ps.x), Math.round(ps.y), goal.x, goal.y);
              if (path.length > 0 && path.length <= 10) {
                ps.path = path;
              } else {
                ps.wanderTimer = 2.0;
              }
            } else {
              ps.wanderTimer = 3.0;
            }
          }
        }
      }

      // Battle Banzai Arena simulation (when in model_banzai & match active)
      const bz = banzaiRef.current;
      const roomIsBanzai =
        room.modelName === 'model_banzai' || room.id === 'battle_banzai' || room.numericId === 3;
      if (roomIsBanzai && bz.active) {
        bz.timeLeft = Math.max(0, bz.timeLeft - dt);

        const ptx = Math.round(sim.px);
        const pty = Math.round(sim.py);
        const pKey = `${ptx},${pty}`;
        if (pKey !== bz.lastPlayerTileKey) {
          bz.lastPlayerTileKey = pKey;
          if (isBanzaiTile(ptx, pty)) {
            const step = stepBanzaiTile(bz.tiles, ptx, pty, 'blue');
            if (step.changed) {
              bz.tiles = step.tiles;
              const pt = gridToScreen(ptx, pty, originX, originY, getTileHeight(room, ptx, pty));
              spawnParticles(pt.x, pt.y + 8, step.justLocked ? '#60a5fa' : '#93c5fd', step.justLocked ? 12 : 5);
              if (step.justLocked) habboAudio.playCoinsPurchase();
            }
          }
        }

        const botList = [bz.bots.red, bz.bots.yellow];
        for (const bot of botList) {
          if (bot.path.length > 0) {
            const target = bot.path[0];
            const dx = target.x - bot.x;
            const dy = target.y - bot.y;
            const dist = Math.hypot(dx, dy);
            const botSpeed = 2.25;
            bot.dir = deltaToDirection(dx, dy, bot.dir);
            const stepDist = botSpeed * dt;
            if (dist <= stepDist) {
              bot.x = target.x;
              bot.y = target.y;
              bot.path.shift();
              const bKey = `${bot.x},${bot.y}`;
              if (bKey !== bot.lastTileKey && isBanzaiTile(bot.x, bot.y)) {
                bot.lastTileKey = bKey;
                const res = stepBanzaiTile(bz.tiles, bot.x, bot.y, bot.team);
                if (res.changed) {
                  bz.tiles = res.tiles;
                  if (res.justLocked) {
                    const pt = gridToScreen(bot.x, bot.y, originX, originY, getTileHeight(room, bot.x, bot.y));
                    spawnParticles(pt.x, pt.y + 8, bot.team === 'red' ? '#f87171' : '#facc15', 8);
                  }
                }
              }
            } else {
              bot.x += (dx / dist) * stepDist;
              bot.y += (dy / dist) * stepDist;
            }
          } else {
            bot.waitTimer -= dt;
            if (bot.waitTimer <= 0) {
              const openTiles: Point2D[] = [];
              for (let ty = 2; ty <= 7; ty++) {
                for (let tx = 2; tx <= 7; tx++) {
                  const st = bz.tiles[banzaiTileKey(tx, ty)];
                  if (!st || st.level < 3) {
                    openTiles.push({ x: tx, y: ty });
                  }
                }
              }
              if (openTiles.length > 0) {
                const goal = openTiles[Math.floor(Math.random() * openTiles.length)];
                const path = findPath(room, furni, Math.round(bot.x), Math.round(bot.y), goal.x, goal.y);
                bot.path = path.length > 0 ? path : [];
              }
              bot.waitTimer = 0.35;
            }
          }
        }

        bz.hudSyncAccum += dt;
        if (bz.timeLeft <= 0) {
          bz.active = false;
          const resolution = resolveBanzaiMatch(bz.tiles, pState);
          if (resolution.playerWon) {
            latestRef.current.onAwardBanzaiReward(
              resolution.creditsAwarded,
              resolution.ducketsAwarded
            );
            latestRef.current.onUnlockBadge?.('badge_banzai');
            showToast(resolution.summary);
          } else {
            habboAudio.playUiClick();
            showToast(resolution.summary);
          }
          setBanzaiHud({
            active: false,
            timeLeft: 0,
            scores: resolution.scores,
            resultSummary: resolution.summary,
          });
        } else if (bz.hudSyncAccum >= 0.22) {
          bz.hudSyncAccum = 0;
          setBanzaiHud({
            active: true,
            timeLeft: Math.ceil(bz.timeLeft),
            scores: computeBanzaiScores(bz.tiles),
            resultSummary: null,
          });
        }
      }

      // Periodic ambient NPC chatter
      sim.npcChatterTimer -= dt;
      if (sim.npcChatterTimer <= 0) {
        sim.npcChatterTimer = 11 + Math.random() * 6;
        if (npcsInRoom.length > 0) {
          const speaker = npcsInRoom[Math.floor(Math.random() * npcsInRoom.length)];
          const line = speaker.chatLines[Math.floor(Math.random() * speaker.chatLines.length)];
          pushBubble(speaker.id, speaker.name, speaker.look, line);
        }
      }

      // Expire speech bubbles after 7s
      const nowMs = Date.now();
      if (sim.bubbles.length > 0) {
        sim.bubbles = sim.bubbles.filter((b) => nowMs - b.timestamp < 7000);
      }

      // Update pooled particles
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const pt = sim.particles[i];
        if (!pt.active) continue;
        pt.life += dt;
        if (pt.life >= pt.maxLife) {
          pt.active = false;
          continue;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 40 * dt;
      }

      // === RENDER (Authentic Shockwave/Flash Pitch-Black #000000 Room Void) ===
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, vw, vh);

      // Background-only moodlight tint
      if (moodCfg.enabled && moodCfg.backgroundOnly) {
        ctx.save();
        ctx.globalAlpha = moodCfg.intensity;
        ctx.fillStyle = moodCfg.colorHex;
        ctx.fillRect(0, 0, vw, vh);
        ctx.restore();
      }

      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.imageSmoothingEnabled = false;

      // Draw Indoor Walls or Outdoor Rooftop Parapets + Hotel Facade
      drawRoomWallsOrParapets(ctx, room, originX, originY, sim.animTick);

      // Collect depth-sorted drawables (Lido props + waterfall/buoys + solid furni + pets + NPCs + Banzai bots + players)
      interface DrawItem {
        depth: number;
        draw: () => void;
      }
      const drawList: DrawItem[] = [];

      // Draw Floor Tiles (supports multi-level Z: 'w' pool, 'l' ladder, 's' stairs, '1'/'2'/'3' terrace/cliff, 'b' booth, 'd' diving board)
      for (let y = 0; y < room.layout.length; y++) {
        const row = room.layout[y];
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === 'x') continue;
          const tz = getTileHeight(room, x, y);
          const pos = gridToScreen(x, y, originX, originY, tz);
          const isHovered = sim.hoverTile?.x === x && sim.hoverTile?.y === y;
          drawIsoFloorTile(ctx, pos.x, pos.y, x, y, room.floorTheme, isHovered, ch, sim.animTick);

          if (roomIsBanzai && isBanzaiTile(x, y)) {
            const tileState = bz.tiles[banzaiTileKey(x, y)] ?? { level: 0, team: null };
            drawBanzaiTileOverlay(ctx, pos.x, pos.y, tileState, sim.animTick);
          }

          if (ch === 'b' || ch === 'd') {
            drawList.push({
              depth: x + y + 0.04,
              draw: () => {
                drawLidoTileProp(ctx, pos.x, pos.y, ch, sim.animTick);
              },
            });
          }

          if ((placingId || movingUid) && isHovered) {
            const targetFurniId =
              placingId ?? furni.find((f) => f.uid === movingUid)?.furniId;
            const check = computeFurniPlacement(
              room,
              furni,
              targetFurniId,
              x,
              y,
              movingUid ?? undefined
            );
            const hlPos = gridToScreen(x, y, originX, originY, tz + check.z);
            ctx.beginPath();
            ctx.moveTo(hlPos.x, hlPos.y + 2);
            ctx.lineTo(hlPos.x + 28, hlPos.y + 16);
            ctx.lineTo(hlPos.x, hlPos.y + 30);
            ctx.lineTo(hlPos.x - 28, hlPos.y + 16);
            ctx.closePath();
            ctx.fillStyle = check.ok ? 'rgba(34, 197, 94, 0.42)' : 'rgba(239, 68, 68, 0.45)';
            ctx.fill();
            ctx.strokeStyle = check.ok ? '#4ade80' : '#f87171';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      // Rooftop Pool Scenery: Animated Rocky Cliff Waterfall + Floating Lane Buoys
      if (room.rooftopHotelFacade || room.modelName === 'model_rooftop') {
        const wfPos = gridToScreen(9.6, 1.9, originX, originY, 2.85);
        drawList.push({
          depth: 11.7,
          draw: () => {
            drawRooftopWaterfall(ctx, wfPos.x, wfPos.y, sim.animTick);
          },
        });
        const buoyCoords: [number, number][] = [
          [7, 3],
          [8, 3],
          [7, 5],
          [9, 5],
        ];
        buoyCoords.forEach(([bx, by], idx) => {
          const bPos = gridToScreen(bx, by, originX, originY, getTileHeight(room, bx, by));
          drawList.push({
            depth: bx + by + 0.03,
            draw: () => {
              drawPoolLaneBuoy(ctx, bPos.x, bPos.y, sim.animTick, idx);
            },
          });
        });
      }

      // Chromide Club: Animated DJ Stage Smoke Puffs
      if (room.modelName === 'model_disco' || room.id === 'chromide_club') {
        const smokeJets: [number, number][] = [
          [3.5, 2],
          [7.5, 2],
        ];
        smokeJets.forEach(([sxTile, syTile], idx) => {
          const sPos = gridToScreen(sxTile, syTile, originX, originY, 1.8);
          drawList.push({
            depth: sxTile + syTile + 0.07,
            draw: () => {
              for (let p = 0; p < 3; p++) {
                const phase = ((sim.animTick * 0.4 + p * 0.33 + idx * 0.2) % 1);
                const py = sPos.y - 6 - phase * 22;
                const px = sPos.x + Math.sin(phase * Math.PI * 2 + idx) * 5;
                const rad = 5 + phase * 8;
                ctx.fillStyle = `rgba(203, 213, 225, ${(1 - phase) * 0.28})`;
                ctx.beginPath();
                ctx.arc(px, py, rad, 0, Math.PI * 2);
                ctx.fill();
              }
            },
          });
        });
      }

      // Draw walkable rugs first at their tile Z height
      for (const item of furni) {
        const def = findFurniDef(item.furniId);
        if (!def?.walkable) continue;
        const tz = getTileHeight(room, item.x, item.y);
        const pos = gridToScreen(item.x, item.y, originX, originY, tz);
        const sprite = getFurniSprite(item.furniId, item.dir, item.state, sim.animTick);
        ctx.drawImage(sprite, Math.round(pos.x - 36), Math.round(pos.y + 16 - 72));
      }

      for (const item of furni) {
        const def = findFurniDef(item.furniId);
        if (def?.walkable) continue;
        const tz = getTileHeight(room, item.x, item.y);
        const itemZ = item.z ?? 0;
        const pos = gridToScreen(item.x, item.y, originX, originY, tz + itemZ);
        drawList.push({
          depth: item.x + item.y + 0.05 + itemZ * 0.018,
          draw: () => {
            const sprite = getFurniSprite(item.furniId, item.dir, item.state, sim.animTick);
            ctx.drawImage(sprite, Math.round(pos.x - 36), Math.round(pos.y + 16 - 72));
          },
        });
      }

      const drawNameTag = (x: number, y: number, label: string, color: string) => {
        ctx.font = 'bold 10px Tahoma, Verdana, sans-serif';
        const tw = ctx.measureText(label).width;
        const bw = Math.ceil(tw) + 10;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
        ctx.fillRect(Math.round(x - bw / 2), Math.round(y - 11), bw, 14);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(label, Math.round(x), Math.round(y - 4));
      };

      const drawPoolRipple = (x: number, y: number) => {
        ctx.strokeStyle = sim.animTick % 2 === 0 ? 'rgba(224,242,254,0.85)' : 'rgba(125,211,252,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x, y + 10, 14, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      };

      // Owned Pets roaming in current room
      for (const pet of petsInRoom) {
        const ps = sim.petSims[pet.id];
        const pxTile = ps ? ps.x : pet.x;
        const pyTile = ps ? ps.y : pet.y;
        const pDir = ps ? ps.dir : pet.dir;
        const pAnim = ps ? ps.anim : pet.anim;
        const tz = getTileHeight(room, pxTile, pyTile);
        const pos = gridToScreen(pxTile, pyTile, originX, originY, tz);
        drawList.push({
          depth: pxTile + pyTile + 0.06,
          draw: () => {
            const sprite = getPetSprite(pet.species, pDir, pAnim, sim.animTick);
            ctx.drawImage(sprite, Math.round(pos.x - 20), Math.round(pos.y + 16 - 34));
            drawNameTag(pos.x, pos.y - 24, pet.name, '#fde68a');
          },
        });
      }

      for (const npc of npcsInRoom) {
        const tz = getTileHeight(room, npc.x, npc.y);
        const pos = gridToScreen(npc.x, npc.y, originX, originY, tz);
        const npcInWater = isSwimTile(room, npc.x, npc.y);
        drawList.push({
          depth: npc.x + npc.y + 0.08,
          draw: () => {
            const sprite = getAvatarSprite(
              npc.look,
              npc.dir,
              npc.pose,
              sim.animTick,
              npcInWater,
              '#f59e0b',
              npcInWater
            );
            const seatOffset = npc.pose === 'sit' ? -5 : npcInWater ? 7 : 0;
            ctx.drawImage(sprite, Math.round(pos.x - 22), Math.round(pos.y + 16 - 66 + seatOffset));
            if (npcInWater) drawPoolRipple(pos.x, pos.y);
            drawNameTag(
              pos.x,
              pos.y - 54 + seatOffset,
              npc.name,
              npc.role === 'staff' ? '#fde047' : '#e0f2fe'
            );
          },
        });
      }

      // Battle Banzai Arena Bot Opponents
      if (roomIsBanzai && bz.active) {
        for (const bot of [bz.bots.red, bz.bots.yellow]) {
          const tz = getTileHeight(room, bot.x, bot.y);
          const pos = gridToScreen(bot.x, bot.y, originX, originY, tz);
          drawList.push({
            depth: bot.x + bot.y + 0.085,
            draw: () => {
              const sprite = getAvatarSprite(
                bot.look,
                bot.dir,
                bot.path.length > 0 ? 'walk' : 'stand',
                sim.animTick
              );
              ctx.drawImage(sprite, Math.round(pos.x - 22), Math.round(pos.y + 16 - 66));
              drawNameTag(
                pos.x,
                pos.y - 54,
                bot.name,
                bot.team === 'red' ? '#fca5a5' : '#fde047'
              );
            },
          });
        }
      }

      // Remote live multiplayer avatars in the same room
      const isSippingNow = sim.animTick % 24 >= 20;
      for (const rp of Object.values(sim.remotePlayers)) {
        const tz = getTileHeight(room, rp.x, rp.y);
        const pos = gridToScreen(rp.x, rp.y, originX, originY, tz);
        const rpInWater = isSwimTile(room, rp.x, rp.y);
        const rpSwim = Boolean(rpInWater || rp.swimming);
        drawList.push({
          depth: rp.x + rp.y + 0.088,
          draw: () => {
            const sprite = getAvatarSprite(
              rp.look,
              rp.dir,
              rp.pose,
              sim.animTick,
              rpInWater,
              rp.swimwearColor || '#0ea5e9',
              rpSwim,
              rp.danceStyle ?? 1
            );
            const seatOffset = rp.pose === 'sit' ? -5 : rpInWater ? 7 : 0;
            ctx.drawImage(sprite, Math.round(pos.x - 22), Math.round(pos.y + 16 - 66 + seatOffset));
            if (rpInWater) drawPoolRipple(pos.x, pos.y);

            if (rp.carryItem && rp.carryItem !== 'none') {
              drawCarryHandItem(ctx, rp.carryItem, pos.x, pos.y + seatOffset, rp.dir, isSippingNow);
            }

            if (rp.activeSign) {
              drawAvatarSign(ctx, rp.activeSign, pos.x, pos.y - 62 + seatOffset);
            }

            const label = rp.badge ? `[${rp.badge}] ${rp.username}` : rp.username;
            drawNameTag(pos.x, pos.y - 54 + seatOffset, label, '#38bdf8');
          },
        });
      }

      // Player avatar (+ Lido Swimwear, Submerged Pool Duck Float, Dive Jump Arc, Handitem & :sign)
      {
        const pTileZ = sim.diveJump
          ? getTileHeight(room, sim.diveJump.startX, sim.diveJump.startY) * (1 - sim.diveJump.progress) +
            getTileHeight(room, sim.diveJump.endX, sim.diveJump.endY) * sim.diveJump.progress +
            Math.sin(sim.diveJump.progress * Math.PI) * 2.4
          : getTileHeight(room, sim.px, sim.py);
        const pos = gridToScreen(sim.px, sim.py, originX, originY, pTileZ);
        const pInWater = !sim.diveJump && isSwimTile(room, sim.px, sim.py);
        const pSwimming = pInWater || sim.swimwearActive;
        drawList.push({
          depth: sim.px + sim.py + 0.09,
          draw: () => {
            const sprite = getAvatarSprite(
              pState.look,
              sim.dir,
              sim.diveJump ? 'wave' : sim.pose,
              sim.animTick,
              pInWater,
              sim.swimwearColor,
              pSwimming,
              pDanceStyle
            );
            const seatOffset = sim.pose === 'sit' ? -5 : pInWater ? 7 : 0;
            ctx.drawImage(sprite, Math.round(pos.x - 22), Math.round(pos.y + 16 - 66 + seatOffset));
            if (pInWater) drawPoolRipple(pos.x, pos.y);

            if (heldItem !== 'none') {
              drawCarryHandItem(ctx, heldItem, pos.x, pos.y + seatOffset, sim.dir, isSippingNow);
            }

            if (pActiveSign) {
              drawAvatarSign(ctx, pActiveSign, pos.x, pos.y - 62 + seatOffset);
            }

            const tagLabel =
              heldItem !== 'none'
                ? `${pState.username} [${getCarryItemDef(heldItem).shortLabel}]`
                : pState.username;
            drawNameTag(pos.x, pos.y - 54 + seatOffset, tagLabel, '#86efac');
          },
        });
      }

      drawList.sort((a, b) => a.depth - b.depth);
      for (const d of drawList) d.draw();

      // Draw Pooled Particles
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const pt = sim.particles[i];
        if (!pt.active) continue;
        const alpha = 1 - pt.life / pt.maxLife;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      // Full-Room Moodlight / Dimmer Overlay
      if (moodCfg.enabled && !moodCfg.backgroundOnly) {
        ctx.save();
        ctx.globalAlpha = moodCfg.intensity;
        ctx.fillStyle = moodCfg.colorHex;
        ctx.fillRect(0, 0, vw, vh);
        ctx.restore();
      }

      // Draw Classic 2009 Sharp Habbo Speech Bubbles
      const bubbleList = sim.bubbles;
      let nextBottomY = Math.max(
        92,
        Math.min(Math.round((originY - 36) * zoom), Math.round(vh * 0.24))
      );
      for (let i = bubbleList.length - 1; i >= 0; i--) {
        const b = bubbleList[i];
        const styleDef =
          CHAT_BUBBLE_STYLES.find((s) => s.id === b.bubbleStyle) ?? CHAT_BUBBLE_STYLES[0];
        const prefix = b.mode === 'whisper' ? '[Whisper] ' : b.mode === 'shout' ? '[SHOUT] ' : '';
        const lineText = `${b.senderName}: ${prefix}${b.text}`;
        ctx.font =
          b.mode === 'shout'
            ? 'bold 11px Tahoma, Verdana, sans-serif'
            : '11px Tahoma, Verdana, sans-serif';
        const textW = ctx.measureText(lineText).width;
        const boxW = Math.min(vw - 32, Math.max(140, Math.ceil(textW) + 52));
        const boxH = 26;
        const bx = Math.round(vw / 2 - boxW / 2);
        const by = nextBottomY - boxH;
        nextBottomY -= boxH + 5;
        if (by < 52) break;

        ctx.fillStyle = b.senderId === 'player' ? styleDef.bg : '#ffffff';
        ctx.strokeStyle =
          b.mode === 'shout'
            ? '#d97706'
            : b.senderId === 'player'
            ? styleDef.border
            : '#000000';
        ctx.lineWidth = b.mode === 'shout' ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = b.senderId === 'player' ? styleDef.accent : '#2b6ca3';
        ctx.fillRect(bx + 2, by + 2, 24, boxH - 4);

        const head = getAvatarHeadSprite(b.look);
        ctx.drawImage(head, bx + 3, by + 1, 22, 22);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px Tahoma, Verdana, sans-serif';
        const namePart = `${b.senderName}: `;
        const nameW = ctx.measureText(namePart).width;
        ctx.fillStyle = b.senderId === 'player' ? styleDef.text : '#111827';
        ctx.fillText(namePart, bx + 32, by + boxH / 2);

        ctx.font =
          b.mode === 'whisper'
            ? 'italic 11px Tahoma, Verdana, sans-serif'
            : b.mode === 'shout'
            ? 'bold 11px Tahoma, Verdana, sans-serif'
            : '11px Tahoma, Verdana, sans-serif';
        ctx.fillStyle = b.senderId === 'player' ? styleDef.text : '#1f2937';
        ctx.fillText(`${prefix}${b.text}`, bx + 32 + nameW, by + boxH / 2, boxW - 40 - nameW);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [broadcastAvatarMove, getClientCamera, pushBubble, showToast, spawnParticles]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    simRef.current.dragStart = {
      x: e.clientX,
      y: e.clientY,
      startPanX: simRef.current.panOffset.x,
      startPanY: simRef.current.panOffset.y,
      moved: false,
    };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = simRef.current;
    if (sim.dragStart && (e.buttons & 1) === 1) {
      const dx = e.clientX - sim.dragStart.x;
      const dy = e.clientY - sim.dragStart.y;
      if (Math.hypot(dx, dy) >= 6) {
        sim.dragStart.moved = true;
        sim.panOffset = {
          x: Math.max(-360, Math.min(360, sim.dragStart.startPanX + dx)),
          y: Math.max(-240, Math.min(240, sim.dragStart.startPanY + dy)),
        };
      }
    }
    const rect = canvas.getBoundingClientRect();
    const { zoom, originX, originY } = getClientCamera(rect.width, rect.height);
    const sx = (e.clientX - rect.left) / zoom;
    const sy = (e.clientY - rect.top) / zoom;
    const tile = screenToGrid(sx, sy, originX, originY, currentRoom);
    if (
      tile.y >= 0 &&
      tile.y < currentRoom.layout.length &&
      tile.x >= 0 &&
      tile.x < currentRoom.layout[tile.y].length &&
      currentRoom.layout[tile.y][tile.x] !== 'x'
    ) {
      sim.hoverTile = tile;
    } else {
      sim.hoverTile = null;
    }
  };

  const handleCanvasPointerUp = () => {
    const sim = simRef.current;
    sim.justDragged = Boolean(sim.dragStart?.moved);
    sim.dragStart = null;
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const delta = -Math.sign(e.deltaY) * 0.08;
    simRef.current.userZoom = Math.min(1.8, Math.max(0.7, simRef.current.userZoom + delta));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (simRef.current.justDragged) {
      simRef.current.justDragged = false;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { zoom, originX, originY } = getClientCamera(rect.width, rect.height);
    const sx = (e.clientX - rect.left) / zoom;
    const sy = (e.clientY - rect.top) / zoom;
    const tile = screenToGrid(sx, sy, originX, originY, currentRoom);

    if (
      tile.y < 0 ||
      tile.y >= currentRoom.layout.length ||
      tile.x < 0 ||
      tile.x >= currentRoom.layout[tile.y].length ||
      currentRoom.layout[tile.y][tile.x] === 'x'
    ) {
      return;
    }

    // 1. Placing furniture from Inventory OR Moving placed furniture
    if (movingFurniUid && canEditRoom) {
      if (onMoveFurni) {
        const res = onMoveFurni(currentRoom.id, movingFurniUid, tile.x, tile.y);
        if (res.ok) {
          habboAudio.playFurniPlace();
          const pt = gridToScreen(tile.x, tile.y, originX, originY, getTileHeight(currentRoom, tile.x, tile.y));
          spawnParticles(pt.x, pt.y + 8, '#4ade80', 10);
          setMovingFurniUid(null);
        } else {
          habboAudio.playError();
        }
        showToast(res.message);
      } else {
        setMovingFurniUid(null);
      }
      return;
    }

    if (placingFurniId && canEditRoom) {
      const res = onPlaceFurni(currentRoom.id, placingFurniId, tile.x, tile.y, 0);
      if (res.ok) {
        habboAudio.playFurniPlace();
        const pt = gridToScreen(tile.x, tile.y, originX, originY, getTileHeight(currentRoom, tile.x, tile.y));
        spawnParticles(pt.x, pt.y + 8, '#fde047', 10);
        setPlacingFurniId(null);
      } else {
        habboAudio.playError();
      }
      showToast(res.message);
      return;
    }

    // 2. Check clicked avatar -> Open Classic Habbo Avatar Info-Stand
    const sim = simRef.current;
    const isHitOnSprite = (ax: number, ay: number) => {
      const tz = getTileHeight(currentRoom, ax, ay);
      const pos = gridToScreen(ax, ay, originX, originY, tz);
      return Math.abs(sx - pos.x) <= 22 && sy >= pos.y - 54 && sy <= pos.y + 18;
    };

    const clickedRemote = Object.values(sim.remotePlayers).find(
      (rp) => (Math.round(rp.x) === tile.x && Math.round(rp.y) === tile.y) || isHitOnSprite(rp.x, rp.y)
    );
    if (clickedRemote) {
      habboAudio.playUiClick();
      const matchedDir = directory.find(
        (d) => d.name.toLowerCase() === clickedRemote.username.toLowerCase()
      );
      const profileId = matchedDir?.id ?? clickedRemote.sessionId;
      setSelectedFurniUid(null);
      setSelectedPetId(null);
      setInfoTarget({
        key: profileId,
        username: clickedRemote.username,
        motto: matchedDir?.motto ?? clickedRemote.motto,
        look: matchedDir?.look ?? clickedRemote.look,
        badges: matchedDir?.badges ?? clickedRemote.badges ?? ['badge_checkin'],
        roleBadge: clickedRemote.badge,
        roleLabel: matchedDir?.roleLabel,
        respectCount: matchedDir?.respectCount ?? clickedRemote.respectCount ?? 0,
        isSelf: false,
        isNpc: false,
        isStaff: clickedRemote.rank >= 3,
        isFriend: player.friendIds.includes(profileId),
        requestSent: (player.outgoingFriendRequests ?? []).includes(profileId),
        requestReceived: (player.incomingFriendRequests ?? []).includes(profileId),
        hasRoomRights: (currentRoom.roomRights ?? []).some(
          (u) => u.toLowerCase() === clickedRemote.username.toLowerCase()
        ),
      });
      return;
    }

    const clickedNpc = roomNpcs.find(
      (n) => (n.x === tile.x && n.y === tile.y) || isHitOnSprite(n.x, n.y)
    );
    if (clickedNpc) {
      habboAudio.playUiClick();
      const liveProfile = directory.find((d) => d.id === clickedNpc.id || d.npcId === clickedNpc.id);
      const npcKey = liveProfile?.id ?? clickedNpc.id;
      setSelectedFurniUid(null);
      setSelectedPetId(null);
      setInfoTarget({
        key: npcKey,
        username: clickedNpc.name,
        motto: liveProfile?.motto ?? clickedNpc.motto,
        look: liveProfile?.look ?? clickedNpc.look,
        badges: liveProfile?.badges ?? clickedNpc.badges ?? ['badge_checkin'],
        roleBadge: liveProfile?.roleBadge ?? clickedNpc.badge,
        roleLabel: liveProfile?.roleLabel,
        respectCount:
          (liveProfile?.respectCount ?? clickedNpc.respectCount ?? 8) +
          (npcRespectBonus[clickedNpc.id] ?? 0),
        isSelf: false,
        isNpc: true,
        isStaff: clickedNpc.role === 'staff',
        isFriend: player.friendIds.includes(npcKey),
        requestSent: (player.outgoingFriendRequests ?? []).includes(npcKey),
        requestReceived: (player.incomingFriendRequests ?? []).includes(npcKey),
        hasRoomRights: false,
      });
      return;
    }

    if (
      (Math.round(sim.px) === tile.x && Math.round(sim.py) === tile.y) ||
      isHitOnSprite(sim.px, sim.py)
    ) {
      habboAudio.playUiClick();
      setSelectedFurniUid(null);
      setSelectedPetId(null);
      setInfoTarget({
        key: 'self',
        username: player.username,
        motto: player.motto,
        look: player.look,
        badges: getEquippedBadges(player),
        roleBadge:
          player.rank >= 5 ? 'ADM' : player.rank === 4 ? 'MOD' : player.rank === 3 ? 'EVT' : player.hcDays > 0 ? 'HC' : undefined,
        roleLabel: player.rank >= 5 ? 'Hotel Manager' : player.rank >= 4 ? 'Moderator' : 'Citizen',
        respectCount: player.respectCount ?? 0,
        isSelf: true,
        isNpc: false,
        isStaff: player.rank >= 3,
        isFriend: false,
        requestSent: false,
        requestReceived: false,
        hasRoomRights: true,
      });
      return;
    }

    // 2b. Check clicked Pet
    const clickedPet = roomPets.find((pet) => {
      const ps = sim.petSims[pet.id];
      const pxTile = ps ? ps.x : pet.x;
      const pyTile = ps ? ps.y : pet.y;
      const tz = getTileHeight(currentRoom, pxTile, pyTile);
      const pos = gridToScreen(pxTile, pyTile, originX, originY, tz);
      const hitSprite = Math.abs(sx - pos.x) <= 20 && sy >= pos.y - 24 && sy <= pos.y + 20;
      return (Math.round(pxTile) === tile.x && Math.round(pyTile) === tile.y) || hitSprite;
    });
    if (clickedPet) {
      habboAudio.playUiClick();
      setInfoTarget(null);
      setSelectedFurniUid(null);
      setSelectedPetId(clickedPet.id);
      return;
    }

    // 3. Check furniture interaction or Furni Info-Stand selection
    const matchingFurni = currentFurni
      .filter((f) => f.x === tile.x && f.y === tile.y)
      .sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
    const clickedFurni = matchingFurni[0];
    if (clickedFurni) {
      const def = findFurniDef(clickedFurni.furniId);
      const isInteractive = Boolean(
        def &&
          [
            'holo_dice',
            'fire_dragon',
            'jade_dragon',
            'silver_dragon',
            'jukebox',
            'dj_turntable',
            'fireplace',
            'amber_lamp',
            'lava_lamp',
            'golden_fountain',
            'imperial_teleporter',
            'plasma_tv',
            'arcade_cabinet',
            'mini_fridge',
            'mode_bar',
          ].includes(def.id)
      );

      if (showInventory && canEditRoom) {
        habboAudio.playUiClick();
        setInfoTarget(null);
        setSelectedPetId(null);
        setSelectedFurniUid(clickedFurni.uid);
        return;
      }

      if (def?.isStickyNote || def?.engravable || !def?.sittable || isInteractive) {
        habboAudio.playUiClick();
        setInfoTarget(null);
        setSelectedPetId(null);
        setSelectedFurniUid(clickedFurni.uid);
        if (isInteractive) {
          handleUseFurni(clickedFurni);
        }
        return;
      }
    }

    // 4. A* Pathfinding to clicked tile or sittable furniture
    const path = findPath(currentRoom, currentFurni, sim.px, sim.py, tile.x, tile.y);
    if (path.length > 0) {
      sim.path = path;
      broadcastAvatarMove({ targetX: tile.x, targetY: tile.y, pose: 'walk' });
      setInfoTarget(null);
      setSelectedFurniUid(null);
      setSelectedPetId(null);
    }
  };

  function handleUseFurni(targetFurni: PlacedFurni) {
    const def = findFurniDef(targetFurni.furniId);
    if (!def) return;
    const canvas = canvasRef.current;
    let pt = { x: 400, y: 240 };
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const { originX, originY } = getClientCamera(rect.width, rect.height);
      pt = gridToScreen(
        targetFurni.x,
        targetFurni.y,
        originX,
        originY,
        getTileHeight(currentRoom, targetFurni.x, targetFurni.y) + (targetFurni.z ?? 0)
      );
    }

    if (def.id === 'holo_dice') {
      const rolled = Math.floor(Math.random() * 6) + 1;
      onToggleFurniState(currentRoom.id, targetFurni.uid, rolled);
      habboAudio.playDiceRoll();
      spawnParticles(pt.x, pt.y - 12, '#22d3ee', 12);
      pushBubble('player', player.username, player.look, `*rolls Holo Dice: ${rolled}!*`, {
        mode: chatMode,
        bubbleStyle,
      });
      return;
    }

    if (def.id === 'fire_dragon' || def.id === 'jade_dragon' || def.id === 'silver_dragon') {
      const nextState = targetFurni.state === 1 ? 0 : 1;
      onToggleFurniState(currentRoom.id, targetFurni.uid, nextState);
      habboAudio.playDragonFlame();
      spawnParticles(pt.x, pt.y - 16, def.id === 'jade_dragon' ? '#22c55e' : '#f97316', 14);
      return;
    }

    if (def.id === 'jukebox' || def.id === 'dj_turntable') {
      const nextState = targetFurni.state === 1 ? 0 : 1;
      onToggleFurniState(currentRoom.id, targetFurni.uid, nextState);
      handleSelectTrax(nextState === 1 ? 0 : null);
      setShowTraxModal(true);
      spawnParticles(pt.x, pt.y - 18, '#ec4899', 12);
      return;
    }

    if (
      def.id === 'fireplace' ||
      def.id === 'amber_lamp' ||
      def.id === 'lava_lamp' ||
      def.id === 'golden_fountain' ||
      def.id === 'imperial_teleporter' ||
      def.id === 'plasma_tv' ||
      def.id === 'arcade_cabinet' ||
      def.id === 'mini_fridge' ||
      def.id === 'mode_bar'
    ) {
      const nextState = targetFurni.state === 1 ? 0 : 1;
      onToggleFurniState(currentRoom.id, targetFurni.uid, nextState);
      if (def.id === 'imperial_teleporter') {
        habboAudio.playTeleporter();
      } else {
        habboAudio.playUiClick();
      }
      const color =
        def.id === 'amber_lamp' || def.id === 'fireplace'
          ? '#facc15'
          : def.id === 'lava_lamp'
          ? '#f472b6'
          : def.id === 'golden_fountain'
          ? '#bae6fd'
          : '#38bdf8';
      spawnParticles(pt.x, pt.y - 18, color, 10);
      if (def.id === 'mini_fridge') {
        setCarryItem('cola');
        showToast('Grabbed an ice-cold Pixel Cola (60s) from the Mini Fridge!');
      } else if (def.id === 'mode_bar') {
        setCarryItem('coffee');
        showToast('Poured a fresh Espresso Cup (60s) from the Mode Bar!');
      } else if (def.id === 'golden_fountain') {
        setCarryItem('champagne');
        showToast('Filled a sparkling VIP Bubbly flute (60s) at the Golden Fountain!');
      } else if (def.id === 'arcade_cabinet') {
        showToast(
          nextState === 1 ? 'Arcade Cabinet booted: Wobble Squabble!' : 'Arcade powered down.'
        );
      } else if (def.id === 'plasma_tv') {
        showToast(
          nextState === 1 ? 'PIXL Plasma TV switched on.' : 'PIXL Plasma TV switched off.'
        );
      }
      return;
    }

    if (def.sittable) {
      const sim = simRef.current;
      const path = findPath(currentRoom, currentFurni, sim.px, sim.py, targetFurni.x, targetFurni.y);
      if (path.length > 0) {
        sim.path = path;
        broadcastAvatarMove({ targetX: targetFurni.x, targetY: targetFurni.y, pose: 'walk' });
      }
    } else {
      habboAudio.playUiClick();
      showToast(`Used ${def.name}.`);
    }
  }

  const triggerPetCommand = useCallback(
    (pet: OwnedPet, anim: PetAnim, reactionLine: string) => {
      const sim = simRef.current;
      const ps = sim.petSims[pet.id];
      if (ps) {
        ps.path = [];
        ps.anim = anim;
        ps.animTimer = 3.8;
      }
      onCarePet(pet.id, 'play');
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const { originX, originY } = getClientCamera(rect.width, rect.height);
        const px = ps ? ps.x : pet.x;
        const py = ps ? ps.y : pet.y;
        const pt = gridToScreen(px, py, originX, originY, getTileHeight(currentRoom, px, py));
        spawnParticles(pt.x, pt.y - 10, '#fde047', 8);
      }
      pushBubble(`pet-${pet.id}`, pet.name, player.look, reactionLine);
    },
    [currentRoom, getClientCamera, onCarePet, player.look, pushBubble, spawnParticles]
  );

  const triggerAction = useCallback(
    (pose: 'wave' | 'dance' | 'sit' | 'lay' | 'stand', overrideStyle?: DanceStyleId) => {
      habboAudio.playUiClick();
      const sim = simRef.current;
      sim.path = [];
      if (pose === 'wave') {
        sim.pose = 'wave';
        sim.waveTimer = 1.6;
        setPlayerPoseUI('wave');
        broadcastAvatarMove({ pose: 'wave' });
      } else if (pose === 'dance') {
        const nextStyle = overrideStyle ?? danceStyle;
        if (overrideStyle) setDanceStyle(overrideStyle);
        const next = overrideStyle ? 'dance' : sim.pose === 'dance' ? 'stand' : 'dance';
        sim.pose = next;
        setPlayerPoseUI(next);
        broadcastAvatarMove({ pose: next, danceStyle: nextStyle });
        if (next === 'dance') onUnlockBadge?.('badge_dj');
      } else if (pose === 'sit') {
        const next = sim.pose === 'sit' ? 'stand' : 'sit';
        sim.pose = next;
        setPlayerPoseUI(next);
        broadcastAvatarMove({ pose: next });
      } else if (pose === 'lay') {
        const next = sim.pose === 'lay' ? 'stand' : 'lay';
        sim.pose = next;
        setPlayerPoseUI(next);
        broadcastAvatarMove({ pose: next });
      } else {
        sim.pose = 'stand';
        setPlayerPoseUI('stand');
        broadcastAvatarMove({ pose: 'stand' });
      }
    },
    [broadcastAvatarMove, danceStyle, onUnlockBadge]
  );

  const executeChatOrCommand = useCallback(
    (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      const parsedCmd = parseClientCommand(trimmed);
      if (parsedCmd) {
        if (parsedCmd.type === 'pose') {
          triggerAction(parsedCmd.pose === 'walk' ? 'stand' : parsedCmd.pose);
          showToast(`Executed ${trimmed} command!`);
          return;
        }
        if (parsedCmd.type === 'dance') {
          triggerAction('dance', parsedCmd.style);
          showToast(`Dancing Style #${parsedCmd.style}!`);
          return;
        }
        if (parsedCmd.type === 'sign') {
          habboAudio.playUiClick();
          setActiveSign(parsedCmd.sign);
          broadcastAvatarMove({ activeSign: parsedCmd.sign });
          showToast(`Showing sign [${parsedCmd.sign}] for 5s!`);
          return;
        }
        if (parsedCmd.type === 'moonwalk') {
          setMoonwalk((prev) => {
            const next = !prev;
            showToast(next ? 'Moonwalk enabled! Walk anywhere to glide backwards.' : 'Moonwalk disabled.');
            return next;
          });
          habboAudio.playCoinsPurchase();
          return;
        }
        if (parsedCmd.type === 'carry') {
          setCarryItem(parsedCmd.item);
          const def = getCarryItemDef(parsedCmd.item);
          habboAudio.playUiClick();
          showToast(
            parsedCmd.item === 'none'
              ? 'Put away carry item.'
              : `Equipped ${def.name} in hand (60s)!`
          );
          return;
        }
        if (parsedCmd.type === 'roll') {
          habboAudio.playDiceRoll();
          const rollText = `*rolls a ${parsedCmd.rolled} on the PIXL Dice!*`;
          pushBubble('player', player.username, player.look, rollText, {
            mode: chatMode,
            bubbleStyle,
          });
          broadcastChatMessage(rollText, { mode: chatMode, bubbleStyle });
          return;
        }
        if (parsedCmd.type === 'user_chooser') {
          habboAudio.playWindowToggle(true);
          setShowUserChooser(true);
          return;
        }
        if (parsedCmd.type === 'furni_chooser') {
          habboAudio.playWindowToggle(true);
          setCommandsSubTab('furni');
          setShowCommandsModal(true);
          return;
        }
        if (parsedCmd.type === 'commands_help') {
          habboAudio.playWindowToggle(true);
          setCommandsSubTab('commands');
          setShowCommandsModal(true);
          return;
        }
        if (parsedCmd.type === 'moodlight_toggle') {
          habboAudio.playWindowToggle(true);
          setMoodlight((m) => ({ ...m, enabled: !m.enabled }));
          setShowMoodlightModal(true);
          return;
        }
        if (parsedCmd.type === 'clear_chat') {
          simRef.current.bubbles = [];
          showToast('Cleared room speech bubbles.');
          return;
        }
        if (parsedCmd.type === 'pickall') {
          if (!canEditRoom) {
            habboAudio.playError();
            showToast('You can only :pickall in rooms you own or manage.');
            return;
          }
          let count = 0;
          if (onPickupAllFurni) {
            count = onPickupAllFurni(currentRoom.id);
          } else {
            count = currentFurni.length;
            for (const item of currentFurni) {
              onPickupFurni(currentRoom.id, item.uid);
            }
          }
          setSelectedFurniUid(null);
          habboAudio.playFurniPickup();
          showToast(`Picked up ${count} furniture items back into your Inventory!`);
          return;
        }
      }

      pushBubble('player', player.username, player.look, trimmed, {
        mode: chatMode,
        bubbleStyle,
      });
      broadcastChatMessage(trimmed, { mode: chatMode, bubbleStyle });
      onUnlockBadge?.('badge_social');

      let matchedPetCommand = false;
      for (const pet of roomPets) {
        const cmd = parsePetChatCommand(trimmed, pet.species);
        if (cmd) {
          matchedPetCommand = true;
          setTimeout(() => {
            if (simRef.current.roomId === currentRoom.id) {
              triggerPetCommand(pet, cmd.anim, cmd.reaction);
            }
          }, 250);
        }
      }

      if (!matchedPetCommand && roomNpcs.length > 0) {
        const responder = roomNpcs[Math.floor(Math.random() * roomNpcs.length)];
        const lower = trimmed.toLowerCase();
        let reply = responder.chatLines[Math.floor(Math.random() * responder.chatLines.length)];
        if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
          reply = `Hey ${player.username}! Awesome look you're rocking today!`;
        } else if (lower.includes('dance')) {
          reply = `Let's groove! Try :dance 1 to :dance 4!`;
        } else if (lower.includes('dragon') || lower.includes('rare')) {
          reply = `Rares are looking sharp! Have you checked Rare Values on the CMS?`;
        } else if (lower.includes('trade')) {
          reply = `Up for a swap? Tap any PIXL citizen and choose Trade!`;
        } else if (lower.includes('pool') || lower.includes('dive') || lower.includes('swim')) {
          reply = `Step into the Changing Booth or click the Diving Board to splash into The Lido!`;
        }
        setTimeout(() => {
          if (simRef.current.roomId === currentRoom.id) {
            pushBubble(responder.id, responder.name, responder.look, reply);
          }
        }, 900);
      }
    },
    [
      broadcastAvatarMove,
      broadcastChatMessage,
      bubbleStyle,
      canEditRoom,
      chatMode,
      currentFurni,
      currentRoom.id,
      onPickupAllFurni,
      onPickupFurni,
      onUnlockBadge,
      player.look,
      player.username,
      pushBubble,
      roomNpcs,
      roomPets,
      showToast,
      triggerAction,
      triggerPetCommand,
    ]
  );

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const toSend = chatText;
    setChatText('');
    executeChatOrCommand(toSend);
  };

  const handleGiveRespect = (target: InfoStandTarget) => {
    if (respectLeft <= 0) {
      habboAudio.playError();
      showToast('You have used all 3 Daily Respect points for today!');
      return;
    }
    const nextLeft = respectLeft - 1;
    setRespectLeft(nextLeft);
    habboAudio.playRespectFanfare();
    onUnlockBadge?.('badge_social');

    const respectLine = `${player.username} respected ${target.username}!`;
    pushBubble('player', player.username, player.look, respectLine, {
      mode: 'shout',
      bubbleStyle: 'gold',
    });
    broadcastChatMessage(respectLine, { mode: 'shout', bubbleStyle: 'gold' });

    const canvas = canvasRef.current;
    const targetNpc = target.isNpc ? roomNpcs.find((n) => n.name === target.username) : undefined;
    const targetRemote = !target.isNpc
      ? Object.values(simRef.current.remotePlayers).find(
          (rp) => rp.username.toLowerCase() === target.username.toLowerCase()
        )
      : undefined;

    if (canvas && (targetNpc || targetRemote)) {
      const rect = canvas.getBoundingClientRect();
      const { originX, originY } = getClientCamera(rect.width, rect.height);
      const tx = targetNpc ? targetNpc.x : targetRemote!.x;
      const ty = targetNpc ? targetNpc.y : targetRemote!.y;
      const pt = gridToScreen(tx, ty, originX, originY, getTileHeight(currentRoom, tx, ty));
      spawnParticles(pt.x, pt.y - 30, '#f43f5e', 14);
      spawnParticles(pt.x, pt.y - 36, '#facc15', 8);
    }

    if (targetNpc) {
      setNpcRespectBonus((prev) => ({
        ...prev,
        [targetNpc.id]: (prev[targetNpc.id] ?? 0) + 1,
      }));
      setTimeout(() => {
        if (simRef.current.roomId === currentRoom.id) {
          pushBubble(
            targetNpc.id,
            targetNpc.name,
            targetNpc.look,
            `Thanks for the respect, ${player.username}!`
          );
        }
      }, 450);
    } else if (!target.isSelf) {
      onGiveRespect?.(target.username);
    }

    setInfoTarget((prev) =>
      prev && prev.key === target.key ? { ...prev, respectCount: prev.respectCount + 1 } : prev
    );
    showToast(`Respected ${target.username}! (${nextLeft} daily respect left)`);
  };

  const selectedPlacedObj = selectedFurniUid
    ? currentFurni.find((f) => f.uid === selectedFurniUid) ?? null
    : null;
  const activePet = selectedPetId ? roomPets.find((p) => p.id === selectedPetId) ?? null : null;
  const currentRoomLikes = roomLikes[currentRoom.id] ?? 24;
  const hasLikedCurrentRoom = Boolean(likedRooms[currentRoom.id]);
  const selfEquippedBadges = getEquippedBadges(player);

  const liveInfoTarget: InfoStandTarget | null = infoTarget
    ? infoTarget.isSelf
      ? {
          ...infoTarget,
          motto: player.motto,
          look: player.look,
          badges: selfEquippedBadges,
          respectCount: player.respectCount ?? infoTarget.respectCount,
        }
      : {
          ...infoTarget,
          isFriend: player.friendIds.includes(infoTarget.key),
          requestSent: (player.outgoingFriendRequests ?? []).includes(infoTarget.key),
          requestReceived: (player.incomingFriendRequests ?? []).includes(infoTarget.key),
          hasRoomRights: (currentRoom.roomRights ?? []).some(
            (u) => u.toLowerCase() === infoTarget.username.toLowerCase()
          ),
        }
    : null;

  const chooserUsers: ChooserUserItem[] = [
    {
      key: 'self',
      username: player.username,
      motto: player.motto,
      look: player.look,
      roleBadge: player.rank >= 5 ? 'ADM' : player.rank === 4 ? 'MOD' : player.hcDays > 0 ? 'HC' : undefined,
      isSelf: true,
    },
    ...Object.values(simRef.current.remotePlayers).map((rp) => ({
      key: `remote:${rp.sessionId}`,
      username: rp.username,
      motto: rp.motto,
      look: rp.look,
      roleBadge: rp.badge,
      isSelf: false,
      isNpc: false,
    })),
    ...roomNpcs.map((npc) => ({
      key: `npc:${npc.id}`,
      username: npc.name,
      motto: npc.motto,
      look: npc.look,
      roleBadge: npc.badge,
      isSelf: false,
      isNpc: true,
    })),
  ];

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#000000] select-none">
      {/* ISOLATED 2D ISOMETRIC GAMEPLAY CANVAS */}
      <canvas
        ref={canvasRef}
        data-testid="hotel-canvas"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onWheel={handleCanvasWheel}
        onClick={handleCanvasClick}
        className="block h-full w-full cursor-pointer"
      />

      {/* POINTER-THROUGH RETRO DARK HABBO HUD LAYER */}
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between">
        {/* TOP DARK TRANSLUCENT HABBO HUD + ROOM BANNER */}
        <div className="flex flex-col gap-1.5 p-2 sm:p-2.5">
          <div className="flex items-start justify-between gap-2">
            {/* Top-Left: Dark Translucent Room Pill + (i) Room Info Popover + Compact Tools */}
            <div className="pointer-events-auto relative flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1.5 border border-[#3a3a3a] bg-[rgba(20,20,20,0.88)] px-2.5 py-1 text-white rounded-[3px]">
                <span className="max-w-[140px] sm:max-w-[220px] truncate text-[12px] font-bold text-white">
                  {currentRoom.name}
                </span>

                <button
                  type="button"
                  data-testid="room-info-btn"
                  aria-label="Room Info"
                  aria-expanded={showRoomInfoPopover}
                  onClick={() => {
                    habboAudio.playWindowToggle(!showRoomInfoPopover);
                    setShowRoomInfoPopover((v) => !v);
                  }}
                  className={`flex h-5 w-5 items-center justify-center border text-[10px] font-bold cursor-pointer rounded-[2px] ${
                    showRoomInfoPopover
                      ? 'border-[#60a5fa] bg-[#245c8a] text-white'
                      : 'border-[#4a4a4a] bg-[#2a2a2a] text-[#d1d5db] hover:bg-[#3a3a3a] hover:text-white'
                  }`}
                >
                  <Info className="h-3 w-3" />
                </button>

                <span
                  data-testid="hud-live-players-count"
                  title="Live players in this room via Supabase Realtime"
                  className="inline-flex items-center gap-1 border border-[#166534] bg-[#14532d]/80 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#86efac] rounded-[2px]"
                >
                  <span className="h-1.5 w-1.5 bg-[#4ade80]" />
                  {1 + remotePlayersCount}
                </span>
              </div>

              <button
                type="button"
                data-testid="hud-moodlight-btn"
                aria-label="Room Moodlight"
                onClick={() => {
                  habboAudio.playWindowToggle(!showMoodlightModal);
                  setShowMoodlightModal((v) => !v);
                }}
                title="Room Moodlight & Floor/Wall Customizer"
                className={`flex h-7 items-center gap-1 border px-2 text-[11px] font-bold cursor-pointer rounded-[3px] ${
                  moodlight.enabled
                    ? 'border-[#60a5fa] bg-[#245c8a] text-white'
                    : 'border-[#3a3a3a] bg-[rgba(20,20,20,0.88)] text-[#e5e7eb] hover:bg-[#2a2a2a]'
                }`}
              >
                <Lightbulb className="h-3.5 w-3.5 text-[#facc15]" />
                <span className="hidden lg:inline">Moodlight</span>
              </button>

              <button
                type="button"
                data-testid="hud-trax-btn"
                aria-label="Traxmachine"
                onClick={() => {
                  habboAudio.playWindowToggle(!showTraxModal);
                  setShowTraxModal((v) => !v);
                }}
                title="PIXL Traxmachine & Jukebox"
                className={`flex h-7 items-center gap-1 border px-2 text-[11px] font-bold cursor-pointer rounded-[3px] ${
                  activeTrax !== null
                    ? 'border-[#f59e0b] bg-[#92400e] text-[#fef08a]'
                    : 'border-[#3a3a3a] bg-[rgba(20,20,20,0.88)] text-[#e5e7eb] hover:bg-[#2a2a2a]'
                }`}
              >
                <Disc className={`h-3.5 w-3.5 ${activeTrax !== null ? 'animate-spin' : 'text-[#38bdf8]'}`} />
                <span className="hidden lg:inline">
                  {activeTrax !== null ? `Trax #${activeTrax + 1}` : 'Trax'}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="flex h-7 w-7 items-center justify-center border border-[#3a3a3a] bg-[rgba(20,20,20,0.88)] text-[#e5e7eb] hover:bg-[#2a2a2a] cursor-pointer rounded-[3px]"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5 text-[#f87171]" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>

              {/* (i) Room Info Popover */}
              {showRoomInfoPopover && (
                <div
                  data-testid="room-info-popover"
                  className="absolute top-9 left-0 z-30 w-64 border border-[#4a4a4a] bg-[rgba(20,20,20,0.95)] p-2.5 text-white rounded-[3px]"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-[#3a3a3a] pb-1.5">
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-white truncate">{currentRoom.name}</p>
                      <p className="text-[10px] text-[#9ca3af]">
                        Owner:{' '}
                        <strong className="text-[#fde047]">
                          {currentRoom.owner === 'PixelGuest' ? player.username : currentRoom.owner}
                        </strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRoomInfoPopover(false)}
                      aria-label="Close room info"
                      className="text-[#9ca3af] hover:text-white cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-[#d1d5db]">
                    {currentRoom.description || 'Welcome to PIXL Hotel!'}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#3a3a3a] pt-2">
                    <span className="font-mono-num text-[10px] text-[#86efac]">
                      {1 + remotePlayersCount} in room · Drag to pan, wheel to zoom
                    </span>
                    <button
                      type="button"
                      data-testid="like-room-btn"
                      disabled={hasLikedCurrentRoom}
                      onClick={() => {
                        habboAudio.playCoinsPurchase();
                        setLikedRooms((prev) => ({ ...prev, [currentRoom.id]: true }));
                        setRoomLikes((prev) => ({
                          ...prev,
                          [currentRoom.id]: (prev[currentRoom.id] ?? 24) + 1,
                        }));
                        showToast(`You liked ${currentRoom.name}! (+1 Room Rating)`);
                      }}
                      title="Like this room"
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono-num text-[10px] font-bold rounded-[2px] ${
                        hasLikedCurrentRoom
                          ? 'border-[#b91c1c] bg-[#7f1d1d] text-[#fecaca] cursor-default'
                          : 'border-[#4a4a4a] bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] cursor-pointer'
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3 text-[#f87171]" />
                      {currentRoomLikes}
                    </button>
                  </div>
                  {(canModerateRoom ||
                    currentRoom.owner.toLowerCase() === player.username.toLowerCase()) && (
                    <button
                      type="button"
                      data-testid="room-settings-btn"
                      onClick={() => {
                        habboAudio.playWindowToggle(true);
                        setShowRoomInfoPopover(false);
                        setShowRoomSettingsModal(true);
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 border border-[#000000] bg-[#2b6ca3] py-1 text-[11px] font-bold text-white hover:bg-[#3582c4] rounded-[2px] cursor-pointer"
                    >
                      <Settings className="h-3 w-3 text-[#fef08a]" />
                      Room Settings
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Top-Right: Carry Item Pill + Dark Translucent Habbo Purse Strip */}
            <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
              {carryItem !== 'none' && (
                <div
                  data-testid="hud-carry-pill"
                  className="flex items-center gap-1.5 border border-[#3a3a3a] bg-[rgba(20,20,20,0.88)] px-2 py-1 text-[11px] font-bold text-white rounded-[3px]"
                >
                  <Coffee className="h-3.5 w-3.5 text-[#fbbf24]" />
                  <span className="hidden sm:inline">{getCarryItemDef(carryItem).name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      habboAudio.playUiClick();
                      setCarryItem('none');
                    }}
                    className="habbo-btn-red px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
                  >
                    Drop
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 border border-[#3a3a3a] bg-[rgba(20,20,20,0.88)] px-2.5 py-1 text-white rounded-[3px]">
                <div className="flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-[#fbbf24]" />
                  <span
                    className="font-mono-num text-[11px] font-bold text-white"
                    data-testid="hud-credits"
                  >
                    {player.credits}
                  </span>
                </div>
                <div className="h-3.5 w-px bg-[#3a3a3a]" />
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-[#c084fc]" />
                  <span
                    className="font-mono-num text-[11px] font-bold text-white"
                    data-testid="hud-duckets"
                  >
                    {player.duckets}
                  </span>
                </div>
                <div className="hidden sm:block h-3.5 w-px bg-[#3a3a3a]" />
                <div className="hidden sm:flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-[#facc15]" />
                  <span className="font-mono-num text-[11px] font-bold text-[#fde047]">
                    {player.hcDays}d HC
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* LIDO POOL QUICK TIP BANNER */}
          {isLidoRoom && (
            <div
              data-testid="lido-hint-banner"
              className="pointer-events-none mx-auto hidden sm:block border border-[#3a3a3a] bg-[rgba(20,20,20,0.88)] px-3 py-1 text-[11px] font-bold text-[#7dd3fc] rounded-[3px]"
            >
              Lido Deck: Click a Changing Booth for swimwear, or walk up the Diving Board to splash into the pool!
            </div>
          )}

          {/* BATTLE BANZAI ARENA SCOREBOARD HUD */}
          {isBanzaiRoom && (
            <div
              data-testid="banzai-hud"
              className="pointer-events-auto mx-auto flex max-w-full flex-wrap items-center justify-center gap-2 border-2 border-[#22d3ee] bg-[#0f172a] px-3 py-1.5 text-white rounded-[2px]"
            >
              <div className="flex items-center gap-1.5 font-pixel text-[10px] text-[#22d3ee]">
                <Gamepad2 className="h-3.5 w-3.5" />
                BATTLE BANZAI
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono-num text-[11px] font-bold">
                <span className="border border-[#60a5fa] bg-[#1d4ed8] px-2 py-0.5 text-white">
                  Blue (You): {banzaiHud.scores.blue}
                </span>
                <span className="border border-[#f87171] bg-[#b91c1c] px-2 py-0.5 text-white">
                  Red: {banzaiHud.scores.red}
                </span>
                <span className="border border-[#fef08a] bg-[#a16207] px-2 py-0.5 text-white">
                  Yellow: {banzaiHud.scores.yellow}
                </span>
              </div>

              <span className="border border-[#475569] bg-[#1e293b] px-2 py-0.5 font-mono-num text-[11px] font-bold text-[#fde047]">
                {banzaiHud.timeLeft}s
              </span>

              {!banzaiHud.active && (
                <button
                  type="button"
                  data-testid="banzai-start-btn"
                  onClick={handleStartBanzaiMatch}
                  className="habbo-btn-green px-2.5 py-0.5 text-[11px] font-bold cursor-pointer"
                >
                  Start 60s Match
                </button>
              )}

              {banzaiHud.resultSummary && (
                <p className="w-full text-center text-[11px] font-bold text-[#fde047]">
                  {banzaiHud.resultSummary}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {statusToast && (
          <div
            role="status"
            className="pointer-events-none fixed top-16 left-1/2 z-30 -translate-x-1/2 border border-black bg-[#fef08a] px-3.5 py-1 text-[11px] font-bold text-[#111827] rounded-[2px]"
          >
            {statusToast}
          </div>
        )}

        {/* CLASSIC HABBO AVATAR INFO-STAND */}
        {liveInfoTarget && (
          <AvatarInfoStand
            target={liveInfoTarget}
            customBadges={customBadges}
            respectRemaining={respectLeft}
            canModerateRoom={canModerateRoom}
            onClose={() => setInfoTarget(null)}
            onSaveMotto={(nextMotto) => {
              onSaveMotto?.(nextMotto);
              habboAudio.playCoinsPurchase();
              showToast('Motto updated!');
            }}
            onOpenWardrobe={() => {
              habboAudio.playWindowToggle(true);
              setShowWardrobeModal(true);
            }}
            onOpenBadges={() => {
              habboAudio.playWindowToggle(true);
              setInventoryTab('badges');
              setShowInventory(true);
            }}
            onSelfPose={(pose) => triggerAction(pose)}
            onFriendAction={(action) => {
              const targetProfile =
                directory.find((d) => d.id === liveInfoTarget.key) ?? {
                  id: liveInfoTarget.key,
                  name: liveInfoTarget.username,
                  motto: liveInfoTarget.motto,
                  look: liveInfoTarget.look,
                  badges: liveInfoTarget.badges,
                  roleBadge: liveInfoTarget.roleBadge,
                  roleLabel: liveInfoTarget.roleLabel ?? 'Citizen',
                  online: true,
                };
              if (onFriendAction) {
                const mapped =
                  action === 'add'
                    ? 'send_request'
                    : action === 'accept'
                    ? 'accept_request'
                    : 'remove';
                onFriendAction(targetProfile, mapped);
              } else {
                onToggleFriend(targetProfile.id);
              }
              habboAudio.playCoinsPurchase();
              showToast(
                action === 'add'
                  ? `Friend request sent to ${liveInfoTarget.username}!`
                  : action === 'accept'
                  ? `${liveInfoTarget.username} is now your friend!`
                  : `Removed ${liveInfoTarget.username} from Friends.`
              );
            }}
            onWhisper={(username) => {
              habboAudio.playUiClick();
              setChatMode('whisper');
              setChatText(`@${username} `);
              chatInputRef.current?.focus();
            }}
            onTrade={(username) => {
              habboAudio.playWindowToggle(true);
              const existingNpc = roomNpcs.find((n) => n.name === username);
              setTradingPartner(
                existingNpc ?? {
                  id: liveInfoTarget.key,
                  name: liveInfoTarget.username,
                  motto: liveInfoTarget.motto,
                  role: 'guest',
                  roomId: currentRoom.id,
                  look: liveInfoTarget.look,
                  x: 0,
                  y: 0,
                  dir: 0,
                  pose: 'stand',
                  chatLines: ['Ready to trade!'],
                  badge: liveInfoTarget.roleBadge,
                  badges: liveInfoTarget.badges,
                }
              );
              setInfoTarget(null);
            }}
            onGiveRespect={(t) => handleGiveRespect(t)}
            onKickUser={(username) => {
              habboAudio.playFurniPickup();
              roomChannelRef.current
                ?.send({
                  type: 'broadcast',
                  event: 'room:kick',
                  payload: { targetUsername: username, kickedBy: player.username },
                })
                .catch(() => {});
              showToast(`Kicked ${username} from ${currentRoom.name}.`);
              setInfoTarget(null);
            }}
            onToggleRoomRights={(username) => {
              const granted = onToggleRoomRights?.(currentRoom.id, username);
              habboAudio.playCoinsPurchase();
              showToast(
                granted
                  ? `Gave Room Rights to ${username}!`
                  : `Removed Room Rights from ${username}.`
              );
            }}
            onSelectBadge={(bId) => setInspectedBadgeId(bId)}
          />
        )}

        {/* CLASSIC HABBO FURNI INFO-STAND */}
        {!liveInfoTarget && selectedPlacedObj && (
          <FurniInfoStand
            furni={selectedPlacedObj}
            canModify={canEditRoom}
            isMoving={movingFurniUid === selectedPlacedObj.uid}
            playerUsername={player.username}
            onClose={() => {
              setSelectedFurniUid(null);
              setMovingFurniUid(null);
            }}
            onUse={(uid) => {
              const target = currentFurni.find((f) => f.uid === uid);
              if (target) handleUseFurni(target);
            }}
            onRotate={(uid) => {
              habboAudio.playFurniRotate();
              onRotateFurni(currentRoom.id, uid);
            }}
            onStartMove={(uid) => {
              habboAudio.playUiClick();
              setPlacingFurniId(null);
              setMovingFurniUid((prev) => (prev === uid ? null : uid));
              showToast('Click any open floor tile or table surface to move this furni!');
            }}
            onPickup={(uid) => {
              habboAudio.playFurniPickup();
              onPickupFurni(currentRoom.id, uid);
              setSelectedFurniUid(null);
              setMovingFurniUid(null);
            }}
            onSaveStickyNote={(uid, note) => {
              habboAudio.playCoinsPurchase();
              onUpdateStickyNote?.(currentRoom.id, uid, note);
              showToast('Sticky Note saved!');
            }}
          />
        )}

        {/* PET INFO & CARE CARD */}
        {activePet && (
          <div
            data-testid="pet-info-card"
            className="pointer-events-auto fixed bottom-16 right-3 z-30 w-72 max-w-[calc(100vw-1.5rem)] client-window overflow-hidden"
          >
            <div
              className="client-window-bar flex items-center justify-between px-2.5 py-1.5"
              style={{ background: 'linear-gradient(180deg, #f58220 0%, #c85808 100%)' }}
            >
              <span className="inline-flex items-center gap-1.5 font-pixel text-[11px]">
                <PawPrint className="h-3.5 w-3.5" />
                {activePet.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPetId(null)}
                aria-label="Close pet info card"
                className="client-close-btn"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="p-2.5 space-y-2.5 bg-[#ececec]">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center border border-[#b45309] bg-[#fefce8] shrink-0 rounded-[2px]">
                  <PixelPetCanvas species={activePet.species} dir={0} anim="stand" size={54} />
                </div>
                <div className="min-w-0 flex-1 space-y-1 text-[11px]">
                  <p className="font-bold text-[#111827]">{getPetDef(activePet.species).name}</p>
                  <p className="text-[10px] text-[#4b5563]">Owner: {activePet.owner}</p>
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#374151]">
                      <span className="inline-flex items-center gap-1">
                        <Utensils className="h-3 w-3 text-[#d97706]" /> Hunger
                      </span>
                      <span className="font-mono-num">{activePet.hunger}%</span>
                    </div>
                    <div className="h-1.5 w-full border border-[#8f8f8f] bg-white overflow-hidden">
                      <div className="h-full bg-[#f59e0b]" style={{ width: `${activePet.hunger}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#374151]">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3 text-[#e11d48]" /> Happiness
                      </span>
                      <span className="font-mono-num">{activePet.happiness}%</span>
                    </div>
                    <div className="h-1.5 w-full border border-[#8f8f8f] bg-white overflow-hidden">
                      <div className="h-full bg-[#22c55e]" style={{ width: `${activePet.happiness}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {(['sit', 'lay', 'jump', 'speak'] as const).map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() =>
                      triggerPetCommand(activePet, cmd, getPetDef(activePet.species).reactionLine)
                    }
                    className="habbo-btn-silver py-1 text-[10px] font-bold capitalize cursor-pointer"
                  >
                    {cmd}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    habboAudio.playCoinsPurchase();
                    onCarePet(activePet.id, 'feed');
                    showToast(`Fed ${activePet.name} a crunchy PIXL treat!`);
                  }}
                  className="habbo-btn-green py-1 text-[10px] font-bold cursor-pointer"
                >
                  Feed
                </button>
              </div>
              <p className="text-[10px] text-[#4b5563]">
                Chat tricks:{' '}
                <strong className="font-mono-num">sit / sitz, lay / platz, jump / spring, speak</strong>
              </p>
            </div>
          </div>
        )}



        {/* AUTHENTIC 2008-2010 SLEEK #1B1B1B HABBO BOTTOM DOCK */}
        <div className="pointer-events-auto relative w-full border-t border-[#3a3a3a] bg-[#1b1b1b] px-2 py-1.5 sm:h-[46px] sm:py-0">
          {/* Compact Avatar Actions & Commands Popover above dock */}
          {showActionsPopover && (
            <div
              data-testid="actions-popover"
              className="absolute bottom-[52px] left-2 sm:left-auto sm:right-4 z-30 w-64 border border-[#4a4a4a] bg-[rgba(20,20,20,0.95)] p-2.5 text-white rounded-[3px]"
            >
              <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-1.5 mb-2">
                <span className="text-[11px] font-bold text-[#fde047]">Avatar Actions &amp; Style</span>
                <button
                  type="button"
                  onClick={() => setShowActionsPopover(false)}
                  aria-label="Close actions menu"
                  className="text-[#9ca3af] hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerAction('wave');
                    setShowActionsPopover(false);
                  }}
                  className={`habbo-dock-btn justify-center ${
                    playerPoseUI === 'wave' ? 'habbo-dock-btn-active' : ''
                  }`}
                >
                  <Hand className="h-3.5 w-3.5" />
                  <span>Wave</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerAction('dance');
                    setShowActionsPopover(false);
                  }}
                  className={`habbo-dock-btn justify-center ${
                    playerPoseUI === 'dance' ? 'habbo-dock-btn-active' : ''
                  }`}
                >
                  <Music className="h-3.5 w-3.5" />
                  <span>Dance</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerAction('sit');
                    setShowActionsPopover(false);
                  }}
                  className={`habbo-dock-btn justify-center ${
                    playerPoseUI === 'sit' ? 'habbo-dock-btn-active' : ''
                  }`}
                >
                  <span>Sit</span>
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="hud-commands-btn"
                  onClick={() => {
                    habboAudio.playWindowToggle(true);
                    setCommandsSubTab('commands');
                    setShowCommandsModal(true);
                    setShowActionsPopover(false);
                  }}
                  className="habbo-dock-btn flex-1 justify-center"
                >
                  <Terminal className="h-3.5 w-3.5 text-[#5eead4]" />
                  <span>:commands &amp; :furni</span>
                </button>
              </div>
              <div className="mt-2">
                <label
                  htmlFor="hud-bubble-style"
                  className="block text-[10px] font-bold text-[#9ca3af] mb-1"
                >
                  Speech Bubble Style
                </label>
                <select
                  id="hud-bubble-style"
                  aria-label="Speech bubble style"
                  data-testid="chat-bubble-style-select"
                  value={bubbleStyle}
                  onChange={(e) => setBubbleStyle(e.target.value as ChatBubbleStyle)}
                  className="w-full border border-[#4a4a4a] bg-[#2b2b2b] px-2 py-1 text-[11px] font-bold text-white rounded-[2px] cursor-pointer"
                >
                  {CHAT_BUBBLE_STYLES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mx-auto flex h-full max-w-7xl flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            {/* Left Retro Square Icon Rail */}
            <div className="flex items-center justify-between sm:justify-start gap-1 shrink-0 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="back-to-cms"
                  onClick={onBackToCms}
                  title="Return to Hotel View (CMS)"
                  aria-label="Hotel View"
                  className="habbo-dock-btn px-2 py-1"
                >
                  <Home className="h-3.5 w-3.5 text-[#60a5fa]" />
                  <span className="hidden md:inline">Hotel</span>
                </button>
                <button
                  type="button"
                  data-testid="hud-navigator-btn"
                  onClick={() => {
                    habboAudio.playWindowToggle(!showNavigator);
                    setShowNavigator((v) => !v);
                  }}
                  title="Navigator"
                  aria-label="Navigator"
                  className={`habbo-dock-btn px-2 py-1 ${showNavigator ? 'habbo-dock-btn-active' : ''}`}
                >
                  <DoorOpen className="h-3.5 w-3.5 text-[#86efac]" />
                  <span className="hidden sm:inline">Navigator</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    habboAudio.playWindowToggle(!showCatalogue);
                    setShowCatalogue((v) => !v);
                  }}
                  title="Shop / Catalogue"
                  aria-label="Shop"
                  className={`habbo-dock-btn px-2 py-1 ${showCatalogue ? 'habbo-dock-btn-active' : ''}`}
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-[#fde047]" />
                  <span className="hidden sm:inline">Shop</span>
                </button>
                <button
                  type="button"
                  data-testid="hud-wardrobe-btn"
                  onClick={() => {
                    habboAudio.playWindowToggle(!showWardrobeModal);
                    setShowWardrobeModal((v) => !v);
                  }}
                  title="Me / Change Looks"
                  aria-label="Me / Change Looks"
                  className={`habbo-dock-btn px-2 py-1 ${showWardrobeModal ? 'habbo-dock-btn-active' : ''}`}
                >
                  <User className="h-3.5 w-3.5 text-[#f9a8d4]" />
                  <span className="hidden lg:inline">Looks</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    habboAudio.playWindowToggle(!showInventory);
                    setInventoryTab('furni');
                    setShowInventory((v) => !v);
                    setPlacingFurniId(null);
                  }}
                  title="Inventory"
                  aria-label="Inventory"
                  className={`habbo-dock-btn px-2 py-1 ${showInventory ? 'habbo-dock-btn-active' : ''}`}
                >
                  <Package className="h-3.5 w-3.5 text-[#7dd3fc]" />
                  <span className="hidden sm:inline">Inventory</span>
                </button>
                <button
                  type="button"
                  data-testid="hud-console-btn"
                  onClick={() => {
                    habboAudio.playWindowToggle(!showFriendsConsole);
                    setShowFriendsConsole((v) => !v);
                    onClearUnreadPms?.();
                  }}
                  title="Console / Friends & Messages"
                  aria-label="Console"
                  className={`habbo-dock-btn px-2 py-1 relative ${
                    unreadPmCount > 0
                      ? 'animate-pulse border-[#f97316] bg-[#ea580c] text-white'
                      : showFriendsConsole
                      ? 'habbo-dock-btn-active'
                      : ''
                  }`}
                >
                  <Smile
                    className={`h-3.5 w-3.5 ${
                      unreadPmCount > 0 ? 'text-white' : 'text-[#facc15]'
                    }`}
                  />
                  <span className="hidden md:inline">Console</span>
                  {unreadPmCount > 0 && (
                    <span className="ml-0.5 rounded-[2px] bg-[#000000] px-1 text-[9px] font-bold text-[#fde047]">
                      {unreadPmCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  data-testid="hud-actions-btn"
                  onClick={() => {
                    habboAudio.playWindowToggle(!showActionsPopover);
                    setShowActionsPopover((v) => !v);
                  }}
                  title="Avatar Actions & :commands"
                  aria-label="Avatar Actions"
                  className={`habbo-dock-btn px-2 py-1 ${
                    showActionsPopover ? 'habbo-dock-btn-active' : ''
                  }`}
                >
                  <Hand className="h-3.5 w-3.5 text-[#5eead4]" />
                  <span className="hidden lg:inline">Actions</span>
                </button>
                {canModerateRoom && (
                  <button
                    type="button"
                    onClick={() => {
                      habboAudio.playWindowToggle(!showAdminTools);
                      setShowAdminTools((v) => !v);
                    }}
                    title="Staff Room Admin"
                    aria-label="Admin Tools"
                    className="habbo-btn-red inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold cursor-pointer"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-[#fde047]" />
                    <span className="hidden lg:inline">Admin</span>
                  </button>
                )}
              </div>
            </div>

            {/* Center Sleek Pill Chat Input */}
            <form
              onSubmit={handleSendChat}
              className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-[#4a4a4a] bg-[#2b2b2b] px-1.5 py-0.5 sm:max-w-xl"
            >
              <button
                type="button"
                data-testid="chat-mode-select"
                onClick={() => {
                  habboAudio.playUiClick();
                  setChatMode((prev) =>
                    prev === 'say' ? 'shout' : prev === 'shout' ? 'whisper' : 'say'
                  );
                }}
                title="Cycle Say / Shout / Whisper"
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold cursor-pointer shrink-0 ${
                  chatMode === 'shout'
                    ? 'bg-[#d97706] text-white'
                    : chatMode === 'whisper'
                    ? 'bg-[#4b5563] text-[#e5e7eb]'
                    : 'bg-[#3a3a3a] text-[#e5e7eb] hover:bg-[#4a4a4a]'
                }`}
              >
                {chatMode === 'shout' ? 'Shout' : chatMode === 'whisper' ? 'Whisper' : 'Say'}
              </button>

              <label htmlFor="hotel-chat-input" className="sr-only">
                Chat message
              </label>
              <input
                id="hotel-chat-input"
                ref={chatInputRef}
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                maxLength={96}
                placeholder="Click here to chat or type :commands, sit..."
                className="min-w-0 flex-1 bg-transparent px-2 py-1 text-[11px] font-semibold text-white placeholder-[#9ca3af] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Send chat message"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3d8b18] text-white hover:bg-[#4ea822] cursor-pointer shrink-0"
              >
                <Send className="h-3 w-3" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* HOTEL-WIDE STAFF BROADCAST ALERT MODAL */}
      {hotelAlert && (
        <div
          className="pointer-events-auto fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4"
          data-testid="hotel-alert-modal"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="client-window w-full max-w-md overflow-hidden">
            <div
              className="client-window-bar flex items-center justify-between px-3 py-1.5"
              style={{ background: 'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)' }}
            >
              <span className="inline-flex items-center gap-1.5 font-pixel text-[11px] text-[#fef08a]">
                <Bell className="h-3.5 w-3.5" />
                {hotelAlert.title || 'Message from Hotel Management'}
              </span>
              <button
                type="button"
                onClick={() => onDismissHotelAlert?.()}
                aria-label="Dismiss Hotel Alert"
                className="client-close-btn"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="p-4 space-y-3 bg-[#ececec]">
              <div className="border border-[#8f8f8f] bg-white p-3 text-[12px] font-bold text-[#111827] rounded-[2px]">
                {hotelAlert.message}
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-[#4b5563]">
                <span>Sent by: {hotelAlert.sender}</span>
                <button
                  type="button"
                  onClick={() => onDismissHotelAlert?.()}
                  className="habbo-btn-blue px-4 py-1 text-[11px] font-bold cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME MODALS */}
      {showMoodlightModal && (
        <MoodlightModal
          moodlight={moodlight}
          floorTheme={currentRoom.floorTheme}
          wallTheme={currentRoom.wallTheme}
          onChangeMoodlight={(next) => {
            habboAudio.playUiClick();
            setMoodlight(next);
          }}
          onChangeFloorTheme={(theme) => {
            habboAudio.playUiClick();
            setFloorThemeOverride((prev) => ({ ...prev, [currentRoom.id]: theme }));
          }}
          onChangeWallTheme={(theme) => {
            habboAudio.playUiClick();
            setWallThemeOverride((prev) => ({ ...prev, [currentRoom.id]: theme }));
          }}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowMoodlightModal(false);
          }}
        />
      )}

      {showTraxModal && (
        <TraxmachineModal
          activeTrack={activeTrax}
          onSelectTrack={handleSelectTrax}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowTraxModal(false);
          }}
        />
      )}

      {showCommandsModal && (
        <CommandsAndFurniModal
          activeSubTab={commandsSubTab}
          onChangeSubTab={setCommandsSubTab}
          carryItem={carryItem}
          moonwalk={moonwalk}
          placedFurni={currentFurni}
          canEditRoom={canEditRoom}
          onRunCommand={(cmdText) => {
            executeChatOrCommand(cmdText);
          }}
          onSelectCarryItem={(item) => {
            habboAudio.playUiClick();
            setCarryItem(item);
            showToast(
              item === 'none'
                ? 'Hands cleared.'
                : `Equipped ${getCarryItemDef(item).name} in hand!`
            );
          }}
          onToggleFurni={(uid, nextState) => {
            habboAudio.playUiClick();
            onToggleFurniState(currentRoom.id, uid, nextState);
          }}
          onRotateFurni={(uid) => {
            habboAudio.playFurniRotate();
            onRotateFurni(currentRoom.id, uid);
          }}
          onPickupFurni={(uid) => {
            habboAudio.playFurniPickup();
            onPickupFurni(currentRoom.id, uid);
          }}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowCommandsModal(false);
          }}
        />
      )}

      {showNavigator && (
        <RoomNavigatorModal
          rooms={rooms}
          currentRoomId={currentRoom.id}
          playerUsername={player.username}
          onSelectRoom={(rid) => {
            requestSwitchRoom(rid);
          }}
          onCreateRoom={onCreateRoom}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowNavigator(false);
          }}
        />
      )}

      {showCatalogue && (
        <CatalogueModal
          player={player}
          catalogPages={catalogPages}
          catalogItems={catalogItems}
          onBuy={(id, qty, engravingMessage) => {
            const res = onBuyCatalogueItem(id, qty, engravingMessage);
            if (res.ok) habboAudio.playCoinsPurchase();
            else habboAudio.playError();
            return res;
          }}
          onBuyPet={(species, customName) => {
            const res = onBuyPet(species, customName);
            if (res.ok) habboAudio.playCoinsPurchase();
            else habboAudio.playError();
            return res;
          }}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowCatalogue(false);
          }}
        />
      )}

      {showInventory && (
        <InventoryDock
          player={player}
          inventory={player.inventory}
          placingFurniId={placingFurniId}
          selectedPlaced={selectedPlacedObj}
          canEditRoom={canEditRoom}
          pets={player.pets}
          currentRoomId={currentRoom.id}
          customBadges={customBadges}
          initialTab={inventoryTab}
          onSummonPets={() => {
            habboAudio.playUiClick();
            onSummonPetsToRoom(currentRoom.id);
            showToast('Your pets rushed into the room!');
          }}
          onSelectForPlacement={(id) => {
            habboAudio.playUiClick();
            setMovingFurniUid(null);
            setPlacingFurniId(id);
            setSelectedFurniUid(null);
          }}
          onRotateSelected={() => {
            if (!selectedFurniUid) return;
            habboAudio.playFurniRotate();
            onRotateFurni(currentRoom.id, selectedFurniUid);
          }}
          onPickupSelected={() => {
            if (!selectedFurniUid) return;
            habboAudio.playFurniPickup();
            onPickupFurni(currentRoom.id, selectedFurniUid);
            setSelectedFurniUid(null);
          }}
          onEquipBadge={onEquipBadge}
          onInspectBadge={(badgeId) => setInspectedBadgeId(badgeId)}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowInventory(false);
            setPlacingFurniId(null);
            setSelectedFurniUid(null);
          }}
        />
      )}

      {showAdminTools && canModerateRoom && (
        <AdminToolsPanel
          room={currentRoom}
          activeUsers={roomNpcs}
          bannedUsers={bannedRoomNpcs}
          logs={moderationState.logs}
          isAdminAccount={player.role === 'admin'}
          onKickUser={(npc) => {
            habboAudio.playFurniPickup();
            onKickUser(currentRoom.id, npc);
            showToast(`${npc.name} was kicked from ${currentRoom.name}.`);
          }}
          onBanUser={(npc) => {
            habboAudio.playError();
            onBanUser(currentRoom.id, npc);
            showToast(`${npc.name} was banned from ${currentRoom.name}.`);
          }}
          onUnbanUser={(npc) => {
            habboAudio.playCoinsPurchase();
            onUnbanUser(currentRoom.id, npc);
            showToast(`${npc.name} was unbanned.`);
          }}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowAdminTools(false);
          }}
        />
      )}

      {showFriendsConsole && (
        <FriendsConsoleModal
          player={player}
          directory={directory}
          rooms={rooms}
          customBadges={customBadges}
          pmThreads={pmThreads}
          onSendPm={(targetProfile, text) => {
            habboAudio.playChatPop('whisper');
            onSendPm?.(targetProfile, text);
          }}
          onFriendAction={onFriendAction}
          onToggleFriend={(profile) => {
            const res = onToggleFriend(profile.id);
            if (res.action === 'added') {
              habboAudio.playCoinsPurchase();
              showToast(`${profile.name} was added to your Friends list!`);
            } else {
              habboAudio.playUiClick();
              showToast(`${profile.name} was removed from Friends.`);
            }
          }}
          onFollowRoom={(rid) => {
            setShowFriendsConsole(false);
            requestSwitchRoom(rid);
          }}
          onInspectBadge={(badgeId) => setInspectedBadgeId(badgeId)}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowFriendsConsole(false);
          }}
        />
      )}

      {showWardrobeModal && (
        <WardrobeModal
          currentLook={player.look}
          isHcMember={player.hcDays > 0 || player.rank >= 4}
          onSaveLook={(nextLook) => {
            onSaveLook?.(nextLook);
            habboAudio.playCoinsPurchase();
            showToast('Your new avatar look has been saved!');
          }}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowWardrobeModal(false);
          }}
        />
      )}

      {showUserChooser && (
        <UserChooserModal
          roomName={currentRoom.name}
          users={chooserUsers}
          onSelectUser={(key) => {
            habboAudio.playUiClick();
            setSelectedFurniUid(null);
            setSelectedPetId(null);
            if (key === 'self') {
              setInfoTarget({
                key: 'self',
                username: player.username,
                motto: player.motto,
                look: player.look,
                badges: selfEquippedBadges,
                roleBadge:
                  player.rank >= 5 ? 'ADM' : player.rank === 4 ? 'MOD' : player.hcDays > 0 ? 'HC' : undefined,
                roleLabel: player.rank >= 5 ? 'Hotel Manager' : 'Citizen',
                respectCount: player.respectCount ?? 0,
                isSelf: true,
                isNpc: false,
                isStaff: player.rank >= 3,
                isFriend: false,
                requestSent: false,
                requestReceived: false,
                hasRoomRights: true,
              });
            } else if (key.startsWith('remote:')) {
              const sid = key.slice(7);
              const rp = simRef.current.remotePlayers[sid];
              if (rp) {
                const matched = directory.find(
                  (d) => d.name.toLowerCase() === rp.username.toLowerCase()
                );
                const profileId = matched?.id ?? sid;
                setInfoTarget({
                  key: profileId,
                  username: rp.username,
                  motto: matched?.motto ?? rp.motto,
                  look: matched?.look ?? rp.look,
                  badges: matched?.badges ?? rp.badges ?? ['badge_checkin'],
                  roleBadge: rp.badge,
                  roleLabel: matched?.roleLabel,
                  respectCount: matched?.respectCount ?? rp.respectCount ?? 0,
                  isSelf: false,
                  isNpc: false,
                  isStaff: rp.rank >= 3,
                  isFriend: player.friendIds.includes(profileId),
                  requestSent: (player.outgoingFriendRequests ?? []).includes(profileId),
                  requestReceived: (player.incomingFriendRequests ?? []).includes(profileId),
                  hasRoomRights: (currentRoom.roomRights ?? []).some(
                    (u) => u.toLowerCase() === rp.username.toLowerCase()
                  ),
                });
              }
            } else if (key.startsWith('npc:')) {
              const nid = key.slice(4);
              const npc = roomNpcs.find((n) => n.id === nid);
              if (npc) {
                const liveProfile = directory.find((d) => d.id === npc.id || d.npcId === npc.id);
                const npcKey = liveProfile?.id ?? npc.id;
                setInfoTarget({
                  key: npcKey,
                  username: npc.name,
                  motto: liveProfile?.motto ?? npc.motto,
                  look: liveProfile?.look ?? npc.look,
                  badges: liveProfile?.badges ?? npc.badges ?? ['badge_checkin'],
                  roleBadge: liveProfile?.roleBadge ?? npc.badge,
                  roleLabel: liveProfile?.roleLabel,
                  respectCount:
                    (liveProfile?.respectCount ?? npc.respectCount ?? 8) +
                    (npcRespectBonus[npc.id] ?? 0),
                  isSelf: false,
                  isNpc: true,
                  isStaff: npc.role === 'staff',
                  isFriend: player.friendIds.includes(npcKey),
                  requestSent: (player.outgoingFriendRequests ?? []).includes(npcKey),
                  requestReceived: (player.incomingFriendRequests ?? []).includes(npcKey),
                  hasRoomRights: false,
                });
              }
            }
          }}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowUserChooser(false);
          }}
        />
      )}

      {showRoomSettingsModal && (
        <RoomSettingsModal
          room={currentRoom}
          onSaveSettings={(patch) => {
            onUpdateRoomSettings?.(currentRoom.id, patch);
            habboAudio.playCoinsPurchase();
            showToast('Room settings saved!');
          }}
          onClose={() => {
            habboAudio.playWindowToggle(false);
            setShowRoomSettingsModal(false);
          }}
        />
      )}

      {doorbellQueue.length > 0 && (
        <DoorbellPromptModal
          guestName={doorbellQueue[0].guestName}
          roomName={
            rooms.find((r) => r.id === doorbellQueue[0].roomId)?.name ?? currentRoom.name
          }
          onAccept={() => {
            habboAudio.playCoinsPurchase();
            onAnswerDoorbell?.(doorbellQueue[0].guestName, doorbellQueue[0].roomId, true);
          }}
          onDeny={() => {
            habboAudio.playUiClick();
            onAnswerDoorbell?.(doorbellQueue[0].guestName, doorbellQueue[0].roomId, false);
          }}
        />
      )}

      {pendingRoomGate && (
        <RoomGateModal
          mode={pendingRoomGate.mode}
          room={pendingRoomGate.room}
          onSubmitPassword={(pw) => {
            if (pw === (pendingRoomGate.room.accessPassword ?? '')) {
              habboAudio.playEnterHotel();
              const targetId = pendingRoomGate.room.id;
              setPendingRoomGate(null);
              onSwitchRoom(targetId);
              return true;
            }
            habboAudio.playError();
            return false;
          }}
          onClose={() => setPendingRoomGate(null)}
        />
      )}

      {tradingPartner && (
        <TradingModal
          player={player}
          partner={tradingPartner}
          onConfirmTrade={(offeredItems, offeredCredits, receivedItems, receivedCredits) => {
            const res = onConfirmTrade(
              offeredItems,
              offeredCredits,
              receivedItems,
              receivedCredits
            );
            if (res.ok) showToast(`Trade with ${tradingPartner.name} completed!`);
            return res;
          }}
          onClose={() => setTradingPartner(null)}
        />
      )}

      {inspectedBadgeId && (
        <BadgeInfoModal
          badgeId={inspectedBadgeId}
          unlocked={player.unlockedBadges.includes(inspectedBadgeId)}
          equipped={selfEquippedBadges.includes(inspectedBadgeId)}
          customBadges={customBadges}
          onEquip={onEquipBadge}
          onClose={() => setInspectedBadgeId(null)}
        />
      )}
    </div>
  );
}

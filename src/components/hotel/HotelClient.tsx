import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  Ban,
  Coffee,
  Coins,
  Crown,
  Disc,
  DoorOpen,
  Gamepad2,
  Hand,
  Heart,
  Lightbulb,
  Music,
  Package,
  PawPrint,
  Send,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Terminal,
  ThumbsUp,
  Trophy,
  User,
  UserMinus,
  UserPlus,
  Users,
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
  type MoodlightConfig,
} from '../../game/clientFeatures';
import { findBadgeDefById } from '../../game/customBadges';
import { FURNI_CATALOGUE } from '../../game/data';
import { canPlaceFurniAt } from '../../game/economy';
import { isFriend } from '../../game/friends';
import {
  deltaToDirection,
  findPath,
  getSeatAtTile,
  gridToScreen,
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
  drawBanzaiTileOverlay,
  drawIsoFloorTile,
  drawRoomWalls,
  getAvatarHeadSprite,
  getAvatarSprite,
  getFurniSprite,
  getPetSprite,
} from '../../game/pixelSprites';
import { soundEngine } from '../../game/soundEngine';
import type {
  AvatarPose,
  BanzaiTeam,
  BanzaiTileState,
  CustomBadgeDef,
  Direction,
  HabboNPC,
  LookConfig,
  OwnedPet,
  PetAnim,
  PetSpecies,
  PlacedFurni,
  PlayerProfileRecord,
  PlayerState,
  RoomDef,
  RoomFloorTheme,
  RoomWallTheme,
  SpeechBubble,
  TradeSlotItem,
} from '../../game/types';
import {
  PixelAvatarCanvas,
  PixelBadge,
  PixelBadgeSprite,
  PixelFurniCanvas,
  PixelHeadCanvas,
  PixelPetCanvas,
} from '../PixelSpriteCanvas';
import { AdminToolsPanel } from './AdminToolsPanel';
import { CatalogueModal } from './CatalogueModal';
import {
  CommandsAndFurniModal,
  MoodlightModal,
  TraxmachineModal,
} from './ClientExtrasModals';
import { FriendsConsoleModal } from './FriendsConsoleModal';
import { InventoryDock } from './InventoryDock';
import { RoomNavigatorModal } from './RoomNavigatorModal';
import { TradingModal } from './TradingModal';

interface HotelClientProps {
  player: PlayerState;
  rooms: RoomDef[];
  roomFurniMap: Record<string, PlacedFurni[]>;
  npcs: HabboNPC[];
  customBadges?: CustomBadgeDef[];
  muted: boolean;
  onToggleMute: () => void;
  onBackToCms: () => void;
  onSwitchRoom: (roomId: string) => void;
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
  onRotateFurni: (roomId: string, uid: string) => void;
  onPickupFurni: (roomId: string, uid: string) => void;
  onToggleFurniState: (roomId: string, uid: string, nextState: number) => void;
  onUnlockBadge?: (badgeId: string) => void;
  moderationState: RoomModerationState;
  onKickUser: (roomId: string, npc: HabboNPC) => void;
  onBanUser: (roomId: string, npc: HabboNPC) => void;
  onUnbanUser: (roomId: string, npc: HabboNPC) => void;
  directory: PlayerProfileRecord[];
  onToggleFriend: (profileId: string) => { action: 'added' | 'removed' };
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

interface SelectedProfile {
  id: string;
  isSelf?: boolean;
  npc?: HabboNPC;
  name: string;
  motto: string;
  look: LookConfig;
  badge?: string;
  badges: string[];
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

const PARTICLE_POOL_SIZE = 48;

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

export function HotelClient({
  player,
  rooms,
  roomFurniMap,
  npcs,
  customBadges = [],
  muted,
  onToggleMute,
  onBackToCms,
  onSwitchRoom,
  onBuyCatalogueItem,
  onBuyPet,
  onSummonPetsToRoom,
  onCarePet,
  onConfirmTrade,
  onAwardBanzaiReward,
  onPlaceFurni,
  onRotateFurni,
  onPickupFurni,
  onToggleFurniState,
  onUnlockBadge,
  moderationState,
  onKickUser,
  onBanUser,
  onUnbanUser,
  directory,
  onToggleFriend,
}: HotelClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const [chatText, setChatText] = useState('');
  const [chatMode, setChatMode] = useState<ChatDeliveryMode>('say');
  const [bubbleStyle, setBubbleStyle] = useState<ChatBubbleStyle>('classic');

  const [showNavigator, setShowNavigator] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showFriendsConsole, setShowFriendsConsole] = useState(false);
  const [showMoodlightModal, setShowMoodlightModal] = useState(false);
  const [showTraxModal, setShowTraxModal] = useState(false);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [commandsSubTab, setCommandsSubTab] = useState<'commands' | 'furni'>('commands');

  const [placingFurniId, setPlacingFurniId] = useState<string | null>(null);
  const [selectedFurniUid, setSelectedFurniUid] = useState<string | null>(null);

  // Classic Habbo Client interactive states
  const [moodlight, setMoodlight] = useState<MoodlightConfig>(DEFAULT_MOODLIGHT);
  const [floorThemeOverride, setFloorThemeOverride] = useState<Record<string, RoomFloorTheme>>({});
  const [wallThemeOverride, setWallThemeOverride] = useState<Record<string, RoomWallTheme>>({});
  const [carryItem, setCarryItem] = useState<CarryItemId>('none');
  const [moonwalk, setMoonwalk] = useState(false);
  const [activeTrax, setActiveTrax] = useState<number | null>(null);
  const [respectLeft, setRespectLeft] = useState(3);
  const [roomLikes, setRoomLikes] = useState<Record<string, number>>({
    welcome_lounge: 42,
    club_mammoth: 68,
    battle_banzai: 55,
    my_room: 19,
  });
  const [likedRooms, setLikedRooms] = useState<Record<string, boolean>>({});

  // Interaction menus & modals
  const [avatarActionMenu, setAvatarActionMenu] = useState<SelectedProfile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null);
  const [tradingPartner, setTradingPartner] = useState<HabboNPC | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [inspectedTrophy, setInspectedTrophy] = useState<PlacedFurni | null>(null);

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
  const roomNpcs = getActiveRoomNpcs(npcs, currentRoom.id, moderationState);
  const roomPets: OwnedPet[] = (player.pets ?? []).filter((p) => p.roomId === currentRoom.id);
  const bannedIds = new Set(moderationState.bannedByRoom[currentRoom.id] ?? []);
  const bannedRoomNpcs = npcs.filter((n) => n.roomId === currentRoom.id && bannedIds.has(n.id));
  const canEditRoom = currentRoom.id === 'my_room' || player.role === 'admin' || player.rank >= 4;
  const canModerateRoom = isRoomOwnerOrAdmin(currentRoom, player);

  // Enable soundEngine only while HotelClient is mounted
  useEffect(() => {
    soundEngine.setInGame(true);
    soundEngine.playEnterHotel();
    return () => {
      soundEngine.setInGame(false);
    };
  }, []);

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
    petSims: {} as Record<string, PetSimState>,
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
    showInventory,
    canEditRoom,
    moodlight,
    carryItem,
    moonwalk,
    onAwardBanzaiReward,
  });
  latestRef.current = {
    player,
    currentRoom,
    currentFurni,
    roomNpcs,
    roomPets,
    placingFurniId,
    showInventory,
    canEditRoom,
    moodlight,
    carryItem,
    moonwalk,
    onAwardBanzaiReward,
  };

  const showToast = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast((prev) => (prev === msg ? null : prev)), 2600);
  }, []);

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
      soundEngine.playChatBlip();
    },
    []
  );

  const handleSelectTrax = useCallback(
    (trackIndex: number | null) => {
      setActiveTrax(trackIndex);
      if (trackIndex === null) {
        soundEngine.stopTrax();
        showToast('Traxmachine stopped.');
      } else {
        soundEngine.startTrax(trackIndex);
        onUnlockBadge?.('badge_dj');
        showToast(`Traxmachine spinning Track #${trackIndex + 1}!`);
      }
    },
    [onUnlockBadge, showToast]
  );

  const handleStartBanzaiMatch = useCallback(() => {
    soundEngine.playEnterHotel();
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
      setPlayerPoseUI('stand');
      setPlacingFurniId(null);
      setSelectedFurniUid(null);
      setSelectedProfile(null);
      setAvatarActionMenu(null);
      setSelectedPetId(null);
      setInspectedTrophy(null);

      // Reset Battle Banzai arena cleanly on room change
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
        setTradingPartner(null);
        setPlacingFurniId(null);
        setSelectedFurniUid(null);
        setSelectedProfile(null);
        setAvatarActionMenu(null);
        setSelectedPetId(null);
        setInspectedTrophy(null);
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

    const getZoom = (vw: number) => (vw < 640 ? 0.95 : 1.25);

    const getOrigin = (w: number, h: number, zoom: number) => ({
      originX: Math.round(w / (2 * zoom)),
      originY: Math.round(h / (2 * zoom) - 115),
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
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
        moodlight: moodCfg,
        carryItem: heldItem,
        moonwalk: isMoonwalk,
      } = latestRef.current;

      const rect = canvas.getBoundingClientRect();
      const vw = rect.width;
      const vh = rect.height;
      const zoom = getZoom(vw);
      const { originX, originY } = getOrigin(vw, vh, zoom);

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

      // Keyboard step movement
      sim.keyStepCooldown = Math.max(0, sim.keyStepCooldown - dt);
      if (sim.path.length === 0 && sim.keyStepCooldown <= 0 && sim.keysHeld.size > 0) {
        let dx = 0;
        let dy = 0;
        if (sim.keysHeld.has('ArrowUp') || sim.keysHeld.has('w')) dy -= 1;
        if (sim.keysHeld.has('ArrowDown') || sim.keysHeld.has('s')) dy += 1;
        if (sim.keysHeld.has('ArrowLeft') || sim.keysHeld.has('a')) dx -= 1;
        if (sim.keysHeld.has('ArrowRight') || sim.keysHeld.has('d')) dx += 1;
        if (dx !== 0 || dy !== 0) {
          const tx = Math.round(sim.px) + dx;
          const ty = Math.round(sim.py) + dy;
          if (isTileWalkable(room, furni, tx, ty, true)) {
            sim.path = [{ x: tx, y: ty }];
            sim.keyStepCooldown = 0.18;
          }
        }
      }

      // Advance player along A* path
      if (sim.path.length > 0) {
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
          soundEngine.playFootstep();
        }

        const moveDist = speed * dt;
        if (dist <= moveDist) {
          sim.px = target.x;
          sim.py = target.y;
          sim.path.shift();
          if (sim.path.length === 0) {
            const seat = getSeatAtTile(furni, Math.round(sim.px), Math.round(sim.py));
            if (seat) {
              sim.pose = 'sit';
              sim.dir = seat.dir;
              setPlayerPoseUI('sit');
            } else {
              sim.pose = 'stand';
              setPlayerPoseUI('stand');
            }
          }
        } else {
          sim.px += (dx / dist) * moveDist;
          sim.py += (dy / dist) * moveDist;
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
                if (isTileWalkable(room, furni, tx, ty, false)) {
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

      // Battle Banzai Arena simulation (when in battle_banzai & match active)
      const bz = banzaiRef.current;
      if (room.id === 'battle_banzai' && bz.active) {
        bz.timeLeft = Math.max(0, bz.timeLeft - dt);

        // Player tile capture
        const ptx = Math.round(sim.px);
        const pty = Math.round(sim.py);
        const pKey = `${ptx},${pty}`;
        if (pKey !== bz.lastPlayerTileKey) {
          bz.lastPlayerTileKey = pKey;
          if (isBanzaiTile(ptx, pty)) {
            const step = stepBanzaiTile(bz.tiles, ptx, pty, 'blue');
            if (step.changed) {
              bz.tiles = step.tiles;
              const pt = gridToScreen(ptx, pty, originX, originY);
              spawnParticles(pt.x, pt.y + 8, step.justLocked ? '#60a5fa' : '#93c5fd', step.justLocked ? 12 : 5);
              if (step.justLocked) soundEngine.playCreditChime();
            }
          }
        }

        // Move Red & Yellow Banzai bots across unlocked tiles
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
                    const pt = gridToScreen(bot.x, bot.y, originX, originY);
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
            showToast(resolution.summary);
          } else {
            soundEngine.playClick();
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

      // === RENDER ===
      const grad = ctx.createLinearGradient(0, 0, 0, vh);
      if (room.wallTheme === 'nightsky' || room.wallTheme === 'neon') {
        grad.addColorStop(0, '#090d1a');
        grad.addColorStop(1, '#1a2744');
      } else {
        grad.addColorStop(0, '#102033');
        grad.addColorStop(1, '#1e3a57');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, vw, vh);

      // Background-only moodlight tint (behind floor & avatars)
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

      // Draw Walls
      drawRoomWalls(ctx, room.layout, originX, originY, room.wallTheme, sim.animTick);

      // Draw Floor Tiles (+ Battle Banzai tile overlays)
      for (let y = 0; y < room.layout.length; y++) {
        const row = room.layout[y];
        for (let x = 0; x < row.length; x++) {
          if (row[x] === 'x') continue;
          const pos = gridToScreen(x, y, originX, originY);
          const isHovered = sim.hoverTile?.x === x && sim.hoverTile?.y === y;
          drawIsoFloorTile(ctx, pos.x, pos.y, x, y, room.floorTheme, isHovered);

          if (room.id === 'battle_banzai' && isBanzaiTile(x, y)) {
            const tileState = bz.tiles[banzaiTileKey(x, y)] ?? { level: 0, team: null };
            drawBanzaiTileOverlay(ctx, pos.x, pos.y, tileState, sim.animTick);
          }

          if (placingId && isHovered) {
            const valid = canPlaceFurniAt(room, furni, x, y);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y + 2);
            ctx.lineTo(pos.x + 28, pos.y + 16);
            ctx.lineTo(pos.x, pos.y + 30);
            ctx.lineTo(pos.x - 28, pos.y + 16);
            ctx.closePath();
            ctx.fillStyle = valid ? 'rgba(34, 197, 94, 0.42)' : 'rgba(239, 68, 68, 0.45)';
            ctx.fill();
            ctx.strokeStyle = valid ? '#4ade80' : '#f87171';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      // Draw walkable rugs first
      for (const item of furni) {
        const def = FURNI_CATALOGUE.find((d) => d.id === item.furniId);
        if (!def?.walkable) continue;
        const pos = gridToScreen(item.x, item.y, originX, originY);
        const sprite = getFurniSprite(item.furniId, item.dir, item.state, sim.animTick);
        ctx.drawImage(sprite, Math.round(pos.x - 36), Math.round(pos.y + 16 - 72));
      }

      // Collect depth-sorted drawables (solid furni + pets + NPCs + Banzai bots + player)
      interface DrawItem {
        depth: number;
        draw: () => void;
      }
      const drawList: DrawItem[] = [];

      for (const item of furni) {
        const def = FURNI_CATALOGUE.find((d) => d.id === item.furniId);
        if (def?.walkable) continue;
        const pos = gridToScreen(item.x, item.y, originX, originY);
        drawList.push({
          depth: item.x + item.y,
          draw: () => {
            const sprite = getFurniSprite(item.furniId, item.dir, item.state, sim.animTick);
            ctx.drawImage(sprite, Math.round(pos.x - 36), Math.round(pos.y + 16 - 72));
          },
        });
      }

      const drawNameTag = (x: number, y: number, label: string, color: string) => {
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        const tw = ctx.measureText(label).width;
        const bw = Math.ceil(tw) + 10;
        ctx.fillStyle = 'rgba(12, 18, 30, 0.78)';
        ctx.fillRect(Math.round(x - bw / 2), Math.round(y - 11), bw, 14);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(label, Math.round(x), Math.round(y - 4));
      };

      // Owned Pets roaming in current room
      for (const pet of petsInRoom) {
        const ps = sim.petSims[pet.id];
        const pxTile = ps ? ps.x : pet.x;
        const pyTile = ps ? ps.y : pet.y;
        const pDir = ps ? ps.dir : pet.dir;
        const pAnim = ps ? ps.anim : pet.anim;
        const pos = gridToScreen(pxTile, pyTile, originX, originY);
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
        const pos = gridToScreen(npc.x, npc.y, originX, originY);
        drawList.push({
          depth: npc.x + npc.y + 0.08,
          draw: () => {
            const sprite = getAvatarSprite(npc.look, npc.dir, npc.pose, sim.animTick);
            const seatOffset = npc.pose === 'sit' ? -5 : 0;
            ctx.drawImage(sprite, Math.round(pos.x - 22), Math.round(pos.y + 16 - 66 + seatOffset));
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
      if (room.id === 'battle_banzai' && bz.active) {
        for (const bot of [bz.bots.red, bz.bots.yellow]) {
          const pos = gridToScreen(bot.x, bot.y, originX, originY);
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

      // Player avatar (+ Carry Handitem rendering!)
      {
        const pos = gridToScreen(sim.px, sim.py, originX, originY);
        drawList.push({
          depth: sim.px + sim.py + 0.09,
          draw: () => {
            const sprite = getAvatarSprite(pState.look, sim.dir, sim.pose, sim.animTick);
            const seatOffset = sim.pose === 'sit' ? -5 : 0;
            ctx.drawImage(sprite, Math.round(pos.x - 22), Math.round(pos.y + 16 - 66 + seatOffset));

            // Render pixel Carry Item in avatar's hand when holding a drink/snack
            if (heldItem !== 'none') {
              const cDef = getCarryItemDef(heldItem);
              const hx = Math.round(pos.x + (sim.dir === 1 || sim.dir === 2 ? -10 : 6));
              const hy = Math.round(pos.y - 18 + seatOffset);
              ctx.fillStyle = '#1b1922';
              ctx.fillRect(hx - 1, hy - 1, 7, 9);
              ctx.fillStyle = cDef.color;
              ctx.fillRect(hx, hy, 5, 7);
              ctx.fillStyle = cDef.accentColor;
              ctx.fillRect(hx + 1, hy - 2, 3, 2);
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

      // Draw Classic Habbo Speech Bubbles rising cleanly near top of room
      const bubbleList = sim.bubbles;
      let nextBottomY = Math.max(
        96,
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
            ? '800 12px "Plus Jakarta Sans", sans-serif'
            : '600 12px "Plus Jakarta Sans", sans-serif';
        const textW = ctx.measureText(lineText).width;
        const boxW = Math.min(vw - 32, Math.max(140, Math.ceil(textW) + 52));
        const boxH = 30;
        const bx = Math.round(vw / 2 - boxW / 2);
        const by = nextBottomY - boxH;
        nextBottomY -= boxH + 6;
        if (by < 54) break;

        ctx.fillStyle = b.senderId === 'player' ? styleDef.bg : '#ffffff';
        ctx.strokeStyle =
          b.mode === 'shout'
            ? '#d97706'
            : b.senderId === 'player'
            ? styleDef.border
            : '#1b1922';
        ctx.lineWidth = b.mode === 'shout' ? 2.5 : 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 7);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = b.senderId === 'player' ? styleDef.accent : '#38bdf8';
        ctx.fillRect(bx + 3, by + 3, 26, boxH - 6);

        const head = getAvatarHeadSprite(b.look);
        ctx.drawImage(head, bx + 4, by + 2, 24, 24);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
        const namePart = `${b.senderName}: `;
        const nameW = ctx.measureText(namePart).width;
        ctx.fillStyle = b.senderId === 'player' ? styleDef.text : '#0f172a';
        ctx.fillText(namePart, bx + 36, by + boxH / 2);

        ctx.font =
          b.mode === 'whisper'
            ? 'italic 600 12px "Plus Jakarta Sans", sans-serif'
            : b.mode === 'shout'
            ? '800 12px "Plus Jakarta Sans", sans-serif'
            : '500 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = b.senderId === 'player' ? styleDef.text : '#334155';
        ctx.fillText(`${prefix}${b.text}`, bx + 36 + nameW, by + boxH / 2, boxW - 44 - nameW);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [pushBubble, showToast, spawnParticles]);

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const zoom = rect.width < 640 ? 0.95 : 1.25;
    const sx = (e.clientX - rect.left) / zoom;
    const sy = (e.clientY - rect.top) / zoom;
    const originX = Math.round(rect.width / (2 * zoom));
    const originY = Math.round(rect.height / (2 * zoom) - 115);
    const tile = screenToGrid(sx, sy, originX, originY);
    if (
      tile.y >= 0 &&
      tile.y < currentRoom.layout.length &&
      tile.x >= 0 &&
      tile.x < currentRoom.layout[tile.y].length &&
      currentRoom.layout[tile.y][tile.x] !== 'x'
    ) {
      simRef.current.hoverTile = tile;
    } else {
      simRef.current.hoverTile = null;
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const zoom = rect.width < 640 ? 0.95 : 1.25;
    const sx = (e.clientX - rect.left) / zoom;
    const sy = (e.clientY - rect.top) / zoom;
    const originX = Math.round(rect.width / (2 * zoom));
    const originY = Math.round(rect.height / (2 * zoom) - 115);
    const tile = screenToGrid(sx, sy, originX, originY);

    if (
      tile.y < 0 ||
      tile.y >= currentRoom.layout.length ||
      tile.x < 0 ||
      tile.x >= currentRoom.layout[tile.y].length ||
      currentRoom.layout[tile.y][tile.x] === 'x'
    ) {
      return;
    }

    // 1. Placing furniture from Inventory
    if (placingFurniId && canEditRoom) {
      const res = onPlaceFurni(currentRoom.id, placingFurniId, tile.x, tile.y, 0);
      if (res.ok) {
        soundEngine.playFurniPlace();
        const pt = gridToScreen(tile.x, tile.y, originX, originY);
        spawnParticles(pt.x, pt.y + 8, '#fde047', 10);
        setPlacingFurniId(null);
      } else {
        soundEngine.playError();
      }
      showToast(res.message);
      return;
    }

    // 2. Check clicked avatar (NPC -> compact action menu; Self -> profile card)
    const sim = simRef.current;
    const isHitOnSprite = (ax: number, ay: number) => {
      const pos = gridToScreen(ax, ay, originX, originY);
      return Math.abs(sx - pos.x) <= 22 && sy >= pos.y - 54 && sy <= pos.y + 18;
    };

    const clickedNpc = roomNpcs.find(
      (n) => (n.x === tile.x && n.y === tile.y) || isHitOnSprite(n.x, n.y)
    );
    if (clickedNpc) {
      soundEngine.playClick();
      const liveProfile = directory.find((d) => d.id === clickedNpc.id || d.npcId === clickedNpc.id);
      setSelectedProfile(null);
      setSelectedPetId(null);
      setInspectedTrophy(null);
      setAvatarActionMenu({
        id: clickedNpc.id,
        npc: clickedNpc,
        name: clickedNpc.name,
        motto: liveProfile?.motto ?? clickedNpc.motto,
        look: liveProfile?.look ?? clickedNpc.look,
        badge: liveProfile?.roleBadge ?? clickedNpc.badge,
        badges: liveProfile?.badges ?? clickedNpc.badges ?? ['badge_checkin'],
      });
      return;
    }

    if (
      (Math.round(sim.px) === tile.x && Math.round(sim.py) === tile.y) ||
      isHitOnSprite(sim.px, sim.py)
    ) {
      soundEngine.playClick();
      setAvatarActionMenu(null);
      setSelectedPetId(null);
      setInspectedTrophy(null);
      setSelectedProfile({
        id: 'self',
        isSelf: true,
        name: player.username,
        motto: player.motto,
        look: player.look,
        badge: player.role === 'admin' ? 'ADM' : player.hcDays > 0 ? 'HC' : undefined,
        badges: player.unlockedBadges,
      });
      return;
    }

    // 2b. Check clicked Pet
    const clickedPet = roomPets.find((pet) => {
      const ps = sim.petSims[pet.id];
      const pxTile = ps ? ps.x : pet.x;
      const pyTile = ps ? ps.y : pet.y;
      const pos = gridToScreen(pxTile, pyTile, originX, originY);
      const hitSprite = Math.abs(sx - pos.x) <= 20 && sy >= pos.y - 24 && sy <= pos.y + 20;
      return (Math.round(pxTile) === tile.x && Math.round(pyTile) === tile.y) || hitSprite;
    });
    if (clickedPet) {
      soundEngine.playClick();
      setAvatarActionMenu(null);
      setSelectedProfile(null);
      setInspectedTrophy(null);
      setSelectedPetId(clickedPet.id);
      return;
    }

    // 3. Check furniture interaction or builder selection
    const clickedFurni = currentFurni.find((f) => f.x === tile.x && f.y === tile.y);
    if (clickedFurni) {
      if (showInventory && canEditRoom) {
        soundEngine.playClick();
        setSelectedFurniUid(clickedFurni.uid);
        return;
      }

      const def = FURNI_CATALOGUE.find((d) => d.id === clickedFurni.furniId);
      if (def?.engravable) {
        soundEngine.playClick();
        setAvatarActionMenu(null);
        setSelectedProfile(null);
        setSelectedPetId(null);
        setInspectedTrophy(clickedFurni);
        return;
      }

      if (def?.id === 'holo_dice') {
        const rolled = Math.floor(Math.random() * 6) + 1;
        onToggleFurniState(currentRoom.id, clickedFurni.uid, rolled);
        soundEngine.playDiceRoll();
        const pt = gridToScreen(tile.x, tile.y, originX, originY);
        spawnParticles(pt.x, pt.y - 12, '#22d3ee', 12);
        pushBubble('player', player.username, player.look, `*rolls Holo Dice: ${rolled}!*`, {
          mode: chatMode,
          bubbleStyle,
        });
        return;
      }

      if (def?.id === 'fire_dragon') {
        const nextState = clickedFurni.state === 1 ? 0 : 1;
        onToggleFurniState(currentRoom.id, clickedFurni.uid, nextState);
        soundEngine.playDragonFlame();
        const pt = gridToScreen(tile.x, tile.y, originX, originY);
        spawnParticles(pt.x, pt.y - 16, '#f97316', 14);
        return;
      }

      if (def?.id === 'jukebox') {
        const nextState = clickedFurni.state === 1 ? 0 : 1;
        onToggleFurniState(currentRoom.id, clickedFurni.uid, nextState);
        handleSelectTrax(nextState === 1 ? 0 : null);
        setShowTraxModal(true);
        const pt = gridToScreen(tile.x, tile.y, originX, originY);
        spawnParticles(pt.x, pt.y - 18, '#ec4899', 12);
        return;
      }

      if (
        def?.id === 'fireplace' ||
        def?.id === 'amber_lamp' ||
        def?.id === 'lava_lamp' ||
        def?.id === 'golden_fountain' ||
        def?.id === 'imperial_teleporter' ||
        def?.id === 'plasma_tv' ||
        def?.id === 'arcade_cabinet' ||
        def?.id === 'mini_fridge' ||
        def?.id === 'mode_bar'
      ) {
        const nextState = clickedFurni.state === 1 ? 0 : 1;
        onToggleFurniState(currentRoom.id, clickedFurni.uid, nextState);
        soundEngine.playClick();
        const pt = gridToScreen(tile.x, tile.y, originX, originY);
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
          showToast('Grabbed an ice-cold Pixel Cola from the Mini Fridge!');
        } else if (def.id === 'mode_bar') {
          setCarryItem('coffee');
          showToast('Poured a fresh Espresso Cup from the Mode Bar!');
        } else if (def.id === 'golden_fountain') {
          setCarryItem('champagne');
          showToast('Filled a sparkling VIP Bubbly flute at the Golden Fountain!');
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
    }

    // 4. A* Pathfinding to clicked tile or sittable furniture
    const path = findPath(currentRoom, currentFurni, sim.px, sim.py, tile.x, tile.y);
    if (path.length > 0) {
      sim.path = path;
      setAvatarActionMenu(null);
      setSelectedProfile(null);
      setSelectedFurniUid(null);
      setSelectedPetId(null);
      setInspectedTrophy(null);
    }
  };

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
        const zoom = rect.width < 640 ? 0.95 : 1.25;
        const originX = Math.round(rect.width / (2 * zoom));
        const originY = Math.round(rect.height / (2 * zoom) - 115);
        const pt = gridToScreen(ps ? ps.x : pet.x, ps ? ps.y : pet.y, originX, originY);
        spawnParticles(pt.x, pt.y - 10, '#fde047', 8);
      }
      pushBubble(`pet-${pet.id}`, pet.name, player.look, reactionLine);
    },
    [onCarePet, player.look, pushBubble, spawnParticles]
  );

  const triggerAction = useCallback(
    (pose: 'wave' | 'dance' | 'sit' | 'stand') => {
      soundEngine.playClick();
      const sim = simRef.current;
      sim.path = [];
      if (pose === 'wave') {
        sim.pose = 'wave';
        sim.waveTimer = 1.6;
        setPlayerPoseUI('wave');
      } else if (pose === 'dance') {
        const next = sim.pose === 'dance' ? 'stand' : 'dance';
        sim.pose = next;
        setPlayerPoseUI(next);
        if (next === 'dance') onUnlockBadge?.('badge_dj');
      } else if (pose === 'sit') {
        const next = sim.pose === 'sit' ? 'stand' : 'sit';
        sim.pose = next;
        setPlayerPoseUI(next);
      } else {
        sim.pose = 'stand';
        setPlayerPoseUI('stand');
      }
    },
    [onUnlockBadge]
  );

  const executeChatOrCommand = useCallback(
    (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      // 1. Check classic Habbo :commands
      const parsedCmd = parseClientCommand(trimmed);
      if (parsedCmd) {
        if (parsedCmd.type === 'pose') {
          triggerAction(parsedCmd.pose === 'walk' ? 'stand' : parsedCmd.pose);
          showToast(`Executed ${trimmed} command!`);
          return;
        }
        if (parsedCmd.type === 'moonwalk') {
          setMoonwalk((prev) => {
            const next = !prev;
            showToast(next ? 'Moonwalk enabled! Walk anywhere to glide backwards.' : 'Moonwalk disabled.');
            return next;
          });
          soundEngine.playCreditChime();
          return;
        }
        if (parsedCmd.type === 'carry') {
          setCarryItem(parsedCmd.item);
          const def = getCarryItemDef(parsedCmd.item);
          soundEngine.playClick();
          showToast(
            parsedCmd.item === 'none'
              ? 'Put away carry item.'
              : `Equipped ${def.name} in hand!`
          );
          return;
        }
        if (parsedCmd.type === 'roll') {
          soundEngine.playDiceRoll();
          pushBubble(
            'player',
            player.username,
            player.look,
            `*rolls a ${parsedCmd.rolled} on the PIXL Dice!*`,
            { mode: chatMode, bubbleStyle }
          );
          return;
        }
        if (parsedCmd.type === 'furni_chooser') {
          soundEngine.playClick();
          setCommandsSubTab('furni');
          setShowCommandsModal(true);
          return;
        }
        if (parsedCmd.type === 'commands_help') {
          soundEngine.playClick();
          setCommandsSubTab('commands');
          setShowCommandsModal(true);
          return;
        }
        if (parsedCmd.type === 'moodlight_toggle') {
          soundEngine.playClick();
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
            soundEngine.playError();
            showToast('You can only :pickall in rooms you own or manage.');
            return;
          }
          const count = currentFurni.length;
          for (const item of currentFurni) {
            onPickupFurni(currentRoom.id, item.uid);
          }
          soundEngine.playFurniPickup();
          showToast(`Picked up ${count} furniture items back into your Inventory!`);
          return;
        }
      }

      // 2. Normal speech / shout / whisper
      pushBubble('player', player.username, player.look, trimmed, {
        mode: chatMode,
        bubbleStyle,
      });
      onUnlockBadge?.('badge_social');

      // 3. Check Pet Chat Commands (sit, lay, jump, speak, sitz, platz, spring)
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

      // 4. Friendly contextual NPC response
      if (!matchedPetCommand && roomNpcs.length > 0) {
        const responder = roomNpcs[Math.floor(Math.random() * roomNpcs.length)];
        const lower = trimmed.toLowerCase();
        let reply = responder.chatLines[Math.floor(Math.random() * responder.chatLines.length)];
        if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
          reply = `Hey ${player.username}! Awesome look you're rocking today!`;
        } else if (lower.includes('dance')) {
          reply = `Let's groove! Hit the Dance button or type :dance!`;
        } else if (lower.includes('dragon') || lower.includes('rare')) {
          reply = `Rares are looking sharp! Have you checked Rare Values on the CMS?`;
        } else if (lower.includes('trade')) {
          reply = `Up for a swap? Tap any PIXL citizen and choose Trade!`;
        }
        setTimeout(() => {
          if (simRef.current.roomId === currentRoom.id) {
            pushBubble(responder.id, responder.name, responder.look, reply);
          }
        }, 900);
      }
    },
    [
      bubbleStyle,
      canEditRoom,
      chatMode,
      currentFurni,
      currentRoom.id,
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

  const handleGiveRespect = (targetName: string, targetNpc?: HabboNPC) => {
    if (respectLeft <= 0) {
      soundEngine.playError();
      showToast('You have used all 3 Daily Respect points for today!');
      return;
    }
    const nextLeft = respectLeft - 1;
    setRespectLeft(nextLeft);
    soundEngine.playRespectFanfare();
    onUnlockBadge?.('badge_social');
    pushBubble(
      'player',
      player.username,
      player.look,
      `*gives respect to ${targetName}! ♥ (${nextLeft} left today)*`,
      { mode: 'shout', bubbleStyle: 'gold' }
    );
    if (targetNpc) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const zoom = rect.width < 640 ? 0.95 : 1.25;
        const originX = Math.round(rect.width / (2 * zoom));
        const originY = Math.round(rect.height / (2 * zoom) - 115);
        const pt = gridToScreen(targetNpc.x, targetNpc.y, originX, originY);
        spawnParticles(pt.x, pt.y - 30, '#f43f5e', 16);
      }
      setTimeout(() => {
        if (simRef.current.roomId === currentRoom.id) {
          pushBubble(
            targetNpc.id,
            targetNpc.name,
            targetNpc.look,
            `Thanks for the respect, ${player.username}! ♥`
          );
        }
      }, 450);
    }
    showToast(`Gave respect to ${targetName}! (${nextLeft} daily respect left)`);
  };

  const selectedPlacedObj = selectedFurniUid
    ? currentFurni.find((f) => f.uid === selectedFurniUid) ?? null
    : null;
  const activePet = selectedPetId ? roomPets.find((p) => p.id === selectedPetId) ?? null : null;
  const currentRoomLikes = roomLikes[currentRoom.id] ?? 24;
  const hasLikedCurrentRoom = Boolean(likedRooms[currentRoom.id]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0d1926] select-none">
      {/* ISOLATED 2D ISOMETRIC GAMEPLAY CANVAS */}
      <canvas
        ref={canvasRef}
        data-testid="hotel-canvas"
        onPointerMove={handleCanvasPointerMove}
        onClick={handleCanvasClick}
        className="block h-full w-full cursor-pointer"
      />

      {/* POINTER-THROUGH HUD LAYER */}
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4">
        {/* TOP HUD BAR + BATTLE BANZAI HUD GROUPED AT TOP */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
            {/* Top-Left: Web CMS Button + Room Title & Rating + Moodlight + Trax + Mute */}
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                data-testid="back-to-cms"
                onClick={() => {
                  onBackToCms();
                }}
                className="habbo-btn-blue inline-flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-2 text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Web CMS
              </button>

              <div className="client-window flex items-center gap-2.5 px-2.5 py-1.5">
                <div>
                  <p className="font-pixel text-xs text-slate-900 leading-tight">{currentRoom.name}</p>
                  <p className="text-[10px] font-semibold text-slate-600">
                    Owner: {currentRoom.owner === 'PixelGuest' ? player.username : currentRoom.owner}
                  </p>
                </div>

                {/* Room Like / Rating Button */}
                <button
                  type="button"
                  data-testid="like-room-btn"
                  disabled={hasLikedCurrentRoom}
                  onClick={() => {
                    soundEngine.playCreditChime();
                    setLikedRooms((prev) => ({ ...prev, [currentRoom.id]: true }));
                    setRoomLikes((prev) => ({
                      ...prev,
                      [currentRoom.id]: (prev[currentRoom.id] ?? 24) + 1,
                    }));
                    showToast(`You liked ${currentRoom.name}! (+1 Room Rating)`);
                  }}
                  title="Like this room"
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-mono-num text-[11px] font-extrabold ${
                    hasLikedCurrentRoom
                      ? 'border-rose-300 bg-rose-50 text-rose-700 cursor-default'
                      : 'border-stone-400 bg-white text-slate-800 hover:bg-amber-50 cursor-pointer'
                  }`}
                >
                  <ThumbsUp className="h-3 w-3 text-rose-600" />
                  {currentRoomLikes}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowNavigator((v) => !v);
                  }}
                  className="habbo-btn-green inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                >
                  <DoorOpen className="h-3.5 w-3.5" />
                  Rooms
                </button>
              </div>

              {/* Moodlight / Room Dimmer Button */}
              <button
                type="button"
                data-testid="hud-moodlight-btn"
                onClick={() => {
                  soundEngine.playClick();
                  setShowMoodlightModal((v) => !v);
                }}
                title="Room Moodlight & Floor/Wall Customizer"
                className={`client-window inline-flex h-9 items-center gap-1.5 px-2.5 text-xs font-extrabold cursor-pointer ${
                  moodlight.enabled ? 'bg-indigo-100 text-indigo-950' : 'text-slate-800 hover:bg-white'
                }`}
              >
                <Lightbulb
                  className={`h-4 w-4 ${moodlight.enabled ? 'text-amber-500' : 'text-slate-700'}`}
                />
                <span className="hidden md:inline">Moodlight</span>
              </button>

              {/* Traxmachine / Jukebox Button */}
              <button
                type="button"
                data-testid="hud-trax-btn"
                onClick={() => {
                  soundEngine.playClick();
                  setShowTraxModal((v) => !v);
                }}
                title="PIXL Traxmachine & Jukebox"
                className={`client-window inline-flex h-9 items-center gap-1.5 px-2.5 text-xs font-extrabold cursor-pointer ${
                  activeTrax !== null ? 'bg-pink-100 text-pink-950' : 'text-slate-800 hover:bg-white'
                }`}
              >
                <Disc
                  className={`h-4 w-4 ${
                    activeTrax !== null ? 'text-pink-600 animate-spin' : 'text-slate-700'
                  }`}
                />
                <span className="hidden md:inline">
                  {activeTrax !== null ? `Trax #${activeTrax + 1}` : 'Trax'}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="client-window flex h-9 w-9 items-center justify-center text-slate-800 hover:bg-white cursor-pointer"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            {/* Top-Right: Carry Item Indicator + Live Purse Strip */}
            <div className="pointer-events-auto flex items-center gap-2">
              {carryItem !== 'none' && (
                <div
                  data-testid="hud-carry-pill"
                  className="client-window flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-extrabold text-slate-900"
                >
                  <Coffee className="h-3.5 w-3.5 text-amber-700" />
                  <span>{getCarryItemDef(carryItem).name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setCarryItem('none');
                    }}
                    className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 hover:bg-rose-200 cursor-pointer"
                  >
                    Drop
                  </button>
                </div>
              )}

              <div className="client-window flex items-center gap-3 px-3.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-[#d97706]" />
                  <span
                    className="font-mono-num text-xs font-extrabold text-slate-900"
                    data-testid="hud-credits"
                  >
                    {player.credits}
                  </span>
                </div>
                <div className="h-4 w-px bg-stone-400" />
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                  <span
                    className="font-mono-num text-xs font-extrabold text-slate-900"
                    data-testid="hud-duckets"
                  >
                    {player.duckets}
                  </span>
                </div>
                <div className="h-4 w-px bg-stone-400" />
                <div className="flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-[#ca8a04]" />
                  <span className="font-mono-num text-xs font-extrabold text-slate-900">
                    {player.hcDays}d VIP
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BATTLE BANZAI ARENA SCOREBOARD HUD */}
          {currentRoom.id === 'battle_banzai' && (
            <div
              data-testid="banzai-hud"
              className="pointer-events-auto mx-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 sm:gap-3 rounded-lg border-2 border-[#22d3ee] bg-[#0f172a]/95 px-2.5 py-1.5 sm:px-4 sm:py-2 text-white shadow-xl"
            >
              <div className="flex items-center gap-1.5 font-pixel text-[10px] sm:text-xs text-[#22d3ee]">
                <Gamepad2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                BATTLE BANZAI
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 font-mono-num text-[11px] sm:text-xs font-extrabold">
                <span className="rounded border border-blue-400 bg-blue-700 px-2 py-0.5 text-white">
                  Blue (You): {banzaiHud.scores.blue}
                </span>
                <span className="rounded border border-red-400 bg-red-700 px-2 py-0.5 text-white">
                  Red: {banzaiHud.scores.red}
                </span>
                <span className="rounded border border-yellow-300 bg-amber-600 px-2 py-0.5 text-white">
                  Yellow: {banzaiHud.scores.yellow}
                </span>
              </div>

              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono-num text-[11px] sm:text-xs font-extrabold text-[#fde047]">
                {banzaiHud.timeLeft}s
              </span>

              {!banzaiHud.active && (
                <button
                  type="button"
                  data-testid="banzai-start-btn"
                  onClick={handleStartBanzaiMatch}
                  className="habbo-btn-green rounded px-3 py-1 text-[11px] sm:text-xs font-extrabold cursor-pointer"
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
            className="pointer-events-none fixed top-20 left-1/2 z-30 -translate-x-1/2 rounded-md border-2 border-[#1b1922] bg-[#fef08a] px-4 py-1.5 text-xs font-extrabold text-slate-950 shadow-lg"
          >
            {statusToast}
          </div>
        )}

        {/* COMPACT AVATAR INTERACTION MENU (Wave / Respect / Pass Drink / Profile / Trade) */}
        {avatarActionMenu && avatarActionMenu.npc && (
          <div
            data-testid="avatar-interaction-menu"
            className="pointer-events-auto fixed bottom-20 right-4 z-30 w-64 max-w-[calc(100vw-2rem)] client-window overflow-hidden"
          >
            <div className="client-window-bar flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-pixel text-xs truncate">{avatarActionMenu.name}</span>
                {avatarActionMenu.badge && <PixelBadge code={avatarActionMenu.badge} />}
              </div>
              <button
                type="button"
                onClick={() => setAvatarActionMenu(null)}
                aria-label="Close interaction menu"
                className="rounded p-0.5 hover:bg-black/30 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="rounded border border-stone-300 bg-[#d8ebfc] p-0.5 shrink-0">
                  <PixelHeadCanvas look={avatarActionMenu.look} size={36} />
                </div>
                <p className="text-[11px] italic text-slate-700 line-clamp-2">
                  &ldquo;{avatarActionMenu.motto}&rdquo;
                </p>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  data-testid="avatar-menu-wave"
                  onClick={() => {
                    const target = avatarActionMenu.npc!;
                    triggerAction('wave');
                    setAvatarActionMenu(null);
                    setTimeout(() => {
                      if (simRef.current.roomId === currentRoom.id) {
                        pushBubble(
                          target.id,
                          target.name,
                          target.look,
                          `*waves back warmly at ${player.username}!*`
                        );
                      }
                    }, 350);
                  }}
                  className="habbo-btn-blue inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold cursor-pointer"
                >
                  <Hand className="h-3.5 w-3.5" /> Wave
                </button>

                <button
                  type="button"
                  data-testid="avatar-menu-respect"
                  disabled={respectLeft <= 0}
                  onClick={() => {
                    const target = avatarActionMenu.npc!;
                    handleGiveRespect(target.name, target);
                    setAvatarActionMenu(null);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded border border-rose-400 bg-rose-50 px-3 py-1.5 text-xs font-extrabold text-rose-800 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                >
                  <Heart className="h-3.5 w-3.5 text-rose-600" />
                  Give Respect ({respectLeft} left)
                </button>

                {carryItem !== 'none' && (
                  <button
                    type="button"
                    data-testid="avatar-menu-pass-drink"
                    onClick={() => {
                      const target = avatarActionMenu.npc!;
                      const itemName = getCarryItemDef(carryItem).name;
                      soundEngine.playCreditChime();
                      setCarryItem('none');
                      setAvatarActionMenu(null);
                      pushBubble(
                        'player',
                        player.username,
                        player.look,
                        `*hands ${itemName} to ${target.name}*`
                      );
                      setTimeout(() => {
                        if (simRef.current.roomId === currentRoom.id) {
                          pushBubble(
                            target.id,
                            target.name,
                            target.look,
                            `*sips the ${itemName}* Cheers, ${player.username}!`
                          );
                        }
                      }, 400);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 cursor-pointer"
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    Pass {getCarryItemDef(carryItem).shortLabel}
                  </button>
                )}

                <button
                  type="button"
                  data-testid="avatar-menu-profile"
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedProfile(avatarActionMenu);
                    setAvatarActionMenu(null);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded border border-stone-400 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-stone-100 cursor-pointer"
                >
                  <User className="h-3.5 w-3.5" /> View Profile
                </button>
                <button
                  type="button"
                  data-testid="avatar-menu-trade"
                  onClick={() => {
                    soundEngine.playClick();
                    setTradingPartner(avatarActionMenu.npc!);
                    setAvatarActionMenu(null);
                  }}
                  className="habbo-btn-gold inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-extrabold cursor-pointer"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" /> Trade (Tauschen)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SELECTED AVATAR PROFILE CARD (BOTTOM RIGHT) */}
        {selectedProfile && (
          <div
            className="pointer-events-auto fixed bottom-20 right-4 z-30 w-72 max-w-[calc(100vw-2rem)] client-window overflow-hidden"
            data-testid="in-game-player-card"
          >
            <div className="client-window-bar flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-pixel text-xs truncate">{selectedProfile.name}</span>
                {selectedProfile.badge && <PixelBadge code={selectedProfile.badge} />}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                aria-label="Close profile card"
                className="rounded p-0.5 hover:bg-black/30 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-24 w-16 items-end justify-center rounded border border-stone-300 bg-[#d8ebfc] pb-1 shrink-0">
                  <PixelAvatarCanvas look={selectedProfile.look} dir={0} pose="stand" scale={1} />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="rounded border border-stone-300 bg-white px-2 py-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Motto
                    </p>
                    <p className="text-xs italic text-slate-800 break-words">
                      &ldquo;{selectedProfile.motto}&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Player Badges */}
              <div>
                <p className="text-[10px] font-extrabold text-slate-600 flex items-center gap-1 mb-1">
                  <Award className="h-3 w-3 text-[#7c3aed]" />
                  Badges ({selectedProfile.badges.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedProfile.badges.slice(0, 6).map((bId) => {
                    const def = findBadgeDefById(bId, customBadges);
                    if (!def) return null;
                    return (
                      <div
                        key={bId}
                        title={`${def.name}: ${def.description}`}
                        className="rounded border border-stone-300 bg-white p-0.5"
                      >
                        <PixelBadgeSprite
                          badgeId={def.id}
                          unlocked
                          size={24}
                          customBadges={customBadges}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add / Remove Friend & Quick Trade */}
              {!selectedProfile.isSelf && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="in-game-add-friend-btn"
                    onClick={() => {
                      const res = onToggleFriend(selectedProfile.id);
                      if (res.action === 'added') {
                        soundEngine.playCreditChime();
                        showToast(`${selectedProfile.name} was added to your Friends list!`);
                      } else {
                        soundEngine.playClick();
                        showToast(`${selectedProfile.name} was removed from Friends.`);
                      }
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-extrabold cursor-pointer ${
                      isFriend(player, selectedProfile.id)
                        ? 'border border-rose-700 bg-rose-600 text-white hover:bg-rose-700'
                        : 'habbo-btn-green'
                    }`}
                  >
                    {isFriend(player, selectedProfile.id) ? (
                      <>
                        <UserMinus className="h-3.5 w-3.5" /> Remove Friend
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Add Friend
                      </>
                    )}
                  </button>
                  {selectedProfile.npc && (
                    <button
                      type="button"
                      onClick={() => {
                        setTradingPartner(selectedProfile.npc!);
                        setSelectedProfile(null);
                      }}
                      className="habbo-btn-gold inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-extrabold cursor-pointer"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" /> Trade
                    </button>
                  )}
                </div>
              )}

              {selectedProfile.npc && canModerateRoom && (
                <div className="flex items-center gap-1.5 border-t border-stone-300 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedProfile.npc!;
                      soundEngine.playFurniPickup();
                      onKickUser(currentRoom.id, target);
                      showToast(`${target.name} was kicked from ${currentRoom.name}.`);
                      setSelectedProfile(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-amber-700 bg-amber-500 px-2 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    <UserMinus className="h-3 w-3" /> Kick
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedProfile.npc!;
                      soundEngine.playError();
                      onBanUser(currentRoom.id, target);
                      showToast(`${target.name} was banned from ${currentRoom.name}.`);
                      setSelectedProfile(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-rose-800 bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                  >
                    <Ban className="h-3 w-3" /> Ban
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PET INFO & CARE CARD (BOTTOM RIGHT) */}
        {activePet && (
          <div
            data-testid="pet-info-card"
            className="pointer-events-auto fixed bottom-20 right-4 z-30 w-72 max-w-[calc(100vw-2rem)] client-window overflow-hidden"
          >
            <div className="client-window-bar flex items-center justify-between bg-gradient-to-b from-[#f59e0b] to-[#b45309] px-3 py-1.5">
              <span className="inline-flex items-center gap-1.5 font-pixel text-xs">
                <PawPrint className="h-3.5 w-3.5" />
                {activePet.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPetId(null)}
                aria-label="Close pet info card"
                className="rounded p-0.5 hover:bg-black/30 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded border border-amber-300 bg-[#fefce8] shrink-0">
                  <PixelPetCanvas species={activePet.species} dir={0} anim="stand" size={54} />
                </div>
                <div className="min-w-0 flex-1 space-y-1 text-xs">
                  <p className="font-extrabold text-slate-900">{getPetDef(activePet.species).name}</p>
                  <p className="text-[11px] text-slate-600">Owner: {activePet.owner}</p>
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <Utensils className="h-3 w-3 text-amber-600" /> Hunger
                      </span>
                      <span className="font-mono-num">{activePet.hunger}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${activePet.hunger}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3 text-rose-500" /> Happiness
                      </span>
                      <span className="font-mono-num">{activePet.happiness}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${activePet.happiness}%` }}
                      />
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
                    className="rounded border border-stone-300 bg-white py-1 text-[10px] font-bold capitalize text-slate-800 hover:bg-amber-50 cursor-pointer"
                  >
                    {cmd}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playCreditChime();
                    onCarePet(activePet.id, 'feed');
                    showToast(`Fed ${activePet.name} a crunchy PIXL treat!`);
                  }}
                  className="habbo-btn-green rounded py-1 text-[10px] font-bold cursor-pointer"
                >
                  Feed
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Chat tricks:{' '}
                <strong className="font-mono-num">sit / sitz, lay / platz, jump / spring, speak</strong>
              </p>
            </div>
          </div>
        )}

        {/* ENGRAVED TROPHY PLAQUE CARD */}
        {inspectedTrophy && (
          <div
            data-testid="trophy-plaque-modal"
            className="pointer-events-auto fixed bottom-20 right-4 z-30 w-72 max-w-[calc(100vw-2rem)] client-window overflow-hidden"
          >
            <div className="client-window-bar flex items-center justify-between bg-gradient-to-b from-[#eab308] to-[#a16207] px-3 py-1.5 text-slate-950">
              <span className="inline-flex items-center gap-1.5 font-pixel text-xs">
                <Trophy className="h-3.5 w-3.5" />
                {FURNI_CATALOGUE.find((f) => f.id === inspectedTrophy.furniId)?.name ?? 'PIXL Trophy'}
              </span>
              <button
                type="button"
                onClick={() => setInspectedTrophy(null)}
                aria-label="Close trophy plaque"
                className="rounded p-0.5 hover:bg-black/15 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2.5 bg-gradient-to-b from-[#fefce8] to-white">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded border border-amber-300 bg-white shrink-0">
                  <PixelFurniCanvas furniId={inspectedTrophy.furniId} size={52} />
                </div>
                <div className="min-w-0 flex-1 rounded border-2 border-[#ca8a04] bg-[#fffbeb] p-2">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800">
                    Engraved Plaque
                  </p>
                  <p className="mt-0.5 text-xs font-bold italic text-slate-900 break-words">
                    &ldquo;
                    {inspectedTrophy.customData?.inscription ??
                      'Awarded for PIXL Hotel Excellence!'}
                    &rdquo;
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-amber-200 pt-2 text-[11px] font-semibold text-slate-600">
                <span>
                  Engraved by:{' '}
                  <strong className="text-slate-900">
                    {inspectedTrophy.customData?.engravedBy ?? 'KrawattenManni'}
                  </strong>
                </span>
                <span className="font-mono-num">
                  {inspectedTrophy.customData?.engravedAt ?? '2026-04-14'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM PIXL TOOLBAR & CHAT INPUT */}
        <div className="pointer-events-auto mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-1.5 sm:gap-2 client-window px-2.5 py-2 sm:px-3">
          {/* Action Buttons + :commands Trigger */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => triggerAction('wave')}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold cursor-pointer ${
                playerPoseUI === 'wave'
                  ? 'border-[#1d4ed8] bg-[#2b7de9] text-white'
                  : 'border-stone-400 bg-white text-slate-800 hover:bg-stone-100'
              }`}
            >
              <Hand className="h-3.5 w-3.5" /> Wave
            </button>
            <button
              type="button"
              onClick={() => triggerAction('dance')}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-xs font-bold cursor-pointer ${
                playerPoseUI === 'dance'
                  ? 'border-[#7c3aed] bg-[#8b5cf6] text-white'
                  : 'border-stone-400 bg-white text-slate-800 hover:bg-stone-100'
              }`}
            >
              <Music className="h-3.5 w-3.5" /> Dance
            </button>
            <button
              type="button"
              onClick={() => triggerAction('sit')}
              className={`rounded border px-2 py-1.5 text-xs font-bold cursor-pointer ${
                playerPoseUI === 'sit'
                  ? 'border-[#0d9488] bg-[#14b8a6] text-white'
                  : 'border-stone-400 bg-white text-slate-800 hover:bg-stone-100'
              }`}
            >
              Sit
            </button>
            <button
              type="button"
              data-testid="hud-commands-btn"
              onClick={() => {
                soundEngine.playClick();
                setCommandsSubTab('commands');
                setShowCommandsModal((v) => !v);
              }}
              title="Open :commands, Handitems & :furni Chooser"
              className="inline-flex items-center gap-1 rounded border border-[#0d9488] bg-[#0f766e] px-2 py-1.5 text-xs font-extrabold text-white hover:bg-[#115e59] cursor-pointer"
            >
              <Terminal className="h-3.5 w-3.5 text-[#fef08a]" />
              <span className="hidden sm:inline">:commands</span>
            </button>
          </div>

          {/* Speech Bar with Chat Mode (Say/Shout/Whisper) & Bubble Color */}
          <form onSubmit={handleSendChat} className="flex flex-1 min-w-[200px] items-center gap-1">
            <select
              aria-label="Chat delivery mode"
              data-testid="chat-mode-select"
              value={chatMode}
              onChange={(e) => setChatMode(e.target.value as ChatDeliveryMode)}
              className="rounded border-2 border-stone-400 bg-stone-100 px-1.5 py-1.5 text-[11px] font-extrabold text-slate-800 focus:border-[#2b7de9] focus:outline-none cursor-pointer shrink-0"
            >
              <option value="say">Say</option>
              <option value="shout">Shout!</option>
              <option value="whisper">Whisper</option>
            </select>

            <select
              aria-label="Speech bubble style"
              data-testid="chat-bubble-style-select"
              value={bubbleStyle}
              onChange={(e) => setBubbleStyle(e.target.value as ChatBubbleStyle)}
              className="hidden sm:block rounded border-2 border-stone-400 bg-white px-1.5 py-1.5 text-[11px] font-bold text-slate-800 focus:border-[#2b7de9] focus:outline-none cursor-pointer shrink-0"
            >
              {CHAT_BUBBLE_STYLES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>

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
              placeholder="Chat or type :commands, :moonwalk, :furni, :cola, sit..."
              className="w-full rounded border-2 border-stone-400 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#2b7de9] focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Send chat message"
              className="habbo-btn-green inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold cursor-pointer shrink-0"
            >
              <Send className="h-3.5 w-3.5" /> {chatMode === 'shout' ? 'Shout' : 'Say'}
            </button>
          </form>

          {/* Friends, Catalogue, Inventory & Admin Tools */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowFriendsConsole((v) => !v);
              }}
              className="habbo-btn-green inline-flex items-center gap-1 rounded px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold cursor-pointer"
            >
              <Users className="h-3.5 w-3.5" /> Friends
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowCatalogue((v) => !v);
              }}
              className="habbo-btn-gold inline-flex items-center gap-1 rounded px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-extrabold cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Catalogue
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowInventory((v) => !v);
                setPlacingFurniId(null);
              }}
              className="habbo-btn-blue inline-flex items-center gap-1 rounded px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold cursor-pointer"
            >
              <Package className="h-3.5 w-3.5" /> Inventory
            </button>
            {canModerateRoom && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setShowAdminTools((v) => !v);
                }}
                className={`inline-flex items-center gap-1 rounded border-2 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-extrabold cursor-pointer ${
                  showAdminTools
                    ? 'border-[#7f1d1d] bg-[#dc2626] text-white'
                    : 'border-[#7f1d1d] bg-[#b91c1c] text-[#fef08a] hover:bg-[#dc2626]'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Admin Tools
              </button>
            )}
          </div>
        </div>
      </div>

      {/* IN-GAME MODALS */}
      {showMoodlightModal && (
        <MoodlightModal
          moodlight={moodlight}
          floorTheme={currentRoom.floorTheme}
          wallTheme={currentRoom.wallTheme}
          onChangeMoodlight={(next) => {
            soundEngine.playClick();
            setMoodlight(next);
          }}
          onChangeFloorTheme={(theme) => {
            soundEngine.playClick();
            setFloorThemeOverride((prev) => ({ ...prev, [currentRoom.id]: theme }));
          }}
          onChangeWallTheme={(theme) => {
            soundEngine.playClick();
            setWallThemeOverride((prev) => ({ ...prev, [currentRoom.id]: theme }));
          }}
          onClose={() => setShowMoodlightModal(false)}
        />
      )}

      {showTraxModal && (
        <TraxmachineModal
          activeTrack={activeTrax}
          onSelectTrack={handleSelectTrax}
          onClose={() => setShowTraxModal(false)}
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
            soundEngine.playClick();
            setCarryItem(item);
            showToast(
              item === 'none'
                ? 'Hands cleared.'
                : `Equipped ${getCarryItemDef(item).name} in hand!`
            );
          }}
          onToggleFurni={(uid, nextState) => {
            soundEngine.playClick();
            onToggleFurniState(currentRoom.id, uid, nextState);
          }}
          onRotateFurni={(uid) => {
            soundEngine.playClick();
            onRotateFurni(currentRoom.id, uid);
          }}
          onPickupFurni={(uid) => {
            soundEngine.playFurniPickup();
            onPickupFurni(currentRoom.id, uid);
          }}
          onClose={() => setShowCommandsModal(false)}
        />
      )}

      {showNavigator && (
        <RoomNavigatorModal
          rooms={rooms}
          currentRoomId={currentRoom.id}
          playerUsername={player.username}
          onSelectRoom={(rid) => {
            soundEngine.playEnterHotel();
            onSwitchRoom(rid);
          }}
          onClose={() => setShowNavigator(false)}
        />
      )}

      {showCatalogue && (
        <CatalogueModal
          player={player}
          onBuy={(id, qty, engravingMessage) => {
            const res = onBuyCatalogueItem(id, qty, engravingMessage);
            if (res.ok) soundEngine.playCreditChime();
            else soundEngine.playError();
            return res;
          }}
          onBuyPet={(species, customName) => {
            const res = onBuyPet(species, customName);
            if (res.ok) soundEngine.playCreditChime();
            else soundEngine.playError();
            return res;
          }}
          onClose={() => setShowCatalogue(false)}
        />
      )}

      {showInventory && (
        <InventoryDock
          inventory={player.inventory}
          placingFurniId={placingFurniId}
          selectedPlaced={selectedPlacedObj}
          canEditRoom={canEditRoom}
          pets={player.pets}
          currentRoomId={currentRoom.id}
          onSummonPets={() => {
            soundEngine.playClick();
            onSummonPetsToRoom(currentRoom.id);
            showToast('Your pets rushed into the room!');
          }}
          onSelectForPlacement={(id) => {
            soundEngine.playClick();
            setPlacingFurniId(id);
            setSelectedFurniUid(null);
          }}
          onRotateSelected={() => {
            if (!selectedFurniUid) return;
            soundEngine.playClick();
            onRotateFurni(currentRoom.id, selectedFurniUid);
          }}
          onPickupSelected={() => {
            if (!selectedFurniUid) return;
            soundEngine.playFurniPickup();
            onPickupFurni(currentRoom.id, selectedFurniUid);
            setSelectedFurniUid(null);
          }}
          onClose={() => {
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
            soundEngine.playFurniPickup();
            onKickUser(currentRoom.id, npc);
            showToast(`${npc.name} was kicked from ${currentRoom.name}.`);
          }}
          onBanUser={(npc) => {
            soundEngine.playError();
            onBanUser(currentRoom.id, npc);
            showToast(`${npc.name} was banned from ${currentRoom.name}.`);
          }}
          onUnbanUser={(npc) => {
            soundEngine.playCreditChime();
            onUnbanUser(currentRoom.id, npc);
            showToast(`${npc.name} was unbanned.`);
          }}
          onClose={() => setShowAdminTools(false)}
        />
      )}

      {showFriendsConsole && (
        <FriendsConsoleModal
          player={player}
          directory={directory}
          rooms={rooms}
          customBadges={customBadges}
          onToggleFriend={(profile) => {
            const res = onToggleFriend(profile.id);
            if (res.action === 'added') {
              soundEngine.playCreditChime();
              showToast(`${profile.name} was added to your Friends list!`);
            } else {
              soundEngine.playClick();
              showToast(`${profile.name} was removed from Friends.`);
            }
          }}
          onFollowRoom={(rid) => {
            soundEngine.playEnterHotel();
            onSwitchRoom(rid);
          }}
          onClose={() => setShowFriendsConsole(false)}
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
    </div>
  );
}

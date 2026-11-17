import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthPortal } from './components/auth/AuthPortal';
import { CmsHeader } from './components/cms/CmsHeader';
import { CommunityTab } from './components/cms/CommunityTab';
import { HousekeepingTab } from './components/cms/HousekeepingTab';
import { MeDashboard } from './components/cms/MeDashboard';
import { PlayersFriendsTab } from './components/cms/PlayersFriendsTab';
import { ShopVouchersTab } from './components/cms/ShopVouchersTab';
import { StaffTab } from './components/cms/StaffTab';
import { WardrobeTab } from './components/cms/WardrobeTab';
import { HotelClient } from './components/hotel/HotelClient';
import { LoadingScreen } from './components/hotel/LoadingScreen';
import {
  demoteFromStaff,
  deriveStaffMembersFromAccounts,
  loadAccountsDB,
  saveAccountsDB,
  setAccountRank,
  updateAccountAdminFields,
  type AdminUserEditPatch,
} from './game/accountsDb';
import { authenticateUser, registerUser, syncBadgesWithPlayer } from './game/auth';
import { buildHotelPlayerDirectory, toggleFriend } from './game/friends';
import {
  DEFAULT_LOOK,
  INITIAL_NEWS,
  INITIAL_NPCS,
  INITIAL_PLAYER_STATE,
  INITIAL_ROOMS,
  RARE_VALUES,
} from './game/data';
import {
  buyCatalogueItem,
  pickupFurniToInventory,
  placeFurniFromInventory,
  purchaseHC,
  redeemVoucher,
  rotatePlacedFurni,
  sanitizeMotto,
  updatePlayerLook,
} from './game/economy';
import {
  banUserFromRoom,
  createInitialModerationState,
  kickUserFromRoom,
  unbanUserFromRoom,
  type RoomModerationState,
} from './game/moderation';
import {
  awardCustomBadgeToAccount,
  loadCustomBadges,
  mintCustomBadge,
  saveCustomBadges,
} from './game/customBadges';
import { buyPet, getPetDef } from './game/pets';
import { soundEngine } from './game/soundEngine';
import {
  createRoomInSupabase,
  decrementVoucherUsesInSupabase,
  deleteBanInSupabase,
  fetchAllRetroStateFromSupabase,
  insertBanInSupabase,
  insertCatalogueItemsInSupabase,
  insertCmsNewsInSupabase,
  insertUserBadgeInSupabase,
  insertUserPetInSupabase,
  mapBadgeCodeToCatalogId,
  pickupAllRoomItemsInSupabase,
  pickupItemInSupabase,
  placeItemInSupabase,
  registerUserInSupabase,
  serializeItemExtraData,
  toggleFriendshipInSupabase,
  transferItemsOwnershipInSupabase,
  updateAccountInSupabase,
  updateItemInSupabase,
  updateUserPetInSupabase,
} from './game/supabaseSync';
import { executeTradeTransfer } from './game/trading';
import { supabase } from './lib/supabase';
import type {
  AccountRank,
  AppScreen,
  BanRecord,
  CmsTab,
  CustomBadgeDef,
  Direction,
  HabboNPC,
  LookConfig,
  NewsArticle,
  PetSpecies,
  PlacedFurni,
  PlayerState,
  RankDef,
  RoomDef,
  TradeSlotItem,
  UserAccount,
  VoucherDef,
} from './game/types';

export default function App() {
  const [accounts, setAccounts] = useState<UserAccount[]>(() => loadAccountsDB());
  const [ranks, setRanks] = useState<RankDef[]>([]);
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [rooms, setRooms] = useState<RoomDef[]>(INITIAL_ROOMS);
  const [news, setNews] = useState<NewsArticle[]>(INITIAL_NEWS);
  const [vouchers, setVouchers] = useState<VoucherDef[]>([]);
  const [customBadges, setCustomBadges] = useState<CustomBadgeDef[]>(() => loadCustomBadges());

  const [screen, setScreen] = useState<AppScreen | 'auth'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'hotel';
    }
    return 'auth';
  });

  const [cmsTab, setCmsTab] = useState<CmsTab>('me');
  const [selectedDirectoryPlayerId, setSelectedDirectoryPlayerId] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [muted, setMuted] = useState(false);
  const [moderationState, setModerationState] = useState<RoomModerationState>(() =>
    createInitialModerationState()
  );

  const [roomFurniMap, setRoomFurniMap] = useState<Record<string, PlacedFurni[]>>(() => {
    const map: Record<string, PlacedFurni[]> = {};
    for (const r of INITIAL_ROOMS) {
      map[r.id] = r.initialFurni;
    }
    return map;
  });

  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;
  const bansRef = useRef(bans);
  bansRef.current = bans;
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const vouchersRef = useRef(vouchers);
  vouchersRef.current = vouchers;
  const playerRef = useRef(player);
  playerRef.current = player;
  const roomFurniMapRef = useRef(roomFurniMap);
  roomFurniMapRef.current = roomFurniMap;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const syncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const syncChannelSubscribedRef = useRef(false);
  const pendingUserWriteCountRef = useRef(0);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.dataset.state = screen === 'hotel' ? 'playing' : screen;
    soundEngine.setInGame(screen === 'hotel');
  }, [screen]);

  useEffect(() => {
    saveAccountsDB(accounts);
  }, [accounts]);

  useEffect(() => {
    saveCustomBadges(customBadges);
  }, [customBadges]);

  const applySnapshot = useCallback((snap: Awaited<ReturnType<typeof fetchAllRetroStateFromSupabase>>) => {
    if (!snap) return;
    if (snap.ranks.length > 0) setRanks(snap.ranks);
    setBans(snap.bans);
    bansRef.current = snap.bans;
    if (snap.rooms.length > 0) {
      setRooms(snap.rooms);
      roomsRef.current = snap.rooms;
    }
    if (snap.news.length > 0) setNews(snap.news);
    setVouchers(snap.vouchers);
    vouchersRef.current = snap.vouchers;
    if (snap.customBadges.length > 0) {
      setCustomBadges((prev) => {
        const merged = [...snap.customBadges];
        for (const localBadge of prev) {
          if (!merged.some((m) => m.id === localBadge.id || m.code === localBadge.code)) {
            merged.push(localBadge);
          }
        }
        return merged;
      });
    }
    setRoomFurniMap(snap.roomFurniMap);
    roomFurniMapRef.current = snap.roomFurniMap;

    if (snap.accounts.length > 0) {
      setAccounts(snap.accounts);
      accountsRef.current = snap.accounts;

      const currentScreen = screenRef.current;
      const activeName = playerRef.current.username.toLowerCase();
      const matched = snap.accounts.find((a) => a.username.toLowerCase() === activeName);
      if (matched && currentScreen !== 'auth') {
        if (matched.banned) {
          setScreen('auth');
        } else if (pendingUserWriteCountRef.current === 0) {
          const synced = syncBadgesWithPlayer(matched.playerState);
          playerRef.current = synced;
          setPlayer(synced);
        }
      }
    }
  }, []);

  const refreshRetroSnapshot = useCallback(async () => {
    const snap = await fetchAllRetroStateFromSupabase();
    if (snap) applySnapshot(snap);
    return snap;
  }, [applySnapshot]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void refreshRetroSnapshot();
    }, 150);
  }, [refreshRetroSnapshot]);

  const broadcastSyncEvent = useCallback((payload: Record<string, unknown>) => {
    const ch = syncChannelRef.current;
    if (!ch || !syncChannelSubscribedRef.current) return;
    ch.send({ type: 'broadcast', event: 'retro:sync', payload }).catch(() => {});
  }, []);

  // Initial PostgreSQL snapshot load + Realtime subscriptions across all PhoenixEmu tables
  useEffect(() => {
    let active = true;

    void refreshRetroSnapshot();

    const syncChannel = supabase
      .channel('pixl-global-sync', { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'retro:sync' }, () => {
        if (active) scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        if (active) scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bans' }, () => {
        if (active) scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        if (active) scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        if (active) scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_badges' }, () => {
        if (active) scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_pets' }, () => {
        if (active) scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messenger_friendships' }, () => {
        if (active) scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cms_news' }, () => {
        if (active) scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vouchers' }, () => {
        if (active) scheduleRefresh();
      })
      .subscribe((status) => {
        syncChannelSubscribedRef.current = status === 'SUBSCRIBED';
      });

    syncChannelRef.current = syncChannel;

    return () => {
      active = false;
      syncChannelSubscribedRef.current = false;
      syncChannelRef.current = null;
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      supabase.removeChannel(syncChannel);
    };
  }, [refreshRetroSnapshot, scheduleRefresh]);

  // Keep current player changes persisted into accounts list and PostgreSQL `users`
  const updatePlayer = useCallback(
    (updater: (prev: PlayerState) => PlayerState, extraBadgeId?: string) => {
      const prevPlayer = playerRef.current;
      const updated = syncBadgesWithPlayer(updater(prevPlayer), extraBadgeId);
      playerRef.current = updated;
      setPlayer(updated);

      const currentAccounts = accountsRef.current;
      const targetIdx = currentAccounts.findIndex(
        (a) => a.username.toLowerCase() === updated.username.toLowerCase()
      );

      if (targetIdx >= 0) {
        const updatedAccount: UserAccount = {
          ...currentAccounts[targetIdx],
          online: true,
          lastSeen: 'Online now',
          playerState: updated,
        };
        const nextAccounts = currentAccounts.map((a, idx) =>
          idx === targetIdx ? updatedAccount : a
        );
        accountsRef.current = nextAccounts;
        setAccounts(nextAccounts);
        pendingUserWriteCountRef.current += 1;
        void updateAccountInSupabase(updatedAccount).finally(() => {
          pendingUserWriteCountRef.current = Math.max(0, pendingUserWriteCountRef.current - 1);
        });
      }
    },
    []
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleLogin = useCallback(
    async (
      username: string,
      password: string
    ): Promise<{ ok: boolean; banned?: boolean; message: string }> => {
      await refreshRetroSnapshot();

      const activeBan = bansRef.current.find(
        (b) => b.value.toLowerCase() === username.trim().toLowerCase()
      );
      if (activeBan) {
        return {
          ok: false,
          banned: true,
          message: `Account suspended: ${activeBan.reason}`,
        };
      }

      const res = authenticateUser(accountsRef.current, username, password);
      if (res.ok && res.account) {
        if (res.accounts) {
          accountsRef.current = res.accounts;
          setAccounts(res.accounts);
        }
        const synced = syncBadgesWithPlayer(res.account.playerState);
        playerRef.current = synced;
        setPlayer(synced);
        setCmsTab('me');
        setScreen('cms');
        void updateAccountInSupabase({ ...res.account, online: true, playerState: synced }).then(() => {
          broadcastSyncEvent({ type: 'login', username: res.account!.username });
        });
      }
      return { ok: res.ok, banned: res.banned, message: res.message };
    },
    [broadcastSyncEvent, refreshRetroSnapshot]
  );

  const handleRegister = useCallback(
    async (
      username: string,
      password: string,
      confirmPassword: string,
      motto: string,
      look?: LookConfig,
      mail?: string,
      gender?: 'M' | 'F'
    ): Promise<{ ok: boolean; message: string }> => {
      await refreshRetroSnapshot();

      const res = registerUser(
        accountsRef.current,
        username,
        password,
        confirmPassword,
        motto,
        look
      );
      if (!res.ok || !res.account || !res.accounts) {
        return { ok: res.ok, message: res.message };
      }

      const dbRes = await registerUserInSupabase({
        username: res.account.username,
        password: res.account.password,
        motto: res.account.playerState.motto,
        look: res.account.playerState.look,
        mail: mail?.trim() || `${res.account.username.toLowerCase()}@pixlhotel.ch`,
        gender: gender ?? 'M',
        rank: 1,
        credits: 250,
        duckets: 150,
        hcDays: 3,
      });

      if (!dbRes.ok) {
        return { ok: false, message: dbRes.message ?? 'Registration failed in Supabase.' };
      }

      const snap = await refreshRetroSnapshot();
      const freshMatch = snap?.accounts.find(
        (a) => a.username.toLowerCase() === res.account!.username.toLowerCase()
      );
      const nextPlayer = syncBadgesWithPlayer(freshMatch?.playerState ?? res.account.playerState);
      playerRef.current = nextPlayer;
      setPlayer(nextPlayer);
      setCmsTab('me');
      setScreen('cms');
      broadcastSyncEvent({ type: 'register', username: nextPlayer.username });
      return { ok: true, message: res.message };
    },
    [broadcastSyncEvent, refreshRetroSnapshot]
  );

  const handleContinueAsGuest = useCallback(async () => {
    await refreshRetroSnapshot();
    let guestAcc = accountsRef.current.find(
      (a) => a.username.toLowerCase() === 'pixelguest'
    );
    if (!guestAcc) {
      await registerUserInSupabase({
        username: 'PixelGuest',
        password: 'pixlhotel',
        motto: 'Exploring PIXL Hotel in crisp isometric pixels!',
        look: { ...DEFAULT_LOOK },
        mail: 'guest@pixlhotel.ch',
        gender: 'M',
        rank: 2,
        credits: 350,
        duckets: 240,
        hcDays: 12,
      });
      const snap = await refreshRetroSnapshot();
      guestAcc = snap?.accounts.find(
        (a) => a.username.toLowerCase() === 'pixelguest'
      );
    }

    const guestPlayer = syncBadgesWithPlayer(
      guestAcc ? guestAcc.playerState : INITIAL_PLAYER_STATE
    );
    playerRef.current = guestPlayer;
    setPlayer(guestPlayer);
    if (guestAcc) {
      void updateAccountInSupabase({ ...guestAcc, online: true, playerState: guestPlayer });
    }
    setCmsTab('me');
    setScreen('cms');
  }, [refreshRetroSnapshot]);

  const handleSignOut = useCallback(() => {
    const activeName = playerRef.current.username.toLowerCase();
    const matched = accountsRef.current.find((a) => a.username.toLowerCase() === activeName);
    if (matched) {
      const offlineAcc: UserAccount = {
        ...matched,
        online: false,
        lastSeen: 'Just now',
      };
      setAccounts((prev) => prev.map((a) => (a.id === matched.id ? offlineAcc : a)));
      void updateAccountInSupabase(offlineAcc).then(() => {
        broadcastSyncEvent({ type: 'logout', username: offlineAcc.username });
      });
    }
    setScreen('auth');
  }, [broadcastSyncEvent]);

  const handleEnterHotel = useCallback(
    (targetRoomId?: string) => {
      if (targetRoomId) {
        updatePlayer((prev) => ({ ...prev, currentRoomId: targetRoomId }));
      }
      setScreen('loading');
    },
    [updatePlayer]
  );

  const handleLoadingComplete = useCallback(() => {
    setScreen('hotel');
  }, []);

  const handleBackToCms = useCallback(() => {
    setScreen('cms');
  }, []);

  const handleSaveMotto = useCallback(
    (motto: string) => {
      updatePlayer((prev) => ({
        ...prev,
        motto: sanitizeMotto(motto) || 'Living the retro pixel dream!',
      }));
    },
    [updatePlayer]
  );

  const handleSaveLook = useCallback(
    (look: LookConfig) => {
      updatePlayer((prev) => updatePlayerLook(prev, look), 'badge_stylist');
    },
    [updatePlayer]
  );

  const handleRedeemVoucher = useCallback(
    (rawCode: string): { ok: boolean; message: string } => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return { ok: false, message: 'Enter a voucher code first.' };

      const currentPlayer = playerRef.current;
      if (currentPlayer.redeemedVouchers.includes(code)) {
        return { ok: false, message: `Voucher "${code}" was already redeemed on your account.` };
      }

      // Check PostgreSQL `vouchers` table first
      const dbVoucher = vouchersRef.current.find((v) => v.code === code);
      if (dbVoucher) {
        if (dbVoucher.uses <= 0) {
          return { ok: false, message: `Voucher "${code}" has no remaining uses.` };
        }

        const badgeCatalogId = dbVoucher.badgeId
          ? mapBadgeCodeToCatalogId(dbVoucher.badgeId)
          : undefined;
        const rewardMsgParts: string[] = [];
        if (dbVoucher.credits > 0) rewardMsgParts.push(`+${dbVoucher.credits} Credits`);
        if (dbVoucher.duckets > 0) rewardMsgParts.push(`+${dbVoucher.duckets} Duckets`);
        if (dbVoucher.hcDays > 0) rewardMsgParts.push(`+${dbVoucher.hcDays}d VIP`);
        if (dbVoucher.badgeId) rewardMsgParts.push(`Badge [${dbVoucher.badgeId}]`);

        updatePlayer(
          (prev) => ({
            ...prev,
            credits: prev.credits + dbVoucher.credits,
            duckets: prev.duckets + dbVoucher.duckets,
            hcDays: prev.hcDays + dbVoucher.hcDays,
            redeemedVouchers: [...prev.redeemedVouchers, code],
          }),
          badgeCatalogId || 'badge_voucher'
        );

        // Decrement uses in `vouchers` and grant badge row / DRAGON furni if applicable
        setVouchers((prev) =>
          prev.map((v) => (v.id === dbVoucher.id ? { ...v, uses: Math.max(0, v.uses - 1) } : v))
        );
        void decrementVoucherUsesInSupabase(dbVoucher.id, dbVoucher.uses);

        if (currentPlayer.numericId) {
          const uid = currentPlayer.numericId;
          if (dbVoucher.badgeId) {
            void insertUserBadgeInSupabase({
              userId: uid,
              badgeCode: dbVoucher.badgeId,
              badgeSlot: 2,
            });
          }
          if (code === 'DRAGON') {
            void insertCatalogueItemsInSupabase({
              userId: uid,
              furniId: 'fire_dragon',
              quantity: 1,
              extraData: '0',
            }).then((rows) => {
              if (rows.length > 0) {
                const newIds = rows.map((r) => r.id);
                updatePlayer((prev) => {
                  const inv = [...prev.inventory];
                  const idx = inv.findIndex((i) => i.furniId === 'fire_dragon');
                  if (idx >= 0) {
                    inv[idx] = {
                      ...inv[idx],
                      quantity: inv[idx].quantity + 1,
                      itemIds: [...(inv[idx].itemIds ?? []), ...newIds],
                    };
                  } else {
                    inv.push({ furniId: 'fire_dragon', quantity: 1, itemIds: newIds });
                  }
                  return { ...prev, inventory: inv };
                }, 'badge_dragon');
              }
            });
          }
        }

        return {
          ok: true,
          message: `Redeemed ${code}: ${rewardMsgParts.join(', ')} added!`,
        };
      }

      // Fallback for client-side promos (PIXL2026, DAILY, DUCKETS)
      let outcome = { ok: false, message: '' };
      updatePlayer((prev) => {
        const res = redeemVoucher(prev, code);
        outcome = { ok: res.ok, message: res.message };
        return res.player;
      });
      return outcome;
    },
    [updatePlayer]
  );

  const handleExtendHC = useCallback((): { ok: boolean; message: string } => {
    let outcome = { ok: false, message: '' };
    updatePlayer((prev) => {
      const res = purchaseHC(prev, 31, 50);
      outcome = { ok: res.ok, message: res.message };
      return res.player;
    });
    return outcome;
  }, [updatePlayer]);

  const handleBuyCatalogueItem = useCallback(
    (furniId: string, quantity = 1, engravingMessage?: string): { ok: boolean; message: string } => {
      let outcome = { ok: false, message: '' };
      const prevPlayer = playerRef.current;
      const res = buyCatalogueItem(prevPlayer, furniId, quantity, engravingMessage);
      outcome = { ok: res.ok, message: res.message };

      if (!res.ok) {
        soundEngine.playError();
        return outcome;
      }

      soundEngine.playCreditChime();
      updatePlayer(() => res.player);

      // Classic PhoenixEmu Rule: insert into `items` with room_id = 0
      const userId = prevPlayer.numericId;
      if (userId) {
        const queue = res.player.pendingEngravings?.[furniId] ?? [];
        const latestMeta = queue.length > 0 ? queue[queue.length - 1] : undefined;
        const extraData = serializeItemExtraData(0, latestMeta);

        void insertCatalogueItemsInSupabase({
          userId,
          furniId,
          quantity,
          extraData,
        }).then((insertedRows) => {
          if (insertedRows.length > 0) {
            const newIds = insertedRows.map((r) => r.id);
            updatePlayer((cur) => ({
              ...cur,
              inventory: cur.inventory.map((entry) =>
                entry.furniId === furniId
                  ? { ...entry, itemIds: [...(entry.itemIds ?? []), ...newIds] }
                  : entry
              ),
            }));
          }
          broadcastSyncEvent({ type: 'item:buy', furniId });
        });
      }

      return outcome;
    },
    [broadcastSyncEvent, updatePlayer]
  );

  const handleBuyPet = useCallback(
    (species: PetSpecies, customName: string): { ok: boolean; message: string } => {
      const prevPlayer = playerRef.current;
      const room =
        roomsRef.current.find((r) => r.id === prevPlayer.currentRoomId) ?? roomsRef.current[0];
      const spawnTile = { x: room.spawn.x, y: Math.max(1, room.spawn.y - 1) };
      const res = buyPet(prevPlayer, species, customName, room.id, spawnTile);
      if (!res.ok || !res.pet) {
        soundEngine.playError();
        return { ok: false, message: res.message };
      }

      soundEngine.playCreditChime();
      const createdPet = res.pet;
      updatePlayer(() => res.player);

      if (prevPlayer.numericId) {
        const petDef = getPetDef(species);
        const dbRoomId = room.numericId ?? (Number(room.id) || 1);
        void insertUserPetInSupabase({
          userId: prevPlayer.numericId,
          roomId: dbRoomId,
          name: createdPet.name,
          species,
          color: petDef.name,
          x: createdPet.x,
          y: createdPet.y,
        }).then((dbPet) => {
          if (dbPet) {
            updatePlayer((cur) => ({
              ...cur,
              pets: cur.pets.map((p) =>
                p.id === createdPet.id ? { ...p, id: `pet-${dbPet.id}`, numericId: dbPet.id } : p
              ),
            }));
          }
          broadcastSyncEvent({ type: 'pet:buy' });
        });
      }

      return { ok: true, message: res.message };
    },
    [broadcastSyncEvent, updatePlayer]
  );

  const handleSummonPetsToRoom = useCallback(
    (roomId: string) => {
      const room = roomsRef.current.find((r) => r.id === roomId) ?? roomsRef.current[0];
      const dbRoomId = room.numericId ?? (Number(roomId) || 1);
      soundEngine.playClick();
      const updatedPets = (playerRef.current.pets ?? []).map((p, idx) => ({
        ...p,
        roomId: room.id,
        x: room.spawn.x + (idx % 2 === 0 ? 0 : 1),
        y: Math.max(1, room.spawn.y - 1),
        anim: 'stand' as const,
      }));
      updatePlayer((prev) => ({
        ...prev,
        pets: updatedPets,
      }));
      for (const p of updatedPets) {
        if (p.numericId) {
          void updateUserPetInSupabase(p.numericId, {
            room_id: dbRoomId,
            x: p.x,
            y: p.y,
          });
        }
      }
    },
    [updatePlayer]
  );

  const handleCarePet = useCallback(
    (petId: string, kind: 'feed' | 'play') => {
      soundEngine.playCreditChime();
      let updatedTarget: { numericId?: number; hunger: number; happiness: number } | null = null;
      updatePlayer((prev) => ({
        ...prev,
        pets: (prev.pets ?? []).map((p) => {
          if (p.id !== petId) return p;
          const nextHunger = kind === 'feed' ? Math.min(100, p.hunger + 22) : p.hunger;
          const nextHappy = Math.min(100, p.happiness + (kind === 'play' ? 18 : 10));
          updatedTarget = { numericId: p.numericId, hunger: nextHunger, happiness: nextHappy };
          return {
            ...p,
            hunger: nextHunger,
            happiness: nextHappy,
          };
        }),
      }));
      if (updatedTarget && (updatedTarget as { numericId?: number }).numericId) {
        const t = updatedTarget as { numericId: number; hunger: number; happiness: number };
        void updateUserPetInSupabase(t.numericId, {
          nutrition: t.hunger,
          happiness: t.happiness,
        });
      }
    },
    [updatePlayer]
  );

  const handleConfirmTrade = useCallback(
    (
      offeredItems: TradeSlotItem[],
      offeredCredits: number,
      receivedItems: TradeSlotItem[],
      receivedCredits: number
    ): { ok: boolean; message: string } => {
      const prevPlayer = playerRef.current;

      // Capture exact PostgreSQL `items.id` values being traded away before mutation
      const offeredItemDbIds: number[] = [];
      for (const slot of offeredItems) {
        const entry = prevPlayer.inventory.find((i) => i.furniId === slot.furniId);
        if (entry?.itemIds && entry.itemIds.length > 0) {
          offeredItemDbIds.push(...entry.itemIds.slice(0, slot.quantity));
        }
      }

      const res = executeTradeTransfer(
        prevPlayer,
        offeredItems,
        offeredCredits,
        receivedItems,
        receivedCredits
      );
      if (!res.ok) {
        soundEngine.playError();
        return { ok: false, message: res.message };
      }

      soundEngine.playCreditChime();
      updatePlayer(() => res.player);

      if (prevPlayer.numericId) {
        const uid = prevPlayer.numericId;
        void (async () => {
          if (offeredItemDbIds.length > 0) {
            await transferItemsOwnershipInSupabase(offeredItemDbIds, null);
          }
          for (const rec of receivedItems) {
            const rows = await insertCatalogueItemsInSupabase({
              userId: uid,
              furniId: rec.furniId,
              quantity: rec.quantity,
              extraData: '0',
            });
            if (rows.length > 0) {
              const newIds = rows.map((r) => r.id);
              updatePlayer((cur) => ({
                ...cur,
                inventory: cur.inventory.map((entry) =>
                  entry.furniId === rec.furniId
                    ? { ...entry, itemIds: [...(entry.itemIds ?? []), ...newIds] }
                    : entry
                ),
              }));
            }
          }
          broadcastSyncEvent({ type: 'trade:complete' });
        })();
      }

      return { ok: true, message: res.message };
    },
    [broadcastSyncEvent, updatePlayer]
  );

  const handleAwardBanzaiReward = useCallback(
    (credits: number, duckets: number) => {
      soundEngine.playCreditChime();
      updatePlayer((prev) => ({
        ...prev,
        credits: prev.credits + credits,
        duckets: prev.duckets + duckets,
      }));
    },
    [updatePlayer]
  );

  const handleCreateRoom = useCallback(
    async (params: {
      caption: string;
      description: string;
      modelName: string;
    }): Promise<{ ok: boolean; message: string }> => {
      const created = await createRoomInSupabase({
        caption: params.caption,
        description: params.description,
        modelName: params.modelName,
        owner: playerRef.current.username,
        category: 3,
      });
      if (!created) {
        return { ok: false, message: 'Could not save new room to PostgreSQL rooms table.' };
      }
      setRooms((prev) => [...prev, created]);
      roomsRef.current = [...roomsRef.current, created];
      setRoomFurniMap((prev) => ({ ...prev, [created.id]: [] }));
      updatePlayer((prev) => ({ ...prev, currentRoomId: created.id }));
      broadcastSyncEvent({ type: 'room:create', roomId: created.id });
      return { ok: true, message: `Created "${created.name}"!` };
    },
    [broadcastSyncEvent, updatePlayer]
  );

  const handlePlaceFurni = useCallback(
    (roomId: string, furniId: string, x: number, y: number, dir: Direction) => {
      const room = roomsRef.current.find((r) => r.id === roomId);
      if (!room) return { ok: false, message: 'Room not found.' };
      const currentPlaced = roomFurniMapRef.current[roomId] ?? [];
      const currentPlayer = playerRef.current;
      const res = placeFurniFromInventory(
        currentPlayer.inventory,
        currentPlaced,
        room,
        furniId,
        x,
        y,
        dir,
        currentPlayer.pendingEngravings ?? {}
      );
      if (res.ok) {
        const newlyPlaced = res.placedFurni[res.placedFurni.length - 1];
        newlyPlaced.owner = currentPlayer.username;
        newlyPlaced.userId = currentPlayer.numericId;
        updatePlayer(
          (prev) => ({
            ...prev,
            inventory: res.inventory,
            pendingEngravings: res.pendingEngravings,
          }),
          'badge_architect'
        );
        setRoomFurniMap((prev) => ({ ...prev, [roomId]: res.placedFurni }));

        const dbRoomId = room.numericId ?? (Number(roomId) || 1);
        if (newlyPlaced.itemId) {
          void placeItemInSupabase({
            itemId: newlyPlaced.itemId,
            roomId: dbRoomId,
            x,
            y,
            rot: dir,
          }).then(() => {
            broadcastSyncEvent({ type: 'furni:place', roomId });
          });
        } else if (currentPlayer.numericId) {
          void insertCatalogueItemsInSupabase({
            userId: currentPlayer.numericId,
            furniId,
            quantity: 1,
            extraData: serializeItemExtraData(newlyPlaced.state, newlyPlaced.customData),
          }).then(async (rows) => {
            if (rows[0]) {
              await placeItemInSupabase({
                itemId: rows[0].id,
                roomId: dbRoomId,
                x,
                y,
                rot: dir,
              });
            }
            broadcastSyncEvent({ type: 'furni:place', roomId });
          });
        }
      }
      return { ok: res.ok, message: res.message };
    },
    [broadcastSyncEvent, updatePlayer]
  );

  const handleRotateFurni = useCallback(
    (roomId: string, uid: string) => {
      const nextRoomList = rotatePlacedFurni(roomFurniMapRef.current[roomId] ?? [], uid);
      setRoomFurniMap((prev) => ({
        ...prev,
        [roomId]: nextRoomList,
      }));
      const target = nextRoomList.find((f) => f.uid === uid);
      const itemId = target?.itemId ?? (/^\d+$/.test(uid) ? Number(uid) : undefined);
      if (target && itemId) {
        void updateItemInSupabase({ itemId, rot: target.dir }).then(() => {
          broadcastSyncEvent({ type: 'furni:rotate', roomId });
        });
      }
    },
    [broadcastSyncEvent]
  );

  const handlePickupFurni = useCallback(
    (roomId: string, uid: string) => {
      const currentPlaced = roomFurniMapRef.current[roomId] ?? [];
      const target = currentPlaced.find((f) => f.uid === uid);
      const currentPlayer = playerRef.current;
      const res = pickupFurniToInventory(
        currentPlayer.inventory,
        currentPlaced,
        uid,
        currentPlayer.pendingEngravings ?? {}
      );
      if (res.ok) {
        updatePlayer((prev) => ({
          ...prev,
          inventory: res.inventory,
          pendingEngravings: res.pendingEngravings,
        }));
        setRoomFurniMap((prev) => ({ ...prev, [roomId]: res.placedFurni }));

        const itemId = target?.itemId ?? (/^\d+$/.test(uid) ? Number(uid) : undefined);
        if (itemId) {
          void pickupItemInSupabase(itemId).then(() => {
            broadcastSyncEvent({ type: 'furni:pickup', roomId });
          });
        }
      }
    },
    [broadcastSyncEvent, updatePlayer]
  );

  const handlePickupAllFurni = useCallback(
    (roomId: string): number => {
      const currentPlaced = roomFurniMapRef.current[roomId] ?? [];
      if (currentPlaced.length === 0) return 0;

      const currentPlayer = playerRef.current;
      let nextInv = [...currentPlayer.inventory];
      let nextEngravings = { ...(currentPlayer.pendingEngravings ?? {}) };
      let remaining = [...currentPlaced];

      for (const item of currentPlaced) {
        const res = pickupFurniToInventory(nextInv, remaining, item.uid, nextEngravings);
        if (res.ok) {
          nextInv = res.inventory;
          remaining = res.placedFurni;
          nextEngravings = res.pendingEngravings;
        }
      }

      updatePlayer((prev) => ({
        ...prev,
        inventory: nextInv,
        pendingEngravings: nextEngravings,
      }));
      setRoomFurniMap((prev) => ({ ...prev, [roomId]: [] }));

      const room = roomsRef.current.find((r) => r.id === roomId);
      const dbRoomId = room?.numericId ?? (Number(roomId) || 0);
      if (dbRoomId > 0) {
        void pickupAllRoomItemsInSupabase(dbRoomId).then(() => {
          broadcastSyncEvent({ type: 'furni:pickall', roomId });
        });
      }

      return currentPlaced.length;
    },
    [broadcastSyncEvent, updatePlayer]
  );

  const handleToggleFurniState = useCallback(
    (roomId: string, uid: string, nextState: number) => {
      const nextList = (roomFurniMapRef.current[roomId] ?? []).map((f) =>
        f.uid === uid ? { ...f, state: nextState } : f
      );
      setRoomFurniMap((prev) => ({
        ...prev,
        [roomId]: nextList,
      }));
      const target = nextList.find((f) => f.uid === uid);
      const itemId = target?.itemId ?? (/^\d+$/.test(uid) ? Number(uid) : undefined);
      if (target && itemId) {
        void updateItemInSupabase({
          itemId,
          extraData: serializeItemExtraData(nextState, target.customData),
        }).then(() => {
          broadcastSyncEvent({ type: 'furni:state', roomId });
        });
      }
    },
    [broadcastSyncEvent]
  );

  const handleEquipBadge = useCallback(
    (badgeId: string) => {
      updatePlayer((prev) => ({ ...prev, equippedBadgeId: badgeId }));
    },
    [updatePlayer]
  );

  const handleUnlockBadge = useCallback(
    (badgeId: string) => {
      updatePlayer((prev) => prev, badgeId);
    },
    [updatePlayer]
  );

  const handleKickUser = useCallback((roomId: string, npc: HabboNPC) => {
    setModerationState((prev) =>
      kickUserFromRoom(prev, roomId, npc.id, npc.name, playerRef.current.username)
    );
  }, []);

  const handleBanUser = useCallback((roomId: string, npc: HabboNPC) => {
    setModerationState((prev) =>
      banUserFromRoom(prev, roomId, npc.id, npc.name, playerRef.current.username)
    );
  }, []);

  const handleUnbanUser = useCallback((roomId: string, npc: HabboNPC) => {
    setModerationState((prev) =>
      unbanUserFromRoom(prev, roomId, npc.id, npc.name, playerRef.current.username)
    );
  }, []);

  const handleToggleFriend = useCallback(
    (profileId: string): { action: 'added' | 'removed' } => {
      let action: 'added' | 'removed' = 'added';
      const meNumericId = playerRef.current.numericId;
      updatePlayer((prev) => {
        const res = toggleFriend(prev, profileId);
        action = res.action;
        return res.player;
      });
      if (meNumericId && profileId.startsWith('acc-')) {
        const targetIdStr = profileId.slice(4);
        const targetNumericId = Number(targetIdStr);
        if (Number.isFinite(targetNumericId) && targetNumericId > 0) {
          void toggleFriendshipInSupabase(
            meNumericId,
            targetNumericId,
            action === 'added'
          ).then(() => {
            broadcastSyncEvent({ type: 'friend:toggle' });
          });
        }
      }
      return { action };
    },
    [broadcastSyncEvent, updatePlayer]
  );

  const handleChangeAccountRank = useCallback(
    (accountId: string, nextRank: AccountRank) => {
      const next = setAccountRank(accountsRef.current, accountId, nextRank);
      accountsRef.current = next;
      setAccounts(next);
      const edited = next.find((a) => a.id === accountId);
      if (edited) {
        if (edited.username.toLowerCase() === playerRef.current.username.toLowerCase()) {
          const synced = syncBadgesWithPlayer(edited.playerState);
          playerRef.current = synced;
          setPlayer(synced);
        }
        void updateAccountInSupabase(edited).then(() => {
          broadcastSyncEvent({ type: 'rank:change', accountId });
        });
      }
    },
    [broadcastSyncEvent]
  );

  const handleRemoveFromStaff = useCallback(
    (accountId: string) => {
      const next = demoteFromStaff(accountsRef.current, accountId);
      accountsRef.current = next;
      setAccounts(next);
      const edited = next.find((a) => a.id === accountId);
      if (edited) {
        void updateAccountInSupabase(edited).then(() => {
          broadcastSyncEvent({ type: 'rank:demote', accountId });
        });
      }
    },
    [broadcastSyncEvent]
  );

  const handleEditAccount = useCallback(
    (accountId: string, patch: AdminUserEditPatch) => {
      const prevTarget = accountsRef.current.find((a) => a.id === accountId);
      const next = updateAccountAdminFields(accountsRef.current, accountId, patch);
      accountsRef.current = next;
      setAccounts(next);
      const edited = next.find((a) => a.id === accountId);
      if (edited) {
        if (edited.username.toLowerCase() === playerRef.current.username.toLowerCase()) {
          const synced = syncBadgesWithPlayer(edited.playerState);
          playerRef.current = synced;
          setPlayer(synced);
        }
        void (async () => {
          const hasProfileFieldPatch =
            patch.credits !== undefined ||
            patch.duckets !== undefined ||
            patch.hcDays !== undefined ||
            patch.motto !== undefined;
          if (hasProfileFieldPatch) {
            await updateAccountInSupabase(edited);
          }
          if (typeof patch.banned === 'boolean' && prevTarget) {
            if (patch.banned) {
              await insertBanInSupabase({
                username: edited.username,
                reason: edited.banReason || 'Suspended by Hotel Management.',
                addedBy: playerRef.current.username,
              });
            } else {
              await deleteBanInSupabase(edited.username);
            }
          }
          await refreshRetroSnapshot();
          broadcastSyncEvent({ type: 'account:edit', accountId });
        })();
      }
    },
    [broadcastSyncEvent, refreshRetroSnapshot]
  );

  const handleUnbanUsername = useCallback(
    (username: string) => {
      void (async () => {
        await deleteBanInSupabase(username);
        await refreshRetroSnapshot();
        broadcastSyncEvent({ type: 'ban:remove', username });
      })();
    },
    [broadcastSyncEvent, refreshRetroSnapshot]
  );

  const handlePostNews = useCallback(
    async (input: {
      title: string;
      shortstory: string;
      longstory: string;
      image: string;
    }): Promise<{ ok: boolean; message: string }> => {
      const created = await insertCmsNewsInSupabase({
        ...input,
        author: playerRef.current.username,
      });
      if (!created) {
        return { ok: false, message: 'Could not insert news article into cms_news.' };
      }
      setNews((prev) => [created, ...prev]);
      broadcastSyncEvent({ type: 'news:post', id: created.id });
      return { ok: true, message: `Published "${created.title}" to cms_news!` };
    },
    [broadcastSyncEvent]
  );

  const handleMintAndAwardBadge = useCallback(
    (input: {
      code: string;
      name: string;
      pixels: (string | null)[];
      recipientAccountId: string;
    }): { ok: boolean; message: string } => {
      const minted = mintCustomBadge(customBadges, {
        code: input.code,
        name: input.name,
        pixels: input.pixels,
        createdBy: playerRef.current.username,
      });
      if (!minted.ok || !minted.badge) {
        return { ok: false, message: minted.message };
      }

      setCustomBadges(minted.badges);
      const updatedList = awardCustomBadgeToAccount(
        accountsRef.current,
        input.recipientAccountId,
        minted.badge.id
      );
      accountsRef.current = updatedList;
      setAccounts(updatedList);

      const targetAcc = updatedList.find((a) => a.id === input.recipientAccountId);
      if (targetAcc) {
        if (targetAcc.username.toLowerCase() === playerRef.current.username.toLowerCase()) {
          const synced = syncBadgesWithPlayer(targetAcc.playerState);
          playerRef.current = synced;
          setPlayer(synced);
        }
        const targetUid = targetAcc.numericId ?? Number(targetAcc.id);
        if (Number.isFinite(targetUid) && targetUid > 0) {
          void insertUserBadgeInSupabase({
            userId: targetUid,
            badgeCode: minted.badge.code,
            badgeSlot: 3,
            pixelData: minted.badge,
          }).then(() => {
            broadcastSyncEvent({ type: 'badge:mint', accountId: targetAcc.id });
          });
        }
      }

      return {
        ok: true,
        message: `${minted.message} Awarded to ${targetAcc?.username ?? input.recipientAccountId}!`,
      };
    },
    [broadcastSyncEvent, customBadges]
  );

  const activeRoom = rooms.find((r) => r.id === player.currentRoomId) ?? rooms[0];
  const liveStaff = useMemo(
    () => deriveStaffMembersFromAccounts(accounts, ranks),
    [accounts, ranks]
  );
  const directory = useMemo(
    () => buildHotelPlayerDirectory(INITIAL_NPCS, liveStaff, accounts, player.username),
    [liveStaff, accounts, player.username]
  );
  const friendProfiles = directory.filter((p) => player.friendIds.includes(p.id));

  if (screen === 'auth') {
    return (
      <AuthPortal
        onLogin={handleLogin}
        onRegister={handleRegister}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

  if (screen === 'loading') {
    return <LoadingScreen roomName={activeRoom.name} onComplete={handleLoadingComplete} />;
  }

  if (screen === 'hotel') {
    return (
      <HotelClient
        player={player}
        rooms={rooms}
        roomFurniMap={roomFurniMap}
        npcs={INITIAL_NPCS}
        customBadges={customBadges}
        muted={muted}
        onToggleMute={handleToggleMute}
        onBackToCms={handleBackToCms}
        onSwitchRoom={(roomId) => updatePlayer((prev) => ({ ...prev, currentRoomId: roomId }))}
        onCreateRoom={handleCreateRoom}
        onBuyCatalogueItem={handleBuyCatalogueItem}
        onBuyPet={handleBuyPet}
        onSummonPetsToRoom={handleSummonPetsToRoom}
        onCarePet={handleCarePet}
        onConfirmTrade={handleConfirmTrade}
        onAwardBanzaiReward={handleAwardBanzaiReward}
        onPlaceFurni={handlePlaceFurni}
        onRotateFurni={handleRotateFurni}
        onPickupFurni={handlePickupFurni}
        onPickupAllFurni={handlePickupAllFurni}
        onToggleFurniState={handleToggleFurniState}
        onRefreshRoomFurni={refreshRetroSnapshot}
        onUnlockBadge={handleUnlockBadge}
        moderationState={moderationState}
        onKickUser={handleKickUser}
        onBanUser={handleBanUser}
        onUnbanUser={handleUnbanUser}
        directory={directory}
        onToggleFriend={handleToggleFriend}
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#bce0fd] flex flex-col">
      <CmsHeader
        activeTab={cmsTab}
        onSelectTab={(tab) => {
          setCmsTab(tab);
        }}
        onEnterHotel={() => handleEnterHotel()}
        onlineCount={Math.max(1, accounts.filter((a) => a.online && !a.banned).length) + 140}
        username={player.username}
        rank={player.rank}
        credits={player.credits}
        duckets={player.duckets}
        hcDays={player.hcDays}
        friendsCount={friendProfiles.length}
        onSignOut={handleSignOut}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-6 sm:py-6">
        {cmsTab === 'me' && (
          <MeDashboard
            player={player}
            rooms={rooms}
            friends={friendProfiles}
            news={news}
            customBadges={customBadges}
            onSaveMotto={handleSaveMotto}
            onEnterHotel={handleEnterHotel}
            onRedeemVoucher={handleRedeemVoucher}
            onExtendHC={handleExtendHC}
            onOpenWardrobe={() => {
              setCmsTab('wardrobe');
            }}
            onEquipBadge={handleEquipBadge}
            onCarePet={handleCarePet}
            onInspectPlayer={(profileId) => {
              setSelectedDirectoryPlayerId(profileId);
              setCmsTab('friends');
            }}
          />
        )}

        {cmsTab === 'friends' && (
          <PlayersFriendsTab
            player={player}
            directory={directory}
            rooms={rooms}
            customBadges={customBadges}
            initialSelectedId={selectedDirectoryPlayerId}
            onToggleFriend={(profile) => {
              handleToggleFriend(profile.id);
            }}
            onFollowPlayer={(roomId) => handleEnterHotel(roomId)}
          />
        )}

        {cmsTab === 'wardrobe' && (
          <WardrobeTab currentLook={player.look} onSaveLook={handleSaveLook} />
        )}

        {cmsTab === 'community' && (
          <CommunityTab
            rareValues={RARE_VALUES}
            news={news}
            player={player}
            accounts={accounts}
            customBadges={customBadges}
            onEquipBadge={handleEquipBadge}
          />
        )}

        {cmsTab === 'staff' && (
          <StaffTab staff={liveStaff} onFollowStaff={(roomId) => handleEnterHotel(roomId)} />
        )}

        {cmsTab === 'shop' && (
          <ShopVouchersTab
            player={player}
            onBuyItem={handleBuyCatalogueItem}
            onRedeemVoucher={handleRedeemVoucher}
          />
        )}

        {cmsTab === 'housekeeping' && player.rank >= 4 && (
          <HousekeepingTab
            accounts={accounts}
            ranks={ranks}
            bans={bans}
            vouchers={vouchers}
            customBadges={customBadges}
            currentUsername={player.username}
            onChangeRank={handleChangeAccountRank}
            onRemoveFromStaff={handleRemoveFromStaff}
            onEditUser={handleEditAccount}
            onUnbanUsername={handleUnbanUsername}
            onRefreshDatabase={() => {
              void refreshRetroSnapshot();
            }}
            onPostNews={handlePostNews}
            onMintAndAwardBadge={handleMintAndAwardBadge}
          />
        )}
      </main>

      <footer className="border-t border-[#8eb5d3] bg-[#a3d1f7] py-4 text-center text-xs font-semibold text-[#1e4a6d]">
        PIXL Hotel Retro Portal · PhoenixEmu / HoloCMS Relational Schema &amp; 3/4 Isometric Pixel Client
      </footer>
    </div>
  );
}

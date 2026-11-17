import { useCallback, useEffect, useMemo, useState } from 'react';
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
  resetAccountsDB,
  saveAccountsDB,
  setAccountRank,
  updateAccountAdminFields,
  type AdminUserEditPatch,
} from './game/accountsDb';
import { authenticateUser, registerUser, syncBadgesWithPlayer } from './game/auth';
import { buildHotelPlayerDirectory, toggleFriend } from './game/friends';
import {
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
import { buyPet } from './game/pets';
import { soundEngine } from './game/soundEngine';
import { executeTradeTransfer } from './game/trading';
import type {
  AccountRank,
  AppScreen,
  CmsTab,
  CustomBadgeDef,
  Direction,
  HabboNPC,
  LookConfig,
  PetSpecies,
  PlacedFurni,
  PlayerState,
  TradeSlotItem,
  UserAccount,
} from './game/types';

export default function App() {
  const [accounts, setAccounts] = useState<UserAccount[]>(() => loadAccountsDB());
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

  // Keep current player changes persisted into accounts list for switching accounts
  const updatePlayer = useCallback((updater: (prev: PlayerState) => PlayerState, extraBadgeId?: string) => {
    setPlayer((prev) => {
      const updated = syncBadgesWithPlayer(updater(prev), extraBadgeId);
      setAccounts((accList) =>
        accList.map((a) =>
          a.username.toLowerCase() === updated.username.toLowerCase()
            ? { ...a, playerState: updated }
            : a
        )
      );
      return updated;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleLogin = useCallback(
    (username: string, password: string): { ok: boolean; banned?: boolean; message: string } => {
      const res = authenticateUser(accounts, username, password);
      if (res.ok && res.account) {
        if (res.accounts) setAccounts(res.accounts);
        setPlayer(syncBadgesWithPlayer(res.account.playerState));
        setCmsTab('me');
        setScreen('cms');
      }
      return { ok: res.ok, banned: res.banned, message: res.message };
    },
    [accounts]
  );

  const handleRegister = useCallback(
    (
      username: string,
      password: string,
      confirmPassword: string,
      motto: string,
      look?: LookConfig
    ): { ok: boolean; message: string } => {
      const res = registerUser(accounts, username, password, confirmPassword, motto, look);
      if (res.ok && res.account && res.accounts) {
        setAccounts(res.accounts);
        setPlayer(syncBadgesWithPlayer(res.account.playerState));
        setCmsTab('me');
        setScreen('cms');
      }
      return { ok: res.ok, message: res.message };
    },
    [accounts]
  );

  const handleContinueAsGuest = useCallback(() => {
    const guestAcc = accounts.find((a) => a.username === 'PixelGuest');
    setPlayer(syncBadgesWithPlayer(guestAcc ? guestAcc.playerState : INITIAL_PLAYER_STATE));
    setCmsTab('me');
    setScreen('cms');
  }, [accounts]);

  const handleSignOut = useCallback(() => {
    setScreen('auth');
  }, []);

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
    (code: string): { ok: boolean; message: string } => {
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
      updatePlayer((prev) => {
        const res = buyCatalogueItem(prev, furniId, quantity, engravingMessage);
        outcome = { ok: res.ok, message: res.message };
        if (res.ok) soundEngine.playCreditChime();
        else soundEngine.playError();
        return res.player;
      });
      return outcome;
    },
    [updatePlayer]
  );

  const handleBuyPet = useCallback(
    (species: PetSpecies, customName: string): { ok: boolean; message: string } => {
      let outcome = { ok: false, message: '' };
      updatePlayer((prev) => {
        const room = INITIAL_ROOMS.find((r) => r.id === prev.currentRoomId) ?? INITIAL_ROOMS[0];
        const spawnTile = { x: room.spawn.x, y: Math.max(1, room.spawn.y - 1) };
        const res = buyPet(prev, species, customName, prev.currentRoomId, spawnTile);
        outcome = { ok: res.ok, message: res.message };
        if (res.ok) soundEngine.playCreditChime();
        else soundEngine.playError();
        return res.player;
      });
      return outcome;
    },
    [updatePlayer]
  );

  const handleSummonPetsToRoom = useCallback(
    (roomId: string) => {
      const room = INITIAL_ROOMS.find((r) => r.id === roomId) ?? INITIAL_ROOMS[0];
      soundEngine.playClick();
      updatePlayer((prev) => ({
        ...prev,
        pets: (prev.pets ?? []).map((p, idx) => ({
          ...p,
          roomId,
          x: room.spawn.x + (idx % 2 === 0 ? 0 : 1),
          y: Math.max(1, room.spawn.y - 1),
          anim: 'stand',
        })),
      }));
    },
    [updatePlayer]
  );

  const handleCarePet = useCallback(
    (petId: string, kind: 'feed' | 'play') => {
      soundEngine.playCreditChime();
      updatePlayer((prev) => ({
        ...prev,
        pets: (prev.pets ?? []).map((p) =>
          p.id !== petId
            ? p
            : {
                ...p,
                hunger: kind === 'feed' ? Math.min(100, p.hunger + 22) : p.hunger,
                happiness: Math.min(100, p.happiness + (kind === 'play' ? 18 : 10)),
              }
        ),
      }));
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
      let outcome = { ok: false, message: '' };
      updatePlayer((prev) => {
        const res = executeTradeTransfer(
          prev,
          offeredItems,
          offeredCredits,
          receivedItems,
          receivedCredits
        );
        outcome = { ok: res.ok, message: res.message };
        if (res.ok) soundEngine.playCreditChime();
        else soundEngine.playError();
        return res.player;
      });
      return outcome;
    },
    [updatePlayer]
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

  const handlePlaceFurni = useCallback(
    (roomId: string, furniId: string, x: number, y: number, dir: Direction) => {
      const room = INITIAL_ROOMS.find((r) => r.id === roomId);
      if (!room) return { ok: false, message: 'Room not found.' };
      const currentPlaced = roomFurniMap[roomId] ?? [];
      const res = placeFurniFromInventory(
        player.inventory,
        currentPlaced,
        room,
        furniId,
        x,
        y,
        dir,
        player.pendingEngravings ?? {}
      );
      if (res.ok) {
        updatePlayer(
          (prev) => ({
            ...prev,
            inventory: res.inventory,
            pendingEngravings: res.pendingEngravings,
          }),
          'badge_architect'
        );
        setRoomFurniMap((prev) => ({ ...prev, [roomId]: res.placedFurni }));
      }
      return { ok: res.ok, message: res.message };
    },
    [player.inventory, player.pendingEngravings, roomFurniMap, updatePlayer]
  );

  const handleRotateFurni = useCallback((roomId: string, uid: string) => {
    setRoomFurniMap((prev) => ({
      ...prev,
      [roomId]: rotatePlacedFurni(prev[roomId] ?? [], uid),
    }));
  }, []);

  const handlePickupFurni = useCallback(
    (roomId: string, uid: string) => {
      const currentPlaced = roomFurniMap[roomId] ?? [];
      const res = pickupFurniToInventory(
        player.inventory,
        currentPlaced,
        uid,
        player.pendingEngravings ?? {}
      );
      if (res.ok) {
        updatePlayer((prev) => ({
          ...prev,
          inventory: res.inventory,
          pendingEngravings: res.pendingEngravings,
        }));
        setRoomFurniMap((prev) => ({ ...prev, [roomId]: res.placedFurni }));
      }
    },
    [player.inventory, player.pendingEngravings, roomFurniMap, updatePlayer]
  );

  const handleToggleFurniState = useCallback((roomId: string, uid: string, nextState: number) => {
    setRoomFurniMap((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] ?? []).map((f) => (f.uid === uid ? { ...f, state: nextState } : f)),
    }));
  }, []);

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

  const handleKickUser = useCallback(
    (roomId: string, npc: HabboNPC) => {
      setModerationState((prev) =>
        kickUserFromRoom(prev, roomId, npc.id, npc.name, player.username)
      );
    },
    [player.username]
  );

  const handleBanUser = useCallback(
    (roomId: string, npc: HabboNPC) => {
      setModerationState((prev) =>
        banUserFromRoom(prev, roomId, npc.id, npc.name, player.username)
      );
    },
    [player.username]
  );

  const handleUnbanUser = useCallback(
    (roomId: string, npc: HabboNPC) => {
      setModerationState((prev) =>
        unbanUserFromRoom(prev, roomId, npc.id, npc.name, player.username)
      );
    },
    [player.username]
  );

  const handleToggleFriend = useCallback(
    (profileId: string): { action: 'added' | 'removed' } => {
      let action: 'added' | 'removed' = 'added';
      updatePlayer((prev) => {
        const res = toggleFriend(prev, profileId);
        action = res.action;
        return res.player;
      });
      return { action };
    },
    [updatePlayer]
  );

  const handleChangeAccountRank = useCallback(
    (accountId: string, nextRank: AccountRank) => {
      setAccounts((prev) => {
        const next = setAccountRank(prev, accountId, nextRank);
        const edited = next.find((a) => a.id === accountId);
        if (edited && edited.username.toLowerCase() === player.username.toLowerCase()) {
          setPlayer(syncBadgesWithPlayer(edited.playerState));
        }
        return next;
      });
    },
    [player.username]
  );

  const handleRemoveFromStaff = useCallback((accountId: string) => {
    setAccounts((prev) => demoteFromStaff(prev, accountId));
  }, []);

  const handleEditAccount = useCallback(
    (accountId: string, patch: AdminUserEditPatch) => {
      setAccounts((prev) => {
        const next = updateAccountAdminFields(prev, accountId, patch);
        const edited = next.find((a) => a.id === accountId);
        if (edited && edited.username.toLowerCase() === player.username.toLowerCase()) {
          setPlayer(syncBadgesWithPlayer(edited.playerState));
        }
        return next;
      });
    },
    [player.username]
  );

  const handleResetAccountsDB = useCallback(() => {
    const fresh = resetAccountsDB();
    setAccounts(fresh);
    const matching = fresh.find((a) => a.username.toLowerCase() === player.username.toLowerCase());
    if (matching) {
      setPlayer(syncBadgesWithPlayer(matching.playerState));
    }
  }, [player.username]);

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
        createdBy: player.username,
      });
      if (!minted.ok || !minted.badge) {
        return { ok: false, message: minted.message };
      }

      setCustomBadges(minted.badges);
      setAccounts((prev) => {
        const updated = awardCustomBadgeToAccount(
          prev,
          input.recipientAccountId,
          minted.badge!.id
        );
        const targetAcc = updated.find((a) => a.id === input.recipientAccountId);
        if (targetAcc && targetAcc.username.toLowerCase() === player.username.toLowerCase()) {
          setPlayer(syncBadgesWithPlayer(targetAcc.playerState));
        }
        return updated;
      });
      const recipient = accounts.find((a) => a.id === input.recipientAccountId);
      return {
        ok: true,
        message: `${minted.message} Awarded to ${recipient?.username ?? input.recipientAccountId}!`,
      };
    },
    [customBadges, player.username, accounts]
  );

  const activeRoom = INITIAL_ROOMS.find((r) => r.id === player.currentRoomId) ?? INITIAL_ROOMS[0];
  const liveStaff = useMemo(() => deriveStaffMembersFromAccounts(accounts), [accounts]);
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
        rooms={INITIAL_ROOMS}
        roomFurniMap={roomFurniMap}
        npcs={INITIAL_NPCS}
        customBadges={customBadges}
        muted={muted}
        onToggleMute={handleToggleMute}
        onBackToCms={handleBackToCms}
        onSwitchRoom={(roomId) => updatePlayer((prev) => ({ ...prev, currentRoomId: roomId }))}
        onBuyCatalogueItem={handleBuyCatalogueItem}
        onBuyPet={handleBuyPet}
        onSummonPetsToRoom={handleSummonPetsToRoom}
        onCarePet={handleCarePet}
        onConfirmTrade={handleConfirmTrade}
        onAwardBanzaiReward={handleAwardBanzaiReward}
        onPlaceFurni={handlePlaceFurni}
        onRotateFurni={handleRotateFurni}
        onPickupFurni={handlePickupFurni}
        onToggleFurniState={handleToggleFurniState}
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
        onlineCount={148}
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
            rooms={INITIAL_ROOMS}
            friends={friendProfiles}
            news={INITIAL_NEWS}
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
            rooms={INITIAL_ROOMS}
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
            news={INITIAL_NEWS}
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
            customBadges={customBadges}
            currentUsername={player.username}
            onChangeRank={handleChangeAccountRank}
            onRemoveFromStaff={handleRemoveFromStaff}
            onEditUser={handleEditAccount}
            onResetDatabase={handleResetAccountsDB}
            onMintAndAwardBadge={handleMintAndAwardBadge}
          />
        )}
      </main>

      <footer className="border-t border-[#8eb5d3] bg-[#a3d1f7] py-4 text-center text-xs font-semibold text-[#1e4a6d]">
        PIXL Hotel Retro Portal · PIXL CMS v2.6 &amp; 3/4 Isometric Pixel Client
      </footer>
    </div>
  );
}

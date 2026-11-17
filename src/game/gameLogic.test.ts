import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_PLAYER_STATE, INITIAL_ROOMS } from './data';
import {
  buyCatalogueItem,
  pickupFurniToInventory,
  placeFurniFromInventory,
  purchaseHC,
  redeemVoucher,
  rotatePlacedFurni,
} from './economy';
import { findPath, gridToScreen, screenToGrid } from './isoMath';

test('voucher redemption grants credits, HC days, and rare Fire Dragon Lamp once', () => {
  const r1 = redeemVoucher(INITIAL_PLAYER_STATE, 'pixl2026');
  assert.equal(r1.ok, true);
  assert.equal(r1.player.credits, INITIAL_PLAYER_STATE.credits + 250);
  assert.equal(r1.player.duckets, INITIAL_PLAYER_STATE.duckets + 100);

  // Duplicate voucher is rejected
  const r1Dup = redeemVoucher(r1.player, 'PIXL2026');
  assert.equal(r1Dup.ok, false);
  assert.equal(r1Dup.player.credits, r1.player.credits);

  // FREEHC adds 14 days
  const r2 = redeemVoucher(r1.player, 'FREEHC');
  assert.equal(r2.ok, true);
  assert.equal(r2.player.hcDays, r1.player.hcDays + 14);

  // DRAGON adds Fire Dragon Lamp to inventory
  const r3 = redeemVoucher(r2.player, 'DRAGON');
  assert.equal(r3.ok, true);
  const dragon = r3.player.inventory.find((i) => i.furniId === 'fire_dragon');
  assert.equal(dragon?.quantity, 1);
});

test('catalogue purchase and HC extension deduct currency and update inventory', () => {
  const hcRes = purchaseHC(INITIAL_PLAYER_STATE, 31, 50);
  assert.equal(hcRes.ok, true);
  assert.equal(hcRes.player.hcDays, INITIAL_PLAYER_STATE.hcDays + 31);
  assert.equal(hcRes.player.credits, INITIAL_PLAYER_STATE.credits - 50);

  const buyRes = buyCatalogueItem(hcRes.player, 'throne');
  assert.equal(buyRes.ok, true);
  assert.equal(buyRes.player.credits, hcRes.player.credits - 120);
  assert.equal(buyRes.player.inventory.find((i) => i.furniId === 'throne')?.quantity, 1);
});

test('placing, rotating, and picking up furni updates room and inventory cleanly', () => {
  const room = INITIAL_ROOMS.find((r) => r.id === 'my_room')!;
  const inv = [{ furniId: 'throne', quantity: 1 }];
  const placed = [...room.initialFurni];

  // Tile (2,2) already has an hc_sofa so placing solid furni there fails
  const blocked = placeFurniFromInventory(inv, placed, room, 'throne', 2, 2, 0);
  assert.equal(blocked.ok, false);

  // Tile (5,5) is open
  const okPlace = placeFurniFromInventory(inv, placed, room, 'throne', 5, 5, 0);
  assert.equal(okPlace.ok, true);
  assert.equal(okPlace.inventory.length, 0);
  assert.equal(okPlace.placedFurni.length, placed.length + 1);

  const newUid = okPlace.placedFurni[okPlace.placedFurni.length - 1].uid;
  const rotated = rotatePlacedFurni(okPlace.placedFurni, newUid);
  assert.equal(rotated.find((f) => f.uid === newUid)?.dir, 1);

  const picked = pickupFurniToInventory(okPlace.inventory, rotated, newUid);
  assert.equal(picked.ok, true);
  assert.equal(picked.inventory.find((i) => i.furniId === 'throne')?.quantity, 1);
  assert.equal(picked.placedFurni.length, placed.length);
});

test('isometric gridToScreen and screenToGrid invert accurately at tile centers', () => {
  const originX = 500;
  const originY = 200;
  const pt = gridToScreen(4, 3, originX, originY);
  // Tile center is offset down by half tile height
  const back = screenToGrid(pt.x, pt.y + 16, originX, originY);
  assert.equal(back.x, 4);
  assert.equal(back.y, 3);
});

import { authenticateUser, getInitialAccounts, registerUser, syncBadgesWithPlayer } from './auth';

test('A* pathfinding routes around obstacles and reaches sittable chairs', () => {
  const room = INITIAL_ROOMS.find((r) => r.id === 'welcome_lounge')!;
  // Walk from spawn (4,7) to seat at (6,3) around furniture
  const path = findPath(room, room.initialFurni, 4, 7, 6, 3);
  assert.ok(path.length > 0, 'Should find a valid path to the HC Club Sofa');
  assert.deepEqual(path[path.length - 1], { x: 6, y: 3 });

  // Should not path onto solid non-sittable fireplace at (4,1)
  const blockedPath = findPath(room, room.initialFurni, 4, 7, 4, 1);
  assert.equal(blockedPath.length, 0);
});

test('admin login succeeds with Krawattenmanni / Manni123 and rejects wrong password', () => {
  const accounts = getInitialAccounts();
  const bad = authenticateUser(accounts, 'Krawattenmanni', 'wrong');
  assert.equal(bad.ok, false);

  const ok = authenticateUser(accounts, 'Krawattenmanni', 'Manni123');
  assert.equal(ok.ok, true);
  assert.equal(ok.account?.role, 'admin');
  assert.equal(ok.account?.playerState.username, 'Krawattenmanni');
  assert.ok(ok.account?.playerState.unlockedBadges.includes('badge_admin'));
});

test('registration validates inputs, rejects duplicates, and creates a new player account', () => {
  const accounts = getInitialAccounts();
  const dup = registerUser(accounts, 'Krawattenmanni', 'secret12', 'secret12');
  assert.equal(dup.ok, false);

  const mismatch = registerUser(accounts, 'RetroHero', 'pass123', 'pass999');
  assert.equal(mismatch.ok, false);

  const created = registerUser(accounts, 'RetroHero', 'pass123', 'pass123', 'Hello PIXL Hotel!');
  assert.equal(created.ok, true);
  assert.equal(created.account?.role, 'player');
  assert.equal(created.accounts?.length, accounts.length + 1);

  const loginNew = authenticateUser(created.accounts!, 'RetroHero', 'pass123');
  assert.equal(loginNew.ok, true);
  assert.equal(loginNew.account?.playerState.motto, 'Hello PIXL Hotel!');
});

import {
  banUserFromRoom,
  createInitialModerationState,
  getActiveRoomNpcs,
  isRoomOwnerOrAdmin,
  kickUserFromRoom,
  unbanUserFromRoom,
} from './moderation';
import { INITIAL_NPCS, ADMIN_PLAYER_STATE } from './data';

test('badge syncing automatically unlocks badges when earning rares or redeeming vouchers', () => {
  const res = redeemVoucher(INITIAL_PLAYER_STATE, 'DRAGON');
  const synced = syncBadgesWithPlayer(res.player);
  assert.ok(synced.unlockedBadges.includes('badge_voucher'));
  assert.ok(synced.unlockedBadges.includes('badge_dragon'));
});

test('room owner and hotel admin can kick, ban, and unban users from current room', () => {
  const myRoom = INITIAL_ROOMS.find((r) => r.id === 'my_room')!;
  const lobby = INITIAL_ROOMS.find((r) => r.id === 'welcome_lounge')!;

  assert.equal(isRoomOwnerOrAdmin(myRoom, INITIAL_PLAYER_STATE), true);
  assert.equal(isRoomOwnerOrAdmin(lobby, INITIAL_PLAYER_STATE), false);
  assert.equal(isRoomOwnerOrAdmin(lobby, ADMIN_PLAYER_STATE), true);

  let mod = createInitialModerationState();
  const initialInMyRoom = getActiveRoomNpcs(INITIAL_NPCS, 'my_room', mod);
  assert.ok(initialInMyRoom.length >= 2);
  const firstNpc = initialInMyRoom[0];
  const secondNpc = initialInMyRoom[1];

  mod = kickUserFromRoom(mod, 'my_room', firstNpc.id, firstNpc.name, 'PixelGuest');
  assert.equal(
    getActiveRoomNpcs(INITIAL_NPCS, 'my_room', mod).some((n) => n.id === firstNpc.id),
    false
  );

  mod = banUserFromRoom(mod, 'my_room', secondNpc.id, secondNpc.name, 'PixelGuest');
  assert.equal(
    getActiveRoomNpcs(INITIAL_NPCS, 'my_room', mod).some((n) => n.id === secondNpc.id),
    false
  );
  assert.ok(mod.bannedByRoom['my_room'].includes(secondNpc.id));

  mod = unbanUserFromRoom(mod, 'my_room', secondNpc.id, secondNpc.name, 'PixelGuest');
  assert.equal(
    getActiveRoomNpcs(INITIAL_NPCS, 'my_room', mod).some((n) => n.id === secondNpc.id),
    true
  );
});

import { buildHotelPlayerDirectory, filterPlayerDirectory, isFriend, toggleFriend } from './friends';
import { STAFF_MEMBERS } from './data';

test('player directory lists players with badges and supports adding/removing friends', () => {
  const accounts = getInitialAccounts();
  const directory = buildHotelPlayerDirectory(INITIAL_NPCS, STAFF_MEMBERS, accounts, 'PixelGuest');

  // Marco, Pixie, Frank, Vega, Nova, Bobby, etc. should be present
  const nova = directory.find((p) => p.name === 'RetroNova');
  assert.ok(nova, 'RetroNova should be in player directory');
  assert.ok(nova.badges.length >= 2, 'Player profile should expose badges');
  assert.equal(isFriend(INITIAL_PLAYER_STATE, nova.id), false);

  const added = toggleFriend(INITIAL_PLAYER_STATE, nova.id);
  assert.equal(added.action, 'added');
  assert.equal(isFriend(added.player, nova.id), true);

  const onlyFriends = filterPlayerDirectory(directory, 'nova', 'friends', added.player.friendIds);
  assert.equal(onlyFriends.length, 1);
  assert.equal(onlyFriends[0].name, 'RetroNova');

  const removed = toggleFriend(added.player, nova.id);
  assert.equal(removed.action, 'removed');
  assert.equal(isFriend(removed.player, nova.id), false);
});

import {
  ACCOUNTS_DB_STORAGE_KEY,
  demoteFromStaff,
  deriveStaffMembersFromAccounts,
  getAccountsDbStats,
  loadAccountsDB,
  resetAccountsDB,
  saveAccountsDB,
  setAccountRank,
  updateAccountAdminFields,
  type StorageLike,
} from './accountsDb';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
  };
}

test('accountsDB seeds Krawattenmanni + 10 realistic users and persists registrations across reloads', () => {
  const storage = createMemoryStorage();
  const seeded = loadAccountsDB(storage);
  assert.equal(seeded.length, 11);
  assert.equal(seeded[0].username, 'Krawattenmanni');
  assert.equal(seeded[0].rank, 5);
  assert.equal(seeded[0].playerState.credits, 5000);
  assert.ok(storage.getItem(ACCOUNTS_DB_STORAGE_KEY));

  const reg = registerUser(seeded, 'HousekeepingTester', 'test123', 'test123', 'Testing DB!');
  assert.equal(reg.ok, true);
  assert.equal(reg.account?.id, '#012');
  assert.equal(reg.account?.rank, 1);

  saveAccountsDB(reg.accounts!, storage);
  const reloaded = loadAccountsDB(storage);
  assert.equal(reloaded.length, 12);
  assert.equal(reloaded.find((a) => a.username === 'HousekeepingTester')?.id, '#012');

  const reset = resetAccountsDB(storage);
  assert.equal(reset.length, 11);
});

test('Housekeeping rank promotion, staff removal, ban enforcement, and live Staff page sync', () => {
  let db = getInitialAccounts();
  const marco = db.find((a) => a.username === 'BaristaMarco')!;
  assert.equal(marco.rank, 1);

  // Promote BaristaMarco to Rank 4 Moderator
  db = setAccountRank(db, marco.id, 4);
  let staff = deriveStaffMembersFromAccounts(db);
  const marcoStaff = staff.find((s) => s.name === 'BaristaMarco');
  assert.ok(marcoStaff, 'Promoted Moderator should immediately appear in Staff list');
  assert.equal(marcoStaff.department, 'Moderators');
  assert.equal(marcoStaff.badgeCode, 'MOD');

  // Demote BaristaMarco back to Rank 1 User
  db = demoteFromStaff(db, marco.id);
  staff = deriveStaffMembersFromAccounts(db);
  assert.equal(staff.some((s) => s.name === 'BaristaMarco'), false);

  // Edit credits and ban RetroNova -> blocks login & updates stats
  const nova = db.find((a) => a.username === 'RetroNova')!;
  db = updateAccountAdminFields(db, nova.id, {
    credits: 999,
    banned: true,
    banReason: 'Spamming dice tables',
  });
  const banLogin = authenticateUser(db, 'RetroNova', 'nova123');
  assert.equal(banLogin.ok, false);
  assert.equal(banLogin.banned, true);

  const stats = getAccountsDbStats(db);
  assert.equal(stats.bannedCount, 1);
  assert.equal(stats.totalAccounts, 11);
});

import { buyPet, parsePetChatCommand } from './pets';
import { executeTradeTransfer, generateAiCounterOffer } from './trading';
import {
  computeBanzaiScores,
  createInitialBanzaiTiles,
  resolveBanzaiMatch,
  stepBanzaiTile,
} from './banzai';
import {
  awardCustomBadgeToAccount,
  createStarterCrownGrid,
  findBadgeDefById,
  mintCustomBadge,
} from './customBadges';

test('pets can be adopted with custom names and respond to English/German chat commands', () => {
  const res = buyPet(INITIAL_PLAYER_STATE, 'golden_terrier', 'Bello', 'welcome_lounge');
  assert.equal(res.ok, true);
  assert.equal(res.pet?.name, 'Bello');
  assert.equal(res.pet?.species, 'golden_terrier');
  assert.equal(res.player.credits, INITIAL_PLAYER_STATE.credits - 60);
  assert.equal(res.player.pets.length, 1);

  assert.equal(parsePetChatCommand('sitz', 'golden_terrier')?.anim, 'sit');
  assert.equal(parsePetChatCommand('sit', 'golden_terrier')?.reaction, '*woof!*');
  assert.equal(parsePetChatCommand('platz', 'tabby_kitten')?.anim, 'lay');
  assert.equal(parsePetChatCommand('spring', 'tabby_kitten')?.reaction, '*purr~*');
  assert.equal(parsePetChatCommand('speak', 'baby_dragon')?.reaction, '*puffs smoke*');
  assert.equal(parsePetChatCommand('hello friend', 'golden_terrier'), null);
});

test('2-column trading generates fair AI counter-offer and atomically swaps items and credits', () => {
  const traderPlayer = {
    ...INITIAL_PLAYER_STATE,
    credits: 300,
    inventory: [{ furniId: 'hc_sofa', quantity: 2 }],
  };

  const aiOffer = generateAiCounterOffer('npc-marco', [{ furniId: 'hc_sofa', quantity: 1 }], 20);
  assert.ok(aiOffer.items.length > 0 || aiOffer.credits > 0);

  const tx = executeTradeTransfer(
    traderPlayer,
    [{ furniId: 'hc_sofa', quantity: 1 }],
    20,
    aiOffer.items,
    aiOffer.credits
  );
  assert.equal(tx.ok, true);
  assert.equal(tx.player.credits, 300 - 20 + aiOffer.credits);
  assert.equal(tx.player.inventory.find((i) => i.furniId === 'hc_sofa')?.quantity, 1);
  for (const received of aiOffer.items) {
    assert.ok(tx.player.inventory.some((i) => i.furniId === received.furniId));
  }

  // Rejects overspending credits
  const badTx = executeTradeTransfer(traderPlayer, [], 9999, [{ furniId: 'throne', quantity: 1 }], 0);
  assert.equal(badTx.ok, false);
});

test('Battle Banzai locks tiles after 3 steps, prevents stealing locked tiles, and awards +150c/+100d on Blue win', () => {
  let tiles = createInitialBanzaiTiles();
  // Step on (3,3) 3 times for Blue
  let step = stepBanzaiTile(tiles, 3, 3, 'blue');
  assert.equal(step.tiles['3,3'].level, 1);
  assert.equal(step.justLocked, false);

  step = stepBanzaiTile(step.tiles, 3, 3, 'blue');
  assert.equal(step.tiles['3,3'].level, 2);

  step = stepBanzaiTile(step.tiles, 3, 3, 'blue');
  assert.equal(step.tiles['3,3'].level, 3);
  assert.equal(step.justLocked, true);

  // Red Bot cannot steal a locked tile
  const stealAttempt = stepBanzaiTile(step.tiles, 3, 3, 'red');
  assert.equal(stealAttempt.changed, false);
  assert.equal(stealAttempt.tiles['3,3'].team, 'blue');

  const scores = computeBanzaiScores(stealAttempt.tiles);
  assert.equal(scores.blue, 1);
  assert.equal(scores.red, 0);

  const resolved = resolveBanzaiMatch(stealAttempt.tiles, INITIAL_PLAYER_STATE);
  assert.equal(resolved.playerWon, true);
  assert.equal(resolved.creditsAwarded, 150);
  assert.equal(resolved.ducketsAwarded, 100);
  assert.equal(resolved.player.credits, INITIAL_PLAYER_STATE.credits + 150);
  assert.equal(resolved.player.duckets, INITIAL_PLAYER_STATE.duckets + 100);
});

test('Housekeeping 16x16 custom badge minting & engraved trophy metadata persistence', () => {
  const grid = createStarterCrownGrid();
  const minted = mintCustomBadge([], {
    code: 'vip1',
    name: 'Royal Pixel Crest',
    pixels: grid,
    createdBy: 'KrawattenManni',
  });
  assert.equal(minted.ok, true);
  assert.equal(minted.badge?.code, 'VIP1');

  const found = findBadgeDefById(minted.badge!.id, minted.badges);
  assert.ok(found);
  assert.equal(found?.name, 'Royal Pixel Crest');

  let db = getInitialAccounts();
  db = awardCustomBadgeToAccount(db, '#001', minted.badge!.id);
  assert.ok(db[0].playerState.unlockedBadges.includes(minted.badge!.id));

  // Engraved Trophy buy -> place -> pickup preserves engraving
  const richPlayer = { ...INITIAL_PLAYER_STATE, credits: 500 };
  const bought = buyCatalogueItem(richPlayer, 'gold_trophy', 1, 'Champion of 2026!');
  assert.equal(bought.ok, true);
  assert.equal(bought.player.pendingEngravings['gold_trophy']?.length, 1);

  const myRoom = INITIAL_ROOMS.find((r) => r.id === 'my_room')!;
  const placed = placeFurniFromInventory(
    bought.player.inventory,
    myRoom.initialFurni,
    myRoom,
    'gold_trophy',
    5,
    5,
    0,
    bought.player.pendingEngravings
  );
  assert.equal(placed.ok, true);
  const placedTrophy = placed.placedFurni[placed.placedFurni.length - 1];
  assert.equal(placedTrophy.customData?.inscription, 'Champion of 2026!');

  const picked = pickupFurniToInventory(
    placed.inventory,
    placed.placedFurni,
    placedTrophy.uid,
    placed.pendingEngravings
  );
  assert.equal(picked.ok, true);
  assert.equal(picked.pendingEngravings['gold_trophy']?.[0]?.inscription, 'Champion of 2026!');
});

import { CARRY_ITEMS, MOODLIGHT_PRESETS, parseClientCommand } from './clientFeatures';
import { soundEngine } from './soundEngine';

test('PIXL Hotel client commands (:moonwalk, :sit, :cola, :furni, :roll, o/) parse accurately and soundEngine stays silent outside hotel client', () => {
  // soundEngine defaults to inGame=false so CMS is 100% silent
  assert.equal(soundEngine.isInGame(), false);
  soundEngine.setInGame(true);
  assert.equal(soundEngine.isInGame(), true);
  soundEngine.setInGame(false);
  assert.equal(soundEngine.isInGame(), false);

  assert.deepEqual(parseClientCommand(':commands'), { type: 'commands_help' });
  assert.deepEqual(parseClientCommand(':furni'), { type: 'furni_chooser' });
  assert.deepEqual(parseClientCommand(':chooser'), { type: 'furni_chooser' });
  assert.deepEqual(parseClientCommand(':moodlight'), { type: 'moodlight_toggle' });
  assert.deepEqual(parseClientCommand(':moonwalk'), { type: 'moonwalk' });
  assert.deepEqual(parseClientCommand(':sit'), { type: 'pose', pose: 'sit' });
  assert.deepEqual(parseClientCommand(':stand'), { type: 'pose', pose: 'stand' });
  assert.deepEqual(parseClientCommand(':habnam'), { type: 'pose', pose: 'dance' });
  assert.deepEqual(parseClientCommand('o/'), { type: 'pose', pose: 'wave' });
  assert.deepEqual(parseClientCommand(':cola'), { type: 'carry', item: 'cola' });
  assert.deepEqual(parseClientCommand(':coffee'), { type: 'carry', item: 'coffee' });
  assert.deepEqual(parseClientCommand(':drop'), { type: 'carry', item: 'none' });
  assert.deepEqual(parseClientCommand(':pickall'), { type: 'pickall' });

  const rollCmd = parseClientCommand(':roll', () => 0.99);
  assert.deepEqual(rollCmd, { type: 'roll', rolled: 6 });

  assert.equal(parseClientCommand('Hello everyone in the lounge!'), null);
  assert.ok(CARRY_ITEMS.length >= 6);
  assert.ok(MOODLIGHT_PRESETS.length >= 6);

  // PIXL2026 and DAILY vouchers work cleanly
  const pixlVoucher = redeemVoucher(INITIAL_PLAYER_STATE, 'PIXL2026');
  assert.equal(pixlVoucher.ok, true);
  assert.equal(pixlVoucher.player.credits, INITIAL_PLAYER_STATE.credits + 250);
});

import {
  groupInventoryFromItemRows,
  groupPlacedItemsByRoom,
  mapAccountToUserDbUpdate,
  mapBanRow,
  mapCmsNewsRowToNewsArticle,
  mapItemRowToPlacedFurni,
  mapRankRow,
  mapRoomRowToRoomDef,
  mapUserPetRowToOwnedPet,
  mapUserRowToUserAccount,
  mapVoucherRow,
  serializeItemExtraData,
} from './supabaseSync';

test('PhoenixEmu / HoloCMS relational row mappers hydrate users, bans, rooms, items (room_id=0 inventory rule), pets, news, and vouchers', () => {
  const rank = mapRankRow({ id: 5, name: 'Hotel Manager', badge_code: 'ADM' });
  assert.equal(rank.id, 5);
  assert.equal(rank.badgeCode, 'ADM');

  const ban = mapBanRow({
    id: 1,
    bantype: 'user',
    value: 'BannedTester',
    reason: 'Flooding the lounge',
    expire: '0',
    added_by: 'Krawattenmanni',
    added_date: '2026-11-16T10:00:00Z',
  });
  assert.equal(ban.value, 'BannedTester');
  assert.equal(ban.reason, 'Flooding the lounge');

  const room = mapRoomRowToRoomDef({
    id: 3,
    caption: 'Battle Banzai Arena',
    owner: 'Krawattenmanni',
    description: 'Neon arena',
    model_name: 'model_banzai',
    state: 'open',
    users_now: 2,
    users_max: 25,
    category: 2,
  });
  assert.equal(room.id, '3');
  assert.equal(room.numericId, 3);
  assert.equal(room.floorTheme, 'banzai');

  const itemRows = [
    {
      id: 101,
      user_id: 1,
      room_id: 0, // Inventory rule: room_id = 0
      item_type: 'gold_trophy',
      extra_data: serializeItemExtraData(1, {
        inscription: 'Phoenix Champion',
        engravedBy: 'Krawattenmanni',
        engravedAt: '2026-11-16',
      }),
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    },
    {
      id: 102,
      user_id: 1,
      room_id: 3, // Placed in room #3
      item_type: 'fire_dragon',
      extra_data: '1',
      x: 4,
      y: 2,
      z: 0,
      rot: 2,
    },
  ];

  const invGrouped = groupInventoryFromItemRows(itemRows, 1);
  assert.equal(invGrouped.inventory.length, 1);
  assert.equal(invGrouped.inventory[0].furniId, 'gold_trophy');
  assert.deepEqual(invGrouped.inventory[0].itemIds, [101]);
  assert.equal(invGrouped.pendingEngravings['gold_trophy']?.[0]?.inscription, 'Phoenix Champion');

  const placedGrouped = groupPlacedItemsByRoom(itemRows, [room], new Map([[1, 'Krawattenmanni']]));
  assert.equal(placedGrouped['3'].length, 1);
  assert.equal(placedGrouped['3'][0].itemId, 102);
  assert.equal(placedGrouped['3'][0].state, 1);
  assert.equal(placedGrouped['3'][0].dir, 2);

  const singlePlaced = mapItemRowToPlacedFurni(itemRows[0], new Map([[1, 'Krawattenmanni']]));
  assert.equal(singlePlaced.customData?.inscription, 'Phoenix Champion');

  const pet = mapUserPetRowToOwnedPet(
    {
      id: 7,
      user_id: 1,
      room_id: 3,
      name: 'Ignis',
      type: 'baby_dragon',
      color: 'Red',
      nutrition: 90,
      happiness: 95,
      x: 5,
      y: 5,
    },
    'Krawattenmanni'
  );
  assert.equal(pet.id, 'pet-7');
  assert.equal(pet.species, 'baby_dragon');

  const userAcc = mapUserRowToUserAccount({
    row: {
      id: 1,
      username: 'Krawattenmanni',
      password: 'admin123',
      mail: 'habbo@pixlhotel.ch',
      motto: 'Founder of Pixlhotel',
      look: null,
      gender: 'M',
      rank: 5,
      credits: 5000,
      duckets: 2500,
      hc_days: 365,
      online: true,
      account_created: '2026-11-16T09:00:00Z',
      last_online: '2026-11-16T09:00:00Z',
    },
    bans: [ban],
    itemRows,
    badgeRows: [
      { id: 1, user_id: 1, badge_id: 'ADM', badge_slot: 1, pixel_data: null },
    ],
    petRows: [
      {
        id: 7,
        user_id: 1,
        room_id: 3,
        name: 'Ignis',
        type: 'baby_dragon',
        color: 'Red',
        nutrition: 90,
        happiness: 95,
        x: 5,
        y: 5,
      },
    ],
    friendshipRows: [{ id: 1, user_one_id: 1, user_two_id: 2 }],
    defaultRoomId: '1',
  });

  assert.equal(userAcc.id, '1');
  assert.equal(userAcc.displayId, '#1');
  assert.equal(userAcc.numericId, 1);
  assert.equal(userAcc.banned, false);
  assert.ok(userAcc.playerState.friendIds.includes('acc-2'));
  assert.equal(userAcc.playerState.pets.length, 1);
  assert.equal(userAcc.playerState.inventory[0].furniId, 'gold_trophy');

  const dbUpdate = mapAccountToUserDbUpdate(userAcc);
  assert.equal(dbUpdate.credits, 5000);
  assert.equal(dbUpdate.hc_days, 365);

  const news = mapCmsNewsRowToNewsArticle({
    id: 1,
    title: 'Welcome!',
    shortstory: 'Short intro',
    longstory: 'Paragraph 1\nParagraph 2',
    image: 'teal',
    author: 'Krawattenmanni',
    published: '2026-11-16T12:00:00Z',
  });
  assert.equal(news.bannerPalette, 'teal');
  assert.equal(news.body.length, 2);

  const voucher = mapVoucherRow({
    id: 1,
    code: 'habbo2026',
    credits: 500,
    duckets: 250,
    hc_days: 0,
    badge_id: '',
    uses: 999,
  });
  assert.equal(voucher.code, 'HABBO2026');
  assert.equal(voucher.credits, 500);
});


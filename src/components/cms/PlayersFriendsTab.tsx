import { useMemo, useState } from 'react';
import { Award, DoorOpen, Search, UserCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { findBadgeDefById } from '../../game/customBadges';
import {
  filterPlayerDirectory,
  isFriend,
  type PlayerDirectoryFilter,
} from '../../game/friends';
import type { CustomBadgeDef, PlayerProfileRecord, PlayerState, RoomDef } from '../../game/types';
import {
  PixelAvatarCanvas,
  PixelBadge,
  PixelBadgeSprite,
  PixelHeadCanvas,
} from '../PixelSpriteCanvas';

interface PlayersFriendsTabProps {
  player: PlayerState;
  directory: PlayerProfileRecord[];
  rooms: RoomDef[];
  customBadges?: CustomBadgeDef[];
  initialSelectedId?: string | null;
  onToggleFriend: (profile: PlayerProfileRecord) => void;
  onFollowPlayer: (roomId: string) => void;
}

export function PlayersFriendsTab({
  player,
  directory,
  rooms,
  customBadges = [],
  initialSelectedId,
  onToggleFriend,
  onFollowPlayer,
}: PlayersFriendsTabProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PlayerDirectoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(
    () => initialSelectedId || directory[0]?.id || ''
  );

  const filteredPlayers = useMemo(
    () => filterPlayerDirectory(directory, query, filter, player.friendIds),
    [directory, query, filter, player.friendIds]
  );

  const selectedProfile =
    directory.find((p) => p.id === selectedId) ?? filteredPlayers[0] ?? directory[0] ?? null;

  const myFriends = useMemo(
    () => directory.filter((p) => player.friendIds.includes(p.id)),
    [directory, player.friendIds]
  );

  const selectedRoomName = selectedProfile?.roomId
    ? rooms.find((r) => r.id === selectedProfile.roomId)?.name ?? 'Hotel Room'
    : null;
  const selectedIsFriend = selectedProfile ? isFriend(player, selectedProfile.id) : false;

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <section className="habbo-box p-4 bg-[#f0f9ff]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#235c8a]" />
              PIXL Players &amp; Friends Console
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Click any PIXL citizen below to inspect their Motto, collected Pixel Badges, and add them to your Friends list.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <label htmlFor="player-search-input" className="sr-only">
              Search players by name or motto
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="player-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PIXL citizens or mottos..."
              className="w-full rounded border-2 border-[#8eb5d3] bg-white py-1.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-[#235c8a] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: `All Players (${directory.length})` },
              { id: 'friends', label: `My Friends (${myFriends.length})` },
              { id: 'online', label: `Online Now (${directory.filter((p) => p.online).length})` },
              { id: 'staff', label: 'Staff Team' },
            ] as { id: PlayerDirectoryFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                filter === tab.id
                  ? 'bg-[#235c8a] text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: PLAYER DIRECTORY + FRIENDS LIST */}
        <div className="space-y-6 lg:col-span-7">
          {/* Player Directory */}
          <section className="habbo-box">
            <div className="habbo-box-header flex items-center justify-between bg-[#235c8a]">
              <span>Hotel Players Directory</span>
              <span className="font-mono-num text-xs text-blue-100">
                {filteredPlayers.length} shown
              </span>
            </div>

            {filteredPlayers.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No PIXL citizens match your current search or filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredPlayers.map((person) => {
                  const isSelected = selectedProfile?.id === person.id;
                  const friended = isFriend(player, person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      data-testid={`player-row-${person.id}`}
                      onClick={() => setSelectedId(person.id)}
                      className={`flex w-full items-center justify-between gap-3 p-3.5 text-left transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#dbeafe]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative rounded border border-slate-300 bg-[#e8f4fc] p-0.5 shrink-0">
                          <PixelHeadCanvas look={person.look} size={38} />
                          <span
                            title={person.online ? 'Online' : 'Offline'}
                            className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-sm border ${
                              person.online
                                ? 'bg-[#22c55e] border-[#14532d]'
                                : 'bg-slate-400 border-slate-600'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-extrabold text-slate-900 truncate">
                              {person.name}
                            </span>
                            {person.roleBadge && <PixelBadge code={person.roleBadge} />}
                            {friended && (
                              <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                <UserCheck className="h-2.5 w-2.5" /> Friend
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs italic text-slate-600">
                            &ldquo;{person.motto}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">
                          <Award className="h-3 w-3 text-[#7c3aed]" />
                          <span className="font-mono-num">{person.badges.length}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* My Friends List */}
          <section className="habbo-box">
            <div className="habbo-box-header flex items-center justify-between bg-[#1e9d54]">
              <span className="inline-flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                My Friends List
              </span>
              <span className="font-mono-num text-xs">{myFriends.length} friends</span>
            </div>

            {myFriends.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Your Friends list is empty. Click any player above and press <strong>Add Friend</strong>!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 p-3.5 sm:grid-cols-2">
                {myFriends.map((friend) => {
                  const fRoom = friend.roomId
                    ? rooms.find((r) => r.id === friend.roomId)?.name
                    : null;
                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(friend.id)}
                        className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                      >
                        <div className="rounded border border-slate-300 bg-[#e8f4fc] p-0.5 shrink-0">
                          <PixelHeadCanvas look={friend.look} size={32} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-slate-900 hover:underline">
                            {friend.name}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">
                            {friend.online && fRoom ? `In ${fRoom}` : 'Offline'}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {friend.online && friend.roomId && (
                          <button
                            type="button"
                            onClick={() => onFollowPlayer(friend.roomId!)}
                            className="habbo-btn-blue rounded px-2 py-1 text-[10px] font-bold cursor-pointer"
                          >
                            Follow
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleFriend(friend)}
                          aria-label={`Remove ${friend.name} from friends`}
                          className="rounded border border-slate-300 bg-white p-1 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: SELECTED PIXL PROFILE INSPECTOR */}
        <aside className="lg:col-span-5">
          {selectedProfile && (
            <section
              className="habbo-box sticky top-4"
              data-testid="selected-player-profile"
            >
              <div className="habbo-box-header flex items-center justify-between bg-[#e06d1b]">
                <span>PIXL Profile</span>
                <span className="text-xs font-semibold text-amber-100">
                  {selectedProfile.roleLabel}
                </span>
              </div>

              {/* PIXL Home Backdrop + Avatar */}
              <div className="relative overflow-hidden bg-gradient-to-b from-[#2f6ea4] via-[#539bd3] to-[#87c3ee] p-5 text-white border-b-2 border-[#1b5a8a]">
                <div className="flex items-center gap-5">
                  <div className="flex flex-col items-center justify-end rounded-lg border-2 border-[#1e4a6d] bg-[#163653]/65 px-5 pt-4 pb-2.5 shrink-0">
                    <PixelAvatarCanvas
                      look={selectedProfile.look}
                      dir={0}
                      pose="wave"
                      scale={2}
                    />
                    <div className="mt-1 h-2.5 w-20 rounded-full bg-[#0d2236] border border-[#3a709c]" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-pixel text-xl text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.45)] break-words">
                        {selectedProfile.name}
                      </h2>
                      {selectedProfile.roleBadge && (
                        <PixelBadge code={selectedProfile.roleBadge} />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-sm border ${
                          selectedProfile.online
                            ? 'bg-[#22c55e] border-[#14532d]'
                            : 'bg-slate-400 border-slate-700'
                        }`}
                      />
                      <span>
                        {selectedProfile.online && selectedRoomName
                          ? `Online in ${selectedRoomName}`
                          : 'Currently Offline'}
                      </span>
                    </div>

                    {/* Motto Plaque */}
                    <div className="rounded border border-[#1a4368] bg-white/95 px-3 py-2 text-slate-900 shadow-inner">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Motto
                      </p>
                      <p className="mt-0.5 text-xs font-semibold italic text-slate-800 break-words">
                        &ldquo;{selectedProfile.motto}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions: Add/Remove Friend & Follow */}
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    data-testid="profile-add-friend-btn"
                    onClick={() => onToggleFriend(selectedProfile)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-extrabold cursor-pointer ${
                      selectedIsFriend
                        ? 'border-2 border-rose-700 bg-rose-600 text-white hover:bg-rose-700'
                        : 'habbo-btn-green'
                    }`}
                  >
                    {selectedIsFriend ? (
                      <>
                        <UserMinus className="h-4 w-4" /> Remove Friend
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" /> Add Friend
                      </>
                    )}
                  </button>

                  {selectedProfile.online && selectedProfile.roomId && (
                    <button
                      type="button"
                      onClick={() => onFollowPlayer(selectedProfile.roomId!)}
                      className="habbo-btn-blue inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold cursor-pointer"
                    >
                      <DoorOpen className="h-4 w-4" /> Follow into Hotel
                    </button>
                  )}
                </div>

                {/* Collected Pixel Badges */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mb-2.5">
                    <Award className="h-4 w-4 text-[#7c3aed]" />
                    Badges ({selectedProfile.badges.length})
                  </h3>

                  {selectedProfile.badges.length === 0 ? (
                    <p className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                      This citizen hasn&apos;t displayed any badges yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {selectedProfile.badges.map((badgeId) => {
                        const def = findBadgeDefById(badgeId, customBadges);
                        if (!def) return null;
                        return (
                          <div
                            key={badgeId}
                            title={def.description}
                            className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
                          >
                            <PixelBadgeSprite
                              badgeId={def.id}
                              unlocked
                              size={34}
                              customBadges={customBadges}
                            />
                            <div className="min-w-0">
                              <p className="font-pixel text-[10px] text-slate-900">{def.code}</p>
                              <p className="truncate text-[10px] font-semibold text-slate-600">
                                {def.name}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Award, DoorOpen, Search, UserCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { findBadgeDefById } from '../../game/customBadges';
import {
  filterPlayerDirectory,
  isFriend,
  type PlayerDirectoryFilter,
} from '../../game/friends';
import type { CustomBadgeDef, PlayerProfileRecord, PlayerState, RoomDef } from '../../game/types';
import { BadgeInfoModal } from '../BadgeInfoModal';
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
  const [inspectBadgeId, setInspectBadgeId] = useState<string | null>(null);

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
    <div className="space-y-5">
      {/* Top Search & Filter Bar */}
      <section className="habbo-box p-3.5 bg-[#f4f8fc]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-[#111827] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#1d4e78]" />
              PIXL Players &amp; Friends Console
            </h1>
            <p className="text-[11px] text-[#475569] mt-0.5">
              Click any PIXL citizen to inspect their Motto, tap their Pixel Badges for details, and manage Friends.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <label htmlFor="player-search-input" className="sr-only">
              Search players by name or motto
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748b]" />
            <input
              id="player-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PIXL citizens or mottos..."
              className="w-full rounded-[2px] border border-[#000000] bg-white py-1.5 pl-8 pr-2.5 text-[12px] font-semibold text-[#111827] focus:border-[#2b6ca3] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
              className={`rounded-[2px] border px-3 py-1 text-[11px] font-bold cursor-pointer ${
                filter === tab.id
                  ? 'border-[#000000] bg-[#2b6ca3] text-white'
                  : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT COLUMN */}
        <div className="space-y-5 lg:col-span-7">
          <section className="habbo-box">
            <div className="habbo-box-header habbo-header-blue flex items-center justify-between">
              <span>Hotel Players Directory</span>
              <span className="font-mono-num text-[11px] text-sky-100">
                {filteredPlayers.length} shown
              </span>
            </div>

            {filteredPlayers.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-[#64748b]">
                No PIXL citizens match your current search or filter.
              </div>
            ) : (
              <div className="divide-y divide-[#cbd5e1]">
                {filteredPlayers.map((person) => {
                  const isSelected = selectedProfile?.id === person.id;
                  const friended = isFriend(player, person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      data-testid={`player-row-${person.id}`}
                      onClick={() => setSelectedId(person.id)}
                      className={`flex w-full items-center justify-between gap-3 p-3 text-left cursor-pointer ${
                        isSelected ? 'bg-[#dbeafe]' : 'hover:bg-[#f8fafc]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative rounded-[2px] border border-[#000000] bg-[#e8f4fc] p-0.5 shrink-0">
                          <PixelHeadCanvas look={person.look} size={36} />
                          <span
                            title={person.online ? 'Online' : 'Offline'}
                            className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-[1px] border ${
                              person.online
                                ? 'bg-[#22c55e] border-[#14532d]'
                                : 'bg-[#94a3b8] border-[#475569]'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[13px] font-bold text-[#111827] truncate">
                              {person.name}
                            </span>
                            {person.roleBadge && <PixelBadge code={person.roleBadge} />}
                            {friended && (
                              <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#1f4f09] bg-[#ecfdf5] px-1.5 py-0.5 text-[10px] font-bold text-[#14532d]">
                                <UserCheck className="h-2.5 w-2.5" /> Friend
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] italic text-[#475569]">
                            &ldquo;{person.motto}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#94a3b8] bg-white px-2 py-0.5 text-[11px] font-bold text-[#1f2937]">
                          <Award className="h-3 w-3 text-[#d97706]" />
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
            <div className="habbo-box-header habbo-header-green flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5" />
                My Friends List
              </span>
              <span className="font-mono-num text-[11px]">{myFriends.length} friends</span>
            </div>

            {myFriends.length === 0 ? (
              <div className="p-5 text-center text-[11px] text-[#64748b]">
                Your Friends list is empty. Click any player above and press <strong>Add Friend</strong>!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                {myFriends.map((friend) => {
                  const fRoom = friend.roomId
                    ? rooms.find((r) => r.id === friend.roomId)?.name
                    : null;
                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between gap-2 rounded-[2px] border border-[#94a3b8] bg-[#f8fafc] p-2"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(friend.id)}
                        className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
                      >
                        <div className="rounded-[2px] border border-[#000000] bg-[#e8f4fc] p-0.5 shrink-0">
                          <PixelHeadCanvas look={friend.look} size={30} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-[#111827] hover:underline">
                            {friend.name}
                          </p>
                          <p className="truncate text-[10px] text-[#475569]">
                            {friend.online && fRoom ? `In ${fRoom}` : 'Offline'}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {friend.online && friend.roomId && (
                          <button
                            type="button"
                            onClick={() => onFollowPlayer(friend.roomId!)}
                            className="habbo-btn-blue px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                          >
                            Follow
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleFriend(friend)}
                          aria-label={`Remove ${friend.name} from friends`}
                          className="rounded-[2px] border border-[#94a3b8] bg-white p-1 text-[#475569] hover:border-[#991b1b] hover:bg-[#fef2f2] hover:text-[#991b1b] cursor-pointer"
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
            <section className="habbo-box sticky top-4" data-testid="selected-player-profile">
              <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
                <span>PIXL Profile</span>
                <span className="text-[11px] font-bold text-amber-100">
                  {selectedProfile.roleLabel}
                </span>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-b from-[#2b6ca3] via-[#539bd3] to-[#87c3ee] p-4 text-white border-b border-[#000000]">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-end rounded-[3px] border border-[#000000] bg-[#163653]/80 px-4 pt-3.5 pb-2 shrink-0">
                    <PixelAvatarCanvas
                      look={selectedProfile.look}
                      dir={0}
                      pose="wave"
                      scale={2}
                    />
                    <div className="mt-1 h-2 w-20 rounded-[1px] bg-[#0d2236] border border-[#3a709c]" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="font-pixel text-lg text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.45)] break-words">
                        {selectedProfile.name}
                      </h2>
                      {selectedProfile.roleBadge && (
                        <PixelBadge code={selectedProfile.roleBadge} />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-[1px] border ${
                          selectedProfile.online
                            ? 'bg-[#22c55e] border-[#14532d]'
                            : 'bg-[#94a3b8] border-[#334155]'
                        }`}
                      />
                      <span>
                        {selectedProfile.online && selectedRoomName
                          ? `Online in ${selectedRoomName}`
                          : 'Currently Offline'}
                      </span>
                    </div>

                    <div className="rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[#111827]">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748b]">
                        Motto
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold italic text-[#1f2937] break-words">
                        &ldquo;{selectedProfile.motto}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 space-y-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="profile-add-friend-btn"
                    onClick={() => onToggleFriend(selectedProfile)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold cursor-pointer ${
                      selectedIsFriend
                        ? 'rounded-[3px] border border-[#000000] bg-[#b91c1c] text-white hover:bg-[#991b1b]'
                        : 'habbo-btn-green'
                    }`}
                  >
                    {selectedIsFriend ? (
                      <>
                        <UserMinus className="h-3.5 w-3.5" /> Remove Friend
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Add Friend
                      </>
                    )}
                  </button>

                  {selectedProfile.online && selectedProfile.roomId && (
                    <button
                      type="button"
                      onClick={() => onFollowPlayer(selectedProfile.roomId!)}
                      className="habbo-btn-blue inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold cursor-pointer"
                    >
                      <DoorOpen className="h-3.5 w-3.5" /> Follow into Hotel
                    </button>
                  )}
                </div>

                {/* Clickable Badges */}
                <div>
                  <h3 className="text-[11px] font-bold text-[#1f2937] flex items-center gap-1.5 mb-2">
                    <Award className="h-3.5 w-3.5 text-[#d97706]" />
                    Badges ({selectedProfile.badges.length}) — Click to inspect
                  </h3>

                  {selectedProfile.badges.length === 0 ? (
                    <p className="rounded-[2px] border border-[#cbd5e1] bg-[#f8fafc] p-2.5 text-[11px] text-[#64748b]">
                      This citizen hasn&apos;t displayed any badges yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {selectedProfile.badges.slice(0, 5).map((badgeId) => {
                        const def = findBadgeDefById(badgeId, customBadges);
                        if (!def) return null;
                        return (
                          <button
                            key={badgeId}
                            type="button"
                            onClick={() => setInspectBadgeId(def.id)}
                            title={`${def.name} — Click for details`}
                            className="flex items-center gap-2 rounded-[2px] border border-[#000000] bg-[#f8fafc] p-1.5 text-left hover:bg-[#dbeafe] cursor-pointer"
                          >
                            <PixelBadgeSprite
                              badgeId={def.id}
                              unlocked
                              size={30}
                              customBadges={customBadges}
                            />
                            <div className="min-w-0">
                              <p className="font-pixel text-[9px] text-[#111827]">{def.code}</p>
                              <p className="truncate text-[10px] font-bold text-[#475569]">
                                {def.name}
                              </p>
                            </div>
                          </button>
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

      <BadgeInfoModal
        badgeId={inspectBadgeId}
        unlocked
        customBadges={customBadges}
        onClose={() => setInspectBadgeId(null)}
      />
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  Award,
  Check,
  DoorOpen,
  MessageSquare,
  Search,
  Send,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { findBadgeDefById } from '../../game/customBadges';
import { isFriend } from '../../game/friends';
import { habboAudio } from '../../game/habboAudio';
import type { CustomBadgeDef, PlayerProfileRecord, PlayerState, RoomDef } from '../../game/types';
import {
  PixelAvatarCanvas,
  PixelBadge,
  PixelBadgeSprite,
  PixelHeadCanvas,
} from '../PixelSpriteCanvas';

export interface ConsoleMessage {
  id: string;
  sender: 'me' | 'them';
  senderName?: string;
  text: string;
  time: string;
}

interface FriendsConsoleModalProps {
  player: PlayerState;
  directory: PlayerProfileRecord[];
  rooms: RoomDef[];
  customBadges?: CustomBadgeDef[];
  pmThreads?: Record<string, ConsoleMessage[]>;
  onSendPm?: (targetProfile: PlayerProfileRecord, text: string) => void;
  onFriendAction?: (
    profile: PlayerProfileRecord,
    action: 'send_request' | 'accept_request' | 'decline_request' | 'remove'
  ) => void;
  onToggleFriend: (profile: PlayerProfileRecord) => void;
  onFollowRoom: (roomId: string) => void;
  onInspectBadge?: (badgeId: string) => void;
  onClose: () => void;
}

type ConsoleLeftTab = 'friends' | 'search';

export function FriendsConsoleModal({
  player,
  directory,
  rooms,
  customBadges = [],
  pmThreads = {},
  onSendPm,
  onFriendAction,
  onToggleFriend,
  onFollowRoom,
  onInspectBadge,
  onClose,
}: FriendsConsoleModalProps) {
  const [leftTab, setLeftTab] = useState<ConsoleLeftTab>('friends');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(directory[0]?.id ?? '');
  const [rightMode, setRightMode] = useState<'profile' | 'chat'>('profile');
  const [chatInput, setChatInput] = useState('');
  const [localNpcThreads, setLocalNpcThreads] = useState<Record<string, ConsoleMessage[]>>({});

  const incomingIds = player.incomingFriendRequests ?? [];
  const outgoingIds = player.outgoingFriendRequests ?? [];

  const acceptedFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory.filter((p) => {
      if (!isFriend(player, p.id)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.motto.toLowerCase().includes(q);
    });
  }, [directory, player, query]);

  const onlineFriends = useMemo(
    () => acceptedFriends.filter((f) => f.online),
    [acceptedFriends]
  );
  const offlineFriends = useMemo(
    () => acceptedFriends.filter((f) => !f.online),
    [acceptedFriends]
  );

  const incomingProfiles = useMemo(
    () => directory.filter((p) => incomingIds.includes(p.id)),
    [directory, incomingIds]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory.filter((p) => {
      if (p.name.toLowerCase() === player.username.toLowerCase()) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.motto.toLowerCase().includes(q);
    });
  }, [directory, player.username, query]);

  const selected =
    directory.find((p) => p.id === selectedId) ??
    onlineFriends[0] ??
    offlineFriends[0] ??
    searchResults[0] ??
    directory[0] ??
    null;

  const selectedIsFriend = selected ? isFriend(player, selected.id) : false;
  const selectedIncoming = selected ? incomingIds.includes(selected.id) : false;
  const selectedOutgoing = selected ? outgoingIds.includes(selected.id) : false;

  const selectedRoomName = selected?.roomId
    ? rooms.find((r) => r.id === selected.roomId)?.name
    : null;

  const threadKey = selected ? selected.name.toLowerCase() : '';
  const activeThread = useMemo(() => {
    if (!selected) return [];
    const liveMsgs = pmThreads[threadKey] ?? localNpcThreads[selected.id];
    if (liveMsgs && liveMsgs.length > 0) return liveMsgs;
    return [
      {
        id: `welcome-${selected.id}`,
        sender: 'them' as const,
        senderName: selected.name,
        text: `Hey ${player.username}! Feel free to message me on the PIXL Console anytime!`,
        time: 'Just now',
      },
    ];
  }, [selected, pmThreads, threadKey, localNpcThreads, player.username]);

  const handleSendConsoleMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    habboAudio.playConsoleMessage();

    if (onSendPm) {
      onSendPm(selected, text);
    }

    if (selected.npcId || !onSendPm) {
      const targetId = selected.id;
      const targetName = selected.name;
      const targetRoom = selectedRoomName ?? 'the Hotel';
      const myMsg: ConsoleMessage = {
        id: `me-${Date.now()}`,
        sender: 'me',
        senderName: player.username,
        text,
        time: 'Now',
      };
      if (!onSendPm) {
        setLocalNpcThreads((prev) => ({
          ...prev,
          [targetId]: [...(prev[targetId] ?? activeThread), myMsg],
        }));
      }
      setTimeout(() => {
        const lower = text.toLowerCase();
        let reply = `Sounds awesome! Come hang out in ${targetRoom}!`;
        if (lower.includes('trade') || lower.includes('rare')) {
          reply = `I'm always down to trade rares! Meet me in ${targetRoom} and click Trade.`;
        } else if (lower.includes('hi') || lower.includes('hey') || lower.includes('hello')) {
          reply = `Hey ${player.username}! Great to hear from you on Console — how's your room coming along?`;
        } else if (lower.includes('banzai') || lower.includes('game')) {
          reply = `Let's play a 60s Battle Banzai round! Follow me when you're ready!`;
        }
        const replyMsg: ConsoleMessage = {
          id: `them-${Date.now()}`,
          sender: 'them',
          senderName: targetName,
          text: `${reply} — ${targetName}`,
          time: 'Now',
        };
        setLocalNpcThreads((prev) => ({
          ...prev,
          [targetId]: [...(prev[targetId] ?? []), replyMsg],
        }));
        habboAudio.playConsoleMessage();
      }, 500);
    }
  };

  const renderPersonRow = (person: PlayerProfileRecord) => {
    const friended = isFriend(player, person.id);
    const pendingIn = incomingIds.includes(person.id);
    const pendingOut = outgoingIds.includes(person.id);
    const pRoomName = person.roomId ? rooms.find((r) => r.id === person.roomId)?.name : null;

    return (
      <button
        key={person.id}
        type="button"
        onClick={() => setSelectedId(person.id)}
        className={`flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left cursor-pointer ${
          selected?.id === person.id ? 'bg-[#fef3c7]' : 'hover:bg-[#f3f4f6]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative border border-[#8f8f8f] bg-[#dbeafe] p-0.5 shrink-0 rounded-[2px]">
            <PixelHeadCanvas look={person.look} size={28} />
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border border-[#000000] rounded-full ${
                person.online ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'
              }`}
              title={person.online ? 'Online' : 'Offline'}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-[11px] font-bold text-[#111827]">{person.name}</span>
              {person.roleBadge && <PixelBadge code={person.roleBadge} />}
            </div>
            <p className="truncate text-[10px] text-[#4b5563]">
              {person.online && pRoomName ? `In ${pRoomName}` : person.motto}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {person.online && person.roomId && friended && (
            <span className="border border-[#15803d] bg-[#dcfce7] px-1 py-0.5 text-[9px] font-bold text-[#14532d] rounded-[2px]">
              ON
            </span>
          )}
          {friended && <UserCheck className="h-3.5 w-3.5 text-[#166534]" />}
          {pendingIn && (
            <span className="border border-[#d97706] bg-[#fef3c7] px-1 py-0.5 text-[9px] font-bold text-[#92400e] rounded-[2px]">
              REQ
            </span>
          )}
          {pendingOut && (
            <span className="text-[9px] font-bold text-[#6b7280]">Sent</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div
      className="pointer-events-auto fixed inset-x-4 top-14 mx-auto z-40 max-w-2xl client-window overflow-hidden"
      role="dialog"
      aria-label="Friends & Players Console"
      data-testid="friends-console-modal"
    >
      <div
        className="client-window-bar flex items-center justify-between px-3 py-1.5"
        style={{ background: 'linear-gradient(180deg, #f58220 0%, #c85808 100%)' }}
      >
        <span className="inline-flex items-center gap-2 font-pixel text-[11px] text-white">
          <Users className="h-3.5 w-3.5 text-[#fef08a]" />
          PIXL Console &amp; Instant Messenger
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Friends Console"
          className="client-close-btn"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 max-h-[74vh] bg-[#ececec]">
        {/* Left List: Friends (Online/Offline) & Search/Requests */}
        <div className="border-b md:border-b-0 md:border-r border-[#8f8f8f] md:col-span-6 flex flex-col">
          <div className="p-2.5 border-b border-[#b5b5b5] space-y-2 bg-[#e0e0e0]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#475569]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search PIXL citizens..."
                aria-label="Search PIXL citizens in console"
                className="w-full border border-[#6b7280] bg-white py-1 pl-7 pr-2 text-[11px] font-bold text-[#111827] rounded-[2px] focus:border-[#1d4e78] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                data-testid="console-tab-friends"
                onClick={() => setLeftTab('friends')}
                className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                  leftTab === 'friends' ? 'habbo-btn-blue' : 'habbo-btn-silver'
                }`}
              >
                Friends ({acceptedFriends.length})
              </button>
              <button
                type="button"
                data-testid="console-tab-search"
                onClick={() => setLeftTab('search')}
                className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                  leftTab === 'search' ? 'habbo-btn-blue' : 'habbo-btn-silver'
                }`}
              >
                Search &amp; Requests
                {incomingProfiles.length > 0 ? ` (${incomingProfiles.length})` : ''}
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-64 md:max-h-80 bg-white divide-y divide-[#d4d4d4]">
            {leftTab === 'friends' ? (
              acceptedFriends.length === 0 ? (
                <p className="p-4 text-center text-[11px] text-[#4b5563]">
                  No friends yet. Open <strong>Search &amp; Requests</strong> to send friend requests!
                </p>
              ) : (
                <>
                  {onlineFriends.length > 0 && (
                    <div>
                      <div className="bg-[#dcfce7] px-2.5 py-1 text-[10px] font-bold uppercase text-[#14532d] border-b border-[#bbf7d0]">
                        Online ({onlineFriends.length})
                      </div>
                      <div className="divide-y divide-[#e5e7eb]">
                        {onlineFriends.map(renderPersonRow)}
                      </div>
                    </div>
                  )}
                  {offlineFriends.length > 0 && (
                    <div>
                      <div className="bg-[#f3f4f6] px-2.5 py-1 text-[10px] font-bold uppercase text-[#4b5563] border-b border-[#e5e7eb]">
                        Offline ({offlineFriends.length})
                      </div>
                      <div className="divide-y divide-[#e5e7eb]">
                        {offlineFriends.map(renderPersonRow)}
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              <>
                {incomingProfiles.length > 0 && (
                  <div>
                    <div className="bg-[#fef3c7] px-2.5 py-1 text-[10px] font-bold uppercase text-[#92400e] border-b border-[#fde68a]">
                      Friend Requests ({incomingProfiles.length})
                    </div>
                    <div className="divide-y divide-[#e5e7eb]">
                      {incomingProfiles.map((reqProfile) => (
                        <div
                          key={`req-${reqProfile.id}`}
                          className="flex items-center justify-between gap-2 px-2.5 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <PixelHeadCanvas look={reqProfile.look} size={26} />
                            <span className="truncate text-[11px] font-bold text-[#111827]">
                              {reqProfile.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onFriendAction
                                  ? onFriendAction(reqProfile, 'accept_request')
                                  : onToggleFriend(reqProfile)
                              }
                              aria-label={`Accept ${reqProfile.name}`}
                              className="habbo-btn-green p-1 cursor-pointer"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onFriendAction?.(reqProfile, 'decline_request')}
                              aria-label={`Decline ${reqProfile.name}`}
                              className="habbo-btn-red p-1 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#e0f2fe] px-2.5 py-1 text-[10px] font-bold uppercase text-[#075985] border-b border-[#bae6fd]">
                  Registered PIXL Citizens ({searchResults.length})
                </div>
                <div className="divide-y divide-[#e5e7eb]">
                  {searchResults.map(renderPersonRow)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Profile & Instant Messenger Panel */}
        <div className="p-3 md:col-span-6 overflow-y-auto bg-[#f4f4f4] flex flex-col justify-between">
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-1.5 border-b border-[#b5b5b5] pb-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRightMode('profile')}
                    className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      rightMode === 'profile' ? 'habbo-btn-blue' : 'habbo-btn-silver'
                    }`}
                  >
                    Profile &amp; Badges
                  </button>
                  <button
                    type="button"
                    data-testid="console-im-tab-btn"
                    onClick={() => setRightMode('chat')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      rightMode === 'chat' ? 'habbo-btn-gold' : 'habbo-btn-silver'
                    }`}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Private Chat
                  </button>
                </div>
              </div>

              {rightMode === 'profile' ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-24 w-16 items-end justify-center border border-[#5c94c8] bg-[#dbeafe] pb-1 shrink-0 rounded-[2px]">
                      <PixelAvatarCanvas look={selected.look} dir={0} pose="wave" scale={1} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-pixel text-[12px] text-[#111827] truncate">{selected.name}</h3>
                        {selected.roleBadge && <PixelBadge code={selected.roleBadge} />}
                      </div>
                      <p className={`text-[11px] font-bold ${selected.online ? 'text-[#166534]' : 'text-[#6b7280]'}`}>
                        {selected.online && selectedRoomName
                          ? `Online in ${selectedRoomName}`
                          : selected.online
                          ? 'Online'
                          : 'Offline'}
                      </p>
                      <p className="border border-[#b5b5b5] bg-white px-2 py-1 text-[11px] italic text-[#374151] break-words rounded-[2px]">
                        &ldquo;{selected.motto}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedIsFriend ? (
                      <button
                        type="button"
                        onClick={() =>
                          onFriendAction
                            ? onFriendAction(selected, 'remove')
                            : onToggleFriend(selected)
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1 text-[11px] font-bold cursor-pointer habbo-btn-red"
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Remove Friend
                      </button>
                    ) : selectedIncoming ? (
                      <button
                        type="button"
                        onClick={() =>
                          onFriendAction
                            ? onFriendAction(selected, 'accept_request')
                            : onToggleFriend(selected)
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1 text-[11px] font-bold cursor-pointer habbo-btn-green"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Accept Request
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={selectedOutgoing}
                        onClick={() =>
                          onFriendAction
                            ? onFriendAction(selected, 'send_request')
                            : onToggleFriend(selected)
                        }
                        className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-1 text-[11px] font-bold ${
                          selectedOutgoing
                            ? 'habbo-btn-silver opacity-75 cursor-default'
                            : 'habbo-btn-green cursor-pointer'
                        }`}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {selectedOutgoing ? 'Request Sent' : 'Add Friend'}
                      </button>
                    )}

                    {selected.online && selected.roomId && (
                      <button
                        type="button"
                        data-testid="console-follow-btn"
                        onClick={() => {
                          onFollowRoom(selected.roomId!);
                          onClose();
                        }}
                        className="habbo-btn-blue inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold cursor-pointer"
                      >
                        <DoorOpen className="h-3.5 w-3.5" /> Follow
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-[#374151] flex items-center gap-1 mb-1.5">
                      <Award className="h-3.5 w-3.5 text-[#7c3aed]" />
                      Badges ({selected.badges.length}) — click to inspect
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.badges.slice(0, 5).map((badgeId) => {
                        const def = findBadgeDefById(badgeId, customBadges);
                        if (!def) return null;
                        return (
                          <button
                            key={badgeId}
                            type="button"
                            onClick={() => onInspectBadge?.(def.id)}
                            title={`${def.name}: ${def.description}`}
                            className="flex items-center gap-1 border border-[#8f8f8f] bg-white px-1.5 py-1 hover:border-[#1d4e78] cursor-pointer rounded-[2px]"
                          >
                            <PixelBadgeSprite
                              badgeId={def.id}
                              unlocked
                              size={24}
                              customBadges={customBadges}
                            />
                            <span className="font-pixel text-[9px] text-[#111827]">{def.code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5" data-testid="console-im-panel">
                  <div className="flex items-center justify-between border border-[#b45309] bg-[#fef3c7] px-2.5 py-1.5 text-[11px] rounded-[2px]">
                    <span className="font-bold text-[#78350f]">
                      Private Chat with {selected.name}
                    </span>
                    <span className="text-[10px] font-bold text-[#166534]">
                      {selected.online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="h-44 overflow-y-auto space-y-2 border border-[#b5b5b5] bg-white p-2.5 text-[11px] rounded-[2px]">
                    {activeThread.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.sender === 'me' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] px-2.5 py-1.5 font-bold rounded-[2px] ${
                            msg.sender === 'me'
                              ? 'bg-[#1d4e78] text-white'
                              : 'border border-[#d97706] bg-[#fef3c7] text-[#111827]'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendConsoleMessage} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      data-testid="console-im-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Message ${selected.name}...`}
                      className="w-full border border-[#6b7280] bg-white px-2.5 py-1 text-[11px] font-bold text-[#111827] rounded-[2px] focus:border-[#d97706] focus:outline-none"
                    />
                    <button
                      type="submit"
                      data-testid="console-im-send-btn"
                      className="habbo-btn-gold inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      <Send className="h-3 w-3" /> Send
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

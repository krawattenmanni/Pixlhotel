import { useMemo, useState } from 'react';
import {
  Award,
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
import { filterPlayerDirectory, isFriend, type PlayerDirectoryFilter } from '../../game/friends';
import { soundEngine } from '../../game/soundEngine';
import type { CustomBadgeDef, PlayerProfileRecord, PlayerState, RoomDef } from '../../game/types';
import {
  PixelAvatarCanvas,
  PixelBadge,
  PixelBadgeSprite,
  PixelHeadCanvas,
} from '../PixelSpriteCanvas';

interface ConsoleMessage {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
}

interface FriendsConsoleModalProps {
  player: PlayerState;
  directory: PlayerProfileRecord[];
  rooms: RoomDef[];
  customBadges?: CustomBadgeDef[];
  onToggleFriend: (profile: PlayerProfileRecord) => void;
  onFollowRoom: (roomId: string) => void;
  onClose: () => void;
}

export function FriendsConsoleModal({
  player,
  directory,
  rooms,
  customBadges = [],
  onToggleFriend,
  onFollowRoom,
  onClose,
}: FriendsConsoleModalProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PlayerDirectoryFilter>('friends');
  const [selectedId, setSelectedId] = useState<string>(directory[0]?.id ?? '');
  const [rightMode, setRightMode] = useState<'profile' | 'chat'>('profile');
  const [chatInput, setChatInput] = useState('');
  const [threads, setThreads] = useState<Record<string, ConsoleMessage[]>>({});

  const filtered = useMemo(
    () => filterPlayerDirectory(directory, query, filter, player.friendIds),
    [directory, query, filter, player.friendIds]
  );

  const selected =
    directory.find((p) => p.id === selectedId) ?? filtered[0] ?? directory[0] ?? null;
  const selectedIsFriend = selected ? isFriend(player, selected.id) : false;
  const selectedRoomName = selected?.roomId
    ? rooms.find((r) => r.id === selected.roomId)?.name
    : null;

  const activeThread = useMemo(() => {
    if (!selected) return [];
    return (
      threads[selected.id] ?? [
        {
          id: `welcome-${selected.id}`,
          sender: 'them',
          text: `Hey ${player.username}! Feel free to message me on the PIXL Console anytime!`,
          time: 'Just now',
        },
      ]
    );
  }, [selected, threads, player.username]);

  const handleSendConsoleMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    soundEngine.playChatBlip();

    const myMsg: ConsoleMessage = {
      id: `me-${Date.now()}`,
      sender: 'me',
      text,
      time: 'Now',
    };

    setThreads((prev) => ({
      ...prev,
      [selected.id]: [...(prev[selected.id] ?? activeThread), myMsg],
    }));

    const targetId = selected.id;
    const targetName = selected.name;
    const targetRoom = selectedRoomName ?? 'the Hotel';
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
        text: `${reply} — ${targetName}`,
        time: 'Now',
      };
      setThreads((prev) => ({
        ...prev,
        [targetId]: [...(prev[targetId] ?? []), replyMsg],
      }));
      soundEngine.playChatBlip();
    }, 550);
  };

  return (
    <div
      className="pointer-events-auto fixed inset-x-4 top-16 mx-auto z-40 max-w-2xl client-window overflow-hidden"
      role="dialog"
      aria-label="Friends & Players Console"
      data-testid="friends-console-modal"
    >
      <div className="client-window-bar flex items-center justify-between bg-gradient-to-b from-[#d97706] to-[#b45309] px-3.5 py-2">
        <span className="inline-flex items-center gap-2 font-pixel text-xs text-white">
          <Users className="h-4 w-4 text-[#fef08a]" />
          PIXL Console &amp; Instant Messenger
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Friends Console"
          className="rounded border border-white/30 bg-black/25 p-1 hover:bg-black/45 cursor-pointer text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 max-h-[72vh]">
        {/* Left List */}
        <div className="border-b md:border-b-0 md:border-r border-stone-300 md:col-span-6 flex flex-col">
          <div className="p-2.5 border-b border-stone-300 space-y-2 bg-stone-100">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find PIXL citizen..."
                aria-label="Search PIXL citizens in console"
                className="w-full rounded border border-stone-400 bg-white py-1 pl-8 pr-2 text-xs font-semibold text-slate-900 focus:border-[#2b7de9] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'friends', label: `Friends (${player.friendIds.length})` },
                  { id: 'all', label: 'All Players' },
                  { id: 'online', label: 'Online' },
                ] as { id: PlayerDirectoryFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded px-2 py-1 text-[11px] font-bold cursor-pointer ${
                    filter === tab.id
                      ? 'bg-[#235c8a] text-white'
                      : 'bg-white border border-stone-300 text-slate-700 hover:bg-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-stone-200 overflow-y-auto max-h-64 md:max-h-80 bg-white">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">
                No players found. Switch to &ldquo;All Players&rdquo; to discover &amp; add friends!
              </p>
            ) : (
              filtered.map((person) => {
                const friended = isFriend(player, person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setSelectedId(person.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer ${
                      selected?.id === person.id ? 'bg-[#fef3c7]' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="rounded border border-stone-300 bg-[#e8f4fc] p-0.5 shrink-0">
                        <PixelHeadCanvas look={person.look} size={28} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-xs font-extrabold text-slate-900">
                            {person.name}
                          </span>
                          {person.roleBadge && <PixelBadge code={person.roleBadge} />}
                        </div>
                        <p className="truncate text-[10px] text-slate-500">{person.motto}</p>
                      </div>
                    </div>
                    {friended && <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Profile & Instant Messenger Panel */}
        <div className="p-3.5 md:col-span-6 overflow-y-auto bg-[#f8fafc] flex flex-col justify-between">
          {selected && (
            <div className="space-y-3">
              {/* Sub-mode switcher: Profile vs Instant Message */}
              <div className="flex items-center justify-between gap-1.5 border-b border-stone-300 pb-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRightMode('profile')}
                    className={`rounded px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      rightMode === 'profile'
                        ? 'bg-[#235c8a] text-white'
                        : 'border border-stone-300 bg-white text-slate-700'
                    }`}
                  >
                    Profile &amp; Badges
                  </button>
                  <button
                    type="button"
                    data-testid="console-im-tab-btn"
                    onClick={() => setRightMode('chat')}
                    className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      rightMode === 'chat'
                        ? 'bg-[#d97706] text-white'
                        : 'border border-stone-300 bg-white text-slate-700'
                    }`}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Instant Message
                  </button>
                </div>
              </div>

              {rightMode === 'profile' ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-24 w-16 items-end justify-center rounded border border-[#8eb5d3] bg-gradient-to-b from-[#cfe7fa] to-[#eef7ff] pb-1 shrink-0">
                      <PixelAvatarCanvas look={selected.look} dir={0} pose="wave" scale={1} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-pixel text-sm text-slate-900 truncate">{selected.name}</h3>
                        {selected.roleBadge && <PixelBadge code={selected.roleBadge} />}
                      </div>
                      <p className="text-[11px] font-semibold text-emerald-700">
                        {selected.online && selectedRoomName ? `In ${selectedRoomName}` : 'Offline'}
                      </p>
                      <p className="rounded border border-stone-300 bg-white px-2 py-1 text-xs italic text-slate-700 break-words">
                        &ldquo;{selected.motto}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleFriend(selected)}
                      className={`flex-1 inline-flex items-center justify-center gap-1 rounded px-3 py-1.5 text-xs font-bold cursor-pointer ${
                        selectedIsFriend
                          ? 'border border-rose-700 bg-rose-600 text-white hover:bg-rose-700'
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

                    {selected.online && selected.roomId && (
                      <button
                        type="button"
                        onClick={() => {
                          onFollowRoom(selected.roomId!);
                          onClose();
                        }}
                        className="habbo-btn-blue inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        <DoorOpen className="h-3.5 w-3.5" /> Follow
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1 mb-1.5">
                      <Award className="h-3.5 w-3.5 text-[#7c3aed]" />
                      Badges ({selected.badges.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.badges.map((badgeId) => {
                        const def = findBadgeDefById(badgeId, customBadges);
                        if (!def) return null;
                        return (
                          <div
                            key={badgeId}
                            title={`${def.name}: ${def.description}`}
                            className="flex items-center gap-1 rounded border border-stone-300 bg-white px-1.5 py-1"
                          >
                            <PixelBadgeSprite
                              badgeId={def.id}
                              unlocked
                              size={24}
                              customBadges={customBadges}
                            />
                            <span className="font-pixel text-[9px] text-slate-800">{def.code}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5" data-testid="console-im-panel">
                  <div className="flex items-center justify-between rounded border border-amber-300 bg-[#fef3c7] px-2.5 py-1.5 text-xs">
                    <span className="font-extrabold text-amber-950">
                      Chatting with {selected.name}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      {selected.online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="h-44 overflow-y-auto space-y-2 rounded border border-stone-300 bg-white p-2.5 text-xs">
                    {activeThread.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.sender === 'me' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-md px-2.5 py-1.5 font-semibold ${
                            msg.sender === 'me'
                              ? 'bg-[#235c8a] text-white'
                              : 'border border-amber-300 bg-amber-50 text-slate-900'
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
                      className="w-full rounded border border-stone-400 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#d97706] focus:outline-none"
                    />
                    <button
                      type="submit"
                      data-testid="console-im-send-btn"
                      className="habbo-btn-gold inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-extrabold cursor-pointer shrink-0"
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

import { useState } from 'react';
import { DoorOpen, PlusCircle, Users, X } from 'lucide-react';
import { getRoomThumbnailImage } from '../../game/pixelSprites';
import type { RoomDef } from '../../game/types';

interface RoomNavigatorModalProps {
  rooms: RoomDef[];
  currentRoomId: string;
  playerUsername: string;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom?: (params: {
    caption: string;
    description: string;
    modelName: string;
  }) => Promise<{ ok: boolean; message: string }>;
  onClose: () => void;
}

const ROOM_MODELS = [
  { id: 'model_c', label: 'Oak Parquet & Navy' },
  { id: 'model_a', label: 'Classic Marble Lounge' },
  { id: 'model_b', label: 'Rooftop Night Sky' },
  { id: 'model_lido', label: 'The Lido Pool Deck' },
  { id: 'model_rooftop', label: 'Rooftop Pool & Orange Hotel' },
  { id: 'model_park', label: 'Peaceful Park Lawn' },
  { id: 'model_tatami', label: 'Zen Tatami & Brick' },
];

export function RoomNavigatorModal({
  rooms,
  currentRoomId,
  playerUsername,
  onSelectRoom,
  onCreateRoom,
  onClose,
}: RoomNavigatorModalProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'guest'>('public');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [modelName, setModelName] = useState('model_c');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const publicRooms = rooms.filter((r) => r.category === 'public');
  const guestRooms = rooms.filter((r) => r.category !== 'public');
  const displayedRooms = activeTab === 'public' ? publicRooms : guestRooms;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateRoom || !caption.trim()) return;
    setCreating(true);
    setFeedback(null);
    const res = await onCreateRoom({
      caption: caption.trim(),
      description: description.trim() || 'Cozy custom suite at PIXL Hotel!',
      modelName,
    });
    setCreating(false);
    if (res.ok) {
      setCaption('');
      setDescription('');
      setShowCreateForm(false);
      onClose();
    } else {
      setFeedback(res.message);
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Room Navigator"
      data-testid="room-navigator-modal"
    >
      <div className="client-window flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden">
        <div className="client-window-bar flex items-center justify-between px-3 py-1.5 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold">
            <DoorOpen className="h-4 w-4 text-[#fef08a]" />
            Hotel Navigator
          </span>
          <div className="flex items-center gap-1.5">
            {onCreateRoom && (
              <button
                type="button"
                data-testid="nav-create-room-toggle"
                onClick={() => {
                  setShowCreateForm((v) => !v);
                  setFeedback(null);
                }}
                className="habbo-btn-green inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
              >
                <PlusCircle className="h-3 w-3" />
                {showCreateForm ? 'Back to Navigator' : 'Create Room'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Navigator"
              className="client-close-btn"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Classic 2-Tab Bar: Public Rooms | Guest Rooms */}
        {!showCreateForm && (
          <div className="flex items-center gap-1 border-b border-[#000000] bg-[#d4d4d4] px-3 pt-2 shrink-0">
            <button
              type="button"
              data-testid="nav-tab-public"
              onClick={() => setActiveTab('public')}
              className={`border border-b-0 border-[#000000] px-3 py-1.5 text-[11px] font-bold cursor-pointer rounded-t-[3px] ${
                activeTab === 'public'
                  ? 'bg-[#ececec] text-[#111827] -mb-px pb-2'
                  : 'bg-[#4b708f] text-white hover:bg-[#5c84a6]'
              }`}
            >
              Public Rooms ({publicRooms.length})
            </button>
            <button
              type="button"
              data-testid="nav-tab-guest"
              onClick={() => setActiveTab('guest')}
              className={`border border-b-0 border-[#000000] px-3 py-1.5 text-[11px] font-bold cursor-pointer rounded-t-[3px] ${
                activeTab === 'guest'
                  ? 'bg-[#ececec] text-[#111827] -mb-px pb-2'
                  : 'bg-[#4b708f] text-white hover:bg-[#5c84a6]'
              }`}
            >
              Guest Rooms ({guestRooms.length})
            </button>
          </div>
        )}

        {showCreateForm ? (
          <form onSubmit={handleCreateSubmit} className="p-4 space-y-3 overflow-y-auto bg-[#ececec]">
            <div className="border border-[#999999] bg-[#ffffff] p-2.5 text-[11px] text-[#374151] rounded-[2px]">
              Create your own private suite saved in the PostgreSQL{' '}
              <strong className="font-mono-num">rooms</strong> table.
            </div>

            <div>
              <label htmlFor="nav-room-caption" className="block text-[11px] font-bold text-[#111827]">
                Room Name
              </label>
              <input
                id="nav-room-caption"
                data-testid="nav-room-caption-input"
                type="text"
                required
                maxLength={48}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={`${playerUsername}'s Trading Lounge`}
                className="mt-1 w-full border border-[#6b7280] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] focus:border-[#2b6ca3] focus:outline-none rounded-[2px]"
              />
            </div>

            <div>
              <label htmlFor="nav-room-desc" className="block text-[11px] font-bold text-[#111827]">
                Description
              </label>
              <input
                id="nav-room-desc"
                type="text"
                maxLength={120}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Come trade rares and hang out!"
                className="mt-1 w-full border border-[#6b7280] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] focus:border-[#2b6ca3] focus:outline-none rounded-[2px]"
              />
            </div>

            <div>
              <label htmlFor="nav-room-model" className="block text-[11px] font-bold text-[#111827]">
                Room Model &amp; Style
              </label>
              <select
                id="nav-room-model"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="mt-1 w-full border border-[#6b7280] bg-white px-2.5 py-1.5 text-xs font-bold text-[#111827] focus:border-[#2b6ca3] focus:outline-none rounded-[2px]"
              >
                {ROOM_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </select>
            </div>

            {feedback && (
              <p className="border border-[#dc2626] bg-[#fef2f2] px-3 py-1.5 text-xs font-bold text-[#7f1d1d] rounded-[2px]">
                {feedback}
              </p>
            )}

            <button
              type="submit"
              disabled={creating || !caption.trim()}
              data-testid="nav-create-room-submit"
              className="habbo-btn-green w-full py-2 font-pixel text-xs cursor-pointer disabled:opacity-50"
            >
              {creating ? 'Creating Room...' : 'Create & Enter Room'}
            </button>
          </form>
        ) : (
          <div className="space-y-1.5 p-2.5 overflow-y-auto bg-[#ececec]">
            {displayedRooms.length === 0 ? (
              <p className="border border-[#999999] bg-white p-4 text-center text-xs text-[#4b5563] rounded-[2px]">
                No rooms in this tab yet. Click Create Room to open a private suite!
              </p>
            ) : (
              displayedRooms.map((room) => {
                const isCurrent = room.id === currentRoomId;
                const isLido = room.modelName === 'model_lido' || room.id === 'the_lido';
                const isBanzai = room.modelName === 'model_banzai' || room.id === 'battle_banzai';
                const thumbSrc = getRoomThumbnailImage(room);

                return (
                  <div
                    key={room.id}
                    data-testid={`nav-room-row-${room.id}`}
                    className={`flex items-center justify-between gap-2.5 border p-2 rounded-[2px] ${
                      isCurrent
                        ? 'border-[#16a34a] bg-[#f0fdf4]'
                        : 'border-[#b5b5b5] bg-[#ffffff] hover:bg-[#f4f8fc]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={thumbSrc}
                        alt={room.name}
                        className="pixelated h-[42px] w-[68px] border border-[#000000] shrink-0 rounded-[2px]"
                        draggable={false}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <h3 className="text-[12px] font-bold text-[#111827] truncate">
                            {room.name}
                          </h3>
                          {isLido && (
                            <span className="border border-[#000000] bg-[#0284c7] px-1 py-0.5 font-pixel text-[7px] text-white rounded-[1px]">
                              POOL
                            </span>
                          )}
                          {isBanzai && (
                            <span className="border border-[#000000] bg-[#7c3aed] px-1 py-0.5 font-pixel text-[7px] text-white rounded-[1px]">
                              GAME
                            </span>
                          )}
                          {isCurrent && (
                            <span className="border border-[#15803d] bg-[#dcfce7] px-1 py-0.5 text-[9px] font-bold text-[#14532d] rounded-[1px]">
                              HERE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#4b5563] truncate">
                          Owner: {room.owner === 'PixelGuest' ? playerUsername : room.owner}
                          {room.description ? ` · ${room.description}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 border border-[#16a34a] bg-[#dcfce7] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#14532d] rounded-[2px]">
                        <Users className="h-3 w-3" /> {room.baseOccupancy}/{room.usersMax ?? 25}
                      </span>
                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => {
                          onSelectRoom(room.id);
                          onClose();
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold ${
                          isCurrent
                            ? 'border border-[#999999] bg-[#d4d4d4] text-[#525252] cursor-default rounded-[2px]'
                            : 'habbo-btn-green cursor-pointer'
                        }`}
                      >
                        {isCurrent ? 'Current' : 'Enter'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

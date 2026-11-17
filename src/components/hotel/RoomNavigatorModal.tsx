import { useState } from 'react';
import { DoorOpen, PlusCircle, Users, X } from 'lucide-react';
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [modelName, setModelName] = useState('model_c');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Room Navigator"
    >
      <div className="client-window flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden">
        <div className="client-window-bar flex items-center justify-between px-3.5 py-2 shrink-0">
          <span className="inline-flex items-center gap-2 font-pixel text-sm">
            <DoorOpen className="h-4 w-4" />
            Hotel Navigator
          </span>
          <div className="flex items-center gap-2">
            {onCreateRoom && (
              <button
                type="button"
                data-testid="nav-create-room-toggle"
                onClick={() => {
                  setShowCreateForm((v) => !v);
                  setFeedback(null);
                }}
                className="habbo-btn-green inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                {showCreateForm ? 'Back to Rooms' : 'Create Room'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Navigator"
              className="rounded border border-white/30 bg-black/25 p-1 hover:bg-black/45 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleCreateSubmit} className="p-4 space-y-3 overflow-y-auto">
            <div className="rounded border border-[#c8d6e5] bg-[#f4f8fc] p-2.5 text-xs text-slate-700">
              Create your own persistent private suite saved directly in the PostgreSQL{' '}
              <strong className="font-mono-num">rooms</strong> table!
            </div>

            <div>
              <label htmlFor="nav-room-caption" className="block text-xs font-bold text-slate-800">
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
                className="mt-1 w-full rounded border-2 border-stone-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="nav-room-desc" className="block text-xs font-bold text-slate-800">
                Description
              </label>
              <input
                id="nav-room-desc"
                type="text"
                maxLength={120}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Come trade rares and hang out!"
                className="mt-1 w-full rounded border-2 border-stone-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="nav-room-model" className="block text-xs font-bold text-slate-800">
                Room Floor &amp; Wall Style
              </label>
              <select
                id="nav-room-model"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="mt-1 w-full rounded border-2 border-stone-400 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
              >
                {ROOM_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </select>
            </div>

            {feedback && (
              <p className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800">
                {feedback}
              </p>
            )}

            <button
              type="submit"
              disabled={creating || !caption.trim()}
              data-testid="nav-create-room-submit"
              className="habbo-btn-green w-full rounded py-2 font-pixel text-xs cursor-pointer disabled:opacity-50"
            >
              {creating ? 'Creating Room...' : 'Create & Enter Room'}
            </button>
          </form>
        ) : (
          <div className="divide-y divide-stone-300 p-2 overflow-y-auto">
            {rooms.map((room) => {
              const isCurrent = room.id === currentRoomId;
              const isBanzai = room.modelName === 'model_banzai' || room.id === 'battle_banzai' || room.numericId === 3;
              const catLabel = isBanzai ? 'Games' : room.category === 'private' ? 'Private' : 'Public';
              const catClass = isBanzai
                ? 'bg-cyan-100 text-cyan-900'
                : room.category === 'private'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-sky-100 text-sky-900';

              return (
                <div
                  key={room.id}
                  className="flex items-center justify-between gap-3 rounded p-3 hover:bg-white/70"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">{room.name}</h3>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${catClass}`}>
                        {catLabel}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Here
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      Owner: {room.owner === 'PixelGuest' ? playerUsername : room.owner}
                      {room.description ? ` · ${room.description}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono-num text-xs font-bold text-emerald-800">
                      <Users className="h-3 w-3" /> {room.baseOccupancy}/{room.usersMax ?? 25}
                    </span>
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => {
                        onSelectRoom(room.id);
                        onClose();
                      }}
                      className={`rounded px-3 py-1.5 text-xs font-bold ${
                        isCurrent
                          ? 'bg-stone-300 text-stone-600 cursor-default'
                          : 'habbo-btn-green cursor-pointer'
                      }`}
                    >
                      {isCurrent ? 'Current' : 'Enter'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

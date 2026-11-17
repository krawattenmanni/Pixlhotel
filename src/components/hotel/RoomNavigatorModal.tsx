import { DoorOpen, Users, X } from 'lucide-react';
import type { RoomDef } from '../../game/types';

interface RoomNavigatorModalProps {
  rooms: RoomDef[];
  currentRoomId: string;
  playerUsername: string;
  onSelectRoom: (roomId: string) => void;
  onClose: () => void;
}

export function RoomNavigatorModal({
  rooms,
  currentRoomId,
  playerUsername,
  onSelectRoom,
  onClose,
}: RoomNavigatorModalProps) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Room Navigator"
    >
      <div className="client-window w-full max-w-md overflow-hidden">
        <div className="client-window-bar flex items-center justify-between px-3.5 py-2">
          <span className="inline-flex items-center gap-2 font-pixel text-sm">
            <DoorOpen className="h-4 w-4" />
            Hotel Navigator
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Navigator"
            className="rounded border border-white/30 bg-black/25 p-1 hover:bg-black/45 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="divide-y divide-stone-300 p-2">
          {rooms.map((room) => {
            const isCurrent = room.id === currentRoomId;
            return (
              <div
                key={room.id}
                className="flex items-center justify-between gap-3 rounded p-3 hover:bg-white/70"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">{room.name}</h3>
                    {isCurrent && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        Here
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Owner: {room.owner === 'PixelGuest' ? playerUsername : room.owner}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono-num text-xs font-bold text-emerald-800">
                    <Users className="h-3 w-3" /> {room.baseOccupancy}
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
      </div>
    </div>
  );
}

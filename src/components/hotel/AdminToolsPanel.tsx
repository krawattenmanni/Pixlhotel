import { Ban, RotateCcw, ShieldAlert, UserMinus, X } from 'lucide-react';
import type { ModerationLogEntry } from '../../game/moderation';
import type { HabboNPC, RoomDef } from '../../game/types';
import { PixelBadge, PixelHeadCanvas } from '../PixelSpriteCanvas';

interface AdminToolsPanelProps {
  room: RoomDef;
  activeUsers: HabboNPC[];
  bannedUsers: HabboNPC[];
  logs: ModerationLogEntry[];
  isAdminAccount: boolean;
  onKickUser: (npc: HabboNPC) => void;
  onBanUser: (npc: HabboNPC) => void;
  onUnbanUser: (npc: HabboNPC) => void;
  onClose: () => void;
}

export function AdminToolsPanel({
  room,
  activeUsers,
  bannedUsers,
  logs,
  isAdminAccount,
  onKickUser,
  onBanUser,
  onUnbanUser,
  onClose,
}: AdminToolsPanelProps) {
  const roomLogs = logs.filter((l) => l.roomId === room.id).slice(0, 5);

  return (
    <div
      className="pointer-events-auto fixed top-20 right-4 z-40 w-80 sm:w-96 max-w-[calc(100vw-2rem)] client-window overflow-hidden"
      role="dialog"
      aria-label="Admin Tools"
    >
      <div className="client-window-bar flex items-center justify-between px-3.5 py-2">
        <span className="inline-flex items-center gap-2 font-pixel text-xs">
          <ShieldAlert className="h-4 w-4 text-[#fde047]" />
          Admin Tools
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Admin Tools"
          className="rounded border border-white/30 bg-black/25 p-1 hover:bg-black/45 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3.5 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Room Context Banner */}
        <div className="flex items-center justify-between rounded border border-stone-300 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-900 truncate">{room.name}</p>
            <p className="text-[11px] text-slate-500">
              {isAdminAccount ? 'Hotel Admin Override Active' : 'Room Owner Moderation'}
            </p>
          </div>
          <PixelBadge code={isAdminAccount ? 'ADM' : 'OWN'} />
        </div>

        {/* Active Users in Current Room */}
        <div>
          <h3 className="text-xs font-extrabold text-slate-800 mb-2">
            Users in Room ({activeUsers.length})
          </h3>
          {activeUsers.length === 0 ? (
            <p className="rounded border border-stone-300 bg-white/70 p-3 text-xs text-slate-500 text-center">
              No other PIXL citizens currently in this room.
            </p>
          ) : (
            <div className="space-y-2">
              {activeUsers.map((npc) => (
                <div
                  key={npc.id}
                  data-testid={`admin-user-row-${npc.id}`}
                  className="flex items-center justify-between gap-2 rounded border border-stone-300 bg-white p-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="rounded border border-slate-300 bg-[#e8f4fc] p-0.5 shrink-0">
                      <PixelHeadCanvas look={npc.look} size={28} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-extrabold text-slate-900">
                          {npc.name}
                        </span>
                        {npc.badge && <PixelBadge code={npc.badge} />}
                      </div>
                      <p className="truncate text-[10px] text-slate-500">{npc.motto}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onKickUser(npc)}
                      aria-label={`Kick ${npc.name}`}
                      className="inline-flex items-center gap-1 rounded border border-amber-700 bg-amber-500 px-2 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                    >
                      <UserMinus className="h-3 w-3" /> Kick
                    </button>
                    <button
                      type="button"
                      onClick={() => onBanUser(npc)}
                      aria-label={`Ban ${npc.name}`}
                      className="inline-flex items-center gap-1 rounded border border-rose-800 bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                    >
                      <Ban className="h-3 w-3" /> Ban
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Banned Users List */}
        <div>
          <h3 className="text-xs font-extrabold text-slate-800 mb-2">
            Banned from Room ({bannedUsers.length})
          </h3>
          {bannedUsers.length === 0 ? (
            <p className="rounded border border-stone-300 bg-white/70 p-2.5 text-[11px] text-slate-500">
              No banned users in this room.
            </p>
          ) : (
            <div className="space-y-1.5">
              {bannedUsers.map((npc) => (
                <div
                  key={npc.id}
                  data-testid={`admin-banned-row-${npc.id}`}
                  className="flex items-center justify-between gap-2 rounded border border-rose-300 bg-rose-50 px-2.5 py-1.5"
                >
                  <span className="text-xs font-bold text-rose-950 truncate">{npc.name}</span>
                  <button
                    type="button"
                    onClick={() => onUnbanUser(npc)}
                    aria-label={`Unban ${npc.name}`}
                    className="inline-flex items-center gap-1 rounded border border-slate-400 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Unban
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Moderation Log */}
        {roomLogs.length > 0 && (
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 mb-1.5">Recent Actions</h3>
            <div className="space-y-1 rounded border border-stone-300 bg-white p-2 text-[11px] text-slate-700">
              {roomLogs.map((entry) => (
                <p key={entry.id}>
                  <strong>{entry.actorName}</strong>{' '}
                  {entry.action === 'kick' ? 'kicked' : entry.action === 'ban' ? 'banned' : 'unbanned'}{' '}
                  <strong>{entry.targetName}</strong>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

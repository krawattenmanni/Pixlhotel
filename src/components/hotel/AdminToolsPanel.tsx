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
      className="pointer-events-auto fixed top-16 right-4 z-40 w-80 sm:w-96 max-w-[calc(100vw-2rem)] client-window overflow-hidden"
      role="dialog"
      aria-label="Admin Tools"
    >
      <div
        className="client-window-bar flex items-center justify-between px-3 py-1.5"
        style={{ background: 'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)' }}
      >
        <span className="inline-flex items-center gap-1.5 font-pixel text-[11px]">
          <ShieldAlert className="h-3.5 w-3.5 text-[#fde047]" />
          Admin Tools
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Admin Tools"
          className="client-close-btn"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="p-3 space-y-3.5 max-h-[70vh] overflow-y-auto bg-[#ececec]">
        {/* Room Context Banner */}
        <div className="flex items-center justify-between border border-[#b5b5b5] bg-white px-2.5 py-2 rounded-[2px]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#111827] truncate">{room.name}</p>
            <p className="text-[10px] text-[#4b5563]">
              {isAdminAccount ? 'Hotel Admin Override Active' : 'Room Owner Moderation'}
            </p>
          </div>
          <PixelBadge code={isAdminAccount ? 'ADM' : 'OWN'} />
        </div>

        {/* Active Users in Current Room */}
        <div>
          <h3 className="text-[11px] font-bold text-[#1f2937] mb-1.5">
            Users in Room ({activeUsers.length})
          </h3>
          {activeUsers.length === 0 ? (
            <p className="border border-[#b5b5b5] bg-white p-3 text-[11px] text-[#4b5563] text-center rounded-[2px]">
              No other PIXL citizens currently in this room.
            </p>
          ) : (
            <div className="space-y-1.5">
              {activeUsers.map((npc) => (
                <div
                  key={npc.id}
                  data-testid={`admin-user-row-${npc.id}`}
                  className="flex items-center justify-between gap-2 border border-[#b5b5b5] bg-white p-2 rounded-[2px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="border border-[#8f8f8f] bg-[#dbeafe] p-0.5 shrink-0 rounded-[2px]">
                      <PixelHeadCanvas look={npc.look} size={28} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[11px] font-bold text-[#111827]">
                          {npc.name}
                        </span>
                        {npc.badge && <PixelBadge code={npc.badge} />}
                      </div>
                      <p className="truncate text-[10px] text-[#4b5563]">{npc.motto}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onKickUser(npc)}
                      aria-label={`Kick ${npc.name}`}
                      className="habbo-btn-gold inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                    >
                      <UserMinus className="h-3 w-3" /> Kick
                    </button>
                    <button
                      type="button"
                      onClick={() => onBanUser(npc)}
                      aria-label={`Ban ${npc.name}`}
                      className="habbo-btn-red inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold cursor-pointer"
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
          <h3 className="text-[11px] font-bold text-[#1f2937] mb-1.5">
            Banned from Room ({bannedUsers.length})
          </h3>
          {bannedUsers.length === 0 ? (
            <p className="border border-[#b5b5b5] bg-white p-2.5 text-[10px] text-[#4b5563] rounded-[2px]">
              No banned users in this room.
            </p>
          ) : (
            <div className="space-y-1.5">
              {bannedUsers.map((npc) => (
                <div
                  key={npc.id}
                  data-testid={`admin-banned-row-${npc.id}`}
                  className="flex items-center justify-between gap-2 border border-[#991b1b] bg-[#fee2e2] px-2.5 py-1.5 rounded-[2px]"
                >
                  <span className="text-[11px] font-bold text-[#7f1d1d] truncate">{npc.name}</span>
                  <button
                    type="button"
                    onClick={() => onUnbanUser(npc)}
                    aria-label={`Unban ${npc.name}`}
                    className="habbo-btn-silver inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold cursor-pointer"
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
            <h3 className="text-[11px] font-bold text-[#1f2937] mb-1">Recent Actions</h3>
            <div className="space-y-1 border border-[#b5b5b5] bg-white p-2 text-[10px] text-[#374151] rounded-[2px]">
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

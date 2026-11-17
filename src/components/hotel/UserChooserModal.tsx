import { Users, X } from 'lucide-react';
import type { LookConfig } from '../../game/types';
import { PixelBadge, PixelHeadCanvas } from '../PixelSpriteCanvas';

export interface ChooserUserItem {
  key: string;
  username: string;
  motto: string;
  look: LookConfig;
  roleBadge?: string;
  isSelf?: boolean;
  isNpc?: boolean;
}

interface UserChooserModalProps {
  roomName: string;
  users: ChooserUserItem[];
  onSelectUser: (key: string) => void;
  onClose: () => void;
}

export function UserChooserModal({
  roomName,
  users,
  onSelectUser,
  onClose,
}: UserChooserModalProps) {
  return (
    <div
      data-testid="user-chooser-modal"
      className="pointer-events-auto fixed left-3 top-14 z-40 w-[260px] border border-[#000000] bg-[#1e1e1e]/95 text-[#e5e7eb] rounded-[3px] shadow-2xl overflow-hidden"
      role="dialog"
      aria-label="Room Users Chooser"
    >
      <div className="flex items-center justify-between border-b border-[#000000] bg-[#2c2c2c] px-2.5 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white">
          <Users className="h-3.5 w-3.5 text-[#38bdf8]" />
          Room Users ({users.length})
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close User Chooser"
          className="flex h-4 w-4 items-center justify-center border border-[#000000] bg-[#b91c1c] text-white hover:bg-[#dc2626] rounded-[2px] cursor-pointer"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      <div className="border-b border-[#333333] bg-[#141414] px-2.5 py-1 text-[10px] text-[#9ca3af] truncate">
        {roomName} — click a user to inspect
      </div>

      <div className="max-h-[280px] divide-y divide-[#2d2d2d] overflow-y-auto p-1">
        {users.map((u) => (
          <button
            key={u.key}
            type="button"
            onClick={() => onSelectUser(u.key)}
            data-testid={`chooser-user-${u.username}`}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-[#2b6ca3]/40 rounded-[2px] cursor-pointer"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#000000] bg-[#263240] rounded-[2px]">
              <PixelHeadCanvas look={u.look} size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {u.roleBadge && <PixelBadge code={u.roleBadge} />}
                <span className="truncate text-[11px] font-bold text-white">
                  {u.username}
                </span>
                {u.isSelf && (
                  <span className="text-[9px] font-bold text-[#86efac]">(You)</span>
                )}
              </div>
              <p className="truncate text-[10px] text-[#9ca3af]">{u.motto}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

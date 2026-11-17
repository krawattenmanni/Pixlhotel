import { useState } from 'react';
import { Bell, Check, Crown, KeyRound, Lock, Settings, Shield, Trash2, X } from 'lucide-react';
import type { RoomAccessMode, RoomDef } from '../../game/types';

interface RoomSettingsModalProps {
  room: RoomDef;
  onSaveSettings: (patch: {
    name: string;
    description: string;
    usersMax: number;
    accessMode: RoomAccessMode;
    accessPassword: string;
    roomRights: string[];
  }) => void;
  onClose: () => void;
}

export function RoomSettingsModal({
  room,
  onSaveSettings,
  onClose,
}: RoomSettingsModalProps) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description);
  const [usersMax, setUsersMax] = useState(room.usersMax ?? 25);
  const [accessMode, setAccessMode] = useState<RoomAccessMode>(room.accessMode ?? 'open');
  const [accessPassword, setAccessPassword] = useState(room.accessPassword ?? '');
  const [rights, setRights] = useState<string[]>(room.roomRights ?? []);
  const [newRightName, setNewRightName] = useState('');

  const handleAddRight = () => {
    const clean = newRightName.trim();
    if (!clean) return;
    if (!rights.some((r) => r.toLowerCase() === clean.toLowerCase())) {
      setRights((prev) => [...prev, clean]);
    }
    setNewRightName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      name: name.trim() || room.name,
      description: description.trim(),
      usersMax,
      accessMode,
      accessPassword: accessMode === 'password' ? accessPassword.trim() : '',
      roomRights: rights,
    });
    onClose();
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Room Settings"
      data-testid="room-settings-modal"
    >
      <div className="client-window flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden">
        <div className="client-window-bar flex items-center justify-between px-3 py-1.5 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold">
            <Settings className="h-4 w-4 text-[#fef08a]" />
            Room Settings
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Room Settings"
            className="client-close-btn"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3.5 space-y-3 overflow-y-auto bg-[#ececec]">
          <div>
            <label htmlFor="rs-name" className="block text-[11px] font-bold text-[#111827]">
              Room Name
            </label>
            <input
              id="rs-name"
              type="text"
              maxLength={48}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border border-[#6b7280] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] rounded-[2px]"
            />
          </div>

          <div>
            <label htmlFor="rs-desc" className="block text-[11px] font-bold text-[#111827]">
              Description
            </label>
            <input
              id="rs-desc"
              type="text"
              maxLength={120}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border border-[#6b7280] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] rounded-[2px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="rs-max" className="block text-[11px] font-bold text-[#111827]">
                Max Visitors
              </label>
              <select
                id="rs-max"
                value={usersMax}
                onChange={(e) => setUsersMax(Number(e.target.value))}
                className="mt-1 w-full border border-[#6b7280] bg-white px-2 py-1.5 text-xs font-bold text-[#111827] rounded-[2px]"
              >
                <option value={10}>10 Users</option>
                <option value={25}>25 Users</option>
                <option value={50}>50 Users</option>
              </select>
            </div>

            <div>
              <label htmlFor="rs-access" className="block text-[11px] font-bold text-[#111827]">
                Access Control
              </label>
              <select
                id="rs-access"
                data-testid="room-settings-access-select"
                value={accessMode}
                onChange={(e) => setAccessMode(e.target.value as RoomAccessMode)}
                className="mt-1 w-full border border-[#6b7280] bg-white px-2 py-1.5 text-xs font-bold text-[#111827] rounded-[2px]"
              >
                <option value="open">Open to Everyone</option>
                <option value="doorbell">Doorbell Required</option>
                <option value="password">Password Protected</option>
              </select>
            </div>
          </div>

          {accessMode === 'password' && (
            <div className="border border-[#ca8a04] bg-[#fef9c3] p-2.5 rounded-[2px]">
              <label htmlFor="rs-pass" className="flex items-center gap-1 text-[11px] font-bold text-[#713f12]">
                <KeyRound className="h-3.5 w-3.5" /> Room Password
              </label>
              <input
                id="rs-pass"
                type="text"
                required
                maxLength={24}
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Enter secret password..."
                className="mt-1 w-full border border-[#a16207] bg-white px-2.5 py-1 text-xs font-bold text-[#111827] rounded-[2px]"
              />
            </div>
          )}

          {/* Room Rights Holders */}
          <div className="border border-[#999999] bg-white p-2.5 rounded-[2px] space-y-2">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#111827]">
              <Crown className="h-3.5 w-3.5 text-[#ca8a04]" /> Room Rights Holders ({rights.length})
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newRightName}
                onChange={(e) => setNewRightName(e.target.value)}
                placeholder="Grant rights to username..."
                className="flex-1 border border-[#6b7280] px-2 py-1 text-xs text-[#111827] rounded-[2px]"
              />
              <button
                type="button"
                onClick={handleAddRight}
                className="border border-[#000000] bg-[#2b6ca3] px-2.5 py-1 text-[11px] font-bold text-white rounded-[2px] cursor-pointer"
              >
                Add
              </button>
            </div>
            {rights.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {rights.map((holder) => (
                  <span
                    key={holder}
                    className="inline-flex items-center gap-1 border border-[#999999] bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-bold text-[#111827] rounded-[2px]"
                  >
                    {holder}
                    <button
                      type="button"
                      aria-label={`Revoke rights for ${holder}`}
                      onClick={() => setRights((prev) => prev.filter((r) => r !== holder))}
                      className="text-[#b91c1c] hover:text-[#dc2626] cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            data-testid="room-settings-save"
            className="habbo-btn-green w-full py-2 text-xs font-bold tracking-wide uppercase cursor-pointer"
          >
            Save Room Settings
          </button>
        </form>
      </div>
    </div>
  );
}

interface DoorbellPromptModalProps {
  guestName: string;
  roomName: string;
  onAccept: () => void;
  onDeny: () => void;
}

export function DoorbellPromptModal({
  guestName,
  roomName,
  onAccept,
  onDeny,
}: DoorbellPromptModalProps) {
  return (
    <div
      data-testid="doorbell-prompt-modal"
      className="pointer-events-auto fixed left-1/2 top-16 z-50 w-[310px] -translate-x-1/2 border border-[#000000] bg-[#1e1e1e]/95 p-3 text-white rounded-[3px] shadow-xl"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-[#fde047]">
        <Bell className="h-4 w-4 animate-bounce" /> Doorbell Ringing!
      </div>
      <p className="mt-1.5 text-[11px] text-[#e5e7eb]">
        <strong>{guestName}</strong> is ringing the doorbell for <strong>{roomName}</strong>.
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="flex flex-1 items-center justify-center gap-1 border border-[#000000] bg-[#16a34a] py-1.5 text-[11px] font-bold text-white hover:bg-[#15803d] rounded-[2px] cursor-pointer"
        >
          <Check className="h-3 w-3" /> Let In
        </button>
        <button
          type="button"
          onClick={onDeny}
          className="flex flex-1 items-center justify-center gap-1 border border-[#000000] bg-[#991b1b] py-1.5 text-[11px] font-bold text-white hover:bg-[#b91c1c] rounded-[2px] cursor-pointer"
        >
          <X className="h-3 w-3" /> Deny
        </button>
      </div>
    </div>
  );
}

interface RoomGateModalProps {
  mode: 'password' | 'doorbell_waiting' | 'doorbell_denied';
  room: RoomDef;
  onSubmitPassword: (password: string) => boolean;
  onEnterAnywayFallback?: () => void;
  onClose: () => void;
}

export function RoomGateModal({
  mode,
  room,
  onSubmitPassword,
  onClose,
}: RoomGateModalProps) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      data-testid="room-gate-modal"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Room Access"
    >
      <div className="client-window w-full max-w-sm overflow-hidden">
        <div className="client-window-bar flex items-center justify-between px-3 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold">
            {mode === 'password' ? (
              <Lock className="h-4 w-4 text-[#fef08a]" />
            ) : (
              <Shield className="h-4 w-4 text-[#fef08a]" />
            )}
            {room.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel entry"
            className="client-close-btn"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="p-4 bg-[#ececec] space-y-3 text-xs text-[#111827]">
          {mode === 'password' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const ok = onSubmitPassword(pass);
                if (!ok) setError('Incorrect room password. Try again!');
              }}
              className="space-y-2.5"
            >
              <p className="font-semibold">
                This private suite is locked with a password.
              </p>
              <input
                type="password"
                autoFocus
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setError(null);
                }}
                placeholder="Enter room password..."
                className="w-full border border-[#6b7280] bg-white px-2.5 py-1.5 text-xs font-bold text-[#111827] rounded-[2px]"
              />
              {error && (
                <p className="border border-[#dc2626] bg-[#fef2f2] px-2 py-1 text-[11px] font-bold text-[#991b1b] rounded-[2px]">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="habbo-btn-green w-full py-1.5 font-pixel text-xs cursor-pointer"
              >
                Unlock &amp; Enter
              </button>
            </form>
          ) : mode === 'doorbell_waiting' ? (
            <div className="space-y-3 text-center">
              <Bell className="mx-auto h-7 w-7 text-[#d97706] animate-bounce" />
              <p className="font-bold">Ringing the doorbell...</p>
              <p className="text-[11px] text-[#4b5563]">
                Waiting for <strong>{room.owner}</strong> to answer and let you inside.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="border border-[#000000] bg-[#d4d4d4] px-4 py-1.5 text-xs font-bold text-[#111827] rounded-[2px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="font-bold text-[#991b1b]">Doorbell unanswered or denied.</p>
              <p className="text-[11px] text-[#4b5563]">
                The room owner did not let you enter right now.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="border border-[#000000] bg-[#d4d4d4] px-4 py-1.5 text-xs font-bold text-[#111827] rounded-[2px] cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

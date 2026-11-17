import { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Crown,
  Edit3,
  Heart,
  MessageCircle,
  Music,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { findBadgeDefById } from '../../game/customBadges';
import type { CustomBadgeDef, LookConfig } from '../../game/types';
import { PixelAvatarCanvas, PixelBadge, PixelBadgeSprite } from '../PixelSpriteCanvas';

export interface InfoStandTarget {
  key: string;
  username: string;
  motto: string;
  look: LookConfig;
  badges: string[];
  roleBadge?: string;
  roleLabel?: string;
  respectCount: number;
  isSelf: boolean;
  isNpc: boolean;
  isStaff: boolean;
  isFriend: boolean;
  requestSent: boolean;
  requestReceived: boolean;
  hasRoomRights: boolean;
}

interface AvatarInfoStandProps {
  target: InfoStandTarget;
  customBadges: CustomBadgeDef[];
  respectRemaining: number;
  canModerateRoom: boolean;
  onClose: () => void;
  onSaveMotto?: (nextMotto: string) => void;
  onOpenWardrobe?: () => void;
  onOpenBadges?: () => void;
  onSelfPose?: (pose: 'dance' | 'wave') => void;
  onFriendAction?: (action: 'add' | 'remove' | 'accept') => void;
  onWhisper?: (username: string) => void;
  onTrade?: (username: string) => void;
  onGiveRespect?: (target: InfoStandTarget) => void;
  onKickUser?: (username: string) => void;
  onToggleRoomRights?: (username: string) => void;
  onSelectBadge?: (badgeId: string) => void;
}

export function AvatarInfoStand({
  target,
  customBadges,
  respectRemaining,
  canModerateRoom,
  onClose,
  onSaveMotto,
  onOpenWardrobe,
  onOpenBadges,
  onSelfPose,
  onFriendAction,
  onWhisper,
  onTrade,
  onGiveRespect,
  onKickUser,
  onToggleRoomRights,
  onSelectBadge,
}: AvatarInfoStandProps) {
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoDraft, setMottoDraft] = useState(target.motto);

  useEffect(() => {
    setMottoDraft(target.motto);
    setEditingMotto(false);
  }, [target.key, target.motto]);

  const equippedFive = target.badges.slice(0, 5);

  const commitMotto = () => {
    if (!onSaveMotto) return;
    onSaveMotto(mottoDraft.trim().slice(0, 64));
    setEditingMotto(false);
  };

  return (
    <aside
      data-testid="avatar-info-stand"
      aria-label={`Avatar info for ${target.username}`}
      className="pointer-events-auto fixed bottom-14 right-3 z-30 w-[290px] border border-[#000000] bg-[#1e1e1e]/95 text-[#e5e7eb] rounded-[3px] shadow-[0_6px_20px_rgba(0,0,0,0.65)] overflow-hidden"
    >
      {/* Top 3D dark bar */}
      <div className="flex items-center justify-between border-b border-[#000000] bg-[#2c2c2c] px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {target.roleBadge && <PixelBadge code={target.roleBadge} label={target.roleLabel} />}
          <span className="truncate font-bold text-[12px] text-[#ffffff]" data-testid="infostand-username">
            {target.username}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="inline-flex items-center gap-1 border border-[#000000] bg-[#111827] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#fde047] rounded-[2px]"
            title="Respect received"
            data-testid="infostand-respect-count"
          >
            <Heart className="h-2.5 w-2.5 fill-[#ef4444] text-[#ef4444]" />
            {target.respectCount}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Avatar Info-Stand"
            className="flex h-4 w-4 items-center justify-center border border-[#000000] bg-[#b91c1c] text-white hover:bg-[#dc2626] rounded-[2px] cursor-pointer"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-2.5 space-y-2.5">
        <div className="flex items-start gap-2.5">
          {/* Pixel Avatar Portrait Stage */}
          <div className="flex h-[96px] w-[76px] shrink-0 items-center justify-center border border-[#000000] bg-gradient-to-b from-[#2f455c] to-[#1a2634] rounded-[2px] overflow-hidden">
            <PixelAvatarCanvas look={target.look} dir={0} pose="stand" scale={1.45} />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Motto Box (Click-to-Edit if Self) */}
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#9ca3af]">
                Motto
              </div>
              {target.isSelf && editingMotto ? (
                <div className="mt-0.5 flex items-center gap-1">
                  <input
                    type="text"
                    value={mottoDraft}
                    maxLength={64}
                    onChange={(e) => setMottoDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitMotto();
                      if (e.key === 'Escape') {
                        setMottoDraft(target.motto);
                        setEditingMotto(false);
                      }
                    }}
                    aria-label="Edit your motto"
                    data-testid="infostand-motto-input"
                    autoFocus
                    className="w-full border border-[#5c94c8] bg-[#111827] px-1.5 py-0.5 text-[11px] text-white focus:outline-none rounded-[2px]"
                  />
                  <button
                    type="button"
                    onClick={commitMotto}
                    aria-label="Save Motto"
                    data-testid="infostand-motto-save"
                    className="border border-[#000000] bg-[#16a34a] p-1 text-white hover:bg-[#15803d] rounded-[2px] cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : target.isSelf ? (
                <button
                  type="button"
                  onClick={() => setEditingMotto(true)}
                  data-testid="infostand-motto-edit"
                  title="Click to edit your motto"
                  className="mt-0.5 flex w-full items-center justify-between gap-1 border border-[#3f3f46] bg-[#141414] px-1.5 py-1 text-left text-[11px] italic text-[#f3f4f6] hover:border-[#60a5fa] rounded-[2px] cursor-pointer"
                >
                  <span className="truncate">
                    &ldquo;{target.motto || 'Click to set motto...'}&rdquo;
                  </span>
                  <Edit3 className="h-3 w-3 shrink-0 text-[#9ca3af]" />
                </button>
              ) : (
                <p className="mt-0.5 border border-[#333333] bg-[#141414] px-1.5 py-1 text-[11px] italic text-[#d1d5db] rounded-[2px] break-words">
                  &ldquo;{target.motto || 'Living the PIXL dream!'}&rdquo;
                </p>
              )}
            </div>

            {/* 5 Equipped Tappable Badges */}
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#9ca3af]">
                Badges ({equippedFive.length}/5)
              </div>
              <div className="mt-1 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const badgeId = equippedFive[idx];
                  if (!badgeId) {
                    return (
                      <span
                        key={`empty-${idx}`}
                        className="flex h-[32px] w-[32px] items-center justify-center border border-[#333333] bg-[#141414] rounded-[2px] text-[9px] text-[#4b5563]"
                      >
                        —
                      </span>
                    );
                  }
                  const def = findBadgeDefById(badgeId, customBadges);
                  return (
                    <button
                      key={badgeId}
                      type="button"
                      title={def ? `${def.name} (${def.code})` : badgeId}
                      onClick={() => onSelectBadge?.(badgeId)}
                      className="flex h-[32px] w-[32px] items-center justify-center border border-[#000000] bg-[#27272a] hover:border-[#facc15] rounded-[2px] cursor-pointer"
                    >
                      <PixelBadgeSprite
                        badgeId={badgeId}
                        unlocked
                        size={26}
                        customBadges={customBadges}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {target.isSelf ? (
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#333333]">
            <button
              type="button"
              onClick={onOpenWardrobe}
              data-testid="infostand-change-looks"
              className="flex items-center justify-center gap-1 border border-[#000000] bg-[#2b6ca3] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#3582c4] rounded-[2px] cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Change Looks
            </button>
            <button
              type="button"
              onClick={onOpenBadges}
              data-testid="infostand-my-badges"
              className="flex items-center justify-center gap-1 border border-[#000000] bg-[#3f3f46] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#52525b] rounded-[2px] cursor-pointer"
            >
              <Award className="h-3 w-3 text-[#facc15]" /> My Badges
            </button>
            <button
              type="button"
              onClick={() => onSelfPose?.('dance')}
              data-testid="infostand-dance"
              className="flex items-center justify-center gap-1 border border-[#000000] bg-[#3f3f46] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#52525b] rounded-[2px] cursor-pointer"
            >
              <Music className="h-3 w-3 text-[#38bdf8]" /> Dance
            </button>
            <button
              type="button"
              onClick={() => onSelfPose?.('wave')}
              data-testid="infostand-wave"
              className="flex items-center justify-center gap-1 border border-[#000000] bg-[#3f3f46] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#52525b] rounded-[2px] cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-[#fde047]" /> Wave
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1 border-t border-[#333333]">
            <div className="grid grid-cols-2 gap-1.5">
              {target.isFriend ? (
                <button
                  type="button"
                  onClick={() => onFriendAction?.('remove')}
                  className="flex items-center justify-center gap-1 border border-[#000000] bg-[#3f3f46] px-2 py-1 text-[11px] font-bold text-[#fca5a5] hover:bg-[#52525b] rounded-[2px] cursor-pointer"
                >
                  <UserMinus className="h-3 w-3" /> Remove Friend
                </button>
              ) : target.requestReceived ? (
                <button
                  type="button"
                  onClick={() => onFriendAction?.('accept')}
                  className="flex items-center justify-center gap-1 border border-[#000000] bg-[#15803d] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#16a34a] rounded-[2px] cursor-pointer"
                >
                  <UserCheck className="h-3 w-3" /> Accept Friend
                </button>
              ) : (
                <button
                  type="button"
                  disabled={target.requestSent}
                  onClick={() => onFriendAction?.('add')}
                  className="flex items-center justify-center gap-1 border border-[#000000] bg-[#2b6ca3] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#3582c4] disabled:opacity-60 rounded-[2px] cursor-pointer"
                >
                  <UserPlus className="h-3 w-3" />
                  {target.requestSent ? 'Request Sent' : 'Add Friend'}
                </button>
              )}

              <button
                type="button"
                onClick={() => onWhisper?.(target.username)}
                data-testid="infostand-whisper"
                className="flex items-center justify-center gap-1 border border-[#000000] bg-[#3f3f46] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#52525b] rounded-[2px] cursor-pointer"
              >
                <MessageCircle className="h-3 w-3 text-[#bae6fd]" /> Whisper
              </button>

              <button
                type="button"
                onClick={() => onTrade?.(target.username)}
                data-testid="infostand-trade"
                className="flex items-center justify-center gap-1 border border-[#000000] bg-[#d97706] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#ea580c] rounded-[2px] cursor-pointer"
              >
                Trade
              </button>

              <button
                type="button"
                disabled={respectRemaining <= 0}
                onClick={() => onGiveRespect?.(target)}
                data-testid="infostand-respect-btn"
                className="flex items-center justify-center gap-1 border border-[#000000] bg-[#16a34a] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#15803d] disabled:bg-[#3f3f46] disabled:text-[#9ca3af] rounded-[2px] cursor-pointer"
              >
                <Heart className="h-3 w-3 fill-current" /> Respect ({respectRemaining} left)
              </button>
            </div>

            {canModerateRoom && !target.isNpc && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#333333]">
                <button
                  type="button"
                  onClick={() => onKickUser?.(target.username)}
                  data-testid="infostand-kick"
                  className="flex items-center justify-center gap-1 border border-[#000000] bg-[#991b1b] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#b91c1c] rounded-[2px] cursor-pointer"
                >
                  <ShieldAlert className="h-3 w-3" /> Kick
                </button>
                <button
                  type="button"
                  onClick={() => onToggleRoomRights?.(target.username)}
                  data-testid="infostand-rights"
                  className={`flex items-center justify-center gap-1 border border-[#000000] px-2 py-1 text-[10px] font-bold rounded-[2px] cursor-pointer ${
                    target.hasRoomRights
                      ? 'bg-[#b45309] text-white hover:bg-[#d97706]'
                      : 'bg-[#3f3f46] text-white hover:bg-[#52525b]'
                  }`}
                >
                  <Crown className="h-3 w-3 text-[#fde047]" />
                  {target.hasRoomRights ? 'Remove Rights' : 'Give Rights'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

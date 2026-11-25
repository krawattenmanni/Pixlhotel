import { useEffect, useState } from 'react';
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
  credits?: number;
  duckets?: number;
  hcDays?: number;
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
  const primaryBadgeId = equippedFive[0];
  const extraBadges = equippedFive.slice(1);

  const commitMotto = () => {
    if (!onSaveMotto) return;
    onSaveMotto(mottoDraft.trim().slice(0, 64));
    setEditingMotto(false);
  };

  const pillBtnClass =
    'bg-white text-black border border-black rounded-full font-bold text-[11px] px-3 py-1 hover:bg-[#f3f4f6] active:translate-y-[1px] cursor-pointer text-center shadow-[0_1px_0_#000000] disabled:opacity-55 disabled:cursor-default';

  return (
    <aside
      data-testid="avatar-info-stand"
      aria-label={`Avatar info for ${target.username}`}
      className="pointer-events-auto fixed bottom-[54px] right-[12px] z-30 flex flex-col items-end gap-1.5 text-white select-none"
    >
      {/* Top Name + Close Row floating directly on #000000 void */}
      <div className="flex items-center gap-1.5">
        {target.roleBadge && <PixelBadge code={target.roleBadge} label={target.roleLabel} />}
        <span
          className="font-bold text-[13px] text-white drop-shadow-[0_1px_0_#000000]"
          data-testid="infostand-username"
        >
          {target.username}
        </span>
        <span
          className="font-mono-num text-[10px] font-bold text-[#fde047] drop-shadow-[0_1px_0_#000000]"
          title="Respect received"
          data-testid="infostand-respect-count"
        >
          (♥ {target.respectCount})
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Avatar Info-Stand"
          className="ml-1 flex h-4 w-4 items-center justify-center border border-black bg-white text-[10px] font-bold leading-none text-black hover:bg-[#e5e7eb] cursor-pointer"
        >
          ×
        </button>
      </div>

      {/* Avatar Pedestal + Floating 40x40 Shaped Badge */}
      <div className="flex items-center gap-2.5">
        {/* Shaped 40x40 PixelBadgeSprite floating next to avatar */}
        <div className="flex flex-col items-end gap-1">
          {primaryBadgeId && (
            <button
              type="button"
              title={
                findBadgeDefById(primaryBadgeId, customBadges)?.name ?? primaryBadgeId
              }
              onClick={() => onSelectBadge?.(primaryBadgeId)}
              className="flex h-[42px] w-[42px] items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            >
              <PixelBadgeSprite
                badgeId={primaryBadgeId}
                unlocked
                size={40}
                customBadges={customBadges}
              />
            </button>
          )}
          {extraBadges.length > 0 && (
            <div className="flex items-center gap-1">
              {extraBadges.map((bId) => {
                const def = findBadgeDefById(bId, customBadges);
                return (
                  <button
                    key={bId}
                    type="button"
                    title={def ? `${def.name} (${def.code})` : bId}
                    onClick={() => onSelectBadge?.(bId)}
                    className="flex h-[28px] w-[28px] items-center justify-center cursor-pointer"
                  >
                    <PixelBadgeSprite
                      badgeId={bId}
                      unlocked
                      size={26}
                      customBadges={customBadges}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Avatar standing on classic grey isometric tile pedestal */}
        <div className="relative flex h-[86px] w-[68px] flex-col items-center justify-end">
          <div
            className="pointer-events-none absolute bottom-1.5 h-4 w-14 border border-black bg-[#9ca3af]"
            style={{
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
          <div className="relative z-10">
            <PixelAvatarCanvas look={target.look} dir={0} pose="stand" scale={1.15} />
          </div>
        </div>
      </div>

      {/* Motto Line (♡ {motto}) */}
      <div className="max-w-[230px] text-right">
        {target.isSelf && editingMotto ? (
          <div className="flex items-center gap-1">
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
              className="w-40 border border-black bg-white px-2 py-0.5 text-[11px] font-bold text-black focus:outline-none"
            />
            <button
              type="button"
              onClick={commitMotto}
              aria-label="Save Motto"
              data-testid="infostand-motto-save"
              className="border border-black bg-white px-2 py-0.5 text-[10px] font-bold text-black hover:bg-[#e5e7eb] cursor-pointer"
            >
              OK
            </button>
          </div>
        ) : target.isSelf ? (
          <button
            type="button"
            onClick={() => setEditingMotto(true)}
            data-testid="infostand-motto-edit"
            title="Click to edit your motto"
            className="text-[11px] font-bold text-[#e5e7eb] hover:text-[#fde047] underline decoration-dotted cursor-pointer"
          >
            ♡ {target.motto || 'Click to set motto...'}
          </button>
        ) : (
          <p className="text-[11px] font-bold text-[#e5e7eb] break-words">
            ♡ {target.motto || 'Living the PIXL dream!'}
          </p>
        )}
      </div>

      {/* Own Avatar Purse Readout: Taler (Credits), Duckets, and PIXL Club days */}
      {target.isSelf && (
        <div
          data-testid="infostand-self-purse"
          className="flex flex-wrap items-center justify-end gap-1.5 text-[11px] font-bold"
        >
          <span
            data-testid="infostand-credits"
            className="border border-black bg-[#fef08a] px-2 py-0.5 font-mono-num text-[10px] font-bold text-black"
          >
            {target.credits ?? 0} Taler
          </span>
          <span
            data-testid="infostand-duckets"
            className="border border-black bg-[#e9d5ff] px-2 py-0.5 font-mono-num text-[10px] font-bold text-black"
          >
            {target.duckets ?? 0} Duckets
          </span>
          <span
            data-testid="infostand-pc-days"
            className="border border-black bg-[#fed7aa] px-2 py-0.5 font-mono-num text-[10px] font-bold text-black"
          >
            {target.hcDays ?? 0}d PIXL Club
          </span>
        </div>
      )}

      {/* Vertical Stack of Crisp White Pill Action Buttons */}
      {target.isSelf ? (
        <div className="flex flex-col items-end gap-1 pt-0.5">
          <button
            type="button"
            onClick={onOpenWardrobe}
            data-testid="infostand-change-looks"
            className={pillBtnClass}
          >
            Change Looks
          </button>
          <button
            type="button"
            onClick={onOpenBadges}
            data-testid="infostand-my-badges"
            className={pillBtnClass}
          >
            My Badges
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelfPose?.('wave')}
              data-testid="infostand-wave"
              className={pillBtnClass}
            >
              Wave
            </button>
            <button
              type="button"
              onClick={() => onSelfPose?.('dance')}
              data-testid="infostand-dance"
              className={pillBtnClass}
            >
              Dance
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-1 pt-0.5">
          {target.isFriend ? (
            <button
              type="button"
              onClick={() => onFriendAction?.('remove')}
              className={pillBtnClass}
            >
              Remove Friend
            </button>
          ) : target.requestReceived ? (
            <button
              type="button"
              onClick={() => onFriendAction?.('accept')}
              className={pillBtnClass}
            >
              Accept Friend Request
            </button>
          ) : (
            <button
              type="button"
              disabled={target.requestSent}
              onClick={() => onFriendAction?.('add')}
              className={pillBtnClass}
            >
              {target.requestSent ? 'Friend Request Sent' : 'Ask to be a Friend'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onTrade?.(target.username)}
            data-testid="infostand-trade"
            className={pillBtnClass}
          >
            Trade
          </button>

          <button
            type="button"
            disabled={respectRemaining <= 0}
            onClick={() => onGiveRespect?.(target)}
            data-testid="infostand-respect-btn"
            className={pillBtnClass}
          >
            Give Respect ({respectRemaining})
          </button>

          <button
            type="button"
            onClick={() => onWhisper?.(target.username)}
            data-testid="infostand-whisper"
            className={pillBtnClass}
          >
            Whisper
          </button>

          {canModerateRoom && !target.isNpc && (
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => onKickUser?.(target.username)}
                data-testid="infostand-kick"
                className={pillBtnClass}
              >
                Kick
              </button>
              <button
                type="button"
                onClick={() => onToggleRoomRights?.(target.username)}
                data-testid="infostand-rights"
                className={pillBtnClass}
              >
                {target.hasRoomRights ? 'Remove Rights' : 'Give Rights'}
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

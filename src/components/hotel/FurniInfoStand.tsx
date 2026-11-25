import { useEffect, useState } from 'react';
import { findFurniDef } from '../../game/data';
import type { PlacedFurni, StickyNoteColor, StickyNoteData } from '../../game/types';
import { FurniPreviewImg } from '../PixelSpriteCanvas';

interface FurniInfoStandProps {
  furni: PlacedFurni;
  canModify: boolean;
  isMoving: boolean;
  playerUsername: string;
  onClose: () => void;
  onUse: (uid: string) => void;
  onRotate: (uid: string) => void;
  onStartMove: (uid: string) => void;
  onPickup: (uid: string) => void;
  onSaveStickyNote?: (uid: string, note: StickyNoteData) => void;
}

const STICKY_COLORS: {
  id: StickyNoteColor;
  label: string;
  bg: string;
  border: string;
  text: string;
}[] = [
  {
    id: 'yellow',
    label: 'Yellow',
    bg: 'bg-[#fef08a]',
    border: 'border-[#ca8a04]',
    text: 'text-[#422006]',
  },
  {
    id: 'pink',
    label: 'Pink',
    bg: 'bg-[#fbcfe8]',
    border: 'border-[#db2777]',
    text: 'text-[#500724]',
  },
  {
    id: 'blue',
    label: 'Blue',
    bg: 'bg-[#bae6fd]',
    border: 'border-[#0284c7]',
    text: 'text-[#0c4a6e]',
  },
  {
    id: 'green',
    label: 'Green',
    bg: 'bg-[#bbf7d0]',
    border: 'border-[#16a34a]',
    text: 'text-[#14532d]',
  },
];

export function FurniInfoStand({
  furni,
  canModify,
  isMoving,
  playerUsername,
  onClose,
  onUse,
  onRotate,
  onStartMove,
  onPickup,
  onSaveStickyNote,
}: FurniInfoStandProps) {
  const def = findFurniDef(furni.furniId);
  const isSticky = Boolean(def?.isStickyNote || furni.stickyNote);
  const currentSticky: StickyNoteData = furni.stickyNote ?? {
    color: 'yellow',
    text: 'Leave a note for visitors!',
    author: furni.owner || playerUsername,
  };

  const [noteText, setNoteText] = useState(currentSticky.text);
  const [noteColor, setNoteColor] = useState<StickyNoteColor>(currentSticky.color);

  useEffect(() => {
    setNoteText(currentSticky.text);
    setNoteColor(currentSticky.color);
  }, [furni.uid, currentSticky.text, currentSticky.color]);

  const activeTheme = STICKY_COLORS.find((c) => c.id === noteColor) ?? STICKY_COLORS[0];

  const pillBtnClass =
    'bg-white text-black border border-black rounded-full font-bold text-[11px] px-3 py-1 hover:bg-[#f3f4f6] active:translate-y-[1px] cursor-pointer text-center shadow-[0_1px_0_#000000]';

  return (
    <aside
      data-testid="furni-info-stand"
      aria-label={`Furniture info for ${def?.name ?? furni.furniId}`}
      className="pointer-events-auto fixed bottom-[54px] right-[12px] z-30 flex flex-col items-end gap-1.5 text-white select-none"
    >
      {/* Top Item Name + Close Button directly on #000000 void */}
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-[12px] text-white drop-shadow-[0_1px_0_#000000]">
          {def?.name ?? furni.furniId}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Furni Info-Stand"
          className="flex h-4 w-4 items-center justify-center border border-black bg-white text-[10px] font-bold leading-none text-black hover:bg-[#e5e7eb] cursor-pointer"
        >
          ×
        </button>
      </div>

      {/* Item Sprite on Small Grey Isometric Tile Pedestal */}
      <div className="relative flex h-[72px] w-[76px] flex-col items-center justify-end">
        <div
          className="pointer-events-none absolute bottom-1 h-5 w-16 border border-black bg-[#9ca3af]"
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          }}
        />
        <div className="relative z-10 mb-1">
          <FurniPreviewImg
            itemType={furni.furniId}
            alt={def?.name ?? furni.furniId}
            state={String(furni.state)}
            size={56}
          />
        </div>
      </div>

      {/* Engraved Trophy Plaque */}
      {furni.customData && (
        <div className="max-w-[220px] border border-black bg-[#fef08a] p-2 text-black">
          <div className="text-[10px] font-bold uppercase">Engraved Plaque</div>
          <p className="mt-0.5 text-[11px] italic">&ldquo;{furni.customData.inscription}&rdquo;</p>
          <p className="mt-0.5 text-[9px] font-bold">
            By {furni.customData.engravedBy} · {furni.customData.engravedAt}
          </p>
        </div>
      )}

      {/* Colored Sticky Note (Post-It) Editor / Reader */}
      {isSticky && (
        <div
          data-testid="sticky-note-panel"
          className={`w-[220px] border border-black ${activeTheme.bg} ${activeTheme.text} p-2 space-y-1.5`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase">Sticky Note</span>
            {canModify && (
              <div className="flex items-center gap-1">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Set sticky color ${c.label}`}
                    onClick={() => setNoteColor(c.id)}
                    className={`h-3.5 w-3.5 border border-[#000000] ${c.bg} cursor-pointer ${
                      noteColor === c.id ? 'ring-1 ring-[#000000] scale-110' : 'opacity-80'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {canModify ? (
            <>
              <textarea
                rows={3}
                maxLength={140}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                aria-label="Sticky note text"
                data-testid="sticky-note-textarea"
                className="w-full resize-none border border-black bg-white/80 p-1.5 text-[11px] font-semibold text-[#111827] focus:outline-none"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold">
                  By {currentSticky.author || playerUsername}
                </span>
                <button
                  type="button"
                  data-testid="sticky-note-save"
                  onClick={() =>
                    onSaveStickyNote?.(furni.uid, {
                      color: noteColor,
                      text: noteText.trim() || 'PIXL Note!',
                      author: playerUsername,
                      updatedAt: new Date().toISOString().slice(0, 10),
                    })
                  }
                  className="border border-[#000000] bg-white px-2 py-0.5 text-[10px] font-bold text-black hover:bg-[#f3f4f6] cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </>
          ) : (
            <div>
              <p className="text-[11px] font-semibold whitespace-pre-wrap">{currentSticky.text}</p>
              <p className="mt-1 text-[9px] font-bold">Written by {currentSticky.author}</p>
            </div>
          )}
        </div>
      )}

      {/* White Pill Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-1 pt-0.5">
        <button
          type="button"
          onClick={() => onUse(furni.uid)}
          data-testid="furni-infostand-use"
          className={pillBtnClass}
        >
          Use
        </button>

        {canModify && (
          <>
            <button
              type="button"
              onClick={() => onRotate(furni.uid)}
              data-testid="furni-infostand-rotate"
              className={pillBtnClass}
            >
              Rotate
            </button>
            <button
              type="button"
              onClick={() => onStartMove(furni.uid)}
              data-testid="furni-infostand-move"
              className={pillBtnClass}
            >
              {isMoving ? 'Click Tile...' : 'Move'}
            </button>
            <button
              type="button"
              onClick={() => onPickup(furni.uid)}
              data-testid="furni-infostand-pickup"
              className={pillBtnClass}
            >
              Pick Up
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

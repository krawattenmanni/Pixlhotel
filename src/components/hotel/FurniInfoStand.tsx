import { useEffect, useState } from 'react';
import { Move, PackageOpen, RotateCw, Sparkles, StickyNote, Trophy, X } from 'lucide-react';
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

const STICKY_COLORS: { id: StickyNoteColor; label: string; bg: string; border: string; text: string }[] = [
  { id: 'yellow', label: 'Yellow', bg: 'bg-[#fef08a]', border: 'border-[#ca8a04]', text: 'text-[#422006]' },
  { id: 'pink', label: 'Pink', bg: 'bg-[#fbcfe8]', border: 'border-[#db2777]', text: 'text-[#500724]' },
  { id: 'blue', label: 'Blue', bg: 'bg-[#bae6fd]', border: 'border-[#0284c7]', text: 'text-[#0c4a6e]' },
  { id: 'green', label: 'Green', bg: 'bg-[#bbf7d0]', border: 'border-[#16a34a]', text: 'text-[#14532d]' },
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

  return (
    <aside
      data-testid="furni-info-stand"
      aria-label={`Furniture info for ${def?.name ?? furni.furniId}`}
      className="pointer-events-auto fixed bottom-14 right-3 z-30 w-[290px] border border-[#000000] bg-[#1e1e1e]/95 text-[#e5e7eb] rounded-[3px] shadow-[0_6px_20px_rgba(0,0,0,0.65)] overflow-hidden"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#000000] bg-[#2c2c2c] px-2.5 py-1.5">
        <span className="truncate font-bold text-[12px] text-[#ffffff]">
          {def?.name ?? furni.furniId}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Furni Info-Stand"
          className="flex h-4 w-4 items-center justify-center border border-[#000000] bg-[#b91c1c] text-white hover:bg-[#dc2626] rounded-[2px] cursor-pointer"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      <div className="p-2.5 space-y-2.5">
        {/* Item Preview + Description */}
        <div className="flex items-start gap-2.5">
          <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center border border-[#000000] bg-[#141414] rounded-[2px]">
            <FurniPreviewImg
              itemType={furni.furniId}
              alt={def?.name ?? furni.furniId}
              state={String(furni.state)}
              size={54}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] leading-snug text-[#d1d5db]">
              {def?.description ?? 'Classic PIXL Hotel furnishing.'}
            </p>
            <div className="flex flex-wrap items-center gap-1 text-[9px] text-[#9ca3af]">
              <span className="border border-[#333333] bg-[#141414] px-1 py-0.5 font-mono-num rounded-[1px]">
                Tile ({furni.x}, {furni.y})
              </span>
              {(furni.z ?? 0) > 0 && (
                <span className="border border-[#0284c7] bg-[#0c4a6e] px-1 py-0.5 font-mono-num text-[#bae6fd] rounded-[1px]">
                  Stacked z={Number(furni.z).toFixed(2)}
                </span>
              )}
              {def?.isSurface && (
                <span className="border border-[#15803d] bg-[#14532d] px-1 py-0.5 text-[#bbf7d0] rounded-[1px]">
                  Stack Surface
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Engraved Trophy Plaque */}
        {furni.customData && (
          <div className="border border-[#ca8a04] bg-[#422006]/70 p-2 rounded-[2px]">
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#fde047]">
              <Trophy className="h-3 w-3" /> Engraved Plaque
            </div>
            <p className="mt-0.5 text-[11px] italic text-[#fef9c3]">
              &ldquo;{furni.customData.inscription}&rdquo;
            </p>
            <p className="mt-0.5 text-[9px] text-[#fde68a]">
              By {furni.customData.engravedBy} · {furni.customData.engravedAt}
            </p>
          </div>
        )}

        {/* Colored Sticky Note (Post-It) Editor / Reader */}
        {isSticky && (
          <div
            data-testid="sticky-note-panel"
            className={`border ${activeTheme.border} ${activeTheme.bg} ${activeTheme.text} p-2 rounded-[2px] space-y-1.5`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                <StickyNote className="h-3 w-3" /> Sticky Note
              </span>
              {canModify && (
                <div className="flex items-center gap-1">
                  {STICKY_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={`Set sticky color ${c.label}`}
                      onClick={() => setNoteColor(c.id)}
                      className={`h-3.5 w-3.5 border border-[#000000] ${c.bg} rounded-[1px] cursor-pointer ${
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
                  className="w-full resize-none border border-black/30 bg-white/60 p-1.5 text-[11px] font-semibold text-[#111827] focus:outline-none rounded-[2px]"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] opacity-75">
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
                    className="border border-[#000000] bg-[#16a34a] px-2 py-0.5 text-[10px] font-bold text-white hover:bg-[#15803d] rounded-[2px] cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-[11px] font-semibold whitespace-pre-wrap">{currentSticky.text}</p>
                <p className="mt-1 text-[9px] opacity-75">
                  Written by {currentSticky.author}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#333333]">
          <button
            type="button"
            onClick={() => onUse(furni.uid)}
            data-testid="furni-infostand-use"
            className="flex items-center justify-center gap-1 border border-[#000000] bg-[#2b6ca3] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#3582c4] rounded-[2px] cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-[#fde047]" /> Use
          </button>

          {canModify && (
            <>
              <button
                type="button"
                onClick={() => onRotate(furni.uid)}
                data-testid="furni-infostand-rotate"
                className="flex items-center justify-center gap-1 border border-[#000000] bg-[#3f3f46] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#52525b] rounded-[2px] cursor-pointer"
              >
                <RotateCw className="h-3 w-3" /> Rotate
              </button>
              <button
                type="button"
                onClick={() => onStartMove(furni.uid)}
                data-testid="furni-infostand-move"
                className={`flex items-center justify-center gap-1 border border-[#000000] px-2 py-1.5 text-[11px] font-bold rounded-[2px] cursor-pointer ${
                  isMoving
                    ? 'bg-[#16a34a] text-white'
                    : 'bg-[#3f3f46] text-white hover:bg-[#52525b]'
                }`}
              >
                <Move className="h-3 w-3" /> {isMoving ? 'Click Tile...' : 'Move'}
              </button>
              <button
                type="button"
                onClick={() => onPickup(furni.uid)}
                data-testid="furni-infostand-pickup"
                className="flex items-center justify-center gap-1 border border-[#000000] bg-[#991b1b] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#b91c1c] rounded-[2px] cursor-pointer"
              >
                <PackageOpen className="h-3 w-3" /> Pick Up
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

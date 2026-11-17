import { Package, PawPrint, RotateCw, Trash2, X } from 'lucide-react';
import { FURNI_CATALOGUE } from '../../game/data';
import type { InventoryEntry, OwnedPet, PlacedFurni } from '../../game/types';
import { PixelFurniCanvas } from '../PixelSpriteCanvas';

interface InventoryDockProps {
  inventory: InventoryEntry[];
  placingFurniId: string | null;
  selectedPlaced: PlacedFurni | null;
  canEditRoom: boolean;
  pets?: OwnedPet[];
  currentRoomId?: string;
  onSummonPets?: () => void;
  onSelectForPlacement: (furniId: string | null) => void;
  onRotateSelected: () => void;
  onPickupSelected: () => void;
  onClose: () => void;
}

export function InventoryDock({
  inventory,
  placingFurniId,
  selectedPlaced,
  canEditRoom,
  pets = [],
  currentRoomId,
  onSummonPets,
  onSelectForPlacement,
  onRotateSelected,
  onPickupSelected,
  onClose,
}: InventoryDockProps) {
  const petsElsewhere = currentRoomId
    ? pets.filter((p) => p.roomId !== currentRoomId).length
    : 0;

  return (
    <div
      className="pointer-events-auto fixed bottom-20 left-4 z-30 w-80 max-w-[calc(100vw-2rem)] client-window overflow-hidden"
      role="region"
      aria-label="Inventory and Room Builder"
    >
      <div className="client-window-bar flex items-center justify-between px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 font-pixel text-xs">
          <Package className="h-3.5 w-3.5" />
          Inventory &amp; Builder
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Inventory"
          className="rounded p-0.5 hover:bg-black/30 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {petsElsewhere > 0 && onSummonPets && (
          <button
            type="button"
            onClick={onSummonPets}
            className="habbo-btn-green w-full inline-flex items-center justify-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-bold cursor-pointer"
          >
            <PawPrint className="h-3.5 w-3.5" />
            Call My Pets Here ({petsElsewhere})
          </button>
        )}

        {!canEditRoom && (
          <p className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">
            Switch to <strong>My Private Room</strong> via Navigator to place, rotate, or pick up furniture!
          </p>
        )}

        {placingFurniId && (
          <div className="flex items-center justify-between rounded border border-emerald-400 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-900">
            <span>Click any floor tile to place!</span>
            <button
              type="button"
              onClick={() => onSelectForPlacement(null)}
              className="underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {selectedPlaced && canEditRoom && (
          <div className="flex items-center justify-between gap-2 rounded border border-blue-300 bg-blue-50 px-2.5 py-1.5">
            <span className="text-xs font-bold text-blue-950 truncate">
              Selected: {FURNI_CATALOGUE.find((f) => f.id === selectedPlaced.furniId)?.name}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onRotateSelected}
                aria-label="Rotate selected furniture"
                className="habbo-btn-blue inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold cursor-pointer"
              >
                <RotateCw className="h-3 w-3" /> Rotate
              </button>
              <button
                type="button"
                onClick={onPickupSelected}
                aria-label="Pick up selected furniture"
                className="inline-flex items-center gap-1 rounded border border-rose-700 bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" /> Pick Up
              </button>
            </div>
          </div>
        )}

        <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto">
          {inventory.length === 0 ? (
            <p className="col-span-3 py-4 text-center text-xs text-slate-600">
              No items in inventory. Buy furni in Catalogue!
            </p>
          ) : (
            inventory.map((entry) => {
              const def = FURNI_CATALOGUE.find((f) => f.id === entry.furniId);
              if (!def) return null;
              const isPlacing = placingFurniId === entry.furniId;
              return (
                <button
                  key={entry.furniId}
                  type="button"
                  disabled={!canEditRoom}
                  onClick={() => onSelectForPlacement(isPlacing ? null : entry.furniId)}
                  className={`relative flex flex-col items-center rounded border-2 p-1.5 text-center transition-colors ${
                    !canEditRoom
                      ? 'border-stone-300 bg-stone-200/70 opacity-65 cursor-not-allowed'
                      : isPlacing
                      ? 'border-emerald-600 bg-emerald-50 cursor-pointer'
                      : 'border-stone-300 bg-white hover:border-[#2563eb] cursor-pointer'
                  }`}
                >
                  <span className="absolute right-1 top-1 rounded bg-[#235c8a] px-1 font-mono-num text-[10px] font-bold text-white">
                    x{entry.quantity}
                  </span>
                  <PixelFurniCanvas furniId={entry.furniId} size={40} />
                  <span className="mt-1 w-full truncate text-[10px] font-bold text-slate-900">
                    {def.name}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

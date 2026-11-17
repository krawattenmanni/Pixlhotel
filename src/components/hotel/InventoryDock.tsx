import { useEffect, useState } from 'react';
import { Award, Check, Package, PawPrint, RotateCw, Trash2, X } from 'lucide-react';
import { findBadgeDefById } from '../../game/customBadges';
import { findFurniDef, getEquippedBadges } from '../../game/data';
import { normalizeBadgeCategoryGroup, type BadgeCategoryFilter } from '../../game/i18n';
import type {
  CustomBadgeDef,
  InventoryEntry,
  OwnedPet,
  PlacedFurni,
  PlayerState,
} from '../../game/types';
import { FurniPreviewImg, PixelBadgeSprite } from '../PixelSpriteCanvas';

interface InventoryDockProps {
  player: PlayerState;
  inventory: InventoryEntry[];
  placingFurniId: string | null;
  selectedPlaced: PlacedFurni | null;
  canEditRoom: boolean;
  pets?: OwnedPet[];
  currentRoomId?: string;
  customBadges?: CustomBadgeDef[];
  initialTab?: 'furni' | 'badges';
  onSummonPets?: () => void;
  onSelectForPlacement: (furniId: string | null) => void;
  onRotateSelected: () => void;
  onPickupSelected: () => void;
  onEquipBadge?: (badgeId: string) => void;
  onInspectBadge?: (badgeId: string) => void;
  onClose: () => void;
}

export function InventoryDock({
  player,
  inventory,
  placingFurniId,
  selectedPlaced,
  canEditRoom,
  pets = [],
  currentRoomId,
  customBadges = [],
  initialTab = 'furni',
  onSummonPets,
  onSelectForPlacement,
  onRotateSelected,
  onPickupSelected,
  onEquipBadge,
  onInspectBadge,
  onClose,
}: InventoryDockProps) {
  const [activeTab, setActiveTab] = useState<'furni' | 'badges'>(initialTab);
  const [badgeCategory, setBadgeCategory] = useState<BadgeCategoryFilter>('all');
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const petsElsewhere = currentRoomId
    ? pets.filter((p) => p.roomId !== currentRoomId).length
    : 0;
  const equippedIds = getEquippedBadges(player);

  return (
    <div
      className="pointer-events-auto fixed bottom-28 sm:bottom-14 left-3 z-30 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] max-h-[62vh] flex flex-col client-window overflow-hidden"
      role="region"
      aria-label="Inventory and My Badges"
      data-testid="inventory-dock"
    >
      <div className="client-window-bar flex items-center justify-between px-2.5 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold">
          <Package className="h-3.5 w-3.5 text-[#fef08a]" />
          Inventory &amp; Badges
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Inventory"
          className="client-close-btn"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Classic 2 Tabs: Furni | My Badges */}
      <div className="flex items-center gap-1 border-b border-[#000000] bg-[#d4d4d4] px-2.5 pt-1.5">
        <button
          type="button"
          data-testid="inv-tab-furni"
          onClick={() => setActiveTab('furni')}
          className={`inline-flex items-center gap-1 border border-b-0 border-[#000000] px-2.5 py-1 text-[11px] font-bold cursor-pointer rounded-t-[2px] ${
            activeTab === 'furni'
              ? 'bg-[#ececec] text-[#111827] -mb-px pb-1.5'
              : 'bg-[#4b708f] text-white hover:bg-[#5c84a6]'
          }`}
        >
          <Package className="h-3 w-3" />
          Furni ({inventory.reduce((acc, i) => acc + i.quantity, 0)})
        </button>
        <button
          type="button"
          data-testid="inv-tab-badges"
          onClick={() => setActiveTab('badges')}
          className={`inline-flex items-center gap-1 border border-b-0 border-[#000000] px-2.5 py-1 text-[11px] font-bold cursor-pointer rounded-t-[2px] ${
            activeTab === 'badges'
              ? 'bg-[#ececec] text-[#111827] -mb-px pb-1.5'
              : 'bg-[#4b708f] text-white hover:bg-[#5c84a6]'
          }`}
        >
          <Award className="h-3 w-3" />
          My Badges ({player.unlockedBadges.length})
        </button>
      </div>

      {activeTab === 'furni' ? (
        <div className="p-2.5 space-y-2.5 bg-[#ececec]">
          {petsElsewhere > 0 && onSummonPets && (
            <button
              type="button"
              onClick={onSummonPets}
              className="habbo-btn-green w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold cursor-pointer"
            >
              <PawPrint className="h-3.5 w-3.5" />
              Call My Pets Here ({petsElsewhere})
            </button>
          )}

          {!canEditRoom && (
            <p className="border border-[#d97706] bg-[#fef3c7] px-2 py-1.5 text-[10px] font-bold text-[#78350f] rounded-[2px]">
              Switch to <strong>My Private Room</strong> via Navigator to place, rotate, or pick up furniture!
            </p>
          )}

          {placingFurniId && (
            <div className="flex items-center justify-between border border-[#16a34a] bg-[#dcfce7] px-2 py-1 text-[11px] font-bold text-[#14532d] rounded-[2px]">
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
            <div className="flex items-center justify-between gap-2 border border-[#2b6ca3] bg-[#dbeafe] px-2 py-1.5 rounded-[2px]">
              <span className="text-[11px] font-bold text-[#1e3a8a] truncate">
                {findFurniDef(selectedPlaced.furniId)?.name ?? selectedPlaced.furniId}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onRotateSelected}
                  aria-label="Rotate selected furniture"
                  className="habbo-btn-blue inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold cursor-pointer"
                >
                  <RotateCw className="h-3 w-3" /> Rotate
                </button>
                <button
                  type="button"
                  onClick={onPickupSelected}
                  aria-label="Pick up selected furniture"
                  className="inline-flex items-center gap-1 border border-[#000000] bg-[#dc2626] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#b91c1c] cursor-pointer rounded-[2px]"
                >
                  <Trash2 className="h-3 w-3" /> Pick Up
                </button>
              </div>
            </div>
          )}

          <div className="grid max-h-36 sm:max-h-52 grid-cols-3 gap-1.5 overflow-y-auto border border-[#999999] bg-[#d4d4d4] p-1.5 rounded-[2px]">
            {inventory.length === 0 ? (
              <p className="col-span-3 py-4 text-center text-[11px] text-[#4b5563]">
                No items in inventory. Buy furni in the Catalogue!
              </p>
            ) : (
              inventory.map((entry) => {
                const def = findFurniDef(entry.furniId);
                if (!def) return null;
                const isPlacing = placingFurniId === entry.furniId;
                return (
                  <button
                    key={entry.furniId}
                    type="button"
                    disabled={!canEditRoom}
                    onClick={() => onSelectForPlacement(isPlacing ? null : entry.furniId)}
                    className={`relative flex flex-col items-center border p-1.5 text-center rounded-[2px] ${
                      !canEditRoom
                        ? 'border-[#a3a3a3] bg-[#e5e5e5] opacity-65 cursor-not-allowed'
                        : isPlacing
                        ? 'border-[#000000] bg-[#dcfce7] ring-2 ring-[#16a34a] cursor-pointer'
                        : 'border-[#999999] bg-white hover:border-[#2b6ca3] cursor-pointer'
                    }`}
                  >
                    <span className="absolute right-1 top-1 border border-[#000000] bg-[#2b6ca3] px-1 font-mono-num text-[9px] font-bold text-white rounded-[1px]">
                      x{entry.quantity}
                    </span>
                    <FurniPreviewImg itemType={entry.furniId} alt={def.name} size={40} />
                    <span className="mt-1 w-full truncate text-[10px] font-bold text-[#111827]">
                      {def.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="p-2.5 space-y-2.5 bg-[#ececec]">
          {/* Active 5-Slot Bar */}
          <div className="border border-[#999999] bg-white p-2 rounded-[2px]">
            <p className="text-[10px] font-bold text-[#1d4e78] mb-1.5">
              Active Profile Slots ({equippedIds.length}/5) — click any badge to equip or inspect:
            </p>
            <div className="grid grid-cols-5 gap-1">
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const bId = equippedIds[slotIdx];
                const def = bId ? findBadgeDefById(bId, customBadges) : null;
                return (
                  <button
                    key={slotIdx}
                    type="button"
                    disabled={!def}
                    onClick={() => def && onInspectBadge?.(def.id)}
                    title={def ? `${def.name} — click for details` : 'Empty badge slot'}
                    className={`flex h-10 items-center justify-center border rounded-[2px] ${
                      def
                        ? 'border-[#000000] bg-[#dbeafe] hover:bg-[#bfdbfe] cursor-pointer'
                        : 'border-dashed border-[#a3a3a3] bg-[#f3f4f6] cursor-default'
                    }`}
                  >
                    {def ? (
                      <PixelBadgeSprite
                        badgeId={def.id}
                        unlocked
                        size={28}
                        customBadges={customBadges}
                      />
                    ) : (
                      <span className="text-[9px] font-bold text-[#9ca3af]">{slotIdx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1" data-testid="inv-badge-category-pills">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'Achievements', label: 'Achiev.' },
                { id: 'Games & Rooms', label: 'Games' },
                { id: 'Rares', label: 'Rares' },
                { id: 'Events & Seasonal', label: 'Seasonal' },
                { id: 'Staff & VIP', label: 'Staff' },
              ] as { id: BadgeCategoryFilter; label: string }[]
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setBadgeCategory(cat.id)}
                className={`rounded-[2px] border px-1.5 py-0.5 text-[9px] font-bold cursor-pointer ${
                  badgeCategory === cat.id
                    ? 'border-[#000000] bg-[#2b6ca3] text-white'
                    : 'border-[#999999] bg-white text-[#334155] hover:bg-[#e5e7eb]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid max-h-36 sm:max-h-48 grid-cols-3 gap-1.5 overflow-y-auto border border-[#999999] bg-[#d4d4d4] p-1.5 rounded-[2px]">
            {player.unlockedBadges
              .filter((badgeId) => {
                if (badgeCategory === 'all') return true;
                const def = findBadgeDefById(badgeId, customBadges);
                return def ? normalizeBadgeCategoryGroup(def.category) === badgeCategory : false;
              })
              .map((badgeId) => {
                const def = findBadgeDefById(badgeId, customBadges);
                if (!def) return null;
                const isEquipped = equippedIds.includes(badgeId);
                return (
                  <div
                    key={badgeId}
                    className={`flex flex-col items-center justify-between border p-1.5 text-center rounded-[2px] ${
                      isEquipped
                        ? 'border-[#000000] bg-[#fef9c3]'
                        : 'border-[#999999] bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onInspectBadge?.(badgeId)}
                      className="flex flex-col items-center cursor-pointer w-full"
                      title={`${def.name}: Click to inspect`}
                    >
                      <PixelBadgeSprite
                        badgeId={def.id}
                        unlocked
                        size={30}
                        customBadges={customBadges}
                      />
                      <span className="mt-1 font-pixel text-[8px] text-[#111827] truncate w-full">
                        {def.code}
                      </span>
                    </button>
                    {onEquipBadge && (
                      <button
                        type="button"
                        onClick={() => onEquipBadge(badgeId)}
                        className={`mt-1 w-full py-0.5 text-[9px] font-bold cursor-pointer ${
                          isEquipped ? 'habbo-btn-green' : 'habbo-btn-silver'
                        }`}
                      >
                        {isEquipped ? (
                          <span className="inline-flex items-center justify-center gap-0.5">
                            <Check className="h-2.5 w-2.5" /> On
                          </span>
                        ) : (
                          'Wear'
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

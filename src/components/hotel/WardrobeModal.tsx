import { useState } from 'react';
import { Crown, RotateCcw, RotateCw, Shuffle, X } from 'lucide-react';
import type { Direction, LookConfig } from '../../game/types';
import {
  WARDROBE_ACCESSORIES,
  WARDROBE_CLOTHING_COLORS,
  WARDROBE_EXPRESSIONS,
  WARDROBE_HAIR_COLORS,
  WARDROBE_HAIR_STYLES,
  WARDROBE_SHIRT_STYLES,
  WARDROBE_SKIN_COLORS,
} from '../../game/wardrobeOptions';
import { PixelAvatarCanvas } from '../PixelSpriteCanvas';

interface WardrobeModalProps {
  currentLook: LookConfig;
  isHcMember: boolean;
  onSaveLook: (look: LookConfig) => void;
  onClose: () => void;
}

type WardrobeCategory = 'body' | 'hair' | 'face' | 'tops' | 'bottoms' | 'shoes';

export function WardrobeModal({
  currentLook,
  isHcMember,
  onSaveLook,
  onClose,
}: WardrobeModalProps) {
  const [draft, setDraft] = useState<LookConfig>({
    gender: currentLook.gender ?? 'M',
    ...currentLook,
  });
  const [previewDir, setPreviewDir] = useState<Direction>(0);
  const [activeTab, setActiveTab] = useState<WardrobeCategory>('body');

  const handleRandomize = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const validHair = WARDROBE_HAIR_STYLES.filter((h) => isHcMember || !h.hcOnly);
    const validExpr = WARDROBE_EXPRESSIONS.filter((e) => isHcMember || !e.hcOnly);
    const validShirts = WARDROBE_SHIRT_STYLES.filter((s) => isHcMember || !s.hcOnly);
    const validAcc = WARDROBE_ACCESSORIES.filter((a) => isHcMember || !a.hcOnly);
    const validHairColors = WARDROBE_HAIR_COLORS.filter((c) => isHcMember || !c.hcOnly);
    const validClothColors = WARDROBE_CLOTHING_COLORS.filter((c) => isHcMember || !c.hcOnly);

    setDraft((prev) => ({
      ...prev,
      skinColor: pick(WARDROBE_SKIN_COLORS).hex,
      hairStyle: pick(validHair).id,
      hairColor: pick(validHairColors).hex,
      expression: pick(validExpr).id,
      shirtStyle: pick(validShirts).id,
      shirtColor: pick(validClothColors).hex,
      pantsColor: pick(validClothColors).hex,
      shoesColor: pick(validClothColors).hex,
      accessory: pick(validAcc).id,
    }));
  };

  const tabs: { id: WardrobeCategory; label: string }[] = [
    { id: 'body', label: 'Body & Gender' },
    { id: 'hair', label: 'Hair & Hats' },
    { id: 'face', label: 'Face & Glasses' },
    { id: 'tops', label: 'Tops & Shirts' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'shoes', label: 'Shoes' },
  ];

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Change Looks Wardrobe"
      data-testid="wardrobe-modal"
    >
      <div className="client-window flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="client-window-bar flex items-center justify-between px-3 py-1.5 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold">
            Change Your Looks
            {isHcMember && (
              <span className="inline-flex items-center gap-0.5 border border-[#000000] bg-[#eab308] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1c1917] rounded-[2px]">
                <Crown className="h-2.5 w-2.5" /> HC ACTIVE
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Wardrobe"
            className="client-close-btn"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-[#000000] bg-[#d4d4d4] px-3 pt-2 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              data-testid={`wardrobe-tab-${t.id}`}
              className={`border border-b-0 border-[#000000] px-2 py-1 text-[10px] font-bold cursor-pointer rounded-t-[3px] whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-[#ececec] text-[#111827] -mb-px pb-1.5'
                  : 'bg-[#4b708f] text-white hover:bg-[#5c84a6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 p-3 md:grid-cols-[200px_1fr] overflow-y-auto bg-[#ececec]">
          {/* Left Stage: Rotating Isometric Avatar Preview */}
          <div className="flex flex-col items-center justify-between border border-[#999999] bg-[#ffffff] p-3 rounded-[2px]">
            <div className="flex h-[178px] w-full items-center justify-center border border-[#000000] bg-gradient-to-b from-[#334e68] to-[#1e293b] rounded-[2px]">
              <PixelAvatarCanvas look={draft} dir={previewDir} pose="stand" scale={2.1} />
            </div>

            <div className="mt-2.5 flex w-full items-center justify-between gap-1.5">
              <button
                type="button"
                aria-label="Rotate Avatar Left"
                onClick={() => setPreviewDir((d) => (((d + 3) % 4) as Direction))}
                className="flex flex-1 items-center justify-center gap-1 border border-[#000000] bg-[#e5e7eb] py-1 text-[11px] font-bold text-[#111827] hover:bg-[#d1d5db] rounded-[2px] cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Left
              </button>
              <button
                type="button"
                aria-label="Rotate Avatar Right"
                onClick={() => setPreviewDir((d) => (((d + 1) % 4) as Direction))}
                className="flex flex-1 items-center justify-center gap-1 border border-[#000000] bg-[#e5e7eb] py-1 text-[11px] font-bold text-[#111827] hover:bg-[#d1d5db] rounded-[2px] cursor-pointer"
              >
                Right <RotateCw className="h-3 w-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleRandomize}
              className="mt-2 flex w-full items-center justify-center gap-1 border border-[#000000] bg-[#f3f4f6] py-1.5 text-[11px] font-bold text-[#111827] hover:bg-[#e5e7eb] rounded-[2px] cursor-pointer"
            >
              <Shuffle className="h-3 w-3" /> Randomize
            </button>

            <button
              type="button"
              data-testid="wardrobe-save-btn"
              onClick={() => {
                onSaveLook(draft);
                onClose();
              }}
              className="habbo-btn-green mt-2 w-full py-2 text-xs font-bold uppercase tracking-wide cursor-pointer"
            >
              Save Changes
            </button>
          </div>

          {/* Right Panel: Selected Category Options */}
          <div className="border border-[#999999] bg-[#ffffff] p-3 rounded-[2px] space-y-3">
            {activeTab === 'body' && (
              <>
                <div>
                  <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Gender</h3>
                  <div className="mt-1.5 flex gap-2">
                    {(['M', 'F'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, gender: g }))}
                        className={`flex-1 border px-3 py-2 text-xs font-bold rounded-[2px] cursor-pointer ${
                          (draft.gender ?? 'M') === g
                            ? 'border-[#000000] bg-[#2b6ca3] text-white'
                            : 'border-[#b5b5b5] bg-[#f9fafb] text-[#111827] hover:bg-[#eef6fc]'
                        }`}
                      >
                        {g === 'M' ? 'Boy (M)' : 'Girl (F)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Skin Tone</h3>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {WARDROBE_SKIN_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={`Skin ${c.name}`}
                        onClick={() => setDraft((prev) => ({ ...prev, skinColor: c.hex }))}
                        className={`h-8 w-8 border rounded-[2px] cursor-pointer ${
                          draft.skinColor === c.hex
                            ? 'border-2 border-[#000000] ring-2 ring-[#2b6ca3]'
                            : 'border-[#6b7280]'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'hair' && (
              <>
                <div>
                  <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Hairstyle</h3>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {WARDROBE_HAIR_STYLES.map((item) => {
                      const locked = Boolean(item.hcOnly && !isHcMember);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={locked}
                          onClick={() => setDraft((prev) => ({ ...prev, hairStyle: item.id }))}
                          className={`flex items-center justify-between border px-2.5 py-2 text-[11px] font-bold rounded-[2px] ${
                            draft.hairStyle === item.id
                              ? 'border-[#000000] bg-[#2b6ca3] text-white'
                              : 'border-[#b5b5b5] bg-[#f9fafb] text-[#111827] hover:bg-[#eef6fc]'
                          } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span>{item.label}</span>
                          {item.hcOnly && (
                            <Crown className="h-3 w-3 text-[#eab308] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Hair Color</h3>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {WARDROBE_HAIR_COLORS.map((c) => {
                      const locked = Boolean(c.hcOnly && !isHcMember);
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          disabled={locked}
                          aria-label={`Hair color ${c.name}`}
                          onClick={() => setDraft((prev) => ({ ...prev, hairColor: c.hex }))}
                          className={`relative h-8 w-8 border rounded-[2px] ${
                            draft.hairColor === c.hex
                              ? 'border-2 border-[#000000] ring-2 ring-[#2b6ca3]'
                              : 'border-[#6b7280]'
                          } ${locked ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {c.hcOnly && (
                            <Crown className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#111827] p-0.5 text-[#facc15]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'face' && (
              <>
                <div>
                  <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Facial Expression</h3>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {WARDROBE_EXPRESSIONS.map((item) => {
                      const locked = Boolean(item.hcOnly && !isHcMember);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={locked}
                          onClick={() => setDraft((prev) => ({ ...prev, expression: item.id }))}
                          className={`flex items-center justify-between border px-2.5 py-2 text-[11px] font-bold rounded-[2px] ${
                            draft.expression === item.id
                              ? 'border-[#000000] bg-[#2b6ca3] text-white'
                              : 'border-[#b5b5b5] bg-[#f9fafb] text-[#111827] hover:bg-[#eef6fc]'
                          } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span>{item.label}</span>
                          {item.hcOnly && <Crown className="h-3 w-3 text-[#eab308]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Hats, Glasses &amp; Extras</h3>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {WARDROBE_ACCESSORIES.map((item) => {
                      const locked = Boolean(item.hcOnly && !isHcMember);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={locked}
                          onClick={() => setDraft((prev) => ({ ...prev, accessory: item.id }))}
                          className={`flex items-center justify-between border px-2.5 py-2 text-[11px] font-bold rounded-[2px] ${
                            draft.accessory === item.id
                              ? 'border-[#000000] bg-[#2b6ca3] text-white'
                              : 'border-[#b5b5b5] bg-[#f9fafb] text-[#111827] hover:bg-[#eef6fc]'
                          } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span>{item.label}</span>
                          {item.hcOnly && <Crown className="h-3 w-3 text-[#eab308]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'tops' && (
              <>
                <div>
                  <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Shirt Style</h3>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {WARDROBE_SHIRT_STYLES.map((item) => {
                      const locked = Boolean(item.hcOnly && !isHcMember);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={locked}
                          onClick={() => setDraft((prev) => ({ ...prev, shirtStyle: item.id }))}
                          className={`flex items-center justify-between border px-2.5 py-2 text-[11px] font-bold rounded-[2px] ${
                            draft.shirtStyle === item.id
                              ? 'border-[#000000] bg-[#2b6ca3] text-white'
                              : 'border-[#b5b5b5] bg-[#f9fafb] text-[#111827] hover:bg-[#eef6fc]'
                          } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span>{item.label}</span>
                          {item.hcOnly && <Crown className="h-3 w-3 text-[#eab308]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Shirt Color</h3>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {WARDROBE_CLOTHING_COLORS.map((c) => {
                      const locked = Boolean(c.hcOnly && !isHcMember);
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          disabled={locked}
                          aria-label={`Shirt color ${c.name}`}
                          onClick={() => setDraft((prev) => ({ ...prev, shirtColor: c.hex }))}
                          className={`relative h-8 w-8 border rounded-[2px] ${
                            draft.shirtColor === c.hex
                              ? 'border-2 border-[#000000] ring-2 ring-[#2b6ca3]'
                              : 'border-[#6b7280]'
                          } ${locked ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {c.hcOnly && (
                            <Crown className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#111827] p-0.5 text-[#facc15]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'bottoms' && (
              <div>
                <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Trousers &amp; Skirt Color</h3>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {WARDROBE_CLOTHING_COLORS.map((c) => {
                    const locked = Boolean(c.hcOnly && !isHcMember);
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        disabled={locked}
                        aria-label={`Pants color ${c.name}`}
                        onClick={() => setDraft((prev) => ({ ...prev, pantsColor: c.hex }))}
                        className={`relative h-8 w-8 border rounded-[2px] ${
                          draft.pantsColor === c.hex
                            ? 'border-2 border-[#000000] ring-2 ring-[#2b6ca3]'
                            : 'border-[#6b7280]'
                        } ${locked ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {c.hcOnly && (
                          <Crown className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#111827] p-0.5 text-[#facc15]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'shoes' && (
              <div>
                <h3 className="text-[11px] font-bold uppercase text-[#4b5563]">Shoes &amp; Sneakers Color</h3>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {WARDROBE_CLOTHING_COLORS.map((c) => {
                    const locked = Boolean(c.hcOnly && !isHcMember);
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        disabled={locked}
                        aria-label={`Shoes color ${c.name}`}
                        onClick={() => setDraft((prev) => ({ ...prev, shoesColor: c.hex }))}
                        className={`relative h-8 w-8 border rounded-[2px] ${
                          draft.shoesColor === c.hex
                            ? 'border-2 border-[#000000] ring-2 ring-[#2b6ca3]'
                            : 'border-[#6b7280]'
                        } ${locked ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {c.hcOnly && (
                          <Crown className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#111827] p-0.5 text-[#facc15]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Check, Crown, RotateCw, Shirt, Shuffle } from 'lucide-react';
import type {
  AvatarPose,
  Direction,
  LookConfig,
} from '../../game/types';
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

interface WardrobeTabProps {
  currentLook: LookConfig;
  onSaveLook: (look: LookConfig) => void;
}

export function WardrobeTab({ currentLook, onSaveLook }: WardrobeTabProps) {
  const [draft, setDraft] = useState<LookConfig>({
    gender: currentLook.gender ?? 'M',
    ...currentLook,
  });
  const [previewDir, setPreviewDir] = useState<Direction>(0);
  const [previewPose, setPreviewPose] = useState<AvatarPose>('stand');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    onSaveLook(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleRandomize = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    setDraft((prev) => ({
      ...prev,
      skinColor: pick(WARDROBE_SKIN_COLORS).hex,
      hairStyle: pick(WARDROBE_HAIR_STYLES).id,
      hairColor: pick(WARDROBE_HAIR_COLORS).hex,
      expression: pick(WARDROBE_EXPRESSIONS).id,
      shirtStyle: pick(WARDROBE_SHIRT_STYLES).id,
      shirtColor: pick(WARDROBE_CLOTHING_COLORS).hex,
      pantsColor: pick(WARDROBE_CLOTHING_COLORS).hex,
      shoesColor: pick(WARDROBE_CLOTHING_COLORS).hex,
      accessory: pick(WARDROBE_ACCESSORIES).id,
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* LIVE PREVIEW PANEL */}
      <div className="lg:col-span-4">
        <div className="habbo-box">
          <div className="habbo-box-header habbo-header-dark flex items-center gap-2">
            <Shirt className="h-4 w-4 text-[#fde047]" />
            Live PIXL Wardrobe
          </div>
          <div className="flex flex-col items-center bg-[#f4f8fc] p-5">
            <div className="flex h-60 w-full flex-col items-center justify-end rounded-[3px] border border-[#000000] bg-gradient-to-b from-[#9fd9fc] to-[#eef7ff] pb-4 pt-6">
              <PixelAvatarCanvas look={draft} dir={previewDir} pose={previewPose} frame={0} scale={3} />
            </div>

            {/* Gender Switcher */}
            <div className="mt-3 flex w-full gap-2">
              {(['M', 'F'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  data-testid={`cms-wardrobe-gender-${g.toLowerCase()}`}
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      gender: g,
                      accessory:
                        g === 'F' && (prev.accessory as string) === 'beard'
                          ? 'none'
                          : prev.accessory,
                    }))
                  }
                  className={`flex-1 rounded-[2px] border py-1.5 text-[11px] font-bold cursor-pointer ${
                    (draft.gender ?? 'M') === g
                      ? g === 'F'
                        ? 'border-[#000000] bg-[#db2777] text-white'
                        : 'border-[#000000] bg-[#2b6ca3] text-white'
                      : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
                  }`}
                >
                  {g === 'M' ? 'Male / Boy (M)' : 'Female / Girl (F)'}
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewDir(((previewDir + 1) % 4) as Direction)}
                className="habbo-btn-blue inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate
              </button>
              <button
                type="button"
                onClick={handleRandomize}
                className="inline-flex items-center gap-1 rounded-[2px] border border-[#000000] bg-[#fef08a] px-2.5 py-1 text-[11px] font-bold text-[#1e293b] cursor-pointer hover:bg-[#fde047]"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Random
              </button>
              {(['stand', 'wave', 'sit', 'dance'] as AvatarPose[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreviewPose(p)}
                  className={`rounded-[2px] border px-2.5 py-1 text-[11px] font-bold capitalize cursor-pointer ${
                    previewPose === p
                      ? 'border-[#000000] bg-[#2b6ca3] text-white'
                      : 'border-[#94a3b8] bg-white text-[#1f2937] hover:bg-[#e2e8f0]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="habbo-btn-green mt-4 w-full py-2.5 font-pixel text-xs cursor-pointer"
            >
              {savedNotice ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Look Saved Live!
                </span>
              ) : (
                'Save Look'
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-[#475569]">
              Updates immediately across your PIXL profile and inside the Hotel.
            </p>
          </div>
        </div>
      </div>

      {/* CUSTOMIZER CONTROLS */}
      <div className="space-y-5 lg:col-span-8">
        <div className="habbo-box">
          <div className="habbo-box-header habbo-header-blue">Head, Hair &amp; Expression (15 Hairstyles &amp; 6 Expressions)</div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Skin Tone</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WARDROBE_SKIN_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Skin tone ${c.name}`}
                    onClick={() => setDraft({ ...draft, skinColor: c.hex })}
                    className={`h-7 w-7 rounded-[2px] border cursor-pointer ${
                      draft.skinColor === c.hex ? 'border-[#000000] ring-2 ring-[#f58220]' : 'border-[#64748b]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Facial Expression</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WARDROBE_EXPRESSIONS.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, expression: exp.id })}
                    className={`inline-flex items-center gap-1 rounded-[2px] border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      draft.expression === exp.id
                        ? 'border-[#000000] bg-[#2b6ca3] text-white'
                        : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    <span>{exp.label}</span>
                    {exp.hcOnly && <Crown className="h-3 w-3 text-[#eab308]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-[11px] font-bold text-[#1f2937]">Hairstyle (Women &amp; Men)</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {WARDROBE_HAIR_STYLES.map((hs) => (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, hairStyle: hs.id })}
                    className={`flex items-center justify-between rounded-[2px] border px-2.5 py-1.5 text-[11px] font-bold text-left cursor-pointer ${
                      draft.hairStyle === hs.id
                        ? 'border-[#000000] bg-[#2b6ca3] text-white'
                        : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    <span className="truncate">{hs.label}</span>
                    {hs.hcOnly && <Crown className="h-3 w-3 shrink-0 text-[#eab308]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-[11px] font-bold text-[#1f2937]">Hair Color</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WARDROBE_HAIR_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Hair color ${c.name}`}
                    onClick={() => setDraft({ ...draft, hairColor: c.hex })}
                    className={`h-7 w-7 rounded-[2px] border cursor-pointer ${
                      draft.hairColor === c.hex ? 'border-[#000000] ring-2 ring-[#f58220]' : 'border-[#64748b]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="habbo-box">
          <div className="habbo-box-header habbo-header-orange">Outfit, Dresses &amp; Accessories</div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-[11px] font-bold text-[#1f2937]">Top, Jacket &amp; Dress Style (14 Styles)</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {WARDROBE_SHIRT_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, shirtStyle: s.id })}
                    className={`flex items-center justify-between rounded-[2px] border px-2.5 py-1.5 text-[11px] font-bold text-left cursor-pointer ${
                      draft.shirtStyle === s.id
                        ? 'border-[#000000] bg-[#2b6ca3] text-white'
                        : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    <span className="truncate">{s.label}</span>
                    {s.hcOnly && <Crown className="h-3 w-3 shrink-0 text-[#eab308]" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Top / Dress Color</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WARDROBE_CLOTHING_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Shirt color ${c.name}`}
                    onClick={() => setDraft({ ...draft, shirtColor: c.hex })}
                    className={`h-7 w-7 rounded-[2px] border cursor-pointer ${
                      draft.shirtColor === c.hex ? 'border-[#000000] ring-2 ring-[#f58220]' : 'border-[#64748b]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Trousers &amp; Skirt Color</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WARDROBE_CLOTHING_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Pants color ${c.name}`}
                    onClick={() => setDraft({ ...draft, pantsColor: c.hex })}
                    className={`h-7 w-7 rounded-[2px] border cursor-pointer ${
                      draft.pantsColor === c.hex ? 'border-[#000000] ring-2 ring-[#f58220]' : 'border-[#64748b]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-[11px] font-bold text-[#1f2937]">Shoes &amp; Sneakers Color</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WARDROBE_CLOTHING_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Shoes color ${c.name}`}
                    onClick={() => setDraft({ ...draft, shoesColor: c.hex })}
                    className={`h-7 w-7 rounded-[2px] border cursor-pointer ${
                      draft.shoesColor === c.hex ? 'border-[#000000] ring-2 ring-[#f58220]' : 'border-[#64748b]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-[11px] font-bold text-[#1f2937]">Hats, Glasses &amp; Extras (15 Accessories)</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {WARDROBE_ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, accessory: acc.id })}
                    className={`flex items-center justify-between rounded-[2px] border px-2.5 py-1.5 text-[11px] font-bold text-left cursor-pointer ${
                      draft.accessory === acc.id
                        ? 'border-[#000000] bg-[#f59e0b] text-[#1c1200]'
                        : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    <span className="truncate">{acc.label}</span>
                    {acc.hcOnly && <Crown className="h-3 w-3 shrink-0 text-[#eab308]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

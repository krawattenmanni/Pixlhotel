import { useState } from 'react';
import { Check, RotateCw, Shirt } from 'lucide-react';
import { CLOTHING_PALETTE, HAIR_PALETTE, SKIN_PALETTE } from '../../game/data';
import type {
  AccessoryStyle,
  AvatarPose,
  Direction,
  ExpressionStyle,
  HairStyle,
  LookConfig,
  ShirtStyle,
} from '../../game/types';
import { PixelAvatarCanvas } from '../PixelSpriteCanvas';

interface WardrobeTabProps {
  currentLook: LookConfig;
  onSaveLook: (look: LookConfig) => void;
}

const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'quiff', label: 'Classic Quiff' },
  { id: 'spiky', label: 'Spiky Gel' },
  { id: 'bob', label: 'Retro Bob' },
  { id: 'long', label: 'Long Flowing' },
  { id: 'mohawk', label: 'Punk Mohawk' },
  { id: 'curls', label: 'Soft Curls' },
];

const EXPRESSIONS: { id: ExpressionStyle; label: string }[] = [
  { id: 'happy', label: 'Happy Grin' },
  { id: 'cool', label: 'Cool Focus' },
  { id: 'cheeky', label: 'Cheeky Smile' },
  { id: 'serene', label: 'Chill Calm' },
];

const SHIRT_STYLES: { id: ShirtStyle; label: string }[] = [
  { id: 'hoodie', label: 'HC Hoodie' },
  { id: 'tee', label: 'Classic Tee' },
  { id: 'suit', label: 'VIP Suit' },
  { id: 'stripes', label: 'Sailor Stripes' },
  { id: 'tank', label: 'Summer Tank' },
];

const ACCESSORIES: { id: AccessoryStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'crown', label: 'Golden Crown' },
  { id: 'headphones', label: 'DJ Headphones' },
  { id: 'sunglasses', label: 'Cool Shades' },
  { id: 'cap', label: 'Retro Cap' },
];

export function WardrobeTab({ currentLook, onSaveLook }: WardrobeTabProps) {
  const [draft, setDraft] = useState<LookConfig>(currentLook);
  const [previewDir, setPreviewDir] = useState<Direction>(0);
  const [previewPose, setPreviewPose] = useState<AvatarPose>('stand');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    onSaveLook(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
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

            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewDir(((previewDir + 1) % 4) as Direction)}
                className="habbo-btn-blue inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate
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
          <div className="habbo-box-header habbo-header-blue">Head, Hair &amp; Expression</div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Skin Tone</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SKIN_PALETTE.map((c) => (
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
                {EXPRESSIONS.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, expression: exp.id })}
                    className={`rounded-[2px] border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      draft.expression === exp.id
                        ? 'border-[#000000] bg-[#2b6ca3] text-white'
                        : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    {exp.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Hairstyle</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {HAIR_STYLES.map((hs) => (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, hairStyle: hs.id })}
                    className={`rounded-[2px] border px-2.5 py-1 text-[11px] font-bold text-left cursor-pointer ${
                      draft.hairStyle === hs.id
                        ? 'border-[#000000] bg-[#2b6ca3] text-white'
                        : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    {hs.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Hair Color</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {HAIR_PALETTE.map((c) => (
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
          <div className="habbo-box-header habbo-header-orange">Outfit &amp; Accessories</div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Shirt Style</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SHIRT_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, shirtStyle: s.id })}
                    className={`rounded-[2px] border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      draft.shirtStyle === s.id
                        ? 'border-[#000000] bg-[#2b6ca3] text-white'
                        : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Shirt Color</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CLOTHING_PALETTE.map((c) => (
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
              <p className="text-[11px] font-bold text-[#1f2937]">Pants Color</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CLOTHING_PALETTE.map((c) => (
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

            <div>
              <p className="text-[11px] font-bold text-[#1f2937]">Shoes Color</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CLOTHING_PALETTE.map((c) => (
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
              <p className="text-[11px] font-bold text-[#1f2937]">Head &amp; Face Accessories</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, accessory: acc.id })}
                    className={`rounded-[2px] border px-3 py-1.5 text-[11px] font-bold cursor-pointer ${
                      draft.accessory === acc.id
                        ? 'border-[#000000] bg-[#f59e0b] text-[#1c1200]'
                        : 'border-[#94a3b8] bg-[#f8fafc] text-[#1f2937] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    {acc.label}
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

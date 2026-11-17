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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LIVE PREVIEW PANEL */}
      <div className="lg:col-span-4">
        <div className="habbo-box">
          <div className="habbo-box-header flex items-center gap-2 bg-[#7c3aed]">
            <Shirt className="h-4 w-4" />
            Live PIXL Preview
          </div>
          <div className="flex flex-col items-center bg-gradient-to-b from-[#d8ebfc] to-[#eef7ff] p-6">
            <div className="flex h-60 w-full flex-col items-center justify-end rounded-lg border-2 border-[#9ec5e6] bg-white/80 pb-4 pt-6">
              <PixelAvatarCanvas look={draft} dir={previewDir} pose={previewPose} frame={0} scale={3} />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewDir(((previewDir + 1) % 4) as Direction)}
                className="habbo-btn-blue inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate
              </button>
              {(['stand', 'wave', 'sit', 'dance'] as AvatarPose[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreviewPose(p)}
                  className={`rounded border px-2.5 py-1.5 text-xs font-bold capitalize cursor-pointer ${
                    previewPose === p
                      ? 'border-[#1d4ed8] bg-[#2b7de9] text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="habbo-btn-green mt-5 w-full rounded-md py-3 font-pixel text-sm cursor-pointer"
            >
              {savedNotice ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Look Saved Live!
                </span>
              ) : (
                'Save Look'
              )}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">
              Updates immediately across CMS and Hotel Client.
            </p>
          </div>
        </div>
      </div>

      {/* CUSTOMIZER CONTROLS */}
      <div className="space-y-5 lg:col-span-8">
        <div className="habbo-box">
          <div className="habbo-box-header bg-[#235c8a]">Head, Hair &amp; Expression</div>
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-slate-700">Skin Tone</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SKIN_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Skin tone ${c.name}`}
                    onClick={() => setDraft({ ...draft, skinColor: c.hex })}
                    className={`h-8 w-8 rounded border-2 cursor-pointer ${
                      draft.skinColor === c.hex ? 'border-slate-900 scale-110' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">Facial Expression</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXPRESSIONS.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, expression: exp.id })}
                    className={`rounded border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                      draft.expression === exp.id
                        ? 'border-[#1d4ed8] bg-[#2b7de9] text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {exp.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">Hairstyle</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {HAIR_STYLES.map((hs) => (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, hairStyle: hs.id })}
                    className={`rounded border px-3 py-1.5 text-xs font-bold text-left cursor-pointer ${
                      draft.hairStyle === hs.id
                        ? 'border-[#1d4ed8] bg-[#2b7de9] text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {hs.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">Hair Color</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {HAIR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Hair color ${c.name}`}
                    onClick={() => setDraft({ ...draft, hairColor: c.hex })}
                    className={`h-8 w-8 rounded border-2 cursor-pointer ${
                      draft.hairColor === c.hex ? 'border-slate-900 scale-110' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="habbo-box">
          <div className="habbo-box-header bg-[#2b7de9]">Outfit &amp; Accessories</div>
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-slate-700">Shirt Style</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SHIRT_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, shirtStyle: s.id })}
                    className={`rounded border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                      draft.shirtStyle === s.id
                        ? 'border-[#1d4ed8] bg-[#2b7de9] text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">Shirt Color</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CLOTHING_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Shirt color ${c.name}`}
                    onClick={() => setDraft({ ...draft, shirtColor: c.hex })}
                    className={`h-8 w-8 rounded border-2 cursor-pointer ${
                      draft.shirtColor === c.hex ? 'border-slate-900 scale-110' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">Pants Color</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CLOTHING_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Pants color ${c.name}`}
                    onClick={() => setDraft({ ...draft, pantsColor: c.hex })}
                    className={`h-8 w-8 rounded border-2 cursor-pointer ${
                      draft.pantsColor === c.hex ? 'border-slate-900 scale-110' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">Shoes Color</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CLOTHING_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Shoes color ${c.name}`}
                    onClick={() => setDraft({ ...draft, shoesColor: c.hex })}
                    className={`h-8 w-8 rounded border-2 cursor-pointer ${
                      draft.shoesColor === c.hex ? 'border-slate-900 scale-110' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-bold text-slate-700">Head &amp; Face Accessories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, accessory: acc.id })}
                    className={`rounded border px-3.5 py-2 text-xs font-bold cursor-pointer ${
                      draft.accessory === acc.id
                        ? 'border-[#b45309] bg-[#f59e0b] text-slate-950'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
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

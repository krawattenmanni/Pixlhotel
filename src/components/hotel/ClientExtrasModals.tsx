import {
  Coffee,
  Disc,
  Lightbulb,
  ListFilter,
  Music,
  Palette,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Terminal,
  X,
} from 'lucide-react';
import {
  CARRY_ITEMS,
  FLOOR_THEME_OPTIONS,
  MOODLIGHT_PRESETS,
  WALL_THEME_OPTIONS,
  type CarryItemId,
  type MoodlightConfig,
} from '../../game/clientFeatures';
import { FURNI_CATALOGUE } from '../../game/data';
import type { PlacedFurni, RoomFloorTheme, RoomWallTheme } from '../../game/types';
import { PixelFurniCanvas } from '../PixelSpriteCanvas';

interface MoodlightModalProps {
  moodlight: MoodlightConfig;
  floorTheme: RoomFloorTheme;
  wallTheme: RoomWallTheme;
  onChangeMoodlight: (next: MoodlightConfig) => void;
  onChangeFloorTheme: (theme: RoomFloorTheme) => void;
  onChangeWallTheme: (theme: RoomWallTheme) => void;
  onClose: () => void;
}

export function MoodlightModal({
  moodlight,
  floorTheme,
  wallTheme,
  onChangeMoodlight,
  onChangeFloorTheme,
  onChangeWallTheme,
  onClose,
}: MoodlightModalProps) {
  return (
    <div
      data-testid="moodlight-modal"
      role="dialog"
      aria-label="Room Moodlight & Theme Dimmer"
      className="pointer-events-auto fixed inset-x-4 top-16 mx-auto z-40 max-w-md client-window overflow-hidden"
    >
      <div className="client-window-bar flex items-center justify-between bg-gradient-to-b from-[#4f46e5] to-[#312e81] px-3.5 py-2 text-white">
        <span className="inline-flex items-center gap-2 font-pixel text-xs">
          <Lightbulb className="h-4 w-4 text-[#fde047]" />
          Room Dimmer (Moodlight) &amp; Architecture
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Moodlight Modal"
          className="rounded border border-white/30 bg-black/25 p-1 hover:bg-black/45 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto bg-[#f8fafc]">
        {/* Power Switch */}
        <div className="flex items-center justify-between rounded-md border border-stone-300 bg-white p-3">
          <div>
            <p className="text-xs font-extrabold text-slate-900">Moodlight Dimmer Switch</p>
            <p className="text-[11px] text-slate-600">
              {moodlight.enabled
                ? `Active: ${moodlight.colorName} (${Math.round(moodlight.intensity * 100)}%)`
                : 'Currently Off — standard room lighting'}
            </p>
          </div>
          <button
            type="button"
            data-testid="moodlight-power-btn"
            onClick={() => onChangeMoodlight({ ...moodlight, enabled: !moodlight.enabled })}
            className={`rounded px-3.5 py-1.5 font-pixel text-xs cursor-pointer ${
              moodlight.enabled
                ? 'habbo-btn-green'
                : 'border-2 border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            {moodlight.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Color Presets */}
        <div>
          <p className="text-xs font-extrabold text-slate-800 mb-2">Moodlight Color Presets</p>
          <div className="grid grid-cols-3 gap-2">
            {MOODLIGHT_PRESETS.map((preset) => {
              const active = moodlight.colorHex === preset.hex;
              return (
                <button
                  key={preset.hex}
                  type="button"
                  data-testid={`moodlight-color-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() =>
                    onChangeMoodlight({
                      ...moodlight,
                      enabled: true,
                      colorHex: preset.hex,
                      colorName: preset.name,
                    })
                  }
                  className={`flex items-center gap-2 rounded border p-2 text-left text-xs font-bold cursor-pointer ${
                    active
                      ? 'border-slate-950 bg-indigo-50 ring-2 ring-indigo-500'
                      : 'border-stone-300 bg-white hover:bg-stone-100'
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-sm border border-black/40 shrink-0"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className="truncate text-[11px] text-slate-900">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dimmer Intensity & Scope */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded border border-stone-300 bg-white p-2.5">
            <p className="text-[11px] font-extrabold text-slate-700 mb-1.5">Dimmer Intensity</p>
            <div className="flex items-center gap-1.5">
              {[
                { label: 'Subtle', val: 0.22 },
                { label: 'Medium', val: 0.36 },
                { label: 'Deep', val: 0.5 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() =>
                    onChangeMoodlight({ ...moodlight, enabled: true, intensity: opt.val })
                  }
                  className={`flex-1 rounded border py-1 text-[11px] font-bold cursor-pointer ${
                    Math.abs(moodlight.intensity - opt.val) < 0.04
                      ? 'border-indigo-700 bg-indigo-600 text-white'
                      : 'border-stone-300 bg-stone-50 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded border border-stone-300 bg-white p-2.5">
            <p className="text-[11px] font-extrabold text-slate-700 mb-1.5">Lighting Scope</p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onChangeMoodlight({ ...moodlight, enabled: true, backgroundOnly: false })
                }
                className={`flex-1 rounded border py-1 text-[11px] font-bold cursor-pointer ${
                  !moodlight.backgroundOnly
                    ? 'border-indigo-700 bg-indigo-600 text-white'
                    : 'border-stone-300 bg-stone-50 text-slate-700'
                }`}
              >
                Full Room
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeMoodlight({ ...moodlight, enabled: true, backgroundOnly: true })
                }
                className={`flex-1 rounded border py-1 text-[11px] font-bold cursor-pointer ${
                  moodlight.backgroundOnly
                    ? 'border-indigo-700 bg-indigo-600 text-white'
                    : 'border-stone-300 bg-stone-50 text-slate-700'
                }`}
              >
                Walls Only
              </button>
            </div>
          </div>
        </div>

        {/* Room Floor & Wall Theme Customizer */}
        <div className="border-t border-stone-300 pt-3 space-y-2.5">
          <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-[#235c8a]" />
            Room Floor &amp; Wall Surface Customizer
          </p>
          <div>
            <p className="text-[11px] font-bold text-slate-600 mb-1">Flooring Style</p>
            <div className="flex flex-wrap gap-1.5">
              {FLOOR_THEME_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChangeFloorTheme(f.id)}
                  className={`rounded border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                    floorTheme === f.id
                      ? 'border-[#235c8a] bg-[#235c8a] text-white'
                      : 'border-stone-300 bg-white text-slate-700 hover:bg-stone-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 mb-1">Wallpaper Theme</p>
            <div className="flex flex-wrap gap-1.5">
              {WALL_THEME_OPTIONS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onChangeWallTheme(w.id)}
                  className={`rounded border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                    wallTheme === w.id
                      ? 'border-[#235c8a] bg-[#235c8a] text-white'
                      : 'border-stone-300 bg-white text-slate-700 hover:bg-stone-100'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TraxmachineModalProps {
  activeTrack: number | null;
  onSelectTrack: (trackIndex: number | null) => void;
  onClose: () => void;
}

const TRAX_DISCS = [
  { index: 0, title: 'Sunset Club Mammoth', genre: 'Retro Synth Groove · 120 BPM', color: '#ec4899' },
  { index: 1, title: 'Battle Banzai Electro', genre: 'Arcade Chiptune Bass · 132 BPM', color: '#06b6d4' },
  { index: 2, title: 'Cozy Welcome Lounge', genre: 'Chill Pixel Bossa · 108 BPM', color: '#eab308' },
];

export function TraxmachineModal({
  activeTrack,
  onSelectTrack,
  onClose,
}: TraxmachineModalProps) {
  return (
    <div
      data-testid="traxmachine-modal"
      role="dialog"
      aria-label="PIXL Traxmachine & Jukebox"
      className="pointer-events-auto fixed inset-x-4 top-16 mx-auto z-40 max-w-md client-window overflow-hidden"
    >
      <div className="client-window-bar flex items-center justify-between bg-gradient-to-b from-[#db2777] to-[#831843] px-3.5 py-2 text-white">
        <span className="inline-flex items-center gap-2 font-pixel text-xs">
          <Disc className="h-4 w-4 text-[#fde047]" />
          PIXL Traxmachine &amp; Jukebox
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Traxmachine"
          className="rounded border border-white/30 bg-black/25 p-1 hover:bg-black/45 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3 bg-[#f8fafc]">
        <p className="text-xs text-slate-600">
          Select a Trax cartridge below to spin live procedural chiptune music in the room:
        </p>

        <div className="space-y-2">
          {TRAX_DISCS.map((disc) => {
            const playing = activeTrack === disc.index;
            return (
              <div
                key={disc.index}
                className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                  playing
                    ? 'border-pink-500 bg-pink-50/90'
                    : 'border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-black/30 text-white shrink-0"
                    style={{ backgroundColor: disc.color }}
                  >
                    <Music className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-900 truncate">{disc.title}</p>
                    <p className="text-[11px] text-slate-500">{disc.genre}</p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid={`trax-play-${disc.index}`}
                  onClick={() => onSelectTrack(playing ? null : disc.index)}
                  className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-extrabold cursor-pointer shrink-0 ${
                    playing
                      ? 'border border-rose-700 bg-rose-600 text-white hover:bg-rose-700'
                      : 'habbo-btn-green'
                  }`}
                >
                  {playing ? (
                    <>
                      <Square className="h-3 w-3" /> Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" /> Spin
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CommandsAndFurniModalProps {
  activeSubTab: 'commands' | 'furni';
  onChangeSubTab: (tab: 'commands' | 'furni') => void;
  carryItem: CarryItemId;
  moonwalk: boolean;
  placedFurni: PlacedFurni[];
  canEditRoom: boolean;
  onRunCommand: (cmdText: string) => void;
  onSelectCarryItem: (item: CarryItemId) => void;
  onToggleFurni: (uid: string, nextState: number) => void;
  onRotateFurni: (uid: string) => void;
  onPickupFurni: (uid: string) => void;
  onClose: () => void;
}

const QUICK_COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: ':sit', desc: 'Sit down on current floor tile' },
  { cmd: ':dance', desc: 'Start PIXL club dance groove' },
  { cmd: ':wave', desc: 'Wave hello to everyone in the room' },
  { cmd: ':moonwalk', desc: 'Toggle backwards Moonwalk stride' },
  { cmd: ':roll', desc: 'Roll a 1–6 lucky dice number in chat' },
  { cmd: ':moodlight', desc: 'Toggle Room Dimmer / Moodlight' },
  { cmd: ':furni', desc: 'Open Room Furni Chooser (:furni)' },
  { cmd: ':pickall', desc: 'Pick up all furni in your private room' },
];

export function CommandsAndFurniModal({
  activeSubTab,
  onChangeSubTab,
  carryItem,
  moonwalk,
  placedFurni,
  canEditRoom,
  onRunCommand,
  onSelectCarryItem,
  onToggleFurni,
  onRotateFurni,
  onPickupFurni,
  onClose,
}: CommandsAndFurniModalProps) {
  return (
    <div
      data-testid="commands-furni-modal"
      role="dialog"
      aria-label="PIXL Commands, Handitems & Furni Chooser"
      className="pointer-events-auto fixed inset-x-4 top-16 mx-auto z-40 max-w-lg client-window overflow-hidden"
    >
      <div className="client-window-bar flex items-center justify-between bg-gradient-to-b from-[#0d9488] to-[#115e59] px-3.5 py-2 text-white">
        <span className="inline-flex items-center gap-2 font-pixel text-xs">
          <Terminal className="h-4 w-4 text-[#fef08a]" />
          PIXL Client Tools — :commands, Handitems &amp; :furni
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close PIXL Client Tools"
          className="rounded border border-white/30 bg-black/25 p-1 hover:bg-black/45 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-stone-300 bg-stone-200 px-3.5 py-2">
        <button
          type="button"
          onClick={() => onChangeSubTab('commands')}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-extrabold cursor-pointer ${
            activeSubTab === 'commands'
              ? 'bg-[#0f3454] text-white'
              : 'border border-stone-300 bg-white text-slate-700'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          :commands &amp; Handitems
        </button>
        <button
          type="button"
          data-testid="furni-chooser-tab-btn"
          onClick={() => onChangeSubTab('furni')}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-extrabold cursor-pointer ${
            activeSubTab === 'furni'
              ? 'bg-[#0f3454] text-white'
              : 'border border-stone-300 bg-white text-slate-700'
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" />
          :furni Chooser ({placedFurni.length})
        </button>
      </div>

      <div className="p-4 max-h-[70vh] overflow-y-auto bg-[#f8fafc] space-y-4">
        {activeSubTab === 'commands' ? (
          <>
            {/* Carry Items / Handitems */}
            <div>
              <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mb-2">
                <Coffee className="h-3.5 w-3.5 text-amber-700" />
                Carry Drink / Handitem (Visible in Avatar Hand)
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {CARRY_ITEMS.map((item) => {
                  const active = carryItem === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`carry-item-btn-${item.id}`}
                      onClick={() => onSelectCarryItem(item.id)}
                      className={`flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs font-bold cursor-pointer ${
                        active
                          ? 'border-amber-600 bg-amber-100 text-amber-950'
                          : 'border-stone-300 bg-white text-slate-800 hover:bg-stone-100'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-black/30 shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-[11px]">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Classic Chat Commands */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-extrabold text-slate-800">
                  Classic Chat Commands (Click or Type in Chat)
                </p>
                {moonwalk && (
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800">
                    Moonwalk ON
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {QUICK_COMMANDS.map((c) => (
                  <button
                    key={c.cmd}
                    type="button"
                    data-testid={`quick-cmd-${c.cmd.slice(1)}`}
                    onClick={() => onRunCommand(c.cmd)}
                    className="flex items-center justify-between gap-2 rounded border border-stone-300 bg-white px-3 py-2 text-left hover:border-[#0d9488] hover:bg-teal-50/40 cursor-pointer"
                  >
                    <div>
                      <p className="font-mono-num text-xs font-extrabold text-[#0d9488]">{c.cmd}</p>
                      <p className="text-[11px] text-slate-600">{c.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2" data-testid="furni-chooser-list">
            <p className="text-xs text-slate-600">
              All furniture placed in this room. Click <strong>Toggle</strong> to activate lamps/dice/TVs or manage items:
            </p>
            {placedFurni.length === 0 ? (
              <p className="rounded border border-stone-300 bg-white p-4 text-center text-xs text-slate-500">
                No furniture placed in this room yet.
              </p>
            ) : (
              <div className="divide-y divide-stone-200 rounded border border-stone-300 bg-white">
                {placedFurni.map((item) => {
                  const def = FURNI_CATALOGUE.find((f) => f.id === item.furniId);
                  if (!def) return null;
                  return (
                    <div
                      key={item.uid}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PixelFurniCanvas furniId={item.furniId} size={32} />
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 truncate">{def.name}</p>
                          <p className="font-mono-num text-[10px] text-slate-500">
                            Tile ({item.x}, {item.y}) · Dir {item.dir} · State {item.state}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleFurni(item.uid, item.state === 1 ? 0 : 1)}
                          className="rounded border border-stone-300 bg-stone-50 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-stone-100 cursor-pointer"
                        >
                          Toggle
                        </button>
                        {canEditRoom && (
                          <>
                            <button
                              type="button"
                              onClick={() => onRotateFurni(item.uid)}
                              title="Rotate"
                              className="rounded border border-stone-300 bg-stone-50 p-1 text-slate-700 hover:bg-stone-100 cursor-pointer"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onPickupFurni(item.uid)}
                              className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              Pick Up
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

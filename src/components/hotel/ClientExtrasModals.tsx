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
import { findFurniDef } from '../../game/data';
import type { PlacedFurni, RoomFloorTheme, RoomWallTheme } from '../../game/types';
import { FurniPreviewImg } from '../PixelSpriteCanvas';

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
      className="pointer-events-auto fixed inset-x-4 top-14 mx-auto z-40 max-w-md client-window overflow-hidden"
    >
      <div
        className="client-window-bar flex items-center justify-between px-3 py-1.5 text-white"
        style={{ background: 'linear-gradient(180deg, #4f46e5 0%, #312e81 100%)' }}
      >
        <span className="inline-flex items-center gap-2 font-pixel text-[11px]">
          <Lightbulb className="h-3.5 w-3.5 text-[#fde047]" />
          Room Dimmer (Moodlight) &amp; Architecture
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Moodlight Modal"
          className="client-close-btn"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="p-3.5 space-y-3.5 max-h-[75vh] overflow-y-auto bg-[#ececec]">
        {/* Power Switch */}
        <div className="flex items-center justify-between border border-[#b5b5b5] bg-white p-2.5 rounded-[2px]">
          <div>
            <p className="text-[11px] font-bold text-[#111827]">Moodlight Dimmer Switch</p>
            <p className="text-[10px] text-[#4b5563]">
              {moodlight.enabled
                ? `Active: ${moodlight.colorName} (${Math.round(moodlight.intensity * 100)}%)`
                : 'Currently Off — standard room lighting'}
            </p>
          </div>
          <button
            type="button"
            data-testid="moodlight-power-btn"
            onClick={() => onChangeMoodlight({ ...moodlight, enabled: !moodlight.enabled })}
            className={`px-3 py-1 font-pixel text-[10px] cursor-pointer ${
              moodlight.enabled ? 'habbo-btn-green' : 'habbo-btn-silver'
            }`}
          >
            {moodlight.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Color Presets */}
        <div>
          <p className="text-[11px] font-bold text-[#1f2937] mb-1.5">Moodlight Color Presets</p>
          <div className="grid grid-cols-3 gap-1.5">
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
                  className={`flex items-center gap-1.5 border p-1.5 text-left text-[11px] font-bold cursor-pointer rounded-[2px] ${
                    active
                      ? 'border-[#1d4e78] bg-[#dbeafe]'
                      : 'border-[#b5b5b5] bg-white hover:bg-[#f3f4f6]'
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 border border-black shrink-0"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className="truncate text-[10px] text-[#111827]">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dimmer Intensity & Scope */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="border border-[#b5b5b5] bg-white p-2 rounded-[2px]">
            <p className="text-[10px] font-bold text-[#374151] mb-1">Dimmer Intensity</p>
            <div className="flex items-center gap-1">
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
                  className={`flex-1 py-1 text-[10px] font-bold cursor-pointer ${
                    Math.abs(moodlight.intensity - opt.val) < 0.04
                      ? 'habbo-btn-blue'
                      : 'habbo-btn-silver'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-[#b5b5b5] bg-white p-2 rounded-[2px]">
            <p className="text-[10px] font-bold text-[#374151] mb-1">Lighting Scope</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onChangeMoodlight({ ...moodlight, enabled: true, backgroundOnly: false })
                }
                className={`flex-1 py-1 text-[10px] font-bold cursor-pointer ${
                  !moodlight.backgroundOnly ? 'habbo-btn-blue' : 'habbo-btn-silver'
                }`}
              >
                Full Room
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeMoodlight({ ...moodlight, enabled: true, backgroundOnly: true })
                }
                className={`flex-1 py-1 text-[10px] font-bold cursor-pointer ${
                  moodlight.backgroundOnly ? 'habbo-btn-blue' : 'habbo-btn-silver'
                }`}
              >
                Walls Only
              </button>
            </div>
          </div>
        </div>

        {/* Room Floor & Wall Theme Customizer */}
        <div className="border-t border-[#b5b5b5] pt-2.5 space-y-2">
          <p className="text-[11px] font-bold text-[#111827] flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-[#1d4e78]" />
            Room Floor &amp; Wall Surface Customizer
          </p>
          <div>
            <p className="text-[10px] font-bold text-[#4b5563] mb-1">Flooring Style</p>
            <div className="flex flex-wrap gap-1">
              {FLOOR_THEME_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChangeFloorTheme(f.id)}
                  className={`px-2 py-1 text-[10px] font-bold cursor-pointer ${
                    floorTheme === f.id ? 'habbo-btn-blue' : 'habbo-btn-silver'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#4b5563] mb-1">Wallpaper Theme</p>
            <div className="flex flex-wrap gap-1">
              {WALL_THEME_OPTIONS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onChangeWallTheme(w.id)}
                  className={`px-2 py-1 text-[10px] font-bold cursor-pointer ${
                    wallTheme === w.id ? 'habbo-btn-blue' : 'habbo-btn-silver'
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
  { index: 0, title: 'Sunset Club Mammoth', genre: 'Rhodes Lounge Groove · 98 BPM', color: '#ec4899' },
  { index: 1, title: 'Battle Banzai Lounge', genre: 'Slap-Bass & Rhodes · 98 BPM', color: '#06b6d4' },
  { index: 2, title: 'Cozy Welcome Lobby', genre: 'Chill Pixel Bossa · 98 BPM', color: '#eab308' },
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
      className="pointer-events-auto fixed inset-x-4 top-14 mx-auto z-40 max-w-md client-window overflow-hidden"
    >
      <div
        className="client-window-bar flex items-center justify-between px-3 py-1.5 text-white"
        style={{ background: 'linear-gradient(180deg, #db2777 0%, #831843 100%)' }}
      >
        <span className="inline-flex items-center gap-2 font-pixel text-[11px]">
          <Disc className="h-3.5 w-3.5 text-[#fde047]" />
          PIXL Traxmachine &amp; Jukebox
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Traxmachine"
          className="client-close-btn"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="p-3.5 space-y-2.5 bg-[#ececec]">
        <p className="text-[11px] text-[#374151]">
          Select a Trax cartridge below to spin warm Rhodes lounge music in the room:
        </p>

        <div className="space-y-2">
          {TRAX_DISCS.map((disc) => {
            const playing = activeTrack === disc.index;
            return (
              <div
                key={disc.index}
                className={`flex items-center justify-between gap-3 border p-2.5 rounded-[2px] ${
                  playing ? 'border-[#be185d] bg-[#fdf2f8]' : 'border-[#b5b5b5] bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex h-9 w-9 items-center justify-center border border-black text-white shrink-0 rounded-[2px]"
                    style={{ backgroundColor: disc.color }}
                  >
                    <Music className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#111827] truncate">{disc.title}</p>
                    <p className="text-[10px] text-[#4b5563]">{disc.genre}</p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid={`trax-play-${disc.index}`}
                  onClick={() => onSelectTrack(playing ? null : disc.index)}
                  className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold cursor-pointer shrink-0 ${
                    playing ? 'habbo-btn-red' : 'habbo-btn-green'
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
  { cmd: ':chooser', desc: 'Open Room Users Chooser window' },
  { cmd: ':furni', desc: 'Open Room Furni Chooser (:furni)' },
  { cmd: ':sit', desc: 'Sit down on current floor tile' },
  { cmd: ':lay', desc: 'Lie down flat on floor or bed' },
  { cmd: ':dance 1', desc: 'Classic Hop dance (try :dance 1–4)' },
  { cmd: ':dance 2', desc: 'Pogo Mogo dance groove' },
  { cmd: ':sign heart', desc: 'Hold a glowing Heart sign for 5s' },
  { cmd: ':sign 10', desc: 'Hold a 10/10 score sign (:sign 1–10)' },
  { cmd: ':drink', desc: 'Grab a chilled drink hand item' },
  { cmd: ':moonwalk', desc: 'Toggle backwards Moonwalk stride' },
  { cmd: ':roll', desc: 'Roll a 1–6 lucky dice number in chat' },
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
      className="pointer-events-auto fixed inset-x-4 top-14 mx-auto z-40 max-w-lg client-window overflow-hidden"
    >
      <div
        className="client-window-bar flex items-center justify-between px-3 py-1.5 text-white"
        style={{ background: 'linear-gradient(180deg, #0d9488 0%, #115e59 100%)' }}
      >
        <span className="inline-flex items-center gap-2 font-pixel text-[11px]">
          <Terminal className="h-3.5 w-3.5 text-[#fef08a]" />
          PIXL Client Tools — :commands, Handitems &amp; :furni
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close PIXL Client Tools"
          className="client-close-btn"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#8f8f8f] bg-[#d4d4d4] px-3 py-2">
        <button
          type="button"
          onClick={() => onChangeSubTab('commands')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
            activeSubTab === 'commands' ? 'habbo-btn-blue' : 'habbo-btn-silver'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          :commands &amp; Handitems
        </button>
        <button
          type="button"
          data-testid="furni-chooser-tab-btn"
          onClick={() => onChangeSubTab('furni')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
            activeSubTab === 'furni' ? 'habbo-btn-blue' : 'habbo-btn-silver'
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" />
          :furni Chooser ({placedFurni.length})
        </button>
      </div>

      <div className="p-3.5 max-h-[70vh] overflow-y-auto bg-[#ececec] space-y-3.5">
        {activeSubTab === 'commands' ? (
          <>
            {/* Carry Items / Handitems */}
            <div>
              <p className="text-[11px] font-bold text-[#111827] flex items-center gap-1.5 mb-1.5">
                <Coffee className="h-3.5 w-3.5 text-[#b45309]" />
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
                      className={`flex items-center gap-1.5 border px-2 py-1 text-[11px] font-bold cursor-pointer rounded-[2px] ${
                        active
                          ? 'border-[#b45309] bg-[#fef3c7] text-[#78350f]'
                          : 'border-[#8f8f8f] bg-white text-[#111827] hover:bg-[#f3f4f6]'
                      }`}
                    >
                      <span
                        className="h-3 w-3 border border-black shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-[10px]">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Classic Chat Commands */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-bold text-[#111827]">
                  Classic Chat Commands (Click or Type in Chat)
                </p>
                {moonwalk && (
                  <span className="border border-[#6b21a8] bg-[#f3e8ff] px-2 py-0.5 text-[10px] font-bold text-[#581c87] rounded-[2px]">
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
                    className="flex items-center justify-between gap-2 border border-[#8f8f8f] bg-white px-2.5 py-1.5 text-left hover:border-[#0d9488] hover:bg-[#f0fdfa] cursor-pointer rounded-[2px]"
                  >
                    <div>
                      <p className="font-mono-num text-[11px] font-bold text-[#0f766e]">{c.cmd}</p>
                      <p className="text-[10px] text-[#4b5563]">{c.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2" data-testid="furni-chooser-list">
            <p className="text-[11px] text-[#374151]">
              All furniture placed in this room. Click <strong>Toggle</strong> to activate lamps/dice/TVs or manage items:
            </p>
            {placedFurni.length === 0 ? (
              <p className="border border-[#b5b5b5] bg-white p-4 text-center text-[11px] text-[#4b5563] rounded-[2px]">
                No furniture placed in this room yet.
              </p>
            ) : (
              <div className="divide-y divide-[#d4d4d4] border border-[#8f8f8f] bg-white rounded-[2px]">
                {placedFurni.map((item) => {
                  const def = findFurniDef(item.furniId);
                  if (!def) return null;
                  return (
                    <div
                      key={item.uid}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FurniPreviewImg itemType={item.furniId} alt={def.name} size={32} />
                        <div className="min-w-0">
                          <p className="font-bold text-[#111827] truncate">{def.name}</p>
                          <p className="font-mono-num text-[10px] text-[#4b5563]">
                            Tile ({item.x}, {item.y}) · Dir {item.dir} · State {item.state}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleFurni(item.uid, item.state === 1 ? 0 : 1)}
                          className="habbo-btn-silver px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                        >
                          Toggle
                        </button>
                        {canEditRoom && (
                          <>
                            <button
                              type="button"
                              onClick={() => onRotateFurni(item.uid)}
                              title="Rotate"
                              className="habbo-btn-silver p-1 cursor-pointer"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onPickupFurni(item.uid)}
                              className="habbo-btn-red px-2 py-0.5 text-[10px] font-bold cursor-pointer"
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

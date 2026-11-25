import { useState } from 'react';
import { Ban, Check, KeyRound, UserPlus } from 'lucide-react';
import { formatOnlineCountLabel } from '../../game/clientFeatures';
import {
  ADMIN_PLAYER_STATE,
  BADGE_CATALOGUE,
  CLOTHING_PALETTE,
  HAIR_PALETTE,
} from '../../game/data';
import type { HairStyle, LookConfig } from '../../game/types';
import {
  FEMALE_STARTER_PRESETS,
  MALE_STARTER_PRESETS,
} from '../../game/wardrobeOptions';
import { PixelAvatarCanvas, PixelBadgeSprite } from '../PixelSpriteCanvas';

interface AuthPortalProps {
  onlineCount?: number;
  onLogin: (
    username: string,
    password: string,
    rememberMe?: boolean
  ) => { ok: boolean; banned?: boolean; message: string } | Promise<{ ok: boolean; banned?: boolean; message: string }>;
  onRegister: (
    username: string,
    password: string,
    confirmPassword: string,
    motto: string,
    look?: LookConfig,
    mail?: string,
    gender?: 'M' | 'F'
  ) => { ok: boolean; message: string } | Promise<{ ok: boolean; message: string }>;
  onContinueAsGuest: () => void | Promise<void>;
}

const QUICK_HAIRS_M: { id: HairStyle; label: string }[] = [
  { id: 'quiff', label: 'Quiff' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'pompadour', label: 'Pompadour' },
  { id: 'side_part', label: 'Side-Part' },
  { id: 'mohawk', label: 'Mohawk' },
];

const QUICK_HAIRS_F: { id: HairStyle; label: string }[] = [
  { id: 'long', label: 'Wavy Long' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'pigtails', label: 'Pigtails' },
  { id: 'bob', label: 'Sleek Bob' },
  { id: 'princess_bun', label: 'Princess Bun' },
];

export function AuthPortal({
  onlineCount = 0,
  onLogin,
  onRegister,
  onContinueAsGuest,
}: AuthPortalProps) {
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginFeedback, setLoginFeedback] = useState<{
    ok: boolean;
    banned?: boolean;
    text: string;
  } | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [regName, setRegName] = useState('');
  const [regMail, setRegMail] = useState('');
  const [regGender, setRegGender] = useState<'M' | 'F'>('M');
  const [presetIdx, setPresetIdx] = useState(0);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regMotto, setRegMotto] = useState('');
  const [regLook, setRegLook] = useState<LookConfig>(() => ({
    ...MALE_STARTER_PRESETS[0],
    gender: 'M',
  }));
  const [regFeedback, setRegFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [registering, setRegistering] = useState(false);

  const handleSelectGender = (nextGender: 'M' | 'F') => {
    setRegGender(nextGender);
    setPresetIdx(0);
    const presets = nextGender === 'F' ? FEMALE_STARTER_PRESETS : MALE_STARTER_PRESETS;
    setRegLook({
      ...presets[0],
      gender: nextGender,
      accessory: nextGender === 'F' ? 'none' : presets[0].accessory,
    });
  };

  const handleCyclePreset = () => {
    const presets = regGender === 'F' ? FEMALE_STARTER_PRESETS : MALE_STARTER_PRESETS;
    const nextIdx = (presetIdx + 1) % presets.length;
    setPresetIdx(nextIdx);
    const chosen = presets[nextIdx];
    setRegLook({
      ...chosen,
      gender: regGender,
      accessory:
        regGender === 'F' &&
        chosen.accessory !== 'none' &&
        chosen.accessory !== 'tiara' &&
        chosen.accessory !== 'sunglasses' &&
        chosen.accessory !== 'flower_clip'
          ? 'none'
          : chosen.accessory,
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await onLogin(loginName, loginPassword, rememberMe);
      setLoginFeedback({ ok: res.ok, banned: res.banned, text: res.message });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const finalLook: LookConfig = {
        ...regLook,
        gender: regGender,
      };
      const res = await onRegister(
        regName,
        regPassword,
        regConfirm,
        regMotto,
        finalLook,
        regMail,
        regGender
      );
      setRegFeedback({ ok: res.ok, text: res.message });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden habbo-bg-sky flex flex-col justify-between">
      {/* Classic HoloCMS Frontpage Sky Header + Skyline Silhouette */}
      <header className="relative overflow-hidden border-b border-[#000000] bg-gradient-to-b from-[#6ec2f7] via-[#9bd6fb] to-[#bce0fd] pt-4 pb-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90" aria-hidden="true">
          <svg className="absolute left-6 top-2 h-9 w-36" viewBox="0 0 120 32" shapeRendering="crispEdges">
            <rect x="20" y="8" width="60" height="16" fill="#ffffff" />
            <rect x="8" y="14" width="84" height="12" fill="#ffffff" />
            <rect x="32" y="2" width="32" height="10" fill="#ffffff" />
          </svg>
          <svg className="absolute right-12 top-3 h-10 w-40" viewBox="0 0 140 32" shapeRendering="crispEdges">
            <rect x="30" y="6" width="72" height="16" fill="#ffffff" />
            <rect x="14" y="13" width="104" height="13" fill="#ffffff" />
          </svg>
          {/* Pixel Hotel Skyline Silhouette along bottom */}
          <svg
            className="absolute bottom-0 left-0 h-8 w-full opacity-35"
            viewBox="0 0 800 32"
            preserveAspectRatio="none"
            shapeRendering="crispEdges"
          >
            <rect x="0" y="22" width="800" height="10" fill="#1d4e78" />
            <rect x="20" y="10" width="34" height="22" fill="#1d4e78" />
            <rect x="74" y="6" width="44" height="26" fill="#2b6ca3" />
            <rect x="140" y="14" width="28" height="18" fill="#1d4e78" />
            <rect x="210" y="4" width="52" height="28" fill="#1d4e78" />
            <rect x="310" y="11" width="38" height="21" fill="#2b6ca3" />
            <rect x="420" y="7" width="48" height="25" fill="#1d4e78" />
            <rect x="520" y="13" width="36" height="19" fill="#2b6ca3" />
            <rect x="610" y="5" width="56" height="27" fill="#1d4e78" />
            <rect x="710" y="12" width="40" height="20" fill="#2b6ca3" />
          </svg>
        </div>

        <div className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 rounded-[3px] border border-[#000000] bg-gradient-to-b from-[#ffe44d] to-[#f5b400] px-3.5 py-2 shadow-[inset_0_1px_0_#fff9c4,0_3px_0_#9e6e00]">
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                <rect x="6" y="1" width="4" height="2" fill="#dc2626" />
                <rect x="4" y="3" width="8" height="2" fill="#2563eb" />
                <rect x="2" y="5" width="12" height="6" fill="#1e293b" />
                <rect x="3" y="6" width="4" height="4" fill="#38bdf8" />
                <rect x="9" y="6" width="4" height="4" fill="#facc15" />
                <rect x="4" y="11" width="8" height="3" fill="#0f172a" />
              </svg>
              <span className="font-pixel text-xl sm:text-2xl tracking-wider text-[#111827]">PIXL</span>
              <span className="rounded-[2px] border border-[#000000] bg-[#9e1b1b] px-1.5 py-0.5 font-pixel text-[9px] font-bold text-[#fef08a]">
                HOTEL
              </span>
            </div>
            <div>
              <h1 className="font-pixel text-sm sm:text-base text-[#0f3454]">
                Make friends, build rooms, collect rares!
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold text-[#1d4e78]">
                  Welcome to PIXL Hotel — check in now!
                </p>
                <span
                  data-testid="auth-online-count-label"
                  className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#000000] bg-white px-2 py-0.5 text-[10px] font-bold text-[#0f3454]"
                >
                  <span className="inline-block h-2 w-2 rounded-[1px] border border-[#14532d] bg-[#22c55e]" />
                  {formatOnlineCountLabel(onlineCount)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueAsGuest}
            className="habbo-btn-green px-4 py-2 text-[11px] font-bold cursor-pointer whitespace-nowrap"
          >
            Continue as Guest (PixelGuest) &rsaquo;
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* SIGN IN BOX */}
          <section className="habbo-box md:col-span-6 flex flex-col justify-between">
            <div>
              <div className="habbo-box-header habbo-header-blue flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-[#ffd400]" />
                Sign In to PIXL Hotel
              </div>

              <form onSubmit={handleLoginSubmit} className="p-4 space-y-3.5">
                <div>
                  <label htmlFor="login-username" className="block text-[11px] font-bold text-[#1f2937]">
                    PIXL Name
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="e.g. PixelHero"
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#111827] focus:border-[#2b6ca3] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-[11px] font-bold text-[#1f2937]">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password..."
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#111827] focus:border-[#2b6ca3] focus:outline-none"
                  />
                </div>

                {/* Keep me logged in (Eingeloggt bleiben) pixel checkbox button */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={rememberMe}
                  data-testid="remember-me-toggle"
                  onClick={() => setRememberMe((prev) => !prev)}
                  className={`flex w-full items-center justify-between rounded-[2px] border px-2.5 py-2 text-left text-[11px] font-bold cursor-pointer transition-colors ${
                    rememberMe
                      ? 'border-[#000000] bg-[#eef6fc] text-[#0f3454]'
                      : 'border-[#94a3b8] bg-[#f8fafc] text-[#475569]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border border-[#000000] ${
                        rememberMe ? 'bg-[#3d8b18] text-white' : 'bg-white text-transparent'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span>Keep me logged in (Eingeloggt bleiben)</span>
                  </span>
                  <span
                    className={`rounded-[2px] border px-1.5 py-0.5 font-pixel text-[8px] uppercase ${
                      rememberMe
                        ? 'border-[#14532d] bg-[#dcfce7] text-[#14532d]'
                        : 'border-[#94a3b8] bg-[#e2e8f0] text-[#475569]'
                    }`}
                  >
                    {rememberMe ? 'ON' : 'OFF'}
                  </span>
                </button>

                {loginFeedback && (
                  <div
                    role="alert"
                    data-testid={loginFeedback.banned ? 'login-ban-alert' : 'login-feedback'}
                    className={`flex items-start gap-2 rounded-[2px] border px-3 py-2 text-[11px] font-bold ${
                      loginFeedback.ok
                        ? 'border-[#1f4f09] bg-[#ecfdf5] text-[#14532d]'
                        : loginFeedback.banned
                        ? 'border-[#000000] bg-[#9e1b1b] text-white'
                        : 'border-[#7f1d1d] bg-[#fef2f2] text-[#991b1b]'
                    }`}
                  >
                    {loginFeedback.banned && <Ban className="h-4 w-4 shrink-0 text-[#fde08a] mt-0.5" />}
                    <span>{loginFeedback.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loggingIn}
                  className="habbo-btn-green w-full py-2 font-pixel text-xs cursor-pointer disabled:opacity-60"
                >
                  {loggingIn ? 'Signing In...' : 'Sign In to Hotel'}
                </button>
              </form>
            </div>

            <div className="mx-4 mb-4 rounded-[2px] border border-[#cbd5e1] bg-[#f4f8fc] p-3 text-[11px] text-[#334155] space-y-1.5">
              <p className="font-bold text-[#1d4e78]">What&apos;s Waiting Inside Today:</p>
              <ul className="space-y-1 text-[11px]">
                <li className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 bg-[#0284c7] shrink-0" />
                  <span><strong>The Lido &amp; Rooftop Pool</strong> — change swimwear &amp; dive in!</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 bg-[#d97706] shrink-0" />
                  <span><strong>108+ Furni &amp; Rares</strong> — Thrones, Dragon Lamps &amp; Battle Banzai.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 bg-[#16a34a] shrink-0" />
                  <span><strong>Live Friends &amp; 64 Badges</strong> — earn shaped crests, adopt pets, and design suites.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* REGISTRATION BOX */}
          <section className="habbo-box md:col-span-6">
            <div className="habbo-box-header habbo-header-green flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5 text-[#fef08a]" />
              New to PIXL Hotel? Register Free!
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-4 space-y-3">
              <div className="flex items-center gap-3 rounded-[2px] border border-[#94a3b8] bg-[#f4f8fc] p-2.5">
                <div className="flex h-24 w-20 flex-col items-center justify-end rounded-[2px] border border-[#000000] bg-gradient-to-b from-[#9fd9fc] to-[#e2f2fe] pb-1.5 shrink-0">
                  <PixelAvatarCanvas
                    look={{ ...regLook, gender: regGender }}
                    dir={0}
                    pose="wave"
                    scale={1}
                  />
                  <span className="mt-0.5 rounded-[2px] border border-[#000000] bg-[#1e293b] px-1.5 py-0.2 font-pixel text-[8px] text-[#fde047]">
                    {regGender === 'F' ? 'GIRL (F)' : 'BOY (M)'}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-[11px] font-bold text-[#1d4e78]">Quick Starter Look</p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-testid="reg-gender-m-btn"
                        onClick={() => handleSelectGender('M')}
                        className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                          regGender === 'M'
                            ? 'border-[#000000] bg-[#2b6ca3] text-white'
                            : 'border-[#94a3b8] bg-white text-[#1f2937]'
                        }`}
                      >
                        Boy (M)
                      </button>
                      <button
                        type="button"
                        data-testid="reg-gender-f-btn"
                        onClick={() => handleSelectGender('F')}
                        className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                          regGender === 'F'
                            ? 'border-[#000000] bg-[#db2777] text-white'
                            : 'border-[#94a3b8] bg-white text-[#1f2937]'
                        }`}
                      >
                        Girl (F)
                      </button>
                      <button
                        type="button"
                        data-testid="reg-cycle-preset-btn"
                        onClick={handleCyclePreset}
                        className="rounded-[2px] border border-[#000000] bg-[#fef08a] px-2 py-0.5 text-[10px] font-bold text-[#1e293b] cursor-pointer hover:bg-[#fde047]"
                      >
                        Next Outfit &rsaquo;
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(regGender === 'F' ? QUICK_HAIRS_F : QUICK_HAIRS_M).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() =>
                          setRegLook((l) => ({ ...l, gender: regGender, hairStyle: h.id }))
                        }
                        className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                          regLook.hairStyle === h.id
                            ? 'border-[#000000] bg-[#2b6ca3] text-white'
                            : 'border-[#94a3b8] bg-white text-[#1f2937]'
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#475569]">Top:</span>
                    {CLOTHING_PALETTE.slice(0, 6).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={`Starter shirt ${c.name}`}
                        onClick={() =>
                          setRegLook((l) => ({ ...l, gender: regGender, shirtColor: c.hex }))
                        }
                        className={`h-4 w-4 rounded-[2px] border cursor-pointer ${
                          regLook.shirtColor === c.hex ? 'border-[#000000] scale-110' : 'border-[#94a3b8]'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                    <span className="text-[10px] font-bold text-[#475569] ml-1">Hair:</span>
                    {HAIR_PALETTE.slice(0, 5).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={`Starter hair ${c.name}`}
                        onClick={() =>
                          setRegLook((l) => ({ ...l, gender: regGender, hairColor: c.hex }))
                        }
                        className={`h-4 w-4 rounded-[2px] border cursor-pointer ${
                          regLook.hairColor === c.hex ? 'border-[#000000] scale-110' : 'border-[#94a3b8]'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="reg-username" className="block text-[11px] font-bold text-[#1f2937]">
                  Choose PIXL Name
                </label>
                <input
                  id="reg-username"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="3-18 characters (letters, numbers, _ -)"
                  className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#111827] focus:border-[#3d8b18] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-password" className="block text-[11px] font-bold text-[#1f2937]">
                    Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 4 characters"
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#111827] focus:border-[#3d8b18] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="reg-confirm" className="block text-[11px] font-bold text-[#1f2937]">
                    Confirm Password
                  </label>
                  <input
                    id="reg-confirm"
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#111827] focus:border-[#3d8b18] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="reg-mail" className="block text-[11px] font-bold text-[#1f2937]">
                    Email (optional)
                  </label>
                  <input
                    id="reg-mail"
                    type="email"
                    value={regMail}
                    onChange={(e) => setRegMail(e.target.value)}
                    placeholder="citizen@pixlhotel.ch"
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#111827] focus:border-[#3d8b18] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="reg-gender" className="block text-[11px] font-bold text-[#1f2937]">
                    Gender
                  </label>
                  <select
                    id="reg-gender"
                    value={regGender}
                    onChange={(e) => handleSelectGender(e.target.value as 'M' | 'F')}
                    className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2 py-1.5 text-[12px] font-bold text-[#111827] focus:border-[#3d8b18] focus:outline-none"
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="reg-motto" className="block text-[11px] font-bold text-[#1f2937]">
                  Starting Motto (optional)
                </label>
                <input
                  id="reg-motto"
                  type="text"
                  maxLength={64}
                  value={regMotto}
                  onChange={(e) => setRegMotto(e.target.value)}
                  placeholder="e.g. Ready to decorate my suite!"
                  className="mt-1 w-full rounded-[2px] border border-[#000000] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#111827] focus:border-[#3d8b18] focus:outline-none"
                />
              </div>

              {regFeedback && (
                <p
                  role="alert"
                  className={`rounded-[2px] border px-3 py-1.5 text-[11px] font-bold ${
                    regFeedback.ok
                      ? 'border-[#1f4f09] bg-[#ecfdf5] text-[#14532d]'
                      : 'border-[#7f1d1d] bg-[#fef2f2] text-[#991b1b]'
                  }`}
                >
                  {regFeedback.text}
                </p>
              )}

              <button
                type="submit"
                disabled={registering}
                className="habbo-btn-blue w-full py-2 font-pixel text-xs cursor-pointer disabled:opacity-60"
              >
                {registering ? 'Creating Account...' : 'Create PIXL Account'}
              </button>
            </form>
          </section>
        </div>

        {/* PANORAMIC HABBO PIXEL-ART HOTEL SCENE SHOWCASE BANNER */}
        <section className="habbo-box overflow-hidden" data-testid="auth-panoramic-showcase">
          <div className="habbo-box-header habbo-header-orange flex items-center justify-between">
            <span>Inside PIXL Hotel — Live Isometric Rooms, Lido Pool &amp; Rare Trading</span>
            <span className="font-mono-num text-[10px] text-amber-100">2008 Shockwave Edition</span>
          </div>

          <div className="relative min-h-[220px] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#3b82f6] via-[#7dd3fc] to-[#bae6fd] p-4 sm:p-5">
            {/* Pixel-Art Isometric Hotel Terrace & Pool Panorama SVG Background */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90"
              viewBox="0 0 960 240"
              preserveAspectRatio="xMidYMax slice"
              shapeRendering="crispEdges"
              aria-hidden="true"
            >
              {/* Distant Pixel Clouds */}
              <rect x="48" y="18" width="64" height="10" fill="#ffffff" opacity="0.85" />
              <rect x="36" y="24" width="88" height="8" fill="#ffffff" opacity="0.85" />
              <rect x="420" y="14" width="76" height="10" fill="#ffffff" opacity="0.8" />
              <rect x="404" y="20" width="108" height="8" fill="#ffffff" opacity="0.8" />
              <rect x="760" y="22" width="56" height="10" fill="#ffffff" opacity="0.85" />

              {/* Classic Orange Habbo Hotel Tower Facade on Left */}
              <rect x="24" y="42" width="168" height="148" fill="#d97706" />
              <rect x="28" y="46" width="160" height="140" fill="#f59e0b" />
              <rect x="20" y="36" width="176" height="8" fill="#92400e" />
              {/* Hotel Windows Grid */}
              {[58, 86, 114, 142].map((wy) =>
                [42, 74, 106, 138, 162].map((wx) => (
                  <g key={`${wx}-${wy}`}>
                    <rect x={wx} y={wy} width="18" height="18" fill="#1e293b" />
                    <rect x={wx + 2} y={wy + 2} width="14" height="14" fill="#fef08a" />
                  </g>
                ))
              )}

              {/* Checkered Marble Terrace Deck */}
              <rect x="0" y="168" width="960" height="72" fill="#d6d3d1" />
              <rect x="0" y="168" width="960" height="6" fill="#78716c" />
              {/* Turquoise Lido Swimming Pool Basin */}
              <rect x="230" y="176" width="460" height="56" fill="#0284c7" />
              <rect x="236" y="180" width="448" height="48" fill="#38bdf8" />
              {/* White Pool Water Sparkles */}
              <rect x="280" y="192" width="28" height="4" fill="#e0f2fe" />
              <rect x="390" y="204" width="36" height="4" fill="#e0f2fe" />
              <rect x="520" y="190" width="32" height="4" fill="#e0f2fe" />
              <rect x="610" y="208" width="24" height="4" fill="#e0f2fe" />

              {/* Pixel Palm Trees */}
              <rect x="208" y="106" width="10" height="64" fill="#92400e" />
              <rect x="186" y="94" width="54" height="14" fill="#16a34a" />
              <rect x="194" y="84" width="38" height="12" fill="#22c55e" />

              <rect x="708" y="102" width="10" height="68" fill="#92400e" />
              <rect x="686" y="90" width="54" height="14" fill="#16a34a" />
              <rect x="694" y="80" width="38" height="12" fill="#22c55e" />
            </svg>

            {/* Foreground Interactive Showcase Overlay */}
            <div className="relative z-10 flex flex-col items-center justify-between gap-4 lg:flex-row">
              {/* Animated Pixel Citizens & Speech Bubbles */}
              <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-5">
                <div className="flex flex-col items-center">
                  <div className="mb-1 rounded-[3px] border border-[#000000] bg-white px-2 py-0.5 text-[10px] font-bold text-[#111827] shadow-[0_1px_0_#000]">
                    <span className="font-extrabold">Krawattenmanni:</span> Welcome to PIXL Hotel!
                  </div>
                  <div className="flex h-24 w-20 items-end justify-center rounded-[2px] border border-[#000000] bg-white/85 pb-1 shadow-[0_2px_0_rgba(0,0,0,0.3)]">
                    <PixelAvatarCanvas look={ADMIN_PLAYER_STATE.look} dir={0} pose="wave" scale={1} />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="mb-1 rounded-[3px] border border-[#000000] bg-[#fef08a] px-2 py-0.5 text-[10px] font-bold text-[#111827] shadow-[0_1px_0_#000]">
                    <span className="font-extrabold">Pixie:</span> Meet us at The Lido Deck!
                  </div>
                  <div className="flex h-24 w-20 items-end justify-center rounded-[2px] border border-[#000000] bg-white/85 pb-1 shadow-[0_2px_0_rgba(0,0,0,0.3)]">
                    <PixelAvatarCanvas
                      look={{ ...FEMALE_STARTER_PRESETS[0], gender: 'F', accessory: 'none' }}
                      dir={1}
                      pose="stand"
                      scale={1}
                    />
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-center">
                  <div className="mb-1 rounded-[3px] border border-[#000000] bg-white px-2 py-0.5 text-[10px] font-bold text-[#111827] shadow-[0_1px_0_#000]">
                    <span className="font-extrabold">Marco:</span> Trading Thrones &amp; Dragons!
                  </div>
                  <div className="flex h-24 w-20 items-end justify-center rounded-[2px] border border-[#000000] bg-white/85 pb-1 shadow-[0_2px_0_rgba(0,0,0,0.3)]">
                    <PixelAvatarCanvas
                      look={{ ...MALE_STARTER_PRESETS[1], gender: 'M' }}
                      dir={0}
                      pose="wave"
                      scale={1}
                    />
                  </div>
                </div>
              </div>

              {/* Right Callout Card + Official Shaped Badges Strip */}
              <div className="w-full max-w-md rounded-[3px] border border-[#000000] bg-white/95 p-3.5 shadow-[0_3px_0_rgba(0,0,0,0.28)] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-pixel text-xs text-[#0f3454]">
                    Check In to the 2008 Shockwave World
                  </h2>
                  <span className="rounded-[2px] border border-[#000000] bg-[#16a34a] px-1.5 py-0.5 font-pixel text-[8px] text-white">
                    FREE TO PLAY
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#334155]">
                  Create your volumetric pixel citizen, dive off The Lido high board, collect 108+ isometric furni &amp; rares, earn 64 shaped pixel badges, and chat live in Realtime rooms!
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#cbd5e1]">
                  <div className="flex items-center gap-1.5">
                    {BADGE_CATALOGUE.slice(0, 6).map((b) => (
                      <div
                        key={b.id}
                        title={b.name}
                        className="rounded-[2px] border border-[#000000] bg-[#f8fafc] p-1"
                      >
                        <PixelBadgeSprite badgeId={b.id} unlocked size={28} />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="habbo-btn-green px-3 py-1.5 text-[11px] font-bold cursor-pointer"
                  >
                    Instant Check-In &rsaquo;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* CLASSIC HABBO FOOTER ANCHORED TO BOTTOM */}
      <footer className="border-t border-[#000000] bg-[#0f3454] py-3 px-4 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 sm:flex-row text-[11px]">
          <div className="flex items-center gap-2">
            <span className="rounded-[2px] border border-[#000000] bg-[#f5b400] px-1.5 py-0.5 font-pixel text-[9px] font-bold text-[#111827]">
              PIXL HOTEL
            </span>
            <span className="text-[#bae6fd] font-semibold">
              &copy; 2008–2026 PIXL Hotel Retro Community · Isometric Shockwave Client &amp; HoloCMS
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#93c5fd]">
            <span>The PIXL Way</span>
            <span>&middot;</span>
            <span>64 Shaped Badges</span>
            <span>&middot;</span>
            <span>108+ Pixel Furni</span>
            <span>&middot;</span>
            <span>Live Realtime Sync</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

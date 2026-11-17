import { useState } from 'react';
import { Ban, KeyRound, UserPlus } from 'lucide-react';
import { formatOnlineCountLabel } from '../../game/clientFeatures';
import {
  ADMIN_PLAYER_STATE,
  BADGE_CATALOGUE,
  CLOTHING_PALETTE,
  DEFAULT_LOOK,
  HAIR_PALETTE,
} from '../../game/data';
import type { HairStyle, LookConfig } from '../../game/types';
import { PixelAvatarCanvas, PixelBadgeSprite } from '../PixelSpriteCanvas';

interface AuthPortalProps {
  onlineCount?: number;
  onLogin: (
    username: string,
    password: string
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

const QUICK_HAIRS: { id: HairStyle; label: string }[] = [
  { id: 'quiff', label: 'Quiff' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'bob', label: 'Bob' },
  { id: 'long', label: 'Long' },
];

export function AuthPortal({
  onlineCount = 0,
  onLogin,
  onRegister,
  onContinueAsGuest,
}: AuthPortalProps) {
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginFeedback, setLoginFeedback] = useState<{
    ok: boolean;
    banned?: boolean;
    text: string;
  } | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [regName, setRegName] = useState('');
  const [regMail, setRegMail] = useState('');
  const [regGender, setRegGender] = useState<'M' | 'F'>('M');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regMotto, setRegMotto] = useState('');
  const [regLook, setRegLook] = useState<LookConfig>(() => ({ ...DEFAULT_LOOK }));
  const [regFeedback, setRegFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [registering, setRegistering] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await onLogin(loginName, loginPassword);
      setLoginFeedback({ ok: res.ok, banned: res.banned, text: res.message });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const res = await onRegister(
        regName,
        regPassword,
        regConfirm,
        regMotto,
        regLook,
        regMail,
        regGender
      );
      setRegFeedback({ ok: res.ok, text: res.message });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden habbo-bg-sky flex flex-col">
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
                    {loginFeedback.banned && <Ban className="h-4 w-4 shrink-0 text-[#fde047] mt-0.5" />}
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
                  <span><strong>52+ Furni &amp; Rares</strong> — Thrones, Dragon Lamps &amp; Battle Banzai.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 bg-[#16a34a] shrink-0" />
                  <span><strong>Live Friends &amp; Badges</strong> — earn crests, adopt pets, and design custom suites.</span>
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
                <div className="flex h-20 w-16 items-end justify-center rounded-[2px] border border-[#000000] bg-gradient-to-b from-[#9fd9fc] to-[#e2f2fe] pb-1 shrink-0">
                  <PixelAvatarCanvas look={regLook} dir={0} pose="wave" scale={1} />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[11px] font-bold text-[#1d4e78]">Quick Starter Look</p>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_HAIRS.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setRegLook((l) => ({ ...l, hairStyle: h.id }))}
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
                    {CLOTHING_PALETTE.slice(0, 5).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={`Starter shirt ${c.name}`}
                        onClick={() => setRegLook((l) => ({ ...l, shirtColor: c.hex }))}
                        className={`h-4 w-4 rounded-[2px] border cursor-pointer ${
                          regLook.shirtColor === c.hex ? 'border-[#000000] scale-110' : 'border-[#94a3b8]'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                    <span className="text-[10px] font-bold text-[#475569] ml-1">Hair:</span>
                    {HAIR_PALETTE.slice(0, 4).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={`Starter hair ${c.name}`}
                        onClick={() => setRegLook((l) => ({ ...l, hairColor: c.hex }))}
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
                    onChange={(e) => setRegGender(e.target.value as 'M' | 'F')}
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

        {/* WELCOME SHOWCASE */}
        <section className="habbo-box">
          <div className="habbo-box-header habbo-header-orange">Inside PIXL Hotel</div>
          <div className="flex flex-col items-center justify-between gap-5 p-4 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-20 items-end justify-center rounded-[2px] border border-[#000000] bg-gradient-to-b from-[#9fd9fc] to-[#e2f2fe] pb-1.5 shrink-0">
                <PixelAvatarCanvas look={ADMIN_PLAYER_STATE.look} dir={0} pose="wave" scale={1} />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-[#111827]">
                  Welcome to PIXL Hotel
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-[#475569] max-w-md">
                  Register your own persistent PIXL account, dive off The Lido diving board, browse 52 retro Catalogue furnis, collect 5 clickable badges, and check into the Isometric Client!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {BADGE_CATALOGUE.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  title={b.name}
                  className="rounded-[2px] border border-[#000000] bg-[#f8fafc] p-1"
                >
                  <PixelBadgeSprite badgeId={b.id} unlocked size={32} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

import { useState } from 'react';
import { Ban, KeyRound, UserPlus } from 'lucide-react';
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
  onLogin: (username: string, password: string) => { ok: boolean; banned?: boolean; message: string };
  onRegister: (
    username: string,
    password: string,
    confirmPassword: string,
    motto: string,
    look?: LookConfig
  ) => { ok: boolean; message: string };
  onContinueAsGuest: () => void;
}

const QUICK_HAIRS: { id: HairStyle; label: string }[] = [
  { id: 'quiff', label: 'Quiff' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'bob', label: 'Bob' },
  { id: 'long', label: 'Long' },
];

export function AuthPortal({ onLogin, onRegister, onContinueAsGuest }: AuthPortalProps) {
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginFeedback, setLoginFeedback] = useState<{
    ok: boolean;
    banned?: boolean;
    text: string;
  } | null>(null);

  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regMotto, setRegMotto] = useState('');
  const [regLook, setRegLook] = useState<LookConfig>(() => ({ ...DEFAULT_LOOK }));
  const [regFeedback, setRegFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onLogin(loginName, loginPassword);
    setLoginFeedback({ ok: res.ok, banned: res.banned, text: res.message });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onRegister(regName, regPassword, regConfirm, regMotto, regLook);
    setRegFeedback({ ok: res.ok, text: res.message });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#bce0fd] flex flex-col">
      {/* Sunny PIXL Hotel Frontpage Header */}
      <header className="relative overflow-hidden border-b-4 border-[#1b5a8a] bg-gradient-to-b from-[#6ec2f7] via-[#9bd6fb] to-[#bce0fd] py-5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-85" aria-hidden="true">
          <svg className="absolute left-6 top-2 h-9 w-36" viewBox="0 0 120 32" shapeRendering="crispEdges">
            <rect x="20" y="8" width="60" height="16" fill="#ffffff" />
            <rect x="8" y="14" width="84" height="12" fill="#ffffff" />
            <rect x="32" y="2" width="32" height="10" fill="#ffffff" />
          </svg>
          <svg className="absolute right-12 top-3 h-10 w-40" viewBox="0 0 140 32" shapeRendering="crispEdges">
            <rect x="30" y="6" width="72" height="16" fill="#ffffff" />
            <rect x="14" y="13" width="104" height="13" fill="#ffffff" />
          </svg>
        </div>

        <div className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 rounded-lg border-2 border-[#1b1922] bg-gradient-to-b from-[#ffe44d] to-[#f5b400] px-3.5 py-2 shadow-[0_4px_0_#9e6e00]">
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                <rect x="6" y="1" width="4" height="2" fill="#dc2626" />
                <rect x="4" y="3" width="8" height="2" fill="#2563eb" />
                <rect x="2" y="5" width="12" height="6" fill="#1e293b" />
                <rect x="3" y="6" width="4" height="4" fill="#38bdf8" />
                <rect x="9" y="6" width="4" height="4" fill="#facc15" />
                <rect x="4" y="11" width="8" height="3" fill="#0f172a" />
              </svg>
              <span className="font-pixel text-xl sm:text-2xl tracking-wider text-[#1b1922]">PIXL</span>
              <span className="rounded bg-[#9e1b1b] px-1.5 py-0.5 font-pixel text-[9px] font-bold text-[#fef08a]">
                HOTEL
              </span>
            </div>
            <div>
              <h1 className="font-pixel text-sm sm:text-lg text-[#0f3454]">
                Make friends, build rooms, collect rares!
              </h1>
              <p className="text-xs font-semibold text-[#1e4a6d]">
                PIXL CMS v2.6 Portal &amp; 3/4 Isometric Pixel World
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueAsGuest}
            className="habbo-btn-green rounded-md px-4 py-2 text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            Continue as Guest (PixelGuest) &rsaquo;
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* SIGN IN BOX */}
          <section className="habbo-box md:col-span-6">
            <div className="habbo-box-header flex items-center gap-2 bg-[#2c6e9b]">
              <KeyRound className="h-4 w-4 text-[#ffd400]" />
              Sign In to PIXL Hotel
            </div>

            <form onSubmit={handleLoginSubmit} className="p-5 space-y-4">
              <div>
                <label htmlFor="login-username" className="block text-xs font-bold text-slate-700">
                  PIXL Name
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="e.g. PixelHero"
                  className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password..."
                  className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#2c6e9b] focus:outline-none"
                />
              </div>

              {loginFeedback && (
                <div
                  role="alert"
                  data-testid={loginFeedback.banned ? 'login-ban-alert' : 'login-feedback'}
                  className={`flex items-start gap-2 rounded border-2 px-3 py-2.5 text-xs font-bold ${
                    loginFeedback.ok
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : loginFeedback.banned
                      ? 'border-[#7f1d1d] bg-[#9e1b1b] text-white shadow-md'
                      : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}
                >
                  {loginFeedback.banned && <Ban className="h-4 w-4 shrink-0 text-[#fde047] mt-0.5" />}
                  <span>{loginFeedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="habbo-btn-green w-full rounded-md py-2.5 font-pixel text-sm cursor-pointer"
              >
                Sign In to Hotel
              </button>
            </form>
          </section>

          {/* REGISTRATION BOX */}
          <section className="habbo-box md:col-span-6">
            <div className="habbo-box-header flex items-center gap-2 bg-[#549600]">
              <UserPlus className="h-4 w-4 text-[#fef08a]" />
              New to PIXL Hotel? Register Free!
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-5 space-y-3.5">
              <div className="flex items-center gap-3 rounded-lg border border-[#c8d6e5] bg-[#f4f8fc] p-2.5">
                <div className="flex h-20 w-16 items-end justify-center rounded border border-[#9cc2df] bg-gradient-to-b from-[#9fd9fc] to-[#e2f2fe] pb-1 shrink-0">
                  <PixelAvatarCanvas look={regLook} dir={0} pose="wave" scale={1} />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[11px] font-extrabold text-[#1e4a6d]">Quick Starter Look</p>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_HAIRS.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setRegLook((l) => ({ ...l, hairStyle: h.id }))}
                        className={`rounded border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                          regLook.hairStyle === h.id
                            ? 'border-[#2c6e9b] bg-[#2c6e9b] text-white'
                            : 'border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">Top:</span>
                    {CLOTHING_PALETTE.slice(0, 5).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={`Starter shirt ${c.name}`}
                        onClick={() => setRegLook((l) => ({ ...l, shirtColor: c.hex }))}
                        className={`h-4 w-4 rounded border cursor-pointer ${
                          regLook.shirtColor === c.hex ? 'border-slate-950 scale-110' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                    <span className="text-[10px] font-bold text-slate-500 ml-1">Hair:</span>
                    {HAIR_PALETTE.slice(0, 4).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={`Starter hair ${c.name}`}
                        onClick={() => setRegLook((l) => ({ ...l, hairColor: c.hex }))}
                        className={`h-4 w-4 rounded border cursor-pointer ${
                          regLook.hairColor === c.hex ? 'border-slate-950 scale-110' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="reg-username" className="block text-xs font-bold text-slate-700">
                  Choose PIXL Name
                </label>
                <input
                  id="reg-username"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="3-18 characters (letters, numbers, _ -)"
                  className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-[#549600] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-password" className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 4 characters"
                    className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-[#549600] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="reg-confirm" className="block text-xs font-bold text-slate-700">
                    Confirm Password
                  </label>
                  <input
                    id="reg-confirm"
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-[#549600] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-motto" className="block text-xs font-bold text-slate-700">
                  Starting Motto (optional)
                </label>
                <input
                  id="reg-motto"
                  type="text"
                  maxLength={64}
                  value={regMotto}
                  onChange={(e) => setRegMotto(e.target.value)}
                  placeholder="e.g. Ready to decorate my suite!"
                  className="mt-1 w-full rounded border-2 border-[#c8d6e5] bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-[#549600] focus:outline-none"
                />
              </div>

              {regFeedback && (
                <p
                  role="alert"
                  className={`rounded border px-3 py-2 text-xs font-bold ${
                    regFeedback.ok
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}
                >
                  {regFeedback.text}
                </p>
              )}

              <button
                type="submit"
                className="habbo-btn-blue w-full rounded-md py-2.5 font-pixel text-sm cursor-pointer"
              >
                Create PIXL Account
              </button>
            </form>
          </section>
        </div>

        {/* WELCOME SHOWCASE */}
        <section className="habbo-box">
          <div className="habbo-box-header bg-[#f37021]">Inside PIXL Hotel</div>
          <div className="flex flex-col items-center justify-between gap-6 p-5 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-28 w-24 items-end justify-center rounded-lg border-2 border-[#9cc2df] bg-gradient-to-b from-[#9fd9fc] to-[#e2f2fe] pb-2 shrink-0">
                <PixelAvatarCanvas look={ADMIN_PLAYER_STATE.look} dir={0} pose="wave" scale={1} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Welcome to PIXL Hotel
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 max-w-md">
                  Register your own persistent PIXL account, customize your 3/4 isometric avatar in the Wardrobe, collect badges &amp; rares, and step into the PIXL Hotel Client.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {BADGE_CATALOGUE.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  title={b.name}
                  className="rounded border border-slate-200 bg-slate-50 p-1"
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

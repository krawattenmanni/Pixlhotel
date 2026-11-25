import type { BadgeCategory, BadgeDef, LanguageCode } from './types';

export type CanonicalBadgeCategory =
  | 'Achievements'
  | 'Games & Rooms'
  | 'Rares'
  | 'Events & Seasonal'
  | 'Staff & VIP';

export type BadgeCategoryFilter = 'all' | CanonicalBadgeCategory;

const LANG_STORAGE_KEY = 'pixlhotel_lang';

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    nav_me: 'Me',
    nav_friends: 'Players & Friends',
    nav_wardrobe: 'Wardrobe',
    nav_community: 'Community',
    nav_badges: 'Badges',
    nav_staff: 'Staff',
    nav_shop: 'Shop & Vouchers',
    nav_housekeeping: 'Housekeeping',
    enter_hotel: 'Enter PIXLHotel',
    sign_out: 'Sign Out',
    welcome_user: 'Welcome',
    badges_page_title: 'Badge Guide & Collection',
    badges_page_subtitle:
      'Collect all 64+ official shaped pixel badges across PIXL Hotel! Click any badge to inspect how to obtain it or equip it to your 5 active profile slots.',
    badges_progress: 'Your Badge Collection: {unlocked} / {total} Unlocked',
    badges_search_placeholder: 'Search badge name, [CODE], or how to obtain...',
    cat_all: 'All',
    cat_achievements: 'Achievements',
    cat_games_rooms: 'Games & Rooms',
    cat_rares: 'Rares',
    cat_events: 'Events & Seasonal',
    cat_staff_vip: 'Staff & VIP',
    unlocked: 'Unlocked',
    locked: 'Locked',
    equipped: 'Equipped',
    how_to_obtain: 'How to obtain:',
    wear_badge: 'Wear Badge',
    unequip_badge: 'Equipped (Click to Unequip)',
    badge_inspector_title: 'Badge Inspector & Equip',
    active_badge_slots: 'Equipped Profile Badges (Max 5)',
    new_badge_received: 'New Badge Received!',
    new_badge_congrats: 'Congratulations! You have unlocked a new PIXL Badge:',
    wear_now: 'Wear Now',
    ok_btn: 'OK',
    newBadgeReceived: 'New Badge Received!',
    youUnlockedNewBadge: 'Congratulations! You have unlocked a new PIXL Badge:',
    badgeUnlockedHint: 'Official PIXL Hotel collector badge.',
    wearNow: 'Wear Now',
    okBtn: 'OK',
    delete_room: 'Delete Room',
    delete_btn: 'Delete',
    confirm_prompt: 'Confirm?',
    room_deleted: 'Room was deleted.',
  },
  de: {
    nav_me: 'Ich',
    nav_friends: 'Spieler & Freunde',
    nav_wardrobe: 'Kleiderschrank',
    nav_community: 'Community',
    nav_badges: 'Badges',
    nav_staff: 'Staff',
    nav_shop: 'Shop & Codes',
    nav_housekeeping: 'Housekeeping',
    enter_hotel: 'Ins PIXLHotel einchecken',
    sign_out: 'Abmelden',
    welcome_user: 'Willkommen',
    badges_page_title: 'Badge-Lexikon & Sammlung',
    badges_page_subtitle:
      'Sammle alle 64+ offiziellen Pixel-Badges im PIXL Hotel! Klicke auf ein Badge, um den Fundort zu sehen oder es in deinen 5 Profil-Slots zu tragen.',
    badges_progress: 'Deine Badge-Sammlung: {unlocked} / {total} freigeschaltet',
    badges_search_placeholder: 'Suche nach Badge-Name, [CODE] oder Fundort...',
    cat_all: 'Alle',
    cat_achievements: 'Erfolge',
    cat_games_rooms: 'Spiele & Räume',
    cat_rares: 'Rares',
    cat_events: 'Events & Saison',
    cat_staff_vip: 'Staff & VIP',
    unlocked: 'Freigeschaltet',
    locked: 'Gesperrt',
    equipped: 'Getragen',
    how_to_obtain: 'Woher man es bekommt:',
    wear_badge: 'Badge anlegen',
    unequip_badge: 'Angelegt (Klicken zum Ablegen)',
    badge_inspector_title: 'Badge-Inspektor & Anlegen',
    active_badge_slots: 'Aktive Profil-Badges (Max. 5)',
    new_badge_received: 'Neues Badge erhalten!',
    new_badge_congrats: 'Glückwunsch! Du hast ein neues PIXL-Badge freigeschaltet:',
    wear_now: 'Anlegen',
    ok_btn: 'OK',
    newBadgeReceived: 'Neues Badge erhalten!',
    youUnlockedNewBadge: 'Glückwunsch! Du hast ein neues PIXL-Badge freigeschaltet:',
    badgeUnlockedHint: 'Offizielles PIXL Hotel Sammler-Badge.',
    wearNow: 'Anlegen',
    okBtn: 'OK',
    delete_room: 'Raum löschen',
    delete_btn: 'Löschen',
    confirm_prompt: 'Sicher?',
    room_deleted: 'Der Raum wurde gelöscht.',
  },
};

export function t(
  lang: LanguageCode,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
  let template = dict[key] ?? TRANSLATIONS.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return template;
}

export function loadSavedLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'de' || saved === 'en') return saved;
  } catch {
    // ignore storage errors
  }
  return 'en';
}

export function saveLanguagePreference(lang: LanguageCode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore storage errors
  }
}

export function normalizeBadgeCategoryGroup(
  category: BadgeCategory | string | undefined
): CanonicalBadgeCategory {
  const raw = (category ?? '').trim();
  if (
    raw === 'Games & Rooms' ||
    raw === 'Explore & Games'
  ) {
    return 'Games & Rooms';
  }
  if (
    raw === 'Rares' ||
    raw === 'Rares & Builder'
  ) {
    return 'Rares';
  }
  if (raw === 'Events & Seasonal') {
    return 'Events & Seasonal';
  }
  if (
    raw === 'Staff & VIP' ||
    raw === 'Loyalty & VIP' ||
    raw === 'Staff & Community'
  ) {
    return 'Staff & VIP';
  }
  return 'Achievements';
}

const DE_BADGE_OVERRIDES: Record<
  string,
  { name: string; description: string; unlockHint: string }
> = {
  badge_admin: {
    name: 'Hotel-Gründer & Admin',
    description: 'Gold-rotes Flügelschild für den offiziellen Hotel-Gründer und Administrator.',
    unlockHint: 'Reserviert für den offiziellen Hotel-Admin (Rank 5).',
  },
  badge_mod: {
    name: 'Sicherheits-Moderator',
    description: 'Poliertes silbernes Polizeischild für Hotel-Moderatoren.',
    unlockHint: 'Wird an offizielle PIXL Hotel Moderatoren (Rank 4+) verliehen.',
  },
  badge_hc: {
    name: 'PIXL Club Mitglied',
    description: 'Offizielles Mitglied im exklusiven PIXL Club (PC)!',
    unlockHint: 'Werde Mitglied im PIXL Club (PC-Tage im Shop oder per Code einlösen).',
  },
  PC2: {
    name: 'PIXL Club Gold-Veteran',
    description: 'Langjähriger VIP-Veteran der exklusiven PIXL Club-Mitgliedschaft!',
    unlockHint: 'Sammle mindestens 30 Tage aktive PIXL Club (PC) Mitgliedschaft.',
  },
  badge_checkin: {
    name: 'Erster Check-In',
    description: 'Offizieller goldener Hotelschlüssel für deinen ersten Besuch im PIXL Hotel.',
    unlockHint: 'Automatisch beim ersten Check-In ins PIXL Hotel freigeschaltet.',
  },
  badge_dragon: {
    name: 'Drachenhüter',
    description: 'Feuriges Drachen-Emblem für Sammler der seltenen Feuerdrachen-Lampe.',
    unlockHint: 'Besitze eine Feuerdrachen-Lampe oder löse den Code DRAGON ein.',
  },
  badge_lido: {
    name: 'Lido Turmspringer',
    description: 'Sonniges Lido-Pool-Abzeichen für mutige Springer vom hohen Sprungturm.',
    unlockHint: 'Springe im Lido Deck vom hohen Sprungbrett ins Wasser.',
  },
  badge_banzai: {
    name: 'Battle Banzai Champion',
    description: 'Leuchtender Arena-Stern für Champions der Battle Banzai Arena.',
    unlockHint: 'Gewinne eine Runde in der Battle Banzai Arena.',
  },
};

export function getLocalizedBadgeMeta(
  badge: BadgeDef,
  lang: LanguageCode
): { name: string; description: string; unlockHint: string } {
  if (lang === 'de') {
    const override = DE_BADGE_OVERRIDES[badge.id];
    return {
      name: badge.nameDe || override?.name || badge.name,
      description:
        badge.descriptionDe ||
        override?.description ||
        `${badge.description} (Offizielles [${badge.code}] Sammler-Badge)`,
      unlockHint:
        badge.unlockHintDe ||
        override?.unlockHint ||
        `So erhältst du es: ${badge.unlockHint}`,
    };
  }
  return {
    name: badge.name,
    description: badge.description,
    unlockHint: badge.unlockHint,
  };
}

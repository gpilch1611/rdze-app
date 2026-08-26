import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  Compass,
  Download,
  Flame,
  Hand,
  HeartPulse,
  Leaf,
  Lock,
  Menu,
  Minus,
  Moon,
  Play,
  Plus,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Timer,
  Upload,
  UserRound,
  Volume2,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  BREATH_DESC,
  BREATH_LEVELS,
  BREATH_NAMES,
  KEGEL_DESC,
  KEGEL_LEVELS,
  pick,
  translations,
  type Dict,
  type Lang,
} from './i18n';
import { loadData as loadFromDB, saveData as saveToDB } from './storage';
import { WORKOUTS, getWorkoutById, type Workout } from './workouts';
import { WORKOUT_EDUCATION } from './workoutEducation';

type View = 'today' | 'progress' | 'journal' | 'library' | 'profile';
type Theme = 'dark' | 'light';
type KegelMode = 'normal' | 'reverse';
type Session = {
  type: 'kegel' | 'breathing';
  date: string;
  minutes?: number;
  mode?: KegelMode;
  workoutId?: string;
};

type JournalEntry = {
  date: string;
  tension: number;
  mood: number;
  note: string;
  control?: number;
};

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type Profile = {
  selectedWorkouts: string[];
  difficulty: Difficulty; // stara wartosc globalna - zachowana dla migracji, nie uzywana do nowych zapisow
  workoutDifficulty?: Record<string, Difficulty>; // poziom per konkretny trening
  hasCompletedOnboarding: boolean;
  weeklyGoalDays?: number; // ile dni w tygodniu z Kegiem chcesz trenowac (domyslnie 5)
  soundEnabled?: boolean; // dzwiek przy zmianie fazy oddechu
  dismissedDifficultySuggestions?: string[]; // ktore sugestie podniesienia poziomu juz odrzucono
};

const DEFAULT_WEEKLY_GOAL = 5;

// Poziom umiejetnosci (1-9, z regularnosci treningu) to INNY system niz
// poziom trudnosci sesji (Poczatkujacy/Sredni/Zaawansowany, wybierany
// recznie). Ta funkcja laczy je: przy odpowiednio wysokim poziomie
// umiejetnosci SUGERUJEMY wyzszy poziom trudnosci, ale nigdy nie zmieniamy
// go bez zgody uzytkownika.
function suggestedDifficultyForLevel(level: number): Difficulty | null {
  if (level >= 7) return 'advanced';
  if (level >= 4) return 'intermediate';
  return null;
}

function difficultyRank(d: Difficulty): number {
  return d === 'advanced' ? 2 : d === 'intermediate' ? 1 : 0;
}

// Zwraca poziom trudnosci dla danego treningu - najpierw sprawdza mape per-trening,
// potem spada do starej globalnej wartosci (migracja), w ostatecznosci 'beginner'.
function getWorkoutDifficulty(profile: Profile, workoutId: string): Difficulty {
  return profile.workoutDifficulty?.[workoutId] ?? profile.difficulty ?? 'beginner';
}

// Jedno zrodlo prawdy dla parametrow kazdego poziomu trudnosci - uzywane
// zarowno przez modaly treningow (faktyczna logika sesji) jak i podglad w
// Bibliotece (getDifficultySpecs), zeby liczby nigdy sie nie rozjechaly.
const KEGEL_DIFFICULTY: Record<Difficulty, { hold: number; reps: number }> = {
  beginner: { hold: 3, reps: 8 },
  intermediate: { hold: 4, reps: 10 },
  advanced: { hold: 5, reps: 12 },
};
const CYCLE_DIFFICULTY: Record<Difficulty, number> = { beginner: 4, intermediate: 6, advanced: 8 };
const BREATHING_CALM_MINUTES: Record<Difficulty, number> = { beginner: 2, intermediate: 3, advanced: 5 };
const FOUR_SEVEN_EIGHT_CYCLE_LEN = 19; // 4s wdech + 7s zatrzymanie + 8s wydech
const BOX_CYCLE_LEN = 16; // 4 fazy po 4s

function formatDuration(totalSeconds: number, lang: Lang): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return lang === 'pl' ? `${s} s` : `${s}s`;
  if (s === 0) return lang === 'pl' ? `${m} min` : `${m} min`;
  return lang === 'pl' ? `${m} min ${s} s` : `${m} min ${s}s`;
}

// Konkretny, policzalny opis co realnie zmienia sie w danym treningu na
// danym poziomie trudnosci - bez ogolnikow typu 'delikatne tempo'.
function getDifficultySpecs(workoutId: string, difficulty: Difficulty, lang: Lang): string {
  if (workoutId === 'kegel-normal' || workoutId === 'kegel-reverse') {
    const { hold, reps } = KEGEL_DIFFICULTY[difficulty];
    const total = hold * 2 * reps;
    return lang === 'pl'
      ? `${reps} powtórzeń × ${hold}s napięcia — łącznie ${formatDuration(total, lang)}`
      : `${reps} reps × ${hold}s hold — ${formatDuration(total, lang)} total`;
  }
  if (workoutId === 'breathing-4-7-8') {
    const cycles = CYCLE_DIFFICULTY[difficulty];
    const total = cycles * FOUR_SEVEN_EIGHT_CYCLE_LEN;
    return lang === 'pl'
      ? `${cycles} cykli (4-7-8s) — łącznie ${formatDuration(total, lang)}`
      : `${cycles} cycles (4-7-8s) — ${formatDuration(total, lang)} total`;
  }
  if (workoutId === 'breathing-box') {
    const cycles = CYCLE_DIFFICULTY[difficulty];
    const total = cycles * BOX_CYCLE_LEN;
    return lang === 'pl'
      ? `${cycles} cykli (4×4s) — łącznie ${formatDuration(total, lang)}`
      : `${cycles} cycles (4×4s) — ${formatDuration(total, lang)} total`;
  }
  if (workoutId === 'breathing-calm') {
    const mins = BREATHING_CALM_MINUTES[difficulty];
    return lang === 'pl'
      ? `Sugerowany czas: ${mins} min (możesz zmienić przed startem sesji)`
      : `Suggested duration: ${mins} min (adjustable before you start)`;
  }
  return '';
}

type StoredData = {
  profile: Profile;
  sessions: Session[];
  journal: JournalEntry[];
};

type NotifSlot = 'morning';

const NOTIF_TIMES: { slot: NotifSlot; hour: number; minute: number }[] = [
  { slot: 'morning', hour: 8, minute: 0 },
];

function notifTextFor(_slot: NotifSlot, t: Dict): string {
  return t.notifMorning;
}

function loadFiredLog(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('rdzen-notif-fired') || '{}');
  } catch {
    return {};
  }
}

function saveFiredLog(log: Record<string, string>) {
  localStorage.setItem('rdzen-notif-fired', JSON.stringify(log));
}

// Wyswietla powiadomienie przez Service Worker (dziala nawet gdy karta jest
// w tle na Androidzie), z fallbackiem do zwyklego Notification API.
async function fireNotification(title: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { tag: 'rdzen' });
      return;
    } catch {
      // przechodzimy do fallbacku ponizej
    }
  }
  try {
    new Notification(title, { tag: 'rdzen' });
  } catch {
    // brak wsparcia w tej przegladarce - ciche pominiecie
  }
}

// Best-effort: Periodic Background Sync pozwala niektorym przegladarkom
// (gl. Chrome na Androidzie, dla zainstalowanej PWA) budzic Service Workera
// cyklicznie w tle. To NIE gwarantuje precyzyjnych godzin ani dzialania na
// kazdym urzadzeniu (np. iOS Safari tego nie wspiera) - to tylko dodatkowe
// wzmocnienie glownego mechanizmu, ktorym jest sprawdzanie w App() ponizej.
async function tryRegisterPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const regAny = reg as ServiceWorkerRegistration & {
      periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
    };
    if (!regAny.periodicSync) return;
    const status = await (navigator as Navigator & {
      permissions: { query: (opts: { name: string }) => Promise<{ state: string }> };
    }).permissions.query({ name: 'periodic-background-sync' });
    if (status.state === 'granted') {
      await regAny.periodicSync.register('rdzen-notif-check', { minInterval: 60 * 60 * 1000 });
    }
  } catch {
    // periodic background sync niedostepny - polegamy na sprawdzaniu w App()
  }
}

const todayKey = new Date().toISOString().slice(0, 10);

function formatTodayDate(lang: Lang): string {
  const locale = lang === 'pl' ? 'pl-PL' : 'en-US';
  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return lang === 'pl' ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : formatted;
}

const EMPTY_DATA: StoredData = {
  profile: {
    selectedWorkouts: ['kegel-normal', 'breathing-calm'],
    difficulty: 'beginner',
    hasCompletedOnboarding: false,
  },
  sessions: [],
  journal: [],
};

function loadLang(): Lang {
  const saved = localStorage.getItem('rdzen-lang');
  return saved === 'en' ? 'en' : 'pl';
}

function loadTheme(): Theme {
  const saved = localStorage.getItem('rdzen-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function vibrate(pattern: number | number[]) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

// Delikatny dzwiek przy zmianie fazy oddechu - AudioContext tworzony lenistwie
// (dopiero przy pierwszym uzyciu, zwykle po kliknieciu 'Start' przez uzytkownika,
// co odblokowuje audio w przegladarce). Cichy sinusoidalny ton, nie plik audio.
let sharedAudioCtx: AudioContext | null = null;

function playTone(frequency: number, durationMs: number) {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      sharedAudioCtx = new AudioCtx();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // brak wsparcia audio - ciche pominiecie
  }
}

function App() {
  const [view, setView] = useState<View>('today');
  const [lang, setLang] = useState<Lang>(loadLang);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [data, setData] = useState<StoredData>(EMPTY_DATA);
  const [breathingOpen, setBreathingOpen] = useState(false);
  const [kegelOpen, setKegelOpen] = useState(false);
  const [groundingOpen, setGroundingOpen] = useState(false);
  const [fourSevenEightOpen, setFourSevenEightOpen] = useState(false);
  const [boxBreathingOpen, setBoxBreathingOpen] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [libraryDetail, setLibraryDetail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(
    () => 'Notification' in window && Notification.permission === 'granted',
  );
  const [levelUpToast, setLevelUpToast] = useState<{ track: 'kegel' | 'breath'; level: number } | null>(null);
  const [difficultySuggestion, setDifficultySuggestion] = useState<{
    track: 'kegel' | 'breath';
    suggested: Difficulty;
    workoutIds: string[];
    dismissKey: string;
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<'idle' | 'granted' | 'denied'>('idle');

  // Synchronizuj onboarding z danymi po załadowaniu
  useEffect(() => {
    setShowOnboarding(!data.profile?.hasCompletedOnboarding);
  }, [data.profile?.hasCompletedOnboarding]);

  const t = translations[lang];

  useEffect(() => {
    let active = true;
    loadFromDB().then((loaded) => {
      if (active) {
        // Migracja starych danych - dodaj profil jeśli brakuje
        const data = loaded || EMPTY_DATA;
        if (!data.profile) {
          data.profile = EMPTY_DATA.profile;
        }
        setData(data);
      }
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { saveToDB(data); }, [data]);
  useEffect(() => {
    localStorage.setItem('rdzen-lang', lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rdzen-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  const todaysSessions = data.sessions.filter((session) => session.date === todayKey);
  const breathingTotal = data.sessions.reduce(
    (total, session) => total + (session.type === 'breathing' ? session.minutes || 0 : 0),
    0,
  );
  const streak = useMemo(() => {
    const kegelDays = new Set(
      data.sessions.filter((session) => session.type === 'kegel').map((session) => session.date),
    );
    let current = new Date();
    let days = 0;
    while (kegelDays.has(current.toISOString().slice(0, 10))) {
      days += 1;
      current = new Date(current.getTime() - 86400000);
    }
    return days;
  }, [data.sessions]);

  const { kegelLevel, kegelProgress } = useMemo(() => {
    const completedWeeks = countCompletedWeeks(data.sessions, data.journal, data.profile.weeklyGoalDays);
    const level = Math.min(9, completedWeeks + 1);
    const progress = Math.min(100, (completedWeeks / 9) * 100);
    return { kegelLevel: level, kegelProgress: progress };
  }, [data.sessions, data.journal, data.profile.weeklyGoalDays]);

  const breathLevel = useMemo(() => {
    const idx = BREATH_LEVELS.findIndex((threshold) => breathingTotal < threshold);
    return Math.min(9, Math.max(1, idx === -1 ? 9 : idx + 1));
  }, [breathingTotal]);
  const breathNext = BREATH_LEVELS[breathLevel - 1] || 2400;
  const breathPrevious = breathLevel === 1 ? 0 : BREATH_LEVELS[breathLevel - 2];
  const breathProgress = Math.min(
    100,
    Math.round(((breathingTotal - breathPrevious) / (breathNext - breathPrevious)) * 100),
  );
  const kegelDone = todaysSessions.some((session) => session.type === 'kegel');
  const breathingDone = todaysSessions.some((session) => session.type === 'breathing');

  const addSession = (session: Session) =>
    setData((current) => ({ ...current, sessions: [...current.sessions, session] }));

  const completeKegel = (mode: KegelMode) => {
    if (!kegelDone) addSession({ type: 'kegel', date: todayKey, mode, workoutId: mode === 'reverse' ? 'kegel-reverse' : 'kegel-normal' });
  };

  const finishBreathing = (minutes: number, workoutId: string = 'breathing-calm') => {
    addSession({ type: 'breathing', date: todayKey, minutes, workoutId });
  };

  const saveJournal = (entry: JournalEntry) => {
    setData((current) => {
      const existing = current.journal.findIndex((j) => j.date === entry.date);
      const next = [...current.journal];
      if (existing >= 0) next[existing] = entry;
      else next.push(entry);
      return { ...current, journal: next };
    });
  };

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifFeedback('denied');
      setTimeout(() => setNotifFeedback('idle'), 4000);
      return;
    }
    if (Notification.permission === 'granted') {
      setNotifEnabled(true);
      setNotifFeedback('granted');
      tryRegisterPeriodicSync();
      setTimeout(() => setNotifFeedback('idle'), 4000);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotifEnabled(true);
      setNotifFeedback('granted');
      tryRegisterPeriodicSync();
    } else {
      setNotifFeedback('denied');
    }
    setTimeout(() => setNotifFeedback('idle'), 4000);
  };

  const saveProfile = (profile: Profile) => {
    setData(d => ({ ...d, profile }));
  };

  // Glowny mechanizm harmonogramu: dopoki appka jest otwarta (rowniez w tle
  // karty przegladarki), co minute sprawdzamy czy nadeszla pora ktoregos ze
  // slotow (rano/dzien/wieczor/niedziela) i nie zostal jeszcze dzisiaj
  // wyslany. To dziala niezaleznie od wsparcia przegladarki dla Periodic
  // Background Sync powyzej.
  useEffect(() => {
    if (!notifEnabled) return;
    const check = () => {
      const now = new Date();
      const dateKey = now.toISOString().slice(0, 10);
      const log = loadFiredLog();
      let changed = false;
      for (const slotDef of NOTIF_TIMES) {
        const scheduled = new Date(now);
        scheduled.setHours(slotDef.hour, slotDef.minute, 0, 0);
        const diffMin = (now.getTime() - scheduled.getTime()) / 60000;
        const alreadyFired = log[slotDef.slot] === dateKey;
        if (diffMin >= 0 && diffMin <= 90 && !alreadyFired) {
          fireNotification(notifTextFor(slotDef.slot, t));
          log[slotDef.slot] = dateKey;
          changed = true;
        }
      }
      if (changed) saveFiredLog(log);
    };
    check();
    const interval = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
    };
  }, [notifEnabled, t]);

  // Wykrywanie awansu poziomu (Kegiel i oddech osobno) — toast + wibracja +
  // powiadomienie, jesli wlaczone. prevKegelLevel/prevBreathLevel zaczynaja
  // jako null, zeby nie odpalic toastu przy pierwszym wczytaniu appki.
  const prevKegelLevel = useRef<number | null>(null);
  const prevBreathLevel = useRef<number | null>(null);

  const maybeSuggestDifficulty = useCallback(
    (track: 'kegel' | 'breath', level: number) => {
      const suggested = suggestedDifficultyForLevel(level);
      if (!suggested) return;
      const familyIds = data.profile.selectedWorkouts.filter((id) =>
        track === 'kegel' ? id.startsWith('kegel') : id.startsWith('breathing'),
      );
      if (familyIds.length === 0) return;
      const dismissKey = `${track}-${suggested}`;
      if (data.profile.dismissedDifficultySuggestions?.includes(dismissKey)) return;
      const needsBump = familyIds.some(
        (id) => difficultyRank(getWorkoutDifficulty(data.profile, id)) < difficultyRank(suggested),
      );
      if (needsBump) setDifficultySuggestion({ track, suggested, workoutIds: familyIds, dismissKey });
    },
    [data.profile],
  );

  useEffect(() => {
    if (prevKegelLevel.current !== null && kegelLevel > prevKegelLevel.current) {
      setLevelUpToast({ track: 'kegel', level: kegelLevel });
      if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160]);
      if (notifEnabled) fireNotification(t.notifLevelUp);
      maybeSuggestDifficulty('kegel', kegelLevel);
    }
    prevKegelLevel.current = kegelLevel;
  }, [kegelLevel, notifEnabled, t, maybeSuggestDifficulty]);

  useEffect(() => {
    if (prevBreathLevel.current !== null && breathLevel > prevBreathLevel.current) {
      setLevelUpToast({ track: 'breath', level: breathLevel });
      if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160]);
      if (notifEnabled) fireNotification(t.notifLevelUp);
      maybeSuggestDifficulty('breath', breathLevel);
    }
    prevBreathLevel.current = breathLevel;
  }, [breathLevel, notifEnabled, t, maybeSuggestDifficulty]);

  useEffect(() => {
    if (!levelUpToast) return;
    const timeout = setTimeout(() => setLevelUpToast(null), 6000);
    return () => clearTimeout(timeout);
  }, [levelUpToast]);

  const isWorkoutDoneToday = (workoutId: string) =>
    todaysSessions.some((s) => s.workoutId === workoutId);
  const fourSevenEightDone = isWorkoutDoneToday('breathing-4-7-8');
  const boxBreathingDone = isWorkoutDoneToday('breathing-box');

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={19} />
          </div>
          <span>{t.brand}</span>
        </div>
        <button
          className="profile-card"
          onClick={() => {
            setView('profile');
            setMenuOpen(false);
          }}
        >
          <div className="avatar">
            <UserRound size={16} />
          </div>
          <div>
            <strong>{t.yourRhythm}</strong>
            <span>
              {streak} {t.dayStreak}
            </span>
          </div>
          <ChevronRight size={16} />
        </button>
        <nav>
          <p className="nav-label">{t.menu}</p>
          <NavItem
            active={view === 'today'}
            icon={<Activity size={18} />}
            label={t.today}
            onClick={() => {
              setView('today');
              setMenuOpen(false);
            }}
          />
          <NavItem
            active={view === 'library'}
            icon={<Compass size={18} />}
            label={t.library}
            onClick={() => {
              setView('library');
              setMenuOpen(false);
            }}
          />
        </nav>
        <div className="sidebar-footer">
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span>{t.privacyNote}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t.openMenu}
          >
            <Menu size={22} />
          </button>
          <div className="topbar-context">
            <span className="eyebrow">{formatTodayDate(lang)}</span>
            <h1>
              {view === 'today' ? t.today : view === 'library' ? t.library : t.profileTitle}
            </h1>
          </div>
          <div className="topbar-actions">
            <div className="lang-toggle">
              <button
                className={lang === 'pl' ? 'active' : ''}
                onClick={() => setLang('pl')}
                aria-label="Polski"
              >PL</button>
              <button
                className={lang === 'en' ? 'active' : ''}
                onClick={() => setLang('en')}
                aria-label="English"
              >EN</button>
            </div>
            <button
              className="icon-button"
              aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
              onClick={toggleTheme}
              title={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="notif-wrap">
              <button
                className={`icon-button${notifEnabled ? ' notif-on' : ''}`}
                aria-label={t.notifications}
                onClick={enableNotifications}
                title={notifEnabled ? t.notifsEnabled : t.enableNotifs}
              >
                <Bell size={18} />
                {notifEnabled && <i />}
              </button>
              {notifFeedback !== 'idle' && (
                <div className={`notif-toast ${notifFeedback}`}>
                  {notifFeedback === 'granted' ? t.notifGranted : t.notifDenied}
                </div>
              )}
            </div>
          </div>
        </header>

        {view === 'today' && (
          <TodayView
            t={t}
            lang={lang}
            streak={streak}
            kegelDone={kegelDone}
            breathingDone={breathingDone}
            breathingTotal={breathingTotal}
            breathLevel={breathLevel}
            breathNext={breathNext}
            selectedWorkouts={data.profile.selectedWorkouts}
            fourSevenEightDone={fourSevenEightDone}
            boxBreathingDone={boxBreathingDone}
            onKegel={() => setKegelOpen(true)}
            onBreathing={() => setBreathingOpen(true)}
            onFourSevenEight={() => setFourSevenEightOpen(true)}
            onBoxBreathing={() => setBoxBreathingOpen(true)}
            onGrounding={() => setGroundingOpen(true)}
            onJournal={() => setView('profile')}
          />
        )}
        {view === 'library' && (
          <LibraryView
            t={t}
            lang={lang}
            selectedWorkouts={data.profile.selectedWorkouts}
            onOpenDetail={(id) => setLibraryDetail(id)}
          />
        )}
        {view === 'profile' && (
          <ProfileView
            t={t}
            lang={lang}
            streak={streak}
            profile={data.profile}
            kegelLevel={kegelLevel}
            kegelProgress={kegelProgress}
            breathLevel={breathLevel}
            breathProgress={breathProgress}
            breathingTotal={breathingTotal}
            sessions={data.sessions}
            onOpenBackup={() => setShowBackup(true)}
            onOpenWorkout={(id) => setLibraryDetail(id)}
            onGoToLibrary={() => setView('library')}
            onSetWeeklyGoal={(days) =>
              setData((d) => ({ ...d, profile: { ...d.profile, weeklyGoalDays: days } }))
            }
            onToggleSound={(enabled) =>
              setData((d) => ({ ...d, profile: { ...d.profile, soundEnabled: enabled } }))
            }
          />
        )}
      </main>

      {kegelOpen && (
        <KegelModal
          t={t}
          difficultyNormal={getWorkoutDifficulty(data.profile, 'kegel-normal')}
          difficultyReverse={getWorkoutDifficulty(data.profile, 'kegel-reverse')}
          soundEnabled={data.profile.soundEnabled ?? false}
          onClose={() => setKegelOpen(false)}
          onFinish={(mode) => {
            completeKegel(mode);
            setKegelOpen(false);
            setShowQuickLog(true);
          }}
        />
      )}
      {breathingOpen && (
        <BreathingModal
          t={t}
          difficulty={getWorkoutDifficulty(data.profile, 'breathing-calm')}
          soundEnabled={data.profile.soundEnabled ?? false}
          onClose={() => setBreathingOpen(false)}
          onFinish={(minutes) => {
            finishBreathing(minutes, 'breathing-calm');
            setBreathingOpen(false);
            setShowQuickLog(true);
          }}
        />
      )}
      {fourSevenEightOpen && (
        <FourSevenEightModal
          t={t}
          difficulty={getWorkoutDifficulty(data.profile, 'breathing-4-7-8')}
          soundEnabled={data.profile.soundEnabled ?? false}
          onClose={() => setFourSevenEightOpen(false)}
          onFinish={(minutes) => {
            finishBreathing(minutes, 'breathing-4-7-8');
            setFourSevenEightOpen(false);
            setShowQuickLog(true);
          }}
        />
      )}
      {boxBreathingOpen && (
        <BoxBreathingModal
          t={t}
          difficulty={getWorkoutDifficulty(data.profile, 'breathing-box')}
          soundEnabled={data.profile.soundEnabled ?? false}
          onClose={() => setBoxBreathingOpen(false)}
          onFinish={(minutes) => {
            finishBreathing(minutes, 'breathing-box');
            setBoxBreathingOpen(false);
            setShowQuickLog(true);
          }}
        />
      )}
      {groundingOpen && (
        <GroundingModal
          t={t}
          soundEnabled={data.profile.soundEnabled ?? false}
          onClose={() => setGroundingOpen(false)}
        />
      )}
      {showQuickLog && (
        <QuickLogModal
          t={t}
          existing={data.journal.find((j) => j.date === todayKey)}
          onSkip={() => setShowQuickLog(false)}
          onSave={(tension, mood, control) => {
            const existing = data.journal.find((j) => j.date === todayKey);
            saveJournal({
              date: todayKey,
              tension,
              mood,
              note: existing?.note ?? '',
              control: control ?? existing?.control,
            });
            setShowQuickLog(false);
          }}
        />
      )}
      {showBackup && (
        <BackupModal
          t={t}
          data={data}
          onClose={() => setShowBackup(false)}
          onImport={(imported) => setData(imported)}
        />
      )}
      {libraryDetail && (
        <LibraryDetailModal
          t={t}
          lang={lang}
          workoutId={libraryDetail}
          isAdded={data.profile.selectedWorkouts.includes(libraryDetail)}
          difficulty={getWorkoutDifficulty(data.profile, libraryDetail)}
          onClose={() => setLibraryDetail(null)}
          onAdd={() => {
            setData((d) => ({
              ...d,
              profile: { ...d.profile, selectedWorkouts: [...d.profile.selectedWorkouts, libraryDetail] },
            }));
            setLibraryDetail(null);
          }}
          onRemove={() => {
            setData((d) => ({
              ...d,
              profile: {
                ...d.profile,
                selectedWorkouts: d.profile.selectedWorkouts.filter((id) => id !== libraryDetail),
              },
            }));
            setLibraryDetail(null);
          }}
          onDifficultyChange={(newDiff) => {
            setData((d) => ({
              ...d,
              profile: {
                ...d.profile,
                workoutDifficulty: { ...d.profile.workoutDifficulty, [libraryDetail]: newDiff },
              },
            }));
          }}
          onStart={() => {
            setLibraryDetail(null);
            if (libraryDetail === 'kegel-normal' || libraryDetail === 'kegel-reverse') setKegelOpen(true);
            else if (libraryDetail === 'breathing-calm') setBreathingOpen(true);
            else if (libraryDetail === 'breathing-4-7-8') setFourSevenEightOpen(true);
            else if (libraryDetail === 'breathing-box') setBoxBreathingOpen(true);
          }}
        />
      )}
      {levelUpToast && (
        <div className="level-up-toast animate-in" role="status">
          <div className="level-up-toast-badge">{levelUpToast.level}</div>
          <div>
            <strong>{t.levelUpToastTitle}</strong>
            <span>
              {pick(
                levelUpToast.track === 'kegel'
                  ? KEGEL_LEVELS[levelUpToast.level - 1]
                  : BREATH_NAMES[levelUpToast.level - 1],
                lang,
              )}
            </span>
          </div>
        </div>
      )}
      {difficultySuggestion && (
        <div className="modal-backdrop">
          <div className="breath-modal animate-in" style={{ maxWidth: 380 }}>
            <button
              className="close-button"
              onClick={() => {
                setData((d) => ({
                  ...d,
                  profile: {
                    ...d.profile,
                    dismissedDifficultySuggestions: [
                      ...(d.profile.dismissedDifficultySuggestions ?? []),
                      difficultySuggestion.dismissKey,
                    ],
                  },
                }));
                setDifficultySuggestion(null);
              }}
            >
              <X size={19} />
            </button>
            <span className="eyebrow">{t.levelUpToastTitle}</span>
            <h2 style={{ marginBottom: 8 }}>{t.difficultySuggestTitle}</h2>
            <p className="subtle" style={{ marginBottom: 22 }}>
              {t.difficultySuggestBody.replace(
                '{level}',
                difficultySuggestion.suggested === 'advanced' ? t.difficultyAdvanced : t.difficultyIntermediate,
              )}
            </p>
            <button
              className="primary-button full"
              onClick={() => {
                setData((d) => {
                  const nextWorkoutDifficulty = { ...d.profile.workoutDifficulty };
                  for (const id of difficultySuggestion.workoutIds) {
                    if (difficultyRank(nextWorkoutDifficulty[id] ?? d.profile.difficulty ?? 'beginner') < difficultyRank(difficultySuggestion.suggested)) {
                      nextWorkoutDifficulty[id] = difficultySuggestion.suggested;
                    }
                  }
                  return { ...d, profile: { ...d.profile, workoutDifficulty: nextWorkoutDifficulty } };
                });
                setDifficultySuggestion(null);
              }}
            >
              <Check size={16} /> {t.difficultySuggestAccept}
            </button>
            <button
              className="ghost-button full"
              style={{ marginTop: 10 }}
              onClick={() => {
                setData((d) => ({
                  ...d,
                  profile: {
                    ...d.profile,
                    dismissedDifficultySuggestions: [
                      ...(d.profile.dismissedDifficultySuggestions ?? []),
                      difficultySuggestion.dismissKey,
                    ],
                  },
                }));
                setDifficultySuggestion(null);
              }}
            >
              {t.difficultySuggestDismiss}
            </button>
          </div>
        </div>
      )}
      {showOnboarding && (
        <OnboardingModal
          t={t}
          onComplete={(profile) => {
            saveProfile({ ...profile, hasCompletedOnboarding: true });
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}

function OnboardingModal({
  t,
  onComplete,
}: {
  t: Dict;
  onComplete: (profile: { selectedWorkouts: string[]; difficulty: Difficulty }) => void;
}) {
  const [wantsKegel, setWantsKegel] = useState(false);
  const [wantsBreath, setWantsBreath] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');

  const workouts = [
    ...(wantsKegel ? ['kegel-normal'] : []),
    ...(wantsBreath ? ['breathing-calm'] : []),
  ];
  const canBegin = workouts.length > 0;

  const diffOptions: { key: Difficulty; label: string; desc: string }[] = [
    { key: 'beginner', label: t.difficultyBeginner, desc: t.difficultyBeginnerDesc },
    { key: 'intermediate', label: t.difficultyIntermediate, desc: t.difficultyIntermediateDesc },
    { key: 'advanced', label: t.difficultyAdvanced, desc: t.difficultyAdvancedDesc },
  ];

  return (
    <div className="modal-backdrop">
      <div className="onboarding-modal animate-in">
        <div className="onboarding-brand">rdzeń</div>
        <h2>{t.onboardingTitle}</h2>
        <p className="subtle">{t.onboardingSubtitle}</p>

        <p className="onboarding-label">{t.onboardingChoose}</p>
        <div className="onboarding-choice">
          <button
            className={`choice-card ${wantsKegel ? 'selected' : ''}`}
            onClick={() => setWantsKegel((v) => !v)}
            aria-pressed={wantsKegel}
          >
            <div className="choice-icon">
              {wantsKegel ? <Check size={22} /> : <Target size={22} />}
            </div>
            <strong>{t.workoutKegel}</strong>
            <span>{t.workoutKegelDesc}</span>
          </button>
          <button
            className={`choice-card ${wantsBreath ? 'selected' : ''}`}
            onClick={() => setWantsBreath((v) => !v)}
            aria-pressed={wantsBreath}
          >
            <div className="choice-icon">
              {wantsBreath ? <Check size={22} /> : <Wind size={22} />}
            </div>
            <strong>{t.workoutBreath}</strong>
            <span>{t.workoutBreathDesc}</span>
          </button>
        </div>

        <p className="onboarding-label">{t.onboardingDifficulty}</p>
        <div className="difficulty-options">
          {diffOptions.map(opt => (
            <button
              key={opt.key}
              className={`diff-card ${difficulty === opt.key ? 'selected' : ''}`}
              onClick={() => setDifficulty(opt.key)}
            >
              <strong>{opt.label}</strong>
              <span>{opt.desc}</span>
            </button>
          ))}
        </div>

        {!canBegin && (
          <p className="subtle" style={{ marginTop: 12, marginBottom: 0 }}>
            {t.onboardingPickOne}
          </p>
        )}
        <button
          className="primary-button full"
          style={{ marginTop: 20 }}
          disabled={!canBegin}
          onClick={() => canBegin && onComplete({ selectedWorkouts: workouts, difficulty })}
        >
          {t.onboardingBegin} <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

function countCompletedWeeks(sessions: Session[], journal: JournalEntry[], goalDays: number = DEFAULT_WEEKLY_GOAL): number {
  const kegelDates = new Set(
    sessions.filter((s) => s.type === 'kegel').map((s) => s.date),
  );
  if (kegelDates.size === 0) return 0;

  const allDates = [...kegelDates].sort();
  const first = new Date(allDates[0]);
  const today = new Date(todayKey);
  const weekStart = (d: Date) => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  };
  const firstWeek = weekStart(first);
  let weeks = 0;
  let cursor = new Date(firstWeek);
  while (cursor <= today) {
    const wStart = new Date(cursor);
    const wEnd = new Date(cursor.getTime() + 6 * 86400000);
    let count = 0;
    for (let d = new Date(wStart); d <= wEnd; d = new Date(d.getTime() + 86400000)) {
      if (kegelDates.has(d.toISOString().slice(0, 10))) count++;
    }
    if (count >= goalDays) {
      const sundayKey = wEnd.toISOString().slice(0, 10);
      const sundayEntry = journal.find((j) => j.date === sundayKey);
      if (sundayEntry && (sundayEntry.control ?? 0) >= 3) weeks++;
    }
    cursor = new Date(cursor.getTime() + 7 * 86400000);
  }
  return weeks;
}

function countThisWeekDays(sessions: Session[]): number {
  const kegelDates = new Set(sessions.filter((s) => s.type === 'kegel').map((s) => s.date));
  const today = new Date(todayKey);
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  let count = 0;
  for (let d = new Date(weekStart); d <= today; d = new Date(d.getTime() + 86400000)) {
    if (kegelDates.has(d.toISOString().slice(0, 10))) count++;
  }
  return count;
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {active && <span className="nav-dot" />}
    </button>
  );
}

function TodayView({
  t,
  lang,
  streak,
  kegelDone,
  breathingDone,
  breathingTotal,
  breathLevel,
  breathNext,
  selectedWorkouts,
  fourSevenEightDone,
  boxBreathingDone,
  onKegel,
  onBreathing,
  onFourSevenEight,
  onBoxBreathing,
  onGrounding,
  onJournal,
}: {
  t: Dict;
  lang: Lang;
  streak: number;
  kegelDone: boolean;
  breathingDone: boolean;
  breathingTotal: number;
  breathLevel: number;
  breathNext: number;
  selectedWorkouts: string[];
  fourSevenEightDone: boolean;
  boxBreathingDone: boolean;
  onKegel: () => void;
  onBreathing: () => void;
  onFourSevenEight: () => void;
  onBoxBreathing: () => void;
  onGrounding: () => void;
  onJournal: () => void;
}) {
  const showKegel = selectedWorkouts.includes('kegel-normal') || selectedWorkouts.includes('kegel-reverse');
  const showBreath = selectedWorkouts.includes('breathing-calm');
  const show478 = selectedWorkouts.includes('breathing-4-7-8');
  const showBox = selectedWorkouts.includes('breathing-box');
  const sessionCount = (showKegel ? 1 : 0) + (showBreath ? 1 : 0) + (show478 ? 1 : 0) + (showBox ? 1 : 0);
  const showAnyBreath = showBreath || show478 || showBox;
  const doneCount =
    (showKegel && kegelDone ? 1 : 0) +
    (showBreath && breathingDone ? 1 : 0) +
    (show478 && fourSevenEightDone ? 1 : 0) +
    (showBox && boxBreathingDone ? 1 : 0);
  const heroOnClick = showKegel
    ? onKegel
    : showBreath
    ? onBreathing
    : show478
    ? onFourSevenEight
    : showBox
    ? onBoxBreathing
    : onKegel;
  const heroDone = showKegel
    ? kegelDone
    : showBreath
    ? breathingDone
    : show478
    ? fourSevenEightDone
    : showBox
    ? boxBreathingDone
    : false;
  return (
    <div className="page animate-in">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{t.consistency}</p>
          <h2>{t.welcomeTitle}</h2>
          <p className="subtle">{t.welcomeSub}</p>
        </div>
        <div className="streak-card">
          <Flame size={21} />
          <div>
            <strong>{streak || 0}</strong>
            <span>{t.dayStreakUnit}</span>
          </div>
        </div>
      </section>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="pill amber">
            <Sparkles size={14} /> {t.todayPlan}
          </span>
          <h3>
            {t.heroLine1}
            <br />
            <em>{t.heroLine2}</em>
          </h3>
          <p>{t.heroSub}</p>
          <button className="primary-button" onClick={heroOnClick}>
            {heroDone ? (
              <>
                <Check size={17} /> {t.sessionDone}
              </>
            ) : (
              <>
                {t.startTraining} <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>
        <div className="hero-orbit">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-symbol">
            <HeartPulse size={48} />
          </div>
          <span className="orbit-label label-top">{lang === 'pl' ? 'ODDECH' : 'BREATH'}</span>
          <span className="orbit-label label-bottom">
            {lang === 'pl' ? 'KONTROLA' : 'CONTROL'}
          </span>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <span className="eyebrow">{t.today}</span>
          <h3>{t.yourSet}</h3>
        </div>
        <span className="completion">
          {doneCount} / {sessionCount} {t.completed}
        </span>
      </div>

      <section className="session-grid">
        {showKegel && (
          <SessionCard
            tone="warm"
            icon={<Activity size={22} />}
            title={t.kegel}
            subtitle={t.kegelSub}
            detail={t.kegelDetail}
            done={kegelDone}
            onClick={onKegel}
            t={t}
          />
        )}
        {showBreath && (
          <SessionCard
            tone="teal"
            icon={<Wind size={22} />}
            title={t.breath}
            subtitle={t.breathSub}
            detail={t.breathDetail}
            done={breathingDone}
            onClick={onBreathing}
            t={t}
          />
        )}
        {show478 && (
          <SessionCard
            tone="teal"
            icon={<Moon size={22} />}
            title={t.breathing478}
            subtitle={t.fourSevenEightIntro}
            detail={t.fourSevenEightDetail}
            done={fourSevenEightDone}
            onClick={onFourSevenEight}
            t={t}
          />
        )}
        {showBox && (
          <SessionCard
            tone="teal"
            icon={<Timer size={22} />}
            title={t.breathingBox}
            subtitle={t.boxBreathingIntro}
            detail={t.boxBreathingDetail}
            done={boxBreathingDone}
            onClick={onBoxBreathing}
            t={t}
          />
        )}
      </section>

      <section className="grounding-strip">
        <button className="grounding-button" onClick={onGrounding}>
          <Zap size={18} />
          <div>
            <strong>{t.strongTension}</strong>
            <span>{t.grounding}</span>
          </div>
          <ArrowRight size={16} />
        </button>
      </section>

      <section className="bottom-grid">
        {showAnyBreath && (
          <div className="insight-card">
            <div className="card-heading">
              <div className="mini-icon">
                <BarChart3 size={17} />
              </div>
              <div>
                <span className="eyebrow">{t.yourProgress}</span>
                <h4>{t.breathTrack}</h4>
              </div>
              <button className="text-button">
                {t.details} <ArrowRight size={15} />
              </button>
            </div>
            <div className="progress-row">
              <div className="level-badge">{breathLevel}</div>
              <div className="progress-main">
                <div className="progress-meta">
                  <strong>{pick(BREATH_NAMES[breathLevel - 1], lang)}</strong>
                  <span>
                    {breathingTotal} / {breathNext} {t.minTotal}
                  </span>
                </div>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${Math.min(100, Math.max(8, (breathingTotal / breathNext) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="journal-card">
          <div className="journal-icon">
            <Moon size={19} />
          </div>
          <div>
            <span className="eyebrow">{t.evening}</span>
            <h4>{t.howYouFeel}</h4>
            <p>{t.oneSentence}</p>
          </div>
          <button className="round-arrow" onClick={onJournal}>
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}

function SessionCard({
  tone,
  icon,
  title,
  subtitle,
  detail,
  done,
  onClick,
  t,
}: {
  tone: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  detail: string;
  done: boolean;
  onClick: () => void;
  t: Dict;
}) {
  return (
    <button className={`session-card ${tone} ${done ? 'done' : ''}`} onClick={onClick}>
      <div className="session-top">
        <div className="session-icon">{icon}</div>
        <span className="session-state">
          {done ? (
            <>
              <Check size={14} /> {t.ready}
            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" /> {t.start}
            </>
          )}
        </span>
      </div>
      <div className="session-copy">
        <h4>{title}</h4>
        <strong>{subtitle}</strong>
        <p>{detail}</p>
      </div>
      <div className="card-arrow">
        <ArrowRight size={17} />
      </div>
    </button>
  );
}

function ActivityHeatmap({ sessions, t }: { sessions: Session[]; t: Dict }) {
  const WEEKS = 14;
  const countByDate = new Map<string, number>();
  sessions.forEach((s) => {
    countByDate.set(s.date, (countByDate.get(s.date) || 0) + 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1));
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days: { date: string; count: number }[] = [];
  const cursor = new Date(startDate);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ date: key, count: countByDate.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const levelClass = (count: number) => {
    if (count === 0) return 'l0';
    if (count === 1) return 'l1';
    if (count === 2) return 'l2';
    return 'l3';
  };

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-scroll">
        <div className="heatmap-grid">
          {weeks.map((week, wi) => (
            <div className="heatmap-col" key={wi}>
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`heatmap-cell ${levelClass(day.count)}`}
                  title={`${day.date} — ${day.count} ${day.count === 1 ? t.sessionSingular : t.sessionsPlural}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend">
        <span>{t.less}</span>
        <div className="heatmap-cell l0" />
        <div className="heatmap-cell l1" />
        <div className="heatmap-cell l2" />
        <div className="heatmap-cell l3" />
        <span>{t.more}</span>
      </div>
    </div>
  );
}

function WorkoutBreakdown({ sessions, t }: { sessions: Session[]; t: Dict }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; minutes: number }>();
    sessions.forEach((s) => {
      const id = s.workoutId || (s.type === 'kegel' ? 'kegel-normal' : 'breathing-calm');
      const entry = map.get(id) || { count: 0, minutes: 0 };
      entry.count += 1;
      entry.minutes += s.minutes || 0;
      map.set(id, entry);
    });
    return Array.from(map.entries())
      .map(([id, stats]) => ({ id, ...stats, workout: getWorkoutById(id) }))
      .filter((x) => x.workout)
      .sort((a, b) => b.count - a.count);
  }, [sessions]);

  if (grouped.length === 0) {
    return <p className="subtle" style={{ margin: '4px 0 0' }}>{t.noSessionsYet}</p>;
  }

  return (
    <div className="breakdown-list">
      {grouped.map(({ id, count, minutes, workout }) => (
        <div className="breakdown-row" key={id}>
          <div className="breakdown-icon">{workoutIcon(workout!.icon, 16)}</div>
          <span className="breakdown-name">{t[workout!.nameKey as keyof Dict] as string}</span>
          <span className="breakdown-stat">
            {count}× {minutes > 0 ? `· ${minutes} ${t.minutes}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function SessionHistory({ sessions, t, lang }: { sessions: Session[]; t: Dict; lang: Lang }) {
  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20),
    [sessions],
  );

  if (sorted.length === 0) {
    return <p className="subtle" style={{ margin: '4px 0 24px' }}>{t.noSessionsYet}</p>;
  }

  return (
    <div className="breakdown-list" style={{ marginBottom: 28 }}>
      {sorted.map((s, i) => {
        const id = s.workoutId || (s.type === 'kegel' ? 'kegel-normal' : 'breathing-calm');
        const workout = getWorkoutById(id);
        const dateLabel = new Date(s.date).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', {
          day: 'numeric',
          month: 'short',
        });
        return (
          <div className="breakdown-row" key={`${s.date}-${i}`}>
            <div className="breakdown-icon">
              {workout ? workoutIcon(workout.icon, 16) : <Activity size={16} />}
            </div>
            <span className="breakdown-name">
              {workout ? (t[workout.nameKey as keyof Dict] as string) : '—'}
            </span>
            <span className="breakdown-stat">
              {dateLabel}
              {s.minutes ? ` · ${s.minutes} ${t.minutes}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrackCard({
  typeLabel,
  level,
  name,
  description,
  progress,
  accent,
  meta,
}: {
  typeLabel: string;
  level: number;
  name: string;
  description: string;
  progress: number;
  accent: string;
  meta: string;
}) {
  return (
    <div className={`track-card ${accent}`}>
      <div className="track-top">
        <div className="track-title">
          <div className="track-level">{level}</div>
          <div>
            <span className="eyebrow">{typeLabel}</span>
            <h3>{name}</h3>
          </div>
        </div>
        <span className="track-meta">{meta}</span>
      </div>
      <p>{description}</p>
      <div className="progress-track large">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="level-dots">
        {Array.from({ length: 9 }).map((_, i) => (
          <i key={i} className={i < level ? 'filled' : ''} />
        ))}
      </div>
    </div>
  );
}

function workoutIcon(icon: string, size = 20) {
  switch (icon) {
    case 'target': return <Target size={size} />;
    case 'arrow-right': return <RotateCw size={size} />;
    case 'wind': return <Wind size={size} />;
    case 'moon': return <Moon size={size} />;
    case 'grid': return <Timer size={size} />;
    case 'heart-pulse': return <HeartPulse size={size} />;
    case 'flame': return <Flame size={size} />;
    case 'sparkles': return <Sparkles size={size} />;
    case 'leaf': return <Leaf size={size} />;
    default: return <Activity size={size} />;
  }
}

function categoryLabel(category: Workout['category'], lang: Lang): string {
  const map: Record<Workout['category'], [string, string]> = {
    'Sexual Health': ['Zdrowie seksualne', 'Sexual health'],
    'Stress Relief': ['Redukcja stresu', 'Stress relief'],
    'Body Awareness': ['Świadomość ciała', 'Body awareness'],
    'Breathing': ['Oddech', 'Breathing'],
  };
  return pick(map[category], lang);
}

function LibraryView({
  t,
  lang,
  selectedWorkouts,
  onOpenDetail,
}: {
  t: Dict;
  lang: Lang;
  selectedWorkouts: string[];
  onOpenDetail: (id: string) => void;
}) {
  const categories = ['Sexual Health', 'Stress Relief', 'Body Awareness'] as const;
  return (
    <div className="page animate-in">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{t.library}</p>
          <h2>{t.library}</h2>
          <p className="subtle">{t.librarySubtitle}</p>
        </div>
      </section>
      {categories.map((cat) => {
        const items = WORKOUTS.filter((w) => w.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            <p className="onboarding-label">{categoryLabel(cat, lang)}</p>
            <div className="library-grid">
              {items.map((w) => {
                const added = selectedWorkouts.includes(w.id);
                return (
                  <button
                    key={w.id}
                    className={`library-card ${!w.implemented ? 'locked' : ''}`}
                    onClick={() => onOpenDetail(w.id)}
                  >
                    <div className="library-card-icon">{workoutIcon(w.icon, 22)}</div>
                    <strong>{t[w.nameKey as keyof Dict] as string}</strong>
                    {!w.implemented && (
                      <span className="library-badge">
                        <Lock size={11} /> {t.comingSoon}
                      </span>
                    )}
                    {w.implemented && added && (
                      <span className="library-badge added">{t.alreadyAdded}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LibraryDetailModal({
  t,
  lang,
  workoutId,
  isAdded,
  difficulty,
  onClose,
  onAdd,
  onRemove,
  onStart,
  onDifficultyChange,
}: {
  t: Dict;
  lang: Lang;
  workoutId: string;
  isAdded: boolean;
  difficulty: Difficulty;
  onClose: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onStart: () => void;
  onDifficultyChange: (d: Difficulty) => void;
}) {
  const workout = WORKOUTS.find((w) => w.id === workoutId);
  const edu = WORKOUT_EDUCATION[workoutId];
  if (!workout) return null;

  const diffOptions: { key: Difficulty; label: string; desc: string }[] = [
    { key: 'beginner', label: t.difficultyBeginner, desc: getDifficultySpecs(workoutId, 'beginner', lang) },
    { key: 'intermediate', label: t.difficultyIntermediate, desc: getDifficultySpecs(workoutId, 'intermediate', lang) },
    { key: 'advanced', label: t.difficultyAdvanced, desc: getDifficultySpecs(workoutId, 'advanced', lang) },
  ];

  return (
    <div className="modal-backdrop">
      <div className="breath-modal animate-in" style={{ maxWidth: 460, textAlign: 'left' }}>
        <button className="close-button" onClick={onClose}><X size={19} /></button>
        <div className="library-detail-icon">{workoutIcon(workout.icon, 26)}</div>
        <h2 style={{ margin: '14px 0 4px' }}>{t[workout.nameKey as keyof Dict] as string}</h2>
        <p className="subtle" style={{ marginBottom: 20 }}>{categoryLabel(workout.category, lang)}</p>

        {!workout.implemented ? (
          <div className="coming-soon-box">
            <Lock size={18} />
            <span>{t.comingSoon}</span>
          </div>
        ) : edu ? (
          <>
            <div className="edu-block">
              <p className="onboarding-label" style={{ margin: '0 0 6px' }}>{t.whatIsIt}</p>
              <p className="subtle">{pick(edu.what, lang)}</p>
            </div>
            <div className="edu-block">
              <p className="onboarding-label" style={{ margin: '0 0 6px' }}>{t.whoFor}</p>
              <p className="subtle">{pick(edu.who, lang)}</p>
            </div>
            <div className="edu-block">
              <p className="onboarding-label" style={{ margin: '0 0 6px' }}>{t.benefitsLabel}</p>
              <p className="subtle">{pick(edu.benefits, lang)}</p>
            </div>
            <div className="edu-block">
              <p className="onboarding-label" style={{ margin: '0 0 6px' }}>{t.timelineLabel}</p>
              <p className="subtle">{pick(edu.timeline, lang)}</p>
            </div>

            <p className="onboarding-label">{t.settingsDifficulty}</p>
            <div className="difficulty-options">
              {diffOptions.map((opt) => (
                <button
                  key={opt.key}
                  className={`diff-card ${difficulty === opt.key ? 'selected' : ''}`}
                  onClick={() => onDifficultyChange(opt.key)}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>

            {isAdded ? (
              <>
                <button className="primary-button full" style={{ marginTop: 20 }} onClick={onStart}>
                  <Play size={16} fill="currentColor" /> {t.startNow}
                </button>
                <button className="ghost-button full" style={{ marginTop: 10 }} onClick={onRemove}>
                  <X size={16} /> {t.removeFromTrainings}
                </button>
              </>
            ) : (
              <button className="primary-button full" style={{ marginTop: 20 }} onClick={onAdd}>
                <Plus size={16} /> {t.addToMyTrainings}
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ProfileView({
  t,
  lang,
  streak,
  profile,
  kegelLevel,
  kegelProgress,
  breathLevel,
  breathProgress,
  breathingTotal,
  sessions,
  onOpenBackup,
  onOpenWorkout,
  onGoToLibrary,
  onSetWeeklyGoal,
  onToggleSound,
}: {
  t: Dict;
  lang: Lang;
  streak: number;
  profile: Profile;
  kegelLevel: number;
  kegelProgress: number;
  breathLevel: number;
  breathProgress: number;
  breathingTotal: number;
  sessions: Session[];
  onOpenBackup: () => void;
  onOpenWorkout: (id: string) => void;
  onGoToLibrary: () => void;
  onSetWeeklyGoal: (days: number) => void;
  onToggleSound: (enabled: boolean) => void;
}) {
  const activeWorkouts = WORKOUTS.filter((w) => profile.selectedWorkouts.includes(w.id));
  const diffLabel: Record<Difficulty, string> = {
    beginner: t.difficultyBeginner,
    intermediate: t.difficultyIntermediate,
    advanced: t.difficultyAdvanced,
  };
  const monthly = useMemo(() => computeMonthly(sessions, lang), [sessions, lang]);
  const weeklyGoalDays = profile.weeklyGoalDays ?? DEFAULT_WEEKLY_GOAL;
  const thisWeekDays = useMemo(() => countThisWeekDays(sessions), [sessions]);

  return (
    <div className="page animate-in">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{t.profileTitle}</p>
          <h2>{t.yourRhythm}</h2>
          <p className="subtle">
            {streak} {t.dayStreak}
          </p>
        </div>
      </section>

      <div className="stats-strip">
        <div>
          <Flame size={18} />
          <strong>{streak}</strong>
          <span>{t.dayStreakUnit}</span>
        </div>
        <div>
          <Timer size={18} />
          <strong>{breathingTotal}</strong>
          <span>{t.breathMinutes}</span>
        </div>
        <div>
          <Sparkles size={18} />
          <strong>{Math.max(kegelLevel, breathLevel)}</strong>
          <span>{t.overallLevel}</span>
        </div>
      </div>

      <div className="section-heading" style={{ marginTop: 8 }}>
        <h3>{t.weeklyGoalTitle}</h3>
      </div>
      <div className="sunday-box" style={{ marginBottom: 28 }}>
        <div className="sunday-icon">
          <Flame size={17} />
        </div>
        <div>
          <span className="eyebrow">{t.thisWeek}</span>
          <h4>
            {thisWeekDays} / {weeklyGoalDays} {t.daysUnit}
          </h4>
          <p>{t.weeklyGoalDesc}</p>
        </div>
        <div className="score-control">
          <button onClick={() => onSetWeeklyGoal(Math.max(1, weeklyGoalDays - 1))}>
            <Minus size={15} />
          </button>
          <strong>{weeklyGoalDays}</strong>
          <button onClick={() => onSetWeeklyGoal(Math.min(7, weeklyGoalDays + 1))}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="tracks">
        <TrackCard
          typeLabel={`${t.track} ${t.kegel}`}
          level={kegelLevel}
          name={pick(KEGEL_LEVELS[kegelLevel - 1], lang)}
          description={pick(KEGEL_DESC[kegelLevel - 1], lang)}
          progress={kegelProgress}
          accent="amber"
          meta={`${kegelLevel} ${t.of9}`}
        />
        <TrackCard
          typeLabel={`${t.track} ${t.breathLabel}`}
          level={breathLevel}
          name={pick(BREATH_NAMES[breathLevel - 1], lang)}
          description={pick(BREATH_DESC[breathLevel - 1], lang)}
          progress={breathProgress}
          accent="teal"
          meta={`${breathingTotal} ${t.minTotal}`}
        />
      </div>

      <div className="compare-card">
        <div>
          <span className="eyebrow">{t.monthlyView}</span>
          <h3>
            {t.youNowVs} <span>{t.vs}</span> {monthly.label}
          </h3>
        </div>
        <div className="compare-values">
          <div>
            <span>{t.streak}</span>
            <strong>
              {streak} → {monthly.streak}
            </strong>
            <small>{t.buildingRhythm}</small>
          </div>
          <div>
            <span>{t.breathLabel}</span>
            <strong>
              {breathingTotal} → {monthly.breath}
            </strong>
            <small>{t.everyMinute}</small>
          </div>
        </div>
      </div>

      <div className="section-heading" style={{ marginTop: 34 }}>
        <h3>{t.activityTitle}</h3>
      </div>
      <ActivityHeatmap sessions={sessions} t={t} />

      <div className="section-heading">
        <h3>{t.timePerWorkout}</h3>
      </div>
      <WorkoutBreakdown sessions={sessions} t={t} />

      <div className="section-heading">
        <h3>{t.settingsTrainings}</h3>
        <button className="text-button" onClick={onGoToLibrary}>
          {t.library} <ArrowRight size={15} />
        </button>
      </div>
      {activeWorkouts.length === 0 ? (
        <p className="subtle" style={{ margin: '4px 0 24px' }}>{t.noSessionsYet}</p>
      ) : (
        <div className="breakdown-list" style={{ marginBottom: 28 }}>
          {activeWorkouts.map((w) => (
            <button
              key={w.id}
              className="breakdown-row"
              style={{ width: '100%', textAlign: 'left', border: 0, background: 'transparent', cursor: 'pointer' }}
              onClick={() => onOpenWorkout(w.id)}
            >
              <div className="breakdown-icon">{workoutIcon(w.icon, 16)}</div>
              <span className="breakdown-name">{t[w.nameKey as keyof Dict] as string}</span>
              <span className="breakdown-stat">{diffLabel[getWorkoutDifficulty(profile, w.id)]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="section-heading">
        <h3>{t.sessionHistoryTitle}</h3>
      </div>
      <SessionHistory sessions={sessions} t={t} lang={lang} />

      <div className="section-heading">
        <h3>{t.preferencesTitle}</h3>
      </div>
      <button
        className="ghost-button full"
        style={{ marginBottom: 28, justifyContent: 'space-between' }}
        onClick={() => onToggleSound(!profile.soundEnabled)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Volume2 size={16} /> {t.soundToggleLabel}
        </span>
        <span style={{ color: profile.soundEnabled ? 'var(--accent-teal-text)' : 'var(--text-tertiary)' }}>
          {profile.soundEnabled ? t.on : t.off}
        </span>
      </button>

      <div className="section-heading">
        <h3>{t.backupTitle}</h3>
      </div>
      <button className="ghost-button full" style={{ marginBottom: 28 }} onClick={onOpenBackup}>
        <Download size={16} /> {t.backupTitle}
      </button>
    </div>
  );
}

function BackupModal({
  t,
  data,
  onClose,
  onImport,
}: {
  t: Dict;
  data: StoredData;
  onClose: () => void;
  onImport: (data: StoredData) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rdzen-backup-${todayKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          !parsed.profile ||
          !Array.isArray(parsed.sessions) ||
          !Array.isArray(parsed.journal)
        ) {
          throw new Error('invalid shape');
        }
        onImport(parsed as StoredData);
        setImported(true);
      } catch {
        setError(t.backupImportError);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="modal-backdrop">
      <div className="breath-modal animate-in" style={{ maxWidth: 420, textAlign: 'left' }}>
        <button className="close-button" onClick={onClose}><X size={19} /></button>
        <span className="eyebrow">{t.backupTitle}</span>
        <h2 style={{ marginBottom: 8 }}>{t.backupTitle}</h2>
        <p className="subtle" style={{ marginBottom: 22 }}>{t.backupSubtitle}</p>
        <button className="primary-button full" onClick={handleExport}>
          <Download size={16} /> {t.backupExport}
        </button>
        <button className="ghost-button full" style={{ marginTop: 10 }} onClick={handleImportClick}>
          <Upload size={16} /> {t.backupImport}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {error && (
          <p style={{ color: 'var(--accent-text)', fontSize: 12, marginTop: 14 }}>{error}</p>
        )}
        {imported && !error && (
          <p style={{ color: 'var(--accent-teal-text)', fontSize: 12, marginTop: 14 }}>
            {t.backupImportSuccess}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickLogModal({
  t,
  existing,
  onSave,
  onSkip,
}: {
  t: Dict;
  existing?: JournalEntry;
  onSave: (tension: number, mood: number, control?: number) => void;
  onSkip: () => void;
}) {
  const [tension, setTension] = useState(existing?.tension ?? 3);
  const [mood, setMood] = useState(existing?.mood ?? 3);
  const [control, setControl] = useState(existing?.control ?? 3);
  const isSunday = new Date().getDay() === 0;

  return (
    <div className="modal-backdrop">
      <div className="breath-modal animate-in" style={{ maxWidth: 400 }}>
        <button className="close-button" onClick={onSkip}><X size={19} /></button>
        <span className="eyebrow">{t.quickLogEyebrow}</span>
        <h2 style={{ marginBottom: 4 }}>{t.quickLogTitle}</h2>
        <p className="subtle" style={{ marginBottom: 22 }}>{t.quickLogSubtitle}</p>
        <Slider
          label={t.tensionLevel}
          value={tension}
          minLabel={t.loose}
          maxLabel={t.tight}
          onChange={setTension}
        />
        <Slider
          label={t.mood}
          value={mood}
          minLabel={t.low}
          maxLabel={t.well}
          onChange={setMood}
        />
        {isSunday && (
          <div className="sunday-box">
            <div className="sunday-icon">
              <Sparkles size={17} />
            </div>
            <div>
              <span className="eyebrow">{t.weekSummary}</span>
              <h4>{t.controlRate}</h4>
              <p>{t.feedsKegel}</p>
            </div>
            <div className="score-control">
              <button onClick={() => setControl(Math.max(1, control - 1))}>
                <Minus size={15} />
              </button>
              <strong>{control}</strong>
              <button onClick={() => setControl(Math.min(5, control + 1))}>
                <Plus size={15} />
              </button>
            </div>
          </div>
        )}
        <button
          className="primary-button full"
          style={{ marginTop: 12 }}
          onClick={() => onSave(tension, mood, isSunday ? control : undefined)}
        >
          <Check size={16} /> {t.saveEntry}
        </button>
        <button className="ghost-button full" style={{ marginTop: 10 }} onClick={onSkip}>
          {t.skipLog}
        </button>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  minLabel,
  maxLabel,
  onChange,
}: {
  label: string;
  value: number;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="slider-block">
      <div className="slider-heading">
        <label>{label}</label>
        <strong>
          {value}
          <span> / 5</span>
        </strong>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="range-labels">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function KegelModal({
  t,
  difficultyNormal,
  difficultyReverse,
  soundEnabled,
  onClose,
  onFinish,
}: {
  t: Dict;
  difficultyNormal: Difficulty;
  difficultyReverse: Difficulty;
  soundEnabled: boolean;
  onClose: () => void;
  onFinish: (mode: KegelMode) => void;
}) {
  const [mode, setMode] = useState<KegelMode>('normal');
  const difficulty = mode === 'reverse' ? difficultyReverse : difficultyNormal;
  const [holdSeconds, setHoldSeconds] = useState<number>(KEGEL_DIFFICULTY[difficultyNormal].hold);
  const [stage, setStage] = useState<'setup' | 'ready' | 'running' | 'done'>('setup');
  const [elapsed, setElapsed] = useState(0);
  const PHASE_LEN = holdSeconds;
  const TOTAL_REPS = KEGEL_DIFFICULTY[difficulty].reps;
  const TOTAL_SECONDS = PHASE_LEN * 2 * TOTAL_REPS;

  useEffect(() => {
    if (stage !== 'running') return;
    const interval = window.setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= TOTAL_SECONDS) {
          window.clearInterval(interval);
          vibrate([40, 50, 40]);
          if (soundEnabled) playTone(880, 220);
          setStage('done');
          return TOTAL_SECONDS;
        }
        if (next % PHASE_LEN === 0) {
          vibrate(30);
          if (soundEnabled) playTone(440, 90);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [stage, PHASE_LEN, TOTAL_SECONDS, soundEnabled]);

  const rep = Math.floor(elapsed / (PHASE_LEN * 2));
  const within = elapsed % (PHASE_LEN * 2);
  const isSqueezePhase = within < PHASE_LEN;
  const countdown = PHASE_LEN - (within % PHASE_LEN);

  const circleExpand = mode === 'normal' ? isSqueezePhase : !isSqueezePhase;
  // Etykieta tekstowa musi byc spojna z animacja kolka (circleExpand), nie z
  // surowym timingiem fazy (isSqueezePhase) — inaczej w trybie 'reverse'
  // kolko pokazuje rozluznienie, a tekst wciaz mowi "Napnij".
  const actionLabel = circleExpand ? t.squeeze : t.release;

  return (
    <div className="modal-backdrop">
      <div className="breath-modal">
        <button className="close-button" onClick={onClose}>
          <X size={19} />
        </button>
        {stage === 'setup' && (
          <>
            <span className="eyebrow">{t.kegelSession}</span>
            <h2>{mode === 'reverse' ? t.kegelIntroReverse : t.kegelIntro}</h2>
            <div className="duration-options">
              <button
                className={mode === 'normal' ? 'selected' : ''}
                onClick={() => setMode('normal')}
              >
                <Activity size={20} />
                <strong>{t.normalKegel}</strong>
                <small>{t.squeeze} → {t.release}</small>
              </button>
              <button
                className={mode === 'reverse' ? 'selected' : ''}
                onClick={() => setMode('reverse')}
              >
                <RotateCw size={20} />
                <strong>{t.reverseKegel}</strong>
                <small>{t.release} → {t.squeeze}</small>
              </button>
            </div>
            <p className="subtle" style={{ margin: '0 0 10px' }}>{t.holdDuration}</p>
            <div className="duration-options" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {[3, 4, 5].map((secs) => (
                <button
                  key={secs}
                  className={holdSeconds === secs ? 'selected' : ''}
                  onClick={() => setHoldSeconds(secs)}
                >
                  <strong>{secs}</strong>
                  <span>{t.sec}</span>
                </button>
              ))}
            </div>
            <p className="breath-tip">
              {TOTAL_REPS} {t.repsPlural} · {t.totalTime}{' '}
              {Math.floor(TOTAL_SECONDS / 60)}:{(TOTAL_SECONDS % 60).toString().padStart(2, '0')}
            </p>
            <button
              className="primary-button full"
              onClick={() => setStage('ready')}
            >
              <Play size={17} fill="currentColor" /> {t.startSession}
            </button>
          </>
        )}
        {stage === 'ready' && (
          <>
            <span className="eyebrow">{mode === 'reverse' ? t.reverseKegel : t.normalKegel}</span>
            <h2>{t.getReady}</h2>
            <div className="breath-circle ready-pulse">
              <div>
                <strong>{mode === 'reverse' ? t.release : t.squeeze}</strong>
                <span>{t.rep} 1 {t.of} 10</span>
              </div>
            </div>
            <p className="breath-tip">{mode === 'reverse' ? t.kegelIntroReverse : t.kegelIntro}</p>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setStage('setup')}>
                <X size={16} /> {t.cancel}
              </button>
              <button
                className="primary-button full"
                onClick={() => {
                  setElapsed(0);
                  setStage('running');
                  vibrate(30);
                }}
              >
                <Play size={17} fill="currentColor" /> {t.start}
              </button>
            </div>
          </>
        )}
        {(stage === 'running' || stage === 'done') && (
          <>
            <span className="eyebrow">
              {t.rep} {Math.min(rep + 1, TOTAL_REPS)} {t.of} {TOTAL_REPS}
            </span>
            <h2>{actionLabel}</h2>
            <div className={`breath-circle ${circleExpand ? 'inhale' : 'exhale'}`}>
              <div>
                <strong>{stage === 'done' ? 0 : countdown}</strong>
                <span>{t.sec}</span>
              </div>
            </div>
            <div className="rep-dots">
              {Array.from({ length: TOTAL_REPS }).map((_, i) => (
                <i key={i} className={i < rep ? 'filled' : ''} />
              ))}
            </div>
            <p className="breath-tip">{actionLabel} — {t.sec} {PHASE_LEN}</p>
            <div className="modal-actions">
              {stage === 'running' && (
                <button className="ghost-button" onClick={onClose}>
                  <X size={16} /> {t.cancel}
                </button>
              )}
              <button
                className="primary-button full"
                onClick={() => onFinish(mode)}
                disabled={stage !== 'done'}
              >
                <Check size={17} /> {t.finishKegel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BoxBreathingModal({
  t,
  difficulty,
  soundEnabled,
  onClose,
  onFinish,
}: {
  t: Dict;
  difficulty: Difficulty;
  soundEnabled: boolean;
  onClose: () => void;
  onFinish: (minutes: number) => void;
}) {
  const CYCLES = CYCLE_DIFFICULTY[difficulty];
  const PHASE = 4;
  const CYCLE_LEN = PHASE * 4; // wdech, zatrzymaj, wydech, zatrzymaj
  const TOTAL_SECONDS = CYCLE_LEN * CYCLES;

  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!started) return;
    const interval = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [started]);

  const isDone = seconds >= TOTAL_SECONDS;
  const withinCycle = seconds % CYCLE_LEN;
  const cycleNum = Math.min(CYCLES, Math.floor(seconds / CYCLE_LEN) + 1);

  let phase: 'inhale' | 'hold1' | 'exhale' | 'hold2';
  let phaseSeconds: number;
  if (withinCycle < PHASE) {
    phase = 'inhale';
    phaseSeconds = PHASE - withinCycle;
  } else if (withinCycle < PHASE * 2) {
    phase = 'hold1';
    phaseSeconds = PHASE * 2 - withinCycle;
  } else if (withinCycle < PHASE * 3) {
    phase = 'exhale';
    phaseSeconds = PHASE * 3 - withinCycle;
  } else {
    phase = 'hold2';
    phaseSeconds = CYCLE_LEN - withinCycle;
  }

  useEffect(() => {
    if (started && seconds > 0 && seconds % PHASE === 0) {
      vibrate(20);
      if (soundEnabled) playTone(440, 90);
    }
  }, [started, seconds, PHASE, soundEnabled]);

  useEffect(() => {
    if (isDone) {
      vibrate([40, 50, 40]);
      if (soundEnabled) playTone(880, 220);
    }
  }, [isDone, soundEnabled]);

  const phaseLabel =
    phase === 'inhale' ? t.fourSevenEightInhale :
    phase === 'exhale' ? t.fourSevenEightExhale :
    t.fourSevenEightHold;
  const circleClass = phase === 'exhale' ? 'exhale' : phase === 'inhale' ? 'inhale' : '';

  return (
    <div className={`modal-backdrop ${started && !isDone ? 'focus-mode' : ''}`}>
      <div className="breath-modal">
        <button className="close-button" onClick={onClose}>
          <X size={19} />
        </button>
        {!started ? (
          <>
            <span className="eyebrow">{t.breathingBox}</span>
            <h2>{t.boxBreathingIntro}</h2>
            <p className="subtle" style={{ margin: '12px 0 24px' }}>
              {CYCLES} × 4×{PHASE}s · {t.totalTime} {Math.round(TOTAL_SECONDS / 60)} {t.minutes}
            </p>
            <button className="primary-button full" onClick={() => setStarted(true)}>
              <Play size={17} fill="currentColor" /> {t.startSession}
            </button>
          </>
        ) : (
          <>
            <span className="eyebrow">{t.fourSevenEightCycle} {cycleNum}/{CYCLES}</span>
            <h2>{isDone ? t.sessionDone : phaseLabel}</h2>
            <div className={`breath-circle ${circleClass}`}>
              <div>
                <strong>{isDone ? 0 : phaseSeconds}</strong>
                <span>{t.sec}</span>
              </div>
            </div>
            {isDone ? (
              <button
                className="primary-button full"
                onClick={() => onFinish(Math.round(TOTAL_SECONDS / 60) || 1)}
              >
                <Check size={17} /> {t.saveEntry}
              </button>
            ) : (
              <button className="ghost-button full" onClick={onClose}>
                <X size={16} /> {t.cancel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FourSevenEightModal({
  t,
  difficulty,
  soundEnabled,
  onClose,
  onFinish,
}: {
  t: Dict;
  difficulty: Difficulty;
  soundEnabled: boolean;
  onClose: () => void;
  onFinish: (minutes: number) => void;
}) {
  const CYCLES = CYCLE_DIFFICULTY[difficulty];
  const INHALE = 4;
  const HOLD = 7;
  const EXHALE = 8;
  const CYCLE_LEN = INHALE + HOLD + EXHALE;
  const TOTAL_SECONDS = CYCLE_LEN * CYCLES;

  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!started) return;
    const interval = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [started]);

  const isDone = seconds >= TOTAL_SECONDS;
  const withinCycle = seconds % CYCLE_LEN;
  const cycleNum = Math.min(CYCLES, Math.floor(seconds / CYCLE_LEN) + 1);

  let phase: 'inhale' | 'hold' | 'exhale';
  let phaseSeconds: number;
  if (withinCycle < INHALE) {
    phase = 'inhale';
    phaseSeconds = INHALE - withinCycle;
  } else if (withinCycle < INHALE + HOLD) {
    phase = 'hold';
    phaseSeconds = INHALE + HOLD - withinCycle;
  } else {
    phase = 'exhale';
    phaseSeconds = CYCLE_LEN - withinCycle;
  }

  useEffect(() => {
    if (started && seconds > 0 && (seconds % CYCLE_LEN === 0 || seconds % CYCLE_LEN === INHALE || seconds % CYCLE_LEN === INHALE + HOLD)) {
      vibrate(25);
      if (soundEnabled) playTone(440, 90);
    }
  }, [started, seconds, CYCLE_LEN, INHALE, HOLD, soundEnabled]);

  useEffect(() => {
    if (isDone) {
      vibrate([40, 50, 40]);
      if (soundEnabled) playTone(880, 220);
    }
  }, [isDone, soundEnabled]);

  const phaseLabel = phase === 'inhale' ? t.fourSevenEightInhale : phase === 'hold' ? t.fourSevenEightHold : t.fourSevenEightExhale;
  const circleClass = phase === 'exhale' ? 'exhale' : phase === 'inhale' ? 'inhale' : '';

  return (
    <div className={`modal-backdrop ${started && !isDone ? 'focus-mode' : ''}`}>
      <div className="breath-modal">
        <button className="close-button" onClick={onClose}>
          <X size={19} />
        </button>
        {!started ? (
          <>
            <span className="eyebrow">{t.breathing478}</span>
            <h2>{t.fourSevenEightIntro}</h2>
            <p className="subtle" style={{ margin: '12px 0 24px' }}>
              {CYCLES} × ({INHALE}s + {HOLD}s + {EXHALE}s) · {t.totalTime} {Math.round(TOTAL_SECONDS / 60)} {t.minutes}
            </p>
            <button className="primary-button full" onClick={() => setStarted(true)}>
              <Play size={17} fill="currentColor" /> {t.startSession}
            </button>
          </>
        ) : (
          <>
            <span className="eyebrow">{t.fourSevenEightCycle} {cycleNum}/{CYCLES}</span>
            <h2>{isDone ? t.sessionDone : phaseLabel}</h2>
            <div className={`breath-circle ${circleClass}`}>
              <div>
                <strong>{isDone ? 0 : phaseSeconds}</strong>
                <span>{t.sec}</span>
              </div>
            </div>
            {isDone ? (
              <button
                className="primary-button full"
                onClick={() => onFinish(Math.round(TOTAL_SECONDS / 60) || 1)}
              >
                <Check size={17} /> {t.saveEntry}
              </button>
            ) : (
              <button className="ghost-button full" onClick={onClose}>
                <X size={16} /> {t.cancel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BreathingModal({
  t,
  difficulty,
  soundEnabled,
  onClose,
  onFinish,
}: {
  t: Dict;
  difficulty: Difficulty;
  soundEnabled: boolean;
  onClose: () => void;
  onFinish: (minutes: number) => void;
}) {
  const [minutes, setMinutes] = useState(BREATHING_CALM_MINUTES[difficulty]);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!started) return;
    const interval = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [started]);

  const totalSeconds = minutes * 60;
  const isDone = seconds >= totalSeconds;
  const phase = seconds % 10 < 4 ? 'inhale' : 'exhale';
  const phaseSeconds = seconds % 10 < 4 ? 4 - (seconds % 10) : 10 - (seconds % 10);
  const remaining = Math.max(0, totalSeconds - seconds);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  useEffect(() => {
    if (started && seconds > 0 && seconds % 10 === 0) {
      vibrate(20);
      if (soundEnabled) playTone(440, 90);
    }
  }, [started, seconds, soundEnabled]);

  useEffect(() => {
    if (isDone) {
      vibrate([40, 50, 40]);
      if (soundEnabled) playTone(880, 220);
    }
  }, [isDone, soundEnabled]);

  return (
    <div className={`modal-backdrop ${started && !isDone ? 'focus-mode' : ''}`}>
      <div className="breath-modal">
        <button className="close-button" onClick={onClose}>
          <X size={19} />
        </button>
        {!started ? (
          <>
            <span className="eyebrow">{t.breathSession}</span>
            <h2>{t.chooseRhythm}</h2>
            <p className="subtle">{t.leadBreath}</p>
            <div className="duration-options" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <button
                className={minutes === 2 ? 'selected' : ''}
                onClick={() => setMinutes(2)}
              >
                <strong>2</strong>
                <span>{t.minutes}</span>
                <small>{t.quickReset}</small>
              </button>
              <button
                className={minutes === 3 ? 'selected' : ''}
                onClick={() => setMinutes(3)}
              >
                <strong>3</strong>
                <span>{t.minutes}</span>
                <small>{t.difficultyIntermediate}</small>
              </button>
              <button
                className={minutes === 5 ? 'selected' : ''}
                onClick={() => setMinutes(5)}
              >
                <strong>5</strong>
                <span>{t.minutes5}</span>
                <small>{t.deepPractice}</small>
              </button>
            </div>
            <button className="primary-button full" onClick={() => setStarted(true)}>
              <Play size={17} fill="currentColor" /> {t.startSession}
            </button>
          </>
        ) : (
          <>
            <span className="eyebrow">{t.breathe}</span>
            <h2>{phase === 'inhale' ? t.inhale : t.exhale}</h2>
            <div className={`breath-circle ${phase}`}>
              <div>
                <strong>{isDone ? 0 : phaseSeconds}</strong>
                <span>{t.sec}</span>
              </div>
            </div>
            <p className="breath-tip">
              {mm}:{ss.toString().padStart(2, '0')} · {t.breathTip}
            </p>
            <div className="modal-actions">
              {!isDone && (
                <button className="ghost-button" onClick={onClose}>
                  <X size={16} /> {t.cancel}
                </button>
              )}
              <button
                className="primary-button full"
                onClick={() => onFinish(minutes)}
                disabled={!isDone}
              >
                <Check size={17} /> {t.finishSave} {minutes} {t.minutes}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const GROUNDING_BREATH_SECONDS = 30;

function GroundingModal({
  t,
  soundEnabled,
  onClose,
}: {
  t: Dict;
  soundEnabled: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<'breath' | 'steps'>('breath');
  const [breathSeconds, setBreathSeconds] = useState(0);
  const [step, setStep] = useState(0);
  const steps = [t.see, t.touch, t.hear, t.smell, t.taste];
  const icons = [Sparkles, Hand, Activity, Wind, HeartPulse];
  const isLast = step >= steps.length - 1;
  const Icon = icons[step];

  useEffect(() => {
    if (phase !== 'breath') return;
    const interval = window.setInterval(() => setBreathSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === 'breath' && breathSeconds >= GROUNDING_BREATH_SECONDS) setPhase('steps');
  }, [breathSeconds, phase]);

  useEffect(() => {
    if (phase === 'breath' && breathSeconds > 0 && breathSeconds % 10 === 0) {
      vibrate(20);
      if (soundEnabled) playTone(440, 90);
    }
  }, [phase, breathSeconds, soundEnabled]);

  useEffect(() => {
    if (step > 0) vibrate(25);
  }, [step]);

  const breathPhase = breathSeconds % 10 < 4 ? 'inhale' : 'exhale';
  const breathPhaseSeconds = breathSeconds % 10 < 4 ? 4 - (breathSeconds % 10) : 10 - (breathSeconds % 10);

  return (
    <div className={`modal-backdrop ${phase === 'breath' ? 'focus-mode' : ''}`}>
      <div className="breath-modal">
        <button className="close-button" onClick={onClose}>
          <X size={19} />
        </button>
        {phase === 'breath' ? (
          <>
            <span className="eyebrow">{t.grounding}</span>
            <h2>{breathPhase === 'inhale' ? t.inhale : t.exhale}</h2>
            <div className={`breath-circle ${breathPhase}`}>
              <div>
                <strong>{breathPhaseSeconds}</strong>
                <span>{t.sec}</span>
              </div>
            </div>
            <p className="breath-tip">{t.groundingBreathIntro}</p>
            <button className="ghost-button full" onClick={() => setPhase('steps')}>
              {t.skipBreath} <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <span className="eyebrow">{t.grounding}</span>
            <h2>{t.groundingIntro}</h2>
            <div className="grounding-step">
              <div className="grounding-icon">
                <Icon size={36} />
              </div>
              <strong>{steps[step]}</strong>
              <div className="rep-dots">
                {steps.map((_, i) => (
                  <i key={i} className={i <= step ? 'filled' : ''} />
                ))}
              </div>
            </div>
            <button
              className="primary-button full"
              onClick={() => (isLast ? onClose() : setStep(step + 1))}
            >
              {isLast ? (
                <>
                  <Check size={17} /> {t.finishGrounding}
                </>
              ) : (
                <>
                  {t.start} <ArrowRight size={17} />
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function computeMonthly(
  sessions: Session[],
  lang: Lang,
): { label: string; streak: number; breath: number } {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86400000);
  const monthAgoKey = monthAgo.toISOString().slice(0, 10);

  const oldKegelDates = new Set(
    sessions
      .filter((s) => s.type === 'kegel' && s.date <= monthAgoKey)
      .map((s) => s.date),
  );
  let oldStreak = 0;
  let cursor = new Date(monthAgo);
  while (oldKegelDates.has(cursor.toISOString().slice(0, 10))) {
    oldStreak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }

  const oldBreath = sessions
    .filter((s) => s.type === 'breathing' && s.date <= monthAgoKey)
    .reduce((sum, s) => sum + (s.minutes || 0), 0);

  const monthLabel = monthAgo.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', {
    month: 'short',
  });
  return { label: monthLabel, streak: oldStreak, breath: oldBreath };
}

export default App;

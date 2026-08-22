import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  Compass,
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
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Timer,
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
import { WORKOUTS, type Workout } from './workouts';
import { WORKOUT_EDUCATION } from './workoutEducation';

type View = 'today' | 'progress' | 'journal' | 'library';
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

type Profile = {
  selectedWorkouts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  hasCompletedOnboarding: boolean;
};

type StoredData = {
  profile: Profile;
  sessions: Session[];
  journal: JournalEntry[];
};

type NotifSlot = 'morning' | 'day' | 'evening' | 'sunday';

const NOTIF_TIMES: { slot: NotifSlot; hour: number; minute: number; sundayOnly?: boolean }[] = [
  { slot: 'morning', hour: 7, minute: 0 },
  { slot: 'day', hour: 13, minute: 0 },
  { slot: 'evening', hour: 20, minute: 0 },
  { slot: 'sunday', hour: 19, minute: 0, sundayOnly: true },
];

function notifTextFor(slot: NotifSlot, t: Dict): string {
  if (slot === 'morning') return t.notifMorning;
  if (slot === 'day') return t.notifDay;
  if (slot === 'evening') return t.notifEvening;
  return t.notifSunday;
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

function App() {
  const [view, setView] = useState<View>('today');
  const [lang, setLang] = useState<Lang>(loadLang);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [data, setData] = useState<StoredData>(EMPTY_DATA);
  const [breathingOpen, setBreathingOpen] = useState(false);
  const [kegelOpen, setKegelOpen] = useState(false);
  const [groundingOpen, setGroundingOpen] = useState(false);
  const [fourSevenEightOpen, setFourSevenEightOpen] = useState(false);
  const [libraryDetail, setLibraryDetail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(
    () => 'Notification' in window && Notification.permission === 'granted',
  );
  const [levelUpToast, setLevelUpToast] = useState<{ track: 'kegel' | 'breath'; level: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
    const completedWeeks = countCompletedWeeks(data.sessions, data.journal);
    const level = Math.min(9, completedWeeks + 1);
    const progress = Math.min(100, (completedWeeks / 9) * 100);
    return { kegelLevel: level, kegelProgress: progress };
  }, [data.sessions, data.journal]);

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
        if (slotDef.sundayOnly && now.getDay() !== 0) continue;
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

  useEffect(() => {
    if (prevKegelLevel.current !== null && kegelLevel > prevKegelLevel.current) {
      setLevelUpToast({ track: 'kegel', level: kegelLevel });
      if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160]);
      if (notifEnabled) fireNotification(t.notifLevelUp);
    }
    prevKegelLevel.current = kegelLevel;
  }, [kegelLevel, notifEnabled, t]);

  useEffect(() => {
    if (prevBreathLevel.current !== null && breathLevel > prevBreathLevel.current) {
      setLevelUpToast({ track: 'breath', level: breathLevel });
      if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160]);
      if (notifEnabled) fireNotification(t.notifLevelUp);
    }
    prevBreathLevel.current = breathLevel;
  }, [breathLevel, notifEnabled, t]);

  useEffect(() => {
    if (!levelUpToast) return;
    const timeout = setTimeout(() => setLevelUpToast(null), 6000);
    return () => clearTimeout(timeout);
  }, [levelUpToast]);

  const isWorkoutDoneToday = (workoutId: string) =>
    todaysSessions.some((s) => s.workoutId === workoutId);
  const fourSevenEightDone = isWorkoutDoneToday('breathing-4-7-8');

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={19} />
          </div>
          <span>{t.brand}</span>
        </div>
        <div className="profile-card">
          <div className="avatar">M</div>
          <div>
            <strong>{t.yourRhythm}</strong>
            <span>
              {streak} {t.dayStreak}
            </span>
          </div>
          <ChevronRight size={16} />
        </div>
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
            active={view === 'progress'}
            icon={<BarChart3 size={18} />}
            label={t.progress}
            onClick={() => {
              setView('progress');
              setMenuOpen(false);
            }}
          />
          <NavItem
            active={view === 'journal'}
            icon={<Moon size={18} />}
            label={t.journal}
            onClick={() => {
              setView('journal');
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
          <button className="quiet-link" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> {t.settingsTitle}
          </button>
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
              {view === 'today' ? t.today : view === 'progress' ? t.progress : t.journal}
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
            onKegel={() => setKegelOpen(true)}
            onBreathing={() => setBreathingOpen(true)}
            onFourSevenEight={() => setFourSevenEightOpen(true)}
            onGrounding={() => setGroundingOpen(true)}
            onJournal={() => setView('journal')}
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
        {view === 'progress' && (
          <ProgressView
            t={t}
            lang={lang}
            streak={streak}
            kegelLevel={kegelLevel}
            kegelProgress={kegelProgress}
            breathLevel={breathLevel}
            breathProgress={breathProgress}
            breathingTotal={breathingTotal}
            sessions={data.sessions}
          />
        )}
        {view === 'journal' && (
          <JournalView
            t={t}
            journal={data.journal}
            onSave={saveJournal}
          />
        )}
      </main>

      {kegelOpen && (
        <KegelModal
          t={t}
          difficulty={data.profile.difficulty}
          onClose={() => setKegelOpen(false)}
          onFinish={(mode) => {
            completeKegel(mode);
            setKegelOpen(false);
          }}
        />
      )}
      {breathingOpen && (
        <BreathingModal
          t={t}
          difficulty={data.profile.difficulty}
          onClose={() => setBreathingOpen(false)}
          onFinish={(minutes) => {
            finishBreathing(minutes, 'breathing-calm');
            setBreathingOpen(false);
          }}
        />
      )}
      {fourSevenEightOpen && (
        <FourSevenEightModal
          t={t}
          difficulty={data.profile.difficulty}
          onClose={() => setFourSevenEightOpen(false)}
          onFinish={(minutes) => {
            finishBreathing(minutes, 'breathing-4-7-8');
            setFourSevenEightOpen(false);
          }}
        />
      )}
      {groundingOpen && (
        <GroundingModal t={t} onClose={() => setGroundingOpen(false)} />
      )}
      {libraryDetail && (
        <LibraryDetailModal
          t={t}
          lang={lang}
          workoutId={libraryDetail}
          isAdded={data.profile.selectedWorkouts.includes(libraryDetail)}
          onClose={() => setLibraryDetail(null)}
          onAdd={() => {
            setData((d) => ({
              ...d,
              profile: { ...d.profile, selectedWorkouts: [...d.profile.selectedWorkouts, libraryDetail] },
            }));
            setLibraryDetail(null);
          }}
          onStart={() => {
            setLibraryDetail(null);
            if (libraryDetail === 'kegel-normal' || libraryDetail === 'kegel-reverse') setKegelOpen(true);
            else if (libraryDetail === 'breathing-calm') setBreathingOpen(true);
            else if (libraryDetail === 'breathing-4-7-8') setFourSevenEightOpen(true);
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
      {showOnboarding && (
        <OnboardingModal
          t={t}
          onComplete={(profile) => {
            saveProfile({ ...profile, hasCompletedOnboarding: true });
            setShowOnboarding(false);
          }}
        />
      )}
      {showSettings && (
        <SettingsModal
          t={t}
          profile={data.profile}
          onSave={(profile) => {
            saveProfile({ ...profile, hasCompletedOnboarding: true });
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
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
  onComplete: (profile: { selectedWorkouts: string[]; difficulty: 'beginner' | 'intermediate' | 'advanced' }) => void;
}) {
  const [choice, setChoice] = useState<'kegel' | 'breath' | 'both'>('both');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  const workouts = choice === 'kegel'
    ? ['kegel-normal']
    : choice === 'breath'
    ? ['breathing-calm']
    : ['kegel-normal', 'breathing-calm'];

  const diffOptions: { key: 'beginner' | 'intermediate' | 'advanced'; label: string; desc: string }[] = [
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
          {([
            { key: 'kegel', label: t.workoutKegel, desc: t.workoutKegelDesc, icon: <Target size={22} /> },
            { key: 'breath', label: t.workoutBreath, desc: t.workoutBreathDesc, icon: <Wind size={22} /> },
            { key: 'both', label: t.workoutBoth, desc: t.workoutBothDesc, icon: <Zap size={22} /> },
          ] as const).map(opt => (
            <button
              key={opt.key}
              className={`choice-card ${choice === opt.key ? 'selected' : ''}`}
              onClick={() => setChoice(opt.key)}
            >
              <div className="choice-icon">{opt.icon}</div>
              <strong>{opt.label}</strong>
              <span>{opt.desc}</span>
            </button>
          ))}
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

        <button
          className="primary-button full"
          style={{ marginTop: 28 }}
          onClick={() => onComplete({ selectedWorkouts: workouts, difficulty })}
        >
          {t.onboardingBegin} <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

function SettingsModal({
  t,
  profile,
  onSave,
  onClose,
}: {
  t: Dict;
  profile: Profile;
  onSave: (profile: Profile) => void;
  onClose: () => void;
}) {
  const hasKegel = profile.selectedWorkouts.includes('kegel-normal');
  const hasBreath = profile.selectedWorkouts.includes('breathing-calm');
  const [choice, setChoice] = useState<'kegel' | 'breath' | 'both'>(
    hasKegel && hasBreath ? 'both' : hasKegel ? 'kegel' : 'breath'
  );
  const [difficulty, setDifficulty] = useState(profile.difficulty);

  const diffOptions: { key: 'beginner' | 'intermediate' | 'advanced'; label: string }[] = [
    { key: 'beginner', label: t.difficultyBeginner },
    { key: 'intermediate', label: t.difficultyIntermediate },
    { key: 'advanced', label: t.difficultyAdvanced },
  ];

  const save = () => {
    const workouts = choice === 'kegel'
      ? ['kegel-normal']
      : choice === 'breath'
      ? ['breathing-calm']
      : ['kegel-normal', 'breathing-calm'];
    onSave({ ...profile, selectedWorkouts: workouts, difficulty });
  };

  return (
    <div className="modal-backdrop">
      <div className="breath-modal animate-in" style={{ maxWidth: 420 }}>
        <button className="close-button" onClick={onClose}><X size={19} /></button>
        <h2 style={{ marginBottom: 20 }}>{t.settingsTitle}</h2>

        <p className="onboarding-label">{t.settingsTrainings}</p>
        <div className="settings-choice">
          {([
            { key: 'kegel', label: t.workoutKegel },
            { key: 'breath', label: t.workoutBreath },
            { key: 'both', label: t.workoutBoth },
          ] as const).map(opt => (
            <button
              key={opt.key}
              className={`diff-card ${choice === opt.key ? 'selected' : ''}`}
              onClick={() => setChoice(opt.key)}
            >
              <strong>{opt.label}</strong>
            </button>
          ))}
        </div>

        <p className="onboarding-label" style={{ marginTop: 20 }}>{t.settingsDifficulty}</p>
        <div className="settings-choice">
          {diffOptions.map(opt => (
            <button
              key={opt.key}
              className={`diff-card ${difficulty === opt.key ? 'selected' : ''}`}
              onClick={() => setDifficulty(opt.key)}
            >
              <strong>{opt.label}</strong>
            </button>
          ))}
        </div>

        <button className="primary-button full" style={{ marginTop: 24 }} onClick={save}>
          <Check size={16} /> {t.saveEntry}
        </button>
      </div>
    </div>
  );
}

function countCompletedWeeks(sessions: Session[], journal: JournalEntry[]): number {
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
    if (count >= 5) {
      const sundayKey = wEnd.toISOString().slice(0, 10);
      const sundayEntry = journal.find((j) => j.date === sundayKey);
      if (sundayEntry && (sundayEntry.control ?? 0) >= 3) weeks++;
    }
    cursor = new Date(cursor.getTime() + 7 * 86400000);
  }
  return weeks;
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
  onKegel,
  onBreathing,
  onFourSevenEight,
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
  onKegel: () => void;
  onBreathing: () => void;
  onFourSevenEight: () => void;
  onGrounding: () => void;
  onJournal: () => void;
}) {
  const showKegel = selectedWorkouts.includes('kegel-normal') || selectedWorkouts.includes('kegel-reverse');
  const showBreath = selectedWorkouts.includes('breathing-calm');
  const show478 = selectedWorkouts.includes('breathing-4-7-8');
  const sessionCount = (showKegel ? 1 : 0) + (showBreath ? 1 : 0) + (show478 ? 1 : 0);
  const doneCount =
    (showKegel && kegelDone ? 1 : 0) +
    (showBreath && breathingDone ? 1 : 0) +
    (show478 && fourSevenEightDone ? 1 : 0);
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
          <button className="primary-button" onClick={onKegel}>
            {kegelDone ? (
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

function ProgressView({
  t,
  lang,
  streak,
  kegelLevel,
  kegelProgress,
  breathLevel,
  breathProgress,
  breathingTotal,
  sessions,
}: {
  t: Dict;
  lang: Lang;
  streak: number;
  kegelLevel: number;
  kegelProgress: number;
  breathLevel: number;
  breathProgress: number;
  breathingTotal: number;
  sessions: Session[];
}) {
  const monthly = useMemo(() => computeMonthly(sessions, lang), [sessions, lang]);
  return (
    <div className="page animate-in">
      <div className="progress-intro">
        <span className="eyebrow">{t.onlyYou}</span>
        <h2>{t.progressTitle}</h2>
        <p className="subtle">{t.progressSub}</p>
      </div>
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
  onClose,
  onAdd,
  onStart,
}: {
  t: Dict;
  lang: Lang;
  workoutId: string;
  isAdded: boolean;
  onClose: () => void;
  onAdd: () => void;
  onStart: () => void;
}) {
  const workout = WORKOUTS.find((w) => w.id === workoutId);
  const edu = WORKOUT_EDUCATION[workoutId];
  if (!workout) return null;

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
            {isAdded ? (
              <button className="primary-button full" style={{ marginTop: 8 }} onClick={onStart}>
                <Play size={16} fill="currentColor" /> {t.startNow}
              </button>
            ) : (
              <button className="primary-button full" style={{ marginTop: 8 }} onClick={onAdd}>
                <Plus size={16} /> {t.addToMyTrainings}
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function JournalView({
  t,
  journal,
  onSave,
}: {
  t: Dict;
  journal: JournalEntry[];
  onSave: (entry: JournalEntry) => void;
}) {
  const today = journal.find((j) => j.date === todayKey);
  const isSunday = new Date().getDay() === 0;
  const [tension, setTension] = useState(today?.tension ?? 3);
  const [mood, setMood] = useState(today?.mood ?? 3);
  const [note, setNote] = useState(today?.note ?? '');
  const [control, setControl] = useState(today?.control ?? 3);
  const [saved, setSaved] = useState(false);

  const save = () => {
    onSave({
      date: todayKey,
      tension,
      mood,
      note,
      control: isSunday ? control : undefined,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="page journal-page animate-in">
      <div className="progress-intro">
        <span className="eyebrow">{t.shortClear}</span>
        <h2>{t.journalTitle}</h2>
        <p className="subtle">{t.journalSub}</p>
      </div>
      <div className="journal-form">
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
        <div className="field-block">
          <label htmlFor="note">
            {t.todaySentence} <span>{t.optional}</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.whatNoticed}
            rows={4}
          />
        </div>
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
          className={`primary-button save-button ${saved ? 'saved' : ''}`}
          onClick={save}
        >
          {saved ? (
            <>
              <Check size={17} /> {t.saved}
            </>
          ) : (
            <>
              {t.saveEntry} <ArrowRight size={17} />
            </>
          )}
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
  difficulty,
  onClose,
  onFinish,
}: {
  t: Dict;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  onClose: () => void;
  onFinish: (mode: KegelMode) => void;
}) {
  const DIFFICULTY_DEFAULTS = {
    beginner: { hold: 3, reps: 8 },
    intermediate: { hold: 4, reps: 10 },
    advanced: { hold: 5, reps: 12 },
  } as const;
  const [mode, setMode] = useState<KegelMode>('normal');
  const [holdSeconds, setHoldSeconds] = useState<number>(DIFFICULTY_DEFAULTS[difficulty].hold);
  const [stage, setStage] = useState<'setup' | 'ready' | 'running' | 'done'>('setup');
  const [elapsed, setElapsed] = useState(0);
  const PHASE_LEN = holdSeconds;
  const TOTAL_REPS = DIFFICULTY_DEFAULTS[difficulty].reps;
  const TOTAL_SECONDS = PHASE_LEN * 2 * TOTAL_REPS;

  useEffect(() => {
    if (stage !== 'running') return;
    const interval = window.setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= TOTAL_SECONDS) {
          window.clearInterval(interval);
          vibrate([40, 50, 40]);
          setStage('done');
          return TOTAL_SECONDS;
        }
        if (next % PHASE_LEN === 0) vibrate(30);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [stage, PHASE_LEN, TOTAL_SECONDS]);

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

function FourSevenEightModal({
  t,
  difficulty,
  onClose,
  onFinish,
}: {
  t: Dict;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  onClose: () => void;
  onFinish: (minutes: number) => void;
}) {
  const CYCLES = difficulty === 'advanced' ? 8 : difficulty === 'intermediate' ? 6 : 4;
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
    }
  }, [started, seconds, CYCLE_LEN, INHALE, HOLD]);

  useEffect(() => {
    if (isDone) vibrate([40, 50, 40]);
  }, [isDone]);

  const phaseLabel = phase === 'inhale' ? t.fourSevenEightInhale : phase === 'hold' ? t.fourSevenEightHold : t.fourSevenEightExhale;
  const circleClass = phase === 'exhale' ? 'exhale' : phase === 'inhale' ? 'inhale' : '';

  return (
    <div className="modal-backdrop">
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
  onClose,
  onFinish,
}: {
  t: Dict;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  onClose: () => void;
  onFinish: (minutes: number) => void;
}) {
  const [minutes, setMinutes] = useState(difficulty === 'advanced' ? 5 : 2);
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
    if (started && seconds > 0 && seconds % 10 === 0) vibrate(20);
  }, [started, seconds]);

  return (
    <div className="modal-backdrop">
      <div className="breath-modal">
        <button className="close-button" onClick={onClose}>
          <X size={19} />
        </button>
        {!started ? (
          <>
            <span className="eyebrow">{t.breathSession}</span>
            <h2>{t.chooseRhythm}</h2>
            <p className="subtle">{t.leadBreath}</p>
            <div className="duration-options">
              <button
                className={minutes === 2 ? 'selected' : ''}
                onClick={() => setMinutes(2)}
              >
                <strong>2</strong>
                <span>{t.minutes}</span>
                <small>{t.quickReset}</small>
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

function GroundingModal({ t, onClose }: { t: Dict; onClose: () => void }) {
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
    if (phase === 'breath' && breathSeconds > 0 && breathSeconds % 10 === 0) vibrate(20);
  }, [phase, breathSeconds]);

  useEffect(() => {
    if (step > 0) vibrate(25);
  }, [step]);

  const breathPhase = breathSeconds % 10 < 4 ? 'inhale' : 'exhale';
  const breathPhaseSeconds = breathSeconds % 10 < 4 ? 4 - (breathSeconds % 10) : 10 - (breathSeconds % 10);

  return (
    <div className="modal-backdrop">
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

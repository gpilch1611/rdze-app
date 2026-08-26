export type Lang = 'pl' | 'en';

export type Dict = {
  brand: string;
  yourRhythm: string;
  dayStreak: string;
  menu: string;
  today: string;
  progress: string;
  journal: string;
  library: string;
  librarySubtitle: string;
  comingSoon: string;
  addToMyTrainings: string;
  removeFromTrainings: string;
  startNow: string;
  alreadyAdded: string;
  whatIsIt: string;
  whoFor: string;
  benefitsLabel: string;
  timelineLabel: string;
  breathing478: string;
  breathingBox: string;
  kegelNormal: string;
  kegelReverse: string;
  breathingCalm: string;
  profileTitle: string;
  breathingArousal: string;
  wimHof: string;
  bodyScan: string;
  pelvicRelease: string;
  fourSevenEightIntro: string;
  fourSevenEightInhale: string;
  fourSevenEightHold: string;
  fourSevenEightExhale: string;
  fourSevenEightCycle: string;
  boxBreathingIntro: string;
  boxBreathingDetail: string;
  privacyNote: string;
  howItWorks: string;
  todayPlan: string;
  heroLine1: string;
  heroLine2: string;
  heroSub: string;
  startTraining: string;
  sessionDone: string;
  consistency: string;
  welcomeTitle: string;
  welcomeSub: string;
  yourSet: string;
  completed: string;
  kegel: string;
  kegelSub: string;
  kegelDetail: string;
  breath: string;
  breathSub: string;
  breathDetail: string;
  fourSevenEightDetail: string;
  ready: string;
  start: string;
  yourProgress: string;
  breathTrack: string;
  details: string;
  evening: string;
  howYouFeel: string;
  oneSentence: string;
  onlyYou: string;
  progressTitle: string;
  progressSub: string;
  dayStreakUnit: string;
  breathMinutes: string;
  overallLevel: string;
  track: string;
  of9: string;
  minTotal: string;
  monthlyView: string;
  activityTitle: string;
  timePerWorkout: string;
  sessionSingular: string;
  sessionsPlural: string;
  less: string;
  more: string;
  noSessionsYet: string;
  youNowVs: string;
  vs: string;
  streak: string;
  breathLabel: string;
  buildingRhythm: string;
  everyMinute: string;
  shortClear: string;
  journalTitle: string;
  journalSub: string;
  tensionLevel: string;
  mood: string;
  loose: string;
  tight: string;
  low: string;
  well: string;
  todaySentence: string;
  optional: string;
  whatNoticed: string;
  weekSummary: string;
  controlRate: string;
  feedsKegel: string;
  saveEntry: string;
  quickLogEyebrow: string;
  backupTitle: string;
  weeklyGoalTitle: string;
  thisWeek: string;
  daysUnit: string;
  weeklyGoalDesc: string;
  sessionHistoryTitle: string;
  preferencesTitle: string;
  soundToggleLabel: string;
  on: string;
  off: string;
  backupSubtitle: string;
  backupExport: string;
  backupImport: string;
  backupImportError: string;
  backupImportSuccess: string;
  quickLogTitle: string;
  quickLogSubtitle: string;
  skipLog: string;
  saved: string;
  breathSession: string;
  chooseRhythm: string;
  leadBreath: string;
  minutes: string;
  minutes5: string;
  quickReset: string;
  deepPractice: string;
  startSession: string;
  breathe: string;
  inhale: string;
  exhale: string;
  sec: string;
  breathTip: string;
  finishSave: string;
  // kegel timer
  kegelSession: string;
  kegelIntro: string;
  kegelIntroReverse: string;
  reverseKegel: string;
  normalKegel: string;
  holdDuration: string;
  totalTime: string;
  repsPlural: string;
  squeeze: string;
  release: string;
  rep: string;
  of: string;
  finishKegel: string;
  getReady: string;
  cancel: string;
  // grounding
  strongTension: string;
  grounding: string;
  groundingIntro: string;
  see: string;
  touch: string;
  hear: string;
  smell: string;
  taste: string;
  finishGrounding: string;
  // notifications
  notifMorning: string;
  notifLevelUp: string;
  levelUpToastTitle: string;
  difficultySuggestTitle: string;
  difficultySuggestBody: string;
  difficultySuggestAccept: string;
  difficultySuggestDismiss: string;
  groundingBreathIntro: string;
  skipBreath: string;
  enableNotifs: string;
  notifsEnabled: string;
  // misc
  language: string;
  openMenu: string;
  notifications: string;
  lightMode: string;
  darkMode: string;
  // onboarding
  onboardingTitle: string;
  onboardingSubtitle: string;
  onboardingChoose: string;
  onboardingDifficulty: string;
  onboardingBegin: string;
  onboardingPickOne: string;
  difficultyBeginner: string;
  difficultyIntermediate: string;
  difficultyAdvanced: string;
  difficultyBeginnerDesc: string;
  difficultyIntermediateDesc: string;
  difficultyAdvancedDesc: string;
  workoutKegel: string;
  workoutKegelDesc: string;
  workoutBreath: string;
  workoutBreathDesc: string;
  workoutBoth: string;
  workoutBothDesc: string;
  // settings
  settingsTitle: string;
  settingsChange: string;
  settingsTrainings: string;
  settingsDifficulty: string;
  settingsClose: string;
  // notification feedback
  notifGranted: string;
  notifDenied: string;
};

export const translations: Record<Lang, Dict> = {
  pl: {
    brand: 'rdzeń',
    yourRhythm: 'Twój rytm',
    dayStreak: 'dni z rzędu',
    menu: 'Menu',
    today: 'Dzisiaj',
    progress: 'Progres',
    journal: 'Dziennik',
    library: 'Odkryj',
    librarySubtitle: 'Więcej treningów do kontroli ciała. Dodaj to, czego potrzebujesz.',
    comingSoon: 'Wkrótce',
    addToMyTrainings: 'Dodaj do moich treningów',
    removeFromTrainings: 'Usuń z moich treningów',
    startNow: 'Zacznij teraz',
    alreadyAdded: 'Już dodane ✓',
    whatIsIt: 'Na czym to polega?',
    whoFor: 'Dla kogo?',
    benefitsLabel: 'Korzyści',
    timelineLabel: 'Kiedy efekty?',
    breathing478: 'Oddech 4-7-8',
    breathingBox: 'Oddech kwadratowy',
    kegelNormal: 'Kegiel',
    kegelReverse: 'Odwrotny Kegiel',
    breathingCalm: 'Oddech uspokajający',
    profileTitle: 'Profil',
    breathingArousal: 'Oddech i pobudzenie',
    wimHof: 'Metoda Wima Hofa',
    bodyScan: 'Skan ciała',
    pelvicRelease: 'Rozluźnienie miednicy',
    fourSevenEightIntro: 'Wdech przez nos, zatrzymanie, długi wydech ustami.',
    fourSevenEightInhale: 'Wdech',
    fourSevenEightHold: 'Zatrzymaj',
    fourSevenEightExhale: 'Wydech',
    fourSevenEightCycle: 'Cykl',
    boxBreathingIntro: 'Wdech, zatrzymanie, wydech, zatrzymanie — po 4 sekundy każda faza.',
    boxBreathingDetail: '4s wdech, 4s zatrzymanie, 4s wydech, 4s zatrzymanie.',
    privacyNote: 'Twoje dane są tylko na tym urządzeniu.',
    howItWorks: 'Jak to działa?',
    todayPlan: 'DZISIEJSZY PLAN',
    heroLine1: 'Wróć do swojego',
    heroLine2: 'rdzenia.',
    heroSub: 'Świadomy oddech. Precyzyjny ruch. Mały krok, który buduje dużą zmianę.',
    startTraining: 'Zacznij trening',
    sessionDone: 'Sesja wykonana',
    consistency: 'Twoja konsekwencja działa',
    welcomeTitle: 'Spokojnie. Robisz swoje.',
    welcomeSub: 'Dwie krótkie sesje wystarczą na dobry dzień.',
    yourSet: 'Twój zestaw',
    completed: 'ukończone',
    kegel: 'Kegel',
    kegelSub: '10 powtórzeń · napięcie 3-5s',
    kegelDetail: 'Napnij i rozluźnij. W swoim tempie.',
    breath: 'Oddech',
    breathSub: '2 lub 5 minut',
    breathDetail: 'Zwolnij. Wdech 4s, wydech 6s.',
    fourSevenEightDetail: 'Wdech 4s, zatrzymaj 7s, wydech 8s.',
    ready: 'Gotowe',
    start: 'Start',
    yourProgress: 'Twój progres',
    breathTrack: 'Tor oddechu',
    details: 'Szczegóły',
    evening: 'Wieczorem',
    howYouFeel: 'Jak się dziś czujesz?',
    oneSentence: 'Jedno zdanie wystarczy.',
    onlyYou: 'Tylko Ty vs Ty',
    progressTitle: 'Widać, że to działa.',
    progressSub: 'Każda sesja dokłada coś do obrazu całości.',
    dayStreakUnit: 'dni streaka',
    breathMinutes: 'min oddechu',
    overallLevel: 'poziom ogólny',
    track: 'Tor',
    of9: 'z 9 poziomów',
    minTotal: 'min łącznie',
    monthlyView: 'Miesięczne spojrzenie',
    activityTitle: 'Aktywność',
    timePerWorkout: 'Czas na trening',
    sessionSingular: 'sesja',
    sessionsPlural: 'sesje',
    less: 'Mniej',
    more: 'Więcej',
    noSessionsYet: 'Brak sesji — zacznij pierwszy trening.',
    youNowVs: 'Ty teraz',
    vs: 'vs',
    streak: 'Streak',
    breathLabel: 'Oddech',
    buildingRhythm: '— zaczynasz budować rytm',
    everyMinute: '— każda minuta ma znaczenie',
    shortClear: 'Krótko i konkretnie',
    journalTitle: 'Zatrzymaj się na moment.',
    journalSub: 'To nie test. To sposób, żeby zauważyć zmianę.',
    tensionLevel: 'Poziom napięcia',
    mood: 'Nastrój',
    loose: 'Luźno',
    tight: 'Mocno',
    low: 'Słabo',
    well: 'Dobrze',
    todaySentence: 'Jedno zdanie na dziś',
    optional: 'opcjonalnie',
    whatNoticed: 'Co zauważyłeś?',
    weekSummary: 'Podsumowanie tygodnia',
    controlRate: 'Jak oceniasz swoją kontrolę?',
    feedsKegel: 'To zasila Twój tor Kegla.',
    saveEntry: 'Zapisz dzisiejszy wpis',
    quickLogEyebrow: 'Po treningu',
    backupTitle: 'Kopia zapasowa',
    weeklyGoalTitle: 'Cel tygodniowy',
    thisWeek: 'Ten tydzień',
    daysUnit: 'dni',
    weeklyGoalDesc: 'Ile dni w tygodniu chcesz trenować Kegla.',
    sessionHistoryTitle: 'Historia sesji',
    preferencesTitle: 'Preferencje',
    soundToggleLabel: 'Dźwięk podczas treningu',
    on: 'Włączony',
    off: 'Wyłączony',
    backupSubtitle: 'Twoje dane są zapisane tylko na tym urządzeniu. Pobierz kopię, żeby nie stracić postępu przy zmianie telefonu lub czyszczeniu danych przeglądarki.',
    backupExport: 'Pobierz kopię danych',
    backupImport: 'Wgraj kopię z pliku',
    backupImportError: 'Nie udało się wczytać pliku — sprawdź czy to poprawna kopia zapasowa Rdzenia.',
    backupImportSuccess: 'Dane wczytane pomyślnie.',
    quickLogTitle: 'Jak się czujesz?',
    quickLogSubtitle: 'Opcjonalne. Pomaga śledzić postęp w czasie.',
    skipLog: 'Pomiń',
    saved: 'Zapisano',
    breathSession: 'Sesja oddechowa',
    chooseRhythm: 'Wybierz swój rytm.',
    leadBreath: 'Prowadź oddech, nie walcz z nim.',
    minutes: 'minuty',
    minutes5: 'minut',
    quickReset: 'Szybki reset',
    deepPractice: 'Głęboka praktyka',
    startSession: 'Zacznij sesję',
    breathe: 'Oddychaj',
    inhale: 'Wdech',
    exhale: 'Wydech',
    sec: 'sek.',
    breathTip: 'Wdech nosem. Wydech dłuższy i spokojny.',
    finishSave: 'Zakończ i zapisz',
    kegelSession: 'Sesja Kegla',
    kegelIntro: 'Napnij, potem rozluźnij. 10 powtórzeń.',
    kegelIntroReverse: 'Rozluźnij głęboko, potem napnij. 10 powtórzeń.',
    holdDuration: 'Czas napięcia',
    totalTime: 'łącznie',
    repsPlural: 'powtórzeń',
    reverseKegel: 'Odwrotny Kegel',
    normalKegel: 'Kegel',
    squeeze: 'Napnij',
    release: 'Rozluźnij',
    rep: 'Powtórzenie',
    of: 'z',
    finishKegel: 'Zakończ i zapisz sesję',
    getReady: 'Gotowy?',
    cancel: 'Anuluj',
    strongTension: 'Silne napięcie teraz',
    grounding: 'Uziemienie 5-4-3-2-1',
    groundingIntro: 'Skup się na zmysłach. Krok po kroku.',
    see: 'Zobacz 5 rzeczy',
    touch: 'Dotknij 4 rzeczy',
    hear: 'Usłysz 3 dźwięki',
    smell: 'Wąchaj 2 zapachy',
    taste: 'Poczuj 1 smak',
    finishGrounding: 'Zakończ',
    notifMorning: 'Co dziś trenujesz? 👋',
    notifLevelUp: 'Nowy poziom odblokowany',
    levelUpToastTitle: 'Nowy poziom!',
    difficultySuggestTitle: 'Może czas na wyższy poziom?',
    difficultySuggestBody: 'Twoja regularność rośnie — sugerujemy poziom "{level}" dla tego treningu. Możesz to zawsze zmienić w Bibliotece.',
    difficultySuggestAccept: 'Podnieś poziom',
    difficultySuggestDismiss: 'Zostań przy obecnym',
    groundingBreathIntro: 'Zacznij od uspokojenia oddechu — dopiero potem przejdziemy do uziemienia.',
    skipBreath: 'Przejdź do uziemienia',
    enableNotifs: 'Włącz powiadomienia',
    notifsEnabled: 'Powiadomienia włączone',
    language: 'Język',
    openMenu: 'Otwórz menu',
    notifications: 'Powiadomienia',
    lightMode: 'Przełącz na jasny motyw',
    darkMode: 'Przełącz na ciemny motyw',
    onboardingTitle: 'Zanim zaczniesz',
    onboardingSubtitle: 'Wybierz co chcesz trenować. Możesz to zmienić w dowolnej chwili.',
    onboardingChoose: 'Co chcesz trenować?',
    onboardingDifficulty: 'Poziom zaawansowania',
    onboardingBegin: 'Zaczynam',
    onboardingPickOne: 'Wybierz przynajmniej jeden trening, żeby kontynuować.',
    difficultyBeginner: 'Początkujący',
    difficultyIntermediate: 'Średniozaawansowany',
    difficultyAdvanced: 'Zaawansowany',
    difficultyBeginnerDesc: 'Krótkie sesje, delikatne tempo. Idealne na start.',
    difficultyIntermediateDesc: 'Dłuższe sesje, większa intensywność.',
    difficultyAdvancedDesc: 'Pełne sesje, maksymalna kontrola.',
    workoutKegel: 'Trening Kegla',
    workoutKegelDesc: 'Kontrola, wytrzymałość, performance seksualny.',
    workoutBreath: 'Trening oddechu',
    workoutBreathDesc: 'Redukcja stresu, regulacja napięcia, lepszy sen.',
    workoutBoth: 'Oba',
    workoutBothDesc: 'Pełny trening kontroli ciała i umysłu.',
    settingsTitle: 'Ustawienia',
    settingsChange: 'Zmień',
    settingsTrainings: 'Moje treningi',
    settingsDifficulty: 'Poziom',
    settingsClose: 'Zamknij',
    notifGranted: 'Powiadomienia włączone ✓',
    notifDenied: 'Brak zgody w ustawieniach telefonu',
  },
  en: {
    brand: 'core',
    yourRhythm: 'Your rhythm',
    dayStreak: 'days in a row',
    menu: 'Menu',
    today: 'Today',
    progress: 'Progress',
    journal: 'Journal',
    library: 'Discover',
    librarySubtitle: 'More trainings for body control. Add what you need.',
    comingSoon: 'Coming soon',
    addToMyTrainings: 'Add to my trainings',
    removeFromTrainings: 'Remove from my trainings',
    startNow: 'Start now',
    alreadyAdded: 'Already added ✓',
    whatIsIt: 'What is it?',
    whoFor: 'Who is it for?',
    benefitsLabel: 'Benefits',
    timelineLabel: 'When to expect results?',
    breathing478: '4-7-8 Breathing',
    breathingBox: 'Box Breathing',
    kegelNormal: 'Kegel',
    kegelReverse: 'Reverse Kegel',
    breathingCalm: 'Calming Breath',
    profileTitle: 'Profile',
    breathingArousal: 'Arousal Breathing',
    wimHof: 'Wim Hof Method',
    bodyScan: 'Body Scan',
    pelvicRelease: 'Pelvic Release',
    fourSevenEightIntro: 'Inhale through your nose, hold, long exhale through your mouth.',
    fourSevenEightInhale: 'Inhale',
    fourSevenEightHold: 'Hold',
    fourSevenEightExhale: 'Exhale',
    fourSevenEightCycle: 'Cycle',
    boxBreathingIntro: 'Inhale, hold, exhale, hold — 4 seconds each phase.',
    boxBreathingDetail: '4s inhale, 4s hold, 4s exhale, 4s hold.',
    privacyNote: 'Your data stays only on this device.',
    howItWorks: 'How it works',
    todayPlan: "TODAY'S PLAN",
    heroLine1: 'Return to your',
    heroLine2: 'core.',
    heroSub: 'Mindful breath. Precise movement. A small step that builds real change.',
    startTraining: 'Start training',
    sessionDone: 'Session complete',
    consistency: 'Your consistency is working',
    welcomeTitle: 'Steady. You do you.',
    welcomeSub: 'Two short sessions make a good day.',
    yourSet: 'Your set',
    completed: 'completed',
    kegel: 'Kegel',
    kegelSub: '10 reps · hold 3-5s',
    kegelDetail: 'Squeeze and release. At your own pace.',
    breath: 'Breath',
    breathSub: '2 or 5 minutes',
    breathDetail: 'Slow down. Inhale 4s, exhale 6s.',
    fourSevenEightDetail: 'Inhale 4s, hold 7s, exhale 8s.',
    ready: 'Done',
    start: 'Start',
    yourProgress: 'Your progress',
    breathTrack: 'Breath track',
    details: 'Details',
    evening: 'Tonight',
    howYouFeel: 'How do you feel today?',
    oneSentence: 'One sentence is enough.',
    onlyYou: 'Only You vs You',
    progressTitle: "It's clearly working.",
    progressSub: 'Every session adds to the bigger picture.',
    dayStreakUnit: 'day streak',
    breathMinutes: 'min of breath',
    overallLevel: 'overall level',
    track: 'Track',
    of9: 'of 9 levels',
    minTotal: 'min total',
    monthlyView: 'Monthly view',
    activityTitle: 'Activity',
    timePerWorkout: 'Time per workout',
    sessionSingular: 'session',
    sessionsPlural: 'sessions',
    less: 'Less',
    more: 'More',
    noSessionsYet: 'No sessions yet — start your first training.',
    youNowVs: 'You now',
    vs: 'vs',
    streak: 'Streak',
    breathLabel: 'Breath',
    buildingRhythm: '— building your rhythm',
    everyMinute: '— every minute counts',
    shortClear: 'Short and clear',
    journalTitle: 'Pause for a moment.',
    journalSub: "It's not a test. It's a way to notice change.",
    tensionLevel: 'Tension level',
    mood: 'Mood',
    loose: 'Loose',
    tight: 'Tight',
    low: 'Low',
    well: 'Well',
    todaySentence: 'One sentence for today',
    optional: 'optional',
    whatNoticed: 'What did you notice?',
    weekSummary: 'Week summary',
    controlRate: 'How do you rate your control?',
    feedsKegel: 'This feeds your Kegel track.',
    saveEntry: "Save today's entry",
    quickLogEyebrow: 'After training',
    backupTitle: 'Backup',
    weeklyGoalTitle: 'Weekly goal',
    thisWeek: 'This week',
    daysUnit: 'days',
    weeklyGoalDesc: 'How many days a week you want to train Kegel.',
    sessionHistoryTitle: 'Session history',
    preferencesTitle: 'Preferences',
    soundToggleLabel: 'Sound during training',
    on: 'On',
    off: 'Off',
    backupSubtitle: 'Your data is only stored on this device. Download a backup so you don\'t lose your progress if you switch phones or clear browser data.',
    backupExport: 'Download data backup',
    backupImport: 'Restore from file',
    backupImportError: "Couldn't read the file — check it's a valid Rdzeń backup.",
    backupImportSuccess: 'Data restored successfully.',
    quickLogTitle: 'How do you feel?',
    quickLogSubtitle: 'Optional. Helps track your progress over time.',
    skipLog: 'Skip',
    saved: 'Saved',
    breathSession: 'Breath session',
    chooseRhythm: 'Choose your rhythm.',
    leadBreath: 'Guide your breath, do not fight it.',
    minutes: 'minutes',
    minutes5: 'minutes',
    quickReset: 'Quick reset',
    deepPractice: 'Deep practice',
    startSession: 'Start session',
    breathe: 'Breathe',
    inhale: 'Inhale',
    exhale: 'Exhale',
    sec: 'sec',
    breathTip: 'Inhale through the nose. Exhale longer and calm.',
    finishSave: 'Finish and save',
    kegelSession: 'Kegel session',
    kegelIntro: 'Squeeze, then release. 10 reps.',
    kegelIntroReverse: 'Release deeply, then squeeze. 10 reps.',
    holdDuration: 'Hold duration',
    totalTime: 'total',
    repsPlural: 'reps',
    reverseKegel: 'Reverse Kegel',
    normalKegel: 'Kegel',
    squeeze: 'Squeeze',
    release: 'Release',
    rep: 'Rep',
    of: 'of',
    finishKegel: 'Finish and save session',
    getReady: 'Ready?',
    cancel: 'Cancel',
    strongTension: 'Strong tension now',
    grounding: 'Grounding 5-4-3-2-1',
    groundingIntro: 'Focus on your senses. One step at a time.',
    see: 'See 5 things',
    touch: 'Touch 4 things',
    hear: 'Hear 3 sounds',
    smell: 'Smell 2 scents',
    taste: 'Taste 1 thing',
    finishGrounding: 'Finish',
    notifMorning: 'What are you training today? 👋',
    notifLevelUp: 'New level unlocked',
    levelUpToastTitle: 'New level!',
    difficultySuggestTitle: 'Maybe time to level up?',
    difficultySuggestBody: 'Your consistency is growing — we suggest "{level}" for this training. You can always change it in the Library.',
    difficultySuggestAccept: 'Raise the level',
    difficultySuggestDismiss: 'Keep current',
    groundingBreathIntro: "Start by settling your breath — then we'll move on to grounding.",
    skipBreath: 'Skip to grounding',
    enableNotifs: 'Enable notifications',
    notifsEnabled: 'Notifications enabled',
    language: 'Language',
    openMenu: 'Open menu',
    notifications: 'Notifications',
    lightMode: 'Switch to light mode',
    darkMode: 'Switch to dark mode',
    onboardingTitle: 'Before you begin',
    onboardingSubtitle: 'Choose what you want to train. You can change this anytime.',
    onboardingChoose: 'What do you want to train?',
    onboardingDifficulty: 'Skill level',
    onboardingBegin: "Let's go",
    onboardingPickOne: 'Pick at least one training to continue.',
    difficultyBeginner: 'Beginner',
    difficultyIntermediate: 'Intermediate',
    difficultyAdvanced: 'Advanced',
    difficultyBeginnerDesc: 'Short sessions, gentle pace. Perfect for starting out.',
    difficultyIntermediateDesc: 'Longer sessions, higher intensity.',
    difficultyAdvancedDesc: 'Full sessions, maximum control.',
    workoutKegel: 'Kegel training',
    workoutKegelDesc: 'Control, endurance, sexual performance.',
    workoutBreath: 'Breath training',
    workoutBreathDesc: 'Stress relief, tension control, better sleep.',
    workoutBoth: 'Both',
    workoutBothDesc: 'Full mind and body control training.',
    settingsTitle: 'Settings',
    settingsChange: 'Change',
    settingsTrainings: 'My trainings',
    settingsDifficulty: 'Level',
    settingsClose: 'Close',
    notifGranted: 'Notifications on ✓',
    notifDenied: 'Blocked — allow in phone settings',
  },
};

export const KEGEL_LEVELS: [string, string][] = [
  ['Fundament', 'Foundation'],
  ['Świadomość', 'Awareness'],
  ['Kontrola', 'Control'],
  ['Wytrzymałość', 'Endurance'],
  ['Stabilność', 'Stability'],
  ['Precyzja', 'Precision'],
  ['Opanowanie', 'Mastery'],
  ['Mistrzostwo', 'Mastery+'],
  ['Legenda', 'Legend'],
];

export const KEGEL_DESC: [string, string][] = [
  ['Zacząłeś. Mięsień dopiero uczy się reagować na sygnał.', 'You started. The muscle is just learning to respond.'],
  ['Zaczynasz czuć mięsień w akcji, nie tylko w teorii.', 'You begin to feel the muscle in action, not just in theory.'],
  ['Pierwsza realna różnica w codziennym napięciu.', 'The first real difference in daily tension.'],
  ['Mięsień trzyma dłużej bez zmęczenia.', 'The muscle holds longer without fatigue.'],
  ['Reakcja staje się bardziej automatyczna.', 'The response becomes more automatic.'],
  ['Kontrola przestaje być wysiłkiem — staje się odruchem.', 'Control stops being effort — it becomes a reflex.'],
  ['Wiesz, kiedy warto się rozluźnić zamiast zaciskać.', 'You know when to relax instead of squeezing.'],
  ['To już nawyk ciała, nie zadanie do odhaczenia.', "It's a body habit now, not a task to check off."],
  ['Pełna, trwała kontrola. To już Twój standard.', 'Full, lasting control. This is your standard now.'],
];

export const BREATH_LEVELS = [30, 90, 180, 350, 600, 900, 1300, 1800, 2400];
export const BREATH_NAMES: [string, string][] = [
  ['Start', 'Start'],
  ['Rytm', 'Rhythm'],
  ['Spokój', 'Calm'],
  ['Równowaga', 'Balance'],
  ['Odporność', 'Resilience'],
  ['Wyciszenie', 'Settling'],
  ['Panowanie', 'Command'],
  ['Mistrzostwo', 'Mastery'],
  ['Spokój Absolutny', 'Absolute Calm'],
];

export const BREATH_DESC: [string, string][] = [
  ['Pierwsze minuty praktyki. Ciało dopiero uczy się rozpoznawać sygnał do zwolnienia.', 'The first minutes of practice. The body is just learning to recognize the signal to slow down.'],
  ['Oddech zaczyna nabierać stałego rytmu, zamiast być przypadkowy.', 'Breathing starts to find a steady rhythm instead of being random.'],
  ['Łatwiej Ci teraz wywołać spokój — reakcja jest szybsza niż na starcie.', "It's now easier to trigger calm — the response is faster than at the start."],
  ['Organizm zaczyna kojarzyć długi wydech z realnym rozluźnieniem, nie tylko teorią.', 'The body starts associating a long exhale with real relaxation, not just theory.'],
  ['Odporność na codzienny stres rośnie — mniejsze rzeczy przestają Cię rozstrajać.', 'Resilience to daily stress grows — smaller things stop throwing you off.'],
  ['Wyciszenie przychodzi szybciej, nawet w trudniejszych momentach dnia.', 'Settling down happens faster, even in harder moments of the day.'],
  ['Masz realne panowanie nad reakcją stresową, zanim eskaluje.', 'You have real command over the stress response before it escalates.'],
  ['To już nawyk nerwowego układu, nie technika, o której trzeba pamiętać.', "It's a habit of the nervous system now, not a technique you have to remember."],
  ['Pełny, trwały spokój jako punkt wyjścia, nie stan do wywalczenia.', 'Full, lasting calm as your baseline, not a state you have to fight for.'],
];

export function pick<T>(pair: [T, T], lang: Lang): T {
  return lang === 'pl' ? pair[0] : pair[1];
}

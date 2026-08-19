const CACHE = 'rdzen-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            if (response.ok && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached),
    ),
  );
});

// --- Powiadomienia w tle ---
// Uwaga: Periodic Background Sync jest wspierany tylko w wybranych
// przegladarkach (gl. Chrome/Android, dla zainstalowanej PWA) i przegladarka
// sama decyduje jak czesto faktycznie odpali zdarzenie (nie ma gwarancji
// dokladnej godziny). To dodatkowe wzmocnienie - glowny mechanizm
// przypomnien dziala w App.tsx, dopoki appka jest otwarta (rowniez w tle
// karty). Service Worker nie ma dostepu do localStorage ani do wybranego
// przez uzytkownika jezyka appki, wiec teksty ponizej sa domyslnie po
// polsku.
const NOTIF_SLOTS = [
  { slot: 'morning', hour: 7, minute: 0, text: 'Czas na trening' },
  { slot: 'day', hour: 13, minute: 0, text: 'Masz 2 minuty? Szybki reset.' },
  { slot: 'evening', hour: 20, minute: 0, text: 'Wieczorna sesja czeka' },
  { slot: 'sunday', hour: 19, minute: 0, sundayOnly: true, text: 'Podsumowanie tygodnia gotowe' },
];
const NOTIF_LOG_CACHE = 'rdzen-notif-log';
const NOTIF_LOG_KEY = '/__notif-log';

async function getNotifLog() {
  try {
    const cache = await caches.open(NOTIF_LOG_CACHE);
    const res = await cache.match(NOTIF_LOG_KEY);
    return res ? await res.json() : {};
  } catch {
    return {};
  }
}

async function setNotifLog(log) {
  try {
    const cache = await caches.open(NOTIF_LOG_CACHE);
    await cache.put(NOTIF_LOG_KEY, new Response(JSON.stringify(log)));
  } catch {
    // ignorujemy - w najgorszym razie powiadomienie moze sie powtorzyc
  }
}

async function checkAndFireNotifications() {
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const log = await getNotifLog();
  let changed = false;
  for (const slotDef of NOTIF_SLOTS) {
    if (slotDef.sundayOnly && now.getDay() !== 0) continue;
    const scheduled = new Date(now);
    scheduled.setHours(slotDef.hour, slotDef.minute, 0, 0);
    const diffMin = (now.getTime() - scheduled.getTime()) / 60000;
    if (diffMin >= 0 && diffMin <= 180 && log[slotDef.slot] !== dateKey) {
      await self.registration.showNotification(slotDef.text, { tag: 'rdzen-' + slotDef.slot });
      log[slotDef.slot] = dateKey;
      changed = true;
    }
  }
  if (changed) await setNotifLog(log);
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'rdzen-notif-check') {
    event.waitUntil(checkAndFireNotifications());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('/');
    }),
  );
});

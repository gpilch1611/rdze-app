const DB_NAME = 'rdzen-db';
const DB_VERSION = 1;
const STORE = 'appdata';
const KEY = 'state';

export type StoredData = {
  profile: {
    selectedWorkouts: string[]; // ['kegel-normal', 'breathing-calm', ...]
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    hasCompletedOnboarding: boolean;
  };
  sessions: { type: 'kegel' | 'breathing'; date: string; minutes?: number; mode?: 'normal' | 'reverse' }[];
  journal: { date: string; tension: number; mood: number; note: string; control?: number }[];
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadData(): Promise<StoredData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as StoredData) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveData(data: StoredData): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

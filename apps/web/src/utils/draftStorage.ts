import type { EditState } from '../types';

export interface AppDraft {
  id: string;
  imageDataUrl: string;
  editState: EditState;
  history: EditState[];
  historyIndex: number;
  timestamp: number;
}

const DB_NAME = 'dbeaty_drafts_db';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraft(draft: AppDraft): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(draft);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to save draft to IndexedDB:', e);
  }
}

export async function loadLatestDraft(): Promise<AppDraft | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const all: AppDraft[] = req.result || [];
        if (all.length === 0) return resolve(null);
        all.sort((a, b) => b.timestamp - a.timestamp);
        resolve(all[0]);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to load draft from IndexedDB:', e);
    return null;
  }
}

export async function clearAllDrafts(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to clear drafts from IndexedDB:', e);
  }
}

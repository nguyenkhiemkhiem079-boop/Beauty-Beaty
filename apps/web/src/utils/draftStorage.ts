import type { EditState } from '../types';

export interface AppDraft {
  id: string;
  originalDataUrl: string; // Immutable unedited full-resolution original image
  originalWidth: number;
  originalHeight: number;
  editState: EditState;
  history: EditState[];
  historyIndex: number;
  timestamp: number;
}

const DB_NAME = 'dbeaty_drafts_db';
const DB_VERSION = 2; // Incremented for schema update with originalDataUrl
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
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function saveDraft(draft: AppDraft): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await openDb();
    return await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      tx.onerror = (ev) => {
        const error = (ev.target as any)?.error;
        const msg = error?.name === 'QuotaExceededError' 
          ? 'Bộ nhớ IndexedDB đã đầy (QuotaExceededError). Hãy giải phóng dung lượng trình duyệt.' 
          : (error?.message || 'Lỗi lưu bản thảo vào IndexedDB');
        console.warn('IndexedDB transaction error:', msg);
        resolve({ success: false, error: msg });
      };

      tx.onabort = (ev) => {
        const error = (ev.target as any)?.error;
        resolve({ success: false, error: error?.message || 'Giao dịch lưu bản thảo bị hủy bỏ' });
      };

      const req = store.put(draft);
      req.onsuccess = () => {
        resolve({ success: true });
      };
      req.onerror = (ev) => {
        const error = (ev.target as any)?.error;
        resolve({ success: false, error: error?.message || 'Lỗi ghi dữ liệu bản thảo' });
      };
    });
  } catch (e: any) {
    console.warn('Failed to save draft to IndexedDB:', e);
    return { success: false, error: e?.message || 'Không thể mở cơ sở dữ liệu IndexedDB' };
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

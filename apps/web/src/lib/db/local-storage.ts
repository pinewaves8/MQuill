/**
 * localStorage persistence layer for in-memory stores
 * Handles SSR by checking for browser environment
 */

const isBrowser = typeof window !== 'undefined';

function getStorageKey(storeName: string): string {
  return `mquill_${storeName}`;
}

export function loadFromStorage<T>(storeName: string, fallback: T): T {
  if (!isBrowser) return fallback;

  try {
    const raw = localStorage.getItem(getStorageKey(storeName));
    if (!raw) return fallback;

    const parsed = JSON.parse(raw, (key, value) => {
      // Revive Date objects
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return new Date(value);
      }
      return value;
    });

    return parsed as T;
  } catch (error) {
    console.error(`[LocalStorage] Failed to load ${storeName}:`, error);
    return fallback;
  }
}

export function saveToStorage<T>(storeName: string, data: T): void {
  if (!isBrowser) return;

  try {
    localStorage.setItem(getStorageKey(storeName), JSON.stringify(data));
  } catch (error) {
    console.error(`[LocalStorage] Failed to save ${storeName}:`, error);
  }
}

export function clearStorage(storeName?: string): void {
  if (!isBrowser) return;

  if (storeName) {
    localStorage.removeItem(getStorageKey(storeName));
  } else {
    // Clear all mquill keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('mquill_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

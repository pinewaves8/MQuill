/**
 * File-based persistence for development
 * Stores data in a JSON file that persists across server restarts
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

interface StoreData {
  projects: unknown[];
  tags: unknown[];
  charters: unknown[];
  chapters: unknown[];
  scenes: unknown[];
  segments: unknown[];
  versions: unknown[];
  issues: unknown[];
  revisions: unknown[];
  candidates: unknown[];
  memories: unknown[];
  outlines: unknown[];
  progress: unknown[];
  users: unknown[];
  sessions: unknown[];
}

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load all data from file
export function loadFromFile(): StoreData {
  ensureDataDir();

  if (!fs.existsSync(DATA_FILE)) {
    return getEmptyStore();
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw, (key, value) => {
      // Revive Date strings
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return new Date(value);
      }
      return value;
    });
  } catch (error) {
    console.error('[FileStorage] Failed to load:', error);
    return getEmptyStore();
  }
}

// Save all data to file
export function saveToFile(data: StoreData): void {
  ensureDataDir();

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[FileStorage] Failed to save:', error);
  }
}

// Get empty store structure
function getEmptyStore(): StoreData {
  return {
    projects: [],
    tags: [],
    charters: [],
    chapters: [],
    scenes: [],
    segments: [],
    versions: [],
    issues: [],
    revisions: [],
    candidates: [],
    memories: [],
    outlines: [],
    progress: [],
    users: [],
    sessions: [],
  };
}

// Load specific collection from file
export function loadCollection<T>(collectionName: string): T[] {
  const data = loadFromFile();
  return (data[collectionName as keyof StoreData] as T[]) || [];
}

// Save specific collection to file
export function saveCollection<T>(collectionName: string, items: T[]): void {
  const data = loadFromFile() as unknown as Record<string, unknown[]>;
  data[collectionName] = items;
  saveToFile(data as unknown as StoreData);
}

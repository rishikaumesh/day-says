export interface JournalEntry {
  date: string; // YYYY-MM-DD format (local date)
  journalText: string;
  mood: string;
  response: string;
  id: string;
  timestamp: string; // ISO timestamp for ordering multiple entries on same day
}

const STORAGE_KEY = 'mindMirrorEntries';

export const saveEntry = (entry: JournalEntry): void => {
  const entries = getEntries();
  // Allow multiple entries per day - just add the new entry
  entries.push(entry);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const getEntries = (): JournalEntry[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const deleteEntry = (id: string): void => {
  const entries = getEntries().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const getEntriesByDate = (date: string): JournalEntry[] => {
  return getEntries().filter(e => e.date === date);
};

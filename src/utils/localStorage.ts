export interface JournalEntry {
  date: string;
  journalText: string;
  mood: string;
  response: string;
  id: string;
}

const STORAGE_KEY = 'mindMirrorEntries';

export const saveEntry = (entry: JournalEntry): void => {
  const entries = getEntries();
  const existingIndex = entries.findIndex(e => e.date === entry.date);
  
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  
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

export const deleteEntry = (date: string): void => {
  const entries = getEntries().filter(e => e.date !== date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const getEntryByDate = (date: string): JournalEntry | undefined => {
  return getEntries().find(e => e.date === date);
};

/**
 * Get the local date string in YYYY-MM-DD format using the browser's timezone.
 * Falls back to America/Los_Angeles if timezone resolution fails.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  let timeZone: string;
  
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timeZone = 'America/Los_Angeles';
  }
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  return formatter.format(date);
};

/**
 * Get today's local date string
 */
export const getTodayLocal = (): string => {
  return getLocalDateString(new Date());
};

/**
 * Parse a YYYY-MM-DD string into a Date object at midnight local time
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Check if two date strings represent consecutive days
 */
export const isConsecutiveDay = (earlier: string, later: string): boolean => {
  const earlierDate = parseLocalDate(earlier);
  const laterDate = parseLocalDate(later);
  const diff = laterDate.getTime() - earlierDate.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return diff === oneDayMs;
};

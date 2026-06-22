const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayDateKey = (): string => toDateKey(new Date());

export const getMatchDeviceDateKey = (utcDateString: string | undefined, officialDate: string): string => {
  if (!utcDateString) return officialDate;

  const date = new Date(utcDateString);
  if (Number.isNaN(date.getTime())) return officialDate;

  return toDateKey(date);
};


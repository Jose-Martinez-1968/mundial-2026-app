/**
 * Timezone Converter - Convert UTC times to local and Argentina time
 * Argentina uses UTC-3 year-round (no daylight saving time since 2009)
 */

import { format, utcToZonedTime } from 'date-fns-tz';

const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';
const ARGENTINA_UTC_OFFSET = -3; // UTC-3 (constant, no DST)

/**
 * Convert UTC time string to Argentina time
 * @param utcDateString - ISO UTC date string (e.g., "2026-06-11T16:00:00Z")
 * @returns Formatted Argentina time string
 */
export const convertToArgentinaTime = (utcDateString: string): string => {
  try {
    const date = new Date(utcDateString);
    const zonedDate = utcToZonedTime(date, ARGENTINA_TIMEZONE);
    return format(zonedDate, 'HH:mm', { timeZone: ARGENTINA_TIMEZONE });
  } catch (error) {
    console.error('Error converting to Argentina time:', error);
    return '---';
  }
};

/**
 * Convert UTC time to local venue time
 * @param utcDateString - ISO UTC date string
 * @param venueTimezone - Timezone of venue (e.g., "America/New_York")
 * @returns Formatted local time string
 */
export const convertToVenueTime = (utcDateString: string, venueTimezone: string): string => {
  try {
    const date = new Date(utcDateString);
    const zonedDate = utcToZonedTime(date, venueTimezone);
    return format(zonedDate, 'HH:mm', { timeZone: venueTimezone });
  } catch (error) {
    console.error('Error converting to venue time:', error);
    return '---';
  }
};

/**
 * Format match time with both local and Argentina times
 * @param utcDateString - ISO UTC date string
 * @param venueTimezone - Timezone of venue
 * @returns Object with local and Argentina times
 */
export const formatMatchTimes = (
  utcDateString: string,
  venueTimezone: string,
): { local: string; argentina: string } => {
  return {
    local: convertToVenueTime(utcDateString, venueTimezone),
    argentina: convertToArgentinaTime(utcDateString),
  };
};

/**
 * Get current Argentina time
 */
export const getCurrentArgentinaTime = (): Date => {
  return utcToZonedTime(new Date(), ARGENTINA_TIMEZONE);
};

/**
 * Check if a match time is today in Argentina timezone
 */
export const isMatchToday = (utcDateString: string): boolean => {
  try {
    const matchDate = utcToZonedTime(new Date(utcDateString), ARGENTINA_TIMEZONE);
    const today = utcToZonedTime(new Date(), ARGENTINA_TIMEZONE);

    return (
      matchDate.getDate() === today.getDate() &&
      matchDate.getMonth() === today.getMonth() &&
      matchDate.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    console.error('Error checking if match is today:', error);
    return false;
  }
};

/**
 * Get matches for today in Argentina timezone
 */
export const filterMatchesForToday = <T extends { utcDateString?: string; officialDate: string }>(
  matches: T[],
): T[] => {
  return matches.filter(match => {
    const dateString = match.utcDateString || `${match.officialDate}T00:00:00Z`;
    return isMatchToday(dateString);
  });
};

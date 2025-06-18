/**
 * German holidays configuration for synthetic data generation
 * Includes national holidays and typical university semester breaks
 */

import { addDays, startOfYear, endOfYear, format } from 'date-fns';
import { HolidayInfo } from '../types';

/**
 * Calculate Easter Sunday for a given year using the anonymous Gregorian algorithm
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

/**
 * Generate all German national holidays for a given year
 */
export function getGermanHolidays(year: number): HolidayInfo[] {
  const holidays: HolidayInfo[] = [];
  const easter = getEasterSunday(year);

  // Fixed date holidays
  holidays.push({
    date: new Date(year, 0, 1), // January 1
    name: 'Neujahr',
    type: 'national'
  });

  holidays.push({
    date: new Date(year, 0, 6), // January 6 (in some states)
    name: 'Heilige Drei Könige',
    type: 'national'
  });

  holidays.push({
    date: new Date(year, 4, 1), // May 1
    name: 'Tag der Arbeit',
    type: 'national'
  });

  holidays.push({
    date: new Date(year, 9, 3), // October 3
    name: 'Tag der Deutschen Einheit',
    type: 'national'
  });

  holidays.push({
    date: new Date(year, 11, 25), // December 25
    name: 'Weihnachten',
    type: 'national'
  });

  holidays.push({
    date: new Date(year, 11, 26), // December 26
    name: '2. Weihnachtsfeiertag',
    type: 'national'
  });

  // Easter-dependent holidays
  holidays.push({
    date: addDays(easter, -2), // Good Friday
    name: 'Karfreitag',
    type: 'national'
  });

  holidays.push({
    date: easter,
    name: 'Ostersonntag',
    type: 'national'
  });

  holidays.push({
    date: addDays(easter, 1), // Easter Monday
    name: 'Ostermontag',
    type: 'national'
  });

  holidays.push({
    date: addDays(easter, 39), // Ascension Day
    name: 'Christi Himmelfahrt',
    type: 'national'
  });

  holidays.push({
    date: addDays(easter, 49), // Whit Sunday
    name: 'Pfingstsonntag',
    type: 'national'
  });

  holidays.push({
    date: addDays(easter, 50), // Whit Monday
    name: 'Pfingstmontag',
    type: 'national'
  });

  return holidays;
}

/**
 * Generate typical university semester breaks
 * These periods have significantly reduced lab usage
 */
export function getUniversitySemesterBreaks(year: number): HolidayInfo[] {
  const breaks: HolidayInfo[] = [];

  // Winter semester break (mid February - early April)
  const winterBreakStart = new Date(year, 1, 15); // February 15
  const winterBreakEnd = new Date(year, 3, 5); // April 5
  
  for (let d = new Date(winterBreakStart); d <= winterBreakEnd; d.setDate(d.getDate() + 1)) {
    breaks.push({
      date: new Date(d),
      name: 'Semesterferien (Winter)',
      type: 'semester_break'
    });
  }

  // Summer semester break (mid July - early October)
  const summerBreakStart = new Date(year, 6, 15); // July 15
  const summerBreakEnd = new Date(year, 9, 5); // October 5
  
  for (let d = new Date(summerBreakStart); d <= summerBreakEnd; d.setDate(d.getDate() + 1)) {
    breaks.push({
      date: new Date(d),
      name: 'Semesterferien (Sommer)',
      type: 'semester_break'
    });
  }

  // Christmas break (December 20 - January 10 next year)
  const christmasBreakStart = new Date(year, 11, 20); // December 20
  const christmasBreakEnd = new Date(year + 1, 0, 10); // January 10 next year
  
  for (let d = new Date(christmasBreakStart); d <= christmasBreakEnd; d.setDate(d.getDate() + 1)) {
    breaks.push({
      date: new Date(d),
      name: 'Weihnachtsferien',
      type: 'semester_break'
    });
  }

  return breaks;
}

/**
 * Get all holidays for a date range
 */
export function getAllHolidays(startDate: Date, endDate: Date): HolidayInfo[] {
  const holidays: HolidayInfo[] = [];
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    holidays.push(...getGermanHolidays(year));
    holidays.push(...getUniversitySemesterBreaks(year));
  }

  // Filter holidays within the date range
  return holidays.filter(holiday => 
    holiday.date >= startDate && holiday.date <= endDate
  );
}

/**
 * Check if a given date is a holiday
 */
export function isHoliday(date: Date, holidays: HolidayInfo[]): boolean {
  return holidays.some(holiday => 
    holiday.date.toDateString() === date.toDateString()
  );
}

/**
 * Check if a given date is a Sunday (lab closed)
 */
export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

/**
 * Check if lab is closed on a given date
 */
export function isLabClosed(date: Date, holidays: HolidayInfo[]): boolean {
  return isSunday(date) || isHoliday(date, holidays);
}

/**
 * Get the occupancy reduction factor for semester breaks
 * Returns 1.0 for normal days, 0.1-0.3 for semester breaks
 */
export function getSemesterBreakFactor(date: Date, holidays: HolidayInfo[]): number {
  const semesterBreak = holidays.find(holiday => 
    holiday.date.toDateString() === date.toDateString() && 
    holiday.type === 'semester_break'
  );
  
  if (!semesterBreak) return 1.0;
  
  // Different reduction factors for different break types
  if (semesterBreak.name.includes('Weihnachts')) return 0.1; // Almost empty during Christmas
  if (semesterBreak.name.includes('Sommer')) return 0.2; // Reduced during summer break
  return 0.3; // Winter semester break has some activity
}

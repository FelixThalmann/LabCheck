/**
 * Lab usage patterns for realistic synthetic data generation
 * Defines typical occupancy patterns for different days and times
 */

import { DayPattern, WeekPattern } from '../types';

/**
 * Standard university lab occupancy pattern for weekdays
 * Optimized for small labs (10 person capacity) to prevent negative occupancy
 */
export const STANDARD_WEEKDAY_PATTERN: DayPattern = {
  // Hourly occupancy pattern (0-23 hours) - values represent percentage of capacity
  // Reduced values for 10-person labs to ensure realistic occupancy levels
  hourlyOccupancyPattern: [
    0.0,  // 0:00 - Lab closed
    0.0,  // 1:00 - Lab closed
    0.0,  // 2:00 - Lab closed
    0.0,  // 3:00 - Lab closed
    0.0,  // 4:00 - Lab closed
    0.0,  // 5:00 - Lab closed
    0.0,  // 6:00 - Early arrivals (0 people)
    0.1,  // 7:00 - Gradual increase (1 person)
    0.2,  // 8:00 - Morning lectures start (2 people)
    0.3,  // 9:00 - Building up (3 people)
    0.4,  // 10:00 - High activity (4 people)
    0.5,  // 11:00 - Peak usage (5 people)
    0.3,  // 12:00 - Lunch break reduction (3 people)
    0.2,  // 13:00 - Continued lunch break (2 people)
    0.4,  // 14:00 - Afternoon activities resume (4 people)
    0.6,  // 15:00 - Peak afternoon (6 people)
    0.5,  // 16:00 - High activity continues (5 people)
    0.4,  // 17:00 - Gradual decline (4 people)
    0.3,  // 18:00 - Evening reduction (3 people)
    0.2,  // 19:00 - Further decline (2 people)
    0.1,  // 20:00 - Late workers (1 person)
    0.1,  // 21:00 - Minimal activity (1 person)
    0.0,  // 22:00 - Lab closing (0 people)
    0.0   // 23:00 - Lab closed
  ],
  peakHours: [11, 15, 16], // Hours with highest activity
  minOccupancy: 0,
  maxOccupancy: 0.7, // Never exceed 60% of capacity (6 people max)
  noiseLevel: 0.1 // 10% random variation to prevent over-fluctuation
};

/**
 * Friday pattern - reduced afternoon activity due to weekend preparation
 * Optimized for 10-person lab capacity
 */
export const FRIDAY_PATTERN: DayPattern = {
  hourlyOccupancyPattern: [
    0.0,  // 0:00
    0.0,  // 1:00
    0.0,  // 2:00
    0.0,  // 3:00
    0.0,  // 4:00
    0.0,  // 5:00
    0.0,  // 6:00 - Early arrivals (0 people)
    0.1,  // 7:00 - Gradual increase (1 person)
    0.2,  // 8:00 - Morning start (2 people)
    0.3,  // 9:00 - Building up (3 people)
    0.4,  // 10:00 - Peak Friday morning (4 people)
    0.5,  // 11:00 - Peak usage (5 people)
    0.3,  // 12:00 - Lunch break (3 people)
    0.2,  // 13:00 - Extended lunch (2 people)
    0.3,  // 14:00 - Reduced compared to other weekdays (3 people)
    0.2,  // 15:00 - Early weekend preparation (2 people)
    0.1,  // 16:00 - People leaving early (1 person)
    0.1,  // 17:00 - Minimal activity (1 person)
    0.0,  // 18:00 - Empty
    0.0,  // 19:00
    0.0,  // 20:00
    0.0,  // 21:00
    0.0,  // 22:00
    0.0   // 23:00
  ],
  peakHours: [10, 11],
  minOccupancy: 0,
  maxOccupancy: 0.5, // Maximum 50% capacity on Fridays (5 people)
  noiseLevel: 0.15 // Moderate variation on Fridays
};

/**
 * Saturday pattern - minimal activity, mainly research students
 */
export const SATURDAY_PATTERN: DayPattern = {
  hourlyOccupancyPattern: [
    0.0,  // 0:00
    0.0,  // 1:00
    0.0,  // 2:00
    0.0,  // 3:00
    0.0,  // 4:00
    0.0,  // 5:00
    0.0,  // 6:00
    0.0,  // 7:00
    0.05, // 8:00 - Few dedicated students
    0.10, // 9:00
    0.15, // 10:00 - Peak Saturday activity
    0.20, // 11:00
    0.15, // 12:00
    0.10, // 13:00
    0.15, // 14:00
    0.18, // 15:00
    0.12, // 16:00
    0.08, // 17:00
    0.05, // 18:00
    0.02, // 19:00
    0.0,  // 20:00
    0.0,  // 21:00
    0.0,  // 22:00
    0.0   // 23:00
  ],
  peakHours: [11, 15],
  minOccupancy: 0,
  maxOccupancy: 0.25, // Maximum 25% capacity on Saturdays
  noiseLevel: 0.30 // High variation due to irregular attendance
};

/**
 * Sunday pattern - completely closed
 */
export const SUNDAY_PATTERN: DayPattern = {
  hourlyOccupancyPattern: Array(24).fill(0.0), // All zeros
  peakHours: [],
  minOccupancy: 0,
  maxOccupancy: 0,
  noiseLevel: 0.0
};

/**
 * Complete week pattern for standard operation
 */
export const STANDARD_WEEK_PATTERN: WeekPattern = {
  monday: STANDARD_WEEKDAY_PATTERN,
  tuesday: STANDARD_WEEKDAY_PATTERN,
  wednesday: STANDARD_WEEKDAY_PATTERN,
  thursday: STANDARD_WEEKDAY_PATTERN,
  friday: FRIDAY_PATTERN,
  saturday: SATURDAY_PATTERN,
  sunday: SUNDAY_PATTERN
};

/**
 * Semester break week pattern - significantly reduced activity
 */
export const SEMESTER_BREAK_PATTERN: WeekPattern = {
  monday: createReducedPattern(STANDARD_WEEKDAY_PATTERN, 0.3),
  tuesday: createReducedPattern(STANDARD_WEEKDAY_PATTERN, 0.3),
  wednesday: createReducedPattern(STANDARD_WEEKDAY_PATTERN, 0.3),
  thursday: createReducedPattern(STANDARD_WEEKDAY_PATTERN, 0.3),
  friday: createReducedPattern(FRIDAY_PATTERN, 0.25),
  saturday: createReducedPattern(SATURDAY_PATTERN, 0.5),
  sunday: SUNDAY_PATTERN
};

/**
 * Exam period pattern - extended hours, different peak times
 */
export const EXAM_PERIOD_PATTERN: WeekPattern = {
  monday: createExamPattern(STANDARD_WEEKDAY_PATTERN),
  tuesday: createExamPattern(STANDARD_WEEKDAY_PATTERN),
  wednesday: createExamPattern(STANDARD_WEEKDAY_PATTERN),
  thursday: createExamPattern(STANDARD_WEEKDAY_PATTERN),
  friday: createExamPattern(FRIDAY_PATTERN),
  saturday: createReducedPattern(SATURDAY_PATTERN, 1.5), // More activity on weekends during exams
  sunday: createReducedPattern(SATURDAY_PATTERN, 0.8) // Some Sunday activity during exams
};

/**
 * Helper function to create a reduced activity pattern
 */
function createReducedPattern(basePattern: DayPattern, factor: number): DayPattern {
  return {
    ...basePattern,
    hourlyOccupancyPattern: basePattern.hourlyOccupancyPattern.map(val => val * factor),
    maxOccupancy: basePattern.maxOccupancy * factor,
    noiseLevel: Math.min(basePattern.noiseLevel * 1.2, 0.5) // Increase variability
  };
}

/**
 * Helper function to create exam period pattern with extended hours
 */
function createExamPattern(basePattern: DayPattern): DayPattern {
  const examPattern = [...basePattern.hourlyOccupancyPattern];
  
  // Extend evening hours during exam period
  examPattern[19] = Math.max(examPattern[19] || 0, 0.35); // 19:00
  examPattern[20] = Math.max(examPattern[20] || 0, 0.30); // 20:00
  examPattern[21] = Math.max(examPattern[21] || 0, 0.25); // 21:00
  examPattern[22] = Math.max(examPattern[22] || 0, 0.15); // 22:00
  
  return {
    ...basePattern,
    hourlyOccupancyPattern: examPattern,
    peakHours: [...basePattern.peakHours, 19, 20], // Add evening peak hours
    maxOccupancy: Math.min(basePattern.maxOccupancy * 1.1, 0.95), // Slightly higher capacity during exams
    noiseLevel: basePattern.noiseLevel * 0.8 // Less variation during structured exam periods
  };
}

/**
 * Get the appropriate week pattern based on date and context
 */
export function getWeekPatternForDate(date: Date, isSemesterBreak: boolean, isExamPeriod: boolean): WeekPattern {
  if (isSemesterBreak) {
    return SEMESTER_BREAK_PATTERN;
  }
  
  if (isExamPeriod) {
    return EXAM_PERIOD_PATTERN;
  }
  
  return STANDARD_WEEK_PATTERN;
}

/**
 * Get day pattern from week pattern
 */
export function getDayPattern(weekPattern: WeekPattern, dayOfWeek: number): DayPattern {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  return weekPattern[dayNames[dayOfWeek] as keyof WeekPattern];
}

/**
 * Special event patterns that can override standard patterns
 */
export const SPECIAL_EVENT_PATTERNS = {
  CONFERENCE_DAY: {
    // Conference or special lecture day - unusual timing
    hourlyOccupancyPattern: [
      0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      0.90, 0.95, 0.85, 0.80, 0.20, 0.25, 0.85, 0.90,
      0.85, 0.80, 0.75, 0.30, 0.15, 0.05, 0.0, 0.0
    ],
    peakHours: [9, 10, 14, 15],
    maxOccupancy: 0.95,
    noiseLevel: 0.05 // Very structured event
  },
  
  OPEN_HOUSE: {
    // Open house or public event - different visitor patterns
    hourlyOccupancyPattern: [
      0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      0.10, 0.25, 0.45, 0.65, 0.55, 0.45, 0.70, 0.85,
      0.80, 0.60, 0.35, 0.20, 0.10, 0.05, 0.0, 0.0
    ],
    peakHours: [15, 16],
    maxOccupancy: 0.90,
    noiseLevel: 0.25 // Higher variation with general public
  }
};

/**
 * Seasonal adjustment factors
 */
export const SEASONAL_FACTORS = {
  SPRING: 1.0,   // Normal activity
  SUMMER: 0.7,   // Reduced due to vacation season
  AUTUMN: 1.1,   // Peak academic activity
  WINTER: 0.9    // Slightly reduced due to weather/holidays
};

/**
 * Get seasonal factor based on month
 */
export function getSeasonalFactor(month: number): number {
  if (month >= 3 && month <= 5) return SEASONAL_FACTORS.SPRING;
  if (month >= 6 && month <= 8) return SEASONAL_FACTORS.SUMMER;
  if (month >= 9 && month <= 11) return SEASONAL_FACTORS.AUTUMN;
  return SEASONAL_FACTORS.WINTER;
}

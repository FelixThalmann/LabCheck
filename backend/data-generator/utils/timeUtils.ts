/**
 * Time utility functions for synthetic data generation
 * Handles date/time calculations and manipulations
 */

import { addDays, addHours, addMinutes, format, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { isLabClosed, getAllHolidays, getSemesterBreakFactor } from '../config/holidays';
import { HolidayInfo } from '../types';

/**
 * Generate time slots for a given day with specified interval
 */
export function generateTimeSlots(date: Date, intervalMinutes: number = 15): Date[] {
  const slots: Date[] = [];
  const start = startOfDay(date);
  start.setHours(6, 0, 0, 0); // Lab opens at 6:00
  
  const end = startOfDay(date);
  end.setHours(22, 0, 0, 0); // Lab closes at 22:00
  
  let current = new Date(start);
  while (current <= end) {
    slots.push(new Date(current));
    current = addMinutes(current, intervalMinutes);
  }
  
  return slots;
}

/**
 * Generate all dates in a range (inclusive)
 */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const totalDays = differenceInDays(endDate, startDate) + 1;
  
  for (let i = 0; i < totalDays; i++) {
    dates.push(addDays(startDate, i));
  }
  
  return dates;
}

/**
 * Check if a given time is within lab operating hours
 */
export function isWithinOperatingHours(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 6 && hour < 22; // 6:00 - 22:00
}

/**
 * Add random time jitter to events for realism
 * @param baseTime - Base timestamp
 * @param maxJitterMinutes - Maximum jitter in minutes (both directions)
 */
export function addTimeJitter(baseTime: Date, maxJitterMinutes: number = 5): Date {
  const jitterMs = (Math.random() - 0.5) * 2 * maxJitterMinutes * 60 * 1000;
  return new Date(baseTime.getTime() + jitterMs);
}

/**
 * Calculate expected occupancy for a specific time based on patterns
 */
export function calculateExpectedOccupancy(
  date: Date,
  roomCapacity: number,
  baseOccupancyRatio: number,
  holidays: HolidayInfo[]
): number {
  // Check if lab is closed
  if (isLabClosed(date, holidays)) {
    return 0;
  }
  
  // Check operating hours
  if (!isWithinOperatingHours(date)) {
    return 0;
  }
  
  // Apply semester break factor
  const semesterFactor = getSemesterBreakFactor(date, holidays);
  
  // Calculate base occupancy
  let expectedOccupancy = Math.round(roomCapacity * baseOccupancyRatio * semesterFactor);
  
  // Ensure within bounds
  return Math.max(0, Math.min(expectedOccupancy, roomCapacity));
}

/**
 * Generate realistic event timing clusters
 * Groups events in bursts to simulate real-world patterns
 */
export function generateEventClusters(
  baseTime: Date,
  eventCount: number,
  clusterSizeRange: [number, number] = [1, 4],
  clusterIntervalRange: [number, number] = [5, 30] // minutes
): Date[] {
  const events: Date[] = [];
  let currentTime = new Date(baseTime);
  let remainingEvents = eventCount;
  
  while (remainingEvents > 0) {
    // Determine cluster size
    const minClusterSize = Math.min(clusterSizeRange[0], remainingEvents);
    const maxClusterSize = Math.min(clusterSizeRange[1], remainingEvents);
    const clusterSize = Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1)) + minClusterSize;
    
    // Generate events within cluster (close together)
    for (let i = 0; i < clusterSize; i++) {
      events.push(addTimeJitter(currentTime, 2)); // Small jitter within cluster
      if (i < clusterSize - 1) {
        currentTime = addMinutes(currentTime, Math.floor(Math.random() * 3) + 1); // 1-3 minutes apart
      }
    }
    
    remainingEvents -= clusterSize;
    
    // Add interval to next cluster
    if (remainingEvents > 0) {
      const intervalMinutes = Math.floor(
        Math.random() * (clusterIntervalRange[1] - clusterIntervalRange[0] + 1)
      ) + clusterIntervalRange[0];
      currentTime = addMinutes(currentTime, intervalMinutes);
    }
  }
  
  return events.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Create realistic passage event sequences (people entering/leaving)
 */
export function createPassageSequence(
  startTime: Date,
  targetOccupancyChange: number,
  currentOccupancy: number
): Array<{ timestamp: Date; isEntry: boolean }> {
  const sequence: Array<{ timestamp: Date; isEntry: boolean }> = [];
  
  if (targetOccupancyChange === 0) return sequence;
  
  const isIncreasing = targetOccupancyChange > 0;
  const eventCount = Math.abs(targetOccupancyChange);
  
  // Generate event times with realistic clustering
  const eventTimes = generateEventClusters(startTime, eventCount);
  
  // Assign entry/exit based on target change
  eventTimes.forEach(time => {
    sequence.push({
      timestamp: time,
      isEntry: isIncreasing
    });
  });
  
  return sequence;
}

/**
 * Calculate door open duration based on passage events
 * Door should open before passage and close after
 */
export function calculateDoorOpenDuration(passageCount: number): number {
  // Base duration: 2-4 seconds
  const baseDuration = 2000 + Math.random() * 2000;
  
  // Add time for multiple passages
  const additionalTime = (passageCount - 1) * (1000 + Math.random() * 2000);
  
  // Random variation for realism
  const variation = (Math.random() - 0.5) * 1000;
  
  return Math.max(1000, baseDuration + additionalTime + variation); // Minimum 1 second
}

/**
 * Generate door event timing relative to passage events
 */
export function generateDoorEventTiming(passageEvents: Date[]): Array<{ timestamp: Date; isOpen: boolean }> {
  if (passageEvents.length === 0) return [];
  
  const doorEvents: Array<{ timestamp: Date; isOpen: boolean }> = [];
  
  // Group nearby passage events (within 30 seconds)
  const groups: Date[][] = [];
  let currentGroup: Date[] = [passageEvents[0]!]; // Safe assertion since we checked length
  
  for (let i = 1; i < passageEvents.length; i++) {
    const currentEvent = passageEvents[i];
    const previousEvent = passageEvents[i - 1];
    
    if (!currentEvent || !previousEvent) continue;
    
    const timeDiff = currentEvent.getTime() - previousEvent.getTime();
    
    if (timeDiff <= 30000) { // 30 seconds
      currentGroup.push(currentEvent);
    } else {
      groups.push(currentGroup);
      currentGroup = [currentEvent];
    }
  }
  groups.push(currentGroup);
  
  // Generate door open/close events for each group
  groups.forEach(group => {
    if (group.length === 0) return;
    
    const firstEvent = group[0];
    const lastEvent = group[group.length - 1];
    
    if (!firstEvent || !lastEvent) return;
    
    // Door opens 1-3 seconds before first passage
    const openTime = new Date(firstEvent.getTime() - (1000 + Math.random() * 2000));
    doorEvents.push({ timestamp: openTime, isOpen: true });
    
    // Door closes 2-5 seconds after last passage
    const closeDelay = calculateDoorOpenDuration(group.length);
    const closeTime = new Date(lastEvent.getTime() + closeDelay);
    doorEvents.push({ timestamp: closeTime, isOpen: false });
  });
  
  return doorEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Format timestamp for database insertion
 */
export function formatTimestamp(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Parse time string to minutes since midnight
 */
export function timeStringToMinutes(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Get business day information
 */
export function getBusinessDayInfo(date: Date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  return {
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isMonday: dayOfWeek === 1,
    isFriday: dayOfWeek === 5,
    isSunday: dayOfWeek === 0,
    dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
  };
}

/**
 * Apply noise to a value for realistic variation
 */
export function applyNoise(value: number, noiseLevel: number, min: number = 0, max?: number): number {
  const variation = (Math.random() - 0.5) * 2 * noiseLevel * value;
  let result = value + variation;
  
  result = Math.max(result, min);
  if (max !== undefined) {
    result = Math.min(result, max);
  }
  
  return Math.round(result);
}

/**
 * Generate weighted random choice based on probabilities
 */
export function weightedRandomChoice<T>(choices: T[], weights: number[]): T {
  if (choices.length !== weights.length) {
    throw new Error('Choices and weights arrays must have the same length');
  }
  
  if (choices.length === 0) {
    throw new Error('Choices array cannot be empty');
  }
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < choices.length; i++) {
    const weight = weights[i];
    const choice = choices[i];
    
    if (weight === undefined || choice === undefined) continue;
    
    random -= weight;
    if (random <= 0) {
      return choice;
    }
  }
  
  // Fallback to first choice if no selection was made
  const fallback = choices[0];
  if (fallback === undefined) {
    throw new Error('No valid choices available');
  }
  
  return fallback;
}

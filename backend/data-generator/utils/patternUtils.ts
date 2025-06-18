/**
 * Pattern utility functions for realistic data generation
 * Handles pattern matching, interpolation, and trend analysis
 */

import { addHours, format, getHours } from 'date-fns';
import { DayPattern, WeekPattern, HolidayInfo } from '../types';
import { getWeekPatternForDate, getDayPattern, getSeasonalFactor } from '../config/patterns';
import { getSemesterBreakFactor, isLabClosed } from '../config/holidays';
import { applyNoise, getBusinessDayInfo } from './timeUtils';

/**
 * Calculate occupancy for a specific time based on patterns
 */
export function calculatePatternOccupancy(
  timestamp: Date,
  roomCapacity: number,
  holidays: HolidayInfo[]
): number {
  // Check if lab is closed
  if (isLabClosed(timestamp, holidays)) {
    return 0;
  }

  const hour = getHours(timestamp);
  const dayOfWeek = timestamp.getDay();
  const month = timestamp.getMonth();
  
  // Get business day info
  const dayInfo = getBusinessDayInfo(timestamp);
  
  // Determine if it's semester break or exam period (simplified logic)
  const isSemesterBreak = getSemesterBreakFactor(timestamp, holidays) < 1.0;
  const isExamPeriod = false; // Could be enhanced with actual exam period detection
  
  // Get appropriate week pattern
  const weekPattern = getWeekPatternForDate(timestamp, isSemesterBreak, isExamPeriod);
  const dayPattern = getDayPattern(weekPattern, dayOfWeek);
  
  // Get hourly occupancy ratio from pattern
  const hourlyRatio = dayPattern.hourlyOccupancyPattern[hour] || 0;
  
  // Apply seasonal adjustment
  const seasonalFactor = getSeasonalFactor(month);
  
  // Calculate base occupancy
  let baseOccupancy = roomCapacity * hourlyRatio * seasonalFactor;
  
  // Apply semester break factor
  const semesterFactor = getSemesterBreakFactor(timestamp, holidays);
  baseOccupancy *= semesterFactor;
  
  // Apply noise for realism
  const finalOccupancy = applyNoise(baseOccupancy, dayPattern.noiseLevel, 0, roomCapacity);
  
  return Math.max(0, Math.min(finalOccupancy, roomCapacity));
}

/**
 * Generate smooth occupancy transitions between time slots
 */
export function generateOccupancyTransitions(
  startTime: Date,
  endTime: Date,
  startOccupancy: number,
  endOccupancy: number,
  intervalMinutes: number = 15
): Array<{ timestamp: Date; occupancy: number }> {
  const transitions: Array<{ timestamp: Date; occupancy: number }> = [];
  
  const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  const steps = Math.ceil(totalMinutes / intervalMinutes);
  
  if (steps === 0) {
    return [{ timestamp: startTime, occupancy: startOccupancy }];
  }
  
  const occupancyDiff = endOccupancy - startOccupancy;
  
  for (let i = 0; i <= steps; i++) {
    const timestamp = new Date(startTime.getTime() + (i * intervalMinutes * 60 * 1000));
    
    // Use smooth interpolation (ease-in-out cubic)
    const progress = i / steps;
    const smoothProgress = progress < 0.5 
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    const occupancy = Math.round(startOccupancy + (occupancyDiff * smoothProgress));
    
    transitions.push({
      timestamp,
      occupancy: Math.max(0, occupancy)
    });
  }
  
  return transitions;
}

/**
 * Detect peak periods in occupancy patterns
 */
export function detectPeakPeriods(
  occupancyData: Array<{ timestamp: Date; occupancy: number }>,
  roomCapacity: number,
  peakThreshold: number = 0.7
): Array<{ start: Date; end: Date; peakOccupancy: number }> {
  const peaks: Array<{ start: Date; end: Date; peakOccupancy: number }> = [];
  
  let currentPeak: { start: Date; end: Date; peakOccupancy: number } | null = null;
  
  for (const data of occupancyData) {
    const occupancyRatio = data.occupancy / roomCapacity;
    
    if (occupancyRatio >= peakThreshold) {
      if (!currentPeak) {
        // Start new peak period
        currentPeak = {
          start: data.timestamp,
          end: data.timestamp,
          peakOccupancy: data.occupancy
        };
      } else {
        // Extend current peak period
        currentPeak.end = data.timestamp;
        currentPeak.peakOccupancy = Math.max(currentPeak.peakOccupancy, data.occupancy);
      }
    } else {
      if (currentPeak) {
        // End current peak period
        peaks.push(currentPeak);
        currentPeak = null;
      }
    }
  }
  
  // Add final peak if still active
  if (currentPeak) {
    peaks.push(currentPeak);
  }
  
  return peaks;
}

/**
 * Calculate optimal event distribution for a time period
 */
export function calculateEventDistribution(
  startOccupancy: number,
  endOccupancy: number,
  duration: number, // in minutes
  eventIntensity: number = 1.0
): { entryEvents: number; exitEvents: number; distribution: number[] } {
  const occupancyChange = endOccupancy - startOccupancy;
  
  let entryEvents = 0;
  let exitEvents = 0;
  
  if (occupancyChange > 0) {
    entryEvents = occupancyChange;
    // Add some exit events for realism (people leaving and being replaced)
    exitEvents = Math.floor(startOccupancy * 0.1 * eventIntensity);
    entryEvents += exitEvents; // Compensate for exits
  } else if (occupancyChange < 0) {
    exitEvents = Math.abs(occupancyChange);
    // Add some entry events for realism
    entryEvents = Math.floor(endOccupancy * 0.05 * eventIntensity);
    exitEvents += entryEvents; // Compensate for entries
  } else {
    // No net change, but still some movement
    const baseMovement = Math.floor(startOccupancy * 0.05 * eventIntensity);
    entryEvents = baseMovement;
    exitEvents = baseMovement;
  }
  
  // Create event distribution across time slots
  const timeSlots = Math.max(1, Math.floor(duration / 15)); // 15-minute slots
  const distribution: number[] = [];
  
  const totalEvents = entryEvents + exitEvents;
  let remainingEvents = totalEvents;
  
  for (let i = 0; i < timeSlots; i++) {
    const isLastSlot = i === timeSlots - 1;
    
    if (isLastSlot) {
      distribution.push(remainingEvents);
    } else {
      // Distribute events with some randomness
      const avgEventsPerSlot = remainingEvents / (timeSlots - i);
      const variation = avgEventsPerSlot * 0.3; // 30% variation
      const slotEvents = Math.max(0, Math.round(
        avgEventsPerSlot + (Math.random() - 0.5) * 2 * variation
      ));
      
      distribution.push(Math.min(slotEvents, remainingEvents));
      remainingEvents -= slotEvents;
    }
  }
  
  return { entryEvents, exitEvents, distribution };
}

/**
 * Apply realistic constraints to occupancy changes
 */
export function applyOccupancyConstraints(
  currentOccupancy: number,
  targetOccupancy: number,
  roomCapacity: number,
  maxChangePerInterval: number = 3
): number {
  // For small rooms (10 people), allow more flexible changes
  // Allow up to 30% of room capacity change per interval for small rooms
  const flexibleMaxChange = Math.max(maxChangePerInterval, Math.ceil(roomCapacity * 0.3));
  
  // Limit the rate of change to realistic values
  const maxChange = Math.min(flexibleMaxChange, roomCapacity - currentOccupancy);
  const minChange = Math.max(-flexibleMaxChange, -currentOccupancy);
  
  const desiredChange = targetOccupancy - currentOccupancy;
  const constrainedChange = Math.max(minChange, Math.min(maxChange, desiredChange));
  
  return currentOccupancy + constrainedChange;
}

/**
 * Generate occupancy curve for a full day
 */
export function generateDayOccupancyCurve(
  date: Date,
  roomCapacity: number,
  holidays: HolidayInfo[],
  intervalMinutes: number = 15
): Array<{ timestamp: Date; occupancy: number }> {
  const curve: Array<{ timestamp: Date; occupancy: number }> = [];
  
  // Start at beginning of day (6:00 AM when lab opens)
  const startTime = new Date(date);
  startTime.setHours(6, 0, 0, 0);
  
  // End at lab closing (10:00 PM)
  const endTime = new Date(date);
  endTime.setHours(22, 0, 0, 0);
  
  let currentTime = new Date(startTime);
  let currentOccupancy = 0; // Lab starts empty each day
  
  while (currentTime <= endTime) {
    // Calculate target occupancy for this time
    const targetOccupancy = calculatePatternOccupancy(currentTime, roomCapacity, holidays);
    
    // Apply constraints to prevent unrealistic jumps
    const constrainedOccupancy = applyOccupancyConstraints(
      currentOccupancy,
      targetOccupancy,
      roomCapacity,
      Math.ceil(roomCapacity * 0.3) // Max 30% capacity change per interval for small rooms
    );
    
    curve.push({
      timestamp: new Date(currentTime),
      occupancy: constrainedOccupancy
    });
    
    currentOccupancy = constrainedOccupancy;
    currentTime = addHours(currentTime, intervalMinutes / 60);
  }
  
  // Ensure lab ends empty (people leave by closing time)
  if (curve.length > 0) {
    const lastEntry = curve[curve.length - 1];
    if (lastEntry && lastEntry.occupancy > 0) {
      // Add gradual decrease to zero in the last hour
      const closingTime = new Date(endTime);
      closingTime.setHours(21, 45, 0, 0); // 9:45 PM
      
      curve.push({
        timestamp: closingTime,
        occupancy: Math.ceil(lastEntry.occupancy * 0.5)
      });
      
      curve.push({
        timestamp: endTime,
        occupancy: 0
      });
    }
  }
  
  return curve;
}

/**
 * Validate occupancy patterns for consistency
 */
export function validateOccupancyPattern(
  occupancyData: Array<{ timestamp: Date; occupancy: number }>,
  roomCapacity: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for occupancy exceeding capacity
  for (const data of occupancyData) {
    if (data.occupancy > roomCapacity) {
      errors.push(`Occupancy ${data.occupancy} exceeds capacity ${roomCapacity} at ${format(data.timestamp, 'yyyy-MM-dd HH:mm')}`);
    }
    
    if (data.occupancy < 0) {
      errors.push(`Negative occupancy ${data.occupancy} at ${format(data.timestamp, 'yyyy-MM-dd HH:mm')}`);
    }
  }
  
  // Check for unrealistic jumps
  for (let i = 1; i < occupancyData.length; i++) {
    const current = occupancyData[i];
    const previous = occupancyData[i - 1];
    
    if (!current || !previous) continue;
    
    const change = Math.abs(current.occupancy - previous.occupancy);
    const maxReasonableChange = Math.ceil(roomCapacity * 0.2); // 20% of capacity
    
    if (change > maxReasonableChange) {
      errors.push(`Unrealistic occupancy jump from ${previous.occupancy} to ${current.occupancy} between ${format(previous.timestamp, 'HH:mm')} and ${format(current.timestamp, 'HH:mm')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Occupancy History Generator
 * Generates RoomOccupancyHistory records based on passage events
 */

import { createId } from '@paralleldrive/cuid2';
import { PassageEvent, PassageDirection, RoomOccupancyHistory } from '../types';
import { format } from 'date-fns';

/**
 * Generate room occupancy history from passage events
 */
export class OccupancyHistoryGenerator {
  private readonly roomId: string;
  private readonly roomCapacity: number;

  constructor(roomId: string, roomCapacity: number) {
    this.roomId = roomId;
    this.roomCapacity = roomCapacity;
  }

  /**
   * Generate occupancy history records from passage events
   */
  generateOccupancyHistory(
    passageEvents: PassageEvent[],
    initialOccupancy: number = 0
  ): {
    occupancyHistory: RoomOccupancyHistory[];
    errors: string[];
    finalOccupancy: number;
  } {
    const occupancyHistory: RoomOccupancyHistory[] = [];
    const errors: string[] = [];
    
    let currentOccupancy = initialOccupancy;
    let previousOccupancy = initialOccupancy;
    
    // Sort events by timestamp
    const sortedEvents = passageEvents.sort((a, b) => 
      a.eventTimestamp.getTime() - b.eventTimestamp.getTime()
    );
    
    for (const event of sortedEvents) {
      previousOccupancy = currentOccupancy;
      
      // Update occupancy based on event direction
      if (event.direction === PassageDirection.IN) {
        currentOccupancy++;
      } else {
        currentOccupancy--;
      }
      
      // Validate occupancy bounds
      if (currentOccupancy < 0) {
        errors.push(
          `Negative occupancy (${currentOccupancy}) at ${format(event.eventTimestamp, 'yyyy-MM-dd HH:mm:ss')} - Event ID: ${event.id}`
        );
        currentOccupancy = 0; // Reset to prevent cascade errors
      }
      
      if (currentOccupancy > this.roomCapacity) {
        errors.push(
          `Occupancy exceeded capacity (${currentOccupancy}/${this.roomCapacity}) at ${format(event.eventTimestamp, 'yyyy-MM-dd HH:mm:ss')} - Event ID: ${event.id}`
        );
      }
      
      // Create occupancy history record
      const historyRecord: RoomOccupancyHistory = {
        id: createId(),
        roomId: this.roomId,
        occupancy: Math.max(0, Math.min(currentOccupancy, this.roomCapacity)), // Clamp to valid range
        previousOccupancy: previousOccupancy,
        eventType: event.direction,
        eventTimestamp: event.eventTimestamp
      };
      
      occupancyHistory.push(historyRecord);
    }
    
    return {
      occupancyHistory,
      errors,
      finalOccupancy: currentOccupancy
    };
  }

  /**
   * Generate occupancy history with daily reset
   * Ensures each day starts with zero occupancy
   */
  generateWithDailyReset(
    passageEvents: PassageEvent[]
  ): {
    occupancyHistory: RoomOccupancyHistory[];
    errors: string[];
    dailyStats: Array<{
      date: string;
      finalOccupancy: number;
      peakOccupancy: number;
      totalEvents: number;
    }>;
  } {
    const occupancyHistory: RoomOccupancyHistory[] = [];
    const errors: string[] = [];
    const dailyStats: Array<{
      date: string;
      finalOccupancy: number;
      peakOccupancy: number;
      totalEvents: number;
    }> = [];
    
    // Group events by date
    const eventsByDate = this.groupEventsByDate(passageEvents);
    
    for (const [dateStr, dayEvents] of eventsByDate.entries()) {
      let currentOccupancy = 0; // Start each day with zero occupancy
      let peakOccupancy = 0;
      
      for (const event of dayEvents) {
        const previousOccupancy = currentOccupancy;
        
        // Update occupancy
        if (event.direction === PassageDirection.IN) {
          currentOccupancy++;
        } else {
          currentOccupancy--;
        }
        
        // Track peak occupancy
        peakOccupancy = Math.max(peakOccupancy, currentOccupancy);
        
        // Validate bounds
        if (currentOccupancy < 0) {
          errors.push(
            `Negative occupancy (${currentOccupancy}) on ${dateStr} at ${format(event.eventTimestamp, 'HH:mm:ss')} - Event ID: ${event.id}`
          );
          currentOccupancy = 0;
        }
        
        if (currentOccupancy > this.roomCapacity) {
          errors.push(
            `Occupancy exceeded capacity (${currentOccupancy}/${this.roomCapacity}) on ${dateStr} at ${format(event.eventTimestamp, 'HH:mm:ss')} - Event ID: ${event.id}`
          );
        }
        
        // Create history record
        const historyRecord: RoomOccupancyHistory = {
          id: createId(),
          roomId: this.roomId,
          occupancy: Math.max(0, Math.min(currentOccupancy, this.roomCapacity)),
          previousOccupancy: previousOccupancy,
          eventType: event.direction,
          eventTimestamp: event.eventTimestamp
        };
        
        occupancyHistory.push(historyRecord);
      }
      
      // Add daily statistics
      dailyStats.push({
        date: dateStr,
        finalOccupancy: currentOccupancy,
        peakOccupancy: peakOccupancy,
        totalEvents: dayEvents.length
      });
      
      // Warn if day doesn't end with zero occupancy
      if (currentOccupancy !== 0) {
        errors.push(
          `Day ${dateStr} ended with non-zero occupancy: ${currentOccupancy} people still in room`
        );
      }
    }
    
    return {
      occupancyHistory,
      errors,
      dailyStats
    };
  }

  /**
   * Group passage events by date
   */
  private groupEventsByDate(events: PassageEvent[]): Map<string, PassageEvent[]> {
    const eventsByDate = new Map<string, PassageEvent[]>();
    
    for (const event of events) {
      const dateStr = format(event.eventTimestamp, 'yyyy-MM-dd');
      
      if (!eventsByDate.has(dateStr)) {
        eventsByDate.set(dateStr, []);
      }
      
      eventsByDate.get(dateStr)?.push(event);
    }
    
    // Sort events within each day
    for (const [date, dayEvents] of eventsByDate.entries()) {
      dayEvents.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
    }
    
    return eventsByDate;
  }

  /**
   * Generate corrected occupancy history by fixing inconsistencies
   * Attempts to resolve negative occupancy and capacity violations
   */
  generateCorrectedHistory(
    passageEvents: PassageEvent[]
  ): {
    occupancyHistory: RoomOccupancyHistory[];
    corrections: Array<{
      timestamp: Date;
      originalOccupancy: number;
      correctedOccupancy: number;
      reason: string;
    }>;
    finalOccupancy: number;
  } {
    const occupancyHistory: RoomOccupancyHistory[] = [];
    const corrections: Array<{
      timestamp: Date;
      originalOccupancy: number;
      correctedOccupancy: number;
      reason: string;
    }> = [];
    
    let currentOccupancy = 0;
    const sortedEvents = passageEvents.sort((a, b) => 
      a.eventTimestamp.getTime() - b.eventTimestamp.getTime()
    );
    
    for (const event of sortedEvents) {
      const previousOccupancy = currentOccupancy;
      let originalOccupancy = currentOccupancy;
      
      // Apply event
      if (event.direction === PassageDirection.IN) {
        currentOccupancy++;
      } else {
        currentOccupancy--;
      }
      
      originalOccupancy = currentOccupancy;
      
      // Apply corrections
      if (currentOccupancy < 0) {
        corrections.push({
          timestamp: event.eventTimestamp,
          originalOccupancy: currentOccupancy,
          correctedOccupancy: 0,
          reason: 'Prevented negative occupancy'
        });
        currentOccupancy = 0;
      }
      
      if (currentOccupancy > this.roomCapacity) {
        corrections.push({
          timestamp: event.eventTimestamp,
          originalOccupancy: currentOccupancy,
          correctedOccupancy: this.roomCapacity,
          reason: 'Capped at room capacity'
        });
        currentOccupancy = this.roomCapacity;
      }
      
      // Create history record with corrected values
      const historyRecord: RoomOccupancyHistory = {
        id: createId(),
        roomId: this.roomId,
        occupancy: currentOccupancy,
        previousOccupancy: previousOccupancy,
        eventType: event.direction,
        eventTimestamp: event.eventTimestamp
      };
      
      occupancyHistory.push(historyRecord);
    }
    
    return {
      occupancyHistory,
      corrections,
      finalOccupancy: currentOccupancy
    };
  }

  /**
   * Generate occupancy snapshots at regular intervals
   * Useful for creating time-series training data
   */
  generateOccupancySnapshots(
    passageEvents: PassageEvent[],
    intervalMinutes: number = 15
  ): Array<{
    timestamp: Date;
    occupancy: number;
    changesSinceLastSnapshot: number;
  }> {
    const snapshots: Array<{
      timestamp: Date;
      occupancy: number;
      changesSinceLastSnapshot: number;
    }> = [];
    
    if (passageEvents.length === 0) return snapshots;
    
    // Sort events
    const sortedEvents = passageEvents.sort((a, b) => 
      a.eventTimestamp.getTime() - b.eventTimestamp.getTime()
    );
    
    // Find time range
    const startTime = sortedEvents[0]?.eventTimestamp;
    const endTime = sortedEvents[sortedEvents.length - 1]?.eventTimestamp;
    
    if (!startTime || !endTime) return snapshots;
    
    // Generate snapshot timestamps
    const intervalMs = intervalMinutes * 60 * 1000;
    let currentSnapshot = new Date(Math.floor(startTime.getTime() / intervalMs) * intervalMs);
    
    let currentOccupancy = 0;
    let eventIndex = 0;
    let changesSinceLastSnapshot = 0;
    
    while (currentSnapshot <= endTime) {
      let changesInThisInterval = 0;
      
      // Process all events until next snapshot time
      const nextSnapshotTime = new Date(currentSnapshot.getTime() + intervalMs);
      
      while (eventIndex < sortedEvents.length) {
        const event = sortedEvents[eventIndex];
        if (!event || event.eventTimestamp >= nextSnapshotTime) break;
        
        // Apply event
        if (event.direction === PassageDirection.IN) {
          currentOccupancy++;
        } else {
          currentOccupancy--;
        }
        
        currentOccupancy = Math.max(0, Math.min(currentOccupancy, this.roomCapacity));
        changesInThisInterval++;
        eventIndex++;
      }
      
      // Create snapshot
      snapshots.push({
        timestamp: new Date(currentSnapshot),
        occupancy: currentOccupancy,
        changesSinceLastSnapshot: changesInThisInterval
      });
      
      // Move to next interval
      currentSnapshot = nextSnapshotTime;
      changesSinceLastSnapshot = changesInThisInterval;
    }
    
    return snapshots;
  }

  /**
   * Calculate occupancy statistics
   */
  calculateOccupancyStats(occupancyHistory: RoomOccupancyHistory[]): {
    averageOccupancy: number;
    peakOccupancy: number;
    minimumOccupancy: number;
    totalEvents: number;
    entryEvents: number;
    exitEvents: number;
    occupancyUtilization: number; // percentage of capacity used
  } {
    if (occupancyHistory.length === 0) {
      return {
        averageOccupancy: 0,
        peakOccupancy: 0,
        minimumOccupancy: 0,
        totalEvents: 0,
        entryEvents: 0,
        exitEvents: 0,
        occupancyUtilization: 0
      };
    }
    
    const occupancies = occupancyHistory.map(record => record.occupancy);
    const entryEvents = occupancyHistory.filter(record => record.eventType === PassageDirection.IN).length;
    const exitEvents = occupancyHistory.filter(record => record.eventType === PassageDirection.OUT).length;
    
    const totalOccupancy = occupancies.reduce((sum, occupancy) => sum + occupancy, 0);
    const averageOccupancy = totalOccupancy / occupancies.length;
    const peakOccupancy = Math.max(...occupancies);
    const minimumOccupancy = Math.min(...occupancies);
    
    return {
      averageOccupancy,
      peakOccupancy,
      minimumOccupancy,
      totalEvents: occupancyHistory.length,
      entryEvents,
      exitEvents,
      occupancyUtilization: (averageOccupancy / this.roomCapacity) * 100
    };
  }
}

/**
 * Factory function to create occupancy history generator
 */
export function createOccupancyHistoryGenerator(roomId: string, roomCapacity: number): OccupancyHistoryGenerator {
  return new OccupancyHistoryGenerator(roomId, roomCapacity);
}

/**
 * Utility function to generate occupancy history for multiple rooms
 */
export function generateOccupancyHistoryForRooms(
  passageEventsByRoom: Map<string, PassageEvent[]>,
  roomCapacities: Map<string, number>
): Map<string, RoomOccupancyHistory[]> {
  const occupancyHistoryByRoom = new Map<string, RoomOccupancyHistory[]>();
  
  for (const [roomId, passageEvents] of passageEventsByRoom.entries()) {
    const roomCapacity = roomCapacities.get(roomId) || 20;
    const generator = createOccupancyHistoryGenerator(roomId, roomCapacity);
    
    const { occupancyHistory } = generator.generateWithDailyReset(passageEvents);
    occupancyHistoryByRoom.set(roomId, occupancyHistory);
  }
  
  return occupancyHistoryByRoom;
}

/**
 * Passage Event Generator
 * Generates realistic IN/OUT passage events based on occupancy patterns
 */

import { addMinutes, format } from 'date-fns';
import { createId } from '@paralleldrive/cuid2';
import { PassageEvent, PassageDirection, Sensor, HolidayInfo } from '../types';
import { generateDayOccupancyCurve, generateOccupancyTransitions } from '../utils/patternUtils';
import { createPassageSequence, generateEventClusters, addTimeJitter } from '../utils/timeUtils';
import { isLabClosed } from '../config/holidays';
import { STANDARD_WEEKDAY_PATTERN, FRIDAY_PATTERN } from '../config/patterns';

/**
 * Generate passage events based on occupancy patterns
 */
export class PassageEventGenerator {
  private readonly sensor: Sensor;
  private readonly roomCapacity: number;

  constructor(sensor: Sensor, roomCapacity: number) {
    this.sensor = sensor;
    this.roomCapacity = roomCapacity;
  }

  /**
   * Generate passage events for a full day
   * NEW APPROACH: Generate events directly based on realistic patterns
   */
  generateDayPassageEvents(
    date: Date,
    holidays: HolidayInfo[]
  ): { passageEvents: PassageEvent[]; occupancyCurve: Array<{ timestamp: Date; occupancy: number }> } {
    // Check if lab is closed
    if (isLabClosed(date, holidays)) {
      return { 
        passageEvents: [], 
        occupancyCurve: [{ timestamp: date, occupancy: 0 }] 
      };
    }

    const passageEvents: PassageEvent[] = [];
    const occupancyCurve: Array<{ timestamp: Date; occupancy: number }> = [];
    
    // Generate realistic event-driven approach
    let currentOccupancy = 0;
    const dayOfWeek = date.getDay();
    
    // Skip Sundays
    if (dayOfWeek === 0) {
      return { 
        passageEvents: [], 
        occupancyCurve: [{ timestamp: date, occupancy: 0 }] 
      };
    }

    // Generate events for operating hours (6:00 - 22:00)
    for (let hour = 6; hour < 22; hour++) {
      const hourEvents = this.generateRealisticHourlyEvents(date, hour, currentOccupancy);
      
      for (const event of hourEvents) {
        // Apply the event and update occupancy
        if (event.direction === PassageDirection.IN) {
          currentOccupancy++;
        } else if (event.direction === PassageDirection.OUT && currentOccupancy > 0) {
          currentOccupancy--;
        } else if (event.direction === PassageDirection.OUT && currentOccupancy === 0) {
          // Skip OUT events when nobody is in the room
          continue;
        }
        
        passageEvents.push(event);
        occupancyCurve.push({
          timestamp: event.eventTimestamp,
          occupancy: currentOccupancy
        });
      }
    }

    // Ensure room is empty at end of day
    if (currentOccupancy > 0) {
      const exitTime = new Date(date);
      exitTime.setHours(21, 45 + Math.random() * 15, 0, 0); // Between 21:45-22:00
      
      for (let i = 0; i < currentOccupancy; i++) {
        const exitEvent: PassageEvent = {
          id: createId(),
          eventTimestamp: addTimeJitter(exitTime, 5),
          direction: PassageDirection.OUT,
          sensorId: this.sensor.id
        };
        passageEvents.push(exitEvent);
        currentOccupancy--;
        occupancyCurve.push({
          timestamp: exitEvent.eventTimestamp,
          occupancy: currentOccupancy
        });
      }
    }
    
    return {
      passageEvents: passageEvents.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime()),
      occupancyCurve: occupancyCurve.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    };
  }

  /**
   * Generate realistic hourly events based on pattern and current occupancy
   */
  private generateRealisticHourlyEvents(date: Date, hour: number, currentOccupancy: number): PassageEvent[] {
    const events: PassageEvent[] = [];
    const dayOfWeek = date.getDay();
    
    // Get hourly pattern from configurations
    const pattern = dayOfWeek === 5 ? FRIDAY_PATTERN : STANDARD_WEEKDAY_PATTERN;
    
    // Calculate target occupancy for this hour
    const targetOccupancyRatio = pattern.hourlyOccupancyPattern[hour] || 0;
    const targetOccupancy = Math.round(this.roomCapacity * targetOccupancyRatio);
    
    // Calculate how many people need to enter/leave
    const occupancyDiff = targetOccupancy - currentOccupancy;
    
    // Generate events based on the difference
    if (occupancyDiff > 0) {
      // Need more people - generate IN events (with some group probability)
      const baseInEvents = occupancyDiff;
      const groupProbability = 0.3; // 30% chance of group entry
      
      let eventsToGenerate = baseInEvents;
      while (eventsToGenerate > 0) {
        const timestamp = new Date(date);
        timestamp.setHours(hour, Math.random() * 60, Math.random() * 60, 0);
        
        const inEvent: PassageEvent = {
          id: createId(),
          eventTimestamp: timestamp,
          direction: PassageDirection.IN,
          sensorId: this.sensor.id
        };
        
        events.push(inEvent);
        eventsToGenerate--;
        
        // Check for group entry
        if (Math.random() < groupProbability && eventsToGenerate > 0) {
          const groupSize = Math.min(Math.floor(Math.random() * 2) + 1, eventsToGenerate); // 1-2 additional people
          for (let i = 0; i < groupSize; i++) {
            const groupEvent: PassageEvent = {
              id: createId(),
              eventTimestamp: addTimeJitter(timestamp, 1), // Within 1 minute
              direction: PassageDirection.IN,
              sensorId: this.sensor.id
            };
            events.push(groupEvent);
            eventsToGenerate--;
          }
        }
      }
    } else if (occupancyDiff < 0 && currentOccupancy > 0) {
      // Need fewer people - generate OUT events (but only if people are present)
      const baseOutEvents = Math.min(Math.abs(occupancyDiff), currentOccupancy);
      
      for (let i = 0; i < baseOutEvents; i++) {
        const timestamp = new Date(date);
        timestamp.setHours(hour, Math.random() * 60, Math.random() * 60, 0);
        
        const outEvent: PassageEvent = {
          id: createId(),
          eventTimestamp: timestamp,
          direction: PassageDirection.OUT,
          sensorId: this.sensor.id
        };
        
        events.push(outEvent);
      }
    }
    
    // Add some random turnover events (people leaving and being replaced)
    if (currentOccupancy > 0 && Math.random() < 0.1) { // 10% chance of turnover
      const turnoverCount = Math.min(Math.ceil(currentOccupancy * 0.2), 2); // Max 2 people
      
      for (let i = 0; i < turnoverCount; i++) {
        const exitTime = new Date(date);
        exitTime.setHours(hour, Math.random() * 45, Math.random() * 60, 0); // Exit in first 45 min
        
        const entryTime = new Date(exitTime);
        entryTime.setMinutes(entryTime.getMinutes() + 5 + Math.random() * 10); // Enter 5-15 min later
        
        events.push({
          id: createId(),
          eventTimestamp: exitTime,
          direction: PassageDirection.OUT,
          sensorId: this.sensor.id
        });
        
        events.push({
          id: createId(),
          eventTimestamp: entryTime,
          direction: PassageDirection.IN,
          sensorId: this.sensor.id
        });
      }
    }
    
    return events.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
  }

  /**
   * Generate passage events for a specific occupancy transition
   */
  private generatePassageEventsForTransition(
    startTime: Date,
    endTime: Date,
    startOccupancy: number,
    endOccupancy: number
  ): PassageEvent[] {
    const events: PassageEvent[] = [];
    const occupancyChange = endOccupancy - startOccupancy;
    
    if (occupancyChange === 0) return events;
    
    // Create balanced entry/exit sequence
    const sequence = this.createBalancedPassageSequence(
      startTime,
      endTime,
      startOccupancy,
      endOccupancy
    );
    
    // Convert sequence to passage events
    for (const item of sequence) {
      const passageEvent: PassageEvent = {
        id: createId(),
        eventTimestamp: item.timestamp,
        direction: item.isEntry ? PassageDirection.IN : PassageDirection.OUT,
        sensorId: this.sensor.id
      };
      
      events.push(passageEvent);
    }
    
    return events;
  }

  /**
   * Create balanced passage sequence with realistic turnover
   */
  private createBalancedPassageSequence(
    startTime: Date,
    endTime: Date,
    startOccupancy: number,
    endOccupancy: number
  ): Array<{ timestamp: Date; isEntry: boolean }> {
    const sequence: Array<{ timestamp: Date; isEntry: boolean }> = [];
    const netChange = endOccupancy - startOccupancy;
    
    // Calculate turnover events (people leaving and being replaced)
    const turnoverRate = this.calculateTurnoverRate(startTime);
    const turnoverEvents = Math.floor(Math.min(startOccupancy, endOccupancy) * turnoverRate);
    
    // Calculate total entries and exits
    let totalEntries = Math.max(0, netChange) + turnoverEvents;
    let totalExits = Math.max(0, -netChange) + turnoverEvents;
    
    // Generate event timing clusters
    const totalEvents = totalEntries + totalExits;
    if (totalEvents === 0) return sequence;
    
    const timeDuration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // minutes
    const eventTimes = generateEventClusters(
      startTime,
      totalEvents,
      [1, 3], // cluster size
      [2, 15] // cluster interval in minutes
    );
    
    // Distribute entries and exits across time slots
    const timeSlots = this.createTimeSlots(startTime, endTime, eventTimes);
    
    for (const slot of timeSlots) {
      const slotEvents = eventTimes.filter(time => 
        time >= slot.start && time < slot.end
      );
      
      if (slotEvents.length === 0) continue;
      
      // Decide ratio of entries to exits for this time slot
      const progressRatio = (slot.start.getTime() - startTime.getTime()) / 
                           (endTime.getTime() - startTime.getTime());
      
      let slotEntries = 0;
      let slotExits = 0;
      
      if (netChange > 0) {
        // More entries needed overall
        const entryBias = 0.7 + (0.3 * progressRatio); // Increase entries toward end
        slotEntries = Math.floor(slotEvents.length * entryBias);
        slotExits = slotEvents.length - slotEntries;
      } else if (netChange < 0) {
        // More exits needed overall
        const exitBias = 0.7 + (0.3 * (1 - progressRatio)); // Increase exits toward start
        slotExits = Math.floor(slotEvents.length * exitBias);
        slotEntries = slotEvents.length - slotExits;
      } else {
        // Equal entries and exits
        slotEntries = Math.floor(slotEvents.length / 2);
        slotExits = slotEvents.length - slotEntries;
      }
      
      // Ensure we don't exceed our totals
      slotEntries = Math.min(slotEntries, totalEntries);
      slotExits = Math.min(slotExits, totalExits);
      
      totalEntries -= slotEntries;
      totalExits -= slotExits;
      
      // Assign events to entries and exits
      const shuffledTimes = slotEvents.sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < slotEntries; i++) {
        const time = shuffledTimes[i];
        if (time) {
          sequence.push({ timestamp: time, isEntry: true });
        }
      }
      
      for (let i = slotEntries; i < slotEntries + slotExits; i++) {
        const time = shuffledTimes[i];
        if (time) {
          sequence.push({ timestamp: time, isEntry: false });
        }
      }
    }
    
    return sequence.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate turnover rate based on time of day
   */
  private calculateTurnoverRate(timestamp: Date): number {
    const hour = timestamp.getHours();
    
    // Higher turnover during peak hours and meal times
    if (hour >= 11 && hour <= 13) return 0.15; // Lunch time
    if (hour >= 15 && hour <= 17) return 0.12; // Afternoon peak
    if (hour >= 9 && hour <= 11) return 0.08;  // Morning peak
    
    return 0.05; // Base turnover rate
  }

  /**
   * Create time slots for event distribution
   */
  private createTimeSlots(
    startTime: Date,
    endTime: Date,
    eventTimes: Date[]
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    const duration = endTime.getTime() - startTime.getTime();
    const slotCount = Math.max(1, Math.min(6, Math.ceil(eventTimes.length / 5))); // 1-6 slots
    const slotDuration = duration / slotCount;
    
    for (let i = 0; i < slotCount; i++) {
      const slotStart = new Date(startTime.getTime() + (i * slotDuration));
      const slotEnd = new Date(startTime.getTime() + ((i + 1) * slotDuration));
      slots.push({ start: slotStart, end: slotEnd });
    }
    
    return slots;
  }

  /**
   * Generate passage events for a time range with specified parameters
   */
  generateForTimeRange(
    startTime: Date,
    endTime: Date,
    startOccupancy: number,
    endOccupancy: number,
    eventIntensity: number = 1.0
  ): PassageEvent[] {
    const baseEvents = this.generatePassageEventsForTransition(
      startTime,
      endTime,
      startOccupancy,
      endOccupancy
    );
    
    // Apply intensity scaling
    if (eventIntensity !== 1.0) {
      const scaledCount = Math.round(baseEvents.length * eventIntensity);
      if (scaledCount < baseEvents.length) {
        // Remove some events randomly
        const eventsToRemove = baseEvents.length - scaledCount;
        for (let i = 0; i < eventsToRemove; i++) {
          const randomIndex = Math.floor(Math.random() * baseEvents.length);
          baseEvents.splice(randomIndex, 1);
        }
      } else if (scaledCount > baseEvents.length) {
        // Add some duplicate events with jitter
        const eventsToAdd = scaledCount - baseEvents.length;
        for (let i = 0; i < eventsToAdd; i++) {
          if (baseEvents.length > 0) {
            const baseEvent = baseEvents[Math.floor(Math.random() * baseEvents.length)];
            if (baseEvent) {
              const duplicateEvent: PassageEvent = {
                id: createId(),
                eventTimestamp: addTimeJitter(baseEvent.eventTimestamp, 5),
                direction: baseEvent.direction,
                sensorId: this.sensor.id
              };
              baseEvents.push(duplicateEvent);
            }
          }
        }
      }
    }
    
    return baseEvents.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
  }

  /**
   * Validate passage event sequence for occupancy consistency
   */
  validatePassageSequence(
    events: PassageEvent[],
    initialOccupancy: number = 0
  ): { 
    isValid: boolean; 
    errors: string[];
    finalOccupancy: number;
    occupancyHistory: Array<{ timestamp: Date; occupancy: number }>;
  } {
    const errors: string[] = [];
    const occupancyHistory: Array<{ timestamp: Date; occupancy: number }> = [];
    let currentOccupancy = initialOccupancy;
    
    occupancyHistory.push({ 
      timestamp: events[0]?.eventTimestamp || new Date(), 
      occupancy: currentOccupancy 
    });
    
    for (const event of events.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime())) {
      if (event.direction === PassageDirection.IN) {
        currentOccupancy++;
        if (currentOccupancy > this.roomCapacity) {
          errors.push(`Occupancy exceeded capacity (${currentOccupancy}/${this.roomCapacity}) at ${format(event.eventTimestamp, 'yyyy-MM-dd HH:mm:ss')}`);
        }
      } else {
        currentOccupancy--;
        if (currentOccupancy < 0) {
          errors.push(`Negative occupancy (${currentOccupancy}) at ${format(event.eventTimestamp, 'yyyy-MM-dd HH:mm:ss')}`);
          currentOccupancy = 0; // Reset to prevent cascade errors
        }
      }
      
      occupancyHistory.push({
        timestamp: event.eventTimestamp,
        occupancy: currentOccupancy
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      finalOccupancy: currentOccupancy,
      occupancyHistory
    };
  }

  /**
   * Apply realistic sensor noise to passage events
   */
  applyRealisticNoise(events: PassageEvent[], noiseLevel: number = 0.03): PassageEvent[] {
    const noisyEvents = [...events];
    
    // Remove some events (missed detections)
    const eventsToRemove = Math.floor(events.length * noiseLevel * 0.6);
    for (let i = 0; i < eventsToRemove; i++) {
      const randomIndex = Math.floor(Math.random() * noisyEvents.length);
      noisyEvents.splice(randomIndex, 1);
    }
    
    // Add some false positive events
    const eventsToAdd = Math.floor(events.length * noiseLevel * 0.4);
    for (let i = 0; i < eventsToAdd; i++) {
      if (events.length === 0) break;
      
      const baseEvent = events[Math.floor(Math.random() * events.length)];
      if (!baseEvent) continue;
      
      const falseEvent: PassageEvent = {
        id: createId(),
        eventTimestamp: addTimeJitter(baseEvent.eventTimestamp, 10),
        direction: Math.random() > 0.5 ? PassageDirection.IN : PassageDirection.OUT,
        sensorId: this.sensor.id
      };
      
      noisyEvents.push(falseEvent);
    }
    
    return noisyEvents.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
  }

  /**
   * Generate realistic group passage events
   * Simulates multiple people entering/leaving together
   */
  generateGroupEvents(baseEvents: PassageEvent[], groupProbability: number = 0.4): PassageEvent[] {
    const groupEvents: PassageEvent[] = [];
    
    for (const event of baseEvents) {
      groupEvents.push(event);
      
      // Check if this should be a group event
      if (Math.random() < groupProbability) {
        const groupSize = Math.floor(Math.random() * 3) + 2; // 2-4 people
        
        for (let i = 1; i < groupSize; i++) {
          const groupEvent: PassageEvent = {
            id: createId(),
            eventTimestamp: addTimeJitter(event.eventTimestamp, 0.5), // Within 30 seconds
            direction: event.direction, // Same direction as original
            sensorId: this.sensor.id
          };
          
          groupEvents.push(groupEvent);
        }
      }
    }
    
    return groupEvents.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
  }
}

/**
 * Factory function to create passage event generator
 */
export function createPassageEventGenerator(sensor: Sensor, roomCapacity: number): PassageEventGenerator {
  return new PassageEventGenerator(sensor, roomCapacity);
}

/**
 * Utility function to generate passage events for multiple sensors
 */
export function generatePassageEventsForSensors(
  sensors: Sensor[],
  roomCapacities: Map<string, number>,
  dates: Date[],
  holidays: HolidayInfo[]
): Map<string, PassageEvent[]> {
  const passageEventsBySensor = new Map<string, PassageEvent[]>();
  
  for (const sensor of sensors) {
    if (sensor.sensorType === 'passage' || sensor.sensorType === 'multi') {
      const roomCapacity = roomCapacities.get(sensor.roomId || '') || 20;
      const generator = createPassageEventGenerator(sensor, roomCapacity);
      
      const allEvents: PassageEvent[] = [];
      
      for (const date of dates) {
        const { passageEvents } = generator.generateDayPassageEvents(date, holidays);
        allEvents.push(...passageEvents);
      }
      
      passageEventsBySensor.set(sensor.id, allEvents);
    }
  }
  
  return passageEventsBySensor;
}

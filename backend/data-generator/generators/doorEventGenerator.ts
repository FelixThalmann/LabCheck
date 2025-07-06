/**
 * Door Event Generator  
 * Generates realistic door open/close events based on occupancy
 * Door opens in the morning and closes when the last person leaves
 */

import { addSeconds, format } from 'date-fns';
import { createId } from '@paralleldrive/cuid2';
import { DoorEvent, PassageEvent, PassageDirection, Sensor } from '../types';
import { addTimeJitter } from '../utils/timeUtils';

/**
 * Generate door events based on passage events and occupancy logic
 * Realistic logic: Door opens when first person arrives, closes when last person leaves
 */
export class DoorEventGenerator {
  private readonly sensor: Sensor;
  private lastDoorState: boolean = false; // false = closed, true = open

  constructor(sensor: Sensor) {
    this.sensor = sensor;
  }

  /**
   * Generate realistic door events based on occupancy changes
   */
  generateDoorEvents(passageEvents: PassageEvent[]): DoorEvent[] {
    if (passageEvents.length === 0) {
      return [];
    }

    const doorEvents: DoorEvent[] = [];
    let currentOccupancy = 0;
    let isDoorOpen = false;
    
    // Sort events by timestamp
    const sortedEvents = passageEvents.sort((a, b) => 
      a.eventTimestamp.getTime() - b.eventTimestamp.getTime()
    );
    
    for (const passageEvent of sortedEvents) {
      // Update occupancy based on passage event
      if (passageEvent.direction === PassageDirection.IN) {
        currentOccupancy++;
        
        // If this is the first person and door is closed, open it
        if (currentOccupancy === 1 && !isDoorOpen) {
          const doorOpenEvent: DoorEvent = {
            id: createId(),
            eventTimestamp: new Date(passageEvent.eventTimestamp.getTime() - 5000), // 5 seconds before
            doorIsOpen: true,
            sensorId: this.sensor.id
          };
          doorEvents.push(doorOpenEvent);
          isDoorOpen = true;
        }
      } else if (passageEvent.direction === PassageDirection.OUT) {
        currentOccupancy = Math.max(0, currentOccupancy - 1);
        
        // If this was the last person and door is open, close it
        if (currentOccupancy === 0 && isDoorOpen) {
          const doorCloseEvent: DoorEvent = {
            id: createId(),
            eventTimestamp: new Date(passageEvent.eventTimestamp.getTime() + 10000), // 10 seconds after
            doorIsOpen: false,
            sensorId: this.sensor.id
          };
          doorEvents.push(doorCloseEvent);
          isDoorOpen = false;
        }
      }
    }
    
    this.lastDoorState = isDoorOpen;
    return doorEvents.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
  }

  /**
   * Generate random door events for periods without passage
   * Simulates occasional door opening without actual passage (false positives)
   */
  private generateRandomDoorEvents(): DoorEvent[] {
    const events: DoorEvent[] = [];
    
    // 5% chance of random door event per hour during operating hours
    const shouldGenerateEvent = Math.random() < 0.05;
    
    if (!shouldGenerateEvent) {
      return events;
    }

    // Generate a simple open-close sequence
    const baseTime = new Date();
    baseTime.setMinutes(Math.floor(Math.random() * 60));
    baseTime.setSeconds(Math.floor(Math.random() * 60));
    
    // Door opens
    const openEvent: DoorEvent = {
      id: createId(),
      eventTimestamp: addTimeJitter(baseTime, 1),
      doorIsOpen: true,
      sensorId: this.sensor.id
    };
    events.push(openEvent);
    
    // Door closes 2-8 seconds later
    const closeDelay = 2000 + Math.random() * 6000; // 2-8 seconds
    const closeEvent: DoorEvent = {
      id: createId(),
      eventTimestamp: new Date(openEvent.eventTimestamp.getTime() + closeDelay),
      doorIsOpen: false,
      sensorId: this.sensor.id
    };
    events.push(closeEvent);
    
    this.lastDoorState = false;
    
    return events;
  }

  /**
   * Generate door events for a specific time period
   */
  generateForTimePeriod(
    startTime: Date,
    endTime: Date,
    relatedPassageEvents: PassageEvent[]
  ): DoorEvent[] {
    // Filter passage events within the time period
    const relevantPassageEvents = relatedPassageEvents.filter(event =>
      event.eventTimestamp >= startTime && event.eventTimestamp <= endTime
    );

    return this.generateDoorEvents(relevantPassageEvents);
  }

  /**
   * Validate door event sequence for consistency
   */
  validateDoorEventSequence(events: DoorEvent[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let expectedState = false; // Assume door starts closed
    
    for (const event of events.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime())) {
      // Check for state consistency
      if (event.doorIsOpen === expectedState) {
        if (event.doorIsOpen) {
          errors.push(`Door opened when already open at ${event.eventTimestamp.toISOString()}`);
        } else {
          errors.push(`Door closed when already closed at ${event.eventTimestamp.toISOString()}`);
        }
      }
      
      expectedState = event.doorIsOpen;
    }
    
    // Check for extremely short open/close cycles (less than 1 second)
    for (let i = 1; i < events.length; i++) {
      const current = events[i];
      const previous = events[i - 1];
      
      if (!current || !previous) continue;
      
      const timeDiff = current.eventTimestamp.getTime() - previous.eventTimestamp.getTime();
      if (timeDiff < 1000) { // Less than 1 second
        errors.push(`Door state change too rapid: ${timeDiff}ms between events at ${previous.eventTimestamp.toISOString()}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate sensor malfunction events (occasional missed or false events)
   */
  applyRealisticNoise(events: DoorEvent[], noiseLevel: number = 0.02): DoorEvent[] {
    const noisyEvents = [...events];
    
    // Remove some events (sensor missed detection)
    const eventsToRemove = Math.floor(events.length * noiseLevel * 0.5);
    for (let i = 0; i < eventsToRemove; i++) {
      const randomIndex = Math.floor(Math.random() * noisyEvents.length);
      noisyEvents.splice(randomIndex, 1);
    }
    
    // Add some false positive events
    const eventsToAdd = Math.floor(events.length * noiseLevel * 0.5);
    for (let i = 0; i < eventsToAdd; i++) {
      if (events.length === 0) break;
      
      const baseEvent = events[Math.floor(Math.random() * events.length)];
      if (!baseEvent) continue;
      
      const falseEvent: DoorEvent = {
        id: createId(),
        eventTimestamp: addTimeJitter(baseEvent.eventTimestamp, 30), // Within 30 minutes
        doorIsOpen: Math.random() > 0.5, // Random state
        sensorId: this.sensor.id
      };
      
      noisyEvents.push(falseEvent);
    }
    
    return noisyEvents.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
  }

  /**
   * Generate door events with realistic maintenance periods
   * Some periods where door sensor might be offline
   */
  generateWithMaintenancePeriods(
    events: DoorEvent[],
    maintenanceProbability: number = 0.001 // 0.1% chance per event
  ): DoorEvent[] {
    const filteredEvents: DoorEvent[] = [];
    let inMaintenanceMode = false;
    let maintenanceEndTime: Date | null = null;
    
    for (const event of events) {
      // Check if maintenance period should start
      if (!inMaintenanceMode && Math.random() < maintenanceProbability) {
        inMaintenanceMode = true;
        // Maintenance lasts 1-6 hours
        const maintenanceDuration = (1 + Math.random() * 5) * 60 * 60 * 1000;
        maintenanceEndTime = new Date(event.eventTimestamp.getTime() + maintenanceDuration);
      }
      
      // Check if maintenance period should end
      if (inMaintenanceMode && maintenanceEndTime && event.eventTimestamp >= maintenanceEndTime) {
        inMaintenanceMode = false;
        maintenanceEndTime = null;
      }
      
      // Include event only if not in maintenance mode
      if (!inMaintenanceMode) {
        filteredEvents.push(event);
      }
    }
    
    return filteredEvents;
  }

  /**
   * Reset internal state
   */
  reset(): void {
    this.lastDoorState = false;
  }

  /**
   * Get current door state
   */
  getCurrentState(): boolean {
    return this.lastDoorState;
  }

  /**
   * Set door state (for initialization)
   */
  setState(isOpen: boolean): void {
    this.lastDoorState = isOpen;
  }
}

/**
 * Factory function to create door event generator
 */
export function createDoorEventGenerator(sensor: Sensor): DoorEventGenerator {
  return new DoorEventGenerator(sensor);
}

/**
 * Utility function to generate door events for multiple sensors
 */
export function generateDoorEventsForSensors(
  sensors: Sensor[],
  passageEventsBySensor: Map<string, PassageEvent[]>
): Map<string, DoorEvent[]> {
  const doorEventsBySensor = new Map<string, DoorEvent[]>();
  
  for (const sensor of sensors) {
    if (sensor.sensorType === 'door' || sensor.sensorType === 'multi') {
      const generator = createDoorEventGenerator(sensor);
      const passageEvents = passageEventsBySensor.get(sensor.id) || [];
      const doorEvents = generator.generateDoorEvents(passageEvents);
      
      doorEventsBySensor.set(sensor.id, doorEvents);
    }
  }
  
  return doorEventsBySensor;
}

/**
 * Core types for synthetic data generation
 * Based on Prisma schema models
 */

export enum PassageDirection {
  IN = 'IN',
  OUT = 'OUT'
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  maxCapacity: number;
  isOpen: boolean;
}

export interface Sensor {
  id: string;
  esp32Id: string;
  location?: string;
  sensorType: string;
  isActive: boolean;
  roomId?: string;
}

export interface DoorEvent {
  id: string;
  eventTimestamp: Date;
  doorIsOpen: boolean;
  sensorId: string;
}

export interface PassageEvent {
  id: string;
  eventTimestamp: Date;
  direction: PassageDirection;
  sensorId: string;
}

export interface RoomOccupancyHistory {
  id: string;
  roomId: string;
  occupancy: number;
  previousOccupancy?: number;
  eventType: PassageDirection;
  eventTimestamp: Date;
}

/**
 * Configuration interfaces for data generation
 */
export interface GenerationConfig {
  startDate: Date;
  endDate: Date;
  rooms: Room[];
  sensors: Sensor[];
  outputPath: string;
  batchSize: number;
}

export interface DayPattern {
  hourlyOccupancyPattern: number[]; // 24 values for each hour (0-23)
  peakHours: number[];
  minOccupancy: number;
  maxOccupancy: number;
  noiseLevel: number; // 0-1, how much random variation to add
}

export interface WeekPattern {
  monday: DayPattern;
  tuesday: DayPattern;
  wednesday: DayPattern;
  thursday: DayPattern;
  friday: DayPattern;
  saturday: DayPattern;
  sunday: DayPattern; // Will be zero occupancy due to closure
}

export interface HolidayInfo {
  date: Date;
  name: string;
  type: 'national' | 'university' | 'semester_break';
}

/**
 * Generation statistics and metadata
 */
export interface GenerationStats {
  totalDoorEvents: number;
  totalPassageEvents: number;
  totalOccupancyRecords: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  roomStats: Array<{
    roomId: string;
    roomName: string;
    averageOccupancy: number;
    maxOccupancy: number;
    totalEvents: number;
  }>;
}

/**
 * Event generation context - maintains state during generation
 */
export interface GenerationContext {
  currentDate: Date;
  currentOccupancy: Map<string, number>; // roomId -> current occupancy
  lastDoorState: Map<string, boolean>; // sensorId -> door open state
  eventBuffer: {
    doorEvents: DoorEvent[];
    passageEvents: PassageEvent[];
    occupancyHistory: RoomOccupancyHistory[];
  };
  stats: GenerationStats;
}

/**
 * Utility types for time-based operations
 */
export interface TimeSlot {
  start: Date;
  end: Date;
  expectedOccupancy: number;
}

export interface EventSequence {
  timestamp: Date;
  events: Array<{
    type: 'door' | 'passage';
    data: Partial<DoorEvent> | Partial<PassageEvent>;
  }>;
}

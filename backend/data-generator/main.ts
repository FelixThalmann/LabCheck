/**
 * Main Data Generator Script
 * Orchestrates the generation of synthetic data for LSTM training
 */

import { addDays, format, startOfDay } from 'date-fns';
import { createId } from '@paralleldrive/cuid2';
import * as fs from 'fs/promises';
import * as path from 'path';

// Import types
import { 
  Room, 
  Sensor, 
  GenerationConfig, 
  GenerationStats,
  HolidayInfo 
} from './types';

// Import configuration and utilities
import { getAllHolidays } from './config/holidays';
import { generateDateRange } from './utils/timeUtils';

// Import generators
import { createPassageEventGenerator } from './generators/passageEventGenerator';
import { createDoorEventGenerator } from './generators/doorEventGenerator';
import { createOccupancyHistoryGenerator } from './generators/occupancyHistoryGenerator';

/**
 * Main data generation class
 */
class LabDataGenerator {
  private config: GenerationConfig;
  private holidays: HolidayInfo[];
  private generationStats: GenerationStats;

  constructor(config: GenerationConfig) {
    this.config = config;
    this.holidays = getAllHolidays(config.startDate, config.endDate);
    this.generationStats = {
      totalDoorEvents: 0,
      totalPassageEvents: 0,
      totalOccupancyRecords: 0,
      dateRange: {
        start: config.startDate,
        end: config.endDate
      },
      roomStats: []
    };
  }

  /**
   * Generate all synthetic data
   */
  async generateAll(): Promise<void> {
    console.log('🚀 Starting synthetic data generation...');
    console.log(`📅 Date range: ${format(this.config.startDate, 'yyyy-MM-dd')} to ${format(this.config.endDate, 'yyyy-MM-dd')}`);
    console.log(`🏢 Rooms: ${this.config.rooms.length}`);
    console.log(`📊 Sensors: ${this.config.sensors.length}`);
    console.log(`🎯 Holidays: ${this.holidays.length}`);

    // Ensure output directory exists
    await this.ensureOutputDirectory();

    // Generate data for each room
    for (const room of this.config.rooms) {
      console.log(`\n🏠 Processing room: ${room.name} (Capacity: ${room.capacity})`);
      await this.generateRoomData(room);
    }

    // Generate summary report
    await this.generateSummaryReport();

    console.log('\n✅ Data generation completed successfully!');
    console.log(`📁 Output directory: ${this.config.outputPath}`);
  }

  /**
   * Generate data for a specific room
   */
  private async generateRoomData(room: Room): Promise<void> {
    // Find sensors for this room
    const roomSensors = this.config.sensors.filter(sensor => sensor.roomId === room.id);
    
    if (roomSensors.length === 0) {
      console.log(`⚠️  No sensors found for room ${room.name}, skipping...`);
      return;
    }

    // Find passage sensor (assuming one per room)
    const passageSensor = roomSensors.find(sensor => 
      sensor.sensorType === 'passage' || sensor.sensorType === 'multi'
    );

    if (!passageSensor) {
      console.log(`⚠️  No passage sensor found for room ${room.name}, skipping...`);
      return;
    }

    // Generate date range
    const dates = generateDateRange(this.config.startDate, this.config.endDate);
    console.log(`📅 Generating data for ${dates.length} days...`);

    // Initialize generators
    const passageGenerator = createPassageEventGenerator(passageSensor, room.capacity);
    const doorGenerator = createDoorEventGenerator(passageSensor);
    const occupancyGenerator = createOccupancyHistoryGenerator(room.id, room.capacity);

    // Generate passage events for all dates
    console.log('🚶 Generating passage events...');
    const allPassageEvents = [];
    const allOccupancyCurves = [];

    for (const date of dates) {
      const { passageEvents, occupancyCurve } = passageGenerator.generateDayPassageEvents(date, this.holidays);
      allPassageEvents.push(...passageEvents);
      allOccupancyCurves.push(...occupancyCurve);
    }

    console.log(`   Generated ${allPassageEvents.length} base passage events`);

    // Apply group movements for realistic multi-person entries/exits
    console.log('👥 Applying group movement patterns...');
    const eventsWithGroups = passageGenerator.generateGroupEvents(allPassageEvents, 0.4);
    const finalPassageEvents = eventsWithGroups.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
    
    console.log(`   Enhanced to ${finalPassageEvents.length} total passage events (${finalPassageEvents.length - allPassageEvents.length} additional group events)`);

    // Generate door events based on passage events (including groups)
    console.log('🚪 Generating door events...');
    const doorEvents = doorGenerator.generateDoorEvents(finalPassageEvents);
    console.log(`   Generated ${doorEvents.length} door events`);

    // Generate occupancy history (including groups)
    console.log('📈 Generating occupancy history...');
    const { occupancyHistory, errors, dailyStats } = occupancyGenerator.generateWithDailyReset(finalPassageEvents);
    console.log(`   Generated ${occupancyHistory.length} occupancy records`);

    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} validation errors found (see detailed report)`);
    }

    // Update statistics with final events count
    this.updateStats(room, finalPassageEvents.length, doorEvents.length, occupancyHistory.length);

    // Export data to files
    await this.exportRoomData(room, {
      passageEvents: finalPassageEvents,
      doorEvents,
      occupancyHistory,
      occupancyCurves: allOccupancyCurves,
      dailyStats,
      errors
    });

    console.log(`✅ Room ${room.name} completed`);
  }

  /**
   * Update generation statistics
   */
  private updateStats(room: Room, passageCount: number, doorCount: number, occupancyCount: number): void {
    this.generationStats.totalPassageEvents += passageCount;
    this.generationStats.totalDoorEvents += doorCount;
    this.generationStats.totalOccupancyRecords += occupancyCount;

    this.generationStats.roomStats.push({
      roomId: room.id,
      roomName: room.name,
      averageOccupancy: 0, // Will be calculated later
      maxOccupancy: room.capacity,
      totalEvents: passageCount + doorCount + occupancyCount
    });
  }

  /**
   * Export room data to files
   */
  private async exportRoomData(room: Room, data: any): Promise<void> {
    const roomDir = path.join(this.config.outputPath, `room_${room.id}`);
    await fs.mkdir(roomDir, { recursive: true });

    // Export as JSON
    const jsonData = {
      room: {
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        maxCapacity: room.maxCapacity
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: this.config.startDate.toISOString(),
          end: this.config.endDate.toISOString()
        },
        totalDays: Math.ceil((this.config.endDate.getTime() - this.config.startDate.getTime()) / (1000 * 60 * 60 * 24)),
        holidays: this.holidays.length
      },
      statistics: {
        passageEvents: data.passageEvents.length,
        doorEvents: data.doorEvents.length,
        occupancyRecords: data.occupancyHistory.length,
        validationErrors: data.errors.length
      },
      data: {
        passageEvents: data.passageEvents,
        doorEvents: data.doorEvents,
        occupancyHistory: data.occupancyHistory
      }
    };

    await fs.writeFile(
      path.join(roomDir, 'synthetic_data.json'),
      JSON.stringify(jsonData, null, 2)
    );

    // Export as CSV for easier LSTM training
    await this.exportCSVData(roomDir, data);

    // Export occupancy curves for visualization
    await fs.writeFile(
      path.join(roomDir, 'occupancy_curves.json'),
      JSON.stringify(data.occupancyCurves, null, 2)
    );

    // Export daily statistics
    await fs.writeFile(
      path.join(roomDir, 'daily_stats.json'),
      JSON.stringify(data.dailyStats, null, 2)
    );

    // Export validation errors if any
    if (data.errors.length > 0) {
      await fs.writeFile(
        path.join(roomDir, 'validation_errors.json'),
        JSON.stringify(data.errors, null, 2)
      );
    }
  }

  /**
   * Export data in CSV format for LSTM training
   */
  private async exportCSVData(roomDir: string, data: any): Promise<void> {
    // Passage events CSV
    const passageCSV = [
      'timestamp,direction,sensor_id',
      ...data.passageEvents.map((event: any) => 
        `${event.eventTimestamp.toISOString()},${event.direction},${event.sensorId}`
      )
    ].join('\n');

    await fs.writeFile(path.join(roomDir, 'passage_events.csv'), passageCSV);

    // Door events CSV
    const doorCSV = [
      'timestamp,door_open,sensor_id',
      ...data.doorEvents.map((event: any) => 
        `${event.eventTimestamp.toISOString()},${event.doorIsOpen},${event.sensorId}`
      )
    ].join('\n');

    await fs.writeFile(path.join(roomDir, 'door_events.csv'), doorCSV);

    // Occupancy history CSV
    const occupancyCSV = [
      'timestamp,occupancy,previous_occupancy,event_type,room_id',
      ...data.occupancyHistory.map((record: any) => 
        `${record.eventTimestamp.toISOString()},${record.occupancy},${record.previousOccupancy || 0},${record.eventType},${record.roomId}`
      )
    ].join('\n');

    await fs.writeFile(path.join(roomDir, 'occupancy_history.csv'), occupancyCSV);

    // Time series data for LSTM training (15-minute intervals) - include door events
    const timeSeriesData = this.createTimeSeriesData(data.occupancyHistory, data.doorEvents);
    const timeSeriesCSV = [
      'timestamp,occupancy,occupancy_change,hour_of_day,day_of_week,is_holiday,door_is_open',
      ...timeSeriesData.map((point: any) => 
        `${point.timestamp},${point.occupancy},${point.occupancyChange},${point.hourOfDay},${point.dayOfWeek},${point.isHoliday},${point.doorIsOpen}`
      )
    ].join('\n');

    await fs.writeFile(path.join(roomDir, 'lstm_training_data.csv'), timeSeriesCSV);
  }

  /**
   * Create time series data optimized for LSTM training
   */
  private createTimeSeriesData(
    occupancyHistory: any[], 
    doorEvents?: any[]
  ): Array<{
    timestamp: string;
    occupancy: number;
    occupancyChange: number;
    hourOfDay: number;
    dayOfWeek: number;
    isHoliday: number;
    doorIsOpen: number;
  }> {
    const timeSeriesData: Array<{
      timestamp: string;
      occupancy: number;
      occupancyChange: number;
      hourOfDay: number;
      dayOfWeek: number;
      isHoliday: number;
      doorIsOpen: number;
    }> = [];
    const intervalMinutes = 15;
    const intervalMs = intervalMinutes * 60 * 1000;

    if (occupancyHistory.length === 0) return timeSeriesData;

    // Sort by timestamp
    const sortedHistory = occupancyHistory.sort((a: any, b: any) => 
      new Date(a.eventTimestamp).getTime() - new Date(b.eventTimestamp).getTime()
    );

    const startTime = new Date(sortedHistory[0].eventTimestamp);
    const endTime = new Date(sortedHistory[sortedHistory.length - 1].eventTimestamp);

    // Create time slots
    let currentTime = new Date(Math.floor(startTime.getTime() / intervalMs) * intervalMs);
    let currentOccupancy = 0;
    let historyIndex = 0;

    while (currentTime <= endTime) {
      const nextTime = new Date(currentTime.getTime() + intervalMs);
      let occupancyChange = 0;

      // Process all events in this time slot
      while (historyIndex < sortedHistory.length) {
        const record = sortedHistory[historyIndex];
        const recordTime = new Date(record.eventTimestamp);

        if (recordTime >= nextTime) break;

        currentOccupancy = record.occupancy;
        occupancyChange += (record.eventType === 'IN' ? 1 : -1);
        historyIndex++;
      }

      // Check if current time is a holiday
      const isHoliday = this.holidays.some(holiday => {
        const holidayDate = format(holiday.date, 'yyyy-MM-dd');
        const currentDate = format(currentTime, 'yyyy-MM-dd');
        return holidayDate === currentDate;
      });

      // Determine door status at this time (default closed if no door events)
      let doorIsOpen = 0;
      if (doorEvents && doorEvents.length > 0) {
        // Find the most recent door event before or at current time
        const relevantDoorEvents = doorEvents
          .filter((event: any) => new Date(event.eventTimestamp) <= currentTime)
          .sort((a: any, b: any) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime());
        
        if (relevantDoorEvents.length > 0) {
          doorIsOpen = relevantDoorEvents[0].doorIsOpen ? 1 : 0;
        }
      }

      timeSeriesData.push({
        timestamp: currentTime.toISOString(),
        occupancy: currentOccupancy,
        occupancyChange,
        hourOfDay: currentTime.getHours(),
        dayOfWeek: currentTime.getDay(),
        isHoliday: isHoliday ? 1 : 0,
        doorIsOpen
      });

      currentTime = nextTime;
    }

    return timeSeriesData;
  }

  /**
   * Generate summary report
   */
  private async generateSummaryReport(): Promise<void> {
    const summary = {
      generationMetadata: {
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: this.config.startDate.toISOString(),
          end: this.config.endDate.toISOString()
        },
        totalDays: Math.ceil((this.config.endDate.getTime() - this.config.startDate.getTime()) / (1000 * 60 * 60 * 24)),
        roomsProcessed: this.config.rooms.length,
        sensorsProcessed: this.config.sensors.length,
        holidaysConsidered: this.holidays.length
      },
      overallStatistics: this.generationStats,
      recommendations: {
        lstmTraining: [
          'Use lstm_training_data.csv files for time series prediction',
          'Consider sequence lengths of 24-48 hours for daily pattern learning',
          'Use 7-14 day sequences for weekly pattern learning',
          'Include holiday flags and day-of-week features for better predictions',
          'Split data into 70% training, 15% validation, 15% testing'
        ],
        dataQuality: [
          'Review validation_errors.json files if present',
          'Check daily_stats.json for unrealistic occupancy patterns',
          'Verify that most days end with zero occupancy',
          'Ensure peak occupancy doesn\'t consistently exceed room capacity'
        ],
        nextSteps: [
          'Load CSV data into your preferred ML framework (TensorFlow, PyTorch, etc.)',
          'Normalize occupancy values by room capacity',
          'Consider feature engineering: rolling averages, lag features, etc.',
          'Experiment with different LSTM architectures (single vs. multi-layer)',
          'Implement proper validation using time-based splits (not random)'
        ]
      },
      holidaysUsed: this.holidays.map(holiday => ({
        date: format(holiday.date, 'yyyy-MM-dd'),
        name: holiday.name,
        type: holiday.type
      }))
    };

    await fs.writeFile(
      path.join(this.config.outputPath, 'generation_summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n📊 Generation Summary:');
    console.log(`   📅 Total days: ${summary.generationMetadata.totalDays}`);
    console.log(`   🚶 Total passage events: ${this.generationStats.totalPassageEvents}`);
    console.log(`   🚪 Total door events: ${this.generationStats.totalDoorEvents}`);
    console.log(`   📈 Total occupancy records: ${this.generationStats.totalOccupancyRecords}`);
    console.log(`   🏢 Rooms processed: ${summary.generationMetadata.roomsProcessed}`);
    console.log(`   📊 Sensors processed: ${summary.generationMetadata.sensorsProcessed}`);
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    await fs.mkdir(this.config.outputPath, { recursive: true });
  }
}

/**
 * Create sample configuration for demonstration
 */
function createSampleConfig(): GenerationConfig {
  // Create sample rooms with realistic small lab capacity
  const rooms: Room[] = [
    {
      id: createId(),
      name: 'Laborraum A101',
      description: 'Hauptlaborraum für Informatik-Praktika (max 10 Personen)',
      capacity: 10,
      maxCapacity: 10,
      isOpen: true
    },
    {
      id: createId(),
      name: 'Laborraum B205',
      description: 'Zusatzlabor für kleinere Arbeitsgruppen (max 10 Personen)',
      capacity: 10,
      maxCapacity: 10,
      isOpen: true
    }
  ];

  // Create sample sensors
  const sensors: Sensor[] = [];
  
  for (const room of rooms) {
    sensors.push({
      id: createId(),
      esp32Id: `ESP32_${room.name.replace(/\s+/g, '_')}`,
      location: 'Haupteingang',
      sensorType: 'multi', // Supports both door and passage detection
      isActive: true,
      roomId: room.id
    });
  }

  return {
    startDate: new Date(2023, 0, 1), // January 1, 2023
    endDate: new Date(2025, 11, 31), // December 31, 2025 (3 years of data)
    rooms,
    sensors,
    outputPath: './output',
    batchSize: 1000
  };
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    // Create configuration
    const config = createSampleConfig();
    
    // Initialize generator
    const generator = new LabDataGenerator(config);
    
    // Generate all data
    await generator.generateAll();
    
    console.log('\n🎉 All synthetic data generated successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review the generated data in the output directory');
    console.log('   2. Check validation_errors.json files if present');
    console.log('   3. Use lstm_training_data.csv for your LSTM model');
    console.log('   4. Review generation_summary.json for detailed statistics');
    
  } catch (error) {
    console.error('❌ Error during data generation:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { main, LabDataGenerator, createSampleConfig };

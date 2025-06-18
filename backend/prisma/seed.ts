import { PrismaClient, PassageDirection } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

/**
 * Interface for passage event data used in seeding
 */
interface PassageEventData {
  eventTimestamp: Date;
  direction: PassageDirection;
  sensorId: string;
}

/**
 * Generates random date within the last N days
 * @param daysBack Number of days to go back
 * @returns Random date within the specified range
 */
function getRandomDateInLastDays(daysBack: number): Date {
  const now = new Date();
  const daysBackMs = daysBack * 24 * 60 * 60 * 1000;
  const randomTime = Math.random() * daysBackMs;
  return new Date(now.getTime() - randomTime);
}

/**
 * Generates realistic passage events for lab usage patterns
 * Higher activity during working hours (8-18), lower on weekends
 * @param sensorId Sensor ID to associate events with
 * @param direction Passage direction (IN or OUT)
 * @param baseEventCount Base number of events to generate
 * @returns Array of passage event data
 */
function generatePassageEvents(
  sensorId: string,
  direction: PassageDirection,
  baseEventCount: number,
): PassageEventData[] {
  const events: PassageEventData[] = [];

  for (let i = 0; i < baseEventCount; i++) {
    const eventDate = getRandomDateInLastDays(30); // Last 30 days
    const dayOfWeek = eventDate.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = eventDate.getHours();

    // Skip some events for weekends and off-hours to create realistic patterns
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend: 30% chance to skip
      if (Math.random() < 0.3) continue;
    }

    if (hour < 7 || hour > 20) {
      // Off-hours: 60% chance to skip
      if (Math.random() < 0.6) continue;
    }

    // Add some clustering around peak times (9-10, 12-13, 15-16)
    if (
      (hour >= 9 && hour <= 10) ||
      (hour >= 12 && hour <= 13) ||
      (hour >= 15 && hour <= 16)
    ) {
      // Peak hours: 20% chance to add extra event
      if (Math.random() < 0.2) {
        const extraEvent = new Date(
          eventDate.getTime() + Math.random() * 60 * 60 * 1000,
        ); // Within same hour
        events.push({
          eventTimestamp: extraEvent,
          direction,
          sensorId,
        });
      }
    }

    events.push({
      eventTimestamp: eventDate,
      direction,
      sensorId,
    });
  }

  // Sort events by timestamp for realistic chronological order
  return events.sort(
    (a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime(),
  );
}

/**
 * Creates seed data for the laboratory database
 * - 1 Room (main laboratory) with dynamic capacity tracking
 * - 2 Sensors (entrance and exit passage detection)
 * - ~1000 PassageEvents (500 IN, 500 OUT) over the last 30 days
 * - Room capacity history is tracked in RoomOccupancyHistory table for each change
 * - Maximum capacity of 30 is enforced
 */
async function createSeedData() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data (cascade will handle related records)
  console.log('🧹 Cleaning existing data...');
  await prisma.roomOccupancyHistory.deleteMany();
  await prisma.passageEvent.deleteMany();
  await prisma.roomSetting.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.room.deleteMany();

  // Create the main laboratory room starting with 0 current occupancy
  console.log('🏠 Creating room...');
  const room = await prisma.room.create({
    data: {
      name: 'Hauptlabor',
      description: 'Hauptlaborraum für Studierende und Forschungsarbeiten',
      capacity: 0, // Start with 0 current occupancy
      maxCapacity: 30,
      isOpen: true,
    },
  });

  // Create initial occupancy history entry
  const initialTimestamp = new Date();
  await prisma.roomOccupancyHistory.create({
    data: {
      roomId: room.id,
      occupancy: 0,
      previousOccupancy: null, // No previous state for initial entry
      eventType: PassageDirection.IN, // Dummy value, could be made optional
      eventTimestamp: initialTimestamp,
    },
  });

  // Create two sensors for passage detection
  console.log('📡 Creating sensors...');
  const entranceSensor = await prisma.sensor.create({
    data: {
      esp32Id: 'ESP32_LAB_ENTRANCE_01',
      location: 'Haupteingang',
      sensorType: 'passage',
      isActive: true,
      roomId: room.id,
    },
  });

  const exitSensor = await prisma.sensor.create({
    data: {
      esp32Id: 'ESP32_LAB_EXIT_01',
      location: 'Ausgang',
      sensorType: 'passage',
      isActive: true,
      roomId: room.id,
    },
  });

  // Generate realistic passage events
  console.log('🚪 Generating passage events...');

  // Generate IN events (people entering)
  const entranceEvents = generatePassageEvents(
    entranceSensor.id,
    PassageDirection.IN,
    500,
  );

  // Generate OUT events (people leaving)
  const exitEvents = generatePassageEvents(
    exitSensor.id,
    PassageDirection.OUT,
    480,
  ); // Slightly fewer to simulate current occupancy

  // Combine and sort all events chronologically
  const allEvents = [...entranceEvents, ...exitEvents].sort(
    (a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime(),
  );

  console.log(
    `📊 Creating ${allEvents.length} passage events with occupancy history tracking...`,
  );

  // Process events one by one to create occupancy history
  let currentOccupancy = 0;
  let eventsProcessed = 0;
  let eventsSkipped = 0;

  for (let i = 0; i < allEvents.length; i++) {
    const event = allEvents[i];

    // Calculate new occupancy based on event direction
    const previousOccupancy = currentOccupancy;
    let skipEvent = false;

    if (event.direction === PassageDirection.IN) {
      // Only allow entry if room is not at maximum capacity
      if (currentOccupancy < 30) {
        currentOccupancy++;
      } else {
        // Skip this event if room is already at maximum capacity
        eventsSkipped++;
        skipEvent = true;
      }
    } else if (event.direction === PassageDirection.OUT) {
      // Prevent negative occupancy
      currentOccupancy = Math.max(0, currentOccupancy - 1);
    }

    // Only create records if the event is not skipped
    if (!skipEvent) {
      // Create the passage event
      await prisma.passageEvent.create({
        data: {
          eventTimestamp: event.eventTimestamp,
          direction: event.direction,
          sensorId: event.sensorId,
        },
      });

      // Create occupancy history entry for each capacity change
      await prisma.roomOccupancyHistory.create({
        data: {
          roomId: room.id,
          occupancy: currentOccupancy,
          previousOccupancy: previousOccupancy,
          eventType: event.direction,
          eventTimestamp: event.eventTimestamp,
        },
      });

      eventsProcessed++;
    }

    // Progress indicator every 100 events
    if ((i + 1) % 100 === 0 || i + 1 === allEvents.length) {
      console.log(
        `  ✅ Processed ${i + 1}/${allEvents.length} events (Current occupancy: ${currentOccupancy}, Skipped: ${eventsSkipped})`,
      );
    }
  }

  // Update final room capacity
  await prisma.room.update({
    where: { id: room.id },
    data: { capacity: currentOccupancy },
  });

  // Final statistics
  const inCount = await prisma.passageEvent.count({
    where: { direction: PassageDirection.IN },
  });
  const outCount = await prisma.passageEvent.count({
    where: { direction: PassageDirection.OUT },
  });
  const historyCount = await prisma.roomOccupancyHistory.count({
    where: { roomId: room.id },
  });

  console.log('\n📈 Seed completed successfully!');
  console.log(`   Room: ${room.name} (Max Capacity: ${room.maxCapacity})`);
  console.log(`   Sensors: 2 (Entrance & Exit)`);
  console.log(`   Passage Events: ${inCount + outCount} total (${eventsProcessed} processed, ${eventsSkipped} skipped)`);
  console.log(`     - IN events: ${inCount}`);
  console.log(`     - OUT events: ${outCount}`);
  console.log(`   Occupancy History: ${historyCount} entries`);
  console.log(`     - Final room occupancy: ${currentOccupancy}`);
  
  // Show some sample history entries for verification
  const sampleHistory = await prisma.roomOccupancyHistory.findMany({
    where: { roomId: room.id },
    orderBy: { eventTimestamp: 'asc' },
    take: 5,
  });
  
  console.log('\n📋 Sample occupancy history entries:');
  sampleHistory.forEach((entry, index) => {
    console.log(
      `   ${index + 1}. ${entry.eventType} event: ${entry.previousOccupancy || 0} → ${entry.occupancy} at ${entry.eventTimestamp.toISOString()}`,
    );
  });
}

/**
 * Main seeding function with error handling
 */
async function main() {
  try {
    await createSeedData();
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute seeding if this file is run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Database seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

/**
 * Interface for CSV row data matching the provided CSV structure
 * timestamp,occupancy,occupancy_change,hour_of_day,day_of_week,is_holiday,door_is_open
 */
interface CsvRowData {
  timestamp: string;
  occupancy: number;
  occupancy_change: number;
  hour_of_day: number;
  day_of_week: number;
  is_holiday: number; // 0 or 1 in CSV
  door_is_open: number; // 0 or 1 in CSV
}

/**
 * Parses CSV content and returns array of structured data
 * @param csvContent Raw CSV file content as string
 * @returns Array of parsed CSV row data
 */
function parseCsvContent(csvContent: string): CsvRowData[] {
  const lines = csvContent.trim().split('\n');
  const data: CsvRowData[] = [];

  // Skip header line (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const columns = line.split(',');
    if (columns.length !== 7) {
      console.warn(`⚠️  Skipping malformed CSV line ${i + 1}: ${line}`);
      continue;
    }

    try {
      const rowData: CsvRowData = {
        timestamp: columns[0],
        occupancy: parseInt(columns[1], 10),
        occupancy_change: parseInt(columns[2], 10),
        hour_of_day: parseInt(columns[3], 10),
        day_of_week: parseInt(columns[4], 10),
        is_holiday: parseInt(columns[5], 10),
        door_is_open: parseInt(columns[6], 10),
      };

      // Validate parsed data
      if (
        isNaN(rowData.occupancy) ||
        isNaN(rowData.occupancy_change) ||
        isNaN(rowData.hour_of_day) ||
        isNaN(rowData.day_of_week) ||
        isNaN(rowData.is_holiday) ||
        isNaN(rowData.door_is_open)
      ) {
        console.warn(`⚠️  Skipping line ${i + 1} with invalid numeric data: ${line}`);
        continue;
      }

      data.push(rowData);
    } catch (error) {
      console.warn(`⚠️  Error parsing line ${i + 1}: ${line}`, error);
    }
  }

  return data;
}

/**
 * Imports CSV training data into the database
 * @param csvFilePath Path to the CSV file to import
 * @param roomId Optional room ID to associate the data with (creates default room if not provided)
 */
async function importCsvTrainingData(csvFilePath: string, roomId?: string): Promise<void> {
  console.log(`📊 Starting CSV import from: ${csvFilePath}`);

  // Check if file exists and read content
  let csvContent: string;
  try {
    csvContent = readFileSync(csvFilePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read CSV file: ${csvFilePath}. Error: ${error}`);
  }

  // Parse CSV content
  const csvData = parseCsvContent(csvContent);
  if (csvData.length === 0) {
    throw new Error('No valid data found in CSV file');
  }

  console.log(`✅ Parsed ${csvData.length} records from CSV`);

  // Get or create room for the training data
  let targetRoom: { id: string; name: string };
  if (roomId) {
    const existingRoom = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true },
    });
    if (!existingRoom) {
      throw new Error(`Room with ID ${roomId} not found`);
    }
    targetRoom = existingRoom;
  } else {
    // Create or get default training data room
    targetRoom = await prisma.room.upsert({
      where: { name: 'Training Data Room' },
      update: {},
      create: {
        name: 'Training Data Room',
        description: 'Room for ML training data imported from CSV',
        capacity: 0,
        maxCapacity: 50,
        isOpen: true,
      },
      select: { id: true, name: true },
    });
  }

  console.log(`🏠 Using room: ${targetRoom.name} (${targetRoom.id})`);

  // Clear existing training data for this room (optional)
  const existingCount = await prisma.occupancyTrainingData.count({
    where: { roomId: targetRoom.id },
  });
  if (existingCount > 0) {
    console.log(`🧹 Clearing ${existingCount} existing training data records...`);
    await prisma.occupancyTrainingData.deleteMany({
      where: { roomId: targetRoom.id },
    });
  }

  // Import CSV data in batches for better performance
  const batchSize = 1000;
  let totalImported = 0;
  let totalSkipped = 0;

  for (let i = 0; i < csvData.length; i += batchSize) {
    const batch = csvData.slice(i, i + batchSize);
    const batchData: {
      timestamp: Date;
      occupancy: number;
      occupancyChange: number;
      hourOfDay: number;
      dayOfWeek: number;
      isHoliday: boolean;
      doorIsOpen: boolean;
      roomId: string;
    }[] = [];

    for (const row of batch) {
      try {
        // Parse timestamp - handle ISO format
        const timestamp = new Date(row.timestamp);
        if (isNaN(timestamp.getTime())) {
          console.warn(`⚠️  Invalid timestamp: ${row.timestamp}`);
          totalSkipped++;
          continue;
        }

        // Validate data ranges
        if (row.hour_of_day < 0 || row.hour_of_day > 23) {
          console.warn(`⚠️  Invalid hour_of_day: ${row.hour_of_day}`);
          totalSkipped++;
          continue;
        }

        if (row.day_of_week < 0 || row.day_of_week > 6) {
          console.warn(`⚠️  Invalid day_of_week: ${row.day_of_week}`);
          totalSkipped++;
          continue;
        }

        batchData.push({
          timestamp,
          occupancy: row.occupancy,
          occupancyChange: row.occupancy_change,
          hourOfDay: row.hour_of_day,
          dayOfWeek: row.day_of_week,
          isHoliday: row.is_holiday === 1,
          doorIsOpen: row.door_is_open === 1,
          roomId: targetRoom.id,
        });
      } catch (error) {
        console.warn(`⚠️  Error processing row:`, row, error);
        totalSkipped++;
      }
    }

    // Insert batch
    if (batchData.length > 0) {
      await prisma.occupancyTrainingData.createMany({
        data: batchData,
        skipDuplicates: true,
      });
      totalImported += batchData.length;
    }

    // Progress indicator
    console.log(
      `  ✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(csvData.length / batchSize)} (${totalImported} imported, ${totalSkipped} skipped)`,
    );
  }

  // Final statistics
  console.log('\n📈 CSV import completed successfully!');
  console.log(`   Room: ${targetRoom.name}`);
  console.log(`   Total records imported: ${totalImported}`);
  console.log(`   Total records skipped: ${totalSkipped}`);
  console.log(`   CSV file: ${csvFilePath}`);

  // Show sample imported data
  const sampleData = await prisma.occupancyTrainingData.findMany({
    where: { roomId: targetRoom.id },
    orderBy: { timestamp: 'asc' },
    take: 3,
  });

  console.log('\n📋 Sample imported data:');
  sampleData.forEach((entry, index) => {
    console.log(
      `   ${index + 1}. ${entry.timestamp.toISOString()} | Occupancy: ${entry.occupancy} (${entry.occupancyChange >= 0 ? '+' : ''}${entry.occupancyChange}) | Hour: ${entry.hourOfDay} | Day: ${entry.dayOfWeek} | Holiday: ${entry.isHoliday} | Door: ${entry.doorIsOpen ? 'Open' : 'Closed'}`,
    );
  });
}

/**
 * CSV Import function - can be called with a CSV file path
 * Usage: importCsv('path/to/your/file.csv', 'optional-room-id')
 */
export async function importCsv(csvFilePath: string, roomId?: string): Promise<void> {
  // Resolve path relative to the prisma directory
  const resolvedPath = join(process.cwd(), csvFilePath);

  try {
    await importCsvTrainingData(resolvedPath, roomId);
    console.log('🎉 CSV import completed successfully!');
  } catch (error) {
    console.error('💥 CSV import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export { main as seed };

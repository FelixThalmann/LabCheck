/* eslint-disable prettier/prettier */
/**
 * CSV Import Script für Occupancy Training Data
 * 
 * Verwendung:
 * npm run ts-node scripts/import-csv.ts path/to/your/file.csv [optional-room-id]
 * 
 * Beispiel:
 * npm run ts-node scripts/import-csv.ts data-generator/output/room_d4c6ogy1g0i6v8mv74fd1zwj/lstm_training_data.csv
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

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
        console.warn(
          `⚠️  Skipping line ${i + 1} with invalid numeric data: ${line}`,
        );
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
 */
async function importCsvTrainingData(
  csvFilePath: string,
  roomId?: string,
): Promise<void> {
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
    console.log(
      `🧹 Clearing ${existingCount} existing training data records...`,
    );
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
    const batchData: Array<{
      timestamp: Date;
      occupancy: number;
      occupancyChange: number;
      hourOfDay: number;
      dayOfWeek: number;
      isHoliday: boolean;
      doorIsOpen: boolean;
      roomId: string;
    }> = [];

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const sampleData = await prisma.occupancyTrainingData.findMany({
    where: { roomId: targetRoom.id },
    orderBy: { timestamp: 'asc' },
    take: 3,
  });

  console.log('\n📋 Sample imported data:');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  sampleData.forEach((entry, index) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    console.log(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      `   ${index + 1}. ${entry.timestamp.toISOString()} | Occupancy: ${entry.occupancy} (${entry.occupancyChange >= 0 ? '+' : ''}${entry.occupancyChange}) | Hour: ${entry.hourOfDay} | Day: ${entry.dayOfWeek} | Holiday: ${entry.isHoliday} | Door: ${entry.doorIsOpen ? 'Open' : 'Closed'}`,
    );
  });
}

/**
 * Main function - handles command line arguments
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: CSV file path is required');
    console.log('Usage: npm run ts-node scripts/import-csv.ts <csv-file-path> [room-id]');
    console.log('Example: npm run ts-node scripts/import-csv.ts data-generator/output/room_abc123/lstm_training_data.csv');
    process.exit(1);
  }

  const csvFilePath = args[0];
  const roomId = args[1]; // optional

  // Resolve path relative to the backend directory
  const resolvedPath = join(process.cwd(), csvFilePath);

  try {
    await importCsvTrainingData(resolvedPath, roomId);
    console.log('🎉 CSV import completed successfully!');
  } catch (error) {
    console.error('💥 CSV import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main();
}

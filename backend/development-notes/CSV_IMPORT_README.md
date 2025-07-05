# CSV Import für Occupancy Training Data

Dieses System ermöglicht es, CSV-Trainingsdaten in die Datenbank zu importieren, die für ML/LSTM-Zwecke verwendet werden können.

## Prisma-Modell

Das `OccupancyTrainingData` Modell wurde zum Schema hinzugefügt und speichert:

```typescript
{
  timestamp: DateTime,        // Original Zeitstempel aus CSV
  occupancy: Int,            // Aktuelle Belegungsanzahl
  occupancyChange: Int,      // Änderung der Belegung
  hourOfDay: Int,            // Stunde des Tages (0-23)
  dayOfWeek: Int,            // Wochentag (0-6, wobei 0 = Sonntag)
  isHoliday: Boolean,        // Ob dieser Tag ein Feiertag ist
  doorIsOpen: Boolean,       // Ob die Tür zu diesem Zeitpunkt offen ist
  roomId: String             // Optional: Verknüpfung zu einem Raum
}
```

## CSV-Format

Die CSV-Datei muss folgende Struktur haben:

```csv
timestamp,occupancy,occupancy_change,hour_of_day,day_of_week,is_holiday,door_is_open
2023-01-02T06:30:00.000Z,1,1,7,1,0,0
2023-01-02T06:45:00.000Z,1,0,7,1,0,1
2023-01-02T07:00:00.000Z,1,0,8,1,0,1
```

### Spalten-Beschreibung:
- **timestamp**: ISO 8601 Zeitstempel
- **occupancy**: Aktuelle Belegungsanzahl (Integer)
- **occupancy_change**: Änderung der Belegung (Integer, kann negativ sein)
- **hour_of_day**: Stunde (0-23)
- **day_of_week**: Wochentag (0-6, wobei 0 = Sonntag)
- **is_holiday**: Feiertag-Flag (0 oder 1)
- **door_is_open**: Tür-Status (0 = geschlossen, 1 = offen)

## Verwendung

### Option 1: Import-Script verwenden

```bash
# Ins backend-Verzeichnis wechseln
cd backend

# CSV-Datei importieren
y

# Mit spezifischer Raum-ID
npx ts-node scripts/import-csv.ts path/to/your/file.csv room-id-here
```

### Option 2: Programmatisch importieren

```typescript
import { importCsv } from './prisma/seed';

// CSV-Datei importieren
await importCsv('path/to/your/file.csv');

// Mit spezifischer Raum-ID
await importCsv('path/to/your/file.csv', 'room-id-here');
```

## Migration

Das neue Modell wurde bereits migriert. Falls du die Migration manuell ausführen musst:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

## Features

- **Batch-Import**: Importiert Daten in 1000er-Batches für bessere Performance
- **Validierung**: Prüft Datentypen und Bereiche (z.B. hour_of_day 0-23)
- **Fehlerbehandlung**: Überspringt ungültige Zeilen und zeigt Warnungen
- **Fortschrittsanzeige**: Zeigt Import-Fortschritt in der Konsole
- **Room-Management**: Erstellt automatisch einen Standard-Raum oder verwendet eine spezifische Raum-ID
- **Duplikats-Schutz**: `skipDuplicates: true` verhindert doppelte Einträge

## Ausgabe-Beispiel

```
📊 Starting CSV import from: /path/to/file.csv
✅ Parsed 8760 records from CSV
🏠 Using room: Training Data Room (clrz1234567890)
🧹 Clearing 0 existing training data records...
  ✅ Processed batch 1/9 (1000 imported, 0 skipped)
  ✅ Processed batch 2/9 (2000 imported, 0 skipped)
  ...
  ✅ Processed batch 9/9 (8760 imported, 0 skipped)

📈 CSV import completed successfully!
   Room: Training Data Room
   Total records imported: 8760
   Total records skipped: 0
   CSV file: /path/to/file.csv

📋 Sample imported data:
   1. 2023-01-02T06:30:00.000Z | Occupancy: 1 (+1) | Hour: 6 | Day: 1 | Holiday: false | Door: Closed
   2. 2023-01-02T06:45:00.000Z | Occupancy: 1 (+0) | Hour: 6 | Day: 1 | Holiday: false | Door: Open
   3. 2023-01-02T07:00:00.000Z | Occupancy: 1 (+0) | Hour: 7 | Day: 1 | Holiday: false | Door: Open

🎉 CSV import completed successfully!
```

## Abfragen der importierten Daten

```typescript
// Alle Trainingsdaten für einen Raum abrufen
const trainingData = await prisma.occupancyTrainingData.findMany({
  where: { roomId: 'your-room-id' },
  orderBy: { timestamp: 'asc' }
});

// Daten für einen bestimmten Zeitbereich
const dateRangeData = await prisma.occupancyTrainingData.findMany({
  where: {
    roomId: 'your-room-id',
    timestamp: {
      gte: new Date('2023-01-01'),
      lte: new Date('2023-12-31')
    }
  }
});

// Aggregierte Statistiken
const stats = await prisma.occupancyTrainingData.aggregate({
  where: { roomId: 'your-room-id' },
  _avg: { occupancy: true },
  _max: { occupancy: true },
  _min: { occupancy: true },
  _count: true
});
```

## Fehlerbehebung

### TypeScript-Fehler
Falls TypeScript-Fehler auftreten, stelle sicher, dass die Prisma-Typen generiert wurden:
```bash
npx prisma generate
```

### CSV-Format-Probleme
- Stelle sicher, dass die erste Zeile die Header enthält
- Alle Zeilen müssen genau 7 Spalten haben
- Zeitstempel müssen im ISO 8601 Format sein
- Numerische Werte müssen gültige Integers sein

### Import-Fehler
- Überprüfe, dass die CSV-Datei existiert und lesbar ist
- Stelle sicher, dass die Datenbank-Verbindung funktioniert
- Überprüfe die `.env` Datei für `DATABASE_URL`

# LabCheck Synthetic Data Generator

Ein umfassendes System zur Generierung synthetischer Daten für das Training von LSTM-Modellen zur Vorhersage der Raumbelegung.

## 🎯 Übersicht

Dieses System generiert realistische synthetische Daten für drei Haupttabellen aus dem LabCheck-Schema:
- **DoorEvents**: Tür-Status-Events (offen/geschlossen)
- **PassageEvents**: Durchgangs-Events (IN/OUT) mit Zeitstempel
- **RoomOccupancyHistory**: Belegungshistorie mit aktueller und vorheriger Belegung

## 📁 Projektstruktur

```
data-generator/
├── config/
│   ├── holidays.ts          # Deutsche Feiertage und Semesterferien
│   └── patterns.ts          # Realistische Nutzungsmuster
├── generators/
│   ├── doorEventGenerator.ts
│   ├── passageEventGenerator.ts
│   └── occupancyHistoryGenerator.ts
├── types/
│   └── index.ts             # TypeScript Typdefinitionen
├── utils/
│   ├── timeUtils.ts         # Zeit- und Datumsfunktionen
│   └── patternUtils.ts      # Muster-Berechnung und -Validierung
├── main.ts                  # Hauptskript
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Installation & Setup

### 1. Dependencies installieren
```bash
cd backend/data-generator
npm install
```

### 2. TypeScript kompilieren
```bash
npm run build
```

### 3. Daten generieren
```bash
npm run generate
# oder direkt:
npm run dev
```

## ⚙️ Konfiguration

Das System wird über die `GenerationConfig` in `main.ts` konfiguriert:

```typescript
const config: GenerationConfig = {
  startDate: new Date(2023, 0, 1),     // 1. Januar 2023
  endDate: new Date(2025, 11, 31),     // 31. Dezember 2025
  rooms: [/* Raum-Definitionen */],
  sensors: [/* Sensor-Definitionen */],
  outputPath: './output',
  batchSize: 1000
};
```

### Anpassungsmöglichkeiten:

1. **Zeitraum**: Ändern Sie `startDate` und `endDate`
2. **Räume**: Fügen Sie weitere Räume mit verschiedenen Kapazitäten hinzu
3. **Nutzungsmuster**: Modifizieren Sie die Muster in `config/patterns.ts`
4. **Feiertage**: Erweitern Sie die Feiertags-Definition in `config/holidays.ts`

## 📊 Generierte Daten

### Output-Struktur
```
output/
├── room_{roomId}/
│   ├── synthetic_data.json         # Vollständige Daten im JSON-Format
│   ├── passage_events.csv          # Durchgangs-Events
│   ├── door_events.csv             # Tür-Events
│   ├── occupancy_history.csv       # Belegungshistorie
│   ├── lstm_training_data.csv      # Optimiert für LSTM-Training
│   ├── occupancy_curves.json       # Belegungskurven für Visualisierung
│   ├── daily_stats.json            # Tägliche Statistiken
│   └── validation_errors.json      # Validierungsfehler (falls vorhanden)
└── generation_summary.json         # Zusammenfassung der Generierung
```

### LSTM-Trainingsdaten

Die Datei `lstm_training_data.csv` enthält:
- **timestamp**: ISO-Zeitstempel
- **occupancy**: Aktuelle Belegung
- **occupancy_change**: Änderung seit letztem Zeitstempel
- **hour_of_day**: Stunde (0-23)
- **day_of_week**: Wochentag (0=Sonntag, 6=Samstag)
- **is_holiday**: Feiertags-Flag (0/1)

## 🎛️ Realistische Features

### Nutzungsmuster
- **Wochentage**: Unterschiedliche Muster für Mo-Sa
- **Sonntage**: Labor geschlossen
- **Feiertage**: Keine Nutzung
- **Semesterferien**: Reduzierte Aktivität (10-30% der normalen Nutzung)
- **Tageszeiten**: Realistische Spitzen zu Vorlesungszeiten

### Datenqualität
- **Konsistenz**: Belegung kann nicht negativ werden
- **Kapazitätsgrenzen**: Überschreitungen werden verhindert
- **Täglicher Reset**: Jeder Tag beginnt mit Belegung 0
- **Sensor-Rauschen**: Realistische Ausfälle und Fehldetektionen

### Ereignis-Korrelation
- **Tür-Events**: Korreliert mit Durchgangs-Events
- **Gruppenbewegungen**: Mehrere Personen zusammen
- **Realistische Zeitabstände**: Events in Clustern gruppiert

## 🧠 LSTM-Training Empfehlungen

### Datenaufbereitung
1. **Normalisierung**: Belegungswerte durch Raumkapazität teilen
2. **Sequenz-Längen**: 
   - Tägliche Muster: 24-48 Stunden
   - Wöchentliche Muster: 7-14 Tage
3. **Feature Engineering**:
   - Rolling Averages (3h, 6h, 24h)
   - Lag Features (vorherige Stunden/Tage)
   - Saisonale Indikatoren

### Modell-Architektur
```python
# Beispiel-Architektur (TensorFlow/Keras)
model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(sequence_length, features)),
    Dropout(0.2),
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1, activation='linear')  # Vorhersage der Belegung
])
```

### Daten-Splits
- **Training**: 70% (zeitlich aufeinanderfolgend)
- **Validation**: 15% (nach Training-Periode)
- **Test**: 15% (neueste Daten)

⚠️ **Wichtig**: Verwenden Sie zeitbasierte Splits, keine zufälligen!

## 🔧 Anpassungen und Erweiterungen

### Neue Nutzungsmuster hinzufügen
```typescript
// In config/patterns.ts
export const CUSTOM_PATTERN: DayPattern = {
  hourlyOccupancyPattern: [...], // 24 Werte für jede Stunde
  peakHours: [10, 14, 16],
  minOccupancy: 0,
  maxOccupancy: 0.8,
  noiseLevel: 0.15
};
```

### Neue Raumtypen
```typescript
// In main.ts createSampleConfig()
const rooms: Room[] = [
  {
    id: createId(),
    name: 'Vorlesungssaal',
    capacity: 100,
    maxCapacity: 120,
    // Andere Nutzungsmuster verwenden
  }
];
```

### Sensor-Konfiguration
```typescript
const sensors: Sensor[] = [
  {
    id: createId(),
    esp32Id: 'ESP32_ROOM_01',
    sensorType: 'multi', // 'door', 'passage', 'multi'
    location: 'Haupteingang',
    isActive: true,
    roomId: room.id
  }
];
```

## 📈 Validierung und Qualitätskontrolle

### Automatische Validierung
- Negative Belegung verhindert
- Kapazitätsüberschreitungen geloggt
- Tägliche Konsistenz-Checks
- Unrealistische Sprünge erkannt

### Manuelle Validierung
1. Prüfen Sie `validation_errors.json` auf Anomalien
2. Analysieren Sie `daily_stats.json` für unrealistische Muster
3. Visualisieren Sie `occupancy_curves.json`
4. Vergleichen Sie Statistiken in `generation_summary.json`

## 🐛 Fehlerbehebung

### Häufige Probleme

**TypeScript-Fehler bei date-fns**:
```bash
npm install @types/node --save-dev
```

**Speicher-Probleme bei großen Datensätzen**:
- Reduzieren Sie den Zeitraum
- Erhöhen Sie `batchSize` in der Konfiguration
- Generieren Sie Räume einzeln

**Unrealistische Daten**:
- Überprüfen Sie die Muster in `config/patterns.ts`
- Adjustieren Sie `noiseLevel` Parameter
- Validieren Sie Feiertags-Konfiguration

## 📋 Best Practices

### Datenqualität
1. **Konsistenz**: Immer vollständige Tage generieren
2. **Realismus**: Verwenden Sie echte Universitäts-Zeitpläne als Basis
3. **Variabilität**: Fügen Sie angemessenes Rauschen hinzu
4. **Validierung**: Prüfen Sie generierte Daten vor dem Training

### LSTM-Training
1. **Preprocessing**: Standardisieren Sie alle Features
2. **Validation**: Verwenden Sie zeitbasierte Splits
3. **Evaluation**: Testen Sie auf verschiedenen Zeiträumen
4. **Monitoring**: Überwachen Sie Training-Metriken kontinuierlich

## 🔄 Wartung und Updates

### Regelmäßige Aufgaben
- Aktualisieren Sie Feiertags-Definitionen jährlich
- Überprüfen Sie Nutzungsmuster gegen echte Daten
- Erweitern Sie Validierungs-Regeln bei Bedarf
- Dokumentieren Sie alle Anpassungen

### Version Control
- Versionieren Sie Konfigurationsänderungen
- Dokumentieren Sie Datengeneration-Parameter
- Archivieren Sie generierte Datensätze mit Metadaten

## 📞 Support

Bei Fragen oder Problemen:
1. Überprüfen Sie die Logs in der Konsole
2. Analysieren Sie `validation_errors.json`
3. Prüfen Sie die Konfiguration in `main.ts`
4. Konsultieren Sie die Typdefinitionen in `types/index.ts`

## 🎉 Erfolgreiche Generierung

Nach erfolgreicher Ausführung sollten Sie sehen:
```
🎉 All synthetic data generated successfully!

📋 Next steps:
   1. Review the generated data in the output directory
   2. Check validation_errors.json files if present  
   3. Use lstm_training_data.csv for your LSTM model
   4. Review generation_summary.json for detailed statistics
```

Die generierten Daten sind nun bereit für das LSTM-Training! 🚀

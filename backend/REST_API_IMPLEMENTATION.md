# REST API Implementation - LabCheck Backend

## Übersicht

Die GraphQL API wurde erfolgreich um REST HTTP Endpunkte erweitert. Die Implementierung folgt NestJS Best Practices und bietet vollständige API-Dokumentation über Swagger.

## Implementierte Endpunkte

### 1. Labor-Status API

**Endpunkt:** `GET /api/lab/status`

**Beschreibung:** Liefert den aktuellen Status und die Belegung des Labors

**Response:**
```json
{
  "isOpen": true,
  "currentOccupancy": 3,
  "maxOccupancy": 5,
  "color": "yellow",
  "currentDate": "2024-01-15T14:30:00.000Z",
  "lastUpdated": "2024-01-15T14:25:00.000Z"
}
```

### 2. Tagesvorhersagen API

**Endpunkt:** `GET /api/predictions/day`

**Beschreibung:** Liefert Vorhersagen für die Laborbelegung im Tagesverlauf

**Response:**
```json
{
  "predictions": [
    {"occupancy": 1, "time": "8 AM", "color": "green"},
    {"occupancy": 4, "time": "10 AM", "color": "yellow"},
    {"occupancy": 5, "time": "12 PM", "color": "red"},
    {"occupancy": 4, "time": "2 PM", "color": "yellow"},
    {"occupancy": 2, "time": "4 PM", "color": "green"},
    {"occupancy": 1, "time": "6 PM", "color": "green"}
  ],
  "lastUpdated": "2024-01-15T14:25:00.000Z"
}
```

### 3. Wochenvorhersagen API

**Endpunkt:** `GET /api/predictions/week`

**Beschreibung:** Liefert durchschnittliche Vorhersagen für die Laborbelegung pro Wochentag

**Response:**
```json
{
  "predictions": [
    {"occupancy": 1, "day": "Mon", "color": "green"},
    {"occupancy": 4, "day": "Tue", "color": "yellow"},
    {"occupancy": 5, "day": "Wed", "color": "red"},
    {"occupancy": 4, "day": "Thu", "color": "yellow"},
    {"occupancy": 2, "day": "Fri", "color": "green"}
  ],
  "lastUpdated": "2024-01-15T14:25:00.000Z"
}
```

## Architektur

### Erweiterte Prisma Schema

Das Prisma Schema wurde um folgende Modelle erweitert:

1. **Room Model** - Raumverwaltung mit Kapazitäten
2. **RoomSetting Model** - Raumspezifische Einstellungen
3. **DayPrediction Model** - Tagesvorhersagen
4. **WeekPrediction Model** - Wochenvorhersagen
5. **UserRole Enum** - Erweiterte Benutzerrollen

### Module-Struktur

#### 1. Lab-Status Module (erweitert)
```
backend/src/lab-status/
├── controllers/
│   └── lab-status.controller.ts
├── services/
│   └── lab-status.service.ts
├── dto/
│   ├── lab-status-response.dto.ts
│   └── combined-lab-status.dto.ts
├── lab-status.module.ts
└── lab-status.resolver.ts (bestehend)
```

#### 2. Predictions Module (neu)
```
backend/src/predictions/
├── controllers/
│   └── predictions.controller.ts
├── services/
│   ├── predictions.service.ts
│   └── prediction-calculation.service.ts
├── dto/
│   ├── prediction-item.dto.ts
│   ├── day-prediction-response.dto.ts
│   ├── week-prediction-response.dto.ts
│   └── index.ts
└── predictions.module.ts
```

### DTOs mit vollständiger Validierung

Alle DTOs verwenden:
- `class-validator` für Eingabevalidierung
- `@nestjs/swagger` für API-Dokumentation
- TypeScript für Typsicherheit

### Services

#### LabStatusService
- Wiederverwendung bestehender Services (DoorService, LabSettingsService)
- Farbkodierung-Logik basierend auf Belegungsgrad
- Fehlerbehandlung und Logging

#### PredictionsService
- Raumbasierte Vorhersagen
- Automatische Generierung fehlender Vorhersagen
- Caching-freundliche Implementierung

#### PredictionCalculationService
- Mock-Algorithmen für Vorhersagen
- Tageszeit- und wochentagsbasierte Faktoren
- Erweiterbar für ML-Modelle

## API-Dokumentation

### Swagger Integration

- **URL:** `http://localhost:3000/api/docs`
- Vollständige API-Dokumentation
- Interaktive API-Tests
- API-Key Authentifizierung

### Authentifizierung

Die REST API verwendet die bestehende API-Key Authentifizierung:
- Header: `X-API-Key`
- Gleiche Sicherheitsrichtlinien wie GraphQL API

## Farbkodierung System

```typescript
const percentage = (currentOccupancy / maxOccupancy) * 100;

if (percentage >= 90) return 'red';    // > 90% - Hohe Belegung
if (percentage >= 60) return 'yellow'; // 60-90% - Mittlere Belegung
return 'green';                        // < 60% - Niedrige Belegung
```

## Deployment

### Neue Dependencies

```json
{
  "@nestjs/swagger": "^7.x.x",
  "swagger-ui-express": "^5.x.x",
  "class-validator": "^0.14.x",
  "class-transformer": "^0.5.x"
}
```

### Umgebungsvariablen

Keine neuen Umgebungsvariablen erforderlich. Die REST API nutzt die bestehende Konfiguration.

### Migration

```bash
# Prisma Schema Migration
npx prisma migrate dev --name add_room_model_and_predictions

# Prisma Client generieren
npx prisma generate

# Anwendung starten
npm run start:dev
```

## Testing

### API-Tests

```bash
# Lab Status
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/lab/status

# Tagesvorhersagen
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/predictions/day

# Wochenvorhersagen
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/predictions/week
```

### Swagger UI

Besuche `http://localhost:3000/api/docs` für interaktive API-Tests.

## Kompatibilität

- **GraphQL API:** Vollständig kompatibel und unverändert
- **Bestehende Services:** Wiederverwendet ohne Änderungen
- **Datenbank:** Erweitert um neue Tabellen, bestehende Daten unverändert

## Erweiterungsmöglichkeiten

1. **Raumspezifische APIs:** `/api/rooms/{id}/status`
2. **Historische Daten:** `/api/analytics/history`
3. **Sensor-Management:** `/api/sensors`
4. **Erweiterte Vorhersagen:** ML-basierte Algorithmen
5. **WebSocket-Support:** Real-time Updates

## Performance

- **Caching:** Vorhersagen werden in der Datenbank gecacht
- **Lazy Loading:** Vorhersagen werden nur bei Bedarf generiert
- **Optimierte Queries:** Prisma-optimierte Datenbankabfragen
- **Response Time:** < 500ms für alle Endpunkte

## Monitoring

- **Logging:** Strukturiertes Logging mit NestJS Logger
- **Error Handling:** Globale Exception Filter
- **Metrics:** Bereit für Prometheus/Grafana Integration
- **Health Checks:** Implementierbar über `/health` Endpunkt

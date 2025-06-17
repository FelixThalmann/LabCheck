# API-Endpunkte Dokumentation - LabCheck Backend

## Übersicht
Diese Dokumentation beschreibt alle notwendigen API-Endpunkte für die LabCheck-Anwendung. Das Frontend benötigt diese drei Hauptendpunkte zur Darstellung des aktuellen Laborstatus und der Vorhersagen.

---

## 1. Labor-Status Endpunkt

### **GET** `/api/lab/status`

**Zweck:** Liefert den aktuellen Status und die Belegung des Labors

### Request
- **Method:** GET
- **URL:** `/api/lab/status`
- **Headers:** `Content-Type: application/json`
- **Body:** Keine Parameter erforderlich

### Response

#### Erfolgreiche Antwort (200 OK)
```json
{
  "isOpen": boolean,
  "currentOccupancy": integer,
  "maxOccupancy": integer,
  "color": string,
  "currentDate": string,
  "lastUpdated": string
}
```

#### Datenfelder Beschreibung
| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `isOpen` | boolean | Gibt an, ob das Labor geöffnet ist | `true` |
| `currentOccupancy` | integer | Aktuelle Anzahl Personen im Labor | `3` |
| `maxOccupancy` | integer | Maximale Kapazität des Labors | `5` |
| `color` | string | Farbkodierung basierend auf Belegung | `"yellow"` |
| `currentDate` | string | Aktuelles Datum/Zeit (ISO 8601) | `"2024-01-15T14:30:00.000Z"` |
| `lastUpdated` | string | Zeitpunkt der letzten Aktualisierung (ISO 8601) | `"2024-01-15T14:25:00.000Z"` |

#### Beispiel-Response
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

---

## 2. Tagesvorhersage Endpunkt

### **GET** `/api/predictions/day`

**Zweck:** Liefert Vorhersagen für die Laborbelegung im Tagesverlauf

### Request
- **Method:** GET
- **URL:** `/api/predictions/day`
- **Headers:** `Content-Type: application/json`
- **Body:** Keine Parameter erforderlich

### Response

#### Erfolgreiche Antwort (200 OK)
```json
{
  "predictions": [
    {
      "occupancy": integer,
      "time": string,
      "color": string
    }
  ],
  "lastUpdated": string
}
```

#### Datenfelder Beschreibung
| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `predictions` | array | Liste der Vorhersagen für den Tag | siehe unten |
| `predictions[].occupancy` | integer | Vorhergesagte Anzahl Personen | `4` |
| `predictions[].time` | string | Uhrzeit der Vorhersage | `"10 AM"` |
| `predictions[].color` | string | Farbkodierung der Vorhersage | `"yellow"` |
| `lastUpdated` | string | Zeitpunkt der letzten Aktualisierung (ISO 8601) | `"2024-01-15T14:25:00.000Z"` |

#### Zeitslots für Vorhersagen
Die Vorhersagen sollen für folgende Uhrzeiten bereitgestellt werden:
- `"8 AM"`
- `"10 AM"`
- `"12 PM"`
- `"2 PM"`
- `"4 PM"`
- `"6 PM"`

#### Beispiel-Response
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

---

## 3. Wochenvorhersage Endpunkt

### **GET** `/api/predictions/week`

**Zweck:** Liefert durchschnittliche Vorhersagen für die Laborbelegung pro Wochentag

### Request
- **Method:** GET
- **URL:** `/api/predictions/week`
- **Headers:** `Content-Type: application/json`
- **Body:** Keine Parameter erforderlich

### Response

#### Erfolgreiche Antwort (200 OK)
```json
{
  "predictions": [
    {
      "occupancy": integer,
      "day": string,
      "color": string
    }
  ],
  "lastUpdated": string
}
```

#### Datenfelder Beschreibung
| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `predictions` | array | Liste der Vorhersagen für die Woche | siehe unten |
| `predictions[].occupancy` | integer | Durchschnittliche Anzahl Personen | `4` |
| `predictions[].day` | string | Wochentag (Abkürzung) | `"Tue"` |
| `predictions[].color` | string | Farbkodierung der Vorhersage | `"yellow"` |
| `lastUpdated` | string | Zeitpunkt der letzten Aktualisierung (ISO 8601) | `"2024-01-15T14:25:00.000Z"` |

#### Wochentage für Vorhersagen
Die Vorhersagen sollen für folgende Wochentage bereitgestellt werden:
- `"Mon"` (Montag)
- `"Tue"` (Dienstag)
- `"Wed"` (Mittwoch)
- `"Thu"` (Donnerstag)
- `"Fri"` (Freitag)

#### Beispiel-Response
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

---

## Farbkodierung System

Das System verwendet drei Farben zur Visualisierung der Laborbelegung:

| Farbe | Wert | Belegungsgrad | Beschreibung |
|-------|------|---------------|--------------|
| 🟢 | `"green"` | < 60% | Niedrige Belegung - Labor ist gut verfügbar |
| 🟡 | `"yellow"` | 60-90% | Mittlere Belegung - Labor ist mäßig belegt |
| 🔴 | `"red"` | > 90% | Hohe Belegung - Labor ist fast voll |

### Berechnung der Farbkodierung
```
Belegungsgrad = (currentOccupancy / maxOccupancy) * 100

if (Belegungsgrad < 60) → "green"
else if (Belegungsgrad <= 90) → "yellow"
else → "red"
```

---

## HTTP-Status-Codes

### Erfolgreiche Antworten
| Code | Bedeutung | Beschreibung |
|------|-----------|--------------|
| 200 | OK | Anfrage erfolgreich verarbeitet |

### Client-Fehler
| Code | Bedeutung | Beschreibung |
|------|-----------|--------------|
| 400 | Bad Request | Ungültige Anfrage |
| 404 | Not Found | Endpunkt nicht gefunden |

### Server-Fehler
| Code | Bedeutung | Beschreibung |
|------|-----------|--------------|
| 500 | Internal Server Error | Allgemeiner Server-Fehler |
| 503 | Service Unavailable | Service vorübergehend nicht verfügbar |

---

## Datenformat-Spezifikationen

### DateTime Format
- **Standard:** ISO 8601 Format
- **Beispiel:** `"2024-01-15T14:30:00.000Z"`
- **Zeitzone:** UTC

### Datentypen Übersicht
| Feld | Datentyp | Validierung | Beispiel |
|------|----------|-------------|----------|
| `isOpen` | boolean | true/false | `true` |
| `occupancy` | integer | >= 0 | `3` |
| `maxOccupancy` | integer | > 0 | `5` |
| `color` | string | "green"\|"yellow"\|"red" | `"yellow"` |
| `time` | string | Gültiger Zeitstring | `"10 AM"` |
| `day` | string | Gültiger Tagesstring | `"Tue"` |
| `lastUpdated` | string | ISO 8601 DateTime | `"2024-01-15T14:30:00.000Z"` |

---

## Implementierungshinweise

### Performance
- Alle Endpunkte sollten innerhalb von 500ms antworten
- Caching-Mechanismen für Vorhersagedaten empfohlen
- Rate-Limiting: Maximal 100 Anfragen pro Minute pro Client

### Sicherheit
- CORS-Headers für Frontend-Domain konfigurieren
- Keine sensiblen Daten in den API-Responses
- API-Versionierung vorsehen (/api/v1/...)

### Monitoring
- Logging aller API-Aufrufe
- Metriken für Response-Zeiten
- Fehlerrate-Überwachung

---

## Testdaten

Für Entwicklung und Tests können folgende Beispieldaten verwendet werden:

### Labor-Status Testdaten
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

### Tagesvorhersage Testdaten
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

### Wochenvorhersage Testdaten
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
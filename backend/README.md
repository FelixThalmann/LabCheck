# LabCheck Backend

Dieses Backend ist verantwortlich für die Entgegennahme von Sensordaten über MQTT, die Speicherung dieser Daten in einer PostgreSQL-Datenbank und die Bereitstellung einer GraphQL-API für den Datenzugriff.

## Inhaltsverzeichnis

- [Voraussetzungen](#voraussetzungen)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Datenbank einrichten (PostgreSQL)](#datenbank-einrichten-postgresql)
- [MQTT-Broker einrichten (Mosquitto)](#mqtt-broker-einrichten-mosquitto)
- [Installation der Abhängigkeiten](#installation-der-abhängigkeiten)
- [Datenbankschema anwenden (Prisma Migrate)](#datenbankschema-anwenden-prisma-migrate)
- [Anwendung starten](#anwendung-starten)
- [Tests ausführen](#tests-ausführen)
  - [Unit-Tests](#unit-tests)
  - [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
- [Linting und Formatierung](#linting-und-formatierung)
- [Für die Produktion bauen](#für-die-produktion-bauen)
- [Mit der API interagieren (GraphQL)](#mit-der-api-interagieren-graphql)
- [Hardware-in-the-Loop-Testing](#hardware-in-the-loop-testing)

## Voraussetzungen

Stellen Sie sicher, dass die folgende Software auf Ihrem System installiert ist:

-   [Node.js](https://nodejs.org/) (Version >= 18.x empfohlen)
-   [npm](https://www.npmjs.com/) (wird mit Node.js geliefert) oder [Yarn](https://yarnpkg.com/)
-   [Docker](https://www.docker.com/get-started) (für PostgreSQL und MQTT-Broker)
-   [Git](https://git-scm.com/)

## Umgebungsvariablen

Das Backend verwendet Umgebungsvariablen zur Konfiguration. Erstellen Sie eine `.env`-Datei im Wurzelverzeichnis des `backend`-Projekts (`backend/.env`) basierend auf der `.env.example`-Datei (falls vorhanden) oder mit folgendem Inhalt:

```env
# PostgreSQL Datenbank Verbindungs-URL
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://admin:admin@localhost:5432/labcheck_db?schema=public"

# MQTT Broker URL
# Format: mqtt://HOST:PORT
MQTT_BROKER_URL="mqtt://localhost:1883"

# Optional: Anmeldeinformationen für den MQTT-Broker, falls konfiguriert
# MQTT_USERNAME="your_mqtt_username"
# MQTT_PASSWORD="your_mqtt_password"

# Port, auf dem die NestJS-Anwendung laufen soll
# PORT=3000
```

**Wichtige Hinweise:**
- Passen Sie `USER`, `PASSWORD`, `HOST`, `PORT` und `DATABASE` in `DATABASE_URL` an Ihre lokale PostgreSQL-Konfiguration an.
- Die Standardwerte oben gehen davon aus, dass Sie die unten stehenden Docker-Befehle verwenden.

## Datenbank einrichten (PostgreSQL)

Wir empfehlen die Verwendung von Docker, um eine PostgreSQL-Datenbank schnell einzurichten:

1.  **PostgreSQL-Container starten:**
    ```bash
    docker run --name labcheck-postgres -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=labcheck_db -p 5432:5432 -d postgres:15
    ```
    Dieser Befehl:
    -   Startet einen PostgreSQL 15 Container namens `labcheck-postgres`.
    -   Setzt den Benutzer auf `admin`, das Passwort auf `admin` und die Datenbank auf `labcheck_db`.
    -   Mappt den Port `5432` des Containers auf Port `5432` Ihres Host-Systems.
    -   Läuft im Hintergrund (`-d`).

2.  **Container stoppen (falls nötig):**
    ```bash
    docker stop labcheck-postgres
    ```

3.  **Container entfernen (falls nötig, Daten gehen verloren, wenn kein Volume gemountet ist):**
    ```bash
    docker rm labcheck-postgres
    ```

## MQTT-Broker einrichten (Mosquitto)

Wir empfehlen die Verwendung von Docker, um einen Mosquitto MQTT-Broker einzurichten:

1.  **Mosquitto-Container starten:**
    ```bash
    docker run --name labcheck-mosquitto -p 1883:1883 -p 9001:9001 -d eclipse-mosquitto:latest
    ```
    Dieser Befehl:
    -   Startet einen Mosquitto-Container namens `labcheck-mosquitto`.
    -   Mappt den MQTT-Standardport `1883` auf Port `1883` Ihres Host-Systems.
    -   Mappt den Websocket-Port `9001` (optional, falls benötigt) auf Port `9001`.
    -   Läuft im Hintergrund (`-d`).

2.  **Container stoppen (falls nötig):**
    ```bash
    docker stop labcheck-mosquitto
    ```

3.  **Container entfernen (falls nötig):**
    ```bash
    docker rm labcheck-mosquitto
    ```

## Installation der Abhängigkeiten

Navigieren Sie in das `backend`-Verzeichnis und installieren Sie die Projekt-Abhängigkeiten:

```bash
cd backend
npm install
```
Oder mit Yarn:
```bash
cd backend
yarn install
```

## Datenbankschema anwenden (Prisma Migrate)

Nachdem die PostgreSQL-Datenbank läuft und die Abhängigkeiten installiert sind, wenden Sie das Datenbankschema mit Prisma Migrate an:

```bash
npx prisma migrate dev --name init
```
Dieser Befehl:
- Initialisiert die Datenbank, falls sie leer ist.
- Wendet alle ausstehenden Migrationen an, um die Tabellen entsprechend `prisma/schema.prisma` zu erstellen.
- `--name init` ist ein Beispielname für die erste Migration. Sie können den Namen anpassen.

Sie können Prisma Studio verwenden, um Ihre Datenbank zu inspizieren:
```bash
npx prisma studio
```

## Anwendung starten

Sie können die Anwendung in verschiedenen Modi starten:

-   **Entwicklungsmodus (mit Watch-Funktion für Änderungen):**
    ```bash
    npm run start:dev
    ```
    Die Anwendung ist standardmäßig unter `http://localhost:3000` erreichbar (falls `PORT` nicht in `.env` anders gesetzt wurde).

-   **Normaler Start:**
    ```bash
    npm run start
    ```

-   **Produktionsmodus (nach dem Build-Prozess, siehe unten):**
    ```bash
    npm run start:prod
    ```

-   **Debugging-Modus (mit Watch-Funktion):**
    ```bash
    npm run start:debug
    ```

## Tests ausführen

Das Projekt enthält Konfigurationen für Unit- und End-to-End-Tests mit Jest.

### Unit-Tests

Unit-Tests überprüfen einzelne Komponenten (Controller, Services, Resolver) isoliert.

-   **Alle Unit-Tests einmalig ausführen:**
    ```bash
    npm run test
    ```

-   **Unit-Tests im Watch-Modus ausführen (erneutes Ausführen bei Dateiänderungen):**
    ```bash
    npm run test:watch
    ```

-   **Unit-Tests mit Coverage-Report ausführen:**
    ```bash
    npm run test:cov
    ```
    Der Report wird im Verzeichnis `coverage/` generiert.

### End-to-End (E2E) Tests

E2E-Tests überprüfen den gesamten Anwendungsfluss, einschließlich API-Endpunkten und Datenbankinteraktionen. Stellen Sie sicher, dass Ihre Anwendung (und die abhängigen Dienste wie Datenbank und MQTT-Broker) läuft, bevor Sie E2E-Tests ausführen, die eine laufende Instanz erfordern könnten, oder dass die Tests ihre eigene Umgebung (z.B. Testdatenbank) verwalten.

-   **E2E-Tests ausführen:**
    ```bash
    npm run test:e2e
    ```
    Die Konfiguration für E2E-Tests befindet sich in `test/jest-e2e.json`.

## Linting und Formatierung

Das Projekt verwendet ESLint für Linting und Prettier für die Code-Formatierung.

-   **Code-Formatierung prüfen und korrigieren:**
    ```bash
    npm run format
    ```

-   **Linting-Fehler prüfen und automatisch beheben (wenn möglich):**
    ```bash
    npm run lint
    ```

## Für die Produktion bauen

Um eine produktionsreife Version der Anwendung zu erstellen:

```bash
npm run build
```
Dieser Befehl kompiliert den TypeScript-Code und legt die Ausgabe im Verzeichnis `dist/` ab.
Anschließend können Sie die Anwendung mit `npm run start:prod` starten.

## Mit der API interagieren (GraphQL)

Wenn die Anwendung läuft, ist der GraphQL-Endpunkt standardmäßig unter `http://localhost:3000/graphql` verfügbar (oder dem Port, den Sie in `.env` konfiguriert haben).

Sie können Tools wie:
-   **Apollo Sandbox** (oft direkt im Browser unter der `/graphql`-URL verfügbar, wenn `playground` in NestJS konfiguriert ist)
-   [Postman](https://www.postman.com/)
-   [Insomnia](https://insomnia.rest/)
verwenden, um GraphQL-Queries und -Mutationen an das Backend zu senden.

Beispiel-Query (alle Laboreinstellungen abrufen):
```graphql
query {
  labSettings {
    key
    value
    notes
    createdAt
    updatedAt
  }
}
```

Beispiel-Mutation (Laborkapazität setzen):
```graphql
mutation {
  setLabCapacity(input: { capacity: 50 }) {
    key
    value
  }
}
```

## Hardware-in-the-Loop-Testing

Um das Backend mit Ihrer tatsächlichen ESP32-Hardware und Lichtschrankensensoren zu testen:

1.  **Backend lokal starten:** Befolgen Sie die Schritte oben, um Ihre PostgreSQL-Datenbank, den Mosquitto MQTT-Broker und die NestJS-Anwendung lokal zu starten.
2.  **ESP32-Firmware konfigurieren:**
    -   Stellen Sie sicher, dass die Firmware Ihres ESP32 so konfiguriert ist, dass sie MQTT-Nachrichten an die IP-Adresse Ihres Entwicklungsrechners und den Port des lokalen Mosquitto-Brokers (standardmäßig `1883`) sendet.
    -   Die `esp32Id` in den MQTT-Nachrichten sollte mit den erwarteten Sensor-IDs im Backend übereinstimmen (oder das Backend sollte neue Sensoren dynamisch registrieren können, falls implementiert).
3.  **Ereignisse auslösen:** Aktivieren Sie Ihre Lichtschranken.
4.  **Überprüfung:**
    -   **MQTT-Broker:** Verwenden Sie ein Tool wie [MQTT Explorer](http://mqtt-explorer.com/), um die auf dem lokalen Broker ankommenden Nachrichten zu beobachten.
    -   **Backend-Logs:** Überprüfen Sie die Konsolenausgaben Ihrer NestJS-Anwendung.
    -   **Datenbank:** Fragen Sie Ihre lokale PostgreSQL-Datenbank ab, um zu sehen, ob die Ereignisse (`DoorEvent`, `PassageEvent`, `MotionEvent`) korrekt gespeichert werden.
    -   **GraphQL API:** Verwenden Sie die oben genannten Tools, um die API-Endpunkte (`passageEvents`, `currentOccupancy` etc.) abzufragen und die Ergebnisse zu verifizieren.

---

Bei Problemen oder Fragen, überprüfen Sie die Logs der einzelnen Komponenten (PostgreSQL-Container, Mosquitto-Container, NestJS-Anwendung).

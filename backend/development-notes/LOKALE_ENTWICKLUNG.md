# Lokale Entwicklung Setup

## Problem
Wenn das Backend lokal läuft (außerhalb von Docker), während andere Services in Docker-Containern laufen, entstehen Netzwerk-Verbindungsprobleme. Der Grund: Docker-Service-Namen wie `labcheck_mosquitto` sind nur innerhalb des Docker-Netzwerks erreichbar.

## Lösung
Eine separate `.env.local` Datei mit angepassten Verbindungsparametern für die lokale Entwicklung.

## Verwendung

### Option 1: Datei umbenennen (Empfohlen)
```bash
# Im backend/ Verzeichnis
mv .env .env.docker
mv .env.local .env
npm run start:dev
```

### Option 2: Explizit .env.local laden
```bash
# Im backend/ Verzeichnis
cp .env.local .env
npm run start:dev
```

### Option 3: Mit dotenv-cli (falls installiert)
```bash
npm install -g dotenv-cli
dotenv -e .env.local npm run start:dev
```

## Unterschiede zwischen .env und .env.local

| Service | .env (Docker) | .env.local (Lokal) |
|---------|---------------|-------------------|
| MQTT Broker | `mqtt://labcheck_mosquitto:1883` | `mqtt://localhost:1883` |
| PostgreSQL | `postgresql://...@postgres:5432/...` | `postgresql://...@localhost:5432/...` |

## Wichtige Hinweise

1. **Docker Services müssen laufen**: PostgreSQL und MQTT müssen über Docker gestartet sein
2. **Port-Mapping prüfen**: Stellen Sie sicher, dass die Ports in `docker-compose.yml` korrekt gemappt sind
3. **Umgebung wechseln**: Bei Deployment zu Docker die ursprüngliche `.env` wieder verwenden

## Schnellstart
```bash
# 1. Docker Services starten
docker-compose up postgres mqtt prediction

# 2. In neuem Terminal: Backend lokal starten
cd backend
mv .env.local .env
npm run start:dev

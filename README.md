# LabCheck

## Setup

Copy the `.env` file to the different directories (backend, frontend, prediction-service).

```bash
./sync-env.sh
```

## Frontend - Flutter

### Install dependencies

```bash
flutter pub get
```

### Run the app on simulator

```bash
flutter run
```

### Build the app

Android:
```bash
flutter build apk
```

iOS:
```bash
flutter build ios
```

### Install the app on device (iOS)

```bash
flutter build ipa --release --export-method=development
```

Open the `ios/Runner.xcworkspace` in Xcode. Open "Window" -> "Devices and Simulators" and select the device. Drag the ".ipa" file into "Installed Apps"

## Backend - Node.js, PostgreSQL, MQTT

This project uses PostgreSQL as the database and MQTT as the message broker.

### Run/Stop as production

```bash
docker-compose up -d
```

```bash
docker-compose down
```

### Show data in database

```bash
cd backend
npx prisma studio
```

### Add demo data to database

```bash
cd backend
npx ts-node scripts/import-csv.ts data-generator/output/room_d4c6ogy1g0i6v8mv74fd1zwj/lstm_training_data.csv
```
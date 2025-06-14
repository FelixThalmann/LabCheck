# LabCheck

## Frontend - Flutter

### Setup

Add the `.env` file to the `frontend/assets/` directory.

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

## Backend - Node.js and PostgreSQL

### Database
This project uses PostgreSQL as the database.

#### Run Database

```bash
docker-compose up -d
```


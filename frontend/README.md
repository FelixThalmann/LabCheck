# frontend_labcheck

A new Flutter project.

### Used resources

- UbiComp Logo: https://ubi29.informatik.uni-siegen.de/usi/
- Images: https://fontawesome.com/start

## How to use
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

Open the `ios/Runner.xcworkspace` in Xcode. Open "Window" -> "Devices and Simulators" and select the device. Drag the `.ipa`-file into "Installed Apps"

### Clean the project

```bash
flutter clean
```
# LabCheck Hardware

ESP32-based firmware for the LabCheck system developed with PlatformIO.

## Overview

The LabCheck Hardware project includes the firmware for an ESP32-based IoT device with various sensors and actuators. The firmware provides both a configuration mode for component testing and main operation with MQTT connectivity.

## Hardware Components

- **ESP32** (Lolin D32 Board)
- **ToF Sensor** (VL53L0X) - Distance measurement
- **PIR Sensor** - (HC-SR501) Motion detection
- **Magnetic Sensor** - (Reed) Position detection
- **LED Indicators** - Status feedback
- **Speaker** - Acoustic signals

## Prerequisites

### Software
- **PlatformIO** (recommended via VS Code Extension)
- **Git** for version control

### Hardware
- ESP32 Development Board (Lolin D32)
- USB cable for programming
- All hardware components according to circuit diagram

## Installation and Setup

### 1. Install PlatformIO

**Option A: VS Code Extension (recommended)**
```bash
# Open VS Code and install PlatformIO IDE Extension
# Search via Extensions Marketplace: "PlatformIO IDE"
```

**Option B: Command Line Interface**
```bash
# Install Python pip (if not already installed)
pip install platformio
```

### 2. Open Project

```bash
# Navigate to project folder
cd LabCheck/hardware/LabCheckFirmware

# Open in VS Code
code .
```

### 3. Install Dependencies

```bash
# Install PlatformIO Dependencies automatically
pio lib install
```

The following libraries will be installed automatically:
- `knolleary/PubSubClient @ ^2.8` - MQTT Client
- `pololu/VL53L0X@^1.3.1` - ToF Sensor Library

### 4. Hardware Configuration

**Adjust Pin Configuration:**
Edit `lib/HardwareComponents/src/PinConfig.h` to adapt the GPIO pins to your hardware.

## Usage

### Compile Project

```bash
# Compile firmware
pio run
```

### Upload Firmware

```bash
# Upload to ESP32 (configure COM port in platformio.ini)
pio run --target upload
```

### Serial Monitor

```bash
# Start serial monitor
pio device monitor
```

### Configuration Mode

After upload, the firmware starts with a 15-second wait time:
- **Press any key** = Activate configuration mode
- **Wait** = Start normal operation

In configuration mode, components can be tested individually:
- LED tests
- Sensor readings
- MQTT connection
- WiFi configuration

Configurations can also be made:
- WiFi credentials
- MQTT broker settings
- Entrance/Exit inversion


## Configuration

### Adjust platformio.ini

```ini
[env:lolin_d32]
platform = espressif32
board = lolin_d32
framework = arduino
upload_port = COM6          # Adjust COM port
monitor_speed = 115200
lib_deps = 
    knolleary/PubSubClient @ ^2.8
    pololu/VL53L0X@^1.3.1
```

### Common Issues

**Upload Errors:**
- Check COM port in `platformio.ini`
- Press ESP32 reset button during upload

**WiFi Connection:**
- Apply WiFi settings in sensor console
- Double-check SSID and password

**Sensor Problems:**
- Check pin connections

## Additional Information

- [PlatformIO Documentation](https://docs.platformio.org/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
- [VL53L0X Library](https://github.com/pololu/vl53l0x-arduino)
/**
 * @file MainProgram.cpp
 * @brief Implementation of the main entrance/exit detection program
 */

#include "MainProgram.h"
#include "MQTTConfig.h"

extern MQTTConfig mqtt;

/**
 * @brief Constructor - Initialize ToF sensors and default values
 */
MainProgram::MainProgram() : tofSensor1{TOF1_XSHUT, TOF1_SDA, TOF1_SCL}, tofSensor2{TOF2_XSHUT, TOF2_SDA, TOF2_SCL} {
  programmode = 0;
  sensorStorageIndex = 0;
  millis = 0;
  delayTime = 200;
  sensor1Active = false;
  sensor2Active = false;
  sensorTimer = 0;
  activeLed = 0;
  invertEntranceExit = false;
  calibratedDistance1 = 1000;
  calibratedDistance2 = 1000;
  calibratedMax = 900;
  tofDetectionTolerance = 10;
  tofTolerancePercentage = 30;
}

/**
 * @brief Program mode enumeration for state machine
 */

/**
 * @brief Program mode enumeration for state machine
 */
enum ProgramMode {
  IDLE = 0,                    ///< Waiting for door to open
  AWAITING_DETECTION = 1,      ///< Waiting for ToF sensor detection
  ENTRANCE_CONFIRMATION = 2,   ///< Confirming entrance detection
  EXIT_CONFIRMATION = 3,       ///< Confirming exit detection
  DETECTION_COMPLETION = 4,    ///< Waiting for sensors to clear
  AWAITING_MOTION = 5,         ///< Waiting for PIR motion detection
  CALIBRATION = 6              ///< Calibrating sensor baseline distances
};

/**
 * @brief Initialize all hardware components and establish connections
 */
void MainProgram::begin() {
  Serial.println(F("Initializing Main Program..."));

  // Initialize hardware components
  leds.begin();
  updateLed();

  // Establish WiFi connection
  wifi.begin();
  Serial.print(F("Connecting to WiFi..."));
  while(!isWiFiAvailable()) {
    if (wifi.connect()) {
      Serial.println(F("WiFi available! Proceeding..."));
    } else {
      Serial.println(F("Failed to connect to WiFi. Retrying..."));
    }
  }

  // Establish MQTT connection
  mqtt.begin();
  mqtt.setCredentials("user", "password");
  Serial.print(F("Connecting to MQTT Broker..."));
  while(!mqtt.isConnected()) {
    if (isWiFiAvailable()) {
      if (mqtt.connect("LabCheckESP32")) {
        Serial.println(F("Connected to MQTT Broker! Proceeding..."));
      } else {
        Serial.println(F("Failed to connect to MQTT Broker! Retrying..."));
      }
    }
  }

  // Initialize ToF sensors
  if (!tofSensor1.begin()) {
    Serial.println(F("ToF Sensor 1 initialization failed!"));
  } else {
    Serial.println(F("ToF Sensor 1 initialized successfully."));
  }
  if (!tofSensor2.begin()) {
    Serial.println(F("ToF Sensor 2 initialization failed!"));
  } else {
    Serial.println(F("ToF Sensor 2 initialized successfully."));
  }
  Serial.println(F("ToF sensors initialized with separate I2C buses."));

  // Initialize remaining sensors
  magneticSensor.begin();
  speaker.begin();

  // Load entrance/exit inversion preference
  prefs.begin("lcmain", true);
  invertEntranceExit = prefs.getBool("invertEntranceExit", false);
  prefs.end();

  // Start with calibration
  programmode = ProgramMode::CALIBRATION;
}

/**
 * @brief Main update loop - handles sensor readings and state machine
 */
void MainProgram::update() {
  // Read current sensor distances
  uint16_t distance1 = tofSensor1.readDistance();
  uint16_t distance2 = tofSensor2.readDistance();

  // Debug output for sensor readings
  Serial.print(F("Distance 1: "));
  Serial.print(distance1);
  Serial.print(F(", Distance 2: "));
  Serial.println(distance2);

  // Maintain MQTT connection
  if (!mqtt.isConnected() && isWiFiAvailable()) {
    Serial.println(F("MQTT disconnected, attempting reconnection..."));
    if (!mqtt.connect("LabCheckESP32")) {
      Serial.println(F("MQTT reconnection failed!"));
    }
  }

  // Handle door state changes (except when idle)
  if (programmode != ProgramMode::IDLE) {
    if (magneticSensor.isActive()) {
      Serial.println(F("Door closed! Idling..."));
      publishMQTT("labcheck/esp32/door", "0");
      prepareMode(ProgramMode::IDLE);
    }
  }

  // State machine processing
  switch(programmode) {

    case ProgramMode::CALIBRATION: {
      // Calibrate sensor baseline distances by averaging multiple readings
      static int calibrationCount = 0;
      static uint32_t distance1Sum = 0;
      static uint32_t distance2Sum = 0;
      
      if (calibrationCount < 20) {
        distance1Sum += distance1;
        distance2Sum += distance2;
        calibrationCount++;
        
        if (calibrationCount >= 20) {
          calibratedDistance1 = distance1Sum / calibrationCount;
          calibratedDistance2 = distance2Sum / calibrationCount;
          
          // Apply maximum distance limits
          calibratedDistance1 = min(calibratedDistance1, calibratedMax);
          calibratedDistance2 = min(calibratedDistance2, calibratedMax);
          
          // Calculate detection tolerance based on average calibrated distance
          tofDetectionTolerance = (calibratedDistance1 + calibratedDistance2) / 2 * (tofTolerancePercentage / 100.0);
          
          Serial.print(F("Calibration complete! Calibrated Distance 1: "));
          Serial.print(calibratedDistance1);
          Serial.print(F(", Calibrated Distance 2: "));
          Serial.print(calibratedDistance2);
          Serial.print(F(", ToF Detection Tolerance: "));
          Serial.println(tofDetectionTolerance);

          prepareMode(ProgramMode::IDLE);
        }
      }
      break;
    }
    
    case ProgramMode::IDLE:
      // Wait for door to open
      if (!magneticSensor.isActive()) {
        Serial.println(F("Door opened!"));
        publishMQTT("labcheck/esp32/door", "1");
        prepareMode(ProgramMode::AWAITING_MOTION);
      }
      break;

    case ProgramMode::AWAITING_MOTION:
      // Wait for PIR motion detection
      if (pirSensor.motionDetected()) {
        Serial.println(F("Motion detected! Awaiting ToF detection..."));
        prepareMode(ProgramMode::AWAITING_DETECTION);
      }
      break;

    case ProgramMode::AWAITING_DETECTION:
      // Wait for ToF sensor detection
      if (!pirSensor.motionDetected()) {
        Serial.print(F("."));
        prepareMode(ProgramMode::AWAITING_MOTION);
        break;
      }

      if (distance1 < calibratedDistance1 - tofDetectionTolerance) {
        Serial.print(F("Possible entrance detected..."));
        prepareMode(ProgramMode::ENTRANCE_CONFIRMATION);
        break;
      }

      if (distance2 < calibratedDistance2 - tofDetectionTolerance) {
        Serial.print(F("Possible exit detected..."));
        prepareMode(ProgramMode::EXIT_CONFIRMATION);
        break;
      }
      break;

    case ProgramMode::ENTRANCE_CONFIRMATION:
      // Confirm entrance by waiting for second sensor activation
      sensorTimer += delayTime;
      if (distance2 < calibratedDistance2 - tofDetectionTolerance) {
        Serial.print(F("Person entered! Took "));
        Serial.print(sensorTimer);	
        Serial.println(F(" ms to pass!"));
        speaker.playSuccess();
        publishMQTT("labcheck/esp32/entrance", invertEntranceExit ? "0" : "1");
        prepareMode(ProgramMode::DETECTION_COMPLETION);
        break;
      }
      if (sensorTimer >= 3000) {
        Serial.println(F("Entrance confirmation timeout!"));
        prepareMode(ProgramMode::DETECTION_COMPLETION);
        break;
      }
      break;

    case ProgramMode::EXIT_CONFIRMATION:
      // Confirm exit by waiting for first sensor activation
      sensorTimer += delayTime;
      if (distance1 < calibratedDistance1 - tofDetectionTolerance) {
        Serial.print(F("Person exited! Took "));
        Serial.print(sensorTimer);	
        Serial.println(F(" ms to pass!"));
        speaker.playSuccess();
        publishMQTT("labcheck/esp32/entrance", invertEntranceExit ? "1" : "0");
        prepareMode(ProgramMode::DETECTION_COMPLETION);
        break;
      }
      if (sensorTimer >= 3000) {
        Serial.println(F("Exit confirmation timeout!"));
        prepareMode(ProgramMode::DETECTION_COMPLETION);
        break;
      }
      break;

    case ProgramMode::DETECTION_COMPLETION:
      // Wait for sensors to return to baseline (person has passed)
      Serial.print(distance1);
      Serial.print(F(", "));
      Serial.println(distance2);
      
      if (distance1 > (calibratedDistance1 - tofDetectionTolerance) && 
          distance2 > (calibratedDistance2 - tofDetectionTolerance)) {
        Serial.println(F("ToF area clear! Returning to awaiting motion..."));
        prepareMode(ProgramMode::AWAITING_MOTION);
      }
      break;
 
    default:
      Serial.println(F("Unknown program mode - idling."));
      break;
  }

  updateLed();
  millis += delayTime;
  delay(delayTime);
}

/**
 * @brief Check if WiFi connection is available
 * @return True if WiFi is connected and has IP address
 */
bool MainProgram::isWiFiAvailable() {
  return wifi.getIPAddress().length() > 0;
}

/**
 * @brief Prepare and transition to a new program mode
 * @param mode Target program mode to transition to
 */
void MainProgram::prepareMode(int mode) {
  switch(mode) {
    case 0: // IDLE - waiting for door sensor
      activeLed = 0;
      delayTime = 5000;
      programmode = 0;
      break;
    case 5: // AWAITING_MOTION
      activeLed = 0;
      delayTime = 200;
      programmode = 5;
      break;
    case 1: // AWAITING_DETECTION
      activeLed = 1;
      delayTime = 50;
      programmode = 1;
      break;
    case 2: // ENTRANCE_CONFIRMATION
      delayTime = 20;
      sensorTimer = 0;
      programmode = 2;
      break;
    case 3: // EXIT_CONFIRMATION
      delayTime = 20;
      sensorTimer = 0;
      programmode = 3;
      break;
    case 4: // DETECTION_COMPLETION
      delayTime = 20;
      programmode = 4;
      break;
    default:
      Serial.println(F("Unknown mode!"));
      break;
  }
}

/**
 * @brief Update LED state based on current program mode
 */
void MainProgram::updateLed() {
  if (activeLed != 0) {
    leds.setGreen(activeLed == 1 ? true : false);
  } else {
    leds.setGreen(false);
  }
}

/**
 * @brief Publish message to MQTT broker if connected
 * @param topic MQTT topic to publish to
 * @param payload Message payload to send
 */
void MainProgram::publishMQTT(const char* topic, const char* payload) {
  if (mqtt.isConnected()) {
    mqtt.publish(topic, payload);
  } else {
    Serial.print(F("MQTT not connected, failed to publish to: "));
    Serial.println(topic);
  }
}

/**
 * @brief Set entrance/exit inversion and save to preferences
 * @param invert True to invert entrance/exit detection logic
 */
void MainProgram::setInvertEntranceExit(bool invert) {
  invertEntranceExit = invert;
  prefs.begin("lcmain", false);
  prefs.putBool("invertEntranceExit", invert);
  prefs.end();
  Serial.print(F("Entrance/Exit inversion set to: "));
  Serial.println(invert ? "true" : "false");
}

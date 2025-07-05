#include "MainProgram.h"
#include "MQTTConfig.h"

extern MQTTConfig mqtt;

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
  tofDetectionTolerance = 10; // 10mm tolerance
  tofTolerancePercentage = 30; // 30% tolerance by default
  firstTimeSending = true;
}

enum ProgramMode {
  IDLE = 0,
  AWAITING_MOTION = 5,
  AWAITING_DETECTION = 1,
  ENTRANCE_CONFIRMATION = 2,
  EXIT_CONFIRMATION = 3,
  DETECTION_COMPLETION = 4,
  CALIBRATION = 6
};

void MainProgram::begin(){

  Serial.println(F("Initializing Main Program..."));

  leds.begin();
  updateLed();

  wifi.begin();
  Serial.print(F("Connecting to WiFi..."));
  while(!isWiFiAvailable()) {
    if (wifi.connect()) {
      Serial.println(F("WiFi available! Proceeding..."));
    } else {
      Serial.println(F("Failed to connect to WiFi. Retrying..."));
    }
  }

  mqtt.begin();
  mqtt.setCredentials("user", "password");
  Serial.print(F("Connecting to MQTT Broker..."));
  while(!mqtt.isConnected()) {
    if (isWiFiAvailable()){
      if (mqtt.connect("LabCheckESP32")){
        Serial.println(F("Connected to MQTT Broker! Proceeding..."));
      }
      else {
        Serial.println(F("Failed to connect to MQTT Broker! Retrying..."));
      }
    }
  }

  // Initialize toF sensors
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

  // Initialize magnetic sensor
  magneticSensor.begin();

  // Initialize speaker
  speaker.begin();

  // Set entrance/exit inversion state from preferences
  prefs.begin("lcmain", true);
  invertEntranceExit = prefs.getBool("invertEntranceExit", false);
  prefs.end();
  

  programmode = ProgramMode::CALIBRATION;
  
}

void MainProgram::update(){
  // Read sensor 1
  uint16_t distance1 = tofSensor1.readDistance();
  // Read sensor 2
  uint16_t distance2 = tofSensor2.readDistance();

  // Print distances for debugging
  Serial.print(F("Distance 1: "));
  Serial.print(distance1);
  Serial.print(F(", Distance 2: "));
  Serial.println(distance2);

  // Check and maintain MQTT connection
  if (!mqtt.isConnected() && isWiFiAvailable()) {
    Serial.println(F("MQTT disconnected, attempting reconnection..."));
    if (!mqtt.connect("LabCheckESP32")) {
      Serial.println(F("MQTT reconnection failed!"));
    }
  }

  if (programmode != ProgramMode::IDLE){
    if(magneticSensor.isActive()){
      Serial.println(F("Door closed! Idleing..."));
      if (firstTimeSending) {
        Serial.println(F("First time sending door status, skipping MQTT publish."));
        firstTimeSending = false;
      } else {
        publishMQTT("labcheck/esp32/door", "0");
      }
      prepareMode(ProgramMode::IDLE);
    }
  }

  switch(programmode){

    case ProgramMode::CALIBRATION: {
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
          
          // calc tolerance by taking 30% per default from calibrated distances (their average)
          calibratedDistance1 = min(calibratedDistance1, calibratedMax);
          calibratedDistance2 = min(calibratedDistance2, calibratedMax);
          tofDetectionTolerance = (calibratedDistance1 + calibratedDistance2) / 2 * (tofTolerancePercentage / 100.0);
          
          // Print all the variables for debugging
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
    
    case ProgramMode::IDLE: // idle if door sensor active
      if(!magneticSensor.isActive()){
        Serial.println(F("Door opened!"));
        if (firstTimeSending) {
          Serial.println(F("First time sending door status, skipping MQTT publish."));
          firstTimeSending = false;
        } else {
          publishMQTT("labcheck/esp32/door", "1");
        }
        prepareMode(ProgramMode::AWAITING_MOTION);
      }
      break;

    case ProgramMode::AWAITING_MOTION: // Awaiting motion
      if(pirSensor.motionDetected()){
        Serial.println(F("Motion detected! Awaiting ToF detection..."));
        prepareMode(ProgramMode::AWAITING_DETECTION);
      }
      break;

    case ProgramMode::AWAITING_DETECTION: // Awaiting tof detection
      if (!pirSensor.motionDetected()){
        Serial.print(F("."));
        prepareMode(ProgramMode::AWAITING_MOTION);
        break;
      }

      if(distance1 < calibratedDistance1 - tofDetectionTolerance){
        Serial.print(F("Possible entrance detected..."));
        prepareMode(ProgramMode::ENTRANCE_CONFIRMATION);
        break;
      }

      if(distance2 < calibratedDistance2 - tofDetectionTolerance){
        Serial.print(F("Possible exit detected..."));
        prepareMode(ProgramMode::EXIT_CONFIRMATION);
        break;
      }
      break;

    // Person entering detection mode
    case ProgramMode::ENTRANCE_CONFIRMATION:
      sensorTimer += delayTime;
      if(distance2 < calibratedDistance2 - tofDetectionTolerance){
        Serial.print(F("Person entered! Took "));
        Serial.print(sensorTimer);	
        Serial.println(F(" ms to pass!"));
        speaker.playSuccess();
        publishMQTT("labcheck/esp32/entrance", invertEntranceExit ? "0" : "1");
        prepareMode(ProgramMode::DETECTION_COMPLETION);
        break;
      }
      if (sensorTimer >= 3000){
        Serial.println(F("Timeout!"));
        prepareMode(ProgramMode::DETECTION_COMPLETION);
        break;
      }
      break;

    // Person exiting detection mode
    case ProgramMode::EXIT_CONFIRMATION:
      sensorTimer += delayTime;
      if(distance1 < calibratedDistance1 - tofDetectionTolerance){
          Serial.print(F("Person exited! Took "));
          Serial.print(sensorTimer);	
          Serial.println(F(" ms to pass!"));
          speaker.playSuccess();
          publishMQTT("labcheck/esp32/entrance", invertEntranceExit ? "1" : "0");
          prepareMode(ProgramMode::DETECTION_COMPLETION);
          break;
        }
      if (sensorTimer >= 3000){
        Serial.println(F("Timeout!"));
        prepareMode(ProgramMode::DETECTION_COMPLETION);
        break;
      }
      break;

    // Awaiting default sensor data mode
    case ProgramMode::DETECTION_COMPLETION:
      Serial.print(distance1);
      Serial.print(F(", "));
      Serial.println(distance2);
      
      if (distance1>(calibratedDistance1-tofDetectionTolerance) && distance2>(calibratedDistance2-tofDetectionTolerance)){
        Serial.println(F("ToF area clear! Returning to awaiting motion..."));
        prepareMode(ProgramMode::AWAITING_MOTION);
      }
      break;
 
    default:
      Serial.println(F("Idle mode."));
      break;
    }

  updateLed();
  millis += delayTime;
  delay(delayTime);
}

/* void MainProgram::storeSensorData(int timestamp, int sensorValue){
  if(sensorStorageIndex < 128){
    sensorStorage[sensorStorageIndex][0] = timestamp;
    sensorStorage[sensorStorageIndex][1] = sensorValue;
    sensorStorageIndex++;
  } else {
    Serial.println(F("Sensor storage full!"));
  }
} */

bool MainProgram::isWiFiAvailable(){
  return wifi.getIPAddress().length() > 0;
}

void MainProgram::prepareMode(int mode){
  switch(mode){
    case 0: // idle, waiting for door sensor
      delayTime = 5000;
      programmode = 0;
      break;
    case 5: // awaiting motion
      activeLed = 0;
      delayTime = 200;
      programmode = 5;
      break;
    case 1: // awaiting detection
      activeLed = 1;
      delayTime = 50;
      programmode = 1;
      break;
    case 2: // entrance detected, awaiting confirmation
      delayTime = 20;
      sensorTimer = 0;
      programmode = 2;
      break;
    case 3: // exit detected, awaiting confirmation
      delayTime = 20;
      sensorTimer = 0;
      programmode = 3;
      break;
    case 4: // detection completion
      delayTime = 20;
      programmode = 4;
      break;
    default:
      Serial.println(F("Unknown mode!"));
      break;
  }
}

void MainProgram::updateLed(){
  if (activeLed != 0){
    leds.setGreen(activeLed == 1 ? true : false);
  } else {
    leds.setGreen(false);
  }
}

void MainProgram::publishMQTT(const char* topic, const char* payload) {
  if (mqtt.isConnected()) {
    mqtt.publish(topic, payload);
  } else {
    Serial.print(F("MQTT not connected, failed to publish to: "));
    Serial.println(topic);
  }
}

void MainProgram::setInvertEntranceExit(bool invert) {
  invertEntranceExit = invert;
  prefs.begin("lcmain", false);
  prefs.putBool("invertEntranceExit", invert);
  prefs.end();
  Serial.print(F("Entrance/Exit inversion set to: "));
  Serial.println(invert ? "true" : "false");
}

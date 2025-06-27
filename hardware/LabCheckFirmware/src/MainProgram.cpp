#include "MainProgram.h"
#include "MQTTConfig.h"

extern MQTTConfig mqtt;

MainProgram::MainProgram() : tofSensor1{TOF1_XSHUT, TOF1_SDA, TOF1_SCL}, tofSensor2{TOF2_XSHUT, TOF2_SDA, TOF2_SCL} {
  programmode = 0;
  peopleCounter = 0;
  sensorStorageIndex = 0;
  millis = 0;
  delayTime = 200;
  sensor1Active = false;
  sensor2Active = false;
  sensorTimer = 0;
  activeLed = 0;
}

enum ProgramMode {
  IDLE = 0,
  AWAITING_MOTION = 5,
  AWAITING_DETECTION = 1,
  ENTRANCE_CONFIRMATION = 2,
  EXIT_CONFIRMATION = 3,
  DETECTION_COMPLETION = 4,
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
  

  programmode = ProgramMode::IDLE;
  
}

void MainProgram::update(){
  // Sequential ToF sensor reading to avoid I2C address conflicts
  // Read sensor 1
  uint16_t distance1 = tofSensor1.readDistance();
  // Read sensor 2
  uint16_t distance2 = tofSensor2.readDistance();

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
      publishMQTT("labcheck/esp32/door", "0");
      prepareMode(ProgramMode::IDLE);
    }
  }

  switch(programmode){
    
    case 0: // idle if door sensor active
      if(!magneticSensor.isActive()){
        Serial.println(F("Door opened!"));
        publishMQTT("labcheck/esp32/door", "1");
        prepareMode(ProgramMode::AWAITING_MOTION);
      }
      break;
    
    case 5: // Awaiting motion
      if(pirSensor.motionDetected()){
        Serial.println(F("Motion detected! Awaiting ToF detection..."));
        prepareMode(ProgramMode::AWAITING_DETECTION);
        break;
      }
    
    case 1:// Awaiting tof detection
      /* if(magneticSensor.isActive()){
        Serial.println(F("Door closed! Idleing..."));
        mqtt.publish("labcheck/esp32/door", "0");
        prepareMode(ProgramMode::IDLE);
        break;
      } */
      if (!pirSensor.motionDetected()){
        Serial.print(F("."));
        prepareMode(ProgramMode::AWAITING_MOTION);
        break;
      }

      if(distance1 < 500){
        Serial.print(F("Possible entrance detected..."));
        prepareMode(2);
        break;
      }

      if(distance2 < 500){
        Serial.print(F("Possible exit detected..."));
        prepareMode(3);
        break;
      }
      break;

    // Person entering detection mode
    case 2:
      sensorTimer += delayTime;
      if(distance2 < 500){
        Serial.print(F("Person entered! Took "));
        Serial.print(sensorTimer);	
        Serial.println(F(" ms to pass!"));
        speaker.playSuccess();
        peopleCounter++;
        publishMQTT("labcheck/esp32/entrance", invertEntranceExit ? "0" : "1");
        prepareMode(4);
        break;
      }
      if (sensorTimer >= 3000){
        Serial.println(F("Timeout!"));
        prepareMode(4);
        break;
      }
      break;

    // Persion exiting detection mode 
    case 3:
      sensorTimer += delayTime;
      if(distance1 < 500){
          Serial.print(F("Person exited! Took "));
          Serial.print(sensorTimer);	
          Serial.println(F(" ms to pass!"));
          speaker.playSuccess();
          peopleCounter--;
          publishMQTT("labcheck/esp32/entrance", invertEntranceExit ? "1" : "0");
          prepareMode(4);
          break;
        }
      if (sensorTimer >= 3000){
        Serial.println(F("Timeout!"));
        prepareMode(4);
        break;
      }
      break;

    // Awaiting default sensor data mode
    case 4:      
      if (distance1>1000 && distance2>1000){
        Serial.println(F("ToF area clear! Returning to awaiting motion..."));
        prepareMode(ProgramMode::AWAITING_MOTION);
        break;
      }
      //Serial.print(F("."));
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

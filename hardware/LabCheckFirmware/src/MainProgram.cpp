#include "MainProgram.h"
#include "MQTTConfig.h"

extern MQTTConfig mqtt;

MainProgram::MainProgram(){
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

void MainProgram::begin(){
  Serial.println(F("Initializing Main Program..."));
  Serial.println(F("Testing WiFi connection..."));
  updateLed();
  wifi.begin();
  if (wifi.connect()) {
    Serial.println(F("WiFi available! Proceeding..."));
    programmode = 1;
  } else {
    Serial.println(F("Failed to connect to WiFi. Proceeding with caution..."));
    programmode = 1;
  }
  //wifi.disconnect();
  if (isWiFiAvailable()){
    if (mqtt.connect("LabCheckESP32")){
      Serial.println(F("Connected to MQTT Broker!"));
    }
    else {
      Serial.println(F("Failed to connect to MQTT Broker!"));
    }
  }
}

void MainProgram::update(){
  switch(programmode){
    // idle if door sensor active
    case 0:
      if(!magneticSensor.isActive()){
        Serial.println(F("Door opened!"));
        mqtt.publish("labcheck/esp32/door", "1");
        prepareMode(1);
      }   
    // Main behavior loop if door sensor inactive
    case 1:
      if(magneticSensor.isActive()){
        Serial.println(F("Door closed! Idleing..."));
        mqtt.publish("labcheck/esp32/door", "0");
        prepareMode(0);
        break;
      }

      if (peopleCounter == 10){
        activeLed = 3;
      } else if (peopleCounter >= 5){
        activeLed = 2;
      } else {
        activeLed = 1;
      }

      if(buttons.isButton1Pressed()){
        Serial.print(F("Possible entrance detected..."));
        if (peopleCounter >= 10){
          Serial.println(F("But the room is full!"));
          prepareMode(4);
        } else {
          prepareMode(2);
        }
      }

      if(buttons.isButton2Pressed()){
        Serial.print(F("Possible exit detected..."));
        if (peopleCounter <= 0){
          Serial.println(F("But this can't be possible, the room should be empty!"));
          prepareMode(4);
        } else {
          prepareMode(3);
        }
      }
      break;

    // Person entering detection mode
    case 2:
      sensorTimer += delayTime;
      if(buttons.isButton2Pressed()){
        Serial.print(F("Person entered! Took "));
        Serial.print(sensorTimer);	
        Serial.println(F(" ms to pass!"));
        speaker.playSuccess();
        peopleCounter++;
        mqtt.publish("labcheck/esp32/entrance", "1");
        storeSensorData(1, 123);
        prepareMode(4);
      }
      if (sensorTimer >= 3000){
        Serial.println(F("Timeout!"));
        prepareMode(4);
      }
      break;

    // Persion exiting detection mode 
    case 3:
      sensorTimer += delayTime;
      if(buttons.isButton1Pressed()){
          Serial.print(F("Person exited! Took "));
          Serial.print(sensorTimer);	
          Serial.println(F(" ms to pass!"));
          speaker.playSuccess();
          peopleCounter--;
          mqtt.publish("labcheck/esp32/entrance", "0");
          storeSensorData(0, 123);
          prepareMode(4);
        }
      if (sensorTimer >= 3000){
        Serial.println(F("Timeout!"));
        prepareMode(4);
      }
      break;

    // Awaiting default sensor data mode
    case 4:
      if (!buttons.isButton1Pressed() && !buttons.isButton2Pressed()){
        prepareMode(1);
      }
      Serial.print(F("."));
      break;


    default:
      Serial.println(F("Idle mode."));
      break;
    }

  updateLed();
  millis += delayTime;
  delay(delayTime);
}

void MainProgram::storeSensorData(int timestamp, int sensorValue){
  if(sensorStorageIndex < 128){
    sensorStorage[sensorStorageIndex][0] = timestamp;
    sensorStorage[sensorStorageIndex][1] = sensorValue;
    sensorStorageIndex++;
  } else {
    Serial.println(F("Sensor storage full!"));
  }
}

bool MainProgram::isWiFiAvailable(){
  return wifi.getIPAddress().length() > 0;
}

void MainProgram::prepareMode(int mode){
  switch(mode){
    case 0: // idle
      delayTime = 5000;
      activeLed = 3;
      programmode = 0;
      break;
    case 1: // awaiting detection
      delayTime = 200;
      programmode = 1;
      break;
    case 2: // entrance detection
      delayTime = 20;
      sensorTimer = 0;
      programmode = 2;
      break;
    case 3: // exit detection
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
    leds.setYellow(activeLed == 2 ? true : false);
    leds.setRed(activeLed == 3 ? true : false);
  }
}
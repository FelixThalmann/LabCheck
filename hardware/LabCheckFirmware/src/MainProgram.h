#ifndef MAINPROGRAM_H
#define MAINPROGRAM_H

#include <Arduino.h>
#include "PinConfig.h"
#include "LED.h"
//#include "Button.h"
#include "MagneticSensor.h"
#include "Speaker.h"
#include "WiFiConfig.h"
#include "ToFSensor.h"
#include "PIRSensor.h"
#include "Preferences.h"

class MainProgram{
public:
  MainProgram();
  // Initialize the main program
  void begin();
  
  // Update loop for the main program
  void update();

  // Set the entrance/exit inversion state
  void setInvertEntranceExit(bool invert);
  
  // Stop the main program
  void stop();

private:
  LED leds;
  MagneticSensor magneticSensor;
  Speaker speaker;
  WiFiConfig wifi;
  ToFSensor tofSensor1;
  ToFSensor tofSensor2;
  PIRSensor pirSensor;
  Preferences prefs;

  int programmode;
  int sensorStorage[128][2];
  int sensorStorageIndex;
  int peopleCounter;
  int millis;
  int delayTime;
  int activeLed;
  bool invertEntranceExit; // true if entrance/exit is inverted
  int calibratedDistance1;
  int calibratedDistance2;
  int tofDetectionTolerance; // tolerance for ToF sensor detection in mm

  // testing. replace with real tof sensors
  bool sensor1Active;
  bool sensor2Active;
  int sensorTimer;

  bool isWiFiAvailable();
  //void storeSensorData(int sensorValue, int duration);
  void prepareMode(int mode);
  void updateLed();
  void publishMQTT(const char* topic, const char* payload);
};

#endif // MAINPROGRAM_H

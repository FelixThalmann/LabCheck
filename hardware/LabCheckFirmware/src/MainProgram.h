/**
 * @file MainProgram.h
 * @brief Main program controller for LabCheck entrance/exit detection system
 * 
 * This class manages the complete entrance/exit detection workflow using
 * PIR sensors, Time-of-Flight sensors, and magnetic door sensors.
 */

#ifndef MAINPROGRAM_H
#define MAINPROGRAM_H

#include <Arduino.h>
#include "PinConfig.h"
#include "LED.h"
#include "MagneticSensor.h"
#include "Speaker.h"
#include "WiFiConfig.h"
#include "ToFSensor.h"
#include "PIRSensor.h"
#include "Preferences.h"

/**
 * @class MainProgram
 * @brief Main program controller for entrance/exit detection
 * 
 * Manages the complete detection workflow:
 * - Door state monitoring via magnetic sensor
 * - Motion detection via PIR sensor
 * - Distance measurement via dual ToF sensors
 * - Audio feedback via speaker
 * - MQTT communication for status updates
 */
class MainProgram {
public:
  MainProgram();
  
  /**
   * @brief Initialize all hardware components and prepare for operation
   */
  void begin();
  
  /**
   * @brief Main update loop - processes sensor data and state machine
   */
  void update();

  /**
   * @brief Configure entrance/exit direction inversion
   * @param invert True to invert entrance/exit detection logic
   */
  void setInvertEntranceExit(bool invert);
  
  /**
   * @brief Stop the main program (placeholder for future use)
   */
  void stop();

private:
  // Hardware components
  LED leds;
  MagneticSensor magneticSensor;
  Speaker speaker;
  WiFiConfig wifi;
  ToFSensor tofSensor1;
  ToFSensor tofSensor2;
  PIRSensor pirSensor;
  Preferences prefs;

  // State machine variables
  int programmode;                    ///< Current program mode (see ProgramMode enum)
  int sensorStorageIndex;             ///< Index for sensor data storage (unused)
  int millis;                         ///< Internal millisecond counter
  int delayTime;                      ///< Current delay time between updates
  int activeLed;                      ///< Currently active LED indicator
  int sensorTimer;                    ///< Timer for sensor confirmation phases
  
  // Configuration variables
  bool invertEntranceExit;            ///< Inverts entrance/exit detection logic
  int calibratedDistance1;            ///< Calibrated baseline distance for sensor 1
  int calibratedDistance2;            ///< Calibrated baseline distance for sensor 2
  int calibratedMax;                  ///< Maximum calibration distance (sensor limit)
  int tofDetectionTolerance;          ///< Detection tolerance in millimeters
  int tofTolerancePercentage;         ///< Tolerance percentage for detection
  bool firstTimeSending;              ///< Prevents door status on first boot
  
  // Sensor state tracking
  bool sensor1Active;                 ///< Sensor 1 detection state
  bool sensor2Active;                 ///< Sensor 2 detection state
  int sensorStorage[128][2];          ///< Sensor data storage array (unused)

  // Private methods
  bool isWiFiAvailable();
  void prepareMode(int mode);
  void updateLed();
  void publishMQTT(const char* topic, const char* payload);
};

#endif // MAINPROGRAM_H

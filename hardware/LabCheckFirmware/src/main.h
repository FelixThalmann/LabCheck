/**
 * @file main.h
 * @brief Main application header with global components and test functions
 * 
 * Provides test interface for individual hardware components and the main program.
 * Allows for component testing and debugging before running the full system.
 */

#ifndef MAIN_H
#define MAIN_H

#include <Arduino.h>
#include "PinConfig.h"
#include "LED.h"
#include "MagneticSensor.h"
#include "Speaker.h"
#include "WiFiConfig.h"
#include "MQTTConfig.h"
#include "MainProgram.h"
#include "PIRSensor.h"
#include "ToFSensor.h"

// Global component instances
LED leds;
MagneticSensor magneticSensor;
PIRSensor pirSensor;
Speaker speaker;
WiFiConfig wifi;
MQTTConfig mqtt;
MainProgram mainProgram;
ToFSensor tof1(TOF1_XSHUT, TOF1_SDA, TOF1_SCL);
ToFSensor tof2(TOF2_XSHUT, TOF2_SDA, TOF2_SCL);

// Component activity tracking
bool isMagneticActive = false;      ///< Magnetic sensor test active
bool isPIRActive = false;           ///< PIR sensor test active
bool isSongPlaying = false;         ///< Speaker song playback active
bool isButtonTestActive = false;    ///< Button test active (unused)
bool isMainProgramActive = false;   ///< Main program running
bool isToFSensorsActive = false;    ///< ToF sensors test active (unused)

// MQTT Configuration
extern const char* MQTT_CLIENT_ID;
extern const char* MQTT_TOPIC;

// Function declarations
void setupComponents();
void showMenu();
void updateActiveComponents();
void stopActiveComponents();
void mqttCallback(char* topic, uint8_t* payload, unsigned int length);
String readStringUntilMulti(const char* terminators);
void testMQTT();
void testToFSensors();

#endif // MAIN_H

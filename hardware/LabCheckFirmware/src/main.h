#ifndef MAIN_H
#define MAIN_H

#include <Arduino.h>
#include "PinConfig.h"
#include "LED.h"
//#include "Button.h"
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

// Active component tracking
bool isMagneticActive = false; // If magnetic sensor tracking is active
bool isPIRActive = false;  // If PIR sensor tracking is active
bool isSongPlaying = false;
bool isButtonTestActive = false;
bool isMainProgramActive = false;
bool isToFSensorsActive = false; // If ToF sensors are active

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

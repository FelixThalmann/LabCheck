#ifndef MAIN_H
#define MAIN_H

#include <Arduino.h>
#include "PinConfig.h"
#include "LED.h"
#include "Button.h"
#include "MagneticSensor.h"
#include "Speaker.h"
#include "WiFiConfig.h"
#include "MQTTConfig.h"
#include "MainProgram.h"
#include "PIRSensor.h"

// Global component instances
LED leds;
Button buttons;
MagneticSensor magneticSensor;
PIRSensor pirSensor;
Speaker speaker;
WiFiConfig wifi;
MQTTConfig mqtt;
MainProgram mainProgram;

// Active component tracking
bool isMagneticActive = false; // If magnetic sensor tracking is active
bool isPIRActive = false;  // If PIR sensor tracking is active
bool isSongPlaying = false;
bool isButtonTestActive = false;
bool isMainProgramActive = false;

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

#endif // MAIN_H

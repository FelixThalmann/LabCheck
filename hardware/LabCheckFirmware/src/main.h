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
extern LED leds;
extern Button buttons;
extern MagneticSensor magneticSensor;
extern PIRSensor pirSensor;
extern Speaker speaker;
extern WiFiConfig wifi;
extern MQTTConfig mqtt;
extern MainProgram mainProgram;

// Active component tracking
extern bool isMagneticActive;
extern bool isPIRActive;
extern bool isSongPlaying;
extern bool isButtonTestActive;
extern bool isMainProgramActive;

// MQTT Configuration
extern const char* MQTT_BROKER;
extern const int MQTT_PORT;
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

#include <Arduino.h>
#include "PinConfig.h"
#include "LED.h"
#include "Button.h"
#include "MagneticSensor.h"
#include "Speaker.h"
#include "WiFiConfig.h"
#include "MQTTConfig.h"
#include "MainProgram.h"

// Create instances of our components
LED leds;
Button buttons;
MagneticSensor magneticSensor;
Speaker speaker;
WiFiConfig wifi;
MQTTConfig mqtt;
MainProgram mainProgram;

// Active component tracking
bool isSensorActive = false;
bool isSongPlaying = false;
bool isButtonTestActive = false;
bool isMainProgramActive = false;

// MQTT Configuration
const char* MQTT_BROKER = "broker.hivemq.com";  // Public test broker
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "LabCheckESP32";
const char* MQTT_TOPIC = "labcheck/status";

void setupComponents();
void showMenu();
void updateActiveComponents();
void stopActiveComponents();
void mqttCallback(char* topic, uint8_t* payload, unsigned int length);
void testMQTT();

void setup() {
    Serial.begin(115200);
    while(!Serial);
    
    setupComponents();
    showMenu();
}

void loop() {
    // Check for serial input
    if (Serial.available()) {
        char option = Serial.read();
        String ssid, password;  // Declare variables outside switch
        
        if (option == 'c') {
            stopActiveComponents();
            showMenu();
            return;
        }
        
        // Process menu options
        switch(option) {
            case '1':
                Serial.println(F("Testing 'Magnetic door sensor set'."));
                isSensorActive = true;
                break;
                
            case '2':
                Serial.println(F("Spiele nun Tales Song..."));
                speaker.playTalesSong();
                isSongPlaying = true;
                break;
                
            case '3':
                Serial.println(F("WiFi Verbindung"));
                if (wifi.connect()){
                    speaker.playSuccess();
                } else {
                    speaker.playFailure();
                }
                showMenu();
                break;
                
            case '4':
                Serial.println(F("WiFi Setup"));
                Serial.setTimeout(10000);
                Serial.print(F("Input SSID: "));
                while(!Serial.available());
                ssid = Serial.readStringUntil('\n');
                Serial.print(F("Input password: "));
                while(!Serial.available());
                password = Serial.readStringUntil('\n');
                wifi.setCredentials(ssid, password);
                Serial.println(F("Setup completed."));
                Serial.setTimeout(1000);
                showMenu();
                break;
                
            case '5':
                Serial.println(F("LED Test"));
                leds.testSequence();
                showMenu();
                break;
                
            case '6':
                Serial.println(F("Button Test"));
                isButtonTestActive = true;
                break;
                
            case '7':
                Serial.println(F("MQTT Test"));
                testMQTT();
                showMenu();
                break;

            case '8':
                Serial.println(F("Start Main Program"));
                isMainProgramActive = true;
                mainProgram.begin();
                break;
                
            default:
                Serial.println(F("Ungueltiger Input!"));
                showMenu();
                break;
        }
    }
    
    updateActiveComponents();
    mqtt.update();  // Handle MQTT communication
}

void setupComponents() {
    leds.begin();
    buttons.begin();
    magneticSensor.begin();
    speaker.begin();
    wifi.begin();
    mqtt.begin(MQTT_BROKER, MQTT_PORT);
    
    // Setup magnetic sensor callbacks
    magneticSensor.onMagnetDetected([]() {
        speaker.playAlert();
        mqtt.publish(MQTT_TOPIC, "Door opened");
    });
    
    magneticSensor.onMagnetRemoved([]() {
        speaker.stop();
        mqtt.publish(MQTT_TOPIC, "Door closed");
    });
    
    // Setup button callbacks
    buttons.onButton1Pressed([]() {
        leds.setGreen(true);
    });
    
    buttons.onButton1Released([]() {
        leds.setGreen(false);
    });
    
    buttons.onButton2Pressed([]() {
        leds.setYellow(true);
    });
    
    buttons.onButton2Released([]() {
        leds.setYellow(false);
    });
}

void showMenu() {
    Serial.println(F("\nWhich component should be tested?"));
    Serial.println(F("(1) Magnetic Door Sensor Set"));
    Serial.println(F("(2) Secret Song"));
    Serial.println(F("(3) WiFi Test: Connect and print IP address"));
    Serial.println(F("(4) WiFi Setup: Set SSID and Password"));
    Serial.println(F("(5) Test LEDs"));
    Serial.println(F("(6) Test Buttons"));
    Serial.println(F("(7) Test MQTT Connection"));
    Serial.println(F("(8) Start Main Program"));
    Serial.println(F("(menu) send something else or press the board reset button\n"));
    Serial.print(F("Input option: "));
}

void updateActiveComponents() {
    if (isSensorActive) {
        magneticSensor.update();
    }
    if (isSongPlaying) {
        speaker.update();
    }
    if (isButtonTestActive) {
        buttons.update();
    }
    if (isMainProgramActive) {
        mainProgram.update();
    }
}

void stopActiveComponents() {
    isSensorActive = false;
    isSongPlaying = false;
    isButtonTestActive = false;
    isMainProgramActive = false;
    speaker.stop();
}

void mqttCallback(char* topic, uint8_t* payload, unsigned int length) {
    char message[length + 1];
    memcpy(message, payload, length);
    message[length] = '\0';
    
    Serial.print(F("Message received: "));
    Serial.println(message);
}

void testMQTT() {
    if (!wifi.getIPAddress().length()) {
        Serial.println(F("Please connect to WiFi first"));
        return;
    }
    
    if (mqtt.connect(MQTT_CLIENT_ID)) {
        Serial.println(F("Connected to MQTT Broker"));
        
        // Subscribe to test topic
        mqtt.subscribe(MQTT_TOPIC, mqttCallback);
        
        // Publish test message
        mqtt.publish(MQTT_TOPIC, "Hello from LabCheck!");
    } else {
        Serial.println(F("MQTT connection failed"));
    }
}

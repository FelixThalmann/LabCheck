/**
 * @file main.cpp
 * @brief Main application entry point with test interface
 * 
 * Provides a 15-second window for entering test mode, otherwise starts the main program.
 * Test mode allows individual component testing and configuration.
 */

#include "main.h"

// MQTT Configuration
const char* MQTT_CLIENT_ID = "LabCheckESP32";
const char* MQTT_TOPIC = "labcheck/status";

/**
 * @brief Setup function - waits for test mode input or starts main program
 */
void setup() {
    Serial.begin(115200);
    while(!Serial);
    
    Serial.println(F("\nPress any key within 15 seconds to enter test mode..."));
    unsigned long startTime = millis();

    // Check for input for 15 seconds
    while (millis() - startTime < 15000) {
        if (Serial.available()) {
            while(Serial.available()) Serial.read();  // Clear input buffer
            setupComponents();
            showMenu();  // Enter test mode immediately
            return;
        }
    }
    
    // No input received - start main program
    Serial.println(F("\nStarting Main Program..."));
    isMainProgramActive = true;
    mainProgram.begin();
}

/**
 * @brief Main loop - handles menu input and component updates
 */
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
                Serial.println(F("Testing Magnetic door sensor..."));
                isMagneticActive = true;
                break;
                
            case '3':
                Serial.println(F("Testing WiFi connection..."));
                if (wifi.connect()) {
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
                ssid = readStringUntilMulti("\r\n\t");
                while (Serial.available()) {Serial.read();};
                Serial.println(ssid.c_str());
                Serial.print(F("Input password: "));
                while(!Serial.available());
                password = readStringUntilMulti("\r\n\t");
                while (Serial.available()) {Serial.read();};
                wifi.setCredentials(ssid, password);
                Serial.println(F("WiFi setup completed."));
                Serial.setTimeout(1000);
                showMenu();
                break;
                
            case '5':
                Serial.println(F("Testing LEDs..."));
                leds.testSequence();
                showMenu();
                break;
                
            case '7':
                Serial.println(F("Testing MQTT..."));
                testMQTT();
                showMenu();
                break;

            case '8':
                Serial.println(F("Testing PIR sensor..."));
                isPIRActive = true;
                break;

            case '9':
                Serial.println(F("Starting Main Program..."));
                isMainProgramActive = true;
                mainProgram.begin();
                break;

            case 'm':
                Serial.println(F("MQTT Setup"));
                Serial.setTimeout(10000);
                Serial.print(F("Input Broker IP: "));
                while(!Serial.available());
                {
                    String broker = readStringUntilMulti("\r\n\t");
                    while (Serial.available()) {Serial.read();};
                    Serial.println(broker.c_str());
                    Serial.print(F("Input Port (Enter for 1883): "));
                    String portStr = readStringUntilMulti("\r\n\t");
                    while (Serial.available()) {Serial.read();};
                    uint16_t port = 1883;
                    if (portStr.length() > 0) {
                        port = portStr.toInt();
                        Serial.println(portStr.c_str());
                    } else {
                        Serial.println(F("1883 (default)"));
                    }
                    mqtt.setServer(broker.c_str(), port);
                }
                Serial.println(F("MQTT Setup completed."));
                Serial.setTimeout(1000);
                showMenu();
                break;

            case 't':
                Serial.println(F("Testing ToF Sensors..."));
                testToFSensors();
                showMenu();
                break;

            case 's':
                Serial.println(F("By default, going from blue to green led is considered as entrance, going from green to blue is considered as exit."));
                Serial.println(F("Invert Entrance/Exit? (y/n)"));
                while (!Serial.available());
                {
                    char invertChoice = Serial.read();
                    while (Serial.available()) {Serial.read();};
                    if (invertChoice == 'y') {
                        mainProgram.setInvertEntranceExit(true);
                        Serial.println(F("Entrance/Exit inverted."));
                    } else {
                        mainProgram.setInvertEntranceExit(false);
                        Serial.println(F("Entrance/Exit not inverted."));
                    }
                }
                showMenu();
                break;
                
            default:
                Serial.println(F("Invalid input!"));
                showMenu();
                break;
        }
    }
    
    updateActiveComponents();
    mqtt.update();  // Handle MQTT communication
}

/**
 * @brief Initialize all hardware components and set up callbacks
 */
void setupComponents() {
    leds.begin();
    magneticSensor.begin();
    pirSensor.begin();
    speaker.begin();
    wifi.begin();
    mqtt.begin();
}

/**
 * @brief Display the test menu options
 */
void showMenu() {
    Serial.println(F("\nWhich component should be tested?"));
    Serial.println(F("(1) Magnetic Door Sensor Set"));
    Serial.println(F("(3) WiFi Test: Connect and print IP address"));
    Serial.println(F("(4) WiFi Setup: Set SSID and Password"));
    Serial.println(F("(m) MQTT Setup: Set Broker and Port"));
    Serial.println(F("(5) Test LEDs"));
    Serial.println(F("(7) Test MQTT Connection"));
    Serial.println(F("(8) Test PIR Sensor"));
    Serial.println(F("(t) Test ToF Sensors"));
    Serial.println(F("(s) Set Entrance/Exit Inversion"));
    Serial.println(F("(9) Start Main Program"));
    Serial.println(F("(menu) send something else or press the board reset button\n"));
    Serial.print(F("Input option: "));
}

/**
 * @brief Update all active components based on their flags
 */
void updateActiveComponents() {
    if (isMagneticActive) {
        magneticSensor.update();
    }
    if (isPIRActive) {
        pirSensor.update();
    }
    if (isSongPlaying) {
        speaker.update();
    }
    if (isMainProgramActive) {
        mainProgram.update();
    }
}

/**
 * @brief Stop all active test components
 */
void stopActiveComponents() {
    isMagneticActive = false;
    isPIRActive = false;
    isSongPlaying = false;
    isButtonTestActive = false;
    isMainProgramActive = false;
    speaker.stop();
}

/**
 * @brief MQTT message callback function
 * @param topic Topic the message was received on
 * @param payload Message payload
 * @param length Length of the payload
 */
void mqttCallback(char* topic, uint8_t* payload, unsigned int length) {
    char message[length + 1];
    memcpy(message, payload, length);
    message[length] = '\0';
    
    Serial.print(F("Message received: "));
    Serial.println(message);
}

/**
 * @brief Read string from Serial until one of the specified terminators
 * @param terminators String containing terminator characters
 * @return The read string without the terminator
 */
String readStringUntilMulti(const char* terminators) {
  String result = "";
  while (true) {
    while (!Serial.available()) delay(1);
    char c = Serial.read();
    // Check if character is one of the terminators
    for (const char* t = terminators; *t; ++t) {
      if (c == *t) return result;
    }
    result += c;
  }
}

/**
 * @brief Test MQTT connection and messaging
 */
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

/**
 * @brief Test both ToF sensors by reading their distances
 */
void testToFSensors() {
    Serial.println(F("Testing ToF Sensors..."));
    
    if (!tof1.begin()) {
        Serial.println(F("ToF Sensor 1 initialization failed!"));
    } else {
        Serial.print(F("ToF Sensor 1 distance: "));
        Serial.println(tof1.readDistance());
    }
    
    if (!tof2.begin()) {
        Serial.println(F("ToF Sensor 2 initialization failed!"));
    } else {
        Serial.print(F("ToF Sensor 2 distance: "));
        Serial.println(tof2.readDistance());
    }
}

#include "main.h"

// MQTT Configuration
const char* MQTT_BROKER = "192.168.137.1";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "LabCheckESP32";
const char* MQTT_TOPIC = "labcheck/status";

void setup() {
    Serial.begin(115200);
    while(!Serial);
    
    setupComponents();
    
    Serial.println(F("\nPress any key within 10 seconds to enter test mode..."));
    unsigned long startTime = millis();
    
    // Check for input for 10 seconds
    while (millis() - startTime < 10000) {
        if (Serial.available()) {
            while(Serial.available()) Serial.read();  // Clear input buffer
            showMenu();  // Enter test mode immediately
            return;
        }
    }
    
    // No input received within 10 seconds
    Serial.println(F("\nStarting Main Program..."));
    isMainProgramActive = true;
    mainProgram.begin();
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
                isMagneticActive = true;
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
                ssid = readStringUntilMulti("\r\n\t");
                while (Serial.available()) {Serial.read();};
                Serial.println(F(ssid.c_str()));
                Serial.print(F("Input password: "));
                while(!Serial.available());
                password = readStringUntilMulti("\r\n\t");
                while (Serial.available()) {Serial.read();};
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
                Serial.println(F("PIR Sensor Test"));
                isPIRActive = true;
                break;

            case '9':
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
    pirSensor.begin();
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

    // Setup PIR sensor callbacks
    pirSensor.onMotionDetected([]() {
        speaker.playAlert();
        mqtt.publish(MQTT_TOPIC, "Motion detected");
    });

    pirSensor.onMotionStopped([]() {
        speaker.stop();
        mqtt.publish(MQTT_TOPIC, "Motion stopped");
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
    Serial.println(F("(8) Test PIR Sensor"));
    Serial.println(F("(9) Start Main Program"));
    Serial.println(F("(menu) send something else or press the board reset button\n"));
    Serial.print(F("Input option: "));
}

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
    if (isButtonTestActive) {
        buttons.update();
    }
    if (isMainProgramActive) {
        mainProgram.update();
    }
}

void stopActiveComponents() {
    isMagneticActive = false;
    isPIRActive = false;
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

String readStringUntilMulti(const char* terminators) {
  String result = "";
  while (true) {
    while (!Serial.available()) delay(1);
    char c = Serial.read();
    // Prüfe, ob das Zeichen einer der Terminatoren ist
    for (const char* t = terminators; *t; ++t) {
      if (c == *t) return result;
    }
    result += c;
  }
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

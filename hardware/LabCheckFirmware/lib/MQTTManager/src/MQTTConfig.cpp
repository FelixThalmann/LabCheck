#include "MQTTConfig.h"

bool MQTTConfig::ackReceived = false;

void MQTTConfig::ackCallback(char* topic, byte* payload, unsigned int length) {
    ackReceived = true;
}

MQTTConfig::MQTTConfig() : 
    mqttClient(wifiClient),
    mqtt_username(nullptr),
    mqtt_password(nullptr),
    credentialsSet(false) {
    pendingPublish.active = false;
}

void MQTTConfig::begin(const char* broker, uint16_t port) {
    mqttClient.setServer(broker, port);
}

void MQTTConfig::setCredentials(const char* username, const char* password) {
    mqtt_username = username;
    mqtt_password = password;
    credentialsSet = true;
}

bool MQTTConfig::connect(const char* clientId) {
    const int maxAttempts = 10;
    int attempts = 0;

    if (credentialsSet){
        Serial.println(F("Connecting to MQTT broker with credentials..."));
    } else {
        Serial.println(F("Connecting to MQTT broker without credentials..."));
    }

    while (attempts < maxAttempts) {
        if (credentialsSet) {
            if (mqttClient.connect(clientId, mqtt_username, mqtt_password)) {
                Serial.println(F("MQTT connected!"));
                return true;
            }
        } else {
            if (mqttClient.connect(clientId)) {
                Serial.println(F("MQTT connected!"));
                return true;
            }
        }
        attempts++;
        Serial.print(F("."));
        led.blinkLED(SIGNALLED, 2, 100); // Blink LED to indicate connection attempt
        delay(1000);
    }
    Serial.println(F("MQTT connection failed!"));
    return false;
}

bool MQTTConfig::publish(const char* topic, const char* message) {
    if (!isConnected()) {
        return false;
    }
    return mqttClient.publish(topic, message);
}

bool MQTTConfig::subscribe(const char* topic, void (*callback)(char*, uint8_t*, unsigned int)) {
    if (!isConnected()) {
        return false;
    }
    mqttClient.setCallback(callback);
    return mqttClient.subscribe(topic);
}

void MQTTConfig::update() {
    mqttClient.loop();
    handleSecurePublish();
}

bool MQTTConfig::isConnected() {
    return mqttClient.connected();
}

void MQTTConfig::disconnect() {
    mqttClient.disconnect();
}

bool MQTTConfig::queueSecurePublish(const char* topic, const char* message, const char* ackTopic, int maxRetries) {
    if (!isConnected() || pendingPublish.active) {
        return false;
    }

    // Set up new secure publish request
    pendingPublish.topic = topic;
    pendingPublish.message = message;
    pendingPublish.ackTopic = ackTopic;
    pendingPublish.attempts = 0;
    pendingPublish.maxRetries = maxRetries;
    pendingPublish.nextAttemptTime = millis();
    pendingPublish.active = true;
    ackReceived = false;

    // Set up acknowledgment handling
    mqttClient.setCallback(ackCallback);
    mqttClient.subscribe(ackTopic);

    return true;
}

void MQTTConfig::handleSecurePublish() {
    if (!pendingPublish.active || !isConnected()) {
        return;
    }

    unsigned long currentTime = millis();
    
    // Check if it's time for next attempt
    if (currentTime >= pendingPublish.nextAttemptTime) {
        if (mqttClient.publish(pendingPublish.topic, pendingPublish.message)) {
            pendingPublish.attempts++;
            
            // Schedule next attempt in 5 seconds if needed
            if (!ackReceived && pendingPublish.attempts < pendingPublish.maxRetries) {
                pendingPublish.nextAttemptTime = currentTime + 5000;
            } else {
                // Clean up if we're done (either success or max attempts reached)
                mqttClient.unsubscribe(pendingPublish.ackTopic);
                pendingPublish.active = false;
            }
        }
    }
}

void MQTTConfig::reconnect(const char* clientId) {
    while (!isConnected()) {
        Serial.print(F("Attempting MQTT connection..."));
        if (connect(clientId)) {
            Serial.println(F("connected"));
        } else {
            Serial.print(F("failed, rc="));
            Serial.print(mqttClient.state());
            Serial.println(F(" retrying in 5 seconds"));
            delay(5000);
        }
    }
}

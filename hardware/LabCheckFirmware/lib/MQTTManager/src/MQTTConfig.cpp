#include "MQTTConfig.h"

MQTTConfig::MQTTConfig() : 
    mqttClient(wifiClient),
    mqtt_username(nullptr),
    mqtt_password(nullptr),
    credentialsSet(false) {}

void MQTTConfig::begin(const char* broker, uint16_t port) {
    mqttClient.setServer(broker, port);
}

void MQTTConfig::setCredentials(const char* username, const char* password) {
    mqtt_username = username;
    mqtt_password = password;
    credentialsSet = true;
}

bool MQTTConfig::connect(const char* clientId) {
    if (credentialsSet) {
        return mqttClient.connect(clientId, mqtt_username, mqtt_password);
    }
    return mqttClient.connect(clientId);
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
}

bool MQTTConfig::isConnected() {
    return mqttClient.connected();
}

void MQTTConfig::disconnect() {
    mqttClient.disconnect();
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

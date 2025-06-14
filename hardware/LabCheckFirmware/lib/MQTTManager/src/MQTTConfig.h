#ifndef MQTT_CONFIG_H
#define MQTT_CONFIG_H

#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include <LED.h>

struct SecurePublishData {
    const char* topic;
    const char* message;
    const char* ackTopic;
    unsigned long nextAttemptTime;
    int attempts;
    int maxRetries;
    bool active;
};

class MQTTConfig {
public:
    MQTTConfig();
    
    // Initialize MQTT client
    void begin(const char* broker, uint16_t port = 1883);
    
    // Set MQTT credentials if needed
    void setCredentials(const char* username, const char* password);
    
    // Connect to MQTT broker
    bool connect(const char* clientId);
    
    // Publish message to topic
    bool publish(const char* topic, const char* message);
    
    // Queue a secure publish with retries and acknowledgment
    bool queueSecurePublish(const char* topic, const char* message, const char* ackTopic, int maxRetries = 3);
    
    // Subscribe to topic with callback
    bool subscribe(const char* topic, void (*callback)(char*, uint8_t*, unsigned int));
    
    // Handle MQTT communication
    void update();
    
    // Check if connected to broker
    bool isConnected();
    
    // Disconnect from broker
    void disconnect();
    
private:
    WiFiClient wifiClient;
    PubSubClient mqttClient;
    const char* mqtt_username;
    const char* mqtt_password;
    bool credentialsSet;

    LED led;  // LED for signaling connection status
    
    // Variables for secure publish
    static bool ackReceived;
    static void ackCallback(char* topic, byte* payload, unsigned int length);
    SecurePublishData pendingPublish;
    
    // Reconnect to broker if connection lost
    void reconnect(const char* clientId);
    
    // Handle secure publish attempts
    void handleSecurePublish();
};

#endif // MQTT_CONFIG_H

#ifndef MQTT_CONFIG_H
#define MQTT_CONFIG_H

#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include <LED.h>
#include <Preferences.h>

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
    void begin();
    
    // Set MQTT credentials if needed
    void setCredentials(const char* username, const char* password);

    // Set new broker and port
    void setServer(const char* broker, uint16_t port = 1883);
    
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

    void saveCredentials();
    void loadCredentials();
    void saveBroker();
    void loadBroker();
    
private:
    WiFiClient wifiClient;
    PubSubClient mqttClient;
    bool credentialsSet;
    static const String DEF_BROKER;
    static const String DEF_PORT;
    static const String DEF_USERNAME;
    static const String DEF_PASSWORD;

    LED led;  // LED for signaling connection status
    
    // Variables for secure publish
    static bool ackReceived;
    static void ackCallback(char* topic, byte* payload, unsigned int length);
    SecurePublishData pendingPublish;
    
    Preferences prefs;
    String broker;
    uint16_t port;
    String username;
    String password;

    // Reconnect to broker if connection lost
    void reconnect(const char* clientId);
    
    // Handle secure publish attempts
    void handleSecurePublish();
};

#endif // MQTT_CONFIG_H

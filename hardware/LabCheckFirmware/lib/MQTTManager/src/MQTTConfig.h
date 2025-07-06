/**
 * @file MQTTConfig.h
 * @brief MQTT client management with persistent configuration
 * 
 * Handles MQTT broker connections, message publishing/subscribing, and
 * credential management with persistent storage. Supports secure publishing
 * with retry mechanisms and acknowledgment tracking.
 */

#ifndef MQTT_CONFIG_H
#define MQTT_CONFIG_H

#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include <LED.h>
#include <Preferences.h>

/**
 * @struct SecurePublishData
 * @brief Structure for tracking secure publish attempts with retries
 */
struct SecurePublishData {
    const char* topic;              ///< MQTT topic to publish to
    const char* message;            ///< Message payload
    const char* ackTopic;           ///< Topic to wait for acknowledgment
    unsigned long nextAttemptTime;  ///< Time for next retry attempt
    int attempts;                   ///< Current attempt count
    int maxRetries;                 ///< Maximum retry attempts
    bool active;                    ///< Whether this publish is active
};

/**
 * @class MQTTConfig
 * @brief MQTT client wrapper with persistent configuration
 * 
 * Provides MQTT connectivity with automatic reconnection, credential storage,
 * and advanced publishing features including retry mechanisms.
 */
class MQTTConfig {
public:
    MQTTConfig();
    
    /**
     * @brief Initialize MQTT client system
     */
    void begin();
    
    /**
     * @brief Set MQTT authentication credentials
     * @param username MQTT username
     * @param password MQTT password
     */
    void setCredentials(const char* username, const char* password);

    /**
     * @brief Configure MQTT broker connection
     * @param broker Broker hostname or IP address
     * @param port Broker port (default: 1883)
     */
    void setServer(const char* broker, uint16_t port = 1883);
    
    /**
     * @brief Connect to MQTT broker
     * @param clientId Unique client identifier
     * @return True if connection successful, false otherwise
     */
    bool connect(const char* clientId);
    
    /**
     * @brief Publish message to MQTT topic
     * @param topic Target topic
     * @param message Message payload
     * @return True if publish successful, false otherwise
     */
    bool publish(const char* topic, const char* message);
    
    /**
     * @brief Queue secure publish with automatic retries
     * @param topic Target topic
     * @param message Message payload
     * @param ackTopic Topic to monitor for acknowledgment
     * @param maxRetries Maximum retry attempts (default: 3)
     * @return True if queued successfully, false otherwise
     */
    bool queueSecurePublish(const char* topic, const char* message, const char* ackTopic, int maxRetries = 3);
    
    /**
     * @brief Subscribe to MQTT topic with callback
     * @param topic Topic to subscribe to
     * @param callback Function to call when messages arrive
     * @return True if subscription successful, false otherwise
     */
    bool subscribe(const char* topic, void (*callback)(char*, uint8_t*, unsigned int));
    
    /**
     * @brief Handle MQTT communication and maintain connection
     * Must be called regularly in main loop
     */
    void update();
    
    /**
     * @brief Check MQTT broker connection status
     * @return True if connected, false otherwise
     */
    bool isConnected();
    
    /**
     * @brief Disconnect from MQTT broker
     */
    void disconnect();

    /**
     * @brief Save current credentials to persistent storage
     */
    void saveCredentials();
    
    /**
     * @brief Load credentials from persistent storage
     */
    void loadCredentials();
    
    /**
     * @brief Save broker configuration to persistent storage
     */
    void saveBroker();
    
    /**
     * @brief Load broker configuration from persistent storage
     */
    void loadBroker();
    
private:
    WiFiClient wifiClient;          ///< WiFi client for MQTT connection
    PubSubClient mqttClient;        ///< MQTT client instance
    bool credentialsSet;            ///< Whether credentials have been configured
    LED led;                        ///< LED for connection status indication
    Preferences prefs;              ///< Persistent storage for configuration
    
    // Default configuration values
    static const String DEF_BROKER;
    static const String DEF_PORT;
    static const String DEF_USERNAME;
    static const String DEF_PASSWORD;

    // Current configuration
    String broker;                  ///< Current broker address
    uint16_t port;                  ///< Current broker port
    String username;                ///< Current username
    String password;                ///< Current password
    
    // Secure publish management
    static bool ackReceived;        ///< Acknowledgment received flag
    static void ackCallback(char* topic, byte* payload, unsigned int length);
    SecurePublishData pendingPublish; ///< Current pending secure publish
    
    /**
     * @brief Attempt to reconnect to broker if connection lost
     * @param clientId Client ID to use for reconnection
     */
    void reconnect(const char* clientId);
    
    /**
     * @brief Process pending secure publish attempts
     */
    void handleSecurePublish();
};

#endif // MQTT_CONFIG_H

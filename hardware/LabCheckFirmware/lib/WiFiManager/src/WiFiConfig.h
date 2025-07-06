/**
 * @file WiFiConfig.h
 * @brief WiFi connection management with persistent storage
 * 
 * Handles WiFi credentials storage, connection management, and status monitoring.
 * Credentials are stored in ESP32 preferences for persistence across reboots.
 */

#ifndef WIFI_CONFIG_H
#define WIFI_CONFIG_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <Preferences.h>
#include <LED.h>

/**
 * @class WiFiConfig
 * @brief Manages WiFi connection and credential storage
 * 
 * Provides persistent WiFi credential storage using ESP32 Preferences.
 * Handles connection attempts with status feedback via LEDs.
 */
class WiFiConfig {
public:
    WiFiConfig();
    
    /**
     * @brief Initialize WiFi configuration system
     */
    void begin();
    
    /**
     * @brief Attempt to connect to WiFi using stored credentials
     * @return True if connection successful, false otherwise
     */
    bool connect();

    /**
     * @brief Disconnect from current WiFi network
     */
    void disconnect();
    
    /**
     * @brief Set new WiFi credentials and save to preferences
     * @param newSsid Network SSID
     * @param newPassword Network password
     */
    void setCredentials(const String& newSsid, const String& newPassword);
    
    /**
     * @brief Get currently configured SSID
     * @return Current SSID string
     */
    String getSSID() const;
    
    /**
     * @brief Get current IP address if connected
     * @return IP address string, empty if not connected
     */
    String getIPAddress() const;

    /**
     * @brief Get WiFi interface MAC address
     * @return MAC address string
     */
    String getMacAddress() const;
    
private:
    Preferences prefs;              ///< Preferences storage for credentials
    String ssid;                    ///< Current SSID
    String password;                ///< Current password
    static const String DEF_SSID;  ///< Default SSID fallback
    static const String DEF_PASSWORD; ///< Default password fallback
    LED led;                        ///< LED for status indication
    
    /**
     * @brief Load WiFi credentials from preferences storage
     */
    void loadCredentials();
    
    /**
     * @brief Save current credentials to preferences storage
     */
    void saveCredentials();
};

#endif // WIFI_CONFIG_H

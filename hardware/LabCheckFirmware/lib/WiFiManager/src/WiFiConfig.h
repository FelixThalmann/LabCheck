#ifndef WIFI_CONFIG_H
#define WIFI_CONFIG_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <Preferences.h>
#include <LED.h>

class WiFiConfig {
public:
    WiFiConfig();
    
    // Initialize WiFi configuration
    void begin();
    
    // Connect to WiFi with stored credentials
    bool connect();

    // Disconnect from WiFi
    void disconnect();
    
    // Set new WiFi credentials
    void setCredentials(const String& newSsid, const String& newPassword);
    
    // Get current SSID
    String getSSID() const;
    
    // Get current IP address (empty if not connected)
    String getIPAddress() const;

    // Get mac address of the WiFi interface
    String getMacAddress() const;
    
private:
    Preferences prefs;
    String ssid;
    String password;
    static const String DEF_SSID;
    static const String DEF_PASSWORD;

    LED led;
    
    // Load credentials from preferences
    void loadCredentials();
    
    // Save credentials to preferences
    void saveCredentials();
};

#endif // WIFI_CONFIG_H

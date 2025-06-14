#include "WiFiConfig.h"

const String WiFiConfig::DEF_SSID = "HotSpot US640235";
const String WiFiConfig::DEF_PASSWORD = "U-Sie!6402";

WiFiConfig::WiFiConfig() : ssid(""), password("") {}

void WiFiConfig::begin() {
    prefs.begin("settings", false);
    loadCredentials();
}

bool WiFiConfig::connect() {
    Serial.print(F("Connecting to "));
    Serial.print(ssid.c_str());
    Serial.print(F("..."));
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());
    
    // Try to connect for 10 seconds
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 10) {
        delay(1000);
        Serial.print(F("."));
        led.blinkLED(SIGNALLED, 1, 100);
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(F("Connected!"));
        Serial.print(F("IP Address: "));
        Serial.println(WiFi.localIP().toString().c_str());
        return true;
    } else {
        Serial.println(F("Connection failed!"));
        return false;
    }
}

void WiFiConfig::disconnect() {
    WiFi.disconnect();
    Serial.println(F("Disconnected from WiFi."));
}

void WiFiConfig::setCredentials(const String& newSsid, const String& newPassword) {
    ssid = newSsid;
    password = newPassword;
    saveCredentials();
}

String WiFiConfig::getSSID() const {
    return ssid;
}

String WiFiConfig::getIPAddress() const {
    if (WiFi.status() == WL_CONNECTED) {
        return WiFi.localIP().toString();
    }
    return "";
}

String WiFiConfig::getMacAddress() const {
    if (WiFi.status() == WL_CONNECTED) {
        return WiFi.macAddress();
    }
    return "";
}

void WiFiConfig::loadCredentials() {
    ssid = prefs.getString("ssid", DEF_SSID);
    password = prefs.getString("password", DEF_PASSWORD);
}

void WiFiConfig::saveCredentials() {
    prefs.putString("ssid", ssid);
    prefs.putString("password", password);
}

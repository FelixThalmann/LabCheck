#include "Menu.h"

Menu::Menu() : lastActionTime(0), lastOption(0) {
    // Initialize all options as unregistered
    for (int i = 0; i < 10; i++) {
        options[i].isRegistered = false;
        options[i].description = nullptr;
    }
}

void Menu::begin() {
    resetTimeout();
}

void Menu::showInstructions() {
    Serial.println(F("\nWhich component should be tested?"));
    for (int i = 0; i < 10; i++) {
        if (options[i].isRegistered) {
            Serial.print(F("("));
            Serial.print(char('0' + i));
            Serial.print(F(") "));
            Serial.println(options[i].description);
        }
    }
    Serial.println(F("(menu) send something else or press the board reset button\n"));
}

char Menu::processInput() {
    Serial.print(F("Input option: "));
    while (!Serial.available());
    
    while (Serial.available()) {
        char c = Serial.read();
        if (isAlphaNumeric(c)) {
            int index = charToIndex(c);
            if (index >= 0 && index < 10 && options[index].isRegistered) {
                Serial.print(F("Testing '"));
                Serial.print(options[index].description);
                Serial.println(F("'."));
                
                if (options[index].callback) {
                    options[index].callback();
                }
                
                resetTimeout();
                lastOption = c;
                return c;
            } else if (c == 'c') {
                Serial.println(F("Zurueck ins Menu..."));
                resetTimeout();
                lastOption = c;
                return c;
            } else {
                Serial.println(F("Ungueltiger Input!"));
                return 0;
            }
        }
    }
    return 0;
}

bool Menu::checkTimeout() {
    return (millis() - lastActionTime) > TIMEOUT_DURATION;
}

void Menu::registerOption(char option, const char* description, std::function<void()> callback) {
    int index = charToIndex(option);
    if (index >= 0 && index < 10) {
        options[index].description = description;
        options[index].callback = callback;
        options[index].isRegistered = true;
    }
}

void Menu::resetTimeout() {
    lastActionTime = millis();
}

char Menu::getLastOption() const {
    return lastOption;
}

int Menu::charToIndex(char c) const {
    if (c >= '0' && c <= '9') {
        return c - '0';
    }
    return -1;
}

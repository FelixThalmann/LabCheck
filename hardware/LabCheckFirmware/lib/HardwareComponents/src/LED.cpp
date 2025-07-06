/**
 * @file LED.cpp
 * @brief Implementation of LED control functions
 */

#include "LED.h"

LED::LED() {}

void LED::begin() {
    pinMode(LEDGREEN, OUTPUT);
    pinMode(SIGNALLED, OUTPUT);

    // Ensure all LEDs are off initially
    setSignal(false);
    setGreen(false);
}

void LED::setGreen(bool state) {
    digitalWrite(LEDGREEN, state ? HIGH : LOW);
}

void LED::setSignal(bool state) {
    digitalWrite(SIGNALLED, state ? HIGH : LOW);
}

void LED::testSequence() {
    Serial.println(F("Testing LEDs"));

    Serial.print(F("Signal LED..."));
    blinkLED(SIGNALLED);
    
    Serial.print(F("Green LED..."));
    blinkLED(LEDGREEN);
}

void LED::blinkLED(uint8_t pin, int times, int duration) {
    for (int i = 0; i < times; i++) {
        digitalWrite(pin, HIGH);
        delay(duration);
        digitalWrite(pin, LOW);
        delay(duration);
    }
}

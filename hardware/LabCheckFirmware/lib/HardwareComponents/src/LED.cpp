#include "LED.h"

LED::LED() {}

void LED::begin() {
    pinMode(LEDGREEN, OUTPUT);
    pinMode(LEDYELLOW, OUTPUT);
    pinMode(LEDRED, OUTPUT);
    
    // Ensure all LEDs are off initially
    setGreen(false);
    setYellow(false);
    setRed(false);
}

void LED::setGreen(bool state) {
    digitalWrite(LEDGREEN, state ? HIGH : LOW);
}

void LED::setYellow(bool state) {
    digitalWrite(LEDYELLOW, state ? HIGH : LOW);
}

void LED::setRed(bool state) {
    digitalWrite(LEDRED, state ? HIGH : LOW);
}

void LED::testSequence() {
    Serial.println(F("Testing LEDs"));
    
    Serial.print(F("Green..."));
    blinkLED(LEDGREEN);
    
    Serial.print(F("Yellow..."));
    blinkLED(LEDYELLOW);
    
    Serial.print(F("Red..."));
    blinkLED(LEDRED);
}

void LED::blinkLED(uint8_t pin, int times, int duration) {
    for (int i = 0; i < times; i++) {
        digitalWrite(pin, HIGH);
        delay(duration);
        digitalWrite(pin, LOW);
        delay(duration);
    }
}

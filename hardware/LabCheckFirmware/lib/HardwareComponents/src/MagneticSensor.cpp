#include "MagneticSensor.h"

MagneticSensor::MagneticSensor() :
    previousState(false),
    magnetDetectedCallback(nullptr),
    magnetRemovedCallback(nullptr) {}

void MagneticSensor::begin() {
    pinMode(MAGNETIC, INPUT_PULLUP);
    pinMode(SIGNALLED, OUTPUT);
    digitalWrite(SIGNALLED, LOW);
}

void MagneticSensor::update() {
    bool currentState = isActive();
    
    if (currentState != previousState) {
        if (currentState) {
            if (magnetDetectedCallback) {
                magnetDetectedCallback();
            }
            Serial.println(F("Magnet erkannt (Kontakt geschlossen)"));
        } else {
            if (magnetRemovedCallback) {
                magnetRemovedCallback();
            }
            Serial.println(F("Kein Magnet (Kontakt offen)"));
        }
        previousState = currentState;
    }
    
    // Update signal LED to match sensor state
    setSignalLED(currentState);
}

bool MagneticSensor::isActive() const {
    // The sensor is active LOW (due to INPUT_PULLUP), so we invert the reading
    return !digitalRead(MAGNETIC);
}

void MagneticSensor::onMagnetDetected(void (*callback)()) {
    magnetDetectedCallback = callback;
}

void MagneticSensor::onMagnetRemoved(void (*callback)()) {
    magnetRemovedCallback = callback;
}

void MagneticSensor::setSignalLED(bool state) {
    digitalWrite(SIGNALLED, state ? HIGH : LOW);
}

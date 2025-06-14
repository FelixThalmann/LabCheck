#include "PIRSensor.h"

PIRSensor::PIRSensor() :
    previousState(false),
    motionDetectedCallback(nullptr) {}

void PIRSensor::begin() {
    pinMode(PIR_SENSOR, INPUT);
    pinMode(SIGNALLED, OUTPUT);
    digitalWrite(SIGNALLED, LOW);
}

void PIRSensor::update() {
    bool currentState = motionDetected();
    
    if (currentState != previousState) {
        if (currentState) {
            if (motionDetectedCallback) {
                motionDetectedCallback();
            }
            Serial.println(F("Magnet erkannt (Kontakt geschlossen)"));
        } else {
            if (motionStoppedCallback) {
                motionStoppedCallback();
            }
            Serial.println(F("Kein Magnet (Kontakt offen)"));
        }
        previousState = currentState;
    }
    
    // Update signal LED to match sensor state
    setSignalLED(currentState);
}

bool PIRSensor::motionDetected() const {
    // PIR sensor outputs HIGH when motion is detected
    return digitalRead(PIR_SENSOR);
}

void PIRSensor::onMotionDetected(void (*callback)()) {
    motionDetectedCallback = callback;
}

void PIRSensor::onMotionStopped(void (*callback)()) {
    motionStoppedCallback = callback;
}

void PIRSensor::setSignalLED(bool state) {
    digitalWrite(SIGNALLED, state ? HIGH : LOW);
}

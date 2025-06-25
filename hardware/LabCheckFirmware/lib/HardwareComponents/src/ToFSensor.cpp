#include "ToFSensor.h"

ToFSensor::ToFSensor(uint8_t xshutPin, uint8_t i2cSdaPin, uint8_t i2cSclPin)
    : xshutPin(xshutPin), sdaPin(i2cSdaPin), sclPin(i2cSclPin), initialized(false) {
    // Create a new TwoWire instance for this sensor
    // Use different bus numbers for different sensors
    static uint8_t busNumber = 0;
    i2cBus = new TwoWire(busNumber++);
}

bool ToFSensor::begin() {
    pinMode(xshutPin, OUTPUT);
    digitalWrite(xshutPin, HIGH); // Wake up sensor
    delay(10);
    
    // Initialize I2C bus with specific pins
    i2cBus->begin(sdaPin, sclPin);
    
    // Set the I2C bus for the sensor
    sensor.setBus(i2cBus);
    
    if (!sensor.init()) {
        initialized = false;
        return false;
    }
    sensor.setTimeout(500);
    sensor.startContinuous();
    initialized = true;
    return true;
}

uint16_t ToFSensor::readDistance() {
    if (!initialized) return 0xFFFF;
    return sensor.readRangeContinuousMillimeters();
}

void ToFSensor::shutdown() {
    digitalWrite(xshutPin, LOW);
    initialized = false;
}

void ToFSensor::wake() {
    digitalWrite(xshutPin, HIGH);
    delay(10);
    // No need to reinitialize - the sensor keeps its I2C bus assignment
}

bool ToFSensor::isInitialized() const {
    return initialized;
}

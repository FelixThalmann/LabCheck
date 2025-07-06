/**
 * @file ToFSensor.cpp
 * @brief Implementation of ToF sensor wrapper class
 */

#include "ToFSensor.h"

ToFSensor::ToFSensor(uint8_t xshutPin, uint8_t i2cSdaPin, uint8_t i2cSclPin)
    : xshutPin(xshutPin), sdaPin(i2cSdaPin), sclPin(i2cSclPin), initialized(false) {
    // Create a new TwoWire instance for this sensor
    // Use different bus numbers for different sensors to avoid conflicts
    static uint8_t busNumber = 0;
    i2cBus = new TwoWire(busNumber++);
}

bool ToFSensor::begin() {
    // Configure shutdown pin and wake sensor
    pinMode(xshutPin, OUTPUT);
    digitalWrite(xshutPin, HIGH);
    delay(10);
    
    // Initialize I2C bus with dedicated pins
    i2cBus->begin(sdaPin, sclPin);
    
    // Assign I2C bus to sensor
    sensor.setBus(i2cBus);
    
    // Initialize VL53L0X sensor
    if (!sensor.init()) {
        initialized = false;
        return false;
    }
    
    // Configure sensor for continuous ranging
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
    // Sensor retains I2C bus assignment after wake
}

bool ToFSensor::isInitialized() const {
    return initialized;
}

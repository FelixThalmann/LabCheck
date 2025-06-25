#ifndef TOF_SENSOR_H
#define TOF_SENSOR_H

#include <VL53L0X.h>
#include <Wire.h>

class ToFSensor {
public:
    ToFSensor(uint8_t xshutPin, uint8_t i2cSdaPin, uint8_t i2cSclPin);
    bool begin();
    uint16_t readDistance();
    void shutdown();
    void wake();
    bool isInitialized() const;

private:
    VL53L0X sensor;
    TwoWire* i2cBus;
    uint8_t xshutPin;
    uint8_t sdaPin;
    uint8_t sclPin;
    bool initialized;
};

#endif // TOF_SENSOR_H

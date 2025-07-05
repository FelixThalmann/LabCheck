/**
 * @file ToFSensor.h
 * @brief Time-of-Flight distance sensor wrapper class
 * 
 * Wrapper for VL53L0X ToF sensors with individual I2C bus management.
 * Allows multiple sensors to operate independently on separate I2C buses.
 */

#ifndef TOF_SENSOR_H
#define TOF_SENSOR_H

#include <VL53L0X.h>
#include <Wire.h>

/**
 * @class ToFSensor
 * @brief Wrapper class for VL53L0X Time-of-Flight distance sensors
 * 
 * Manages individual I2C buses for each sensor to avoid address conflicts.
 * Each sensor operates on its own I2C bus with dedicated SDA/SCL pins.
 */
class ToFSensor {
public:
    /**
     * @brief Constructor for ToF sensor with dedicated I2C pins
     * @param xshutPin GPIO pin for sensor shutdown control
     * @param i2cSdaPin I2C data pin for this sensor
     * @param i2cSclPin I2C clock pin for this sensor
     */
    ToFSensor(uint8_t xshutPin, uint8_t i2cSdaPin, uint8_t i2cSclPin);
    
    /**
     * @brief Initialize the sensor and start continuous ranging
     * @return True if initialization successful, false otherwise
     */
    bool begin();
    
    /**
     * @brief Read current distance measurement
     * @return Distance in millimeters, or 0xFFFF if sensor not initialized
     */
    uint16_t readDistance();
    
    /**
     * @brief Put sensor into shutdown mode (low power)
     */
    void shutdown();
    
    /**
     * @brief Wake sensor from shutdown mode
     */
    void wake();
    
    /**
     * @brief Check if sensor is properly initialized
     * @return True if sensor is initialized and ready
     */
    bool isInitialized() const;

private:
    VL53L0X sensor;         ///< VL53L0X sensor instance
    TwoWire* i2cBus;        ///< Dedicated I2C bus for this sensor
    uint8_t xshutPin;       ///< Shutdown control pin
    uint8_t sdaPin;         ///< I2C data pin
    uint8_t sclPin;         ///< I2C clock pin
    bool initialized;       ///< Initialization state flag
};

#endif // TOF_SENSOR_H

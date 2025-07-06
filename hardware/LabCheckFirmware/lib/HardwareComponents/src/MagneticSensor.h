/**
 * @file MagneticSensor.h
 * @brief Magnetic door sensor management with callback support
 * 
 * Monitors magnetic door sensor state and provides callbacks for
 * door open/close events. Used to detect when the lab door is opened or closed.
 */

#ifndef MAGNETIC_SENSOR_H
#define MAGNETIC_SENSOR_H

#include <Arduino.h>
#include "PinConfig.h"

/**
 * @class MagneticSensor
 * @brief Manages magnetic door sensor with event callbacks
 * 
 * Provides state monitoring and change detection for magnetic door sensors.
 * Supports callback functions for door open/close events.
 */
class MagneticSensor {
public:
    MagneticSensor();
    
    /**
     * @brief Initialize magnetic sensor pin
     */
    void begin();
    
    /**
     * @brief Update sensor state and trigger callbacks on changes
     */
    void update();
    
    /**
     * @brief Get current sensor state
     * @return True if magnet is detected (door closed), false otherwise
     */
    bool isActive() const;
    
    /**
     * @brief Set callback for magnet detected event (door closed)
     * @param callback Function to call when magnet is detected
     */
    void onMagnetDetected(void (*callback)());
    
    /**
     * @brief Set callback for magnet removed event (door opened)
     * @param callback Function to call when magnet is removed
     */
    void onMagnetRemoved(void (*callback)());
    
    /**
     * @brief Control signal LED based on sensor state
     * @param state True to turn on signal LED, false to turn off
     */
    void setSignalLED(bool state);
    
private:
    bool previousState;                 ///< Previous sensor state for change detection
    void (*magnetDetectedCallback)();   ///< Callback for magnet detected
    void (*magnetRemovedCallback)();    ///< Callback for magnet removed
};

#endif // MAGNETIC_SENSOR_H

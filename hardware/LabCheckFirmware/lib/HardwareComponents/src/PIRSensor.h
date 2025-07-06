/**
 * @file PIRSensor.h
 * @brief PIR motion sensor management with callback support
 * 
 * Monitors PIR motion sensor for movement detection and provides callbacks
 * for motion start/stop events. Used to detect when someone approaches the entrance.
 */

#ifndef PIR_SENSOR_H
#define PIR_SENSOR_H

#include <Arduino.h>
#include "PinConfig.h"

/**
 * @class PIRSensor
 * @brief Manages PIR motion sensor with event callbacks
 * 
 * Provides motion detection and change monitoring for PIR sensors.
 * Supports callback functions for motion start/stop events.
 */
class PIRSensor {
public:
    PIRSensor();
    
    /**
     * @brief Initialize PIR sensor pin
     */
    void begin();
    
    /**
     * @brief Update sensor state and trigger callbacks on changes
     */
    void update();
    
    /**
     * @brief Get current motion detection state
     * @return True if motion is detected, false otherwise
     */
    bool motionDetected() const;
    
    /**
     * @brief Set callback for motion detected event
     * @param callback Function to call when motion starts
     */
    void onMotionDetected(void (*callback)());
    
    /**
     * @brief Set callback for motion stopped event
     * @param callback Function to call when motion stops
     */
    void onMotionStopped(void (*callback)());
    
    /**
     * @brief Control signal LED based on motion state
     * @param state True to turn on signal LED, false to turn off
     */
    void setSignalLED(bool state);
    
private:
    bool previousState;                 ///< Previous sensor state for change detection
    void (*motionDetectedCallback)();   ///< Callback for motion detected
    void (*motionStoppedCallback)();    ///< Callback for motion stopped
};

#endif // PIR_SENSOR_H

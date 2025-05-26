#ifndef MAGNETIC_SENSOR_H
#define MAGNETIC_SENSOR_H

#include <Arduino.h>
#include "PinConfig.h"

class MagneticSensor {
public:
    MagneticSensor();
    
    // Initialize sensor pins
    void begin();
    
    // Check sensor state and handle events
    void update();
    
    // Get current sensor state
    bool isActive() const;
    
    // Event handlers for state changes
    void onMagnetDetected(void (*callback)());
    void onMagnetRemoved(void (*callback)());
    
    // Control the signal LED
    void setSignalLED(bool state);
    
private:
    bool previousState;
    void (*magnetDetectedCallback)();
    void (*magnetRemovedCallback)();
};

#endif // MAGNETIC_SENSOR_H

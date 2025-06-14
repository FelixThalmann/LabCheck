#ifndef PIR_SENSOR_H
#define PIR_SENSOR_H

#include <Arduino.h>
#include "PinConfig.h"

class PIRSensor {
public:
    PIRSensor();
    
    // Initialize sensor pins
    void begin();
    
    // Check sensor state and handle events
    void update();
    
    // Get current sensor state
    bool motionDetected() const;
    
    // Event handlers for state changes
    void onMotionDetected(void (*callback)());
    void onMotionStopped(void (*callback)());
    
    // Control the signal LED
    void setSignalLED(bool state);
    
private:
    bool previousState;
    void (*motionDetectedCallback)();
    void (*motionStoppedCallback)();
};

#endif // PIR_SENSOR_H

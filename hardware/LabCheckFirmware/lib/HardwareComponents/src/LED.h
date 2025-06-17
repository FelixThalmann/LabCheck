#ifndef LED_H
#define LED_H

#include <Arduino.h>
#include "PinConfig.h"

class LED {
public:
    LED();
    
    // Initialize all LED pins
    void begin();
    
    // Control individual LEDs
    void setGreen(bool state);
    void setYellow(bool state);
    void setRed(bool state);
    
    // Test sequence for all LEDs
    void testSequence();

    void blinkLED(uint8_t pin, int times = 3, int duration = 200);
};

#endif // LED_H

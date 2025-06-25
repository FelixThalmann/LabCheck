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
    void setSignal(bool state);
    void setGreen(bool state);
    
    // Test sequence for all LEDs
    void testSequence();

    // Blink an LED a specified number of times
    void blinkLED(uint8_t pin, int times = 3, int duration = 200);
};

#endif // LED_H

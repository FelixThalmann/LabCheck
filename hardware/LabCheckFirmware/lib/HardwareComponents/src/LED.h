/**
 * @file LED.h
 * @brief LED control class for status indication
 * 
 * Manages the green status LED and signal LED for visual feedback
 * during different program states and testing.
 */

#ifndef LED_H
#define LED_H

#include <Arduino.h>
#include "PinConfig.h"

/**
 * @class LED
 * @brief Controls status and signal LEDs
 */
class LED {
public:
    LED();
    
    /**
     * @brief Initialize LED pins as outputs
     */
    void begin();
    
    /**
     * @brief Control signal LED state
     * @param state True to turn on, false to turn off
     */
    void setSignal(bool state);
    
    /**
     * @brief Control green status LED state
     * @param state True to turn on, false to turn off
     */
    void setGreen(bool state);
    
    /**
     * @brief Run LED test sequence for verification
     */
    void testSequence();

    /**
     * @brief Blink an LED a specified number of times
     * @param pin GPIO pin number of the LED
     * @param times Number of blinks (default: 3)
     * @param duration Duration of each blink phase in ms (default: 200)
     */
    void blinkLED(uint8_t pin, int times = 3, int duration = 200);
};

#endif // LED_H

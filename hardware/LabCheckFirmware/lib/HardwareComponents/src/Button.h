#ifndef BUTTON_H
#define BUTTON_H

#include <Arduino.h>
#include "PinConfig.h"

class Button {
public:
    Button();
    
    // Initialize button pins
    void begin();
    
    // Check button states and handle events
    void update();
    
    // Get current button states
    bool isButton1Pressed() const;
    bool isButton2Pressed() const;
    
    // Event handlers - can be set by the main application
    void onButton1Pressed(void (*callback)());
    void onButton1Released(void (*callback)());
    void onButton2Pressed(void (*callback)());
    void onButton2Released(void (*callback)());
    
private:
    bool button1PrevState;
    bool button2PrevState;
    
    void (*button1PressedCallback)();
    void (*button1ReleasedCallback)();
    void (*button2PressedCallback)();
    void (*button2ReleasedCallback)();
};

#endif // BUTTON_H

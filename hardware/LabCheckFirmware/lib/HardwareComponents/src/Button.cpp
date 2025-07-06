/* #include "Button.h"

Button::Button() : 
    button1PrevState(HIGH),
    button2PrevState(HIGH),
    button1PressedCallback(nullptr),
    button1ReleasedCallback(nullptr),
    button2PressedCallback(nullptr),
    button2ReleasedCallback(nullptr) {}

void Button::begin() {
    pinMode(PUSHONE, INPUT_PULLUP);
    pinMode(PUSHTWO, INPUT_PULLUP);
}

void Button::update() {
    // Read current button states
    bool button1CurrentState = digitalRead(PUSHONE);
    bool button2CurrentState = digitalRead(PUSHTWO);
    
    // Check for button 1 state changes
    if (button1CurrentState != button1PrevState) {
        if (button1CurrentState == LOW) {  // Button pressed (LOW due to INPUT_PULLUP)
            if (button1PressedCallback) {
                button1PressedCallback();
            }
            Serial.println(F("Button 1 pressed!"));
        } else {  // Button released
            if (button1ReleasedCallback) {
                button1ReleasedCallback();
            }
            Serial.println(F("Button 1 released!"));
        }
        button1PrevState = button1CurrentState;
    }
    
    // Check for button 2 state changes
    if (button2CurrentState != button2PrevState) {
        if (button2CurrentState == LOW) {  // Button pressed (LOW due to INPUT_PULLUP)
            if (button2PressedCallback) {
                button2PressedCallback();
            }
            Serial.println(F("Button 2 pressed!"));
        } else {  // Button released
            if (button2ReleasedCallback) {
                button2ReleasedCallback();
            }
            Serial.println(F("Button 2 released!"));
        }
        button2PrevState = button2CurrentState;
    }
    
    delay(20);  // Simple debouncing
}

bool Button::isButton1Pressed() const {
    return digitalRead(PUSHONE) == LOW;
}

bool Button::isButton2Pressed() const {
    return digitalRead(PUSHTWO) == LOW;
}

void Button::onButton1Pressed(void (*callback)()) {
    button1PressedCallback = callback;
}

void Button::onButton1Released(void (*callback)()) {
    button1ReleasedCallback = callback;
}

void Button::onButton2Pressed(void (*callback)()) {
    button2PressedCallback = callback;
}

void Button::onButton2Released(void (*callback)()) {
    button2ReleasedCallback = callback;
}
 */
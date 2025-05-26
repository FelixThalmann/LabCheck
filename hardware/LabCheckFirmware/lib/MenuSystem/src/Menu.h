#ifndef MENU_H
#define MENU_H

#include <Arduino.h>
#include <functional>

class Menu {
public:
    Menu();
    
    // Initialize menu system
    void begin();
    
    // Show menu instructions
    void showInstructions();
    
    // Process menu input and return selected option
    char processInput();
    
    // Check for timeout and handle it
    bool checkTimeout();
    
    // Register callbacks for menu options
    void registerOption(char option, const char* description, std::function<void()> callback);
    
    // Reset timeout
    void resetTimeout();
    
    // Get last selected option
    char getLastOption() const;
    
private:
    static const unsigned long TIMEOUT_DURATION = 20000; // 20 seconds
    unsigned long lastActionTime;
    char lastOption;
    
    // Menu options storage
    struct MenuOption {
        const char* description;
        std::function<void()> callback;
        bool isRegistered;
    };
    MenuOption options[10]; // Support for options 0-9
    
    // Convert char to index
    int charToIndex(char c) const;
};

#endif // MENU_H

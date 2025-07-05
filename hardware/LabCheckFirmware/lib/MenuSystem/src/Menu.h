/**
 * @file Menu.h
 * @brief Interactive menu system for test mode operations
 * 
 * Provides a flexible menu system with timeout handling and callback
 * registration for different test and configuration options.
 */

#ifndef MENU_H
#define MENU_H

#include <Arduino.h>
#include <functional>

/**
 * @class Menu
 * @brief Interactive menu system with callback support
 * 
 * Manages user interaction through serial interface with automatic timeout
 * and callback-based option handling for test mode operations.
 */
class Menu {
public:
    Menu();
    
    /**
     * @brief Initialize menu system
     */
    void begin();
    
    /**
     * @brief Display menu instructions to user
     */
    void showInstructions();
    
    /**
     * @brief Process user input and return selected option
     * @return Selected menu option character
     */
    char processInput();
    
    /**
     * @brief Check for timeout and handle automatically
     * @return True if timeout occurred, false otherwise
     */
    bool checkTimeout();
    
    /**
     * @brief Register callback function for menu option
     * @param option Menu option character (0-9)
     * @param description Description text for this option
     * @param callback Function to execute when option is selected
     */
    void registerOption(char option, const char* description, std::function<void()> callback);
    
    /**
     * @brief Reset the timeout counter
     */
    void resetTimeout();
    
    /**
     * @brief Get the last selected option
     * @return Last selected option character
     */
    char getLastOption() const;
    
private:
    static const unsigned long TIMEOUT_DURATION = 20000; ///< Menu timeout in milliseconds
    unsigned long lastActionTime;   ///< Timestamp of last user action
    char lastOption;                ///< Last selected menu option
    
    /**
     * @struct MenuOption
     * @brief Structure for storing menu option data
     */
    struct MenuOption {
        const char* description;        ///< Option description text
        std::function<void()> callback; ///< Callback function to execute
        bool isRegistered;              ///< Whether this option is registered
    };
    MenuOption options[10];         ///< Support for options 0-9
    
    /**
     * @brief Convert character to array index
     * @param c Character to convert
     * @return Array index (0-9) or -1 if invalid
     */
    int charToIndex(char c) const;
};

#endif // MENU_H

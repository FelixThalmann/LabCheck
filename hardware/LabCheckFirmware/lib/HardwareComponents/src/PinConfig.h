/**
 * @file PinConfig.h
 * @brief Pin configuration definitions for LabCheck hardware components
 * 
 * Centralizes all GPIO pin assignments for the ESP32-based LabCheck device.
 * Modify these definitions to match your hardware configuration.
 */

#ifndef PIN_CONFIG_H
#define PIN_CONFIG_H

// Sensor pins
#define MAGNETIC 22         ///< Magnetic door sensor input pin
#define PIR_SENSOR 19       ///< PIR motion sensor input pin

// Output pins
#define SIGNALLED 18        ///< Signal LED output pin
#define LEDGREEN 23         ///< Green status LED output pin
#define SPEAKER 16          ///< Speaker/buzzer output pin

// ToF Sensor 1 pins (entrance side)
#define TOF1_SCL 2          ///< ToF sensor 1 I2C clock pin
#define TOF1_SDA 15         ///< ToF sensor 1 I2C data pin
#define TOF1_XSHUT 5        ///< ToF sensor 1 shutdown control pin

// ToF Sensor 2 pins (exit side)
#define TOF2_SCL 4          ///< ToF sensor 2 I2C clock pin
#define TOF2_SDA 0          ///< ToF sensor 2 I2C data pin
#define TOF2_XSHUT 17       ///< ToF sensor 2 shutdown control pin

#endif // PIN_CONFIG_H

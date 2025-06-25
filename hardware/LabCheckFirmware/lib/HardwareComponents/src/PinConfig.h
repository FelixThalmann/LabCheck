#ifndef PIN_CONFIG_H
#define PIN_CONFIG_H

// Pin definitions for various hardware components
#define MAGNETIC 22    // Magnetic door sensor

#define SIGNALLED 18    // Signal output
#define LEDGREEN 23    // Green LED

#define SPEAKER 16     // Speaker output

#define PIR_SENSOR 19   // PIR sensor input

#define TOF1_SCL 2  // TOF sensor I2C SCL pin
#define TOF1_SDA 15  // TOF sensor I2C SDA pin
#define TOF1_XSHUT 5  // TOF sensor XSHUT pin
#define TOF2_SCL 4  // Second TOF sensor I2C SCL pin
#define TOF2_SDA 0  // Second TOF sensor I2C SDA pin
#define TOF2_XSHUT 17  // Second TOF sensor XSHUT pin

#endif // PIN_CONFIG_H

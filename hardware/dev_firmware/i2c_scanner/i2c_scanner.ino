#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Serial.println("\nI2C Scanner");
  
  // I2C Bus auf GPIO 0 und 4 initialisieren
  Wire.begin(0, 4); 
}

void loop() {
  byte error, address;
  int nDevices;

  Serial.println("Scanning...");
  nDevices = 0;
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
      nDevices++;
    } else if (error == 4) {
      Serial.print("Unknown error at address 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
    }    
  }
  if (nDevices == 0) {
    Serial.println("No I2C devices found\n");
  } else {
    Serial.println("done\n");
  }
  delay(5000); // 5 Sekunden warten vor dem nächsten Scan
}
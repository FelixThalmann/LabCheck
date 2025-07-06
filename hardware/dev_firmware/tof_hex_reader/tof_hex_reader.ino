#include <Wire.h>

#define VL53L0X_ADDR 0x29

void setup() {
  Wire.begin(0, 4);  // SDA=0, SCL=4 (ESP32)
  Serial.begin(115200);
  delay(1000);

  // Chip-ID Register (z.B. 0xC0 und 0xC1 für VL53L0X)
  uint16_t chipID = readChipID();
  Serial.print("Chip-ID: 0x");
  Serial.println(chipID, HEX);
}

void loop() {}

uint16_t readChipID() {
  uint16_t id = 0;
  Wire.beginTransmission(VL53L0X_ADDR);
  Wire.write(0xC0);  // Registeradresse High Byte Chip-ID (kann je Sensor anders sein)
  if (Wire.endTransmission(false) != 0) return 0;

  Wire.requestFrom(VL53L0X_ADDR, 2);
  if (Wire.available() == 2) {
    id = Wire.read() << 8;
    id |= Wire.read();
  }
  return id;
}

#include <Wire.h>
#include <VL53L0X.h>

VL53L0X sensor;

void setup() {
  Serial.begin(115200);
  delay(1000); // Eine Sekunde warten, damit der Monitor sicher verbunden ist
  Serial.println("\n--- Finaler Test mit Pins 15 (SDA) und 2 (SCL) ---");

  // I2C Bus auf den Pins 15 (SDA) und 2 (SCL) initialisieren
  // Dies ist die korrekte Reihenfolge!
  Wire.begin(15, 2);

  Serial.println("I2C Bus gestartet. Initialisiere Sensor...");

  if (!sensor.init()) {
    Serial.println("FEHLER: Sensor.init() fehlgeschlagen. Überprüfe die Schaltung und den Code.");
    // Wir bleiben hier nicht mehr hängen, um weitere Infos zu sehen
  } else {
    Serial.println("ERFOLG: Sensor wurde initialisiert!");
  }

  sensor.setTimeout(500);
  sensor.startContinuous();
}

void loop() {
  int dist = sensor.readRangeContinuousMillimeters();
  if (sensor.timeoutOccurred()) {
    Serial.print("Messung: Timeout! | ");
  } else {
    Serial.print("Abstand: ");
    Serial.print(dist);
    Serial.print(" mm | ");
  }
  
  // Wir prüfen den I2C Bus erneut im Loop
  byte error, address = 0x29;
  Wire.beginTransmission(address);
  error = Wire.endTransmission();
  if (error != 0) {
      Serial.println("I2C-Verbindung zum Sensor verloren!");
  } else {
      Serial.println("I2C-Verbindung zum Sensor OK.");
  }

  delay(200);
}
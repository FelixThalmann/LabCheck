#include <Wire.h>
#include <VL53L0X.h>

// Den XSHUT_PIN definieren wir nicht mehr, da wir ihn nicht verwenden.
#define XSHUT_PIN 16 

VL53L0X sensor;

void setup() {
  Serial.begin(115200);
  
  // ZUERST den Bus initialisieren
  Wire.begin(15, 2); //DA, CL
  
  // DANN den Sensor über XSHUT resetten
  pinMode(XSHUT_PIN, OUTPUT);
  digitalWrite(XSHUT_PIN, HIGH); // Sicherstellen, dass er an ist
  delay(10);

  // Sensor initialisieren
  if (!sensor.init()) {
    Serial.println("Sensor nicht gefunden!");
    while (1);
  }

  sensor.setTimeout(500);
  sensor.startContinuous();

  Serial.println("VL53L0X bereit.");
}

void loop() {
  int dist = sensor.readRangeContinuousMillimeters();
  if (sensor.timeoutOccurred()) {
    Serial.println("Timeout!");
  } else {
    Serial.print("Abstand: ");
    Serial.print(dist);
    Serial.println(" mm");
  }
  delay(1000);
}
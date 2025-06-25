#include <Wire.h>
#include "Adafruit_VL53L1X.h"

Adafruit_VL53L1X sensor = Adafruit_VL53L1X();

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    delay(10); // Warten bis der Serielle Monitor verbunden ist
  }
  Serial.println("--- Finaler, korrigierter Test mit VL53L1X Bibliothek ---");

  // Wire.begin() ohne Argumente für die Standard-Pins 21 (SDA) und 22 (SCL)
  Wire.begin(15, 2);

  Serial.println("Initialisiere Sensor...");
  if (!sensor.begin(0x29, &Wire)) {
    Serial.println(F("FEHLER: Konnte den VL53L1X Sensor nicht finden. Überprüfe die Verkabelung."));
    while (1);
  }
  Serial.println(F("ERFOLG: Sensor initialisiert!"));

  // Die folgenden Zeilen aus meinem alten Code waren FALSCH für diese Bibliothek und werden entfernt.
  // sensor.setDistanceMode(VL53L1X_DISTANCE_MODE_LONG);
  // sensor.setTimingBudget(50000); 
  // sensor.startRanging();
}

void loop() {
  // Die neue Version der Bibliothek macht es viel einfacher:
  // sensor.distance() kümmert sich intern um alles und gibt die Entfernung zurück.
  int distance = sensor.distance(); 

  // Wenn der zurückgegebene Wert -1 ist, gab es einen Lesefehler.
  if (distance == -1) {
    Serial.println("Messung fehlgeschlagen.");
  } else {
    Serial.print("Abstand: ");
    Serial.print(distance);
    Serial.println(" mm");
  }

  delay(100); // Eine kurze Pause zwischen den Messungen
}
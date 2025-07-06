#include <Wire.h>
#include <VL53L0X.h>

// --- Sensor 1 ---
// Instanz für den ersten Sensor
VL53L0X sensor1;
// I2C-Bus für den ersten Sensor (Standard-Bus)
TwoWire I2C_1 = Wire; 

// --- Sensor 2 ---
// Instanz für den zweiten Sensor
VL53L0X sensor2;
// Zweiter I2C-Bus
TwoWire I2C_2 = Wire1;

void setup() {
  Serial.begin(115200);
  delay(1000); // Eine Sekunde warten, damit der Monitor sicher verbunden ist
  Serial.println("\n--- Finaler Test mit ZWEI VL53L0X Sensoren an getrennten Pins ---");

  // --- Initialisierung Sensor 1 an Pins 15 (SDA) und 2 (SCL) ---
  Serial.println("Initialisiere Sensor 1...");
  // I2C Bus 1 auf den Pins 15 (SDA) und 2 (SCL) initialisieren
  I2C_1.begin(15, 2); 
  sensor1.setBus(&I2C_1); // Dem Sensor-Objekt den korrekten Bus zuweisen
  
  if (!sensor1.init()) {
    Serial.println("FEHLER: Sensor 1 init() fehlgeschlagen. Überprüfe die Schaltung!");
  } else {
    Serial.println("ERFOLG: Sensor 1 wurde initialisiert!");
    sensor1.setTimeout(500);
    sensor1.startContinuous();
  }

  Serial.println("\n-------------------------------------------------\n");

  // --- Initialisierung Sensor 2 an Pins 0 (SDA) und 4 (SCL) ---
  Serial.println("Initialisiere Sensor 2...");
  // I2C Bus 2 auf den Pins 0 (SDA) und 4 (SCL) initialisieren
  I2C_2.begin(0, 4);
  sensor2.setBus(&I2C_2); // Dem Sensor-Objekt den korrekten Bus zuweisen
  
  if (!sensor2.init()) {
    Serial.println("FEHLER: Sensor 2 init() fehlgeschlagen. Überprüfe die Schaltung!");
  } else {
    Serial.println("ERFOLG: Sensor 2 wurde initialisiert!");
    sensor2.setTimeout(500);
    sensor2.startContinuous();
  }
   Serial.println("\n-------------------------------------------------\n");
}

void loop() {
  byte error;
  byte address = 0x29; // Standard-Adresse der Sensoren

  // --- Sensor 1 auslesen ---
  int dist1 = sensor1.readRangeContinuousMillimeters();
  if (sensor1.timeoutOccurred()) {
    Serial.print("Sensor 1: Timeout!   | ");
  } else {
    Serial.print("Sensor 1: ");
    Serial.print(dist1);
    Serial.print(" mm | ");
  }
  
  // I2C-Verbindung für Sensor 1 prüfen
  I2C_1.beginTransmission(address);
  error = I2C_1.endTransmission();
  if (error != 0) {
    Serial.print("I2C-1-Verbindung verloren! | ");
  } else {
    Serial.print("I2C-1-Verbindung OK. | ");
  }


  // --- Sensor 2 auslesen ---
  int dist2 = sensor2.readRangeContinuousMillimeters();
  if (sensor2.timeoutOccurred()) {
    Serial.print("Sensor 2: Timeout!   ");
  } else {
    Serial.print("Sensor 2: ");
    Serial.print(dist2);
    Serial.print(" mm ");
  }

  // I2C-Verbindung für Sensor 2 prüfen
  I2C_2.beginTransmission(address);
  error = I2C_2.endTransmission();
  if (error != 0) {
    Serial.println("| I2C-2-Verbindung verloren!");
  } else {
    Serial.println("| I2C-2-Verbindung OK.");
  }


  delay(200);
}
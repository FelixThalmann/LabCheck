#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <ESPmDNS.h>

#define MAGNETIC 15
#define SIGNALLED 2
#define SPEAKER 4

const int timeout = 20000;
char menuOption = 0;
long time0;
bool sensorToggle = 0;

const char* SSID = "KultanaPC";
const char* PASSWORD = "a1b2c3qwertzuiop";

int song[6] = {1209,0,1209,0,0,0};
int songCounter = 0;
int melody[] = {
  262, 330, 392, 523, 440, 392, 330, 262,  392,   // Takt 1
  262, 330, 392, 523, 440, 392, 330, 262,  392,   // Takt 2
  392, 523, 659, 784, 659, 523, 392,   262,        // Takt 3
  392, 523, 659, 784, 659, 523, 392,   262,        // Takt 4
  523, 659, 784,1046, 784, 659, 523,   659,        // Takt 5
  392, 523, 659, 784, 659, 523, 392,   262,        // Takt 6
  262, 330, 392, 523, 440, 392, 330, 262,  0     // Takt 7 (endet ~30 s)
};
int noteDuration = 75;
int melodyCounter = 0;

char menu();
void connectToWifi();

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  while(!Serial);
  pinMode(MAGNETIC, INPUT_PULLUP);
  pinMode(SIGNALLED, OUTPUT);
  //save tone init
  tone(SPEAKER, 100,10);
  delay(15);
  noTone(SPEAKER);



  Serial.println("ESP32 gestartet!");

  menuOption = menu();
}

void loop() {
  // put your main code here, to run repeatedly:
  if(menuOption == '1'){
    int sensorActive = !digitalRead(MAGNETIC);
    digitalWrite(SIGNALLED, sensorActive ? HIGH : LOW);

    if(sensorActive){
      digitalWrite(SIGNALLED, HIGH);
      tone(SPEAKER, song[songCounter]);
      songCounter = (songCounter+1)%6;
      if (sensorToggle == false){
        Serial.println("Magnet erkannt (Kontakt geschlossen)");
        sensorToggle = true;
      }
    } else{
      digitalWrite(SIGNALLED, LOW);
      noTone(SPEAKER);
      if (sensorToggle == true){
        Serial.println("Kein Magnet (Kontakt offen)");
        sensorToggle = false;
      }
    }
    delay(200);
  }

  if(menuOption == '2'){
    noTone(SPEAKER);
    tone(SPEAKER, melody[melodyCounter]);
    melodyCounter = (melodyCounter + 1) % 59;
    delay(noteDuration);
  }

  if(menuOption == '3'){
    connectToWifi();
    menuOption = menu();
  }

  if (Serial.available()){
    char c = Serial.read();
    if (c == 'c'){
      noTone(SPEAKER);
      menuOption = menu();
    }
  }
  if(millis() - time0 > timeout){
    noTone(SPEAKER);
    menuOption = menu();
  }
}

// Menu funktion for selecting the components to be tested
char menu(){
  Serial.println(F("\nWelcher Komponent soll getestet werden?"));
  Serial.println(F("(1) Magnetischer Tuer Sensor Set"));
  Serial.println(F("(2) Geheimer Song"));
  Serial.println(F("(3) WiFi Test: Verbinden und IP Adresse ausgeben"));
  Serial.println(F("(menu) sende etwas Anderes oder druecke den Board Reset Knopf\n"));
  while(!Serial.available());

  // Read data from serial monitor if received
  while(Serial.available()){
    char c = Serial.read();
    if(isAlphaNumeric(c)){
      if(c == '1'){
        Serial.println(F("Teste nun 'Magnetischer Tuer Sensor Set'."));
      } else if (c == '2'){
        Serial.println(F("Spiele nun Tales Song..."));
      } else if (c == '3'){
        Serial.println(F("WiFi Verbindung..."));
      } else if (c == 'c'){
        Serial.println(F("Zurueck ins Menu..."));
      } else {
        Serial.println(F("Ungueltiger Input!"));
        return 0;
      }
      time0 = millis();
      return c;
    }
  }
  return 0;
}

void connectToWifi(){
  Serial.print(F("Verbinde in 3..."));
  delay(3000);

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  int timecounter = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(F("."));
    digitalWrite(SIGNALLED, HIGH);
    delay(100);
    digitalWrite(SIGNALLED, LOW);

    if(timecounter > 10){
      Serial.println(F("Timeout!"));
      return;
    }
    timecounter++;
  }
  Serial.println(F("\nVerbunden!"));
  Serial.print(F("IP Adresse: "));
  Serial.println(WiFi.localIP().toString().c_str());
  tone(SPEAKER, 800, 10);
  tone(SPEAKER, 1050, 10);
}
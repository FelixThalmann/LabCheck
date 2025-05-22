#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <ESPmDNS.h>

#define MAGNETIC 15
#define SIGNALLED 2
#define LEDGREEN 17
#define LEDYELLOW 18
#define LEDRED 19
#define SPEAKER 13
#define PUSHONE 4
#define PUSHTWO 16

const int timeout = 20000;
char menuOption = 0;
long time0;
bool sensorToggle = 0;
Preferences prefs;

const String DEF_SSID = "HotSpot US640235";
const String DEF_PASSWORD = "U-Sie!6402";
String ssid;
String password;

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

bool pushOnePressed = false;
bool pushTwoPressed = false;

char menu();
void menuInstructions();
void connectToWifi();
void setupWiFi();
void testLeds();
void testButtons();
String readStringUntilMulti(const char* terminators);

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  while(!Serial);

  pinMode(MAGNETIC, INPUT_PULLUP);
  pinMode(SIGNALLED, OUTPUT);
  pinMode(LEDGREEN, OUTPUT);
  pinMode(LEDYELLOW, OUTPUT);
  pinMode(LEDRED, OUTPUT);
  pinMode(SPEAKER, OUTPUT);
  pinMode(PUSHONE, INPUT_PULLUP);
  pinMode(PUSHTWO, INPUT_PULLUP);

  prefs.begin("settings", false);
  ssid = prefs.getString("ssid", DEF_SSID);
  password = prefs.getString("password", DEF_PASSWORD);
  //save tone init
  tone(SPEAKER, 100,10);
  delay(15);
  noTone(SPEAKER);


  Serial.println("ESP32 gestartet!");
  menuInstructions();
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

  if(menuOption == '4'){
    setupWiFi();
    menuOption = menu();
  }

  if(menuOption == '5'){
    testLeds();
    menuOption = menu();
  }

  if(menuOption == '6'){
    testButtons();
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
  Serial.print(F("Input option: "));
  while(!Serial.available());
  // Read data from serial monitor if received
  while(Serial.available()){
    char c = Serial.read();
    if(isAlphaNumeric(c)){
      if(c == '1'){
        Serial.println(F("Testing 'Magnetic door sensor set'."));
      } else if (c == '2'){
        Serial.println(F("Spiele nun Tales Song..."));
      } else if (c == '3'){
        Serial.println(F("WiFi Verbindung"));
      } else if (c == '4'){
        Serial.println(F("WiFi Setup"));
      } else if (c == '5'){
        Serial.println(F("LED Test"));
      } else if (c == '6'){
        Serial.println(F("Button Test"));
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

// menu instructions in english
void menuInstructions(){
  Serial.println(F("\nWhich component should be tested?"));
  Serial.println(F("(1) Magnetic Door Sensor Set"));
  Serial.println(F("(2) Secret Song"));
  Serial.println(F("(3) WiFi Test: Connect and print IP address"));
  Serial.println(F("(4) WiFi Setup: Set SSID and Password"));
  Serial.println(F("(5) Test LEDs"));
  Serial.println(F("(6) Test Buttons"));
  Serial.println(F("(menu) send something else or press the board reset button\n"));
}

void connectToWifi(){
  Serial.print(F("Connecting to "));
  Serial.print(F(ssid.c_str()));
  Serial.print(F("..."));
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  int timecounter = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(F("."));
    for (int i = 0; i < 2; i++){
      digitalWrite(SIGNALLED, HIGH);
      delay(100);
      digitalWrite(SIGNALLED, LOW);
      delay(100);
    }
    if(timecounter > 10){
      Serial.println(F("Timeout!"));
      tone(SPEAKER, 800, 50);
      tone(SPEAKER, 200, 100);
      return;
    }
    timecounter++;
  }
  Serial.println(F("Connected!"));
  Serial.print(F("IP Adresse: "));
  Serial.println(WiFi.localIP().toString().c_str());
  tone(SPEAKER, 800, 50);
  tone(SPEAKER, 1050, 100);
}

// set the ssid and password by serial, save it to the preferences
void setupWiFi(){
  Serial.setTimeout(10000);
  Serial.print(F("Input SSID: "));
  while(!Serial.available());
  ssid = readStringUntilMulti("\r\n\t");
  prefs.putString("ssid", ssid);
  while (Serial.available()) {Serial.read();};
  Serial.println(F(ssid.c_str()));
  
  Serial.print(F("Input password: "));
  while(!Serial.available());
  password = readStringUntilMulti("\r\n\t");
  while (Serial.available()) {Serial.read();};
  prefs.putString("password", password);
  Serial.println(F("OK"));
  
  Serial.setTimeout(1000);
  Serial.println(F("Setup completed."));
}

String readStringUntilMulti(const char* terminators) {
  String result = "";
  while (true) {
    while (!Serial.available()) delay(1);
    char c = Serial.read();
    // Prüfe, ob das Zeichen einer der Terminatoren ist
    for (const char* t = terminators; *t; ++t) {
      if (c == *t) return result;
    }
    result += c;
  }
}

void testLeds(){
  Serial.print(F("Testing LEDs"));
  Serial.print(F("Green..."));
  for (int i = 0; i < 3; i++){
    digitalWrite(LEDGREEN, HIGH);
    delay(200);
    digitalWrite(LEDGREEN, LOW);
    delay(200);
  }
  Serial.print(F("Yellow..."));
  for (int i = 0; i < 3; i++){
    digitalWrite(LEDYELLOW, HIGH);
    delay(200);
    digitalWrite(LEDYELLOW, LOW);
    delay(200);
  }
  Serial.print(F("Red..."));
  for (int i = 0; i < 3; i++){
    digitalWrite(LEDRED, HIGH);
    delay(200);
    digitalWrite(LEDRED, LOW);
    delay(200);
  }
}

// buttons are inputs. test if they are pressed
void testButtons(){
  if(digitalRead(PUSHONE) == LOW && !pushOnePressed){
    pushOnePressed = true;
    Serial.println(F("Button 1 pressed!"));
    digitalWrite(LEDGREEN, HIGH);
  }
  if(digitalRead(PUSHTWO) == LOW && !pushTwoPressed){
    pushTwoPressed = true;
    Serial.println(F("Button 2 pressed!"));
    digitalWrite(LEDYELLOW, HIGH);
  }
  if(digitalRead(PUSHONE) == HIGH && pushOnePressed){
    pushOnePressed = false;
    Serial.println(F("Button 1 released!"));
    digitalWrite(LEDGREEN, LOW);
  }
  if(digitalRead(PUSHTWO) == HIGH && pushTwoPressed){
    pushTwoPressed = false;
    Serial.println(F("Button 2 released!"));
    digitalWrite(LEDYELLOW, LOW);
  }
  delay(200);
}


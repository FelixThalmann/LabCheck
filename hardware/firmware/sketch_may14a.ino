#define MAGNETIC 0
#define SIGNALLED 2
#define SPEAKER 4

const int timeout = 20000;
char menuOption = 0;
long time0;
bool sensorToggle = 0;

int song[3] = {50,60,70};
int songCounter = 0;

int melody[] = {
  262, 330, 392, 523, 440, 392, 330, 262,  0,   // Takt 1
  262, 330, 392, 523, 440, 392, 330, 262,  0,   // Takt 2
  392, 523, 659, 784, 659, 523, 392,   0,        // Takt 3
  392, 523, 659, 784, 659, 523, 392,   0,        // Takt 4
  523, 659, 784,1046, 784, 659, 523,   0,        // Takt 5
  392, 523, 659, 784, 659, 523, 392,   0,        // Takt 6
  262, 330, 392, 523, 440, 392, 330, 262,  0     // Takt 7 (endet ~30 s)
};
int noteDuration = 75;
int melodyCounter = 0;

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
  while(!Serial);

  pinMode(MAGNETIC, INPUT_PULLUP);
  pinMode(SIGNALLED, OUTPUT);
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
      songCounter = (songCounter+1)%3;
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
    tone(SPEAKER, melody[melodyCounter]);
    melodyCounter = (melodyCounter + 1) % 59;
    delay(noteDuration);
  }

  if (Serial.available()){
    char c = Serial.read();
    if (c == 'c'){
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
  Serial.println(F("(menu) sende etwas Anderes oder druecke den Board Reset Knopf\n"));
  while(!Serial.available());

  // Read data from serial monitor if received
  while(Serial.available()){
    char c = Serial.read();
    if(isAlphaNumeric(c)){
      if(c == '1'){
        Serial.println(F("Teste nun 'Magnetischer Tuer Sensor Set'."));
      } else if (c == '2'){
        Serial.println("Spiele nun Tales Song...");
      } else {
        Serial.println(F("Ungueltiger Input!"));
        return 0;
      }
      time0 = millis();
      return c;
    }
  }
}

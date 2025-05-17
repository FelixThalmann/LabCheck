const int speakerPin = 2;

void setup(){
  //pinMode(2, OUTPUT);
}

void loop(){
  tone(speakerPin, 1000);
  delay(500);
  noTone(speakerPin);
  delay(500);
}
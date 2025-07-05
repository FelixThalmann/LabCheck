#include "Speaker.h"

Speaker::Speaker() :
    alertToneIndex(0),
    isPlaying(false),
    lastNoteTime(0) {}

void Speaker::begin() {
    pinMode(SPEAKER, OUTPUT);
    // Initial test tone
    tone(SPEAKER, 100, 10);
    delay(15);
    noTone(SPEAKER);
}

void Speaker::playSuccess(){
    tone(SPEAKER, 800, 50);
    tone(SPEAKER, 1050, 100);
    noTone(SPEAKER);
}

void Speaker::playAlert() {
    tone(SPEAKER, 659, 150);
    delay(100);
    tone(SPEAKER, 784, 150);
    delay(100);
    tone(SPEAKER, 1318, 150);
    delay(100);
    tone(SPEAKER, 1046, 500);
    noTone(SPEAKER);
}

void Speaker::playFailure(){
    tone(SPEAKER, 800, 50);
    tone(SPEAKER, 200, 100);
    noTone(SPEAKER);
}

void Speaker::stop() {
    isPlaying = false;
    noTone(SPEAKER);
}

void Speaker::update() {
    if (!isPlaying) {
        return;
    }

    unsigned long currentTime = millis();
    
    // Only update if enough time has passed since the last note
    if (currentTime - lastNoteTime < noteDuration) {
        return;
    }
    
    if (alertToneIndex >= ALERT_SEQUENCE_LENGTH) {
            alertToneIndex = 0;
        }
        
    int note = alertTones[alertToneIndex];
    if (note == 0) {
        noTone(SPEAKER);
    } else {
        tone(SPEAKER, note);
    }
    alertToneIndex++;
    
    lastNoteTime = currentTime;
}

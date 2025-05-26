#ifndef SPEAKER_H
#define SPEAKER_H

#include <Arduino.h>
#include "PinConfig.h"

class Speaker {
public:
    Speaker();
    
    // Initialize speaker
    void begin();

    // Play success tone
    void playSuccess();
    
    // Play alert tone sequence
    void playAlert();

    // Play failure tone
    void playFailure();
    
    // Play the Tales song
    void playTalesSong();
    
    // Stop any playing sound
    void stop();
    
    // Update function to handle continuous playback
    void update();
    
private:
    // Alert tone sequence
    static const int ALERT_SEQUENCE_LENGTH = 6;
    const int alertTones[ALERT_SEQUENCE_LENGTH] = {1209, 0, 1209, 0, 0, 0};
    int alertToneIndex;
    
    // Tales song sequence
    static const int TALES_SEQUENCE_LENGTH = 59;
    const int talesMelody[TALES_SEQUENCE_LENGTH] = {
        262, 330, 392, 523, 440, 392, 330, 262, 392,   // Takt 1
        262, 330, 392, 523, 440, 392, 330, 262, 392,   // Takt 2
        392, 523, 659, 784, 659, 523, 392, 262,        // Takt 3
        392, 523, 659, 784, 659, 523, 392, 262,        // Takt 4
        523, 659, 784,1046, 784, 659, 523, 659,        // Takt 5
        392, 523, 659, 784, 659, 523, 392, 262,        // Takt 6
        262, 330, 392, 523, 440, 392, 330, 262, 0      // Takt 7
    };
    int talesMelodyIndex;
    
    // Playback control
    bool isPlaying;
    bool isPlayingTalesSong;
    const int noteDuration = 75;
    unsigned long lastNoteTime;
};

#endif // SPEAKER_H

/**
 * @file Speaker.h
 * @brief Audio feedback system for LabCheck entrance detection
 * 
 * Manages speaker/buzzer output for various system events including
 * success tones, alert sequences, and special melodies.
 */

#ifndef SPEAKER_H
#define SPEAKER_H

#include <Arduino.h>
#include "PinConfig.h"

/**
 * @class Speaker
 * @brief Controls audio feedback via speaker/buzzer
 * 
 * Provides different audio patterns for system feedback:
 * - Success tones for confirmed detections
 * - Alert sequences for sensor activations
 * - Failure tones for error conditions
 * - Special melodies for entertainment
 */
class Speaker {
public:
    Speaker();
    
    /**
     * @brief Initialize speaker pin
     */
    void begin();

    /**
     * @brief Play success confirmation tone
     */
    void playSuccess();
    
    /**
     * @brief Play repeating alert tone sequence
     */
    void playAlert();

    /**
     * @brief Play failure/error tone
     */
    void playFailure();
    
    /**
     * @brief Play the Tales of Symphonia melody
     */
    void playTalesSong();
    
    /**
     * @brief Stop any currently playing sound
     */
    void stop();
    
    /**
     * @brief Update function for continuous playback management
     * Must be called regularly for multi-tone sequences
     */
    void update();
    
private:
    // Alert tone sequence configuration
    static const int ALERT_SEQUENCE_LENGTH = 6;
    const int alertTones[ALERT_SEQUENCE_LENGTH] = {1209, 0, 1209, 0, 0, 0};
    int alertToneIndex;                     ///< Current position in alert sequence
    
    // Tales melody configuration
    static const int TALES_SEQUENCE_LENGTH = 59;
    const int talesMelody[TALES_SEQUENCE_LENGTH] = {
        262, 330, 392, 523, 440, 392, 330, 262, 392,   // Measure 1
        262, 330, 392, 523, 440, 392, 330, 262, 392,   // Measure 2
        392, 523, 659, 784, 659, 523, 392, 262,        // Measure 3
        392, 523, 659, 784, 659, 523, 392, 262,        // Measure 4
        523, 659, 784,1046, 784, 659, 523, 659,        // Measure 5
        392, 523, 659, 784, 659, 523, 392, 262,        // Measure 6
        262, 330, 392, 523, 440, 392, 330, 262, 0      // Measure 7
    };
    int talesMelodyIndex;                   ///< Current position in Tales melody
    
    // Playback control
    bool isPlaying;
    bool isPlayingTalesSong;
    const int noteDuration = 75;
    unsigned long lastNoteTime;
};

#endif // SPEAKER_H

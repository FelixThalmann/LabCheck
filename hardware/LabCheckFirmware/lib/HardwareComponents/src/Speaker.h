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
    
    // Playback control
    bool isPlaying;
    const int noteDuration = 75;
    unsigned long lastNoteTime;
};

#endif // SPEAKER_H

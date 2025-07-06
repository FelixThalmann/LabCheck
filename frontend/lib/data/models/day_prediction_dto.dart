/// Data transfer object representing daily occupancy predictions.
///
/// Contains a list of predictions for different times throughout the day
/// and the timestamp of when the predictions were last updated.
class DayPredictionDto {
  /// List of occupancy predictions for different time slots
  final List<Prediction> predictions;
  
  /// Timestamp when predictions were last updated
  final DateTime lastUpdated;

  DayPredictionDto({required this.predictions, required this.lastUpdated});

  /// Creates a DayPredictionDto instance from JSON data.
  factory DayPredictionDto.fromJson(Map<String, dynamic> json) {
    return DayPredictionDto(
      predictions:
          (json['predictions'] as List)
              .map((p) => Prediction.fromJson(p as Map<String, dynamic>))
              .toList(),
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  /// Converts the DayPredictionDto to JSON format.
  Map<String, dynamic> toJson() {
    return {
      'predictions': predictions.map((p) => p.toJson()).toList(),
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

/// Represents a single occupancy prediction for a specific time slot.
///
/// Contains predicted occupancy level and color indicator for a given time.
class Prediction {
  /// Predicted number of people at this time
  final int occupancy;
  
  /// Time slot (e.g., "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM")
  final String time;

  /// Color indicator for occupancy level (green, yellow, red)
  final String color;

  Prediction({
    required this.occupancy,
    required this.time,
    required this.color,
  });

  /// Creates a Prediction instance from JSON data.
  factory Prediction.fromJson(Map<String, dynamic> json) {
    return Prediction(
      occupancy: json['occupancy'] as int,
      time: json['time'] as String,
      color: json['color'] as String,
    );
  }

  /// Converts the Prediction to JSON format.
  Map<String, dynamic> toJson() {
    return {'occupancy': occupancy, 'time': time, 'color': color};
  }
}

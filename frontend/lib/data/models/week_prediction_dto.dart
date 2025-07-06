/// Data transfer object representing weekly occupancy predictions.
///
/// Contains predictions for both the current week and next week,
/// along with the timestamp of when predictions were last updated.
class WeekPredictionDto {
  /// Predictions for the current week
  final List<WeekPrediction> currentWeek;
  
  /// Predictions for the next week
  final List<WeekPrediction> nextWeek;
  
  /// Timestamp when predictions were last updated
  final DateTime lastUpdated;

  WeekPredictionDto({
    required this.currentWeek,
    required this.nextWeek,
    required this.lastUpdated,
  });

  /// Creates a WeekPredictionDto instance from JSON data.
  factory WeekPredictionDto.fromJson(Map<String, dynamic> json) {
    return WeekPredictionDto(
      currentWeek:
          (json['currentWeek'] as List?)
              ?.map((p) => WeekPrediction.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      nextWeek:
          (json['nextWeek'] as List?)
              ?.map((p) => WeekPrediction.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  /// Converts the WeekPredictionDto to JSON format.
  Map<String, dynamic> toJson() {
    return {
      'currentWeek': currentWeek.map((p) => p.toJson()).toList(),
      'nextWeek': nextWeek.map((p) => p.toJson()).toList(),
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

/// Represents a single weekly occupancy prediction for a specific day.
///
/// Contains predicted occupancy level and color indicator for a given weekday.
class WeekPrediction {
  /// Predicted number of people on this day
  final int occupancy;
  
  /// Day of the week (Mon, Tue, Wed, Thu, Fri)
  final String day;

  /// Color indicator for occupancy level (green, yellow, red)
  final String color;

  /// Optional date field for extended predictions
  final String? date;

  WeekPrediction({
    required this.occupancy,
    required this.day,
    required this.color,
    this.date,
  });

  /// Creates a WeekPrediction instance from JSON data.
  factory WeekPrediction.fromJson(Map<String, dynamic> json) {
    return WeekPrediction(
      occupancy: json['occupancy'] as int,
      day: json['day'] as String,
      color: json['color'] as String,
      date: json['date'] as String?,
    );
  }

  /// Converts the WeekPrediction to JSON format.
  Map<String, dynamic> toJson() {
    final result = <String, dynamic>{
      'occupancy': occupancy,
      'day': day,
      'color': color,
    };
    if (date != null) {
      result['date'] = date;
    }
    return result;
  }
}

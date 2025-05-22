class WeekPredictionDto {
  final List<WeekPrediction> predictions;
  final DateTime lastUpdated;

  WeekPredictionDto({required this.predictions, required this.lastUpdated});

  factory WeekPredictionDto.fromJson(Map<String, dynamic> json) {
    return WeekPredictionDto(
      predictions:
          (json['predictions'] as List)
              .map((p) => WeekPrediction.fromJson(p as Map<String, dynamic>))
              .toList(),
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'predictions': predictions.map((p) => p.toJson()).toList(),
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

class WeekPrediction {
  final int occupancy;
  final String day; // Mon, Tue, Wed, Thu, Fri
  final String color; // green, yellow, red

  WeekPrediction({
    required this.occupancy,
    required this.day,
    required this.color,
  });

  factory WeekPrediction.fromJson(Map<String, dynamic> json) {
    return WeekPrediction(
      occupancy: json['occupancy'] as int,
      day: json['day'] as String,
      color: json['color'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {'occupancy': occupancy, 'day': day, 'color': color};
  }
}

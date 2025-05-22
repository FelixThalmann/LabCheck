class DayPredictionDto {
  final List<Prediction> predictions;
  final DateTime lastUpdated;

  DayPredictionDto({required this.predictions, required this.lastUpdated});

  factory DayPredictionDto.fromJson(Map<String, dynamic> json) {
    return DayPredictionDto(
      predictions:
          (json['predictions'] as List)
              .map((p) => Prediction.fromJson(p as Map<String, dynamic>))
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

class Prediction {
  final int occupancy;
  final String time; // 8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM
  final String color; // green, yellow, red

  Prediction({
    required this.occupancy,
    required this.time,
    required this.color,
  });

  factory Prediction.fromJson(Map<String, dynamic> json) {
    return Prediction(
      occupancy: json['occupancy'] as int,
      time: json['time'] as String,
      color: json['color'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {'occupancy': occupancy, 'time': time, 'color': color};
  }
}

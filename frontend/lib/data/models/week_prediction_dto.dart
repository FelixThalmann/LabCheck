class WeekPredictionDto {
  final List<WeekPrediction> currentWeek;
  final List<WeekPrediction> nextWeek;
  final DateTime lastUpdated;

  WeekPredictionDto({
    required this.currentWeek,
    required this.nextWeek,
    required this.lastUpdated,
  });

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

  Map<String, dynamic> toJson() {
    return {
      'currentWeek': currentWeek.map((p) => p.toJson()).toList(),
      'nextWeek': nextWeek.map((p) => p.toJson()).toList(),
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

class WeekPrediction {
  final int occupancy;
  final String day; // Mon, Tue, Wed, Thu, Fri
  final String color; // green, yellow, red
  final String? date; // Optional date field for extended predictions

  WeekPrediction({
    required this.occupancy,
    required this.day,
    required this.color,
    this.date,
  });

  factory WeekPrediction.fromJson(Map<String, dynamic> json) {
    return WeekPrediction(
      occupancy: json['occupancy'] as int,
      day: json['day'] as String,
      color: json['color'] as String,
      date: json['date'] as String?,
    );
  }

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

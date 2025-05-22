class DayPredictionDto {
  final int occupancy;
  final String time; // 8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM
  final String color; // green, yellow, red
  final DateTime lastUpdated;

  DayPredictionDto({
    required this.occupancy,
    required this.time,
    required this.color,
    required this.lastUpdated,
  });

  // Factory-Konstruktor für die Erstellung aus JSON
  factory DayPredictionDto.fromJson(Map<String, dynamic> json) {
    return DayPredictionDto(
      occupancy: json['occupancy'] as int,
      time: json['time'] as String,
      color: json['color'] as String,
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  // Methode zum Konvertieren in JSON
  Map<String, dynamic> toJson() {
    return {
      'occupancy': occupancy,
      'time': time,
      'color': color,
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

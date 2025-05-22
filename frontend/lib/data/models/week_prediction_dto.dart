class WeekPredictionDto {
  final int occupancy;
  final String day; // Mon, Tue, Wed, Thu, Fri
  final String color; // green, yellow, red
  final DateTime lastUpdated;

  WeekPredictionDto({
    required this.occupancy,
    required this.day,
    required this.color,
    required this.lastUpdated,
  });

  // Factory-Konstruktor für die Erstellung aus JSON
  factory WeekPredictionDto.fromJson(Map<String, dynamic> json) {
    return WeekPredictionDto(
      occupancy: json['occupancy'] as int,
      day: json['day'] as String,
      color: json['color'] as String,
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  // Methode zum Konvertieren in JSON
  Map<String, dynamic> toJson() {
    return {
      'occupancy': occupancy,
      'day': day,
      'color': color,
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

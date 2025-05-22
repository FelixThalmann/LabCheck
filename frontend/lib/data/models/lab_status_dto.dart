class LabStatusDto {
  final bool isOpen;
  final int currentOccupancy;
  final int maxOccupancy;
  final DateTime date;
  final DateTime lastUpdated;

  LabStatusDto({
    required this.isOpen,
    required this.currentOccupancy,
    required this.maxOccupancy,
    required this.lastUpdated,
    required this.date,
  });

  // Factory-Konstruktor für die Erstellung aus JSON
  factory LabStatusDto.fromJson(Map<String, dynamic> json) {
    return LabStatusDto(
      isOpen: json['isOpen'] as bool,
      currentOccupancy: json['currentOccupancy'] as int,
      maxOccupancy: json['maxOccupancy'] as int,
      date: DateTime.parse(json['date'] as String),
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  // Methode zum Konvertieren in JSON
  Map<String, dynamic> toJson() {
    return {
      'isOpen': isOpen,
      'currentOccupancy': currentOccupancy,
      'maxOccupancy': maxOccupancy,
      'date': date.toIso8601String(),
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

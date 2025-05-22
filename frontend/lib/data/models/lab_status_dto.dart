class LabStatusDto {
  final bool isOpen;
  final int currentOccupancy;
  final int maxOccupancy;
  final DateTime currentDate;
  final DateTime lastUpdated;

  LabStatusDto({
    required this.isOpen,
    required this.currentOccupancy,
    required this.maxOccupancy,
    required this.lastUpdated,
    required this.currentDate,
  });

  // Factory-Konstruktor für die Erstellung aus JSON
  factory LabStatusDto.fromJson(Map<String, dynamic> json) {
    return LabStatusDto(
      isOpen: json['isOpen'] as bool,
      currentOccupancy: json['currentOccupancy'] as int,
      maxOccupancy: json['maxOccupancy'] as int,
      currentDate: DateTime.parse(json['currentDate'] as String),
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  // Methode zum Konvertieren in JSON
  Map<String, dynamic> toJson() {
    return {
      'isOpen': isOpen,
      'currentOccupancy': currentOccupancy,
      'maxOccupancy': maxOccupancy,
      'date': currentDate.toIso8601String(),
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

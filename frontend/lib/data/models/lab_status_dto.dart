class LabStatusDto {
  final bool isOpen;
  final int currentOccupancy;
  final int maxOccupancy;
  final String color;
  final DateTime currentDate;
  final DateTime lastUpdated;

  LabStatusDto({
    required this.isOpen,
    required this.currentOccupancy,
    required this.maxOccupancy,
    required this.color,
    required this.lastUpdated,
    required this.currentDate,
  });

  // Factory constructor for creating from JSON
  factory LabStatusDto.fromJson(Map<String, dynamic> json) {
    return LabStatusDto(
      isOpen: json['isOpen'] as bool,
      currentOccupancy: json['currentOccupancy'] as int,
      maxOccupancy: json['maxOccupancy'] as int,
      color: json['color'] as String,
      currentDate: DateTime.parse(json['currentDate'] as String),
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  // Method to convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'isOpen': isOpen,
      'currentOccupancy': currentOccupancy,
      'maxOccupancy': maxOccupancy,
      'color': color,
      'currentDate': currentDate.toIso8601String(),
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}

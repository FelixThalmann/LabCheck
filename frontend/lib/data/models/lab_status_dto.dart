/// Data transfer object representing the current status of a laboratory.
///
/// Contains information about occupancy, availability, and last update timestamps.
class LabStatusDto {
  /// Whether the lab is currently open
  final bool isOpen;
  
  /// Current number of people in the lab
  final int currentOccupancy;
  
  /// Maximum capacity of the lab
  final int maxOccupancy;
  
  /// Color indicator for the lab status (e.g., "green", "yellow", "red")
  final String color;
  
  /// Current date and time
  final DateTime currentDate;
  
  /// Timestamp of the last status update
  final DateTime lastUpdated;

  LabStatusDto({
    required this.isOpen,
    required this.currentOccupancy,
    required this.maxOccupancy,
    required this.color,
    required this.lastUpdated,
    required this.currentDate,
  });

  /// Creates a LabStatusDto instance from JSON data.
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

  /// Converts the LabStatusDto to JSON format.
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

import 'package:flutter/material.dart';

/// Application theme configuration for LabCheck.
///
/// Defines the visual styling and appearance of the app.
class AppTheme {
  /// Light theme configuration for the application.
  ///
  /// Uses Material 3 design system with blue color scheme and centered app bar.
  static ThemeData get lightTheme {
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      useMaterial3: true,
      appBarTheme: const AppBarTheme(centerTitle: true, elevation: 0),
    );
  }
}

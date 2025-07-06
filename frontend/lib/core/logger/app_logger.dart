import 'package:logging/logging.dart';

/// Application logging utility for LabCheck.
///
/// Provides centralized logging functionality with different log levels:
/// - fine(): detailed debug information
/// - info(): general information
/// - warning(): warnings
/// - severe(): errors
class AppLogger {
  /// Initializes the logging system.
  ///
  /// Sets up root logger to capture all log levels and prints them to console.
  static void init() {
    Logger.root.level = Level.ALL;
    Logger.root.onRecord.listen((record) {
      // ignore: avoid_print
      print('${record.level.name}: ${record.time}: ${record.message}');
    });
  }
}

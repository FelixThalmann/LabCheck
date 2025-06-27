import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:logging/logging.dart';

class EnvironmentConfig {
  static bool _initialized = false;
  static final _logger = Logger('EnvironmentConfig');

  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      await dotenv.load(fileName: "assets/.env");
      if (kDebugMode) {
        _logger.info('✅ .env loaded from project root');
      }
    } catch (e) {
      _logger.warning('⚠️ No .env file found. Using default values.');

      dotenv.testLoad(
        fileInput: '''
DEV_API_BASE_URL=http://localhost:8080/api
ENVIRONMENT=development
''',
      );
    }

    _initialized = true;
  }

  /// Base URL für die API
  static String get apiBaseUrl {
    return dotenv.env['DEV_API_BASE_URL'] ?? 'http://localhost:8080/api';
  }

  /// Aktuelle Umgebung (development, staging, production)
  static String get environment {
    return dotenv.env['ENVIRONMENT'] ?? 'development';
  }

  static bool get isDemoMode {
    return dotenv.env['DEMO_MODE'] == 'true';
  }

  static String get apiKey {
    return dotenv.env['STATIC_API_KEY'] ?? '0000000000';
  }

  /// Alle verfügbaren Umgebungsvariablen ausgeben (nur im Debug-Modus)
  static void printAllVariables() {
    if (!kDebugMode) return;

    _logger.info('🔧 Current environment configuration:');
    _logger.info('  Environment: $environment');
    _logger.info('  API Base URL: $apiBaseUrl');
    _logger.info('  API Key: $apiKey'); // TODO: Hide the key in the log

    if (dotenv.env.isNotEmpty) {
      _logger.info('📝 All available variables:');
      dotenv.env.forEach((key, value) {
        // Sensible Daten maskieren
        final maskedValue =
            key.toLowerCase().contains('password') ||
                    key.toLowerCase().contains('secret') ||
                    key.toLowerCase().contains('key')
                ? '*' * value.length
                : value;
        _logger.info('    $key = $maskedValue');
      });
    }
  }
}

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:logging/logging.dart';

/// Manages environment configuration for the LabCheck application.
///
/// Handles loading of environment variables from .env files and provides
/// centralized access to configuration values like API URLs and environment settings.
class EnvironmentConfig {
  static bool _initialized = false;
  static final _logger = Logger('EnvironmentConfig');

  /// Initializes the environment configuration by loading .env file.
  ///
  /// Falls back to default values if no .env file is found.
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

  /// Base URL for the API endpoints
  static String get apiBaseUrl {
    return dotenv.env['DEV_API_BASE_URL'] ?? 'http://localhost:8080/api';
  }

  /// Current environment (development, staging, production)
  static String get environment {
    return dotenv.env['ENVIRONMENT'] ?? 'development';
  }

  /// Whether the app is running in demo mode
  static bool get isDemoMode {
    return dotenv.env['DEMO_MODE'] == 'true';
  }

  /// API key for authentication
  static String get apiKey {
    return dotenv.env['STATIC_API_KEY'] ?? '0000000000';
  }

  /// Prints all available environment variables (debug mode only)
  ///
  /// Masks sensitive data like passwords, secrets, and keys for security.
  static void printAllVariables() {
    if (!kDebugMode) return;

    _logger.info('🔧 Current environment configuration:');
    _logger.info('  Environment: $environment');
    _logger.info('  API Base URL: $apiBaseUrl');
    // _logger.info('  API Key: $apiKey');

    if (dotenv.env.isNotEmpty) {
      _logger.info('📝 All available variables:');
      dotenv.env.forEach((key, value) {
        // Mask sensitive data
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

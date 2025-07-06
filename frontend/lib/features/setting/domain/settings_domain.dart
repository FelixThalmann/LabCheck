import 'package:labcheck/data/services/api_service.dart';
import 'package:logging/logging.dart';

/// Domain layer for the settings feature of LabCheck.
///
/// Handles authentication and configuration operations including capacity
/// management and entrance direction settings. All operations require
/// password authentication.
class SettingsDomain {
  final _logger = Logger('SettingsDomain');

  /// Authenticates the user with the provided password.
  ///
  /// Returns a map with 'success' boolean or 'error' exception.
  /// Used to verify access to settings functionality.
  Future<Map<String, dynamic>> authenticate(String password) async {
    Map<String, dynamic> result = {};

    try {
      final response = await ApiService().post('/api/lab/login', {
        'password': password,
      });

      result['success'] = response['success'] ?? false;
    } catch (e) {
      _logger.warning('Failed to authenticate: $e');
      result['error'] = e as Exception;
    }

    return result;
  }

  /// Validates and saves the maximum lab capacity setting.
  ///
  /// Validates that the input is a positive integer before sending to API.
  /// Returns a map with 'success' boolean or 'error' message/exception.
  Future<Map<String, dynamic>> validateAndSaveSeats(
    String seatsText,
    String password,
  ) async {
    Map<String, dynamic> result = {};
    final seats = int.tryParse(seatsText);

    if (seats == null || seats <= 0) {
      result['error'] = 'Please enter a valid number';
      return result;
    }

    try {
      final response = await ApiService().post('/api/lab/capacity', {
        'capacity': seats,
        'password': password,
      });

      result['success'] = response['success'] ?? false;
    } catch (e) {
      _logger.warning('Failed to save seats: $e');
      result['error'] = e as Exception;
    }

    return result;
  }

  /// Sets the current lab capacity (number of people currently in the lab).
  ///
  /// Validates that the input is a non-negative integer before sending to API.
  /// Returns a map with 'success' boolean or 'error' message/exception.
  Future<Map<String, dynamic>> setCurrentCapacity(
    String seatsText,
    String password,
  ) async {
    Map<String, dynamic> result = {};
    final seats = int.tryParse(seatsText);

    if (seats == null || seats < 0) {
      result['error'] = 'Please enter a valid number';
      return result;
    }

    try {
      final response = await ApiService().post('/api/lab/current-capacity', {
        'capacity': seats,
        'password': password,
      });

      result['success'] = response['success'] ?? false;
    } catch (e) {
      _logger.warning('Failed to set current capacity: $e');
      result['error'] = e as Exception;
    }

    return result;
  }

  /// Sets the entrance direction for the lab.
  ///
  /// Toggles the entrance direction setting on the backend.
  /// Returns a map with 'success' boolean or 'error' exception.
  Future<Map<String, dynamic>> setEntranceDirection(String password) async {
    Map<String, dynamic> result = {};

    try {
      final response = await ApiService().post('/api/lab/entrance-direction', {
        'password': password,
      });

      result['success'] = response['success'] ?? false;
    } catch (e) {
      _logger.warning('Failed to set entrance direction: $e');
      result['error'] = e as Exception;
    }

    return result;
  }
}

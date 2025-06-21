import 'package:labcheck/data/services/api_service.dart';
import 'package:logging/logging.dart';

class SettingsDomain {
  final _logger = Logger('SettingsDomain');

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
}

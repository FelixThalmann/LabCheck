import 'package:labcheck/data/services/api_service.dart';

class SettingsDomain {
  Future<bool> authenticate(String password) async {
    final response = await ApiService().post('/api/lab/login', {
      'password': password,
    });

    return response['success'] ?? false;
  }

  bool validateAndSaveSeats(String seatsText) {
    final seats = int.tryParse(seatsText);
    return seats != null && seats > 0;
  }
}

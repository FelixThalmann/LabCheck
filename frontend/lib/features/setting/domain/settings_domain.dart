class SettingsDomain {
  bool authenticate(String password) {
    // TODO: Implement actual password verification (check with backend)
    return password == 'admin123';
  }

  bool validateAndSaveSeats(String seatsText) {
    final seats = int.tryParse(seatsText);
    return seats != null && seats > 0;
  }
}

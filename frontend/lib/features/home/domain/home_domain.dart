import 'package:flutter/material.dart';

class HomeDomain {
  Future<void> refreshData() async {
    // TODO: load data from API
    await Future.delayed(const Duration(seconds: 2));
  }
}

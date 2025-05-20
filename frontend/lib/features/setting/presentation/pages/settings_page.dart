import 'package:flutter/material.dart';
import 'package:labcheck/core/theme/app_colors.dart';
import 'package:labcheck/shared/widgets/header_widget.dart';
import 'package:labcheck/features/setting/presentation/widgets/password_input_widget.dart';
import 'package:labcheck/features/setting/presentation/widgets/seats_input_widget.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _seatsController = TextEditingController();
  bool _isAuthenticated = false;
  String _errorMessage = '';

  void _authenticate() {
    // TODO: Implement actual password verification (check with backend)
    if (_passwordController.text == 'admin123') {
      setState(() {
        _isAuthenticated = true;
        _errorMessage = '';
      });
    } else {
      setState(() {
        _errorMessage = 'Wrong password';
      });
    }
  }

  void _saveSeats() {
    // TODO: Implement saving seats
    final seats = int.tryParse(_seatsController.text);
    if (seats != null && seats > 0) {
      // Save seats
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Number of seats has been saved',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: MediaQuery.of(context).size.width * 0.035,
            ),
          ),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Please enter a valid number',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: MediaQuery.of(context).size.width * 0.035,
            ),
          ),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _seatsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final iconSize = screenWidth * 0.06;

    return Scaffold(
      body: Container(
        width: screenWidth,
        height: screenHeight,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment(0.50, -0.00),
            end: Alignment(0.50, 1.00),
            colors: [AppColors.primary, Color(0xFF88B8DE), Colors.white],
          ),
        ),
        child: Stack(
          children: [
            Column(
              children: [
                Padding(
                  padding: EdgeInsets.only(top: screenHeight * 0.05),
                  child: const HeaderWidget(title: 'Settings'),
                ),
                Padding(
                  padding: EdgeInsets.only(top: screenHeight * 0.01),
                  child: Container(
                    width: screenWidth,
                    constraints: BoxConstraints(maxWidth: 600),
                    child:
                        _isAuthenticated
                            ? SeatsInputWidget(
                              controller: _seatsController,
                              onSave: _saveSeats,
                            )
                            : PasswordInputWidget(
                              controller: _passwordController,
                              errorMessage: _errorMessage,
                              onConfirm: _authenticate,
                            ),
                  ),
                ),
              ],
            ),
            Positioned(
              top: screenHeight * 0.05,
              left: 20,
              child: IconButton(
                icon: Icon(
                  Icons.arrow_back,
                  color: Colors.black,
                  size: iconSize,
                ),
                onPressed: () {
                  Navigator.pop(context);
                },
              ),
            ),
            Positioned(
              top: screenHeight * 0.05,
              right: 20,
              child: IconButton(
                icon: const Icon(Icons.info, color: Colors.black, size: 24),
                onPressed: () {
                  Navigator.pushNamed(context, '/about');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

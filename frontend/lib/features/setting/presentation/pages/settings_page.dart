import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:labcheck/core/theme/app_colors.dart';
import 'package:labcheck/shared/widgets/header_widget.dart';
import 'package:labcheck/features/setting/presentation/widgets/password_input_widget.dart';
import 'package:labcheck/features/setting/presentation/widgets/settings_container_widget.dart';
import 'package:labcheck/features/setting/domain/settings_domain.dart';
import 'package:labcheck/shared/utils/snackbar_utils.dart';
import 'package:labcheck/data/services/api_service.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _maxSeatsController = TextEditingController();
  final TextEditingController _currentSeatsController = TextEditingController();
  final SettingsDomain _settingsDomain = SettingsDomain();
  bool _isAuthenticated = false;
  String _errorMessage = '';

  void _authenticate() async {
    final result = await _settingsDomain.authenticate(_passwordController.text);

    if (!mounted) {
      return; // check if the widget is still mounted (widget exists), to use the context
    }

    if (result.containsKey('error')) {
      final error = result['error'] as Exception;

      if (error is NetworkException) {
        SnackbarUtils.showNetworkError(context, error);
      } else if (error is ApiException) {
        if (error.type == ApiExceptionType.unauthorized) {
          SnackbarUtils.showAuthenticationError(context, error.message);
        } else {
          SnackbarUtils.showError(context, 'Server error: ${error.message}');
        }
      } else {
        SnackbarUtils.showError(context, 'An unexpected error occurred');
      }

      return;
    }

    if (result['success'] ?? false) {
      setState(() {
        _isAuthenticated = true;
        _errorMessage = '';
      });
    } else {
      // Haptic feedback for better user experience
      HapticFeedback.heavyImpact();
      setState(() {
        _errorMessage = 'Wrong password';
      });
    }
  }

  void _saveMaxSeats() async {
    final result = await _settingsDomain.validateAndSaveSeats(
      _maxSeatsController.text,
      _passwordController.text,
    );

    if (!mounted) {
      return; // check if the widget is still mounted (widget exists), to use the context
    }

    if (result.containsKey('error')) {
      final error = result['error'];
      
      if (error is Exception) {
        if (error is NetworkException) {
          SnackbarUtils.showNetworkError(context, error);
        } else if (error is ApiException) {
          if (error.type == ApiExceptionType.client) {
            SnackbarUtils.showError(context, error.message);
          } else {
            SnackbarUtils.showError(context, 'Server error: ${error.message}');
          }
        } else {
          SnackbarUtils.showError(context, 'An unexpected error occurred');
        }
      } else {
        SnackbarUtils.showError(context, error.toString());
      }
      return;
    }

    if (result['success'] ?? false) {
      SnackbarUtils.showSuccess(context, 'Maximum capacity has been saved');

      // Navigate back to home page and trigger refresh
      Navigator.pop(
        context,
        true,
      ); // true indicates that data should be refreshed
    }
  }

  void _saveCurrentSeats() async {
    final result = await _settingsDomain.setCurrentCapacity(
      _currentSeatsController.text,
      _passwordController.text,
    );

    if (!mounted) {
      return;
    }

    if (result.containsKey('error')) {
      final error = result['error'];
      
      if (error is Exception) {
        if (error is NetworkException) {
          SnackbarUtils.showNetworkError(context, error);
        } else if (error is ApiException) {
          if (error.type == ApiExceptionType.client) {
            SnackbarUtils.showError(context, error.message);
          } else {
            SnackbarUtils.showError(context, 'Server error: ${error.message}');
          }
        } else {
          SnackbarUtils.showError(context, 'An unexpected error occurred');
        }
      } else {
        SnackbarUtils.showError(context, error.toString());
      }
      return;
    }

    if (result['success'] ?? false) {
      SnackbarUtils.showSuccess(context, 'Current occupancy has been updated');

      // Navigate back to home page and trigger refresh
      Navigator.pop(
        context,
        true,
      ); // true indicates that data should be refreshed
    }
  }

  void _invertEntranceDirection() async {
    final result = await _settingsDomain.setEntranceDirection(
      _passwordController.text,
    );

    if (!mounted) {
      return;
    }

    if (result.containsKey('error')) {
      final error = result['error'] as Exception;

      if (error is NetworkException) {
        SnackbarUtils.showNetworkError(context, error);
      } else if (error is ApiException) {
        if (error.type == ApiExceptionType.client) {
          SnackbarUtils.showError(context, error.message);
        } else {
          SnackbarUtils.showError(context, 'Server error: ${error.message}');
        }
      } else {
        SnackbarUtils.showError(context, 'An unexpected error occurred');
      }
      return;
    }

    if (result['success'] ?? false) {
      SnackbarUtils.showSuccess(
        context,
        'Entrance direction has been inverted',
      );

      // Navigate back to home page and trigger refresh
      Navigator.pop(
        context,
        false,
      ); // false indicates that data should not be refreshed
    }
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _maxSeatsController.dispose();
    _currentSeatsController.dispose();
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
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(top: screenHeight * 0.01),
                    child: Container(
                      width: screenWidth,
                      constraints: BoxConstraints(maxWidth: 600),
                      child:
                          _isAuthenticated
                              ? SettingsContainerWidget(
                                maxSeatsController: _maxSeatsController,
                                currentSeatsController: _currentSeatsController,
                                onSaveMaxSeats: _saveMaxSeats,
                                onSaveCurrentSeats: _saveCurrentSeats,
                                onInvertDirection: _invertEntranceDirection,
                            )
                              : PasswordInputWidget(
                              controller: _passwordController,
                              errorMessage: _errorMessage,
                              onConfirm: _authenticate,
                            ),
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

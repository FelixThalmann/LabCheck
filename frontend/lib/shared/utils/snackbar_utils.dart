import 'package:flutter/material.dart';
import 'package:labcheck/core/theme/app_colors.dart';
import '../../data/services/api_service.dart';

/// Utility class for displaying various types of snackbar notifications.
///
/// Provides methods for showing error, success, warning, and network error
/// messages with consistent styling and appropriate icons.
class SnackbarUtils {
  /// Shows an error snackbar with red background and error icon.
  ///
  /// Displays the given error message for 4 seconds with an "OK" action button.
  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: MediaQuery.of(context).size.width * 0.035,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.red.shade600,
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: const EdgeInsets.all(16),
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  /// Shows a network error snackbar with specific error type handling.
  ///
  /// Displays different messages and icons based on the network exception type.
  /// Shows for 5 seconds with a "Pull down to refresh" hint.
  static void showNetworkError(BuildContext context, NetworkException error) {
    String message;
    IconData icon;

    switch (error.type) {
      case NetworkExceptionType.unreachable:
        message = 'No internet connection available';
        icon = Icons.wifi_off;
        break;
      case NetworkExceptionType.serverUnavailable:
        message = 'Server is currently not reachable';
        icon = Icons.cloud_off;
        break;
      case NetworkExceptionType.connectionError:
      case NetworkExceptionType.clientError:
        message = 'Connection error occurred';
        icon = Icons.signal_wifi_connected_no_internet_4;
        break;
      case NetworkExceptionType.timeout:
        message = 'Connection interrupted - Timeout';
        icon = Icons.timer_off;
        break;
    }

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: MediaQuery.of(context).size.width * 0.035,
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Pull down to refresh',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: MediaQuery.of(context).size.width * 0.03,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: Colors.orange.shade600,
        duration: const Duration(seconds: 5),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: const EdgeInsets.all(16),
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  /// Shows a success snackbar with green background and check icon.
  ///
  /// Displays the given success message for 3 seconds.
  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              Icons.check_circle_outline,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: MediaQuery.of(context).size.width * 0.035,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.green.shade600,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  /// Shows a warning snackbar with orange background and warning icon.
  ///
  /// Displays the given warning message for 4 seconds.
  static void showWarning(BuildContext context, String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              Icons.warning_amber_outlined,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: MediaQuery.of(context).size.width * 0.035,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.orange.shade600,
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  /// Shows an authentication error snackbar with lock icon.
  ///
  /// Displays the given authentication error message for 4 seconds with an "OK" action.
  static void showAuthenticationError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.lock_outline, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: MediaQuery.of(context).size.width * 0.035,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.red.shade600,
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: const EdgeInsets.all(16),
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  /// Shows a subtle notification for real-time updates from WebSocket.
  ///
  /// Displays a brief notification with WiFi icon and "Live:" prefix for 2 seconds.
  static void showUpdateNotification(BuildContext context, String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.wifi, color: Colors.white, size: 16),
            SizedBox(width: 8),
            Text('Live: $message'),
          ],
        ),
        backgroundColor: AppColors.primary,
        duration: Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        margin: EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}

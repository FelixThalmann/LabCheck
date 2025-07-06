import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/theme/app_theme.dart';
import 'features/home/presentation/pages/home_page.dart';
import 'features/setting/presentation/pages/settings_page.dart';
import 'features/about/presentation/pages/about_page.dart';
import 'core/logger/app_logger.dart';
import 'core/config/environment_config.dart';

/// Main entry point for the LabCheck application.
///
/// Initializes the logger, environment configuration, and sets up the app
/// with portrait orientation only.
void main() async {
  AppLogger.init();
  WidgetsFlutterBinding.ensureInitialized();

  await EnvironmentConfig.initialize();
  EnvironmentConfig.printAllVariables();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const MyApp());
}

/// Root application widget for LabCheck.
///
/// Configures the MaterialApp with theme, routes, and initial home page.
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LabCheck',
      theme: AppTheme.lightTheme,
      home: const HomePage(),
      routes: {
        '/settings': (context) => const SettingsPage(),
        '/about': (context) => const AboutPage(),
      },
      debugShowCheckedModeBanner: false,
    );
  }
}

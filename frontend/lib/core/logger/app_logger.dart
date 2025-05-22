import 'package:logging/logging.dart';

/*
_logger.fine() - for detailed debug information
_logger.info() - for general information
_logger.warning() - for warnings
_logger.severe() - for errors
*/
class AppLogger {
  static void init() {
    Logger.root.level = Level.ALL;
    Logger.root.onRecord.listen((record) {
      // ignore: avoid_print
      print('${record.level.name}: ${record.time}: ${record.message}');
    });
  }
}

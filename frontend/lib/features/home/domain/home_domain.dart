import '../../../data/models/day_prediction_dto.dart';
import '../../../data/models/week_prediction_dto.dart';
import '../../../data/models/lab_status_dto.dart';
import '../../../data/services/api_service.dart';
import 'package:logging/logging.dart';
import '../../../core/config/environment_config.dart';

class HomeDomain {
  final _logger = Logger('HomeDomain');
  Exception? lastException;
  bool isDemoMode = EnvironmentConfig.isDemoMode;

  Future<LabStatusDto?> getLabStatus() async {
    try {
      final url = '/lab/status';
      final response = await ApiService().get(url);
      _logger.info('LabStatusDto: $response');
      return LabStatusDto.fromJson(response);
    } catch (e) {
      _logger.warning('Failed to fetch lab status from API: $e');
      lastException = e as Exception;
      if (isDemoMode) {
        // Fallback to Demo-Data if error
        return _getFallbackLabStatus();
      } else {
        return null;
      }
    }
  }

  Future<DayPredictionDto?> getDayPredictions() async {
    try {
      // TODO: Implementierung für echte API-Aufrufe wenn Backend verfügbar
      final url = '/lab/day-predictions';
      final response = await ApiService().get(url);
      _logger.info('DayPredictionDto: $response');
      return DayPredictionDto.fromJson(response);
    } catch (e) {
      _logger.warning('Failed to fetch day predictions from API: $e');
      lastException = e as Exception;
      if (isDemoMode) {
        // Fallback to Demo-Data if error
        return _getFallbackDayPredictions();
      } else {
        return null;
      }
    }
  }

  Future<WeekPredictionDto?> getWeekPredictions() async {
    try {
      // TODO: Implementierung für echte API-Aufrufe wenn Backend verfügbar
      final url = '/lab/week-predictions';
      final response = await ApiService().get(url);
      _logger.info('WeekPredictionDto: $response');
      return WeekPredictionDto.fromJson(response);
    } catch (e) {
      _logger.warning('Failed to fetch week predictions from API: $e');
      lastException = e as Exception;
      if (isDemoMode) {
        // Fallback to Demo-Data if error
        return _getFallbackWeekPredictions();
      } else {
        return null;
      }
    }
  }

  Future<Map<String, dynamic>> refreshData() async {
    Map<String, dynamic> result = {};
    result['labStatus'] = await getLabStatus();

    result['dayPredictions'] = await getDayPredictions();

    result['weekPredictions'] = await getWeekPredictions();

    // If an error occurred, add it to the results
    if (lastException != null) {
      result['error'] = lastException;
      lastException = null;
    }

    result['noData'] =
        result['labStatus'] == null ||
        result['dayPredictions'] == null ||
        result['weekPredictions'] == null;

    return result;
  }

  // Fallback for Demo-Data if error
  LabStatusDto _getFallbackLabStatus() {
    return LabStatusDto(
      isOpen: true,
      currentOccupancy: 1,
      maxOccupancy: 5,
      color: 'green',
      currentDate: DateTime.now(),
      lastUpdated: DateTime.now(),
    );
  }

  DayPredictionDto _getFallbackDayPredictions() {
    return DayPredictionDto(
      predictions: [
        Prediction(occupancy: 1, time: '8 AM', color: 'green'),
        Prediction(occupancy: 4, time: '10 AM', color: 'yellow'),
        Prediction(occupancy: 10, time: '12 PM', color: 'red'),
        Prediction(occupancy: 4, time: '2 PM', color: 'yellow'),
        Prediction(occupancy: 2, time: '4 PM', color: 'green'),
        Prediction(occupancy: 1, time: '6 PM', color: 'green'),
      ],
      lastUpdated: DateTime.now(),
    );
  }

  WeekPredictionDto _getFallbackWeekPredictions() {
    return WeekPredictionDto(
      predictions: [
        WeekPrediction(occupancy: 1, day: 'Mon', color: 'green'),
        WeekPrediction(occupancy: 4, day: 'Tue', color: 'yellow'),
        WeekPrediction(occupancy: 10, day: 'Wed', color: 'red'),
        WeekPrediction(occupancy: 4, day: 'Thu', color: 'yellow'),
        WeekPrediction(occupancy: 2, day: 'Fri', color: 'green'),
      ],
      lastUpdated: DateTime.now(),
    );
  }
}

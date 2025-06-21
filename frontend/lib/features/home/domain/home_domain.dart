import '../../../data/models/day_prediction_dto.dart';
import '../../../data/models/week_prediction_dto.dart';
import '../../../data/models/lab_status_dto.dart';
import '../../../data/services/api_service.dart';
import 'package:logging/logging.dart';
import '../../../core/config/environment_config.dart';
import '../../../data/services/websocket_service.dart';

class HomeDomain {
  final _logger = Logger('HomeDomain');
  final WebSocketService _webSocketService = WebSocketService();
  Exception? lastException;
  bool isDemoMode = EnvironmentConfig.isDemoMode;

  // Callback for WebSocket updates
  Function(LabStatusDto)? _onLabStatusUpdate;

  /// Initialize WebSocket connection and setup listeners
  void initializeWebSocket(Function(LabStatusDto) onLabStatusUpdate) {
    _onLabStatusUpdate = onLabStatusUpdate;

    _webSocketService.initialize();
    _webSocketService.onLabStatusUpdate((data) {
      _logger.info('Received WebSocket lab status update: $data');

      try {
        // Convert WebSocket data to LabStatusDto
        final labStatus = LabStatusDto.fromJson(data);
        _onLabStatusUpdate?.call(labStatus);
      } catch (e) {
        _logger.warning('Failed to parse WebSocket lab status data: $e');
      }
    });

    _webSocketService.onConnectionStatusChanged(() {
      _logger.info(
        'WebSocket connection status changed: ${_webSocketService.isConnected}',
      );
    });
  }

  /// Cleanup WebSocket connection
  void dispose() {
    _webSocketService.disconnect();
  }

  Future<LabStatusDto?> getLabStatus() async {
    try {
      final url = '/api/lab/status';
      final response = await ApiService().get(url);
      _logger.info('LabStatusDto: $response');
      return LabStatusDto.fromJson(response);
    } catch (e) {
      _logger.warning('Failed to fetch lab status from API: $e');
      lastException = e as Exception;
      if (isDemoMode) {
        _logger.info('Using demo data for lab status');
        // Fallback to Demo-Data if error
        return _getFallbackLabStatus();
      } else {
        return null;
      }
    }
  }

  Future<DayPredictionDto?> getDayPredictions() async {
    if (isDemoMode) {
      _logger.info('Using demo data for day predictions');
      // Fallback to Demo-Data if error
      return _getFallbackDayPredictions();
    } else {
      return null;
    }

    /*
    try {
      // TODO: Implementierung für echte API-Aufrufe wenn Backend verfügbar
      final url = '/api/lab/day-predictions';
      final response = await ApiService().get(url);
      _logger.info('DayPredictionDto: $response');
      return DayPredictionDto.fromJson(response);
    } catch (e) {
      _logger.warning('Failed to fetch day predictions from API: $e');
      lastException = e as Exception;
      if (isDemoMode) {
        _logger.info('Using demo data for day predictions');
        // Fallback to Demo-Data if error
        return _getFallbackDayPredictions();
      } else {
        return null;
      }
    }
    */
  }

  Future<WeekPredictionDto?> getWeekPredictions() async {
    if (isDemoMode) {
      _logger.info('Using demo data for week predictions');
      // Fallback to Demo-Data if error
      return _getFallbackWeekPredictions();
    } else {
      return null;
    }

    /*
    try {
      // TODO: Implementierung für echte API-Aufrufe wenn Backend verfügbar
      final url = '/api/lab/week-predictions';
      final response = await ApiService().get(url);
      _logger.info('WeekPredictionDto: $response');
      return WeekPredictionDto.fromJson(response);
    } catch (e) {
      _logger.warning('Failed to fetch week predictions from API: $e');
      lastException = e as Exception;
      if (isDemoMode) {
        _logger.info('Using demo data for week predictions');
        // Fallback to Demo-Data if error
        return _getFallbackWeekPredictions();
      } else {
        return null;
      }
    }
    */
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

    result['noDatalabStatus'] = result['labStatus'] == null;
    result['noDataDayPredictions'] = result['dayPredictions'] == null;
    result['noDataWeekPredictions'] = result['weekPredictions'] == null;

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

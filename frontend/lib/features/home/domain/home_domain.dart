import '../../../data/models/day_prediction_dto.dart';
import '../../../data/models/week_prediction_dto.dart';
import '../../../data/models/lab_status_dto.dart';
import '../../../data/services/api_service.dart';
import 'package:logging/logging.dart';
import '../../../core/config/environment_config.dart';
import '../../../data/services/websocket_service.dart';

/// Domain layer for the home feature of LabCheck.
///
/// Manages data operations for lab status, predictions, and real-time updates
/// through WebSocket connections. Handles API calls and provides fallback data
/// for demo mode when the backend is unavailable.
class HomeDomain {
  final _logger = Logger('HomeDomain');
  final WebSocketService _webSocketService = WebSocketService();
  Exception? lastException;
  bool isDemoMode = EnvironmentConfig.isDemoMode;

  /// Callback function for lab status updates
  Function(LabStatusDto)? _onLabStatusUpdate;

  /// Initializes WebSocket connection and sets up event listeners.
  ///
  /// Configures real-time updates for lab status and connection status changes.
  /// Requests initial status from the server after connection is established.
  void initializeWebSocket(Function(LabStatusDto) onLabStatusUpdate) {
    _onLabStatusUpdate = onLabStatusUpdate;

    _webSocketService.initialize();

    // Listen for lab status updates
    _webSocketService.onLabStatusUpdate((data) {
      _logger.info('Received WebSocket lab status update: $data');

      try {
        // Convert WebSocket data to LabStatusDto
        final labStatus = LabStatusDto.fromJson(data);
        _logger.info('Successfully parsed LabStatusDto');
        _onLabStatusUpdate?.call(labStatus);
      } catch (e) {
        _logger.warning('Failed to parse WebSocket lab status data: $e');
        _logger.warning('Raw data was: $data');
      }
    });

    // Listen for connection status changes
    _webSocketService.onConnectionStatusChanged(() {
      _logger.info(
        'WebSocket connection status changed: ${_webSocketService.isConnected}',
      );
    });

    // Request initial status after connection is established
    _webSocketService.requestInitialStatus();
  }

  /// Cleans up WebSocket connection and resources.
  void dispose() {
    _webSocketService.disconnect();
  }

  /// Fetches current lab status from the API.
  ///
  /// Returns LabStatusDto or null if the request fails.
  /// Falls back to demo data if in demo mode and API is unavailable.
  Future<LabStatusDto?> getLabStatus() async {
    try {
      final url = '/api/lab/status';
      final response = await ApiService().get(url);
      _logger.info('LabStatusDto: $response');
      return LabStatusDto.fromJson(response);
    } catch (e) {
      _logger.warning('Failed to fetch lab status from API: $e');
      lastException = e is Exception ? e : Exception(e.toString());
      if (isDemoMode) {
        _logger.info('Using demo data for lab status');
        // Fallback to Demo-Data if error
        return _getFallbackLabStatus();
      } else {
        return null;
      }
    }
  }

  /// Fetches daily occupancy predictions from the API.
  ///
  /// Returns DayPredictionDto or null if the request fails.
  /// Falls back to demo data if in demo mode and API is unavailable.
  Future<DayPredictionDto?> getDayPredictions() async {
    try {
      final url = '/api/predictions/day';
      final response = await ApiService().get(url);
      _logger.info('DayPredictionDto: $response');
      return DayPredictionDto.fromJson(response);
    } catch (e) {
      _logger.warning('Failed to fetch day predictions from API: $e');
      lastException = e is Exception ? e : Exception(e.toString());
      if (isDemoMode) {
        _logger.info('Using demo data for day predictions');
        // Fallback to Demo-Data if error
        return _getFallbackDayPredictions();
      } else {
        return null;
      }
    }
  }

  /// Fetches weekly occupancy predictions from the API.
  ///
  /// Returns WeekPredictionDto or null if the request fails.
  /// Falls back to demo data if in demo mode and API is unavailable.
  Future<WeekPredictionDto?> getWeekPredictions() async {
    try {
      final url = '/api/predictions/week';
      final response = await ApiService().get(url);
      _logger.info('WeekPredictionDto: $response');
      return WeekPredictionDto.fromJson(response);
    } catch (e) {
      _logger.warning('Failed to fetch week predictions from API: $e');
      lastException = e is Exception ? e : Exception(e.toString());
      if (isDemoMode) {
        _logger.info('Using demo data for week predictions');
        // Fallback to Demo-Data if error
        return _getFallbackWeekPredictions();
      } else {
        return null;
      }
    }
  }

  /// Refreshes lab status and triggers the update callback.
  ///
  /// Fetches fresh data from the API and notifies listeners of the update.
  Future<LabStatusDto?> refreshLabStatus() async {
    final labStatus = await getLabStatus();
    if (labStatus != null) {
      _onLabStatusUpdate?.call(labStatus);
    }
    return labStatus;
  }

  /// Refreshes all data (lab status, day predictions, week predictions).
  ///
  /// Returns a map containing all fetched data and error information.
  /// Includes flags indicating which data sources failed to load.
  Future<Map<String, dynamic>> refreshAllData() async {
    Map<String, dynamic> result = {};
    result['labStatus'] = await getLabStatus();

    result['dayPredictions'] = await getDayPredictions();

    result['weekPredictions'] = await getWeekPredictions();

    // If an error occurred, add it to the results
    if (lastException != null) {
      result['error'] = lastException;
      lastException = null;
    }

    result['noDataLabStatus'] = result['labStatus'] == null;
    result['noDataDayPredictions'] = result['dayPredictions'] == null;
    result['noDataWeekPredictions'] = result['weekPredictions'] == null;

    return result;
  }

  /// Provides fallback lab status data for demo mode.
  ///
  /// Returns a LabStatusDto with sample data when the API is unavailable.
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

  /// Provides fallback daily predictions data for demo mode.
  ///
  /// Returns a DayPredictionDto with sample predictions when the API is unavailable.
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

  /// Provides fallback weekly predictions data for demo mode.
  ///
  /// Returns a WeekPredictionDto with sample predictions when the API is unavailable.
  WeekPredictionDto _getFallbackWeekPredictions() {
    final fallbackPredictions = [
      WeekPrediction(occupancy: 1, day: 'Mon', color: 'green'),
      WeekPrediction(occupancy: 4, day: 'Tue', color: 'yellow'),
      WeekPrediction(occupancy: 10, day: 'Wed', color: 'red'),
      WeekPrediction(occupancy: 4, day: 'Thu', color: 'yellow'),
      WeekPrediction(occupancy: 2, day: 'Fri', color: 'green'),
    ];

    return WeekPredictionDto(
      currentWeek: fallbackPredictions,
      nextWeek: fallbackPredictions,
      lastUpdated: DateTime.now(),
    );
  }
}

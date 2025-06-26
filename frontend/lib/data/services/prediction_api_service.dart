import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:logging/logging.dart';

/// DTO für ML-Prediction Anfrage
class PredictionRequest {
  final String timestamp;

  PredictionRequest({required this.timestamp});

  Map<String, dynamic> toJson() => {
    'timestamp': timestamp,
  };
}

/// DTO für ML-Prediction Antwort
class SinglePredictionResponse {
  final int predictedOccupancy;
  final bool isDoorOpen;
  final String predictionTimestamp;
  final String color;
  final String? lastTrainedAt;
  final String responseTimestamp;

  SinglePredictionResponse({
    required this.predictedOccupancy,
    required this.isDoorOpen,
    required this.predictionTimestamp,
    required this.color,
    this.lastTrainedAt,
    required this.responseTimestamp,
  });

  factory SinglePredictionResponse.fromJson(Map<String, dynamic> json) {
    return SinglePredictionResponse(
      predictedOccupancy: json['predictedOccupancy'] as int,
      isDoorOpen: json['isDoorOpen'] as bool,
      predictionTimestamp: json['predictionTimestamp'] as String,
      color: json['color'] as String,
      lastTrainedAt: json['lastTrainedAt'] as String?,
      responseTimestamp: json['responseTimestamp'] as String,
    );
  }
}

/// Service für ML-Prediction API-Calls
class PredictionApiService {
  static final Logger _logger = Logger('PredictionApiService');
  static const String _baseUrl = 'http://localhost:3000'; // Aus .env laden
  
  static String get baseUrl {
    return dotenv.env['API_BASE_URL'] ?? _baseUrl;
  }

  /// Holt eine einzelne ML-Vorhersage für einen spezifischen Zeitpunkt
  /// 
  /// [timestamp] - ISO 8601 formatierter Zeitstempel
  /// Returns [SinglePredictionResponse] oder wirft Exception
  static Future<SinglePredictionResponse> getSinglePrediction({
    required DateTime timestamp,
  }) async {
    try {
      final request = PredictionRequest(
        timestamp: timestamp.toIso8601String(),
      );

      _logger.info('Requesting prediction for: ${request.timestamp}');

      final response = await http.post(
        Uri.parse('$baseUrl/api/predictions/single'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode(request.toJson()),
      );

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body) as Map<String, dynamic>;
        final prediction = SinglePredictionResponse.fromJson(jsonData);
        
        _logger.info(
          'Successfully received prediction: ${prediction.predictedOccupancy} people, '
          'door: ${prediction.isDoorOpen ? "open" : "closed"}, '
          'color: ${prediction.color}',
        );
        
        return prediction;
      } else if (response.statusCode == 400) {
        throw PredictionException('Ungültiger Zeitstempel: ${response.body}');
      } else if (response.statusCode == 503) {
        throw PredictionException('ML-Service nicht verfügbar: ${response.body}');
      } else {
        throw PredictionException(
          'API Fehler ${response.statusCode}: ${response.body}',
        );
      }
    } catch (e) {
      _logger.severe('Error getting prediction: $e');
      if (e is PredictionException) {
        rethrow;
      }
      throw PredictionException('Netzwerk-Fehler: $e');
    }
  }

  /// Holt mehrere Vorhersagen für eine Zeitspanne
  /// 
  /// [startTime] - Startzeit für Vorhersagen
  /// [endTime] - Endzeit für Vorhersagen  
  /// [intervalMinutes] - Intervall zwischen Vorhersagen in Minuten
  static Future<List<SinglePredictionResponse>> getMultiplePredictions({
    required DateTime startTime,
    required DateTime endTime,
    int intervalMinutes = 30,
  }) async {
    final predictions = <SinglePredictionResponse>[];
    DateTime currentTime = startTime;

    while (currentTime.isBefore(endTime) || currentTime.isAtSameMomentAs(endTime)) {
      try {
        final prediction = await getSinglePrediction(timestamp: currentTime);
        predictions.add(prediction);
      } catch (e) {
        _logger.warning('Failed to get prediction for $currentTime: $e');
        // Fortfahren mit nächstem Zeitpunkt auch bei Fehlern
      }
      
      currentTime = currentTime.add(Duration(minutes: intervalMinutes));
    }

    return predictions;
  }
}

/// Exception für Prediction API Fehler
class PredictionException implements Exception {
  final String message;
  
  PredictionException(this.message);
  
  @override
  String toString() => 'PredictionException: $message';
}

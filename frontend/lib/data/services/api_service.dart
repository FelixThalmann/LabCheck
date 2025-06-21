import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/config/environment_config.dart';

class ApiService {
  late final String baseUrl;

  // Singleton-Pattern
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal() {
    baseUrl = EnvironmentConfig.apiBaseUrl;
  }

  // HTTP-Header
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    // Here we can add more headers like Auth-Token
  };

  // GET-Request
  Future<dynamic> get(String endpoint) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
      );
      return _handleResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // POST-Request
  Future<dynamic> post(String endpoint, dynamic data) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
        body: json.encode(data),
      );
      return _handleResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // PUT-Request
  Future<dynamic> put(String endpoint, dynamic data) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
        body: json.encode(data),
      );
      return _handleResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // DELETE-Request
  Future<dynamic> delete(String endpoint) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
      );
      return _handleResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Response-Handler
  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return json.decode(response.body);
    } else if (response.statusCode == 401) {
      throw ApiException(
        statusCode: response.statusCode,
        message: 'Wrong password. Please try again.',
        type: ApiExceptionType.unauthorized,
      );
    } else if (response.statusCode == 400) {
      final responseData = json.decode(response.body);
      final messageArray = responseData['message'];
      final errorMessage =
          messageArray is List && messageArray.isNotEmpty
              ? messageArray[0]
              : 'Invalid request. Please check your input.';
      throw ApiException(
        statusCode: response.statusCode,
        message: errorMessage,
        type: ApiExceptionType.client,
      );
    } else {
      throw ApiException(
        statusCode: response.statusCode,
        message: response.body,
        type: ApiExceptionType.server,
      );
    }
  }

  // Error Handling
  Exception _handleError(dynamic error) {
    if (error is ApiException) return error;

    // Check for network-related errors
    if (error is SocketException) {
      if (error.osError?.errorCode == 51 ||
          error.message.contains('Network is unreachable')) {
        return NetworkException(
          message:
              'Network not reachable. Please check your internet connection.',
          type: NetworkExceptionType.unreachable,
          originalError: error,
        );
      } else if (error.message.contains('Connection refused') ||
          error.message.contains('Connection timed out')) {
        return NetworkException(
          message: 'Server not reachable. Please try again later.',
          type: NetworkExceptionType.serverUnavailable,
          originalError: error,
        );
      } else {
        return NetworkException(
          message: 'Connection error: ${error.message}',
          type: NetworkExceptionType.connectionError,
          originalError: error,
        );
      }
    }

    if (error.toString().contains('ClientException')) {
      return NetworkException(
        message: 'Network error. Please check your internet connection.',
        type: NetworkExceptionType.clientError,
        originalError: error,
      );
    }

    return ApiException(
      statusCode: 500,
      message: 'An unexpected error occurred: ${error.toString()}',
      type: ApiExceptionType.unknown,
    );
  }
}

// Exception Types
enum ApiExceptionType { server, client, unauthorized, unknown }

enum NetworkExceptionType {
  unreachable,
  serverUnavailable,
  connectionError,
  clientError,
  timeout,
}

// Custom Exception for API-Errors
class ApiException implements Exception {
  final int statusCode;
  final String message;
  final ApiExceptionType type;

  ApiException({
    required this.statusCode,
    required this.message,
    required this.type,
  });

  @override
  String toString() => 'ApiException: Status $statusCode - $message';
}

// Custom Exception for Network-Errors
class NetworkException implements Exception {
  final String message;
  final NetworkExceptionType type;
  final dynamic originalError;

  NetworkException({
    required this.message,
    required this.type,
    this.originalError,
  });

  @override
  String toString() => 'NetworkException: $message';
}

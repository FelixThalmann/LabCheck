import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/config/environment_config.dart';

/// Service for handling HTTP API requests to the LabCheck backend.
///
/// Provides methods for GET, POST, PUT, and DELETE requests with proper
/// error handling and authentication via API key.
class ApiService {
  late final String baseUrl;
  late final String apiKey;

  /// Singleton instance of ApiService
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal() {
    baseUrl = EnvironmentConfig.apiBaseUrl;
    apiKey = EnvironmentConfig.apiKey;
  }

  /// HTTP headers for API requests
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };

  /// Performs a GET request to the specified endpoint.
  ///
  /// Returns the parsed JSON response or throws an appropriate exception.
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

  /// Performs a POST request to the specified endpoint with JSON data.
  ///
  /// Returns the parsed JSON response or throws an appropriate exception.
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

  /// Performs a PUT request to the specified endpoint with JSON data.
  ///
  /// Returns the parsed JSON response or throws an appropriate exception.
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

  /// Performs a DELETE request to the specified endpoint.
  ///
  /// Returns the parsed JSON response or throws an appropriate exception.
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

  /// Handles HTTP response and converts it to appropriate data or exception.
  ///
  /// Parses successful responses and throws specific exceptions for different
  /// error status codes.
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

  /// Handles various types of errors and converts them to appropriate exceptions.
  ///
  /// Distinguishes between network errors, API errors, and unknown errors.
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

/// Types of API exceptions that can occur
enum ApiExceptionType { server, client, unauthorized, unknown }

/// Types of network exceptions that can occur
enum NetworkExceptionType {
  unreachable,
  serverUnavailable,
  connectionError,
  clientError,
  timeout,
}

/// Custom exception for API-related errors.
///
/// Contains status code, error message, and exception type for proper error handling.
class ApiException implements Exception {
  /// HTTP status code of the failed request
  final int statusCode;
  
  /// Human-readable error message
  final String message;
  
  /// Type of API exception
  final ApiExceptionType type;

  ApiException({
    required this.statusCode,
    required this.message,
    required this.type,
  });

  @override
  String toString() => 'ApiException: Status $statusCode - $message';
}

/// Custom exception for network-related errors.
///
/// Contains error message, exception type, and original error for debugging.
class NetworkException implements Exception {
  /// Human-readable error message
  final String message;
  
  /// Type of network exception
  final NetworkExceptionType type;
  
  /// Original error that caused this exception
  final dynamic originalError;

  NetworkException({
    required this.message,
    required this.type,
    this.originalError,
  });

  @override
  String toString() => 'NetworkException: $message';
}

import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://localhost:8080/';

  // Singleton-Pattern
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

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
    } else {
      throw ApiException(
        statusCode: response.statusCode,
        message: response.body,
      );
    }
  }

  // Error Handling
  Exception _handleError(dynamic error) {
    if (error is ApiException) return error;
    return ApiException(
      statusCode: 500,
      message: 'An unexpected error occurred: ${error.toString()}',
    );
  }
}

// Custom Exception for API-Errors
class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException({required this.statusCode, required this.message});

  @override
  String toString() => 'ApiException: Status $statusCode - $message';
}

import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:logging/logging.dart';
import '../../core/config/environment_config.dart';

/// WebSocket service for real-time updates from the LabCheck backend
class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  final _logger = Logger('WebSocketService');
  IO.Socket? _socket;
  bool _isConnected = false;

  // Callbacks for real-time updates
  Function(Map<String, dynamic>)? _onDoorStatusUpdate;
  Function()? _onConnectionStatusChanged;
  // Add new callback for lab status updates
  Function(Map<String, dynamic>)? _onLabStatusUpdate;

  /// Initialize WebSocket connection
  void initialize() {
    final baseUrl = EnvironmentConfig.apiBaseUrl.replaceAll('/api', '');

    _socket = IO.io(baseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      'reconnection': true,
      'reconnectionDelay': 1000,
      'reconnectionAttempts': 5,
    });

    _setupEventListeners();
  }

  /// Setup WebSocket event listeners
  void _setupEventListeners() {
    _socket?.onConnect((_) {
      _logger.info('WebSocket connected');
      _isConnected = true;
      _onConnectionStatusChanged?.call();
    });

    _socket?.onDisconnect((_) {
      _logger.info('WebSocket disconnected');
      _isConnected = false;
      _onConnectionStatusChanged?.call();
    });

    _socket?.onConnectError((error) {
      _logger.warning('WebSocket connection error: $error');
      _isConnected = false;
      _onConnectionStatusChanged?.call();
    });

    // Listen for door status updates (contains full lab status)
    _socket?.on('doorStatusUpdate', (data) {
      _logger.info('Received door status update: $data');
      if (_onDoorStatusUpdate != null) {
        _onDoorStatusUpdate!(data);
      }
      // Also trigger lab status update since door status contains full lab info
      if (_onLabStatusUpdate != null) {
        _onLabStatusUpdate!(data);
      }
    });
  }

  /// Set callback for door status updates
  void onDoorStatusUpdate(Function(Map<String, dynamic>) callback) {
    _onDoorStatusUpdate = callback;
  }

  /// Set callback for connection status changes
  void onConnectionStatusChanged(Function() callback) {
    _onConnectionStatusChanged = callback;
  }

  /// Set callback for lab status updates (includes door and occupancy)
  void onLabStatusUpdate(Function(Map<String, dynamic>) callback) {
    _onLabStatusUpdate = callback;
  }

  /// Check if WebSocket is connected
  bool get isConnected => _isConnected;

  /// Disconnect WebSocket
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _isConnected = false;
  }

  /// Request initial status from server
  void requestInitialStatus() {
    if (_isConnected) {
      _socket?.emit('requestInitialStatus', {});
    }
  }
}

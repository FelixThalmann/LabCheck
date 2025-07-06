import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:logging/logging.dart';
import '../../core/config/environment_config.dart';

/// WebSocket service for real-time updates from the LabCheck backend.
///
/// Manages WebSocket connection and handles real-time events like door status
/// updates and occupancy changes. Uses Socket.IO client for reliable connection.
class WebSocketService {
  /// Singleton instance of WebSocketService
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  final _logger = Logger('WebSocketService');
  io.Socket? _socket;
  bool _isConnected = false;

  /// Callback for door status updates
  Function(Map<String, dynamic>)? _onDoorStatusUpdate;
  
  /// Callback for connection status changes
  Function()? _onConnectionStatusChanged;
  
  /// Callback for all lab status updates (includes door and occupancy)
  Function(Map<String, dynamic>)? _onLabStatusUpdate;

  /// Initializes WebSocket connection to the backend server.
  ///
  /// Sets up connection with automatic reconnection and configures
  /// event listeners for real-time updates.
  void initialize() {
    final baseUrl = EnvironmentConfig.apiBaseUrl.replaceAll('/api', '');
    _logger.info('Initializing WebSocket connection to: $baseUrl');

    _socket = io.io(baseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      'reconnection': true,
      'reconnectionDelay': 1000,
      'reconnectionAttempts': 10,
      'timeout': 20000,
      'forceNew': true,
    });

    _setupEventListeners();
  }

  /// Sets up event listeners for WebSocket connection and data events.
  ///
  /// Handles connection status, door status updates, and occupancy updates
  /// from the backend server.
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
      // Trigger lab status update
      if (_onLabStatusUpdate != null) {
        _onLabStatusUpdate!(data);
      }
    });

    // Listen for occupancy updates
    _socket?.on('occupancyUpdate', (data) {
      // Handle JSON format:
      // {currentOccupancy: 15, maxOccupancy: 20, isOpen: true, color: green, currentDate: 2025-06-25T16:18:31.756Z, lastUpdated: 2025-06-25T16:18:31.756Z}
      if (data is Map<String, dynamic>) {
        _logger.info('Starting extracting occupancy data...');

        final currentOccupancy = data['currentOccupancy'] as int? ?? 0;
        final maxOccupancy = data['maxOccupancy'] as int? ?? 0;
        final color = data['color'] as String? ?? 'red';
        final isOpen = data['isOpen'] as bool? ?? false;

        // Parse DateTime strings properly
        DateTime currentDate;
        DateTime lastUpdated;
        try {
          currentDate = DateTime.parse(
            data['currentDate'] as String? ?? DateTime.now().toIso8601String(),
          );
          lastUpdated = DateTime.parse(
            data['lastUpdated'] as String? ?? DateTime.now().toIso8601String(),
          );
        } catch (e) {
          _logger.warning('Failed to parse date strings: $e');
          currentDate = DateTime.now();
          lastUpdated = DateTime.now();
        }

        if (_onLabStatusUpdate != null) {
          final labStatusData = {
            'currentOccupancy': currentOccupancy,
            'maxOccupancy': maxOccupancy,
            'isOpen': isOpen,
            'color': color,
            'currentDate': currentDate.toIso8601String(),
            'lastUpdated': lastUpdated.toIso8601String(),
          };

          _logger.info('...Forwarding occupancy data to lab status update');
          _onLabStatusUpdate!(labStatusData);
        }
      }
    });
  }

  /// Sets callback function for door status updates.
  ///
  /// The callback receives a Map containing door status information.
  void onDoorStatusUpdate(Function(Map<String, dynamic>) callback) {
    _onDoorStatusUpdate = callback;
  }

  /// Sets callback function for connection status changes.
  ///
  /// The callback is called when the WebSocket connects or disconnects.
  void onConnectionStatusChanged(Function() callback) {
    _onConnectionStatusChanged = callback;
  }

  /// Sets callback function for lab status updates.
  ///
  /// The callback receives a Map containing combined lab status information
  /// including both door status and occupancy data.
  void onLabStatusUpdate(Function(Map<String, dynamic>) callback) {
    _onLabStatusUpdate = callback;
  }

  /// Returns whether the WebSocket is currently connected.
  bool get isConnected => _isConnected;

  /// Disconnects the WebSocket and cleans up resources.
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _isConnected = false;
  }

  /// Requests initial status from the server.
  ///
  /// Only works if the WebSocket is currently connected.
  void requestInitialStatus() {
    if (_isConnected) {
      _socket?.emit('requestInitialStatus', {});
    }
  }
}

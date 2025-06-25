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
  // Callback for all lab status updates
  Function(Map<String, dynamic>)? _onLabStatusUpdate;

  /// Initialize WebSocket connection
  void initialize() {
    final baseUrl = EnvironmentConfig.apiBaseUrl.replaceAll('/api', '');
    _logger.info('Initializing WebSocket connection to: $baseUrl');

    _socket = IO.io(baseUrl, <String, dynamic>{
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

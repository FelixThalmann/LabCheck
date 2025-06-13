import 'package:flutter/material.dart';
import 'package:logging/logging.dart';
import '../widgets/header_widget.dart';
import '../widgets/date_widget.dart';
import '../widgets/hours_widget.dart';
import '../widgets/days_widget.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/utils/snackbar_utils.dart';
import '../../../../data/services/api_service.dart';
import '../../domain/home_domain.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isLoading = false;
  final HomeDomain _homeDomain = HomeDomain();
  final _logger = Logger('HomePage');
  Map<String, dynamic> _data = {};
  final GlobalKey<RefreshIndicatorState> _refreshIndicatorKey =
      GlobalKey<RefreshIndicatorState>();

  Future<void> _onRefresh() async {
    setState(() {
      _isLoading = true;
    });

    _logger.info('Refreshing...');

    try {
      _data = await _homeDomain.refreshData();

      print('Data: $_data');

      // Check if an error occurred
      if (_data.containsKey('error') && mounted) {
        final error = _data['error'] as Exception;

        if (error is NetworkException) {
          SnackbarUtils.showNetworkError(context, error);
        } else if (error is ApiException) {
          SnackbarUtils.showError(context, 'Server error: ${error.message}');
        } else {
          SnackbarUtils.showError(context, 'An unexpected error occurred');
        }

        // Remove the error from the data, so it is not used in the UI
        _data.remove('error');
      }
    } catch (e) {
      _logger.severe('Unexpected error during refresh: $e');
      if (mounted) {
        SnackbarUtils.showError(context, 'An unexpected error occurred');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void initState() {
    super.initState();
    // Small delay, so the BuildContext is available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Manually trigger the RefreshIndicator when the page is loaded
      _refreshIndicatorKey.currentState?.show();
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      body: Container(
        width: screenWidth,
        height: screenHeight,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment(0.50, -0.00),
            end: Alignment(0.50, 1.00),
            colors: [AppColors.primary, Color(0xFF88B8DE), Colors.white],
          ),
        ),
        child: Stack(
          children: [
            RefreshIndicator(
              key: _refreshIndicatorKey,
              onRefresh: _onRefresh,
              color: AppColors.primary,
              backgroundColor: Colors.white,
              strokeWidth: 2.0, // Width of the refresh indicator
              displacement: 50.0, // Position of the refresh indicator
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    Padding(
                      padding: EdgeInsets.only(
                        top: screenHeight * 0.07,
                        left: screenWidth * 0.1,
                        right: screenWidth * 0.1,
                      ),
                      child: const HeaderWidget(),
                    ),
                    Padding(
                      padding: EdgeInsets.only(top: screenHeight * 0.01),
                      child: DateWidget(
                        isOpen: _data['labStatus']?.isOpen ?? false,
                        currentOccupancy:
                            _data['labStatus']?.currentOccupancy ?? 0,
                        maxOccupancy: _data['labStatus']?.maxOccupancy ?? 0,
                        color: _data['labStatus']?.color ?? 'red',
                        currentDate:
                            _data['labStatus']?.currentDate ?? DateTime.now(),
                        noData: _data['noData'] ?? false,
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.only(top: screenHeight * 0.04),
                      child: HoursWidget(
                        predictions: _data['dayPredictions']?.predictions ?? [],
                        noData: _data['noData'] ?? false,
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.only(top: screenHeight * 0.04),
                      child: DaysWidget(
                        predictions:
                            _data['weekPredictions']?.predictions ?? [],
                        noData: _data['noData'] ?? false,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              top: screenHeight * 0.05,
              right: 20,
              child: IconButton(
                icon: const Icon(Icons.settings, color: Colors.black, size: 24),
                onPressed: () {
                  Navigator.pushNamed(context, '/settings');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

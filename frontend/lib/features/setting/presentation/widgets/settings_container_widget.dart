import 'package:flutter/material.dart';
import 'package:labcheck/features/setting/presentation/widgets/seats_input_widget.dart';
import 'package:labcheck/features/setting/presentation/widgets/current_seats_input_widget.dart';
import 'package:labcheck/features/setting/presentation/widgets/entrance_direction_widget.dart';

/// Container widget that organizes all settings components in a scrollable layout.
///
/// Displays three main sections: maximum capacity, current occupancy,
/// and door configuration, each in their own styled container.
class SettingsContainerWidget extends StatelessWidget {
  /// Controller for the maximum seats input field
  final TextEditingController maxSeatsController;
  
  /// Controller for the current seats input field
  final TextEditingController currentSeatsController;
  
  /// Callback function triggered when maximum seats are saved
  final VoidCallback onSaveMaxSeats;
  
  /// Callback function triggered when current seats are saved
  final VoidCallback onSaveCurrentSeats;
  
  /// Callback function triggered when entrance direction is inverted
  final VoidCallback onInvertDirection;

  const SettingsContainerWidget({
    super.key,
    required this.maxSeatsController,
    required this.currentSeatsController,
    required this.onSaveMaxSeats,
    required this.onSaveCurrentSeats,
    required this.onInvertDirection,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return SingleChildScrollView(
      padding: EdgeInsets.symmetric(vertical: screenHeight * 0.02),
      child: Column(
        children: [
          // Max Seats Section
          Container(
            width: screenWidth * 0.9,
            margin: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
            padding: EdgeInsets.all(screenWidth * 0.04),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(12.0),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Maximum Capacity',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: screenWidth * 0.035,
                    fontWeight: FontWeight.w700,
                    color: Colors.black87,
                  ),
                ),
                SizedBox(height: screenHeight * 0.015),
                SeatsInputWidget(
                  controller: maxSeatsController,
                  onSave: onSaveMaxSeats,
                ),
              ],
            ),
          ),

          SizedBox(height: screenHeight * 0.02),

          // Current Seats Section
          Container(
            width: screenWidth * 0.9,
            margin: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
            padding: EdgeInsets.all(screenWidth * 0.04),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(12.0),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Current Occupancy',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: screenWidth * 0.035,
                    fontWeight: FontWeight.w700,
                    color: Colors.black87,
                  ),
                ),
                SizedBox(height: screenHeight * 0.015),
                CurrentSeatsInputWidget(
                  controller: currentSeatsController,
                  onSave: onSaveCurrentSeats,
                ),
              ],
            ),
          ),

          SizedBox(height: screenHeight * 0.02),

          // Entrance Direction Section
          Container(
            width: screenWidth * 0.9,
            margin: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
            padding: EdgeInsets.all(screenWidth * 0.04),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(12.0),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Door Configuration',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: screenWidth * 0.035,
                    fontWeight: FontWeight.w700,
                    color: Colors.black87,
                  ),
                ),
                SizedBox(height: screenHeight * 0.015),
                EntranceDirectionWidget(onInvert: onInvertDirection),
              ],
            ),
          ),

          SizedBox(height: screenHeight * 0.03),
        ],
      ),
    );
  }
}

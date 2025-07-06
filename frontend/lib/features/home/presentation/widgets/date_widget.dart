import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:labcheck/core/theme/app_colors.dart';

/// Widget displaying current lab status with door icon and occupancy information.
///
/// Shows door open/closed state, current occupancy vs maximum capacity,
/// and current date. Uses color-coded background based on occupancy level.
class DateWidget extends StatelessWidget {
  /// Whether the lab door is currently open
  final bool isOpen;
  
  /// Current number of people in the lab
  final int currentOccupancy;
  
  /// Maximum capacity of the lab
  final int maxOccupancy;
  
  /// Color indicator for occupancy level (green, yellow, red)
  final String color;
  
  /// Current date to display
  final DateTime currentDate;
  
  /// Whether to show "No Data" state
  final bool noData;

  const DateWidget({
    super.key,
    required this.isOpen,
    required this.currentOccupancy,
    required this.maxOccupancy,
    required this.color,
    required this.currentDate,
    required this.noData,
  });

  @override
  Widget build(BuildContext context) {
    final formattedDate = DateFormat('EEE d. MMM', 'en_US').format(currentDate);
    final screenWidth = MediaQuery.of(context).size.width;
    final containerWidth = screenWidth * 0.85; // 85% of screen width
    final containerHeight =
        containerWidth * 0.3; // Height proportional to width

    return Container(
      width: containerWidth,
      height: containerHeight,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17.0),
        boxShadow: const [
          BoxShadow(
            color: Color(0x3F000000),
            blurRadius: 4,
            offset: Offset(0, 4),
            spreadRadius: 0,
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            left: 0,
            top: 0,
            child: Container(
              width: containerWidth,
              height: containerHeight,
              decoration: ShapeDecoration(
                color:
                    noData
                        ? Colors.grey[300]
                        : (color == 'green'
                            ? AppColors.green
                            : (color == 'yellow'
                                ? AppColors.yellow
                                : AppColors.red)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(17),
                ),
              ),
            ),
          ),
          Positioned(
            left: containerWidth * 0.1, // 10% from left edge
            top: containerHeight * 0.2, // 20% from top
            child: SvgPicture.asset(
              isOpen
                  ? 'assets/images/door-open-solid.svg'
                  : 'assets/images/door-closed-solid.svg',
              width: containerWidth * 0.18, // 18% of container width
              height: containerWidth * 0.18,
              colorFilter: ColorFilter.mode(
                noData ? Colors.grey[600]! : Colors.black,
                BlendMode.srcIn,
              ),
            ),
          ),
          Positioned(
            left: containerWidth * 0.35, // 35% from left edge
            top: containerHeight * 0.45, // 45% from top
            child: Text(
              noData
                  ? 'No Data'
                  : (!isOpen
                      ? 'Door closed'
                      : '$currentOccupancy of $maxOccupancy'),
              style: TextStyle(
                color: noData ? Colors.grey[600] : Colors.black,
                fontSize: containerWidth * 0.05, // 5% of container width
                fontWeight: FontWeight.w700,
                height: 1.29,
              ),
            ),
          ),
          Positioned(
            left: containerWidth * 0.35,
            top: containerHeight * 0.2,
            child: SizedBox(
              width: containerWidth * 0.55, // 55% of container width
              height: containerHeight * 0.25,
              child: Text(
                noData
                    ? 'No Data Available'
                    : 'Current capacity - $formattedDate',
                style: TextStyle(
                  color: noData ? Colors.grey[600] : Colors.black,
                  fontSize: containerWidth * 0.03, // 3% of container width
                  fontWeight: FontWeight.w700,
                  height: 2.20,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

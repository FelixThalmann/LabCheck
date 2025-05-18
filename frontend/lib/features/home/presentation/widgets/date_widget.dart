import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';

class DateWidget extends StatelessWidget {
  const DateWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final formattedDate = DateFormat('EEE d. MMM', 'en_US').format(now);
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
                color: const Color(0xFF82FFA7),
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
              'assets/images/door-open-solid.svg',
              width: containerWidth * 0.18, // 18% of container width
              height: containerWidth * 0.18,
              colorFilter: const ColorFilter.mode(
                Colors.black,
                BlendMode.srcIn,
              ),
            ),
          ),
          Positioned(
            left: containerWidth * 0.35, // 35% from left edge
            top: containerHeight * 0.45, // 45% from top
            child: Text(
              '1 of 5',
              style: TextStyle(
                color: Colors.black,
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
                'Current capacity - $formattedDate',
                style: TextStyle(
                  color: Colors.black,
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

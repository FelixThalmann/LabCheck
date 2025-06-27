import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class HeaderWidget extends StatelessWidget {
  const HeaderWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final containerWidth = screenWidth * 0.85;
    final containerHeight = containerWidth * 0.3;
    final logoSize = screenWidth * 0.24;
    final logoHeight = logoSize * 0.3;

    return SizedBox(
      width: containerWidth,
      height: containerHeight,
      child: Stack(
        children: [
          Positioned(
            right: containerWidth * 0.00,
            top: containerHeight * 0.40,
            child: SizedBox(
              width: logoSize,
              height: logoHeight,
              child: SvgPicture.asset(
                'assets/images/ubicomp-logo.svg',
                width: logoSize,
                height: logoHeight,
                fit: BoxFit.contain,
                colorFilter: const ColorFilter.mode(
                  Colors.black,
                  BlendMode.srcIn,
                ),
                placeholderBuilder:
                    (BuildContext context) => Container(
                      width: logoSize,
                      height: logoHeight,
                      color: Colors.grey[300],
                    ),
              ),
            ),
          ),
          Positioned(
            left: containerWidth * 0.00,
            top: containerHeight * 0.4,
            child: SizedBox(
              width: screenWidth * 0.6,
              child: Text(
                'Ubiquitous Systems Lab',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: screenWidth * 0.04,
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w700,
                  height: 0.85,
                ),
              ),
            ),
          ),
          Positioned(
            left: containerWidth * 0.00,
            top: containerHeight * 0.55,
            child: SizedBox(
              width: screenWidth * 0.6,
              child: Text(
                'May I come in?',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: screenWidth * 0.025,
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w700,
                  height: 2,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

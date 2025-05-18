import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class HeaderWidget extends StatelessWidget {
  const HeaderWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final headerHeight = screenHeight * 0.15;
    final logoSize = screenWidth * 0.24;
    final logoHeight = logoSize * 0.3;

    return Container(
      width: screenWidth,
      height: headerHeight,
      padding: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
      child: Stack(
        children: [
          Positioned(
            right: screenWidth * 0.02,
            top: headerHeight * 0.42,
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
            left: screenWidth * 0.05,
            top: headerHeight * 0.4,
            child: SizedBox(
              width: screenWidth * 0.6,
              child: Text(
                'Ubiquitous Systems Lab',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: screenWidth * 0.045,
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w700,
                  height: 0.85,
                ),
              ),
            ),
          ),
          Positioned(
            left: screenWidth * 0.05,
            top: headerHeight * 0.5,
            child: SizedBox(
              width: screenWidth * 0.6,
              child: Text(
                'May I com in?',
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

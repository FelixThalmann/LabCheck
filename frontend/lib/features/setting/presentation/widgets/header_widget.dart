import 'package:flutter/material.dart';

class HeaderWidget extends StatelessWidget {
  const HeaderWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final headerHeight = screenHeight * 0.15;

    return Container(
      width: screenWidth,
      height: headerHeight,
      padding: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
      child: Stack(
        children: [
          Positioned(
            left: screenWidth * 0.05,
            top: headerHeight * 0.4,
            child: SizedBox(
              width: screenWidth * 0.6,
              child: Text(
                'Settings',
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
        ],
      ),
    );
  }
}

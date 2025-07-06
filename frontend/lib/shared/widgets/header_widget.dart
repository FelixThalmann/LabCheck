import 'package:flutter/material.dart';

/// A reusable header widget for displaying titles across the application.
///
/// Provides consistent styling with responsive font sizing based on screen width
/// and proper centering within a container that takes 15% of screen height.
class HeaderWidget extends StatelessWidget {
  /// The title text to display in the header
  final String title;

  const HeaderWidget({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final headerHeight = screenHeight * 0.15;

    return Container(
      width: screenWidth,
      height: headerHeight,
      padding: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
      child: Center(
        child: Text(
          title,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.black,
            fontSize: screenWidth * 0.04,
            fontFamily: 'Inter',
            fontWeight: FontWeight.w700,
            height: 0.85,
          ),
        ),
      ),
    );
  }
}

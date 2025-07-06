import 'package:flutter/material.dart';

class TextWidget extends StatelessWidget {
  const TextWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final containerWidth = screenWidth * 0.85; // 85% of screen width
    final containerHeight =
        containerWidth * 0.6; // Height proportional to width

    return Container(
      width: containerWidth,
      height: containerHeight,
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(17.0),
      ),
      child: Stack(
        children: [
          Center(
            child: Text(
              'This is the project work of the students of the University of Siegen.\n\nThe project is a part of the course "Ubiquitous Systems Lab" at the University of Siegen.\n\n© All rights reserved. 2025',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                fontFamily: 'Inter',
                height: 1.29,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

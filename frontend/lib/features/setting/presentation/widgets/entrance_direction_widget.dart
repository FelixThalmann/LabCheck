import 'package:flutter/material.dart';

class EntranceDirectionWidget extends StatelessWidget {
  final VoidCallback onInvert;

  const EntranceDirectionWidget({super.key, required this.onInvert});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Invert the entrance direction for the door sensors',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: screenWidth * 0.03,
            color: Colors.grey[600],
          ),
        ),
        SizedBox(height: screenHeight * 0.015),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: onInvert,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              textStyle: TextStyle(
                fontFamily: 'Inter',
                fontSize: screenWidth * 0.032,
                fontWeight: FontWeight.w700,
              ),
              padding: EdgeInsets.symmetric(vertical: screenHeight * 0.012),
            ),
            child: const Text('Invert Direction'),
          ),
        ),
      ],
    );
  }
}

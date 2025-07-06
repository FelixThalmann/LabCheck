import 'package:flutter/material.dart';

class SeatsInputWidget extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onSave;

  const SeatsInputWidget({
    super.key,
    required this.controller,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          style: TextStyle(fontFamily: 'Inter', fontSize: screenWidth * 0.032),
          decoration: InputDecoration(
            labelText: 'Number of Seats',
            labelStyle: TextStyle(
              fontFamily: 'Inter',
              fontSize: screenWidth * 0.032,
            ),
            border: const OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(
              horizontal: screenWidth * 0.03,
              vertical: screenHeight * 0.015,
            ),
          ),
        ),
        SizedBox(height: screenHeight * 0.015),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: onSave,
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
            child: const Text('Save'),
          ),
        ),
      ],
    );
  }
}

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
    final containerWidth = screenWidth * 0.85;
    final padding = screenWidth * 0.05;

    return Center(
      child: Container(
        width: containerWidth,
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(17.0),
        ),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: padding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: screenWidth * 0.035,
                ),
                decoration: InputDecoration(
                  labelText: 'Number of Seats',
                  labelStyle: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: screenWidth * 0.035,
                  ),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: onSave,
                style: ElevatedButton.styleFrom(
                  textStyle: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: screenWidth * 0.035,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                child: const Text('Save'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

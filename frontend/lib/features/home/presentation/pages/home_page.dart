import 'package:flutter/material.dart';
import '../widgets/header_widget.dart';
import '../widgets/date_widget.dart';
import '../widgets/hours_widget.dart';
import '../widgets/days_widget.dart';
import '../../../../core/theme/app_colors.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      body: Container(
        width: screenWidth,
        height: screenHeight,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment(0.50, -0.00),
            end: Alignment(0.50, 1.00),
            colors: [AppColors.primary, Color(0xFF88B8DE), Colors.white],
          ),
        ),
        child: Column(
          children: [
            Padding(
              padding: EdgeInsets.only(top: screenHeight * 0.05),
              child: const HeaderWidget(),
            ),
            const DateWidget(),
            Padding(
              padding: EdgeInsets.only(top: screenHeight * 0.04),
              child: const HoursWidget(),
            ),
            Padding(
              padding: EdgeInsets.only(top: screenHeight * 0.04),
              child: const DaysWidget(),
            ),
          ],
        ),
      ),
    );
  }
}

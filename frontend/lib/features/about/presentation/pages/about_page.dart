import 'package:flutter/material.dart';
import 'package:labcheck/core/theme/app_colors.dart';
import 'package:labcheck/shared/widgets/header_widget.dart';
import 'package:labcheck/features/about/presentation/widgets/text_widget.dart';

class AboutPage extends StatefulWidget {
  const AboutPage({super.key});

  @override
  State<AboutPage> createState() => _AboutPageState();
}

class _AboutPageState extends State<AboutPage> {
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
        child: Stack(
          children: [
            Column(
              children: [
                Padding(
                  padding: EdgeInsets.only(top: screenHeight * 0.05),
                  child: const HeaderWidget(title: 'About'),
                ),
                Padding(
                  padding: EdgeInsets.only(top: screenHeight * 0.01),
                  child: const TextWidget(),
                ),
              ],
            ),
            Positioned(
              top: screenHeight * 0.05,
              left: 20,
              child: IconButton(
                icon: Icon(Icons.arrow_back, color: Colors.black, size: 24),
                onPressed: () {
                  Navigator.pop(context);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

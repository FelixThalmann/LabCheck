import 'package:flutter/material.dart';
import '../widgets/header_widget.dart';
import '../widgets/date_widget.dart';
import '../widgets/hours_widget.dart';
import '../widgets/days_widget.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/home_domain.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isLoading = false;
  final HomeDomain _homeDomain = HomeDomain();

  Future<void> _onRefresh() async {
    setState(() {
      _isLoading = true;
    });

    print('Refreshing...');
    await _homeDomain.refreshData();

    setState(() {
      _isLoading = false;
    });
  }

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
            RefreshIndicator(
              onRefresh: _onRefresh,
              color: AppColors.primary,
              backgroundColor: Colors.white,
              strokeWidth: 2.0, // Width of the refresh indicator
              displacement: 50.0, // Position of the refresh indicator
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    Padding(
                      padding: EdgeInsets.only(
                        top: screenHeight * 0.07,
                        left: screenWidth * 0.1,
                        right: screenWidth * 0.1,
                      ),
                      child: const HeaderWidget(),
                    ),
                    Padding(
                      padding: EdgeInsets.only(top: screenHeight * 0.01),
                      child: const DateWidget(),
                    ),
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
            ),
            Positioned(
              top: screenHeight * 0.05,
              right: 20,
              child: IconButton(
                icon: const Icon(Icons.settings, color: Colors.black, size: 24),
                onPressed: () {
                  Navigator.pushNamed(context, '/settings');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

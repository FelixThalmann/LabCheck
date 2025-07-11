import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../data/models/week_prediction_dto.dart';

class _BarChart extends StatelessWidget {
  final List<Map<String, dynamic>> predictions;
  final bool noData;
  final String currentDay;
  final bool isCurrentWeek;

  const _BarChart({
    required this.predictions,
    required this.noData,
    required this.currentDay,
    required this.isCurrentWeek,
  });

  @override
  Widget build(BuildContext context) {
    if (noData) {
      return Center(
        child: Text(
          'No Data Available',
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
    }

    // Finde the max value in the predictions
    final maxValue = predictions.fold<int>(
      0,
      (max, prediction) =>
          prediction['value'] > max ? prediction['value'] : max,
    );

    // Calculate the upper limit of the Y-axis with 20% buffer
    final maxY = (maxValue * 1.4);

    return BarChart(
      BarChartData(
        barTouchData: barTouchData,
        titlesData: titlesData,
        borderData: borderData,
        barGroups: barGroups,
        gridData: const FlGridData(show: false),
        alignment: BarChartAlignment.spaceAround,
        maxY: maxY,
      ),
    );
  }

  BarTouchData get barTouchData => BarTouchData(
    enabled: false,
    touchTooltipData: BarTouchTooltipData(
      getTooltipColor: (group) => Colors.transparent,
      tooltipPadding: EdgeInsets.zero,
      tooltipMargin: 8,
      getTooltipItem: (
        BarChartGroupData group,
        int groupIndex,
        BarChartRodData rod,
        int rodIndex,
      ) {
        return BarTooltipItem(
          rod.toY.round().toString(),
          const TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
            fontSize: 10,
          ),
        );
      },
    ),
  );

  Widget getTitles(double value, TitleMeta meta) {
    const style = TextStyle(
      fontWeight: FontWeight.bold,
      fontSize: 12,
      color: Colors.black,
    );

    if (value.toInt() >= predictions.length) {
      return const SizedBox.shrink();
    }

    final day = predictions[value.toInt()];
    return SideTitleWidget(
      meta: meta,
      child: Container(
        width: 46,
        height: 19,
        decoration: BoxDecoration(
          color: (day['color'] as Color).withAlpha(128),
          borderRadius: BorderRadius.circular(5),
        ),
        child: Center(child: Text(day['label'] as String, style: style)),
      ),
    );
  }

  FlTitlesData get titlesData => FlTitlesData(
    show: true,
    bottomTitles: AxisTitles(
      sideTitles: SideTitles(
        showTitles: true,
        reservedSize: 30,
        getTitlesWidget: getTitles,
      ),
    ),
    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
  );

  FlBorderData get borderData => FlBorderData(
    show: true,
    border: const Border(bottom: BorderSide(color: Colors.black, width: 1)),
  );

  List<BarChartGroupData> get barGroups =>
      List.generate(predictions.length, (index) {
        // Extract the day from the currentDay (e.g. "Fri" from "Fri 27. Jun")
        final currentDayShort = currentDay.split(' ')[0];
        final isCurrentDay = predictions[index]['label'] == currentDayShort;

        return BarChartGroupData(
          x: index,
          barRods: [
            BarChartRodData(
              toY: predictions[index]['value'].toDouble(),
              color:
                  (isCurrentDay && isCurrentWeek)
                      ? AppColors.primary
                      : AppColors.secondary,
              width: (isCurrentDay && isCurrentWeek) ? 12 : 8,
            ),
          ],
          showingTooltipIndicators: [0],
        );
      });
}

class DaysWidget extends StatefulWidget {
  final List<WeekPrediction> currentWeekPredictions;
  final List<WeekPrediction> nextWeekPredictions;
  final String currentDay;
  final bool noData;

  const DaysWidget({
    super.key,
    required this.currentWeekPredictions,
    required this.nextWeekPredictions,
    required this.currentDay,
    required this.noData,
  });

  @override
  State<DaysWidget> createState() => _DaysWidgetState();
}

class _DaysWidgetState extends State<DaysWidget> {
  bool _isCurrentWeek = true;

  List<Map<String, dynamic>> get daysPredictions {
    final predictions =
        _isCurrentWeek
            ? widget.currentWeekPredictions
            : widget.nextWeekPredictions;

    return predictions.map((prediction) {
      Color color;
      switch (prediction.color) {
        case 'green':
          color = AppColors.green;
          break;
        case 'yellow':
          color = AppColors.yellow;
          break;
        case 'red':
          color = AppColors.red;
          break;
        default:
          color = AppColors.red;
      }

      return {
        'value': prediction.occupancy,
        'label': prediction.day,
        'color': color,
      };
    }).toList();
  }

  String get weekTitle {
    return _isCurrentWeek
        ? 'Week prediction - current'
        : 'Week prediction - next';
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final containerWidth = screenWidth * 0.85;

    return GestureDetector(
      onHorizontalDragEnd: (DragEndDetails details) {
        // Swipe to the previous week (to the right)
        if (details.primaryVelocity! > 0 && !_isCurrentWeek) {
          setState(() {
            _isCurrentWeek = true;
          });
        }
        // Swipe to the next week (to the left)
        else if (details.primaryVelocity! < 0 && _isCurrentWeek) {
          setState(() {
            _isCurrentWeek = false;
          });
        }
      },
      child: Container(
        width: containerWidth,
        decoration: BoxDecoration(
          color: widget.noData ? Colors.grey[300] : Colors.white,
          borderRadius: BorderRadius.circular(17.0),
          boxShadow: const [
            BoxShadow(
              color: Color(0x3F000000),
              blurRadius: 4,
              offset: Offset(0, 4),
              spreadRadius: 0,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(17.0),
          child: Stack(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.only(top: 12, left: 12, right: 50),
                child: Text(
                  weekTitle,
                  style: TextStyle(
                    color: widget.noData ? Colors.grey[600] : Colors.black,
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w700,
                    height: 1.83,
                  ),
                ),
              ),
              AspectRatio(
                aspectRatio: 1.70,
                child: Padding(
                  padding: const EdgeInsets.only(
                    right: 26,
                    left: 26,
                    top: 24,
                    bottom: 12,
                  ),
                  child: _BarChart(
                    predictions: daysPredictions,
                    noData: widget.noData,
                    currentDay: widget.currentDay,
                    isCurrentWeek: _isCurrentWeek,
                  ),
                ),
              ),

              // Left navigation button (previous)
              if (!_isCurrentWeek)
                Positioned(
                  left: 8,
                  top: 0,
                  bottom: 0,
                  child: Center(
                    child: GestureDetector(
                      onTap:
                          widget.noData
                              ? null
                              : () {
                                setState(() {
                                  _isCurrentWeek = true;
                                });
                              },
                      child: Opacity(
                        opacity: widget.noData ? 0.3 : 1.0,
                        child: SizedBox(
                          width: 28,
                          height: 28,
                          child: const Icon(
                            Icons.arrow_back_ios,
                            color: AppColors.primary,
                            size: 16,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

              // Right navigation button (next)
              if (_isCurrentWeek)
                Positioned(
                  right: 8,
                  top: 0,
                  bottom: 0,
                  child: Center(
                    child: GestureDetector(
                      onTap:
                          widget.noData
                              ? null
                              : () {
                                setState(() {
                                  _isCurrentWeek = false;
                                });
                              },
                      child: Opacity(
                        opacity: widget.noData ? 0.3 : 1.0,
                        child: SizedBox(
                          width: 28,
                          height: 28,
                          child: const Icon(
                            Icons.arrow_forward_ios,
                            color: AppColors.primary,
                            size: 16,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

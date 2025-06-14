import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../data/models/week_prediction_dto.dart';

class _BarChart extends StatelessWidget {
  final List<Map<String, dynamic>> predictions;
  final bool noData;

  const _BarChart({required this.predictions, required this.noData});

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
    final maxY = (maxValue * 1.2);

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

  LinearGradient get _barsGradient => LinearGradient(
    colors: [AppColors.secondary, AppColors.primary],
    begin: Alignment.bottomCenter,
    end: Alignment.topCenter,
  );

  List<BarChartGroupData> get barGroups => List.generate(
    predictions.length,
    (index) => BarChartGroupData(
      x: index,
      barRods: [
        BarChartRodData(
          toY: predictions[index]['value'].toDouble(),
          gradient: _barsGradient,
        ),
      ],
      showingTooltipIndicators: [0],
    ),
  );
}

class DaysWidget extends StatefulWidget {
  final List<WeekPrediction> predictions;
  final bool noData;

  const DaysWidget({
    super.key,
    required this.predictions,
    required this.noData,
  });

  @override
  State<DaysWidget> createState() => _DaysWidgetState();
}

class _DaysWidgetState extends State<DaysWidget> {
  List<Map<String, dynamic>> get daysPredictions {
    return widget.predictions.map((prediction) {
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

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final containerWidth = screenWidth * 0.85;

    return Container(
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
              padding: const EdgeInsets.only(top: 12, left: 12),
              child: SizedBox(
                width: 147,
                height: 22,
                child: Text(
                  'Week prediction',
                  style: TextStyle(
                    color: widget.noData ? Colors.grey[600] : Colors.black,
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w700,
                    height: 1.83,
                  ),
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
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

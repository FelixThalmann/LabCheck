import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import '../../../../core/theme/app_colors.dart';

class HoursWidget extends StatefulWidget {
  const HoursWidget({super.key});

  @override
  State<HoursWidget> createState() => _HoursWidgetState();
}

class _HoursWidgetState extends State<HoursWidget> {
  List<Color> gradientColors = [AppColors.secondary, Colors.blue];

  List<Map<String, dynamic>> dayPredictions = [
    {'value': 0, 'label': '8 AM', 'color': AppColors.green},
    {'value': 1, 'label': '10 AM', 'color': AppColors.green},
    {'value': 4, 'label': '12 PM', 'color': AppColors.yellow},
    {'value': 4, 'label': '2 PM', 'color': AppColors.yellow},
    {'value': 3, 'label': '4 PM', 'color': AppColors.yellow},
    {'value': 0, 'label': '6 PM', 'color': AppColors.green},
  ]; // Need to get this from the backend

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final containerWidth = screenWidth * 0.85;

    return Container(
      width: containerWidth,
      decoration: BoxDecoration(
        color: Colors.white,
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
                  'Day prediction',
                  style: TextStyle(
                    color: Colors.black,
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
                child: LineChart(mainData()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget bottomTitleWidgets(double value, TitleMeta meta) {
    const style = TextStyle(
      fontWeight: FontWeight.bold,
      fontSize: 12,
      color: Colors.black,
    );

    // Finde den entsprechenden Eintrag in dayPredictions
    final index = (value / 2).round();
    if (index < 0 || index >= dayPredictions.length) {
      return SideTitleWidget(meta: meta, child: SizedBox());
    }

    final prediction = dayPredictions[index];
    final Color backgroundColor = prediction['color'] as Color;

    return SideTitleWidget(
      meta: meta,
      child: Container(
        width: 46,
        height: 19,
        decoration: BoxDecoration(
          color: backgroundColor.withAlpha(128),
          borderRadius: BorderRadius.circular(5),
        ),
        child: Center(child: Text(prediction['label'], style: style)),
      ),
    );
  }

  LineChartData mainData() {
    return LineChartData(
      gridData: FlGridData(show: false),
      titlesData: FlTitlesData(
        show: true,
        rightTitles: const AxisTitles(
          sideTitles: SideTitles(showTitles: false),
        ),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 30,
            interval: 2,
            getTitlesWidget: bottomTitleWidgets,
          ),
        ),
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: false,
            interval: 1,
            reservedSize: 0,
          ),
        ),
      ),
      borderData: FlBorderData(
        show: true,
        border: const Border(bottom: BorderSide(color: Colors.black, width: 1)),
      ),
      minX: 0,
      maxX: 10,
      minY: 0,
      maxY: 6,
      lineBarsData: [
        LineChartBarData(
          spots: List.generate(
            dayPredictions.length,
            (index) => FlSpot(
              (index * 2).toDouble(),
              dayPredictions[index]['value'].toDouble(),
            ),
          ),
          isCurved: true,
          gradient: LinearGradient(colors: gradientColors),
          barWidth: 5,
          isStrokeCapRound: true,
          dotData: FlDotData(
            show: true,
            getDotPainter: (
              FlSpot spot,
              double successPercentage,
              LineChartBarData barData,
              int index,
            ) {
              Color dotActualColor = Colors.blue; // Default
              if (barData.gradient != null &&
                  barData.gradient!.colors.isNotEmpty) {
                dotActualColor = barData.gradient!.colors.first;
              } else if (barData.color != null) {
                dotActualColor = barData.color!;
              }
              return _TextDrawingDotPainter(
                dotColor: dotActualColor,
                dotRadius: 4,
                textColor: Colors.black,
                textSize: 10,
                precision: 0, // For integer values from dayPredictions
              );
            },
          ),
          belowBarData: BarAreaData(
            show: true,
            gradient: LinearGradient(
              colors:
                  gradientColors.map((color) => color.withAlpha(77)).toList(),
            ),
          ),
        ),
      ],
    );
  }
}

class _TextDrawingDotPainter extends FlDotPainter {
  final Color dotColor;
  final double dotRadius;
  final Color textColor;
  final double textSize;
  final int precision;
  final Color dotBorderColor;
  final double dotBorderWidth;

  _TextDrawingDotPainter({
    required this.dotColor,
    required this.dotRadius,
    required this.textColor,
    required this.textSize,
    required this.precision,
    this.dotBorderColor = Colors.transparent,
    this.dotBorderWidth = 0,
  });

  @override
  void draw(
    Canvas canvas,
    FlSpot spot,
    Offset center, {
    double lerp = 1.0, // Assume fully drawn if not provided
  }) {
    if (dotBorderWidth > 0) {
      final borderPaint =
          Paint()
            ..color = dotBorderColor
            ..style = PaintingStyle.stroke
            ..strokeWidth = dotBorderWidth * lerp;
      canvas.drawCircle(center, dotRadius * lerp, borderPaint);
    }

    final dotPaint =
        Paint()
          ..color = dotColor
          ..style = PaintingStyle.fill;
    canvas.drawCircle(center, dotRadius * lerp, dotPaint);

    if (lerp < 0.95) return;

    final textSpan = TextSpan(
      text: spot.y.toStringAsFixed(precision),
      style: TextStyle(
        color: textColor,
        fontSize: textSize,
        fontWeight: FontWeight.bold,
      ),
    );
    final textPainter = TextPainter(
      text: textSpan,
      textAlign: TextAlign.center,
      textDirection: ui.TextDirection.ltr,
    );
    textPainter.layout();

    final textOffset = Offset(
      center.dx - textPainter.width / 2,
      center.dy - (dotRadius * lerp) - textPainter.height - 4, // 4 is padding
    );
    textPainter.paint(canvas, textOffset);
  }

  @override
  Size getSize(FlSpot spot) {
    return Size(dotRadius * 2, dotRadius * 2);
  }

  @override
  FlDotPainter lerp(FlDotPainter a, FlDotPainter b, double t) {
    if (a is _TextDrawingDotPainter && b is _TextDrawingDotPainter) {
      return _TextDrawingDotPainter(
        dotColor: Color.lerp(a.dotColor, b.dotColor, t)!,
        dotRadius: ui.lerpDouble(a.dotRadius, b.dotRadius, t)!,
        textColor: Color.lerp(a.textColor, b.textColor, t)!,
        textSize: ui.lerpDouble(a.textSize, b.textSize, t)!,
        precision:
            (ui.lerpDouble(a.precision.toDouble(), b.precision.toDouble(), t) ??
                    b.precision.toDouble())
                .round(),
        dotBorderColor: Color.lerp(a.dotBorderColor, b.dotBorderColor, t)!,
        dotBorderWidth: ui.lerpDouble(a.dotBorderWidth, b.dotBorderWidth, t)!,
      );
    }
    return b;
  }

  @override
  Color get mainColor => dotColor;

  @override
  List<Object?> get props => [
    dotColor,
    dotRadius,
    textColor,
    textSize,
    precision,
    dotBorderColor,
    dotBorderWidth,
  ];
}

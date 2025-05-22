import '../../../data/models/day_prediction_dto.dart';
import '../../../data/models/week_prediction_dto.dart';
import '../../../data/models/lab_status_dto.dart';

class HomeDomain {
  Future<LabStatusDto> getLabStatus() async {
    // TODO: load data from API

    // Demo data
    return LabStatusDto(
      isOpen: true,
      currentOccupancy: 10,
      maxOccupancy: 20,
      lastUpdated: DateTime.now(),
      currentDate: DateTime.now(),
    );
  }

  Future<DayPredictionDto> getDayPredictions() async {
    // TODO: load data from API

    // Demo data
    return DayPredictionDto(
      predictions: [
        Prediction(occupancy: 10, time: '8 AM', color: 'green'),
        Prediction(occupancy: 15, time: '10 AM', color: 'yellow'),
        Prediction(occupancy: 20, time: '12 PM', color: 'red'),
        Prediction(occupancy: 18, time: '2 PM', color: 'yellow'),
        Prediction(occupancy: 12, time: '4 PM', color: 'green'),
        Prediction(occupancy: 8, time: '6 PM', color: 'green'),
      ],
      lastUpdated: DateTime.now(),
    );
  }

  Future<WeekPredictionDto> getWeekPredictions() async {
    // TODO: load data from API

    // Demo data
    return WeekPredictionDto(
      predictions: [
        WeekPrediction(occupancy: 15, day: 'Mon', color: 'yellow'),
        WeekPrediction(occupancy: 20, day: 'Tue', color: 'red'),
        WeekPrediction(occupancy: 12, day: 'Wed', color: 'green'),
        WeekPrediction(occupancy: 18, day: 'Thu', color: 'yellow'),
        WeekPrediction(occupancy: 10, day: 'Fri', color: 'green'),
      ],
      lastUpdated: DateTime.now(),
    );
  }

  Future<Map<String, dynamic>> refreshData() async {
    // Load data for each widget
    LabStatusDto labStatus = await getLabStatus();
    DayPredictionDto dayPredictions = await getDayPredictions();
    WeekPredictionDto weekPredictions = await getWeekPredictions();

    return {
      'labStatus': labStatus,
      'dayPredictions': dayPredictions,
      'weekPredictions': weekPredictions,
    };
  }
}

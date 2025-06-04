import '../../../data/models/day_prediction_dto.dart';
import '../../../data/models/week_prediction_dto.dart';
import '../../../data/models/lab_status_dto.dart';

class HomeDomain {
  Future<LabStatusDto> getLabStatus() async {
    // TODO: load data from API

    // Demo data
    return LabStatusDto(
      isOpen: true,
      currentOccupancy: 1,
      maxOccupancy: 5,
      color: 'green',
      currentDate: DateTime.now(),
      lastUpdated: DateTime.now(),
    );
  }

  Future<DayPredictionDto> getDayPredictions() async {
    // TODO: load data from API

    // Demo data
    return DayPredictionDto(
      predictions: [
        Prediction(occupancy: 1, time: '8 AM', color: 'green'),
        Prediction(occupancy: 4, time: '10 AM', color: 'yellow'),
        Prediction(occupancy: 5, time: '12 PM', color: 'red'),
        Prediction(occupancy: 4, time: '2 PM', color: 'yellow'),
        Prediction(occupancy: 2, time: '4 PM', color: 'green'),
        Prediction(occupancy: 1, time: '6 PM', color: 'green'),
      ],
      lastUpdated: DateTime.now(),
    );
  }

  Future<WeekPredictionDto> getWeekPredictions() async {
    // TODO: load data from API

    // Demo data
    return WeekPredictionDto(
      predictions: [
        WeekPrediction(occupancy: 1, day: 'Mon', color: 'green'),
        WeekPrediction(occupancy: 4, day: 'Tue', color: 'yellow'),
        WeekPrediction(occupancy: 5, day: 'Wed', color: 'red'),
        WeekPrediction(occupancy: 4, day: 'Thu', color: 'yellow'),
        WeekPrediction(occupancy: 2, day: 'Fri', color: 'green'),
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

const dashboardRepository = require('../repositories/dashboardRepository');
const recommendationService = require('./recommendationService');
const wellnessIndexService = require('./wellnessIndexService');
const {
  addDays,
  todayInAppTimeZone,
  validateIsoDate,
} = require('../utils/dateRange');
const AppError = require('../utils/AppError');

const getDashboard = async (userId, requestedDate) => {
  const today = todayInAppTimeZone();
  const logDate = requestedDate
    ? validateIsoDate(requestedDate)
    : today;

  if (logDate > today) {
    throw new AppError('No se puede consultar el dashboard de una fecha futura', 400);
  }

  const period = {
    from: addDays(logDate, -7),
    to: addDays(logDate, -1),
    days: 7,
  };
  const snapshot = await dashboardRepository.findDailySnapshot(userId, logDate);
  const [recommendationResult, wellnessIndex] = await Promise.all([
    recommendationService.getRecommendations(userId, logDate),
    wellnessIndexService.calculateWellnessIndex(
      userId,
      period,
      snapshot.active_goals
    ),
  ]);

  return {
    date: logDate,
    nutrition: snapshot.nutrition,
    activity: snapshot.activity,
    sleep: snapshot.sleep,
    weight: snapshot.weight,
    wellness_index: wellnessIndex,
    active_goals: snapshot.active_goals,
    recommendations: {
      period: recommendationResult.period,
      items: recommendationResult.recommendations,
    },
  };
};

module.exports = { getDashboard };

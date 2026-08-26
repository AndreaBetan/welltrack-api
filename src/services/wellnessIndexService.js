const recommendationRepository = require('../repositories/recommendationRepository');

const MIN_SLEEP_DAYS = 4;
const MIN_NUTRITION_DAYS = 4;
const REQUIRED_COMPONENTS = 2;
const TOTAL_COMPONENTS = 3;
const CALORIE_TOLERANCE = 0.1;
const CALORIE_MAX_DEVIATION = 0.5;

const round = (value, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const clampScore = (value) => Math.min(100, Math.max(0, round(value)));

const isPositiveNumber = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

const findGoal = (goals, type) =>
  goals.find((goal) => goal.goal_type === type) || null;

// El cumplimiento energético se considera completo dentro de un margen del
// ±10 %. Fuera de ese margen, la puntuación desciende hasta cero cuando la
// desviación alcanza aproximadamente el 50 %.
const calculateCalorieScore = (averageCalories, targetCalories) => {
  const deviation =
    Math.abs(averageCalories - targetCalories) / targetCalories;

  if (deviation <= CALORIE_TOLERANCE) return 100;

  const score =
    100 -
    ((deviation - CALORIE_TOLERANCE) /
      (CALORIE_MAX_DEVIATION - CALORIE_TOLERANCE)) *
      100;

  return clampScore(score);
};

const calculateNutritionComponent = (nutritionDays, calorieGoal) => {
  const validDays = nutritionDays.filter(
    (day) => Number(day.entries_count) >= 3 || Number(day.meal_types_count) >= 2
  );

  if (!calorieGoal || validDays.length < MIN_NUTRITION_DAYS) {
    return {
      score: null,
      days_with_data: validDays.length,
      required_days: MIN_NUTRITION_DAYS,
      reason: calorieGoal ? 'insufficient_data' : 'goal_not_configured',
    };
  }

  const target = Number(calorieGoal.target_value);
  if (!isPositiveNumber(target)) {
    return {
      score: null,
      days_with_data: validDays.length,
      required_days: MIN_NUTRITION_DAYS,
      reason: 'invalid_goal',
    };
  }

  const average =
    validDays.reduce((total, day) => total + Number(day.calories), 0) /
    validDays.length;

  return {
    score: calculateCalorieScore(average, target),
    days_with_data: validDays.length,
    required_days: MIN_NUTRITION_DAYS,
    average_calories: round(average),
    target_calories: target,
  };
};

const calculateActivityComponent = (activityDays, activityGoal, periodDays) => {
  if (!activityGoal || activityDays.length === 0) {
    return {
      score: null,
      days_with_data: activityDays.length,
      required_days: 1,
      reason: activityGoal ? 'insufficient_data' : 'goal_not_configured',
    };
  }

  const dailyTarget = Number(activityGoal.target_value);
  if (!isPositiveNumber(dailyTarget)) {
    return {
      score: null,
      days_with_data: activityDays.length,
      required_days: 1,
      reason: 'invalid_goal',
    };
  }

  const totalMinutes = activityDays.reduce(
    (total, day) => total + Number(day.activity_minutes),
    0
  );
  const weeklyTarget = dailyTarget * periodDays;

  return {
    score: clampScore(totalMinutes / weeklyTarget * 100),
    days_with_data: activityDays.length,
    required_days: 1,
    total_minutes: totalMinutes,
    target_minutes: weeklyTarget,
  };
};

const calculateSleepComponent = (sleepRows, sleepGoal) => {
  const sleeps = sleepRows.filter(
    (sleep, index, rows) =>
      rows.findIndex((row) => row.log_date === sleep.log_date) === index
  );

  if (!sleepGoal || sleeps.length < MIN_SLEEP_DAYS) {
    return {
      score: null,
      days_with_data: sleeps.length,
      required_days: MIN_SLEEP_DAYS,
      reason: sleepGoal ? 'insufficient_data' : 'goal_not_configured',
    };
  }

  const targetHours = Number(sleepGoal.target_value);
  if (!isPositiveNumber(targetHours)) {
    return {
      score: null,
      days_with_data: sleeps.length,
      required_days: MIN_SLEEP_DAYS,
      reason: 'invalid_goal',
    };
  }

  const averageHours =
    sleeps.reduce(
      (total, sleep) => total + Number(sleep.duration_minutes) / 60,
      0
    ) / sleeps.length;
  const averageQuality =
    sleeps.reduce(
      (total, sleep) => total + Number(sleep.sleep_quality),
      0
    ) / sleeps.length;
  const durationScore = clampScore(
    averageHours / targetHours * 100
  );
  const qualityScore = clampScore(averageQuality / 5 * 100);

  // La duración aporta el 70 % y la calidad subjetiva el 30 % del componente.
  return {
    score: clampScore(durationScore * 0.7 + qualityScore * 0.3),
    days_with_data: sleeps.length,
    required_days: MIN_SLEEP_DAYS,
    average_hours: round(averageHours),
    target_hours: targetHours,
    average_quality: round(averageQuality),
  };
};

const scoreLabel = (score) => {
  if (score === null) return 'insufficient_data';
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'in_progress';
  return 'needs_attention';
};

const calculateWellnessIndex = async (userId, period, activeGoals) => {
  const [nutritionDays, activityDays, sleeps] = await Promise.all([
    recommendationRepository.findNutritionSummariesByPeriod(
      userId,
      period.from,
      period.to
    ),
    recommendationRepository.findActivitySummariesByPeriod(
      userId,
      period.from,
      period.to
    ),
    recommendationRepository.findNightSleepByPeriod(
      userId,
      period.from,
      period.to
    ),
  ]);

  const components = {
    nutrition: calculateNutritionComponent(
      nutritionDays,
      findGoal(activeGoals, 'daily_calories')
    ),
    activity: calculateActivityComponent(
      activityDays,
      findGoal(activeGoals, 'daily_activity_minutes'),
      period.days
    ),
    sleep: calculateSleepComponent(
      sleeps,
      findGoal(activeGoals, 'nightly_sleep_hours')
    ),
  };
  const availableScores = Object.values(components)
    .map((component) => component.score)
    .filter((score) => score !== null);
  const availableComponents = availableScores.length;
  const score = availableComponents >= REQUIRED_COMPONENTS
    ? clampScore(
        availableScores.reduce((total, value) => total + value, 0) /
          availableScores.length
      )
    : null;

  return {
    score,
    label: scoreLabel(score),
    is_provisional: availableComponents < TOTAL_COMPONENTS,
    available_components: availableComponents,
    required_components: REQUIRED_COMPONENTS,
    period,
    components,
    disclaimer:
      'Indicador orientativo basado en los hábitos registrados; no constituye una evaluación médica.',
  };
};

module.exports = { calculateWellnessIndex };

const recommendationRepository = require('../repositories/recommendationRepository');
const AppError = require('../utils/AppError');

const APP_TIME_ZONE = process.env.APP_TIMEZONE || 'Europe/Madrid';
const ANALYSIS_DAYS = 7;
const WEEKLY_ACTIVITY_GUIDELINE_MINUTES = 150;
const CALORIE_TOLERANCE = 0.1;
const MACRO_TOLERANCE_POINTS = 5;
const MAX_RECOMMENDATIONS = 3;
const MIN_SLEEP_DAYS = 4;
const MIN_NUTRITION_DAYS = 4;
const MAX_RECOMMENDATIONS_PER_CATEGORY = 2;

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

const validateDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('La fecha debe tener el formato AAAA-MM-DD', 400);
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError('La fecha no es válida', 400);
  }

  return value;
};

const todayInAppTimeZone = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch (error) {
    throw new Error(`APP_TIMEZONE no es válida: ${APP_TIME_ZONE}`);
  }
};

const subtractDays = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};

const round = (value, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
};

const formatValue = (value) => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('es-ES', {
      maximumFractionDigits: 1,
    }).format(value);
  }

  return String(value);
};

// Solo se sustituyen identificadores simples. No se evalúa código procedente de
// la base de datos y se considera error dejar una variable sin resolver.
const renderTemplate = (template, variables, ruleCode) => {
  const rendered = template.replace(/\{\{([a-z_]+)\}\}/g, (_, variableName) => {
    if (!Object.prototype.hasOwnProperty.call(variables, variableName)) {
      throw new Error(
        `La regla ${ruleCode} requiere la variable ${variableName}`
      );
    }

    return formatValue(variables[variableName]);
  });

  if (/\{\{[^}]+\}\}/.test(rendered)) {
    throw new Error(`La regla ${ruleCode} contiene una variable no válida`);
  }

  return rendered;
};

const goalMapFromRows = (goals) =>
  new Map(goals.map((goal) => [goal.goal_type, goal]));

const minutesAtLocalTime = (dateValue) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(dateValue));

  const hour = Number(parts.find((part) => part.type === 'hour').value);
  const minute = Number(parts.find((part) => part.type === 'minute').value);
  const minutes = hour * 60 + minute;

  // Desplazar la madrugada detrás de la noche evita que 23:30 y 00:30
  // aparenten estar separadas por casi un día completo.
  return minutes < 12 * 60 ? minutes + 24 * 60 : minutes;
};

const calculateScheduleVariation = (sleepStarts) => {
  if (sleepStarts.length < 3) {
    return null;
  }

  const values = sleepStarts.map((entry) =>
    minutesAtLocalTime(entry.started_at)
  );
  return Math.max(...values) - Math.min(...values);
};

const buildCandidate = (code, type, variables, metrics = variables) => ({
  code,
  type,
  variables,
  metrics,
});

const evaluateSleep = ({ sleeps, sleepGoal }) => {
  // Si hubiera más de un registro nocturno para una fecha, se conserva el más
  // reciente. El repositorio los entrega ordenados por fecha y creación.
  const uniqueSleeps = sleeps.filter(
    (sleep, index, rows) =>
      rows.findIndex((row) => row.log_date === sleep.log_date) === index
  );

  if (uniqueSleeps.length < MIN_SLEEP_DAYS) {
    return { candidates: [], belowGoal: false, reachedGoal: false };
  }

  const candidates = [];
  const nightsRecorded = uniqueSleeps.length;
  const averageSleepHours = round(
    uniqueSleeps.reduce(
      (total, sleep) => total + Number(sleep.duration_minutes) / 60,
      0
    ) / nightsRecorded
  );
  const targetSleepHours = sleepGoal
    ? round(sleepGoal.target_value)
    : null;
  const nightsBelowGoal = targetSleepHours === null
    ? 0
    : uniqueSleeps.filter(
        (sleep) => Number(sleep.duration_minutes) / 60 < targetSleepHours
      ).length;
  const nightsAtGoal = targetSleepHours === null
    ? 0
    : nightsRecorded - nightsBelowGoal;
  const majorityThreshold = Math.ceil(nightsRecorded / 2);
  const belowGoal = nightsBelowGoal >= majorityThreshold;
  const reachedGoal = nightsAtGoal >= majorityThreshold;

  if (belowGoal) {
    candidates.push(
      buildCandidate('SLEEP_DURATION_BELOW_GOAL', 'warning', {
        sleep_hours: averageSleepHours,
        average_sleep_hours: averageSleepHours,
        difference_hours: round(targetSleepHours - averageSleepHours),
        target_sleep_hours: targetSleepHours,
        nights_below_goal: nightsBelowGoal,
        nights_recorded: nightsRecorded,
      })
    );
  } else if (reachedGoal) {
    candidates.push(
      buildCandidate('SLEEP_GOAL_REACHED', 'positive', {
        sleep_hours: averageSleepHours,
        average_sleep_hours: averageSleepHours,
        target_sleep_hours: targetSleepHours,
        nights_at_goal: nightsAtGoal,
        nights_recorded: nightsRecorded,
      })
    );
  }

  const sleepsWithQuality = uniqueSleeps.filter(
    (sleep) => sleep.sleep_quality !== null
  );
  const averageSleepQuality = sleepsWithQuality.length
    ? round(
        sleepsWithQuality.reduce(
          (total, sleep) => total + Number(sleep.sleep_quality),
          0
        ) / sleepsWithQuality.length
      )
    : null;

  if (averageSleepQuality !== null && averageSleepQuality <= 2) {
    candidates.push(
      buildCandidate('LOW_SLEEP_QUALITY', 'warning', {
        sleep_quality: averageSleepQuality,
        nights_recorded: sleepsWithQuality.length,
      })
    );
  }

  const sleepsWithLatency = uniqueSleeps.filter(
    (sleep) => sleep.sleep_latency_minutes !== null
  );
  const averageLatency = sleepsWithLatency.length
    ? round(
        sleepsWithLatency.reduce(
          (total, sleep) => total + Number(sleep.sleep_latency_minutes),
          0
        ) / sleepsWithLatency.length
      )
    : null;

  if (averageLatency !== null && averageLatency >= 30) {
    candidates.push(
      buildCandidate('HIGH_SLEEP_LATENCY', 'insight', {
        sleep_latency_minutes: averageLatency,
        nights_recorded: sleepsWithLatency.length,
      })
    );
  }

  const sleepsWithAwakenings = uniqueSleeps.filter(
    (sleep) => sleep.awakenings_count !== null
  );
  const averageAwakenings = sleepsWithAwakenings.length
    ? round(
        sleepsWithAwakenings.reduce(
          (total, sleep) => total + Number(sleep.awakenings_count),
          0
        ) / sleepsWithAwakenings.length
      )
    : null;

  if (averageAwakenings !== null && averageAwakenings >= 3) {
    candidates.push(
      buildCandidate('FREQUENT_AWAKENINGS', 'insight', {
        awakenings_count: averageAwakenings,
        nights_recorded: sleepsWithAwakenings.length,
      })
    );
  }

  const factorRules = {
    caffeine: 'CAFFEINE_AFFECTED_SLEEP',
    screens: 'SCREENS_AFFECTED_SLEEP',
    stress: 'STRESS_AFFECTED_SLEEP',
  };

  const factorCounts = uniqueSleeps
    .flatMap((sleep) => sleep.factor_codes)
    .reduce((counts, factorCode) => {
      counts[factorCode] = (counts[factorCode] || 0) + 1;
      return counts;
    }, {});

  for (const [factorCode, occurrences] of Object.entries(factorCounts)) {
    if (factorRules[factorCode] && occurrences >= 2) {
      candidates.push(
        buildCandidate(factorRules[factorCode], 'insight', {
          occurrences,
          nights_recorded: nightsRecorded,
        })
      );
    }
  }

  const sleepStarts = uniqueSleeps.filter((sleep) => sleep.started_at);
  const scheduleVariation = calculateScheduleVariation(sleepStarts);
  if (scheduleVariation !== null && scheduleVariation >= 90) {
    candidates.push(
      buildCandidate('IRREGULAR_SLEEP_SCHEDULE', 'insight', {
        days_analyzed: ANALYSIS_DAYS,
        schedule_variation_minutes: scheduleVariation,
      })
    );
  }

  return {
    candidates,
    belowGoal,
    reachedGoal,
    sleepHours: averageSleepHours,
    targetSleepHours,
    daysWithData: nightsRecorded,
  };
};

const evaluateActivity = ({ activities, activityGoal }) => {
  const candidates = [];
  const daysWithData = activities.length;
  const activityMinutes = activities.reduce(
    (total, day) => total + Number(day.activity_minutes),
    0
  );
  const equivalentMinutes = activities.reduce(
    (total, day) => total + Number(day.equivalent_minutes),
    0
  );
  const averageActivityMinutes = daysWithData
    ? round(activityMinutes / daysWithData)
    : 0;
  const targetActivityMinutes = activityGoal
    ? Number(activityGoal.target_value)
    : null;
  const weeklyTargetActivityMinutes = targetActivityMinutes === null
    ? null
    : targetActivityMinutes * ANALYSIS_DAYS;
  const hasEnoughData = daysWithData > 0;
  const belowGoal =
    hasEnoughData &&
    weeklyTargetActivityMinutes !== null &&
    activityMinutes < weeklyTargetActivityMinutes;
  const reachedGoal =
    hasEnoughData &&
    weeklyTargetActivityMinutes !== null &&
    activityMinutes >= weeklyTargetActivityMinutes;

  if (belowGoal) {
    candidates.push(
      buildCandidate('ACTIVITY_BELOW_GOAL', 'progress', {
        activity_minutes: activityMinutes,
        weekly_activity_minutes: activityMinutes,
        average_activity_minutes: averageActivityMinutes,
        target_activity_minutes: targetActivityMinutes,
        weekly_target_activity_minutes: weeklyTargetActivityMinutes,
        remaining_activity_minutes: round(
          weeklyTargetActivityMinutes - activityMinutes
        ),
        days_recorded: daysWithData,
      }, {
        activity_minutes: activityMinutes,
        weekly_target_activity_minutes: weeklyTargetActivityMinutes,
        remaining_activity_minutes: round(
          weeklyTargetActivityMinutes - activityMinutes
        ),
        active_days: daysWithData,
        equivalent_minutes: equivalentMinutes,
        days_analyzed: ANALYSIS_DAYS,
      })
    );
  } else if (reachedGoal) {
    candidates.push(
      buildCandidate('ACTIVITY_GOAL_REACHED', 'positive', {
        activity_minutes: activityMinutes,
        weekly_activity_minutes: activityMinutes,
        average_activity_minutes: averageActivityMinutes,
        target_activity_minutes: targetActivityMinutes,
        weekly_target_activity_minutes: weeklyTargetActivityMinutes,
        days_recorded: daysWithData,
      }, {
        activity_minutes: activityMinutes,
        weekly_target_activity_minutes: weeklyTargetActivityMinutes,
        active_days: daysWithData,
        equivalent_minutes: equivalentMinutes,
        days_analyzed: ANALYSIS_DAYS,
      })
    );
  }

  if (daysWithData > 0 && equivalentMinutes < WEEKLY_ACTIVITY_GUIDELINE_MINUTES) {
    candidates.push(
      buildCandidate('WEEKLY_ACTIVITY_BELOW_GUIDELINE', 'insight', {
        weekly_activity_minutes: activityMinutes,
        equivalent_activity_minutes: equivalentMinutes,
      }, {
        activity_minutes: activityMinutes,
        equivalent_minutes: equivalentMinutes,
        guideline_minutes: WEEKLY_ACTIVITY_GUIDELINE_MINUTES,
        days_analyzed: ANALYSIS_DAYS,
        active_days: daysWithData,
      })
    );
  }

  return {
    candidates,
    belowGoal,
    reachedGoal,
    hasDailyData: hasEnoughData,
    activityMinutes,
    averageActivityMinutes,
    targetActivityMinutes,
    weeklyTargetActivityMinutes,
    daysWithData,
  };
};

const evaluateNutrition = ({ nutritionDays, calorieGoal }) => {
  const candidates = [];
  const validDays = nutritionDays.filter(
    (day) => Number(day.entries_count) >= 3 || Number(day.meal_types_count) >= 2
  );
  const hasData = validDays.length >= MIN_NUTRITION_DAYS;
  const targetCalories = calorieGoal
    ? Number(calorieGoal.target_value)
    : null;

  if (!hasData || targetCalories === null) {
    return {
      candidates,
      hasData,
      withinGoal: false,
      consumedCalories: null,
      targetCalories,
      daysWithData: validDays.length,
    };
  }

  const lowerLimit = targetCalories * (1 - CALORIE_TOLERANCE);
  const upperLimit = targetCalories * (1 + CALORIE_TOLERANCE);
  const daysAboveGoal = validDays.filter(
    (day) => Number(day.calories) > upperLimit
  ).length;
  const daysBelowGoal = validDays.filter(
    (day) => Number(day.calories) < lowerLimit
  ).length;
  const daysWithinGoal = validDays.length - daysAboveGoal - daysBelowGoal;
  const majorityThreshold = Math.ceil(validDays.length / 2);
  const consumedCalories = round(
    validDays.reduce((total, day) => total + Number(day.calories), 0) /
      validDays.length
  );
  const withinGoal = daysWithinGoal >= majorityThreshold;

  if (daysAboveGoal >= majorityThreshold) {
    candidates.push(
      buildCandidate('CALORIES_ABOVE_GOAL', 'warning', {
        consumed_calories: consumedCalories,
        average_calories: consumedCalories,
        difference_calories: round(consumedCalories - targetCalories),
        target_calories: targetCalories,
        days_above_goal: daysAboveGoal,
        days_recorded: validDays.length,
      })
    );
  } else if (daysBelowGoal >= majorityThreshold) {
    candidates.push(
      buildCandidate('CALORIES_BELOW_GOAL', 'warning', {
        consumed_calories: consumedCalories,
        average_calories: consumedCalories,
        target_calories: targetCalories,
        remaining_calories: round(targetCalories - consumedCalories),
        days_below_goal: daysBelowGoal,
        days_recorded: validDays.length,
      })
    );
  } else if (withinGoal) {
    candidates.push(
      buildCandidate('CALORIE_GOAL_ON_TRACK', 'positive', {
        consumed_calories: consumedCalories,
        average_calories: consumedCalories,
        target_calories: targetCalories,
        days_at_goal: daysWithinGoal,
        days_recorded: validDays.length,
      })
    );
  }

  const rawDistribution = {
    carbs: calorieGoal.carbs_percentage,
    protein: calorieGoal.protein_percentage,
    fat: calorieGoal.fat_percentage,
  };
  const hasAllPercentages = Object.values(rawDistribution).every(
    (value) => value !== null && value !== undefined && value !== ''
  );
  const distribution = Object.fromEntries(
    Object.entries(rawDistribution).map(([macro, value]) => [macro, Number(value)])
  );
  const distributionValues = Object.values(distribution);
  const hasValidDistribution =
    hasAllPercentages &&
    distributionValues.every(
      (percentage) =>
        Number.isFinite(percentage) && percentage > 0 && percentage <= 100
    ) &&
    Math.abs(
      distributionValues.reduce((total, percentage) => total + percentage, 0) -
        100
    ) < 0.001;

  // El LEFT JOIN devuelve null cuando la meta no tiene distribución asociada.
  // Se valida antes de usar Number(), ya que Number(null) produciría un cero
  // aparentemente válido y podría generar una recomendación incorrecta.
  if (hasValidDistribution) {
    const macroCalories = {
      carbs: validDays.reduce((total, day) => total + Number(day.carbs), 0) * 4,
      protein: validDays.reduce((total, day) => total + Number(day.protein), 0) * 4,
      fat: validDays.reduce((total, day) => total + Number(day.fat), 0) * 9,
    };
    const totalMacroCalories = Object.values(macroCalories).reduce(
      (total, value) => total + value,
      0
    );

    if (totalMacroCalories > 0) {
      const labels = {
        carbs: 'carbohidratos',
        protein: 'proteína',
        fat: 'grasas',
      };
      const deviations = Object.keys(macroCalories).map((macro) => {
        const actual = round(
          (macroCalories[macro] / totalMacroCalories) * 100
        );
        return {
          macro,
          actual,
          target: distribution[macro],
          deviation: Math.abs(actual - distribution[macro]),
        };
      });
      const largestDeviation = deviations.sort(
        (a, b) => b.deviation - a.deviation
      )[0];

      if (largestDeviation.deviation > MACRO_TOLERANCE_POINTS) {
        candidates.push(
          buildCandidate('MACRO_DISTRIBUTION_OUTSIDE_GOAL', 'insight', {
            macro_name: labels[largestDeviation.macro],
            actual_percentage: largestDeviation.actual,
            target_percentage: largestDeviation.target,
          })
        );
      }
    }
  }

  return {
    candidates,
    hasData,
    withinGoal,
    consumedCalories,
    targetCalories,
    daysWithData: validDays.length,
  };
};

const selectCandidates = ({ sleepResult, activityResult, nutritionResult }) => {
  let candidates = [
    ...sleepResult.candidates,
    ...activityResult.candidates,
    ...nutritionResult.candidates,
  ];

  if (sleepResult.belowGoal && activityResult.belowGoal) {
    candidates = candidates.filter(
      ({ code }) =>
        !['SLEEP_DURATION_BELOW_GOAL', 'ACTIVITY_BELOW_GOAL'].includes(code)
    );
    candidates.push(
      buildCandidate('LOW_SLEEP_AND_ACTIVITY', 'warning', {
        sleep_hours: sleepResult.sleepHours,
        average_sleep_hours: sleepResult.sleepHours,
        target_sleep_hours: sleepResult.targetSleepHours,
        activity_minutes: activityResult.activityMinutes,
        weekly_activity_minutes: activityResult.activityMinutes,
        average_activity_minutes: activityResult.averageActivityMinutes,
        target_activity_minutes: activityResult.targetActivityMinutes,
        weekly_target_activity_minutes:
          activityResult.weeklyTargetActivityMinutes,
      })
    );
  }

  const allDailyGoalsReached =
    sleepResult.reachedGoal &&
    activityResult.reachedGoal &&
    nutritionResult.hasData &&
    nutritionResult.withinGoal;

  if (allDailyGoalsReached) {
    candidates = candidates.filter(
      ({ code }) =>
        ![
          'SLEEP_GOAL_REACHED',
          'ACTIVITY_GOAL_REACHED',
          'CALORIE_GOAL_ON_TRACK',
        ].includes(code)
    );
    candidates.push(
      buildCandidate('WEEKLY_GOALS_REACHED', 'positive', {})
    );
  }

  return candidates;
};

const sortCandidates = (candidates, rulesByCode) =>
  [...candidates].sort((a, b) => {
    const priorityDifference =
      (PRIORITY_WEIGHT[rulesByCode.get(b.code)?.default_priority] || 0) -
      (PRIORITY_WEIGHT[rulesByCode.get(a.code)?.default_priority] || 0);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    // En igualdad de prioridad se muestran primero advertencias y progreso.
    const typeWeight = { warning: 4, progress: 3, insight: 2, positive: 1 };
    return (typeWeight[b.type] || 0) - (typeWeight[a.type] || 0);
  });

// Primero selecciona una recomendación por categoría. De este modo una sola
// dimensión (por ejemplo, sueño) no ocupa las tres tarjetas disponibles.
const selectDiverseCandidates = (candidates, rulesByCode) => {
  const sorted = sortCandidates(candidates, rulesByCode).filter(({ code }) =>
    rulesByCode.has(code)
  );
  const selected = [];
  const categoryCounts = new Map();

  // Primera vuelta: se intenta representar una categoría diferente por tarjeta.
  for (const candidate of sorted) {
    const category = rulesByCode.get(candidate.code).category;
    if (!categoryCounts.has(category)) {
      selected.push(candidate);
      categoryCounts.set(category, 1);
    }

    if (selected.length === MAX_RECOMMENDATIONS) {
      return selected;
    }
  }

  // Segunda vuelta: completa los huecos, pero nunca deja que una categoría
  // ocupe las tres recomendaciones.
  for (const candidate of sorted) {
    if (selected.includes(candidate)) {
      continue;
    }

    const category = rulesByCode.get(candidate.code).category;
    const count = categoryCounts.get(category) || 0;
    if (count < MAX_RECOMMENDATIONS_PER_CATEGORY) {
      selected.push(candidate);
      categoryCounts.set(category, count + 1);
    }

    if (selected.length === MAX_RECOMMENDATIONS) {
      return selected;
    }
  }

  return selected;
};

const attachUniqueResources = (selected, rulesByCode) => {
  const usedResourceCodes = new Set();

  return selected.map((candidate) => {
    const rule = rulesByCode.get(candidate.code);
    const resources = rule.resources
      .filter((resource) => !usedResourceCodes.has(resource.code))
      .slice(0, 2);

    resources.forEach((resource) => usedResourceCodes.add(resource.code));

    return {
      code: rule.code,
      type: candidate.type,
      category: rule.category,
      priority: rule.default_priority,
      title: rule.title,
      description: renderTemplate(
        rule.description,
        candidate.variables,
        rule.code
      ),
      metrics: candidate.metrics,
      resources,
    };
  });
};

const getRecommendations = async (userId, requestedDate) => {
  const today = todayInAppTimeZone();
  const referenceDate = requestedDate ? validateDate(requestedDate) : today;

  if (referenceDate > today) {
    throw new AppError('No se pueden generar recomendaciones para una fecha futura', 400);
  }

  // La fecha de referencia nunca forma parte del análisis: puede ser un día
  // todavía abierto. Siempre se estudian los siete días completos anteriores.
  const periodEnd = subtractDays(referenceDate, 1);
  const periodStart = subtractDays(periodEnd, ANALYSIS_DAYS - 1);
  const [nutritionDays, activityDays, sleeps, goals] = await Promise.all([
    recommendationRepository.findNutritionSummariesByPeriod(
      userId,
      periodStart,
      periodEnd
    ),
    recommendationRepository.findActivitySummariesByPeriod(
      userId,
      periodStart,
      periodEnd
    ),
    recommendationRepository.findNightSleepByPeriod(
      userId,
      periodStart,
      periodEnd
    ),
    // Se usan los objetivos activos en la fecha de referencia. Así un objetivo
    // configurado hoy ya puede orientar el análisis de los registros previos.
    recommendationRepository.findActiveGoalsByDate(userId, referenceDate),
  ]);

  const goalsByType = goalMapFromRows(goals);
  const sleepResult = evaluateSleep({
    sleeps,
    sleepGoal: goalsByType.get('nightly_sleep_hours'),
  });
  const activityResult = evaluateActivity({
    activities: activityDays,
    activityGoal: goalsByType.get('daily_activity_minutes'),
  });
  const nutritionResult = evaluateNutrition({
    nutritionDays,
    calorieGoal: goalsByType.get('daily_calories'),
  });

  let candidates = selectCandidates({
    sleepResult,
    activityResult,
    nutritionResult,
  });

  if (goals.length === 0) {
    candidates.push(
      buildCandidate('SET_WELLBEING_GOALS', 'onboarding', {}, {
        goals_configured: 0,
      }),
      buildCandidate('GENERAL_BALANCED_HABITS', 'general', {})
    );
  } else if (candidates.length === 0) {
    candidates.push(
      buildCandidate('KEEP_TRACKING_HABITS', 'reminder', {}, {
        sleep_days: sleepResult.daysWithData || 0,
        activity_days: activityResult.daysWithData || 0,
        nutrition_days: nutritionResult.daysWithData || 0,
      })
    );
  }

  const uniqueCandidates = [
    ...new Map(candidates.map((candidate) => [candidate.code, candidate])).values(),
  ];
  const rules = await recommendationRepository.findActiveRulesWithResources(
    uniqueCandidates.map(({ code }) => code)
  );
  const rulesByCode = new Map(rules.map((rule) => [rule.code, rule]));

  const selected = selectDiverseCandidates(uniqueCandidates, rulesByCode);

  return {
    date: referenceDate,
    time_zone: APP_TIME_ZONE,
    generated_at: new Date().toISOString(),
    period: {
      from: periodStart,
      to: periodEnd,
      days: ANALYSIS_DAYS,
    },
    recommendations: attachUniqueResources(selected, rulesByCode),
  };
};

module.exports = {
  getRecommendations,
};

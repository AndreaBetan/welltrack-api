// Adapta el catálogo al análisis de los siete días completos anteriores.
// Las reglas siguen siendo reutilizables: la lógica y los umbrales permanecen
// en recommendationService y la base de datos conserva únicamente el contenido.
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE recommendation_rules
    SET description = CASE code
      WHEN 'SLEEP_DURATION_BELOW_GOAL' THEN
        'En {{nights_below_goal}} de las {{nights_recorded}} noches registradas dormiste menos que tu objetivo. Tu promedio fue de {{average_sleep_hours}} horas frente a {{target_sleep_hours}} horas.'
      WHEN 'LOW_SLEEP_QUALITY' THEN
        'La calidad media de tus últimas {{nights_recorded}} noches registradas fue de {{sleep_quality}} sobre 5. Revisa los factores asociados y prepara una rutina tranquila.'
      WHEN 'HIGH_SLEEP_LATENCY' THEN
        'Durante las últimas {{nights_recorded}} noches registradas tardaste una media de {{sleep_latency_minutes}} minutos en dormirte. Prueba una rutina relajante antes de acostarte.'
      WHEN 'FREQUENT_AWAKENINGS' THEN
        'Durante las últimas {{nights_recorded}} noches registraste una media de {{awakenings_count}} despertares. Revisa los factores asociados y procura mantener un entorno tranquilo.'
      WHEN 'ACTIVITY_BELOW_GOAL' THEN
        'En {{days_below_goal}} de los {{days_recorded}} días con actividad registrada quedaste por debajo de tu objetivo. Tu media fue de {{average_activity_minutes}} minutos frente a {{target_activity_minutes}} minutos.'
      WHEN 'CALORIES_ABOVE_GOAL' THEN
        'En {{days_above_goal}} de los {{days_recorded}} días con alimentación suficiente registrada superaste tu objetivo. Tu media fue de {{average_calories}} kcal frente a {{target_calories}} kcal.'
      WHEN 'CALORIES_BELOW_GOAL' THEN
        'En {{days_below_goal}} de los {{days_recorded}} días con alimentación suficiente registrada quedaste por debajo de tu objetivo. Tu media registrada fue de {{average_calories}} kcal frente a {{target_calories}} kcal.'
      WHEN 'MACRO_DISTRIBUTION_OUTSIDE_GOAL' THEN
        'En el periodo analizado, el porcentaje registrado de {{macro_name}} fue del {{actual_percentage}} %, mientras que tu objetivo es del {{target_percentage}} %.'
      WHEN 'LOW_SLEEP_AND_ACTIVITY' THEN
        'Durante el periodo analizado dormiste una media de {{average_sleep_hours}} horas frente a tu objetivo de {{target_sleep_hours}}, y registraste una media de {{average_activity_minutes}} minutos de actividad frente a {{target_activity_minutes}}.'
      WHEN 'ACTIVITY_GOAL_REACHED' THEN
        'Alcanzaste tu objetivo de actividad en {{days_at_goal}} de los {{days_recorded}} días registrados, con una media de {{average_activity_minutes}} minutos. ¡Buen trabajo!'
      WHEN 'SLEEP_GOAL_REACHED' THEN
        'Alcanzaste tu objetivo de sueño en {{nights_at_goal}} de las {{nights_recorded}} noches registradas. Tu promedio fue de {{average_sleep_hours}} horas.'
      WHEN 'CALORIE_GOAL_ON_TRACK' THEN
        'En {{days_at_goal}} de los {{days_recorded}} días con alimentación suficiente registrada te mantuviste cerca de tu objetivo, con una media de {{average_calories}} kcal.'
      ELSE description
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE code IN (
      'SLEEP_DURATION_BELOW_GOAL',
      'LOW_SLEEP_QUALITY',
      'HIGH_SLEEP_LATENCY',
      'FREQUENT_AWAKENINGS',
      'ACTIVITY_BELOW_GOAL',
      'CALORIES_ABOVE_GOAL',
      'CALORIES_BELOW_GOAL',
      'MACRO_DISTRIBUTION_OUTSIDE_GOAL',
      'LOW_SLEEP_AND_ACTIVITY',
      'ACTIVITY_GOAL_REACHED',
      'SLEEP_GOAL_REACHED',
      'CALORIE_GOAL_ON_TRACK'
    );

    UPDATE recommendation_rules
    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE code = 'DAILY_GOALS_REACHED';

    INSERT INTO recommendation_rules
      (code, category, title, description, default_priority)
    VALUES
      (
        'WEEKLY_GOALS_REACHED',
        'wellbeing',
        'Mantienes una buena constancia semanal',
        'Durante el periodo analizado alcanzaste de forma mayoritaria tus objetivos de alimentación, actividad y descanso. Mantén estos hábitos de manera sostenible.',
        'low'
      ),
      (
        'SET_WELLBEING_GOALS',
        'wellbeing',
        'Configura tus objetivos personales',
        'Define objetivos de alimentación, actividad y descanso para que WellTrack pueda comparar tus registros y ofrecerte recomendaciones personalizadas.',
        'medium'
      ),
      (
        'KEEP_TRACKING_HABITS',
        'wellbeing',
        'Continúa registrando tus hábitos',
        'No hay suficiente días información para identificar una tendencia. Mantén el registro de alimentación, actividad y descanso durante la semana.',
        'low'
      ),
      (
        'GENERAL_BALANCED_HABITS',
        'wellbeing',
        'Empieza con pequeños hábitos sostenibles',
        'Mantén horarios de descanso regulares, incorpora movimiento a tu rutina y registra tus comidas con constancia. Los pequeños cambios sostenidos facilitan el progreso.',
        'low'
      );

    INSERT INTO recommendation_rule_resources
      (rule_id, resource_id, display_order)
    SELECT rule.id, resource.id, association.display_order
    FROM (
      VALUES
        ('WEEKLY_GOALS_REACHED', 'AESAN_HEALTHY_HABITS', 1),
        ('GENERAL_BALANCED_HABITS', 'AESAN_HEALTHY_HABITS', 1),
        ('GENERAL_BALANCED_HABITS', 'WHO_PHYSICAL_ACTIVITY', 2)
    ) AS association(rule_code, resource_code, display_order)
    JOIN recommendation_rules rule ON rule.code = association.rule_code
    JOIN learning_resources resource ON resource.code = association.resource_code;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM recommendation_rules
    WHERE code IN (
      'WEEKLY_GOALS_REACHED',
      'SET_WELLBEING_GOALS',
      'KEEP_TRACKING_HABITS',
      'GENERAL_BALANCED_HABITS'
    );

    UPDATE recommendation_rules
    SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
    WHERE code = 'DAILY_GOALS_REACHED';

    UPDATE recommendation_rules
    SET description = CASE code
      WHEN 'SLEEP_DURATION_BELOW_GOAL' THEN 'Has dormido {{sleep_hours}} horas, {{difference_hours}} horas por debajo de tu objetivo de {{target_sleep_hours}} horas.'
      WHEN 'LOW_SLEEP_QUALITY' THEN 'La calidad de tu último descanso ha sido de {{sleep_quality}} sobre 5. Revisa los factores registrados y prepara una rutina tranquila antes de acostarte.'
      WHEN 'HIGH_SLEEP_LATENCY' THEN 'Has tardado aproximadamente {{sleep_latency_minutes}} minutos en dormirte. Prueba una rutina relajante y reduce estímulos antes de acostarte.'
      WHEN 'FREQUENT_AWAKENINGS' THEN 'Has registrado {{awakenings_count}} despertares durante el descanso. Revisa los factores asociados y procura mantener un entorno tranquilo.'
      WHEN 'ACTIVITY_BELOW_GOAL' THEN 'Hoy llevas {{activity_minutes}} de los {{target_activity_minutes}} minutos de actividad previstos. Te faltan {{remaining_activity_minutes}} minutos para alcanzar tu objetivo.'
      WHEN 'CALORIES_ABOVE_GOAL' THEN 'Hoy has consumido {{consumed_calories}} kcal, {{difference_calories}} kcal por encima de tu objetivo de {{target_calories}} kcal.'
      WHEN 'CALORIES_BELOW_GOAL' THEN 'Hoy has registrado {{consumed_calories}} de las {{target_calories}} kcal previstas. Te faltan {{remaining_calories}} kcal para alcanzar tu objetivo diario.'
      WHEN 'MACRO_DISTRIBUTION_OUTSIDE_GOAL' THEN 'Hoy el porcentaje de {{macro_name}} es del {{actual_percentage}} %, mientras que tu objetivo es del {{target_percentage}} %. Ajusta gradualmente la composición de tus comidas.'
      WHEN 'LOW_SLEEP_AND_ACTIVITY' THEN 'Hoy has dormido {{sleep_hours}} de las {{target_sleep_hours}} horas previstas y has realizado {{activity_minutes}} de los {{target_activity_minutes}} minutos de actividad de tu objetivo.'
      WHEN 'ACTIVITY_GOAL_REACHED' THEN 'Has completado {{activity_minutes}} minutos de actividad y alcanzado tu objetivo diario de {{target_activity_minutes}} minutos. ¡Buen trabajo!'
      WHEN 'SLEEP_GOAL_REACHED' THEN 'Has dormido {{sleep_hours}} horas y alcanzado tu objetivo de {{target_sleep_hours}} horas. Mantener la regularidad favorece el descanso.'
      WHEN 'CALORIE_GOAL_ON_TRACK' THEN 'Hoy has registrado {{consumed_calories}} kcal y te mantienes cerca de tu objetivo de {{target_calories}} kcal.'
      ELSE description
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE code IN (
      'SLEEP_DURATION_BELOW_GOAL', 'LOW_SLEEP_QUALITY',
      'HIGH_SLEEP_LATENCY', 'FREQUENT_AWAKENINGS', 'ACTIVITY_BELOW_GOAL',
      'CALORIES_ABOVE_GOAL', 'CALORIES_BELOW_GOAL',
      'MACRO_DISTRIBUTION_OUTSIDE_GOAL', 'LOW_SLEEP_AND_ACTIVITY',
      'ACTIVITY_GOAL_REACHED', 'SLEEP_GOAL_REACHED',
      'CALORIE_GOAL_ON_TRACK'
    );
  `);
};

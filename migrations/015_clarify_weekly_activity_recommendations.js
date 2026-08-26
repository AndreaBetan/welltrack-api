// Hace explícito que las métricas de actividad pertenecen al periodo semanal.
// El objetivo almacenado es diario, por lo que el servicio lo multiplica por
// los siete días completos incluidos en el análisis.
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE recommendation_rules
    SET description = CASE code
      WHEN 'ACTIVITY_BELOW_GOAL' THEN
        'Durante los últimos 7 días completos registraste {{weekly_activity_minutes}} minutos de actividad, distribuidos en {{days_recorded}} días. Tu objetivo semanal equivalente es de {{weekly_target_activity_minutes}} minutos y te faltaron {{remaining_activity_minutes}} minutos.'
      WHEN 'ACTIVITY_GOAL_REACHED' THEN
        'Durante los últimos 7 días completos registraste {{weekly_activity_minutes}} minutos de actividad y alcanzaste tu objetivo semanal equivalente de {{weekly_target_activity_minutes}} minutos. ¡Buen trabajo!'
      WHEN 'WEEKLY_ACTIVITY_BELOW_GUIDELINE' THEN
        'Durante los últimos 7 días completos registraste {{weekly_activity_minutes}} minutos de actividad. Teniendo en cuenta la intensidad, equivalen a {{equivalent_activity_minutes}} minutos moderados frente a la referencia semanal de 150 minutos.'
      WHEN 'LOW_SLEEP_AND_ACTIVITY' THEN
        'Durante el periodo analizado dormiste una media de {{average_sleep_hours}} horas frente a tu objetivo de {{target_sleep_hours}}, y registraste {{weekly_activity_minutes}} de los {{weekly_target_activity_minutes}} minutos de tu objetivo semanal de actividad.'
      ELSE description
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE code IN (
      'ACTIVITY_BELOW_GOAL',
      'ACTIVITY_GOAL_REACHED',
      'WEEKLY_ACTIVITY_BELOW_GUIDELINE',
      'LOW_SLEEP_AND_ACTIVITY'
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE recommendation_rules
    SET description = CASE code
      WHEN 'ACTIVITY_BELOW_GOAL' THEN
        'En {{days_below_goal}} de los {{days_recorded}} días con actividad registrada quedaste por debajo de tu objetivo. Tu media fue de {{average_activity_minutes}} minutos frente a {{target_activity_minutes}} minutos.'
      WHEN 'ACTIVITY_GOAL_REACHED' THEN
        'Alcanzaste tu objetivo de actividad en {{days_at_goal}} de los {{days_recorded}} días registrados, con una media de {{average_activity_minutes}} minutos. ¡Buen trabajo!'
      WHEN 'WEEKLY_ACTIVITY_BELOW_GUIDELINE' THEN
        'Durante los últimos 7 días has registrado {{weekly_activity_minutes}} minutos de actividad. Intenta aumentar progresivamente tu movimiento semanal.'
      WHEN 'LOW_SLEEP_AND_ACTIVITY' THEN
        'Durante el periodo analizado dormiste una media de {{average_sleep_hours}} horas frente a tu objetivo de {{target_sleep_hours}}, y registraste una media de {{average_activity_minutes}} minutos de actividad frente a {{target_activity_minutes}}.'
      ELSE description
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE code IN (
      'ACTIVITY_BELOW_GOAL',
      'ACTIVITY_GOAL_REACHED',
      'WEEKLY_ACTIVITY_BELOW_GUIDELINE',
      'LOW_SLEEP_AND_ACTIVITY'
    );
  `);
};

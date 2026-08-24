// Catálogo controlado de recomendaciones disponibles en WellTrack.
//
// Esta tabla no contiene user_id porque una regla puede reutilizarse para
// cualquier usuario. El servicio de recomendaciones será responsable de
// analizar los hábitos del usuario autenticado y devolver las reglas aplicables.
exports.up = (pgm) => {
  pgm.createTable('recommendation_rules', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    code: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    },
    category: {
      type: 'varchar(30)',
      notNull: true,
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
      notNull: true,
    },
    default_priority: {
      type: 'varchar(20)',
      notNull: true,
      default: 'medium',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Las categorías coinciden con las dimensiones analizadas por la aplicación.
  pgm.addConstraint(
    'recommendation_rules',
    'recommendation_rules_category_check',
    {
      check: "category IN ('nutrition', 'activity', 'sleep', 'wellbeing')",
    }
  );

  pgm.addConstraint(
    'recommendation_rules',
    'recommendation_rules_priority_check',
    {
      check: "default_priority IN ('low', 'medium', 'high')",
    }
  );

  // El código es el contrato entre la lógica del servicio y este catálogo.
  // Las condiciones no se guardan como SQL o JavaScript en la base de datos:
  // se implementan y prueban de forma segura en el servicio de recomendaciones.
  pgm.sql(`
    INSERT INTO recommendation_rules
      (code, category, title, description, default_priority)
    VALUES
      (
        'SLEEP_DURATION_BELOW_GOAL',
        'sleep',
        'Acércate a tu objetivo de sueño',
        'Has dormido {{sleep_hours}} horas, {{difference_hours}} horas por debajo de tu objetivo de {{target_sleep_hours}} horas.',
        'high'
      ),
      (
        'LOW_SLEEP_QUALITY',
        'sleep',
        'Mejora la calidad de tu descanso',
        'La calidad de tu último descanso ha sido de {{sleep_quality}} sobre 5. Revisa los factores registrados y prepara una rutina tranquila antes de acostarte.',
        'medium'
      ),
      (
        'IRREGULAR_SLEEP_SCHEDULE',
        'sleep',
        'Mantén un horario de sueño regular',
        'Durante los últimos {{days_analyzed}} días, tus horarios de sueño han variado aproximadamente {{schedule_variation_minutes}} minutos. Intenta acostarte y levantarte a horas similares.',
        'medium'
      ),
      (
        'ACTIVITY_BELOW_GOAL',
        'activity',
        'Aumenta progresivamente tu actividad',
        'Hoy llevas {{activity_minutes}} de los {{target_activity_minutes}} minutos de actividad previstos. Te faltan {{remaining_activity_minutes}} minutos para alcanzar tu objetivo.',
        'medium'
      ),
      (
        'CALORIES_ABOVE_GOAL',
        'nutrition',
        'Revisa tu balance energético',
        'Hoy has consumido {{consumed_calories}} kcal, {{difference_calories}} kcal por encima de tu objetivo de {{target_calories}} kcal.',
        'medium'
      ),
      (
        'CALORIES_BELOW_GOAL',
        'nutrition',
        'Revisa si tu ingesta es suficiente',
        'Hoy has registrado {{consumed_calories}} de las {{target_calories}} kcal previstas. Te faltan {{remaining_calories}} kcal para alcanzar tu objetivo diario.',
        'medium'
      ),
      (
        'MACRO_DISTRIBUTION_OUTSIDE_GOAL',
        'nutrition',
        'Equilibra tus macronutrientes',
        'Hoy el porcentaje de {{macro_name}} es del {{actual_percentage}} %, mientras que tu objetivo es del {{target_percentage}} %. Ajusta gradualmente la composición de tus comidas.',
        'low'
      ),
      (
        'LOW_SLEEP_AND_ACTIVITY',
        'wellbeing',
        'Prioriza descanso y movimiento',
        'Hoy has dormido {{sleep_hours}} de las {{target_sleep_hours}} horas previstas y has realizado {{activity_minutes}} de los {{target_activity_minutes}} minutos de actividad de tu objetivo.',
        'high'
      ),
      (
        'HIGH_SLEEP_LATENCY',
        'sleep',
        'Prepara mejor el momento de dormir',
        'Has tardado aproximadamente {{sleep_latency_minutes}} minutos en dormirte. Prueba una rutina relajante y reduce estímulos antes de acostarte.',
        'medium'
      ),
      (
        'FREQUENT_AWAKENINGS',
        'sleep',
        'Cuida la continuidad de tu descanso',
        'Has registrado {{awakenings_count}} despertares durante el descanso. Revisa los factores asociados y procura mantener un entorno tranquilo.',
        'medium'
      ),
      (
        'CAFFEINE_AFFECTED_SLEEP',
        'sleep',
        'Revisa el consumo de cafeína',
        'Has indicado que la cafeína afectó a tu descanso. Considera evitarla durante las horas previas a acostarte.',
        'medium'
      ),
      (
        'SCREENS_AFFECTED_SLEEP',
        'sleep',
        'Reduce las pantallas antes de dormir',
        'Has indicado que el uso de pantallas afectó a tu descanso. Prueba a reducirlas antes de acostarte y prepara una rutina más tranquila.',
        'low'
      ),
      (
        'STRESS_AFFECTED_SLEEP',
        'sleep',
        'Reserva un momento para relajarte',
        'Has registrado el estrés como factor asociado a tu descanso. Dedica unos minutos a una actividad relajante antes de dormir.',
        'medium'
      ),
      (
        'ACTIVITY_GOAL_REACHED',
        'activity',
        'Has alcanzado tu objetivo de actividad',
        'Has completado {{activity_minutes}} minutos de actividad y alcanzado tu objetivo diario de {{target_activity_minutes}} minutos. ¡Buen trabajo!',
        'low'
      ),
      (
        'SLEEP_GOAL_REACHED',
        'sleep',
        'Has alcanzado tu objetivo de sueño',
        'Has dormido {{sleep_hours}} horas y alcanzado tu objetivo de {{target_sleep_hours}} horas. Mantener la regularidad favorece el descanso.',
        'low'
      ),
      (
        'CALORIE_GOAL_ON_TRACK',
        'nutrition',
        'Mantienes un buen balance energético',
        'Hoy has registrado {{consumed_calories}} kcal y te mantienes cerca de tu objetivo de {{target_calories}} kcal.',
        'low'
      ),
      (
        'DAILY_GOALS_REACHED',
        'wellbeing',
        'Has cumplido tus objetivos diarios',
        'Hoy has cumplido tus objetivos de alimentación, actividad y descanso. Mantener esta constancia contribuirá a mejorar tus hábitos.',
        'low'
      ),
      (
        'WEEKLY_ACTIVITY_BELOW_GUIDELINE',
        'activity',
        'Aumenta tu actividad semanal',
        'Durante los últimos 7 días has registrado {{weekly_activity_minutes}} minutos de actividad. Intenta aumentar progresivamente tu movimiento semanal.',
        'medium'
      );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('recommendation_rules');
};

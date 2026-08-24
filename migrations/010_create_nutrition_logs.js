// Registros de alimentación introducidos manualmente o calculados a partir
// de la API externa. Cada fila representa un alimento consumido por un usuario.
exports.up = (pgm) => {
  pgm.createTable('nutrition_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
    },
    meal_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    calories: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    protein: {
      type: 'numeric(8,2)',
      notNull: true,
    },
    carbs: {
      type: 'numeric(8,2)',
      notNull: true,
    },
    fat: {
      type: 'numeric(8,2)',
      notNull: true,
    },
    log_date: {
      type: 'date',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    data_source: {
      type: 'varchar(30)',
      notNull: true,
      default: 'manual',
    },
    external_food_id: {
      type: 'varchar(100)',
    },
    food_name: {
      type: 'varchar(200)',
      notNull: true,
    },
    brand: {
      type: 'varchar(150)',
    },
    serving_grams: {
      type: 'numeric(8,2)',
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('nutrition_logs', 'fk_nutrition_user', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  // El catálogo de comidas mantiene un contrato estable entre frontend,
  // backend y base de datos.
  pgm.addConstraint('nutrition_logs', 'nutrition_logs_meal_type_check', {
    check: "meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')",
  });

  // Solo se aceptan las fuentes que el servicio sabe validar y proteger.
  pgm.addConstraint('nutrition_logs', 'nutrition_logs_data_source_check', {
    check: "data_source IN ('manual', 'calorieapi')",
  });

  pgm.addConstraint('nutrition_logs', 'nutrition_logs_values_check', {
    check: `
      serving_grams > 0
      AND calories >= 0
      AND protein >= 0
      AND carbs >= 0
      AND fat >= 0
    `,
  });

  // Este índice acelera el historial y los resúmenes diarios de cada usuario.
  pgm.createIndex('nutrition_logs', ['user_id', { name: 'log_date', sort: 'DESC' }], {
    name: 'nutrition_logs_user_date_idx',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('nutrition_logs');
};

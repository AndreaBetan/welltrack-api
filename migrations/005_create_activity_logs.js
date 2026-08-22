// Registro de sesiones: cada fila pertenece a un usuario y representa una sola
// actividad, por lo que no requiere una tabla intermedia con activity_types.
exports.up = (pgm) => {
  pgm.createTable('activity_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    activity_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    duration_minutes: {
      type: 'integer',
      notNull: true,
    },
    calories_burned: {
      type: 'integer',
    },
    log_date: {
      type: 'date',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      default: pgm.func('current_timestamp'),
    },
    intensity: {
      type: 'varchar(20)',
    },
    notes: {
      type: 'varchar(300)',
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('activity_logs', 'chk_activity_duration', {
    check: 'duration_minutes > 0',
  });
  pgm.addConstraint('activity_logs', 'chk_activity_calories', {
    check: 'calories_burned IS NULL OR calories_burned >= 0',
  });
  pgm.addConstraint('activity_logs', 'chk_activity_intensity', {
    check: "intensity IS NULL OR intensity IN ('low', 'moderate', 'high')",
  });
};

exports.down = (pgm) => {
  pgm.dropTable('activity_logs');
};

// Catálogo de actividades basado en el Compendium of Physical Activities.
exports.up = (pgm) => {
  pgm.createTable('activity_types', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    code: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    compendium_code: {
      type: 'varchar(10)',
      unique: true,
    },
    original_description: {
      type: 'varchar(300)',
    },
    met: {
      type: 'numeric(4,1)',
      notNull: true,
    },
    category: {
      type: 'varchar(50)',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('activity_types', 'activity_types_met_check', {
    check: 'met > 0',
  });

  // Datos semilla: permiten reconstruir el catálogo en una base nueva.
  pgm.sql(`
    INSERT INTO activity_types (
      code,
      name,
      compendium_code,
      original_description,
      met,
      category
    )
    VALUES
      ('basketball', 'Baloncesto', '15040', 'Basketball, game', 8.0, 'basketball'),
      ('cycling_general', 'Ciclismo general', '01014', 'Bicycling, general', 7.0, 'cycling'),
      ('football', 'Fútbol recreativo', '15610', 'Soccer, casual, general', 7.0, 'football'),
      ('jogging', 'Trotar', '12020', 'Jogging, general, self-selected pace', 7.5, 'running'),
      ('running_5_mph', 'Correr a ritmo moderado', '12030', 'Running, 5.0 to 5.2 mph', 8.5, 'running'),
      ('running_high', 'Correr rápido', '12070', 'Running, 7 mph', 11.0, 'running'),
      ('strength_general', 'Entrenamiento de fuerza', '02054', 'Resistance weight training, multiple exercises, 8-15 reps at varied resistance', 3.5, 'strength'),
      ('swimming_leisure', 'Natación recreativa', '18310', 'Swimming, leisurely, not lap swimming, general', 6.0, 'swimming'),
      ('walking_high', 'Caminar rápido', '17200', 'Walking, 3.5 to 3.9 mph, level, brisk, firm surface, walking for exercise', 4.8, 'walking'),
      ('walking_light', 'Caminar suave', '17170', 'Walking, 2.5 mph, firm, level surface', 3.0, 'walking'),
      ('walking_moderate', 'Caminar a ritmo moderado', '17190', 'Walking, 2.8 to 3.4 mph, level, moderate pace, firm surface', 3.8, 'walking'),
      ('yoga_general', 'Yoga general', '02175', 'Yoga, General', 2.3, 'yoga');
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('activity_types');
};

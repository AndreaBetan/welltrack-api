// Catálogo de factores y relación muchos-a-muchos con los registros de sueño.
exports.up = (pgm) => {
  pgm.createTable('sleep_factors', {
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
  });

  pgm.createTable('sleep_log_factors', {
    sleep_log_id: {
      type: 'uuid',
      notNull: true,
      references: 'sleep_logs',
      onDelete: 'CASCADE',
    },
    factor_id: {
      type: 'uuid',
      notNull: true,
      references: 'sleep_factors',
      onDelete: 'RESTRICT',
    },
  });

  // La clave compuesta impide repetir un factor en el mismo registro.
  pgm.addConstraint('sleep_log_factors', 'sleep_log_factors_pkey', {
    primaryKey: ['sleep_log_id', 'factor_id'],
  });
  pgm.createIndex('sleep_log_factors', 'factor_id');

  // Datos de catálogo disponibles desde la primera ejecución de la aplicación.
  pgm.sql(`
    INSERT INTO sleep_factors (code, name)
    VALUES
      ('caffeine', 'Cafeína'),
      ('stress', 'Estrés'),
      ('exercise', 'Ejercicio'),
      ('screens', 'Uso de pantallas');
  `);
};

exports.down = (pgm) => {
  // Primero se elimina la tabla dependiente para respetar las claves foráneas.
  pgm.dropTable('sleep_log_factors');
  pgm.dropTable('sleep_factors');
};

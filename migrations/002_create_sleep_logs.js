// Crea los datos propios de una sesión de sueño. Los factores externos se
// normalizan en las tablas de la migración 003 para evitar columnas repetitivas.
exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('sleep_logs', {
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
    duration_minutes: {
      type: 'numeric(4,2)',
      notNull: true,
    },
    sleep_quality: {
      type: 'integer',
      notNull: true,
    },
    sleep_latency_minutes: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    awakenings_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    sleep_type: {
      type: 'varchar(20)',
      notNull: true,
      default: 'night',
    },
    log_date: {
      type: 'date',
      notNull: true,
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

  // Las restricciones protegen la integridad incluso si se escribe en la base
  // desde una herramienta distinta a la API.
  pgm.addConstraint('sleep_logs', 'sleep_logs_quality_valid', {
    check: 'sleep_quality BETWEEN 1 AND 5',
  });
  pgm.addConstraint('sleep_logs', 'sleep_logs_latency_valid', {
    check: 'sleep_latency_minutes BETWEEN 0 AND 1440',
  });
  pgm.addConstraint('sleep_logs', 'sleep_logs_awakenings_valid', {
    check: 'awakenings_count >= 0',
  });
  pgm.addConstraint('sleep_logs', 'sleep_logs_type_valid', {
    check: "sleep_type IN ('night', 'nap')",
  });

  // Índice utilizado por el listado y por el filtro diario del usuario.
  pgm.createIndex('sleep_logs', ['user_id', 'log_date']);
};

// Revierte exclusivamente la tabla; pgcrypto puede ser utilizada por otras tablas.
exports.down = (pgm) => {
  pgm.dropTable('sleep_logs');
};

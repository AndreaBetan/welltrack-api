// up aplica el cambio de esquema al avanzar la migración.
exports.up = (pgm) => {
  pgm.createTable('users', {
    id: {
      type: 'bigserial',
      primaryKey: true,
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      // Solo se persiste el hash generado por bcrypt.
      type: 'varchar(255)',
      notNull: true,
    },
    gender: {
      type: 'varchar(30)',
    },
    birth_date: {
      type: 'date',
    },
    height: {
      type: 'numeric(5,2)',
    },
    weight: {
      type: 'numeric(5,2)',
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
};

// down define cómo revertir esta migración.
exports.down = (pgm) => {
  pgm.dropTable('users');
};

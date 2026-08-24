// Historial de peso registrado por cada usuario.
// Esta migración permite reconstruir la tabla en una base de datos nueva.
exports.up = (pgm) => {
  pgm.createTable('weight_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
    },
    weight: {
      type: 'numeric(5,2)',
      notNull: true,
    },
    log_date: {
      type: 'date',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      default: pgm.func('current_timestamp'),
    },
  });

  // Cada registro pertenece a un usuario. Si el usuario se elimina, también
  // se eliminan sus mediciones de peso para evitar registros huérfanos.
  pgm.addConstraint('weight_logs', 'fk_weight_user', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('weight_logs');
};

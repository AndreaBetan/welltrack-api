// Tabla principal de metas. Se mantiene como migración independiente para que
// las instalaciones nuevas puedan reconstruir el esquema completo.
exports.up = (pgm) => {
  pgm.createTable('goals', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
    },
    goal_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    target_value: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    start_date: {
      type: 'date',
      notNull: true,
    },
    end_date: {
      type: 'date',
    },
    status: {
      type: 'varchar(20)',
      default: 'ACTIVE',
    },
    created_at: {
      type: 'timestamp',
      default: pgm.func('current_timestamp'),
    },
    is_deleted: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    deleted_at: {
      type: 'timestamp',
    },
  });

  // La eliminación de un usuario elimina también todas sus metas.
  pgm.addConstraint('goals', 'fk_goals_user', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('goals');
};

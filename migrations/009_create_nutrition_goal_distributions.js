// Distribución de macronutrientes asociada de forma única a una meta.
exports.up = (pgm) => {
  pgm.createTable('nutrition_goal_distributions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    goal_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'goals',
      onDelete: 'CASCADE',
    },
    carbs_percentage: {
      type: 'numeric(5,2)',
      notNull: true,
    },
    protein_percentage: {
      type: 'numeric(5,2)',
      notNull: true,
    },
    fat_percentage: {
      type: 'numeric(5,2)',
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

  // Los tres porcentajes deben formar el 100 % de la distribución.
  pgm.addConstraint(
    'nutrition_goal_distributions',
    'nutrition_percentages_total_check',
    {
      check: `
        carbs_percentage
        + protein_percentage
        + fat_percentage = 100
      `,
    }
  );

  pgm.addConstraint(
    'nutrition_goal_distributions',
    'nutrition_percentage_values_check',
    {
      check: `
        carbs_percentage > 0
        AND protein_percentage > 0
        AND fat_percentage > 0
      `,
    }
  );
};

exports.down = (pgm) => {
  pgm.dropTable('nutrition_goal_distributions');
};

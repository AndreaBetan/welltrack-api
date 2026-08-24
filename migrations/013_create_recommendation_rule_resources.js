// Relación muchos-a-muchos entre las reglas y sus materiales de apoyo.
// display_order permite controlar qué recurso se presenta primero.
exports.up = (pgm) => {
  pgm.createTable('recommendation_rule_resources', {
    rule_id: {
      type: 'uuid',
      notNull: true,
      references: 'recommendation_rules(id)',
      onDelete: 'CASCADE',
    },
    resource_id: {
      type: 'uuid',
      notNull: true,
      references: 'learning_resources(id)',
      onDelete: 'CASCADE',
    },
    display_order: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
  });

  pgm.addConstraint(
    'recommendation_rule_resources',
    'recommendation_rule_resources_pkey',
    {
      primaryKey: ['rule_id', 'resource_id'],
    }
  );

  pgm.addConstraint(
    'recommendation_rule_resources',
    'recommendation_rule_resources_order_check',
    {
      check: 'display_order > 0',
    }
  );

  // La clave primaria empieza por rule_id, que es la consulta principal. Este
  // índice adicional facilita las operaciones que parten desde un recurso.
  pgm.createIndex('recommendation_rule_resources', 'resource_id', {
    name: 'recommendation_rule_resources_resource_idx',
  });

  pgm.sql(`
    INSERT INTO recommendation_rule_resources
      (rule_id, resource_id, display_order)
    SELECT rule.id, resource.id, association.display_order
    FROM (
      VALUES
        ('SLEEP_DURATION_BELOW_GOAL', 'NHS_BETTER_SLEEP', 1),
        ('LOW_SLEEP_QUALITY', 'NHS_BETTER_SLEEP', 1),
        ('LOW_SLEEP_QUALITY', 'WHO_STRESS_GUIDE', 2),
        ('IRREGULAR_SLEEP_SCHEDULE', 'NHS_BETTER_SLEEP', 1),
        ('HIGH_SLEEP_LATENCY', 'NHS_BETTER_SLEEP', 1),
        ('HIGH_SLEEP_LATENCY', 'WHO_STRESS_GUIDE', 2),
        ('FREQUENT_AWAKENINGS', 'NHS_BETTER_SLEEP', 1),
        ('CAFFEINE_AFFECTED_SLEEP', 'NHS_BETTER_SLEEP', 1),
        ('SCREENS_AFFECTED_SLEEP', 'NHS_BETTER_SLEEP', 1),
        ('STRESS_AFFECTED_SLEEP', 'WHO_STRESS_GUIDE', 1),
        ('SLEEP_GOAL_REACHED', 'NHS_BETTER_SLEEP', 1),

        ('ACTIVITY_BELOW_GOAL', 'NHS_FITNESS_STUDIO', 1),
        ('ACTIVITY_BELOW_GOAL', 'WHO_PHYSICAL_ACTIVITY', 2),
        ('ACTIVITY_GOAL_REACHED', 'NHS_FITNESS_STUDIO', 1),
        ('WEEKLY_ACTIVITY_BELOW_GUIDELINE', 'WHO_PHYSICAL_ACTIVITY', 1),
        ('WEEKLY_ACTIVITY_BELOW_GUIDELINE', 'NHS_FITNESS_STUDIO', 2),

        ('CALORIES_ABOVE_GOAL', 'AESAN_HEALTHY_HABITS', 1),
        ('CALORIES_ABOVE_GOAL', 'WHO_HEALTHY_DIET', 2),
        ('CALORIES_BELOW_GOAL', 'AESAN_HEALTHY_HABITS', 1),
        ('CALORIES_BELOW_GOAL', 'WHO_HEALTHY_DIET', 2),
        ('MACRO_DISTRIBUTION_OUTSIDE_GOAL', 'WHO_HEALTHY_DIET', 1),
        ('MACRO_DISTRIBUTION_OUTSIDE_GOAL', 'AESAN_HEALTHY_HABITS', 2),
        ('CALORIE_GOAL_ON_TRACK', 'AESAN_HEALTHY_HABITS', 1),

        ('LOW_SLEEP_AND_ACTIVITY', 'NHS_BETTER_SLEEP', 1),
        ('LOW_SLEEP_AND_ACTIVITY', 'NHS_FITNESS_STUDIO', 2),
        ('DAILY_GOALS_REACHED', 'AESAN_HEALTHY_HABITS', 1)
    ) AS association(rule_code, resource_code, display_order)
    JOIN recommendation_rules rule
      ON rule.code = association.rule_code
    JOIN learning_resources resource
      ON resource.code = association.resource_code;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('recommendation_rule_resources');
};

const { query } = require('../db');

// Devuelve un resumen por día. El servicio decide qué días tienen suficientes
// registros para formar parte del análisis y nunca interpreta un día ausente
// como una ingesta de cero calorías.
const findNutritionSummariesByPeriod = async (userId, startDate, endDate) => {
  const result = await query(
    `
      SELECT
        log_date,
        COUNT(*)::integer AS entries_count,
        COUNT(DISTINCT meal_type)::integer AS meal_types_count,
        COALESCE(SUM(calories), 0) AS calories,
        COALESCE(SUM(protein), 0) AS protein,
        COALESCE(SUM(carbs), 0) AS carbs,
        COALESCE(SUM(fat), 0) AS fat
      FROM nutrition_logs
      WHERE user_id = $1
        AND log_date BETWEEN $2 AND $3
      GROUP BY log_date
      ORDER BY log_date ASC
    `,
    [userId, startDate, endDate]
  );

  return result.rows;
};

const findActivitySummariesByPeriod = async (userId, startDate, endDate) => {
  const result = await query(
    `
      SELECT
        log_date,
        COUNT(*)::integer AS entries_count,
        COALESCE(SUM(duration_minutes), 0)::integer AS activity_minutes,
        COALESCE(
          SUM(
            CASE LOWER(COALESCE(intensity, ''))
              WHEN 'high' THEN duration_minutes * 2
              WHEN 'moderate' THEN duration_minutes
              ELSE 0
            END
          ),
          0
        )::integer AS equivalent_minutes
      FROM activity_logs
      WHERE user_id = $1
        AND log_date BETWEEN $2 AND $3
      GROUP BY log_date
      ORDER BY log_date ASC
    `,
    [userId, startDate, endDate]
  );

  return result.rows;
};

const findNightSleepByPeriod = async (userId, startDate, endDate) => {
  const result = await query(
    `
      SELECT
        sl.id,
        sl.started_at,
        sl.ended_at,
        sl.duration_minutes,
        sl.sleep_quality,
        sl.sleep_latency_minutes,
        sl.awakenings_count,
        sl.log_date,
        COALESCE(
          ARRAY_AGG(sf.code ORDER BY sf.code)
            FILTER (WHERE sf.code IS NOT NULL),
          ARRAY[]::varchar[]
        ) AS factor_codes
      FROM sleep_logs sl
      LEFT JOIN sleep_log_factors slf ON slf.sleep_log_id = sl.id
      LEFT JOIN sleep_factors sf ON sf.id = slf.factor_id
      WHERE sl.user_id = $1
        AND sl.log_date BETWEEN $2 AND $3
        AND sl.sleep_type = 'night'
      GROUP BY sl.id
      ORDER BY sl.log_date ASC, sl.created_at DESC, sl.id DESC
    `,
    [userId, startDate, endDate]
  );

  return result.rows;
};

// DISTINCT ON selecciona la meta activa más reciente de cada tipo para la
// fecha analizada. La distribución nutricional solo existirá para calorías.
const findActiveGoalsByDate = async (userId, logDate) => {
  const result = await query(
    `
      SELECT DISTINCT ON (g.goal_type)
        g.id,
        g.goal_type,
        g.target_value,
        ngd.carbs_percentage,
        ngd.protein_percentage,
        ngd.fat_percentage
      FROM goals g
      LEFT JOIN nutrition_goal_distributions ngd ON ngd.goal_id = g.id
      WHERE g.user_id = $1
        AND g.is_deleted IS NOT TRUE
        AND LOWER(g.status) = 'active'
        AND g.start_date <= $2
        AND (g.end_date IS NULL OR g.end_date >= $2)
      ORDER BY g.goal_type, g.start_date DESC, g.created_at DESC
    `,
    [userId, logDate]
  );

  return result.rows;
};

// Devuelve las reglas seleccionadas junto con un máximo de dos recursos activos
// en el orden definido por recommendation_rule_resources.display_order.
const findActiveRulesWithResources = async (codes) => {
  if (codes.length === 0) {
    return [];
  }

  const result = await query(
    `
      SELECT
        rule.code,
        rule.category,
        rule.title,
        rule.description,
        rule.default_priority,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'code', resource.code,
              'title', resource.title,
              'description', resource.description,
              'type', resource.resource_type,
              'provider', resource.provider,
              'url', resource.resource_url,
              'language', resource.language,
              'access_mode', resource.access_mode,
              'license_name', resource.license_name,
              'license_url', resource.license_url,
              'duration_minutes', resource.duration_minutes,
              'difficulty', resource.difficulty,
              'safety_note', resource.safety_note
            )
            ORDER BY link.display_order
          ) FILTER (WHERE resource.id IS NOT NULL),
          '[]'::json
        ) AS resources
      FROM recommendation_rules rule
      LEFT JOIN recommendation_rule_resources link
        ON link.rule_id = rule.id
      LEFT JOIN learning_resources resource
        ON resource.id = link.resource_id
        AND resource.is_active = TRUE
      WHERE rule.code = ANY($1::varchar[])
        AND rule.is_active = TRUE
      GROUP BY rule.id
    `,
    [codes]
  );

  return result.rows;
};

module.exports = {
  findNutritionSummariesByPeriod,
  findActivitySummariesByPeriod,
  findNightSleepByPeriod,
  findActiveGoalsByDate,
  findActiveRulesWithResources,
};

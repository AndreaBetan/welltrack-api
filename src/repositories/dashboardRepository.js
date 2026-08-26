const { query } = require("../db");

const findDailySnapshot = async (userId, logDate) => {
  const [nutrition, activity, sleep, goals, weight] = await Promise.all([
    query(
      `
        SELECT
          COUNT(*)::integer AS entries_count,
          COALESCE(ROUND(SUM(calories), 2), 0)::float8 AS calories,
          COALESCE(ROUND(SUM(protein), 2), 0)::float8 AS protein,
          COALESCE(ROUND(SUM(carbs), 2), 0)::float8 AS carbs,
          COALESCE(ROUND(SUM(fat), 2), 0)::float8 AS fat
        FROM nutrition_logs
        WHERE user_id = $1 AND log_date = $2
      `,
      [userId, logDate],
    ),
    query(
      `
        SELECT
          COUNT(*)::integer AS entries_count,
          COALESCE(SUM(duration_minutes), 0)::integer AS minutes,
          COALESCE(SUM(calories_burned), 0)::integer AS calories_burned
        FROM activity_logs
        WHERE user_id = $1 AND log_date = $2
      `,
      [userId, logDate],
    ),
    query(
      `
        SELECT
          id,
          duration_minutes,
          sleep_quality,
          sleep_latency_minutes,
          awakenings_count,
          sleep_type,
          started_at,
          ended_at,
          log_date
        FROM sleep_logs
        WHERE user_id = $1
          AND log_date = $2
          AND sleep_type = 'night'
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [userId, logDate],
    ),
    query(
      `
        SELECT DISTINCT ON (g.goal_type)
          g.id,
          g.goal_type,
          g.target_value,
          g.start_date,
          g.end_date,
          g.status,
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
      [userId, logDate],
    ),
    query(
      `
        SELECT
          latest.weight::float8 AS current_weight,
          latest.log_date AS weight_date
        FROM users u
        LEFT JOIN LATERAL (
          SELECT weight, log_date
          FROM weight_logs
          WHERE user_id = u.id AND log_date <= $2
          ORDER BY log_date DESC, created_at DESC
          LIMIT 1
        ) latest ON TRUE
        WHERE u.id = $1
      `,
      [userId, logDate],
    ),
  ]);

  return {
    nutrition: nutrition.rows[0],
    activity: activity.rows[0],
    sleep: sleep.rows[0] || null,
    active_goals: goals.rows,
    weight: weight.rows[0] || null,
  };
};

module.exports = { findDailySnapshot };

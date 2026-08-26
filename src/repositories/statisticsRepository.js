const { query } = require('../db');

const findSummary = async (userId, from, to) => {
  const [nutrition, activity, sleep, weight] = await Promise.all([
    query(
      `
        WITH daily AS (
          SELECT
            log_date,
            SUM(calories) AS calories,
            SUM(protein) AS protein,
            SUM(carbs) AS carbs,
            SUM(fat) AS fat
          FROM nutrition_logs
          WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
          GROUP BY log_date
        )
        SELECT
          COUNT(*)::integer AS days_recorded,
          COALESCE(ROUND(AVG(calories), 2), 0)::float8 AS average_calories,
          COALESCE(ROUND(AVG(protein), 2), 0)::float8 AS average_protein,
          COALESCE(ROUND(AVG(carbs), 2), 0)::float8 AS average_carbs,
          COALESCE(ROUND(AVG(fat), 2), 0)::float8 AS average_fat
        FROM daily
      `,
      [userId, from, to]
    ),
    query(
      `
        SELECT
          COUNT(DISTINCT log_date)::integer AS active_days,
          COALESCE(SUM(duration_minutes), 0)::integer AS total_minutes,
          COALESCE(SUM(calories_burned), 0)::integer AS calories_burned,
          CASE WHEN COUNT(DISTINCT log_date) = 0 THEN 0
            ELSE ROUND(
              SUM(duration_minutes)::numeric / COUNT(DISTINCT log_date),
              2
            )::float8
          END AS average_minutes_per_active_day
        FROM activity_logs
        WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
      `,
      [userId, from, to]
    ),
    query(
      `
        WITH latest_night_per_date AS (
          SELECT DISTINCT ON (log_date)
            log_date,
            duration_minutes,
            sleep_quality,
            sleep_latency_minutes,
            awakenings_count
          FROM sleep_logs
          WHERE user_id = $1
            AND log_date BETWEEN $2 AND $3
            AND sleep_type = 'night'
          ORDER BY log_date ASC, created_at DESC, id DESC
        )
        SELECT
          COUNT(*)::integer AS nights_recorded,
          COALESCE(ROUND(AVG(duration_minutes), 2), 0)::float8
            AS average_duration_minutes,
          COALESCE(ROUND(AVG(sleep_quality), 2), 0)::float8
            AS average_quality,
          COALESCE(ROUND(AVG(sleep_latency_minutes), 2), 0)::float8
            AS average_latency_minutes,
          COALESCE(ROUND(AVG(awakenings_count), 2), 0)::float8
            AS average_awakenings
        FROM latest_night_per_date
      `,
      [userId, from, to]
    ),
    query(
      `
        SELECT
          period_start.weight::float8 AS initial_weight,
          period_start.log_date AS initial_weight_date,
          period_end.weight::float8 AS latest_weight,
          period_end.log_date AS latest_weight_date,
          CASE
            WHEN period_start.weight IS NULL OR period_end.weight IS NULL
              THEN NULL
            ELSE ROUND(
              (period_end.weight - period_start.weight)::numeric,
              2
            )::float8
          END AS weight_change
        FROM (SELECT $1::uuid AS user_id) requested_user
        LEFT JOIN LATERAL (
          SELECT weight, log_date
          FROM weight_logs
          WHERE user_id = requested_user.user_id
            AND log_date <= $2::date
          ORDER BY log_date DESC, created_at DESC
          LIMIT 1
        ) period_start ON TRUE
        LEFT JOIN LATERAL (
          SELECT weight, log_date
          FROM weight_logs
          WHERE user_id = requested_user.user_id
            AND log_date <= $3::date
          ORDER BY log_date DESC, created_at DESC
          LIMIT 1
        ) period_end ON TRUE
      `,
      [userId, from, to]
    ),
  ]);

  return {
    nutrition: nutrition.rows[0],
    activity: activity.rows[0],
    sleep: sleep.rows[0],
    weight: weight.rows[0] || null,
  };
};

const findTrends = async (userId, from, to) => {
  const [nutrition, activity, sleep, weight] = await Promise.all([
    query(
      `
        SELECT
          log_date AS date,
          ROUND(SUM(calories), 2)::float8 AS calories,
          ROUND(SUM(protein), 2)::float8 AS protein,
          ROUND(SUM(carbs), 2)::float8 AS carbs,
          ROUND(SUM(fat), 2)::float8 AS fat
        FROM nutrition_logs
        WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
        GROUP BY log_date
        ORDER BY log_date ASC
      `,
      [userId, from, to]
    ),
    query(
      `
        SELECT
          log_date AS date,
          SUM(duration_minutes)::integer AS minutes,
          COALESCE(SUM(calories_burned), 0)::integer AS calories_burned
        FROM activity_logs
        WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
        GROUP BY log_date
        ORDER BY log_date ASC
      `,
      [userId, from, to]
    ),
    query(
      `
        WITH latest_night_per_date AS (
          SELECT DISTINCT ON (log_date)
            log_date,
            duration_minutes,
            sleep_quality,
            sleep_latency_minutes,
            awakenings_count
          FROM sleep_logs
          WHERE user_id = $1
            AND log_date BETWEEN $2 AND $3
            AND sleep_type = 'night'
          ORDER BY log_date ASC, created_at DESC, id DESC
        )
        SELECT
          log_date AS date,
          duration_minutes::float8 AS duration_minutes,
          sleep_quality::float8 AS quality,
          sleep_latency_minutes::float8 AS latency_minutes,
          awakenings_count::float8 AS awakenings
        FROM latest_night_per_date
        ORDER BY log_date ASC
      `,
      [userId, from, to]
    ),
    query(
      `
        WITH latest_weight_per_date AS (
          SELECT DISTINCT ON (log_date)
            log_date,
            weight
          FROM weight_logs
          WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
          ORDER BY log_date ASC, created_at DESC, id DESC
        )
        SELECT log_date AS date, weight::float8 AS weight
        FROM latest_weight_per_date
        ORDER BY log_date ASC
      `,
      [userId, from, to]
    ),
  ]);

  return {
    nutrition: nutrition.rows,
    activity: activity.rows,
    sleep: sleep.rows,
    weight: weight.rows,
  };
};

module.exports = { findSummary, findTrends };

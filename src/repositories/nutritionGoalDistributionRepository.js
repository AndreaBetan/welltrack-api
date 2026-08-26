const { query } = require('../db');

const DISTRIBUTION_FIELDS = `
  ngd.id,
  ngd.goal_id,
  ngd.carbs_percentage,
  ngd.protein_percentage,
  ngd.fat_percentage,
  ngd.created_at,
  ngd.updated_at
`;

// El JOIN con goals garantiza que un usuario nunca lea la distribución de otro.
const findByGoalIdAndUserId = async (goalId, userId) => {
  const result = await query(
    `
      SELECT ${DISTRIBUTION_FIELDS}
      FROM nutrition_goal_distributions ngd
      JOIN goals g ON g.id = ngd.goal_id
      WHERE ngd.goal_id = $1
        AND g.user_id = $2
        AND g.is_deleted IS NOT TRUE
      LIMIT 1
    `,
    [goalId, userId]
  );

  return result.rows[0] || null;
};

// PUT es idempotente: crea la distribución o reemplaza sus porcentajes si ya
// existe para la misma meta.
const upsertByGoalIdAndUserId = async (goalId, userId, distribution) => {
  const result = await query(
    `
      INSERT INTO nutrition_goal_distributions (
        goal_id,
        carbs_percentage,
        protein_percentage,
        fat_percentage
      )
      SELECT g.id, $3, $4, $5
      FROM goals g
      WHERE g.id = $1
        AND g.user_id = $2
        AND g.is_deleted IS NOT TRUE
      ON CONFLICT (goal_id)
      DO UPDATE SET
        carbs_percentage = EXCLUDED.carbs_percentage,
        protein_percentage = EXCLUDED.protein_percentage,
        fat_percentage = EXCLUDED.fat_percentage,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, goal_id, carbs_percentage, protein_percentage,
        fat_percentage, created_at, updated_at
    `,
    [
      goalId,
      userId,
      distribution.carbsPercentage,
      distribution.proteinPercentage,
      distribution.fatPercentage,
    ]
  );

  return result.rows[0] || null;
};

const deleteByGoalIdAndUserId = async (goalId, userId) => {
  const result = await query(
    `
      DELETE FROM nutrition_goal_distributions ngd
      USING goals g
      WHERE ngd.goal_id = $1
        AND g.id = ngd.goal_id
        AND g.user_id = $2
        AND g.is_deleted IS NOT TRUE
      RETURNING ngd.id
    `,
    [goalId, userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  findByGoalIdAndUserId,
  upsertByGoalIdAndUserId,
  deleteByGoalIdAndUserId,
};

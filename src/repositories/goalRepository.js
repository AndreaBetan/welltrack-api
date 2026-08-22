const { randomUUID } = require('crypto');
const { query } = require('../db');

const GOAL_FIELDS = `
  id,
  user_id,
  goal_type,
  target_value,
  start_date,
  end_date,
  status,
  is_deleted,
  deleted_at,
  created_at
`;

const findAllByUserId = async (userId) => {
  const result = await query(
    `
      SELECT ${GOAL_FIELDS}
      FROM goals
      WHERE user_id = $1
        AND is_deleted IS NOT TRUE
      ORDER BY created_at DESC
    `,
    [userId],
  );

  return result.rows;
};

const findByIdAndUserId = async (goalId, userId) => {
  const result = await query(
    `
      SELECT ${GOAL_FIELDS}
      FROM goals
      WHERE id = $1
        AND user_id = $2
        AND is_deleted IS NOT TRUE
      LIMIT 1
    `,
    [goalId, userId]
  );

  return result.rows[0] || null;
};

const create = async (userId, goalData) => {
  const {
    goalType,
    targetValue,
    startDate,
    endDate,
    status,
  } = goalData;

  const result = await query(
    `
      INSERT INTO goals (
        id,
        user_id,
        goal_type,
        target_value,
        start_date,
        end_date,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING ${GOAL_FIELDS}
    `,
    [
      randomUUID(),
      userId,
      goalType,
      targetValue,
      startDate,
      endDate,
      status,
    ]
  );

  return result.rows[0];
};

const updateByIdAndUserId = async (goalId, userId, goalData) => {
  const result = await query(
    `
      UPDATE goals
      SET
        goal_type = $1,
        target_value = $2,
        start_date = $3,
        end_date = $4,
        status = $5
      WHERE id = $6
        AND user_id = $7
        AND is_deleted IS NOT TRUE
      RETURNING ${GOAL_FIELDS}
    `,
    [
      goalData.goalType,
      goalData.targetValue,
      goalData.startDate,
      goalData.endDate,
      goalData.status,
      goalId,
      userId,
    ]
  );

  return result.rows[0] || null;
};

const softDeleteByIdAndUserId = async (
  goalId,
  userId,
) => {
  const result = await query(
    `
      UPDATE goals
      SET
        is_deleted = TRUE,
        deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND user_id = $2
        AND is_deleted IS NOT TRUE
      RETURNING id
    `,
    [goalId, userId],
  );

  return result.rows[0] || null;
};

module.exports = {
  findAllByUserId,
  findByIdAndUserId,
  create,
  updateByIdAndUserId,
  softDeleteByIdAndUserId,
};

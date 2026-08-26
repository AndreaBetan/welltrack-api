const { query } = require('../db');

const NUTRITION_FIELDS = `
  id,
  user_id,
  meal_type,
  description,
  calories,
  protein,
  carbs,
  fat,
  log_date,
  created_at,
  data_source,
  external_food_id,
  food_name,
  brand,
  serving_grams,
  updated_at
`;

const findAllByUserId = async (userId, logDate = null) => {
  const values = [userId];
  let dateFilter = '';

  if (logDate) {
    values.push(logDate);
    dateFilter = 'AND log_date = $2';
  }

  const result = await query(
    `
      SELECT ${NUTRITION_FIELDS}
      FROM nutrition_logs
      WHERE user_id = $1
        ${dateFilter}
      ORDER BY log_date DESC, created_at DESC
    `,
    values
  );

  return result.rows;
};

const findByIdAndUserId = async (nutritionId, userId) => {
  const result = await query(
    `
      SELECT ${NUTRITION_FIELDS}
      FROM nutrition_logs
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [nutritionId, userId]
  );

  return result.rows[0] || null;
};

const create = async (userId, nutritionData) => {
  const result = await query(
    `
      INSERT INTO nutrition_logs (
        user_id,
        meal_type,
        description,
        calories,
        protein,
        carbs,
        fat,
        log_date,
        data_source,
        external_food_id,
        food_name,
        brand,
        serving_grams
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING ${NUTRITION_FIELDS}
    `,
    [
      userId,
      nutritionData.mealType,
      nutritionData.description,
      nutritionData.calories,
      nutritionData.protein,
      nutritionData.carbs,
      nutritionData.fat,
      nutritionData.logDate,
      nutritionData.dataSource,
      nutritionData.externalFoodId,
      nutritionData.foodName,
      nutritionData.brand,
      nutritionData.servingGrams,
    ]
  );

  return result.rows[0];
};

const updateByIdAndUserId = async (nutritionId, userId, nutritionData) => {
  const result = await query(
    `
      UPDATE nutrition_logs
      SET
        meal_type = $1,
        description = $2,
        calories = $3,
        protein = $4,
        carbs = $5,
        fat = $6,
        log_date = $7,
        data_source = $8,
        external_food_id = $9,
        food_name = $10,
        brand = $11,
        serving_grams = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
        AND user_id = $14
      RETURNING ${NUTRITION_FIELDS}
    `,
    [
      nutritionData.mealType,
      nutritionData.description,
      nutritionData.calories,
      nutritionData.protein,
      nutritionData.carbs,
      nutritionData.fat,
      nutritionData.logDate,
      nutritionData.dataSource,
      nutritionData.externalFoodId,
      nutritionData.foodName,
      nutritionData.brand,
      nutritionData.servingGrams,
      nutritionId,
      userId,
    ]
  );

  return result.rows[0] || null;
};

const deleteByIdAndUserId = async (nutritionId, userId) => {
  const result = await query(
    `
      DELETE FROM nutrition_logs
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [nutritionId, userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  findAllByUserId,
  findByIdAndUserId,
  create,
  updateByIdAndUserId,
  deleteByIdAndUserId,
};

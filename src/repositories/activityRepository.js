const { query } = require('../db');

// Campos que puede devolver la API. Se centralizan para mantener SELECT y
// RETURNING consistentes en todas las operaciones del repositorio.
const ACTIVITY_FIELDS = `
  id,
  user_id,
  activity_type,
  duration_minutes,
  calories_burned,
  log_date,
  created_at,
  intensity,
  notes,
  updated_at
`;

// Catálogo de tipos de actividad. El código es el valor estable que puede
// almacenar activity_logs.activity_type y name es la etiqueta para el usuario.
const ACTIVITY_TYPE_FIELDS = `
  id,
  code,
  name,
  compendium_code,
  original_description,
  met,
  category,
  is_active,
  created_at
`;

// Solo se exponen tipos activos para evitar que el frontend permita seleccionar
// actividades deshabilitadas sin eliminar su histórico de la base de datos.
const findActiveTypes = async () => {
  const result = await query(`
    SELECT ${ACTIVITY_TYPE_FIELDS}
    FROM activity_types
    WHERE is_active = TRUE
    ORDER BY category ASC, name ASC
  `);

  return result.rows;
};

// Obtiene solo las actividades del usuario autenticado. El filtro de fecha es
// opcional y permite consultar, por ejemplo, únicamente la actividad de hoy.
const findAllByUserId = async (userId, logDate = null) => {
  const values = [userId];
  let dateFilter = '';

  if (logDate) {
    values.push(logDate);
    dateFilter = 'AND log_date = $2';
  }

  const result = await query(
    `
      SELECT ${ACTIVITY_FIELDS}
      FROM activity_logs
      WHERE user_id = $1
        ${dateFilter}
      ORDER BY log_date DESC, created_at DESC
    `,
    values
  );

  return result.rows;
};

// El user_id forma parte de la condición para impedir que un usuario consulte
// o modifique mediante UUID una actividad perteneciente a otra persona.
const findByIdAndUserId = async (activityId, userId) => {
  const result = await query(
    `
      SELECT ${ACTIVITY_FIELDS}
      FROM activity_logs
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [activityId, userId]
  );

  return result.rows[0] || null;
};

const create = async (userId, activityData) => {
  const result = await query(
    `
      INSERT INTO activity_logs (
        user_id,
        activity_type,
        duration_minutes,
        calories_burned,
        log_date,
        intensity,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${ACTIVITY_FIELDS}
    `,
    [
      userId,
      activityData.activityType,
      activityData.durationMinutes,
      activityData.caloriesBurned,
      activityData.logDate,
      activityData.intensity,
      activityData.notes,
    ]
  );

  return result.rows[0];
};

const updateByIdAndUserId = async (activityId, userId, activityData) => {
  const result = await query(
    `
      UPDATE activity_logs
      SET
        activity_type = $1,
        duration_minutes = $2,
        calories_burned = $3,
        log_date = $4,
        intensity = $5,
        notes = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
        AND user_id = $8
      RETURNING ${ACTIVITY_FIELDS}
    `,
    [
      activityData.activityType,
      activityData.durationMinutes,
      activityData.caloriesBurned,
      activityData.logDate,
      activityData.intensity,
      activityData.notes,
      activityId,
      userId,
    ]
  );

  return result.rows[0] || null;
};

// La tabla actual no tiene columnas de borrado lógico, por lo que DELETE
// elimina físicamente el registro y devuelve su id para confirmar el resultado.
const deleteByIdAndUserId = async (activityId, userId) => {
  const result = await query(
    `
      DELETE FROM activity_logs
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [activityId, userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  findActiveTypes,
  findAllByUserId,
  findByIdAndUserId,
  create,
  updateByIdAndUserId,
  deleteByIdAndUserId,
};

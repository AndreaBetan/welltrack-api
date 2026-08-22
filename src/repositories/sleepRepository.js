const { query, withTransaction } = require('../db');

// Añade al registro su lista de factores mediante una subconsulta correlacionada.
// COALESCE devuelve [] en vez de null cuando no se seleccionó ningún factor.
const SLEEP_WITH_FACTORS = `
  sl.id,
  sl.user_id,
  sl.started_at,
  sl.ended_at,
  sl.duration_minutes,
  sl.sleep_quality,
  sl.sleep_latency_minutes,
  sl.awakenings_count,
  sl.sleep_type,
  sl.log_date,
  sl.created_at,
  sl.updated_at,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object('id', sf.id, 'code', sf.code, 'name', sf.name)
        ORDER BY sf.name
      )
      FROM sleep_log_factors slf
      JOIN sleep_factors sf ON sf.id = slf.factor_id
      WHERE slf.sleep_log_id = sl.id
    ),
    '[]'::json
  ) AS factors
`;

const findActiveFactors = async () => {
  const result = await query(`
    SELECT id, code, name
    FROM sleep_factors
    WHERE is_active = TRUE
    ORDER BY name ASC
  `);

  return result.rows;
};

const findActiveFactorsByCodes = async (codes) => {
  if (codes.length === 0) {
    return [];
  }

  const result = await query(
    `
      SELECT id, code, name
      FROM sleep_factors
      WHERE code = ANY($1::varchar[])
        AND is_active = TRUE
    `,
    [codes]
  );

  return result.rows;
};

const findAllByUserId = async (userId, logDate = null) => {
  const values = [userId];
  let dateFilter = '';

  if (logDate) {
    values.push(logDate);
    dateFilter = 'AND sl.log_date = $2';
  }

  const result = await query(
    `
      SELECT ${SLEEP_WITH_FACTORS}
      FROM sleep_logs sl
      WHERE sl.user_id = $1
        ${dateFilter}
      ORDER BY sl.log_date DESC, sl.created_at DESC
    `,
    values
  );

  return result.rows;
};

const findByIdAndUserId = async (sleepId, userId) => {
  const result = await query(
    `
      SELECT ${SLEEP_WITH_FACTORS}
      FROM sleep_logs sl
      WHERE sl.id = $1
        AND sl.user_id = $2
      LIMIT 1
    `,
    [sleepId, userId]
  );

  return result.rows[0] || null;
};

const insertFactorRelations = async (client, sleepId, factorIds) => {
  if (factorIds.length === 0) {
    return;
  }

  await client.query(
    `
      INSERT INTO sleep_log_factors (sleep_log_id, factor_id)
      SELECT $1, unnest($2::uuid[])
    `,
    [sleepId, factorIds]
  );
};

const create = async (userId, sleepData, factorIds) => {
  const sleepId = await withTransaction(async (client) => {
    const result = await client.query(
      `
        INSERT INTO sleep_logs (
          user_id,
          started_at,
          ended_at,
          duration_minutes,
          sleep_quality,
          sleep_latency_minutes,
          awakenings_count,
          sleep_type,
          log_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        userId,
        sleepData.startedAt,
        sleepData.endedAt,
        sleepData.durationMinutes,
        sleepData.sleepQuality,
        sleepData.sleepLatencyMinutes,
        sleepData.awakeningsCount,
        sleepData.sleepType,
        sleepData.logDate,
      ]
    );

    await insertFactorRelations(client, result.rows[0].id, factorIds);
    return result.rows[0].id;
  });

  return findByIdAndUserId(sleepId, userId);
};

const updateByIdAndUserId = async (sleepId, userId, sleepData, factorIds) => {
  const wasUpdated = await withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE sleep_logs
        SET
          started_at = $1,
          ended_at = $2,
          duration_minutes = $3,
          sleep_quality = $4,
          sleep_latency_minutes = $5,
          awakenings_count = $6,
          sleep_type = $7,
          log_date = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
          AND user_id = $10
        RETURNING id
      `,
      [
        sleepData.startedAt,
        sleepData.endedAt,
        sleepData.durationMinutes,
        sleepData.sleepQuality,
        sleepData.sleepLatencyMinutes,
        sleepData.awakeningsCount,
        sleepData.sleepType,
        sleepData.logDate,
        sleepId,
        userId,
      ]
    );

    if (!result.rows[0]) {
      return false;
    }

    // La lista recibida representa el estado final: se reemplazan las relaciones.
    await client.query(
      'DELETE FROM sleep_log_factors WHERE sleep_log_id = $1',
      [sleepId]
    );
    await insertFactorRelations(client, sleepId, factorIds);
    return true;
  });

  return wasUpdated ? findByIdAndUserId(sleepId, userId) : null;
};

const deleteByIdAndUserId = async (sleepId, userId) => {
  const result = await query(
    `
      DELETE FROM sleep_logs
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [sleepId, userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  findActiveFactors,
  findActiveFactorsByCodes,
  findAllByUserId,
  findByIdAndUserId,
  create,
  updateByIdAndUserId,
  deleteByIdAndUserId,
};

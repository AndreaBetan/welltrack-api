const { query, withTransaction } = require('../db');

// Lista blanca reutilizable: evita devolver password_hash accidentalmente.
const PUBLIC_USER_FIELDS = `
  id,
  name,
  email,
  gender,
  birth_date,
  height,
  weight,
  created_at,
  updated_at
`;

const create = async ({
  name,
  email,
  passwordHash,
  gender,
  birthDate,
  height,
  weight,
  weightLogDate,
}) => {
  return withTransaction(async (client) => {
    // Los parámetros $1...$7 evitan concatenar entradas del usuario y protegen
    // frente a inyección SQL.
    const result = await client.query(
      `
        INSERT INTO users (
          name,
          email,
          password_hash,
          gender,
          birth_date,
          height,
          weight
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${PUBLIC_USER_FIELDS}
      `,
      [name, email, passwordHash, gender, birthDate, height, weight]
    );

    const user = result.rows[0];

    // El peso del registro es también la primera medición del historial. Las
    // dos escrituras comparten transacción para que nunca queden desincronizadas.
    if (weight !== null && weight !== undefined) {
      await client.query(
        `
          INSERT INTO weight_logs (user_id, weight, log_date)
          VALUES ($1, $2, $3)
        `,
        [user.id, weight, weightLogDate]
      );
    }

    return user;
  });
};

const findAuthByEmail = async (email) => {
  // Única consulta que recupera password_hash, necesaria para el login.
  const result = await query(
    `
      SELECT ${PUBLIC_USER_FIELDS}, password_hash
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
};

const findPublicById = async (id) => {
  const result = await query(
    `
      SELECT ${PUBLIC_USER_FIELDS}
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const updateById = async (
  id,
  { name, gender, birthDate, height, weight, weightLogDate }
) => {
  return withTransaction(async (client) => {
    // FOR UPDATE impide que dos actualizaciones simultáneas comparen el peso
    // contra una versión antigua del perfil.
    const currentResult = await client.query(
      'SELECT weight FROM users WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (!currentResult.rows[0]) {
      return null;
    }

    const previousWeight = currentResult.rows[0].weight;
    const result = await client.query(
      `
        UPDATE users
        SET
          name = $1,
          gender = $2,
          birth_date = $3,
          height = $4,
          weight = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING ${PUBLIC_USER_FIELDS}
      `,
      [name, gender, birthDate, height, weight, id]
    );

    const weightChanged =
      weight !== null &&
      weight !== undefined &&
      (previousWeight === null || Number(previousWeight) !== Number(weight));

    if (weightChanged) {
      // Una segunda corrección en el mismo día actualiza la medición diaria en
      // vez de crear puntos duplicados en las gráficas de evolución.
      const dailyLog = await client.query(
        `
          SELECT id
          FROM weight_logs
          WHERE user_id = $1 AND log_date = $2
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `,
        [id, weightLogDate]
      );

      if (dailyLog.rows[0]) {
        await client.query(
          'UPDATE weight_logs SET weight = $1 WHERE id = $2',
          [weight, dailyLog.rows[0].id]
        );
      } else {
        await client.query(
          `
            INSERT INTO weight_logs (user_id, weight, log_date)
            VALUES ($1, $2, $3)
          `,
          [id, weight, weightLogDate]
        );
      }
    }

    return result.rows[0];
  });
};

module.exports = {
  create,
  findAuthByEmail,
  findPublicById,
  updateById,
};

const { query } = require('../db');

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

const findAll = async () => {
  const result = await query(`
    SELECT ${PUBLIC_USER_FIELDS}
    FROM users
    ORDER BY created_at DESC
  `);

  return result.rows;
};

const create = async ({
  name,
  email,
  passwordHash,
  gender,
  birthDate,
  height,
  weight,
}) => {
  // Los parámetros $1...$7 evitan concatenar entradas del usuario y protegen
  // frente a inyección SQL.
  const result = await query(
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

  return result.rows[0];
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

const updateById = async (id, { name, gender, birthDate, height, weight }) => {
  const result = await query(
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

  return result.rows[0] || null;
};

module.exports = {
  findAll,
  create,
  findAuthByEmail,
  findPublicById,
  updateById,
};

const pool = require('../connectors/postgresql.connector');

// Ejecuta varias consultas como una única operación atómica. Si cualquiera
// falla, ROLLBACK evita guardar solo una parte de los cambios.
const withTransaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Fachada de base de datos: los repositorios usan query sin depender directamente
// de cómo se ha configurado el pool de conexiones.
module.exports = {
  query: (text, params) => pool.query(text, params),
  withTransaction,
};

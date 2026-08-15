const pool = require('../connectors/postgresql.connector');

// Fachada de base de datos: los repositorios usan query sin depender directamente
// de cómo se ha configurado el pool de conexiones.
module.exports = {
  query: (text, params) => pool.query(text, params),
};

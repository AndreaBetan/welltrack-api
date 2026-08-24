require('dotenv').config();

const { Pool, types } = require('pg');

// PostgreSQL OID 1082 corresponde al tipo DATE. Una fecha civil no representa
// un instante ni tiene zona horaria, por lo que se conserva como AAAA-MM-DD.
// Si se convirtiera en Date de JavaScript, JSON la pasaría a UTC y en zonas
// horarias positivas podría aparecer como el día anterior en el frontend.
types.setTypeParser(1082, (value) => value);

// Un pool reutiliza conexiones en vez de abrir una nueva por cada petición.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: process.env.DB_POOL_MAX,
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT,
  connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT,
});

module.exports = pool;

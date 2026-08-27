require('dotenv').config({ quiet: true });

// node-pg-migrate espera DATABASE_URL. Este adaptador la construye a partir de
// las variables DB_* que también utiliza la aplicación.
if (!process.env.DATABASE_URL) {
  const requiredVariables = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
  ];
  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Faltan variables de entorno de la base de datos: ${missingVariables.join(', ')}`
    );
  }

  // URL codifica correctamente caracteres especiales del usuario y contraseña.
  const databaseUrl = new URL('postgresql://localhost');
  databaseUrl.hostname = process.env.DB_HOST;
  databaseUrl.port = process.env.DB_PORT;
  databaseUrl.username = process.env.DB_USER;
  databaseUrl.password = process.env.DB_PASSWORD;
  databaseUrl.pathname = process.env.DB_NAME;

  // Los proveedores administrados suelen rechazar conexiones sin cifrar.
  // verify-full cifra el canal y valida certificado y nombre del servidor.
  if (process.env.DB_SSL === 'true') {
    databaseUrl.searchParams.set('sslmode', 'verify-full');
  }

  process.env.DATABASE_URL = databaseUrl.toString();
} else if (process.env.DB_SSL === 'true') {
  // Si se proporcionó DATABASE_URL directamente, conserva su contenido y añade
  // SSL. Los modos ambiguos se elevan al comportamiento seguro verify-full.
  const databaseUrl = new URL(process.env.DATABASE_URL);
  const sslMode = databaseUrl.searchParams.get('sslmode');
  if (!sslMode || ['prefer', 'require', 'verify-ca'].includes(sslMode)) {
    databaseUrl.searchParams.set('sslmode', 'verify-full');
    process.env.DATABASE_URL = databaseUrl.toString();
  }
}

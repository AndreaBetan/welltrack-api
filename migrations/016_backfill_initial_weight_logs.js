// Completa el historial de usuarios creados antes de que el registro y la
// actualización del perfil empezaran a alimentar weight_logs.
exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO weight_logs (user_id, weight, log_date)
    SELECT
      users.id,
      users.weight,
      users.created_at::date
    FROM users
    WHERE users.weight IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM weight_logs
        WHERE weight_logs.user_id = users.id
      )
  `);
};

// No se eliminan mediciones durante el rollback: después de aplicar la
// migración no puede distinguirse con certeza una fila migrada de una medición
// real registrada con la misma fecha y el mismo peso.
exports.down = () => {};

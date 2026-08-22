// Añade las horas de inicio y finalización a los registros de sueño existentes.
// Se usa una migración nueva porque 002 ya fue ejecutada y no debe modificarse.
exports.up = (pgm) => {
  pgm.addColumns('sleep_logs', {
    started_at: {
      type: 'timestamptz',
    },
    ended_at: {
      type: 'timestamptz',
    },
  });
  pgm.alterColumn("sleep_logs", "duration_minutes", {
    type: "integer",
    using: "ROUND(duration_minutes)::integer",
  });
};

// Permite revertir este cambio sin eliminar la tabla ni los demás datos.
exports.down = (pgm) => {
  pgm.dropColumns('sleep_logs', ['started_at', 'ended_at']);
};

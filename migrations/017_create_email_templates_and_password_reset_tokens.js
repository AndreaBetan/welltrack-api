// Infraestructura de correo transaccional y recuperación segura de contraseña.
exports.up = (pgm) => {
  pgm.createTable('email_templates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(80)', notNull: true, unique: true },
    subject: { type: 'varchar(255)', notNull: true },
    html_content: { type: 'text', notNull: true },
    text_content: { type: 'text', notNull: true },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createTable('password_reset_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    // Solo se persiste SHA-256(token). Si la base de datos se filtra, el enlace
    // original no puede reconstruirse a partir de este valor.
    token_hash: { type: 'varchar(64)', notNull: true, unique: true },
    expires_at: { type: 'timestamptz', notNull: true },
    used_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('password_reset_tokens', ['user_id', 'expires_at']);

  pgm.sql(`
    INSERT INTO email_templates (code, subject, html_content, text_content)
    VALUES
      (
        'WELCOME_EMAIL',
        'Te damos la bienvenida a WellTrack',
        '<h1>¡Hola, {{name}}!</h1><p>Gracias por unirte a WellTrack.</p><p>Desde la aplicación puedes registrar tu alimentación, actividad física, sueño y evolución del peso; definir objetivos y consultar estadísticas y recomendaciones personalizadas.</p><p><a href="{{app_url}}">Acceder a WellTrack</a></p><p>Este contenido es informativo y no sustituye el asesoramiento de un profesional sanitario.</p>',
        '¡Hola, {{name}}! Gracias por unirte a WellTrack. Puedes registrar alimentación, actividad física, sueño y peso; definir objetivos y consultar estadísticas y recomendaciones. Accede en {{app_url}}. Este contenido es informativo y no sustituye el asesoramiento de un profesional sanitario.'
      ),
      (
        'PASSWORD_RESET',
        'Restablece tu contraseña de WellTrack',
        '<h1>Restablecer contraseña</h1><p>Hola, {{name}}.</p><p>Hemos recibido una solicitud para cambiar tu contraseña.</p><p><a href="{{reset_url}}">Crear una contraseña nueva</a></p><p>El enlace caduca en {{expires_minutes}} minutos. Si no realizaste esta solicitud, ignora este correo.</p>',
        'Hola, {{name}}. Restablece tu contraseña en {{reset_url}}. El enlace caduca en {{expires_minutes}} minutos. Si no realizaste esta solicitud, ignora este correo.'
      );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('password_reset_tokens');
  pgm.dropTable('email_templates');
};

const { query, withTransaction } = require('../db');

const findActiveTemplateByCode = async (code) => {
  const result = await query(
    `SELECT code, subject, html_content, text_content
     FROM email_templates
     WHERE code = $1 AND is_active = true
     LIMIT 1`,
    [code]
  );
  return result.rows[0] || null;
};

const replacePasswordResetToken = async ({ userId, tokenHash, expiresAt }) => {
  await withTransaction(async (client) => {
    // Invalida enlaces anteriores pendientes: solo el último correo funciona.
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );
    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  });
};

const consumePasswordResetToken = async ({ tokenHash, passwordHash }) => {
  return withTransaction(async (client) => {
    const tokenResult = await client.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [tokenHash]
    );
    const token = tokenResult.rows[0];
    if (!token) return false;

    await client.query(
      `UPDATE users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, token.user_id]
    );
    await client.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [token.id]
    );
    return true;
  });
};

module.exports = {
  findActiveTemplateByCode,
  replacePasswordResetToken,
  consumePasswordResetToken,
};

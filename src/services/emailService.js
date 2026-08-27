const emailRepository = require('../repositories/emailRepository');
const emailProvider = require('../providers/brevoEmailProvider');

// Sustitución deliberadamente sencilla y controlada. Las variables permitidas
// las decide el backend; nunca se evalúa código procedente de la base de datos.
const render = (content, variables) => content.replace(
  /\{\{([a-z_]+)\}\}/g,
  (match, key) => (Object.hasOwn(variables, key) ? String(variables[key]) : match)
);

// El nombre del usuario se inserta también en HTML. Escaparlo impide que una
// entrada como <script> se transforme en marcado dentro del correo.
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sendTemplate = async ({ code, recipient, variables }) => {
  const template = await emailRepository.findActiveTemplateByCode(code);
  if (!template) throw new Error(`No existe una plantilla activa con código ${code}`);

  return emailProvider.send({
    to: recipient,
    subject: render(template.subject, variables),
    htmlContent: render(
      template.html_content,
      Object.fromEntries(
        Object.entries(variables).map(([key, value]) => [key, escapeHtml(value)])
      )
    ),
    textContent: render(template.text_content, variables),
  });
};

const sendWelcomeEmail = (user) => sendTemplate({
  code: 'WELCOME_EMAIL',
  recipient: { email: user.email, name: user.name },
  variables: {
    name: user.name,
    app_url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
});

const sendPasswordResetEmail = (user, token, expiresMinutes) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${baseUrl.replace(/\/$/, '')}/restablecer-contrasena?token=${encodeURIComponent(token)}`;

  return sendTemplate({
    code: 'PASSWORD_RESET',
    recipient: { email: user.email, name: user.name },
    variables: { name: user.name, reset_url: resetUrl, expires_minutes: expiresMinutes },
  });
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail };

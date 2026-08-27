const BREVO_EMAIL_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const send = async ({ to, subject, htmlContent, textContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM_ADDRESS;
  const senderName = process.env.EMAIL_FROM_NAME || 'WellTrack';

  if (!apiKey || !senderEmail) {
    throw new Error('BREVO_API_KEY y EMAIL_FROM_ADDRESS deben estar configurados');
  }

  const response = await fetch(BREVO_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to.email, name: to.name }],
      subject,
      htmlContent,
      textContent,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo rechazó el correo (${response.status}): ${body.slice(0, 300)}`);
  }

  return response.json();
};

module.exports = { send };

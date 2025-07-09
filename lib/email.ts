import { createTransport } from 'nodemailer';

// Create transporter configuration
const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendPasswordResetEmailNodemailer(
  email: string,
  token: string,
) {
  const resetUrl = `${process.env.PUBLIC_APP_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Сброс пароля - Test Coach',
    html: `
      <h2>Сброс пароля</h2>
      <p>Для сброса пароля перейдите по ссылке ниже:</p>
      <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Сбросить пароль</a></p>
      <p>Или скопируйте эту ссылку в браузер:</p>
      <p>${resetUrl}</p>
      <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
      <p>Ссылка действительна в течение 24 часов.</p>
    `,
  });

  return { data: 'success', error: null };
}

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    env: {
      host: !!process.env.SMTP_HOST,
      port: !!process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE || '(unset)',
      user: !!process.env.SMTP_USER,
      pass: !!process.env.SMTP_PASS,
      from: process.env.FROM_EMAIL || '(unset)'
    }
  });
}

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,                     // smtp-relay.brevo.com
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: (process.env.SMTP_SECURE || 'false') === 'true', // false pour 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER, // >>> ton e-mail de compte Brevo (ex: rcohensolal@georem.net)
        pass: process.env.SMTP_PASS  // >>> ta clé SMTP Brevo (xsmtpsib-...)
      }
    });
    await transporter.verify();   // renvoie une erreur claire si mauvais identifiants
    res.status(200).json({ ok: true, message: 'SMTP verify OK' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

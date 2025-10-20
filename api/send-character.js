// api/send-character.js (patched: returns accepted/rejected)
const nodemailer = require('nodemailer');

function base64ToBuffer(dataUrl) {
  if (!dataUrl) return null;
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const {
      to = [],
      subject = 'MISSIONS',
      text = '',
      character = {},
      ref,
      qr_url,
      preview_png,
      preview_html,
      player_photo_png,
      character_json
    } = req.body || {};

    if (!Array.isArray(to) || !to.length) {
      res.status(400).send('Missing recipients');
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.FROM_EMAIL;

    if (!host || !user || !pass || !from) {
      res.status(500).send('SMTP env missing');
      return;
    }

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

    const attachments = [];

    const p = base64ToBuffer(preview_png);
    if (p) {
      attachments.push({ filename: `${ref || 'fiche'}.png`, content: p.buffer, contentType: p.mime });
    } else if (preview_html) {
      attachments.push({ filename: `${ref || 'fiche'}.html`, content: preview_html, contentType: 'text/html' });
    }

    const ph = base64ToBuffer(player_photo_png);
    if (ph) {
      const ext = ph.mime.includes('jpeg') ? 'jpg' : 'png';
      attachments.push({ filename: `photo_identite.${ext}`, content: ph.buffer, contentType: ph.mime });
    }

    if (character_json) {
      const buf = Buffer.from(character_json, 'base64');
      attachments.push({ filename: `${ref || 'fiche'}.json`, content: buf, contentType: 'application/json' });
    }

    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto">
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint la fiche de personnage.</p>
        <ul>
          <li><b>Référence:</b> ${ref || '-'}</li>
          <li><b>Personnage:</b> ${character?.name || '-'}</li>
          <li><b>Métier:</b> ${character?.role || '-'}</li>
          <li><b>Traits:</b> ${character?.traits || '-'}</li>
        </ul>
        ${qr_url ? `<p>URL de consultation: <a href="${qr_url}">${qr_url}</a></p>` : ''}
        <p>— Système MISSIONS</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to: to.join(','),
      subject,
      text,
      html,
      attachments
    });

    console.log('MAIL accepted:', info.accepted, 'rejected:', info.rejected);
    res.status(200).json({ ok: true, messageId: info.messageId, accepted: info.accepted || [], rejected: info.rejected || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};

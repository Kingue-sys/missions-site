import { PDFDocument } from 'pdf-lib';
import nodemailer from 'nodemailer';

// (Optionnel) tu peux laisser tomber complètement la config runtime
export const config = { runtime: 'nodejs' }; // ou supprime cette ligne

function dataURLtoBuffer(dataUrl) {
  const [, b64] = (dataUrl || '').split(',');
  return Buffer.from(b64 || '', 'base64');
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, text, character, preview_png, preview_html } = req.body || {};
    if (!to || !Array.isArray(to) || !to.length) {
      return res.status(400).json({ error: "Missing 'to' recipients" });
    }

    // --- Vérifs ENV (très utiles) ---
    const envReport = {
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: process.env.SMTP_USER ? 'OK (non vide)' : 'MANQUANT',
      SMTP_PASS: process.env.SMTP_PASS ? 'OK (non vide)' : 'MANQUANT',
      FROM_EMAIL: process.env.FROM_EMAIL || '(non défini)'
    };
    console.log('[ENV CHECK]', envReport);

    // --- Construire les pièces jointes ---
    const attachments = [];
    try {
      if (preview_png) {
        const pngBytes = dataURLtoBuffer(preview_png);
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([595, 842]); // A4 portrait
        const img = await pdf.embedPng(pngBytes);
        const { width, height } = img;
        const maxW = 555, maxH = 802;
        const r = Math.min(maxW / width, maxH / height);
        page.drawImage(img, { x: (595 - width * r) / 2, y: (842 - height * r) / 2, width: width * r, height: height * r });
        const bytes = await pdf.save();
        attachments.push({
          filename: `MISSIONS_Fiche_${(character?.name || 'PJ').replace(/\s+/g, '_')}.pdf`,
          content: Buffer.from(bytes),
          contentType: 'application/pdf'
        });
      } else if (preview_html) {
        attachments.push({
          filename: `MISSIONS_Fiche_${(character?.name || 'PJ').replace(/\s+/g, '_')}.html`,
          content: Buffer.from(preview_html, 'utf8'),
          contentType: 'text/html'
        });
      }
    } catch (e) {
      console.error('[PDF/ATTACH ERROR]', e);
      // On continue quand même sans PJ
    }

    attachments.push({
      filename: `MISSIONS_Fiche_${(character?.name || 'PJ').replace(/\s+/g, '_')}.json`,
      content: Buffer.from(JSON.stringify(character || {}, null, 2)),
      contentType: 'application/json'
    });

    // --- Transport SMTP ---
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,                 // ex: smtp-relay.brevo.com
      port: parseInt(process.env.SMTP_PORT || '587', 10), // 587 recommandé
      secure: (process.env.SMTP_SECURE || 'false') === 'true', // false pour 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,              // >>> ton email Brevo (ex: rcohensolal@georem.net)
        pass: process.env.SMTP_PASS               // >>> ta clé SMTP Brevo (xsmtpsib-...)
      }
    });

    // Test des identifiants (renvoie une erreur claire si mauvais)
    try {
      await transporter.verify();
      console.log('[SMTP] verify OK');
    } catch (e) {
      console.error('[SMTP VERIFY ERROR]', e);
      return res.status(500).json({ error: 'SMTP verify failed', details: String(e && e.message) });
    }

    // --- Envoi ---
    let info;
    try {
      info = await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'Association PARADOXA <rcohensolal@georem.net>',
        to: to.join(','),
        subject: subject || '[MISSIONS] Fiche PJ',
        text: text || 'Voir pièce jointe.',
        html: `<p>${(text || '').replace(/\n/g, '<br/>')}</p>
               <pre style="background:#f6f6f6;padding:12px;border-radius:8px">${JSON.stringify(character || {}, null, 2)}</pre>`,
        attachments
      });
      console.log('[SMTP] sent', info && info.messageId);
    } catch (e) {
      console.error('[SMTP SEND ERROR]', e);
      return res.status(500).json({ error: 'SMTP send failed', details: String(e && e.message) });
    }

    res.json({ ok: true, messageId: info && info.messageId });
  } catch (e) {
    console.error('[GENERAL ERROR]', e);
    res.status(500).json({ error: String(e && e.message) });
  }
}

import { PDFDocument } from 'pdf-lib';
import nodemailer from 'nodemailer';

export const config = { runtime: 'nodejs18' };

function dataURLtoBuffer(dataUrl){ const [, b64] = dataUrl.split(','); return Buffer.from(b64,'base64'); }

export default async function handler(req,res){
  try{
    if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
    const { to, subject, text, character, preview_png, preview_html } = req.body||{};
    if(!to?.length) return res.status(400).json({error:"Missing 'to'"});

    const attachments=[];
    if(preview_png){
      const pngBytes=dataURLtoBuffer(preview_png);
      const pdf=await PDFDocument.create();
      const page=pdf.addPage([595,842]); // A4
      const img=await pdf.embedPng(pngBytes);
      const {width,height}=img; const maxW=555,maxH=802;
      const r=Math.min(maxW/width,maxH/height); const w=width*r, h=height*r;
      page.drawImage(img,{x:(595-w)/2,y:(842-h)/2,width:w,height:h});
      const bytes=await pdf.save();
      attachments.push({filename:`MISSIONS_Fiche_${(character?.name||'PJ').replace(/\s+/g,'_')}.pdf`,content:Buffer.from(bytes)});
    } else if (preview_html){
      attachments.push({filename:`MISSIONS_Fiche_${(character?.name||'PJ').replace(/\s+/g,'_')}.html`,content:Buffer.from(preview_html,'utf8')});
    }
    attachments.push({filename:`MISSIONS_Fiche_${(character?.name||'PJ').replace(/\s+/g,'_')}.json`,content:Buffer.from(JSON.stringify(character||{},null,2))});

    const transporter=nodemailer.createTransport({
      host:process.env.SMTP_HOST,
      port:parseInt(process.env.SMTP_PORT||'465',10),
      secure:(process.env.SMTP_SECURE||'true')==='true',
      auth:{ user:process.env.SMTP_USER, pass:process.env.SMTP_PASS }
    });

    const info=await transporter.sendMail({
      from:process.env.FROM_EMAIL||'Paradoxa MISSIONS <no-reply@paradoxa.fr>',
      to:to.join(','), subject:subject||'[MISSIONS] Fiche PJ',
      text:text||'Voir pièce jointe.',
      html:`<p>${(text||'').replace(/\n/g,'<br/>')}</p>
            <pre style="background:#f6f6f6;padding:12px;border-radius:8px">${JSON.stringify(character||{},null,2)}</pre>`,
      attachments
    });

    res.json({ok:true,messageId:info.messageId});
  }catch(e){ res.status(500).json({error:e.message}); }
}

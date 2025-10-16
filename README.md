
# MISSIONS – Site + Email (Vercel)

## Déploiement
1) Crée un repo GitHub et ajoute ce dossier.
2) Sur https://vercel.com → New Project → Import Git Repository.
3) Dans Project Settings → Environment Variables, ajoute :
   - SMTP_HOST = smtp-relay.brevo.com
   - SMTP_PORT = 587
   - SMTP_SECURE = false
   - SMTP_USER = (ton login Brevo)
   - SMTP_PASS = (ta clé SMTP Brevo)
   - FROM_EMAIL = Paradoxa MISSIONS <no-reply@paradoxa.fr>
4) Deploy. Ouvre l’URL → bouton “Envoyer aux orgas”.

## Personnalisation
- `public/index.html` = ta page. Assure-toi d’avoir :
  - un bouton id="sendOrgaBtn"
  - un conteneur id="capture" pour le panneau de droite
- API: `api/send-character.js` (envoi email + PDF via pdf-lib)

## Test SMTP
- Utilise un destinataire que tu contrôles pour tester les PJs PDF/JSON.

# MISSIONS – Création de personnage

Interface web statique (hébergée sur Vercel) pour créer la fiche PJ “GN MISSIONS”, générer un aperçu (PNG/HTML), et l’envoyer par email aux orgas et au joueur, avec la **photo d’identité** en pièce jointe.

## Sommaire

- [Structure du projet](#structure-du-projet)  
- [Prérequis](#prérequis)  
- [Déploiement sur Vercel](#déploiement-sur-vercel)  
- [Configuration SMTP (Gmail + mot de passe d’application)](#configuration-smtp-gmail--mot-de-passe-dapplication)  
- [Utilisation côté joueur](#utilisation-côté-joueur)  
- [Données : CSV et schémas](#données--csv-et-schémas)  
- [Personnalisation de la fiche](#personnalisation-de-la-fiche)  
- [Tests & debug](#tests--debug)  
- [Dépannage](#dépannage)  
- [Roadmap](#roadmap)

---

## Structure du projet

```
.
├─ api/
│  └─ send-character.js         # Micro-backend email (Nodemailer)
├─ public/
│  ├─ missions_index_external_v2.html  # Page principale
│  ├─ missions_app_v2.js               # Logique UI/UX
│  └─ data/
│     ├─ characters.csv         # Personnages (source de vérité)
│     └─ skills.csv             # Compétences (source de vérité)
├─ package.json                  # Dépendances (nodemailer)
└─ README.md
```

> **Note** : Tout fichier du dossier `public/` est servi tel quel. L’API est gérée par Vercel Functions (dossier `api/`).

---

## Prérequis

- Un compte **Vercel** (gratuit)
- Un repo **GitHub** (le code de ce projet)
- Un compte **Gmail** ou **Google Workspace** (pour l’envoi SMTP)  
  → **Obligatoire** : activer un **mot de passe d’application** (voir ci-dessous)

---

## Déploiement sur Vercel

1. **Importer** le repo GitHub dans Vercel (New Project → Import Git Repository).  
2. Vercel détecte un projet **Static** (pas de build requis).  
3. Cliquer **Deploy**.

Les fichiers de `public/` sont accessibles à l’URL de ton projet.  
La page principale est `…/missions_index_external_v2.html`.

---

## Configuration SMTP (Gmail + mot de passe d’application)

Dans Vercel → **Settings → Environment Variables** :

| Clé            | Valeur (exemple Gmail)              |
|----------------|-------------------------------------|
| `SMTP_HOST`    | `smtp.gmail.com`                    |
| `SMTP_PORT`    | `587`                               |
| `SMTP_SECURE`  | `false`                             |
| `SMTP_USER`    | `ton.email@gmail.com`               |
| `SMTP_PASS`    | (mot de passe d’application)        |
| `FROM_EMAIL`   | `ton.email@gmail.com` ou nom+email  |

> **Mot de passe d’application Gmail** :  
> Google → Compte → **Sécurité** → **Validation en 2 étapes** → **Mots de passe d'application** → App “Mail”, Appareil “Autre (nom personnalisé)” → générer → coller la valeur dans `SMTP_PASS`.

**Après ajout/modif des variables**, lance **Deploy** (Vercel → Deployments → Redeploy).

---

## Utilisation côté joueur

1. Ouvrir la page `missions_index_external_v2.html`.
2. Sélectionner un **personnage** (issu de `characters.csv`).
3. Rechercher / cocher des **compétences** (filtrées par AllowedFor / AllowedGroups).
4. Renseigner le **Pitch** et le **BG** (autosave local).
5. Saisir **Email du joueur** (pour envoyer une copie).
6. **Uploader** la **photo d’identité** (JPG/PNG, max 5 Mo) et cocher le **consentement**.
7. Cliquer **Créer ton personnage** :
   - Envoi aux orgas (`orga.paradoxa@proton.me`, `rcohensolal@georem.net`) **et** au joueur.
   - Pièces jointes : PNG (ou HTML), JSON, photo.

> **Brouillon** : `Sauver brouillon` / `Reprendre brouillon` / `Effacer brouillon` (stocké dans `localStorage`).

---

## Données : CSV et schémas

### `public/data/characters.csv`

| Colonne       | Description                                  | Exemple                                |
|---------------|----------------------------------------------|----------------------------------------|
| `key`         | Identifiant unique (sans espace)             | `ALFRED_AUBERTIN`                      |
| `Nom`         | Nom affiché                                  | `ALFRED AUBERTIN`                      |
| `Metier`      | Métier / rôle                                | `Major`                                |
| `Traits`      | Liste `;`-séparée                            | `Discipline; Ordre`                    |
| `PortraitURL` | URL image portrait                           | `https://…/photo.jpg`                  |
| `CapSkills`   | Cap global de compétences                    | `4`                                    |
| `Archetypes`  | Groupes `;`-séparés (filtrage compétences)   | `Militaire`                            |

**Exemple minimal**
```
key,Nom,Metier,Traits,PortraitURL,CapSkills,Archetypes
ALFRED_AUBERTIN,ALFRED AUBERTIN,Major,"Discipline; Ordre",https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=300&q=80,4,Militaire
EMMA_LEMOINE,EMMA LEMOINE,Médecin,"Empathique; Rigoureuse",https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80,4,Médecin
```

### `public/data/skills.csv`

| Colonne         | Description                                                  | Exemple                |
|-----------------|--------------------------------------------------------------|------------------------|
| `key`           | Identifiant unique                                           | `assault_rifle`        |
| `Nom`           | Nom affiché                                                  | `Armes d’assaut`       |
| `Categorie`     | Thème/catégorie (Combat, Médical, …)                         | `Combat`               |
| `Type`          | `craft` \\| `passif` \\| `actif`                               | `actif`                |
| `Effets`        | Court texte (tooltip)                                        | `Fusils d’assaut`      |
| `Duree`         | Durée (tooltip)                                              | `–`                    |
| `Modalites`     | Modalités d’usage (tooltip)                                  | `–`                    |
| `Prerequis`     | Liste `;`-séparée (ex. `Medecine N1`)                        |                        |
| `Exclus`        | Liste `;`-séparée (compétences mutuellement exclusives)      |                        |
| `AllowedFor`    | **Keys PJ** `;`-séparées autorisés                           | `ALFRED_AUBERTIN`      |
| `AllowedGroups` | **Archetypes** `;`-séparés (doivent matcher `Archetypes`)    | `Militaire`            |

**Exemple minimal**
```
key,Nom,Categorie,Type,Effets,Duree,Modalites,Prerequis,Exclus,AllowedFor,AllowedGroups
tir_n1,Tir [N1],Combat,actif,Armes basiques,–,–,,,"",
assault_rifle,Armes d’assaut,Combat,actif,Fusils d’assaut,–,–,,,"ALFRED_AUBERTIN","Militaire"
discretion,Discrétion,Opération,passif,Silencieux,Scène,–,,,"",
premiers_soins,Premiers secours,Médical,actif,Soin léger,–,Sur cible,,,"",
```

**Règles supportées déjà prêtes**  
- Filtrage dynamique des compétences selon **AllowedFor** (keys PJ) et/ou **AllowedGroups** (archetypes).  
- `Type=craft` → pastille marquée 🧪.  
- **Cap** PJ (`CapSkills`) appliqué au moment de cocher.  
- **Prérequis/Exclus**: colonnes déjà prévues (validation “soft” possible à ajouter dans la v9).

> **Encodage** : UTF-8, séparateur **`,`** (auto-détection `,`/`;` est gérée via PapaParse si nécessaire).

---

## Personnalisation de la fiche

- **Police RE1** : onglet (tabs) avec `Share Tech Mono` via Google Fonts.  
- **Couleurs** : variables CSS dans `missions_index_external_v2.html` (`:root{…}`).  
- **QR Code** : encodé avec `https://missions-site.vercel.app/fiche?ref=...` (modifiable dans `missions_app_v2.js`, `QR_BASE_URL`).  
- **Référence** : format `MISSIONS-YYYY-####` (modifiable dans `generateRef()`).

---

## Tests & debug

- **Réponse API** : Outils dev navigateur → onglet **Network** → clique `/api/send-character` → **Response**.  
  Tu verras :
  ```json
  {
    "ok": true,
    "messageId": "…",
    "accepted": ["orga.paradoxa@proton.me", "rcohensolal@georem.net", "joueur@ex.com"],
    "rejected": []
  }
  ```
- **Cache** : le JS est chargé avec `?v=3`. En cas de patch, incrémente (`?v=4`) ou force **Ctrl+F5**.
- **Logs fonction** : Vercel → Project → **Functions** → sélectionne `api/send-character` pour voir `accepted/rejected`.

---

## Dépannage

**1) “Cannot set properties of null (setting 'textContent')”**  
→ Le JS essaie d’écrire dans un élément absent.  
- Le patch **gère l’absence** de `invCount`/`invLimit`. Si tu modifies le HTML, garde les `id` attendus ou laisse le patch tel quel.

**2) 404 sur `data/characters.csv` / `data/skills.csv`**  
→ Ajoute les fichiers dans `public/data/` (exemples fournis ci-dessus).  
Sans CSV, l’app passe en **mode démo** (2 persos / 4 skills).

**3) Email non reçu par les orgas**  
- Vérifie `accepted`/`rejected` dans la **réponse JSON**.  
- Confirme les **ENV** SMTP (host, port, user, pass, from) et que `FROM_EMAIL` == l’email Gmail du mot de passe d’application.  
- Essaie un envoi **vers une seule adresse** (retrait temporaire du joueur par ex.) pour isoler le problème.

**4) “Invalid login” SMTP**  
- `SMTP_USER` = **adresse Gmail complète**.  
- `SMTP_PASS` = **mot de passe d’application** (16 caractères), pas ton mot de passe normal.

**5) Photo obligatoire**  
- L’envoi est bloqué si **pas de photo** ou si **> 5 Mo** ou **format non JPG/PNG**.

---

## Roadmap

- **v9** (évoquée) :  
  - Prérequis/Exclus **bloquants** (et messages d’erreur UX au clic)  
  - Inventaire **drag & drop** (style Resident Evil 1) + `items.csv`  
  - AutoSkills par PJ (si besoin futur)  
  - Export PDF propre (print CSS clair)  
  - Rapports d’import CSV (lignes ignorées, colonnes manquantes)

---

## Licence

Projet privé GN MISSIONS – usage interne (orga/joueurs). Ajuster selon vos besoins.

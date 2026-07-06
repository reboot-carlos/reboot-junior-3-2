# Bienvenue dans ton premier projet 👋

Salut ! Tu es sur le point de construire ta première appli. Pas de panique :
ce dossier est un **squelette**. Il n'y a (presque) pas de logique dedans,
juste la structure — à toi de lui donner vie.

C'est ça, le **vibe coding** : tu n'as pas besoin de tout savoir par cœur
pour commencer à construire. Tu explores, tu testes, tu demandes de l'aide
à une IA quand tu bloques, tu casses des trucs, tu les répares. L'important
c'est de comprendre ce que chaque pièce fait, pas de mémoriser la syntaxe.

---

## 🧠 La structure, expliquée simplement

```
Dossier Etudiant/
├── backend/       ← le CERVEAU : reçoit des questions, réfléchit, répond
├── frontend/      ← le VISAGE : ce que les gens voient et cliquent
├── docker-compose.yml   ← lance backend + frontend ensemble, en un coup
├── local.sh              ← raccourci pour lancer le projet en local
├── .env.example           ← modèle pour tes futures clés secrètes
└── .gitignore              ← liste des fichiers à NE JAMAIS envoyer sur GitHub
```

### `backend/` — le cerveau

Un serveur qui tourne quelque part (sur ton PC, puis sur Railway) et qui
répond aux questions. Il est écrit en **Python** avec un framework qui
s'appelle **FastAPI**.

- `main.py` → le code du serveur. Regarde les `# TODO` dedans, c'est là
  que tu vas écrire ta logique.
- `requirements.txt` → la liste des librairies Python dont ton projet a
  besoin.
- `Dockerfile` → la recette pour "emballer" ton backend afin qu'il puisse
  tourner n'importe où (y compris sur Railway).
- `railway.toml` → dit à Railway comment déployer ce service.

### `frontend/` — le visage

L'interface que les utilisateurs voient dans leur navigateur. Écrit en
**React + TypeScript**, avec **Tailwind** pour le style, et **Vite** pour
le faire tourner vite en développement.

- `src/App.tsx` → le composant principal. C'est probablement le premier
  fichier que tu vas modifier.
- `src/main.tsx` → le point de départ, qui affiche `<App />` à l'écran.
- `src/index.css` → où Tailwind est branché.
- `Dockerfile` + `nginx.conf.template` → emballent ton frontend et le
  servent en production (et redirigent les appels `/api` vers le backend).
- `railway.toml` → dit à Railway comment déployer ce service.

### Pourquoi séparer backend et frontend ?

Parce que ce sont deux métiers différents : le frontend s'occupe de
l'affichage, le backend s'occupe de la réflexion (et garde tes secrets,
comme des clés d'API, hors de vue des utilisateurs). Cette séparation,
tu la retrouveras dans presque tous les projets pros.

---

## 🚀 Lancer le projet en local

**Option rapide (recommandée pour coder au quotidien) :**

```bash
./start.sh
```

Installe les dépendances si besoin, puis démarre le backend et le
frontend en même temps. Ouvre [http://localhost:5173](http://localhost:5173).
Un seul `Ctrl+C` arrête tout — et si un serveur reste bloqué en arrière-plan,
`./stop.sh` libère les ports.

**Option Docker (pour tester "comme sur Railway") :**

```bash
./local.sh
```

Puis ouvre [http://localhost:3000](http://localhost:3000). Plus lent
(ça reconstruit une image à chaque fois) mais fidèle à la prod.

---

## 🔑 Les secrets (clés d'API, mots de passe...)

Si ton projet a besoin d'une clé secrète (par exemple pour appeler une IA) :

1. Copie `.env.example` en `.env` (à la racine et/ou dans `backend/`).
2. Remplis tes vraies valeurs dans `.env`.
3. **Ne touche jamais au `.gitignore`** — il empêche `.env` d'être envoyé
   sur GitHub. Une clé qui fuit sur GitHub peut être volée en quelques
   minutes, même si tu la supprimes juste après.

---

## ☁️ Déployer sur Railway

Railway va héberger ton projet en tant que **deux services séparés**
(un pour le backend, un pour le frontend), parce que ce sont deux
"boîtes" (conteneurs) indépendantes.

1. Pousse ton projet sur GitHub.
2. Sur [railway.app](https://railway.app), crée un nouveau projet et
   connecte ton dépôt GitHub.
3. **Service backend** :
   - Ajoute un service, choisis ton repo.
   - Dans *Settings → Root Directory*, mets `backend`.
   - Ajoute tes variables d'environnement (celles de ton `.env`).
   - Railway détecte le `Dockerfile` et déploie automatiquement.
4. **Service frontend** :
   - Ajoute un deuxième service, même repo.
   - Dans *Settings → Root Directory*, mets `frontend`.
   - Ajoute une variable `BACKEND_URL` avec l'URL publique de ton
     service backend (Railway te la donne dans l'onglet du service).
5. Une fois les deux déployés, ouvre l'URL publique du **frontend** —
   c'est ton appli, en ligne, visible par tout le monde !

---

## 🎯 Ta mission

1. Lance le projet en local et vérifie que tu vois bien "Mon Projet 🚀"
   dans ton navigateur.
2. Change le texte dans `frontend/src/App.tsx` et regarde la page se
   mettre à jour toute seule.
3. Ouvre `backend/main.py`, regarde l'endpoint `/api/example`, et
   modifie-le pour qu'il fasse quelque chose de nouveau.
4. Quand tu es fier·ère de ton premier changement, demande à ton mentor
   comment faire ton premier `git commit`.

Bon code, et surtout — amuse-toi. 🎨

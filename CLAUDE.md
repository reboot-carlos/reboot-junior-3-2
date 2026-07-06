# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **Level 1 vibe-coding template** for French-speaking teenage students at Reboot. The students describe in plain language what they want their app to do; Claude Code implements it. The project is a skeleton — backend and frontend start nearly empty and grow entirely through AI-assisted student sessions.

## Your role

Students **do not write code themselves**. When a student asks for a feature, implement it directly — no `# TODO` or `// TODO` placeholders. Keep explanations brief and jargon-free (the student is learning to direct an AI, not to read Python or TypeScript). Keep changes scoped to exactly what was asked; do not add auth, routing, a database, or extra pages unless requested. Favor the simplest working implementation. Comments in code stay in French and explain *why*, not *what*.

## Commands

**Développement local (recommandé)**
```bash
./start.sh          # installe les dépendances si besoin, démarre backend + frontend
./stop.sh           # libère les ports 8000 et 5173 si start.sh n'a pas été arrêté proprement
```
- Frontend → http://localhost:5173 (hot reload)
- Backend → http://localhost:8000 (avec `/docs` pour l'interface Swagger)

**Développement avec Docker (fidèle à la prod)**
```bash
./local.sh          # docker compose up --build
```
- Frontend → http://localhost:3000

**Backend seul**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend seul**
```bash
cd frontend
npm install
npm run dev         # dev server
npm run build       # tsc -b && vite build
```

## Architecture

```
Dossier Etudiant/
├── backend/        FastAPI (Python) — single file: main.py
├── frontend/       React + Vite + TypeScript + Tailwind — entry: src/App.tsx
├── docker-compose.yml   backend:8000 + frontend:3000 (nginx)
├── start.sh        dev sans Docker (ports 8000 + 5173)
├── stop.sh         libère les ports si besoin
└── local.sh        raccourci docker compose up --build
```

**Request flow :**
- En dev : `fetch("/api/…")` → Vite proxy → `localhost:8000`
- En prod : `fetch("/api/…")` → nginx (`nginx.conf.template`) → backend Railway

Le backend expose `/health` (healthcheck Railway) et `/api/…` (endpoints métier). Tout est dans `backend/main.py` (single-file) — ne pas découper en modules sauf si le projet dépasse clairement ce cadre.

## Conventions

- **Secrets** : toujours via `os.environ.get("NOM_CLE")`, jamais en dur. Ajouter le nom (sans la valeur) dans `backend/.env.example` et `.env.example` à la racine.
- **CORS** : `allow_origins=["*"]` est volontaire pour simplifier le dev à ce niveau.
- **TypeScript** : strict mode activé — ne pas contourner avec `any` ou `@ts-ignore`.
- **Tailwind** : utiliser les classes utilitaires en priorité ; CSS custom dans `src/index.css` seulement si Tailwind ne suffit pas.
- **Nouvelles dépendances Python** : ajouter dans `requirements.txt` et expliquer au student pourquoi c'est nécessaire.

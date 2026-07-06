# CLAUDE.md

Guidance for Claude Code when working in this directory.

## What this is

FastAPI backend half of a **Level 1 vibe-coding template** ("Dossier
Etudiant") for teenagers. Sibling directory `../frontend` is the paired
React/Vite/TS/Tailwind client.

## Your role here

The students in this program **do not write code themselves**. They
describe, in plain language, what they want their project to do — you are
the expert backend developer who implements it. Don't leave `# TODO`
placeholders for a human to fill in; when a student asks for a feature,
write the real, working implementation directly.

- Explain what you did briefly and in plain, non-jargon terms — the
  student is learning to direct an AI, not to read Python.
- Keep changes scoped to what was asked. Don't add auth, a database, extra
  endpoints, or "nice to haves" the student didn't request.
- Favor the simplest implementation that works over a "professional"
  abstraction — this is still a learning project, not production software.

## Commands

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Or from the project root: `../local.sh` (runs backend + frontend together
via Docker Compose).

## Structure

- `main.py` — single-file FastAPI app: app instance, CORS middleware,
  Pydantic request models, route handlers. Keep it single-file until the
  project genuinely outgrows it.
- `requirements.txt` — pinned dependencies; add new ones here when you add
  a library, and explain to the student why it's needed.
- `Dockerfile` — multi-stage build used both by Docker Compose (local) and
  Railway (production). Only touch it if a new system dependency is needed.
- `railway.toml` — Railway service config; expects Root Directory=`backend`.
- `.env.example` — template for secrets; the real `.env` is gitignored.
  When you add a new secret, add its name (not its value) here too.

## Conventions for this template

- `allow_origins=["*"]` in CORS is intentional for local-dev simplicity at
  this level; don't lock it down unless asked.
- Never hardcode secrets — read them via `os.environ.get(...)`.
- Keep comments in French, matching the target audience (French-speaking
  teenage students), and keep them focused on *why*, not restating *what*.

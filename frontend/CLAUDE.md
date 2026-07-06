# CLAUDE.md

Guidance for Claude Code when working in this directory.

## What this is

React + Vite + TypeScript + Tailwind frontend half of a **Level 1
vibe-coding template** ("Dossier Etudiant") for teenagers. Sibling
directory `../backend` is the paired FastAPI API.

## Your role here

The students in this program **do not write code themselves**. They
describe, in plain language, what they want the app to look like and do —
you are the expert frontend developer who implements it. Don't leave
placeholder `// TODO` markup for a human to fill in; when a student asks
for a feature or a visual change, write the real, working implementation
directly.

- Explain what you did briefly and in plain, non-jargon terms — the
  student is learning to direct an AI, not to read TypeScript or CSS.
- Keep changes scoped to what was asked. Don't add routing, state
  libraries, extra pages, or "nice to haves" the student didn't request.
- Favor the simplest implementation that works — plain React state and
  Tailwind utility classes — over introducing new dependencies or
  abstractions, unless the student's request genuinely needs them.
- When wiring to the backend, call relative paths like `/api/...` — nginx
  (in production) and Vite's dev proxy handle routing to the backend.

## Commands

```bash
npm install
npm run dev       # local dev server with hot reload
npm run build      # production build (tsc -b && vite build)
```

Or from the project root: `../local.sh` (runs backend + frontend together
via Docker Compose).

## Structure

- `src/main.tsx` — entry point, mounts `<App />` into `index.html`.
- `src/App.tsx` — main component; this is where most student-requested UI
  changes land, though feel free to add new components under `src/` as
  the app grows beyond a single file.
- `src/index.css` — Tailwind directives; add custom CSS here only if
  Tailwind utilities can't express it.
- `tailwind.config.js` / `postcss.config.js` — styling setup, rarely needs
  edits at this level.
- `Dockerfile` + `nginx.conf.template` — build the static site and serve
  it in production, proxying `/api` to the backend. Only touch these for
  infra changes, not feature work.
- `railway.toml` — Railway service config; expects Root Directory=
  `frontend` and a `BACKEND_URL` variable.

## Conventions for this template

- Keep comments in French, matching the target audience (French-speaking
  teenage students), and keep them focused on *why*, not restating *what*.
- TypeScript strict mode is on — don't silence errors with `any` or `@ts-ignore`;
  fix the underlying type issue.

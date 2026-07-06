#!/usr/bin/env bash
# Lance le projet en local, en mode "développement rapide" (sans Docker) :
#   - installe les dépendances si besoin
#   - démarre le backend (FastAPI) et le frontend (Vite) en même temps
#   - arrête proprement les deux quand tu fais Ctrl+C
#
# Usage : ./start.sh
#
# (Pour tester le projet exactement comme sur Railway, avec Docker,
# utilise plutôt ./local.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a
else
  printf '\n  \033[1;33mAstuce :\033[0m aucun fichier .env trouvé.\n'
  printf '  Copie .env.example en .env et remplis tes variables si besoin.\n\n'
fi

# ── Backend ───────────────────────────────────────────────────────────────────
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
  printf '  \033[1;36m→\033[0m Première installation du backend (venv Python)...\n'
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source ".venv/bin/activate"
pip install -q -r requirements.txt

uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

deactivate

# ── Frontend ──────────────────────────────────────────────────────────────────
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  printf '  \033[1;36m→\033[0m Première installation du frontend (npm install)...\n'
  npm install --silent
fi

# Arrête le backend si on quitte (Ctrl+C, ou le frontend qui plante)
cleanup() {
  printf '\n  \033[1;33m→\033[0m Arrêt du backend...\n'
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

printf '\n  \033[1;32m✓ Backend démarré  →\033[0m \033[4mhttp://localhost:8000\033[0m\n'
printf '  \033[1;32m→ Frontend démarre →\033[0m \033[4mhttp://localhost:5173\033[0m\n\n'

npm run dev

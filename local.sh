#!/usr/bin/env bash
# Petit raccourci pour lancer tout le projet en local avec Docker.
# Usage : ./local.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  printf '\n  \033[1;33mAstuce :\033[0m aucun fichier .env trouvé.\n'
  printf '  Copie .env.example en .env et remplis tes variables si besoin.\n\n'
fi

docker compose up --build

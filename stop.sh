#!/usr/bin/env bash
# Arrête le backend et le frontend lancés par ./start.sh.
#
# Normalement, un simple Ctrl+C dans le terminal de ./start.sh suffit.
# Ce script sert de filet de sécurité si le terminal a été fermé sans
# Ctrl+C et qu'un serveur est resté allumé en arrière-plan (les ports
# 8000 et 5173 restent alors "occupés").
#
# Usage : ./stop.sh

set -euo pipefail

PORTS=(8000 5173)
killed_any=false

for port in "${PORTS[@]}"; do
  pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  elif command -v fuser >/dev/null 2>&1; then
    pids="$(fuser "$port"/tcp 2>/dev/null | tr -s ' ' | sed 's/^ //' || true)"
  fi

  if [ -n "$pids" ]; then
    printf '  \033[1;33m→\033[0m Arrêt du serveur sur le port %s (pid %s)\n' "$port" "$pids"
    kill $pids 2>/dev/null || true
    killed_any=true
  fi
done

if [ "$killed_any" = true ]; then
  printf '\n  \033[1;32m✓ Terminé.\033[0m Les ports 8000 et 5173 sont libres.\n\n'
else
  printf '\n  Rien à arrêter — aucun serveur ne tournait sur les ports 8000 ou 5173.\n\n'
fi

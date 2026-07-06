"""
Ceci est le CERVEAU de ton projet (le backend).

Le backend, c'est la partie qui tourne sur un serveur, que personne ne voit
directement. C'est lui qui reçoit les questions du frontend (l'interface),
qui réfléchit (en appelant une IA, une base de données, une API...) et qui
renvoie une réponse.

Pour l'instant ce fichier ne fait presque rien : il te donne juste le
squelette. À toi d'ajouter la logique dans les sections marquées TODO.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# 1) On crée l'application. Le "title" apparaît dans la doc auto-générée
#    (disponible sur /docs une fois le serveur lancé).
app = FastAPI(title="Mon Projet — Backend")

# 2) CORS : autorise le frontend (qui tourne sur une autre adresse/port)
#    à appeler ce backend. Sans ça, le navigateur bloque les requêtes.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3) Un exemple de "schéma" : ça décrit la forme des données que le
#    frontend va t'envoyer. Adapte les champs à ton projet.
class ExampleRequest(BaseModel):
    message: str


# 4) Un endpoint de test tout bête, pour vérifier que le serveur répond.
#    Railway s'en sert aussi comme "healthcheck" (voir railway.toml).
@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# 5) TODO — ton premier endpoint "métier".
#    Exemple d'idée : recevoir un message et renvoyer une réponse.
#    Remplace le contenu de la fonction par ta propre logique
#    (appeler une IA, faire un calcul, aller chercher une donnée...).
@app.post("/api/example")
async def example_endpoint(request: ExampleRequest) -> dict:
    # TODO: remplace cette ligne par ta vraie logique
    return {"reply": f"Tu as envoyé : {request.message}"}


# 6) TODO — si ton projet utilise une clé secrète (API IA, base de
#    données...), lis-la depuis les variables d'environnement, JAMAIS
#    écrite en dur dans le code :
#
#    api_key = os.environ.get("MA_CLE_SECRETE")


# 7) Serve le frontend en production (fichiers statiques du build React)
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

"""Chatbot personnel — système multi-conversations avec authentification"""
import hashlib
import json
import os
import re
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

import requests
from anthropic import Anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Chatbot Personnel")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
CONVERSATIONS_DIR = DATA_DIR / "conversations"
CONVERSATIONS_DIR.mkdir(exist_ok=True)
CONVERSATIONS_INDEX = DATA_DIR / "conversations.json"
SETTINGS_FILE = DATA_DIR / "settings.json"
GBIF_CACHE_FILE = DATA_DIR / "gbif_cache.json"

GBIF_API_BASE = "https://api.gbif.org/v1"
DB_FILE = DATA_DIR / "users.db"

# Mots-clés d'espèces courants
KNOWN_SPECIES = {
    "leopard", "léopard", "lion", "tiger", "tigre", "elephant", "éléphant",
    "whale", "baleine", "shark", "requin", "eagle", "aigle", "wolf", "loup",
    "bear", "ours", "dolphin", "dauphin", "gorilla", "gorille", "panda",
    "cheetah", "guépard", "crocodile", "python", "cobra", "condor", "lynx",
    "jaguar", "cougar", "panther", "panthère", "bison", "buffalo", "bufalo",
    "flamingo", "flamant", "penguin", "manchot", "toucan", "parrot", "perroquet",
    "giraffe", "girafe", "zebra", "zèbre", "rhino", "rhinocéros", "hippo",
    "hippopotame", "deer", "cerf", "moose", "orignal", "ox", "boeuf",
    "horse", "cheval", "dog", "chien", "cat", "chat", "bird", "oiseau",
    "fish", "poisson", "snake", "serpent", "lizard", "lézard", "frog", "grenouille",
    "butterfly", "papillon", "bee", "abeille", "ant", "fourmi", "spider", "araignée",
    "oak", "chêne", "pine", "sapin", "birch", "bouleau", "maple", "érable",
    "rose", "tulip", "tulipe", "sunflower", "tournesol", "daisy", "marguerite",
    "wheat", "blé", "corn", "maïs", "rice", "riz", "bean", "haricot",
}

# ============================================================================
# Modèles
# ============================================================================

class ChatRequest(BaseModel):
    message: str
    conversation_id: str = None
    user_id: str = None
    language: str = "fr"

class ChatResponse(BaseModel):
    response: str
    conversation_id: str

class AuthRequest(BaseModel):
    pseudo: str
    pin: str

class AuthResponse(BaseModel):
    user_id: str
    pseudo: str

# ============================================================================
# Authentification & Base de données
# ============================================================================

def init_db():
    """Initialise la base SQLite au démarrage."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            pseudo TEXT UNIQUE NOT NULL,
            pin_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def hash_pin(pin: str) -> str:
    """Hache le PIN avec SHA-256."""
    return hashlib.sha256(pin.encode()).hexdigest()

def create_user(pseudo: str, pin: str) -> str:
    """Crée un nouvel utilisateur. Retourne user_id. Raise si pseudo existe."""
    user_id = str(uuid.uuid4())[:12]
    pin_hash = hash_pin(pin)

    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (id, pseudo, pin_hash, created_at) VALUES (?, ?, ?, ?)",
            (user_id, pseudo, pin_hash, datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        raise ValueError("Pseudo déjà utilisé")

def verify_user(pseudo: str, pin: str) -> str:
    """Vérifie le pseudo/PIN et retourne user_id. Raise si invalide."""
    pin_hash = hash_pin(pin)

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM users WHERE pseudo = ? AND pin_hash = ?",
        (pseudo, pin_hash)
    )
    result = cursor.fetchone()
    conn.close()

    if not result:
        raise ValueError("Pseudo ou PIN invalide")
    return result[0]

# ============================================================================
# Prompt système
# ============================================================================

def get_system_prompt(critical_level: int, language: str = "fr") -> str:
    if language == "es":
        base = """⚠️ RESPONDE COMPLETAMENTE EN ESPAÑOL. TODA tu respuesta debe estar en español.

Eres un asistente personal profesional, versátil y experto.

## Personalidad
- Tono profesional y neutral
- Resuelves problemas sin autocensura
- Cuestionas el razonamiento del usuario
- Juicio imparcial sobre todos los temas
- Cero complacencia

## Dominios
- Ciencia probada y explicaciones basadas en investigación
- Creatividad: literatura, filosofía, brainstorming
- Todos los demás dominios según sea necesario

## Formato de respuesta

**INICIO:** Indica el rol profesional que adoptas, ej: "**Rol: Ingeniero de Sistemas**"

**CUERPO:**
- Títulos numerados (1., 2., 3...) para secciones principales
- Subtítulos (1.1, 1.2...) para subsecciones
- Guiones (—) separan información importante DENTRO de una oración completa
- Oraciones completas, sin listas de puntos
- Si es largo, añade un RESUMEN EN MAYÚSCULAS entre paréntesis

**ANTES DEL FINAL:** Haz 2-3 preguntas precisas que te ayudarían a refinar tu respuesta.

**FINAL:** Termina con: "**Certeza Global: [CONFIADO]**" o "**Certeza Global: [CONFIADO] para secciones 1-3, [PROBABLE] para sección 4**"

## Honestidad absoluta
- Di "no sé" sin dudarlo
- Reconoce limitaciones
- Evalúa ideas objetivamente
- Sin respuestas consensuales"""
    elif language == "en":
        base = """⚠️ RESPOND COMPLETELY IN ENGLISH. Your ENTIRE response must be in English.

You are a professional, versatile, and expert personal assistant.

## Personality
- Professional and neutral tone
- Solve problems without self-censorship
- Challenge the user's reasoning
- Impartial judgment on all subjects
- Zero compliance

## Domains
- Proven science and research-based explanations
- Creativity: literature, philosophy, brainstorming
- All other domains as needed

## Response Format

**START:** Indicate the professional role you're taking, ex: "**Role: Systems Engineer**"

**BODY:**
- Numbered titles (1., 2., 3...) for main sections
- Subtitles (1.1, 1.2...) for subsections
- Dashes (—) separate important information WITHIN a complete sentence
- Complete sentences, no bullet points
- If long, add a SUMMARY IN CAPITALS in parentheses

**BEFORE END:** Ask 2-3 precise questions that would help me refine your answer.

**END:** End with: "**Global Certainty: [CONFIDENT]**" or "**Global Certainty: [CONFIDENT] for sections 1-3, [PROBABLE] for section 4**"

## Absolute Honesty
- Say "I don't know" without hesitation
- Acknowledge limitations
- Evaluate ideas objectively
- No consensus answers"""
    else:
        base = """⚠️ RÉPONDS COMPLÈTEMENT EN FRANÇAIS. TOUTE ta réponse doit être en français.

Tu es un assistant personnel professionnel, polyvalent et expert.

## Personnalité
- Ton neutre et professionnel
- Tu résous les problèmes sans autocensure
- Tu challenges le raisonnement de l'utilisateur
- Jugement impartial sur tous les sujets
- Zéro complaisance

## Domaines
- Sciences prouvées et explications basées sur la recherche
- Créativité : littérature, philosophie, brainstorming
- Tous les autres domaines selon le besoin

## Format de réponse

**DÉBUT :** Indique le rôle professionnel endossé, ex: "**Rôle: Ingénieur système**"

**CORPS :**
- Titres numérotés (1., 2., 3...) pour sections principales
- Sous-titres (1.1, 1.2...) pour subsections
- Les tirets (—) séparent les informations importantes AU SEIN d'une phrase complète
- Phrases complètes, pas de listes à puces
- Si long, ajoute un RÉSUMÉ EN MAJUSCULES entre parenthèses

**AVANT LA FIN :** Pose 2-3 questions précises qui t'aideraient à affiner ta réponse.

**FIN :** Termine par: "**Certitude globale: [CONFIANT]**" ou "**Certitude globale: [CONFIANT] pour sections 1-3, [PROBABLE] pour section 4**"

## Honnêteté absolue
- Dis "je ne sais pas" sans hésitation
- Reconnais les limites
- Évalue les idées objectivement
- Pas de réponses consensuelles"""

    if critical_level > 50:
        if language == "en":
            extra = f"""

## CRITICAL MODE (level {critical_level}/100)
Be MORE CRITICAL AND DIRECT.
- Point out inconsistencies without detour.
- Propose counter-arguments.
- Don't hesitate to say "that's bad", "that's weak" if justified."""
        elif language == "es":
            extra = f"""

## MODO CRÍTICO (nivel {critical_level}/100)
Sé MÁS CRÍTICO Y DIRECTO.
- Señala inconsistencias sin rodeos.
- Propón contra-argumentos.
- No dudes en decir "eso es malo", "eso es débil" si está justificado."""
        else:
            extra = f"""

## MODE CRITIQUE (niveau {critical_level}/100)
Sois PLUS CRITIQUE ET DIRECT.
- Relève les incohérences sans détour.
- Propose des contre-arguments.
- N'hésite pas à dire "c'est mauvais", "c'est faible" si justifié."""
    elif critical_level < 50:
        if language == "en":
            extra = f"""

## BENEVOLENT MODE (level {critical_level}/100)
Be more accessible and encouraging.
- Explain with more examples.
- Be more patient."""
        elif language == "es":
            extra = f"""

## MODO BENEVOLENTE (nivel {critical_level}/100)
Sé más accesible y alentador.
- Explica con más ejemplos.
- Sé más paciente."""
        else:
            extra = f"""

## MODE BIENVEILLANT (niveau {critical_level}/100)
Sois plus accessible et encourageant.
- Explique avec plus d'exemples.
- Sois plus patient."""
    else:
        extra = ""

    return base + extra

# ============================================================================
# Gestion des conversations
# ============================================================================

def load_conversations_index() -> dict:
    if CONVERSATIONS_INDEX.exists():
        with open(CONVERSATIONS_INDEX) as f:
            return json.load(f)
    return {"conversations": []}

def save_conversations_index(data: dict):
    with open(CONVERSATIONS_INDEX, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def create_conversation(title: str, user_id: str = None) -> str:
    conv_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    conv_dir = CONVERSATIONS_DIR / conv_id
    conv_dir.mkdir(exist_ok=True)

    (conv_dir / "history.json").write_text("[]")
    (conv_dir / "memory.json").write_text(json.dumps({"important_facts": []}))

    metadata = {"id": conv_id, "title": title, "created_at": now, "updated_at": now, "tags": [], "user_id": user_id}
    (conv_dir / "metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False))

    index = load_conversations_index()
    index["conversations"].append(metadata)
    save_conversations_index(index)

    return conv_id

def get_conversation_dir(conv_id: str) -> Path:
    return CONVERSATIONS_DIR / conv_id

def load_conversation_history(conv_id: str) -> list:
    history_file = get_conversation_dir(conv_id) / "history.json"
    if history_file.exists():
        with open(history_file) as f:
            return json.load(f)
    return []

def save_conversation_history(conv_id: str, history: list):
    with open(get_conversation_dir(conv_id) / "history.json", "w") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)

def load_conversation_memory(conv_id: str) -> dict:
    memory_file = get_conversation_dir(conv_id) / "memory.json"
    if memory_file.exists():
        with open(memory_file) as f:
            return json.load(f)
    return {"important_facts": []}

def save_conversation_memory(conv_id: str, memory: dict):
    with open(get_conversation_dir(conv_id) / "memory.json", "w") as f:
        json.dump(memory, f, indent=2, ensure_ascii=False)

def delete_conversation(conv_id: str):
    conv_dir = get_conversation_dir(conv_id)
    import shutil
    if conv_dir.exists():
        shutil.rmtree(conv_dir)

    index = load_conversations_index()
    index["conversations"] = [c for c in index["conversations"] if c["id"] != conv_id]
    save_conversations_index(index)

def rename_conversation(conv_id: str, new_title: str):
    metadata_file = get_conversation_dir(conv_id) / "metadata.json"
    if metadata_file.exists():
        with open(metadata_file) as f:
            metadata = json.load(f)

        metadata["title"] = new_title
        metadata["updated_at"] = datetime.now().isoformat()

        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

        index = load_conversations_index()
        for conv in index["conversations"]:
            if conv["id"] == conv_id:
                conv["title"] = new_title
                break
        save_conversations_index(index)

def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE) as f:
            return json.load(f)
    return {"critical_level": 50, "memory_enabled": True}

def save_settings(settings: dict):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=2)

def extract_certainty_indicators(text: str) -> list:
    pattern = r"\[(CONFIANT|PROBABLE|INCERTAIN|HYPOTHÈSE)\]"
    return re.findall(pattern, text)

# ============================================================================
# GBIF Integration
# ============================================================================

def load_gbif_cache() -> dict:
    if GBIF_CACHE_FILE.exists():
        with open(GBIF_CACHE_FILE) as f:
            return json.load(f)
    return {}

def save_gbif_cache(cache: dict):
    with open(GBIF_CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

def detect_species(text: str) -> list:
    """Détecte les espèces mentionnées dans le texte en utilisant une liste de mots-clés."""
    text_lower = text.lower()
    found_species = []

    for species in KNOWN_SPECIES:
        # Chercher le mot en tant que mot entier (pas juste substring)
        if re.search(rf"\b{species}\b", text_lower):
            found_species.append(species)

    return list(set(found_species))[:2]

def fetch_gbif_data(species_name: str) -> dict:
    """Récupère les données GBIF avec cache. Retourne un dict de faits intéressants."""
    cache = load_gbif_cache()
    species_key = species_name.lower().strip()

    if species_key in cache:
        return cache[species_key]

    try:
        # Chercher directement avec occurrence search (plus simple et plus fiable)
        occ_url = f"{GBIF_API_BASE}/occurrence/search"

        # D'abord compter les occurrences
        count_resp = requests.get(
            occ_url,
            params={"q": species_name, "limit": 1},
            timeout=5
        )

        if count_resp.status_code != 200:
            result = {}
        else:
            occ_data = count_resp.json()
            total_records = occ_data.get("count", 0)

            # Extraire les pays si on a des records
            countries = {}
            if total_records > 0:
                countries_resp = requests.get(
                    occ_url,
                    params={"q": species_name, "limit": 300},
                    timeout=5
                )

                if countries_resp.status_code == 200:
                    for record in countries_resp.json().get("results", []):
                        country = record.get("country")
                        if country:
                            countries[country] = countries.get(country, 0) + 1

            top_countries = sorted(countries.items(), key=lambda x: x[1], reverse=True)[:3]
            country_list = [c[0] for c in top_countries]

            result = {
                "species_name": species_name,
                "total_observations": total_records,
                "top_countries": country_list,
                "found": total_records > 0
            }

        cache[species_key] = result
        save_gbif_cache(cache)
        return result

    except Exception as e:
        print(f"Erreur GBIF pour {species_name}: {e}")
        return {}

def format_gbif_facts(gbif_data: dict) -> str:
    """Formate les données GBIF en contexte pour Claude."""
    if not gbif_data.get("found"):
        return ""

    species_name = gbif_data.get("species_name", "")
    obs_count = gbif_data.get("total_observations", 0)
    countries = gbif_data.get("top_countries", [])

    facts = []
    if obs_count > 0:
        facts.append(f"{obs_count} observations documentées sur GBIF")
    if countries:
        facts.append(f"Observé notamment en: {', '.join(countries)}")

    if facts:
        context = f"\n[Données GBIF pour {species_name}] " + " | ".join(facts)
        context += "\nIntègre ces infos naturellement dans ta réponse."
        return context
    return ""

# ============================================================================
# Routes
# ============================================================================

@app.on_event("startup")
def startup():
    init_db()

@app.post("/api/auth/register", response_model=AuthResponse)
def register(request: AuthRequest):
    try:
        user_id = create_user(request.pseudo, request.pin)
        return AuthResponse(user_id=user_id, pseudo=request.pseudo)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@app.post("/api/auth/login", response_model=AuthResponse)
def login(request: AuthRequest):
    try:
        user_id = verify_user(request.pseudo, request.pin)
        return AuthResponse(user_id=user_id, pseudo=request.pseudo)
    except ValueError:
        raise HTTPException(status_code=401, detail="Pseudo ou PIN invalide")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/conversations")
def list_conversations(user_id: str = None):
    index = load_conversations_index()
    convs = index["conversations"]
    if user_id:
        convs = [c for c in convs if c.get("user_id") == user_id]
    return {"conversations": convs}

@app.post("/api/conversations")
def create_conv(request: dict):
    title = request.get("title", "Nouvelle conversation")
    user_id = request.get("user_id")
    conv_id = create_conversation(title, user_id=user_id)
    return {"conversation_id": conv_id}

@app.delete("/api/conversations/{conv_id}")
def delete_conv(conv_id: str):
    delete_conversation(conv_id)
    return {"status": "deleted"}

@app.put("/api/conversations/{conv_id}")
def update_conv(conv_id: str, request: dict):
    if "title" in request:
        rename_conversation(conv_id, request["title"])
    return {"status": "ok"}

@app.get("/api/conversations/{conv_id}/messages")
def get_messages(conv_id: str):
    history = load_conversation_history(conv_id)
    return {"messages": history}

@app.post("/api/chat")
def chat(request: ChatRequest) -> ChatResponse:
    user_message = request.message.strip()

    if not user_message:
        raise ValueError("Message vide")

    # Commandes
    if user_message.lower() == "help":
        if request.language == "en":
            response = """Available commands:
— more : expand the previous answer
— less : shorter version
— be critical : critical mode
— erase : delete this conversation (messages + memory)
— help : show this message"""
        elif request.language == "es":
            response = """Comandos disponibles:
— más : expande la respuesta anterior
— menos : versión más corta
— sé crítico : modo crítico
— borrar : elimina esta conversación (mensajes + memoria)
— ayuda : muestra este mensaje"""
        else:
            response = """Commandes disponibles:
— plus : développe la réponse précédente
— moins : version plus courte
— sois critique : mode critique
— erase : efface cette conversation (bulles + mémoire)
— help : affiche ce message"""
        return ChatResponse(response=response, conversation_id=request.conversation_id or "none")

    if user_message.lower() in ["erase", "borrar"]:
        if request.conversation_id:
            delete_conversation(request.conversation_id)
        if request.language == "en":
            response = "Conversation deleted (messages + memory)."
        elif request.language == "es":
            response = "Conversación eliminada (mensajes + memoria)."
        else:
            response = "Conversation effacée (bulles + mémoire)."
        return ChatResponse(response=response, conversation_id=request.conversation_id or "none")

    # Commandes de modification
    if user_message.lower() in ["plus", "more", "más", "moins", "less", "menos", "sois critique", "be critical", "sé crítico"]:
        if not request.conversation_id:
            if request.language == "en":
                raise ValueError("No active conversation")
            elif request.language == "es":
                raise ValueError("No hay conversación activa")
            else:
                raise ValueError("Pas de conversation active")

        history = load_conversation_history(request.conversation_id)
        if len(history) < 2:
            if request.language == "en":
                no_prev = "No previous answer."
            elif request.language == "es":
                no_prev = "No hay respuesta anterior."
            else:
                no_prev = "Aucune réponse précédente."
            return ChatResponse(response=no_prev, conversation_id=request.conversation_id)

        last_user_message = None
        for msg in reversed(history):
            if msg["role"] == "user":
                last_user_message = msg["content"]
                break

        if not last_user_message:
            if request.language == "en":
                raise ValueError("No previous answer")
            elif request.language == "es":
                raise ValueError("No hay respuesta anterior")
            else:
                raise ValueError("Pas de réponse précédente")

        memory = load_conversation_memory(request.conversation_id)
        settings = load_settings()

        messages_for_claude = [{"role": msg["role"], "content": msg["content"]} for msg in history[:-1]]

        if user_message.lower() in ["plus", "more", "más"]:
            if request.language == "en":
                mod_prompt = f"You gave an answer about \"{last_user_message}\". EXPAND with more details."
            elif request.language == "es":
                mod_prompt = f"Diste una respuesta sobre \"{last_user_message}\". EXPANDE con más detalles."
            else:
                mod_prompt = f"Tu as donné une réponse sur \"{last_user_message}\". DÉVELOPPE avec plus de détails."
        elif user_message.lower() in ["moins", "less", "menos"]:
            if request.language == "en":
                mod_prompt = f"You gave an answer about \"{last_user_message}\". Give a SHORT AND CONCISE version."
            elif request.language == "es":
                mod_prompt = f"Diste una respuesta sobre \"{last_user_message}\". Da una versión BREVE Y CONCISA."
            else:
                mod_prompt = f"Tu as donné une réponse sur \"{last_user_message}\". Donne une version BRÈVE ET CONCISE."
        else:
            if request.language == "en":
                mod_prompt = f"You gave an answer about \"{last_user_message}\". BE MORE CRITICAL AND DIRECT."
            elif request.language == "es":
                mod_prompt = f"Diste una respuesta sobre \"{last_user_message}\". SÉ MÁS CRÍTICO Y DIRECTO."
            else:
                mod_prompt = f"Tu as donné une réponse sur \"{last_user_message}\". SOIS PLUS CRITIQUE ET DIRECT."

        messages_for_claude.append({"role": "user", "content": mod_prompt})

        memory_context = ""
        if memory.get("important_facts"):
            facts = "\n".join(f"— {f}" for f in memory["important_facts"][:10])
            memory_context = f"\n[Contexte utilisateur important]\n{facts}"

        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=2000,
            system=get_system_prompt(settings.get("critical_level", 50), request.language) + memory_context,
            messages=messages_for_claude,
        )

        assistant_message = response.content[0].text

        if history[-1]["role"] == "assistant":
            history[-1]["content"] = assistant_message
            save_conversation_history(request.conversation_id, history)

        return ChatResponse(response=assistant_message, conversation_id=request.conversation_id)

    # Message normal
    if not request.conversation_id:
        request.conversation_id = create_conversation("Nouvelle conversation", user_id=request.user_id)

    history = load_conversation_history(request.conversation_id)
    memory = load_conversation_memory(request.conversation_id)
    settings = load_settings()

    messages_for_claude = [{"role": msg["role"], "content": msg["content"]} for msg in history]

    messages_for_claude.append({"role": "user", "content": user_message})

    memory_context = ""
    if memory.get("important_facts"):
        facts = "\n".join(f"— {f}" for f in memory["important_facts"][:10])
        memory_context = f"\n[Contexte utilisateur important]\n{facts}"

    # Enrichir avec données GBIF si espèce détectée
    gbif_context = ""
    species_list = detect_species(user_message)
    if species_list:
        for species in species_list:
            gbif_data = fetch_gbif_data(species)
            gbif_facts = format_gbif_facts(gbif_data)
            if gbif_facts:
                gbif_context += gbif_facts + "\n"

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2048,
        system=get_system_prompt(settings.get("critical_level", 50), request.language) + memory_context + gbif_context,
        messages=messages_for_claude,
    )

    assistant_message = response.content[0].text

    now_iso = datetime.now().isoformat()
    history.append({"role": "user", "content": user_message, "timestamp": now_iso})
    history.append({"role": "assistant", "content": assistant_message, "timestamp": now_iso})
    save_conversation_history(request.conversation_id, history)

    if any(kw in user_message.lower() for kw in ["me rappelle", "important", "mémoriser"]):
        memory["important_facts"].append(user_message)
        save_conversation_memory(request.conversation_id, memory)

    return ChatResponse(response=assistant_message, conversation_id=request.conversation_id)

@app.get("/api/settings")
def get_settings():
    return load_settings()

@app.put("/api/settings")
def update_settings(request: dict):
    settings = load_settings()
    settings.update(request)
    save_settings(settings)
    return {"status": "ok"}

@app.get("/api/history")
def get_history(user_id: str = None):
    history_entries = []
    index = load_conversations_index()

    for conv in index.get("conversations", []):
        # Filtrer par user_id si fourni
        if user_id and conv.get("user_id") != user_id:
            continue

        conv_id = conv["id"]
        history_file = get_conversation_dir(conv_id) / "history.json"
        if history_file.exists():
            with open(history_file) as f:
                messages = json.load(f)
                for msg in messages:
                    history_entries.append({
                        "role": msg["role"],
                        "content": msg["content"],
                        "timestamp": msg.get("timestamp", conv.get("updated_at", datetime.now().isoformat())),
                        "conversation_title": conv["title"],
                        "conversation_id": conv_id
                    })

    return {"history": sorted(history_entries, key=lambda x: x["timestamp"], reverse=True)}

@app.delete("/api/history/clear-all")
def clear_all_history(user_id: str = None):
    """Supprime tout l'historique d'un utilisateur."""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id requis")

    index = load_conversations_index()
    for conv in index.get("conversations", []):
        if conv.get("user_id") == user_id:
            history_file = get_conversation_dir(conv["id"]) / "history.json"
            if history_file.exists():
                history_file.write_text("[]")

    return {"status": "ok", "message": "Historique supprimé"}

@app.delete("/api/conversations/{conv_id}/history")
def clear_conversation_history(conv_id: str):
    """Supprime l'historique d'une conversation spécifique."""
    history_file = get_conversation_dir(conv_id) / "history.json"
    if history_file.exists():
        history_file.write_text("[]")
    return {"status": "ok", "message": "Historique de la conversation supprimé"}

@app.delete("/api/history/delete")
def delete_history_entry(conversation_id: str = None, timestamp: str = None):
    """Supprime une entrée spécifique de l'historique par timestamp."""
    if not conversation_id or not timestamp:
        raise HTTPException(status_code=400, detail="conversation_id et timestamp requis")

    history_file = get_conversation_dir(conversation_id) / "history.json"
    if not history_file.exists():
        return {"status": "ok", "message": "Entrée non trouvée"}

    with open(history_file) as f:
        history = json.load(f)

    # Filtrer pour enlever l'entrée avec ce timestamp
    updated_history = [msg for msg in history if msg.get("timestamp") != timestamp]

    with open(history_file, "w") as f:
        json.dump(updated_history, f, indent=2, ensure_ascii=False)

    return {"status": "ok", "message": "Entrée supprimée"}

# Servir les fichiers statiques du frontend (en production via Dockerfile)
static_dir = Path("static")
if static_dir.exists():
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

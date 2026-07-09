import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatResponse {
  response: string;
  conversation_id: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  user_id?: string;
  folder?: string;
}

interface Folder {
  id: string;
  name: string;
  user_id?: string;
}

interface User {
  id: string;
  pseudo: string;
}

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  conversation_title: string;
  conversation_id: string;
}

type Tab = "chat" | "settings" | "history";

function parseResponse(content: string) {
  const sections = {
    role: "",
    title: "",
    body: [] as React.ReactNode[],
    summary: "",
    questions: [] as string[],
    certainty: "",
  };

  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length && lines[i].trim() === "") i++;
  if (lines[i] && lines[i].startsWith("**Rôle:")) {
    sections.role = lines[i].replace("**Rôle: ", "").replace("**", "").trim();
    i++;
  }

  while (i < lines.length && lines[i].trim() === "") i++;

  if (lines[i] && lines[i].startsWith("##")) {
    sections.title = lines[i].replace("## ", "").trim();
    i++;
  }

  let currentSection = [] as string[];
  let sectionNum = "";

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("**Questions pour affiner:**")) {
      if (currentSection.length > 0) {
        sections.body.push(
          <ResponseSection key={`section-${sectionNum}`} number={sectionNum} lines={currentSection} />
        );
        currentSection = [];
      }
      i++;
      while (i < lines.length && !lines[i].startsWith("**Certitude globale:")) {
        if (lines[i].trim().startsWith("—")) {
          sections.questions.push(lines[i].replace("—", "").trim());
        }
        i++;
      }
    } else if (line.startsWith("**Certitude globale:")) {
      if (currentSection.length > 0) {
        sections.body.push(
          <ResponseSection key={`section-${sectionNum}`} number={sectionNum} lines={currentSection} />
        );
      }
      sections.certainty = line.replace("**Certitude globale: ", "").replace("**", "");
      break;
    } else if (line.match(/^\(RÉSUMÉ/)) {
      if (currentSection.length > 0) {
        sections.body.push(
          <ResponseSection key={`section-${sectionNum}`} number={sectionNum} lines={currentSection} />
        );
        currentSection = [];
      }
      sections.summary = line;
      i++;
    } else if (line.match(/^\*\*\d+\./)) {
      if (currentSection.length > 0) {
        sections.body.push(
          <ResponseSection key={`section-${sectionNum}`} number={sectionNum} lines={currentSection} />
        );
      }
      const match = line.match(/^\*\*(\d+(?:\.\d+)?)\./);
      sectionNum = match ? match[1] : "";
      currentSection = [line];
      i++;
    } else if (line.trim() !== "" && line !== "---") {
      currentSection.push(line);
      i++;
    } else {
      i++;
    }
  }

  return sections;
}

interface SectionProps {
  number: string;
  lines: string[];
}

function ResponseSection({ number, lines }: SectionProps) {
  return (
    <div className="response-section">
      {lines.map((line, idx) => {
        if (line.match(/^\*\*\d+\./)) {
          const title = line.replace(/^\*\*\d+\.\s*/, "").replace(/\*\*$/, "").trim();
          return (
            <div key={idx} className="response-section-title">
              <span className="response-number">{number}.</span>
              <span>{title}</span>
            </div>
          );
        }
        if (line.match(/^\*\*\d+\.\d+\./)) {
          const title = line.replace(/^\*\*\d+\.\d+\.\s*/, "").replace(/\*\*$/, "").trim();
          return (
            <div key={idx} className="response-subsection-title">
              {title}
            </div>
          );
        }
        if (line.trim().startsWith("```") || line.trim() === "") {
          return null;
        }
        return (
          <p key={idx} className="response-key-point">
            {formatText(line)}
          </p>
        );
      })}
    </div>
  );
}

function formatText(text: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const combined = /\*\*([^*]+)\*\*|_([^_]+)_|\[([A-Z]+)\]|—/g;
  let match;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(
        <strong key={`bold-${match.index}`} className="text-blue-300 font-bold">
          {match[1]}
        </strong>
      );
    } else if (match[2]) {
      parts.push(
        <em key={`italic-${match.index}`} className="text-amber-300 font-medium italic">
          {match[2]}
        </em>
      );
    } else if (match[3]) {
      parts.push(
        <span key={`badge-${match.index}`} className={`certainty-badge ${getCertaintyClass(match[3])}`}>
          {match[3]}
        </span>
      );
    } else if (match[0] === "—") {
      parts.push(
        <span key={`dash-${match.index}`} className="text-blue-400 font-bold">
          {" — "}
        </span>
      );
    }

    lastIndex = combined.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function getCertaintyClass(label: string): string {
  const map: Record<string, string> = {
    CONFIANT: "bg-green-900/60 text-green-200",
    PROBABLE: "bg-yellow-900/60 text-yellow-200",
    INCERTAIN: "bg-orange-900/60 text-orange-200",
    HYPOTHÈSE: "bg-purple-900/60 text-purple-200",
  };
  return map[label] || "bg-slate-700/50 text-slate-300";
}

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Animated background with geometric lines */}
      <div className="fixed inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950" />

        {/* SVG mesh/grid animation */}
        <svg className="absolute inset-0 w-full h-full opacity-60" preserveAspectRatio="none">
          <defs>
            <style>{`
              @keyframes linePulse1 {
                0%, 100% { stroke-width: 1.5; opacity: 0.2; }
                50% { stroke-width: 2.5; opacity: 0.6; }
              }
              @keyframes linePulse2 {
                0%, 100% { stroke-width: 1.5; opacity: 0.25; }
                50% { stroke-width: 2.5; opacity: 0.65; }
              }
              @keyframes linePulse3 {
                0%, 100% { stroke-width: 1.5; opacity: 0.22; }
                50% { stroke-width: 2.5; opacity: 0.62; }
              }
              .line1 { animation: linePulse1 3s ease-in-out infinite; }
              .line2 { animation: linePulse2 3.5s ease-in-out infinite 0.3s; }
              .line3 { animation: linePulse3 4s ease-in-out infinite 0.6s; }
            `}</style>
          </defs>
          {/* Vertical lines */}
          <line className="line1" x1="10%" y1="0%" x2="10%" y2="100%" stroke="rgb(96, 165, 250)" strokeWidth="2" />
          <line className="line2" x1="20%" y1="0%" x2="20%" y2="100%" stroke="rgb(147, 51, 234)" strokeWidth="2" />
          <line className="line1" x1="30%" y1="0%" x2="30%" y2="100%" stroke="rgb(34, 197, 94)" strokeWidth="2" />
          <line className="line3" x1="40%" y1="0%" x2="40%" y2="100%" stroke="rgb(59, 130, 246)" strokeWidth="2" />
          <line className="line2" x1="60%" y1="0%" x2="60%" y2="100%" stroke="rgb(139, 92, 246)" strokeWidth="2" />
          <line className="line1" x1="70%" y1="0%" x2="70%" y2="100%" stroke="rgb(96, 165, 250)" strokeWidth="2" />
          <line className="line3" x1="80%" y1="0%" x2="80%" y2="100%" stroke="rgb(34, 197, 94)" strokeWidth="2" />
          <line className="line2" x1="90%" y1="0%" x2="90%" y2="100%" stroke="rgb(147, 51, 234)" strokeWidth="2" />

          {/* Horizontal lines */}
          <line className="line2" x1="0%" y1="20%" x2="100%" y2="20%" stroke="rgb(96, 165, 250)" strokeWidth="2" />
          <line className="line1" x1="0%" y1="40%" x2="100%" y2="40%" stroke="rgb(139, 92, 246)" strokeWidth="2" />
          <line className="line3" x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgb(34, 197, 94)" strokeWidth="2" />
          <line className="line2" x1="0%" y1="60%" x2="100%" y2="60%" stroke="rgb(59, 130, 246)" strokeWidth="2" />
          <line className="line1" x1="0%" y1="80%" x2="100%" y2="80%" stroke="rgb(96, 165, 250)" strokeWidth="2" />

          {/* Diagonal accents */}
          <line className="line3" x1="0%" y1="0%" x2="100%" y2="100%" stroke="rgb(147, 51, 234)" strokeWidth="1.5" opacity="0.4" />
          <line className="line2" x1="100%" y1="0%" x2="0%" y2="100%" stroke="rgb(96, 165, 250)" strokeWidth="1.5" opacity="0.4" />
        </svg>

        {/* Top-right glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full filter blur-3xl animate-pulse" />
        {/* Bottom-left glow accent */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
      </div>

      {/* Hero */}
      <div className="relative z-10 h-screen flex items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-12">
          <style>{`
            @keyframes slideInDown {
              from {
                opacity: 0;
                transform: translateY(-30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes slideInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes underlineExpand {
              from {
                width: 0;
              }
              to {
                width: 100%;
              }
            }
            .hero-title {
              animation: slideInDown 0.8s ease-out;
              letter-spacing: -0.02em;
            }
            .hero-subtitle {
              animation: slideInDown 0.8s ease-out 0.15s both;
            }
            .hero-button {
              animation: slideInUp 0.8s ease-out 0.3s both;
            }
            .cta-button {
              position: relative;
              display: inline-block;
              padding: 12px 0;
              font-size: 1.125rem;
              font-weight: 600;
              letter-spacing: 0.05em;
              color: rgba(226, 232, 240, 1);
              background: none;
              border: none;
              cursor: pointer;
              transition: color 0.3s ease;
            }
            .cta-button::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              width: 0;
              height: 2px;
              background: linear-gradient(90deg, rgb(96, 165, 250), rgb(59, 130, 246));
              transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .cta-button:hover {
              color: rgb(96, 165, 250);
            }
            .cta-button:hover::after {
              width: 100%;
            }
          `}</style>

          <div className="space-y-6">
            <h1 className="hero-title text-7xl font-bold">
              <span className="block text-slate-100">Chatbot Personnel</span>
              <span className="block bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">Intelligent & Critique</span>
            </h1>
            <p className="hero-subtitle text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Conversez avec une IA qui ne vous dit pas ce que vous voulez entendre. Gérez vos conversations en toute confidentialité.
            </p>
          </div>

          <div className="hero-button">
            <button
              onClick={onGetStarted}
              className="cta-button"
            >
              Commencer →
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 bg-slate-900/50 py-20 px-6 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Fonctionnalités</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg mb-4" />
              <h3 className="font-semibold mb-2">Multi-Conversations</h3>
              <p className="text-sm text-slate-400">Gérez plusieurs conversations isolées avec historique complet</p>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg mb-4" />
              <h3 className="font-semibold mb-2">Données GBIF</h3>
              <p className="text-sm text-slate-400">Explorez la biodiversité mondiale avec observations en temps réel</p>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg mb-4" />
              <h3 className="font-semibold mb-2">Privé & Sécurisé</h3>
              <p className="text-sm text-slate-400">Vos conversations sont isolées. Authentification personnelle.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Statistiques</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">∞</div>
              <p className="text-sm text-slate-400 mt-3">Conversations illimitées</p>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">∞</div>
              <p className="text-sm text-slate-400 mt-3">Messages illimités</p>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">24/7</div>
              <p className="text-sm text-slate-400 mt-3">Toujours disponible</p>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">100%</div>
              <p className="text-sm text-slate-400 mt-3">Données privées</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="relative z-10 bg-slate-900/50 py-16 px-6 border-t border-slate-700 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold text-slate-100">Prêt à commencer?</h2>
          <button
            onClick={onGetStarted}
            className="cta-button text-base"
          >
            Se connecter ou créer un compte →
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({
  mode,
  setMode,
  pseudo,
  setPseudo,
  pin,
  setPin,
  error,
  onSubmit,
}: {
  mode: "login" | "register";
  setMode: (m: "login" | "register") => void;
  pseudo: string;
  setPseudo: (s: string) => void;
  pin: string;
  setPin: (p: string) => void;
  error: string;
  onSubmit: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center overflow-hidden relative">
      {/* Animated background (same as landing) */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950" />

        <svg className="absolute inset-0 w-full h-full opacity-60" preserveAspectRatio="none">
          <defs>
            <style>{`
              @keyframes linePulse1 {
                0%, 100% { stroke-width: 1.5; opacity: 0.2; }
                50% { stroke-width: 2.5; opacity: 0.6; }
              }
              @keyframes linePulse2 {
                0%, 100% { stroke-width: 1.5; opacity: 0.25; }
                50% { stroke-width: 2.5; opacity: 0.65; }
              }
              @keyframes linePulse3 {
                0%, 100% { stroke-width: 1.5; opacity: 0.22; }
                50% { stroke-width: 2.5; opacity: 0.62; }
              }
              .line1 { animation: linePulse1 3s ease-in-out infinite; }
              .line2 { animation: linePulse2 3.5s ease-in-out infinite 0.3s; }
              .line3 { animation: linePulse3 4s ease-in-out infinite 0.6s; }
            `}</style>
          </defs>
          <line className="line1" x1="10%" y1="0%" x2="10%" y2="100%" stroke="rgb(96, 165, 250)" strokeWidth="2" />
          <line className="line2" x1="30%" y1="0%" x2="30%" y2="100%" stroke="rgb(147, 51, 234)" strokeWidth="2" />
          <line className="line1" x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgb(34, 197, 94)" strokeWidth="2" />
          <line className="line3" x1="70%" y1="0%" x2="70%" y2="100%" stroke="rgb(59, 130, 246)" strokeWidth="2" />
          <line className="line2" x1="90%" y1="0%" x2="90%" y2="100%" stroke="rgb(139, 92, 246)" strokeWidth="2" />
          <line className="line2" x1="0%" y1="25%" x2="100%" y2="25%" stroke="rgb(96, 165, 250)" strokeWidth="2" />
          <line className="line1" x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgb(139, 92, 246)" strokeWidth="2" />
          <line className="line3" x1="0%" y1="75%" x2="100%" y2="75%" stroke="rgb(34, 197, 94)" strokeWidth="2" />
        </svg>

        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-96">
        <style>{`
          @keyframes slideInDown {
            from {
              opacity: 0;
              transform: translateY(-30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .login-card {
            animation: slideInDown 0.8s ease-out;
            backdrop-filter: blur(20px);
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(148, 163, 184, 0.2);
          }
          .input-field {
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid rgba(148, 163, 184, 0.2);
            transition: all 0.3s ease;
          }
          .input-field:focus {
            background: rgba(30, 41, 59, 0.8);
            border-color: rgb(96, 165, 250);
            box-shadow: 0 0 20px rgba(96, 165, 250, 0.2);
          }
          .tab-button {
            position: relative;
            transition: all 0.3s ease;
          }
          .tab-button::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 0;
            height: 2px;
            background: linear-gradient(90deg, rgb(96, 165, 250), rgb(59, 130, 246));
            transition: width 0.3s ease;
          }
          .tab-button.active::after {
            width: 100%;
          }
        `}</style>

        <div className="login-card p-8 rounded-2xl">
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Chatbot Personnel
          </h1>
          <p className="text-center text-sm text-slate-400 mb-8">Connectez-vous pour continuer</p>

          <div className="flex gap-4 mb-8 border-b border-slate-700">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-3 tab-button text-sm font-semibold transition-colors ${
                mode === "login" ? "text-blue-400 active" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Se connecter
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-3 tab-button text-sm font-semibold transition-colors ${
                mode === "register" ? "text-blue-400 active" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Créer un compte
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Pseudo</label>
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                placeholder="Votre identifiant"
                className="input-field w-full px-4 py-3 rounded-lg text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Code PIN</label>
              <input
                type="number"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                placeholder="4-6 chiffres"
                maxLength={6}
                className="input-field w-full px-4 py-3 rounded-lg text-white outline-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/50"
          >
            {mode === "login" ? "Se connecter" : "Créer un compte"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string>("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; convId: string } | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [criticalLevel, setCriticalLevel] = useState(50);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showLanding, setShowLanding] = useState(true);
  const [loginMode, setLoginMode] = useState<"login" | "register">("login");
  const [loginPseudo, setLoginPseudo] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Restaurer la session depuis sessionStorage
    const stored = sessionStorage.getItem("currentUser");
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    // Charger les conversations et historique si connecté
    if (currentUser) {
      loadConversations();
      loadHistory();
    }
  }, [currentUser]);

  const loadHistory = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/history?user_id=${currentUser.id}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: loginPseudo, pin: loginPin }),
      });
      if (!res.ok) {
        const err = await res.json();
        setLoginError(err.detail || "Erreur de connexion");
        return;
      }
      const data = await res.json();
      const user: User = { id: data.user_id, pseudo: data.pseudo };
      setCurrentUser(user);
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      setLoginPseudo("");
      setLoginPin("");
    } catch (err) {
      setLoginError("Erreur serveur");
    }
  };

  const handleRegister = async () => {
    setLoginError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: loginPseudo, pin: loginPin }),
      });
      if (!res.ok) {
        const err = await res.json();
        setLoginError(err.detail || "Erreur d'inscription");
        return;
      }
      const data = await res.json();
      const user: User = { id: data.user_id, pseudo: data.pseudo };
      setCurrentUser(user);
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      setLoginPseudo("");
      setLoginPin("");
    } catch (err) {
      setLoginError("Erreur serveur");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("currentUser");
    setMessages([]);
    setConversations([]);
    setCurrentConvId("");
  };

  useEffect(() => {
    // Annuler la requête en cours si on change de conversation
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
    if (currentConvId) loadMessages();
  }, [currentConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/conversations?user_id=${currentUser.id}`);
      const data = await res.json();
      setConversations(data.conversations);
      if (data.conversations.length === 0) {
        const newId = await createNewConversation("Nouvelle conversation");
        setCurrentConvId(newId);
      } else {
        setCurrentConvId(data.conversations[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/conversations/${currentConvId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const createNewConversation = async (title: string): Promise<string> => {
    if (!currentUser) return "";
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, user_id: currentUser.id }),
      });
      const data = await res.json();
      await loadConversations();
      return data.conversation_id;
    } catch (err) {
      return "";
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Si en cours, annuler la requête actuelle
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      abortControllerRef.current = null;
    }

    const userMessage = input;
    const convIdAtSend = currentConvId;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, conversation_id: convIdAtSend, user_id: currentUser?.id }),
        signal: abortControllerRef.current.signal,
      });
      const data: ChatResponse = await res.json();
      // Vérifier que l'utilisateur n'a pas changé de conversation
      if (currentConvId === convIdAtSend) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      }
      if (data.conversation_id) {
        setCurrentConvId(data.conversation_id);
        await loadConversations();
      }
      // Mettre à jour l'historique
      await loadHistory();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Requête annulée");
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const deleteConversation = async (convId: string) => {
    try {
      await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      await loadConversations();
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  const renameConversation = async (convId: string, newTitle: string) => {
    try {
      await fetch(`/api/conversations/${convId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      await loadConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const updateSettings = async () => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ critical_level: criticalLevel }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllHistory = async () => {
    if (!currentUser) return;
    if (!window.confirm("⚠️ Supprimer TOUT l'historique? Cette action est irréversible.")) return;

    try {
      await fetch(`/api/history/clear-all?user_id=${currentUser.id}`, { method: "DELETE" });
      loadHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteHistoryEntry = async (conversationId: string, timestamp: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/history/delete?conversation_id=${conversationId}&timestamp=${encodeURIComponent(timestamp)}`, { method: "DELETE" });
      loadHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const createFolder = async () => {
    if (!currentUser || !newFolderName.trim()) return;
    const folderId = `folder-${Date.now()}`;
    const newFolder: Folder = { id: folderId, name: newFolderName, user_id: currentUser.id };
    setFolders([...folders, newFolder]);
    setNewFolderName("");
    setShowNewFolderInput(false);
  };

  const deleteFolder = async (folderId: string) => {
    setFolders(folders.filter((f) => f.id !== folderId));
    // Enlever le dossier des conversations dans ce dossier
    setConversations(conversations.map((c) => c.folder === folderId ? { ...c, folder: undefined } : c));
  };

  const moveConversationToFolder = (convId: string, folderId: string | null) => {
    setConversations(conversations.map((c) => c.id === convId ? { ...c, folder: folderId || undefined } : c));
  };

  if (showLanding && !currentUser) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  if (!currentUser) {
    return (
      <LoginScreen
        mode={loginMode}
        setMode={setLoginMode}
        pseudo={loginPseudo}
        setPseudo={setLoginPseudo}
        pin={loginPin}
        setPin={setLoginPin}
        error={loginError}
        onSubmit={loginMode === "login" ? handleLogin : handleRegister}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-1/6" : "w-0"
        } transition-all duration-300 border-r border-slate-700 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-slate-700 space-y-2">
          <button
            onClick={() => createNewConversation("Nouvelle conversation")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
          >
            + Nouveau
          </button>
          <button
            onClick={() => setShowNewFolderInput(!showNewFolderInput)}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm font-semibold"
          >
            📁 Dossier
          </button>
          {showNewFolderInput && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nom du dossier..."
                className="flex-1 px-2 py-1 rounded text-xs bg-slate-700 text-white"
              />
              <button
                onClick={createFolder}
                className="px-2 py-1 rounded text-xs bg-green-600 hover:bg-green-700 text-white"
              >
                ✓
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1" onClick={() => setContextMenu(null)}>
          {/* Afficher les dossiers */}
          {folders.map((folder) => {
            const convsInFolder = conversations.filter((c) => c.folder === folder.id);
            return (
              <div key={folder.id}>
                <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-300 hover:text-slate-100">
                  <span>📁 {folder.name} ({convsInFolder.length})</span>
                  <button
                    onClick={() => deleteFolder(folder.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="ml-2 space-y-1">
                  {convsInFolder.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setCurrentConvId(conv.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, convId: conv.id });
                      }}
                      className={`p-2 rounded cursor-pointer text-sm ${
                        currentConvId === conv.id ? "bg-blue-600 text-white" : "bg-slate-700 hover:bg-slate-600"
                      }`}
                    >
                      {editingConvId === conv.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => {
                            if (editingTitle.trim()) {
                              renameConversation(conv.id, editingTitle);
                            }
                            setEditingConvId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editingTitle.trim()) {
                                renameConversation(conv.id, editingTitle);
                              }
                              setEditingConvId(null);
                            }
                          }}
                          autoFocus
                          className="w-full bg-slate-600 text-white px-1 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className="font-medium truncate">{conv.title}</div>
                          <div className="text-xs opacity-60">{new Date(conv.created_at).toLocaleDateString()}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Conversations sans dossier */}
          {conversations.filter((c) => !c.folder).length > 0 && (
            <div>
              <div className="px-2 py-1 text-xs font-semibold text-slate-300">📄 Sans dossier</div>
              <div className="space-y-1">
                {conversations.filter((c) => !c.folder).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setCurrentConvId(conv.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, convId: conv.id });
                    }}
                    className={`p-2 rounded cursor-pointer text-sm ${
                      currentConvId === conv.id ? "bg-blue-600 text-white" : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  >
                    {editingConvId === conv.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => {
                          if (editingTitle.trim()) {
                            renameConversation(conv.id, editingTitle);
                          }
                          setEditingConvId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (editingTitle.trim()) {
                              renameConversation(conv.id, editingTitle);
                            }
                            setEditingConvId(null);
                          }
                        }}
                        autoFocus
                        className="w-full bg-slate-600 text-white px-1 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div className="font-medium truncate">{conv.title}</div>
                        <div className="text-xs opacity-60">{new Date(conv.created_at).toLocaleDateString()}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {contextMenu && (
          <div
            className="fixed bg-slate-700 rounded-lg shadow-lg z-50 border border-slate-600"
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            onClick={() => setContextMenu(null)}
          >
            <button
              onClick={() => {
                setEditingConvId(contextMenu.convId);
                setEditingTitle(conversations.find((c) => c.id === contextMenu.convId)?.title || "");
                setContextMenu(null);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-slate-600 text-sm text-slate-100"
            >
              ✏️ Renommer
            </button>
            {/* Sous-menu déplacer vers dossier */}
            <div className="border-t border-slate-600">
              <div className="px-4 py-2 text-xs font-semibold text-slate-300">📁 Déplacer vers:</div>
              <button
                onClick={() => {
                  moveConversationToFolder(contextMenu.convId, null);
                  setContextMenu(null);
                }}
                className="block w-full text-left px-6 py-1 hover:bg-slate-600 text-xs text-slate-200"
              >
                Aucun dossier
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    moveConversationToFolder(contextMenu.convId, folder.id);
                    setContextMenu(null);
                  }}
                  className="block w-full text-left px-6 py-1 hover:bg-slate-600 text-xs text-slate-200"
                >
                  {folder.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                deleteConversation(contextMenu.convId);
                setContextMenu(null);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-red-900 text-sm text-red-300 border-t border-slate-600"
            >
              🗑️ Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-700 px-6 py-4 flex justify-between items-center">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-700 rounded-lg">
            ☰
          </button>
          <h1 className="text-2xl font-bold">Chatbot Personnel</h1>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setTab("chat")}
              className={`px-3 py-2 rounded ${tab === "chat" ? "bg-blue-600 text-white" : "bg-slate-700"}`}
            >
              💬
            </button>
            <button
              onClick={() => setTab("settings")}
              className={`px-3 py-2 rounded ${tab === "settings" ? "bg-blue-600 text-white" : "bg-slate-700"}`}
            >
              ⚙️
            </button>
            <button
              onClick={() => setTab("history")}
              className={`px-3 py-2 rounded ${tab === "history" ? "bg-blue-600 text-white" : "bg-slate-700"}`}
            >
              📊
            </button>
            <div className="border-l border-slate-600 mx-2 h-6" />
            <span className="text-sm opacity-60">{currentUser?.pseudo}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded bg-red-600/20 hover:bg-red-600/40 text-red-300 text-sm"
            >
              ⬡ Déconnexion
            </button>
          </div>
        </div>

        {/* Content */}
        {tab === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="text-6xl">💬</div>
                    <p className="text-lg font-medium">Commencez une conversation</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const parsed = parseResponse(msg.content);
                    return (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-4xl px-6 py-5 rounded-2xl ${
                            msg.role === "user"
                              ? "message-user"
                              : "message-assistant"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <div className="response-content space-y-4">
                              {parsed.role && <div className="response-role">{parsed.role}</div>}
                              {parsed.title && <div className="response-main-title">{parsed.title}</div>}
                              <div className="space-y-1">{parsed.body}</div>
                              {parsed.summary && (
                                <div className="response-summary">{parsed.summary.replace("(RÉSUMÉ 10 SEC: ", "").replace(")", "")}</div>
                              )}
                              {parsed.questions.length > 0 && (
                                <div className="response-questions">
                                  <div className="response-questions-title">Questions pour affiner</div>
                                  <div className="space-y-0">
                                    {parsed.questions.map((q, i) => (
                                      <div key={i} className="response-question-item">
                                        {q}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {parsed.certainty && (
                                <div className="response-certainty">Certitude globale: <span className="ml-2">{parsed.certainty}</span></div>
                              )}
                            </div>
                          ) : (
                            <p className="text-base leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="message-assistant px-6 py-4">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-slate-400 rounded-full pulse-dot" />
                          <div className="w-2 h-2 bg-slate-400 rounded-full pulse-dot" style={{ animationDelay: "0.2s" }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full pulse-dot" style={{ animationDelay: "0.4s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="border-t border-slate-700 bg-slate-900/50 px-6 py-4">
              <form onSubmit={sendMessage} className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Votre question..."
                  className="flex-1 px-5 py-3 rounded-xl chat-input"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-8 py-3 rounded-xl chat-button font-semibold"
                >
                  Envoyer
                </button>
                {loading && (
                  <button
                    type="button"
                    onClick={() => {
                      if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                        setLoading(false);
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    ⏹️ Annuler
                  </button>
                )}
              </form>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setInput("plus")} disabled={loading} className="quick-command-btn">
                  ➕ plus
                </button>
                <button onClick={() => setInput("moins")} disabled={loading} className="quick-command-btn">
                  ➖ moins
                </button>
                <button onClick={() => setInput("sois critique")} disabled={loading} className="quick-command-btn">
                  ⚡ sois critique
                </button>
                <button onClick={() => setInput("help")} disabled={loading} className="quick-command-btn">
                  ❓ help
                </button>
                <button onClick={() => setInput("erase")} disabled={loading} className="quick-command-btn erase">
                  🗑️ erase
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "settings" && (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-6">⚙️ Paramètres</h2>
            <div className="max-w-md space-y-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <label className="block text-sm font-semibold mb-2">Thème</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTheme("dark");
                      updateSettings();
                    }}
                    className={`flex-1 py-2 rounded ${theme === "dark" ? "bg-blue-600" : "bg-slate-700"}`}
                  >
                    🌙 Dark
                  </button>
                  <button
                    onClick={() => {
                      setTheme("light");
                      updateSettings();
                    }}
                    className={`flex-1 py-2 rounded ${theme === "light" ? "bg-blue-600" : "bg-slate-700"}`}
                  >
                    ☀️ Light
                  </button>
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <label className="block text-sm font-semibold mb-2">Niveau critique: {criticalLevel}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={criticalLevel}
                  onChange={(e) => {
                    setCriticalLevel(parseInt(e.target.value));
                    updateSettings();
                  }}
                  className="w-full"
                />
                <p className="text-xs mt-2 opacity-60">0 = Bienveillant | 50 = Neutre | 100 = Critique</p>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memoryEnabled}
                    onChange={(e) => {
                      setMemoryEnabled(e.target.checked);
                      updateSettings();
                    }}
                  />
                  <span className="text-sm font-semibold">Gestion de la mémoire</span>
                </label>
                <p className="text-xs mt-2 opacity-60">L'IA retiendra les infos importantes</p>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg border border-red-900/30">
                <label className="block text-sm font-semibold text-red-400 mb-3">🗑️ Suppression des données</label>
                <p className="text-xs opacity-60 mb-3">Attention : ces actions sont irréversibles</p>
                <button
                  onClick={clearAllHistory}
                  className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-300 px-3 py-2 rounded text-sm font-semibold"
                >
                  Supprimer tout l'historique
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-6">📊 Historique de {currentUser?.pseudo}</h2>
            {history && history.length > 0 ? (
              <div className="max-w-4xl space-y-4">
                {history.map((entry, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div
                      className={`w-2 h-fit rounded-full flex-shrink-0 ${
                        entry.role === "user" ? "bg-blue-500" : "bg-slate-500"
                      }`}
                    />
                    <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-sm">
                          {entry.role === "user" ? "👤 Vous" : "🤖 Assistant"}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs opacity-50">
                            {new Date(entry.timestamp).toLocaleString("fr-FR")}
                          </div>
                          <button
                            onClick={() => deleteHistoryEntry(entry.conversation_id, entry.timestamp)}
                            className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-opacity"
                            title="Supprimer cette entrée"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-200 text-sm line-clamp-3">{entry.content}</p>
                      <div className="text-xs opacity-60 mt-2">📁 {entry.conversation_title}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-12">
                <div className="text-4xl mb-4">📭</div>
                <p>Aucun historique pour le moment</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Ceci est le VISAGE de ton projet (le frontend).
// C'est ce que la personne qui utilise ton site voit et avec quoi elle
// interagit (boutons, textes, images...). Le frontend appelle le backend
// quand il a besoin de "réfléchir" à quelque chose.

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-800">Mon Projet 🚀</h1>
        <p className="text-gray-500">
          {/* TODO: remplace ce texte et construis ton interface ici */}
          Modifie ce fichier (src/App.tsx) pour commencer à coder.
        </p>

        {/*
          TODO: exemple d'idée pour appeler ton backend plus tard :

          const res = await fetch("/api/example", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Salut !" }),
          });
          const data = await res.json();
        */}
      </div>
    </div>
  );
}

export default App;

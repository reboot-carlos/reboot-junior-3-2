import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuration de Vite : l'outil qui fait tourner ton frontend en
// développement (rechargement instantané) et qui le "build" pour la prod.
// Tu n'as normalement pas besoin d'y toucher au niveau 1.
export default defineConfig({
  plugins: [react()],
  server: {
    // En dev, les appels à /api/... sont redirigés vers le backend local.
    // En prod, c'est nginx qui fait ce travail (voir nginx.conf.template).
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});

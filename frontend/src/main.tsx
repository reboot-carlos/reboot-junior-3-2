import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Point de départ du frontend : on affiche le composant <App /> dans
// la balise <div id="root"> définie dans index.html.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

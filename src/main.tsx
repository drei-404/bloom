import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { loadBloomContent } from "./content/bootstrap";

// Register all content packs (species, assets, affinities) before the app runs.
loadBloomContent();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

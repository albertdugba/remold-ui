import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./agent/bridge";
import { App } from "./app";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

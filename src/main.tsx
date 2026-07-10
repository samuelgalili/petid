import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorReporter } from "./lib/errorReporter";

initGlobalErrorReporter();

// Remove private API responses cached by older service-worker versions.
if ("caches" in window) {
  window.caches.keys()
    .then((keys) => Promise.all(
      keys
        .filter((key) => key === "api-cache" || /^mipo-v\d+$/.test(key))
        .map((key) => window.caches.delete(key)),
    ))
    .catch(() => undefined);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

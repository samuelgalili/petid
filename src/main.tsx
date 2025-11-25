import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <AccessibilityProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AccessibilityProvider>
  </ThemeProvider>
);

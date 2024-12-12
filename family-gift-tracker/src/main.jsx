// In main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const root = createRoot(document.getElementById("root"));

// Add error boundary
root.render(
  <StrictMode>
    <div className="w-full h-full overflow-x-hidden">
      <App />
    </div>
  </StrictMode>
);

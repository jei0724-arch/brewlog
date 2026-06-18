/* ============================================================
   BREWLOG NOTE — src/main.jsx
   Vite 진입점 — 기존 파일이 있으면 이 파일은 교체 불필요
   ============================================================ */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/work-sans";
import "@fontsource/young-serif";
import "@fontsource/martian-mono";
import "./styles/theme.css";
import "./styles/global.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

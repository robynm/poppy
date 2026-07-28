import "./styles.css";
import "./lib/log.js";
import { createRoot } from "react-dom/client";
import { ClosetApp } from "./App.jsx";

createRoot(document.getElementById("root")).render(<ClosetApp />);

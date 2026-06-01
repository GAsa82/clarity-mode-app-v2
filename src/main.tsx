import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force dark mode by default for the Clarity Mode aesthetic
document.documentElement.classList.add("dark");

// Import background image so Vite resolves its URL correctly and expose as CSS variable
import siteBackground from "./assets/mob_psycho_wallpaper_pc_-_energy__motion.jpeg";
document.documentElement.style.setProperty("--bg-image-url", `url(${siteBackground})`);

createRoot(document.getElementById("root")!).render(<App />);

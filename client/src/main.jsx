// client/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import StartScene from "./StartScene";
import LoginScene from "./LoginScene";
import RoleSelectScene from "./RoleSelectScene";
import CityScene from "./CityScene";
import HubScene from "./HubScene.js";
import TrainingScene from "./TrainingScene.js";

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#1f7a1f",
  scene: [StartScene, LoginScene, RoleSelectScene, TrainingScene, CityScene, HubScene],
  fps: {
    target: 144,
    forceSetTimeOut: true,
  },
  physics: {
    default: "arcade",
    arcade: { fps: 144 },
  },
};

// ✅ Create Phaser only once and store globally
if (!window.phaserGame) {
  window.phaserGame = new Phaser.Game(config);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// client/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import StartScene from "./StartScene";
import LoginScene from "./LoginScene";
import RoleSelectScene from "./RoleSelectScene";
import HubScene from "./HubScene.js";
import TrainingScene from "./TrainingScene.js";
import ProfileScene from "./ProfileScene.js";
import TrainingProgressScene from "./TrainingProgressScene.js";
import KickScene from "./KickScene";

const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  backgroundColor: "#1f7a1f",
  scene: [StartScene, LoginScene, RoleSelectScene, TrainingScene,  HubScene, ProfileScene, TrainingProgressScene, KickScene],
  scale: {
    mode: Phaser.Scale.FIT,          // scale game to fit screen
    autoCenter: Phaser.Scale.CENTER_BOTH, // center the canvas
  },
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

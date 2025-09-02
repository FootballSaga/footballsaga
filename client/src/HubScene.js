// client/src/HubScene.js
import Phaser from "phaser";

const API = "http://localhost:4000";

export default class HubScene extends Phaser.Scene {
  constructor() {
    super("HubScene");
    this.player = null;
    this.statsText = null;
  }

  preload() {
    this.load.image("stadium", "/assets/stadium.png");

    // same characters you already use
    this.load.image("goalkeeper", "/characters/goalkeeper.png");
    this.load.image("defender", "/characters/defender.png");
    this.load.image("midfielder", "/characters/midfielder.png");
    this.load.image("attacker", "/characters/attacker.png");
  }

  async create() {
    const { width, height } = this.scale;

    // Stadium background
    this.add.image(width / 2, height / 2, "stadium")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // 🧍 Show the chosen role
    const role = this.registry.get("playerRole") || "defender"; // fallback
    this.add.image(width - 550, height * 0.9, role)
      .setOrigin(0.5, 1)
      .setScale(0.4);

    // 🔄 Fetch player from backend to get level/xp/dollars
    const playerId = this.registry.get("playerId");
    try {
      const res = await fetch(`${API}/players`);
      const players = await res.json();
      this.player = players.find(p => p.id === playerId);

      if (this.player) {
        // 📊 Stats HUD (top-left corner)
        this.statsText = this.add.text(500, 20,
          `Level: ${this.player.level}\nXP: ${this.player.xp}\nDollars: ${this.player.dollars}`,
          {
            fontFamily: '"Luckiest Guy", sans-serif',
            fontSize: "28px",
            color: "#ffffff",
            backgroundColor: "#00000088",
            padding: { x: 10, y: 6 },
          }
        ).setOrigin(0, 0);
      }
    } catch (err) {
      console.error("Failed to load player:", err);
    }

    // Back button
    const backBtn = this.add.text(80, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on("pointerdown", () => {
      this.scene.start("LoginScene");
    });

    // 🏋️ TRAINING button
    const trainingBtn = this.add.text(width / 2 , height * 0.10, "TRAINING", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "42px",
      color: "#ffffff",
      backgroundColor: "#0c2f0c",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    trainingBtn.on("pointerover", () => trainingBtn.setStyle({ color: "#ffcc00" }));
    trainingBtn.on("pointerout", () => trainingBtn.setStyle({ color: "#ffffff" }));

    trainingBtn.on("pointerdown", () => {
      this.scene.start("TrainingScene");
    });
  }
}
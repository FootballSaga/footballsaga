// client/src/HubScene.js
import Phaser from "phaser";

const API = "http://localhost:4000";

export default class HubScene extends Phaser.Scene {
  constructor() {
    super("HubScene");
    this.player = null;
    this.statsText = null;
    this.playerId = null;
    this.trainingBtn = null;
    this.blinkingTween = null;
  }

  preload() {
    this.load.image("lockerroom", "/assets/lockerroom.png");

    this.load.image("goalkeeper", "/characters/goalkeeper.png");
    this.load.image("defender", "/characters/defender.png");
    this.load.image("midfielder", "/characters/midfielder.png");
    this.load.image("attacker", "/characters/attacker.png");
  }

  async create() {
    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "lockerroom")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // Player ID
    this.playerId = this.registry.get("playerId");

    // HUD will be updated later
    this.statsText = this.add.text(500, 20, "Loading player...", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "28px",
      color: "#ffffff",
      backgroundColor: "#0c2f0c",
      padding: { x: 10, y: 6 },
    }).setOrigin(0, 0);

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

    // Training button
    this.trainingBtn = this.add.text(width / 2, height * 0.10, "TRAINING", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "42px",
      color: "#ffffff",
      backgroundColor: "#0c2f0c",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.trainingBtn.on("pointerover", () => this.trainingBtn.setStyle({ color: "#ffcc00" }));
    this.trainingBtn.on("pointerout", () => this.trainingBtn.setStyle({ color: "#ffffff" }));

    this.trainingBtn.on("pointerdown", () => {
      if (!this.player) return;

      const { last_training, training_end } = this.player;
      const now = new Date();

      if (!last_training) {
        this.scene.start("TrainingScene");
      } else if (new Date(training_end) > now) {
        this.scene.start(this.getTrainingScene(last_training), { autoClaim: false });
      } else {
        this.scene.start(this.getTrainingScene(last_training), { autoClaim: true });
      }
    });

    // 🔄 Poll player state every 5 seconds
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.refreshPlayer(),
    });

    // Initial fetch
    this.refreshPlayer();
  }

  async refreshPlayer() {
    if (!this.playerId) return;

    try {
      const res = await fetch(`${API}/players/${this.playerId}`);
      const updated = await res.json();
      this.player = updated;

      // Update HUD
      this.statsText.setText(
        `Level ${updated.level} (XP: ${updated.xp})\nDollars: ${updated.dollars}`
      );



      // Blink logic
      const now = new Date();
      if (updated.last_training && updated.training_end && new Date(updated.training_end) <= now) {
        this.startBlinking();
      } else {
        this.stopBlinking();
      }
    } catch (err) {
      console.error("Failed to refresh player:", err);
    }
  }

  startBlinking() {
    if (this.blinkingTween) return; // already blinking
    this.blinkingTween = this.tweens.add({
      targets: this.trainingBtn,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  stopBlinking() {
    if (this.blinkingTween) {
      this.blinkingTween.stop();
      this.trainingBtn.setAlpha(1);
      this.blinkingTween = null;
    }
  }

  getTrainingScene(type) {
    switch (type) {
      case "gym": return "GymScene";
      case "running": return "RunningScene";
      case "ball": return "BallScene";
      default: return "TrainingScene";
    }
  }
}

// client/src/HubScene.js
import Phaser from "phaser";

const API = "http://localhost:4000";

export default class HubScene extends Phaser.Scene {
  constructor() {
    super("HubScene");
    this.player = null;
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

    // ✅ preload new icons
    this.load.image("xp_icon", "/icons/xp.png");
    this.load.image("dollar_icon", "/icons/dollars.png");
    this.load.image("whistle_icon", "/icons/whistle.png");
  }

  async create() {
    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "lockerroom")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    this.playerId = this.registry.get("playerId");

    // 📊 HUD panel background
    this.statsBox = this.add.rectangle(300, 50, 200, 200, 0x0c2f0c, 0.95)
      .setStrokeStyle(4, 0xffffff)
      .setOrigin(0, 0);

    // ✅ Level text (top row)
    this.levelText = this.add.text(350, 55, "Level 1", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
    }).setOrigin(0, 0);

        // ✅ XP row (icon + number, right of level)
    this.add.image(310, 110, "xp_icon")
      .setDisplaySize(64, 64)
      .setOrigin(0, 0.5);
    this.textures.get("xp_icon").setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.xpText = this.add.text(380, 105, "0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "22px",
      color: "#ffffff",
    }).setOrigin(0, 0.5);

    // ✅ Dollars row
    this.add.image(310, 165, "dollar_icon")
      .setDisplaySize(64, 64)
      .setOrigin(0, 0.5);
    this.textures.get("dollar_icon").setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.dollarsText = this.add.text(380, 160, "0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "22px",
      color: "#ffffff",
    }).setOrigin(0, 0.5);

    // ✅ Whistles row
    this.add.image(310, 220, "whistle_icon")
      .setDisplaySize(64, 64)
      .setOrigin(0, 0.5);
    this.textures.get("whistle_icon").setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.whistleText = this.add.text(380, 215, "0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "22px",
      color: "#ffffff",
    }).setOrigin(0, 0.5);


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

    // 🔄 Poll player every second
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.refreshPlayer(),
    });

    this.refreshPlayer();
  }

  async refreshPlayer() {
    if (!this.playerId) return;

    try {
      const res = await fetch(`${API}/players/${this.playerId}`);
      const updated = await res.json();
      this.player = updated;

      this.levelText.setText(`Level ${updated.level}`);
      this.xpText.setText(`${updated.xp}`);
      this.dollarsText.setText(`${updated.dollars}`);
      this.whistleText.setText(`${updated.whistles || 0}`);

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
    if (this.blinkingTween) return;
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

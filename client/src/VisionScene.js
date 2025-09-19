// client/src/VisionScene.js
import axios from "axios";
const API = "http://localhost:4000";
const TRAINING_DURATION = 60 * 1000; 

export default class VisionScene extends Phaser.Scene {
  constructor() {
    super("VisionScene");
    this.playerId = null;
    this.trainingEnd = null;
    this.trainingStart = null;
    this.progressFill = null;
    this.countdownText = null;
    this.readyToClaim = false;
    this.justClaimed = false;
  }

  preload() {
    this.load.image("vision_bg", "/assets/vision_scene.png");
    this.load.image("xp_icon", "/icons/xp.png");
    this.load.image("dollar_icon", "/icons/dollars.png");
    this.load.image("vision_icon", "/icons/vision_icon_64.png");
  }

  async create() {
    this.playerId = this.registry.get("playerId");
    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "vision_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    this.add.text(width / 2, 100, "VISION TRAINING", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "48px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // Progress bar
    this.progressBar = this.add.rectangle(width / 2, height / 2, 600, 40, 0xffffff, 0.3);
    this.progressFill = this.add.rectangle(width / 2 - 300, height / 2, 0, 40, 0x00ff00)
      .setOrigin(0, 0.5);

    this.countdownText = this.add.text(width / 2, height / 2 + 60, "", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "28px",
      color: "#ffcc00",
    }).setOrigin(0.5);

    await this.loadTrainingState();

    const backBtn = this.add.text(80, 40, "← Back", {
      fontSize: "32px",
      fontFamily: '"Luckiest Guy", sans-serif',
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive();

    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#ffcc00" }));
    backBtn.on("pointerout", () => backBtn.setStyle({ color: "#ffffff" }));
    backBtn.on("pointerdown", () => {
      this.scene.start("HubScene");
    });
  }

  async loadTrainingState() {
    try {
      const res = await axios.get(`${API}/players/${this.playerId}`);
      const player = res.data;
      this.readyToClaim = false;

      if (player.training_end) {
        const endTime = new Date(player.training_end);
        if (endTime > new Date()) {
          this.trainingEnd = endTime;
          this.trainingStart = new Date(this.trainingEnd - TRAINING_DURATION);
        } else {
          this.justClaimed = true;
          await this.finishAndShowRewards();
        }
      } else if (!this.justClaimed) {
        const startRes = await axios.post(`${API}/players/${this.playerId}/start-training`, { type: "midfielder_special" });
        this.trainingEnd = new Date(startRes.data.endTime);
        this.trainingStart = new Date(this.trainingEnd - TRAINING_DURATION);
      }
    } catch (err) {
      console.error("Error loading training:", err);
      this.countdownText.setText("⚠️ Error loading training");
    }
  }

  async finishAndShowRewards() {
    const updatedPlayer = await this.finishTraining();
    if (updatedPlayer) this.showRewardPopup(updatedPlayer);
  }

  async finishTraining() {
    try {
      const res = await axios.post(`${API}/players/${this.playerId}/finish-training`);
      return res.data;
    } catch (err) {
      console.error("Error finishing training:", err);
      return null;
    }
  }

  showRewardPopup(player) {
    const { width, height } = this.scale;

    this.progressBar.setVisible(false);
    this.progressFill.setVisible(false);
    this.countdownText.setVisible(false);

    // ✅ Independent positions for each icon/text
    const positions = {
      xpIcon: { x: width / 2 - 60, y: height / 2 - 70 },
      xpText: { x: width / 2 + 20, y: height / 2 - 72 },

      dollarIcon: { x: width / 2 - 60, y: height / 2 - 10 },
      dollarText: { x: width / 2 + 20, y: height / 2 - 12 },

      statIcon: { x: width / 2 - 60, y: height / 2 + 50 },
      statText: { x: width / 2 + 20, y: height / 2 + 48 },
    };

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(100);
    const box = this.add.rectangle(width / 2, height / 2, 400, 350, 0x0c2f0c, 0.95)
      .setStrokeStyle(4, 0xffffff)
      .setDepth(101);

    this.add.text(width / 2, height / 2 - 140, "TRAINING COMPLETE!", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "36px",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(102);

    // XP reward
    if (player.lastXpGain > 0) {
      this.add.image(positions.xpIcon.x, positions.xpIcon.y, "xp_icon").setDisplaySize(64, 64).setOrigin(0.5).setDepth(102);
      this.add.text(positions.xpText.x, positions.xpText.y, `+${player.lastXpGain}`, {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "28px",
        color: "#ffffff",
      }).setOrigin(0, 0.5).setDepth(102);
    }

    // Dollar reward
    if (player.lastDollarGain > 0) {
      this.add.image(positions.dollarIcon.x, positions.dollarIcon.y, "dollar_icon").setDisplaySize(64, 64).setOrigin(0.5).setDepth(102);
      this.add.text(positions.dollarText.x, positions.dollarText.y, `+${player.lastDollarGain}`, {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "28px",
        color: "#ffffff",
      }).setOrigin(0, 0.5).setDepth(102);
    }

    // Stat reward
    if (player.lastStatGain && player.lastStatGain.value > 0) {
      this.add.image(positions.statIcon.x, positions.statIcon.y, "vision_icon").setDisplaySize(64, 64).setOrigin(0.5).setDepth(102);
      this.add.text(positions.statText.x, positions.statText.y, `+${player.lastStatGain.value}`, {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "28px",
        color: "#ffffff",
      }).setOrigin(0, 0.5).setDepth(102);
    }

    const closeBtn = this.add.text(width / 2, height / 2 + 125, "CLAIM", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      backgroundColor: "#7a1f1f",
      padding: { x: 20, y: 10 },
      color: "#ffffff",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(103);

    closeBtn.on("pointerover", () => closeBtn.setStyle({ color: "#ffcc00" }));
    closeBtn.on("pointerout", () => closeBtn.setStyle({ color: "#ffffff" }));
    closeBtn.on("pointerdown", () => {
      overlay.destroy();
      box.destroy();
      closeBtn.destroy();
      this.scene.start("HubScene");
    });
  }

  update() {
    if (!this.trainingEnd || !this.trainingStart || this.readyToClaim) return;
    const total = this.trainingEnd - this.trainingStart;
    const remaining = this.trainingEnd - new Date();

    if (remaining <= 0) {
      this.progressFill.width = 600;
      this.countdownText.setText("✅ Training finished!");
      this.readyToClaim = true;
      this.finishAndShowRewards();
    } else {
      const progress = 1 - remaining / total;
      this.progressFill.width = 600 * progress;

      const seconds = Math.floor(remaining / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      this.countdownText.setText(`⏳ ${mins}:${secs.toString().padStart(2, "0")} left`);
    }
  }
}

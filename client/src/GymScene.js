// client/src/GymScene.js
import axios from "axios";
const API = "http://localhost:4000";
const TRAINING_DURATION = 30 * 1000; // 30s gym

export default class GymScene extends Phaser.Scene {
  constructor() {
    super("GymScene");
    this.playerId = null;
    this.trainingEnd = null;
    this.trainingStart = null;
    this.progressFill = null;
    this.countdownText = null;
    this.claimBtn = null;
    this.readyToClaim = false;
  }

  preload() {
    this.load.image("gym_bg", "/assets/gym_scene.png");
  }

  async create() {
    this.playerId = this.registry.get("playerId");
    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "gym_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    this.add.text(width / 2, 100, "🏋️ GYM TRAINING", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "48px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // Progress bar
    this.add.rectangle(width / 2, height / 2, 600, 40, 0xffffff, 0.3);
    this.progressFill = this.add.rectangle(width / 2 - 300, height / 2, 0, 40, 0x00ff00).setOrigin(0, 0.5);

    // Countdown
    this.countdownText = this.add.text(width / 2, height / 2 + 60, "", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "28px",
      color: "#ffcc00",
    }).setOrigin(0.5);

    // Load player state
    await this.loadTrainingState();

    // Back button
    const backBtn = this.add.text(80, 40, "← Back", {
      fontSize: "32px",
      fontFamily: '"Luckiest Guy", sans-serif',
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive();

    backBtn.on("pointerdown", async () => {
      if (this.readyToClaim) {
        await this.finishTraining();
      }
      this.scene.start("HubScene");
    });
  }

  async loadTrainingState() {
    try {
      const res = await axios.get(`${API}/players/${this.playerId}`);
      const player = res.data;

      // Reset claim state
      this.readyToClaim = false;
      if (this.claimBtn) {
        this.claimBtn.destroy();
        this.claimBtn = null;
      }

      if (player.training_end) {
        const endTime = new Date(player.training_end);

        if (endTime > new Date()) {
          // Training in progress
          this.trainingEnd = endTime;
          this.trainingStart = new Date(this.trainingEnd - TRAINING_DURATION);
        } else {
          // Training already finished
          this.showClaimRewards();
        }
      } else {
        // Start a new training
        const startRes = await axios.post(`${API}/players/${this.playerId}/start-training`, { type: "gym" });
        this.trainingEnd = new Date(startRes.data.endTime);
        this.trainingStart = new Date(this.trainingEnd - TRAINING_DURATION);
      }
    } catch (err) {
      this.countdownText.setText("⚠️ Error loading training");
    }
  }

  async finishTraining() {
    try {
      await axios.post(`${API}/players/${this.playerId}/finish-training`);
    } catch (err) {
      console.error("Error finishing training:", err);
    }
  }

  showClaimRewards() {
    if (this.claimBtn) return;
    const { width, height } = this.scale;

    this.readyToClaim = true;
    this.countdownText.setText("✅ Training finished!");

    this.claimBtn = this.add.text(width / 2, height / 2 + 120, "CLAIM REWARDS 🎁", {
      fontSize: "32px",
      fontFamily: '"Luckiest Guy", sans-serif',
      color: "#ffffff",
      backgroundColor: "#0c2f0c",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive();

    this.claimBtn.on("pointerdown", async () => {
      await this.finishTraining();
      this.scene.start("HubScene");
    });

    // Reset progress bar when finished
    this.progressFill.width = 600;
  }

  update() {
    if (!this.trainingEnd || !this.trainingStart || this.readyToClaim) return;

    const total = this.trainingEnd - this.trainingStart;
    const remaining = this.trainingEnd - new Date();

    if (remaining <= 0) {
      this.showClaimRewards();
      this.trainingEnd = null;
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

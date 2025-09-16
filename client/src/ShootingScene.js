import axios from "axios";
const API = "http://localhost:4000";
const TRAINING_DURATION = 30 * 1000; // 30s training duration

export default class ShootingScene extends Phaser.Scene {
  constructor() {
    super("ShootingScene");
    this.playerId = null;
    this.trainingEnd = null;
    this.trainingStart = null;
    this.progressFill = null;
    this.countdownText = null;
    this.claimBtn = null;
    this.readyToClaim = false;
  }

  preload() {
    this.load.image("shooting_bg", "/assets/shooting_scene.png");
  }

  async create() {
    this.playerId = this.registry.get("playerId");
    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "shooting_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // Title
    this.add.text(width / 2, 100, "🎯 SHOOTING TRAINING", {
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

    await this.loadTrainingState();

    // Back button
    const backBtn = this.add.text(80, 40, "← Back", {
      fontSize: "32px",
      fontFamily: '"Luckiest Guy", sans-serif',
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive();

    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#ffcc00" }));
    backBtn.on("pointerout", () => backBtn.setStyle({ color: "#ffffff" }));
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

      this.readyToClaim = false;
      this.claimBtn?.destroy();

      if (player.training_end) {
        const endTime = new Date(player.training_end);

        if (endTime > new Date()) {
          this.trainingEnd = endTime;
          this.trainingStart = new Date(this.trainingEnd - TRAINING_DURATION);
        } else {
          this.showClaimRewards();
        }
      } else {
        // Start new special training for attacker
        const startRes = await axios.post(`${API}/players/${this.playerId}/start-training`, { type: "attacker_special" });
        this.trainingEnd = new Date(startRes.data.endTime);
        this.trainingStart = new Date(this.trainingEnd - TRAINING_DURATION);
      }
    } catch (err) {
      console.error("Error loading training state:", err);
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

    this.claimBtn.on("pointerover", () => this.claimBtn.setStyle({ color: "#ffcc00" }));
    this.claimBtn.on("pointerout", () => this.claimBtn.setStyle({ color: "#ffffff" }));
    this.claimBtn.on("pointerdown", async () => {
      await this.finishTraining();
      this.scene.start("HubScene");
    });

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

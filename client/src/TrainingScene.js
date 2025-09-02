import axios from "axios";

const API = "http://localhost:4000";

export default class TrainingScene extends Phaser.Scene {
  constructor() {
    super("TrainingScene");
    this.playerId = null;
    this.trainingEnd = null;
    this.countdownText = null;
    this.collectBtn = null;
  }

  preload() {
    // 👇 Preload your background image
    this.load.image("training_bg", "/assets/training_ground.png"); 
    // ^ put your generated image into public/assets folder as training_ground.png
  }

  async create() {
    await document.fonts.ready;
    const chosen = this.registry.get("playerId");
    if (chosen) this.playerId = chosen;

    const { width, height } = this.scale;

    // 👇 Add background first so it's behind everything
    this.add.image(width / 2, height / 2, "training_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(-1);

    // Title
    this.add.text(width / 2, 30, "TRAINING GROUNDS", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "48px",
      color: "#ffffff",
    }).setOrigin(0.5, 0);

    // Countdown text
    this.countdownText = this.add.text(width / 2, 100, "", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "28px",
      color: "#ffcc00",
      align: "center",
    }).setOrigin(0.5, 0);

    // Training options
    const trainings = [
      { label: "GYM 🏋️", type: "gym", y: 200 },
      { label: "RUNNING 🏃", type: "running", y: 300 },
      { label: "BALL ⚽", type: "ball", y: 400 },
    ];

    trainings.forEach((t) => {
      const btn = this.add.text(width / 2, t.y, t.label, {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "32px",
        color: "#ffffff",
        backgroundColor: "#0c2f0c",
        padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => btn.setStyle({ color: "#ffcc00" }));
      btn.on("pointerout", () => btn.setStyle({ color: "#ffffff" }));
      btn.on("pointerdown", () => this.startTraining(t.type));
    });

    // Back button
    const backBtn = this.add.text(80, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive();

    backBtn.on("pointerdown", () => this.scene.start("HubScene"));
  }

  async startTraining(type) {
    try {
      const res = await axios.post(`${API}/players/${this.playerId}/start-training`, { type });
      this.trainingEnd = new Date(res.data.endTime);
      this.countdownText.setText(
        `⏳ Training ends in ${(this.trainingEnd - new Date()) / 1000}s`
      );
    } catch (e) {
      this.countdownText.setText("Error: " + (e.response?.data?.error || "could not start training"));
    }
  }

  showCollectButton() {
    if (this.collectBtn) return;
    const { width, height } = this.scale;

    this.collectBtn = this.add.text(width / 2, height / 2 + 150, "COLLECT REWARDS 🎁", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#0c2f0c",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.collectBtn.on("pointerover", () => this.collectBtn.setStyle({ color: "#ffcc00" }));
    this.collectBtn.on("pointerout", () => this.collectBtn.setStyle({ color: "#ffffff" }));
    this.collectBtn.on("pointerdown", async () => {
      try {
        const res = await axios.post(`${API}/players/${this.playerId}/finish-training`);
        this.countdownText.setText("✅ Rewards collected!");
        this.collectBtn.destroy();
        this.collectBtn = null;
      } catch (e) {
        this.countdownText.setText("Error finishing training.");
      }
    });
  }

  update() {
    if (!this.trainingEnd) return;

    const now = new Date();
    const diffMs = this.trainingEnd - now;

    if (diffMs <= 0) {
      this.countdownText.setText("✅ Training finished!");
      this.trainingEnd = null;
      this.showCollectButton();
      return;
    }

    const seconds = Math.floor(diffMs / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    this.countdownText.setText(
      `⏳ Training ends in ${mins}:${secs.toString().padStart(2, "0")}`
    );
  }
}

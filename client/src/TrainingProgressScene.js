// client/src/TrainingProgressScene.js
// Scene: Shows active training countdown, allows cancel, finishes and displays rewards.
import Phaser from "phaser";
const API = "http://localhost:4000"; // Backend base URL

export default class TrainingProgressScene extends Phaser.Scene {
  constructor() {
    super("TrainingProgressScene"); // Scene key

    this.playerId = null; // Active character id

    this.training = null;        // Active training payload { name, training_stat, duration, started_at, finished_at, ... }
    this.totalMs = 0;            // Total duration in ms
    this.remainingMs = 0;        // Remaining time in ms

    this.bgImage = null;         // Background image
    this.titleText = null;       // Title text
    this.timerText = null;       // Countdown text

    this.progressBar = null;     // Progress bar outline
    this.progressFill = null;    // Progress bar fill

    this.cancelBtn = null;       // Cancel button
    this.errorText = null;       // Error/status text

    this.timerEvent = null;      // Timer event for ticking
    this.lastUpdateTime = null;  // Timestamp for delta calculation
  }

  preload() {
    this.load.image("training_bg", "/assets/training_ground.png"); // Default background

    this.load.image("xp_icon", "/icons/xp.png");
    this.load.image("dollar_icon", "/icons/dollars.png");

    // Themed backgrounds per training
    this.load.image("ball_bg", "/assets/ball_scene.png");
    this.load.image("gym_bg", "/assets/gym_scene.png");
    this.load.image("running_bg", "/assets/running_scene.png");
    this.load.image("saving_bg", "/assets/saving_scene.png");
    this.load.image("shooting_bg", "/assets/shooting_scene.png");
    this.load.image("tackling_bg", "/assets/tackling_scene.png");
    this.load.image("vision_bg", "/assets/vision_scene.png");

    // Stat icons
    this.load.image("stamina_icon", "/icons/stamina_icon.png");
    this.load.image("strength_icon", "/icons/strength_icon.png");
    this.load.image("speed_icon", "/icons/speed_icon.png");
    this.load.image("saving_icon", "/icons/saving_icon_64.png");
    this.load.image("shooting_icon", "/icons/shooting_icon_64.png");
    this.load.image("tackling_icon", "/icons/tackle_icon_64.png");
    this.load.image("vision_icon", "/icons/vision_icon_64.png");
  }

  async create() {
    const { width, height } = this.scale; // Canvas size
    this.playerId = this.registry.get("characterId"); // Active character id

    // Background image (will be updated by theme)
    this.bgImage = this.add.image(width / 2, height / 2, "training_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // Title text (updated by theme)
    this.titleText = this.add.text(width / 2, 70, "TRAINING", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "54px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Progress bar shell and fill
    const barWidth = 600;
    const barHeight = 40;
    this.progressBar = this.add.rectangle(width / 2, height / 2, barWidth, barHeight, 0x000000, 0.4)
      .setStrokeStyle(3, 0xffffff)
      .setOrigin(0.5);

    this.progressFill = this.add.rectangle(width / 2 - barWidth / 2, height / 2, 0, barHeight, 0x00ff00)
      .setOrigin(0, 0.5);

    // Countdown text
    this.timerText = this.add.text(width / 2, height / 2 + 60, "Loading...", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffcc00",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Cancel training button
    this.cancelBtn = this.add.text(width / 2, height / 2 + 140, "CANCEL TRAINING", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "42px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 25, y: 14 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.cancelBtn.on("pointerover", () => this.cancelBtn.setStyle({ color: "#ffcc00" })); // Hover color
    this.cancelBtn.on("pointerout", () => this.cancelBtn.setStyle({ color: "#ffffff" })); // Reset color
    this.cancelBtn.on("pointerdown", () => this.cancelTraining()); // Cancel training

    // Error/status text
    this.errorText = this.add.text(width / 2, height / 2 - 120, "", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "28px",
      color: "#ff4444",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Back button to hub
    const backBtn = this.add.text(120, 60, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 14, y: 8 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("HubScene"));

    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#ffcc00" })); // Hover color
    backBtn.on("pointerout", () => backBtn.setStyle({ color: "#ffffff" })); // Reset color

    await this.loadActiveTraining(); // Fetch active training
    if (!this.training) return; // No training -> bail (scene switch already done)

    // Start countdown ticker
    this.lastUpdateTime = this.time.now;
    this.timerEvent = this.time.addEvent({
      delay: 16, // ~60fps
      loop: true,
      callback: () => this.updateCountdown(),
    });
  }

  async loadActiveTraining() {
    const token = localStorage.getItem("token"); // Token
    const res = await fetch(`${API}/characters/${this.playerId}/active-training`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!data.active) {
      this.scene.start("TrainingScene"); // No active training -> back to selection
      return;
    }

    this.training = data.training; // Cache training data

    this.applyTrainingTheme(this.training); // Set visuals

    const now = Date.now();
    const finishMs = new Date(this.training.finished_at).getTime();
    const startMs = new Date(this.training.started_at).getTime();

    this.totalMs = Math.max(1000, finishMs - startMs); // Avoid zero duration
    this.remainingMs = finishMs - now; // Remaining time

    if (this.remainingMs <= 0) {
      // Training already finished
      this.remainingMs = 0;
      this.updateProgressBar(1);
      this.timerText.setText("Training Complete!");
      this.showFinishRewards();   // Auto popup
    } else {
      this.updateCountdownText(); // Show current mm:ss
      this.updateProgressBar(1 - this.remainingMs / this.totalMs); // Set progress
    }
  }

  applyTrainingTheme(training) {
    const { name } = training; // Training name
    const { width, height } = this.scale; // Canvas size

    this.titleText.setText(`${name.toUpperCase()} TRAINING`); // Title text

    const TRAINING_THEMES = {
      Tackling: { barColor: 0x00ff00 },
      Shooting: { barColor: 0xff4500 },
      Saving: { barColor: 0x1e90ff },
      Vision: { barColor: 0xad00ff },
      Running: { barColor: 0xffff00 },
      Cardio: { barColor: 0xffd700 },
      Gym: { barColor: 0xff0000 },
    }; // Per training color

    const bgKeyByName = {
      Tackling: "tackling_bg",
      Vision: "vision_bg",
      Cardio: "ball_bg",
      Gym: "gym_bg",
      Running: "running_bg",
      Shooting: "shooting_bg",
      Saving: "saving_bg",
    }; // Background selection map

    const chosenBgKey = bgKeyByName[name] || "training_bg"; // Default fallback
    if (this.textures.exists(chosenBgKey)) {
      this.bgImage.setTexture(chosenBgKey);
      this.bgImage.setDisplaySize(width, height); // Resize to canvas
    }

    const theme = TRAINING_THEMES[name];
    if (theme && theme.barColor) {
      this.progressFill.setFillStyle(theme.barColor); // Apply bar color
    }
  }

  updateCountdown() {
    if (!this.training || this.remainingMs <= 0) return; // Nothing to update

    const now = this.time.now;

    if (this.lastUpdateTime == null) {
      this.lastUpdateTime = now; // Initial tick
      return;
    }

    const dt = now - this.lastUpdateTime; // Delta ms
    this.lastUpdateTime = now; // Update timestamp

    this.remainingMs -= dt; // Subtract elapsed
    if (this.remainingMs <= 0) {
      this.remainingMs = 0; // Clamp
      this.updateProgressBar(1); // Full bar
      this.cancelBtn.setActive(false);
      this.cancelBtn.setVisible(false);
      this.timerText.setVisible(false);
      this.showFinishRewards(); // Auto popup
      return;
    }

    this.updateCountdownText(); // Refresh mm:ss
    const progress = 1 - this.remainingMs / this.totalMs; // Progress fraction
    this.updateProgressBar(progress); // Update bar
  }

  updateCountdownText() {
    const sec = Math.floor(this.remainingMs / 1000); // Seconds left
    const m = Math.floor(sec / 60); // Minutes
    const s = sec % 60; // Seconds remainder
    this.timerText.setText(`${m}:${s.toString().padStart(2, "0")}`); // mm:ss
  }

  updateProgressBar(progress) {
    const barWidth = 600; // Total bar width
    this.progressFill.width = barWidth * Phaser.Math.Clamp(progress, 0, 1); // Clamp fill
  }

  // Cancel training via backend
  async cancelTraining() {
    const token = localStorage.getItem("token"); // Token

    try {
      const res = await fetch(`${API}/characters/${this.playerId}/cancel-training`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!data.canceled) {
        this.errorText.setText("Could not cancel training"); // Show failure
        return;
      }

      this.scene.start("TrainingScene"); // Back to selection

    } catch (err) {
      console.error("cancel training failed:", err);
      this.errorText.setText("Network error"); // Network issue
    }
  }

  // Automatically finish and show rewards
  async showFinishRewards() {
    const token = localStorage.getItem("token"); // Token

    try {
      const res = await fetch(`${API}/characters/${this.playerId}/finish-training`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.errorText.setText(err.error || "Finish failed"); // Backend error
        return;
      }

      const data = await res.json();
      this.showRewardPopup(data.rewards, data.player); // Popup rewards
      this.cancelBtn.setVisible(false);
      this.cancelBtn.setActive(false);
      this.timerText.setVisible(false);

    } catch (err) {
      console.error("finish error:", err);
      this.errorText.setText("Network error"); // Network issue
    }
  }

  // Reward popup with XP / dollars / stat gain
  showRewardPopup(rewards, player) {
    const { width, height } = this.scale; // Canvas size

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setDepth(100); // Dim background

    const box = this.add.rectangle(width / 2, height / 2, 450, 360, 0x0c2f0c, 0.95)
      .setStrokeStyle(4, 0xffffff)
      .setDepth(101); // Modal box

    this.add.text(width / 2, height / 2 - 140, "TRAINING COMPLETE!", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(102); // Title

    const rowsY = {
      xp: height / 2 - 70,
      dollars: height / 2 - 10,
      stat: height / 2 + 50,
    }; // Y positions for rows

    if (rewards.xpPerQuest > 0) {
      this.add.image(width / 2 - 80, rowsY.xp, "xp_icon")
        .setDisplaySize(64, 64)
        .setOrigin(0.5)
        .setDepth(102);

      this.add.text(width / 2, rowsY.xp, `+${rewards.xpPerQuest}`, {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "28px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(102); // XP text
    }

    if (rewards.dollarsGained > 0) {
      this.add.image(width / 2 - 80, rowsY.dollars, "dollar_icon")
        .setDisplaySize(64, 64)
        .setOrigin(0.5)
        .setDepth(102);

      this.add.text(width / 2, rowsY.dollars, `+${rewards.dollarsGained}`, {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "28px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(102); // Dollar text
    }

    if (rewards.statGained && rewards.statGained.value > 0) {
      const statName = rewards.statGained.stat; // Stat name from training list

      const iconKeyByStat = {
        Strength: "strenght_icon",
        Speed: "speed_icon",
        Stamina: "stamina_icon",
        Shooting: "shooting_icon",
        Saving: "saving_icon",
        Tackling: "tackling_icon",
        Vision: "vision_icon",
        Running: "running_icon",
      }; // Map stat to icon key

      const statIconKey = iconKeyByStat[statName] || "xp_icon"; // Default fallback

      this.add.image(width / 2 - 80, rowsY.stat, statIconKey)
        .setDisplaySize(64, 64)
        .setOrigin(0.5)
        .setDepth(102);

      this.add.text(width / 2, rowsY.stat, `+${rewards.statGained.value}`, {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "28px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(102); // Stat text
    }

    const closeBtn = this.add.text(width / 2, height / 2 + 130, "CONTINUE", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 22, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(103);

    closeBtn.on("pointerover", () => closeBtn.setStyle({ color: "#ffcc00" })); // Hover color
    closeBtn.on("pointerout", () => closeBtn.setStyle({ color: "#ffffff" })); // Reset color
    closeBtn.on("pointerdown", () => {
      overlay.destroy();
      box.destroy();
      closeBtn.destroy();
      this.training = null; // Clear training
      this.scene.start("HubScene"); // Return to hub
    });
  }
}

// client/src/HubScene.js
// Scene: Locker room hub showing character stats, currency, and navigation to training/profile.
import Phaser from "phaser"; // Phaser scene framework
const API = "http://localhost:4000"; // Backend base URL

export default class HubScene extends Phaser.Scene {
  constructor() {
    super("HubScene"); // Scene key
    this.player = null; // Active character data
    this.clientId = null; // Client ID (optional use)
    this.characterId = null; // Active character ID
    this.trainingBtn = null; // Reference to training button (for blinking)
    this.blinkingTween = null; // Tween handle for blinking effect
  }

  preload() {
    // Backgrounds and training related images
    this.load.image("training_bg", "/assets/training_ground.png");
    this.load.image("lockerroom", "/assets/lockerroom.png");
    this.load.image("xp_icon", "/icons/xp.png");
    this.load.image("dollar_icon", "/icons/dollars.png");
    this.load.image("whistle_icon", "/icons/whistle.png");
    this.load.image("ball_bg", "/assets/ball_scene.png");
    this.load.image("gym_bg", "/assets/gym_scene.png");
    this.load.image("running_bg", "/assets/running_scene.png");
    this.load.image("saving_bg", "/assets/saving_scene.png");
    this.load.image("shooting_bg", "/assets/shooting_scene.png");
    this.load.image("tackling_bg", "/assets/tackling_scene.png");
    this.load.image("vision_bg", "/assets/vision_scene.png");
    this.load.image("stamina_icon", "/icons/stamina_icon.png");
    this.load.image("strenght_icon", "/icons/strength_icon.png"); // Note: original key typo preserved
    this.load.image("speed_icon", "/icons/speed_icon.png");
    this.load.image("saving_icon", "/icons/saving_icon_64.png");
    this.load.image("shooting_icon", "/icons/shooting_icon_64.png");
    this.load.image("tackling_icon", "/icons/tackle_icon_64.png");
    this.load.image("vision_icon", "/icons/vision_icon_64.png");
    this.load.image("training_bg", "/assets/training_ground.png");
    this.load.image("ticket_icon", "/icons/ticket.png");
    this.load.image("whistle_icon", "/icons/whistle.png");
  }

  async create() {
    const { width, height } = this.scale; // Canvas size

    this.clientId = this.registry.get("clientId"); // Optional registry value
    this.characterId = this.registry.get("characterId"); // Active character ID

    // Background
    this.add.image(width / 2, height / 2, "lockerroom")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // HUD Stats Panel
    this.statsBox = this.add.rectangle(300, 50, 300, 270, 0x0c2f0c, 0.95)
      .setStrokeStyle(6, 0xffffff)
      .setOrigin(0, 0);

    this.levelText = this.add.text(400, 60, "Level 1", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
    }).setOrigin(0, 0);

    // XP Display
    this.add.image(310, 160, "xp_icon").setDisplaySize(64, 64).setOrigin(0, 0.5);
    this.xpProgressText = this.add.text(480, 145, "0 / 0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "22px",
      color: "#ffffff",
    }).setOrigin(0.5, 1);

    this.xpBarBg = this.add.rectangle(380, 160, 200, 20, 0x444444)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xffffff);
    this.xpBarFill = this.add.rectangle(380, 160, 0, 20, 0x00ff00)
      .setOrigin(0, 0.5);

    // Dollars
    this.add.image(310, 220, "dollar_icon").setDisplaySize(64, 64).setOrigin(0, 0.5);
    this.dollarsText = this.add.text(380, 220, "0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "22px",
      color: "#ffffff",
    }).setOrigin(0, 0.5);

    // Whistles
    this.add.image(310, 280, "whistle_icon").setDisplaySize(64, 64).setOrigin(0, 0.5);
    this.whistleText = this.add.text(380, 280, "0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "22px",
      color: "#ffffff",
    }).setOrigin(0, 0.5);

    // Training button
    this.trainingBtn = this.add.text(width / 2, height * 0.10, "TRAINING", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "42px",
      color: "#ffffff",
      backgroundColor: "#0c2f0c",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.trainingBtn.on("pointerover", () => this.trainingBtn.setStyle({ color: "#ffcc00" })); // Hover color
    this.trainingBtn.on("pointerout", () => this.trainingBtn.setStyle({ color: "#fdf5e6" })); // Reset color
    this.trainingBtn.on("pointerdown", () => this.handleTrainingNavigation()); // Navigate based on active training

    // Profile button
    const profileBtn = this.add.text(width - 160, height * 0.10, "PROFILE", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "42px",
      color: "#ffffff",
      backgroundColor: "#0c2f0c",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive();

    profileBtn.on("pointerover", () => profileBtn.setStyle({ color: "#ffcc00" })); // Hover color
    profileBtn.on("pointerout", () => profileBtn.setStyle({ color: "#fdf5e6" })); // Reset color
    profileBtn.on("pointerdown", () => this.scene.start("ProfileScene")); // Go to profile

    // Back Button to LoginScene
    const backBtn = this.add.text(120, height * 0.05, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#ffcc00" })); // Hover color
    backBtn.on("pointerout", () => backBtn.setStyle({ color: "#fdf5e6" })); // Reset color
    backBtn.on("pointerdown", () => this.scene.start("LoginScene")); // Return to login list

    // Auto Refresh player stats
    this.time.addEvent({
      delay: 1000, // 1s interval
      loop: true,
      callback: () => this.refreshPlayer(), // Poll backend
    });

    this.refreshPlayer(); // Initial load
  }

  async refreshPlayer() {
    const token = localStorage.getItem("token"); // Current token
    if (!token || !this.characterId) return; // Guard missing data

    try {
      // Reset tickets (server enforces daily logic)
      await fetch(`${API}/characters/reset_tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch all characters for this client
      const res = await fetch(`${API}/characters`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const players = await res.json(); // Character list
      const activeChar = players.find(p => p.character_id === this.characterId); // Match active

      if (!activeChar) return console.warn("Character ID not found"); // Missing ID in list

      this.player = activeChar; // Cache active player

      // Update UI: level/currency
      this.levelText.setText(`Level ${activeChar.level}`);
      this.dollarsText.setText(`${activeChar.dollars}`);
      this.whistleText.setText(`${activeChar.whistles}`);

      // XP Bar calculation
      const neededXP = 50 * (activeChar.level ** 2) + 100 * activeChar.level; // XP curve
      const progress = Math.min(activeChar.xp / neededXP, 1); // Clamp 0-1
      this.xpBarFill.width = 200 * progress; // Fill width
      this.xpProgressText.setText(`${activeChar.xp} / ${neededXP}`); // Text

      // Check active training state
      const trRes = await fetch(`${API}/characters/${this.characterId}/active-training`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tr = await trRes.json(); // Active training payload

      if (tr.active && new Date(tr.training.finished_at) <= new Date()) {
        this.startBlinking(); // Show ready state
      } else {
        this.stopBlinking(); // Stop blinking
      }

    } catch (err) {
      console.error("Failed to refresh player:", err); // Log error only
    }
  }

  async handleTrainingNavigation() {
    const token = localStorage.getItem("token"); // Token fetch

    const res = await fetch(`${API}/characters/${this.characterId}/active-training`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json(); // Active training data

    if (data.active) {
        // Already training -> go to progress
        this.scene.start("TrainingProgressScene");
      } else {
        // No active training -> choose one
        this.scene.start("TrainingScene");
      }
    }


  startBlinking() {
    if (this.blinkingTween) return; // Prevent duplicate tween
    this.blinkingTween = this.tweens.add({
      targets: this.trainingBtn,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    }); // Blink training button
  }

  stopBlinking() {
    if (this.blinkingTween) {
      this.blinkingTween.stop(); // Stop tween
      this.trainingBtn.setAlpha(1); // Reset alpha
      this.blinkingTween = null; // Clear reference
    }
  }
}

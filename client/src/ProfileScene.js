import Phaser from "phaser";

const API = "http://localhost:4000";

export default class ProfileScene extends Phaser.Scene {
  constructor() {
    super("ProfileScene");
    this.playerId = null;
    this.player = null;
    this.statsTexts = {};
    this.roleIcons = {}; // NEW: store role icons
    this.roleIconImage = null; // NEW: actual image in scene
  }

  preload() {
    this.load.image("player_scene", "/assets/player_scene.png");
    this.load.image("frame", "/assets/profile_border.png");

    // Stat icons
    this.load.image("strength_icon", "/icons/strength_icon.png");
    this.load.image("speed_icon", "/icons/speed_icon.png");
    this.load.image("stamina_icon", "/icons/stamina_icon.png");

    // NEW: role icons
    this.load.image("goalkeeper_icon", "/icons/goalkeeper_icon_64.png");
    this.load.image("defender_icon", "/icons/defender_icon_64.png");
    this.load.image("midfielder_icon", "/icons/midfielder_icon_64.png");
    this.load.image("attacker_icon", "/icons/attacker_icon_64.png");
  }

  async create() {
    const { width, height } = this.scale;
    this.playerId = this.registry.get("playerId");

    this.add.image(width / 2, height / 2, "player_scene")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    this.add.image(width * 0.25, height / 2 + 25, "frame")
      .setOrigin(0.5)
      .setScale(0.85);

    // Player name (without role text now)
    this.nameText = this.add.text(width * 0.25, height * 0.20, "...", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "50px",
      color: "#ffff00",
    }).setOrigin(0.5);

    // NEW: Add placeholder for role icon next to name
    this.roleIconImage = this.add.image(width * 0.25 + 200, height * 0.20)
      .setDisplaySize(64, 64)
      .setVisible(false)
      .setOrigin(0.5);

    this.levelText = this.add.text(width * 0.25, height * 0.27, "Level ...", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.xpBarBg = this.add.rectangle(width * 0.25, height * 0.32, 300, 50, 0x333333).setOrigin(0.5);
    this.xpBarFill = this.add.rectangle(width * 0.25 - 150, height * 0.32, 0, 50, 0x00ff00).setOrigin(0, 0.5);
    this.xpText = this.add.text(width * 0.25, height * 0.32, "0 / 0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // Stats
    const statsY = height * 0.38;
    const spacing = 100;
    const iconX = width * 0.15;
    const textX = width * 0.18;

    this.add.image(iconX, statsY, "strength_icon").setDisplaySize(64, 64);
    this.statsTexts.strength = this.add.text(textX, statsY, "Strength: ...", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
    }).setOrigin(0, 0.5);

    this.add.image(iconX, statsY + spacing, "speed_icon").setDisplaySize(64, 64);
    this.statsTexts.speed = this.add.text(textX, statsY + spacing, "Speed: ...", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
    }).setOrigin(0, 0.5);

    this.add.image(iconX, statsY + spacing * 2, "stamina_icon").setDisplaySize(64, 64);
    this.statsTexts.stamina = this.add.text(textX, statsY + spacing * 2, "Stamina: ...", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
    }).setOrigin(0, 0.5);

    const backBtn = this.add.text(80, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on("pointerdown", () => this.scene.start("HubScene"));

    this.refreshProfile();
  }

  async refreshProfile() {
    if (!this.playerId) return;
    try {
      const res = await fetch(`${API}/players/${this.playerId}`);
      this.player = await res.json();

      // Name and role icon
      this.nameText.setText(`${this.player.username}`);
      this.roleIconImage.setTexture(`${this.player.role}_icon`);
      this.roleIconImage.setVisible(true);

      // Level & XP
      this.levelText.setText(`Level ${this.player.level}`);
      const xpNeeded = this.player.level * 100;
      const progress = Math.min(this.player.xp / xpNeeded, 1);
      this.xpBarFill.width = 300 * progress;
      this.xpText.setText(`${this.player.xp} / ${xpNeeded}`);

      // Stats
      this.statsTexts.strength.setText(`Strength: ${this.player.strength}`);
      this.statsTexts.speed.setText(`Speed: ${this.player.speed}`);
      this.statsTexts.stamina.setText(`Stamina: ${this.player.stamina}`);
    } catch (e) {
      console.error("Failed to fetch profile:", e);
    }
  }
}

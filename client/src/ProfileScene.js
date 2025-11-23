import Phaser from "phaser";

const API = "http://localhost:4000";
const XP_BAR_WIDTH = 300;

function getXpNeeded(level) {
  return 50 * Math.pow(level, 2) + 100 * level;
}

export default class ProfileScene extends Phaser.Scene {
  constructor() {
    super("ProfileScene");
    this.characterId = null;
    this.player = null;

    this.roleIconImage = null;
    this.nameText = null;
    this.clubText = null;
    this.levelText = null;
    this.xpBarFill = null;
    this.xpText = null;
    this.moneyText = null;
    this.whistleText = null;
    this.strengthText = null;
    this.speedText = null;
    this.staminaText = null;
    this.specialText = null;
    this.strengthIcon = null;
    this.speedIcon = null;
    this.staminaIcon = null;
    this.specialIcon = null;
    this.stats = {};
    this.inventoryCharacter = null;
  }

  preload() {
    this.load.image("goalkeeper_icon", "/icons/goalkeeper_icon_128.png");
    this.load.image("defender_icon", "/icons/defender_icon_128.png");
    this.load.image("midfielder_icon", "/icons/midfielder_icon_128.png");
    this.load.image("attacker_icon", "/icons/attacker_icon_128.png");
    this.load.image("goalkeeper", "/characters/goalkeeper.png");
    this.load.image("defender", "/characters/defender.png");
    this.load.image("midfielder", "/characters/midfielder.png");
    this.load.image("attacker", "/characters/attacker.png");
    this.load.image("dollar_icon", "/icons/dollars.png");
    this.load.image("whistle_icon", "/icons/whistle.png");
    this.load.image("strength_icon", "/icons/strength_icon.png");
    this.load.image("speed_icon", "/icons/speed_icon.png");
    this.load.image("stamina_icon", "/icons/stamina_icon.png");
    this.load.image("goalkeeper_special_icon", "/icons/saving_icon_64.png");
    this.load.image("defender_special_icon", "/icons/tackle_icon_64.png");
    this.load.image("midfielder_special_icon", "/icons/vision_icon_64.png");
    this.load.image("attacker_special_icon", "/icons/shooting_icon_64.png");
    this.load.image("trophies_icon", "/icons/trophies_icon_64.png");
  }

  async create() {
    const { width, height } = this.scale;
    this.characterId = this.registry.get("characterId");

    this.add.rectangle(width / 2, height / 2, width, height, 0x111111);

    // Top bar
    this.add.rectangle(width / 2, 90, width - 40, 150, 0x1e1e1e).setStrokeStyle(6, 0xffffff);

    this.nameText = this.add.text(170, 80, "Player", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "60px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0, 0.5);

    this.roleIconImage = this.add.image(0, 0, "defender_icon")
      .setVisible(false)
      .setDisplaySize(128, 128)
      .setOrigin(0, 0.5);

    this.clubText = this.add.text(200, 80, "(Free Agent)", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0, 0.5);

    this.levelText = this.add.text(width / 2, 55, "Level 1", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5, 0.5);

    const xpBarX = width / 2;
    const xpBarY = 110;
    this.add.rectangle(xpBarX, xpBarY, XP_BAR_WIDTH, 40, 0x333333).setOrigin(0.5);
    this.xpBarFill = this.add.rectangle(xpBarX - XP_BAR_WIDTH / 2, xpBarY, 0, 40, 0x00ff00).setOrigin(0, 0.5);
    this.xpText = this.add.text(xpBarX, xpBarY, "0 / 0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "30px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Currency on the right, stacked
    const rightX = width - 200;
    const baseY = 55;
    this.add.image(rightX - 60, baseY + 10, "dollar_icon").setDisplaySize(48, 48).setOrigin(0, 0.5);
    this.moneyText = this.add.text(rightX, baseY + 5, "0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0, 0.5);

    this.add.image(rightX - 60, baseY + 65, "whistle_icon").setDisplaySize(48, 48).setOrigin(0, 0.5);
    this.whistleText = this.add.text(rightX, baseY + 60, "0", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0, 0.5);

    // Stats panel on left
    const statsPanelWidth = width * 0.45;
    const statsPanelX = statsPanelWidth / 2 + 20;
    const statsPanelY = 600;
    this.add.rectangle(statsPanelX, statsPanelY, statsPanelWidth, 800, 0x1a1a1a)
      .setStrokeStyle(6, 0xffffff);

    const statStyle = {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    };

    const statStartX = statsPanelX - statsPanelWidth / 2 + 50;
    const statRows = [
      { key: "strength", icon: "strength_icon", label: "Strength", y: statsPanelY - 325 },
      { key: "speed", icon: "speed_icon", label: "Speed", y: statsPanelY - 250 },
      { key: "stamina", icon: "stamina_icon", label: "Stamina", y: statsPanelY - 175 },
      { key: "special", icon: "attacker_special_icon", label: "Special", y: statsPanelY - 100, hidden: true },
    ];

    statRows.forEach((row) => {
      const icon = this.add.image(statStartX, row.y, row.icon).setDisplaySize(64, 64).setOrigin(0, 0.5);
      if (row.hidden) icon.setVisible(false);
      const text = this.add.text(statStartX + 80, row.y - 5, `${row.label}: 0`, statStyle).setOrigin(0, 0.5);
      this.stats[row.key] = { icon, text };

      if (row.key === "strength") {
        this.strengthIcon = icon;
        this.strengthText = text;
      } else if (row.key === "speed") {
        this.speedIcon = icon;
        this.speedText = text;
      } else if (row.key === "stamina") {
        this.staminaIcon = icon;
        this.staminaText = text;
      } else if (row.key === "special") {
        this.specialIcon = icon;
        this.specialText = text;
      }
    });

    // Inventory slots under stats (10 slots)
    const statInvCols = 5;
    const statInvRows = 2;
    const statInvCell = 120;
    const statInvGap = 40;
    const statInvStartX = statsPanelX - statsPanelWidth / 2 + 50;
    const statInvStartY = statsPanelY + 20;

    // Achievements button between stats and inventory slots
    const trophiesY = statInvStartY - 15;
    const iconW = 64;
    const iconH = 64;
    const gap = 12;
    const padX = 16;
    const padY = 12;
    const buttonText = "Trophies / Achievements";
    const textStyle = {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    };
    const tempText = this.add.text(0, 0, buttonText, textStyle).setVisible(false);
    const textW = tempText.displayWidth;
    const textH = tempText.displayHeight;
    tempText.destroy();

    // Separate elements: background, icon, text (easier to adjust independently)
    const buttonWidth = padX * 2 + iconW + gap + textW;
    const buttonHeight = padY * 2 + Math.max(iconH, textH);
    this.trophiesBackground = this.add.rectangle(statStartX, trophiesY, buttonWidth, buttonHeight, 0x444444)
      .setOrigin(0, 1);

    this.trophiesIcon = this.add.image(statStartX + padX, trophiesY - padY, "trophies_icon")
      .setDisplaySize(iconW, iconH)
      .setOrigin(0, 1);

    this.achievementsButton = this.add.text(
      statStartX + padX + iconW + gap,
      trophiesY - padY,
      buttonText,
      textStyle
    ).setOrigin(0, 1);

    const hitArea = this.add.rectangle(this.trophiesBackground.x, this.trophiesBackground.y - buttonHeight, buttonWidth, buttonHeight, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    hitArea.on("pointerover", () => this.achievementsButton.setStyle({ color: "#ffcc00" }));
    hitArea.on("pointerout", () => this.achievementsButton.setStyle({ color: "#ffffff" }));

    for (let r = 0; r < statInvRows; r++) {
      for (let c = 0; c < statInvCols; c++) {
        const x = statInvStartX + c * (statInvCell + statInvGap);
        const y = statInvStartY + r * (statInvCell + statInvGap);
        this.add.rectangle(x, y, statInvCell, statInvCell, 0x262626)
          .setOrigin(0, 0)
          .setStrokeStyle(6, 0x555555);
      }
    }

    // Trainer and manager placeholders
    const roleSlotY = statInvStartY + statInvRows * (statInvCell + statInvGap) + 30;
    const roleLabelStyle = {
      ...statStyle,
      fontSize: "40px",
      strokeThickness: 6,
    };
    const roleSlots = [
      { label: "Trainer", x: statInvStartX + 440, y: roleSlotY -710},
      { label: "Manager", x: statInvStartX + 440, y: roleSlotY -520},
    ];
    this.roleSlots = {};
    roleSlots.forEach((slot) => {
      const boxX = slot.x + 200;
      const boxY = slot.y + 10;
      const box = this.add.rectangle(boxX, boxY, 120, 120, 0x262626)
        .setOrigin(0, 0)
        .setStrokeStyle(6, 0x555555);
      const text = this.add.text(boxX + 60, slot.y, slot.label, roleLabelStyle).setOrigin(0.5, 1);
      this.roleSlots[slot.label.toLowerCase()] = { text, box };
    });

    // Inventory placeholder to the right of stats (same height)
    const invPanelWidth = width * 0.50 ;
    const invPanelX = width - invPanelWidth / 2 - 20;
    this.add.rectangle(invPanelX, statsPanelY, invPanelWidth, 800, 0x1a1a1a)
      .setStrokeStyle(6, 0xffffff);

    // Character portrait next to inventory slots
    this.inventoryCharacter = this.add.image(invPanelX - invPanelWidth / 2 + 650, statsPanelY, "attacker")
      .setDisplaySize(500,750)
      .setOrigin(0.5)
      .setVisible(false);

    const invCols = 2;
    const invRows = 4;
    const invCell = 120;
    const invGap = 40;
    const invStartX = invPanelX - ((invCols - 1) * (invCell + invGap)) / 2 -250;
    const invStartY = statsPanelY - (invRows - 1) * (invCell + invGap) / 2;

    for (let r = 0; r < invRows; r++) {
      for (let c = 0; c < invCols; c++) {
        const x = invStartX + c * (invCell + invGap);
        const y = invStartY + r * (invCell + invGap);
        this.add.rectangle(x, y, invCell, invCell, 0x262626)
          .setStrokeStyle(6, 0x555555);
      }
    }

    // Back button
    const backBtn = this.add.text(90, 1040, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 14, y: 8},
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#ffcc00" })); // Hover color
    backBtn.on("pointerout", () => backBtn.setStyle({ color: "#ffffff" })); // Reset color
    backBtn.on("pointerdown", () => this.scene.start("HubScene")); // Return to start

    await this.refreshProfile();
  }

  async refreshProfile() {
    const token = localStorage.getItem("token");
    if (!token || !this.characterId) {
      this.scene.start("LoginScene");
      return;
    }

    try {
      const res = await fetch(`${API}/characters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load character list");
      const players = await res.json();
      const player = players.find((p) => Number(p.character_id) === Number(this.characterId));
      if (!player) {
        this.scene.start("LoginScene");
        return;
      }
      this.player = player;

      const headerY = 80;
      const displayName = player.name || "Player";
      this.nameText.setText(displayName);
      this.clubText.setText(`(${player.club ?? "Free Agent"})`);

      const roleKey = (player.role || "").toLowerCase();
      const iconKey = `${roleKey}_icon`;
      if (this.textures.exists(iconKey)) {
        this.roleIconImage
          .setTexture(iconKey)
          .setVisible(true)
          .setPosition(60, headerY + 10);
        const nameX = this.roleIconImage.x + this.roleIconImage.displayWidth + 20;
        this.nameText.setPosition(nameX, headerY);
        this.clubText.setPosition(this.nameText.x + this.nameText.displayWidth + 12, headerY);
        if (this.textures.exists(roleKey)) {
          this.inventoryCharacter
            .setTexture(roleKey)
            .setVisible(true);
        }
      } else {
        this.roleIconImage.setVisible(false);
        this.nameText.setPosition(170, headerY);
        this.clubText.setPosition(this.nameText.x + this.nameText.displayWidth + 12, headerY);
      }

      const lvl = player.level || 1;
      const xpNeeded = getXpNeeded(lvl);
      const currentXp = player.xp || 0;
      const progress = Math.min(currentXp / xpNeeded, 1);

      this.levelText.setText(`Level ${lvl}`);
      this.xpBarFill.width = XP_BAR_WIDTH * progress;
      this.xpText.setText(`${currentXp} / ${xpNeeded}`);

      const dollars = player.dollars ?? 0;
      const whistles = player.whistles ?? player.tickets ?? 0;
      this.moneyText.setText(`${dollars.toLocaleString()}`);
      this.whistleText.setText(`${whistles}`);

      const strength = player.strength ?? 0;
      const speed = player.speed ?? 0;
      const stamina = player.stamina ?? 0;
      const special = player.special_stat ?? 0;
      const specialName =
        roleKey === "goalkeeper" ? "Saving" :
        roleKey === "defender" ? "Tackling" :
        roleKey === "midfielder" ? "Vision" :
        "Shooting";

      this.stats.strength.text.setText(`Strength: ${strength}`);
      this.stats.speed.text.setText(`Speed: ${speed}`);
      this.stats.stamina.text.setText(`Stamina: ${stamina}`);
      this.stats.special.text.setText(`${specialName}: ${special}`);

      const specialIconKey = `${roleKey}_special_icon`;
      if (this.textures.exists(specialIconKey)) {
        this.stats.special.icon
          .setTexture(specialIconKey)
          .setVisible(true);
      } else {
        this.stats.special.icon.setVisible(false);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  }
}

// client/src/RoleSelectScene.js
import Phaser from "phaser";
const API = "http://localhost:4000";

export default class RoleSelectScene extends Phaser.Scene {
  constructor() {
    super("RoleSelectScene");
    this.selected = null;
    this.sprites = {};
    this.baseScale = 1;
    this.playerName = "";
    this.nameText = null;
    this.caret = null;
    this.nameActive = false;

    this.descBox = null;
    this.descTitle = null;
    this.descBody = null;
    this.descIcons = {}; // store icons for each role
    this.descriptions = {};
    this.overlay = null;
  }

  preload() {
    this.load.image("selectscene", "/assets/createscene.png");

    this.load.image("goalkeeper", "/characters/goalkeeper.png");
    this.load.image("defender", "/characters/defender.png");
    this.load.image("midfielder", "/characters/midfielder.png");
    this.load.image("attacker", "/characters/attacker.png");

    // Role icons
    this.load.image("goalkeeper_icon", "/icons/goalkeeper_icon_128.png");
    this.load.image("defender_icon", "/icons/defender_icon_128.png");
    this.load.image("midfielder_icon", "/icons/midfielder_icon_128.png");
    this.load.image("attacker_icon", "/icons/attacker_icon_128.png");
  }

  create() {
    const { width, height } = this.scale;

    // background
    this.add.image(width / 2, height / 2, "selectscene")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    this.add.text(width / 2, 60, "CHOOSE YOUR POSITION", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "80px",
      color: "#000000ff",
    }).setOrigin(0.5);

    this.baseScale = Math.min(width / 2000, height / 2000);

    // overlay
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3)
      .setVisible(false)
      .setDepth(0.5)
      .setInteractive();

    const positions = {
      goalkeeper: { char: { x: width * 0.15, y: height * 0.50 } },
      defender:   { char: { x: width * 0.38, y: height * 0.55 } },
      midfielder: { char: { x: width * 0.61, y: height * 0.55 } },
      attacker:   { char: { x: width * 0.83, y: height * 0.50 } },
    };

    const roles = ["goalkeeper", "defender", "midfielder", "attacker"];

    // role descriptions
    this.descriptions = {
      goalkeeper: { title: "GOALKEEPER", text: "Dives like a cat, but can’t catch a bus on time!" },
      defender:   { title: "DEFENDER",   text: "A brick wall with legs, loves sliding more than playground kids." },
      midfielder: { title: "MIDFIELDER", text: "Runs marathons during matches, still late for dinner." },
      attacker:   { title: "ATTACKER",   text: "Shoots more than action movies, but misses the easy ones." },
    };

    roles.forEach((role) => {
      const { char } = positions[role];

      const sprite = this.add.sprite(char.x, char.y, role)
        .setInteractive({ useHandCursor: true })
        .setScale(this.baseScale)
        .setDepth(2);

      this.sprites[role] = sprite;

      // Create a separate icon for each role (hidden initially)
      const icon = this.add.image(char.x, char.y, `${role}_icon`)
        .setVisible(false)
        .setDepth(3)
        .setDisplaySize(128, 128);

      this.descIcons[role] = icon;

      sprite.on("pointerdown", () => {
        this.showDescription(role, sprite);
      });
    });

    // description box
    this.descBox = this.add.rectangle(width / 2, height - 250, 620, 200, 0x0c2f0c, 0.95)
      .setStrokeStyle(4, 0xffffff)
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(2);

    this.descTitle = this.add.text(width / 2, height - 280, "", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "50px",
      color: "#ffcc00",
      align: "center"
    }).setOrigin(0, 0.5).setVisible(false).setDepth(2); // LEFT aligned so we can center title+icon manually

    this.descBody = this.add.text(width / 2, height - 230, "", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "24px",
      color: "#ffffff",
      wordWrap: { width: 600, useAdvancedWrap: true },
      align: "center"
    }).setOrigin(0.5).setVisible(false).setDepth(2);

    // overlay click closes everything
    this.overlay.on("pointerdown", () => this.closeOverlay());

    // name input
    this.add.text(width / 2 - 330, height - 120, "NAME:", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "32px",
      color: "#fff",
    }).setOrigin(0, 0.5).setDepth(2);

    this.nameBox = this.add.rectangle(width / 2 - 220, height - 120, 320, 50, 0x0c2f0c)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    this.nameText = this.add.text(width / 2 - 210, height - 120, "", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "28px",
      color: "#fff",
    }).setOrigin(0, 0.5).setDepth(2);

    this.caret = this.add.text(width / 2 - 210, height - 120, "|", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "28px",
      color: "#fff",
    }).setOrigin(0, 0.5).setDepth(2);
    this.caret.setVisible(false);

    this.tweens.add({
      targets: this.caret,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.nameBox.on("pointerdown", () => {
      this.nameActive = true;
      this.caret.setVisible(true);
    });

    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (!currentlyOver.includes(this.nameBox)) {
        this.nameActive = false;
        this.caret.setVisible(false);
      }
    });

    this.input.keyboard.on("keydown", (event) => {
      if (!this.nameActive) return;

      if (event.key === "Backspace") {
        this.playerName = this.playerName.slice(0, -1);
      } else if (event.key === "Enter") {
        this.tryCreate();
      } else if (event.key.length === 1 && this.playerName.length < 12) {
        this.playerName += event.key;
      }

      this.nameText.setText(this.playerName);
      this.updateCaretPosition();
      this.updateCreateButton();
    });

    this.createBtn = this.add.text(width / 2 + 200, height - 120, "CREATE", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "34px",
      color: "#fff",
      backgroundColor: "#00000088",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(2);

    this.createBtn.on("pointerdown", () => this.tryCreate());
    this.createBtn.setAlpha(0.5);

    const backBtn = this.add.text(80, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#ffcc00" }));
    backBtn.on("pointerout", () => backBtn.setStyle({ color: "#ffffff" }));
    backBtn.on("pointerdown", () => this.scene.start("StartScene"));
  }

  showDescription(role, sprite) {
    const { height } = this.scale;
    const { title, text } = this.descriptions[role];

    Object.entries(this.sprites).forEach(([r, s]) => s.setAlpha(r === role ? 1 : 0.4));

    if (this.selected && this.selected !== role) {
      const prevSprite = this.sprites[this.selected];
      this.tweens.add({ targets: prevSprite, scale: this.baseScale, duration: 300, ease: "Sine.easeOut" });
    }

    this.selected = role;

    this.descBox.setPosition(sprite.x, height - 300);
    this.descBody.setPosition(this.descBox.x, this.descBox.y + 50);

    this.descTitle.setText(title);
    this.descBody.setText(text);

    // Position title + icon together
    const icon = this.descIcons[role];
    Object.values(this.descIcons).forEach(i => i.setVisible(false));

    const iconWidth = icon.displayWidth;
    const spacing = 5; // 🔧 ADJUST THIS TO MOVE ICON FURTHER/NEARER

    const totalWidth = this.descTitle.width + spacing + iconWidth;
    const startX = this.descBox.x - totalWidth / 2;

    this.descTitle.setPosition(startX, this.descBox.y - 30);
    icon.setPosition(this.descTitle.x + this.descTitle.width + spacing + iconWidth / 2, this.descBox.y - 30);
    icon.setVisible(true);

    this.descBox.setVisible(true);
    this.descTitle.setVisible(true);
    this.descBody.setVisible(true);
    this.overlay.setVisible(true);

    this.tweens.add({ targets: sprite, scale: this.baseScale * 1.2, duration: 400, ease: "Back.easeOut" });

    // Animate everything together (box, title, body, icon)
    [this.descBox, this.descTitle, this.descBody, icon].forEach(el => el.setScale(0));
    this.tweens.add({
      targets: [this.descBox, this.descTitle, this.descBody, icon],
      scale: 1,
      duration: 300,
      ease: "Back.easeOut"
    });
  }

  closeOverlay() {
    if (!this.selected) return;
    const sprite = this.sprites[this.selected];

    this.overlay.setVisible(false);
    this.descBox.setVisible(false);
    this.descTitle.setVisible(false);
    this.descBody.setVisible(false);
    Object.values(this.descIcons).forEach(icon => icon.setVisible(false));

    Object.entries(this.sprites).forEach(([r, s]) => s.setAlpha(1));

    this.tweens.add({ targets: sprite, scale: this.baseScale, duration: 300, ease: "Sine.easeOut" });

    this.selected = null;
  }

  updateCaretPosition() {
    this.caret.setX(this.nameText.x + this.nameText.width + 1);
  }

  setSelected(role) {
    this.selected = role;
    this.updateCreateButton();
  }

  updateCreateButton() {
    if (this.selected && this.playerName.trim().length > 0) {
      this.createBtn.setAlpha(1);
      this.createBtn.active = true;
    } else {
      this.createBtn.setAlpha(0.5);
      this.createBtn.active = false;
    }
  }

  async tryCreate() {
    if (!this.createBtn.active) return;
    try {
      const res = await fetch(`${API}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: this.playerName.trim(), role: this.selected }),
      });
      const player = await res.json();
      this.registry.set("playerId", player.id);
      this.registry.set("playerRole", this.selected);
      this.scene.start("HubScene");
    } catch (e) {
      console.error(e);
    }
  }

  update() {
    if (this.fpsText) {
      this.fpsText.setText(`FPS: ${Math.floor(this.game.loop.actualFps)}`);
    }
  }
}

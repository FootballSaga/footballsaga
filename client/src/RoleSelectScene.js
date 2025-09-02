// client/src/RoleSelectScene.js
import Phaser from "phaser";
const API = "http://localhost:4000";

export default class RoleSelectScene extends Phaser.Scene {
  constructor() {
    super("RoleSelectScene");
    this.selected = null;
    this.sprites = {};
    this.icons = {};
    this.baseScale = 1;
    this.playerName = "";
    this.nameText = null;
    this.caret = null;
    this.nameActive = false;

    this.descBox = null;
    this.descTitle = null; // ⭐ NEW
    this.descBody = null;  // ⭐ NEW
    this.descriptions = {};
    this.overlay = null;
  }

  preload() {
    this.load.image("goalkeeper", "/characters/goalkeeper.png");
    this.load.image("defender", "/characters/defender.png");
    this.load.image("midfielder", "/characters/midfielder.png");
    this.load.image("attacker", "/characters/attacker.png");

    this.load.image("icon_goalkeeper", "/icons/goalkeeper_icon.png");
    this.load.image("icon_defender", "/icons/defender_icon.png");
    this.load.image("icon_midfielder", "/icons/midfielder_icon.png");
    this.load.image("icon_attacker", "/icons/attacker_icon.png");
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#1f7a1f");

    this.fpsText = this.add.text(20, 20, "FPS: ...", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "20px",
      color: "#ffffff"
    }).setOrigin(0, 0);

    this.add.text(width / 2, 40, "CHOOSE YOUR POSITION", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "48px",
      color: "#fff",
    }).setOrigin(0.5);

    this.baseScale = Math.min(width / 4000, height / 3000);

    // overlay
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3)
      .setVisible(false)
      .setDepth(0.5)
      .setInteractive();

    const positions = {
      goalkeeper: { char: { x: width * 0.2, y: height * 0.55 }, icon: { x: width * 0.2, y: height * 0.15 } },
      defender:   { char: { x: width * 0.4, y: height * 0.55 }, icon: { x: width * 0.4, y: height * 0.15 } },
      midfielder: { char: { x: width * 0.6, y: height * 0.55 }, icon: { x: width * 0.6, y: height * 0.15 } },
      attacker:   { char: { x: width * 0.8, y: height * 0.55 }, icon: { x: width * 0.8, y: height * 0.15 } },
    };

    const roles = ["goalkeeper", "defender", "midfielder", "attacker"];

    // ⭐ UPDATED: Descriptions split into title + text
    this.descriptions = {
      goalkeeper: { 
        title: "GOALKEEPER", 
        text: "Dives like a cat, but can’t catch a bus on time!" 
      },
      defender: { 
        title: "DEFENDER", 
        text: "A brick wall with legs, loves sliding more than playground kids." 
      },
      midfielder: { 
        title: "MIDFIELDER", 
        text: "Runs marathons during matches, still late for dinner." 
      },
      attacker: { 
        title: "ATTACKER", 
        text: "Shoots more than action movies, but misses the easy ones." 
      },
    };

    roles.forEach((role) => {
      const { char, icon } = positions[role];

      const sprite = this.add.sprite(char.x, char.y, role)
        .setInteractive({ useHandCursor: true })
        .setScale(this.baseScale)
        .setDepth(2);

      this.sprites[role] = sprite;

      sprite.on("pointerdown", () => {
        this.showDescription(role, sprite, this.icons[role]);
      });

      const iconObj = this.add.image(icon.x, icon.y, "icon_" + role)
        .setScale(0.25)
        .setOrigin(0.5)
        .setDepth(2);

      this.icons[role] = iconObj;
    });

    // ⭐ UPDATED: Description box
    this.descBox = this.add.rectangle(width / 2, height - 250, 650, 140, 0x0c2f0c, 0.95)
      .setStrokeStyle(4, 0xffffff)
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(2);

    // ⭐ NEW: Title (highlighted role name)
    this.descTitle = this.add.text(width / 2, height - 280, "", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "32px",
      color: "#ffcc00", // bright yellow
      align: "center"
    }).setOrigin(0.5).setVisible(false).setDepth(2);

    // ⭐ NEW: Body (funny description)
    this.descBody = this.add.text(width / 2, height - 230, "", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "24px",
      color: "#ffffff",
      wordWrap: { width: 600, useAdvancedWrap: true },
      align: "center"
    }).setOrigin(0.5).setVisible(false).setDepth(2);

    // overlay click closes everything
    this.overlay.on("pointerdown", () => {
      this.closeOverlay();
    });

    // --- name + UI unchanged ---
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
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on("pointerdown", () => this.scene.start("StartScene"));
  }

  // ⭐ UPDATED: showDescription now handles title + body
  showDescription(role, sprite, icon) {
    const { height } = this.scale;
    const { title, text } = this.descriptions[role];

    // dim all except selected
    Object.entries(this.sprites).forEach(([r, s]) => {
      if (r === role) {
        s.setAlpha(1);
        this.icons[r].setAlpha(1);
      } else {
        s.setAlpha(0.4);
        this.icons[r].setAlpha(0.4);
      }
    });

    if (this.selected && this.selected !== role) {
      const prevSprite = this.sprites[this.selected];
      this.tweens.add({ targets: prevSprite, scale: this.baseScale, duration: 300, ease: "Sine.easeOut" });
    }

    this.selected = role;

    this.descBox.setPosition(sprite.x, height - 250);
    this.descTitle.setPosition(sprite.x, height - 280);
    this.descBody.setPosition(sprite.x, height - 230);

    this.descTitle.setText(title);
    this.descBody.setText(text);

    this.descBox.setVisible(true);
    this.descTitle.setVisible(true);
    this.descBody.setVisible(true);

    this.overlay.setVisible(true);

    this.tweens.add({
      targets: sprite,
      scale: this.baseScale * 1.3,
      duration: 400,
      ease: "Back.easeOut",
    });

    [this.descBox, this.descTitle, this.descBody].forEach(el => el.setScale(0));
    this.tweens.add({
      targets: [this.descBox, this.descTitle, this.descBody],
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

    // restore brightness
    Object.entries(this.sprites).forEach(([r, s]) => {
      s.setAlpha(1);
      this.icons[r].setAlpha(1);
    });

    this.tweens.add({
      targets: sprite,
      scale: this.baseScale,
      duration: 300,
      ease: "Sine.easeOut"
    });

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
        body: JSON.stringify({
          username: this.playerName.trim(),
          role: this.selected
        }),
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

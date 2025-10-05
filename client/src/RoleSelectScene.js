// client/src/RoleSelectScene.js
import Phaser from "phaser";
const API = "http://localhost:4000";

export default class RoleSelectScene extends Phaser.Scene {
  constructor() {
    super("RoleSelectScene");
    this.selected = null;
    this.sprites = {};
    this.baseScale = 0.9;

    // normalized input
    this.nameInput = null;
    this.activeInput = null;
    this.caret = null;
    this.caretTimer = null;

    this.descBox = null;
    this.descTitle = null;
    this.descBody = null;
    this.descIcons = {}; 
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
      fontSize: "70px",
      color: "#ffffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.baseScale = Math.min(width / 2000, height / 2000);

    // overlay
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3)
      .setVisible(false)
      .setDepth(0.5)
      .setInteractive();

    const positions = {
      goalkeeper: { char: { x: width * 0.15, y: height * 0.52 } },
      defender:   { char: { x: width * 0.38, y: height * 0.52 } },
      midfielder: { char: { x: width * 0.61, y: height * 0.52 } },
      attacker:   { char: { x: width * 0.83, y: height * 0.52 } },
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
    }).setOrigin(0, 0.5).setVisible(false).setDepth(2);

    this.descBody = this.add.text(width / 2, height - 230, "", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "24px",
      color: "#ffffff",
      wordWrap: { width: 600, useAdvancedWrap: true },
      align: "center"
    }).setOrigin(0.5).setVisible(false).setDepth(2);

    // overlay click closes everything
    this.overlay.on("pointerdown", () => this.closeOverlay());

    this.nameInput = this.makeInputBox(width / 2 - 60, height - 40, "Enter Name");

    // create button
    this.createBtn = this.add.text(width / 2 + 210, height - 40, "CREATE", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "34px",
      color: "#888888",               // gray by default
      backgroundColor: "#555555",     // gray background
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 20, y: 10 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setDepth(2);

    this.createBtn.active = false; // disabled initially

    // hover effect
    this.createBtn.on("pointerover", () => {
      if (this.createBtn.active) {
        this.createBtn.setStyle({ color: "#ffcc00" });
      }
    });
    this.createBtn.on("pointerout", () => {
      if (this.createBtn.active) {
        this.createBtn.setStyle({ color: "#ffffff", backgroundColor: "#1a4d1a" });
      } else {
        this.createBtn.setStyle({ color: "#888888", backgroundColor: "#555555" });
      }
    });

    this.createBtn.on("pointerdown", () => {
      if (this.createBtn.active) this.tryCreate();
    });


    const backBtn = this.add.text(120, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 14, y: 8},
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#ffcc00" }));
    backBtn.on("pointerout", () => backBtn.setStyle({ color: "#ffffff" }));
    backBtn.on("pointerdown", () => this.scene.start("StartScene"));

    // keyboard input
    this.input.keyboard.on("keydown", (event) => {
      if (!this.activeInput) return;
      let newValue = this.activeInput.value || "";
      if (event.key === "Backspace") newValue = newValue.slice(0, -1);
      else if (event.key === "Enter") {
        if (this.isCreateEnabled()) this.tryCreate();
        return;
      } else if (event.key.length === 1 && newValue.length < 12) {
        newValue += event.key;
      }
      this.activeInput.setValue(newValue);
      this.activeInput.textObj.setText(newValue);
      this.updateCaretPosition();
      this.updateCreateButton();
    });
  }

  // === Input system ===
  makeInputBox(x, y, placeholder) {
    const box = this.add.rectangle(x, y, 350, 60, 0xffffff, 1)
      .setStrokeStyle(3, 0x000000)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    let value = "";
    const textObj = this.add.text(x - 160, y, placeholder, {
      fontFamily: '"Arial", sans-serif',
      fontSize: "32px",
      color: "#888",
    }).setOrigin(0, 0.5).setDepth(2);

    box.on("pointerdown", () => this.focusInput({ textObj, get value() { return value; }, setValue: (val) => { value = val; } }));
    return { textObj, box, get value() { return value; }, setValue: (val) => { value = val; } };
  }

  focusInput(input) {
    this.activeInput = input;
    input.textObj.setText(input.value || "");
    input.textObj.setColor("#000");

    if (this.caret) this.caret.destroy();
    this.caret = this.add.text(input.textObj.x + input.textObj.displayWidth + 5, input.textObj.y, "|", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#000",
    }).setOrigin(0, 0.5).setDepth(2);

    if (this.caretTimer) this.time.removeEvent(this.caretTimer);
    this.caretTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.caret.setVisible(!this.caret.visible),
    });
  }

  updateCaretPosition() {
    if (this.activeInput && this.caret) {
      this.caret.x = this.activeInput.textObj.x + this.activeInput.textObj.displayWidth + 2;
    }
  }

  updateCreateButton() {
    if (this.selected && this.nameInput.value.trim().length > 0) {
      this.createBtn.active = true;
      this.createBtn.setStyle({ color: "#ffffff", backgroundColor: "#1a4d1a" });
    } else {
      this.createBtn.active = false;
      this.createBtn.setStyle({ color: "#888888", backgroundColor: "#555555" });
    }
  }

  isCreateEnabled() {
    return this.selected && this.nameInput.value.trim().length > 0;
  }

  async tryCreate() {
    if (!this.isCreateEnabled()) return;
    try {
      const roleMap = {
        goalkeeper: 1,
        defender: 2,
        midfielder: 3,
        attacker: 4,
      };
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ No session token found.");
        return;
      }
      const res = await fetch(`${API}/players`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: this.nameInput.value.trim(),
          roleId: roleMap[this.selected],
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("❌ Failed to create character:", data.error);
        return;
      }
      this.registry.set("characterId", data.character.id);
      this.registry.set("playerRoleId", data.character.role_id);
      this.registry.set("characterName", data.character.name);
      this.scene.start("HubScene");
    } catch (e) {
      console.error("❌ Error creating player:", e);
    }
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
    this.updateCreateButton();  
    this.descBox.setPosition(sprite.x, height - 300);
    this.descBody.setPosition(this.descBox.x, this.descBox.y + 50);
    this.descTitle.setText(title);
    this.descBody.setText(text);
    const icon = this.descIcons[role];
    Object.values(this.descIcons).forEach(i => i.setVisible(false));
    const iconWidth = icon.displayWidth;
    const spacing = 5;
    const totalWidth = this.descTitle.width + spacing + iconWidth;
    const startX = this.descBox.x - totalWidth / 2;
    this.descTitle.setPosition(startX, this.descBox.y - 30);
    icon.setPosition(this.descTitle.x + this.descTitle.width + spacing + iconWidth / 2, this.descBox.y - 30);
    icon.setVisible(true);
    this.descBox.setVisible(true);
    this.descTitle.setVisible(true);
    this.descBody.setVisible(true);
    this.overlay.setVisible(true);
    this.tweens.add({ targets: sprite, scale: this.baseScale * 1.1, duration: 400, ease: "Back.easeOut" });
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
}

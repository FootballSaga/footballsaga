// client/src/StartScene.js
import Phaser from "phaser";

const API = "http://localhost:4000";

export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
    this.popupOpen = false;
    this.caretTimer = null;
  }

  preload() {
    this.load.image("startscene", "/assets/startscene.png");
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

  async create() {
    await document.fonts.ready;
    const { width, height } = this.scale;
    this.popupOpen = false;
    this.caretTimer = null;

     const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await fetch("http://localhost:4000/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log("✅ User still logged in:", data.user);
        this.scene.start("LoginScene"); // go straight to LoginScene
        return;
      } else {
        console.log("⚠️ Token invalid or expired, clearing...");
        localStorage.removeItem("token");
      }
    } catch (err) {
      console.error("❌ Error checking token:", err);
    }
  }


    // === Background ===
    this.add.image(width / 2, height / 2, "startscene")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // === Title ===
    this.add.text(width / 2, 80, "FOOTBALL SAGA", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "120px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 8,
    }).setOrigin(0.5);

    // === START YOUR JOURNEY Button (Register) ===
    this.startBtn = this.add.text(width / 2, height / 2, "START YOUR JOURNEY", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "60px",
      color: "#fdf5e6",
      backgroundColor: "#0c2f0c",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.startBtn.on("pointerover", () => this.startBtn.setStyle({ color: "#ffcc00" }));
    this.startBtn.on("pointerout", () => this.startBtn.setStyle({ color: "#fdf5e6" }));
    this.startBtn.on("pointerdown", () => {
      if (!this.popupOpen) {
        this.showRegisterPopup();
      }
    });

    // === "Already have an account?" label ===
    this.add.text(width - 200, height - 150, "Already have an account?", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "24px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5);

    // === LOG IN Button ===
    this.loginBtn = this.add.text(width - 200, height - 80, "LOG IN", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#fdf5e6",
      backgroundColor: "#0c2f0c",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.loginBtn.on("pointerover", () => this.loginBtn.setStyle({ color: "#ffcc00" }));
    this.loginBtn.on("pointerout", () => this.loginBtn.setStyle({ color: "#fdf5e6" }));
    this.loginBtn.on("pointerdown", () => {
      if (!this.popupOpen) {
        this.showLoginPopup();
      }
    });
  }

  // === Login Popup ===
  showLoginPopup() {
    this.showAuthPopup("LOG IN", async (username, password) => {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        this.scene.start("LoginScene");
        return true;
      } else {
        throw new Error("Invalid credentials");
      }
    });
  }

  // === Register Popup ===
  showRegisterPopup() {
    this.showAuthPopup("REGISTER", async (username, password) => {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        this.scene.start("RoleSelectScene");
        return true;
      } else {
        throw new Error(data.error || "Registration failed");
      }
    });
  }

  // === Shared Popup ===
  showAuthPopup(title, onSubmit) {
    this.popupOpen = true;

    this.startBtn.disableInteractive().setStyle({ color: "#fdf5e6" });
    this.loginBtn.disableInteractive().setStyle({ color: "#fdf5e6" });

    const { width, height } = this.scale;
    const scaleFactor = 1.5;

    let activeInput = null;
    let caret = null;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(10);

    const popupHeight = (title === "REGISTER") 
      ? 580
      : 480;

    const popup = this.add.rectangle(width / 2, height / 2, 500 * scaleFactor, popupHeight, 0x0c2f0c)
      .setStrokeStyle(4, 0xffffff).setDepth(11);

    const popupTitle = this.add.text(
      width / 2,
      height / 2 - popupHeight / 2 + 50 ,
      title,
      {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: `${48 * scaleFactor}px`,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      }
    ).setOrigin(0.5).setDepth(12);

    // === Input helper ===
    const makeInputBox = (y, placeholder, isPassword = false) => {
      const box = this.add.rectangle(width / 2, y, 300 * scaleFactor, 50 * scaleFactor, 0xffffff, 1)
        .setStrokeStyle(3, 0x000000).setDepth(11).setInteractive({ useHandCursor: true });

      let value = "";
      const textObj = this.add.text(width / 2 - 140 * scaleFactor, y, placeholder, {
        fontFamily: '"Arial", sans-serif',
        fontSize: `${24 * scaleFactor}px`,
        color: "#888",
      }).setOrigin(0, 0.5).setDepth(12);

      box.on("pointerdown", () => {
        focusInput({ textObj, isPassword, get value() { return value; }, setValue: (val) => { value = val; } });
      });

      return { textObj, box, isPassword, get value() { return value; }, setValue: (val) => { value = val; } };
    };

    const username = makeInputBox(height / 2 - popupHeight / 2 + 150 , "Username");
    const password = makeInputBox(height / 2 - popupHeight / 2 + 250, "Password", true);

    // only for REGISTER
    let confirmPassword = null;
    if (title === "REGISTER") {
      confirmPassword = makeInputBox(height / 2 - popupHeight / 2 + 350, "Confirm Password", true);
    }

    const messageTextY = (title === "REGISTER")
      ? height / 2 - popupHeight / 2 + 415 
      : height / 2 - popupHeight / 2 + 315;

    const messageText = this.add.text(width / 2, messageTextY, "", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: `${18 * scaleFactor}px`,
      color: "#ff4444",
    }).setOrigin(0.5).setDepth(12).setVisible(false);

    const confirmBtnY = (title === "REGISTER")
      ? height / 2 - popupHeight / 2 + 500
      : height / 2 - popupHeight / 2 + 400;

    const confirmBtn = this.add.text(width / 2, confirmBtnY, "ENTER", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: `${48 * scaleFactor}px`,
      color: "#888888",
      backgroundColor: "#555555",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true });

    // === Focus management (Tab/Enter support) ===
    const inputs = [username, password];
    if (confirmPassword) inputs.push(confirmPassword);
    let focusedIndex = 0;

    const focusInput = (input) => {
      activeInput = input;
      input.textObj.setText(input.isPassword ? "*".repeat(input.value.length) : input.value || "");
      input.textObj.setColor("#000");

      if (caret) caret.destroy();
      caret = this.add.text(input.textObj.x + input.textObj.displayWidth + 5, input.textObj.y, "|", {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: `${24 * scaleFactor}px`,
        color: "#000",
      }).setOrigin(0, 0.5).setDepth(12);

      if (this.caretTimer) this.time.removeEvent(this.caretTimer);
      this.caretTimer = this.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => caret.setVisible(!caret.visible),
      });
    };

    let confirmEnabled = false;
    const updateConfirm = () => {
      if (title === "REGISTER") {
        if (username.value.trim() && password.value.trim() && confirmPassword.value.trim() &&
            password.value === confirmPassword.value) {
          confirmEnabled = true;
          confirmBtn.setStyle({ color: "#ffffff", backgroundColor: "#1a4d1a" });
        } else {
          confirmEnabled = false;
          confirmBtn.setStyle({ color: "#888888", backgroundColor: "#555555" });
        }
      } else {
        if (username.value.trim() && password.value.trim()) {
          confirmEnabled = true;
          confirmBtn.setStyle({ color: "#ffffff", backgroundColor: "#1a4d1a" });
        } else {
          confirmEnabled = false;
          confirmBtn.setStyle({ color: "#888888", backgroundColor: "#555555" });
        }
      }
    };

    this.input.keyboard.on("keydown", (event) => {
      if (!activeInput) return;

      if (event.key === "Tab") {
        event.preventDefault?.();
        focusedIndex = (focusedIndex + 1) % inputs.length;
        focusInput(inputs[focusedIndex]);
        return;
      }

      if (event.key === "Enter") {
        if (confirmEnabled) confirmBtn.emit("pointerdown");
        return;
      }

      let newValue = activeInput.value || "";
      if (event.key === "Backspace") newValue = newValue.slice(0, -1);
      else if (event.key.length === 1) newValue += event.key;
      activeInput.setValue(newValue);
      activeInput.textObj.setText(activeInput.isPassword ? "*".repeat(newValue.length) : newValue);
      updateConfirm();
      if (caret) caret.x = activeInput.textObj.x + activeInput.displayWidth + 2;
    });

    confirmBtn.on("pointerover", () => {
      if (confirmEnabled) confirmBtn.setStyle({ color: "#ffcc00" });
    });
    confirmBtn.on("pointerout", () => {
      if (confirmEnabled) confirmBtn.setStyle({ color: "#ffffff", backgroundColor: "#1a4d1a" });
      else confirmBtn.setStyle({ color: "#888888", backgroundColor: "#555555" });
    });

    confirmBtn.on("pointerdown", async () => {
      if (!confirmEnabled) return;
      const usernameVal = username.value.trim();
      const passwordVal = password.value.trim();
      try {
        await onSubmit(usernameVal, passwordVal);
      } catch (err) {
        messageText.setText("❌ " + err.message);
        messageText.setVisible(false);
        this.time.delayedCall(150, () => messageText.setVisible(true));
      }
    });

    const closeBtn = this.add.text(width / 2 + 220 * scaleFactor, height / 2 - popupHeight / 2 + 40, "✖", {
      fontFamily: "sans-serif",
      fontSize: `${28 * scaleFactor}px`,
      color: "#ff4444",
    }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true });

    closeBtn.on("pointerdown", () => cleanup());

    const cleanup = () => {
      overlay.destroy();
      popup.destroy();
      popupTitle.destroy();
      username.textObj.destroy(); username.box.destroy();
      password.textObj.destroy(); password.box.destroy();
      if (confirmPassword) {
        confirmPassword.textObj.destroy(); confirmPassword.box.destroy();
      }
      messageText.destroy();
      confirmBtn.destroy();
      closeBtn.destroy();
      if (caret) caret.destroy();
      if (this.caretTimer) this.time.removeEvent(this.caretTimer);
      this.popupOpen = false;
      this.input.keyboard.removeAllListeners("keydown");
      this.startBtn.setInteractive({ useHandCursor: true });
      this.loginBtn.setInteractive({ useHandCursor: true });
    };

    updateConfirm();
  }
}

// client/src/StartScene.js
// Scene: Landing screen with login/register popups
import Phaser from "phaser"; // Phaser scene framework

const API = "http://localhost:4000"; // Backend base URL

export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene"); // Scene key
    this.popupOpen = false; // Tracks if a modal is active
    this.caretTimer = null; // Blink timer for faux input caret
  }

  preload() {
    // Core backgrounds
    this.load.image("startscene", "/assets/startscene.png"); // Landing background
    this.load.image("selectscene", "/assets/createscene.png"); // Role select background

    // Character sprites by role
    this.load.image("goalkeeper", "/characters/goalkeeper.png"); // GK sprite
    this.load.image("defender", "/characters/defender.png"); // DEF sprite
    this.load.image("midfielder", "/characters/midfielder.png"); // MID sprite
    this.load.image("attacker", "/characters/attacker.png"); // ATT sprite

    // Role icons
    this.load.image("goalkeeper_icon", "/icons/goalkeeper_icon_128.png"); // GK icon
    this.load.image("defender_icon", "/icons/defender_icon_128.png"); // DEF icon
    this.load.image("midfielder_icon", "/icons/midfielder_icon_128.png"); // MID icon
    this.load.image("attacker_icon", "/icons/attacker_icon_128.png"); // ATT icon
  }

  async create() {
    await document.fonts.ready; // Ensure fonts are available
    const { width, height } = this.scale; // Canvas size
    this.popupOpen = false; // Reset modal flag
    this.caretTimer = null; // Reset caret timer

    // Auto-forward if session token is still valid
    const token = localStorage.getItem("token"); // Read stored token
    if (token) {
      try {
        const res = await fetch(`${API}/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }); // Validate session on backend
        if (res.ok) {
          const data = await res.json(); // User payload
          console.log("User still logged in:", data.user); // Debug info
          this.scene.start("LoginScene"); // Skip to character list
          return; // Stop further setup
        } else {
          console.log("Token invalid or expired, clearing..."); // Log status
          localStorage.removeItem("token"); // Remove bad token
        }
      } catch (err) {
        console.error("Error checking token:", err); // Report failure
      }
    }

    // === Background ===
    this.add.image(width / 2, height / 2, "startscene") // Place background
      .setOrigin(0.5) // Center origin
      .setDisplaySize(width, height); // Scale to canvas

    // === Title ===
    this.add.text(width / 2, 80, "FOOTBALL SAGA", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "120px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 8,
    }).setOrigin(0.5); // Center title

    // === START YOUR JOURNEY Button (Register) ===
    this.startBtn = this.add.text(width / 2, height / 2, "START YOUR JOURNEY", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "60px",
      color: "#fdf5e6",
      backgroundColor: "#0c2f0c",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }); // Register button

    this.startBtn.on("pointerover", () => this.startBtn.setStyle({ color: "#ffcc00" })); // Hover color
    this.startBtn.on("pointerout", () => this.startBtn.setStyle({ color: "#fdf5e6" })); // Reset color
    this.startBtn.on("pointerdown", () => {
      if (!this.popupOpen) {
        this.showRegisterPopup(); // Open register modal
      }
    });

    // === "Already have an account?" label ===
    this.add.text(width - 200, height - 150, "Already have an account?", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "24px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5); // Anchor bottom-right style label

    // === LOG IN Button ===
    this.loginBtn = this.add.text(width - 200, height - 80, "LOG IN", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#fdf5e6",
      backgroundColor: "#0c2f0c",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }); // Login button

    this.loginBtn.on("pointerover", () => this.loginBtn.setStyle({ color: "#ffcc00" })); // Hover color
    this.loginBtn.on("pointerout", () => this.loginBtn.setStyle({ color: "#fdf5e6" })); // Reset color
    this.loginBtn.on("pointerdown", () => {
      if (!this.popupOpen) {
        this.showLoginPopup(); // Open login modal
      }
    });
  }

  // === Login Popup ===
  showLoginPopup() {
    // Reuse the generic auth popup with login logic
    this.showAuthPopup("LOG IN", async (username, password) => {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }); // Send login request
      const data = await res.json(); // Parse response
      if (res.ok) {
        localStorage.setItem("token", data.token); // Store token
        this.scene.start("LoginScene"); // Go to character select
        return true; // Success flag
      } else {
        throw new Error("Invalid credentials"); // Trigger error display
      }
    });
  }

  // === Register Popup ===
  showRegisterPopup() {
    // Reuse the generic auth popup with registration logic
    this.showAuthPopup("REGISTER", async (username, password) => {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }); // Send register request
      const data = await res.json(); // Parse response
      if (res.ok) {
        localStorage.setItem("token", data.token); // Store token
        this.scene.start("RoleSelectScene"); // Go to role selection
        return true; // Success flag
      } else {
        throw new Error(data.error || "Registration failed"); // Show backend error
      }
    });
  }

  // === Shared Popup ===
  showAuthPopup(title, onSubmit) {
    this.popupOpen = true; // Prevent other popups

    // Lock main buttons while modal is active
    this.startBtn.disableInteractive().setStyle({ color: "#fdf5e6" });
    this.loginBtn.disableInteractive().setStyle({ color: "#fdf5e6" });

    const { width, height } = this.scale; // Canvas size
    const scaleFactor = 1.5; // UI scaling factor

    let activeInput = null; // Currently focused field
    let caret = null; // Blinking caret reference

    // Dim background behind modal
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(10);

    const popupHeight = (title === "REGISTER")
      ? 580 // Taller for confirm password
      : 480; // Standard height

    const popup = this.add.rectangle(width / 2, height / 2, 500 * scaleFactor, popupHeight, 0x0c2f0c)
      .setStrokeStyle(4, 0xffffff).setDepth(11); // Modal container

    const popupTitle = this.add.text(
      width / 2,
      height / 2 - popupHeight / 2 + 50,
      title,
      {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: `${48 * scaleFactor}px`,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      }
    ).setOrigin(0.5).setDepth(12); // Modal heading

    // === Input helper ===
    const makeInputBox = (y, placeholder, isPassword = false) => {
      // Simple faux-input with placeholder and basic caret handling
      const box = this.add.rectangle(width / 2, y, 300 * scaleFactor, 50 * scaleFactor, 0xffffff, 1)
        .setStrokeStyle(3, 0x000000).setDepth(11).setInteractive({ useHandCursor: true });

      let value = ""; // Stored text value
      const textObj = this.add.text(width / 2 - 140 * scaleFactor, y, placeholder, {
        fontFamily: '"Arial", sans-serif',
        fontSize: `${24 * scaleFactor}px`,
        color: "#888",
      }).setOrigin(0, 0.5).setDepth(12); // Placeholder text

      box.on("pointerdown", () => {
        focusInput({ textObj, isPassword, get value() { return value; }, setValue: (val) => { value = val; } });
      }); // Focus on click

      return { textObj, box, isPassword, get value() { return value; }, setValue: (val) => { value = val; } };
    };

    const username = makeInputBox(height / 2 - popupHeight / 2 + 150, "Username"); // Username field
    const password = makeInputBox(height / 2 - popupHeight / 2 + 250, "Password", true); // Password field

    // only for REGISTER
    let confirmPassword = null; // Confirmation field placeholder
    if (title === "REGISTER") {
      confirmPassword = makeInputBox(height / 2 - popupHeight / 2 + 350, "Confirm Password", true);
    }

    const messageTextY = (title === "REGISTER")
      ? height / 2 - popupHeight / 2 + 415
      : height / 2 - popupHeight / 2 + 315; // Error/info text position

    const messageText = this.add.text(width / 2, messageTextY, "", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: `${18 * scaleFactor}px`,
      color: "#ff4444",
    }).setOrigin(0.5).setDepth(12).setVisible(false); // Error label

    const confirmBtnY = (title === "REGISTER")
      ? height / 2 - popupHeight / 2 + 500
      : height / 2 - popupHeight / 2 + 400; // Submit button position

    const confirmBtn = this.add.text(width / 2, confirmBtnY, "ENTER", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: `${48 * scaleFactor}px`,
      color: "#888888",
      backgroundColor: "#555555",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true }); // Disabled by default

    // === Focus management (Tab/Enter support) ===
    const inputs = [username, password]; // List of fields
    if (confirmPassword) inputs.push(confirmPassword); // Add confirm field if present
    let focusedIndex = 0; // Index of focused field

    const focusInput = (input) => {
      activeInput = input; // Track focused field
      input.textObj.setText(input.isPassword ? "*".repeat(input.value.length) : input.value || ""); // Mask password
      input.textObj.setColor("#000"); // Active color

      if (caret) caret.destroy(); // Remove old caret
      caret = this.add.text(input.textObj.x + input.textObj.displayWidth + 5, input.textObj.y, "|", {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: `${24 * scaleFactor}px`,
        color: "#000",
      }).setOrigin(0, 0.5).setDepth(12); // New caret

      if (this.caretTimer) this.time.removeEvent(this.caretTimer); // Clear old timer
      this.caretTimer = this.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => caret.setVisible(!caret.visible),
      }); // Blink caret
    };

    let confirmEnabled = false; // Tracks if submit active
    const updateConfirm = () => {
      if (title === "REGISTER") {
        if (username.value.trim() && password.value.trim() && confirmPassword.value.trim() &&
            password.value === confirmPassword.value) {
          confirmEnabled = true; // Enable register
          confirmBtn.setStyle({ color: "#ffffff", backgroundColor: "#1a4d1a" });
        } else {
          confirmEnabled = false; // Disable register
          confirmBtn.setStyle({ color: "#888888", backgroundColor: "#555555" });
        }
      } else {
        if (username.value.trim() && password.value.trim()) {
          confirmEnabled = true; // Enable login
          confirmBtn.setStyle({ color: "#ffffff", backgroundColor: "#1a4d1a" });
        } else {
          confirmEnabled = false; // Disable login
          confirmBtn.setStyle({ color: "#888888", backgroundColor: "#555555" });
        }
      }
    };

    this.input.keyboard.on("keydown", (event) => {
      if (!activeInput) return; // Ignore if no focus

      if (event.key === "Tab") {
        event.preventDefault?.(); // Stop default tabbing
        focusedIndex = (focusedIndex + 1) % inputs.length; // Cycle focus
        focusInput(inputs[focusedIndex]); // Focus next
        return;
      }

      if (event.key === "Enter") {
        if (confirmEnabled) confirmBtn.emit("pointerdown"); // Submit on Enter
        return;
      }

      let newValue = activeInput.value || ""; // Current text
      if (event.key === "Backspace") newValue = newValue.slice(0, -1); // Remove last char
      else if (event.key.length === 1) newValue += event.key; // Add typed char
      activeInput.setValue(newValue); // Store value
      activeInput.textObj.setText(activeInput.isPassword ? "*".repeat(newValue.length) : newValue); // Render text
      updateConfirm(); // Toggle button state
      if (caret) caret.x = activeInput.textObj.x + activeInput.displayWidth + 2; // Move caret
    });

    confirmBtn.on("pointerover", () => {
      if (confirmEnabled) confirmBtn.setStyle({ color: "#ffcc00" }); // Hover highlight
    });
    confirmBtn.on("pointerout", () => {
      if (confirmEnabled) confirmBtn.setStyle({ color: "#ffffff", backgroundColor: "#1a4d1a" });
      else confirmBtn.setStyle({ color: "#888888", backgroundColor: "#555555" }); // Reset hover
    });

    confirmBtn.on("pointerdown", async () => {
      if (!confirmEnabled) return; // Ignore when disabled
      const usernameVal = username.value.trim(); // Final username
      const passwordVal = password.value.trim(); // Final password
      try {
        await onSubmit(usernameVal, passwordVal); // Submit handler
      } catch (err) {
        messageText.setText("Error: " + err.message); // Show error
        messageText.setVisible(false); // Hide then flash
        this.time.delayedCall(150, () => messageText.setVisible(true)); // Flash effect
      }
    });

    const closeBtn = this.add.text(width / 2 + 220 * scaleFactor, height / 2 - popupHeight / 2 + 40, "X", {
      fontFamily: "sans-serif",
      fontSize: `${28 * scaleFactor}px`,
      color: "#ff4444",
    }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true }); // Close control

    closeBtn.on("pointerdown", () => cleanup()); // Close modal

    const cleanup = () => {
      overlay.destroy(); // Remove overlay
      popup.destroy(); // Remove modal
      popupTitle.destroy(); // Remove title
      username.textObj.destroy(); username.box.destroy(); // Remove username field
      password.textObj.destroy(); password.box.destroy(); // Remove password field
      if (confirmPassword) {
        confirmPassword.textObj.destroy(); confirmPassword.box.destroy(); // Remove confirm field
      }
      messageText.destroy(); // Remove message text
      confirmBtn.destroy(); // Remove submit
      closeBtn.destroy(); // Remove close
      if (caret) caret.destroy(); // Remove caret
      if (this.caretTimer) this.time.removeEvent(this.caretTimer); // Stop caret timer
      this.popupOpen = false; // Clear modal flag
      this.input.keyboard.removeAllListeners("keydown"); // Remove key listener
      this.startBtn.setInteractive({ useHandCursor: true }); // Re-enable start
      this.loginBtn.setInteractive({ useHandCursor: true }); // Re-enable login
    };

    updateConfirm(); // Initialize submit state
  }
}

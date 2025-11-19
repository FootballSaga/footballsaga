// client/src/LoginScene.js
import Phaser from "phaser"; // Phaser scene framework

const API = "http://localhost:4000"; // Backend base URL

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super("LoginScene"); // Scene key
  }

  async create() {
    await document.fonts.ready; // Ensure fonts are loaded
    const { width, height } = this.scale; // Canvas dimensions

    const token = localStorage.getItem("token"); // Stored session token
    if (!token) {
      this.scene.start("StartScene"); // No token -> back to start
      return;
    }

    // Header
    this.add.text(width / 2, 35, "SELECT YOUR CHARACTER", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "70px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5, 0);

    // Username status line
    const statusText = this.add.text(width / 2, 140, "Checking user?", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffcc00",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Logout button
    const logoutBtn = this.add.text(width - 120, 80, "LOG OUT", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#fdf5e6",
      backgroundColor: "#8b0000",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    logoutBtn.on("pointerover", () => logoutBtn.setStyle({ color: "#ffcc00" })); // Hover color
    logoutBtn.on("pointerout", () => logoutBtn.setStyle({ color: "#fdf5e6" })); // Reset color
    logoutBtn.on("pointerdown", async () => {
      try {
        await fetch(`${API}/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }); // Attempt logout on backend
      } catch (err) {
        console.error("Logout request failed:", err); // Ignore network error
      }
      localStorage.removeItem("token"); // Clear token locally
      this.scene.start("StartScene"); // Back to start
    });

    // Create new character button
    const createBtn = this.add.text(150, 80, "CREATE NEW", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#0c2f0c",
      stroke: "#000000",
      strokeThickness: 6,
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    createBtn.on("pointerover", () => createBtn.setStyle({ color: "#ffcc00" })); // Hover color
    createBtn.on("pointerout", () => createBtn.setStyle({ color: "#ffffff" })); // Reset color
    createBtn.on("pointerdown", () => this.scene.start("RoleSelectScene")); // Go to role select

    // Load characters
    try {
      // 1) Verify session + get username
      const meRes = await fetch(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) throw new Error("Session invalid");
      const me = await meRes.json();

      statusText.setText(`Logged in as: ${me.user.username}`); // Show username

      // 2) Fetch characters
      const res = await fetch(`${API}/characters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load characters");
      const players = await res.json();

      if (!Array.isArray(players) || players.length === 0) {
        this.add.text(width / 2, height / 2, "No players yet. Click CREATE NEW!", {
          fontFamily: '"Luckiest Guy", sans-serif',
          fontSize: "32px",
          color: "#ffcc00",
          stroke: "#000000",
          strokeThickness: 6,
          backgroundColor: "#00000077",
          padding: { x: 12, y: 8 },
        }).setOrigin(0.5); // Empty state
      } else {
        // Role -> icon mapping
        const roleIcons = {
          goalkeeper: "goalkeeper_icon",
          defender: "defender_icon",
          midfielder: "midfielder_icon",
          attacker: "attacker_icon",
        };

        const cardWidth = 420; // Card width
        const cardHeight = 140; // Card height
        const spacingY = 160; // Vertical spacing per card
        const startY = 250; // Start Y position

        players.forEach((p, i) => {
          const y = startY + i * spacingY; // Compute Y per card

          // card background
          const card = this.add.rectangle(width / 2, y, cardWidth, cardHeight, 0x000000, 0.6)
            .setStrokeStyle(4, 0xffffff)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

          // icon (role-based)
          const iconKey = roleIcons[p.role.toLowerCase()] || "goalkeeper_icon_128"; // Choose icon
          const icon = this.add.image(width / 2 - cardWidth / 2 + 80, y, iconKey)
            .setDisplaySize(128, 128);

          // name text
          const nameText = this.add.text(width / 2 - 50, y - 20, p.name, {
            fontFamily: '"Luckiest Guy", sans-serif',
            fontSize: "40px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 6,
          }).setOrigin(0, 0.5);

          // level text
          const levelText = this.add.text(width / 2 - 50, y + 25, `Lv ${p.level}`, {
            fontFamily: '"Luckiest Guy", sans-serif',
            fontSize: "30px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 6,
          }).setOrigin(0, 0.5);

          // hover highlight (just like other buttons)
          card.on("pointerover", () => {
            nameText.setColor("#ffcc00");
            levelText.setColor("#ffcc00");
          });
          card.on("pointerout", () => {
            nameText.setColor("#ffffff");
            levelText.setColor("#ffffffff");
          });

          // select character
          card.on("pointerdown", () => {
            this.registry.set("characterId", p.character_id); // Store character id
            this.registry.set("playerRoleId", p.role_id); // Store role id
            this.registry.set("playerName", p.name); // Store name
            this.scene.start("HubScene"); // Go to hub
          });

          // delete button
          const delBtn = this.add.text(width / 2 + cardWidth / 2 - 30, y - 40, "X", {
            fontFamily: "sans-serif",
            fontSize: "40px",
            color: "#ff4444",
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });

          // hover effect
          delBtn.on("pointerover", () => {
            delBtn.setStyle({ color: "#ff8888" }); // lighter red
            this.tweens.add({
              targets: delBtn,
              scale: 1.3,
              duration: 150,
              ease: "Back.easeOut",
            });
          });
          delBtn.on("pointerout", () => {
            delBtn.setStyle({ color: "#ff4444" }); // back to normal
            this.tweens.add({
              targets: delBtn,
              scale: 1,
              duration: 150,
              ease: "Sine.easeIn",
            });
          });

          delBtn.on("pointerdown", async () => {
            try {
              const delRes = await fetch(`${API}/characters/${p.character_id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (delRes.ok) {
                this.scene.restart(); // refresh list
              } else {
                console.error("Delete failed");
              }
            } catch (e) {
              console.error("Delete error:", e);
            }
          });
        });
      }
    } catch (e) {
      console.error(e);
      statusText.setText("Session invalid. Please log in again.");
      localStorage.removeItem("token");
      this.time.delayedCall(1200, () => this.scene.start("StartScene"));
    }
  }
}

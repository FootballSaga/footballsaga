import Phaser from "phaser";

const API = "http://localhost:4000";

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super("LoginScene");
  }

  async create() {
    await document.fonts.ready;
    const { width, height } = this.scale;

    this.add.text(width / 2, 50, "SELECT YOUR PLAYER", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "48px",
      color: "#ffffff",
    }).setOrigin(0.5, 0);

    try {
      const res = await fetch(`${API}/players`);
      const players = await res.json();

      if (players.length === 0) {
        this.add.text(width / 2, height / 2, "No players yet. Create one!", {
          fontFamily: '"Luckiest Guy", sans-serif',
          fontSize: "32px",
          color: "#ffcc00",
        }).setOrigin(0.5);
      } else {
        players.forEach((p, i) => {
          const y = 150 + i * 70;

          // Player text
// Player text (now shows level as well)
        const txt = this.add.text(
          width / 2 - 40,
          y,
          `${p.username} (${p.role}) Lv ${p.level}`,   // 🟢 Added Lv X
          {
            fontFamily: '"Luckiest Guy", sans-serif',
            fontSize: "36px",
            color: "#ffffff",
            backgroundColor: "#00000088",
            padding: { x: 12, y: 6 },
          }
        )
        .setOrigin(0.5).setInteractive({ useHandCursor: true });

          txt.on("pointerover", () => txt.setStyle({ color: "#ffcc00" }));
          txt.on("pointerout", () => txt.setStyle({ color: "#ffffff" }));
          txt.on("pointerdown", () => {
            this.registry.set("playerId", p.id);
            this.registry.set("playerRole", p.role);
            this.scene.start("HubScene");
          });

          // ❌ Delete button
          const delBtn = this.add.text(width / 2 + 200, y, "❌", {
            fontFamily: "sans-serif",
            fontSize: "28px",
            color: "#ff4444",
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });

          delBtn.on("pointerdown", async () => {
            await fetch(`${API}/players/${p.id}`, { method: "DELETE" });
            this.scene.restart(); // reload the list after deletion
          });
        });
      }
    } catch (e) {
      console.error(e);
      this.add.text(width / 2, height / 2, "⚠️ Failed to load players", {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "32px",
        color: "#ff8080",
      }).setOrigin(0.5);
    }

    // Back button
    const backBtn = this.add.text(80, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#ffcc00" }));
    backBtn.on("pointerout", () => backBtn.setStyle({ color: "#ffffff" }));
    backBtn.on("pointerdown", () => {
      this.scene.start("StartScene");
    });

    // ⭐ New "Create New Character" button
    const createBtn = this.add.text(width - 160, height - 60, "CREATE NEW", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#0c2f0c",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    createBtn.on("pointerover", () => createBtn.setStyle({ color: "#ffcc00" }));
    createBtn.on("pointerout", () => createBtn.setStyle({ color: "#ffffff" }));    
    createBtn.on("pointerdown", () => {
      this.scene.start("RoleSelectScene");
    });
  }
}

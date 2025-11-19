// client/src/TrainingScene.js
// Scene: Choose and start a training, manage tickets/whistles.
import Phaser from "phaser";
const API = "http://localhost:4000"; // Backend base URL

export default class TrainingScene extends Phaser.Scene {
  constructor() {
    super("TrainingScene"); // Scene key
    this.playerId = null; // Active character ID
    this.ticketsText = null; // Ticket counter text
    this.trainingButtons = []; // Training option buttons
    this.claimBtn = null; // Convert whistle to ticket UI
    this.isStartingTraining = false; // Prevent duplicate start
  }

  preload() {
    this.load.image("training_bg", "/assets/training_ground.png"); // Background
    this.load.image("ticket_icon", "/icons/ticket.png"); // Ticket icon
    this.load.image("whistle_icon", "/icons/whistle.png"); // Whistle icon
  }

  async create() {
    const { width, height } = this.scale; // Canvas size
    this.playerId = this.registry.get("characterId"); // Active character ID
    const token = localStorage.getItem("token"); // Auth token

    this.isStartingTraining = false; // Reset flag

    // If training is active -> go to progress scene instead
    const res = await fetch(`${API}/characters/${this.playerId}/active-training`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.active) {
      this.scene.start("TrainingProgressScene", {
        training: data.training
      }); // Redirect to progress
      return;
    }

    // Background
    this.add.image(width / 2, height / 2, "training_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // Title
    this.add.text(width / 2, 50, "TRAINING GROUNDS", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "60px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Tickets HUD box
    this.add.rectangle(width / 2 + 450, 55, 150, 60, 0x0c2f0c, 0.95)
      .setStrokeStyle(3, 0xffffff)
      .setOrigin(0.5);

    this.add.image(width / 2 + 410, 55, "ticket_icon")
      .setDisplaySize(64, 64)
      .setOrigin(0.5);

    this.ticketsText = this.add.text(width / 2 + 450, 15, "...", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "60px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0, 0);

    // === Claim button (Whistle -> Ticket)
    this.claimBtn = this.add.container(width / 2 + 350, 125); // Container for claim UI

    const claimBg = this.add.rectangle(100, 10, 320, 70, 0x0c2f0c, 0.95).setStrokeStyle(3, 0xffffff);

    const leftText = this.add.text(0, 7, "Get", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#fdf5e6",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    const ticketMiniIcon = this.add.image(77, 10, "ticket_icon")
      .setDisplaySize(64, 64)
      .setOrigin(0.5);

    const parenLeft = this.add.text(110, -23, "( 1", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "50px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    });

    const whistleMiniIcon = this.add.image(190, 10, "whistle_icon")
      .setDisplaySize(64, 64)
      .setOrigin(0.5);

    const parenRight = this.add.text(220, -23, ")", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "50px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    });

    this.claimBtn.add([
      claimBg,
      leftText,
      ticketMiniIcon,
      parenLeft,
      whistleMiniIcon,
      parenRight,
    ]);

    this.claimBtn.setSize(320, 70);
    this.claimBtn.setInteractive({ useHandCursor: true });

    this.claimBtn.on("pointerover", () => {
      leftText.setColor("#ffcc00");
      parenLeft.setColor("#ffcc00");
      parenRight.setColor("#ffcc00");
    });

    this.claimBtn.on("pointerout", () => {
      leftText.setColor("#fdf5e6");
      parenLeft.setColor("#fdf5e6");
      parenRight.setColor("#fdf5e6");
    });

    this.claimBtn.on("pointerdown", async () => {
      await this.convertWhistleToTicket(); // Convert currency
    });

    // state logic for claim button
    this.setClaimState = (tickets, whistles) => {
      const canConvert = tickets < 10 && whistles > 0;
      const isMax = tickets >= 10;
      const noWhistles = tickets < 10 && whistles <= 0;

      if (isMax) {
        this.claimBtn.disableInteractive();
        claimBg.setFillStyle(0x444444, 1);
        leftText.setText("Max").setColor("#ff4444").setFontSize(50);
        leftText.setPosition(60, 7);
        ticketMiniIcon.setPosition(150, 10);
        whistleMiniIcon.setVisible(false);
        parenLeft.setVisible(false);
        parenRight.setVisible(false);
      } else if (canConvert) {
        this.claimBtn.setInteractive({ useHandCursor: true });
        claimBg.setFillStyle(0x0c2f0c, 0.95);
        leftText.setText("Get").setColor("#fdf5e6").setFontSize(50);
        whistleMiniIcon.setVisible(true);
        ticketMiniIcon.setVisible(true);
        parenLeft.setVisible(true);
        parenRight.setVisible(true);
      } else if (noWhistles) {
        this.claimBtn.disableInteractive();
        claimBg.setFillStyle(0x444444, 1);
        leftText.setText("0").setColor("#ffffff").setFontSize(60);
        leftText.setPosition(75, 5);
        whistleMiniIcon.setPosition(125, 10);
        ticketMiniIcon.setVisible(false);
        parenLeft.setVisible(false);
        parenRight.setVisible(false);
      }
    };

    // Load 3 training options (backend handles per-day logic)
    await this.renderTrainings();

    // Back Button to HubScene
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
    backBtn.on("pointerdown", () => this.scene.start("HubScene")); // Return to hub
  }

  async renderTrainings() {
    try {
      const token = localStorage.getItem("token"); // Token

      // Always ask backend; it decides if options change or not
      const optRes = await fetch(`${API}/characters/${this.playerId}/training-options`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!optRes.ok) {
        console.error("Failed /training-options"); // Log failure
        return;
      }

      const data = await optRes.json();
      const options = data.options; // Array of 3 options

      // Fetch updated player state (tickets, whistles)
      const playersRes = await fetch(`${API}/characters`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!playersRes.ok) return console.error("Failed /players"); // Bail if failure

      const players = await playersRes.json();
      const player = players.find(p => p.character_id === Number(this.playerId)); // Find active
      if (!player) return console.error("No player match"); // Not found

      this.ticketsText.setText(player.tickets || 0); // Show tickets
      this.setClaimState(player.tickets, player.whistles); // Update claim UI

      // Clear old buttons
      this.trainingButtons.forEach(b => b.destroy());
      this.trainingButtons = [];

      // Render the 3 options
      const startY = 200; // First option Y
      options.forEach((training, i) => {
        const btn = this.add.text(
          this.scale.width / 2,
          startY + i * 100,
          `${training.name} (${training.duration}s)`,
          {
            fontFamily: '"Luckiest Guy", sans-serif',
            fontSize: "32px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 6,
            backgroundColor: "#0c2f0c",
            padding: { x: 20, y: 10 },
          }
        )
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        btn.on("pointerover", () => btn.setStyle({ color: "#ffcc00" })); // Hover color
        btn.on("pointerout", () => btn.setStyle({ color: "#fdf5e6" })); // Reset color
        btn.on("pointerdown", () => this.startTraining(training.id)); // Start training

        this.trainingButtons.push(btn); // Track button
      });

      this.setButtonsEnabled(player.tickets > 0); // Enable if tickets available
    } catch (e) {
      console.error("Failed to render trainings:", e); // Log error
    }
  }

  async startTraining(trainingListId) {
    const token = localStorage.getItem("token"); // Token

    if (this.isStartingTraining) return; // Prevent double-click
    this.isStartingTraining = true;

    this.setButtonsEnabled(false); // Disable buttons while starting

    await fetch(`${API}/characters/${this.playerId}/start-training`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ trainingListId }),
    });

    this.scene.start("TrainingProgressScene", { trainingListId }); // Go to progress
  }

  async convertWhistleToTicket() {
    const token = localStorage.getItem("token"); // Token

    try {
      const res = await fetch(`${API}/characters/${this.playerId}/whistle-to-ticket`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Could not convert whistle:", err.error || res.status);
        this.isStartingTraining = false;
        this.setButtonsEnabled(true);
        return;
      }

      const data = await res.json();
      const character = data.character; // Updated character

      this.ticketsText.setText(character.tickets || 0); // Update tickets
      this.setClaimState(character.tickets, character.whistles); // Update claim UI
      this.setButtonsEnabled(character.tickets > 0); // Enable if tickets > 0

    } catch (e) {
      console.error("whistle-to-ticket request failed:", e); // Log error
    }
  }

  setButtonsEnabled(enabled) {
    this.trainingButtons.forEach((btn) => {
      if (enabled) {
        btn.setInteractive().setStyle({ backgroundColor: "#0c2f0c", color: "#ffffff" }); // Enable style
      } else {
        btn.disableInteractive().setStyle({ backgroundColor: "#555", color: "#777" }); // Disabled style
      }
    });
  }
}

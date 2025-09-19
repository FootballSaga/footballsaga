import Phaser from "phaser";
const API = "http://localhost:4000";

export default class TrainingScene extends Phaser.Scene {
  constructor() {
    super("TrainingScene");
    this.playerId = null;
    this.ticketsText = null;
    this.trainingButtons = [];
    this.claimBtn = null;
  }

  preload() {
    this.load.image("training_bg", "/assets/training_ground.png");
    this.load.image("ticket_icon", "/icons/ticket.png");
    this.load.image("whistle_icon", "/icons/whistle.png");
  }

  async create() {
    const { width, height } = this.scale;
    this.playerId = this.registry.get("playerId");

    // --- Background
    this.add.image(width / 2, height / 2, "training_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // --- Title
    this.add.text(width / 2, 50, "TRAINING GROUNDS", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "48px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // --- Tickets HUD box
    this.add.rectangle(width / 2 + 350, 55, 150, 60, 0x0c2f0c, 0.95)
      .setStrokeStyle(3, 0xffffff)
      .setOrigin(0.5);

    this.add.image(width / 2 + 310, 55, "ticket_icon")
      .setDisplaySize(64, 64)
      .setOrigin(0.5);

    this.ticketsText = this.add.text(width / 2 + 360, 18, "...", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "60px",
      color: "#ffffff",
    }).setOrigin(0, 0);

    // === Claim button content & logic ===
    this.claimBtn = this.add.container(width / 2 + 350, 125);

    const claimBg = this.add.rectangle(0, 10, 320, 70, 0x0c2f0c, 0.95)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const leftText = this.add.text(-150, -13, "Get", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#ffffff",
    });

    const ticketMiniIcon = this.add.image(-40, 10, "ticket_icon")
      .setDisplaySize(64, 64)
      .setOrigin(0.5);

    const parenLeft = this.add.text(20, -20, "( 1", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "50px",
      color: "#ffffff",
    });

    const whistleMiniIcon = this.add.image(100, 10, "whistle_icon")
      .setDisplaySize(64, 64)
      .setOrigin(0.5);

    const parenRight = this.add.text(130, -20, ")", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "50px",
      color: "#ffffff",
    });

    this.claimBtn.add([claimBg, leftText, ticketMiniIcon, parenLeft, whistleMiniIcon, parenRight]);

    claimBg.on("pointerover", () => {
      if (claimBg.input && claimBg.input.enabled) leftText.setColor("#ffcc00");
    });
    claimBg.on("pointerout", () => {
      if (claimBg.input && claimBg.input.enabled) leftText.setColor("#ffffff");
    });
    claimBg.on("pointerdown", async () => {
      if (!(claimBg.input && claimBg.input.enabled)) return;
      await this.convertWhistleToTicket();
    });

    this.setClaimState = (tickets, whistles) => {
      const canConvert = tickets < 10 && whistles > 0;
      const isMax = tickets >= 10;
      const noWhistles = tickets < 10 && whistles <= 0;

      if (isMax) {
        claimBg.setFillStyle(0x444444, 1);
        claimBg.disableInteractive();
        leftText.setText("Max").setColor("#ff4444").setFontSize(40).setX(-80).setY(-13);
        ticketMiniIcon.setVisible(true).setX(40).setY(10);
        parenLeft.setVisible(false);
        whistleMiniIcon.setVisible(false);
        parenRight.setVisible(false);
      } else if (canConvert) {
        claimBg.setFillStyle(0x1f4d1f, 1);
        claimBg.setInteractive({ useHandCursor: true });
        leftText.setText("Get").setColor("#ffffff").setFontSize(40).setX(-150).setY(-13);
        ticketMiniIcon.setVisible(true).setX(-40).setY(10);
        parenLeft.setVisible(true).setText("( 1").setX(20).setY(-20);
        whistleMiniIcon.setVisible(true).setX(100).setY(10);
        parenRight.setVisible(true).setText(")").setX(130).setY(-20);
      } else if (noWhistles) {
        claimBg.setFillStyle(0x444444, 1);
        claimBg.disableInteractive();
        leftText.setText("0").setColor("#888888").setFontSize(60).setX(-50).setY(-27);
        whistleMiniIcon.setVisible(true).setX(25).setY(10);
        ticketMiniIcon.setVisible(false);
        parenLeft.setVisible(false);
        parenRight.setVisible(false);
      }
    };

    // Render available trainings dynamically:
    await this.renderTrainings();

    // --- Back button
    const backBtn = this.add.text(80, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive();
    backBtn.on("pointerdown", () => this.scene.start("HubScene"));

    this.events.once("shutdown", () => { this.trainingButtons = []; });
    this.events.on("wake", () => this.renderTrainings());
  }

  async renderTrainings() {
    try {
      const res = await fetch(`${API}/players/${this.playerId}`);
      const player = await res.json();

      this.ticketsText.setText(player.tickets || 0);
      this.setClaimState(player.tickets, player.whistles);

      // Clear old buttons
      this.trainingButtons.forEach(b => b.destroy());
      this.trainingButtons = [];

      if (!player.available_trainings) return;
      const available = JSON.parse(player.available_trainings);

      const startY = 200;
      available.forEach((type, i) => {
        const btn = this.add.text(this.scale.width / 2, startY + i * 100, this.formatTrainingLabel(type), {
          fontFamily: '"Luckiest Guy", sans-serif',
          fontSize: "32px",
          color: "#ffffff",
          backgroundColor: "#0c2f0c",
          padding: { x: 20, y: 10 },
        }).setOrigin(0.5);

        btn.setInteractive({ useHandCursor: true });
        btn.on("pointerover", () => btn.setStyle({ color: "#ffcc00" }));
        btn.on("pointerout", () => btn.setStyle({ color: "#ffffff" }));
        btn.on("pointerdown", () => this.startTraining(type));

        this.trainingButtons.push(btn);
      });

      this.setButtonsEnabled(player.tickets > 0);
    } catch (e) {
      console.error("Failed to fetch trainings:", e);
    }
  }

  formatTrainingLabel(type) {
    switch (type) {
      case "gym": return "GYM 🏋️";
      case "running": return "RUNNING 🏃";
      case "ball": return "BALL ⚽";
      case "goalkeeper_special": return "SAVING 🧤";
      case "defender_special": return "TACKLING 🛡️";
      case "midfielder_special": return "VISION 👁️";
      case "attacker_special": return "SHOOTING 🎯"; // ✅ fix spelling
      default: return type.toUpperCase();
    }
  }


  setButtonsEnabled(enabled) {
    this.trainingButtons.forEach((btn) => {
      if (enabled) {
        btn.setStyle({ backgroundColor: "#0c2f0c", color: "#ffffff" });
        btn.setInteractive({ useHandCursor: true });
      } else {
        btn.setStyle({ backgroundColor: "#444444", color: "#888888" });
        btn.disableInteractive();
      }
    });
  }

  async convertWhistleToTicket() {
    try {
      const res = await fetch(`${API}/players/${this.playerId}/whistle-to-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await this.renderTrainings();
    } catch (e) {
      console.error("Error converting whistle:", e);
      await this.renderTrainings();
    }
  }

  async startTraining(type) {
    try {
      const res = await fetch(`${API}/players/${this.playerId}/start-training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) this.scene.start(this.getTrainingScene(type));
    } catch (e) {
      console.error("Error starting training:", e);
    }
  }

  getTrainingScene(type) {
    switch (type) {
      case "gym": return "GymScene";
      case "running": return "RunningScene";
      case "ball": return "BallScene";
      case "goalkeeper_special": return "SavingScene";
      case "defender_special": return "TacklingScene";
      case "midfielder_special": return "VisionScene";
      case "attacker_special": return "ShootingScene";
      default: return "TrainingScene";
    }
  }
}

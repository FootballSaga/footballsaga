// client/src/TrainingScene.js
import Phaser from "phaser";
const API = "http://localhost:4000";

export default class TrainingScene extends Phaser.Scene {
  constructor() {
    super("TrainingScene");
    this.playerId = null;
    this.ticketsText = null;
    this.trainingButtons = [];
    this.claimBtn = null; // [ADDED] container for the whistle→ticket button
  }

  preload() {
    this.load.image("training_bg", "/assets/training_ground.png");
    this.load.image("ticket_icon", "/icons/ticket.png");
    this.load.image("whistle_icon", "/icons/whistle.png"); // [ADDED]
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
    // Layout target strings:
    //  1) "Get [ticket_icon] ([whistle_icon])"
    //  2) "Max [ticket_icon]"
    //  3) "0 [whistle_icon]"

    this.claimBtn = this.add.container(width / 2 + 350, 125);

    const claimBg = this.add.rectangle(0, 10, 320, 70, 0x0c2f0c, 0.95) // wider for text + icons
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    // pieces we’ll toggle:
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

    // helper: set visuals per state (WITH explicit positions & sizes in each branch)
    this.setClaimState = (tickets, whistles) => {
      const canConvert = tickets < 10 && whistles > 0;
      const isMax = tickets >= 10;
      const noWhistles = tickets < 10 && whistles <= 0;

      if (isMax) {
        // === "Max [ticket_icon]" — KEEPING YOUR CURRENT LAYOUT ===
        claimBg.setFillStyle(0x444444, 1);
        claimBg.disableInteractive();

        leftText
          .setText("Max")
          .setColor("#ff4444")
          .setFontSize(40)    // size for "Max"
          .setX(-80).setY(-13);

        ticketMiniIcon
          .setVisible(true)
          .setDisplaySize(64, 64) // size for ticket in "Max"
          .setX(40).setY(10);

        // hide extras
        parenLeft.setVisible(false);
        whistleMiniIcon.setVisible(false);
        parenRight.setVisible(false);

      } else if (canConvert) {
        // === "Get [ticket_icon] ( 1 [whistle_icon] )" — KEEPING YOUR CURRENT LAYOUT ===
        claimBg.setFillStyle(0x1f4d1f, 1);
        claimBg.setInteractive({ useHandCursor: true });

        leftText
          .setText("Get")
          .setColor("#ffffff")
          .setFontSize(40)     // size for "Get"
          .setX(-150).setY(-13);

        ticketMiniIcon
          .setVisible(true)
          .setDisplaySize(64, 64) // size for ticket in "Get"
          .setX(-40).setY(10);

        parenLeft
          .setVisible(true)
          .setText("( 1")
          .setFontSize(50)     // size for "("
          .setX(20).setY(-20);

        whistleMiniIcon
          .setVisible(true)
          .setDisplaySize(64, 64) // size for whistle in "Get"
          .setX(100).setY(10);

        parenRight
          .setVisible(true)
          .setText(")")
          .setFontSize(50)     // size for ")"
          .setX(130).setY(-20);

      } else if (noWhistles) {
        // === "0 [whistle_icon]" — EXPLICIT POSITIONS & SIZES HERE ===
        claimBg.setFillStyle(0x444444, 1);
        claimBg.disableInteractive();

        leftText
          .setText("0")
          .setColor("#888888")
          .setFontSize(60)     // 👈 adjust size for "0" here
          .setX(-50).setY(-27); // 👈 adjust position for "0" here

        whistleMiniIcon
          .setVisible(true)
          .setDisplaySize(64, 64) // 👈 adjust size for whistle here
          .setX(25).setY(10);     // 👈 adjust position for whistle here

        // hide the rest
        ticketMiniIcon.setVisible(false);
        parenLeft.setVisible(false);
        parenRight.setVisible(false);

      } else {
        // fallback safe default (disabled)
        claimBg.setFillStyle(0x444444, 1);
        claimBg.disableInteractive();

        leftText
          .setText("Get")
          .setColor("#888888")
          .setFontSize(40)
          .setX(-150).setY(-13);

        ticketMiniIcon.setVisible(true).setDisplaySize(64, 64).setX(-40).setY(10);
        parenLeft.setVisible(true).setText("( 1").setFontSize(50).setX(20).setY(-20);
        whistleMiniIcon.setVisible(true).setDisplaySize(64, 64).setX(100).setY(10);
        parenRight.setVisible(true).setText(")").setFontSize(50).setX(130).setY(-20);
      }
    };
    // === end claim button ===

    // --- Training options
    const trainings = [
      { label: "GYM 🏋️", type: "gym", y: 200 },
      { label: "RUNNING 🏃", type: "running", y: 300 },
      { label: "BALL ⚽", type: "ball", y: 400 },
    ];

    this.trainingButtons = [];
    trainings.forEach((t) => {
      const btn = this.add.text(width / 2, t.y, t.label, {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "32px",
        color: "#ffffff",
        backgroundColor: "#0c2f0c",
        padding: { x: 20, y: 10 },
      }).setOrigin(0.5);

      btn.setInteractive({ useHandCursor: true });
      btn.on("pointerover", () => {
        if (btn.input && btn.input.enabled) btn.setStyle({ color: "#ffcc00" });
      });
      btn.on("pointerout", () => {
        if (btn.input && btn.input.enabled) btn.setStyle({ color: "#ffffff" });
      });
      btn.on("pointerdown", () => {
        if (btn.input && btn.input.enabled) this.startTraining(t.type);
      });

      this.trainingButtons.push(btn);
    });

    // --- Back button
    const backBtn = this.add.text(80, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive();
    backBtn.on("pointerdown", () => this.scene.start("HubScene"));

    // defaults: disabled until fetch resolves
    this.setButtonsEnabled(false);
    this.setClaimState(10, 0); // look like MAX by default until we fetch

    await this.refreshTickets();

    this.events.once("shutdown", () => { this.trainingButtons = []; });
    this.events.on("wake", () => this.refreshTickets());
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

  // --- Refresh tickets and update button states
  async refreshTickets() {
    if (!this.playerId) {
      this.ticketsText?.setText("?");
      this.setButtonsEnabled(false);
      this.setClaimState(10, 0);
      return;
    }
    try {
      const res = await fetch(`${API}/players/${this.playerId}`);
      const player = await res.json();

      const tickets = parseInt(player.tickets, 10) || 0;
      const whistles = parseInt(player.whistles, 10) || 0;

      this.ticketsText.setText(tickets);
      this.setButtonsEnabled(tickets > 0);
      this.setClaimState(tickets, whistles);
    } catch (e) {
      console.error("Failed to fetch tickets:", e);
      this.setButtonsEnabled(false);
      this.setClaimState(10, 0);
    }
  }

  // consume 1 whistle -> +1 ticket (backend enforces max 10)
  async convertWhistleToTicket() {
    try {
      const res = await fetch(`${API}/players/${this.playerId}/whistle-to-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        console.warn("Convert failed:", data?.error || res.statusText);
        await this.refreshTickets();
        return;
      }

      const tickets = parseInt(data.player.tickets, 10) || 0;
      this.ticketsText.setText(tickets);
      this.setButtonsEnabled(tickets > 0);
      await this.refreshTickets(); // to reflect new whistles count + state
    } catch (e) {
      console.error("Error converting whistle:", e);
      await this.refreshTickets();
    }
  }

  // --- Start training
  async startTraining(type) {
    const current = parseInt(this.ticketsText?.text, 10);
    if (Number.isFinite(current) && current <= 0) return;

    try {
      const res = await fetch(`${API}/players/${this.playerId}/start-training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();

      if (res.ok) {
        const tickets = parseInt(data.player.tickets, 10) || 0;
        this.ticketsText.setText(tickets);
        this.setButtonsEnabled(tickets > 0);
        this.scene.start(this.getTrainingScene(type));
      } else {
        await this.refreshTickets();
      }
    } catch (e) {
      console.error("Error starting training:", e);
      await this.refreshTickets();
    }
  }

  getTrainingScene(type) {
    switch (type) {
      case "gym": return "GymScene";
      case "running": return "RunningScene";
      case "ball": return "BallScene";
      default: return "TrainingScene";
    }
  }
}

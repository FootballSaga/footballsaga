import Phaser from "phaser";

export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload() {
    this.load.image("startscene", "/assets/startscene.png");}

  async create() {
    await document.fonts.ready;

    const { width, height } = this.scale;

    // Stadium background
    this.add.image(width / 2, height / 2, "startscene")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // Title
    this.add.text(this.scale.width / 2, 60, "FOTBALL SAGA", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "120px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    // --- Log In button ---
    const loginBtn = this.add.text(this.scale.width - 150, 1010, "LOG IN", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "40px",
      color: "#fdf5e6",                // off-white text
      backgroundColor: "#0c2f0c",      // dark green background
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    loginBtn.on("pointerover", () => loginBtn.setStyle({ color: "#ffcc00" }));
    loginBtn.on("pointerout", () => loginBtn.setStyle({ color: "#ffffff" }));
    loginBtn.on("pointerdown", () => this.scene.start("LoginScene"));

    this.add.text(this.scale.width - 150, 950, "Already have an account?", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "22px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // --- Create New button ---
    const createBtn = this.add.text(this.scale.width / 2, this.scale.height / 2 , " START YOUR CAREER", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "60px",
      color: "#fdf5e6",                // off-white text
      backgroundColor: "#0c2f0c",      // dark green background
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    createBtn.on("pointerover", () => createBtn.setStyle({ color: "#ffcc00" }));
    createBtn.on("pointerout", () => createBtn.setStyle({ color: "#ffffff" }));
    createBtn.on("pointerdown", () => this.scene.start("RoleSelectScene"));
  }
}

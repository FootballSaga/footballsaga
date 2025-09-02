import Phaser from "phaser";

export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  async create() {
    await document.fonts.ready; // ✅ ensure Luckiest Guy is loaded

    // Title
    this.add.text(this.scale.width / 2, 120, "Fotball Saga", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "64px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // Log In button
    const loginBtn = this.add.text(this.scale.width / 2, 280, "LOG IN", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "36px",
      color: "#ffffff",
      backgroundColor: "#00000088",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive();

    loginBtn.on("pointerdown", () => this.scene.start("LoginScene"));

    // Create New button
    const createBtn = this.add.text(this.scale.width / 2, 380, "CREATE NEW", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "36px",
      color: "#ffffff",
      backgroundColor: "#00000088",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive();

    createBtn.on("pointerdown", () => this.scene.start("RoleSelectScene"));
  }
}

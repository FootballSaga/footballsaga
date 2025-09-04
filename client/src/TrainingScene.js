import Phaser from "phaser";

export default class TrainingScene extends Phaser.Scene {
  constructor() {
    super("TrainingScene");
  }

  preload() {
    this.load.image("training_bg", "/assets/training_ground.png");
  }

  create() {
    const { width, height } = this.scale;

    this.add.image(width / 2, height / 2, "training_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    this.add.text(width / 2, 50, "TRAINING GROUNDS", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "48px",
      color: "#ffffff",
    }).setOrigin(0.5);

    const trainings = [
      { label: "GYM 🏋️", scene: "GymScene", y: 200 },
      { label: "RUNNING 🏃", scene: "RunningScene", y: 300 },
      { label: "BALL ⚽", scene: "BallScene", y: 400 },
    ];

    trainings.forEach((t) => {
      const btn = this.add.text(width / 2, t.y, t.label, {
        fontFamily: '"Luckiest Guy", sans-serif',
        fontSize: "32px",
        color: "#ffffff",
        backgroundColor: "#0c2f0c",
        padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => btn.setStyle({ color: "#ffcc00" }));
      btn.on("pointerout", () => btn.setStyle({ color: "#ffffff" }));
      btn.on("pointerdown", () => this.scene.start(t.scene));
    });

    // Back button
    const backBtn = this.add.text(80, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive();

    backBtn.on("pointerdown", () => this.scene.start("HubScene"));
  }
}

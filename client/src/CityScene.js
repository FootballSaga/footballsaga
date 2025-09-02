// client/src/CityScene.js
import Phaser from "phaser";

export default class CityScene extends Phaser.Scene {
  constructor() {
    super("CityScene");
  }

  preload() {
    // ⭐ Load the city background
    this.load.image("city_bg", "/city.png"); // <-- save your city image as /public/city.png
  }

  create() {
    const { width, height } = this.scale;

    // ⭐ Background city image
    this.add.image(width / 2, height / 2, "city_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // Title
    this.add.text(width / 2, 30, "YOUR FOOTBALL CITY", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "48px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);

    // ⭐ Create clickable zones for each building
    this.createBuildingZone(width * 0.18, height * 0.65, "Stadium", "StadiumScene");
    this.createBuildingZone(width * 0.42, height * 0.62, "Academy", "AcademyScene");
    this.createBuildingZone(width * 0.62, height * 0.72, "Training Pitch", "TrainingScene");
    this.createBuildingZone(width * 0.82, height * 0.62, "Bank", "BankScene");

    // Back to login button
    this.add.text(60, height - 40, "LOGOUT", {
      fontFamily: "Luckiest Guy, sans-serif",
      fontSize: "26px",
      color: "#ff4444",
      backgroundColor: "#000000aa",
      padding: { x: 12, y: 6 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.registry.remove("playerId");
        this.scene.start("LoginScene");
      });
  }

  // ⭐ Reusable function for clickable buildings
  createBuildingZone(x, y, label, targetScene) {
    const zone = this.add.rectangle(x, y, 200, 150, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    // Hover effect
    zone.on("pointerover", () => {
      this.add.text(x, y - 80, label, {
        fontFamily: "Luckiest Guy, sans-serif",
        fontSize: "28px",
        color: "#ffff00",
        stroke: "#000000",
        strokeThickness: 6
      }).setOrigin(0.5).setDepth(5).setName("hoverLabel");
    });

    zone.on("pointerout", () => {
      this.children.getAll("name", "hoverLabel").forEach(obj => obj.destroy());
    });

    // Click to change scene
    zone.on("pointerdown", () => {
      this.scene.start(targetScene);
    });
  }
}

// client/src/KickScene.js
import Phaser from "phaser";

export default class KickScene extends Phaser.Scene {
  constructor() {
    super("KickScene");
  }

  preload() {
    // Načtení animovaného WebP (stačí jako obrázek)
    this.load.video("kick_vid", "/assets/animations/animace_60fps.mp4", "loadeddata", true);
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor("#1b2b3b");

    const vid = this.add.video(width / 2, height / 2, "kick_vid");
    vid.setScale(1);
    vid.play(true); // true = loop

    // Tlačítko zpět
    const backBtn = this.add.text(80, 40, "← Back", {
      fontFamily: '"Luckiest Guy", sans-serif',
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "#7a1f1f",
      padding: { x: 10, y: 5 },
      stroke: "#000000",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#ffcc00" }));
    backBtn.on("pointerout", () => backBtn.setStyle({ color: "#ffffff" }));
    backBtn.on("pointerdown", () => {
      this.scene.start("HubScene");
    });
  }
}
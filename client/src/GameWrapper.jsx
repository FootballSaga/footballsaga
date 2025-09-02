// client/src/GameWrapper.jsx
import React, { useEffect, useRef } from "react";

export default function GameWrapper() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && window.phaserGame) {
      // Attach Phaser canvas into this React container
      containerRef.current.appendChild(window.phaserGame.canvas);
    }

    return () => {
      if (containerRef.current && window.phaserGame?.canvas) {
        try {
          containerRef.current.removeChild(window.phaserGame.canvas);
        } catch (e) {
          // Already detached
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    />
  );
}

// App.jsx
import { useEffect, useState } from "react";
import GameWrapper from "./GameWrapper";

const API = "http://localhost:4000";

export default function App() {
  const [players, setPlayers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/players`);
      const data = await res.json();
      setPlayers(data);
      if (data.length > 0) setActiveId(data[0].id);
    })();
  }, []);

  function handleCreated(player) {
    setPlayers(prev => [...prev, player]);
    setActiveId(player.id);
    setCreating(false);
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GameWrapper
        playerId={activeId}
        creating={creating}
        onCreated={handleCreated}
      />
    </div>
  );
}

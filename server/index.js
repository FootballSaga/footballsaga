// backend/index.js
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "strikersaga",
  password: "Dervin330",
  port: 5432,
});

const app = express();
app.use(cors());
app.use(express.json());

// --- Training Config ---
const trainings = {
  gym:     { duration: 30, rewards: { xp: 10, dollars: 0 } },
  running: { duration: 45, rewards: { xp: 5,  dollars: 5 } },
  ball:    { duration: 60, rewards: { xp: 15, dollars: 0 } },
};

const DAILY_TICKETS = 10; // [REFERENCE] daily max we're enforcing for top-up

// --- Reset tickets if needed ---
async function resetTicketsIfNeeded(playerId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const result = await pool.query(
    `UPDATE players
     SET tickets = $1, last_ticket_reset = $2
     WHERE id = $3
       AND (last_ticket_reset IS NULL OR last_ticket_reset < $2)
     RETURNING *`,
    [DAILY_TICKETS, today, playerId]
  );

  if (result.rows.length > 0) return result.rows[0];

  const fresh = await pool.query("SELECT * FROM players WHERE id = $1", [playerId]);
  return fresh.rows[0];
}

// --- ROUTES ---

app.get("/", (_req, res) => res.json({ message: "Striker Saga backend running!" }));

// Create new player (unchanged; your DB default handles whistles=15)
app.post("/players", async (req, res) => {
  const { username, role } = req.body;
  if (!username || !role) return res.status(400).json({ error: "username and role are required" });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `INSERT INTO players (username, role, level, xp, dollars, strength, speed, stamina, tickets, last_ticket_reset)
       VALUES ($1, $2, 1, 0, 0, 1, 1, 1, $3, $4)
       RETURNING *`,
      [username, role, DAILY_TICKETS, today]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create player error:", err);
    res.status(500).json({ error: "Could not create player" });
  }
});

// Get all players
app.get("/players", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM players ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Get players error:", err);
    res.status(500).json({ error: "Could not fetch players" });
  }
});

// Get single player
app.get("/players/:id", async (req, res) => {
  try {
    let player = await resetTicketsIfNeeded(req.params.id);
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(player);
  } catch (err) {
    console.error("Get player error:", err);
    res.status(500).json({ error: "Could not fetch player" });
  }
});

// Start training (auto-uses ticket)
app.post("/players/:id/start-training", async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  const t = trainings[type];
  if (!t) return res.status(400).json({ error: "Invalid training type" });

  try {
    let player = await resetTicketsIfNeeded(id);
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (player.tickets <= 0) return res.status(400).json({ error: "No tickets left today" });
    if (player.training_end && new Date(player.training_end) > new Date())
      return res.status(400).json({ error: "Already training" });

    const endTime = new Date(Date.now() + t.duration * 1000);

    const updated = await pool.query(
      `UPDATE players
       SET training_end = $1, last_training = $2, tickets = tickets - 1
       WHERE id = $3
       RETURNING *`,
      [endTime, type, id]
    );

    res.json({ message: "Training started", player: updated.rows[0] });
  } catch (err) {
    console.error("Start training error:", err);
    res.status(500).json({ error: "Could not start training" });
  }
});

// Finish training
app.post("/players/:id/finish-training", async (req, res) => {
  const { id } = req.params;

  try {
    let playerRes = await pool.query("SELECT * FROM players WHERE id = $1", [id]);
    if (playerRes.rows.length === 0) return res.status(404).json({ error: "Player not found" });
    let player = playerRes.rows[0];

    if (!player.training_end || new Date(player.training_end) > new Date())
      return res.status(400).json({ error: "Training not finished yet" });

    const rewards = trainings[player.last_training]?.rewards || { xp: 0, dollars: 0 };

    let updated = await pool.query(
      `UPDATE players
       SET xp = xp + $1,
           dollars = dollars + $2,
           training_end = NULL,
           last_training = NULL
       WHERE id = $3
       RETURNING *`,
      [rewards.xp, rewards.dollars, id]
    );

    player = updated.rows[0];

    // Level-up loop
    let xpNeeded = player.level * 100;
    while (player.xp >= xpNeeded) {
      const newLevel = player.level + 1;
      const leftoverXp = player.xp - xpNeeded;
      const lvlUp = await pool.query(
        "UPDATE players SET level = $1, xp = $2 WHERE id = $3 RETURNING *",
        [newLevel, leftoverXp, id]
      );
      player = lvlUp.rows[0];
      xpNeeded = player.level * 100;
    }

    res.json(player);
  } catch (err) {
    console.error("Finish training error:", err);
    res.status(500).json({ error: "Could not finish training" });
  }
});

// === [ADDED] Convert 1 whistle -> +1 ticket (only if tickets < 10) ===
app.post("/players/:id/whistle-to-ticket", async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await pool.query(
      `UPDATE players
       SET whistles = whistles - 1,
           tickets  = tickets + 1
       WHERE id = $1 AND whistles > 0 AND tickets < 10   -- [ADDED] guard: cannot exceed 10
       RETURNING *`,
      [id]
    );

    if (updated.rows.length === 0) {
      // [ADDED] informative error if max or no whistles
      // We can check current to be explicit:
      const cur = await pool.query("SELECT tickets, whistles FROM players WHERE id = $1", [id]);
      if (cur.rows.length === 0) return res.status(404).json({ error: "Player not found" });
      const { tickets, whistles } = cur.rows[0];
      if (tickets >= 10) return res.status(400).json({ error: "Cannot exceed max tickets" });
      if (whistles <= 0) return res.status(400).json({ error: "No whistles available" });
      // Fallback:
      return res.status(400).json({ error: "Cannot convert whistle to ticket" });
    }

    res.json({ message: "Converted whistle to ticket", player: updated.rows[0] });
  } catch (err) {
    console.error("Whistle->ticket error:", err);
    res.status(500).json({ error: "Could not convert whistle to ticket" });
  }
});
// === end new route ===

const PORT = 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

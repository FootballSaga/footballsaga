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

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Striker Saga backend running!" });
});

// Create a new player
app.post("/players", async (req, res) => {
  const { username, role } = req.body;
  if (!username || !role) {
    return res.status(400).json({ error: "username and role are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO players (username, role, level, xp, dollars, strength, speed, stamina)
       VALUES ($1, $2, 1, 0, 0, 1, 1, 1)
       RETURNING *`,
      [username, role]
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

// ⭐ NEW: Get a single player by ID
app.get("/players/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM players WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get player error:", err);
    res.status(500).json({ error: "Could not fetch player" });
  }
});

// Delete player
app.delete("/players/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM players WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Player not found" });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("Delete player error:", err);
    res.status(500).json({ error: "Could not delete player" });
  }
});

// --- Training Config ---
const trainings = {
  gym:     { duration: 30, rewards: { strength: 2, xp: 10, dollars: 0 } },
  running: { duration: 45, rewards: { stamina: 2, xp: 5,  dollars: 5 } },
  ball:    { duration: 60, rewards: { speed: 2,   xp: 15, dollars: 0 } },
};

// Start training
app.post("/players/:id/start-training", async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  const t = trainings[type];
  if (!t) return res.status(400).json({ error: "Invalid training type" });

  try {
    const playerRes = await pool.query("SELECT * FROM players WHERE id = $1", [id]);
    const player = playerRes.rows[0];
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (player.training_end && new Date(player.training_end) > new Date()) {
      return res.status(400).json({ error: "Already training" });
    }

    const endTime = new Date(Date.now() + t.duration * 1000);

    await pool.query(
      "UPDATE players SET training_end = $1, last_training = $2 WHERE id = $3",
      [endTime, type, id]
    );

    res.json({ message: "Training started", endTime });
  } catch (err) {
    console.error("Start training error:", err);
    res.status(500).json({ error: "Could not start training" });
  }
});

// ⭐ FIXED: Finish training (with level-up check)
app.post("/players/:id/finish-training", async (req, res) => {
  const { id } = req.params;

  try {
    const playerRes = await pool.query("SELECT * FROM players WHERE id = $1", [id]);
    let player = playerRes.rows[0];
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!player.training_end || new Date(player.training_end) > new Date()) {
      return res.status(400).json({ error: "Training not finished yet" });
    }

    const rewards = trainings[player.last_training]?.rewards || { strength: 0, xp: 0, dollars: 0 };

    // Apply rewards
    let updated = await pool.query(
      `UPDATE players
       SET strength = strength + $1,
           xp = xp + $2,
           dollars = dollars + $3,
           training_end = NULL,
           last_training = NULL
       WHERE id = $4
       RETURNING *`,
      [rewards.strength || 0, rewards.xp || 0, rewards.dollars || 0, id]
    );

    player = updated.rows[0];

    // ⭐ Handle multiple level-ups
    let xpNeeded = player.level * 100;
    while (player.xp >= xpNeeded) {
      const newLevel = player.level + 1;
      const leftoverXp = player.xp - xpNeeded;

      const lvlUp = await pool.query(
        "UPDATE players SET level = $1, xp = $2 WHERE id = $3 RETURNING *",
        [newLevel, leftoverXp, id]
      );
      player = lvlUp.rows[0];

      xpNeeded = player.level * 100; // recalc for next level
    }

    res.json(player);
  } catch (err) {
    console.error("Finish training error:", err);
    res.status(500).json({ error: "Could not finish training" });
  }
});

// Gain XP manually (kept for debugging)
app.post("/players/:id/xp", async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  try {
    let player = await pool.query(
      "UPDATE players SET xp = xp + $1 WHERE id = $2 RETURNING *",
      [amount, id]
    );
    if (player.rowCount === 0) return res.status(404).json({ error: "Player not found" });

    player = player.rows[0];

    // ⭐ Reuse same level-up logic
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
    console.error("XP update error:", err);
    res.status(500).json({ error: "Could not update XP" });
  }
});

// Earn/Spend Dollars
app.post("/players/:id/money", async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  try {
    const result = await pool.query(
      "UPDATE players SET dollars = dollars + $1 WHERE id = $2 RETURNING *",
      [amount, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Player not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Money update error:", err);
    res.status(500).json({ error: "Could not update dollars" });
  }
});

// Start server
const PORT = 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

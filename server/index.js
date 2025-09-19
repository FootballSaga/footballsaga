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
  gym: { duration: 30 },
  running: { duration: 45 },
  ball: { duration: 60 },
  goalkeeper_special: { duration: 60 },
  defender_special: { duration: 60 },
  midfielder_special: { duration: 60 },
  attacker_special: { duration: 60 },
};

const DAILY_TICKETS = 10;

function generateTrainingsForPlayer(role) {
  const baseTrainings = ["gym", "running", "ball"];
  const special = {
    goalkeeper: "goalkeeper_special",
    defender: "defender_special",
    midfielder: "midfielder_special",
    attacker: "attacker_special",
  }[role];

  const shuffled = baseTrainings.sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, 2);
  return JSON.stringify([...chosen, special]);
}

// --- Reset tickets if needed ---
async function resetTicketsIfNeeded(playerId) {
  const today = new Date().toISOString().slice(0, 10);
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

// Create new player
app.post("/players", async (req, res) => {
  const { username, role } = req.body;
  if (!username || !role) return res.status(400).json({ error: "username and role are required" });

  try {
    const today = new Date().toISOString().slice(0, 10);
    let initialSpecial = 1;

    const result = await pool.query(
      `INSERT INTO players (username, role, level, xp, dollars, strength, speed, stamina, special_stat, tickets, last_ticket_reset, available_trainings)
       VALUES ($1, $2, 1, 0, 0, 1, 1, 1, $3, $4, $5, $6)
       RETURNING *`,
      [username, role, initialSpecial, DAILY_TICKETS, today, generateTrainingsForPlayer(role)]
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

    if (!player.available_trainings) {
      const newTrainings = generateTrainingsForPlayer(player.role);
      await pool.query(
        "UPDATE players SET available_trainings = $1 WHERE id = $2",
        [newTrainings, player.id]
      );
      player.available_trainings = newTrainings;
    }
    res.json(player);
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
    if (result.rows.length === 0) return res.status(404).json({ error: "Player not found" });
    res.json({ message: "Player deleted", player: result.rows[0] });
  } catch (err) {
    console.error("Delete player error:", err);
    res.status(500).json({ error: "Could not delete player" });
  }
});

// Start training
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

// Finish training (returns reward details)
app.post("/players/:id/finish-training", async (req, res) => {
  const { id } = req.params;

  try {
    let playerRes = await pool.query("SELECT * FROM players WHERE id = $1", [id]);
    if (playerRes.rows.length === 0) return res.status(404).json({ error: "Player not found" });
    let player = playerRes.rows[0];

    if (!player.training_end || new Date(player.training_end) > new Date())
      return res.status(400).json({ error: "Training not finished yet" });

    const L = Number(player.level);

    // XP calculation
    const xpNeeded = 50 * (L ** 2) + 100 * L;
    const questsPerLevel = Math.round(1.5 * Math.sqrt(L) * 10) / 10;
    const baseXpPerQuest = Math.round(xpNeeded / questsPerLevel);
    const randomFactorXP = 1 + (Math.random() - 0.5) * 0.2;
    const xpPerQuest = Math.max(1, Math.round(baseXpPerQuest * randomFactorXP));

    // Dollars
    const baseDollars = 50;
    const growthPerLevel = 5;
    const dollarsBeforeRandom = baseDollars + growthPerLevel * (L - 1);
    const randomFactorDollars = 1 + (Math.random() - 0.5) * 0.2;
    const dollarsGained = Math.max(1, Math.round(dollarsBeforeRandom * randomFactorDollars));

    // Stat gains + stat name for frontend
    let strengthGain = 0, speedGain = 0, staminaGain = 0, specialGain = 0;
    let lastStatGain = null;

    switch (player.last_training) {
      case "gym":
        strengthGain = L;
        lastStatGain = { name: "Strength", value: strengthGain };
        break;
      case "running":
        speedGain = L;
        lastStatGain = { name: "Speed", value: speedGain };
        break;
      case "ball":
        staminaGain = L;
        lastStatGain = { name: "Stamina", value: staminaGain };
        break;
      case "goalkeeper_special":
        specialGain = L;
        lastStatGain = { name: "Goalkeeping", value: specialGain };
        break;
      case "defender_special":
        specialGain = L;
        lastStatGain = { name: "Tackling", value: specialGain };
        break;
      case "midfielder_special":
        specialGain = L;
        lastStatGain = { name: "Vision", value: specialGain };
        break;
      case "attacker_special":
        specialGain = L;
        lastStatGain = { name: "Shooting", value: specialGain };
        break;
    }

    // Update player
    let updated = await pool.query(
      `UPDATE players
       SET xp = xp + $1,
           dollars = dollars + $2,
           strength = strength + $3,
           speed = speed + $4,
           stamina = stamina + $5,
           special_stat = special_stat + $6,
           training_end = NULL,
           last_training = NULL,
           available_trainings = NULL
       WHERE id = $7
       RETURNING *`,
      [xpPerQuest, dollarsGained, strengthGain, speedGain, staminaGain, specialGain, id]
    );

    player = updated.rows[0];

    // Level-up loop
    let xpNeededNext = 50 * Math.pow(player.level, 2) + 100 * player.level;
    while (player.xp >= xpNeededNext) {
      const newLevel = player.level + 1;
      const leftoverXp = player.xp - xpNeededNext;

      const lvlUpRes = await pool.query(
        "UPDATE players SET level = $1, xp = $2 WHERE id = $3 RETURNING *",
        [newLevel, leftoverXp, id]
      );

      player = lvlUpRes.rows[0];
      xpNeededNext = 50 * Math.pow(player.level, 2) + 100 * player.level;
    }

    // Return player + reward details
    res.json({
      ...player,
      lastXpGain: xpPerQuest,
      lastDollarGain: dollarsGained,
      lastStatGain // 👈 structured object {name, value}
    });

  } catch (err) {
    console.error("Finish training error:", err);
    res.status(500).json({ error: "Could not finish training" });
  }
});

// Whistle → ticket
app.post("/players/:id/whistle-to-ticket", async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await pool.query(
      `UPDATE players
       SET whistles = whistles - 1,
           tickets  = tickets + 1
       WHERE id = $1 AND whistles > 0 AND tickets < 10
       RETURNING *`,
      [id]
    );

    if (updated.rows.length === 0) {
      const cur = await pool.query("SELECT tickets, whistles FROM players WHERE id = $1", [id]);
      if (cur.rows.length === 0) return res.status(404).json({ error: "Player not found" });
      const { tickets, whistles } = cur.rows[0];
      if (tickets >= 10) return res.status(400).json({ error: "Cannot exceed max tickets" });
      if (whistles <= 0) return res.status(400).json({ error: "No whistles available" });
      return res.status(400).json({ error: "Cannot convert whistle to ticket" });
    }

    res.json({ message: "Converted whistle to ticket", player: updated.rows[0] });
  } catch (err) {
    console.error("Whistle->ticket error:", err);
    res.status(500).json({ error: "Could not convert whistle to ticket" });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

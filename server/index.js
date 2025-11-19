require("dotenv").config({ path: "./database.env" });
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json());

// --- Test route ---
app.get("/", (_req, res) => {
  res.json({ message: "Backend connected to Supabase 🎉" });
});

// ======================== AUTH ========================

// --- Register new client ---
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    // Hash password
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    // Insert into DB
    const result = await pool.query(
      `INSERT INTO client (username, password_hash, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, username, created_at`,
      [username, hash]
    );

    const client = result.rows[0];

    // === AUTO-LOGIN STEP ===
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await pool.query(
      `INSERT INTO sessions (client_id, token, created_at, expires_at)
       VALUES ($1, $2, NOW(), $3) `,
      [client.id, token, expiresAt]
    );

    // Return token + client info
    res.json({
      message: "Registered successfully",
      token,
      client,
    });

  } catch (err) {
    console.error("❌ Register error:", err);
    if (err.code === "23505") {
      // duplicate username
      return res.status(400).json({ error: "Username already taken" });
    }
    res.status(500).json({ error: "Could not register" });
  }
});

// --- Login existing client ---
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    // 1. Find client
    const clientRes = await pool.query(
      `SELECT * FROM client WHERE username = $1`,
      [username]
    );
    if (clientRes.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const client = clientRes.rows[0];

    // 2. Verify password
    const valid = await bcrypt.compare(password, client.password_hash);
    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // 3. Create session token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await pool.query(
      `INSERT INTO sessions (client_id, token, created_at, expires_at)
       VALUES ($1, $2, NOW(), $3)`,
      [client.id, token, expiresAt]
    );

    // 4. Return token + client info
    res.json({
      message: "Login successful",
      token,
      client: { id: client.id, username: client.username }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Could not log in" });
  }
});

// Create check for existence of token
async function checkAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    const sessionRes = await pool.query(
      `SELECT s.*, c.id as client_id, c.username
       FROM sessions s
       JOIN client c ON c.id = s.client_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(403).json({ error: "Invalid or expired session" });
    }

    req.user = {
      id: sessionRes.rows[0].client_id,
      username: sessionRes.rows[0].username,
    };
    req.sessionId = sessionRes.rows[0].id;

    next();
  } catch (err) {
    console.error("❌ Auth check error:", err);
    res.status(500).json({ error: "Auth check failed" });
  }
}

// --- Validation of session ---
app.get("/me", checkAuth, (req, res) => {
  res.json({ user: req.user });
});

// --- Logout ---
app.post("/logout", checkAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM sessions WHERE id = $1`, [req.sessionId]);
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("❌ Logout error:", err);
    res.status(500).json({ error: "Could not log out" });
  }
});

// --- Get all roles ---
app.get("/roles", async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM role ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Get roles error:", err);
    res.status(500).json({ error: "Could not fetch roles" });
  }
});

// --- Create new character for logged-in client ---
app.post("/characters", checkAuth, async (req, res) => {
  const { roleId, name } = req.body;

  if (!roleId || !name) {
    return res.status(400).json({ error: "roleId and name are required" });
  }

  try {
    // Create character linked to logged-in client
    const charRes = await pool.query(
      `INSERT INTO "character" (client_id, role_id, name, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [req.user.id, roleId, name]
    );

    res.json({ message: "Character created successfully", character: charRes.rows[0] });
  } catch (err) {
    console.error("❌ Create character error:", err.message);

    if (err.code === "23505") {
      // unique violation → name already taken
      return res.status(400).json({ error: "Name already taken" });
    }

    res.status(500).json({ error: "Could not create character", details: err.message });
  }
});

// --- Get all characters for logged-in client ---
app.get("/characters", checkAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ch.id AS character_id,
        ch.name,
        r.name AS role,
        ch.role_id,
        ch.level,
        ch.xp,
        ch.dollars,
        ch.strength,
        ch.speed,
        ch.stamina,
        ch.special_stat,
        ch.whistles,
        ch.tickets,
        ch.created_at AS character_created,
        ch.last_ticket_reset
      FROM "character" ch
      JOIN role r ON r.id = ch.role_id
      WHERE ch.client_id = $1
        AND ch.deleted = FALSE
      ORDER BY ch.id ASC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Get characters error:", err);
    res.status(500).json({ error: "Could not fetch characters" });
  }
});

// --- Delete a character by ID (only if it belongs to logged-in client) ---
app.delete("/characters/:id", checkAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE "character"
       SET deleted = TRUE, deleted_at = NOW()
       WHERE id = $1 AND client_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Character not found or not yours" });
    }

    res.json({ message: "Character deleted", character: result.rows[0] });
  } catch (err) {
    console.error("❌ Delete character error:", err);
    res.status(500).json({ error: "Could not delete character" });
  }
});

// Reset TICKET
app.get("/characters/reset_tickets", checkAuth, async (req, res) => {
  try {
    await pool.query(`
      UPDATE "character"
      SET tickets = 10, last_ticket_reset = CURRENT_DATE
      WHERE client_id = $1
        AND deleted = FALSE
        AND (last_ticket_reset IS NULL OR last_ticket_reset < CURRENT_DATE)
    `, [req.user.id]);

    const result = await pool.query(`
      SELECT ch.*, r.name AS role
      FROM "character" ch
      JOIN role r ON r.id = ch.role_id
      WHERE ch.client_id = $1
        AND ch.deleted = FALSE
      ORDER BY ch.id ASC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Get my characters error:", err);
    res.status(500).json({ error: "Could not fetch characters" });
  }
});

// --- Convert 1 whistle into 1 ticket for this character ---
app.post("/characters/:id/whistle-to-ticket", checkAuth, async (req, res) => {
  const { id } = req.params; // character_id

  try {
    // 1. Make sure character belongs to this client
    const charRes = await pool.query(
      `SELECT * FROM "character"
       WHERE id = $1 AND client_id = $2 AND deleted = FALSE`,
      [id, req.user.id]
    );

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: "Character not found or not yours" });
    }

    const ch = charRes.rows[0];

    // 2. Check if conversion is allowed
    if (ch.tickets >= 10) {
      return res.status(400).json({ error: "Already at max tickets" });
    }

    if (ch.whistles <= 0) {
      return res.status(400).json({ error: "No whistles to convert" });
    }

    // 3. Do the conversion
    const updRes = await pool.query(
      `UPDATE "character"
       SET whistles = whistles - 1,
           tickets  = tickets + 1
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const updated = updRes.rows[0];

    res.json({
      message: "Converted 1 whistle into 1 ticket",
      character: updated,
    });
  } catch (err) {
    console.error("❌ whistle-to-ticket error:", err);
    res.status(500).json({ error: "Could not convert whistle" });
  }
});

// funkce pro získání 3 možných tréninků
async function generateTrainingOptionsForCharacter(roleId) {
  const res = await pool.query(
    `SELECT t.id, t.name, t.training_stat, t.duration, t.mandatory
     FROM character_training_option cto
     JOIN training_list t ON t.id = cto.training_list_id
     WHERE cto.role_id = $1`,
    [roleId]
  );
  const all = res.rows;

  const mandatory = all.filter(t => t.mandatory);
  const normal = all.filter(t => !t.mandatory);

  if (mandatory.length === 0) {
    throw new Error("No mandatory training for this role");
  }

  const chosenMandatory = mandatory[Math.floor(Math.random() * mandatory.length)];

  let chosenNormals = [];
  if (normal.length <= 2) {
    chosenNormals = normal;
  } else {
    chosenNormals = normal.sort(() => Math.random() - 0.5).slice(0, 2);
  }

  return [chosenMandatory, ...chosenNormals];
}

// logika pro získávání 3 tréninků (1x mandatory + 2x random normal)
// nový den = nové options; jinak se držíme toho co je v character tabulce
app.get("/characters/:id/training-options", checkAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Character validation + retrieve stored options + whether they are for TODAY
    const charRes = await pool.query(
      `SELECT 
         role_id,
         training_option1,
         training_option2,
         training_option3,
         training_options_date,
         (training_options_date = CURRENT_DATE) AS has_today
       FROM "character"
       WHERE id = $1 AND client_id = $2 AND deleted = FALSE`,
      [id, req.user.id]
    );

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: "Character not found or not yours" });
    }

    const char = charRes.rows[0];
    const roleId = char.role_id;

    // 2. Same day AND we already have 3 stored options → reuse them
    if (
      char.has_today &&
      char.training_option1 &&
      char.training_option2 &&
      char.training_option3
    ) {
      const optionIds = [
        char.training_option1,
        char.training_option2,
        char.training_option3
      ];

      const optionsRes = await pool.query(
        `SELECT id, name, training_stat, duration, mandatory
         FROM training_list
         WHERE id = ANY($1::int[])
         ORDER BY array_position($1::int[], id)`,
        [optionIds]
      );

      return res.json({ options: optionsRes.rows });
    }

    // 3. Otherwise generate new options and store them with today's date (CURRENT_DATE)
    const options = await generateTrainingOptionsForCharacter(roleId);

    await pool.query(
      `UPDATE "character"
       SET training_option1 = $1,
           training_option2 = $2,
           training_option3 = $3,
           training_options_date = CURRENT_DATE
       WHERE id = $4`,
      [options[0].id, options[1].id, options[2].id, id]
    );

    return res.json({ options });

  } catch (err) {
    console.error("❌ Training options error:", err);
    res.status(500).json({ error: "Could not fetch training options" });
  }
});

// --- Start training ---
// (does NOT touch training options, only consumes ticket + creates log)
app.post("/characters/:id/start-training", checkAuth, async (req, res) => {
  const { id } = req.params;              // character_id
  const { trainingListId } = req.body;    // chosen training

  try {
    const charRes = await pool.query(
      `SELECT * FROM "character" WHERE id = $1 AND client_id = $2 AND deleted = FALSE`,
      [id, req.user.id]
    );
    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: "Character not found or not yours" });
    }
    const character = charRes.rows[0];

    const activeRes = await pool.query(
      `SELECT 1 FROM training_log
      WHERE character_id = $1
        AND xp_gained IS NULL
      LIMIT 1`,
      [id]
    );

    if (activeRes.rows.length > 0) {
    return res.status(400).json({ error: "Training already in progress" });
    }

    if (character.tickets <= 0) {
      return res.status(400).json({ error: "No tickets left today" });
    }

    const trainingRes = await pool.query(
      `SELECT * FROM training_list WHERE id = $1`,
      [trainingListId]
    );
    if (trainingRes.rows.length === 0) {
      return res.status(400).json({ error: "Invalid training type" });
    }
    const training = trainingRes.rows[0];

    const startTime = new Date();
    const finishTime = new Date(startTime.getTime() + training.duration * 1000);

    const logRes = await pool.query(
      `INSERT INTO training_log (character_id, training_list_id, started_at, finished_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, trainingListId, startTime, finishTime]
    );
    const log = logRes.rows[0];

    await pool.query(
      `UPDATE "character" SET tickets = tickets - 1 WHERE id = $1`,
      [id]
    );

    res.json({
      message: "Training started",
      log,
      tickets_left: character.tickets - 1,
    });
  } catch (err) {
    console.error("❌ Start training error:", err);
    res.status(500).json({ error: "Could not start training" });
  }
});

// --- Get active training state ---
app.get("/characters/:id/active-training", checkAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const charRes = await pool.query(
      `SELECT id FROM "character" WHERE id = $1 AND client_id = $2 AND deleted = FALSE`,
      [id, req.user.id]
    );
    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: "Character not found or not yours" });
    }

    const logRes = await pool.query(
      `SELECT * FROM training_log
       WHERE character_id = $1 AND xp_gained IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [id]
    );

    if (logRes.rows.length === 0) {
      return res.json({ active: false });
    }

    const log = logRes.rows[0];

    const trainingRes = await pool.query(
      `SELECT * FROM training_list WHERE id = $1`,
      [log.training_list_id]
    );
    const training = trainingRes.rows[0];

    res.json({
      active: true,
      training: {
        ...training,
        started_at: log.started_at,
        finished_at: log.finished_at,
      },
    });
  } catch (err) {
    console.error("❌ Active training error:", err);
    res.status(500).json({ error: "Could not fetch active training" });
  }
});

// --- Cancel training and refund ticket (no new options here) ---
app.post("/characters/:id/cancel-training", checkAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const charRes = await pool.query(
      `SELECT id, tickets FROM "character"
       WHERE id = $1 AND client_id = $2 AND deleted = FALSE`,
      [id, req.user.id]
    );

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: "Character not found or not yours" });
    }

    let currentTickets = charRes.rows[0].tickets;

    const activeRes = await pool.query(
      `SELECT id
       FROM training_log
       WHERE character_id = $1
         AND xp_gained IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [id]
    );

    if (activeRes.rows.length === 0) {
      return res.json({ canceled: false, message: "No active training" });
    }

    const logId = activeRes.rows[0].id;

    await pool.query(`DELETE FROM training_log WHERE id = $1`, [logId]);

    const newTicketAmount = currentTickets + 1;

    await pool.query(
      `UPDATE "character"
       SET tickets = $1
       WHERE id = $2`,
      [newTicketAmount, id]
    );

    res.json({
      canceled: true,
      tickets: newTicketAmount,
    });
  } catch (err) {
    console.error("❌ Cancel training error:", err);
    res.status(500).json({ error: "Could not cancel training" });
  }
});

// --- Finish training ---
app.post("/characters/:id/finish-training", checkAuth, async (req, res) => {
  const { id } = req.params; // character_id

  try {
    // 1. Ensure character belongs to this client
    const charRes = await pool.query(
      `SELECT * FROM "character" WHERE id = $1 AND client_id = $2 AND deleted = FALSE`,
      [id, req.user.id]
    );
    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: "Character not found or not yours" });
    }
    let player = charRes.rows[0];
    const L = Number(player.level);

    // 2. Find latest unfinished training
    const logRes = await pool.query(
      `SELECT * FROM training_log
       WHERE character_id = $1
         AND xp_gained IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [id]
    );

    if (logRes.rows.length === 0) {
      return res.status(404).json({ error: "No ongoing training found" });
    }

    const log = logRes.rows[0];

    // 3. Ensure training finished
    const now = new Date();
    if (new Date(log.finished_at) > now) {
      return res.status(400).json({ error: "Training not finished yet" });
    }

    // 4. Get training info
    const trainingRes = await pool.query(
      `SELECT * FROM training_list WHERE id = $1`,
      [log.training_list_id]
    );
    const training = trainingRes.rows[0];

    // === XP + dollars + stat gain as you already had ===
    const xpNeeded = 50 * (L ** 2) + 100 * L;
    const questsPerLevel = Math.round(1.5 * Math.sqrt(L) * 10) / 10;
    const baseXpPerQuest = Math.round(xpNeeded / questsPerLevel);
    const randomFactorXP = 1 + (Math.random() - 0.5) * 0.2;
    const xpPerQuest = Math.max(1, Math.round(baseXpPerQuest * randomFactorXP));

    const baseDollars = 50;
    const growthPerLevel = 5;
    const dollarsBeforeRandom = baseDollars + growthPerLevel * (L - 1);
    const randomFactorDollars = 1 + (Math.random() - 0.5) * 0.2;
    const dollarsGained = Math.max(1, Math.round(dollarsBeforeRandom * randomFactorDollars));

    const statColumn = training.training_stat.toLowerCase();
    let statGain = 1 * L;
    let statUpdateSql = "";
    switch (statColumn) {
      case "strength":
      case "speed":
      case "stamina":
        statUpdateSql = `${statColumn} = ${statColumn} + $3`;
        break;
      default:
        statUpdateSql = `special_stat = special_stat + $3`;
    }

    const updateCharRes = await pool.query(
      `UPDATE "character"
       SET xp = xp + $1,
           dollars = dollars + $2,
           ${statUpdateSql}
       WHERE id = $4
       RETURNING *`,
      [xpPerQuest, dollarsGained, statGain, id]
    );
    player = updateCharRes.rows[0];

    // Level-up loop
    let xpNeededNext = 50 * Math.pow(player.level, 2) + 100 * player.level;
    while (player.xp >= xpNeededNext) {
      const leftoverXp = player.xp - xpNeededNext;
      const lvlUpRes = await pool.query(
        `UPDATE "character"
         SET level = $1, xp = $2
         WHERE id = $3
         RETURNING *`,
        [player.level + 1, leftoverXp, id]
      );
      player = lvlUpRes.rows[0];
      xpNeededNext = 50 * Math.pow(player.level, 2) + 100 * player.level;
    }

    const updateRes = await pool.query(
      `UPDATE training_log
       SET xp_gained = $1,
           dollars_gained = $2,
           stats_gained = $3
       WHERE id = $4
       RETURNING *`,
      [xpPerQuest, dollarsGained, statGain, log.id]
    );
    const updatedLog = updateRes.rows[0];

    // generate new 3 training options after finishing, for TODAY (CURRENT_DATE) ===
    const newOptions = await generateTrainingOptionsForCharacter(player.role_id);

    await pool.query(
      `UPDATE "character"
       SET training_option1 = $1,
           training_option2 = $2,
           training_option3 = $3,
           training_options_date = CURRENT_DATE
       WHERE id = $4`,
      [newOptions[0].id, newOptions[1].id, newOptions[2].id, id]
    );

    res.json({
      message: "Training finished",
      rewards: {
        xpPerQuest,
        dollarsGained,
        statGained: { stat: training.training_stat, value: statGain },
      },
      log: updatedLog,
      player
    });
  } catch (err) {
    console.error("❌ Finish training error:", err);
    res.status(500).json({ error: "Could not finish training" });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

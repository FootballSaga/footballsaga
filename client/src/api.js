export const API = "http://localhost:4000";

export async function getPlayers() {
  const res = await fetch(`${API}/players`);
  return res.json();
}

export async function createPlayer(username, role) {
  const res = await fetch(`${API}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, role }),
  });
  if (!res.ok) throw new Error("Create failed");
  return res.json();
}

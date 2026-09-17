import { collect, json, readSnapshot, saveSnapshot } from "./_lib.mjs";

export default async () => {
  try {
    let snapshot = await readSnapshot();
    const age = snapshot ? Date.now() - new Date(snapshot.generatedAt).getTime() : Infinity;

    // Serve cache quickly. Refresh if there is no snapshot or it is older than 5 minutes.
    if (!snapshot || age > 5 * 60 * 1000) {
      try {
        snapshot = await collect();
        await saveSnapshot(snapshot);
      } catch (refreshError) {
        if (!snapshot) throw refreshError;
        snapshot.stale = true;
        snapshot.refreshError = refreshError.message;
      }
    }
    return json(snapshot);
  } catch (error) {
    return json({ error: "GiveFlpps backend unavailable", message: error.message, hint: "Open /api/health to diagnose the Netlify Function and SteamGifts connection." }, 502);
  }
};
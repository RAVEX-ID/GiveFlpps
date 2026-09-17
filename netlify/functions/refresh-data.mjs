import { collect, json, saveSnapshot } from "./_lib.mjs";

export default async () => {
  try {
    const snapshot = await collect();
    await saveSnapshot(snapshot);
    return json({ ok: true, generatedAt: snapshot.generatedAt, activeCount: snapshot.activeCount });
  } catch (error) {
    return json({ ok: false, error: error.message }, 502);
  }
};
import { readSnapshot, json } from "./_lib.mjs";
export default async () => {
  const snapshot = await readSnapshot();
  return json({
    ok: true,
    service: "GiveFlpps",
    cache: Boolean(snapshot),
    generatedAt: snapshot?.generatedAt || null,
    ageSeconds: snapshot ? Math.floor((Date.now() - new Date(snapshot.generatedAt).getTime()) / 1000) : null
  });
};
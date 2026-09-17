import { fetchPage } from "./_lib.mjs";

export default async () => {
  const started = Date.now();
  try {
    const result = await fetchPage(1);
    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify({
        ok: true,
        steamgifts: true,
        endpoint: result.endpoint,
        page: result.page,
        perPage: result.perPage,
        items: result.list.length,
        latencyMs: Date.now() - started,
        time: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify({
        ok: false,
        steamgifts: false,
        latencyMs: Date.now() - started,
        error: error?.message || String(error),
        time: new Date().toISOString()
      })
    };
  }
};

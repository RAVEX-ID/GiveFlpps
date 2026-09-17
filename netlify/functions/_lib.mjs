import { getStore } from "@netlify/blobs";

export const SG_ORIGIN = "https://www.steamgifts.com";
export const CACHE_KEY = "live-snapshot-v1";
export const MAX_PAGES = Number(process.env.SG_MAX_PAGES || 4);

export function json(data, status = 200, extra = {}) {
  return {
    statusCode: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30, stale-while-revalidate=120",
      "access-control-allow-origin": "*",
      ...extra
    },
    body: JSON.stringify(data)
  };
}

export function normalizeGiveaway(raw) {
  const id = Number(raw.id || raw.giveaway_id || 0);
  const appId = Number(raw.app_id || raw.appId || 0) || null;
  const start = Number(raw.start_timestamp || raw.startTimestamp || 0);
  const end = Number(raw.end_timestamp || raw.endTimestamp || 0);
  const entries = Number(raw.entry_count ?? raw.entryCount ?? 0);
  const copies = Number(raw.copies ?? 1);
  const points = Number(raw.points ?? 0);
  const comments = Number(raw.comment_count ?? raw.commentCount ?? 0);
  const title = raw.name || raw.title || "Unknown game";

  return {
    id, title, appId,
    packageId: raw.package_id ?? raw.packageId ?? null,
    link: raw.link || (id ? `${SG_ORIGIN}/giveaway/${id}` : SG_ORIGIN),
    steamUrl: appId ? `https://store.steampowered.com/app/${appId}/` : null,
    image: appId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_231x87.jpg` : null,
    start, end, entries, copies, points, comments,
    regionRestricted: Boolean(raw.region_restricted),
    inviteOnly: Boolean(raw.invite_only),
    whitelist: Boolean(raw.whitelist),
    group: Boolean(raw.group),
    contributorLevel: Number(raw.contributor_level ?? 0),
    creator: raw.creator?.username || raw.creator?.id || null
  };
}

export function isActive(g, now = Math.floor(Date.now()/1000)) {
  return g.start <= now && g.end > now;
}

export function heatScore(g, now = Math.floor(Date.now()/1000)) {
  const remaining = Math.max(1, g.end - now);
  const age = Math.max(60, now - g.start);
  const velocity = g.entries / (age / 3600);
  const density = g.entries / Math.max(1, g.copies);
  const urgency = Math.min(1, 86400 / remaining);
  const copiesFactor = Math.log10(g.copies + 1) * 12;
  const commentsFactor = Math.log10(g.comments + 1) * 6;
  const accessPenalty = (g.inviteOnly ? 15 : 0) + (g.whitelist ? 8 : 0) + (g.group ? 8 : 0);
  return Math.max(0, Math.round(
    velocity * 2.2 + density * 18 + urgency * 20 + copiesFactor + commentsFactor + g.points * 0.15 - accessPenalty
  ));
}

export function enrich(g, now) {
  const remaining = Math.max(0, g.end - now);
  return {
    ...g,
    active: isActive(g, now),
    heat: heatScore(g, now),
    remaining,
    entriesPerCopy: Number((g.entries / Math.max(1, g.copies)).toFixed(2)),
    entryVelocity: Number((g.entries / Math.max(1/60, (now - g.start) / 3600)).toFixed(1))
  };
}

export async function fetchPage(page) {
  const url = `${SG_ORIGIN}/?format=json&page=${page}`;
  const res = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "GiveFlpps/1.0 (+https://giveflpps.netlify.app)"
    }
  });
  if (!res.ok) throw new Error(`SteamGifts returned ${res.status} on page ${page}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.giveaways || data.results || []);
  return { list, perPage: Number(data.per_page || list.length || 0), page: Number(data.page || page) };
}

export async function collect() {
  const now = Math.floor(Date.now()/1000);
  const all = [];
  const errors = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const result = await fetchPage(page);
      all.push(...result.list);
      if (!result.list.length || (result.perPage && result.list.length < result.perPage)) break;
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      errors.push({ page, message: e.message });
      break;
    }
  }

  const dedupe = new Map();
  for (const raw of all) {
    const g = normalizeGiveaway(raw);
    if (!g.id || !g.title) continue;
    if (isActive(g, now)) dedupe.set(g.id, enrich(g, now));
  }

  const active = [...dedupe.values()].sort((a,b) => b.heat - a.heat || b.entries - a.entries);
  const byGame = new Map();
  for (const g of active) {
    const key = g.appId ? `app:${g.appId}` : `name:${g.title.toLowerCase()}`;
    const existing = byGame.get(key) || {
      key, title: g.title, appId: g.appId, steamUrl: g.steamUrl, image: g.image,
      activeCount: 0, totalEntries: 0, totalCopies: 0, maxHeat: 0, giveaways: []
    };
    existing.activeCount++;
    existing.totalEntries += g.entries;
    existing.totalCopies += g.copies;
    existing.maxHeat = Math.max(existing.maxHeat, g.heat);
    existing.giveaways.push(g.id);
    byGame.set(key, existing);
  }

  const games = [...byGame.values()].sort((a,b) =>
    b.activeCount - a.activeCount || b.maxHeat - a.maxHeat || b.totalEntries - a.totalEntries
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    generatedAtUnix: now,
    source: `${SG_ORIGIN}/?format=json`,
    pagesScanned: Math.min(MAX_PAGES, Math.ceil(all.length / Math.max(1, 100))),
    scanned: all.length,
    activeCount: active.length,
    giveaways: active.slice(0, 100),
    games: games.slice(0, 100),
    errors
  };
}

export async function saveSnapshot(snapshot) {
  const store = getStore({ name: "giveflpps-cache", consistency: "strong" });
  await store.set(CACHE_KEY, JSON.stringify(snapshot), { metadata: { generatedAt: snapshot.generatedAt } });
}

export async function readSnapshot() {
  const store = getStore({ name: "giveflpps-cache", consistency: "strong" });
  const text = await store.get(CACHE_KEY);
  return text ? JSON.parse(text) : null;
}
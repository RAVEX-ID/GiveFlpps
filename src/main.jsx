import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, BarChart3, Clock3, ExternalLink, Flame, Gamepad2,
  RefreshCw, Search, ShieldCheck, SlidersHorizontal, Users, X
} from "lucide-react";
import "./styles.css";

const fmt = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function timeLeft(seconds) {
  if (seconds <= 0) return "Ended";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor(seconds % 86400 / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  return d ? `${d}d ${h}h` : `${h}h ${m}m`;
}

function heatLabel(score) {
  if (score >= 120) return "Blazing";
  if (score >= 75) return "Hot";
  if (score >= 40) return "Active";
  return "Steady";
}

function Stat({ icon: Icon, label, value, accent }) {
  return <div className="stat">
    <div className={`stat-icon ${accent || ""}`}><Icon size={18}/></div>
    <div><span>{label}</span><strong>{value}</strong></div>
  </div>;
}

function GiveawayCard({ g, rank }) {
  return <article className="card">
    <div className="thumb-wrap">
      {g.image ? <img src={g.image} alt="" loading="lazy" onError={e => e.currentTarget.style.display="none"} /> : <div className="thumb-fallback"><Gamepad2/></div>}
      <div className="rank">#{rank}</div>
      <div className="heat-pill"><Flame size={13}/> {g.heat}</div>
    </div>
    <div className="card-body">
      <div className="eyebrow">{heatLabel(g.heat)} · {g.points} P</div>
      <h3 title={g.title}>{g.title}</h3>
      <div className="meta-row">
        <span><Users size={14}/> {compact.format(g.entries)} entries</span>
        <span><Gamepad2 size={14}/> {g.copies} {g.copies === 1 ? "copy" : "copies"}</span>
      </div>
      <div className="progress"><span style={{width: `${Math.min(100, g.entriesPerCopy * 100)}%`}}/></div>
      <div className="metrics">
        <div><small>Entry density</small><b>{g.entriesPerCopy}×</b></div>
        <div><small>Velocity</small><b>{g.entryVelocity}/h</b></div>
        <div><small>Ends in</small><b>{timeLeft(g.remaining)}</b></div>
      </div>
      <div className="badges">
        {g.regionRestricted && <span>Region</span>}
        {g.inviteOnly && <span>Invite</span>}
        {g.whitelist && <span>Whitelist</span>}
        {g.group && <span>Group</span>}
      </div>
      <a className="enter" href={g.link} target="_blank" rel="noreferrer">
        View on SteamGifts <ExternalLink size={15}/>
      </a>
    </div>
  </article>;
}

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("heat");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/giveaways", { cache: "no-store" });
      if (!r.ok) { const body = await r.json().catch(() => null); throw new Error(body?.message || body?.error || `API request failed (${r.status})`); }
      setData(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const id = setInterval(load, 300000); return () => clearInterval(id); }, []);

  const list = useMemo(() => {
    if (!data) return [];
    let a = [...data.giveaways];
    if (query.trim()) a = a.filter(g => g.title.toLowerCase().includes(query.toLowerCase()));
    if (filter === "open") a = a.filter(g => !g.inviteOnly && !g.whitelist && !g.group);
    if (filter === "copies") a = a.filter(g => g.copies >= 5);
    if (filter === "ending") a = a.filter(g => g.remaining <= 6 * 3600);
    a.sort((x,y) => sort === "entries" ? y.entries-x.entries : sort === "copies" ? y.copies-x.copies : sort === "ending" ? x.remaining-y.remaining : y.heat-x.heat);
    return a;
  }, [data, query, sort, filter]);

  const avgEntries = data?.giveaways?.length ? Math.round(data.giveaways.reduce((s,g)=>s+g.entries,0)/data.giveaways.length) : 0;

  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="logo"><span>G</span></div><div><b>GiveFlpps</b><small>STEAMGIFT INTELLIGENCE</small></div></div>
      <div className="live"><i/> LIVE DATA <span>{data ? new Date(data.generatedAt).toLocaleTimeString() : "—"}</span></div>
      <button className="refresh" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "spin":""}/> Refresh</button>
    </header>

    <main>
      <section className="hero">
        <div>
          <div className="kicker"><Activity size={14}/> REAL-TIME GIVEAWAY DISCOVERY</div>
          <h1>Find the giveaways<br/><em>worth entering.</em></h1>
          <p>GiveFlpps ranks active SteamGifts giveaways using entry density, entry velocity, copies, urgency and community activity.</p>
        </div>
        <div className="hero-orbit"><div className="orbit-ring"/><Flame size={42}/><b>{data?.activeCount ?? "—"}</b><span>active now</span></div>
      </section>

      <section className="stats">
        <Stat icon={Flame} label="Active giveaways" value={fmt.format(data?.activeCount || 0)} accent="violet"/>
        <Stat icon={Gamepad2} label="Games with giveaways" value={fmt.format(data?.games?.length || 0)} accent="cyan"/>
        <Stat icon={Users} label="Avg. entries" value={fmt.format(avgEntries)} accent="blue"/>
        <Stat icon={Clock3} label="Refresh cycle" value="5 min" accent="green"/>
      </section>

      <section className="toolbar">
        <div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search games..." />{query && <button onClick={()=>setQuery("")}><X size={15}/></button>}</div>
        <div className="controls">
          <SlidersHorizontal size={16}/>
          {["all","open","copies","ending"].map(x=><button key={x} className={filter===x?"selected":""} onClick={()=>setFilter(x)}>{x==="all"?"All":x==="open"?"Open":x==="copies"?"5+ copies":"Ending soon"}</button>)}
          <select value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="heat">Sort: Heat</option><option value="entries">Entries</option><option value="copies">Copies</option><option value="ending">Ending soon</option>
          </select>
        </div>
      </section>

      {error && <div className="error"><ShieldCheck size={18}/> {error}. Try refresh.</div>}
      {loading && !data ? <div className="loading"><div className="loader"/><span>Collecting live SteamGifts data…</span></div> :
        <section className="grid">{list.map((g,i)=><GiveawayCard key={g.id} g={g} rank={i+1}/>)}</section>}
      {!loading && data && !list.length && <div className="empty"><Search size={32}/><h3>No matches</h3><p>Try another game name or filter.</p></div>}

      {data && <section className="games-panel">
        <div className="section-head"><div><div className="kicker">GAME CLUSTERS</div><h2>Games with the most active giveaways</h2></div><BarChart3 size={22}/></div>
        <div className="game-list">{data.games.slice(0,12).map((g,i)=><a href={g.steamUrl || "#"} target="_blank" rel="noreferrer" key={g.key} className="game-row">
          <span className="game-rank">{String(i+1).padStart(2,"0")}</span>
          {g.image ? <img src={g.image} alt="" /> : <div className="mini-fallback"><Gamepad2/></div>}
          <span className="game-name">{g.title}</span><b>{g.activeCount}</b><small>active</small><ExternalLink size={14}/>
        </a>)}</div>
      </section>}

      <footer><span>GiveFlpps v1.0</span><span>Data source: SteamGifts JSON</span><span>{data?.scanned || 0} records scanned</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);
// ============================================================
// PANTHEON SERVER — Puter Serverless Worker
// Odysseus Command Center Backend
// Deploy: right-click in Puter Files → Publish as Worker
// Live at: https://pantheon-server.puter.work
// ============================================================

// ── War Chest ──────────────────────────────────────────────
router.get("/api/war-chest", async ({ request }) => {
  const data = await me.puter.kv.get("pantheon_war_chest");
  if (!data) return { total_pnl: 0, trades: [], cycles: 0, wins: 0, losses: 0 };
  return JSON.parse(data);
});

router.post("/api/war-chest/update", async ({ request }) => {
  const body = await request.json();
  const existing = await me.puter.kv.get("pantheon_war_chest");
  const chest = existing ? JSON.parse(existing) : { total_pnl: 0, trades: [], cycles: 0, wins: 0, losses: 0 };

  if (body.pnl !== undefined) chest.total_pnl = (chest.total_pnl || 0) + body.pnl;
  if (body.trade) chest.trades.push({ ...body.trade, ts: Date.now() });
  if (body.cycle) chest.cycles = (chest.cycles || 0) + 1;
  if (body.win) chest.wins = (chest.wins || 0) + 1;
  if (body.loss) chest.losses = (chest.losses || 0) + 1;
  chest.last_updated = new Date().toISOString();

  await me.puter.kv.set("pantheon_war_chest", JSON.stringify(chest));
  return { ok: true, total_pnl: chest.total_pnl };
});

// ── Prime Status ────────────────────────────────────────────
router.get("/api/primes", async ({ request }) => {
  const data = await me.puter.kv.get("pantheon_prime_status");
  if (!data) return { primes: [] };
  return JSON.parse(data);
});

router.post("/api/primes/update", async ({ request }) => {
  const body = await request.json();
  const existing = await me.puter.kv.get("pantheon_prime_status");
  const status = existing ? JSON.parse(existing) : { primes: [] };

  const idx = status.primes.findIndex(p => p.name === body.name);
  const entry = { name: body.name, status: body.status, last_seen: new Date().toISOString(), meta: body.meta || {} };
  if (idx >= 0) status.primes[idx] = entry;
  else status.primes.push(entry);

  await me.puter.kv.set("pantheon_prime_status", JSON.stringify(status));
  return { ok: true };
});

// ── Signal Log ──────────────────────────────────────────────
router.post("/api/log", async ({ request }) => {
  const body = await request.json();
  const existing = await me.puter.kv.get("pantheon_signal_log");
  const log = existing ? JSON.parse(existing) : [];

  log.push({ msg: body.msg, type: body.type || "info", prime: body.prime || "system", ts: new Date().toISOString() });
  if (log.length > 200) log.splice(0, log.length - 200); // keep last 200

  await me.puter.kv.set("pantheon_signal_log", JSON.stringify(log));
  return { ok: true };
});

router.get("/api/log", async ({ request }) => {
  const data = await me.puter.kv.get("pantheon_signal_log");
  if (!data) return { entries: [] };
  const entries = JSON.parse(data);
  return { entries: entries.slice(-50) }; // last 50
});

// ── WorkerZero Earnings ─────────────────────────────────────
router.get("/api/workerzero", async ({ request }) => {
  const data = await me.puter.kv.get("pantheon_workerzero");
  if (!data) return { total_earned: 0, jobs: [], cycles: 0 };
  return JSON.parse(data);
});

router.post("/api/workerzero/update", async ({ request }) => {
  const body = await request.json();
  const existing = await me.puter.kv.get("pantheon_workerzero");
  const wz = existing ? JSON.parse(existing) : { total_earned: 0, jobs: [], cycles: 0 };

  if (body.earned) wz.total_earned = (wz.total_earned || 0) + body.earned;
  if (body.job) wz.jobs.push({ ...body.job, ts: Date.now() });
  if (body.cycle) wz.cycles = (wz.cycles || 0) + 1;
  wz.last_updated = new Date().toISOString();

  await me.puter.kv.set("pantheon_workerzero", JSON.stringify(wz));
  return { ok: true, total_earned: wz.total_earned };
});

// ── ScoutPrime Leads ────────────────────────────────────────
router.get("/api/scout", async ({ request }) => {
  const data = await me.puter.kv.get("pantheon_scout_leads");
  if (!data) return { leads: [], total_fee_potential: 0 };
  return JSON.parse(data);
});

router.post("/api/scout/update", async ({ request }) => {
  const body = await request.json();
  await me.puter.kv.set("pantheon_scout_leads", JSON.stringify(body));
  return { ok: true };
});

// ── Health Check ────────────────────────────────────────────
router.get("/api/health", async ({ request }) => {
  return {
    status: "ONLINE",
    name: "Pantheon Server",
    version: "1.0.0",
    ts: new Date().toISOString(),
    message: "The Agora never closes. 🔱"
  };
});

// ── GitHub Actions Webhook (OpenAgora → War Chest) ──────────
router.post("/api/webhook/openagora", async ({ request }) => {
  const body = await request.json();
  // Accepts: { pnl, win_rate, cycles, trades }
  const existing = await me.puter.kv.get("pantheon_war_chest");
  const chest = existing ? JSON.parse(existing) : { total_pnl: 0, trades: [], cycles: 0, wins: 0, losses: 0 };

  if (body.pnl !== undefined) chest.total_pnl = body.total_pnl || chest.total_pnl;
  if (body.cycles !== undefined) chest.cycles = body.cycles;
  if (body.win_rate !== undefined) chest.win_rate = body.win_rate;
  if (body.last_trade) chest.trades.push({ ...body.last_trade, ts: Date.now() });
  chest.last_updated = new Date().toISOString();

  await me.puter.kv.set("pantheon_war_chest", JSON.stringify(chest));

  // Log it
  const log = await me.puter.kv.get("pantheon_signal_log");
  const entries = log ? JSON.parse(log) : [];
  entries.push({ msg: `OpenAgora report: PnL $${chest.total_pnl?.toFixed(2)} | WR ${body.win_rate}%`, type: "win", prime: "OpenAgora", ts: new Date().toISOString() });
  if (entries.length > 200) entries.splice(0, entries.length - 200);
  await me.puter.kv.set("pantheon_signal_log", JSON.stringify(entries));

  return { ok: true, received: true };
});

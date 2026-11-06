/* =========================================================
   TCHIN ! — Logique de l'application
   ========================================================= */
(() => {
  "use strict";

  /* ---------- Stockage sûr ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("tchin_" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("tchin_" + k, JSON.stringify(v)); } catch {} }
  };

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rand = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  /* ---------- État ---------- */
  const state = {
    players: store.get("players", []),
    settings: Object.assign({ unit: "gorgée", vibrate: true, wake: true, adult: false }, store.get("settings", {})),
    modesByGame: store.get("modes", {}),
    seen: new Set(store.get("seen", [])),
    game: null,
    modes: [],
    pools: {},
    history: [],
    histIdx: -1,
    drawCount: 0,
    viruses: [],   // {endAt, text, label}
    turn: 0,
    useCount: {},
    grillTarget: null,
    grillLeft: 0
  };
  const saveSeen = () => store.set("seen", [...state.seen]);
  const saveSettings = () => store.set("settings", state.settings);

  const AVATAR_COLORS = ["#ff4d8d", "#8b5cf6", "#06b6d4", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];

  /* ---------- Navigation ---------- */
  function go(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("#screen-" + name).classList.add("active");
    if (name === "home") renderHome();
    if (name === "players") renderPlayers();
    if (name === "settings") renderSettings();
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (t) go(t.dataset.go);
  });

  function toast(msg, ms = 2200) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
  }
  const buzz = (ms = 12) => { if (state.settings.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch {} };

  /* ---------- Comptage des cartes ---------- */
  function countFor(game, modes) {
    let n = 0;
    const add = (src) => modes.forEach((m) => { n += (DATA[src][m] || []).length; });
    if (game === "totale") { ["totale", "jamais", "quipourrait", "verite", "action", "tupreferes"].forEach(add); modes.forEach((m) => n += (DATA.totale.virus[m] || []).length); }
    else if (game === "aov") { add("verite"); add("action"); }
    else add(game);
    return n;
  }

  /* ---------- Accueil ---------- */
  function renderHome() {
    const hp = $("#home-players");
    hp.textContent = state.players.length ? state.players.join(", ") : "Ajoute tes potes 👇";
    const grid = $("#games-grid");
    grid.innerHTML = "";
    Object.entries(GAMES).forEach(([key, g], i) => {
      const b = el("button", "game-tile" + (i === 0 ? " wide" : ""));
      b.style.background = g.color;
      const total = countFor(key, Object.keys(MODES));
      b.innerHTML = `<span class="gt-count">${total} cartes</span><span class="gt-emoji">${g.emoji}</span>
        <span class="gt-name">${g.name}</span><span class="gt-desc">${g.desc}</span>`;
      b.addEventListener("click", () => openSheet(key));
      grid.appendChild(b);
    });
  }

  /* ---------- Joueurs ---------- */
  function renderPlayers() {
    const ul = $("#player-list");
    ul.innerHTML = "";
    state.players.forEach((p, i) => {
      const li = el("li");
      li.innerHTML = `<span class="avatar" style="background:${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${esc(p[0].toUpperCase())}</span>
        <span class="pname">${esc(p)}</span><button class="del" aria-label="Supprimer">✕</button>`;
      li.querySelector(".del").addEventListener("click", () => { state.players.splice(i, 1); store.set("players", state.players); renderPlayers(); });
      ul.appendChild(li);
    });
    $("#player-hint").textContent = state.players.length < 2
      ? "Ajoute au moins 2 joueurs pour les jeux avec prénoms."
      : `${state.players.length} joueurs prêts à s'enjailler 🔥`;
  }
  $("#player-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("#player-input");
    const name = inp.value.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (state.players.some((p) => p.toLowerCase() === name.toLowerCase())) { toast("Ce prénom existe déjà"); return; }
    if (state.players.length >= 20) { toast("20 joueurs maximum"); return; }
    state.players.push(name); store.set("players", state.players);
    inp.value = ""; inp.focus(); renderPlayers();
  });

  /* ---------- Réglages ---------- */
  function renderSettings() {
    $("#set-unit").value = state.settings.unit;
    $("#set-vibrate").checked = state.settings.vibrate;
    $("#set-wake").checked = state.settings.wake;
    const total = countFor("totale", Object.keys(MODES)) + countFor("hotseat", Object.keys(MODES));
    $("#stats-text").textContent = `Tu as déjà vu ${state.seen.size} cartes sur ${total}. Elles ne reviennent pas tant que toutes n'ont pas été jouées.`;
  }
  $("#set-unit").addEventListener("change", (e) => { state.settings.unit = e.target.value; saveSettings(); });
  $("#set-vibrate").addEventListener("change", (e) => { state.settings.vibrate = e.target.checked; saveSettings(); });
  $("#set-wake").addEventListener("change", (e) => { state.settings.wake = e.target.checked; saveSettings(); });
  $("#reset-history").addEventListener("click", () => {
    if (!confirm("Remettre toutes les cartes en jeu ?")) return;
    state.seen.clear(); saveSeen(); renderSettings(); toast("Historique réinitialisé ✨");
  });

  /* ---------- Installation PWA ---------- */
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; $("#install-btn").classList.remove("hidden"); });
  $("#install-btn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $("#install-btn").classList.add("hidden");
  });

  /* ---------- Feuille de sélection des modes ---------- */
  let sheetGame = null, sheetModes = [];
  function openSheet(game) {
    const g = GAMES[game];
    const needsPlayers = ["totale", "aov", "hotseat"].includes(game);
    if (needsPlayers && state.players.length < 2) {
      toast("Ajoute au moins 2 joueurs d'abord 👥");
      go("players"); return;
    }
    sheetGame = game;
    sheetModes = (state.modesByGame[game] || ["soft", "hard", "alcool"]).filter((m) => MODES[m]);
    if (!state.settings.adult) sheetModes = sheetModes.filter((m) => m !== "hot");
    $("#sheet-emoji").textContent = g.emoji;
    $("#sheet-title").textContent = g.name;
    $("#sheet-desc").textContent = g.desc;
    renderModeList();
    $("#sheet").classList.remove("hidden");
  }
  function closeSheet() { $("#sheet").classList.add("hidden"); }
  $(".sheet-backdrop").addEventListener("click", closeSheet);

  function renderModeList() {
    const list = $("#mode-list");
    list.innerHTML = "";
    Object.entries(MODES).forEach(([key, m]) => {
      const on = sheetModes.includes(key);
      const b = el("button", "mode-item" + (on ? " on" : ""));
      b.style.setProperty("--mc", m.color);
      const n = countFor(sheetGame, [key]);
      b.innerHTML = `<span class="mi-emoji">${m.emoji}</span><span class="mi-text"><b>${m.label}</b><small>${m.desc} · ${n} cartes</small></span><span class="mi-check"></span>`;
      b.addEventListener("click", () => {
        if (on) { sheetModes = sheetModes.filter((x) => x !== key); renderModeList(); return; }
        if (key === "hot" && !state.settings.adult) {
          askAge(() => { sheetModes.push(key); renderModeList(); });
          return;
        }
        sheetModes.push(key); renderModeList();
      });
      list.appendChild(b);
    });
    const total = countFor(sheetGame, sheetModes);
    $("#sheet-count").textContent = sheetModes.length ? `${total} cartes disponibles` : "Choisis au moins une ambiance";
    $("#start-btn").disabled = !sheetModes.length;
  }

  function askAge(ok) {
    const m = $("#age-modal");
    m.classList.remove("hidden");
    $("#age-yes").onclick = () => { state.settings.adult = true; saveSettings(); m.classList.add("hidden"); ok(); };
    $("#age-no").onclick = () => m.classList.add("hidden");
  }

  $("#start-btn").addEventListener("click", () => {
    state.modesByGame[sheetGame] = sheetModes.slice();
    store.set("modes", state.modesByGame);
    closeSheet();
    startGame(sheetGame, sheetModes);
  });

  /* ---------- Pioches sans répétition ---------- */
  // Une "source" = un type de carte. Chaque carte a un id stable : source|texte.
  function buildPool(src, modes) {
    const items = [];
    modes.forEach((m) => {
      const list = src === "virus" ? (DATA.totale.virus[m] || []) : (DATA[src][m] || []);
      list.forEach((raw) => {
        const key = Array.isArray(raw) ? raw.join("§") : raw;
        items.push({ id: hash(src + "|" + key), src, mode: m, raw });
      });
    });
    return items;
  }
  function drawFrom(src) {
    let pool = state.pools[src];
    if (!pool) return null;
    if (!pool.queue.length) {
      let fresh = pool.all.filter((c) => !state.seen.has(c.id));
      if (!fresh.length) {
        pool.all.forEach((c) => state.seen.delete(c.id));
        fresh = pool.all.slice();
        if (pool.all.length) toast("🔄 Toutes ces cartes ont été jouées, on remélange !");
      }
      pool.queue = shuffle(fresh);
    }
    const c = pool.queue.pop();
    if (c) { state.seen.add(c.id); saveSeen(); }
    return c || null;
  }

  /* ---------- Prénoms ---------- */
  function pickPlayer(exclude = []) {
    const avail = state.players.filter((p) => !exclude.includes(p));
    if (!avail.length) return "Quelqu'un";
    const min = Math.min(...avail.map((p) => state.useCount[p] || 0));
    const least = avail.filter((p) => (state.useCount[p] || 0) === min);
    const p = least[rand(least.length)];
    state.useCount[p] = (state.useCount[p] || 0) + 1;
    return p;
  }
  function fill(text, ctx = {}) {
    const p = ctx.p || (text.includes("{p}") ? pickPlayer() : null);
    const p2 = ctx.p2 || (text.includes("{p2}") ? pickPlayer(p ? [p] : []) : null);
    const unit = state.settings.unit;
    let out = esc(text)
      .replace(/\{p\}/g, `<span class="name">${esc(p || "")}</span>`)
      .replace(/\{p2\}/g, `<span class="name">${esc(p2 || "")}</span>`)
      .replace(/\{(\d+)\}/g, (_, n) => {
        n = +n;
        const word = unit === "gage" ? (n > 1 ? "gages" : "gage") : unit === "shot" ? (n > 1 ? "shots" : "shot") : (n > 1 ? "gorgées" : "gorgée");
        return `<b>${n} ${word}</b>`;
      });
    // Mode gages : adapter les verbes liés à l'alcool
    if (unit === "gage") out = out.replace(/\b([Bb])oi(s|t|vent|re)\b/g, (m, b, end) => {
        const r = { s: "rends", t: "rend", vent: "rennent", re: "rendre" }[end];
        return (b === "B" ? "P" : "p") + r;
      }).replace(/\b([Bb])uvez\b/g, (m, b) => (b === "B" ? "P" : "p") + "renez").replace(/cul-sec/gi, "gage XXL");
    return { html: out, p, p2 };
  }
  const sips = () => 1 + rand(3);

  /* ---------- Démarrage ---------- */
  let wakeLock = null;
  async function keepAwake() {
    if (!state.settings.wake || !("wakeLock" in navigator)) return;
    try { wakeLock = await navigator.wakeLock.request("screen"); } catch {}
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && $("#screen-play").classList.contains("active")) keepAwake(); });

  function startGame(game, modes) {
    state.game = game; state.modes = modes; state.pools = {};
    state.history = []; state.histIdx = -1; state.drawCount = 0; state.viruses = [];
    state.turn = rand(Math.max(state.players.length, 1)); state.useCount = {};
    state.grillTarget = null; state.grillLeft = 0;
    const sources = game === "totale" ? ["totale", "virus", "jamais", "quipourrait", "verite", "action", "tupreferes"]
      : game === "aov" ? ["verite", "action"] : [game];
    sources.forEach((s) => { state.pools[s] = { all: buildPool(s, modes), queue: [] }; });
    $("#play-title").textContent = GAMES[game].emoji + " " + GAMES[game].name;
    go("play");
    keepAwake();
    if (game === "aov") showAovChoice(); else next();
  }

  $("#quit-btn").addEventListener("click", () => {
    if (wakeLock) { try { wakeLock.release(); } catch {} wakeLock = null; }
    go("home");
  });
  $("#modes-btn").addEventListener("click", () => openSheet(state.game));

  /* ---------- Génération d'une carte ---------- */
  const TOTALE_WEIGHTS = [["totale", 40], ["jamais", 14], ["quipourrait", 14], ["verite", 8], ["action", 9], ["tupreferes", 7], ["virus", 8]];

  function pickTotaleSource() {
    const avail = TOTALE_WEIGHTS.filter(([s]) => state.pools[s] && state.pools[s].all.length);
    if (state.viruses.length >= 2) { const i = avail.findIndex(([s]) => s === "virus"); if (i >= 0) avail.splice(i, 1); }
    const total = avail.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [s, w] of avail) { if ((r -= w) < 0) return s; }
    return avail[0] && avail[0][0];
  }

  function makeCard(forced) {
    const g = state.game;
    // fin de virus programmée ?
    const dueIdx = state.viruses.findIndex((v) => v.endAt <= state.drawCount);
    if (g === "totale" && dueIdx >= 0) {
      const v = state.viruses.splice(dueIdx, 1)[0];
      return { kind: "virus-end", type: "🦠 Fin du virus", html: v.endHtml, mode: null };
    }
    const src = forced || (g === "totale" ? pickTotaleSource() : g === "aov" ? "verite" : g);
    const c = drawFrom(src);
    if (!c) return { kind: "card", type: "Oups", html: "Aucune carte dans ces ambiances.", mode: null };
    const mode = c.mode;

    if (src === "virus") {
      const s = fill(c.raw[0]);
      const e = fill(c.raw[1], { p: s.p, p2: s.p2 });
      state.viruses.push({ endAt: state.drawCount + 6 + rand(7), endHtml: e.html, label: s.html.replace(/^VIRUS 🦠 — /, "") });
      return { kind: "virus", type: "🦠 Virus", html: s.html.replace(/^VIRUS 🦠 — /, ""), hint: "Cette règle reste active quelques tours…", mode };
    }

    if (g === "totale") {
      switch (src) {
        case "totale": return { kind: "card", type: "🎉 Défi", html: fill(c.raw).html, mode };
        case "jamais": return { kind: "card", type: "🙊 Je n'ai jamais", html: fill(c.raw).html, hint: fill(`Ceux qui l'ont déjà fait boivent {${sips()}}.`).html, mode };
        case "quipourrait": return { kind: "card", type: "👉 Qui pourrait", html: fill(c.raw).html, hint: fill(`À 3, tout le monde pointe ! Le plus désigné boit {${sips() + 1}}.`).html, mode };
        case "verite": { const f = fill(c.raw, { p: pickPlayer() }); return { kind: "card", type: "💬 Vérité", player: f.p, html: f.html, hint: fill(`Refuse de répondre = {${sips() + 2}}.`).html, mode }; }
        case "action": { const f = fill(c.raw, { p: pickPlayer() }); return { kind: "card", type: "⚡ Action", player: f.p, html: f.html, hint: fill(`Refuse le défi = {${sips() + 2}}.`).html, mode }; }
        case "tupreferes": { const [a, b] = c.raw.split("||").map((x) => x.trim()); const fa = fill(a); const fb = fill(b, { p: fa.p, p2: fa.p2 });
          return { kind: "card", type: "⚖️ Tu préfères", html: `${fa.html}<br><small style="opacity:.75">— ou —</small><br>${fb.html}`, hint: fill(`À 3, tout le monde vote ! La minorité boit {${sips()}}.`).html, mode, long: true }; }
      }
    }

    if (g === "jamais") return { kind: "card", type: "🙊 Je n'ai jamais", html: fill(c.raw).html, hint: fill(`Ceux qui l'ont déjà fait boivent {${sips()}}.`).html, mode };
    if (g === "quipourrait") return { kind: "card", type: "👉 Qui pourrait", html: fill(c.raw).html, hint: fill(`3, 2, 1… pointez ! Le plus désigné boit {${sips() + 1}}.`).html, mode };
    if (g === "tupreferes") { const [a, b] = c.raw.split("||").map((x) => x.trim()); const fa = fill(a); const fb = fill(b, { p: fa.p, p2: fa.p2 }); return { kind: "wyr", a: fa.html, b: fb.html, mode }; }
    if (g === "hotseat") {
      if (!state.grillTarget || state.grillLeft <= 0) { state.grillTarget = state.players[state.turn % state.players.length]; state.turn++; state.grillLeft = 4; }
      state.grillLeft--;
      const f = fill(c.raw, { p: state.grillTarget, p2: pickPlayer([state.grillTarget]) });
      return { kind: "card", type: `🔥 Sur le grill · ${4 - state.grillLeft}/4`, player: "🔥 " + state.grillTarget, html: f.html,
        hint: fill(`Le groupe pose la question. Refuser de répondre = {${sips() + 1}}.`).html, mode };
    }
    return { kind: "card", type: "", html: fill(c.raw).html, mode };
  }

  /* ---------- Affichage ---------- */
  function modeBadge(mode) { const m = MODES[mode]; return m ? `<span class="card-mode">${m.emoji} ${m.label}</span>` : ""; }
  function cardBg(mode) {
    const c = (MODES[mode] || {}).color || "#ff4d8d";
    return `linear-gradient(145deg, ${c}, color-mix(in srgb, ${c} 45%, #1a0b3a))`;
  }

  function renderRules() {
    const box = $("#active-rules");
    box.innerHTML = state.viruses.map((v) => `<span class="rule-chip">🦠 ${v.label}</span>`).join("");
  }

  function renderCard(card) {
    const stage = $("#stage");
    stage.innerHTML = "";
    renderRules();
    if (card.kind === "wyr") {
      const w = el("div", "wyr");
      w.innerHTML = `<button class="wyr-opt wyr-a">${card.a}</button><div class="wyr-or">OU</div><button class="wyr-opt wyr-b">${card.b}</button>
        <div class="wyr-hint">${modeBadge(card.mode)} · Votez à 3 ! ${fill(`La minorité boit {${sips()}}.`).html}</div>`;
      w.querySelectorAll(".wyr-opt").forEach((b) => b.addEventListener("click", next));
      stage.appendChild(w);
    } else {
      const d = el("div", "card " + (card.kind === "virus" ? "virus" : card.kind === "virus-end" ? "virus-end" : ""));
      d.style.background = cardBg(card.mode);
      const textLen = card.html.replace(/<[^>]+>/g, "").length;
      d.innerHTML = `<div class="card-top"><span class="card-type">${card.type}</span>${modeBadge(card.mode)}</div>
        ${card.player ? `<div class="card-player">${esc(card.player)}</div>` : ""}
        <div class="card-text ${textLen > 110 || card.long ? "long" : ""}"><div>${card.html}</div></div>
        ${card.hint ? `<div class="card-hint">${card.hint}</div>` : ""}
        <div class="card-tap">Touche la carte pour continuer</div>`;
      d.addEventListener("click", () => (state.game === "aov" ? showAovChoice() : next()));
      stage.appendChild(d);
    }
    renderActions();
  }

  function renderActions() {
    const box = $("#play-actions");
    box.innerHTML = "";
    const prev = el("button", "btn btn-ghost btn-small", "↩︎");
    prev.setAttribute("aria-label", "Carte précédente");
    prev.disabled = state.histIdx <= 0;
    prev.addEventListener("click", () => { if (state.histIdx > 0) { state.histIdx--; renderCard(state.history[state.histIdx]); } });
    const nxt = el("button", "btn btn-primary", state.game === "aov" ? "Joueur suivant ›" : "Carte suivante ›");
    nxt.addEventListener("click", () => (state.game === "aov" ? showAovChoice() : next()));
    box.append(prev, nxt);
  }

  function pushAndShow(card) {
    // si on était revenu en arrière, on reprend à la fin
    state.history = state.history.slice(0, state.histIdx + 1);
    state.history.push(card);
    if (state.history.length > 60) state.history.shift();
    state.histIdx = state.history.length - 1;
    state.drawCount++;
    buzz();
    const cur = $("#stage .card, #stage .wyr, #stage .aov-choose");
    if (cur) { cur.classList.add("out"); setTimeout(() => renderCard(card), 180); }
    else renderCard(card);
  }

  function next() {
    if (state.histIdx < state.history.length - 1) { state.histIdx++; renderCard(state.history[state.histIdx]); return; }
    pushAndShow(makeCard());
  }

  /* ---------- Action ou Vérité ---------- */
  function showAovChoice() {
    const player = state.players[state.turn % state.players.length] || "Toi";
    state.turn++;
    const stage = $("#stage");
    stage.innerHTML = "";
    renderRules();
    const d = el("div", "aov-choose");
    d.innerHTML = `<div class="aov-turn">C'est au tour de</div><div class="aov-name">${esc(player)}</div>
      <div class="aov-btns"><button class="aov-btn aov-v"><span>💬</span>Vérité</button><button class="aov-btn aov-a"><span>⚡</span>Action</button></div>
      <button class="btn btn-ghost aov-rand">🎲 Laisser le hasard choisir</button>`;
    const pick = (src) => {
      const c = drawFrom(src);
      if (!c) return;
      const f = fill(c.raw, { p: player, p2: pickPlayer([player]) });
      pushAndShow({ kind: "card", type: src === "verite" ? "💬 Vérité" : "⚡ Action", player, html: f.html,
        hint: fill(`Tu refuses ? Bois {${sips() + 2}}.`).html, mode: c.mode });
    };
    d.querySelector(".aov-v").addEventListener("click", () => pick("verite"));
    d.querySelector(".aov-a").addEventListener("click", () => pick("action"));
    d.querySelector(".aov-rand").addEventListener("click", () => pick(Math.random() < 0.5 ? "verite" : "action"));
    stage.appendChild(d);
    const box = $("#play-actions");
    box.innerHTML = "";
    const skip = el("button", "btn btn-ghost", "Passer ce joueur ›");
    skip.addEventListener("click", showAovChoice);
    box.append(skip);
  }

  /* ---------- Swipe pour passer ---------- */
  let sx = null;
  $("#stage").addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  $("#stage").addEventListener("touchend", (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) < 70 || state.game === "aov" && !$("#stage .card")) return;
    if (dx < 0) { state.game === "aov" ? showAovChoice() : next(); }
    else if (state.histIdx > 0) { state.histIdx--; renderCard(state.history[state.histIdx]); }
  });

  /* ---------- Service worker (hors ligne) ---------- */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  go("home");
})();

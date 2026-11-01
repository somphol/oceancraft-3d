/* ══════════════════════════════════════════════════════════════
   OceanCraft 3D — Deep Sea Fishing & Hydrodynamics Studio
   Vanilla ES6 + Three.js r128. No build step, no backend.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ────────────────────────────────────────────────────────────
     0. Tiny helpers
     ──────────────────────────────────────────────────────────── */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const round = (v, n) => Number(v.toFixed(n == null ? 2 : n));
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const nowMs = () => Date.now();
  const iso = () => new Date().toISOString();
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  let svgUid = 0;

  // Capture runtime errors for the built-in self-test surface.
  window.__OCEANCRAFT_ERRORS__ = [];
  window.addEventListener("error", (e) => {
    if (e && e.message) window.__OCEANCRAFT_ERRORS__.push(String(e.message));
  });
  window.addEventListener("unhandledrejection", (e) => {
    window.__OCEANCRAFT_ERRORS__.push(String(e.reason || "Unhandled rejection"));
  });

  if (!window.THREE) {
    const status = document.getElementById("loading-status");
    if (status) status.textContent = "Three.js could not be loaded — check your connection";
    return;
  }

  /* ────────────────────────────────────────────────────────────
     1. Species catalogue
     ──────────────────────────────────────────────────────────── */
  const SPECIES = [
    { id: "silver-sardine", name: "Silver Sardine", rarity: "common", minKg: 0.08, maxKg: 0.55, minCm: 9, maxCm: 24, strength: 0.16, reward: 34, color: "#d7edf7", accent: "#72a9c2", shape: "sardine", desc: "A flash of quicksilver in the shallows. Small, but the first line in many a logbook." },
    { id: "harbor-herring", name: "Harbor Herring", rarity: "common", minKg: 0.25, maxKg: 1.15, minCm: 16, maxCm: 34, strength: 0.2, reward: 38, color: "#b7dbe4", accent: "#5b94aa", shape: "herring", desc: "Schooling around the old pilings at dusk, silver sides catching the last of the light." },
    { id: "sunset-perch", name: "Sunset Perch", rarity: "common", minKg: 0.35, maxKg: 1.8, minCm: 19, maxCm: 38, strength: 0.28, reward: 44, color: "#ffb36b", accent: "#d45e47", shape: "perch", desc: "Warm as the hour it favours, with a dorsal fin like a little orange sail." },
    { id: "kelp-bass", name: "Kelp Bass", rarity: "common", minKg: 0.9, maxKg: 4.4, minCm: 28, maxCm: 58, strength: 0.36, reward: 52, color: "#a9c477", accent: "#527648", shape: "bass", desc: "Lurks in the amber kelp forests, striped like sunlight through the canopy." },
    { id: "coral-snapper", name: "Coral Snapper", rarity: "common", minKg: 1.4, maxKg: 6.2, minCm: 33, maxCm: 66, strength: 0.44, reward: 60, color: "#ff9583", accent: "#bc4252", shape: "snapper", desc: "A reef resident with a blunt brow and a stubborn, head-shaking fight." },
    { id: "drift-mackerel", name: "Drift Mackerel", rarity: "common", minKg: 0.7, maxKg: 3.3, minCm: 25, maxCm: 52, strength: 0.38, reward: 50, color: "#8bc9c3", accent: "#367a82", shape: "mackerel", desc: "Races the tide in loose formations, its back a map of dark, wandering stripes." },
    { id: "reef-grouper", name: "Reef Grouper", rarity: "common", minKg: 2.8, maxKg: 12, minCm: 48, maxCm: 90, strength: 0.54, reward: 72, color: "#dcc096", accent: "#8b6842", shape: "grouper", desc: "A broad-shouldered ambusher that would rather wrestle the reef than leave it." },
    { id: "moonfluke", name: "Moonfluke", rarity: "common", minKg: 0.9, maxKg: 5.2, minCm: 28, maxCm: 62, strength: 0.4, reward: 56, color: "#e3edf0", accent: "#93a9b8", shape: "fluke", desc: "A pale flatfish that drifts on the sand like a fallen sliver of moon." },

    { id: "sapphire-tuna", name: "Sapphire Tuna", rarity: "rare", minKg: 12, maxKg: 52, minCm: 88, maxCm: 158, strength: 0.68, reward: 150, color: "#5ca8ff", accent: "#1b4f9d", shape: "tuna", desc: "A blue-water torpedo. The reel screams before you ever see the fish." },
    { id: "ghost-eel", name: "Ghost Eel", rarity: "rare", minKg: 2.8, maxKg: 9.5, minCm: 78, maxCm: 152, strength: 0.6, reward: 135, color: "#dcf3fa", accent: "#7fb1c6", shape: "eel", desc: "Translucent and ribbon-thin, it turns the water cold where it passes." },
    { id: "amberjack", name: "Amberjack", rarity: "rare", minKg: 8, maxKg: 31, minCm: 68, maxCm: 132, strength: 0.64, reward: 165, color: "#ffc45f", accent: "#a7652a", shape: "jack", desc: "A bronze bruiser of the drop-off, all muscle and bad intentions." },
    { id: "phantom-ray", name: "Phantom Ray", rarity: "rare", minKg: 9, maxKg: 38, minCm: 82, maxCm: 168, strength: 0.7, reward: 185, color: "#bfa8ff", accent: "#56469b", shape: "ray", desc: "It glides below the boat like a violet shadow, wings moving without a sound." },
    { id: "storm-marlin", name: "Storm Marlin", rarity: "rare", minKg: 24, maxKg: 88, minCm: 148, maxCm: 278, strength: 0.82, reward: 240, color: "#a8c0ce", accent: "#3d5669", shape: "marlin", desc: "Rides the weather front, spear-first, and fights hardest when the sky breaks." },
    { id: "abyss-angler", name: "Abyss Anglerfish", rarity: "rare", minKg: 3.8, maxKg: 14, minCm: 38, maxCm: 82, strength: 0.76, reward: 210, color: "#8b76aa", accent: "#2c2347", shape: "angler", desc: "A lantern in the dark. The little light is beautiful right up until the teeth." },

    { id: "golden-leviathan", name: "Golden Leviathan", rarity: "legendary", minKg: 78, maxKg: 260, minCm: 218, maxCm: 420, strength: 0.96, reward: 720, color: "#ffdf8a", accent: "#c98928", shape: "leviathan", desc: "The old stories were not stories. A serpent of hammered gold, older than the harbour." },
    { id: "lumina-kraken", name: "Lumina Kraken", rarity: "legendary", minKg: 62, maxKg: 205, minCm: 180, maxCm: 365, strength: 1.0, reward: 820, color: "#5ff0d3", accent: "#126c6b", shape: "squid", desc: "A constellations of blue-green lights beneath the hull, and then the arms." },
    { id: "celestial-coelacanth", name: "Celestial Coelacanth", rarity: "legendary", minKg: 44, maxKg: 142, minCm: 152, maxCm: 305, strength: 0.9, reward: 680, color: "#9fa8ff", accent: "#43429f", shape: "coelacanth", desc: "A living fossil wearing the night sky, its lobed fins moving like slow wings." },
    { id: "tide-emperor", name: "Tide Emperor", rarity: "legendary", minKg: 118, maxKg: 405, minCm: 258, maxCm: 505, strength: 1.0, reward: 940, color: "#8fffe0", accent: "#b8862f", shape: "emperor", desc: "The sea keeps its crown at the bottom of the trench. Today, it rose to look at you." }
  ];
  const SPECIES_BY_ID = {};
  SPECIES.forEach((s) => { SPECIES_BY_ID[s.id] = s; });
  const RARITY = {
    common: { label: "Common", rank: 0, className: "common", color: "#8fe6ff" },
    rare: { label: "Rare", rank: 1, className: "rare", color: "#a8c8ff" },
    legendary: { label: "Legendary", rank: 2, className: "legendary", color: "#ffd166" }
  };
  const RARITY_ORDER = ["common", "rare", "legendary"];

  /* ────────────────────────────────────────────────────────────
     2. Weather presets
     ──────────────────────────────────────────────────────────── */
  const WEATHER = {
    calm: {
      key: "calm", name: "Calm Sunset", icon: "☀️", badge: "Calm", badgeClass: "pill--calm",
      desc: "A copper sun, a lazy swell, and fish rising in the golden hour.",
      status: "Waters calm · Bite rate steady", sonar: "Scanning the shelf",
      skyTop: "#0a2c4d", skyBottom: "#ff9d5c", fog: "#b07862", fogDensity: 0.0022,
      deep: "#062e3d", crest: "#2e969b", foam: "#6fc3bf",
      sunColor: "#ffbd7a", sunIntensity: 1.05, hemiSky: "#8fd3f0", hemiGround: "#40271f",
      ambient: 0.45, amp: 0.56, choppy: 0.7, speed: 0.9, wind: 6, temp: 24, bite: "Steady",
      exposure: 0.98, sunOpacity: 1, moonOpacity: 0, stars: 0, bio: 0, rain: 0,
      clouds: 0.55, cloudTint: "#ffd2b0", lightning: false, birds: 1, beam: 0
    },
    storm: {
      key: "storm", name: "Stormy Waves", icon: "⛈️", badge: "Storm", badgeClass: "pill--storm",
      desc: "A bruised sky, whitecaps, and the deep coming up to meet the hull.",
      status: "Gale warning · Fish are frenzied", sonar: "Choppy return · deep contacts",
      skyTop: "#0a1a29", skyBottom: "#3a5364", fog: "#293c4a", fogDensity: 0.0068,
      deep: "#051722", crest: "#3e6f7c", foam: "#a9d9e2",
      sunColor: "#9fb6c8", sunIntensity: 0.3, hemiSky: "#6e8aa0", hemiGround: "#14212a",
      ambient: 0.3, amp: 1.42, choppy: 1.3, speed: 1.55, wind: 34, temp: 17, bite: "Frenzied",
      exposure: 0.94, sunOpacity: 0, moonOpacity: 0, stars: 0, bio: 0, rain: 0.9,
      clouds: 1, cloudTint: "#34495a", lightning: true, birds: 0, beam: 0.12
    },
    night: {
      key: "night", name: "Bioluminescent Night", icon: "🌙", badge: "Night", badgeClass: "pill--night",
      desc: "A moonless blue hour, with living light drifting through the swell.",
      status: "Bioluminescent bloom · Rare fish active", sonar: "Glowing contacts · deep shelf",
      skyTop: "#03081a", skyBottom: "#0d3544", fog: "#071b2b", fogDensity: 0.0041,
      deep: "#021019", crest: "#0a666e", foam: "#7fe8d4",
      sunColor: "#8fbcff", sunIntensity: 0.22, hemiSky: "#143a5c", hemiGround: "#03070e",
      ambient: 0.19, amp: 0.72, choppy: 0.78, speed: 1.02, wind: 9, temp: 21, bite: "Slow",
      exposure: 1.05, sunOpacity: 0, moonOpacity: 1, stars: 1, bio: 1, rain: 0,
      clouds: 0.28, cloudTint: "#1b2f48", lightning: false, birds: 0, beam: 0.75
    }
  };
  const WEATHER_ORDER = ["calm", "storm", "night"];

  /* ────────────────────────────────────────────────────────────
     3. Upgrades & achievements
     ──────────────────────────────────────────────────────────── */
  const UPGRADES = [
    { id: "rod", name: "Carbon Cast Rod", icon: "🎣", max: 5, costs: [120, 280, 520, 860, 1320], desc: "Longer, cleaner casts reach deeper water — and bigger fish.", effect: (l) => "+" + (l * 4) + " m cast range" },
    { id: "reel", name: "Ball-Bearing Reel", icon: "⚙️", max: 5, costs: [140, 320, 580, 940, 1480], desc: "A silky retrieve that turns every crank into more line.", effect: (l) => "+" + (l * 9) + "% reel speed" },
    { id: "line", name: "Braided Kevlar Line", icon: "🧵", max: 5, costs: [160, 360, 640, 1020, 1600], desc: "Wider safe zone and lower peak tension when the fish surges.", effect: (l) => "+" + (l * 1.8) + "% safe zone · −" + (l * 3) + " tension" },
    { id: "sonar", name: "Deep-Scan Sonar", icon: "📡", max: 5, costs: [220, 460, 780, 1180, 1740], desc: "Reads the thermocline and tilts the odds toward rare contacts.", effect: (l) => "+" + (l * 2.2) + "% rare & legendary odds" },
    { id: "lure", name: "Glow Lure", icon: "✨", max: 5, costs: [100, 240, 450, 760, 1180], desc: "A soft bioluminescent pulse. Fish find it faster.", effect: (l) => "−" + (l * 10) + "% bite wait" }
  ];
  const UPGRADE_BY_ID = {};
  UPGRADES.forEach((u) => { UPGRADE_BY_ID[u.id] = u; });

  const ACHIEVEMENTS = [
    { id: "first-light", name: "First Light", desc: "Land your very first fish", icon: "🐟", test: (s) => s.profile.totalCatches >= 1 },
    { id: "ten-catches", name: "Working Deck", desc: "Land 10 fish", icon: "⚓", test: (s) => s.profile.totalCatches >= 10 },
    { id: "twenty-five", name: "Old Salt", desc: "Land 25 fish", icon: "🧭", test: (s) => s.profile.totalCatches >= 25 },
    { id: "common-clear", name: "Shallows Complete", desc: "Log every common species", icon: "🪝", test: (s) => SPECIES.filter((x) => x.rarity === "common").every((x) => s.collection[x.id]) },
    { id: "first-rare", name: "Blue Water", desc: "Land a rare species", icon: "💠", test: (s) => SPECIES.some((x) => x.rarity === "rare" && s.collection[x.id]) },
    { id: "first-legend", name: "Myth Maker", desc: "Land a legendary species", icon: "👑", test: (s) => SPECIES.some((x) => x.rarity === "legendary" && s.collection[x.id]) },
    { id: "heavy-fifty", name: "Heavyweight", desc: "Land a fish of 50 kg or more", icon: "🏋️", test: (s) => s.records.heaviest && s.records.heaviest.kg >= 50 },
    { id: "storm-fish", name: "Storm Chaser", desc: "Land a fish during a storm", icon: "⛈️", test: (s) => s.catches.some((c) => c.weather === "storm") },
    { id: "night-fish", name: "Night Tide", desc: "Land a fish at night", icon: "🌙", test: (s) => s.catches.some((c) => c.weather === "night") },
    { id: "all-species", name: "Complete Aquarium", desc: "Document all 18 species", icon: "🏆", test: (s) => SPECIES.every((x) => s.collection[x.id]) },
    { id: "fully-rigged", name: "Fully Rigged", desc: "Max out every upgrade", icon: "🛠️", test: (s) => UPGRADES.every((u) => (s.upgrades[u.id] || 0) >= u.max) },
    { id: "tide-emperor", name: "Emperor's Favour", desc: "Land the Tide Emperor", icon: "🔱", test: (s) => !!s.collection["tide-emperor"] }
  ];

  /* ────────────────────────────────────────────────────────────
     4. Save system
     ──────────────────────────────────────────────────────────── */
  const SAVE_KEY = "oceancraft3d.save.v1";
  const SAVE_VERSION = 1;
  const MAX_CATCHES = 240;

  function defaultSave() {
    return {
      version: SAVE_VERSION,
      createdAt: nowMs(),
      profile: {
        coins: 0, xp: 0, totalCatches: 0, totalWeight: 0, totalCoinsEarned: 0,
        playSeconds: 0, favoriteWeather: "calm"
      },
      catches: [],
      collection: {},
      upgrades: { rod: 0, reel: 0, line: 0, sonar: 0, lure: 0 },
      achievements: [],
      records: { heaviest: null, longest: null, rarest: null },
      settings: { muted: false, volume: 0.66 },
      lastCatch: null
    };
  }

  function normalizeSave(input) {
    const base = defaultSave();
    if (!input || typeof input !== "object") return base;
    const src = input.save && typeof input.save === "object" ? input.save : input;
    if (!src.profile || typeof src.profile !== "object") return base;
    if (src.version != null && Number(src.version) > SAVE_VERSION) return base;

    base.createdAt = Number(src.createdAt) || base.createdAt;
    base.profile.coins = clamp(Number(src.profile.coins) || 0, 0, 1e9);
    base.profile.xp = clamp(Number(src.profile.xp) || 0, 0, 1e9);
    base.profile.totalCatches = clamp(Number(src.profile.totalCatches) || 0, 0, 1e9);
    base.profile.totalWeight = clamp(Number(src.profile.totalWeight) || 0, 0, 1e12);
    base.profile.totalCoinsEarned = clamp(Number(src.profile.totalCoinsEarned) || 0, 0, 1e12);
    base.profile.playSeconds = clamp(Number(src.profile.playSeconds) || 0, 0, 1e9);
    if (WEATHER[src.profile.favoriteWeather]) base.profile.favoriteWeather = src.profile.favoriteWeather;

    if (src.upgrades && typeof src.upgrades === "object") {
      UPGRADES.forEach((u) => {
        base.upgrades[u.id] = clamp(Math.floor(Number(src.upgrades[u.id]) || 0), 0, u.max);
      });
    }
    if (src.settings && typeof src.settings === "object") {
      base.settings.muted = !!src.settings.muted;
      base.settings.volume = clamp(Number(src.settings.volume) || 0.66, 0, 1);
    }

    if (Array.isArray(src.catches)) {
      base.catches = src.catches.filter((c) => c && SPECIES_BY_ID[c.speciesId] && Number(c.kg) > 0)
        .slice(0, MAX_CATCHES).map((c, i) => {
          const sp = SPECIES_BY_ID[c.speciesId];
          return {
            id: String(c.id || ("c" + (nowMs() + i) + Math.random().toString(16).slice(2, 6))),
            speciesId: sp.id, name: sp.name, rarity: sp.rarity,
            kg: round(Number(c.kg), 2), cm: Math.round(Number(c.cm) || sp.minCm),
            weather: WEATHER[c.weather] ? c.weather : "calm",
            coins: clamp(Math.round(Number(c.coins) || 0), 0, 1e7),
            at: Number(c.at) || nowMs()
          };
        });
    }

    if (src.collection && typeof src.collection === "object") {
      SPECIES.forEach((sp) => {
        const c = src.collection[sp.id];
        if (c && typeof c === "object" && Number(c.count) > 0) {
          base.collection[sp.id] = {
            count: clamp(Math.floor(Number(c.count) || 1), 1, 1e7),
            bestKg: round(Number(c.bestKg) || 0, 2),
            bestCm: Math.round(Number(c.bestCm) || 0),
            firstAt: Number(c.firstAt) || nowMs(),
            lastAt: Number(c.lastAt) || nowMs()
          };
        }
      });
    } else {
      // Rebuild the collection from catches if an older save lacks it.
      base.catches.slice().reverse().forEach((c) => {
        const sp = SPECIES_BY_ID[c.speciesId];
        const entry = base.collection[sp.id] || { count: 0, bestKg: 0, bestCm: 0, firstAt: c.at, lastAt: c.at };
        entry.count += 1;
        entry.bestKg = Math.max(entry.bestKg, c.kg);
        entry.bestCm = Math.max(entry.bestCm, c.cm);
        entry.lastAt = c.at;
        base.collection[sp.id] = entry;
      });
    }

    if (Array.isArray(src.achievements)) {
      base.achievements = src.achievements.filter((id) => ACHIEVEMENTS.some((a) => a.id === id));
    }

    if (src.records && typeof src.records === "object") {
      ["heaviest", "longest", "rarest"].forEach((k) => {
        const r = src.records[k];
        if (r && typeof r === "object" && r.speciesId && SPECIES_BY_ID[r.speciesId]) {
          base.records[k] = {
            speciesId: r.speciesId, name: SPECIES_BY_ID[r.speciesId].name,
            kg: round(Number(r.kg) || 0, 2), cm: Math.round(Number(r.cm) || 0),
            rarity: SPECIES_BY_ID[r.speciesId].rarity, at: Number(r.at) || nowMs()
          };
        }
      });
    }
    if (!base.records.heaviest && base.catches.length) rebuildRecords(base);
    if (src.lastCatch && typeof src.lastCatch === "object" && SPECIES_BY_ID[src.lastCatch.speciesId]) {
      base.lastCatch = {
        speciesId: src.lastCatch.speciesId, name: SPECIES_BY_ID[src.lastCatch.speciesId].name,
        kg: round(Number(src.lastCatch.kg) || 0, 2), cm: Math.round(Number(src.lastCatch.cm) || 0),
        rarity: SPECIES_BY_ID[src.lastCatch.speciesId].rarity, at: Number(src.lastCatch.at) || nowMs()
      };
    }
    return base;
  }

  function validateSave(input) {
    const src = input && input.save && typeof input.save === "object" ? input.save : input;
    if (!src || typeof src !== "object") return false;
    if (!src.profile || typeof src.profile !== "object") return false;
    if (src.profile.coins != null && (typeof src.profile.coins !== "number" || !isFinite(src.profile.coins))) return false;
    if (src.version != null && (!Number.isFinite(Number(src.version)) || Number(src.version) > SAVE_VERSION)) return false;
    if (src.catches != null && !Array.isArray(src.catches)) return false;
    if (src.upgrades != null && typeof src.upgrades !== "object") return false;
    return true;
  }

  function rebuildRecords(target) {
    target.records = { heaviest: null, longest: null, rarest: null };
    target.catches.forEach((c) => {
      const rec = { speciesId: c.speciesId, name: c.name, kg: c.kg, cm: c.cm, rarity: c.rarity, at: c.at };
      if (!target.records.heaviest || rec.kg > target.records.heaviest.kg) target.records.heaviest = rec;
      if (!target.records.longest || rec.cm > target.records.longest.cm) target.records.longest = rec;
      if (!target.records.rarest || RARITY[rec.rarity].rank > RARITY[target.records.rarest.rarity].rank) target.records.rarest = rec;
    });
  }

  let save = defaultSave();
  let saveDirty = false;
  let autosaveEnabled = true;
  let sessionStart = nowMs();

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      if (!validateSave(parsed)) return defaultSave();
      return normalizeSave(parsed);
    } catch (err) {
      console.warn("[OceanCraft] Could not read local save:", err);
      return defaultSave();
    }
  }

  function persistSave(silent) {
    try {
      save.profile.playSeconds = Math.round(save.profile.playSeconds || 0);
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      saveDirty = false;
      const state = $("#save-state");
      if (state) state.innerHTML = "<i></i>Autosaved locally";
      if (!silent) toast("Aquarium log saved to this browser", "💾", "teal");
    } catch (err) {
      console.warn("[OceanCraft] Could not write local save:", err);
      if (!silent) toast("Browser storage is unavailable — export a save file", "⚠️", "danger");
    }
  }

  function xpForLevel(level) { return Math.max(0, (level - 1) * 250); }
  function levelInfo() {
    const xp = save.profile.xp || 0;
    const level = Math.floor(xp / 250) + 1;
    const into = xp - xpForLevel(level);
    const titles = ["Deckhand", "Deckhand", "Angler", "Angler", "First Mate", "First Mate", "Captain", "Captain", "Harbourmaster", "Harbourmaster", "Sea Legend"];
    return { level, into, next: 250, title: titles[Math.min(level, titles.length - 1)] };
  }

  function collectionCount(target) { return Object.keys((target || save).collection || {}).length; }

  function recordCatchData(target, sp, specimen, weatherKey) {
    const coins = Math.round(sp.reward * (0.72 + specimen.ratio * 0.7) * (sp.rarity === "legendary" ? 1.15 : 1));
    const xp = Math.round(14 + RARITY[sp.rarity].rank * 26 + specimen.ratio * 18);
    const at = nowMs();
    const entry = {
      id: "c" + at.toString(36) + Math.random().toString(36).slice(2, 6),
      speciesId: sp.id, name: sp.name, rarity: sp.rarity,
      kg: specimen.kg, cm: specimen.cm, weather: weatherKey, coins, at
    };
    const had = !!target.collection[sp.id];
    target.catches.unshift(entry);
    target.catches = target.catches.slice(0, MAX_CATCHES);
    target.profile.coins += coins;
    target.profile.totalCoinsEarned += coins;
    target.profile.xp += xp;
    target.profile.totalCatches += 1;
    target.profile.totalWeight = round((target.profile.totalWeight || 0) + specimen.kg, 2);
    target.profile.favoriteWeather = weatherKey;

    const c = target.collection[sp.id] || { count: 0, bestKg: 0, bestCm: 0, firstAt: at, lastAt: at };
    c.count += 1;
    c.bestKg = Math.max(c.bestKg, specimen.kg);
    c.bestCm = Math.max(c.bestCm, specimen.cm);
    c.lastAt = at;
    target.collection[sp.id] = c;
    target.lastCatch = { speciesId: sp.id, name: sp.name, kg: specimen.kg, cm: specimen.cm, rarity: sp.rarity, at };

    if (!target.records.heaviest || specimen.kg > target.records.heaviest.kg) {
      target.records.heaviest = { speciesId: sp.id, name: sp.name, kg: specimen.kg, cm: specimen.cm, rarity: sp.rarity, at };
    }
    if (!target.records.longest || specimen.cm > target.records.longest.cm) {
      target.records.longest = { speciesId: sp.id, name: sp.name, kg: specimen.kg, cm: specimen.cm, rarity: sp.rarity, at };
    }
    if (!target.records.rarest || RARITY[sp.rarity].rank > RARITY[target.records.rarest.rarity].rank) {
      target.records.rarest = { speciesId: sp.id, name: sp.name, kg: specimen.kg, cm: specimen.cm, rarity: sp.rarity, at };
    }

    const newAchievements = [];
    ACHIEVEMENTS.forEach((a) => {
      if (!target.achievements.includes(a.id) && a.test(target)) {
        target.achievements.push(a.id);
        newAchievements.push(a);
      }
    });
    return { entry, coins, xp, isNewSpecies: !had, newAchievements, isRecord: target.records.heaviest === entry || (target.records.heaviest && target.records.heaviest.speciesId === sp.id && target.records.heaviest.kg === specimen.kg) };
  }

  function rollSpecimen(sp) {
    // Bias toward mid-size fish while keeping a rare shot at a true monster.
    const t = Math.pow(Math.random(), 1.45);
    const kg = round(sp.minKg + (sp.maxKg - sp.minKg) * t, 2);
    const ratio = clamp((kg - sp.minKg) / Math.max(0.001, sp.maxKg - sp.minKg), 0, 1);
    const cm = Math.round(sp.minCm + (sp.maxCm - sp.minCm) * (ratio * 0.72 + Math.random() * 0.28));
    return { kg, cm, ratio };
  }

  function rollSpeciesData(target, weatherKey, castPower) {
    const sonar = (target.upgrades && target.upgrades.sonar) || 0;
    let legendary = 0.055 + sonar * 0.008;
    let rare = 0.225 + sonar * 0.014;
    if (weatherKey === "night") { legendary += 0.045; rare += 0.025; }
    if (weatherKey === "storm") { legendary += 0.018; rare += 0.05; }
    legendary += clamp(castPower || 0, 0, 1) * 0.018;
    rare += clamp(castPower || 0, 0, 1) * 0.02;
    const roll = Math.random();
    let rarity = "common";
    if (roll < legendary) rarity = "legendary";
    else if (roll < legendary + rare) rarity = "rare";
    const pool = SPECIES.filter((s) => s.rarity === rarity);
    return pick(pool);
  }

  function buyUpgradeData(target, id) {
    const upgrade = UPGRADE_BY_ID[id];
    if (!upgrade) return { ok: false, reason: "Unknown upgrade" };
    const level = target.upgrades[id] || 0;
    if (level >= upgrade.max) return { ok: false, reason: "Already maxed" };
    const cost = upgrade.costs[level];
    if (target.profile.coins < cost) return { ok: false, reason: "Not enough coins", cost };
    target.profile.coins -= cost;
    target.upgrades[id] = level + 1;
    const newAchievements = [];
    ACHIEVEMENTS.forEach((a) => {
      if (!target.achievements.includes(a.id) && a.test(target)) {
        target.achievements.push(a.id);
        newAchievements.push(a);
      }
    });
    return { ok: true, level: level + 1, cost, newAchievements };
  }

  function safeZoneFor(target) {
    const l = (target.upgrades && target.upgrades.line) || 0;
    return { low: Math.max(13, 23 - l * 1.5), high: Math.min(88, 80 + l * 1.5) };
  }
  function tensionTargetFor(fish, held, surge, lineLevel) {
    return 36 + fish.strength * 33 + (held ? 22 : -14) + surge * 34 - lineLevel * 3;
  }
  function progressRateFor(tension, held, reelLevel, safeLow, safeHigh) {
    if (!held) return 0;
    const center = (safeLow + safeHigh) / 2;
    const span = Math.max(12, (safeHigh - safeLow) / 2);
    const focus = clamp(1 - Math.abs(tension - center) / span, 0, 1);
    const inZone = tension >= safeLow && tension <= safeHigh;
    return (7.2 + reelLevel * 1.4) * (0.42 + 0.82 * focus) * (inZone ? 1 : 0.34);
  }

  /* ────────────────────────────────────────────────────────────
     5. Procedural fish illustrations (SVG)
     ──────────────────────────────────────────────────────────── */
  function fishSVG(sp, opts) {
    opts = opts || {};
    const uid = "fish" + (++svgUid);
    const silhouette = !!opts.silhouette;
    const c1 = silhouette ? "#183449" : sp.color;
    const c2 = silhouette ? "#091a27" : sp.accent;
    const eye = silhouette ? "#07131c" : "#06131c";
    const glow = !silhouette && sp.rarity === "legendary";
    const shimmer = !silhouette && sp.rarity !== "common";
    const defs = `
      <defs>
        <linearGradient id="${uid}g" x1="20" y1="24" x2="118" y2="66" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c1}"/><stop offset=".55" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
        </linearGradient>
        <linearGradient id="${uid}t" x1="108" y1="30" x2="146" y2="58" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c2}"/><stop offset="1" stop-color="${c1}" stop-opacity=".65"/>
        </linearGradient>
        ${glow ? `<filter id="${uid}f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ""}
        ${shimmer ? `<linearGradient id="${uid}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` : ""}
      </defs>`;
    let body = "";
    const pattern = (() => {
      switch (sp.shape) {
        case "mackerel":
          return `<g opacity=".4" stroke="${c2}" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M39 31c8-5 14-4 21 1s14 5 21 0"/><path d="M44 43c9-3 16-1 23 4s14 4 21-1"/><path d="M55 57c8-2 14 0 20 4"/></g>`;
        case "perch":
          return `<g opacity=".38" stroke="${c2}" stroke-width="5" stroke-linecap="round"><path d="M51 25v36"/><path d="M68 23v40"/><path d="M85 24v37"/></g>`;
        case "snapper":
          return `<g fill="${c2}" opacity=".38"><circle cx="53" cy="35" r="2.2"/><circle cx="68" cy="46" r="1.8"/><circle cx="82" cy="33" r="1.4"/><circle cx="93" cy="49" r="2"/><circle cx="61" cy="55" r="1.2"/></g>`;
        case "grouper":
          return `<g fill="${c2}" opacity=".28"><circle cx="47" cy="36" r="5"/><circle cx="63" cy="50" r="3.6"/><circle cx="79" cy="34" r="4"/><circle cx="92" cy="52" r="2.8"/><circle cx="72" cy="61" r="2"/></g>`;
        case "bass":
          return `<path d="M36 47c18-7 42-8 64-2" stroke="${c2}" stroke-width="2.4" opacity=".55" fill="none" stroke-linecap="round"/>`;
        case "tuna":
          return `<g fill="${c2}" opacity=".7"><path d="M56 21l5 7-7-1Z"/><path d="M70 18l4 8-7-1Z"/><path d="M84 20l3 8-6-1Z"/><path d="M58 64l5-7-7 1Z"/><path d="M73 66l4-8-7 1Z"/></g>`;
        case "marlin":
          return `<path d="M17 40 2 27l14 17-14 15 18-12Z" fill="${c2}" opacity=".9"/><path d="M50 22c9-15 18-16 26-2-9-4-17 1-26 2Z" fill="${c2}" opacity=".55"/>`;
        case "coelacanth":
          return `<g fill="${c2}" opacity=".65"><path d="M57 58c-7 10-5 17 4 20 3-8 5-15 3-21Z"/><path d="M74 61c-4 9-1 16 8 18 1-8 0-14-3-19Z"/></g>`;
        case "emperor":
          return `<g fill="${c2}" opacity=".72"><path d="M50 23 54 8l7 13 7-16 5 17 8-12-1 15Z"/><path d="M45 60l-2 11 8-8 3 10 4-12Z"/></g><g fill="none" stroke="${c2}" stroke-width="2" opacity=".5"><path d="M36 40c14-10 39-12 59-4"/><path d="M44 54c16-6 34-6 48-1"/></g>`;
        default:
          return `<path d="M40 60c12-5 31-5 47 1" stroke="${c2}" stroke-width="1.6" opacity=".4" fill="none"/>`;
      }
    })();

    if (sp.shape === "ray") {
      body = `
        <path d="M75 15c16 0 38 17 52 31-18 7-38 10-52 21-14-11-34-14-52-21 14-14 36-31 52-31Z" fill="url(#${uid}g)" stroke="#eaf9ff" stroke-opacity=".25" stroke-width="1"/>
        <path d="M75 41c8 9 5 25 0 40-5-15-8-31 0-40Z" fill="${c2}" opacity=".62"/>
        <g fill="none" stroke="${c2}" stroke-width="1.4" opacity=".45"><path d="M75 30c-9 9-19 17-33 21"/><path d="M75 30c9 9 19 17 33 21"/><path d="M75 46c-7 7-13 13-17 21"/><path d="M75 46c7 7 13 13 17 21"/></g>
        <circle cx="62" cy="40" r="2.6" fill="${eye}"/><circle cx="89" cy="40" r="2.6" fill="${eye}"/>
        <path d="M64 30c8 3 14 3 22 0" stroke="#eaf9ff" stroke-opacity=".3" fill="none"/>`;
    } else if (sp.shape === "eel") {
      body = `
        <path d="M18 46c14-22 32-33 52-28 20 5 26 23 43 19 10-2 16-10 22-19-2 16-2 28 5 40-12-7-22-7-32-3-18 7-26-8-41-13-19-6-33 8-49 4Z" fill="url(#${uid}g)" stroke="#eaf9ff" stroke-opacity=".24"/>
        <path d="M56 22c8-8 16-8 23-2-11-1-18 4-23 2Z" fill="${c2}" opacity=".6"/>
        <path d="M47 56c10 8 21 8 31 1-12 2-22-1-31-1Z" fill="${c2}" opacity=".5"/>
        <path d="M35 41c13-10 25-8 35 0" stroke="${c2}" stroke-width="2" opacity=".4" fill="none"/>
        <circle cx="31" cy="42" r="3" fill="${eye}"/><circle cx="32" cy="41" r="1" fill="#fff" opacity=".8"/>
        <path d="M85 33c8 6 17 6 26 2M79 49c10 2 20-1 29-8" stroke="${c1}" stroke-width="1.2" opacity=".28" fill="none"/>`;
    } else if (sp.shape === "squid") {
      body = `
        <path d="M71 10c13-3 24 8 22 25-1 10-8 17-16 20 8 11 18 12 26 20-12-2-19 3-26 9 0-9-5-15-11-19-8-5-12-15-10-27 1-13 7-25 15-28Z" fill="url(#${uid}g)" stroke="#eaf9ff" stroke-opacity=".24"/>
        <g stroke="${c2}" stroke-width="4.2" stroke-linecap="round" fill="none" opacity=".85">
          <path d="M62 55c-8 13-8 21-3 27"/><path d="M73 57c-3 13-1 20 6 25"/><path d="M84 56c2 13 7 19 15 21"/><path d="M90 51c8 11 16 14 24 13"/>
        </g>
        <g fill="${c1}" opacity=".6"><circle cx="71" cy="29" r="2.2"/><circle cx="82" cy="23" r="1.8"/><circle cx="88" cy="35" r="1.4"/><circle cx="76" cy="41" r="1.7"/></g>
        <circle cx="74" cy="34" r="4.4" fill="${eye}"/><circle cx="75.5" cy="32.5" r="1.4" fill="#eafcff"/>
        ${glow ? `<circle cx="100" cy="18" r="3" fill="#d8fff6" opacity=".9"/>` : ""}`;
    } else if (sp.shape === "leviathan") {
      body = `
        <path d="M12 54c12-25 30-33 48-22 15 9 15 30 32 33 16 3 27-12 38-27 1 17 5 29 14 39-15-6-28-4-39 3-18 11-31 7-43-7-9-11-18-14-31-11-8 2-13 1-19-8Z" fill="url(#${uid}g)" stroke="#fff3c4" stroke-opacity=".4" stroke-width="1.4" ${glow ? `filter="url(#${uid}f)"` : ""}/>
        <path d="M24 48 18 32l12 7 6-16 7 16 10-13 2 18Z" fill="${c2}" opacity=".75"/>
        <path d="M108 36c9-13 20-18 30-11-8 3-12 8-14 16Z" fill="${c2}" opacity=".7"/>
        <path d="M53 67c8 7 17 9 27 7-8 9-20 11-29 4Z" fill="${c2}" opacity=".6"/>
        <g fill="${c2}" opacity=".5"><path d="M32 41l4 8-7-2Z"/><path d="M48 33l4 9-8-2Z"/><path d="M66 41l4 8-7-2Z"/></g>
        <circle cx="25" cy="49" r="3.4" fill="${eye}"/><circle cx="26" cy="48" r="1.1" fill="#fff" opacity=".9"/>
        <g fill="none" stroke="#fff8d8" stroke-width="1.3" opacity=".55"><path d="M78 47c9-3 19-3 28 0"/><path d="M70 58c8 2 15 2 23-1"/></g>`;
    } else if (sp.shape === "angler") {
      body = `
        <path d="M22 48c0-18 18-30 39-29 21 1 33 12 36 26 2 12-6 21-20 24-20 4-48-4-55-21Z" fill="url(#${uid}g)" stroke="#eaf9ff" stroke-opacity=".22"/>
        <path d="M32 56c12 9 28 11 43 7-10 5-25 6-37 2-4-2-6-5-6-9Z" fill="${c2}" opacity=".6"/>
        <path d="M55 56 60 65 65 56 70 64 74 55Z" fill="#f4f8e9" opacity=".9"/>
        <path d="M61 22c9-13 12-18 11-22 9 7 10 16 8 23" stroke="${c1}" stroke-width="1.6" fill="none"/>
        <circle cx="72" cy="3" r="4" fill="#d9fff4" opacity=".95"/><circle cx="72" cy="3" r="8" fill="#8fffe0" opacity=".18"/>
        <path d="M84 30c9-7 19-5 23 3-8-2-16 2-23-3Z" fill="${c2}" opacity=".6"/>
        <circle cx="38" cy="40" r="4.6" fill="${eye}"/><circle cx="39.5" cy="38.5" r="1.5" fill="#eafcff"/>
        <path d="M30 50c8-2 16-1 23 3" stroke="${c2}" stroke-width="1.5" opacity=".5" fill="none"/>`;
    } else {
      const sy = ["sardine", "herring", "mackerel", "tuna", "jack", "marlin"].includes(sp.shape) ? 0.78
        : ["grouper", "snapper", "perch"].includes(sp.shape) ? 1.08 : 0.94;
      body = `
        <g transform="translate(0 43) scale(1 ${sy}) translate(0 -43)">
          <path d="M16 43c11-24 58-31 90-14 8 4 14 7 21 4l-6 14 8 16c-12-7-20-8-28-4-29 15-70 10-85-16Z" fill="url(#${uid}g)" stroke="#eaf9ff" stroke-opacity=".26" stroke-width="1.2" ${glow ? `filter="url(#${uid}f)"` : ""}/>
          <path d="M59 23c8-14 23-16 33-4-12-3-23 2-33 4Z" fill="${c2}" opacity=".72"/>
          <path d="M55 63c8 13 22 13 31 3-12 4-22 0-31-3Z" fill="${c2}" opacity=".62"/>
          <path d="M57 49c-11 5-18 13-19 23 8-8 16-12 26-12Z" fill="${c2}" opacity=".55"/>
          <path d="M106 33c12-11 26-16 40-12-10 6-16 14-18 24 13 0 23 4 32 15-17 1-31-2-44-8Z" fill="url(#${uid}t)" opacity=".95"/>
          <path d="M106 33c12-11 26-16 40-12-10 6-16 14-18 24 13 0 23 4 32 15-17 1-31-2-44-8Z" fill="none" stroke="#eaf9ff" stroke-opacity=".16"/>
          <path d="M31 47c8-6 15-8 24-6" stroke="${c2}" stroke-width="1.5" opacity=".35" fill="none"/>
          <circle cx="32" cy="39" r="3.8" fill="${eye}"/><circle cx="33.4" cy="37.6" r="1.2" fill="#eafcff" opacity=".9"/>
          ${shimmer ? `<path d="M25 53c25 9 56 7 78-4" stroke="url(#${uid}s)" stroke-width="3" fill="none" opacity=".6"/>` : ""}
        </g>
        ${pattern}`;
    }
    return `<svg viewBox="0 0 150 84" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${defs}${body}</svg>`;
  }

  /* ────────────────────────────────────────────────────────────
     6. Procedural audio (Web Audio API)
     ──────────────────────────────────────────────────────────── */
  class AudioEngine {
    constructor(settings) {
      this.ctx = null;
      this.master = null;
      this.ambient = null;
      this.ambientFilter = null;
      this.ambientGain = null;
      this.reelTimer = null;
      this.muted = !!(settings && settings.muted);
      this.volume = (settings && settings.volume) || 0.66;
      this.weather = "calm";
      this.started = false;
    }
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
        this.applyVolume();
        return this.ctx;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
        this.createAmbience();
        this.started = true;
        this.setWeather(this.weather, true);
        return this.ctx;
      } catch (err) {
        console.warn("[OceanCraft] Audio unavailable:", err);
        return null;
      }
    }
    applyVolume() {
      if (!this.master || !this.ctx) return;
      const target = this.muted ? 0 : this.volume;
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
    }
    setMuted(muted) {
      this.muted = muted;
      this.applyVolume();
    }
    setVolume(v) {
      this.volume = clamp(v, 0, 1);
      this.applyVolume();
    }
    noiseBuffer(seconds, brown) {
      const ctx = this.ctx;
      const len = Math.floor(ctx.sampleRate * seconds);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.018 * white) / 1.018;
          data[i] = last * 3.2;
        } else data[i] = white;
      }
      return buffer;
    }
    createAmbience() {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer(7, true);
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 520;
      filter.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0.09;
      src.connect(filter).connect(gain).connect(this.master);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.085;
      lfoGain.gain.value = 0.028;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
      src.start();
      this.ambient = { src, gain };
      this.ambientFilter = filter;
      this.ambientGain = gain;
    }
    setWeather(key, immediate) {
      this.weather = key;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const cfg = key === "storm" ? { f: 1050, g: 0.17 } : key === "night" ? { f: 380, g: 0.065 } : { f: 520, g: 0.09 };
      if (this.ambientFilter) this.ambientFilter.frequency.setTargetAtTime(cfg.f, t, immediate ? 0.05 : 0.8);
      if (this.ambientGain) this.ambientGain.gain.setTargetAtTime(cfg.g, t, immediate ? 0.05 : 0.8);
    }
    tone(freq, dur, type, peak, slideTo, when) {
      if (!this.ctx || this.muted) return;
      const ctx = this.ctx;
      const t0 = when || ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak || 0.12), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    }
    noiseBurst(dur, freq, q, peak, type) {
      if (!this.ctx || this.muted) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer(Math.max(0.2, dur + 0.1), false);
      const filter = ctx.createBiquadFilter();
      filter.type = type || "bandpass";
      filter.frequency.setValueAtTime(freq, t0);
      filter.Q.value = q || 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(peak || 0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter).connect(g).connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    }
    click(strength) {
      this.ensure();
      this.tone(1500 + Math.random() * 350, 0.028, "square", (strength || 0.025), 900);
    }
    ui() { this.ensure(); this.tone(720, 0.06, "sine", 0.04, 960); }
    cast(power) {
      this.ensure();
      this.noiseBurst(0.45, 1200 + power * 900, 0.5, 0.07 + power * 0.05, "highpass");
      this.tone(220, 0.5, "sine", 0.035, 80);
    }
    splash(intensity) {
      this.ensure();
      const k = intensity || 1;
      this.noiseBurst(0.55 + k * 0.2, 1100, 0.6, 0.09 * k, "bandpass");
      this.tone(180, 0.25, "sine", 0.06 * k, 60);
    }
    bite() {
      this.ensure();
      this.tone(92, 0.28, "sawtooth", 0.16, 55);
      this.tone(620, 0.16, "triangle", 0.09, 880);
      this.tone(940, 0.2, "sine", 0.06, 1240);
      this.noiseBurst(0.3, 700, 0.7, 0.08);
    }
    surge() {
      this.ensure();
      this.tone(58, 0.5, "sawtooth", 0.12, 36);
      this.noiseBurst(0.4, 240, 0.9, 0.09, "lowpass");
    }
    snap() {
      this.ensure();
      this.tone(1100, 0.12, "sawtooth", 0.13, 900);
      this.noiseBurst(0.22, 2400, 1.2, 0.15, "highpass");
      this.tone(140, 0.5, "triangle", 0.1, 45);
    }
    escape() {
      this.ensure();
      this.tone(420, 0.24, "triangle", 0.08, 300);
      this.tone(260, 0.4, "sine", 0.07, 140);
      this.noiseBurst(0.3, 500, 0.6, 0.06);
    }
    catchChime(rarity) {
      this.ensure();
      if (!this.ctx) return;
      const base = rarity === "legendary" ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : rarity === "rare" ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
      base.forEach((f, i) => {
        this.tone(f, 0.55, "triangle", 0.08, null, this.ctx.currentTime + i * 0.11);
        this.tone(f / 2, 0.5, "sine", 0.04, null, this.ctx.currentTime + i * 0.11);
      });
    }
    thunder() {
      this.ensure();
      this.noiseBurst(2.6, 110, 0.7, 0.28, "lowpass");
      this.tone(42, 2.2, "sine", 0.12, 28);
    }
    startReel() {
      if (this.reelTimer) return;
      this.ensure();
      this.reelTimer = setInterval(() => this.click(0.022), 78);
    }
    stopReel() {
      if (this.reelTimer) { clearInterval(this.reelTimer); this.reelTimer = null; }
    }
  }

  /* ────────────────────────────────────────────────────────────
     7. UI references & small utilities
     ──────────────────────────────────────────────────────────── */
  const UI = {
    canvas: $("#ocean-canvas"),
    loading: $("#loading"), loadingFill: $("#loading-fill"), loadingStatus: $("#loading-status"),
    weatherName: $("#weather-name"), weatherDesc: $("#weather-desc"), seaBadge: $("#sea-badge"),
    readWave: $("#read-wave"), readWind: $("#read-wind"), readTemp: $("#read-temp"), readBite: $("#read-bite"),
    sonar: $("#sonar"), sonarNote: $("#sonar-note"),
    xpFill: $("#xp-fill"), levelLabel: $("#level-label"), coinCount: $("#coin-count"),
    rigState: $("#rig-state"), biteBanner: $("#bite-banner"),
    tensionTrack: $("#tension-track"), tensionZone: $("#tension-zone"), tensionFill: $("#tension-fill"),
    tensionNeedle: $("#tension-needle"), tensionReadout: $("#tension-readout"),
    progressFill: $("#progress-fill"), progressReadout: $("#progress-readout"),
    fishHint: $("#fish-hint"), fightTime: $("#fight-time"),
    chargeFill: $("#charge-fill"), chargeReadout: $("#charge-readout"), chargeWrap: $(".charge-wrap"),
    btnCast: $("#btn-cast"), btnReel: $("#btn-reel"), controlHint: $("#control-hint"),
    footerStatus: $("#footer-status"), lastCatch: $("#last-catch"),
    logbookBadge: $("#logbook-badge"), saveState: $("#save-state"),
    fileInput: $("#file-input"),
    catchModal: $("#catch-modal"), logbookModal: $("#logbook-modal"), helpModal: $("#help-modal"),
    catchArt: $("#catch-art"), catchTitle: $("#catch-title"), catchSub: $("#catch-sub"), catchRarity: $("#catch-rarity"),
    catchWeight: $("#catch-weight"), catchLength: $("#catch-length"), catchReward: $("#catch-reward"),
    catchExtra: $("#catch-extra"), catchEyebrow: $("#catch-eyebrow"), catchCard: $(".catch-card"),
    guideGrid: $("#guide-grid"), catchesList: $("#catches-list"), recordsHero: $("#records-hero"),
    recordsGrid: $("#records-grid"), achievementsGrid: $("#achievements-grid"),
    gearList: $("#gear-list"), gearCoins: $("#gear-coins"),
    logbookSub: $("#logbook-sub"), collectionPct: $("#collection-pct"), collectionRing: $("#collection-ring"),
    tabCatchCount: $("#tab-catch-count"),
    addToasts: $("#toasts"), weatherFlash: $("#weather-flash"),
    audioBtn: $("#btn-audio"),
    guideTab: $('.tab[data-tab="guide"]')
  };

  function toast(message, icon, type) {
    if (!UI.addToasts) return;
    while (UI.addToasts.children.length >= 3) UI.addToasts.removeChild(UI.addToasts.firstChild);
    const el = document.createElement("div");
    el.className = "toast" + (type ? " toast--" + type : "");
    el.innerHTML = `<span class="toast__icon">${icon || "•"}</span><span>${message}</span>`;
    UI.addToasts.appendChild(el);
    setTimeout(() => {
      el.classList.add("is-out");
      setTimeout(() => el.remove(), 420);
    }, 3400);
  }

  function weatherOf(key) { return WEATHER[key] || WEATHER.calm; }

  function formatDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h) return h + "h " + m + "m";
    return m + "m " + (s % 60) + "s";
  }

  const audio = new AudioEngine(save.settings);

  /* ────────────────────────────────────────────────────────────
     8. Three.js world
     ──────────────────────────────────────────────────────────── */
  const RT = {
    ready: false, scene: null, camera: null, renderer: null, controls: null,
    sunLight: null, hemiLight: null, ambientLight: null,
    skyUniforms: null, sunSprite: null, moonSprite: null, stars: null,
    clouds: null, cloudMat: null, birds: null, rain: null, bio: null,
    oceanGeo: null, oceanMat: null, ocean: null, farOcean: null,
    boat: null, rodTip: null, flag: null, flagBase: null, wakeGroup: null, wakeMat: null,
    windowMat: null, lanternLight: null, lanternSprite: null, lighthouseLamp: null, beamPivot: null, beam: null, bioGlow: null,
    buoys: [],
    bobber: null, bobberLine: null, bobberLineGeo: null, fish: null, fishMat: null,
    particles: null, gold: null, ripples: [],
    waveTime: 0, elapsed: 0, flash: 0, lightningTimer: 8,
    env: null, envTarget: null, weatherKey: "calm",
    lastFrame: 0, fps: 60, frameCount: 0, quality: "high"
  };

  const COLOR_KEYS = ["skyTop", "skyBottom", "fog", "deep", "crest", "foam", "sunColor", "hemiSky", "hemiGround", "cloudTint"];
  const NUM_KEYS = ["fogDensity", "sunIntensity", "ambient", "amp", "choppy", "speed", "wind", "temp", "exposure", "sunOpacity", "moonOpacity", "stars", "bio", "rain", "clouds", "beam", "birds"];

  function makeEnv(preset) {
    const obj = {};
    COLOR_KEYS.forEach((k) => { obj[k] = new THREE.Color(preset[k]); });
    NUM_KEYS.forEach((k) => { obj[k] = preset[k]; });
    return obj;
  }

  function initThree() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    RT.renderer = new THREE.WebGLRenderer({ canvas: UI.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    RT.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    RT.renderer.setSize(width, height, false);
    RT.renderer.outputEncoding = THREE.sRGBEncoding;
    RT.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    RT.renderer.toneMappingExposure = 1.08;

    RT.scene = new THREE.Scene();
    RT.scene.fog = new THREE.FogExp2(0x8b7064, 0.0027);
    RT.camera = new THREE.PerspectiveCamera(isMobile() ? 52 : 47, width / height, 0.1, 900);
    if (isMobile()) RT.camera.position.set(14, 8.2, 22);
    else RT.camera.position.set(10.5, 6.2, 15.5);

    const Orbit = THREE.OrbitControls || window.OrbitControls;
    if (Orbit) {
      RT.controls = new Orbit(RT.camera, UI.canvas);
      RT.controls.target.set(0, isMobile() ? 1.85 : 2.0, 0);
      RT.controls.enableDamping = true;
      RT.controls.dampingFactor = 0.055;
      RT.controls.enablePan = false;
      RT.controls.minDistance = isMobile() ? 14 : 9;
      RT.controls.maxDistance = isMobile() ? 42 : 30;
      RT.controls.minPolarAngle = 0.58;
      RT.controls.maxPolarAngle = 1.46;
      RT.controls.rotateSpeed = 0.55;
      RT.controls.zoomSpeed = 0.6;
      RT.controls.update();
    } else {
      RT.controls = makeFallbackOrbit(RT.camera, UI.canvas, new THREE.Vector3(0, 1.3, 0));
    }

    RT.hemiLight = new THREE.HemisphereLight(0xb9e6ff, 0x4a3029, 0.9);
    RT.scene.add(RT.hemiLight);
    RT.ambientLight = new THREE.AmbientLight(0x88bbd8, 0.32);
    RT.scene.add(RT.ambientLight);
    RT.sunLight = new THREE.DirectionalLight(0xffd7a1, 1.5);
    RT.sunLight.position.set(-60, 42, -100);
    RT.scene.add(RT.sunLight);

    RT.env = makeEnv(WEATHER.calm);
    RT.envTarget = makeEnv(WEATHER.calm);

    buildSky();
    buildScenery();
    buildOcean();
    buildBoat();
    buildFishingRig();
    buildRipples();
    buildWeatherFX();

    RT.particles = new ParticleField(520, 0.13, 0x9fe9ff);
    RT.gold = new ParticleField(260, 0.11, 0xffd166);

    RT.scene.add(RT.camera);
    RT.ready = true;

    window.addEventListener("resize", onResize);
    onResize();
  }

  function makeFallbackOrbit(camera, dom, target) {
    // Tiny fallback if the OrbitControls CDN is unavailable.
    let dragging = false, px = 0, py = 0;
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    const update = () => {
      camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(target));
      camera.lookAt(target);
    };
    dom.addEventListener("pointerdown", (e) => { dragging = true; px = e.clientX; py = e.clientY; });
    window.addEventListener("pointerup", () => { dragging = false; });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      sph.theta -= (e.clientX - px) * 0.005;
      sph.phi = clamp(sph.phi - (e.clientY - py) * 0.005, 0.58, 1.46);
      px = e.clientX; py = e.clientY; update();
    });
    dom.addEventListener("wheel", (e) => {
      e.preventDefault();
      sph.radius = clamp(sph.radius + e.deltaY * 0.02, 9, 30);
      update();
    }, { passive: false });
    update();
    return { update: () => {}, target };
  }

  function onResize() {
    if (!RT.renderer || !RT.camera) return;
    const w = window.innerWidth, h = window.innerHeight;
    RT.camera.aspect = w / h;
    RT.camera.fov = isMobile() ? 52 : 47;
    RT.camera.updateProjectionMatrix();
    RT.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.65 : 2));
    RT.renderer.setSize(w, h, false);
    if (RT.ocean) {
      const seg = isMobile() ? 74 : 112;
      RT.ocean.geometry.dispose();
      RT.ocean.geometry = makeOceanGeometry(seg);
      RT.oceanGeo = RT.ocean.geometry;
    }
  }

  /* ── Sky, sun, clouds, stars ───────────────────────────────── */
  function radialTexture(inner, mid, outer, power) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(0.18, mid);
    g.addColorStop(0.52, outer);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    if (power) {
      ctx.globalCompositeOperation = "destination-in";
      const g2 = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g2.addColorStop(0, "rgba(255,255,255,1)");
      g2.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, 256, 256);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function waterNormalTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(size, size);
    const waves = [];
    for (let i = 0; i < 9; i++) {
      waves.push({
        dir: rand(0, Math.PI * 2),
        freq: randInt(2, 7),
        amp: rand(0.25, 1.0),
        phase: rand(0, Math.PI * 2)
      });
    }
    const tau = Math.PI * 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let dx = 0, dy = 0;
        for (const w of waves) {
          const u = (x * Math.cos(w.dir) + y * Math.sin(w.dir)) / size;
          const c1 = Math.cos(u * w.freq * tau + w.phase);
          dx += c1 * w.freq * tau * Math.cos(w.dir) * w.amp;
          dy += c1 * w.freq * tau * Math.sin(w.dir) * w.amp;
        }
        let nx = -dx * 0.015;
        let ny = -dy * 0.015;
        let nz = 1;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len; ny /= len; nz /= len;
        const i = (y * size + x) * 4;
        img.data[i] = (nx * 0.5 + 0.5) * 255;
        img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
        img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(7, 7);
    return tex;
  }

  function buildSky() {
    const uniforms = {
      topColor: { value: new THREE.Color(WEATHER.calm.skyTop) },
      bottomColor: { value: new THREE.Color(WEATHER.calm.skyBottom) }
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorld;
        void main() {
          float h = normalize(vWorld).y;
          float k = smoothstep(-0.16, 0.62, h);
          gl_FragColor = vec4(mix(bottomColor, topColor, k), 1.0);
        }`
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 18), material);
    sky.renderOrder = -10;
    RT.scene.add(sky);
    RT.skyUniforms = uniforms;

    const sunMat = new THREE.SpriteMaterial({
      map: radialTexture("rgba(255,252,236,1)", "rgba(255,220,150,.92)", "rgba(255,150,70,.16)"),
      transparent: true, depthWrite: false, fog: false, opacity: 1
    });
    RT.sunSprite = new THREE.Sprite(sunMat);
    RT.sunSprite.position.set(-96, 18, -238);
    RT.sunSprite.scale.set(58, 58, 1);
    RT.scene.add(RT.sunSprite);

    const moonMat = new THREE.SpriteMaterial({
      map: radialTexture("rgba(242,252,255,1)", "rgba(190,225,255,.9)", "rgba(90,150,230,.16)"),
      transparent: true, depthWrite: false, fog: false, opacity: 0
    });
    RT.moonSprite = new THREE.Sprite(moonMat);
    RT.moonSprite.position.set(-158, 33, -232);
    RT.moonSprite.scale.set(34, 34, 1);
    RT.scene.add(RT.moonSprite);

    // Stars
    const starCount = 1200;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(rand(0.03, 0.97));
      const r = 385;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.abs(Math.cos(phi)) * r * 0.9 + 12;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const sm = new THREE.PointsMaterial({ color: 0xe8f8ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    RT.stars = new THREE.Points(sg, sm);
    RT.scene.add(RT.stars);

    // Soft cloud bank
    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = 512; cloudCanvas.height = 256;
    const cx = cloudCanvas.getContext("2d");
    for (let i = 0; i < 26; i++) {
      const x = rand(50, 462), y = rand(100, 190), r = rand(28, 78);
      const g = cx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,.5)");
      g.addColorStop(0.55, "rgba(255,255,255,.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      cx.fillStyle = g;
      cx.beginPath();
      cx.arc(x, y, r, 0, Math.PI * 2);
      cx.fill();
    }
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    cloudTex.encoding = THREE.sRGBEncoding;
    RT.cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.45, depthWrite: false, fog: false, color: 0xffd2b0 });
    RT.clouds = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(RT.cloudMat);
      s.position.set(rand(-210, 210), rand(28, 66), rand(-300, -105));
      const w = rand(50, 115);
      s.scale.set(w, w * rand(0.28, 0.46), 1);
      s.userData.speed = rand(0.25, 0.9);
      s.userData.x0 = s.position.x;
      s.userData.wrap = rand(220, 260);
      RT.clouds.add(s);
    }
    RT.scene.add(RT.clouds);

    // Birds (simple flapping silhouettes)
    RT.birds = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xe9f7ff, transparent: true, opacity: 0.55, fog: false });
      const bird = new THREE.Line(g, mat);
      bird.userData = { phase: rand(0, Math.PI * 2), radius: rand(24, 52), speed: rand(0.04, 0.09), height: rand(16, 26) };
      bird.scale.setScalar(rand(0.7, 1.25));
      RT.birds.add(bird);
    }
    RT.scene.add(RT.birds);
  }

  /* ── Ocean ─────────────────────────────────────────────────── */
  function makeOceanGeometry(segments) {
    const geo = new THREE.PlaneGeometry(380, 380, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color(0x0a3f52);
    for (let i = 0; i < count; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  function buildOcean() {
    RT.oceanGeo = makeOceanGeometry(isMobile() ? 74 : 112);
    RT.oceanMat = new THREE.MeshPhongMaterial({
      color: 0xffffff, specular: 0x000000, shininess: 8,
      transparent: true, opacity: 0.95, vertexColors: true,
      side: THREE.DoubleSide, flatShading: false
    });
    RT.ocean = new THREE.Mesh(RT.oceanGeo, RT.oceanMat);
    RT.ocean.frustumCulled = false;
    RT.ocean.renderOrder = 1;
    RT.scene.add(RT.ocean);

    // Warm glints along the sun path.
    const glitterCount = 520;
    const gp = new Float32Array(glitterCount * 3);
    const gphase = new Float32Array(glitterCount);
    for (let i = 0; i < glitterCount; i++) {
      gp[i * 3] = rand(-52, -4);
      gp[i * 3 + 1] = 0.1;
      gp[i * 3 + 2] = rand(-96, -24);
      gphase[i] = rand(0, Math.PI * 2);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.BufferAttribute(gp, 3));
    const gm = new THREE.PointsMaterial({
      color: 0xffd79a, size: 0.3, map: radialTexture("rgba(255,250,230,1)", "rgba(255,200,120,.7)", "rgba(255,170,80,.12)"),
      transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true
    });
    RT.glitter = new THREE.Points(gg, gm);
    RT.glitter.userData.phase = gphase;
    RT.glitter.frustumCulled = false;
    RT.glitter.renderOrder = 4;
    RT.scene.add(RT.glitter);

    const farMat = new THREE.MeshBasicMaterial({ color: 0x0a3f52, fog: true });
    RT.farOcean = new THREE.Mesh(new THREE.CircleGeometry(1000, 80), farMat);
    RT.farOcean.rotation.x = -Math.PI / 2;
    RT.farOcean.position.y = -1.4;
    RT.scene.add(RT.farOcean);
  }

  function waveHeight(x, z, t, amp, choppy) {
    const a = amp == null ? RT.env.amp : amp;
    const ch = choppy == null ? RT.env.choppy : choppy;
    let h = 0;
    h += Math.sin(x * 0.075 + z * 0.045 + t * 0.85) * 0.48;
    h += Math.sin(x * -0.055 + z * 0.095 + t * 1.13) * 0.31;
    h += Math.cos(x * 0.14 - z * 0.075 + t * 1.6) * 0.16;
    h += Math.sin(x * 0.031 + z * 0.026 + t * 0.42) * 0.55;
    h += Math.sin((x + z) * 0.018 - t * 0.3) * 0.35;
    return h * a * (0.9 + ch * 0.32);
  }

  function updateOcean(dt) {
    const geo = RT.oceanGeo;
    if (!geo) return;
    const pos = geo.attributes.position;
    const colors = geo.attributes.color;
    const arr = pos.array;
    const carr = colors.array;
    const t = RT.waveTime;
    const amp = RT.env.amp;
    const crest = RT.env.crest;
    const deep = RT.env.deep;
    const foam = RT.env.foam;
    const normalize = 1 / Math.max(0.35, amp * 2.7);
    const tmp = new THREE.Color();
    const foamTmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = arr[i * 3];
      const z = arr[i * 3 + 2];
      const h = waveHeight(x, z, t, amp, RT.env.choppy);
      arr[i * 3 + 1] = h;
      const k = clamp((h + amp * 1.35) * normalize, 0, 1);
      tmp.copy(deep).lerp(crest, k * 0.88);
      if (k > 0.9) {
        foamTmp.copy(foam);
        const foamMix = clamp((k - 0.9) / 0.1, 0, 1) * (0.12 + RT.env.choppy * 0.22);
        tmp.lerp(foamTmp, foamMix);
      }
      carr[i * 3] = tmp.r;
      carr[i * 3 + 1] = tmp.g;
      carr[i * 3 + 2] = tmp.b;
    }
    pos.needsUpdate = true;
    colors.needsUpdate = true;
    geo.computeVertexNormals();
    RT.farOcean.material.color.copy(deep).multiplyScalar(0.52);
    if (RT.glitter) {
      const ga = RT.glitter.geometry.attributes.position.array;
      const phases = RT.glitter.userData.phase;
      for (let i = 0; i < phases.length; i++) {
        ga[i * 3 + 1] = waveHeight(ga[i * 3], ga[i * 3 + 2], t, amp, RT.env.choppy) + 0.06;
      }
      RT.glitter.geometry.attributes.position.needsUpdate = true;
      RT.glitter.material.opacity = RT.env.sunOpacity * (0.52 + 0.2 * Math.sin(RT.elapsed * 2.2)) * (0.75 + RT.env.amp);
    }
  }

  /* ── Boat ──────────────────────────────────────────────────── */
  function woodTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#9a6336";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 16; i++) {
      const y = i * 32;
      ctx.fillStyle = i % 2 ? "rgba(50,24,10,.14)" : "rgba(255,215,160,.07)";
      ctx.fillRect(0, y, 512, 32);
      ctx.strokeStyle = "rgba(34,18,9,.34)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y + 31.5);
      ctx.lineTo(512, y + 31.5);
      ctx.stroke();
    }
    for (let i = 0; i < 240; i++) {
      ctx.strokeStyle = `rgba(${randInt(40, 85)},${randInt(20, 48)},10,${rand(0.03, 0.12)})`;
      ctx.lineWidth = rand(0.5, 1.6);
      const y = rand(0, 512);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(140, y + rand(-6, 6), 330, y + rand(-5, 5), 512, y + rand(-7, 7));
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.2, 3.4);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function boatNameTexture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 96;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 512, 96);
    ctx.font = "600 40px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,209,102,.95)";
    ctx.fillText("S.S. WANDERER", 256, 48);
    ctx.font = "500 14px Arial";
    ctx.fillStyle = "rgba(210,240,255,.45)";
    ctx.fillText("OCEANCRAFT", 256, 78);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function buildBoat() {
    const boat = new THREE.Group();
    boat.name = "S.S. Wanderer";
    RT.boat = boat;

    const cream = new THREE.MeshStandardMaterial({ color: 0xe4d8c0, roughness: 0.62, metalness: 0.06, side: THREE.DoubleSide });
    const creamDark = new THREE.MeshStandardMaterial({ color: 0xd7cdb7, roughness: 0.7, metalness: 0.05 });
    const teal = new THREE.MeshStandardMaterial({ color: 0x1b6f77, roughness: 0.42, metalness: 0.2 });
    const darkTeal = new THREE.MeshStandardMaterial({ color: 0x0f3e4a, roughness: 0.4, metalness: 0.3 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x9fb9c1, roughness: 0.25, metalness: 0.8 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9953f, roughness: 0.3, metalness: 0.85 });
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), color: 0xb98351, roughness: 0.78, metalness: 0.04, side: THREE.DoubleSide });
    const glass = new THREE.MeshPhongMaterial({ color: 0x16394c, emissive: 0xffb45e, emissiveIntensity: 0.12, shininess: 110, specular: 0xbfe9ff, transparent: true, opacity: 0.9 });
    RT.windowMat = glass;

    // Hull sections (port / keel / starboard)
    const sections = [
      { z: -3.25, w: 0.72, k: -0.3 }, { z: -2.85, w: 1.08, k: -0.5 }, { z: -1.9, w: 1.34, k: -0.6 },
      { z: -0.6, w: 1.44, k: -0.62 }, { z: 0.7, w: 1.38, k: -0.58 }, { z: 1.8, w: 1.08, k: -0.47 },
      { z: 2.65, w: 0.6, k: -0.3 }, { z: 3.28, w: 0.06, k: -0.1 }
    ];
    const ring = (s) => [
      new THREE.Vector3(-s.w, 0.37, s.z),
      new THREE.Vector3(-s.w * 0.88, -0.16, s.z),
      new THREE.Vector3(0, s.k, s.z),
      new THREE.Vector3(s.w * 0.88, -0.16, s.z),
      new THREE.Vector3(s.w, 0.37, s.z)
    ];
    const rings = sections.map(ring);
    const hullPositions = [];
    const addTri = (a, b, c) => { hullPositions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); };
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < 4; j++) {
        const a = rings[i][j], b = rings[i][j + 1], c = rings[i + 1][j], d = rings[i + 1][j + 1];
        addTri(a, b, c); addTri(b, d, c);
      }
    }
    // Transom
    const stern = rings[0];
    addTri(stern[0], stern[2], stern[1]); addTri(stern[0], stern[4], stern[2]);
    addTri(stern[1], stern[2], stern[3]); addTri(stern[2], stern[4], stern[3]);
    const hullGeo = new THREE.BufferGeometry();
    hullGeo.setAttribute("position", new THREE.Float32BufferAttribute(hullPositions, 3));
    hullGeo.computeVertexNormals();
    const hull = new THREE.Mesh(hullGeo, cream);
    boat.add(hull);

    // Deck cap
    const deckPositions = [];
    for (let i = 0; i < rings.length - 1; i++) {
      const a = rings[i][0], b = rings[i][4], c = rings[i + 1][0], d = rings[i + 1][4];
      deckPositions.push(a.x, 0.37, a.z, c.x, 0.37, c.z, b.x, 0.37, b.z);
      deckPositions.push(b.x, 0.37, b.z, c.x, 0.37, c.z, d.x, 0.37, d.z);
    }
    const deckGeo = new THREE.BufferGeometry();
    deckGeo.setAttribute("position", new THREE.Float32BufferAttribute(deckPositions, 3));
    deckGeo.computeVertexNormals();
    const deck = new THREE.Mesh(deckGeo, wood);
    boat.add(deck);

    // Side stripe + gunwale tubes
    ["port", "starboard"].forEach((side) => {
      const pts = sections.map((s) => new THREE.Vector3((side === "port" ? -1 : 1) * s.w * 1.005, 0.3, s.z));
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.055, 6, false), teal);
      boat.add(tube);
      const stripePts = sections.map((s) => new THREE.Vector3((side === "port" ? -1 : 1) * s.w * 1.003, 0.03, s.z));
      const stripe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stripePts), 30, 0.035, 5, false), darkTeal);
      boat.add(stripe);
    });

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.96, 2.02), cream);
    cabin.position.set(0, 0.87, -0.55);
    boat.add(cabin);
    const cabinBase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 2.12), creamDark);
    cabinBase.position.set(0, 0.4, -0.55);
    boat.add(cabinBase);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.11, 2.2), teal);
    roof.position.set(0, 1.4, -0.55);
    boat.add(roof);
    const roofLip = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.045, 2.26), darkTeal);
    roofLip.position.set(0, 1.47, -0.55);
    boat.add(roofLip);

    // Sonar dome (unlocked boat upgrade)
    const sonarDome = new THREE.Group();
    const domeMast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.42, 6), metal);
    domeMast.position.y = 0.21;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), teal);
    dome.position.y = 0.44;
    const domeRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 5, 16), brass);
    domeRing.position.y = 0.44;
    domeRing.rotation.x = Math.PI / 2;
    sonarDome.add(domeMast, dome, domeRing);
    sonarDome.position.set(0.72, 1.48, -0.78);
    sonarDome.visible = false;
    boat.add(sonarDome);
    RT.sonarDome = sonarDome;

    // Front windshield (facing +Z, visible from the default camera)
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.46), glass);
    windshield.position.set(0, 1.08, 0.475);
    windshield.rotation.x = -0.2;
    boat.add(windshield);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.055, 0.06), metal);
    frameTop.position.set(0, 1.32, 0.5);
    boat.add(frameTop);
    const frameMid = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.06), metal);
    frameMid.position.set(0, 1.08, 0.51);
    boat.add(frameMid);
    const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.06), metal);
    frameBottom.position.set(0, 0.84, 0.51);
    boat.add(frameBottom);

    // Side windows
    [1, -1].forEach((sx) => {
      for (let i = 0; i < 2; i++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.31), glass);
        win.position.set(sx * 1.118, 1.07, -0.95 + i * 0.62);
        win.rotation.y = sx * Math.PI / 2;
        boat.add(win);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.38, 0.03), metal);
        trim.position.set(sx * 1.09, 1.07, -0.95 + i * 0.62);
        trim.rotation.y = sx * Math.PI / 2;
        boat.add(trim);
        win.renderOrder = 2;
      }
    });

    // Cabin door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.78, 0.06), darkTeal);
    door.position.set(-0.56, 0.85, 0.48);
    boat.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), brass);
    knob.position.set(-0.4, 0.82, 0.52);
    boat.add(knob);

    // Name plate on starboard hull
    const name = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.29), new THREE.MeshBasicMaterial({ map: boatNameTexture(), transparent: true, depthWrite: false }));
    name.position.set(1.452, 0.29, 0.05);
    name.rotation.y = Math.PI / 2;
    boat.add(name);

    // Mast, boom, antenna
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 3.3, 8), metal);
    mast.position.set(0, 2.95, 1.04);
    boat.add(mast);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 1.7, 6), metal);
    boom.rotation.z = Math.PI / 2;
    boom.position.set(0, 3.9, 1.04);
    boat.add(boom);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 1.2, 5), metal);
    antenna.position.set(-0.4, 4.85, 1.04);
    boat.add(antenna);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6b6b }));
    antennaTip.position.set(-0.4, 5.46, 1.04);
    boat.add(antennaTip);

    // Waving flag
    const flagGeo = new THREE.PlaneGeometry(1.02, 0.48, 8, 4);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xd55348, roughness: 0.75, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.54, 4.18, 1.04);
    boat.add(flag);
    RT.flag = flag;
    RT.flagBase = new Float32Array(flagGeo.attributes.position.array);

    // Rod (starboard quarter)
    const rodGroup = new THREE.Group();
    rodGroup.position.set(1.18, 0.75, -1.45);
    rodGroup.rotation.set(-0.34, 0.1, -0.55);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.038, 3.3, 7), new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.4, metalness: 0.3 }));
    rod.position.y = 1.65;
    rodGroup.add(rod);
    for (let i = 0; i < 3; i++) {
      const guide = new THREE.Mesh(new THREE.TorusGeometry(0.045 - i * 0.008, 0.008, 4, 8), metal);
      guide.position.set(0, 1.2 + i * 0.62, 0.02);
      guide.rotation.x = Math.PI / 2;
      rodGroup.add(guide);
    }
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.16, 12), metal);
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0.02, 0.55, 0.09);
    rodGroup.add(reel);
    const reelHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03), brass);
    reelHandle.position.set(0.2, 0.55, 0.09);
    rodGroup.add(reelHandle);
    const tip = new THREE.Object3D();
    tip.position.y = 3.33;
    rodGroup.add(tip);
    const lureGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTexture("rgba(225,255,250,1)", "rgba(80,255,220,.8)", "rgba(0,255,200,.08)"),
      transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    lureGlow.position.set(0, 3.32, 0);
    lureGlow.scale.set(0.55, 0.55, 1);
    lureGlow.visible = false;
    rodGroup.add(lureGlow);
    RT.lureGlow = lureGlow;
    boat.add(rodGroup);
    RT.rodTip = tip;

    // Fishing line
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0.6 }));
    line.frustumCulled = false;
    line.visible = false;
    RT.bobberLine = line;
    RT.bobberLineGeo = lineGeo;
    RT.scene.add(line);

    // Bobber
    const bobber = new THREE.Group();
    const bTop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe84f4f, emissive: 0x5d0d0d, emissiveIntensity: 0.6, roughness: 0.35 }));
    const bBottom = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf4f7f2, roughness: 0.4 }));
    const bBand = new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.018, 6, 20), new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.5, roughness: 0.3 }));
    bBand.rotation.x = Math.PI / 2;
    const bAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.012, 0.26, 4), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    bAnt.position.y = 0.25;
    bobber.add(bTop, bBottom, bBand, bAnt);
    bobber.visible = false;
    RT.bobber = bobber;
    RT.scene.add(bobber);

    // Lantern / cabin light
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd28b }));
    lantern.position.set(0, 1.62, -0.56);
    boat.add(lantern);
    RT.lanternLight = new THREE.PointLight(0xffb45e, 0.4, 9, 2);
    RT.lanternLight.position.set(0, 1.7, -0.56);
    boat.add(RT.lanternLight);
    const lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTexture("rgba(255,246,214,1)", "rgba(255,190,100,.7)", "rgba(255,150,60,.1)"),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    lanternGlow.position.set(0, 1.63, -0.56);
    lanternGlow.scale.set(1.35, 1.35, 1);
    boat.add(lanternGlow);
    RT.lanternSprite = lanternGlow;

    // Outboard motor
    const motor = new THREE.Group();
    const motorHead = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.42), darkTeal);
    motorHead.position.set(0, 0.5, 0);
    const motorShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 8), metal);
    motorShaft.position.set(0, -0.2, 0);
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), brass);
    prop.rotation.z = Math.PI / 2;
    prop.position.set(0, -0.68, 0);
    motor.add(motorHead, motorShaft, prop);
    motor.position.set(0, 0.55, -3.19);
    boat.add(motor);

    // Nav lights
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4d5e }));
    red.position.set(-1.1, 0.72, 2.2);
    const green = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5dff9c }));
    green.position.set(1.1, 0.72, 2.2);
    boat.add(red, green);

    // Life ring
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 8, 20), new THREE.MeshStandardMaterial({ color: 0xff8a5b, roughness: 0.55 }));
    ringMesh.position.set(1.12, 1.06, -0.2);
    ringMesh.rotation.y = Math.PI / 2;
    boat.add(ringMesh);

    // Deck props
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.5), wood);
    crate.position.set(-0.95, 0.58, -2.25);
    crate.rotation.y = 0.2;
    boat.add(crate);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.36), wood);
    crate2.position.set(-1.02, 0.94, -2.18);
    crate2.rotation.y = -0.3;
    boat.add(crate2);
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.34, 12), teal);
    bucket.position.set(0.95, 0.54, -2.4);
    boat.add(bucket);

    // Bow rail
    const railPts = [];
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI * 0.5 + (i / 14) * Math.PI;
      railPts.push(new THREE.Vector3(Math.sin(a) * 1.18, 0.66, 1.95 + Math.cos(a) * 0.92));
    }
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 28, 0.027, 5, false), metal);
    boat.add(rail);

    // Wake decal
    RT.wakeGroup = new THREE.Group();
    const wakeCanvas = document.createElement("canvas");
    wakeCanvas.width = 256; wakeCanvas.height = 512;
    const wc = wakeCanvas.getContext("2d");
    const wg = wc.createLinearGradient(0, 0, 0, 512);
    wg.addColorStop(0, "rgba(255,255,255,0)");
    wg.addColorStop(0.45, "rgba(210,250,255,.2)");
    wg.addColorStop(1, "rgba(255,255,255,0)");
    wc.fillStyle = wg;
    wc.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 26; i++) {
      wc.strokeStyle = `rgba(230,255,255,${rand(0.03, 0.12)})`;
      wc.lineWidth = rand(1, 5);
      const x = rand(20, 236);
      wc.beginPath();
      wc.moveTo(x, 0);
      wc.bezierCurveTo(x - rand(20, 60), 150, x + rand(20, 70), 330, x + rand(-30, 30), 512);
      wc.stroke();
    }
    RT.wakeMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(wakeCanvas), transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending });
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 13), RT.wakeMat);
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(0, 0, -5.6);
    RT.wakeGroup.add(wake);
    RT.scene.add(RT.wakeGroup);

    RT.scene.add(boat);
  }

  function refreshBoatUpgrades() {
    if (!RT.boat) return;
    if (RT.sonarDome) RT.sonarDome.visible = (save.upgrades.sonar || 0) > 0;
    if (RT.lureGlow) RT.lureGlow.visible = (save.upgrades.lure || 0) > 0;
  }

  function updateBoat(dt) {
    const boat = RT.boat;
    if (!boat) return;
    const t = RT.waveTime;
    const x0 = boat.position.x;
    const z0 = boat.position.z;
    const samples = [
      waveHeight(x0 - 1.1, z0 + 2.6, t), waveHeight(x0 + 1.1, z0 + 2.6, t),
      waveHeight(x0 - 1.1, z0 - 2.6, t), waveHeight(x0 + 1.1, z0 - 2.6, t)
    ];
    const avg = (samples[0] + samples[1] + samples[2] + samples[3]) / 4;
    const targetPitch = -Math.atan2((samples[0] + samples[1]) / 2 - (samples[2] + samples[3]) / 2, 5.2) * 0.85;
    const targetRoll = Math.atan2((samples[1] + samples[3]) / 2 - (samples[0] + samples[2]) / 2, 2.2) * 0.8;
    boat.position.y = damp(boat.position.y, avg + 0.06, 2.6, dt);
    boat.rotation.x = damp(boat.rotation.x, targetPitch + Math.sin(t * 0.75) * 0.012, 2.2, dt);
    boat.rotation.z = damp(boat.rotation.z, targetRoll + Math.sin(t * 0.9) * 0.01, 2.0, dt);
    boat.rotation.y = Math.sin(t * 0.18) * 0.025;
    boat.position.x = Math.sin(t * 0.07) * 0.55;
    boat.position.z = Math.cos(t * 0.05) * 0.3;

    // Flag flutter
    if (RT.flag && RT.flagBase) {
      const attr = RT.flag.geometry.attributes.position;
      const base = RT.flagBase;
      for (let i = 0; i < attr.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        attr.setZ(i, Math.sin(x * 5.2 + t * 6.4) * 0.09 * (x + 0.52) + Math.sin(y * 4 + t * 5) * 0.025);
        attr.setY(i, y + Math.sin(x * 3 + t * 4) * 0.02);
      }
      attr.needsUpdate = true;
      RT.flag.geometry.computeVertexNormals();
    }

    if (RT.wakeGroup) {
      RT.wakeGroup.position.set(boat.position.x, waveHeight(boat.position.x, boat.position.z - 4, t) + 0.03, boat.position.z);
      RT.wakeGroup.rotation.y = boat.rotation.y;
      RT.wakeMat.opacity = 0.26 + RT.env.bio * 0.2;
    }
    if (RT.lureGlow && RT.lureGlow.visible) {
      RT.lureGlow.material.opacity = 0.38 + 0.3 * (0.5 + 0.5 * Math.sin(RT.waveTime * 5.2));
    }
    boat.updateMatrixWorld(true);
  }

  /* ── Distant scenery ───────────────────────────────────────── */
  function buildScenery() {
    // Lighthouse island
    const island = new THREE.Group();
    island.position.set(-58, 0, -118);
    island.scale.setScalar(0.72);
    RT.island = island;
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x26333c, roughness: 0.95, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(5, 11), 0), rockMat);
      rock.position.set(rand(-12, 12), rand(-2, 3), rand(-7, 7));
      rock.scale.set(rand(0.8, 1.7), rand(0.5, 0.9), rand(0.7, 1.4));
      rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      island.add(rock);
    }
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.7 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xb84a45, roughness: 0.65 });
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(1.85 - i * 0.24, 2.1 - i * 0.24, 6, 14), i % 2 ? redMat : towerMat);
      seg.position.set(0, 7 + i * 6, 0);
      island.add(seg);
    }
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.35, 14), new THREE.MeshStandardMaterial({ color: 0x24343c, metalness: 0.5, roughness: 0.4 }));
    gallery.position.y = 25.2;
    island.add(gallery);
    const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 2.1, 10), new THREE.MeshPhongMaterial({ color: 0xffe8ad, emissive: 0xffc266, emissiveIntensity: 1.1, transparent: true, opacity: 0.85 }));
    lampRoom.position.y = 26.4;
    island.add(lampRoom);
    RT.lighthouseLamp = lampRoom;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.2, 12), new THREE.MeshStandardMaterial({ color: 0x25363e, metalness: 0.4, roughness: 0.5 }));
    cap.position.y = 28.5;
    island.add(cap);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), brassMatForScenery());
    finial.position.y = 29.8;
    island.add(finial);

    RT.beamPivot = new THREE.Group();
    RT.beamPivot.position.set(0, 26.4, 0);
    const beamGeo = new THREE.ConeGeometry(5.5, 74, 16, 1, true);
    beamGeo.rotateZ(Math.PI / 2);
    beamGeo.translate(37, 0, 0);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe1a6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    RT.beam = new THREE.Mesh(beamGeo, beamMat);
    RT.beamPivot.add(RT.beam);
    island.add(RT.beamPivot);

    RT.scene.add(island);

    // Buoys
    const buoyMat = new THREE.MeshStandardMaterial({ color: 0xd9524b, roughness: 0.55 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xf0ebd8, roughness: 0.6 });
    const buoyDefs = [{ x: 15, z: 9, phase: 1.2 }, { x: -15, z: -16, phase: 3.1 }];
    buoyDefs.forEach((def) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.0, 12), buoyMat);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.2, 12), bandMat);
      band.position.y = 0.2;
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.4, 10), buoyMat);
      top.position.y = 0.68;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe38e }));
      lamp.position.y = 0.94;
      g.add(body, band, top, lamp);
      g.scale.setScalar(0.72);
      g.position.set(def.x, 0, def.z);
      g.userData = def;
      RT.buoys.push(g);
      RT.scene.add(g);
    });
  }

  function brassMatForScenery() {
    return new THREE.MeshStandardMaterial({ color: 0xc9953f, roughness: 0.3, metalness: 0.85 });
  }

  /* ── Fishing rig (bobber, fish, ripples) ───────────────────── */
  function buildFishingRig() {
    // Fish body — reused for the fight silhouette
    const fish = new THREE.Group();
    RT.fishMat = new THREE.MeshStandardMaterial({ color: 0x5ca8ff, roughness: 0.35, metalness: 0.25, emissive: 0x0a2233, emissiveIntensity: 0.5 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 10), RT.fishMat);
    body.scale.set(0.72, 0.82, 1.5);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.62, 4), RT.fishMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -0.9;
    tail.scale.y = 0.5;
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 4), RT.fishMat);
    dorsal.position.set(0, 0.42, 0.05);
    dorsal.rotation.z = Math.PI;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x06131c });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 5), eyeMat);
    eyeL.position.set(-0.26, 0.12, 0.48);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.26;
    fish.add(body, tail, dorsal, eyeL, eyeR);
    fish.visible = false;
    fish.scale.setScalar(1);
    fish.traverse((o) => {
      if (o.isMesh) {
        o.renderOrder = 3;
        if (o.material) { o.material.transparent = true; o.material.opacity = 1; o.material.depthWrite = true; }
      }
    });
    RT.fish = fish;
    RT.scene.add(fish);
  }

  function buildRipples() {
    const ringGeo = new THREE.RingGeometry(0.3, 0.36, 40);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      mesh.userData.life = 0;
      mesh.userData.max = 1;
      RT.ripples.push(mesh);
      RT.scene.add(mesh);
    }
  }

  function spawnRipple(x, y, z, scale) {
    const ring = RT.ripples.find((r) => r.userData.life <= 0) || RT.ripples[0];
    ring.position.set(x, y + 0.03, z);
    ring.scale.setScalar(scale || 0.7);
    ring.userData.life = 1.4;
    ring.userData.max = 1.4;
    ring.material.opacity = 0.55;
    ring.visible = true;
  }

  function updateRipples(dt) {
    RT.ripples.forEach((r) => {
      if (r.userData.life <= 0) { r.visible = false; return; }
      r.userData.life -= dt;
      const k = clamp(r.userData.life / r.userData.max, 0, 1);
      r.material.opacity = k * 0.5;
      r.scale.multiplyScalar(1 + dt * 0.9);
    });
  }

  class ParticleField {
    constructor(max, size, seedColor) {
      this.max = max;
      this.cursor = 0;
      this.positions = new Float32Array(max * 3);
      this.velocities = new Float32Array(max * 3);
      this.colors = new Float32Array(max * 3);
      this.life = new Float32Array(max);
      this.maxLife = new Float32Array(max);
      this.gravity = new Float32Array(max);
      for (let i = 0; i < max; i++) this.positions[i * 3 + 1] = -999;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d");
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,.7)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      const mat = new THREE.PointsMaterial({
        size, map: new THREE.CanvasTexture(canvas), vertexColors: true, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95, sizeAttenuation: true
      });
      this.mesh = new THREE.Points(geo, mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 5;
      RT.scene.add(this.mesh);
      this.seedColor = new THREE.Color(seedColor || 0xffffff);
      this.geo = geo;
    }
    burst(pos, count, color, speed, up, life, gravity) {
      const c = new THREE.Color(color || this.seedColor);
      for (let n = 0; n < count; n++) {
        const i = this.cursor = (this.cursor + 1) % this.max;
        this.positions[i * 3] = pos.x + rand(-0.15, 0.15);
        this.positions[i * 3 + 1] = pos.y + rand(-0.08, 0.12);
        this.positions[i * 3 + 2] = pos.z + rand(-0.15, 0.15);
        const theta = rand(0, Math.PI * 2);
        const v = rand(speed * 0.25, speed);
        this.velocities[i * 3] = Math.cos(theta) * v * rand(0.4, 1);
        this.velocities[i * 3 + 1] = rand(up * 0.4, up);
        this.velocities[i * 3 + 2] = Math.sin(theta) * v * rand(0.4, 1);
        const shade = rand(0.55, 1);
        this.colors[i * 3] = c.r * shade;
        this.colors[i * 3 + 1] = c.g * shade;
        this.colors[i * 3 + 2] = c.b * shade;
        this.life[i] = this.maxLife[i] = rand(life * 0.55, life);
        this.gravity[i] = gravity == null ? 9.8 : gravity;
      }
      this.geo.attributes.color.needsUpdate = true;
    }
    update(dt) {
      let changed = false;
      for (let i = 0; i < this.max; i++) {
        if (this.life[i] <= 0) continue;
        this.life[i] -= dt;
        changed = true;
        if (this.life[i] <= 0) {
          this.positions[i * 3 + 1] = -999;
          continue;
        }
        this.velocities[i * 3 + 1] -= this.gravity[i] * dt;
        this.positions[i * 3] += this.velocities[i * 3] * dt;
        this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
        this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
        const k = clamp(this.life[i] / this.maxLife[i], 0, 1);
        this.colors[i * 3] *= 1 - dt * (1.8 - k);
        this.colors[i * 3 + 1] *= 1 - dt * (1.8 - k);
        this.colors[i * 3 + 2] *= 1 - dt * (1.8 - k);
      }
      if (changed) {
        this.geo.attributes.position.needsUpdate = true;
        this.geo.attributes.color.needsUpdate = true;
      }
    }
  }

  /* ── Weather FX ─────────────────────────────────────────────── */
  function buildWeatherFX() {
    // Rain
    const count = 1300;
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rand(-46, 46);
      pos[i * 3 + 1] = rand(0, 36);
      pos[i * 3 + 2] = rand(-46, 46);
      speeds[i] = rand(16, 30);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    RT.rain = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xb9d9ee, size: 0.12, transparent: true, opacity: 0, depthWrite: false }));
    RT.rain.userData.speeds = speeds;
    RT.rain.frustumCulled = false;
    RT.scene.add(RT.rain);

    // Bioluminescent plankton
    const bcount = 820;
    const bpos = new Float32Array(bcount * 3);
    const phase = new Float32Array(bcount);
    for (let i = 0; i < bcount; i++) {
      bpos[i * 3] = rand(-38, 38);
      bpos[i * 3 + 1] = 0.2;
      bpos[i * 3 + 2] = rand(-38, 38);
      phase[i] = rand(0, Math.PI * 2);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.BufferAttribute(bpos, 3));
    RT.bio = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0x7dffe4, size: 0.28, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: radialTexture("rgba(220,255,248,1)", "rgba(80,255,220,.8)", "rgba(0,255,200,.1)") }));
    RT.bio.userData.phase = phase;
    RT.bio.frustumCulled = false;
    RT.bio.renderOrder = 4;
    RT.scene.add(RT.bio);

    // Larger drifting motes for the bioluminescent bloom.
    RT.bioGlow = new THREE.Group();
    const moteTex = radialTexture("rgba(225,255,246,1)", "rgba(80,255,220,.75)", "rgba(0,255,190,.08)");
    for (let i = 0; i < 34; i++) {
      const mat = new THREE.SpriteMaterial({ map: moteTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const mote = new THREE.Sprite(mat);
      const x = rand(-22, 22), z = rand(-26, 14);
      mote.userData = { x, z, phase: rand(0, Math.PI * 2), size: rand(0.35, 0.95), drift: rand(0.25, 0.8) };
      mote.position.set(x, 0.1, z);
      mote.scale.setScalar(mote.userData.size);
      mote.renderOrder = 4;
      mote.frustumCulled = false;
      RT.bioGlow.add(mote);
    }
    RT.scene.add(RT.bioGlow);
  }

  function updateWeatherFX(dt) {
    const t = RT.waveTime;
    // Rain
    if (RT.rain) {
      RT.rain.material.opacity = RT.env.rain * 0.65;
      RT.rain.visible = RT.env.rain > 0.01;
      if (RT.rain.visible) {
        const arr = RT.rain.geometry.attributes.position.array;
        const speeds = RT.rain.userData.speeds;
        for (let i = 0; i < speeds.length; i++) {
          arr[i * 3 + 1] -= speeds[i] * dt;
          arr[i * 3] += dt * 3.2;
          if (arr[i * 3 + 1] < 0) {
            arr[i * 3] = rand(-46, 46);
            arr[i * 3 + 1] = rand(24, 40);
            arr[i * 3 + 2] = rand(-46, 46);
          }
        }
        RT.rain.geometry.attributes.position.needsUpdate = true;
      }
    }
    // Plankton
    if (RT.bio) {
      RT.bio.material.opacity = RT.env.bio * 0.8;
      RT.bio.visible = RT.env.bio > 0.01;
      if (RT.bio.visible) {
        const arr = RT.bio.geometry.attributes.position.array;
        const phase = RT.bio.userData.phase;
        for (let i = 0; i < phase.length; i++) {
          const x = arr[i * 3] + Math.sin(t * 0.07 + phase[i]) * 0.012;
          const z = arr[i * 3 + 2] + Math.cos(t * 0.05 + phase[i]) * 0.012;
          arr[i * 3] = x;
          arr[i * 3 + 2] = z;
          arr[i * 3 + 1] = waveHeight(x, z, t) + 0.07 + Math.sin(t * 1.4 + phase[i]) * 0.1;
        }
        RT.bio.geometry.attributes.position.needsUpdate = true;
      }
    }
    // Floating bioluminescent motes
    if (RT.bioGlow) {
      RT.bioGlow.visible = RT.env.bio > 0.02;
      RT.bioGlow.children.forEach((mote, i) => {
        const d = mote.userData;
        const x = d.x + Math.sin(t * d.drift + d.phase) * 1.6;
        const z = d.z + Math.cos(t * d.drift * 0.8 + d.phase) * 1.2;
        const y = waveHeight(x, z, t) + 0.12 + Math.sin(t * 1.8 + d.phase) * 0.06;
        mote.position.set(x, y, z);
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.1 + d.phase);
        mote.material.opacity = RT.env.bio * (0.18 + pulse * 0.5);
        mote.scale.setScalar(d.size * (0.9 + pulse * 0.25));
      });
    }
    // Birds
    if (RT.birds) {
      RT.birds.visible = RT.env.birds > 0.35;
      RT.birds.children.forEach((bird, idx) => {
        const d = bird.userData;
        const a = t * d.speed + d.phase;
        bird.position.set(Math.cos(a) * d.radius - 8, d.height + Math.sin(a * 2.2) * 0.7, Math.sin(a) * d.radius - 12);
        bird.rotation.y = -a + Math.PI / 2;
        const attr = bird.geometry.attributes.position;
        const flap = Math.sin(t * 5 + d.phase) * 0.32;
        attr.setXYZ(0, -1.2, flap, 0);
        attr.setXYZ(1, -0.45, 0.05, 0);
        attr.setXYZ(2, 0, 0.18, 0);
        attr.setXYZ(3, 0.45, 0.05, 0);
        attr.setXYZ(4, 1.2, flap, 0);
        attr.needsUpdate = true;
      });
    }
    // Buoys
    RT.buoys.forEach((b) => {
      const d = b.userData;
      b.position.y = waveHeight(d.x, d.z, t) + 0.22;
      b.rotation.z = Math.sin(t * 1.2 + d.phase) * 0.08;
      b.rotation.x = Math.cos(t * 1.05 + d.phase) * 0.06;
    });
    // Lighthouse beam
    if (RT.beamPivot) RT.beamPivot.rotation.y += dt * 0.24;
    if (RT.beam) RT.beam.material.opacity = RT.env.beam * 0.11;
    if (RT.lighthouseLamp) {
      const k = 0.2 + RT.env.beam * 1.4 + (RT.flash > 0 ? 0.6 : 0);
      RT.lighthouseLamp.material.emissiveIntensity = k;
    }
  }

  function updateClouds(dt) {
    if (!RT.clouds) return;
    RT.clouds.children.forEach((s) => {
      s.position.x += s.userData.speed * dt * (0.6 + RT.env.wind * 0.045);
      if (s.position.x > 240) s.position.x = -240;
    });
    if (RT.cloudMat) {
      RT.cloudMat.opacity = RT.env.clouds * 0.42;
      RT.cloudMat.color.copy(RT.env.cloudTint);
    }
  }

  function triggerLightning() {
    RT.flash = 1;
    if (audio.started) audio.thunder();
  }

  function updateLightning(dt) {
    if (RT.weatherKey === "storm" && !prefersReduced) {
      RT.lightningTimer -= dt;
      if (RT.lightningTimer <= 0) {
        triggerLightning();
        RT.lightningTimer = rand(7, 16);
      }
    }
    if (RT.flash > 0) RT.flash = Math.max(0, RT.flash - dt * 2.6);
    if (UI.weatherFlash) UI.weatherFlash.style.opacity = RT.flash > 0 ? String(RT.flash * 0.38) : "0";
  }

  /* ── Environment interpolation ─────────────────────────────── */
  function setWeatherTarget(key, instant) {
    const preset = weatherOf(key);
    RT.weatherKey = preset.key;
    COLOR_KEYS.forEach((k) => { RT.envTarget[k].set(preset[k]); });
    NUM_KEYS.forEach((k) => { RT.envTarget[k] = preset[k]; });
    if (instant) {
      COLOR_KEYS.forEach((k) => { RT.env[k].copy(RT.envTarget[k]); });
      NUM_KEYS.forEach((k) => { RT.env[k] = RT.envTarget[k]; });
    }
    audio.setWeather(key);
  }

  function updateEnvironment(dt) {
    if (!RT.env) return;
    const k = 1 - Math.exp(-dt * 0.9);
    COLOR_KEYS.forEach((key) => { RT.env[key].lerp(RT.envTarget[key], k); });
    NUM_KEYS.forEach((key) => { RT.env[key] = lerp(RT.env[key], RT.envTarget[key], k); });

    RT.skyUniforms.topColor.value.copy(RT.env.skyTop);
    RT.skyUniforms.bottomColor.value.copy(RT.env.skyBottom);
    RT.scene.fog.color.copy(RT.env.fog);
    RT.scene.fog.density = RT.env.fogDensity;
    RT.renderer.toneMappingExposure = RT.env.exposure;

    RT.sunLight.color.copy(RT.env.sunColor);
    RT.sunLight.intensity = RT.env.sunIntensity + RT.flash * 3.2;
    RT.hemiLight.color.copy(RT.env.hemiSky);
    RT.hemiLight.groundColor.copy(RT.env.hemiGround);
    RT.hemiLight.intensity = RT.env.ambient * 1.15;
    RT.ambientLight.intensity = RT.env.ambient * 0.32 + RT.flash * 0.8;

    if (RT.sunSprite) RT.sunSprite.material.opacity = RT.env.sunOpacity;
    if (RT.moonSprite) RT.moonSprite.material.opacity = RT.env.moonOpacity;
    if (RT.stars) RT.stars.material.opacity = RT.env.stars * (0.75 + Math.sin(RT.elapsed * 0.7) * 0.08);
    if (RT.oceanMat) RT.oceanMat.emissive.copy(RT.env.crest).multiplyScalar(0.02 + RT.env.bio * 0.16);

    const night = 1 - clamp(RT.env.sunOpacity, 0, 1);
    if (RT.windowMat) RT.windowMat.emissiveIntensity = 0.08 + night * 1.45;
    if (RT.lanternLight) RT.lanternLight.intensity = night * 1.1;
    if (RT.lanternSprite) RT.lanternSprite.material.opacity = night * 0.7;
  }

  /* ────────────────────────────────────────────────────────────
     9. Fishing gameplay
     ──────────────────────────────────────────────────────────── */
  const game = {
    state: "idle",
    charge: 0,
    castPower: 0,
    castT: 0,
    castDur: 1,
    castStart: new THREE.Vector3(),
    castTarget: new THREE.Vector3(),
    bobberPos: new THREE.Vector3(),
    waitLeft: 0,
    biteWindow: 0,
    pending: null,
    tension: 0,
    progress: 0,
    reelHeld: false,
    fightTime: 0,
    surgeCooldown: 3,
    surgeWarn: 0,
    surgeLeft: 0,
    slack: 0,
    rippleTimer: 0,
    resetAt: 0,
    landAnim: 0,
    sonarAngle: 0,
    sonarBlips: []
  };

  const STATE_META = {
    idle: { status: "Ready to cast", cls: "", cast: ["Cast", "Hold to charge"], reel: false, banner: false },
    charging: { status: "Charging cast", cls: "", cast: ["Release", "Send the line"], reel: false, banner: false },
    casting: { status: "Line in flight", cls: "", cast: ["Casting…", "Wait for splash"], reel: false, banner: false },
    waiting: { status: "Waiting for a bite", cls: "", cast: ["Recast", "Hold to charge"], reel: false, banner: false },
    bite: { status: "Fish on the line", cls: "is-bite", cast: ["Wait…", "Fish on"], reel: true, banner: true },
    reeling: { status: "Fighting", cls: "is-fight", cast: ["Wait…", "Fish on"], reel: true, banner: true },
    landed: { status: "Landed", cls: "is-fight", cast: ["Logged", "Fine catch"], reel: false, banner: false },
    snapped: { status: "Line snapped", cls: "is-danger", cast: ["Snapped", "Re-rigging"], reel: false, banner: false },
    escaped: { status: "Fish escaped", cls: "is-danger", cast: ["Lost", "Re-rigging"], reel: false, banner: false }
  };

  function isModalOpen() {
    return !UI.catchModal.hidden || !UI.logbookModal.hidden || !UI.helpModal.hidden;
  }

  function setFishingState(next) {
    game.state = next;
    applyStateUI();
  }

  function setButtonCopy(btn, title, sub) {
    if (!btn) return;
    const b = btn.querySelector("b");
    const s = btn.querySelector("small");
    if (b) b.textContent = title;
    if (s) s.textContent = sub;
  }

  function applyStateUI() {
    const meta = STATE_META[game.state] || STATE_META.idle;
    if (UI.rigState) {
      UI.rigState.className = "status " + meta.cls;
      UI.rigState.innerHTML = "<i></i>" + meta.status;
    }
    if (UI.btnCast) {
      UI.btnCast.disabled = !(game.state === "idle" || game.state === "waiting" || game.state === "charging");
      setButtonCopy(UI.btnCast, meta.cast[0], meta.cast[1]);
    }
    if (UI.btnReel) {
      UI.btnReel.disabled = !meta.reel;
      setButtonCopy(UI.btnReel, meta.reel && game.reelHeld ? "Reeling" : "Reel", meta.reel ? "Hold · Space" : "Wait for a bite");
      UI.btnReel.classList.toggle("is-held", game.reelHeld && meta.reel);
    }
    if (UI.biteBanner) UI.biteBanner.hidden = !meta.banner;
    if (UI.chargeWrap) UI.chargeWrap.classList.toggle("is-charging", game.state === "charging");
    if (UI.controlHint) {
      const mobile = isMobile();
      const hints = {
        idle: mobile ? "Hold <b>Cast</b> to charge, release to cast. Drag the scene to orbit." : "Hold <kbd>Space</kbd> to charge, release to cast. Drag the scene to orbit.",
        charging: "Release to send the bobber — farther casts reach deeper water.",
        casting: "Line in flight. Watch for the splash…",
        waiting: "Watch the bobber. You can recast at any time.",
        bite: mobile ? "Fish on! Hold the <b>Reel</b> button now!" : "Fish on! Hold <kbd>Reel</kbd> or <kbd>Space</kbd> now!",
        reeling: "Keep the needle in the green. Ease off when a surge hits.",
        landed: "Fine catch. The logbook has been updated.",
        snapped: "The line parted. Re-rigging for another cast…",
        escaped: "It spat the lure. Re-rigging for another cast…"
      };
      UI.controlHint.innerHTML = hints[game.state] || hints.idle;
    }
    updateMeters();
  }

  function updateMeters() {
    const safe = safeZoneFor(save);
    const fighting = game.state === "reeling";
    const t = fighting ? clamp(game.tension, 0, 100) : 0;
    const p = fighting || game.state === "landed" ? clamp(game.progress, 0, 100) : 0;

    if (UI.tensionZone) {
      UI.tensionZone.style.left = safe.low + "%";
      UI.tensionZone.style.width = (safe.high - safe.low) + "%";
    }
    if (UI.tensionFill) UI.tensionFill.style.width = t + "%";
    if (UI.tensionNeedle) UI.tensionNeedle.style.left = t + "%";
    if (UI.tensionReadout) UI.tensionReadout.textContent = fighting ? Math.round(t) + "%" : "—";
    if (UI.tensionTrack) {
      UI.tensionTrack.setAttribute("aria-valuenow", String(Math.round(t)));
      UI.tensionTrack.classList.toggle("is-danger", fighting && (t > safe.high || t > 90));
      UI.tensionTrack.classList.toggle("is-slack", fighting && t < safe.low);
      UI.tensionTrack.classList.toggle("is-calm", !fighting);
    }

    if (UI.progressFill) UI.progressFill.style.width = p + "%";
    if (UI.progressReadout) UI.progressReadout.textContent = Math.round(p) + "%";
    if (UI.fightTime) UI.fightTime.textContent = fighting ? game.fightTime.toFixed(1) + "s" : "—";
    if (UI.chargeFill) UI.chargeFill.style.width = (game.state === "charging" ? game.charge * 100 : 0) + "%";
    if (UI.chargeReadout) UI.chargeReadout.textContent = (game.state === "charging" ? Math.round(game.charge * 100) : 0) + "%";

    if (UI.fishHint && fighting) {
      let hint = "Fish tiring — keep it in the green";
      if (game.surgeWarn > 0.05) hint = "⚠ Surge incoming — ease off!";
      else if (game.surgeLeft > 0) hint = "⚠ SURGE — release the reel!";
      else if (t > safe.high) hint = "Too much tension — ease off";
      else if (t < safe.low) hint = "Line is slack — reel now";
      else if (!game.reelHeld && game.progress <= 0.5) hint = "Slack line — reel before it escapes!";
      else if (!game.reelHeld) hint = "Line bleeding out — hold reel";
      UI.fishHint.textContent = hint;
    } else if (UI.fishHint) {
      const staticHints = {
        idle: "No fish hooked", charging: "Charging the cast", casting: "Bobber in flight",
        waiting: "Waiting for a bite", bite: "Fish on — hold reel!",
        landed: "Specimen landed", snapped: "Line snapped", escaped: "Fish escaped"
      };
      UI.fishHint.textContent = staticHints[game.state] || "No fish hooked";
    }
  }

  function beginCharge() {
    if (isModalOpen()) return;
    if (game.state === "waiting") cancelLine();
    if (game.state !== "idle") return;
    game.charge = 0;
    game.reelHeld = false;
    audio.ensure();
    setFishingState("charging");
  }

  function releaseCharge() {
    if (game.state !== "charging") return;
    const power = game.charge;
    game.charge = 0;
    if (power < 0.08) {
      setFishingState("idle");
      toast("Cast cancelled — hold a little longer", "🎣", "");
      return;
    }
    doCast(power);
  }

  function doCast(power) {
    const start = new THREE.Vector3();
    if (RT.rodTip) RT.rodTip.getWorldPosition(start);
    const angle = rand(-0.46, -0.34);
    const dist = 11 + power * (18 + (save.upgrades.rod || 0) * 4);
    const target = new THREE.Vector3(
      start.x + Math.sin(angle) * dist,
      0,
      start.z - Math.cos(angle) * dist
    );
    game.castStart.copy(start);
    game.castTarget.copy(target);
    game.castPower = power;
    game.castT = 0;
    game.castDur = 0.62 + power * 0.34;
    game.bobberPos.copy(start);
    if (RT.bobber) {
      RT.bobber.visible = true;
      RT.bobber.position.copy(start);
    }
    if (RT.bobberLine) RT.bobberLine.visible = true;
    if (RT.fish) RT.fish.visible = false;
    audio.cast(power);
    setFishingState("casting");
  }

  function cancelLine() {
    if (RT.bobber) RT.bobber.visible = false;
    if (RT.fish) RT.fish.visible = false;
    if (RT.bobberLine) RT.bobberLine.visible = false;
    game.pending = null;
    game.progress = 0;
    game.tension = 0;
    if (game.state !== "idle") setFishingState("idle");
  }

  function scheduleBite() {
    const lure = save.upgrades.lure || 0;
    const weatherFactor = RT.weatherKey === "storm" ? 0.78 : RT.weatherKey === "night" ? 1.12 : 1;
    game.waitLeft = rand(2.1, 5.0) * (1 - lure * 0.095) * weatherFactor;
    game.rippleTimer = 0;
  }

  function triggerBite() {
    if (game.state !== "waiting") return;
    const sp = rollSpeciesData(save, RT.weatherKey, game.castPower);
    const specimen = rollSpecimen(sp);
    const strength = clamp(sp.strength + specimen.ratio * 0.12, 0.12, 1.05);
    game.pending = { sp, specimen, strength };
    game.biteWindow = 4.4;
    game.tension = 0;
    game.progress = 0;
    game.surgeCooldown = rand(2.4, 3.8);
    game.surgeWarn = 0;
    game.surgeLeft = 0;
    game.slack = 0;
    game.fightTime = 0;

    if (RT.fish) {
      RT.fish.visible = true;
      RT.fishMat.color.set(sp.color);
      RT.fishMat.emissive.set(sp.accent);
      RT.fishMat.emissiveIntensity = sp.rarity === "legendary" ? 0.9 : 0.45;
      const sizeK = 0.62 + clamp(specimen.kg / sp.maxKg, 0, 1) * 0.6 + (sp.rarity === "legendary" ? 0.32 : 0);
      RT.fish.scale.setScalar(sizeK);
    }
    const p = game.bobberPos;
    RT.particles.burst(p, 34, 0xc8f8ff, 4.2, 6, 1.2, 9.8);
    spawnRipple(p.x, waveHeight(p.x, p.z, RT.waveTime), p.z, 1.3);
    audio.bite();
    setFishingState("bite");
    toast("Something has taken the lure!", "❗", "gold");
  }

  function beginFight() {
    if (game.state !== "bite" || !game.pending) return;
    game.tension = 42;
    game.progress = 2;
    game.fightTime = 0;
    game.surgeCooldown = rand(2.2, 3.4);
    game.surgeWarn = 0;
    game.surgeLeft = 0;
    game.slack = 0;
    game.reelHeld = true;
    audio.startReel();
    setFishingState("reeling");
  }

  function landFish() {
    if (game.state !== "reeling" || !game.pending) return;
    const sp = game.pending.sp;
    const specimen = game.pending.specimen;
    const beforeBest = save.collection[sp.id] ? save.collection[sp.id].bestKg : 0;
    const levelBefore = levelInfo().level;
    const result = recordCatchData(save, sp, specimen, RT.weatherKey);
    result.isPersonalBest = specimen.kg > beforeBest;
    result.levelUp = levelInfo().level > levelBefore;
    saveDirty = true;
    persistSave(true);
    refreshProfileUI();
    audio.stopReel();
    audio.catchChime(sp.rarity);
    setFishingState("landed");
    game.progress = 100;
    game.reelHeld = false;
    const p = game.bobberPos;
    RT.particles.burst(p, 80, sp.rarity === "legendary" ? 0xffd166 : 0xc8ffe8, 6.5, 8, 1.5, 4.2);
    RT.gold.burst(p, sp.rarity === "legendary" ? 90 : 38, 0xffd166, 5, 9, 1.6, 3.4);
    spawnRipple(p.x, waveHeight(p.x, p.z, RT.waveTime), p.z, 1.6);
    if (RT.fish) {
      RT.fish.visible = true;
      RT.fish.position.copy(p);
      RT.fish.position.y = 0.6;
      game.landAnim = 1;
    }
    result.sp = sp;
    result.specimen = specimen;
    game.landedResult = result;
    setTimeout(() => {
      if (game.state === "landed" && game.landedResult) {
        showCatchModal(game.landedResult.sp, game.landedResult.specimen, game.landedResult);
      }
    }, 620);
    announceAchievements(result.newAchievements);
  }

  function snapLine() {
    if (game.state !== "reeling") return;
    audio.stopReel();
    audio.snap();
    setFishingState("snapped");
    game.reelHeld = false;
    game.tension = 100;
    const p = game.bobberPos;
    RT.particles.burst(p, 26, 0xb9e6ff, 3.4, 7, 1.0, 9.8);
    spawnRipple(p.x, waveHeight(p.x, p.z, RT.waveTime), p.z, 1.8);
    if (RT.bobberLine) RT.bobberLine.visible = false;
    if (RT.fish) RT.fish.visible = false;
    game.resetAt = nowMs() + 2500;
    toast("Line snapped! That one was too strong.", "💥", "danger");
  }

  function escapeFish() {
    if (game.state !== "reeling" && game.state !== "bite") return;
    audio.stopReel();
    audio.escape();
    setFishingState("escaped");
    game.reelHeld = false;
    game.resetAt = nowMs() + 2500;
    if (RT.bobberLine) RT.bobberLine.visible = false;
    if (RT.fish) RT.fish.visible = false;
    toast("The fish shook the hook and escaped.", "💨", "danger");
  }

  function resetFishing() {
    audio.stopReel();
    game.charge = 0;
    game.castPower = 0;
    game.castT = 0;
    game.pending = null;
    game.tension = 0;
    game.progress = 0;
    game.reelHeld = false;
    game.fightTime = 0;
    game.surgeWarn = 0;
    game.surgeLeft = 0;
    game.slack = 0;
    game.resetAt = 0;
    game.landAnim = 0;
    game.landedResult = null;
    if (RT.bobber) RT.bobber.visible = false;
    if (RT.fish) RT.fish.visible = false;
    if (RT.bobberLine) RT.bobberLine.visible = false;
    setFishingState("idle");
  }

  function updateFishing(dt) {
    if (isModalOpen()) return;
    if (game.state === "charging") {
      game.charge = Math.min(1, game.charge + dt / 1.12);
    } else if (game.state === "casting") {
      game.castT += dt;
      const k = clamp(game.castT / game.castDur, 0, 1);
      const e = 1 - Math.pow(1 - k, 2);
      const mid = game.castStart.clone().lerp(game.castTarget, 0.5);
      mid.y += 5.5 + game.castPower * 5.2;
      const a = game.castStart.clone().lerp(mid, e);
      const b = mid.clone().lerp(game.castTarget, e);
      const p = a.lerp(b, e);
      game.bobberPos.copy(p);
      if (RT.bobber) RT.bobber.position.copy(p);
      updateLine(p, 0.05);
      if (k >= 1) {
        game.bobberPos.copy(game.castTarget);
        game.bobberPos.y = waveHeight(game.castTarget.x, game.castTarget.z, RT.waveTime) + 0.14;
        audio.splash(1);
        RT.particles.burst(game.bobberPos, 42, 0xd3f8ff, 4.2, 7.5, 1.2, 9.8);
        spawnRipple(game.bobberPos.x, game.bobberPos.y - 0.1, game.bobberPos.z, 1.1);
        scheduleBite();
        setFishingState("waiting");
      }
    } else if (game.state === "waiting") {
      const t = RT.waveTime;
      const x = game.castTarget.x + Math.sin(t * 0.9) * 0.12;
      const z = game.castTarget.z + Math.cos(t * 0.7) * 0.09;
      const y = waveHeight(x, z, t) + 0.14 + Math.sin(t * 2.4) * 0.03;
      game.bobberPos.set(x, y, z);
      if (RT.bobber) RT.bobber.position.copy(game.bobberPos);
      updateLine(game.bobberPos, 0.45);
      game.rippleTimer -= dt;
      if (game.rippleTimer <= 0) {
        game.rippleTimer = rand(2.2, 4.4);
        spawnRipple(x, y - 0.1, z, 0.55);
      }
      game.waitLeft -= dt;
      if (game.waitLeft <= 0) triggerBite();
    } else if (game.state === "bite") {
      const t = RT.waveTime;
      const x = game.bobberPos.x;
      const z = game.bobberPos.z;
      const y = waveHeight(x, z, t) + 0.08 + Math.sin(t * 8) * 0.06;
      game.bobberPos.set(x, y, z);
      if (RT.bobber) {
        RT.bobber.position.copy(game.bobberPos);
        RT.bobber.rotation.z = Math.sin(t * 7) * 0.18;
      }
      if (RT.fish) {
        RT.fish.position.set(x, game.bobberPos.y + 0.09 + Math.sin(t * 3) * 0.07, z);
        RT.fish.rotation.y = Math.sin(t * 2.2) * 0.5;
        RT.fish.rotation.z = Math.sin(t * 4) * 0.16;
      }
      updateLine(game.bobberPos, 0.08);
      game.biteWindow -= dt;
      if (game.biteWindow <= 0) escapeFish();
    } else if (game.state === "reeling") {
      updateFight(dt);
    } else if (game.state === "landed") {
      if (RT.fish) {
        game.landAnim = Math.max(0, game.landAnim - dt * 1.3);
        const p = game.bobberPos;
        RT.fish.position.y = 0.6 + Math.sin((1 - game.landAnim) * Math.PI) * 1.1;
        RT.fish.position.x = p.x;
        RT.fish.position.z = p.z;
        RT.fish.rotation.z += dt * 3;
      }
    } else if (game.state === "snapped" || game.state === "escaped") {
      if (game.resetAt && nowMs() > game.resetAt) resetFishing();
    }

    // Fishing line anchors to the rod tip every frame.
    if (RT.bobberLine && RT.bobberLine.visible && RT.rodTip) {
      if (game.state !== "casting") updateLine(game.bobberPos, game.state === "reeling" ? 0.04 : 0.3);
    }
  }

  function updateFight(dt) {
    const sp = game.pending.sp;
    const safe = safeZoneFor(save);
    const lineLevel = save.upgrades.line || 0;
    const reelLevel = save.upgrades.reel || 0;
    game.fightTime += dt;

    // Telegraph, then apply a surge.
    if (game.surgeWarn > 0) {
      game.surgeWarn -= dt;
      if (game.surgeWarn <= 0) {
        game.surgeWarn = 0;
        game.surgeLeft = 1.05;
        audio.surge();
        spawnRipple(game.bobberPos.x, waveHeight(game.bobberPos.x, game.bobberPos.z, RT.waveTime), game.bobberPos.z, 1.4);
        RT.particles.burst(game.bobberPos, 24, 0xb9f6ff, 3.2, 6, 1, 9.8);
      }
    } else if (game.surgeLeft > 0) {
      game.surgeLeft -= dt;
    } else {
      game.surgeCooldown -= dt;
      if (game.surgeCooldown <= 0) {
        game.surgeWarn = 0.85;
        game.surgeCooldown = rand(3.4, 5.8);
      }
    }

    const surgeK = game.surgeLeft > 0 ? clamp(game.surgeLeft / 1.05, 0, 1) : 0;
    let target = tensionTargetFor({ strength: game.pending.strength }, game.reelHeld, surgeK, lineLevel);
    target += Math.sin(game.fightTime * 3.2) * 2.4;
    game.tension = damp(game.tension, target, game.reelHeld ? 3.6 : 4.6, dt);
    game.tension += (Math.random() - 0.5) * 5 * dt;
    game.tension = clamp(game.tension, 0, 108);

    if (game.reelHeld) {
      game.progress += progressRateFor(game.tension, true, reelLevel, safe.low, safe.high) * dt;
      if (save.upgrades.line) game.progress += (save.upgrades.line || 0) * 0.06 * dt;
    } else {
      game.progress -= 1.5 * dt;
    }
    game.progress = clamp(game.progress, 0, 100);

    const slackThreshold = Math.max(14, safe.low - 4);
    if (game.tension < slackThreshold || (!game.reelHeld && game.progress <= 0.5)) {
      game.slack += dt;
    } else {
      game.slack = Math.max(0, game.slack - dt * 2);
    }
    if (game.slack > 3.6) {
      escapeFish();
      return;
    }
    if (game.tension >= 100) {
      snapLine();
      return;
    }
    if (game.progress >= 100) {
      landFish();
      return;
    }

    // Bobber is drawn toward the boat as line is recovered.
    const t = RT.waveTime;
    const pulled = 1 - Math.pow(1 - game.progress / 100, 1.7);
    const near = new THREE.Vector3(RT.boat.position.x + 3.0, 0, RT.boat.position.z - 6.0);
    const base = game.castTarget.clone().lerp(near, pulled);
    const jitter = game.surgeLeft > 0 ? 0.55 : 0.16;
    const x = base.x + Math.sin(t * 3.1) * jitter + (Math.random() - 0.5) * 0.04;
    const z = base.z + Math.cos(t * 2.3) * jitter;
    const y = waveHeight(x, z, t) + 0.1 + (game.surgeLeft > 0 ? Math.max(0, Math.sin(t * 16)) * 0.22 : 0);
    game.bobberPos.set(x, y, z);
    if (RT.bobber) {
      RT.bobber.position.copy(game.bobberPos);
      RT.bobber.rotation.z = Math.sin(t * 9) * 0.16;
    }
    if (RT.fish) {
      const leap = game.surgeLeft > 0 ? Math.max(0, Math.sin(t * 8.5)) * 0.85 : 0;
      RT.fish.position.set(x, game.bobberPos.y + 0.02 + leap, z);
      RT.fish.rotation.y = Math.sin(t * 5) * 0.4;
      RT.fish.rotation.z = Math.sin(t * 10) * 0.28;
    }
    updateLine(game.bobberPos, 0.04);
    game.rippleTimer -= dt;
    if (game.rippleTimer <= 0) {
      game.rippleTimer = rand(0.35, 0.7);
      spawnRipple(x, y - 0.08, z, 0.85);
    }
    if (RT.fish && RT.fish.visible && Math.random() < 0.015) {
      RT.particles.burst(game.bobberPos, 5, 0xb9f6ff, 1.8, 3.5, 0.7, 9.8);
    }
  }

  function updateLine(to, sag) {
    if (!RT.bobberLine || !RT.rodTip) return;
    const from = new THREE.Vector3();
    RT.rodTip.getWorldPosition(from);
    const mid = from.clone().lerp(to, 0.5);
    mid.y -= sag;
    mid.x += Math.sin(RT.waveTime * 1.7) * 0.04;
    const attr = RT.bobberLineGeo.attributes.position;
    attr.setXYZ(0, from.x, from.y, from.z);
    attr.setXYZ(1, mid.x, mid.y, mid.z);
    attr.setXYZ(2, to.x, to.y, to.z);
    attr.needsUpdate = true;
    RT.bobberLine.visible = true;
  }

  /* ────────────────────────────────────────────────────────────
     10. Catch reveal, logbook and HUD rendering
     ──────────────────────────────────────────────────────────── */
  function showCatchModal(sp, specimen, result) {
    const r = RARITY[sp.rarity];
    UI.catchTitle.textContent = sp.name;
    UI.catchSub.textContent = sp.desc;
    UI.catchRarity.textContent = r.label;
    UI.catchRarity.className = "rarity-badge is-" + r.className;
    UI.catchWeight.textContent = specimen.kg.toFixed(2) + " kg";
    UI.catchLength.textContent = specimen.cm + " cm";
    UI.catchReward.textContent = "🪙 " + fmt(result.coins);
    UI.catchEyebrow.textContent = result.isNewSpecies ? "New species logged" : "Specimen logged";
    UI.catchArt.innerHTML = fishSVG(sp);
    UI.catchCard.classList.toggle("is-legendary", sp.rarity === "legendary");
    UI.catchCard.classList.toggle("is-rare", sp.rarity === "rare");
    const bits = [];
    if (result.isPersonalBest) bits.push("★ New personal best");
    if (result.levelUp) bits.push("Level up — " + levelInfo().title + " " + levelInfo().level);
    result.newAchievements.forEach((a) => bits.push(a.icon + " " + a.name));
    UI.catchExtra.textContent = bits.join("  ·  ");
    UI.catchModal.hidden = false;
    setTimeout(() => {
      const btn = UI.catchModal.querySelector(".btn--gold");
      if (btn) btn.focus({ preventScroll: true });
    }, 80);
    if (RT.gold) {
      const p = new THREE.Vector3(0, 2, 0);
      RT.gold.burst(p, 60, 0xffd166, 4.5, 7, 1.4, 3.2);
    }
  }

  function announceAchievements(list) {
    (list || []).forEach((a, i) => {
      setTimeout(() => toast("Badge unlocked: " + a.name, a.icon, "gold"), 300 + i * 650);
    });
  }

  function dateLabel(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  function renderGuide() {
    if (!UI.guideGrid) return;
    const sorted = SPECIES.slice().sort((a, b) => RARITY[a.rarity].rank - RARITY[b.rarity].rank || a.name.localeCompare(b.name));
    UI.guideGrid.innerHTML = sorted.map((sp) => {
      const entry = save.collection[sp.id];
      const locked = !entry;
      const count = entry ? entry.count : 0;
      const bar = Math.min(100, count * 12);
      return `<article class="guide-card ${locked ? "is-locked" : ""} ${sp.rarity === "legendary" ? "is-legendary" : ""}" title="${sp.desc}">
        <div class="guide-card__top">
          <span class="guide-card__rarity rarity-${sp.rarity}">${RARITY[sp.rarity].label}</span>
          <span class="guide-card__count">${locked ? "UNLOGGED" : "×" + count}</span>
        </div>
        <div class="guide-card__art">${fishSVG(sp, { silhouette: locked })}</div>
        <h4>${sp.name}</h4>
        <small>${locked ? "Not yet documented" : (entry.bestKg.toFixed(2) + " kg best · " + entry.bestCm + " cm")}</small>
        <div class="guide-card__bar"><span style="width:${bar}%"></span></div>
        ${entry ? `<span class="best">${entry.bestKg.toFixed(1)}kg</span>` : ""}
      </article>`;
    }).join("");
  }

  function renderCatches() {
    if (!UI.catchesList) return;
    if (!save.catches.length) {
      UI.catchesList.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🪝</div><h4>The logbook is empty</h4><p>Cast a line, wait for the bobber to dip, and land your first fish.</p></div>`;
      return;
    }
    UI.catchesList.innerHTML = save.catches.slice(0, 80).map((c) => {
      const sp = SPECIES_BY_ID[c.speciesId];
      return `<div class="catch-row">
        <div class="catch-row__icon">${fishSVG(sp)}</div>
        <div class="catch-row__name">${c.name}<small>${dateLabel(c.at)} · ${weatherOf(c.weather).icon}</small></div>
        <div class="catch-row__meta">${c.kg.toFixed(2)} kg</div>
        <div class="catch-row__meta">${c.cm} cm</div>
        <div class="catch-row__meta rarity-${c.rarity}">${RARITY[c.rarity].label}</div>
        <div class="catch-row__reward">+${fmt(c.coins)}</div>
      </div>`;
    }).join("");
  }

  function renderRecords() {
    if (!UI.recordsGrid || !UI.recordsHero) return;
    const top = save.records.rarest;
    const cat = SPECIES.length;
    UI.recordsHero.innerHTML = `<div class="records-hero__medal">${top ? (top.rarity === "legendary" ? "🏆" : top.rarity === "rare" ? "🥈" : "🥉") : "🐚"}</div>
      <div><h3>${top ? top.name : "No trophy yet"}</h3>
      <p>${top ? "Rarest catch · " + top.kg.toFixed(2) + " kg · " + top.cm + " cm" : "Your first rare catch will appear here."}</p></div>
      <div class="records-hero__coins"><strong>${fmt(save.profile.totalCatches)}</strong><span>total catches</span></div>`;
    const cells = [
      ["Heaviest", save.records.heaviest ? save.records.heaviest.kg.toFixed(2) + " kg" : "—", save.records.heaviest ? save.records.heaviest.name : "No record"],
      ["Longest", save.records.longest ? save.records.longest.cm + " cm" : "—", save.records.longest ? save.records.longest.name : "No record"],
      ["Total weight", save.profile.totalWeight.toFixed(1) + " kg", "Lifetime haul"],
      ["Coins earned", "🪙 " + fmt(save.profile.totalCoinsEarned), "All voyages"],
      ["Species logged", collectionCount() + " / " + cat, "Field guide"],
      ["Time on water", formatDuration(save.profile.playSeconds), "This logbook"],
      ["Current level", "Lv " + levelInfo().level, levelInfo().title]
    ];
    UI.recordsGrid.innerHTML = cells.map((c) => `<div class="record-cell"><span>${c[0]}</span><strong>${c[1]}</strong><small>${c[2]}</small></div>`).join("");
    if (UI.achievementsGrid) {
      UI.achievementsGrid.innerHTML = ACHIEVEMENTS.map((a) => {
        const on = save.achievements.includes(a.id);
        return `<div class="achievement ${on ? "" : "is-locked"}"><div class="achievement__icon">${on ? a.icon : "🔒"}</div><div><b>${a.name}</b><small>${on ? a.desc : "Locked — " + a.desc}</small></div></div>`;
      }).join("");
    }
  }

  function renderGear() {
    if (!UI.gearList) return;
    if (UI.gearCoins) UI.gearCoins.textContent = fmt(save.profile.coins);
    UI.gearList.innerHTML = UPGRADES.map((u) => {
      const level = save.upgrades[u.id] || 0;
      const maxed = level >= u.max;
      const cost = maxed ? 0 : u.costs[level];
      const can = !maxed && save.profile.coins >= cost;
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < level ? "is-on" : ""}"></i>`).join("");
      return `<article class="gear-card">
        <div class="gear-card__head"><div class="gear-card__icon">${u.icon}</div><span class="eyebrow">${maxed ? "MAX LEVEL" : "LEVEL " + (level + 1)}</span></div>
        <h4>${u.name}</h4>
        <p>${u.desc}</p>
        <div class="gear-level">${pips}</div>
        <div class="gear-card__foot">
          <span class="gear-cost ${maxed ? "is-max" : ""}">${maxed ? "Fully upgraded" : "🪙 " + fmt(cost)}</span>
          <button class="buy-btn" data-buy="${u.id}" ${maxed || !can ? "disabled" : ""}>${maxed ? "Maxed" : can ? "Upgrade" : "Need coins"}</button>
        </div>
        <div class="gear-cost" style="margin-top:7px;font-size:8px;color:var(--muted-2)">Now: ${u.effect(level)}</div>
      </article>`;
    }).join("");
  }

  function renderLogbook() {
    const count = collectionCount();
    const pct = Math.round((count / SPECIES.length) * 100);
    if (UI.logbookSub) UI.logbookSub.textContent = count + " of " + SPECIES.length + " species documented";
    if (UI.collectionPct) UI.collectionPct.textContent = pct + "%";
    if (UI.collectionRing) UI.collectionRing.style.background = "conic-gradient(var(--gold) " + (pct * 3.6) + "deg, rgba(255,255,255,.08) 0deg)";
    if (UI.tabCatchCount) UI.tabCatchCount.textContent = String(save.profile.totalCatches);
    renderGuide();
    renderCatches();
    renderRecords();
    renderGear();
  }

  function refreshProfileUI() {
    if (UI.coinCount) UI.coinCount.textContent = fmt(save.profile.coins);
    if (UI.gearCoins) UI.gearCoins.textContent = fmt(save.profile.coins);
    if (UI.logbookBadge) UI.logbookBadge.textContent = String(collectionCount());
    if (UI.xpFill) {
      const li = levelInfo();
      UI.xpFill.style.width = clamp((li.into / li.next) * 100, 0, 100) + "%";
    }
    if (UI.levelLabel) {
      const li = levelInfo();
      UI.levelLabel.textContent = li.title + " · Level " + li.level;
    }
    if (UI.lastCatch) {
      const c = save.lastCatch;
      UI.lastCatch.textContent = c ? c.name + " · " + c.kg.toFixed(2) + " kg · " + RARITY[c.rarity].label : "No catches yet — cast a line.";
    }
    if (UI.saveState) UI.saveState.innerHTML = "<i></i>Autosaved locally";
    if (UI.audioBtn) {
      UI.audioBtn.setAttribute("aria-pressed", String(!save.settings.muted));
      UI.audioBtn.title = (save.settings.muted ? "Enable" : "Mute") + " sound (M)";
    }
  }

  function refreshWeatherUI() {
    const preset = weatherOf(RT.weatherKey);
    if (UI.weatherName) UI.weatherName.textContent = preset.name;
    if (UI.weatherDesc) UI.weatherDesc.textContent = preset.desc;
    if (UI.seaBadge) {
      UI.seaBadge.textContent = preset.badge;
      UI.seaBadge.className = "pill " + preset.badgeClass;
    }
    if (UI.readWave) UI.readWave.textContent = (preset.amp * 2.15).toFixed(1) + " m";
    if (UI.readWind) UI.readWind.textContent = preset.wind + " kn";
    if (UI.readTemp) UI.readTemp.textContent = preset.temp + " °C";
    if (UI.readBite) UI.readBite.textContent = preset.bite;
    if (UI.footerStatus) UI.footerStatus.textContent = preset.status;
    if (UI.sonarNote) UI.sonarNote.textContent = preset.sonar;
    $$(".weather-btn").forEach((btn) => {
      const on = btn.dataset.weather === preset.key;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
  }

  function refreshAll() {
    refreshProfileUI();
    refreshWeatherUI();
    renderLogbook();
    updateMeters();
    applyStateUI();
  }

  function changeWeather(key, silent) {
    if (!WEATHER[key]) return;
    setWeatherTarget(key, false);
    save.profile.favoriteWeather = key;
    saveDirty = true;
    refreshWeatherUI();
    if (!silent) toast("Sea state: " + WEATHER[key].name, WEATHER[key].icon, "teal");
  }

  /* ────────────────────────────────────────────────────────────
     11. Modals, save files and sonar
     ──────────────────────────────────────────────────────────── */
  let lastFocused = null;

  function openModal(el) {
    if (!el) return;
    lastFocused = document.activeElement;
    el.hidden = false;
    audio.ui();
    setTimeout(() => {
      const close = el.querySelector(".modal__close");
      if (close) close.focus({ preventScroll: true });
    }, 60);
  }

  function closeModal(name) {
    const el = name === "catch" ? UI.catchModal : name === "logbook" ? UI.logbookModal : name === "help" ? UI.helpModal : null;
    if (!el || el.hidden) return;
    el.hidden = true;
    if (name === "catch") {
      game.landedResult = null;
      resetFishing();
    }
    if (lastFocused && lastFocused.focus) {
      try { lastFocused.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
    }
    audio.ui();
  }

  function openLogbook(tab) {
    stopReelInput();
    if (game.state === "charging") { game.charge = 0; setFishingState("idle"); }
    renderLogbook();
    switchTab(tab || "guide");
    UI.logbookModal.hidden = false;
    lastFocused = document.activeElement;
    setTimeout(() => {
      const close = UI.logbookModal.querySelector(".modal__close");
      if (close) close.focus({ preventScroll: true });
    }, 60);
    audio.ui();
  }

  function switchTab(tab) {
    $$(".tab", UI.logbookModal).forEach((btn) => {
      const on = btn.dataset.tab === tab;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", String(on));
    });
    $$(".tab-panel", UI.logbookModal).forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === tab);
    });
    if (tab === "gear") renderGear();
    if (tab === "records") renderRecords();
    if (tab === "catches") renderCatches();
    if (tab === "guide") renderGuide();
  }

  function openHelp() {
    stopReelInput();
    if (game.state === "charging") { game.charge = 0; setFishingState("idle"); }
    UI.helpModal.hidden = false;
    lastFocused = document.activeElement;
    setTimeout(() => {
      const close = UI.helpModal.querySelector(".modal__close");
      if (close) close.focus({ preventScroll: true });
    }, 60);
    audio.ui();
  }

  function buildExportPayload() {
    return {
      app: "OceanCraft 3D",
      subtitle: "Deep Sea Fishing & Hydrodynamics Studio",
      version: SAVE_VERSION,
      exportedAt: iso(),
      save: save
    };
  }

  function downloadSave() {
    try {
      save.profile.playSeconds = Math.round(save.profile.playSeconds || 0);
      const payload = buildExportPayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "oceancraft_save.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      if (UI.saveState) UI.saveState.innerHTML = "<i></i>Exported just now";
      toast("Aquarium log saved as oceancraft_save.json", "💾", "gold");
      audio.ui();
    } catch (err) {
      console.warn("[OceanCraft] Export failed:", err);
      toast("Could not create the save file", "⚠️", "danger");
    }
  }

  function importSaveFile(file) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast("That file is too large for an OceanCraft log", "⚠️", "danger");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!validateSave(parsed)) {
          toast("That does not look like a valid OceanCraft save", "⚠️", "danger");
          return;
        }
        save = normalizeSave(parsed);
        autosaveEnabled = true;
        audio.setMuted(!!save.settings.muted);
        audio.setVolume(save.settings.volume);
        resetFishing();
        persistSave(true);
        refreshBoatUpgrades();
        refreshAll();
        renderLogbook();
        const count = collectionCount();
        toast("Save loaded — " + count + " species restored", "📂", "teal");
        setTimeout(() => toast("Welcome back, captain.", "⚓", "gold"), 700);
      } catch (err) {
        console.warn("[OceanCraft] Import failed:", err);
        toast("The save file could not be parsed", "⚠️", "danger");
      }
    };
    reader.onerror = () => toast("Could not read that file", "⚠️", "danger");
    reader.readAsText(file);
  }

  function resetProgress() {
    if (!window.confirm("Reset every catch, coin and upgrade in this logbook? This cannot be undone.")) return;
    save = defaultSave();
    autosaveEnabled = true;
    resetFishing();
    audio.setMuted(false);
    audio.setVolume(0.66);
    persistSave(true);
    refreshBoatUpgrades();
    refreshAll();
    renderLogbook();
    toast("Voyage reset. A fresh logbook waits.", "🌊", "teal");
  }

  function drawSonar() {
    const canvas = UI.sonar;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.43;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);

    // Water disc
    const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    disc.addColorStop(0, "rgba(15,72,74,.34)");
    disc.addColorStop(1, "rgba(3,20,29,.45)");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();

    // Grid rings
    ctx.strokeStyle = "rgba(73,226,196,.16)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, (R * i) / 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-R, 0); ctx.lineTo(R, 0);
    ctx.moveTo(0, -R); ctx.lineTo(0, R);
    ctx.strokeStyle = "rgba(73,226,196,.1)";
    ctx.stroke();

    // Sweep
    const sweep = RT.elapsed * 0.85;
    ctx.save();
    ctx.rotate(sweep);
    const grad = ctx.createLinearGradient(0, 0, R, 0);
    grad.addColorStop(0, "rgba(73,226,196,0)");
    grad.addColorStop(1, "rgba(73,226,196,.16)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, -0.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(143,255,229,.52)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweep) * R, Math.sin(sweep) * R);
    ctx.stroke();

    // Contacts
    game.sonarBlips.forEach((b, i) => {
      const a = b.a + RT.elapsed * b.speed;
      const r = b.r * R;
      const pulse = 0.45 + 0.55 * Math.abs(Math.sin(RT.elapsed * 1.7 + i));
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.6 + b.size * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120,255,222," + (0.15 + pulse * 0.35) + ")";
      ctx.fill();
    });

    // Live hooked fish
    if ((game.state === "reeling" || game.state === "bite") && game.pending && RT.boat) {
      const dx = game.bobberPos.x - RT.boat.position.x;
      const dz = game.bobberPos.z - RT.boat.position.z;
      const dist = Math.hypot(dx, dz);
      const a = Math.atan2(dz, dx);
      const r = Math.min(R * 0.9, (dist / 46) * R);
      const pulse = 0.6 + 0.4 * Math.sin(RT.elapsed * 6);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 4.2 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,93,118,.85)";
      ctx.shadowColor = "rgba(255,93,118,.9)";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Boat marker
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "rgba(255,209,102,.65)";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(143,230,255,.42)";
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.fillText("0", -3, -R + 10);
    ctx.fillText("40m", R - 22, 3);
    ctx.restore();
  }

  function initSonarBlips() {
    game.sonarBlips = [];
    for (let i = 0; i < 22; i++) {
      game.sonarBlips.push({
        a: rand(0, Math.PI * 2), r: rand(0.18, 0.94),
        speed: rand(-0.035, 0.035), size: rand(0.6, 2.2)
      });
    }
  }

  /* ────────────────────────────────────────────────────────────
     12. Input, events, autosave and the main loop
     ──────────────────────────────────────────────────────────── */
  function startReelInput() {
    if (isModalOpen()) return;
    if (game.state === "bite") beginFight();
    if (game.state === "reeling") {
      game.reelHeld = true;
      audio.ensure();
      audio.startReel();
      if (UI.btnReel) {
        UI.btnReel.classList.add("is-held");
        setButtonCopy(UI.btnReel, "Reeling", "Hold · Space");
      }
    }
  }

  function stopReelInput() {
    game.reelHeld = false;
    audio.stopReel();
    if (UI.btnReel && (game.state === "reeling" || game.state === "bite")) {
      UI.btnReel.classList.remove("is-held");
      setButtonCopy(UI.btnReel, "Reel", "Hold · Space");
    }
  }

  function toggleMute() {
    save.settings.muted = !save.settings.muted;
    audio.setMuted(save.settings.muted);
    if (!save.settings.muted) audio.ensure();
    persistSave(true);
    refreshProfileUI();
    toast(save.settings.muted ? "Sound muted" : "Sound on — the ocean is alive", save.settings.muted ? "🔇" : "🔊", "teal");
    audio.ui();
  }

  function toggleLogbook() {
    if (!UI.logbookModal.hidden) closeModal("logbook");
    else openLogbook("guide");
  }

  function setupEvents() {
    // Weather
    $$(".weather-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        audio.ensure();
        changeWeather(btn.dataset.weather, false);
        audio.ui();
      });
    });

    // Audio + help + logbook
    if (UI.audioBtn) UI.audioBtn.addEventListener("click", toggleMute);
    const helpBtn = $("#btn-help");
    if (helpBtn) helpBtn.addEventListener("click", openHelp);
    const logbookBtns = [$("#btn-logbook")];
    logbookBtns.forEach((b) => b && b.addEventListener("click", toggleLogbook));

    // Cast and reel pointer controls
    if (UI.btnCast) {
      UI.btnCast.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        beginCharge();
      });
    }
    if (UI.btnReel) {
      UI.btnReel.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        startReelInput();
      });
    }
    window.addEventListener("pointerup", () => {
      if (game.state === "charging") releaseCharge();
      stopReelInput();
    });
    window.addEventListener("pointercancel", () => {
      if (game.state === "charging") releaseCharge();
      stopReelInput();
    });

    // Modal close buttons
    $$("[data-close]").forEach((el) => {
      el.addEventListener("click", () => closeModal(el.dataset.close));
    });

    // Logbook tabs
    $$(".tab", UI.logbookModal).forEach((btn) => {
      btn.addEventListener("click", () => {
        switchTab(btn.dataset.tab);
        audio.ui();
      });
    });

    // Gear purchases
    if (UI.gearList) {
      UI.gearList.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-buy]");
        if (!btn) return;
        const res = buyUpgradeData(save, btn.dataset.buy);
        if (!res.ok) {
          toast(res.reason + (res.cost ? " — need 🪙 " + fmt(res.cost) : ""), "🪙", "danger");
          return;
        }
        saveDirty = true;
        persistSave(true);
        refreshBoatUpgrades();
        refreshAll();
        renderGear();
        renderRecords();
        audio.catchChime("common");
        toast("Upgraded: " + UPGRADE_BY_ID[btn.dataset.buy].name, "🛠️", "gold");
        announceAchievements(res.newAchievements);
      });
    }

    // Save / load
    ["#btn-save", "#btn-save-2"].forEach((sel) => {
      const b = $(sel);
      if (b) b.addEventListener("click", downloadSave);
    });
    ["#btn-load", "#btn-load-2"].forEach((sel) => {
      const b = $(sel);
      if (b) b.addEventListener("click", () => UI.fileInput && UI.fileInput.click());
    });
    if (UI.fileInput) {
      UI.fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        importSaveFile(file);
        e.target.value = "";
      });
    }
    const resetBtn = $("#btn-reset");
    if (resetBtn) resetBtn.addEventListener("click", resetProgress);
    const catchLogBtn = $("#btn-catch-log");
    if (catchLogBtn) {
      catchLogBtn.addEventListener("click", () => {
        closeModal("catch");
        openLogbook("catches");
      });
    }

    // Keyboard
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // Unlock audio on first interaction
    const unlock = () => audio.ensure();
    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });

    // Persist on leave
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        audio.stopReel();
        if (autosaveEnabled) persistSave(true);
      }
    });
    window.addEventListener("beforeunload", () => {
      if (autosaveEnabled) persistSave(true);
    });
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      if (!UI.catchModal.hidden) closeModal("catch");
      else if (!UI.logbookModal.hidden) closeModal("logbook");
      else if (!UI.helpModal.hidden) closeModal("help");
      return;
    }
    if (isModalOpen()) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

    if (e.code === "Space") {
      e.preventDefault();
      if (e.repeat) return;
      if (game.state === "bite" || game.state === "reeling") startReelInput();
      else if (game.state === "idle" || game.state === "waiting") beginCharge();
      else if (game.state === "charging") releaseCharge();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === "c") {
      e.preventDefault();
      if (e.repeat) return;
      if (game.state === "idle" || game.state === "waiting") beginCharge();
      else if (game.state === "charging") releaseCharge();
    } else if (k === "r") {
      e.preventDefault();
      if (!e.repeat) startReelInput();
    } else if (k === "l") {
      if (!e.repeat) toggleLogbook();
    } else if (k === "m") {
      if (!e.repeat) toggleMute();
    } else if (e.key === "?") {
      openHelp();
    }
  }

  function onKeyUp(e) {
    if (isModalOpen() && e.code !== "Escape") return;
    if (e.code === "Space" || e.key.toLowerCase() === "c") {
      if (game.state === "charging") releaseCharge();
    }
    if (e.code === "Space" || e.key.toLowerCase() === "r") {
      stopReelInput();
    }
  }

  let autosaveTimer = 12;
  let uiTimer = 0;
  let sonarTimer = 0;

  function animate(ts) {
    if (!RT.ready) return;
    requestAnimationFrame(animate);
    if (!RT.lastFrame) RT.lastFrame = ts;
    let dt = (ts - RT.lastFrame) / 1000;
    RT.lastFrame = ts;
    dt = clamp(dt, 0.001, 0.05);
    RT.elapsed += dt;
    RT.waveTime += dt * RT.env.speed;

    updateEnvironment(dt);
    updateOcean(dt);
    updateBoat(dt);
    updateFishing(dt);
    updateClouds(dt);
    updateWeatherFX(dt);
    updateLightning(dt);
    updateRipples(dt);
    if (RT.particles) RT.particles.update(dt);
    if (RT.gold) RT.gold.update(dt);

    if (RT.controls && RT.boat) {
      RT.controls.target.y = damp(RT.controls.target.y, RT.boat.position.y + 1.65, 1.8, dt);
      RT.controls.update();
    }

    uiTimer -= dt;
    if (uiTimer <= 0) {
      uiTimer = 0.055;
      updateMeters();
    }
    sonarTimer -= dt;
    if (sonarTimer <= 0) {
      sonarTimer = 0.08;
      drawSonar();
    }

    save.profile.playSeconds += dt;
    if (autosaveEnabled) {
      autosaveTimer -= dt;
      if (autosaveTimer <= 0) {
        autosaveTimer = 12;
        persistSave(true);
      }
    }

    RT.renderer.render(RT.scene, RT.camera);
  }

  /* ────────────────────────────────────────────────────────────
     13. Demo data, self-tests and boot
     ──────────────────────────────────────────────────────────── */
  function seedDemoCollection() {
    save = defaultSave();
    autosaveEnabled = false;
    save.profile.playSeconds = 12480;
    const sequence = [
      "silver-sardine", "harbor-herring", "sunset-perch", "kelp-bass", "coral-snapper",
      "drift-mackerel", "moonfluke", "reef-grouper", "amberjack", "ghost-eel",
      "sapphire-tuna", "phantom-ray", "storm-marlin", "abyss-angler", "golden-leviathan",
      "silver-sardine", "kelp-bass", "coral-snapper", "sapphire-tuna", "moonfluke"
    ];
    sequence.forEach((id, i) => {
      const sp = SPECIES_BY_ID[id];
      if (!sp) return;
      const specimen = rollSpecimen(sp);
      if (sp.rarity === "legendary") {
        specimen.kg = round(sp.maxKg * 0.78, 2);
        specimen.cm = Math.round(sp.maxCm * 0.82);
        specimen.ratio = 0.8;
      } else if (i < 3) {
        specimen.kg = round(sp.maxKg * 0.86, 2);
        specimen.cm = Math.round(sp.maxCm * 0.88);
        specimen.ratio = 0.85;
      }
      recordCatchData(save, sp, specimen, i % 3 === 0 ? "night" : i % 4 === 0 ? "storm" : "calm");
    });
    save.upgrades = { rod: 2, reel: 2, line: 2, sonar: 2, lure: 1 };
    save.profile.coins = 2480;
    save.profile.xp = 1680;
    save.profile.favoriteWeather = "calm";
    refreshBoatUpgrades();
    refreshAll();
  }

  function showDemoCatch(id) {
    const sp = SPECIES_BY_ID[id] || SPECIES_BY_ID["golden-leviathan"];
    const specimen = { kg: round(sp.maxKg * 0.81, 2), cm: Math.round(sp.maxCm * 0.86), ratio: 0.82 };
    const result = {
      coins: Math.round(sp.reward * 1.3), isNewSpecies: true, isPersonalBest: true,
      levelUp: false, newAchievements: ACHIEVEMENTS.slice(0, 1), sp: sp, specimen: specimen
    };
    showCatchModal(sp, specimen, result);
  }

  function runSelfTests(showReport) {
    const results = [];
    const test = (name, fn) => {
      try {
        const detail = fn();
        results.push({ name, pass: detail !== false, detail: detail === true ? "" : String(detail || "") });
      } catch (err) {
        results.push({ name, pass: false, detail: err.message });
      }
    };
    const clone = () => normalizeSave(JSON.parse(JSON.stringify(save)));
    const center = (lo, hi) => (lo + hi) / 2;

    test("Species catalogue has 18 unique entries", () => {
      const ids = new Set(SPECIES.map((s) => s.id));
      const counts = RARITY_ORDER.map((r) => SPECIES.filter((s) => s.rarity === r).length);
      return SPECIES.length === 18 && ids.size === 18 && counts.join(",") === "8,6,4";
    });
    test("Wave field is finite across the ocean", () => {
      for (let x = -160; x <= 160; x += 40) {
        for (let z = -160; z <= 160; z += 40) {
          if (!Number.isFinite(waveHeight(x, z, 2.4, 0.8, 1))) return "non-finite wave";
        }
      }
      return true;
    });
    test("Storm swell is taller than calm water", () => {
      let calm = 0, storm = 0;
      for (let i = 0; i < 80; i++) {
        const x = rand(-100, 100), z = rand(-100, 100);
        calm = Math.max(calm, Math.abs(waveHeight(x, z, 3.2, WEATHER.calm.amp, WEATHER.calm.choppy)));
        storm = Math.max(storm, Math.abs(waveHeight(x, z, 3.2, WEATHER.storm.amp, WEATHER.storm.choppy)));
      }
      return storm > calm * 2.2 ? true : "storm=" + storm.toFixed(2) + " calm=" + calm.toFixed(2);
    });
    test("Buoyancy samples return finite heights", () => {
      const s = [waveHeight(1, 2, 1.1), waveHeight(-1, 2, 1.1), waveHeight(1, -2, 1.1), waveHeight(-1, -2, 1.1)];
      return s.every(Number.isFinite) && Number.isFinite(s.reduce((a, b) => a + b, 0) / 4);
    });
    test("Save normalization round-trips a catch", () => {
      const s = defaultSave();
      recordCatchData(s, SPECIES[0], rollSpecimen(SPECIES[0]), "calm");
      const n = normalizeSave(JSON.parse(JSON.stringify(s)));
      return n.catches.length === 1 && n.profile.totalCatches === 1 && !!n.collection[SPECIES[0].id];
    });
    test("Save validation rejects malformed payloads", () => {
      return validateSave({}) === false && validateSave({ version: 99, profile: {} }) === false && validateSave({ profile: { coins: 1 } }) === true;
    });
    test("Rarity roll always returns a valid species", () => {
      for (let i = 0; i < 300; i++) {
        const sp = rollSpeciesData(save, i % 2 ? "night" : "storm", Math.random());
        if (!SPECIES_BY_ID[sp.id] || !RARITY[sp.rarity]) return "invalid species";
      }
      return true;
    });
    test("Catch recording updates collection, coins and records", () => {
      const s = defaultSave();
      s.profile.coins = 10;
      const sp = SPECIES_BY_ID["sapphire-tuna"];
      const specimen = { kg: 21.4, cm: 121, ratio: 0.6 };
      const r = recordCatchData(s, sp, specimen, "storm");
      return s.profile.coins > 10 && s.profile.totalCatches === 1 && s.collection[sp.id].bestKg === 21.4 && s.records.heaviest.kg === 21.4 && r.coins > 0;
    });
    test("First catch unlocks the First Light badge", () => {
      const s = defaultSave();
      const r = recordCatchData(s, SPECIES[0], rollSpecimen(SPECIES[0]), "calm");
      return r.newAchievements.some((a) => a.id === "first-light") && s.achievements.includes("first-light");
    });
    test("Upgrade purchase enforces the coin balance", () => {
      const s = defaultSave();
      const fail = buyUpgradeData(s, "rod");
      s.profile.coins = 1000;
      const ok = buyUpgradeData(s, "rod");
      return fail.ok === false && ok.ok === true && s.upgrades.rod === 1 && s.profile.coins === 880;
    });
    test("Braided line widens the safe tension zone", () => {
      const a = safeZoneFor({ upgrades: { line: 0 } });
      const b = safeZoneFor({ upgrades: { line: 5 } });
      return (b.high - b.low) > (a.high - a.low) && b.low < a.low && b.high > a.high;
    });
    test("A surge raises the tension target", () => {
      const fish = { strength: 0.7 };
      return tensionTargetFor(fish, true, 1, 0) > tensionTargetFor(fish, true, 0, 0) + 20;
    });
    test("Reeling inside the green returns more line", () => {
      const z = safeZoneFor({ upgrades: { line: 0 } });
      const inZone = progressRateFor(center(z.low, z.high), true, 0, z.low, z.high);
      const redLine = progressRateFor(5, true, 0, z.low, z.high);
      return inZone > redLine * 1.8 && progressRateFor(60, false, 0, z.low, z.high) === 0;
    });
    test("Every species has a distinct illustrated SVG", () => {
      const seen = new Set();
      for (const sp of SPECIES) {
        const svg = fishSVG(sp);
        if (!svg.startsWith("<svg") || svg.includes("undefined")) return sp.id;
        seen.add(sp.shape);
      }
      return seen.size >= 10;
    });
    test("All weather presets expose every environment field", () => {
      return WEATHER_ORDER.every((key) => {
        const p = WEATHER[key];
        return p && COLOR_KEYS.every((k) => typeof p[k] === "string") && NUM_KEYS.every((k) => Number.isFinite(p[k]));
      });
    });
    test("Export payload has the expected save-file shape", () => {
      const p = buildExportPayload();
      return p.app === "OceanCraft 3D" && p.version === SAVE_VERSION && p.save && Array.isArray(p.save.catches);
    });
    test("Core DOM surfaces and formatting helpers are mounted", () => {
      return !!(UI.btnCast && UI.btnReel && UI.sonar && UI.guideGrid && UI.gearList) && formatDuration(3661).indexOf("1h") === 0;
    });
    test("No uncaught runtime errors were recorded", () => {
      return (window.__OCEANCRAFT_ERRORS__ || []).length === 0;
    });

    const passed = results.filter((r) => r.pass).length;
    const report = { passed, total: results.length, results, at: iso() };
    window.__OCEANCRAFT_TESTS__ = report;
    console.table(results.map((r) => ({ check: r.name, pass: r.pass, detail: r.detail })));
    if (showReport) {
      const old = document.getElementById("selftest-report");
      if (old) old.remove();
      const el = document.createElement("div");
      el.id = "selftest-report";
      el.style.cssText = "position:fixed;z-index:999;inset:10px 10px auto 10px;max-height:88vh;overflow:auto;padding:14px 16px;border:1px solid rgba(73,226,196,.45);border-radius:12px;background:rgba(3,14,23,.94);color:#eaf9ff;font:11px/1.5 'IBM Plex Mono',monospace;box-shadow:0 20px 60px rgba(0,0,0,.6)";
      el.innerHTML = `<div style="font-size:15px;letter-spacing:.08em;color:${passed === results.length ? "#6ff2b3" : "#ff8090"};margin-bottom:7px">SELFTEST ${passed}/${results.length}</div>` +
        results.map((r) => `<div style="color:${r.pass ? "#a9f7e5" : "#ff9aa5"}">${r.pass ? "PASS" : "FAIL"} · ${r.name}${r.detail ? " — " + r.detail : ""}</div>`).join("");
      document.body.appendChild(el);
      document.title = "SELFTEST " + passed + "/" + results.length;
    }
    return report;
  }

  function boot() {
    save = readSave();
    audio.setMuted(!!save.settings.muted);
    audio.setVolume(save.settings.volume);

    if (!window.THREE) {
      if (UI.loadingStatus) UI.loadingStatus.textContent = "Three.js could not be loaded — check your connection";
      if (UI.loadingFill) UI.loadingFill.style.width = "100%";
      toast("Three.js failed to load. The 3D ocean needs an internet connection.", "⚠️", "danger");
      return;
    }
    try {
      initThree();
    } catch (err) {
      console.error("[OceanCraft] 3D init failed:", err);
      if (UI.loadingStatus) UI.loadingStatus.textContent = "WebGL is unavailable in this browser";
      if (UI.loadingFill) UI.loadingFill.style.width = "100%";
      toast("WebGL could not start. Try a browser with hardware acceleration.", "⚠️", "danger");
      return;
    }

    initSonarBlips();
    refreshBoatUpgrades();
    setWeatherTarget(save.profile.favoriteWeather || "calm", true);
    setupEvents();
    refreshAll();

    const params = new URLSearchParams(window.location.search);
    if (params.get("mute") === "1") {
      save.settings.muted = true;
      audio.setMuted(true);
      refreshProfileUI();
    }
    if (params.get("demo") === "collection") seedDemoCollection();
    const w = params.get("weather");
    if (w && WEATHER[w]) {
      setWeatherTarget(w, true);
      refreshWeatherUI();
    }
    if (params.get("logbook") != null) {
      setTimeout(() => openLogbook(params.get("tab") || "guide"), 700);
    }
    if (params.get("catch")) {
      setTimeout(() => showDemoCatch(params.get("catch")), 900);
    }
    if (params.get("selftest") === "1") {
      setTimeout(() => runSelfTests(true), 1100);
    }

    requestAnimationFrame(animate);
    if (UI.loadingStatus) UI.loadingStatus.textContent = "Ready to cast";
    if (UI.loadingFill) UI.loadingFill.style.width = "100%";
    setTimeout(() => {
      if (UI.loading) UI.loading.classList.add("is-hidden");
    }, 320);
    setTimeout(() => {
      if (UI.loading && UI.loading.parentNode) UI.loading.remove();
    }, 1000);
  }

  // Public debug / integration surface.
  window.OceanCraft = {
    version: "1.0.0",
    get save() { return save; },
    get state() { return game.state; },
    get game() { return game; },
    get runtime() { return RT; },
    species: SPECIES,
    weather: WEATHER,
    upgrades: UPGRADES,
    waveHeight,
    setWeather: changeWeather,
    openLogbook,
    openHelp,
    resetFishing,
    runSelfTests,
    showDemoCatch,
    seedDemoCollection,
    downloadSave,
    importSaveFile,
    buildExportPayload
  };

  boot();
})();

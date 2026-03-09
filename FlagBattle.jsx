import { useState, useEffect, useCallback, useRef } from "react";
import { storage } from "./src/firebase.js";

const CITIES = [
  { id: "tel-aviv", name: "תל אביב", flag: "Flag_of_Tel_Aviv.svg" },
  { id: "jerusalem", name: "ירושלים", flag: "Flag_of_Jerusalem.svg" },
  { id: "haifa", name: "חיפה", flag: "Flag_of_Haifa.svg" },
  { id: "beer-sheva", name: "באר שבע", flag: "Flag_of_Be%27er_Sheva.svg" },
  { id: "netanya", name: "נתניה", flag: "Flag_of_Netanya.svg" },
  { id: "rishon", name: "ראשון לציון", flag: "Flag_of_Rishon_LeZion.svg" },
  { id: "petah-tikva", name: "פתח תקווה", flag: "Flag_of_Petah_Tikva.svg" },
  { id: "ashdod", name: "אשדוד", flag: "Flag_of_Ashdod.svg" },
  { id: "ashkelon", name: "אשקלון", flag: "Flag_of_Ashkelon.svg" },
  { id: "ramat-gan", name: "רמת גן", flag: "Flag_of_Ramat_Gan.svg" },
  { id: "bnei-brak", name: "בני ברק", flag: "Flag_of_Bnei_Brak.svg" },
  { id: "rehovot", name: "רחובות", flag: "Flag_of_Rehovot.svg" },
  { id: "herzliya", name: "הרצליה", flag: "Flag_of_Herzliya.svg" },
  { id: "kfar-saba", name: "כפר סבא", flag: "Flag_of_Kfar_Saba.svg" },
  { id: "holon", name: "חולון", flag: "Flag_of_Holon.svg" },
  { id: "bat-yam", name: "בת ים", flag: "Flag_of_Bat_Yam.svg" },
  { id: "nahariya", name: "נהריה", flag: "Flag_of_Nahariya.svg" },
  { id: "acre", name: "עכו", flag: "Flag_of_Acre%2C_Israel.svg" },
  { id: "tiberias", name: "טבריה", flag: "Flag_of_Tiberias.svg" },
  { id: "eilat", name: "אילת", flag: "Flag_of_Eilat.svg" },
  { id: "modiin", name: "מודיעין", flag: "Flag_of_Modi%27in-Maccabim-Re%27ut.svg" },
  { id: "lod", name: "לוד", flag: "Flag_of_Lod.svg" },
  { id: "ramla", name: "רמלה", flag: "Flag_of_Ramla.svg" },
  { id: "givatayim", name: "גבעתיים", flag: "Flag_of_Givatayim.svg" },
  { id: "hod-hasharon", name: "הוד השרון", flag: "Flag_of_Hod_HaSharon.svg" },
  { id: "raanana", name: "רעננה", flag: "Flag_of_Ra%27anana.svg" },
  { id: "kiryat-gat", name: "קריית גת", flag: "Flag_of_Kiryat_Gat.svg" },
  { id: "safed", name: "צפת", flag: "Flag_of_Safed.svg" },
  { id: "nof-hagalil", name: "נוף הגליל", flag: "Flag_of_Nof_HaGalil.svg" },
  { id: "kiryat-bialik", name: "קריית ביאליק", flag: "Flag_of_Kiryat_Bialik.svg" },
  { id: "kiryat-ata", name: "קריית אתא", flag: "Flag_of_Kiryat_Ata.svg" },
  { id: "kiryat-motzkin", name: "קריית מוצקין", flag: "Flag_of_Kiryat_Motzkin.svg" },
  { id: "yokneam", name: "יוקנעם", flag: "Flag_of_Yokneam.svg" },
  { id: "dimona", name: "דימונה", flag: "Flag_of_Dimona.svg" },
  { id: "arad", name: "ערד", flag: "Flag_of_Arad%2C_Israel.svg" },
  { id: "afula", name: "עפולה", flag: "Flag_of_Afula.svg" },
  { id: "nazareth", name: "נצרת", flag: "Flag_of_Nazareth.svg" },
  { id: "rosh-haayin", name: "ראש העין", flag: "Flag_of_Rosh_HaAyin.svg" },
  { id: "yavne", name: "יבנה", flag: "Flag_of_Yavne.svg" },
  { id: "or-yehuda", name: "אור יהודה", flag: "Flag_of_Or_Yehuda.svg" },
];

const KS = "il_flag_battles_v3";
const KC = "il_custom_flags_v2";
const KO = "il_flag_overrides_v1";
const KP = "il_admin_pass_hash_v1";
const KR = "il_flag_requests_v1";


function wikiUrl(f) {
  return "https://commons.wikimedia.org/wiki/Special:FilePath/" + f;
}

function normUrl(raw) {
  const u = (raw || "").trim();
  try {
    const p = new URL(u);
    // upload.wikimedia.org → convert to Special:FilePath with ?width=300
    if (p.hostname === "upload.wikimedia.org") {
      const parts = p.pathname.split("/");
      return "https://commons.wikimedia.org/wiki/Special:FilePath/" + parts[parts.length - 1] + "?width=300";
    }
    // Special:FilePath redirect → add ?width=300 to force direct PNG response
    if (p.hostname === "commons.wikimedia.org" && p.pathname.includes("Special:FilePath")) {
      if (!p.search) return u + "?width=300";
    }
  } catch (e) {}
  return u;
}

function getSrc(city, ov) {
  if (city.custom) return city.urlFlag || city.dataUrl || "";
  if (ov && ov[city.id]) return ov[city.id];
  return wikiUrl(city.flag);
}

function wilson(wins, total) {
  if (!total) return 0;
  const p = wins / total, z = 1.96, n = total;
  return Math.max(0, (p + z*z/(2*n) - z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)) / (1 + z*z/n));
}

const ELO_BASE = 0;
const ELO_K = 32;

function eloExpected(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function calcElo(winnerElo, loserElo) {
  const expW = eloExpected(winnerElo, loserElo);
  const expL = eloExpected(loserElo, winnerElo);
  return {
    newWinner: Math.round(winnerElo + ELO_K * (1 - expW)),
    newLoser: Math.round(loserElo + ELO_K * (0 - expL)),
  };
}

function slug(s) {
  return (s||"").trim().replace(/\s+/g,"-").replace(/[^a-zA-Z\u0590-\u05FF0-9-]/g,"").toLowerCase() || ("c"+Date.now());
}

async function hashStr(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function san(s, n) {
  return (s||"").replace(/<[^>]*>/g,"").replace(/[<>"'`]/g,"").trim().slice(0, n||80);
}

function fileErr(file) {
  if (!["image/png","image/jpeg","image/svg+xml","image/gif","image/webp"].includes(file.type)) return "סוג קובץ לא נתמך";
  if (file.size > 524288) return "קובץ גדול מדי (מקס 512KB)";
  return null;
}

function loadJs(src) {
  return new Promise((res, rej) => {
    if (document.querySelector('script[src="'+src+'"]')) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function parseSheet(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "csv") {
    await loadJs("https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js");
    return new Promise((res, rej) => {
      window.Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => res(r.data), error: e => rej(e) });
    });
  }
  if (["xlsx","xls","numbers"].includes(ext)) {
    await loadJs("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    return new Promise((res, rej) => {
      const rd = new FileReader();
      rd.onload = e => {
        try {
          const wb = window.XLSX.read(e.target.result, { type: "array" });
          res(window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }));
        } catch (err) { rej(err); }
      };
      rd.onerror = rej;
      rd.readAsArrayBuffer(file);
    });
  }
  throw new Error("פורמט לא נתמך — ייצא כ-CSV או XLSX");
}

function detectCols(rows) {
  if (!rows || !rows.length) return null;
  const keys = Object.keys(rows[0]);
  return {
    nameKey: keys.find(k => /שם|city|name|עיר/i.test(k)),
    urlKey: keys.find(k => /url|link|קישור|דגל|flag|תמונה|image|http/i.test(k)),
    allKeys: keys,
  };
}

function mergeCity(name, url, cc, ov) {
  const bi = CITIES.find(c => c.name === name);
  if (bi) {
    const no = Object.assign({}, ov);
    no[bi.id] = url;
    return { cc, ov: no };
  }
  const idx = cc.findIndex(c => c.name === name);
  if (idx >= 0) {
    const a = cc.slice();
    a[idx] = Object.assign({}, a[idx], { urlFlag: url, addedAt: new Date().toISOString() });
    return { cc: a, ov };
  }
  const nc = { id: "c-"+slug(name)+"-"+Date.now(), name, urlFlag: url, custom: true, addedAt: new Date().toISOString() };
  return { cc: cc.concat([nc]), ov };
}

function CityTooltip({ city, stats, ranked, failed, ov }) {
  if (!city) return null;
  const s = stats[city.id] || { wins: 0, total: 0, elo: ELO_BASE };
  const rank = ranked.findIndex(c => c.id === city.id) + 1;
  const losses = s.total - s.wins;
  const elo = s.elo ?? ELO_BASE;
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, pointerEvents: "none" }}>
      <div style={{ width: 440, background: "linear-gradient(180deg,#0f1d36,#0a1426)", border: "1px solid rgba(196,168,79,.35)", borderRadius: 20, padding: "32px 28px", boxShadow: "0 24px 64px rgba(0,0,0,.8)", textAlign: "center" }}>
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, background: "#fff", borderRadius: 14, padding: "18px 14px", minHeight: 180 }}>
          {(failed[city.id] && !city.customOverride && !city.custom)
            ? <div style={{ fontSize: 96 }}>🏙️</div>
            : <img src={getSrc(city, ov)} alt={city.name} style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain" }} />
          }
        </div>
        <div style={{ fontSize: "2rem", fontWeight: 900, color: "#f0d88a", marginBottom: 4 }}>{city.name}</div>
        <div style={{ fontSize: "1rem", color: "#c4a84f", marginBottom: 6 }}>{rank > 0 ? `מקום #${rank} מתוך ${ranked.length}` : "—"}</div>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: elo >= 0 ? "#50c864" : "#ff6b6b", marginBottom: 20 }}>ניקוד: {elo >= 0 ? "+" : ""}{elo}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
          {[{ l: "קרבות", v: s.total, c: "#8fa3c4" }, { l: "ניצחונות", v: s.wins, c: "#50c864" }, { l: "הפסדים", v: losses, c: "#ff6b6b" }].map(item => (
            <div key={item.l} style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: "14px 18px", textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: item.c }}>{item.v}</div>
              <div style={{ fontSize: "0.8rem", color: "#8fa3c4", marginTop: 4 }}>{item.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("game");
  const [showLogin, setShowLogin] = useState(false);
  const [loginVal, setLoginVal] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginTries, setLoginTries] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);
  const [passHash, setPassHash] = useState(null);
  const [sessExp, setSessExp] = useState(null);
  const [tab, setTab] = useState("search");
  const [stats, setStats] = useState({});
  const [battles, setBattles] = useState(0);
  const [custom, setCustom] = useState([]);
  const [ov, setOv] = useState({});
  const [pair, setPair] = useState(null);
  const [voted, setVoted] = useState(null);
  const [showFull, setShowFull] = useState(false);
  const [failed, setFailed] = useState({});
  const [loading, setLoading] = useState(true);
  const [dims, setDims] = useState({});
  const [cityProfile, setCityProfile] = useState(null);

  const [sq, setSq] = useState("");
  const [stgt, setStgt] = useState(null);
  const [surl, setSurl] = useState("");
  const [surlOk, setSurlOk] = useState(null);
  const [surlResolving, setSurlResolving] = useState(false);
  const [sfile, setSfile] = useState(null);
  const [sprev, setSprev] = useState(null);
  const [smode, setSmode] = useState("url");
  const [ssaving, setSsaving] = useState(false);
  const [smsg, setSmsg] = useState(null);

  const [aname, setAname] = useState("");
  const [aurl, setAurl] = useState("");
  const [aurlOk, setAurlOk] = useState(null);
  const [aurlResolving, setAurlResolving] = useState(false);
  const [amsg, setAmsg] = useState(null);

  const [ifile, setIfile] = useState(null);
  const [irows, setIrows] = useState(null);
  const [icols, setIcols] = useState(null);
  const [incol, setIncol] = useState("");
  const [iucol, setIucol] = useState("");
  const [iprev, setIprev] = useState([]);
  const [iparsing, setIparsing] = useState(false);
  const [imsg, setImsg] = useState(null);
  const [iimporting, setIimporting] = useState(false);

  const [pwc, setPwc] = useState("");
  const [pwn, setPwn] = useState("");
  const [pwf, setPwf] = useState("");
  const [pwmsg, setPwmsg] = useState(null);
  const [rconf, setRconf] = useState(false);
  const [dconf, setDconf] = useState(null);

  const [requests, setRequests] = useState([]);
  const [reqName, setReqName] = useState("");
  const [reqUrl, setReqUrl] = useState("");
  const [reqUrlOk, setReqUrlOk] = useState(null);
  const [reqFile, setReqFile] = useState(null);
  const [reqPrev, setReqPrev] = useState(null);
  const [reqMode, setReqMode] = useState("url");
  const [reqMsg, setReqMsg] = useState(null);
  const [reqSending, setReqSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const lastVote = useRef(0);
  const anim = useRef(false);
  const sfRef = useRef(null);
  const ifRef = useRef(null);
  const reqFileRef = useRef(null);
  const idleRef = useRef(null);
  const sRef = useRef({});

  const all = CITIES.map(c => Object.assign({}, c, ov[c.id] ? { customOverride: ov[c.id] } : {})).concat(custom);

  useEffect(() => {
    (async () => {
      try { const r = await storage.get(KS, true).catch(() => null); if (r && r.value) { const d = JSON.parse(r.value); setStats(d.stats || {}); setBattles(d.totalBattles || 0); } } catch (e) {}
      try { const r = await storage.get(KC, true).catch(() => null); if (r && r.value) setCustom(JSON.parse(r.value)); } catch (e) {}
      try { const r = await storage.get(KO, true).catch(() => null); if (r && r.value) setOv(JSON.parse(r.value)); } catch (e) {}
      try { const r = await storage.get(KR, true).catch(() => null); if (r && r.value) setRequests(JSON.parse(r.value)); } catch (e) {}
      try {
        const r = await storage.get(KP, true).catch(() => null);
        if (r && r.value) setPassHash(r.value);
        else { const h = await hashStr("1234"); await storage.set(KP, h, true).catch(() => {}); setPassHash(h); }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => { sRef.current = stats; }, [stats]);

  const resetIdle = useCallback(() => {
    clearTimeout(idleRef.current);
    if (view === "admin") idleRef.current = setTimeout(() => { setView("game"); setSessExp(null); }, 1800000);
  }, [view]);

  useEffect(() => { resetIdle(); return () => clearTimeout(idleRef.current); }, [view, resetIdle]);

  const pick = useCallback((cities, cur) => {
    const av = cities.filter(c => !failed[c.id] || c.customOverride || c.custom);
    if (av.length < 2) return;
    const one = (excl) => {
      const pool = excl ? av.filter(c => c.id !== excl.id) : av;
      const ws = pool.map(c => 1 / ((sRef.current[c.id] ? sRef.current[c.id].total : 0) + 1));
      const tw = ws.reduce((a, b) => a + b, 0);
      let r = Math.random() * tw;
      for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
      return pool[pool.length - 1];
    };
    let a, b, t = 0;
    do { a = one(null); b = one(a); t++; }
    while (t < 50 && cur && ((a.id===cur[0].id&&b.id===cur[1].id)||(a.id===cur[1].id&&b.id===cur[0].id)));
    setPair([a, b]); setDims({});
  }, [failed]);

  useEffect(() => { if (!loading) pick(all, null); }, [loading]);

  const vote = useCallback(async (wid, lid) => {
    if (voted || anim.current) return;
    const now = Date.now();
    if (now - lastVote.current < 1500) return;
    lastVote.current = now; anim.current = true; setVoted(wid);
    setStats(prev => {
      const next = Object.assign({}, prev);
      [wid, lid].forEach(id => { next[id] = next[id] ? Object.assign({}, next[id]) : { wins: 0, total: 0, elo: ELO_BASE }; next[id].total++; });
      next[wid].wins++;
      const we = next[wid].elo ?? ELO_BASE;
      const le = next[lid].elo ?? ELO_BASE;
      const { newWinner, newLoser } = calcElo(we, le);
      next[wid].elo = newWinner;
      next[lid].elo = newLoser;
      const nb = battles + 1; setBattles(nb);
      storage.set(KS, JSON.stringify({ stats: next, totalBattles: nb }), true).catch(() => {});
      return next;
    });
    setTimeout(() => { setVoted(null); anim.current = false; pick(all, pair); }, 950);
  }, [voted, pair, all, battles, pick]);

  async function submitRequest() {
    const name = san(reqName);
    if (!name) { setReqMsg({ ok: false, t: "יש להזין שם עיר" }); return; }
    if (reqMode === "url") {
      if (!reqUrl.startsWith("http")) { setReqMsg({ ok: false, t: "יש להזין קישור תקין" }); return; }
      if (!reqUrlOk) { setReqMsg({ ok: false, t: "הקישור לא נטען — בדוק אותו" }); return; }
    } else {
      if (!reqFile) { setReqMsg({ ok: false, t: "יש לבחור קובץ" }); return; }
    }
    setReqSending(true);
    try {
      let attachUrl = reqMode === "url" ? reqUrl : await readF(reqFile);
      const req = { id: "r-" + Date.now(), cityName: name, url: attachUrl, mode: reqMode, submittedAt: new Date().toISOString() };
      const next = [...requests, req];
      await storage.set(KR, JSON.stringify(next), true);
      setRequests(next);
      setReqName(""); setReqUrl(""); setReqUrlOk(null); setReqFile(null); setReqPrev(null);
      if (reqFileRef.current) reqFileRef.current.value = "";
      setReqMsg({ ok: true, t: "הבקשה נשלחה! נטפל בה בקרוב." });
      setTimeout(() => setReqMsg(null), 4000);
    } catch (e) { setReqMsg({ ok: false, t: "שגיאה בשליחה" }); }
    setReqSending(false);
  }

  async function dismissRequest(id) {
    const next = requests.filter(r => r.id !== id);
    await storage.set(KR, JSON.stringify(next), true);
    setRequests(next);
  }

  async function doLogin() {
    if (lockUntil && Date.now() < lockUntil) { setLoginErr("נעול עוד " + Math.ceil((lockUntil - Date.now()) / 1000) + "s"); return; }
    const h = await hashStr(loginVal);
    if (h === passHash) {
      setView("admin"); setShowLogin(false); setLoginVal(""); setLoginErr(""); setLoginTries(0);
      setSessExp(Date.now() + 1800000); resetIdle();
    } else {
      const na = loginTries + 1; setLoginTries(na);
      if (na >= 5) { setLockUntil(Date.now() + 900000); setLoginErr("נעול ל-15 דקות"); }
      else setLoginErr("שגוי (" + (5 - na) + " נותרו)");
      setTimeout(() => setLoginErr(""), 3000);
    }
    setLoginVal("");
  }

  function readF(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
  }

  async function persist(cc, newOv) {
    await storage.set(KC, JSON.stringify(cc), true);
    await storage.set(KO, JSON.stringify(newOv), true);
    setCustom(cc); setOv(newOv);
  }

  async function saveFlag() {
    if (!stgt) return;
    let url = surl.trim();
    if (smode === "url") {
      if (!url.startsWith("http")) { setSmsg({ ok: false, t: "URL חייב להתחיל ב-http" }); return; }
      if (!surlOk) { setSmsg({ ok: false, t: "הלינק לא נטען" }); return; }
    } else {
      if (!sfile) { setSmsg({ ok: false, t: "יש לבחור קובץ" }); return; }
      url = await readF(sfile);
    }
    setSsaving(true);
    try {
      const res = mergeCity(stgt.name, url, custom, ov);
      await persist(res.cc, res.ov);
      setFailed(p => { const n = Object.assign({}, p); delete n[stgt.id]; return n; });
      setSmsg({ ok: true, t: "דגל " + stgt.name + " עודכן!" });
      setStgt(null); setSurl(""); setSurlOk(null); setSfile(null); setSprev(null);
      setTimeout(() => setSmsg(null), 3000);
    } catch (e) { setSmsg({ ok: false, t: "שגיאה: " + e.message }); }
    setSsaving(false);
  }

  async function addOne() {
    const name = san(aname);
    const url = normUrl(aurl);
    if (!name) { setAmsg({ ok: false, t: "יש להזין שם עיר" }); return; }
    if (!url.startsWith("http")) { setAmsg({ ok: false, t: "URL חייב להתחיל ב-http" }); return; }
    if (!aurlOk) { setAmsg({ ok: false, t: "הלינק לא נטען" }); return; }
    const res = mergeCity(name, url, custom, ov);
    await persist(res.cc, res.ov);
    setAname(""); setAurl(""); setAurlOk(null);
    setAmsg({ ok: true, t: name + " נוספה/עודכנה!" });
    setTimeout(() => setAmsg(null), 3000);
  }

  async function handleSheet(e) {
    const f = e.target.files[0]; if (!f) return;
    setIfile(f); setIrows(null); setIcols(null); setImsg(null); setIprev([]); setIparsing(true);
    try {
      const rows = await parseSheet(f);
      const cols = detectCols(rows);
      setIrows(rows); setIcols(cols);
      setIncol(cols && cols.nameKey ? cols.nameKey : "");
      setIucol(cols && cols.urlKey ? cols.urlKey : "");
      setIprev(rows.slice(0, 5));
      setImsg({ ok: true, t: "נטענו " + rows.length + " שורות" });
    } catch (err) { setImsg({ ok: false, t: "שגיאה: " + err.message }); }
    setIparsing(false);
  }

  async function doImport() {
    if (!irows || !incol || !iucol) { setImsg({ ok: false, t: "בחר עמודות" }); return; }
    setIimporting(true);
    let cc = custom.slice(), curOv = Object.assign({}, ov), upd = 0, skip = 0;
    for (let i = 0; i < irows.length; i++) {
      const row = irows[i];
      const name = san(String(row[incol] || "").trim());
      let url = String(row[iucol] || "").trim();
      if (isWikiMediaUrl(url)) url = await resolveWikiUrl(url);
      else url = url;
      if (!name || !url.startsWith("http")) { skip++; continue; }
      const res = mergeCity(name, url, cc, curOv); cc = res.cc; curOv = res.ov; upd++;
    }
    await persist(cc, curOv);
    setImsg({ ok: true, t: "עודכנו/נוספו " + upd + (skip ? " · " + skip + " דולגו" : "") });
    setIfile(null); setIrows(null); setIcols(null); setIprev([]);
    if (ifRef.current) ifRef.current.value = "";
    setIimporting(false);
  }

  async function delCity(id) {
    const u = custom.filter(c => c.id !== id);
    await storage.set(KC, JSON.stringify(u), true);
    setCustom(u); setDconf(null);
  }

  async function changePw() {
    if ((await hashStr(pwc)) !== passHash) { setPwmsg({ ok: false, t: "הסיסמה הנוכחית שגויה" }); return; }
    if (pwn.length < 4) { setPwmsg({ ok: false, t: "מינימום 4 תווים" }); return; }
    if (pwn !== pwf) { setPwmsg({ ok: false, t: "הסיסמאות אינן תואמות" }); return; }
    const nh = await hashStr(pwn);
    await storage.set(KP, nh, true); setPassHash(nh);
    setPwc(""); setPwn(""); setPwf("");
    setPwmsg({ ok: true, t: "הסיסמה שונתה!" }); setTimeout(() => setPwmsg(null), 3000);
  }

  async function doReset() {
    await storage.set(KS, JSON.stringify({ stats: {}, totalBattles: 0 }), true);
    setStats({}); setBattles(0); setRconf(false);
  }


  const ranked = all.map(c => {
    const s = stats[c.id] || { wins: 0, total: 0, elo: ELO_BASE };
    return Object.assign({}, c, s, { score: s.elo ?? ELO_BASE });
  }).sort((a, b) => b.score - a.score || b.total - a.total);

  const missing = CITIES.filter(c => failed[c.id] && !ov[c.id]);
  const sres = sq.trim() ? all.filter(c => c.name.includes(sq.trim())) : [];

  const G = {
    root: { minHeight: "100vh", background: "linear-gradient(160deg,#0a0f1e,#0d1b35 50%,#0a1628)", fontFamily: "'Heebo','Arial Hebrew',sans-serif", color: "#e8ecf4", paddingBottom: 60 },
    loading: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0f1e", gap: 16 },
    spin: { width: 40, height: 40, border: "3px solid rgba(196,168,79,.2)", borderTop: "3px solid #c4a84f", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
    modal: { background: "linear-gradient(180deg,#0f1d36,#0a1426)", border: "1px solid rgba(196,168,79,.3)", borderRadius: 18, padding: "36px 32px", minWidth: 300, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.6)" },
    hdr: { textAlign: "center", padding: "36px 20px 18px", borderBottom: "1px solid rgba(196,168,79,.12)", background: "rgba(0,0,0,.3)", backdropFilter: "blur(10px)" },
    hrow: { display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 800, margin: "0 auto", padding: "0 20px" },
    title: { margin: 0, fontSize: "clamp(2rem,6vw,3.4rem)", fontWeight: 900, background: "linear-gradient(135deg,#c4a84f,#f0d88a 50%,#c4a84f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
    tabBar: { display: "flex", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.2)", overflowX: "auto", padding: "0 16px" },
    tab: { background: "transparent", border: "none", borderBottom: "3px solid transparent", color: "#5a7099", padding: "11px 14px", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit", whiteSpace: "nowrap" },
    tabOn: { color: "#c4a84f", borderBottomColor: "#c4a84f" },
    wrap: { maxWidth: 720, margin: "0 auto", padding: "22px 18px" },
    card: { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 20, marginBottom: 14 },
    cTitle: { margin: "0 0 14px", fontSize: ".95rem", fontWeight: 700, color: "#c4a84f" },
    inp: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 12px", color: "#e8ecf4", fontSize: ".91rem", outline: "none", textAlign: "right", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
    lbl: { fontSize: ".79rem", color: "#8fa3c4", fontWeight: 600 },
    dz: { border: "2px dashed rgba(196,168,79,.28)", borderRadius: 11, minHeight: 96, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: "rgba(255,255,255,.02)" },
    prev: { maxHeight: 96, maxWidth: "100%", objectFit: "contain", padding: 6 },
    row: { display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.03)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(255,255,255,.06)" },
    thumb: { width: 44, height: 29, objectFit: "contain", borderRadius: 4, background: "rgba(255,255,255,.05)", flexShrink: 0 },
    modeWrap: { display: "flex", marginBottom: 14, background: "rgba(255,255,255,.04)", borderRadius: 10, padding: 3, border: "1px solid rgba(255,255,255,.08)" },
    modeBtn: { flex: 1, background: "transparent", border: "none", borderRadius: 8, padding: "8px 12px", color: "#8fa3c4", fontSize: "0.83rem", cursor: "pointer", fontFamily: "inherit" },
    modeBtnOn: { background: "rgba(196,168,79,.18)", color: "#f0d88a", fontWeight: 700 },
    gold: { background: "linear-gradient(135deg,#c4a84f,#f0d88a)", border: "none", borderRadius: 8, padding: "9px 22px", color: "#0a0f1e", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", fontFamily: "inherit" },
    ghost: { background: "transparent", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, padding: "8px 15px", color: "#8fa3c4", fontSize: ".86rem", cursor: "pointer", fontFamily: "inherit" },
    redBtn: { background: "rgba(255,80,80,.15)", border: "1px solid rgba(255,80,80,.4)", borderRadius: 6, padding: "5px 11px", color: "#ff6b6b", fontSize: ".78rem", cursor: "pointer", fontFamily: "inherit" },
    th: { background: "rgba(196,168,79,.1)", color: "#c4a84f", padding: "6px 10px", textAlign: "right", fontWeight: 600, borderBottom: "1px solid rgba(196,168,79,.2)" },
    td: { padding: "5px 10px", color: "#8fa3c4", textAlign: "right" },
    arena: { maxWidth: 1100, margin: "0 auto", padding: "38px 20px", textAlign: "center" },
    frow: { display: "flex", justifyContent: "center", alignItems: "stretch", position: "relative" },
    fcard: { flex: 1, maxWidth: 500, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "32px 24px 24px", cursor: "pointer", transition: "all .25s", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, position: "relative", overflow: "hidden", margin: "0 14px" },
    fcardW: { background: "rgba(80,200,100,.12)", border: "1px solid rgba(80,200,100,.5)", transform: "scale(1.03)", boxShadow: "0 0 30px rgba(80,200,100,.2)" },
    fcardL: { opacity: 0.28, transform: "scale(0.97)" },
    fwrap: { width: "100%", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 14, overflow: "hidden", position: "relative" },
    fimg: { width: "100%", height: "100%", objectFit: "contain", padding: 16 },
    vs: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontWeight: 900, color: "#c4a84f", background: "#0d1b35", border: "2px solid rgba(196,168,79,.4)", borderRadius: "50%", width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" },
    lb: { maxWidth: 700, margin: "0 auto", padding: "0 20px 20px" },
    lbrow: { display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.03)", borderRadius: 10, padding: "7px 13px", border: "1px solid rgba(255,255,255,.05)" },
    lbbar: { height: "100%", background: "linear-gradient(90deg,#1e6eb5,#c4a84f)", borderRadius: 4, transition: "width .5s" },
  };

  if (loading) return (
    <div style={G.loading}>
      <div style={G.spin} />
      <div style={{ color: "#c4a84f", fontSize: 18 }}>טוען…</div>
    </div>
  );

  if (showLogin) return (
    <div style={G.root} dir="rtl">
      <div style={G.overlay}>
        <div style={G.modal}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🔐</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#c4a84f", marginBottom: 18 }}>כניסה לממשק ניהול</div>
          <input
            style={Object.assign({}, G.inp, { textAlign: "center" })}
            type="password" placeholder="סיסמה…" value={loginVal}
            onChange={e => setLoginVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doLogin()} autoFocus
          />
          {loginErr && <div style={{ color: "#ff6b6b", fontSize: "0.82rem", marginTop: 8 }}>{loginErr}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <button style={G.gold} onClick={doLogin}>כניסה</button>
            <button style={G.ghost} onClick={() => { setShowLogin(false); setLoginVal(""); setLoginErr(""); }}>ביטול</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (view === "admin") {
    const TABS = [
      { id: "requests", l: "📬 בקשות" + (requests.length > 0 ? " (" + requests.length + ")" : "") },
      { id: "search", l: "🔍 חיפוש ועריכה" },
      { id: "add", l: "✏️ הוספה מהירה" },
      { id: "import", l: "📥 ייבוא גיליון" },
      { id: "manage", l: "🗂️ ניהול (" + custom.length + ")" },
      { id: "settings", l: "⚙️ הגדרות" },
      { id: "security", l: "🛡️ אבטחה" },
    ];
    return (
      <div style={G.root} dir="rtl" onClick={resetIdle}>
        <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
          {CITIES.filter(c => !ov[c.id]).map(c => (
            <img key={c.id} src={wikiUrl(c.flag)} alt=""
              onError={() => setFailed(p => Object.assign({}, p, { [c.id]: true }))}
              onLoad={() => setFailed(p => { const n = Object.assign({}, p); delete n[c.id]; return n; })} />
          ))}
        </div>
        <header style={G.hdr}>
          <div style={G.hrow}>
            <div>
              <h1 style={Object.assign({}, G.title, { fontSize: "1.5rem", margin: 0 })}>⚙️ ממשק ניהול</h1>
              <div style={{ fontSize: "0.72rem", color: "#5a7099", marginTop: 3 }}>
                {"פג תוקף: " + (sessExp ? new Date(sessExp).toLocaleTimeString("he-IL") : "—")}
              </div>
            </div>
            <button style={G.ghost} onClick={() => { setView("game"); setSessExp(null); }}>← יציאה</button>
          </div>
        </header>
        <div style={G.tabBar}>
          {TABS.map(t => (
            <button key={t.id} style={Object.assign({}, G.tab, tab === t.id ? G.tabOn : {})} onClick={() => setTab(t.id)}>{t.l}</button>
          ))}
        </div>
        <div style={G.wrap}>

          {tab === "requests" && (
            <div style={G.card}>
              <h2 style={G.cTitle}>📬 בקשות להוספת דגל</h2>
              {requests.length === 0 ? (
                <div style={{ color: "#5a7099", fontSize: "0.9rem" }}>אין בקשות ממתינות</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[...requests].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)).map(req => (
                    <div key={req.id} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 70, height: 46, flexShrink: 0, background: "rgba(255,255,255,.05)", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={req.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#f0d88a", fontSize: "1rem", marginBottom: 4 }}>{req.cityName}</div>
                        <div style={{ fontSize: "0.72rem", color: "#5a7099", marginBottom: 6, direction: "ltr", wordBreak: "break-all" }}>
                          {req.mode === "url" ? req.url.slice(0, 60) + (req.url.length > 60 ? "…" : "") : "📎 קובץ מצורף"}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#8fa3c4" }}>
                          {new Date(req.submittedAt).toLocaleString("he-IL")}
                        </div>
                      </div>
                      <button style={Object.assign({}, G.gold, { flexShrink: 0, fontSize: "0.8rem", padding: "6px 14px" })} onClick={() => dismissRequest(req.id)}>
                        טופל ✓
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "search" && (
            <div>
              <div style={G.card}>
                <h2 style={G.cTitle}>🔍 חיפוש עיר לעריכת דגל</h2>
                <input style={Object.assign({}, G.inp, { marginBottom: 8 })} placeholder="הקלד שם עיר…" value={sq} autoFocus
                  onChange={e => { setSq(e.target.value); setStgt(null); setSmsg(null); }} />
                {sq.trim().length > 0 && (
                  <div style={{ fontSize: "0.75rem", color: "#5a7099", marginBottom: 10 }}>{sres.length + " תוצאות"}</div>
                )}
                {sres.length > 0 && !stgt && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {sres.map(city => {
                      const bad = failed[city.id] && !city.customOverride && !city.custom;
                      return (
                        <div key={city.id} style={Object.assign({}, G.row, { cursor: "pointer" })}
                          onClick={() => { setStgt(city); setSurl(""); setSurlOk(null); setSfile(null); setSprev(null); setSmode("url"); }}>
                          <div style={Object.assign({}, G.thumb, { display: "flex", alignItems: "center", justifyContent: "center" })}>
                            {bad
                              ? <span>❓</span>
                              : <img src={getSrc(city, ov)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={() => setFailed(p => Object.assign({}, p, { [city.id]: true }))} />
                            }
                          </div>
                          <span style={{ fontWeight: 600, color: "#e8ecf4", minWidth: 80 }}>{city.name}</span>
                          <span style={{ fontSize: "0.7rem", color: city.custom ? "#4a9f6f" : "#5a7099", flex: 1 }}>
                            {city.custom ? "מותאם" : "מובנה"}{bad && <span style={{ color: "#ff9966" }}> ⚠️</span>}
                          </span>
                          <span style={{ color: "#c4a84f", fontSize: "0.8rem" }}>עריכה ›</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {sq.trim().length > 0 && sres.length === 0 && (
                  <div style={{ color: "#5a7099", fontSize: "0.85rem" }}>לא נמצאה עיר בשם זה</div>
                )}
                {smsg && !stgt && <div style={{ color: smsg.ok ? "#50c864" : "#ff6b6b", fontWeight: 600, marginTop: 10 }}>{smsg.t}</div>}
              </div>

              {stgt && (
                <div style={Object.assign({}, G.card, { border: "1px solid rgba(196,168,79,.35)" })}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={Object.assign({}, G.thumb, { width: 56, height: 37, display: "flex", alignItems: "center", justifyContent: "center" })}>
                      <img src={getSrc(stgt, ov)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#f0d88a" }}>{stgt.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#5a7099" }}>{stgt.custom ? "מותאמת" : "מובנה"}</div>
                    </div>
                    <button style={Object.assign({}, G.ghost, { marginRight: "auto", padding: "4px 10px", fontSize: "0.76rem" })} onClick={() => setStgt(null)}>✕</button>
                  </div>
                  <div style={G.modeWrap}>
                    <button style={Object.assign({}, G.modeBtn, smode === "url" ? G.modeBtnOn : {})} onClick={() => setSmode("url")}>🔗 קישור</button>
                    <button style={Object.assign({}, G.modeBtn, smode === "file" ? G.modeBtnOn : {})} onClick={() => setSmode("file")}>📁 קובץ</button>
                  </div>
                  {smode === "url" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={G.lbl}>קישור חדש לדגל</label>
                      <input style={Object.assign({}, G.inp, { direction: "ltr", textAlign: "left" })} placeholder="https://..." value={surl}
                        onChange={e => { setSurl(e.target.value); setSurlOk(null); }}
                        onBlur={async e => {
                          const raw = e.target.value.trim();
                          if (!raw || !isWikiMediaUrl(raw)) return;
                          setSurlResolving(true);
                          const resolved = await resolveWikiUrl(raw);
                          setSurl(resolved); setSurlResolving(false);
                        }} />
                      {surl.startsWith("http") && (
                        <div style={Object.assign({}, G.dz, { minHeight: 70, cursor: "default", pointerEvents: "none" })}>
                          <img src={surl} alt="preview" style={G.prev} onLoad={() => setSurlOk(true)} onError={() => setSurlOk(false)} />
                        </div>
                      )}
                      {surlResolving && <div style={{ color: "#c4a84f", fontSize: "0.82rem" }}>⏳ מאחזר URL ישיר…</div>}
                      {!surlResolving && surlOk === true && <div style={{ color: "#50c864", fontSize: "0.82rem" }}>✅ נטענה</div>}
                      {surlOk === false && <div style={{ color: "#ff6b6b", fontSize: "0.82rem" }}>❌ לא ניתן לטעון</div>}
                    </div>
                  ) : (
                    <div style={G.dz} onClick={() => sfRef.current && sfRef.current.click()}>
                      {sprev
                        ? <img src={sprev} alt="preview" style={G.prev} />
                        : <div style={{ textAlign: "center" }}><div style={{ fontSize: 30 }}>🖼️</div><div style={{ color: "#8fa3c4", fontSize: "0.83rem" }}>לחץ לבחירת קובץ</div></div>
                      }
                      <input ref={sfRef} type="file" accept="image/*,.svg" style={{ display: "none" }}
                        onChange={e => {
                          const f = e.target.files[0]; if (!f) return;
                          const err = fileErr(f); if (err) { setSmsg({ ok: false, t: err }); return; }
                          setSfile(f); const rd = new FileReader(); rd.onload = ev => setSprev(ev.target.result); rd.readAsDataURL(f);
                        }} />
                    </div>
                  )}
                  {smsg && <div style={{ color: smsg.ok ? "#50c864" : "#ff6b6b", fontWeight: 600, marginTop: 8 }}>{smsg.t}</div>}
                  <button style={Object.assign({}, G.gold, { marginTop: 12, opacity: ssaving ? 0.6 : 1 })} onClick={saveFlag} disabled={ssaving}>
                    {ssaving ? "שומר…" : "שמור דגל ✓"}
                  </button>
                </div>
              )}

              {missing.length > 0 && !sq && (
                <div style={G.card}>
                  <h2 style={G.cTitle}>{"⚠️ דגלים חסרים (" + missing.length + ")"}</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {missing.map(c => (
                      <div key={c.id} style={Object.assign({}, G.row, { cursor: "pointer", borderColor: "rgba(255,140,0,.3)" })}
                        onClick={() => { setSq(c.name); setStgt(c); setSurl(""); setSurlOk(null); setSmode("url"); }}>
                        <div style={Object.assign({}, G.thumb, { display: "flex", alignItems: "center", justifyContent: "center" })}>❓</div>
                        <span style={{ fontWeight: 600, color: "#e8ecf4", flex: 1 }}>{c.name}</span>
                        <span style={{ color: "#c4a84f", fontSize: "0.8rem" }}>תקן ›</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "add" && (
            <div style={G.card}>
              <h2 style={G.cTitle}>✏️ הוספה / עדכון עיר</h2>
              <p style={{ color: "#8fa3c4", fontSize: "0.85rem", margin: "0 0 14px" }}>אם העיר כבר קיימת — הדגל יתעדכן אוטומטית.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                <div style={{ flex: "0 0 160px" }}>
                  <label style={G.lbl}>שם העיר</label>
                  <input style={Object.assign({}, G.inp, { marginTop: 5 })} placeholder="למשל: חדרה" value={aname}
                    onChange={e => setAname(san(e.target.value))} onKeyDown={e => e.key === "Enter" && addOne()} />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={G.lbl}>קישור לדגל</label>
                  <input style={Object.assign({}, G.inp, { marginTop: 5, direction: "ltr", textAlign: "left" })} placeholder="https://..." value={aurl}
                    onChange={e => { setAurl(e.target.value); setAurlOk(null); setAmsg(null); }}
                    onBlur={async e => {
                      const raw = e.target.value.trim();
                      if (!raw || !isWikiMediaUrl(raw)) return;
                      setAurlResolving(true);
                      const resolved = await resolveWikiUrl(raw);
                      setAurl(resolved); setAurlResolving(false);
                    }}
                    onKeyDown={e => e.key === "Enter" && addOne()} />
                </div>
                <button style={Object.assign({}, G.gold, { flexShrink: 0, height: 40 })} onClick={addOne}>הוסף ✓</button>
              </div>
              {aurl.startsWith("http") && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,.03)", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                  <div style={{ width: 66, height: 44, background: "rgba(255,255,255,.05)", borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <img src={aurl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      onLoad={() => setAurlOk(true)} onError={() => setAurlOk(false)} />
                  </div>
                  <div>
                    {aurlOk === true && <div style={{ color: "#50c864", fontWeight: 600, fontSize: "0.85rem" }}>✅ נטענה</div>}
                    {aurlOk === false && <div style={{ color: "#ff6b6b", fontWeight: 600, fontSize: "0.85rem" }}>❌ שגיאה</div>}
                    {aurlResolving && <div style={{ color: "#c4a84f", fontSize: "0.82rem" }}>⏳ מאחזר URL ישיר…</div>}
                    {!aurlResolving && aurlOk === null && <div style={{ color: "#8fa3c4", fontSize: "0.82rem" }}>טוען…</div>}
                    {aname && <div style={{ color: "#c4a84f", fontSize: "0.8rem", marginTop: 3 }}>{aname}</div>}
                  </div>
                </div>
              )}
              {amsg && <div style={{ color: amsg.ok ? "#50c864" : "#ff6b6b", fontWeight: 600 }}>{amsg.t}</div>}
            </div>
          )}

          {tab === "import" && (
            <div style={G.card}>
              <h2 style={G.cTitle}>📥 ייבוא CSV / Excel / Numbers</h2>
              <p style={{ color: "#8fa3c4", fontSize: "0.85rem", margin: "0 0 14px" }}>כפילויות יתעדכנו אוטומטית.</p>
              <div style={G.dz} onClick={() => ifRef.current && ifRef.current.click()}>
                {ifile
                  ? <div style={{ textAlign: "center" }}><div style={{ fontSize: 32 }}>📊</div><div style={{ color: "#c4a84f", fontWeight: 600, marginTop: 6 }}>{ifile.name}</div></div>
                  : <div style={{ textAlign: "center" }}><div style={{ fontSize: 36 }}>📊</div><div style={{ color: "#8fa3c4", fontSize: "0.83rem", marginTop: 6 }}>לחץ לבחירת קובץ CSV / XLSX</div></div>
                }
                <input ref={ifRef} type="file" accept=".csv,.xlsx,.xls,.numbers" style={{ display: "none" }} onChange={handleSheet} />
              </div>
              {iparsing && <div style={{ color: "#c4a84f", marginTop: 10 }}>מפענח…</div>}
              {imsg && <div style={{ color: imsg.ok ? "#50c864" : "#ff6b6b", fontWeight: 600, marginTop: 10 }}>{imsg.t}</div>}
              {irows && icols && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label style={G.lbl}>עמודת שם עיר</label>
                      <select style={Object.assign({}, G.inp, { marginTop: 4 })} value={incol} onChange={e => setIncol(e.target.value)}>
                        <option value="">-- בחר --</option>
                        {icols.allKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label style={G.lbl}>עמודת URL דגל</label>
                      <select style={Object.assign({}, G.inp, { marginTop: 4 })} value={iucol} onChange={e => setIucol(e.target.value)}>
                        <option value="">-- בחר --</option>
                        {icols.allKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  {iprev.length > 0 && incol && iucol && (
                    <div style={{ overflowX: "auto", marginBottom: 14 }}>
                      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.78rem" }}>
                        <thead>
                          <tr><th style={G.th}>#</th><th style={G.th}>שם</th><th style={G.th}>URL</th><th style={G.th}>👁</th></tr>
                        </thead>
                        <tbody>
                          {iprev.map((row, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                              <td style={G.td}>{i + 1}</td>
                              <td style={Object.assign({}, G.td, { color: "#e8ecf4", fontWeight: 600 })}>{row[incol] || "—"}</td>
                              <td style={Object.assign({}, G.td, { maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr", fontSize: "0.7rem" })}>{row[iucol] || "—"}</td>
                              <td style={G.td}>
                                {row[iucol] && String(row[iucol]).startsWith("http")
                                  ? <img src={normUrl(row[iucol])} alt="" style={{ height: 20, maxWidth: 32, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />
                                  : <span style={{ color: "#ff6b6b" }}>❌</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button style={Object.assign({}, G.gold, { opacity: iimporting ? 0.6 : 1 })} onClick={doImport} disabled={iimporting || !incol || !iucol}>
                    {iimporting ? "מייבא…" : "ייבא " + irows.length + " שורות"}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "manage" && (
            <div style={G.card}>
              <h2 style={G.cTitle}>{"🗂️ ערים מותאמות (" + custom.length + ")"}</h2>
              {custom.length === 0
                ? <div style={{ color: "#5a7099" }}>לא נוספו ערים עדיין</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {custom.slice().reverse().map(city => (
                    <div key={city.id} style={G.row}>
                      {city.urlFlag || city.dataUrl
                        ? <img src={city.urlFlag || city.dataUrl} alt="" style={G.thumb} onError={e => e.target.style.display = "none"} />
                        : <div style={Object.assign({}, G.thumb, { display: "flex", alignItems: "center", justifyContent: "center" })}>🏙️</div>
                      }
                      <span style={{ fontWeight: 600, color: "#e8ecf4", minWidth: 80 }}>{city.name}</span>
                      <span style={{ flex: 1, fontSize: "0.7rem", color: "#5a7099" }}>{new Date(city.addedAt).toLocaleDateString("he-IL")}</span>
                      <span style={{ fontSize: "0.7rem", color: "#5a7099" }}>{stats[city.id] ? (stats[city.id].wins + "/" + stats[city.id].total) : "0/0"}</span>
                      {dconf === city.id
                        ? <div style={{ display: "flex", gap: 6 }}>
                            <button style={G.redBtn} onClick={() => delCity(city.id)}>מחק</button>
                            <button style={G.ghost} onClick={() => setDconf(null)}>ביטול</button>
                          </div>
                        : <button style={{ background: "transparent", border: "none", color: "rgba(255,100,100,.4)", cursor: "pointer", fontSize: "1rem" }} onClick={() => setDconf(city.id)}>🗑️</button>
                      }
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {tab === "settings" && (
            <div>
              <div style={G.card}>
                <h2 style={G.cTitle}>📊 סטטיסטיקות</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[{ l: "קרבות", v: battles.toLocaleString() }, { l: "ערים", v: all.length }, { l: "מובנות", v: CITIES.length }, { l: "נוספו", v: custom.length }, { l: "חסרים", v: missing.length }].map(s => (
                    <div key={s.l} style={{ background: "rgba(196,168,79,.07)", border: "1px solid rgba(196,168,79,.18)", borderRadius: 10, padding: "11px 17px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#c4a84f" }}>{s.v}</div>
                      <div style={{ fontSize: "0.7rem", color: "#8fa3c4", marginTop: 3 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={G.card}>
                <h2 style={G.cTitle}>🔑 שינוי סיסמה</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={G.lbl}>סיסמה נוכחית</label>
                  <input style={G.inp} type="password" value={pwc} onChange={e => setPwc(e.target.value)} placeholder="סיסמה נוכחית…" />
                  <label style={G.lbl}>סיסמה חדשה</label>
                  <input style={G.inp} type="password" value={pwn} onChange={e => setPwn(e.target.value)} placeholder="סיסמה חדשה…" />
                  <label style={G.lbl}>אימות</label>
                  <input style={G.inp} type="password" value={pwf} onChange={e => setPwf(e.target.value)} placeholder="חזרה…" onKeyDown={e => e.key === "Enter" && changePw()} />
                  {pwmsg && <div style={{ color: pwmsg.ok ? "#50c864" : "#ff6b6b", fontWeight: 600 }}>{pwmsg.t}</div>}
                  <button style={G.gold} onClick={changePw}>שנה סיסמה</button>
                </div>
              </div>
              <div style={Object.assign({}, G.card, { borderColor: "rgba(255,80,80,.2)" })}>
                <h2 style={Object.assign({}, G.cTitle, { color: "#ff6b6b" })}>⚠️ איפוס נתוני קרבות</h2>
                <p style={{ color: "#8fa3c4", fontSize: "0.88rem", margin: "0 0 14px" }}>מוחק תוצאות. ערים ודגלים נשמרים.</p>
                {rconf
                  ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: "#ff6b6b", fontWeight: 600 }}>{"בטוח לאפס " + battles.toLocaleString() + " קרבות?"}</span>
                      <button style={G.redBtn} onClick={doReset}>כן, אפס</button>
                      <button style={G.ghost} onClick={() => setRconf(false)}>ביטול</button>
                    </div>
                  : <button style={G.redBtn} onClick={() => setRconf(true)}>איפוס כל הנתונים</button>
                }
              </div>
            </div>
          )}

          {tab === "security" && (
            <div style={G.card}>
              <h2 style={G.cTitle}>🛡️ הגנות</h2>
              {[
                [true, "Vote throttle", "1.5 שניות בין הצבעות"],
                [true, "SHA-256 password", "hash בלבד"],
                [true, "Login lockout", "5 ניסיונות → 15 דקות"],
                [true, "Session timeout", "30 דקות"],
                [true, "File validation", "סוג + גודל"],
                [true, "Auto-dedup", "כפילויות מתמזגות"],
                [false, "reCAPTCHA", "נדרש שרת"],
                [false, "Rate limiting", "נדרש Redis"],
                [false, "HTTPS", "נדרש deployment"],
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span>{item[0] ? "✅" : "🔴"}</span>
                  <span style={{ fontWeight: 600, color: item[0] ? "#e8ecf4" : "#ff9966", minWidth: 180 }}>{item[1]}</span>
                  <span style={{ fontSize: "0.76rem", color: "#5a7099" }}>{item[2]}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    );
  }

  if (view === "leaderboard") {
    return (
      <div style={G.root} dir="rtl">
        <header style={G.hdr}>
          <div style={G.hrow}>
            <h1 style={Object.assign({}, G.title, { fontSize: "1.6rem" })}>🏆 טבלה מלאה</h1>
            <button style={G.ghost} onClick={() => setView("game")}>← חזרה</button>
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontSize: "0.8rem", color: "#8fa3c4" }}>{ranked.length} ערים · {battles.toLocaleString()} קרבות</div>
        </header>
        <section style={Object.assign({}, G.lb, { maxWidth: 760, padding: "24px 20px" })}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {ranked.map((city, i) => {
              const maxElo = ranked[0]?.score || ELO_BASE;
              const minElo = Math.min(ranked[ranked.length - 1]?.score ?? ELO_BASE, ELO_BASE - 100);
              const barPct = maxElo > minElo ? Math.max(4, ((city.score - minElo) / (maxElo - minElo)) * 100) : 4;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
              return (
                <div key={city.id} style={Object.assign({}, G.lbrow, i < 3 ? { background: "rgba(196,168,79,.07)", border: "1px solid rgba(196,168,79,.14)" } : {})}>
                  <span style={{ minWidth: 26, textAlign: "center", color: "#c4a84f" }}>{medal}</span>
                  <div style={{ width: 68, height: 44, overflow: "hidden", borderRadius: 5, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
                    onMouseEnter={() => setCityProfile(city)} onMouseLeave={() => setCityProfile(null)}>
                    {failed[city.id] && !city.customOverride && !city.custom
                      ? <span style={{ fontSize: 12 }}>🏙️</span>
                      : <img src={getSrc(city, ov)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={() => setFailed(p => Object.assign({}, p, { [city.id]: true }))} />
                    }
                  </div>
                  <span style={{ minWidth: 88, fontSize: "0.86rem", color: "#e8ecf4" }}>{city.name}</span>
                  <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,.07)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={Object.assign({}, G.lbbar, { width: barPct + "%", opacity: city.total > 0 ? 1 : 0.15 })} />
                  </div>
                  <span style={{ minWidth: 44, fontSize: "0.81rem", color: "#c4a84f", fontWeight: 700, textAlign: "center" }}>{city.total > 0 ? city.score : "—"}</span>
                  <span style={{ minWidth: 44, fontSize: "0.71rem", color: "#5a7099", textAlign: "center" }}>{city.total}</span>
                </div>
              );
            })}
          </div>
        </section>
        <CityTooltip city={cityProfile} stats={stats} ranked={ranked} failed={failed} ov={ov} />
      </div>
    );
  }

  if (view === "about") {
    return (
      <div style={G.root} dir="rtl">
        <header style={G.hdr}>
          <div style={G.hrow}>
            <h1 style={Object.assign({}, G.title, { fontSize: "1.6rem" })}>אודות</h1>
            <button style={G.ghost} onClick={() => setView("game")}>← חזרה</button>
          </div>
        </header>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 24px" }}>

          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "32px 28px", marginBottom: 24, lineHeight: 1.9, fontSize: "1rem", color: "#c8d4e8" }}>
            <p style={{ marginTop: 0 }}>כמה מאיתנו באמת נושאים את סמל העיר שלהם בגאווה? כנראה שמעט מאוד. בדרך כלל אנחנו פוגשים אותו על מעטפות של ארנונה או על שלטים רשמיים, וחבל.</p>
            <p>סמל של עיר הוא לא סתם לוגו בירוקרטי, הוא אמור להיות הלב הפועם של הזהות המקומית שלנו, משהו שתרצו להדביק על הלפטופ או לראות על חולצה. בארצות הברית למשל זה הרבה יותר בולט.</p>
            <p>האובססיה שלי התחילה <a href="https://www.youtube.com/watch?v=pnv5iKB2hl4" target="_blank" rel="noopener noreferrer" style={{ color: "#c4a84f", textDecoration: "underline" }}>מהרצאת ה-TED המרתקת של רומאן מארס</a> (מהפודקאסט 99% Invisible). מארס דיבר על וקסילולוגיה (חקר דגלים) ועל איך דגל שעוצב נכון יכול לשנות את הדרך שבה תושבים תופסים את המקום שבו הם חיים. ההרצאה הזו "נתקעה" לי בראש, והיא ההשראה להקמת האתר הזה.</p>
            <p style={{ marginBottom: 8, fontWeight: 700, color: "#f0d88a" }}>המטרות שלו פשוטות:</p>
            <ol style={{ paddingRight: 20, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <li><strong style={{ color: "#e8ecf4" }}>לחגוג ולגלות:</strong> להכיר את הסמלים והדגלים של ערי וישובי ישראל. את רובם המוחלט כנראה מעולם לא ראיתם, וחלקם יפתיעו אתכם לטובה (או לרעה).</li>
              <li><strong style={{ color: "#e8ecf4" }}>לציין לשבח:</strong> לתת במה וקרדיט לסמלים שעושים עבודה מצוינת — כאלו שהם פשוטים, זכירים ומלאי משמעות.</li>
              <li><strong style={{ color: "#e8ecf4" }}>לעורר השראה לשינוי:</strong> לעודד רשויות מקומיות להתבונן שוב בסמלים שלהן. בעידן של מיתוג ועיצוב מודרני, סמל מעודכן ואיכותי הוא כלי אדיר לחיזוק הקשר בין התושבים לבית שלהם.</li>
            </ol>
            <p style={{ marginBottom: 0, marginTop: 20, color: "#8fa3c4" }}>אשמח לשמוע כל פידבק שיש לכם, הערה או הצעה לסמלים שפספסתי וצריכים להיות כאן.</p>
          </div>

          <div style={{ background: "rgba(196,168,79,.06)", border: "1px solid rgba(196,168,79,.2)", borderRadius: 16, padding: "32px 28px" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "1.2rem", fontWeight: 800, color: "#c4a84f" }}>איך מתבצע דירוג הסמלים?</h2>
            <div style={{ lineHeight: 1.9, fontSize: "0.95rem", color: "#c8d4e8", display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ margin: 0 }}>הדירוג מבוסס על שיטה שנקראת <strong style={{ color: "#f0d88a" }}>Elo</strong> — אותה שיטה שמשמשת לדירוג שחקני שחמט ושחקני כדורגל בליגות מקצועיות.</p>
              <p style={{ margin: 0 }}><strong style={{ color: "#e8ecf4" }}>נקודת ההתחלה:</strong> כל עיר מתחילה עם ניקוד של 0. לא קיבלה ולא נלקח ממנה כלום — דף לבן.</p>
              <p style={{ margin: 0 }}><strong style={{ color: "#e8ecf4" }}>מה קורה בכל הצבעה?</strong> כשאתם בוחרים בין שני סמלים, המערכת לא רק סופרת "עוד ניצחון" — היא שואלת: עד כמה הניצחון הזה מפתיע?</p>
              <ul style={{ margin: 0, paddingRight: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                <li>ניצחון על עיר <strong style={{ color: "#50c864" }}>חזקה ומדורגת גבוה</strong> → מרוויחים הרבה נקודות. זה הישג אמיתי.</li>
                <li>ניצחון על עיר <strong style={{ color: "#8fa3c4" }}>חלשה ומדורגת נמוך</strong> → מרוויחים מעט נקודות. זה לא הפתעה.</li>
                <li>הפסד לעיר <strong style={{ color: "#50c864" }}>חזקה</strong> → מפסידים מעט. זה הגיוני.</li>
                <li>הפסד לעיר <strong style={{ color: "#ff6b6b" }}>חלשה</strong> → מפסידים הרבה. זה מביך.</li>
              </ul>
              <p style={{ margin: 0 }}><strong style={{ color: "#e8ecf4" }}>מה זה אומר בפועל?</strong> עיר שניצחה 7 מתוך 10 פעמים — אבל הפסידה לחלשות — תדורג נמוך יותר מעיר שניצחה 6 מתוך 10 אבל הפסידה רק לחזקות. הדירוג מתגמל איכות ניצחונות, לא רק כמות.</p>
              <p style={{ margin: 0 }}><strong style={{ color: "#e8ecf4" }}>למה הניקוד יכול לרדת מתחת לאפס?</strong> עיר שמפסידה שוב ושוב, בעיקר לעירות חלשות, תצבור ניקוד שלילי. זה לא עונש — זה פשוט משקף שהסמל שלה פחות מושך מהממוצע.</p>
              <p style={{ margin: 0, color: "#8fa3c4", fontSize: "0.85rem" }}>הדירוג מתעדכן בזמן אמת לאחר כל הצבעה, וגדל ומשתפר ככל שיותר אנשים משתתפים.</p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={G.root} dir="rtl">
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
        {CITIES.filter(c => !ov[c.id]).map(c => (
          <img key={c.id} src={wikiUrl(c.flag)} alt=""
            onError={() => setFailed(p => Object.assign({}, p, { [c.id]: true }))}
            onLoad={() => setFailed(p => { const n = Object.assign({}, p); delete n[c.id]; return n; })} />
        ))}
      </div>
      <header style={G.hdr}>
        <h1 style={G.title}>League of Crests</h1>
        <p style={{ margin: "8px 0 0", fontSize: "1rem", color: "#8fa3c4" }}>בואו להכריע מי הישובים עם הסמלים המוצלחים ביותר בישראל</p>
        <div style={{ marginTop: 10, fontSize: "1.1rem", fontWeight: 700, color: "#c4a84f" }}>{"מספר ההצבעות: " + battles.toLocaleString()}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
          {[
            {
              label: "WhatsApp",
              bg: "#25D366", color: "#fff",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.121 1.524 5.855L.057 23.082a.75.75 0 0 0 .92.92l5.228-1.467A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.714 9.714 0 0 1-4.951-1.355l-.355-.211-3.683 1.033 1.033-3.683-.211-.355A9.714 9.714 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>,
              onClick: () => window.open("https://wa.me/?text=" + encodeURIComponent("מי העיר עם הסמל הכי יפה בישראל?" + window.location.href), "_blank"),
            },
            {
              label: "Facebook",
              bg: "#1877F2", color: "#fff",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>,
              onClick: () => window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(window.location.href), "_blank"),
            },
            {
              label: copied ? "הועתק!" : "Instagram",
              bg: copied ? "#50c864" : "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
              color: "#fff",
              icon: copied
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
              onClick: () => { navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); },
            },
            {
              label: "מייל",
              bg: "rgba(255,255,255,.1)", color: "#e8ecf4",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>,
              onClick: () => window.open("mailto:?subject=" + encodeURIComponent("מי העיר עם הסמל הכי יפה בישראל?") + "&body=" + encodeURIComponent("מי העיר עם הסמל הכי יפה בישראל? בוא לבחור!\n" + window.location.href), "_blank"),
            },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: "none", background: btn.bg, color: btn.color, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "opacity .2s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              {btn.icon}{btn.label}
            </button>
          ))}
        </div>
      </header>

      <section style={G.arena}>
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setView("about")} style={{ background: "rgba(196,168,79,.12)", border: "1px solid rgba(196,168,79,.45)", borderRadius: 10, padding: "10px 28px", color: "#f0d88a", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.03em" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(196,168,79,.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(196,168,79,.12)"}>
            אודות ›
          </button>
        </div>
        <div style={{ fontSize: "1.15rem", color: "#8fa3c4", marginBottom: 26 }}>מבין שני הסמלים הבאים, מי בעיניך מוצלח יותר?</div>
        {pair && (
          <div style={G.frow}>
            {pair.map((city, idx) => {
              const isW = voted === city.id;
              const isL = !!(voted && voted !== city.id);
              return (
                <button key={city.id}
                  style={Object.assign({}, G.fcard, isW ? G.fcardW : {}, isL ? G.fcardL : {})}
                  onClick={() => vote(city.id, pair[1 - idx].id)} disabled={!!voted}>
                  <div style={G.fwrap}>
                    {(failed[city.id] && !city.customOverride && !city.custom)
                      ? <div style={{ fontSize: 50, opacity: 0.3 }}>🏙️</div>
                      : <img src={getSrc(city, ov)} alt={city.name}
                          style={G.fimg}
                          onError={() => setFailed(p => Object.assign({}, p, { [city.id]: true }))} />
                    }
                    {isW && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(80,200,100,.9)", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 700 }}>✓ ניצח!</div>}
                  </div>
                  <div
                    style={{ fontSize: "clamp(1.2rem,3vw,1.7rem)", fontWeight: 700, color: "#e8ecf4", cursor: "pointer", textDecorationLine: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}
                  >{city.name}</div>
                  <div style={{ fontSize: "0.73rem", color: "#8fa3c4" }}>
                    {stats[city.id] ? (stats[city.id].wins + "/" + stats[city.id].total + " נצחונות") : <span style={{ fontStyle: "italic" }}>טרם השתתף</span>}
                  </div>
                </button>
              );
            })}
            <div style={G.vs}>VS</div>
          </div>
        )}
      </section>

      <section style={G.lb}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#c4a84f" }}>🏆 טבלת המובילים</h2>
          <button style={{ background: "transparent", border: "1px solid rgba(196,168,79,.3)", color: "#c4a84f", borderRadius: 8, padding: "5px 11px", fontSize: "0.76rem", cursor: "pointer" }}
            onClick={() => setView("leaderboard")}>טבלה מלאה</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {ranked.slice(0, 10).map((city, i) => {
            const maxElo = ranked[0]?.score || ELO_BASE;
            const minElo = Math.min(ranked[ranked.length - 1]?.score ?? ELO_BASE, ELO_BASE - 100);
            const barPct = maxElo > minElo ? Math.max(4, ((city.score - minElo) / (maxElo - minElo)) * 100) : 4;
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
            return (
              <div key={city.id} style={Object.assign({}, G.lbrow, i < 3 ? { background: "rgba(196,168,79,.07)", border: "1px solid rgba(196,168,79,.14)" } : {})}>
                <span style={{ minWidth: 26, textAlign: "center", color: "#c4a84f" }}>{medal}</span>
                <div style={{ width: 68, height: 44, overflow: "hidden", borderRadius: 5, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
                  onMouseEnter={() => setCityProfile(city)} onMouseLeave={() => setCityProfile(null)}>
                  {failed[city.id] && !city.customOverride && !city.custom
                    ? <span style={{ fontSize: 12 }}>🏙️</span>
                    : <img src={getSrc(city, ov)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={() => setFailed(p => Object.assign({}, p, { [city.id]: true }))} />
                  }
                </div>
                <span style={{ minWidth: 88, fontSize: "0.86rem", color: "#e8ecf4" }}>{city.name}</span>
                <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,.07)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={Object.assign({}, G.lbbar, { width: barPct + "%", opacity: city.total > 0 ? 1 : 0.15 })} />
                </div>
                <span style={{ minWidth: 44, fontSize: "0.81rem", color: "#c4a84f", fontWeight: 700, textAlign: "center" }}>{city.total > 0 ? city.score : "—"}</span>
                <span style={{ minWidth: 44, fontSize: "0.71rem", color: "#5a7099", textAlign: "center" }}>{city.total}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 32px" }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "20px 22px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 700, color: "#c4a84f" }}>🏙️ לא מצאת את הדגל של העיר שלך?</h3>
          <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "#5a7099" }}>שלח בקשה ונוסיף אותה בהקדם</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 160px" }}>
              <input
                style={Object.assign({}, G.inp, { fontSize: "0.88rem" })}
                placeholder="שם העיר…"
                value={reqName}
                onChange={e => setReqName(e.target.value)}
              />
            </div>
            <div style={Object.assign({}, G.modeWrap, { margin: 0, flex: "0 0 auto" })}>
              <button style={Object.assign({}, G.modeBtn, reqMode === "url" ? G.modeBtnOn : {})} onClick={() => { setReqMode("url"); setReqFile(null); setReqPrev(null); }}>🔗 קישור</button>
              <button style={Object.assign({}, G.modeBtn, reqMode === "file" ? G.modeBtnOn : {})} onClick={() => setReqMode("file")}>📁 קובץ</button>
            </div>
          </div>
          {reqMode === "url" ? (
            <div style={{ marginBottom: 12 }}>
              <input
                style={Object.assign({}, G.inp, { direction: "ltr", textAlign: "left", fontSize: "0.85rem" })}
                placeholder="https://..."
                value={reqUrl}
                onChange={e => { setReqUrl(e.target.value); setReqUrlOk(null); }}
              />
              {reqUrl.startsWith("http") && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={reqUrl} alt="" style={{ height: 36, maxWidth: 56, objectFit: "contain", background: "rgba(255,255,255,.05)", borderRadius: 6, padding: 4 }}
                    onLoad={() => setReqUrlOk(true)} onError={() => setReqUrlOk(false)} />
                  {reqUrlOk === true && <span style={{ color: "#50c864", fontSize: "0.8rem" }}>✅ נטענה</span>}
                  {reqUrlOk === false && <span style={{ color: "#ff6b6b", fontSize: "0.8rem" }}>❌ לא ניתן לטעון</span>}
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <div style={Object.assign({}, G.dz, { minHeight: 64 })} onClick={() => reqFileRef.current && reqFileRef.current.click()}>
                {reqPrev
                  ? <img src={reqPrev} alt="" style={G.prev} />
                  : <div style={{ textAlign: "center" }}><span style={{ fontSize: 24 }}>🖼️</span><div style={{ color: "#8fa3c4", fontSize: "0.78rem", marginTop: 4 }}>לחץ לבחירת קובץ</div></div>
                }
                <input ref={reqFileRef} type="file" accept="image/*,.svg" style={{ display: "none" }}
                  onChange={e => {
                    const f = e.target.files[0]; if (!f) return;
                    const err = fileErr(f); if (err) { setReqMsg({ ok: false, t: err }); return; }
                    setReqFile(f); const rd = new FileReader(); rd.onload = ev => setReqPrev(ev.target.result); rd.readAsDataURL(f);
                  }} />
              </div>
            </div>
          )}
          {reqMsg && <div style={{ color: reqMsg.ok ? "#50c864" : "#ff6b6b", fontSize: "0.85rem", fontWeight: 600, marginBottom: 10 }}>{reqMsg.t}</div>}
          <button style={Object.assign({}, G.gold, { opacity: reqSending ? 0.6 : 1 })} onClick={submitRequest} disabled={reqSending}>
            {reqSending ? "שולח…" : "שלח בקשה"}
          </button>
        </div>
      </section>


      <footer style={{ textAlign: "center", padding: "26px 20px 16px" }}>
        <button style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.14)", fontSize: "0.76rem", cursor: "pointer" }}
          onClick={() => setShowLogin(true)}>⚙️ אדמין</button>
      </footer>

      <CityTooltip city={cityProfile} stats={stats} ranked={ranked} failed={failed} ov={ov} />
    </div>
  );
}

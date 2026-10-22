/* WatchListo (antes Cartelera): app principal. Sin dependencias externas. */
(function () {
'use strict';

/* No dejar que otro sitio la cargue dentro de un marco. */
if (window.top !== window.self) { document.documentElement.textContent = ''; return; }

/* ---------- helpers ---------- */
var $ = function (s, el) { return (el || document).querySelector(s); };
var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; }); };
var fold = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
var nf = new Intl.NumberFormat('es-AR');
var dec1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
var IMG = 'https://image.tmdb.org/t/p/';
var DAY = 864e5;
var PAGE = 48;
var nz = function (v) { return v !== null && v !== undefined; };
var dig = function (o, path) { var parts = path.split('.'); for (var i = 0; i < parts.length; i++) { if (o == null) return undefined; o = o[parts[i]]; } return o; };
function debounce(fn, ms) { var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }
function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function hhmm() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function AppError(code, message, fatal) { var e = new Error(message); e.code = code; e.fatal = !!fatal; return e; }
var safePath = function (p) { return typeof p === 'string' && /^\/[A-Za-z0-9._-]{1,120}$/.test(p) ? p : null; };
var validKey = function (k) { return typeof k === 'string' && /^[mt]:\d{1,10}$/.test(k); };
var TOKEN_CHARS = /^[A-Za-z0-9._-]*$/;

var LS = {
  p: 'cartelera.',
  get: function (k, d) { try { var v = localStorage.getItem(this.p + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(this.p + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del: function (k) { try { localStorage.removeItem(this.p + k); } catch (e) {} }
};

var ICON = {
  bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>',
  bookmarkOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.8 3.7M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18.5" cy="12" r="2"/></svg>',
  back: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  x: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  ticket: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14.5 7.5v9" stroke-dasharray="1.6 2.2"/></svg>'
};

/* ---------- domain constants ---------- */
/* Servicios: los cuatro clásicos se reconocen por nombre (así entran sus variantes con
   publicidad); cualquier otro de JustWatch/TMDB se guarda con sus ids. Cada uno elige los
   suyos en Perfil y eso viaja con sus datos. Stremio es aparte: se consulta en Torrentio. */
var CLASSIC = {
  netflix: { key: 'netflix', label: 'Netflix', re: /netflix/i, fb: [8] },
  prime: { key: 'prime', label: 'Prime Video', re: /prime video/i, fb: [119] },
  disney: { key: 'disney', label: 'Disney+', re: /disney/i, fb: [337] },
  hbo: { key: 'hbo', label: 'HBO Max', re: /\bhbo\b|^max\b/i, fb: [1899, 384] }
};
var CLASSIC_KEYS = ['netflix', 'prime', 'disney', 'hbo'];
var SERVICES = [], SVC = {}, SVC_SIG = '', STREMIO_ON = true;
function defaultServiceChoice() { return CLASSIC_KEYS.map(function (k) { return { key: k, label: CLASSIC[k].label, ids: [], logo: '' }; }).concat([{ key: 'stremio', label: 'Stremio', ids: [], logo: '' }]); }
function chosenServices() { var u = typeof state !== 'undefined' && state && state.user, p = u && u.prefs && u.prefs.services; return p && Array.isArray(p.v) ? p.v : defaultServiceChoice(); }
function applyServices() {
  var list = chosenServices();
  STREMIO_ON = list.some(function (x) { return x.key === 'stremio'; });
  SERVICES = list.filter(function (x) { return x.key !== 'stremio'; }).map(function (x) {
    var c = CLASSIC[x.key];
    return c ? Object.assign({ ids: [], logo: x.logo || '' }, c) : { key: x.key, label: x.label, re: null, fb: x.ids.slice(), ids: x.ids.slice(), logo: x.logo || '' };
  });
  SVC = {}; SERVICES.forEach(function (x) { SVC[x.key] = x; });
  SVC_SIG = SERVICES.map(function (x) { return x.key + (x.ids.length ? ':' + x.ids.join('.') : ''); }).join(',');
}
applyServices();
function svcClass(k) { if (CLASSIC[k] || k === 'stremio') return 'c-' + k; var n = parseInt(String(k).slice(1), 10) || 0; return 'c-x' + (n % 6); }
var SRC = {
  tmdb: { label: 'TMDB', short: 'TMDB', max: 10, step: 0.1 },
  imdb: { label: 'IMDb', short: 'IMDb', max: 10, step: 0.1 },
  rt: { label: 'Rotten Tomatoes', short: 'RT', max: 100, step: 1 },
  mc: { label: 'Metacritic', short: 'MC', max: 100, step: 1 },
  avg: { label: 'Promedio de todos', short: 'Prom.', max: 100, step: 1 }
};
var SORTS_CATALOG = [['rating', 'Rating'], ['popularity', 'Populares'], ['year', 'Nuevas'], ['title', 'A-Z']];
var SORTS_LISTS = [['added', 'Recientes'], ['rating', 'Rating'], ['popularity', 'Populares'], ['year', 'Nuevas'], ['title', 'A-Z']];
var SORTS_RECO = [['match', 'Parecidas'], ['rating', 'Rating'], ['popularity', 'Populares'], ['year', 'Nuevas']];
var SORTS_PERSON = [['year', 'Nuevas'], ['rating', 'Rating'], ['popularity', 'Populares'], ['title', 'A-Z']];
var SORTS_SEARCH = [['relevance', 'Relevancia']];
var KW_STOP = new Set(['woman director', 'duringcreditsstinger', 'aftercreditsstinger', 'sequel', 'prequel', 'remake', 'independent film', 'live action remake', '3d', 'imax', 'short film', 'directorial debut', 'female protagonist', 'male protagonist', 'christmas', 'new year', 'anime', 'lgbt interest', 'shot on 35mm', 'black and white']);

var DEFAULT_SETTINGS = { tmdbKey: '', omdbKey: '', lang: 'es-MX', region: 'AR', depth: 'normal', minVotes: 30, theme: 'system', myName: '' };
function defaultFilters() { return { services: SERVICES.map(function (s) { return s.key; }), ratingSrc: 'tmdb', ratingMin: 0, includeUnknown: false, genres: {}, genreMode: 'any', yearFrom: '', yearTo: '', maxRuntime: 0, hideSeen: true, noIndia: true, people: [], onlyMine: false }; }

/* ---------- user data: lists, seen, stars (sync-friendly) ----------
   Every change carries a timestamp. Two copies merge by keeping the newest
   timestamp per entry, so edits made on different devices never overwrite each other. */
var clock = 0;
function now() { var t = Date.now(); clock = t > clock ? t : clock + 1; return clock; }
function tsMap(o) { var out = {}; if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { var v = +o[k]; if (validKey(k) && isFinite(v) && v > 0) out[k] = v; }); return out; }
function maxInto(dst, src) { Object.keys(src).forEach(function (k) { if (!(dst[k] >= src[k])) dst[k] = src[k]; }); }
function cleanSnap(s, k) {
  if (!s || typeof s !== 'object') return null;
  var type = k.charAt(0) === 'm' ? 'movie' : 'tv', num = function (v) { v = +v; return isFinite(v) ? v : 0; };
  return {
    k: k, id: parseInt(k.slice(2), 10), type: type,
    t: String(s.t || 'Sin título').slice(0, 300), ot: String(s.ot || '').slice(0, 300), l: /^[a-z]{2,3}$/.test(s.l || '') ? s.l : '',
    y: s.y ? parseInt(s.y, 10) || null : null,
    g: Array.isArray(s.g) ? s.g.filter(function (x) { return typeof x === 'number'; }).slice(0, 12) : [],
    v: num(s.v), vc: num(s.vc), pop: num(s.pop), p: safePath(s.p)
  };
}
function blankList(id, name, at) { return { id: id, name: name, nameAt: at || 0, createdAt: at || 0, deletedAt: 0, adds: {}, rms: {}, seeds: {}, nos: {}, tags: {} }; }
function blankUser() { return { v: 2, lists: [blankList('watchlist', 'Mi lista', 0)], seen: {}, unseen: {}, hidden: {}, unhidden: {}, stars: {}, items: {}, prefs: {}, updatedAt: 0 }; }
function upsertList(u, l) {
  var ex = u.lists.filter(function (x) { return x.id === l.id; })[0];
  if (!ex) { ex = blankList(l.id, l.name, 0); ex.createdAt = l.createdAt; ex.nameAt = -1; u.lists.push(ex); }
  if (l.nameAt > ex.nameAt || (l.nameAt === ex.nameAt && l.name > ex.name)) { ex.name = l.name; ex.nameAt = l.nameAt; }
  ex.createdAt = Math.min(ex.createdAt, l.createdAt);
  ex.deletedAt = ex.id === 'watchlist' ? 0 : Math.max(ex.deletedAt, l.deletedAt);
  maxInto(ex.adds, l.adds); maxInto(ex.rms, l.rms);
  maxInto(ex.seeds, l.seeds || {}); maxInto(ex.nos, l.nos || {});
  var tg = l.tags || {}; ex.tags = ex.tags || {};
  Object.keys(tg).forEach(function (k) { var a = tg[k], c = ex.tags[k]; if (!c || a.at > c.at || (a.at === c.at && a.v < c.v)) ex.tags[k] = { v: a.v, at: a.at }; });
}
function tagMap(o) {
  var out = {};
  if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { var t = o[k]; if (/^[stog]:[a-z0-9-]{1,30}$/.test(k) && t && (t.v === -1 || t.v === 0 || t.v === 1) && +t.at > 0) out[k] = { v: t.v, at: +t.at }; });
  return out;
}
function sortLists(u) { u.lists.sort(function (a, b) { return (a.id === 'watchlist' ? -1 : 0) - (b.id === 'watchlist' ? -1 : 0) || a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }); return u; }
function normUser(u) {
  var out = blankUser();
  if (!u || typeof u !== 'object') return out;
  var base = +u.updatedAt || Date.now();
  var lists = Array.isArray(u.lists) ? u.lists : [];
  if (u.v === 2) {
    lists.forEach(function (l) {
      if (!l || typeof l.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(l.id)) return;
      upsertList(out, { id: l.id, name: String(l.name || 'Lista').slice(0, 40), nameAt: +l.nameAt || 0, createdAt: +l.createdAt || 0, deletedAt: +l.deletedAt || 0, adds: tsMap(l.adds), rms: tsMap(l.rms), seeds: tsMap(l.seeds), nos: tsMap(l.nos), tags: tagMap(l.tags) });
    });
    out.seen = tsMap(u.seen); out.unseen = tsMap(u.unseen);
    out.hidden = tsMap(u.hidden); out.unhidden = tsMap(u.unhidden);
    out.prefs = cleanPrefs(u.prefs);
    if (u.stars && typeof u.stars === 'object') Object.keys(u.stars).forEach(function (k) {
      var s = u.stars[k]; if (!validKey(k) || !s) return;
      var n = Math.round(+s.n), at = +s.at; if (n >= 0 && n <= 5 && at > 0) out.stars[k] = { n: n, at: at };
    });
  } else {
    lists.forEach(function (l) {
      if (!l || typeof l.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(l.id)) return;
      var adds = {}; (Array.isArray(l.items) ? l.items : []).forEach(function (k, i) { if (validKey(k)) adds[k] = base - i; });
      var at = l.id === 'watchlist' ? 0 : base;
      upsertList(out, { id: l.id, name: String(l.name || 'Lista').slice(0, 40), nameAt: at, createdAt: at, deletedAt: 0, adds: adds, rms: {} });
    });
    out.seen = tsMap(u.seen);
    if (u.stars && typeof u.stars === 'object') Object.keys(u.stars).forEach(function (k) { var n = +u.stars[k]; if (validKey(k) && n >= 1 && n <= 5) out.stars[k] = { n: n, at: base }; });
  }
  if (u.items && typeof u.items === 'object') Object.keys(u.items).forEach(function (k) { if (validKey(k)) { var s = cleanSnap(u.items[k], k); if (s) out.items[k] = s; } });
  out.updatedAt = +u.updatedAt || 0;
  return sortLists(out);
}
function mergeUsers(a, b) {
  var out = blankUser();
  [a, b].forEach(function (u) {
    u.lists.forEach(function (l) { upsertList(out, l); });
    maxInto(out.seen, u.seen); maxInto(out.unseen, u.unseen);
    maxInto(out.hidden, u.hidden || {}); maxInto(out.unhidden, u.unhidden || {});
    var pa = u.prefs || {}; Object.keys(pa).forEach(function (k) { var a = pa[k], c = out.prefs[k]; if (a && (!c || a.at > c.at)) out.prefs[k] = a; });
    Object.keys(u.stars).forEach(function (k) { var s = u.stars[k], c = out.stars[k]; if (!c || s.at > c.at || (s.at === c.at && s.n > c.n)) out.stars[k] = { n: s.n, at: s.at }; });
    Object.keys(u.items).forEach(function (k) { var s = u.items[k]; if (!out.items[k] || stable(s) > stable(out.items[k])) out.items[k] = s; });
  });
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return sortLists(out);
}
/* preferencias que viajan con tus datos: { clave: { v: valor, at } }, gana la más nueva */
function cleanPrefs(p) {
  var out = {}; if (!p || typeof p !== 'object') return out;
  var sv = p.services;
  if (sv && +sv.at > 0 && Array.isArray(sv.v)) {
    var list = sv.v.filter(function (x) { return x && typeof x.key === 'string' && /^(netflix|prime|disney|hbo|p\d{1,6}|stremio)$/.test(x.key) && Array.isArray(x.ids); })
      .map(function (x) { return { key: x.key, label: String(x.label || x.key).slice(0, 40), ids: x.ids.map(Number).filter(function (n) { return n > 0 && n < 1e7; }).slice(0, 12), logo: typeof x.logo === 'string' && /^\/[A-Za-z0-9_\-]+\.(jpg|png|svg)$/.test(x.logo) ? x.logo : '' }; }).slice(0, 40);
    out.services = { v: list, at: +sv.at };
  }
  return out;
}
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
  return JSON.stringify(v);
}
function contentKey(u) { var c = Object.assign({}, u); delete c.updatedAt; return stable(c); }

/* ---------- state ---------- */
function pruneCache(obj, ttl) { var out = {}, t = Date.now(); Object.keys(obj || {}).forEach(function (k) { var v = obj[k]; if (v && v.at && t - v.at < ttl) out[k] = v; }); return out; }
var state = {
  settings: Object.assign({}, DEFAULT_SETTINGS, LS.get('settings', {})),
  user: normUser(LS.get('user', null)),
  ui: Object.assign({ view: 'catalog', type: 'movie', list: 'watchlist', source: 'mine', sortCatalog: 'rating', sortLists: 'added', sortReco: 'match', sortPerson: 'year' }, LS.get('ui', {})),
  f: Object.assign(defaultFilters(), LS.get('filters', {})),
  q: '',
  festDraft: [], festAc: [], guide: null,
  catalogs: { movie: null, tv: null },
  catIdx: { movie: null, tv: null },
  loading: { movie: null, tv: null },
  genres: { movie: new Map(), tv: new Map() },
  providers: { movie: null, tv: null },
  details: pruneCache(LS.get('details', {}), 30 * DAY),
  omdb: pruneCache(LS.get('omdb', {}), 14 * DAY),
  special: null, all: null,
  personData: {}, personLoading: {}, seedCache: {},
  filtered: [], index: new Map(), limit: PAGE,
  detail: null, menuItem: null, lastPick: null,
  omdbStop: null, fatal: null
};
applyServices();
/* la sincronización por GitHub (Gist) se reemplazó por la cuenta de Google: el token viejo se borra del dispositivo */
if ('ghToken' in state.settings || 'gistId' in state.settings) { delete state.settings.ghToken; delete state.settings.gistId; LS.set('settings', state.settings); }
if (!Array.isArray(state.f.services)) state.f.services = defaultFilters().services;
fixFilterServices();
if (!state.f.genres || typeof state.f.genres !== 'object') state.f.genres = {};
if (!SRC[state.f.ratingSrc]) state.f.ratingSrc = 'tmdb';
if (!Array.isArray(state.f.people)) state.f.people = [];
state.f.people = state.f.people.filter(function (p) { return p && +p.id > 0; }).map(function (p) { return { id: +p.id, name: String(p.name || '').slice(0, 80) }; }).slice(0, 5);
if (state.ui.source !== 'all') state.ui.source = 'mine';
LS.set('user', state.user);

function saveUi() { LS.set('ui', state.ui); LS.set('filters', state.f); }
function saveSettings() { LS.set('settings', state.settings); }
var saveCachesSoon = debounce(function () { LS.set('details', state.details); LS.set('omdb', state.omdb); }, 1500);
function touchUser() { state.user.updatedAt = now(); LS.set('user', state.user); if (cloudIn()) { cloudPushSoon(); if (CLOUD.shared.size) pushSharedSoon(); } }

/* ---------- list accessors ---------- */
function visibleLists() { return state.user.lists.concat(CLOUD && CLOUD.shared ? sharedLists() : []).filter(function (l) { return !l.deletedAt; }); }
function getList(id) { return visibleLists().filter(function (l) { return l.id === id; })[0] || null; }
/* las pelis base de un festival son parte del festival: aparecen siempre, salvo que las saques */
function seedIn(l, k) { var sd = l && l.seeds && l.seeds[k]; return !!sd && sd > ((l.rms || {})[k] || 0) && sd > ((l.nos || {})[k] || 0); }
function seedKeys(l) { return Object.keys((l && l.seeds) || {}).filter(function (k) { return seedIn(l, k); }).sort(function (a, b) { return l.seeds[a] - l.seeds[b]; }); }
function isIn(l, k) { return !!l && ((l.adds[k] || 0) > (l.rms[k] || 0) || seedIn(l, k)); }
function inList(id, k) { return isIn(getList(id), k); }
function listKeys(l) {
  var base = seedKeys(l), inBase = new Set(base);
  return base.concat(Object.keys(l.adds).filter(function (k) { return !inBase.has(k) && isIn(l, k); }).sort(function (a, b) { return l.adds[b] - l.adds[a]; }));
}
function isSeen(k) { return (state.user.seen[k] || 0) > (state.user.unseen[k] || 0); }
function isHidden(k) { return (state.user.hidden[k] || 0) > (state.user.unhidden[k] || 0); }
function hiddenKeys() { var u = state.user; return Object.keys(u.hidden).filter(isHidden).sort(function (a, b) { return u.hidden[b] - u.hidden[a]; }); }
function toggleHidden(it, force) {
  var on = typeof force === 'boolean' ? force : !isHidden(it.k);
  if (on) state.user.hidden[it.k] = now(); else state.user.unhidden[it.k] = now();
  state.user.items[it.k] = snapshot(it); touchUser();
  return on;
}
function seenKeys() { var u = state.user; return Object.keys(u.seen).filter(isSeen).sort(function (a, b) { return u.seen[b] - u.seen[a]; }); }
function starOf(k) { var s = state.user.stars[k]; return s ? s.n : 0; }
function snapshot(it) { return cleanSnap(it, it.k); }
function toggleList(id, it, force) {
  var l = getList(id); if (!l) return false;
  var on = typeof force === 'boolean' ? force : !isIn(l, it.k);
  if (on) l.adds[it.k] = now(); else l.rms[it.k] = now();
  state.user.items[it.k] = snapshot(it);
  touchUser();
  return on;
}
function toggleSeen(it) {
  var on = !isSeen(it.k);
  if (on) state.user.seen[it.k] = now(); else state.user.unseen[it.k] = now();
  state.user.items[it.k] = snapshot(it);
  touchUser();
  return on;
}
function setStar(it, n) {
  var t = now(), marked = false;
  state.user.stars[it.k] = { n: n, at: t };
  if (n > 0 && !isSeen(it.k)) { state.user.seen[it.k] = t; marked = true; }
  state.user.items[it.k] = snapshot(it); touchUser();
  return marked;
}
function createList(name) {
  name = String(name || '').trim().slice(0, 40); if (!name) return null;
  var t = now();
  var l = blankList('l' + t.toString(36) + Math.random().toString(36).slice(2, 6), name, t);
  state.user.lists.push(l); sortLists(state.user); touchUser(); return l;
}
function renameList(l, name) { name = String(name || '').trim().slice(0, 40); if (!name || l.id === 'watchlist') return; l.name = name; l.nameAt = now(); touchUser(); }
function deleteList(l) { if (l.id === 'watchlist') return; l.deletedAt = now(); touchUser(); }

/* ---------- network ---------- */
async function tmdb(path, params) {
  var key = (state.settings.tmdbKey || '').trim();
  if (!key) throw AppError('tmdb-auth', 'Falta la clave de TMDB.', true);
  var url = new URL('https://api.themoviedb.org/3' + path);
  Object.keys(params || {}).forEach(function (k) { var v = params[k]; if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
  var headers = { accept: 'application/json' };
  if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key; else url.searchParams.set('api_key', key);
  for (var attempt = 0; attempt < 4; attempt++) {
    var res;
    try { res = await fetch(url.toString(), { headers: headers, credentials: 'omit', referrerPolicy: 'no-referrer' }); }
    catch (e) { if (attempt === 3) throw AppError('network', 'No pude conectarme con TMDB. Revisá la conexión.'); await sleep(700 * (attempt + 1)); continue; }
    if (res.status === 429) { await sleep(1100 * (attempt + 1)); continue; }
    if (res.status === 401) throw AppError('tmdb-auth', 'TMDB rechazó la clave. Revisala en Ajustes.', true);
    if (res.status === 404) throw AppError('notfound', 'TMDB no encontró ese título.');
    if (!res.ok) { if (attempt < 2 && res.status >= 500) { await sleep(800); continue; } throw AppError('tmdb', 'TMDB respondió con error ' + res.status + '.'); }
    return res.json();
  }
  throw AppError('tmdb', 'TMDB está limitando las consultas. Probá de nuevo en un minuto.');
}

function omdbUsage() { var u = LS.get('omdbUsage', null); if (!u || u.day !== today()) u = { day: today(), n: 0 }; return u; }
async function fetchOmdb(imdb) {
  var c = /^tt\d{5,10}$/.test(imdb) ? await omdbFromCloud(imdb) : null;
  if (c) return c;
  var r = await fetchOmdbDirect(imdb);
  if (r && /^tt\d{5,10}$/.test(imdb)) omdbToCloud(imdb, r);
  return r;
}
async function fetchOmdbDirect(imdb) {
  if (state.omdbStop) throw AppError('omdb-stop', state.omdbStop);
  if (!/^tt\d{5,10}$/.test(imdb)) return { none: true, at: Date.now() };
  var u = omdbUsage();
  if (u.n >= 980) { state.omdbStop = 'OMDb llegó al tope de 1.000 consultas de hoy. Mañana sigue solo.'; throw AppError('omdb-limit', state.omdbStop); }
  var url = 'https://www.omdbapi.com/?apikey=' + encodeURIComponent(state.settings.omdbKey.trim()) + '&i=' + encodeURIComponent(imdb);
  var res;
  try { res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' }); } catch (e) { throw AppError('network', 'No pude conectarme con OMDb.'); }
  u.n++; LS.set('omdbUsage', u);
  var j; try { j = await res.json(); } catch (e) { throw AppError('omdb', 'OMDb devolvió una respuesta que no entiendo.'); }
  if (j.Response === 'False') {
    var m = String(j.Error || '');
    /* el tope queda anotado para hoy, así al recargar no se gastan pedidos que OMDb va a rechazar */
    if (/limit/i.test(m)) { u.n = Math.max(u.n, 1000); LS.set('omdbUsage', u); state.omdbStop = 'OMDb llegó al tope de consultas de hoy. Mañana sigue solo.'; throw AppError('omdb-limit', state.omdbStop); }
    if (/api key/i.test(m)) { state.omdbStop = 'OMDb rechazó la clave. Revisá que esté activada (llega un mail con el link).'; throw AppError('omdb-auth', state.omdbStop); }
    return { none: true, at: Date.now() };
  }
  var r = { at: Date.now() };
  var imdbR = parseFloat(j.imdbRating); if (!isNaN(imdbR)) r.imdb = imdbR;
  var votes = parseInt(String(j.imdbVotes || '').replace(/[^\d]/g, ''), 10); if (!isNaN(votes)) r.votes = votes;
  (j.Ratings || []).forEach(function (x) {
    if (x.Source === 'Rotten Tomatoes') { var v = parseInt(x.Value, 10); if (!isNaN(v)) r.rt = v; }
    if (x.Source === 'Metacritic') { var w = parseInt(x.Value, 10); if (!isNaN(w)) r.mc = w; }
  });
  if (!nz(r.mc)) { var ms = parseInt(j.Metascore, 10); if (!isNaN(ms)) r.mc = ms; }
  return r;
}

async function pool(items, limit, fn, onEach) {
  var i = 0, stop = null;
  async function worker() {
    while (i < items.length && !stop) {
      var idx = i++;
      try { await fn(items[idx], idx); }
      catch (e) { if (e && e.fatal) { stop = e; break; } }
      if (onEach) onEach();
    }
  }
  var ws = []; for (var w = 0; w < Math.min(limit, items.length); w++) ws.push(worker());
  await Promise.all(ws);
  if (stop) throw stop;
}

/* ---------- catalog ---------- */
function catSig() { var s = state.settings; return [s.region, s.lang, s.depth, s.minVotes, 'v2', SVC_SIG].join('|'); }
/* cine de la India (Bollywood, Tollywood, Kollywood y demás), por idioma original */
var INDIAN_LANGS = new Set(['hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'pa', 'gu', 'or', 'as']);
function isIndian(it) { return !!(it && it.l && INDIAN_LANGS.has(it.l)); }
function itemKey(type, id) { return (type === 'movie' ? 'm:' : 't:') + id; }
function typeOfKey(k) { return k.charAt(0) === 'm' ? 'movie' : 'tv'; }
function norm(r, type) {
  var date = r.release_date || r.first_air_date || '';
  return {
    k: itemKey(type, r.id), id: r.id, type: type,
    t: r.title || r.name || 'Sin título', ot: r.original_title || r.original_name || '', l: String(r.original_language || '').slice(0, 3),
    y: parseInt(String(date).slice(0, 4), 10) || null, g: r.genre_ids || (r.genres || []).map(function (g) { return g.id; }),
    v: Math.round((r.vote_average || 0) * 10) / 10, vc: r.vote_count || 0, pop: Math.round(r.popularity || 0),
    p: safePath(r.poster_path), s: []
  };
}
function catIndex(type) {
  var cat = state.catalogs[type]; if (!cat) return null;
  if (!state.catIdx[type] || state.catIdx[type].cat !== cat) state.catIdx[type] = { cat: cat, map: new Map(cat.items.map(function (it) { return [it.k, it]; })) };
  return state.catIdx[type].map;
}

async function loadGenres() {
  var c = LS.get('genres', null);
  if (!c || c.lang !== state.settings.lang || Date.now() - c.at > 30 * DAY) {
    var res = await Promise.all([tmdb('/genre/movie/list', { language: state.settings.lang }), tmdb('/genre/tv/list', { language: state.settings.lang })]);
    var pairs = function (d) { return (d.genres || []).map(function (g) { return [g.id, String(g.name)]; }); };
    c = { lang: state.settings.lang, at: Date.now(), movie: pairs(res[0]), tv: pairs(res[1]) };
    LS.set('genres', c);
  }
  state.genres.movie = new Map(c.movie); state.genres.tv = new Map(c.tv);
}

/* todos los proveedores de suscripción de la región (vienen de JustWatch vía TMDB) */
var STORE_IDS = new Set([2, 3, 7, 10, 35, 68, 192, 1773]);
async function loadProvRaw(type) {
  var region = state.settings.region, c = LS.get('provraw.' + type, null);
  if (c && c.region === region && Array.isArray(c.list) && Date.now() - c.at < 7 * DAY) return c.list;
  var d = await tmdb('/watch/providers/' + type, { watch_region: region, language: state.settings.lang });
  var list = (d.results || []).map(function (p) {
    var pr = p.display_priorities && p.display_priorities[region];
    return { id: +p.provider_id, name: String(p.provider_name || '').slice(0, 60), logo: /^\/[A-Za-z0-9_\-]+\.(jpg|png|svg)$/.test(p.logo_path || '') ? p.logo_path : '', prio: nz(pr) ? +pr : (+p.display_priority || 999) };
  }).filter(function (p) { return p.id > 0 && p.id < 1e7 && p.name; });
  LS.set('provraw.' + type, { region: region, at: Date.now(), list: list });
  return list;
}
async function loadProviders(type) {
  var P = state.providers[type];
  if (P && P.sig === SVC_SIG && P.region === state.settings.region) return P.map;
  var raw = null;
  try { raw = await loadProvRaw(type); } catch (e) { if (e.fatal) throw e; }
  var map = {};
  SERVICES.forEach(function (s) {
    var ids = s.ids.slice();
    if (s.re && raw) raw.forEach(function (p) { if (!/channel/i.test(p.name) && s.re.test(p.name) && ids.indexOf(p.id) < 0) ids.push(p.id); });
    map[s.key] = ids.length ? ids : s.fb.slice();
  });
  state.providers[type] = { sig: SVC_SIG, region: state.settings.region, map: map };
  return map;
}
function provIds(type, s) { var P = state.providers[type]; return (P && P.sig === SVC_SIG && P.map[s.key]) || (s.ids.length ? s.ids : s.fb); }
function servicesForIds(type, ids) { return SERVICES.filter(function (s) { return provIds(type, s).some(function (id) { return ids.indexOf(id) >= 0; }); }).map(function (s) { return s.key; }); }
function servicesForProviders(type, list) { return servicesForIds(type, list.map(function (p) { return +p.provider_id; })); }
/* agrupa variantes ("con anuncios", "Plus" / "+") y deja afuera tiendas y canales */
function provGroupKey(name) { return fold(name).replace(/\s*(basic|standard|premium)?\s*with ads$/, '').replace(/\s+plus\b/g, '+').replace(/\s+\+/g, '+').replace(/\s+/g, ' ').trim(); }
function serviceCatalog() {
  var raw = (LS.get('provraw.movie', {}).list || []).concat(LS.get('provraw.tv', {}).list || []);
  var groups = new Map();
  raw.forEach(function (p) {
    if (STORE_IDS.has(p.id) || /channel|store|google play|itunes|kaleidescape/i.test(p.name)) return;
    var ck = CLASSIC_KEYS.filter(function (k) { return CLASSIC[k].re.test(p.name); })[0];
    var gk = ck || provGroupKey(p.name), g = groups.get(gk);
    if (!g) { g = { key: ck || '', label: ck ? CLASSIC[ck].label : p.name, ids: [], logo: '', prio: 999, short: 999 }; groups.set(gk, g); }
    if (g.ids.indexOf(p.id) < 0) g.ids.push(p.id);
    g.prio = Math.min(g.prio, p.prio);
    if (p.name.length < g.short) { g.short = p.name.length; if (!ck) g.label = p.name; if (p.logo) g.logo = p.logo; }
    else if (!g.logo && p.logo) g.logo = p.logo;
  });
  CLASSIC_KEYS.forEach(function (k) { if (!Array.from(groups.values()).some(function (g) { return g.key === k; })) groups.set(k, { key: k, label: CLASSIC[k].label, ids: CLASSIC[k].fb.slice(), logo: '', prio: 0, short: 0 }); });
  return Array.from(groups.values()).map(function (g) {
    g.ids.sort(function (a, b) { return a - b; });
    if (!g.key) g.key = 'p' + g.ids[0];
    return { key: g.key, label: g.label.slice(0, 40), ids: CLASSIC[g.key] ? [] : g.ids.slice(0, 12), logo: g.logo, prio: g.prio };
  }).sort(function (a, b) { return a.prio - b.prio || a.label.localeCompare(b.label, 'es'); });
}
function loadServiceCatalog() {
  if (state.svcCatLoading) return state.svcCatLoading;
  state.svcCatLoading = Promise.all([loadProvRaw('movie'), loadProvRaw('tv')]).then(function () { state.svcCatLoading = null; }, function (e) { state.svcCatLoading = null; throw e; });
  return state.svcCatLoading;
}
/* los filtros del costado: un servicio recién elegido aparece prendido; uno que sacaste, se va */
function fixFilterServices() {
  var f = state.f, keys = SERVICES.map(function (x) { return x.key; });
  if (!Array.isArray(f.svcSeen)) f.svcSeen = CLASSIC_KEYS.slice();
  f.svcSeen = f.svcSeen.filter(function (k) { return keys.indexOf(k) >= 0; });
  keys.forEach(function (k) { if (f.svcSeen.indexOf(k) < 0) { f.svcSeen.push(k); if (f.services.indexOf(k) < 0) f.services.push(k); } });
  f.services = f.services.filter(function (k) { return keys.indexOf(k) >= 0; });
}
function syncServices() {
  var before = SVC_SIG; applyServices(); fixFilterServices();
  if (SVC_SIG === before) return;
  state.providers = { movie: null, tv: null };
  state.catalogs = { movie: null, tv: null };
  if (state.booted && !state.fatal) setTimeout(function () { renderRail(); loadCatalogAndRefresh(state.ui.type); }, 0);
}
function setServiceChoice(list) {
  state.user.prefs.services = { v: list.map(function (x) { return { key: x.key, label: x.label, ids: x.ids.slice(), logo: x.logo || '' }; }), at: now() };
  touchUser(); syncServices();
}

function freshCatalog(c, maxAge) { return !!c && c.sig === catSig() && Array.isArray(c.items) && Date.now() - c.at < (maxAge || DAY); }
function peekCatalog(type) {
  if (state.catalogs[type]) return;
  var c = LS.get('catalog.' + type, null);
  if (freshCatalog(c, 7 * DAY)) state.catalogs[type] = c;
}
function ensureCatalog(type, force) {
  if (!force && freshCatalog(state.catalogs[type])) return loadProviders(type).then(function () { return state.catalogs[type]; });
  if (!force) {
    var c = LS.get('catalog.' + type, null);
    if (freshCatalog(c)) { state.catalogs[type] = c; return loadProviders(type).then(function () { return c; }); }
  }
  if (state.loading[type]) return state.loading[type];
  state.loading[type] = fetchCatalog(type).then(function (cat) { state.loading[type] = null; return cat; }, function (e) { state.loading[type] = null; setProgress(null); throw e; });
  return state.loading[type];
}

async function fetchCatalog(type) {
  setProgress(-1, 'Buscando tus servicios…');
  var prov = await loadProviders(type);
  var s = state.settings;
  var base = {
    watch_region: s.region, with_watch_monetization_types: 'flatrate|ads', sort_by: 'popularity.desc',
    include_adult: 'false', language: s.lang,
    'vote_count.gte': type === 'movie' ? (+s.minVotes || 0) : Math.max(5, Math.round((+s.minVotes || 0) / 2))
  };
  var cap = s.depth === 'full' ? 150 : 25;
  var byId = new Map();
  function add(results, key) {
    (results || []).forEach(function (r) {
      var it = byId.get(r.id);
      if (!it) { it = norm(r, type); byId.set(r.id, it); }
      if (it.s.indexOf(key) < 0) it.s.push(key);
    });
  }
  setProgress(-1, 'Leyendo los catálogos de tus servicios…');
  var firsts = await Promise.all(SERVICES.map(function (sv) {
    return tmdb('/discover/' + type, Object.assign({}, base, { with_watch_providers: prov[sv.key].join('|'), page: 1 })).catch(function (e) { if (e.fatal) throw e; return { results: [], total_pages: 0 }; });
  }));
  var jobs = [];
  SERVICES.forEach(function (sv, i) {
    add(firsts[i].results, sv.key);
    var tp = Math.min(firsts[i].total_pages || 1, cap);
    for (var p = 2; p <= tp; p++) jobs.push([sv, p]);
  });
  var total = jobs.length + SERVICES.length, done = SERVICES.length;
  setProgress(done / total, 'Leyendo catálogos… ' + Math.round(done / total * 100) + '%');
  await pool(jobs, 6, async function (job) {
    var d = await tmdb('/discover/' + type, Object.assign({}, base, { with_watch_providers: prov[job[0].key].join('|'), page: job[1] }));
    add(d.results, job[0].key);
  }, function () { done++; setProgress(done / total, 'Leyendo catálogos… ' + Math.round(done / total * 100) + '%'); });
  var cat = { sig: catSig(), at: Date.now(), items: Array.from(byId.values()) };
  state.catalogs[type] = cat;
  if (!LS.set('catalog.' + type, cat)) toast('El catálogo es muy grande para guardarlo en el dispositivo; lo vuelvo a leer la próxima vez.');
  setProgress(null);
  return cat;
}

/* ---------- enrichment (runtime, IMDb id, OMDb ratings) ---------- */
var Q = { hi: [], lo: [], queued: new Set(), running: 0, max: 6, om: [], omQueued: new Set(), omRunning: 0, omMax: 3, jwMax: 6, wantOm: new Map() };

function liteFromFull(d, type) {
  var imdb = d.imdb_id || dig(d, 'external_ids.imdb_id') || null;
  if (imdb && !/^tt\d{5,10}$/.test(imdb)) imdb = null;
  var wp = dig(d, 'watch/providers.results.' + state.settings.region) || {};
  var pids = (wp.flatrate || []).concat(wp.ads || [], wp.free || []).map(function (p) { return +p.provider_id; }).filter(function (n) { return n > 0; }).slice(0, 40);
  var svc = servicesForIds(type, pids);
  if (type === 'movie') return { v: 2, at: Date.now(), rt: +d.runtime || null, imdb: imdb, svc: svc, pids: pids };
  var ert = d.episode_run_time || [];
  var rt = ert.length ? ert[0] : (dig(d, 'last_episode_to_air.runtime') || null);
  return { v: 2, at: Date.now(), rt: +rt || null, imdb: imdb, svc: svc, pids: pids, seasons: +d.number_of_seasons || null };
}
function hasDetails(k) { var d = state.details[k]; return !!(d && d.v === 2); }
function wantDetails(items, prio) {
  items.forEach(function (it) {
    if (hasDetails(it.k) || Q.queued.has(it.k)) return;
    Q.queued.add(it.k); Q[prio || 'hi'].push(it);
  });
  pumpDetails();
}
function pumpDetails() {
  while (Q.running < Q.max && (Q.hi.length || Q.lo.length) && !state.fatal) {
    var it = Q.hi.shift() || Q.lo.shift();
    if (hasDetails(it.k)) { Q.queued.delete(it.k); continue; }
    Q.running++;
    (function (it) {
      tmdb('/' + it.type + '/' + it.id, { append_to_response: 'external_ids,watch/providers' })
        .then(function (d) { state.details[it.k] = liteFromFull(d, it.type); saveCachesSoon(); onEnriched(it); })
        .catch(function (e) { if (e.code === 'notfound') { state.details[it.k] = { v: 2, at: Date.now(), rt: null, imdb: null, svc: [] }; } else if (e.fatal) { fatal(e); } })
        .then(function () { Q.running--; Q.queued.delete(it.k); pumpDetails(); progressNote(); });
    })(it);
  }
  progressNote();
}
/* Puntajes de IMDb, Rotten Tomatoes y Metacritic. Primero OMDb, que tiene un tope de consultas por
   día. Cuando se queda sin consultas (o rechaza la clave), IMDb y Rotten Tomatoes salen de JustWatch
   por el Worker; JustWatch no tiene Metacritic. Lo que llega de JustWatch queda marcado (src 'jw') y,
   si le falta el puntaje que se está filtrando, OMDb lo completa cuando vuelve a tener consultas. */
function omdbLive() { return !!state.settings.omdbKey && !state.omdbStop; }
function jwScoresLive() { return !!JW_PROXY && !JW.off && !JW.old; }
function scoringLive() { return omdbLive() || jwScoresLive(); }
/* ¿hay que pedir puntajes para este registro? src: el puntaje por el que se filtra, si hay.
   Con OMDb: lo que trajo JustWatch se completa si le falta ese puntaje o si lo puso Wikidata.
   Sin OMDb: a lo de JustWatch que le falte Rotten Tomatoes o Metacritic se lo busca en Wikidata. */
function wantsScore(o, src) {
  if (!o) return true;
  if (o.src !== 'jw') return false;
  if (omdbLive()) return src ? !nz(o[src]) || (o.wd || []).indexOf(src) >= 0 : !!o.none;
  if (o.wdt || !wdLive()) return false;
  return src ? (src === 'rt' || src === 'mc') && !nz(o[src]) : !nz(o.rt) || !nz(o.mc);
}
/* guarda un resultado sin pisar lo de OMDb con lo de JustWatch; si OMDb llega después, lo que a OMDb
   le falte se completa con lo que ya había traído JustWatch */
function putScores(imdb, r) {
  if (!r) return false;
  var old = state.omdb[imdb];
  if (r.src === 'jw') { if (old && old.src !== 'jw') return false; }
  else if (old && old.src === 'jw') {
    ['imdb', 'votes', 'rt', 'mc'].forEach(function (k) { if (!nz(r[k]) && nz(old[k])) r[k] = old[k]; });
    if (nz(r.imdb) || nz(r.rt) || nz(r.mc)) delete r.none;
  }
  state.omdb[imdb] = r; saveCachesSoon(); return true;
}
function omdbToJwNote(e) {
  return e && e.code === 'omdb-auth' ? e.message + ' Mientras tanto, los puntajes salen de JustWatch y Wikidata.'
    : 'OMDb llegó al tope de consultas de hoy. Sigo con JustWatch y Wikidata para IMDb, Rotten Tomatoes y, cuando está, Metacritic.';
}
function wantRatings(items, src) {
  if (!state.settings.omdbKey || !scoringLive()) return;
  var needDetails = [];
  items.forEach(function (it) {
    var d = state.details[it.k];
    if (d) { if (d.imdb) queueOmdb(d.imdb, it, src); }
    else { Q.wantOm.set(it.k, src || null); needDetails.push(it); }
  });
  if (needDetails.length) wantDetails(needDetails, 'hi');
  pumpOmdb();
}
function queueOmdb(imdb, it, src) { if (Q.omQueued.has(imdb) || !wantsScore(state.omdb[imdb], src)) return; Q.omQueued.add(imdb); Q.om.push([imdb, it, src || null]); }
function pumpOmdb() {
  if (!scoringLive() && Q.om.length) { Q.om.forEach(function (j) { Q.omQueued.delete(j[0]); }); Q.om.length = 0; }
  while (Q.om.length && scoringLive() && Q.omRunning < (omdbLive() ? Q.omMax : Q.jwMax)) {
    var job = Q.om.shift();
    if (!wantsScore(state.omdb[job[0]], job[2])) { Q.omQueued.delete(job[0]); continue; }
    Q.omRunning++;
    (function (imdb, it, src, viaJw) {
      (viaJw ? fetchScoresNoOmdb(it, imdb) : fetchOmdb(imdb))
        .then(function (r) { if (putScores(imdb, r)) onEnriched(it); })
        .catch(function (e) {
          if (e.code !== 'omdb-limit' && e.code !== 'omdb-auth' && e.code !== 'omdb-stop') return;
          if (e.code !== 'omdb-stop') { renderRailStatus(); toast(jwScoresLive() ? omdbToJwNote(e) : e.message); }
          /* OMDb se cortó con este pedido en curso: vuelve a la fila y lo atiende JustWatch */
          if (jwScoresLive()) { Q.om.unshift([imdb, it, src]); return 'again'; }
        })
        .then(function (again) { Q.omRunning--; if (again !== 'again') Q.omQueued.delete(imdb); pumpOmdb(); progressNote(); });
    })(job[0], job[1], job[2], !omdbLive());
  }
  progressNote();
}
var countSoon = debounce(function () { renderCount(); }, 800);
function onEnriched(it) {
  if (omdbRatingFilter()) countSoon();
  if (ST.wait.has(it.k)) { ST.wait.delete(it.k); wantStremio([it]); }
  if (Q.wantOm.has(it.k)) { var wsrc = Q.wantOm.get(it.k); Q.wantOm.delete(it.k); var d = state.details[it.k]; if (d && d.imdb) { queueOmdb(d.imdb, it, wsrc); pumpOmdb(); } }
  updateCard(it.k);
  if (dependsOnEnrichment()) softRefresh();
  railStatusSoon();
}
function dependsOnEnrichment() { var f = state.f; return f.maxRuntime > 0 || (f.ratingSrc !== 'tmdb' && (f.ratingMin > 0 || curSort() === 'rating')) || (f.onlyMine && ctxOpen()); }
var softRefresh = debounce(function () {
  if (window.scrollY < 400 || !state.filtered.length) refresh(true);
  else $('#reflowBtn').hidden = false;
}, 2200);
var railStatusSoon = debounce(function () { renderRailStatus(); }, 600);
function progressNote() {
  var el = $('#enrichNote'); if (!el) return;
  var pend = Q.hi.length + Q.lo.length + Q.running, om = Q.om.length + Q.omRunning;
  el.textContent = om ? 'Trayendo ratings' + (omdbLive() ? '' : ' de JustWatch') + '… quedan ' + nf.format(om) : (pend > 8 ? 'Completando duraciones… quedan ' + nf.format(pend) : '');
}

/* ---------- Stremio (vía Torrentio) ----------
   Torrentio es el addon de Stremio que lista fuentes por título. Se le pregunta solo por lo que
   está en pantalla (tarjetas visibles, la ficha abierta, los resultados del acomodador), de a dos
   por vez, y la respuesta queda guardada unos días en el dispositivo. De lo que devuelve se usan
   solo dos textos por fuente (calidad e idiomas); nunca se muestra nada de la respuesta tal cual. */
var TIO = 'https://torrentio.strem.fun';
var Q_RANK = { '4k': 6, '2160p': 6, '1440p': 5, '1080p': 4, '720p': 3, '576p': 2, '480p': 2, '360p': 1, '240p': 1 };
var Q_NAME = ['', 'SD', 'SD', '720p', '1080p', '1440p', '4K'];
/* lo guardado se vuelve a validar al leerlo: solo números chicos, nada de texto */
function pruneStremio(o) {
  var out = {}, t = Date.now(), num = function (v, max) { v = Math.round(+v); return v >= 0 && v <= max ? v : 0; };
  Object.keys(o || {}).forEach(function (k) {
    var v = o[k]; if (!/^tt\d{5,10}$/.test(k) || !v || !(+v.at > 0) || t - v.at > (v.n ? 3 : 1) * DAY) return;
    out[k] = { at: +v.at, n: num(v.n, 500), q: num(v.q, 6), hdr: num(v.hdr, 6), dv: num(v.dv, 6), lat: num(v.lat, 6), cas: num(v.cas, 6), multi: num(v.multi, 6), cam: num(v.cam, 500) };
  });
  return out;
}
var ST = { cache: pruneStremio(LS.get('stremio', {})), q: [], queued: new Set(), wait: new Set(), running: 0, max: 2, fails: 0, off: false };
var saveStremioSoon = debounce(function () {
  var keys = Object.keys(ST.cache);
  if (keys.length > 1500) keys.sort(function (a, b) { return ST.cache[a].at - ST.cache[b].at; }).slice(0, keys.length - 1500).forEach(function (k) { delete ST.cache[k]; });
  LS.set('stremio', ST.cache);
}, 2000);
function stremioOf(it) { var d = state.details[it.k]; return d && d.imdb ? ST.cache[d.imdb] || null : null; }
function summarizeStreams(arr) {
  var out = { at: Date.now(), n: 0, q: 0, hdr: 0, dv: 0, lat: 0, cas: 0, multi: 0, cam: 0 };
  if (!Array.isArray(arr)) return out;
  arr.slice(0, 500).forEach(function (x) {
    if (!x || typeof x.name !== 'string') return;
    var qline = (x.name.slice(0, 200).split('\n')[1] || '').toLowerCase(), tok = qline.split(/\s+/)[0] || '';
    if (/^(cam|telesync|telecine|scr)$/.test(tok)) { out.cam++; return; }
    var r = Q_RANK[tok] || 0, t = typeof x.title === 'string' ? x.title.slice(0, 3000) : '', rr = r || 1;
    out.n++; out.q = Math.max(out.q, r);
    if (/\bhdr/.test(qline)) out.hdr = Math.max(out.hdr, rr);
    if (/\bdv\b/.test(qline)) out.dv = Math.max(out.dv, rr);
    if (t.indexOf('\uD83C\uDDF2\uD83C\uDDFD') >= 0) out.lat = Math.max(out.lat, rr);
    if (t.indexOf('\uD83C\uDDEA\uD83C\uDDF8') >= 0) out.cas = Math.max(out.cas, rr);
    if (/multi audio|dual audio/i.test(t)) out.multi = Math.max(out.multi, rr);
  });
  return out;
}
async function fetchStremio(imdb, type) {
  var url = TIO + '/stream/' + (type === 'tv' ? 'series/' + imdb + ':1:1' : 'movie/' + imdb) + '.json';
  var res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw AppError('tio', 'Torrentio respondió con error ' + res.status + '.');
  var j = await res.json();
  return summarizeStreams(j && j.streams);
}
function wantStremio(items, first) {
  if (!STREMIO_ON || ST.off) return;
  var need = [];
  items.forEach(function (it) {
    var d = state.details[it.k];
    if (!d) { ST.wait.add(it.k); need.push(it); return; }
    if (!d.imdb || ST.cache[d.imdb]) return;
    if (ST.queued.has(d.imdb)) {
      if (first) { var at = -1; ST.q.forEach(function (j, i) { if (j[0] === d.imdb) at = i; }); if (at > 0) ST.q.unshift(ST.q.splice(at, 1)[0]); }
      return;
    }
    ST.queued.add(d.imdb); ST.q[first ? 'unshift' : 'push']([d.imdb, it]);
  });
  if (need.length) wantDetails(need, 'hi');
  pumpStremio();
}
function pumpStremio() {
  while (ST.running < ST.max && ST.q.length && !ST.off && STREMIO_ON) {
    var job = ST.q.shift(); ST.running++;
    (function (imdb, it) {
      fetchStremio(imdb, it.type)
        .then(function (r) { ST.fails = 0; ST.cache[imdb] = r; saveStremioSoon(); updateCard(it.k); if (state.detail && state.detail.k === it.k) renderDetail(); })
        .catch(function () { if (++ST.fails >= 4) { ST.off = true; ST.q.length = 0; ST.queued.clear(); if (state.detail) renderDetail(); } })
        .then(function () { ST.running--; ST.queued.delete(imdb); pumpStremio(); });
    })(job[0], job[1]);
  }
}
function stremioQual(r) {
  var q = Q_NAME[r.q] || '', extra = r.dv && r.dv >= r.q ? 'Dolby Vision' : r.hdr && r.hdr >= r.q ? 'HDR' : '';
  return [q, extra].filter(Boolean).join(' ');
}
function stremioLangs(r) {
  var up = function (n) { return n > 1 ? ' hasta ' + Q_NAME[n] : ''; }, out = [];
  if (r.lat) out.push('latino' + up(r.lat));
  if (r.cas) out.push('castellano' + up(r.cas));
  if (r.multi) out.push('multiaudio' + up(r.multi));
  return out;
}

/* ---------- JustWatch (calidad e idiomas por servicio, vía tu Worker de Cloudflare) ----------
   JustWatch no deja que otras páginas lo consulten desde el navegador, así que se le pregunta a
   un Worker propio (tools/justwatch-worker.js) que solo le responde a esta página. Se pide al abrir
   una ficha, y la respuesta queda guardada unos días en el dispositivo. El Worker también trae los
   puntajes de IMDb y Rotten Tomatoes, que se usan cuando OMDb se queda sin consultas. */
var JW_PROXY = 'https://watchlisto-jw.pfiguerero.workers.dev';
var JW_LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/, JW_TECH_RE = /^[A-Z0-9_]{2,30}$/;
var JW_LANG = { es: 'español', en: 'inglés', pt: 'portugués', fr: 'francés', it: 'italiano', de: 'alemán', ja: 'japonés', ko: 'coreano', zh: 'chino', cmn: 'chino', yue: 'cantonés', hi: 'hindi', ru: 'ruso', pl: 'polaco', nl: 'neerlandés', sv: 'sueco', da: 'danés', no: 'noruego', nb: 'noruego', fi: 'finlandés', tr: 'turco', ar: 'árabe', he: 'hebreo', th: 'tailandés', id: 'indonesio', ms: 'malayo', cs: 'checo', hu: 'húngaro', ro: 'rumano', el: 'griego', uk: 'ucraniano', ca: 'catalán', eu: 'euskera', gl: 'gallego', ta: 'tamil', te: 'telugu', vi: 'vietnamita', fil: 'filipino', tl: 'tagalo', bg: 'búlgaro', hr: 'croata', sr: 'serbio', sk: 'eslovaco', sl: 'esloveno', lt: 'lituano', lv: 'letón', et: 'estonio', is: 'islandés', fa: 'persa', ur: 'urdu', bn: 'bengalí' };
function jwLangName(c) {
  var parts = c.split('-'), base = JW_LANG[parts[0]] || parts[0].toUpperCase();
  if (parts[0] === 'es' && parts[1]) return /^(ES)$/i.test(parts[1]) ? 'español de España' : 'español latino';
  if (parts[0] === 'pt' && /^BR$/i.test(parts[1] || '')) return 'portugués de Brasil';
  return base;
}
function jwLangs(arr, max) {
  var rank = function (c) { return /^es/.test(c) ? 0 : /^en/.test(c) ? 1 : 2; };
  var names = [];
  arr.slice().sort(function (a, b) { return rank(a) - rank(b) || jwLangName(a).localeCompare(jwLangName(b), 'es'); }).forEach(function (c) { var n = jwLangName(c); if (names.indexOf(n) < 0) names.push(n); });
  if (max && names.length > max) return names.slice(0, max).join(', ') + ' y ' + (names.length - max) + ' más';
  return names.join(', ');
}
function cleanJwOffers(arr) {
  var codes = function (a, re) { return (Array.isArray(a) ? a : []).filter(function (x) { return typeof x === 'string' && re.test(x); }).slice(0, 40); };
  return (Array.isArray(arr) ? arr : []).slice(0, 30).map(function (o) {
    var p = o ? Math.round(+o.p) : 0; if (!(p > 0 && p < 1e7)) return null;
    return { p: p, n: String(o.n || '').slice(0, 60), q: Math.max(0, Math.min(3, Math.round(+o.q) || 0)), a: codes(o.a, JW_LANG_RE), s: codes(o.s, JW_LANG_RE), v: codes(o.v, JW_TECH_RE), au: codes(o.au, JW_TECH_RE) };
  }).filter(Boolean);
}
function pruneJw(o) {
  var out = {}, t = Date.now();
  Object.keys(o || {}).forEach(function (k) { var v = o[k]; if (validKey(k) && v && +v.at > 0 && t - v.at < (v.f ? 3 : 1) * DAY) out[k] = { at: +v.at, f: !!v.f, o: cleanJwOffers(v.o) }; });
  return out;
}
var JW = { cache: pruneJw(LS.get('jw', {})), loading: {}, fails: 0, off: false, old: false, bad: {} };
var saveJwSoon = debounce(function () {
  var keys = Object.keys(JW.cache);
  if (keys.length > 600) keys.sort(function (a, b) { return JW.cache[a].at - JW.cache[b].at; }).slice(0, keys.length - 600).forEach(function (k) { delete JW.cache[k]; });
  LS.set('jw', JW.cache);
}, 1500);
/* le pregunta al Worker por un título (con la ficha completa de TMDB si ya está, o con lo del catálogo) */
async function jwFetch(it, full) {
  var f = full || {};
  var y = parseInt(String(f.release_date || f.first_air_date || '').slice(0, 4), 10) || it.y || '';
  var url = JW_PROXY + '/?tmdb=' + (+it.id) + '&type=' + (it.type === 'tv' ? 'tv' : 'movie') +
    '&ot=' + encodeURIComponent(String(f.original_title || f.original_name || it.ot || '').slice(0, 120)) +
    '&t=' + encodeURIComponent(String(f.title || f.name || it.t || '').slice(0, 120)) + (y ? '&y=' + y : '');
  try {
    var res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw AppError('jw', 'JustWatch respondió ' + res.status);
    var j = await res.json();
    JW.fails = 0;
    /* el Worker viejo (versión 1) no trae puntajes: sirve para calidad e idiomas, no como respaldo de OMDb */
    if (!j || !(+j.v >= 2)) JW.old = true;
    return j;
  } catch (e) {
    if (++JW.fails >= 5) JW.off = true;
    throw e;
  }
}
/* puntajes de la respuesta del Worker, con el mismo formato que los de OMDb y marcados como de JustWatch */
function jwScoreRec(j, imdb) {
  if (!j || !(+j.v >= 2)) return null;
  var r = { at: Date.now(), src: 'jw' }, sc = j.sc && typeof j.sc === 'object' ? j.sc : null;
  if (sc && (typeof sc.m !== 'string' || sc.m === imdb)) {
    var i = +sc.i, iv = +sc.iv, rt = +sc.rt;
    if (isFinite(i) && i > 0 && i <= 10) r.imdb = Math.round(i * 10) / 10;
    if (isFinite(iv) && iv > 0 && iv < 1e8) r.votes = Math.round(iv);
    if (sc.rt != null && isFinite(rt) && rt >= 0 && rt <= 100) r.rt = Math.round(rt);
  }
  if (!nz(r.imdb) && !nz(r.rt)) r.none = true;
  return r;
}
/* sin OMDb: primero lo que ya consultó alguien de la app (puntajes de OMDb compartidos); si no,
   JustWatch (IMDb y Rotten Tomatoes), y lo que le falte a JustWatch, en Wikidata */
async function fetchScoresNoOmdb(it, imdb) {
  var c = await omdbFromCloud(imdb);
  if (c) return c;
  var old = state.omdb[imdb], r = old && old.src === 'jw' ? Object.assign({}, old, { wd: (old.wd || []).slice() }) : null;
  if (!r && jwScoresLive()) r = await fetchJwScore(it, imdb);
  if (r && !r.wdt && (!nz(r.rt) || !nz(r.mc))) r = await addWikidata(r, imdb);
  return r;
}
async function fetchJwScore(it, imdb) {
  if (JW.bad[it.k]) return null;
  try { return jwScoreRec(await jwFetch(it, null), imdb); }
  catch (e) { JW.bad[it.k] = 1; throw e; }
}
/* ---------- Wikidata (Rotten Tomatoes y Metacritic que no tiene JustWatch) ----------
   Wikidata es la base de datos abierta de Wikipedia: no pide clave y sus datos son de uso libre.
   Muchas películas tienen ahí el Tomatometer y el Metascore, a veces con algunos meses de atraso.
   Se usa solo sin OMDb y solo para lo que JustWatch no trajo; queda marcado y OMDb lo reemplaza
   cuando vuelve a tener consultas. Los pedidos se juntan de a 40 títulos y van de a dos por vez. */
var WD_API = 'https://query.wikidata.org/sparql';
var WD = { wait: new Map(), timer: 0, running: 0, fails: 0, off: false };
function wdLive() { return !!WD_API && !WD.off; }
/* {rt, mc} con lo que haya ({} si no hay nada), o null si la consulta falló */
function wdScores(imdb) {
  return new Promise(function (resolve) {
    if (!wdLive() || !/^tt\d{5,10}$/.test(imdb)) return resolve(null);
    var arr = WD.wait.get(imdb); if (!arr) WD.wait.set(imdb, arr = []); arr.push(resolve);
    if (WD.wait.size >= 40) wdFlush(); else if (!WD.timer) WD.timer = setTimeout(wdFlush, 350);
  });
}
function wdFlush() {
  clearTimeout(WD.timer); WD.timer = 0;
  if (!WD.wait.size) return;
  if (WD.running >= 2) { WD.timer = setTimeout(wdFlush, 300); return; }
  var batch = new Map();
  WD.wait.forEach(function (v, k) { if (batch.size < 40) batch.set(k, v); });
  batch.forEach(function (v, k) { WD.wait.delete(k); });
  if (WD.wait.size) WD.timer = setTimeout(wdFlush, 50);
  WD.running++;
  wdQuery(Array.from(batch.keys()))
    .then(function (res) { WD.fails = 0; batch.forEach(function (rs, k) { rs.forEach(function (r) { r(res[k] || {}); }); }); },
      function () { if (++WD.fails >= 3) WD.off = true; batch.forEach(function (rs) { rs.forEach(function (r) { r(null); }); }); })
    .then(function () { WD.running--; });
}
var WD_RT = 'http://www.wikidata.org/entity/Q105584', WD_MC = 'http://www.wikidata.org/entity/Q150248';
async function wdQuery(ids) {
  var q = 'SELECT ?imdb ?site ?score ?ml ?date WHERE { VALUES ?imdb { ' + ids.map(function (i) { return '"' + i + '"'; }).join(' ') + ' } ' +
    'VALUES ?site { wd:Q105584 wd:Q150248 } ?film wdt:P345 ?imdb . ?film p:P444 ?st . ?st ps:P444 ?score ; pq:P447 ?site . ' +
    'OPTIONAL { ?st pq:P459 ?m . ?m rdfs:label ?ml . FILTER(LANG(?ml) = "en") } OPTIONAL { ?st pq:P585 ?date } }';
  var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 12000), j;
  try {
    /* Wikimedia pide que las apps se identifiquen (el navegador no deja cambiar el User-Agent) */
    var res = await fetch(WD_API + '?format=json&query=' + encodeURIComponent(q), { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctrl.signal, headers: { 'Api-User-Agent': 'WatchListo/1.0 (https://panchy93.github.io/SuperAwesomeWatchlist/)' } });
    if (!res.ok) throw AppError('wd', 'Wikidata respondió ' + res.status);
    j = await res.json();
  } finally { clearTimeout(timer); }
  /* solo el Tomatometer («94%») y el Metascore («75/100»); el más reciente si hay varios */
  var out = {}, when = {};
  (((j || {}).results || {}).bindings || []).forEach(function (b) {
    var id = b.imdb && b.imdb.value, site = b.site && b.site.value, sc = String((b.score && b.score.value) || '').trim();
    var ml = String((b.ml && b.ml.value) || ''), d = String((b.date && b.date.value) || ''), m, v = null;
    if (ids.indexOf(id) < 0 || /audience|popcorn|user|average/i.test(ml)) return;
    var kind = site === WD_RT ? 'rt' : site === WD_MC ? 'mc' : null;
    if (kind === 'rt' && (m = /^(\d{1,3})\s*%$/.exec(sc))) v = +m[1];
    if (kind === 'mc' && (m = /^(\d{1,3})\s*\/\s*100$/.exec(sc))) v = +m[1];
    if (v === null || v > 100 || (when[id + kind] != null && when[id + kind] >= d)) return;
    when[id + kind] = d; (out[id] = out[id] || {})[kind] = v;
  });
  return out;
}
async function addWikidata(r, imdb) {
  var w = await wdScores(imdb);
  if (!w) return r;
  r.wdt = 1;
  ['rt', 'mc'].forEach(function (k) { if (!nz(r[k]) && nz(w[k])) { r[k] = w[k]; r.wd = (r.wd || []).concat(k); } });
  if (r.wd && r.wd.length) delete r.none;
  return r;
}
async function wantJw(it, full) {
  if (!JW_PROXY || JW.off || !full || JW.cache[it.k] || JW.loading[it.k]) return;
  JW.loading[it.k] = true;
  try {
    var j = await jwFetch(it, full);
    JW.cache[it.k] = { at: Date.now(), f: !!(j && j.found), o: cleanJwOffers(j && j.offers) }; saveJwSoon();
    var d = state.details[it.k];
    if (d && d.imdb && putScores(d.imdb, jwScoreRec(j, d.imdb))) updateCard(it.k);
  } catch (e) {
  } finally {
    delete JW.loading[it.k];
    if (state.detail && state.detail.k === it.k) renderDetail();
  }
}
/* una fila por servicio: calidad, imagen y sonido, idiomas de audio y subtítulos */
function jwRowsHTML(it, origLang) {
  var r = JW.cache[it.k]; if (!r || !r.f || !r.o.length) return '';
  var groups = [], byKey = {};
  r.o.forEach(function (o) {
    var svc = servicesForIds(it.type, [o.p])[0], key = svc || 'p' + o.p, g = byKey[key];
    if (!g) { g = byKey[key] = { svc: svc, name: svc ? SVC[svc].label : o.n, q: 0, a: [], s: [], v: [], au: [] }; groups.push(g); }
    g.q = Math.max(g.q, o.q);
    ['a', 's', 'v', 'au'].forEach(function (f) { o[f].forEach(function (x) { if (g[f].indexOf(x) < 0) g[f].push(x); }); });
  });
  groups.sort(function (a, b) { return (b.svc ? 1 : 0) - (a.svc ? 1 : 0); });
  return '<div class="jw-rows">' + groups.map(function (g) {
    var tech = [];
    if (g.v.indexOf('DOLBY_VISION') >= 0) tech.push('Dolby Vision'); else if (g.v.some(function (x) { return /HDR/.test(x); })) tech.push('HDR');
    if (g.au.indexOf('DOLBY_ATMOS') >= 0) tech.push('Atmos'); else if (g.au.some(function (x) { return /5_POINT_1|7_POINT_1/.test(x); })) tech.push(g.au.some(function (x) { return /7_POINT_1/.test(x); }) ? '7.1' : '5.1');
    var qual = [['', 'SD', 'HD', '4K'][g.q]].concat(tech).filter(Boolean).join(' · ');
    var hasEs = g.a.some(function (x) { return /^es/.test(x); });
    var dubOnly = g.a.length === 1 && hasEs && origLang && origLang !== 'es';
    var info = [qual ? '<b>' + esc(qual) + '</b>' : '',
      g.a.length ? 'Audio: ' + esc(jwLangs(g.a)) : 'Idiomas sin dato',
      g.s.length ? 'Subtítulos: ' + esc(jwLangs(g.s, 4)) : ''].filter(Boolean).join(' · ');
    var warn = dubOnly ? '<span class="jw-warn">Solo doblada</span>' : g.a.length && !hasEs ? '<span class="jw-warn">Sin audio en español</span>' : '';
    return '<div class="jw-row"><span class="sb ' + (g.svc ? svcClass(g.svc) : 'dim') + '">' + esc(g.name) + '</span><span class="jw-info">' + info + '</span>' + warn + '</div>';
  }).join('') + '</div><p class="hint jw-src">Calidad e idiomas según JustWatch; algunos servicios, como Netflix, no los informan.</p>';
}

/* ---------- scores ---------- */
function scoresOf(it) {
  var d = state.details[it.k]; var o = d && d.imdb ? state.omdb[d.imdb] : null;
  return {
    tmdb: it.vc > 0 ? it.v : null,
    imdb: o && nz(o.imdb) ? o.imdb : null, votes: o && o.votes ? o.votes : null,
    rt: o && nz(o.rt) ? o.rt : null, mc: o && nz(o.mc) ? o.mc : null,
    omdbDone: !!o, noImdb: !!(d && !d.imdb), jw: !!(o && o.src === 'jw'), wd: o && o.src === 'jw' && o.wd ? o.wd : [], rec: o
  };
}
function scoreFor(it, src) {
  var s = scoresOf(it);
  if (src === 'avg') {
    var vals = [];
    if (nz(s.tmdb)) vals.push(s.tmdb * 10); if (nz(s.imdb)) vals.push(s.imdb * 10);
    if (nz(s.rt)) vals.push(s.rt); if (nz(s.mc)) vals.push(s.mc);
    return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
  }
  return s[src];
}
function sortScore(it, src) {
  var s = scoresOf(it);
  if (src === 'tmdb') return nz(s.tmdb) ? (s.tmdb * it.vc + 6.4 * 150) / (it.vc + 150) : null;
  if (src === 'imdb') { if (!nz(s.imdb)) return null; var n = s.votes || 1000; return (s.imdb * n + 6.6 * 1000) / (n + 1000); }
  return scoreFor(it, src);
}
function fmtScore(src, v) {
  if (!nz(v)) return '–';
  if (src === 'tmdb' || src === 'imdb') return dec1.format(v);
  if (src === 'rt') return Math.round(v) + '%';
  return String(Math.round(v));
}
function fmtRuntime(rt, type) {
  if (!rt) return '';
  if (type === 'tv') return rt + ' min por episodio';
  var h = Math.floor(rt / 60), m = rt % 60;
  return h ? h + ' h' + (m ? ' ' + m + ' min' : '') : m + ' min';
}

/* ---------- filtering & sorting ---------- */
/* Contexts: "mine" is the catalog of the four services; "open" is anything that goes beyond them. */
function ctxMine() { return !state.special && state.ui.view === 'catalog' && state.ui.source !== 'all'; }
function ctxOpen() { return state.special ? state.special.kind !== 'search' : (state.ui.view === 'catalog' && state.ui.source === 'all'); }
function isAllMode() { return !state.special && state.ui.view === 'catalog' && state.ui.source === 'all' && !state.f.people.length; }
function sortOptions() {
  var sp = state.special;
  if (sp) return sp.kind === 'reco' ? SORTS_RECO : sp.kind === 'person' ? SORTS_PERSON : SORTS_SEARCH;
  return state.ui.view === 'lists' ? SORTS_LISTS : SORTS_CATALOG;
}
function sortKey() {
  var sp = state.special;
  if (sp) return sp.kind === 'reco' ? 'sortReco' : sp.kind === 'person' ? 'sortPerson' : 'sortSearch';
  return state.ui.view === 'lists' ? 'sortLists' : 'sortCatalog';
}
function curSort() {
  var opts = sortOptions(), s = state.ui[sortKey()];
  return opts.some(function (o) { return o[0] === s; }) ? s : opts[0][0];
}
function svcOf(it) {
  if (it.s && it.s.length) return it.s.filter(function (k) { return SVC[k]; });
  var d = state.details[it.k]; if (!d || d.v !== 2) return [];
  return Array.isArray(d.pids) ? servicesForIds(it.type, d.pids) : (d.svc || []).filter(function (k) { return SVC[k]; });
}
function availKnown(it) { return !!((it.s && it.s.length) || hasDetails(it.k)); }
function fromCatalog(it) { var idx = catIndex(it.type); return (idx && idx.get(it.k)) || it; }
function genreNames(it) { var m = state.genres[it.type]; return (it.g || []).map(function (id) { return m.get(id); }).filter(Boolean); }
function resolveItem(k) {
  var type = typeOfKey(k), idx = catIndex(type);
  var fromCat = idx && idx.get(k); if (fromCat) return fromCat;
  var snap = state.user.items[k];
  if (!snap && CLOUD && CLOUD.shared) CLOUD.shared.forEach(function (l) { if (!snap && l.items[k]) snap = l.items[k]; });
  if (!snap) snap = cleanSnap({ t: 'Título ' + k.slice(2) }, k);
  return Object.assign({}, snap, { s: [], off: !!state.catalogs[type] });
}
function peoplePool(type) {
  var seen = new Set(), out = [];
  state.f.people.forEach(function (p) {
    var d = state.personData[p.id]; if (!d) return;
    d.items.forEach(function (it) { if (it.type === type && !seen.has(it.k)) { seen.add(it.k); out.push(fromCatalog(it)); } });
  });
  return out;
}
function currentPool() {
  if (state.special) return state.special.items || [];
  if (state.ui.view === 'catalog') {
    if (state.ui.source === 'all') {
      if (state.f.people.length) return peoplePool(state.ui.type);
      var A = state.all;
      if (!A || A.sig !== allSig()) { loadAllSoon(); return []; }
      return A.items;
    }
    var c = state.catalogs[state.ui.type]; return c ? c.items : [];
  }
  var keys;
  if (state.ui.list === 'seen') keys = seenKeys();
  else if (state.ui.list === 'hidden') keys = hiddenKeys();
  else { var l = getList(state.ui.list) || getList('watchlist'); state.ui.list = l.id; keys = listKeys(l); }
  var items = keys.map(resolveItem).filter(Boolean), R = l ? rumboOf(l) : null;
  if (R) { var vis = items.filter(function (it) { return seedIn(l, it.k) || !rumboOut(R, it); }); state.rumboHidden = items.length - vis.length; return vis; }
  state.rumboHidden = 0;
  return items;
}
function applyFilters(list, skipRating) {
  var f = state.f, q = fold(state.q), mine = ctxMine(), open = ctxOpen();
  var services = new Set(f.services);
  var inc = [], exc = [];
  Object.keys(f.genres).forEach(function (n) { if (f.genres[n] === 1) inc.push(n); else if (f.genres[n] === -1) exc.push(n); });
  var yFrom = parseInt(f.yearFrom, 10) || 0, yTo = parseInt(f.yearTo, 10) || 0;
  var hideSeen = f.hideSeen && !(state.ui.view === 'lists' && (state.ui.list === 'seen' || state.ui.list === 'hidden') && !state.special);
  var noIndia = f.noIndia && !(state.ui.view === 'lists' && !state.special) && !(state.special && state.special.kind === 'search');
  var curL = state.ui.view === 'lists' && !state.special ? getList(state.ui.list) : null;
  var hideHidden = !(state.special && state.special.kind === 'search') && !(state.ui.view === 'lists' && !state.special && (state.ui.list === 'hidden' || (curL && !isRadio(curL))));
  var fest = curL && isRadio(curL) ? curL : null;
  var pk = null;
  if (f.people.length && !(state.special && state.special.kind === 'person')) {
    pk = [];
    f.people.forEach(function (p) {
      var d = state.personData[p.id];
      if (d) pk.push(d.keys);
      else if (!state.personLoading[p.id]) loadPersonCredits(p.id).then(function () { refresh(true); }, function (e) { if (e && e.fatal) fatal(e); });
    });
  }
  return list.filter(function (it) {
    if (mine && !it.s.some(function (s) { return services.has(s); })) return false;
    if (open && f.onlyMine && !svcOf(it).length) return false;
    if (pk && !pk.some(function (set) { return set.has(it.k); })) return false;
    var core = fest && seedIn(fest, it.k);
    if (hideSeen && !core && seenNow(it.k)) return false;
    if (noIndia && isIndian(it)) return false;
    if (hideHidden && !core && isHidden(it.k)) return false;
    if (q && fold(it.t).indexOf(q) < 0 && fold(it.ot).indexOf(q) < 0) return false;
    if (inc.length || exc.length) {
      var names = genreNames(it);
      if (exc.some(function (n) { return names.indexOf(n) >= 0; })) return false;
      if (inc.length) {
        var ok = f.genreMode === 'all' ? inc.every(function (n) { return names.indexOf(n) >= 0; }) : inc.some(function (n) { return names.indexOf(n) >= 0; });
        if (!ok) return false;
      }
    }
    if (yFrom && (!it.y || it.y < yFrom)) return false;
    if (yTo && (!it.y || it.y > yTo)) return false;
    if (f.maxRuntime > 0) { var d = state.details[it.k]; if (d && d.rt && d.rt > f.maxRuntime) return false; }
    if (f.ratingMin > 0 && !skipRating) {
      var sc = scoreFor(it, f.ratingSrc);
      if (!nz(sc)) { if (!f.includeUnknown) return false; }
      else if (sc < f.ratingMin) return false;
    }
    return true;
  });
}
function sortItems(list) {
  var s = curSort(), src = state.f.ratingSrc, arr = list.slice();
  var pop = function (a, b) { return (b.pop || 0) - (a.pop || 0); };
  if (s === 'added' || s === 'relevance') return arr;
  if (s === 'match') { var meta = (state.special && state.special.meta) || new Map(); var m = function (it) { var x = meta.get(it.k); return x ? x.match : 0; }; return arr.sort(function (a, b) { return m(b) - m(a); }); }
  if (s === 'popularity') return arr.sort(pop);
  if (s === 'year') return arr.sort(function (a, b) { return (b.y || 0) - (a.y || 0) || pop(a, b); });
  if (s === 'title') return arr.sort(function (a, b) { return String(a.t).localeCompare(String(b.t), 'es'); });
  var key = new Map(arr.map(function (it) { return [it.k, sortScore(it, src)]; }));
  return arr.sort(function (a, b) {
    var x = key.get(a.k), y = key.get(b.k);
    if (!nz(x) && !nz(y)) return pop(a, b);
    if (!nz(x)) return 1; if (!nz(y)) return -1;
    return (y - x) || pop(a, b);
  });
}
function activeFilterCount() {
  var f = state.f, d = defaultFilters(), n = 0;
  if (state.ui.view === 'catalog' && f.services.length !== d.services.length) n++;
  if (f.ratingMin > 0) n++;
  n += Object.keys(f.genres).filter(function (k) { return f.genres[k]; }).length;
  if (f.yearFrom || f.yearTo) n++;
  if (f.maxRuntime > 0) n++;
  if (!f.hideSeen) n++;
  n += f.people.length;
  if (f.onlyMine && ctxOpen()) n++;
  return n;
}

/* ---------- rendering ---------- */
var grid, io, moreIo;
function scoresHTML(it) {
  var s = scoresOf(it), on = state.f.ratingSrc, out = [];
  var push = function (src, v) { out.push('<span class="sc' + (on === src ? ' on' : '') + '"><i>' + SRC[src].short + '</i>' + fmtScore(src, v) + '</span>'); };
  if (nz(s.tmdb)) push('tmdb', s.tmdb);
  if (nz(s.imdb)) push('imdb', s.imdb);
  if (nz(s.rt)) push('rt', s.rt);
  if (nz(s.mc)) push('mc', s.mc);
  if (on === 'avg') { var a = scoreFor(it, 'avg'); if (nz(a)) out.unshift('<span class="sc on"><i>Prom.</i>' + Math.round(a) + '</span>'); }
  if (state.settings.omdbKey && !s.omdbDone && !s.noImdb && scoringLive()) out.push('<span class="sc wait">IMDb…</span>');
  return out.join('');
}
function subHTML(it) {
  var d = state.details[it.k], parts = [];
  if (it.y) parts.push(it.y);
  if (d && d.rt) parts.push(fmtRuntime(d.rt, it.type).replace(' por episodio', '/ep.'));
  if (d && d.seasons) parts.push(d.seasons + (d.seasons === 1 ? ' temporada' : ' temporadas'));
  if (state.ui.view === 'lists' && it.type === 'tv') parts.push('Serie');
  var st = starOf(it.k); if (st) parts.push('★'.repeat(st));
  return esc(parts.join(' · '));
}
function svcBadge(k) { return SVC[k] ? '<span class="sb ' + svcClass(k) + '">' + esc(SVC[k].label) + '</span>' : ''; }
function stremioHref(type, imdb, web) {
  if (!/^tt\d{5,10}$/.test(imdb || '')) return null;
  var path = type === 'tv' ? 'detail/series/' + imdb : 'detail/movie/' + imdb + '/' + imdb;
  return web ? 'https://web.stremio.com/#/' + path : 'stremio:///' + path;
}
function stremioBadge(it) {
  if (!STREMIO_ON) return '';
  var r = stremioOf(it), d = state.details[it.k], href = d && stremioHref(it.type, d.imdb);
  if (!r || !r.n || !href) return '';
  var langs = stremioLangs(r), q = Q_NAME[r.q] === '4K' ? ' 4K' : '';
  return '<a class="sb c-stremio" href="' + href + '" title="' + esc('En Stremio (Torrentio): ' + [stremioQual(r)].concat(langs).filter(Boolean).join(' · ')) + '">Stremio' + q + (r.lat ? ' · LAT' : '') + '</a>';
}
function svcsHTML(it) {
  var out = svcOf(it).map(svcBadge), st = stremioBadge(it);
  if (st) out.push(st);
  if (!out.length) out.push('<span class="sb dim">' + (!it.off && !availKnown(it) ? 'Buscando dónde verla…' : 'Fuera de tus servicios') + '</span>');
  return out.join('');
}
function whyHTML(it) {
  var meta = state.special && state.special.meta && state.special.meta.get(it.k);
  return meta && meta.why ? '<p class="why">' + esc(meta.why) + '</p>' : '';
}
function baseOf(k) { var l = radioContext(); return !!l && seedIn(l, k); }
/* el marcador va lleno si el título está en cualquier lista; con fondo de color si es Mi lista */
function bookmarkState(k) {
  var lists = visibleLists().filter(function (l) { return isIn(l, k); }), watch = lists.some(function (l) { return l.id === 'watchlist'; });
  var others = lists.filter(function (l) { return l.id !== 'watchlist'; }).map(function (l) { return '«' + l.name + '»'; });
  var tip = watch ? 'En Mi lista' + (others.length ? ' y en ' + others.join(', ') : '') + '. Tocá para sacarla de Mi lista' : others.length ? 'Guardada en ' + others.join(', ') + '. Tocá para sumarla a Mi lista' : 'Sumar a Mi lista';
  return { watch: watch, saved: lists.length > 0, other: !watch && others.length > 0, tip: tip };
}
function cardHTML(it) {
  var bm = bookmarkState(it.k), watch = bm.watch, seen = isSeen(it.k), t = esc(it.t), p = safePath(it.p);
  var img = p ? '<img loading="lazy" decoding="async" alt="" src="' + IMG + 'w342' + p + '" srcset="' + IMG + 'w185' + p + ' 185w, ' + IMG + 'w342' + p + ' 342w" sizes="(max-width: 480px) 46vw, 200px">' : '<span class="noposter">' + t + '</span>';
  return '<article class="card' + (seen ? ' is-seen' : '') + '" data-k="' + esc(it.k) + '">' +
    '<div class="poster-wrap"><button class="poster" type="button" data-act="open" aria-label="' + t + ': ver ficha">' + img + '</button>' +
    '<div class="quick">' +
      '<button class="q' + (bm.other ? ' saved' : '') + '" type="button" data-act="watch" aria-pressed="' + watch + '" aria-label="' + esc(bm.tip) + '" title="' + esc(bm.tip) + '">' + (bm.saved ? ICON.bookmarkOn : ICON.bookmark) + '</button>' +
      '<button class="q" type="button" data-act="seen" aria-pressed="' + seen + '" aria-label="Ya la vi" title="Ya la vi">' + ICON.eye + '</button>' +
      '<button class="q" type="button" data-act="lists" aria-haspopup="menu" aria-label="Agregar a otra lista" title="Agregar a otra lista">' + ICON.plus + '</button>' +
    '</div>' + (seen ? '<span class="seen-tag">Vista</span>' : '') + (baseOf(it.k) ? '<span class="base-tag" title="Peli base del festival">Base</span>' : '') + '</div>' +
    '<div class="meta"><h3 class="t" title="' + t + '">' + t + '</h3><p class="sub">' + subHTML(it) + '</p><p class="scores">' + scoresHTML(it) + '</p><p class="svcs">' + svcsHTML(it) + '</p>' + whyHTML(it) + '</div>' +
    '</article>';
}
function cardEl(k) { var found = null; $$('.card[data-k]', grid).some(function (c) { if (c.dataset.k === k) { found = c; return true; } return false; }); return found; }
function updateCard(k) {
  if (state.guide && state.guide.step === 'results') guideRefreshSoon();
  if (!grid) return;
  var el = cardEl(k); if (!el) return;
  var it = state.index.get(k); if (!it) return;
  $('.sub', el).innerHTML = subHTML(it);
  $('.scores', el).innerHTML = scoresHTML(it);
  $('.svcs', el).innerHTML = svcsHTML(it);
  syncCardButtons(el, it);
}
function syncCardButtons(el, it) {
  var seen = isSeen(it.k);
  var bm = bookmarkState(it.k), bw = $('[data-act="watch"]', el);
  bw.setAttribute('aria-pressed', bm.watch); bw.classList.toggle('saved', bm.other); bw.innerHTML = bm.saved ? ICON.bookmarkOn : ICON.bookmark;
  bw.setAttribute('aria-label', bm.tip); bw.title = bm.tip;
  $('[data-act="seen"]', el).setAttribute('aria-pressed', seen);
  el.classList.toggle('is-seen', seen);
  var tag = $('.seen-tag', el);
  if (seen && !tag) $('.poster-wrap', el).insertAdjacentHTML('beforeend', '<span class="seen-tag">Vista</span>');
  if (!seen && tag) tag.remove();
}

function refresh(keepLimit) {
  syncServices();
  var poolList = currentPool(), sp = state.special;
  var list;
  if (sp && sp.kind === 'search') list = poolList;
  else if (isAllMode()) list = applyFilters(poolList);
  else list = sortItems(applyFilters(poolList));
  state.filtered = list;
  state.index = new Map(list.map(function (it) { return [it.k, it]; }));
  if (!keepLimit) state.limit = PAGE;
  if (isAllMode()) state.limit = Math.max(state.limit, list.length);
  $('#reflowBtn').hidden = true;
  var prof = state.ui.view === 'profile' && !sp;
  document.body.classList.toggle('v-profile', prof);
  $$('#tabbar [data-tab]').forEach(function (b) { var t = b.dataset.tab; if (t === 'catalog' || t === 'lists' || t === 'profile') { if (t === (sp ? '' : state.ui.view)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); } });
  if (prof) renderProfile();
  renderTop(); renderListbar(); renderSpecialBar(); renderCount(); renderGrid(keepLimit); renderRailStatus(); saveUi();
  if (state.f.ratingMin > 0 && state.f.ratingSrc !== 'tmdb') ratingsForFilter();
  if (state.menuItem) renderMenu();
  navSoon();
}

function renderGrid(keepScroll) {
  var y = window.scrollY;
  var empty = $('#empty'), more = $('#more');
  if (io) io.disconnect();
  var sp = state.special, A = state.all;
  var loadingCat = !sp && state.ui.view === 'catalog' && state.ui.source !== 'all' && !state.catalogs[state.ui.type] && !state.fatal;
  var loadingAll = isAllMode() && !state.fatal && (!A || A.sig !== allSig() || (A.loading && !A.items.length));
  var loadingPeople = !sp && state.f.people.length && state.f.people.some(function (p) { return !state.personData[p.id]; }) && !state.fatal;
  if (loadingCat || loadingAll || loadingPeople || (sp && sp.loading)) {
    var sk = ''; for (var i = 0; i < 12; i++) sk += '<div class="card"><div class="skel"></div></div>';
    grid.innerHTML = sk; empty.hidden = true; more.hidden = true; return;
  }
  var list = state.filtered;
  if (!list.length) {
    grid.innerHTML = ''; more.hidden = true; empty.hidden = !!state.fatal;
    empty.innerHTML = emptyHTML();
    if (canExtend() && !extEnded()) { extMoreButton(more); if (EXT.autoSig !== extSig()) { EXT.autoSig = extSig(); extendCatalog(); } }
    return;
  }
  empty.hidden = true;
  grid.innerHTML = list.slice(0, state.limit).map(cardHTML).join('');
  if (isAllMode()) {
    more.hidden = !(A && A.page < A.total);
    more.textContent = A && A.loading ? 'Cargando…' : 'Cargar más';
  } else {
    more.hidden = list.length <= state.limit; more.disabled = false;
    if (!more.hidden) more.textContent = 'Mostrar más (' + nf.format(list.length - state.limit) + ' restantes)';
    else extMoreButton(more);
  }
  observeCards();
  if (keepScroll) window.scrollTo(0, y);
}
function renderMore() {
  if (isAllMode()) { loadAll(true); return; }
  var list = state.filtered, from = state.limit;
  if (from >= list.length) { if (canExtend()) extendCatalog(); return; }
  state.limit += PAGE;
  grid.insertAdjacentHTML('beforeend', list.slice(from, state.limit).map(cardHTML).join(''));
  var more = $('#more'); more.hidden = list.length <= state.limit; more.disabled = false;
  if (!more.hidden) more.textContent = 'Mostrar más (' + nf.format(list.length - state.limit) + ' restantes)';
  else extMoreButton(more);
  observeCards();
}
function observeCards() {
  var cards = $$('.card[data-k]', grid).filter(function (c) { return !c.dataset.obs; });
  cards.forEach(function (c) { c.dataset.obs = '1'; });
  if (io) cards.forEach(function (c) { io.observe(c); });
  else {
    var items = cards.map(function (c) { return state.index.get(c.dataset.k); }).filter(Boolean);
    wantDetails(items, 'hi'); wantRatings(items); wantStremio(items);
  }
}
function emptyHTML() {
  var sp = state.special;
  var gap = !sp && state.ui.view === 'catalog' ? ratingGap() : null;
  if (gap && gap.pend) return '<strong>Trayendo puntajes…</strong><p>Busco el puntaje de ' + esc(SRC[state.f.ratingSrc].label) + ' de ' + nf.format(gap.pend) + ' títulos que cumplen el resto de los filtros' + (omdbLive() ? '' : ' (OMDb llegó al tope de hoy, así que los busco en JustWatch)') + '. Van apareciendo solos.</p>';
  if (gap && gap.later) return '<strong>Faltan puntajes</strong><p>' + laterText(gap.later, true) + '</p><button class="btn" type="button" data-incunk>Mostrarlas igual</button>';
  if (sp && sp.kind === 'search') return '<strong>Sin resultados</strong><p>TMDB no encontró nada para «' + esc(sp.q) + '».</p>';
  if (sp && sp.error) return '<strong>No pude cargar esto</strong><p>' + esc(sp.error) + '</p><button class="btn" type="button" data-back>Volver</button>';
  if (sp) return '<strong>Nada coincide</strong><p>Hay ' + nf.format((sp.items || []).length) + ' títulos, pero ninguno pasa los filtros.</p><button class="btn" type="button" data-clear>Limpiar filtros</button>';
  if (state.ui.view === 'lists') {
    var l = state.ui.list === 'seen' || state.ui.list === 'hidden' ? null : getList(state.ui.list);
    var total = state.ui.list === 'seen' ? seenKeys().length : state.ui.list === 'hidden' ? hiddenKeys().length : (l ? listKeys(l).length : 0);
    if (!total && state.ui.list === 'hidden') return '<strong>No ocultaste nada</strong><p>Con «No me interesa» (en el + de un póster o en la ficha) un título deja de aparecer en el catálogo, las recomendaciones y los festivales. Acá lo podés volver a mostrar.</p>';
    if (!total) return state.ui.list === 'seen'
      ? '<strong>Todavía no marcaste nada</strong><p>Tocá el ojo en cualquier póster para marcarla como vista.</p>'
      : '<strong>Esta lista está vacía</strong><p>Tocá el marcador de un póster para sumarla a Mi lista, o el + para elegir otra lista.</p><button class="btn" type="button" data-go="catalog">Ir al catálogo</button>';
    return '<strong>Nada coincide</strong><p>La lista tiene ' + nf.format(total) + ' títulos pero ninguno pasa los filtros.</p><button class="btn" type="button" data-clear>Limpiar filtros</button>';
  }
  if (state.ui.source !== 'all' && !state.catalogs[state.ui.type]) return '';
  var extra = state.q && state.q.length >= 2 ? '<button class="btn btn-accent" type="button" data-global>Buscar «' + esc(state.q) + '» en todo TMDB</button>' : '';
  return '<strong>Nada coincide</strong><p>Probá bajar el rating mínimo, sacar algún género o prender otro servicio.</p><div class="pick-bar">' + extra + '<button class="btn" type="button" data-clear>Limpiar filtros</button></div>';
}
/* los que esperan a OMDb: JustWatch no tiene ese puntaje (o no está disponible) y OMDb ya no tiene consultas hoy */
function laterText(n, full) {
  var src = state.f.ratingSrc, name = SRC[src].label, N = nf.format(n);
  var auth = state.omdbStop && !/tope/.test(state.omdbStop), when = auth ? 'cuando OMDb vuelva a aceptar la clave' : 'mañana';
  var who = src === 'rt' && wdLive() ? 'Ni JustWatch ni Wikidata tienen' : 'JustWatch no tiene';
  if (jwScoresLive() && src !== 'mc') return who + ' el puntaje de ' + name + ' de ' + N + (full ? ' títulos que cumplen el resto de los filtros; ' : ': ') + 'los completa OMDb ' + when;
  var why = auth ? 'OMDb no acepta la clave' : 'OMDb llegó al tope de consultas de hoy';
  var mc = src === 'mc' && jwScoresLive() && !wdLive() ? ' (JustWatch no tiene Metacritic)' : '';
  return why + (full ? ' y a ' + N + ' títulos que cumplen el resto de los filtros' : ': a ' + N) + ' les falta el puntaje de ' + name + mc + '. Se completan ' + when;
}
function ratingGapHTML() {
  var g = ratingGap(); if (!g || (!g.pend && !g.later && !g.none)) return '';
  var name = SRC[state.f.ratingSrc].label, out = [], inc = state.f.includeUnknown;
  if (g.pend) out.push('trayendo el puntaje de ' + name + ' de ' + nf.format(g.pend) + ' más' + (omdbLive() ? '' : ' desde JustWatch'));
  if (g.later) out.push(laterText(g.later));
  if (g.none && !inc) out.push(nf.format(g.none) + ' sin dato de ' + name);
  if ((g.later || g.none) && !inc) out.push('<button class="linkbtn" type="button" data-incunk>mostrarlas</button>');
  return '<small class="count-note">' + out.join(' · ') + '</small>';
}
function renderCount() {
  var el = $('#count'), n = state.filtered.length, gb = $('#globalBtn');
  var noun = function (type, c) { return type === 'movie' ? (c === 1 ? 'película' : 'películas') : (c === 1 ? 'serie' : 'series'); };
  var titles = function (c) { return nf.format(c) + (c === 1 ? ' título' : ' títulos'); };
  gb.hidden = true;
  var sp = state.special;
  if (sp) {
    if (sp.kind === 'search') el.innerHTML = 'Resultados<small>para «' + esc(sp.q) + '» en todo TMDB</small>';
    else if (sp.kind === 'person') el.innerHTML = esc(sp.title) + '<small>' + (sp.loading ? 'cargando filmografía…' : titles(n)) + '</small>';
    else el.innerHTML = esc(sp.title) + '<small>' + (sp.loading ? (sp.progress || 'buscando parecidas…') : titles(n)) + '</small>';
    return;
  }
  if (state.ui.view === 'lists') {
    var name = state.ui.list === 'seen' ? 'Vistas' : state.ui.list === 'hidden' ? 'Ocultas' : (getList(state.ui.list) || {}).name;
    el.innerHTML = esc(name) + '<small>' + titles(n) + '</small>';
    return;
  }
  if (state.ui.source === 'all') {
    if (state.f.people.length) el.innerHTML = nf.format(n) + ' ' + noun(state.ui.type, n) + '<small>con ' + esc(state.f.people.map(function (p) { return p.name; }).join(' o ')) + '</small>';
    else {
      var A = state.all, ready = A && A.sig === allSig() && A.page > 0;
      /* con filtros que TMDB no sabe aplicar (puntajes de OMDb, «solo mis servicios»), el total de TMDB engaña: se muestra lo que pasó */
      var clientOnly = omdbRatingFilter() || state.f.onlyMine;
      el.innerHTML = !ready ? 'Todo el cine<small>buscando…</small>' : clientOnly
        ? nf.format(n) + ' ' + noun(state.ui.type, n) + '<small>pasaron el filtro entre las ' + nf.format(A.items.length) + ' revisadas de ' + nf.format(A.totalResults || 0) + ' en todo el cine</small>' + ratingGapHTML()
        : nf.format(A.totalResults || n) + ' ' + noun(state.ui.type, A.totalResults || n) + '<small>en todo el cine</small>';
    }
  } else {
    if (!state.catalogs[state.ui.type]) { el.innerHTML = state.fatal ? 'WatchListo' : 'Armando tu cartelera<small>la primera vez tarda un poco</small>'; return; }
    el.innerHTML = nf.format(n) + ' ' + noun(state.ui.type, n) + '<small>en tus servicios</small>' + ratingGapHTML();
  }
  if (state.q && state.q.length >= 2) { gb.hidden = false; gb.textContent = 'Buscar «' + state.q + '» en todo TMDB'; gb.dataset.mode = 'search'; }
}
function renderTop() {
  $$('#viewSeg button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === state.ui.view); });
  $$('#typeSeg button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.type === state.ui.type); });
  $('#typeSeg').hidden = state.ui.view !== 'catalog' || !!state.special;
  var sel = $('#sort'), opts = sortOptions(), cur = curSort();
  sel.innerHTML = opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
  sel.disabled = opts.length < 2;
  var sp = state.special;
  $('#secServices').hidden = !sp && state.ui.view === 'lists';
  $('#sourceSeg').hidden = !!sp;
  $$('#sourceSeg button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.source === state.ui.source); });
  $('#svcToggles').hidden = !ctxMine();
  $('#allHint').hidden = !(!sp && state.ui.view === 'catalog' && state.ui.source === 'all');
  $('#onlyMineWrap').hidden = !ctxOpen();
  $('#onlyMine').checked = !!state.f.onlyMine;
  var n = activeFilterCount(), fc = $('#fcount'); fc.hidden = !n; fc.textContent = n;
  /* ojito: ocultar o mostrar lo que ya viste, a un toque */
  var st = $('#seenToggle'), hide = !!state.f.hideSeen;
  st.hidden = !sp && (state.ui.view === 'profile' || (state.ui.view === 'lists' && (state.ui.list === 'seen' || state.ui.list === 'hidden')));
  st.setAttribute('aria-pressed', hide); st.innerHTML = hide ? ICON.eyeOff : ICON.eye;
  var tip = hide ? 'Ocultando lo que ya viste. Tocá para mostrarlo' : 'Mostrando lo que ya viste. Tocá para ocultarlo';
  st.title = tip; st.setAttribute('aria-label', tip);
}
function rumboHTML(l) {
  var ch = rumboChips(l), tags = l.tags || {};
  if (!ch.base.length && !ch.more.length) return '';
  var chip = function (k, extra) {
    var off = tags[k] && tags[k].v < 0;
    return '<button class="rchip' + (off ? ' off' : '') + '" type="button" data-rumbo="' + esc(k) + '" aria-pressed="' + !off + '" title="' + (off ? 'Volver a incluir' : 'Sacar del rumbo') + '">' + esc(labelName(k)) + (extra ? ' <span class="n">' + extra + '</span>' : '') + '</button>';
  };
  var hidden = state.rumboHidden || 0;
  var off = Object.keys(tags).filter(function (k) { return tags[k].v < 0; }).length;
  return '<details class="rumbo"' + (state.rumboOpen ? ' open' : '') + '><summary class="rumbo-s"><b>Rumbo</b><span>' + (off ? off + (off === 1 ? ' etiqueta fuera' : ' etiquetas fuera') : 'todas las etiquetas adentro') + (hidden ? ' · <span class="rumbo-n">' + hidden + (hidden === 1 ? ' título oculto' : ' títulos ocultos') + '</span>' : '') + '</span></summary>' +
    '<p class="rumbo-h">Tocá una etiqueta para sacarla: el festival deja afuera lo que va más por ese lado que por el resto.</p>' +
    '<div class="rumbo-chips">' + ch.base.map(function (k) { return chip(k); }).join('') + '</div>' +
    (ch.more.length ? '<details class="rumbo-more"' + (state.rumboMoreOpen ? ' open' : '') + '><summary>Más etiquetas</summary><div class="rumbo-chips">' + ch.more.map(function (k) { return chip(k, ch.freq[k]); }).join('') + '</div></details>' : '') + '</details>';
}
function shareCandidates(l) { return cloudIn() ? CLOUD.buddies.filter(function (b) { return !b.pending && (l.members || []).indexOf(b.uid) < 0; }) : []; }
/* Listas: arriba, pestañas para elegir la lista (navegación); debajo del título, qué es la
   lista y sus acciones (las principales a la vista, el resto en «⋯»). */
var LI = {
  spark: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.5L12 15l-1.8-4.5L5.5 9l4.7-1.4z"/><path d="M19 15l.8 2.1 2.2.9-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.9z"/></svg>',
  plus: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
};
function renderListbar() {
  var bar = $('#listbar'), tb = $('#listtools');
  bar.hidden = tb.hidden = state.ui.view !== 'lists' || !!state.special;
  if (bar.hidden) return;
  var cur = state.ui.list;
  if (cur !== 'seen' && cur !== 'hidden' && !getList(cur)) cur = state.ui.list = 'watchlist';
  var tab = function (id, label, n, cls, icon, title) { return '<button class="ltab' + (cls ? ' ' + cls : '') + '" type="button" role="tab" data-list="' + esc(id) + '" aria-selected="' + (id === cur) + '"' + (title ? ' title="' + title + '"' : '') + '>' + (icon || '') + '<span>' + esc(label) + '</span> <span class="n">' + nf.format(n) + '</span></button>'; };
  var tabs = visibleLists().map(function (l) { var fest = isRadio(l); return tab(l.id, l.name, listKeys(l).length, (fest ? 'is-fest' : '') + (l.shared ? ' is-shared' : ''), (fest ? ICON.ticket : '') + (l.shared ? DUO_ICON : ''), fest ? 'Festival: una lista que se completa sola' : ''); });
  tabs.push(tab('seen', 'Vistas', seenKeys().length));
  var nh = hiddenKeys().length;
  if (nh || cur === 'hidden') tabs.push(tab('hidden', 'Ocultas', nh, 'is-dim', '', 'Lo que marcaste con «No me interesa»'));
  tabs.push('<button class="ltab ltab-new" type="button" data-tool="new" aria-label="Nueva lista" title="Nueva lista">' + LI.plus + '<span>Nueva</span></button>');
  bar.innerHTML = '<nav class="ltabs" role="tablist" aria-label="Tus listas">' + tabs.join('') + '</nav>';
  var act = bar.querySelector('[aria-selected="true"]');
  if (act) { var nav = bar.firstChild, r = act.offsetLeft - nav.offsetLeft; if (r < nav.scrollLeft || r + act.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = Math.max(0, r - 16); }

  var l = getList(cur), editable = l && l.id !== 'watchlist', meta = '', acts = '', more = [];
  if (state.listEdit === 'new') { tb.innerHTML = '<form class="inline-form" data-form="new"><label class="sr" for="newListInp">Nombre</label><input class="inp" id="newListInp" maxlength="40" placeholder="Nombre de la lista nueva"><button class="btn btn-accent" type="submit">Crear</button><button class="btn btn-ghost" type="button" data-cancel>Cancelar</button></form>'; $('#newListInp').focus(); return; }
  if (state.listEdit === 'rename' && editable) { tb.innerHTML = '<form class="inline-form" data-form="rename"><label class="sr" for="renListInp">Nuevo nombre</label><input class="inp" id="renListInp" maxlength="40" value="' + esc(l.name) + '"><button class="btn btn-accent" type="submit">Guardar</button><button class="btn btn-ghost" type="button" data-cancel>Cancelar</button></form>'; $('#renListInp').focus(); return; }
  if ((state.listEdit === 'share' || state.listEdit === 'addmember') && l) {
    var pick = shareCandidates(l), sel = state.shareSel || new Set();
    tb.innerHTML = '<div class="share-pick"><span class="hint">' + (state.listEdit === 'share' ? 'Compartir con:' : 'Sumar a:') + '</span>' + pick.map(function (b) { return '<button class="g-chip" type="button" data-pick="' + esc(b.uid) + '" aria-pressed="' + sel.has(b.uid) + '">' + esc(b.name) + '</button>'; }).join('') +
      '<button class="btn btn-accent" type="button" data-tool="share-go"' + (sel.size ? '' : ' disabled') + '>' + (state.listEdit === 'share' ? 'Compartir' : 'Sumar') + '</button><button class="btn btn-ghost" type="button" data-cancel>Cancelar</button></div>';
    return;
  }
  if (cur === 'hidden') meta = '<p class="lmeta">No aparecen en el catálogo, las recomendaciones ni los festivales, y le enseñan a la app qué no te interesa. Para devolver una, tocá el + del póster o abrila y elegí «Volver a mostrar».</p>';
  if (cur === 'seen' && seenKeys().length) acts += '<button class="btn btn-accent btn-sm" type="button" data-tool="foryou">' + LI.spark + (duoComp() ? esc(forYouNames().title) : 'Recomendaciones para vos') + '</button>';
  if (l) {
    var count = listKeys(l).length;
    if (isRadio(l)) {
      var seeds = seedKeys(l).map(resolveItem).filter(Boolean).map(function (x) { return x.t; });
      meta += '<p class="lmeta">' + ICON.ticket + '<span><b>Festival</b> · se completa solo a partir de ' + esc(seeds.join(', ') || 'sus pelis base') + '.</span></p>';
      acts += '<button class="btn btn-accent btn-sm" type="button" data-tool="radio-more"' + (state.radioBusy ? ' disabled' : '') + '>' + LI.plus + (state.radioBusy ? 'Buscando…' : 'Sumar 10 más') + '</button>';
    } else if (count) {
      acts += '<button class="btn btn-sm" type="button" data-tool="reco">' + LI.spark + 'Parecidas</button><button class="btn btn-sm" type="button" data-tool="radio-from">' + ICON.ticket + 'Armar festival</button>';
    }
    if (l.shared) {
      var others = (l.members || []).filter(function (m) { return m !== cloudUid(); }).map(function (m) { return l.memberNames[m] || 'alguien'; });
      meta = '<p class="lmeta">' + DUO_ICON + '<span>Compartida con ' + esc(others.join(', ') || 'nadie más') + (isRadio(l) ? '; el festival se programa con el gusto de los dos.' : '. Todos pueden sumar, sacar y renombrar.') + '</span></p>' + meta;
    }
    if (cloudIn() && shareCandidates(l).length) more.push('<button class="mi" type="button" data-tool="' + (l.shared ? 'addmember' : 'share') + '">' + DUO_ICON + (l.shared ? 'Sumar persona' : 'Compartir') + '</button>');
    if (editable) {
      more.push('<button class="mi" type="button" data-tool="rename">Renombrar</button>');
      more.push(l.shared && l.owner !== cloudUid()
        ? '<button class="mi mi-danger" type="button" data-tool="leave">' + (state.confirmDelete === l.id ? 'Tocá de nuevo para salir' : 'Salir de la lista') + '</button>'
        : '<button class="mi mi-danger" type="button" data-tool="delete">' + (state.confirmDelete === l.id ? 'Tocá de nuevo para borrarla' : 'Borrar lista') + '</button>');
    }
  }
  if (more.length) acts += '<details class="dpop lmore"' + (state.confirmDelete === (l && l.id) ? ' open' : '') + '><summary class="dq dq-sm" aria-label="Más opciones de la lista" title="Más opciones">' + ICON.more + '</summary><div class="dpop-panel" role="menu">' + more.join('') + '</div></details>';
  tb.innerHTML = (meta || acts ? '<div class="ltools">' + meta + (acts ? '<div class="lacts">' + acts + '</div>' : '') + '</div>' : '') + (l && isRadio(l) ? rumboHTML(l) : '');
}

function renderRail() {
  $('#svcToggles').innerHTML = SERVICES.map(function (s) {
    return '<button class="svc-t ' + svcClass(s.key) + '" type="button" data-svc="' + esc(s.key) + '" aria-pressed="' + (state.f.services.indexOf(s.key) >= 0) + '"><span class="dot"></span><span class="svc-n">' + esc(s.label) + '</span></button>';
  }).join('') + '<button class="svc-more" type="button" data-svcpick>Elegir mis servicios…</button>';
  $('#ratingSrc').innerHTML = Object.keys(SRC).map(function (k) { return '<option value="' + k + '"' + (k === state.f.ratingSrc ? ' selected' : '') + '>' + SRC[k].label + '</option>'; }).join('');
  var src = SRC[state.f.ratingSrc], r = $('#ratingMin');
  r.max = src.max; r.step = src.step; r.value = state.f.ratingMin;
  $('#ratingVal').textContent = state.f.ratingMin > 0 ? fmtScore(state.f.ratingSrc, state.f.ratingMin) : '0';
  $('#incUnknown').checked = !!state.f.includeUnknown;
  $$('#genreMode button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === state.f.genreMode); });
  renderGenreChips();
  $('#yFrom').value = state.f.yearFrom || ''; $('#yTo').value = state.f.yearTo || '';
  $('#maxRt').value = String(state.f.maxRuntime || 0);
  $('#hideSeen').checked = !!state.f.hideSeen;
  $('#noIndia').checked = !!state.f.noIndia;
  $('#onlyMine').checked = !!state.f.onlyMine;
  renderPeopleChips();
}
function renderPeopleChips() {
  $('#peopleChips').innerHTML = state.f.people.map(function (p) {
    return '<span class="pchip">' + esc(p.name) + '<button type="button" data-unperson="' + (+p.id) + '" aria-label="Quitar ' + esc(p.name) + '">' + ICON.x + '</button></span>';
  }).join('');
}
function renderGenreChips() {
  var names = new Set();
  var types = state.ui.view === 'lists' ? ['movie', 'tv'] : [state.ui.type];
  types.forEach(function (t) { state.genres[t].forEach(function (n) { names.add(n); }); });
  Object.keys(state.f.genres).forEach(function (n) { if (state.f.genres[n]) names.add(n); });
  var sorted = Array.from(names).sort(function (a, b) { return a.localeCompare(b, 'es'); });
  $('#genreChips').innerHTML = sorted.length ? sorted.map(function (n) {
    var st = state.f.genres[n] || 0;
    var lab = st === 1 ? 'incluido' : st === -1 ? 'excluido' : 'sin filtro';
    return '<button class="chip" type="button" data-genre="' + esc(n) + '" data-state="' + st + '" aria-label="' + esc(n) + ': ' + lab + '">' + esc(n) + '</button>';
  }).join('') : '<p class="hint">Los géneros aparecen cuando carga el catálogo.</p>';
}
function renderRailStatus() {
  var el = $('#railStatus'); if (!el) return;
  var out = [], type = state.ui.type, cat = state.catalogs[type];
  if (ctxMine() && cat) {
    var ago = Math.round((Date.now() - cat.at) / 36e5);
    out.push('<p><b>' + nf.format(cat.items.length) + '</b> ' + (type === 'movie' ? 'películas' : 'series') + ' en el catálogo · ' + (ago < 1 ? 'leído recién' : 'leído hace ' + ago + ' h') + ' · <button class="linkbtn" type="button" data-reload>Actualizar</button></p>');
  }
  if (!state.settings.omdbKey && !(cloudIn() && !CLOUD.admin)) out.push('<p>Sumá una clave gratis de OMDb para ver IMDb, Rotten Tomatoes y Metacritic. <button class="linkbtn" type="button" data-settings>Configurar</button></p>');
  else if (state.omdbStop) {
    out.push('<p>' + esc(state.omdbStop) + (jwScoresLive() ? ' Mientras tanto, IMDb y Rotten Tomatoes salen de JustWatch, y lo que le falte (también Metacritic), de Wikidata cuando lo tiene.' : '') + '</p>');
    if (JW.old && (!cloudIn() || CLOUD.admin)) out.push('<p>El Worker de JustWatch está desactualizado y no trae puntajes. Pegá de nuevo el código de tools/justwatch-worker.js en Cloudflare y tocá Deploy.</p>');
  }
  else if (state.filtered.length) {
    var have = 0, none = 0;
    state.filtered.forEach(function (it) { var d = state.details[it.k]; if (d && d.imdb && state.omdb[d.imdb]) have++; else if (d && !d.imdb) none++; });
    var missing = state.filtered.length - have - none, left = 1000 - omdbUsage().n;
    out.push('<p>IMDb · RT · MC: <b>' + nf.format(have) + '</b> de ' + nf.format(state.filtered.length) + ' en esta vista' + (missing && left > 0 ? ' · <button class="linkbtn" type="button" data-fill>Completar ' + nf.format(Math.min(missing, left)) + '</button>' : '') + '</p>');
    if (missing > left) out.push('<p>Hoy te quedan ' + nf.format(Math.max(0, left)) + ' consultas de OMDb; el resto se completa mañana.</p>');
  }
  if (state.f.maxRuntime > 0 && state.filtered.length) {
    var known = state.filtered.filter(function (it) { var d = state.details[it.k]; return d && d.rt; }).length;
    if (known < state.filtered.length) out.push('<p>Duración conocida en ' + nf.format(known) + ' de ' + nf.format(state.filtered.length) + '. Las que faltan se van completando y se descartan si se pasan.</p>');
  }
  if (!cloudIn() && CLOUD.status !== 'checking') out.push('<p>Tus listas están solo en este dispositivo. <button class="linkbtn" type="button" data-gocloud>Guardarlas en tu cuenta</button></p>');
  el.innerHTML = out.join('');
}

function setProgress(p, text) {
  var bar = $('#progress');
  if (p === null) { bar.hidden = true; bar.classList.remove('indet'); return; }
  bar.hidden = false;
  if (p < 0) bar.classList.add('indet');
  else { bar.classList.remove('indet'); $('span', bar).style.transform = 'scaleX(' + Math.max(0.02, Math.min(1, p)) + ')'; }
  if (text) { var c = $('#count'); if (c && !state.catalogs[state.ui.type] && state.ui.view === 'catalog') c.innerHTML = 'Armando tu cartelera<small>' + esc(text) + '</small>'; }
}
var toastTimer;
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3800);
}
function showBanner(html) { var b = $('#banner'); b.innerHTML = html; b.hidden = !html; }
function fatal(e) {
  if (state.fatal) return;
  state.fatal = e;
  Q.hi.length = 0; Q.lo.length = 0;
  setProgress(null);
  showBanner('<p>' + esc(e.message) + '</p><button class="btn" type="button" data-settings>Abrir ajustes</button>');
  refresh();
}

/* ---------- detail ---------- */
function openDialog(d) { if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else { d.setAttribute('open', ''); d.classList.add('fallback'); } navSoon(); }
function closeDialog(d) { if (typeof d.close === 'function') { if (d.open) d.close(); } else d.removeAttribute('open'); navSoon(); }

async function openDetail(it, pick) {
  closeMenu();
  state.detail = { k: it.k, it: it, pick: !!pick, full: null };
  renderDetail();
  openDialog($('#dlgDetail'));
  $('#dlgDetail').scrollTop = 0;
  try {
    var d = await tmdb('/' + it.type + '/' + it.id, { language: state.settings.lang, append_to_response: 'credits,videos,watch/providers,external_ids', include_video_language: state.settings.lang.slice(0, 2) + ',en,null' });
    if (!state.detail || state.detail.k !== it.k) return;
    state.detail.full = d;
    state.details[it.k] = liteFromFull(d, it.type); saveCachesSoon(); updateCard(it.k);
    if (!it.p && safePath(d.poster_path)) it.p = safePath(d.poster_path);
    wantStremio([it], true); var jwP = wantJw(it, d);
    renderDetail();
    var imdb = state.details[it.k].imdb, rec = imdb ? state.omdb[imdb] : null;
    var shown = function () { updateCard(it.k); if (state.detail && state.detail.k === it.k) renderDetail(); };
    /* OMDb trae los tres puntajes; si lo que hay vino de JustWatch, se completa con Metacritic */
    if (state.settings.omdbKey && imdb && (!rec || rec.src === 'jw') && omdbLive()) {
      try { if (putScores(imdb, await fetchOmdb(imdb))) shown(); }
      catch (e) { if (e.code === 'omdb-limit' || e.code === 'omdb-auth') { renderRailStatus(); toast(jwScoresLive() ? omdbToJwNote(e) : e.message); } }
    }
    if (state.settings.omdbKey && imdb && jwScoresLive() && (!omdbLive() || !state.omdb[imdb])) {
      await jwP;
      var cur = state.omdb[imdb];
      if (jwScoresLive() && (!cur || (!omdbLive() && wantsScore(cur, null)))) { try { if (putScores(imdb, await fetchScoresNoOmdb(it, imdb))) shown(); } catch (e) {} }
    }
  } catch (e) {
    if (state.detail && state.detail.k === it.k) { state.detail.error = e.message; renderDetail(); }
  }
}
/* escala de estrellas (pasar el dedo o el mouse muestra qué significa cada una) */
var STAR_NAME = ['', 'Mala', 'Decente', 'Buena', 'Excelente', 'Increíble'];
var STAR_TXT = ['', 'Mala: no me gustó, no la recomendaría', 'Decente: no es para mí, aunque no la pasé mal', 'Buena: la disfruté; tiene sus defectos, pero cumple', 'Excelente: me encantó, la recomiendo sin dudar', 'Increíble: memorable, un clásico que marca un antes y un después'];
function starHintText(n) { if (!n) return 'Tocá o deslizá el dedo sobre las estrellas para puntuar'; var t = STAR_TXT[n].split(': ')[1]; return '<b>' + STAR_NAME[n] + '</b> · ' + esc(t.charAt(0).toUpperCase() + t.slice(1)) + '.'; }
function starPreview(n) {
  var box = $('#myStars'), hint = $('#starHint'); if (!box) return;
  var cur = +box.dataset.cur || 0, show = n == null ? cur : n;
  box.classList.toggle('previewing', n != null);
  $$('[data-star]', box).forEach(function (b) { b.classList.toggle('pre', +b.dataset.star <= show); });
  if (hint) hint.innerHTML = starHintText(show);
}
function starAt(x) {
  var box = $('#myStars'); if (!box) return 0;
  var r = box.getBoundingClientRect(); if (!r.width) return 0;
  return Math.max(1, Math.min(5, Math.ceil((x - r.left) / (r.width / 5))));
}
function duoRowHTML(it) {
  var c = duoComp(); if (!c) return '';
  var seen = compSeen(c, it.k), st = compStar(c, it.k), b = '';
  if (c.src === 'cloud') return '<div class="duo-row"><span class="duo-who">' + DUO_ICON + esc(c.name) + '</span><span>' + (seen ? 'La vio' + (st ? ' · ' + '★'.repeat(st) : '') : 'No la vio') + '</span>' + (duoNote(it.k) ? '<span class="hint">' + esc(duoNote(it.k)) + '</span>' : '') + '</div>';
  for (var i = 1; i <= 5; i++) b += '<button class="star' + (i <= st ? ' on' : '') + '" type="button" data-cstar="' + i + '" aria-label="' + i + (i === 1 ? ' estrella' : ' estrellas') + ' de ' + esc(c.name) + '" aria-pressed="' + (i === st) + '">' + ICON.star + '</button>';
  return '<div class="duo-row"><span class="duo-who">' + DUO_ICON + esc(c.name) + '</span><button class="btn" type="button" data-cseen aria-pressed="' + seen + '">' + (seen ? 'La vio' : 'No la vio') + '</button>' +
    '<span class="stars" role="group" aria-label="Puntaje de ' + esc(c.name) + '">' + b + '</span>' + (duoNote(it.k) ? '<span class="hint">' + esc(duoNote(it.k)) + '</span>' : '') + '</div>';
}
function renderDetail() {
  var D = state.detail; if (!D) return;
  var it = D.it, full = D.full, s = scoresOf(it), lite = state.details[it.k] || {};
  var title = full ? (full.title || full.name) : it.t;
  var orig = full ? (full.original_title || full.original_name) : it.ot;
  var poster = safePath(full && full.poster_path) || safePath(it.p);
  var backdrop = safePath(full && full.backdrop_path);
  var genres = full ? (full.genres || []).map(function (g) { return g.name; }) : genreNames(it);
  var facts = [];
  if (it.y) facts.push(it.y);
  if (lite.rt) facts.push(fmtRuntime(lite.rt, it.type));
  if (lite.seasons) facts.push(lite.seasons + (lite.seasons === 1 ? ' temporada' : ' temporadas'));
  if (genres.length) facts.push(genres.join(', '));
  /* puntajes chicos, y al lado las etiquetas de la curaduría */
  var scores = ['tmdb', 'imdb', 'rt', 'mc'].map(function (k) {
    var v = s[k];
    if (!nz(v) && k !== 'tmdb' && !state.settings.omdbKey) return '';
    return '<span class="ds' + (nz(v) ? '' : ' na') + '"><b>' + fmtScore(k, v) + '</b><i>' + SRC[k].short + '</i></span>';
  }).join('');
  var cf = curFind({ t: title, ot: orig, y: it.y, type: it.type }) || curFind(it), L = CUR && CUR.labels;
  var ctags = cf ? cf.sub.map(function (v) { return L.sub[v]; }).concat(cf.ton.map(function (v) { return L.ton[v]; }), cf.tem.map(function (v) { return L.tem[v]; })).filter(Boolean).slice(0, 7) : [];
  var people = '';
  if (full) {
    var crew = dig(full, 'credits.crew') || [], cast = (dig(full, 'credits.cast') || []).slice(0, 8);
    var dir = it.type === 'movie' ? crew.filter(function (c) { return c.job === 'Director'; }) : (full.created_by || []);
    var wri = crew.filter(function (c) { return c.job === 'Screenplay' || c.job === 'Writer' || (it.type === 'tv' && c.department === 'Writing'); }).slice(0, 3);
    if (!wri.length) wri = crew.filter(function (c) { return c.job === 'Story' || c.job === 'Novel' || c.job === 'Author'; }).slice(0, 2);
    var mus = crew.filter(function (c) { return CREW_ROLE(c) === 'mus'; }).slice(0, 2);
    var dop = crew.filter(function (c) { return CREW_ROLE(c) === 'dop'; }).slice(0, 2);
    var pbtn = function (p) { return '<button class="plink" type="button" data-person="' + (+p.id) + '" data-pname="' + esc(p.name) + '">' + esc(p.name) + '</button>'; };
    var uniq = function (arr) { var u = {}; return arr.filter(function (p) { if (!p || !p.id || u[p.id]) return false; u[p.id] = 1; return true; }); };
    if (dir.length) people += '<dt>' + (it.type === 'movie' ? 'Dirección' : 'Creada por') + '</dt><dd>' + uniq(dir).map(pbtn).join(', ') + '</dd>';
    if (wri.length) people += '<dt>Guion</dt><dd>' + uniq(wri).map(pbtn).join(', ') + '</dd>';
    if (mus.length) people += '<dt>Música</dt><dd>' + uniq(mus).map(pbtn).join(', ') + '</dd>';
    if (dop.length) people += '<dt>Fotografía</dt><dd>' + uniq(dop).map(pbtn).join(', ') + '</dd>';
    if (cast.length) people += '<dt>Reparto</dt><dd>' + uniq(cast).map(pbtn).join(', ') + '</dd>';
  }
  if (cf) {
    var rels = Array.from(CUR.rel.get(cf.id) || []).slice(0, 6).map(function (r) { var f = CUR.byId.get(r); return f.t + ' (' + f.y + ')'; });
    people += '<dt>Curaduría</dt><dd><button class="plink" type="button" data-cursec="' + esc(cf.sec) + '" title="Armar un festival con esta sección">' + esc(L.sec[cf.sec]) + ' ›</button></dd>' +
      (rels.length ? '<dt>Parientes</dt><dd>' + esc(rels.join(' · ')) + '</dd>' : '');
  }
  var wtw = '';
  if (full) {
    var wp = dig(full, 'watch/providers.results.' + state.settings.region) || {};
    var flat = (wp.flatrate || []).concat(wp.ads || [], wp.free || []);
    var seenNames = {};
    var flatHtml = flat.filter(function (p) { if (seenNames[p.provider_name]) return false; seenNames[p.provider_name] = 1; return true; }).map(function (p) {
      var svc = servicesForProviders(it.type, [p]);
      return svc.length ? '<span class="sb ' + svcClass(svc[0]) + '">' + esc(p.provider_name) + '</span>' : '<span class="sb dim">' + esc(p.provider_name) + '</span>';
    }).join('');
    var stremioRow = '';
    if (STREMIO_ON && lite.imdb) {
      var sr = ST.cache[lite.imdb], stApp = stremioHref(it.type, lite.imdb), stWeb = stremioHref(it.type, lite.imdb, true);
      if (sr && sr.n) {
        var sl = stremioLangs(sr);
        stremioRow = '<div class="st-row"><span class="sb c-stremio">Stremio</span><span class="st-info"><b>' + esc(stremioQual(sr) || 'Calidad sin dato') + '</b>' +
          (sl.length ? ' · Audio ' + esc(sl.join(', ')) : ' · Sin audio en español marcado') + ' · ' + nf.format(sr.n) + (sr.n === 1 ? ' fuente' : ' fuentes') + (it.type === 'tv' ? ' (1.er episodio)' : '') + '</span></div>' +
          '<div class="actions-2"><a class="btn btn-sm" href="' + stApp + '">Abrir en Stremio</a><a class="btn btn-ghost btn-sm" href="' + stWeb + '" target="_blank" rel="noopener noreferrer">Stremio Web</a></div>';
      } else if (sr && sr.cam) stremioRow = '<p class="hint">En Stremio solo hay versiones filmadas en el cine.</p>';
      else if (!sr && !ST.off) stremioRow = '<p class="hint">Buscando en Stremio…</p>';
    }
    var jwHtml = jwRowsHTML(it, full.original_language || it.l), jwWait = JW_PROXY && !JW.off && !JW.cache[it.k] && flatHtml ? '<p class="hint">Buscando calidad e idiomas…</p>' : '';
    wtw = '<div class="dsec"><h3>Dónde verla</h3>' + (jwHtml || (flatHtml ? '<div class="wtw">' + flatHtml + '</div>' + jwWait : '<p class="hint">No está en ninguna plataforma de suscripción de tu región.</p>')) + stremioRow + '</div>';
  }
  var vids = full ? (dig(full, 'videos.results') || []).filter(function (v) { return v.site === 'YouTube' && /Trailer|Teaser/.test(v.type) && /^[A-Za-z0-9_-]{6,20}$/.test(v.key); }) : [];
  var lang2 = state.settings.lang.slice(0, 2);
  vids.sort(function (a, b) { return (b.iso_639_1 === lang2) - (a.iso_639_1 === lang2) || (b.type === 'Trailer') - (a.type === 'Trailer'); });
  var links = [];
  var ext = ' target="_blank" rel="noopener noreferrer"';
  links.push('<a href="https://www.themoviedb.org/' + it.type + '/' + (+it.id) + '/watch?locale=' + state.settings.region + '"' + ext + '>Dónde ver (TMDB)</a>');
  if (lite.imdb) links.push('<a href="https://www.imdb.com/title/' + lite.imdb + '/"' + ext + '>IMDb</a>');
  links.push('<a href="https://www.justwatch.com/ar/buscar?q=' + encodeURIComponent(title) + '"' + ext + '>JustWatch</a>');
  if (it.type === 'movie') links.push('<a href="https://letterboxd.com/tmdb/' + (+it.id) + '/"' + ext + '>Letterboxd</a>');
  links.push('<a href="https://www.doesthedogdie.com/search?q=' + encodeURIComponent((cf && cf.t) || orig || title) + '"' + ext + '>Advertencias (Does the Dog Die)</a>');
  var watch = inList('watchlist', it.k), seen = isSeen(it.k), stars = starOf(it.k), rctx = radioContext(), hidden = isHidden(it.k);
  var inFest = rctx && listKeys(rctx).indexOf(it.k) >= 0, isBase = inFest && seedIn(rctx, it.k);
  var starBtns = ''; for (var i = 1; i <= 5; i++) starBtns += '<button class="star' + (i <= stars ? ' on' : '') + '" type="button" data-star="' + i + '" aria-label="' + i + (i === 1 ? ' estrella. ' : ' estrellas. ') + STAR_TXT[i] + '" title="' + STAR_TXT[i] + '" aria-pressed="' + (i === stars) + '">' + ICON.star + '</button>';
  var lists = visibleLists(), saved = lists.some(function (l) { return isIn(l, it.k); });
  var listChips = lists.filter(function (l) { return l.id !== 'watchlist'; }).map(function (l) { return '<button class="chip" type="button" data-dlist="' + esc(l.id) + '" aria-pressed="' + isIn(l, it.k) + '">' + esc(l.name) + '</button>'; }).join('');
  var newList = D.newList
    ? '<form class="dnew" data-dnewform autocomplete="off"><label class="sr" for="dNewName">Nombre de la lista nueva</label><input class="inp" id="dNewName" maxlength="40" placeholder="Nombre de la lista nueva"><button class="btn btn-accent" type="submit">Crear y sumar</button><button class="btn btn-ghost" type="button" data-dnewcancel>Cancelar</button></form>'
    : '<button class="chip chip-new" type="button" data-dnewlist>+ Nueva lista</button>';
  /* acciones: íconos junto al póster, como en las tarjetas; lo demás en «Más» */
  var popLists = '<div class="dpop-panel" role="menu" aria-label="Agregar a una lista"><p class="menu-h">Agregar a</p>' + lists.map(function (l) {
      return '<button class="mi" type="button" role="menuitemcheckbox" aria-checked="' + isIn(l, it.k) + '" data-dlist="' + esc(l.id) + '"><span class="box">' + ICON.check + '</span><span class="lname">' + esc(l.name) + '</span></button>';
    }).join('') + '<form class="dpop-new" data-dpopform autocomplete="off"><label class="sr" for="dPopName">Nombre de la lista nueva</label><input class="inp" id="dPopName" maxlength="40" placeholder="Lista nueva"><button class="btn btn-sm" type="submit">Crear</button></form></div>';
  var popMore = '<div class="dpop-panel" role="menu" aria-label="Más opciones">' +
      (inFest ? (isBase ? '<p class="mi-note">Es una de las pelis base de este festival.</p>' : '<button class="mi" type="button" data-dact="seed">Usar como base del festival</button>') + '<button class="mi" type="button" data-dact="nope">Sacar del festival</button>' : '') +
      '<button class="mi" type="button" data-dact="hide" aria-pressed="' + hidden + '">' + (hidden ? 'Volver a mostrar' : 'No me interesa · ocultar') + '</button></div>';
  var side =
    (D.pick ? '<p class="eyebrow">Para esta noche</p>' : '') +
    (isBase ? '<p class="det-badge">Base del festival</p>' : '') +
    '<h2 class="det-title">' + esc(title) + '</h2>' +
    (orig && fold(orig) !== fold(title) ? '<p class="det-orig">' + esc(orig) + '</p>' : '') +
    '<p class="det-facts">' + esc(facts.join(' · ')) + '</p>' +
    '<div class="dq-row">' +
      '<button class="dq" type="button" data-dact="watch" aria-pressed="' + watch + '" aria-label="' + (watch ? 'En Mi lista' : 'Sumar a Mi lista') + '" title="' + (watch ? 'En Mi lista' : 'Sumar a Mi lista') + '">' + (watch ? ICON.bookmarkOn : ICON.bookmark) + '</button>' +
      '<button class="dq" type="button" data-dact="seen" aria-pressed="' + seen + '" aria-label="' + (seen ? 'Vista' : 'Marcar como vista') + '" title="' + (seen ? 'Vista' : 'Marcar como vista') + '">' + ICON.eye + '</button>' +
      '<details class="dpop" data-pop="lists"' + (D.pop === 'lists' ? ' open' : '') + '><summary class="dq' + (saved && !watch ? ' saved' : '') + '" aria-label="Agregar a una lista" title="Agregar a una lista">' + ICON.plus + '</summary>' + popLists + '</details>' +
      '<details class="dpop" data-pop="more"' + (D.pop === 'more' ? ' open' : '') + '><summary class="dq" aria-label="Más opciones" title="Más opciones">' + ICON.more + '</summary>' + popMore + '</details>' +
      (D.pick ? '<button class="btn btn-sm" type="button" data-repick>Otra opción</button>' : '') +
    '</div>';
  var partA =
    '<div class="det-scores">' + scores + (s.jw ? '<span class="ds-src" title="' + (s.wd.length ? 'OMDb no tenía consultas disponibles: IMDb sale de JustWatch y ' + s.wd.map(function (k) { return SRC[k].label; }).join(' y ') + ' de Wikidata (puede tener unos meses de atraso)' : 'OMDb no tenía consultas disponibles: IMDb y Rotten Tomatoes salen de JustWatch, que no tiene Metacritic') + '">' + (s.wd.length ? 'vía JustWatch y Wikidata' : 'vía JustWatch') + '</span>' : '') + (ctags.length ? '<span class="det-tags">' + ctags.map(function (t) { return '<span class="ctag">' + esc(t) + '</span>'; }).join('') + '</span>' : '') + '</div>' +
    '<div class="det-stars"><span class="stars" id="myStars" role="group" aria-label="Tu puntaje" data-cur="' + stars + '">' + starBtns + '</span>' +
    (stars ? '<button class="star-clear" type="button" data-starclear aria-label="Quitar tu puntaje" title="Quitar tu puntaje">' + ICON.x + '<span>Quitar</span></button>' : '') +
    '<p class="star-hint" id="starHint" aria-live="polite">' + starHintText(stars) + '</p></div>' + duoRowHTML(it) +
    (full && full.tagline ? '<p class="tagline">' + esc(full.tagline) + '</p>' : '') +
    (full ? '<p class="overview">' + esc(full.overview || 'Sin sinopsis en este idioma.') + '</p>' : (D.error ? '<p class="err">' + esc(D.error) + '</p>' : '<p class="hint">Cargando la ficha…</p>'));
  var partB =
    (people ? '<div class="dsec"><h3>Ficha técnica</h3><dl class="kv">' + people + '</dl></div>' : '') +
    '<div class="dsec"><h3>Tus listas</h3><div class="chips">' + listChips + (D.newList ? '' : newList) + '</div>' + (D.newList ? newList : '') +
      '<div class="dfest"><button class="btn btn-sm" type="button" data-dact="radio">' + ICON.ticket + 'Armar festival con esta</button><span class="hint">Una lista que se completa sola a partir de esta.</span></div></div>' +
    wtw +
    '<div class="dsec dreco" id="detReco">' + detRecoHTML(D) + '</div>' +
    '<div class="links">' + links.join('') + '</div>';
  /* La ficha se arma una vez por título y después se actualiza por partes: así el tráiler,
     si está andando, no se corta cuando llegan los puntajes o tocás una estrella. */
  var root = $('#detail');
  var keepVals = {}, focusedId = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : '';
  ['dNewName', 'dPopName'].forEach(function (id) { var x = document.getElementById(id); if (x && x.value) keepVals[id] = x.value; });
  if (root.dataset.k !== it.k || !$('#detTrailer', root)) {
    root.innerHTML = '<div class="dlg-bar"><button class="dlg-back" type="button" data-goback aria-label="Volver" title="Volver" hidden>' + ICON.back + '</button><button class="dlg-x" type="button" data-close aria-label="Cerrar" title="Cerrar">' + ICON.x + '</button></div>' +
      '<div class="det-hero"></div><div class="det-body"><div class="det-head"><div class="det-poster" id="detPoster"></div><div class="det-side" id="detSide"></div></div>' +
      '<div class="det-main"><div class="det-part" id="detA"></div><div class="dsec dtrailer" id="detTrailer" hidden></div><div class="det-part" id="detB"></div></div></div>';
    root.dataset.k = it.k;
  }
  $('#detPoster').innerHTML = poster ? '<img alt="" src="' + IMG + 'w500' + poster + '">' : '';
  $('#detSide').innerHTML = side;
  $('#detA').innerHTML = partA;
  $('#detB').innerHTML = partB;
  var hero = $('.det-hero', root); hero.style.backgroundImage = backdrop ? 'url("' + IMG + 'w1280' + backdrop + '")' : '';
  var tr = $('#detTrailer'), vkey = vids[0] ? vids[0].key : '';
  if (tr.dataset.v !== vkey) {
    tr.dataset.v = vkey; tr.hidden = !vkey;
    tr.innerHTML = vkey ? '<h3>Tráiler</h3><button class="trailer-thumb" type="button" data-trailer="' + vkey + '" aria-label="Reproducir el tráiler acá"><img alt="" loading="lazy" src="https://i.ytimg.com/vi/' + vkey + '/hqdefault.jpg"><span class="trailer-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span></button>' : '';
  }
  syncDlgBack(); watchDetReco(D);
  Object.keys(keepVals).forEach(function (id) { var x = document.getElementById(id); if (x) x.value = keepVals[id]; });
  var ni = $('#dNewName');
  if (ni && D.focusNew) { ni.focus(); D.focusNew = false; }
  else if (focusedId) { var fx = document.getElementById(focusedId); if (fx && fx.tagName === 'INPUT') fx.focus(); }
}
/* «Más como esta» al pie de la ficha: se busca recién cuando llegás a esa parte */
function detRecoHTML(D) {
  var head = '<div class="dreco-h"><h3>Más como esta</h3>' + (Array.isArray(D.reco) && D.reco.length ? '<button class="linkbtn" type="button" data-dact="reco">Ver todas ›</button>' : '') + '</div>';
  if (D.reco === 'error') return head + '<p class="hint">No pude buscar parecidas ahora.</p>';
  if (!Array.isArray(D.reco)) return head + '<div class="reco-row is-loading" aria-hidden="true">' + '<span class="reco-skel"></span>'.repeat(6) + '</div>';
  if (!D.reco.length) return head + '<p class="hint">No encontré parecidas que no hayas visto u ocultado.</p>';
  return head + '<div class="reco-row">' + D.reco.map(function (it) {
    var p = safePath(it.p);
    return '<button class="reco-card" type="button" data-recok="' + esc(it.k) + '" title="' + esc(it.t) + '"><span class="reco-p">' + (p ? '<img alt="" loading="lazy" src="' + IMG + 'w185' + p + '">' : '<span class="noposter">' + esc(it.t) + '</span>') +
      (isSeen(it.k) ? '<span class="reco-seen">Vista</span>' : '') + '</span><span class="reco-t">' + esc(it.t) + '</span><span class="reco-y">' + (it.y || '') + '</span></button>';
  }).join('') + '</div>';
}
function watchDetReco(D) {
  if (D.reco || !D.full) return;
  var el = $('#detReco'); if (!el) return;
  if (state.recoIO) state.recoIO.disconnect();
  if (!('IntersectionObserver' in window)) { loadDetReco(D); return; }
  state.recoIO = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { state.recoIO.disconnect(); loadDetReco(D); } }, { root: $('#dlgDetail'), rootMargin: '0px 0px 500px 0px' });
  state.recoIO.observe(el);
}
async function loadDetReco(D) {
  if (D.reco) return;
  D.reco = 'loading';
  try {
    var recs = await recommend([D.it]);
    D.reco = recs.map(function (r) { return r.it; }).filter(function (it) { return it.k !== D.it.k && !isHidden(it.k) && !seenNow(it.k); }).slice(0, 14);
    D.recoMap = new Map(D.reco.map(function (it) { return [it.k, it]; }));
  } catch (e) { if (e.fatal) { fatal(e); return; } D.reco = 'error'; }
  if (state.detail === D) { var box = $('#detReco'); if (box) box.innerHTML = detRecoHTML(D); }
}
function playTrailer(key) {
  var tr = $('#detTrailer'); if (!tr || !/^[A-Za-z0-9_-]{6,20}$/.test(key)) return;
  var f = document.createElement('iframe');
  f.src = 'https://www.youtube-nocookie.com/embed/' + key + '?autoplay=1&playsinline=1&rel=0';
  f.title = 'Tráiler';
  f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
  f.setAttribute('allowfullscreen', '');
  f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox');
  var box = document.createElement('div'); box.className = 'trailer-frame'; box.appendChild(f);
  var thumb = $('.trailer-thumb', tr); if (thumb) thumb.replaceWith(box);
}
function resetDetailView() { var root = $('#detail'); if (root) { root.innerHTML = ''; root.dataset.k = ''; } }

function pickOne() {
  var src = state.filtered.filter(function (it) { return !seenNow(it.k); });
  if (!src.length) { toast('No hay nada para elegir con estos filtros.'); return; }
  var top = src.slice(0, Math.min(40, src.length)), it, guard = 0;
  do { it = top[Math.floor(Math.random() * top.length)]; guard++; } while (top.length > 1 && it.k === state.lastPick && guard < 10);
  state.lastPick = it.k;
  openDetail(it, true);
}

/* ---------- list menu ---------- */
function openMenu(anchor, it) {
  state.menuItem = it; renderMenu();
  var m = $('#listMenu'); m.hidden = false;
  var r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  var left = Math.min(Math.max(12, r.right - w), window.innerWidth - w - 12);
  var top = r.bottom + 6; if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 6);
  m.style.left = left + 'px'; m.style.top = top + 'px';
  var first = $('.mi', m); if (first) first.focus();
  navSoon();
}
function renderMenu() {
  var it = state.menuItem; if (!it) return;
  var hb = $('#menuHide'); if (hb) { var hid = isHidden(it.k); hb.textContent = hid ? 'Volver a mostrar' : 'No me interesa · ocultar'; hb.setAttribute('aria-pressed', hid); }
  $('#menuItems').innerHTML = visibleLists().map(function (l) {
    return '<button class="mi" type="button" role="menuitemcheckbox" aria-checked="' + isIn(l, it.k) + '" data-mlist="' + esc(l.id) + '"><span class="box">' + ICON.check + '</span><span class="lname">' + esc(l.name) + '</span><span class="n">' + nf.format(listKeys(l).length) + '</span></button>';
  }).join('');
}
function closeMenu() { var m = $('#listMenu'); if (m && !m.hidden) { m.hidden = true; state.menuItem = null; navSoon(); } }

/* ---------- búsqueda en todo TMDB ---------- */
async function globalSearch(q) {
  var type = state.ui.type;
  closeRail();
  var sp = state.special = { kind: 'search', q: q, items: [], loading: true };
  refresh(); window.scrollTo(0, 0);
  try {
    await loadProviders(type);
    var d = await tmdb('/search/' + type, { query: q, language: state.settings.lang, include_adult: 'false', page: 1 });
    if (state.special !== sp) return;
    sp.items = (d.results || []).slice(0, 20).map(function (r) { return fromCatalog(norm(r, type)); });
    sp.loading = false;
    refresh();
    wantDetails(sp.items, 'hi');
  } catch (e) {
    if (e.fatal) fatal(e); else { toast(e.message); state.special = null; refresh(); }
  }
}
function clearQuery() { state.q = ''; var qi = document.getElementById('q'); if (qi) qi.value = ''; }
function backFromSpecial() { if (navBack()) return; state.special = null; refresh(); window.scrollTo(0, 0); }

/* ---------- todo el cine (TMDB en vivo, con los filtros) ---------- */
function allParams(type) {
  var f = state.f, byName = {};
  state.genres[type].forEach(function (n, id) { byName[n] = id; });
  var inc = [], exc = [];
  Object.keys(f.genres).forEach(function (n) { var id = byName[n]; if (!id) return; if (f.genres[n] === 1) inc.push(id); else if (f.genres[n] === -1) exc.push(id); });
  var s = curSort(), dk = type === 'movie' ? 'primary_release_date' : 'first_air_date';
  var p = { include_adult: 'false', language: state.settings.lang };
  if (inc.length) p.with_genres = inc.join(f.genreMode === 'all' ? ',' : '|');
  if (exc.length) p.without_genres = exc.join(',');
  var yF = parseInt(f.yearFrom, 10), yT = parseInt(f.yearTo, 10);
  if (yF) p[dk + '.gte'] = yF + '-01-01';
  if (yT) p[dk + '.lte'] = yT + '-12-31';
  if (f.ratingSrc === 'tmdb' && f.ratingMin > 0) p['vote_average.gte'] = f.ratingMin;
  if (f.maxRuntime > 0) p['with_runtime.lte'] = f.maxRuntime;
  var minV = type === 'movie' ? 50 : 20;
  if (s === 'rating') { p.sort_by = 'vote_average.desc'; minV = type === 'movie' ? 300 : 100; }
  else if (s === 'year') { p.sort_by = dk + '.desc'; if (!p[dk + '.lte']) p[dk + '.lte'] = today(); }
  else if (s === 'title') p.sort_by = type === 'movie' ? 'original_title.asc' : 'name.asc';
  else p.sort_by = 'popularity.desc';
  p['vote_count.gte'] = minV;
  return p;
}
function allSig() { var t = state.ui.type; return t + '|' + stable(allParams(t)); }
var loadAllSoon = debounce(function () { if (isAllMode()) loadAll(false); }, 250);
async function loadAll(more) {
  if (!state.settings.tmdbKey || state.fatal) return;
  var type = state.ui.type, sig = allSig(), A = state.all;
  if (!A || A.sig !== sig) A = state.all = { sig: sig, type: type, items: [], keys: new Set(), page: 0, total: 1, totalResults: 0, loading: false };
  else if (!more) return;
  if (A.loading || A.page >= A.total) return;
  A.loading = true;
  if (more) { var mb = $('#more'); mb.textContent = 'Cargando…'; }
  try {
    var d = await tmdb('/discover/' + type, Object.assign({}, allParams(type), { page: A.page + 1 }));
    if (state.all !== A) return;
    A.page = d.page || (A.page + 1); A.total = Math.min(d.total_pages || 1, 500); A.totalResults = d.total_results || A.totalResults;
    var fresh = [];
    (d.results || []).forEach(function (r) { var it = fromCatalog(norm(r, type)); if (A.keys.has(it.k)) return; A.keys.add(it.k); A.items.push(it); fresh.push(it); });
    if (state.f.onlyMine) wantDetails(fresh, 'lo');
  } catch (e) {
    if (e.fatal) { fatal(e); return; }
    toast(e.message); A.total = A.page;
  } finally { A.loading = false; }
  if (state.all === A) refresh(true);
}

/* ---------- otra tanda: al llegar al final de lo que hay, se le piden a TMDB más títulos de tus
   servicios que cumplan los filtros puestos (género, años, duración, rating de TMDB, orden) ---------- */
var EXT = { sig: '', pages: {}, done: {}, loading: false, end: false, rounds: 0, autoSig: '' };
function canExtend() { return ctxMine() && !!state.catalogs[state.ui.type] && !!state.settings.tmdbKey && !state.fatal; }
function extServices() { var on = new Set(state.f.services); return SERVICES.filter(function (x) { return on.has(x.key); }); }
function extSig() { var t = state.ui.type; return t + '|' + stable(allParams(t)) + '|' + extServices().map(function (x) { return x.key; }).join(','); }
function extEnded() { return EXT.sig === extSig() && EXT.end; }
function extMoreButton(more) {
  if (!canExtend()) return;
  more.hidden = false;
  if (extEnded()) { more.textContent = 'No hay más en tus servicios con estos filtros'; more.disabled = true; return; }
  more.disabled = !!EXT.loading;
  more.textContent = EXT.loading ? 'Buscando más en tus servicios…' : 'Buscar más en tus servicios';
}
async function extendCatalog() {
  if (!canExtend() || EXT.loading) return;
  var type = state.ui.type, sig = extSig();
  if (EXT.sig !== sig) { EXT.sig = sig; EXT.pages = {}; EXT.done = {}; EXT.end = false; EXT.rounds = 0; }
  if (EXT.end) return;
  EXT.loading = true; extMoreButton($('#more'));
  var before = state.filtered.length, added = [];
  try {
    var prov = await loadProviders(type), base = allParams(type);
    base.watch_region = state.settings.region; base.with_watch_monetization_types = 'flatrate|ads|free';
    for (var round = 0; round < 4 && !EXT.end; round++) {
      var svcs = extServices().filter(function (x) { return !EXT.done[x.key]; });
      if (!svcs.length) { EXT.end = true; break; }
      var res = await Promise.all(svcs.map(function (x) {
        var page = (EXT.pages[x.key] || 0) + 1;
        return tmdb('/discover/' + type, Object.assign({}, base, { with_watch_providers: (prov[x.key] || x.fb).join('|'), page: page }))
          .then(function (d) { EXT.pages[x.key] = page; if (!d.results || !d.results.length || page >= Math.min(d.total_pages || 1, 500)) EXT.done[x.key] = true; return [x.key, d.results || []]; },
            function (e) { if (e.fatal) throw e; EXT.done[x.key] = true; return [x.key, []]; });
      }));
      if (EXT.sig !== extSig() || state.ui.type !== type) return;
      var cat = state.catalogs[type], idx = catIndex(type);
      res.forEach(function (pair) {
        pair[1].forEach(function (r) {
          var k = itemKey(type, r.id), it = idx.get(k);
          if (it) { if (it.s.indexOf(pair[0]) < 0) it.s.push(pair[0]); return; }
          it = norm(r, type); it.s = [pair[0]]; cat.items.push(it); idx.set(k, it); added.push(it);
        });
      });
      EXT.rounds++;
      if (applyFilters(added, omdbRatingFilter()).length >= 12) break;
    }
    if (added.length) { saveCatalogSoon(type); }
    if (extServices().every(function (x) { return EXT.done[x.key]; })) EXT.end = true;
  } catch (e) {
    if (e.fatal) { fatal(e); return; }
    toast(e.message);
  } finally { EXT.loading = false; }
  refresh(true);
  ratingsForFilter();
  var got = state.filtered.length - before;
  if (got > 0) toast('Sumé ' + got + (got === 1 ? ' título' : ' títulos') + ' más de tus servicios.');
}
function omdbRatingFilter() { var f = state.f; return f.ratingMin > 0 && f.ratingSrc !== 'tmdb' && f.ratingSrc !== 'avg'; }
/* cuántos de los que cumplen el resto de los filtros todavía no tienen el puntaje elegido, y cuántos no lo tienen en OMDb */
/* pend: se están trayendo · later: esperan a que OMDb vuelva a tener consultas · none: no hay dato */
function ratingGap() {
  if (!omdbRatingFilter() || !state.settings.omdbKey) return null;
  var src = state.f.ratingSrc, pend = 0, later = 0, none = 0, omdb = omdbLive(), jw = jwScoresLive() && src !== 'mc';
  applyFilters(currentPool(), true).forEach(function (it) {
    var sc = scoresOf(it);
    if (nz(sc[src])) return;
    if (sc.noImdb) none++;
    else if (!sc.rec) { if (omdb || (jw && !JW.bad[it.k])) pend++; else later++; }
    else if (sc.jw) { if (omdb || wantsScore(sc.rec, src)) pend++; else later++; }
    else none++;
  });
  return { pend: pend, later: later, none: none };
}
var saveCatalogSoon = debounce(function (type) { var c = state.catalogs[type]; if (c) LS.set('catalog.' + type, c); }, 2000);
/* con un mínimo de IMDb, Rotten Tomatoes o Metacritic, se traen esos puntajes para lo que cumple
   el resto de los filtros (si no, quedan afuera por falta de dato, no por puntaje) */
var ratingsForFilter = debounce(function () {
  if (!omdbRatingFilter() || !state.settings.omdbKey || state.ui.view === 'profile') return;
  var src = state.f.ratingSrc, cap = 0;
  if (omdbLive()) cap = Math.max(0, Math.min(300, 1000 - omdbUsage().n - 50));
  /* con JustWatch de respaldo no hay tope: lo que OMDb no llegue a traer hoy lo sigue JustWatch */
  if (jwScoresLive() && (src !== 'mc' || (!omdbLive() && wdLive()))) cap = 400;
  if (!cap) return;
  var cand = applyFilters(currentPool(), true).filter(function (it) {
    var d = state.details[it.k], rec = d && d.imdb ? state.omdb[d.imdb] : null;
    if (d && !d.imdb) return false;
    /* lo que puso Wikidata se vuelve a pedir a OMDb cuando tiene consultas (Wikidata puede estar atrasado) */
    var sc = scoresOf(it); if (nz(sc[src]) && !(omdbLive() && sc.wd.indexOf(src) >= 0)) return false;
    /* JustWatch no tiene Metacritic: sin OMDb solo se le pregunta a Wikidata por lo que ya pasó por JustWatch */
    if (src === 'mc' && !omdbLive() && !rec) return false;
    return !d || wantsScore(rec, src);
  });
  if (cand.length) wantRatings(cand.slice(0, cap), src);
}, 600);

/* ---------- personas ---------- */
/* rol de un crédito de equipo: dirección, guion, música o fotografía */
function CREW_ROLE(c) {
  var j = String(c.job || ''), d = String(c.department || '');
  if (j === 'Director' || j === 'Creator') return 'dir';
  if (d === 'Writing') return 'wri';
  if (/Original Music Composer|^Music$|^Composer$|Music Director|Original Series Composer/i.test(j)) return 'mus';
  if (/Director of Photography|Cinematograph/i.test(j)) return 'dop';
  return null;
}
var ROLE_LABEL = { dir: 'Dirección', act: 'Actuación', wri: 'Guion', mus: 'Música', dop: 'Fotografía' };
var ROLES = ['dir', 'act', 'wri', 'mus', 'dop'];
function loadPersonCredits(id) {
  if (state.personData[id]) return Promise.resolve(state.personData[id]);
  if (state.personLoading[id]) return state.personLoading[id];
  var pr = tmdb('/person/' + id + '/combined_credits', { language: state.settings.lang }).then(function (cc) {
    var items = new Map(), roles = {};
    var add = function (c, role) {
      if (!c || !c.id || c.adult) return;
      var type = c.media_type === 'tv' ? 'tv' : 'movie', k = itemKey(type, c.id);
      if (!items.has(k)) items.set(k, norm(c, type));
      (roles[k] = roles[k] || {})[role] = 1;
    };
    (cc.cast || []).forEach(function (c) { add(c, 'act'); });
    (cc.crew || []).forEach(function (c) { var r = CREW_ROLE(c); if (r) add(c, r); });
    var data = { items: Array.from(items.values()), keys: new Set(items.keys()), roles: roles };
    state.personData[id] = data; delete state.personLoading[id];
    return data;
  }, function (e) { delete state.personLoading[id]; throw e; });
  state.personLoading[id] = pr;
  return pr;
}
/* festivales por persona: la retrospectiva es su obra en ese rol (lo mejor primero);
   "en su onda" arranca de sus mejores títulos y se completa con parecidos */
function personBest(sp) {
  var role = sp.tab, items = (sp.tabs[role] || []).filter(function (it) { return !(state.f.noIndia && isIndian(it)); });
  var q = function (it) { return (it.v || 0) * Math.log10(10 + (it.vc || 0)); };
  return items.filter(function (it) { return (it.vc || 0) >= 15; }).sort(function (a, b) { return q(b) - q(a); }).concat(items.filter(function (it) { return (it.vc || 0) < 15; }));
}
function personFestival(sp, kind) {
  var best = personBest(sp), who = sp.title, role = ROLE_LABEL[sp.tab] || '';
  if (!best.length) { toast('No encontré títulos de ' + who + ' para armarlo.'); return; }
  if (kind === 'onda') { createRadio(best.slice(0, 6), ('Festival ' + who).slice(0, 40)); return; }
  var name = ('Retrospectiva ' + who).slice(0, 40);
  var ex = visibleLists().filter(function (l) { return l.name === name; })[0];
  var l = ex || createList(name); if (!l) return;
  var t = now(), keep = best.slice(0, 40);
  keep.forEach(function (it, i) { if (!isIn(l, it.k)) { l.adds[it.k] = t - i; state.user.items[it.k] = snapshot(it); } });
  touchUser();
  state.special = null; state.ui.view = 'lists'; state.ui.list = l.id; state.ui.sortLists = 'added'; state.listEdit = null;
  refresh(); window.scrollTo(0, 0);
  toast((ex ? 'Actualicé la ' : 'Armé la ') + 'retrospectiva: ' + keep.length + ' títulos de ' + who + (role ? ' (' + role.toLowerCase() + ')' : '') + ', lo mejor primero.');
}
async function openPerson(id, name) {
  closeDialog($('#dlgDetail')); closeMenu(); closeRail();
  clearQuery();
  var sp = state.special = { kind: 'person', id: id, title: name, items: [], loading: true, tab: null, tabs: null };
  refresh(); window.scrollTo(0, 0);
  try {
    var res = await Promise.all([tmdb('/person/' + id, { language: state.settings.lang }), loadPersonCredits(id)]);
    if (state.special !== sp) return;
    var info = res[0], data = res[1];
    sp.title = info.name || name; sp.dept = info.known_for_department || '';
    var tabs = { dir: [], act: [], wri: [], mus: [], dop: [] };
    data.items.forEach(function (it) { var r = data.roles[it.k] || {}; ROLES.forEach(function (t) { if (r[t]) tabs[t].push(fromCatalog(it)); }); });
    sp.tabs = tabs;
    var pref = { Directing: 'dir', Writing: 'wri', Sound: 'mus', Camera: 'dop' }[sp.dept] || 'act';
    sp.tab = tabs[pref].length ? pref : (ROLES.filter(function (t) { return tabs[t].length; })[0] || 'act');
    sp.items = tabs[sp.tab]; sp.loading = false;
    refresh();
    wantDetails(sp.items.slice(0, 150), 'lo');
  } catch (e) {
    if (e.fatal) { fatal(e); return; }
    if (state.special === sp) { sp.loading = false; sp.error = e.message; refresh(); }
  }
}
function addPersonFilter(id, name) {
  if (!state.f.people.some(function (p) { return p.id === id; })) {
    state.f.people.push({ id: id, name: String(name).slice(0, 80) });
    if (state.f.people.length > 5) state.f.people.shift();
  }
  renderPeopleChips();
  refresh();
  loadPersonCredits(id).then(function () { refresh(); }, function (e) { if (e.fatal) fatal(e); else toast(e.message); });
}
var DEPT = { Directing: 'Dirección', Acting: 'Actuación', Writing: 'Guion', Production: 'Producción', Camera: 'Fotografía', Editing: 'Montaje', Sound: 'Música y sonido', Art: 'Arte' };
var personSearch = debounce(async function (q) {
  var box = $('#personAc');
  if (q.length < 2) { box.hidden = true; return; }
  try {
    var d = await tmdb('/search/person', { query: q, language: state.settings.lang, include_adult: 'false' });
    if ($('#personQ').value.trim() !== q) return;
    var res = (d.results || []).slice(0, 7);
    box.innerHTML = res.length ? res.map(function (p) {
      var known = (p.known_for || []).slice(0, 2).map(function (k) { return k.title || k.name; }).filter(Boolean).join(', ');
      return '<button class="ac-item" type="button" role="option" data-pid="' + (+p.id) + '" data-pname="' + esc(p.name) + '"><b>' + esc(p.name) + '</b><span>' + esc([DEPT[p.known_for_department] || p.known_for_department, known].filter(Boolean).join(' · ')) + '</span></button>';
    }).join('') : '<p class="ac-empty">No encontré a nadie con ese nombre.</p>';
    box.hidden = false;
  } catch (e) { if (e.fatal) fatal(e); }
}, 300);

/* ---------- barra de vistas especiales ---------- */
function renderSpecialBar() {
  var bar = $('#specialBar'), sp = state.special;
  bar.hidden = !sp;
  if (bar.hidden) { bar.innerHTML = ''; return; }
  /* siempre hay cómo volver (en iPhone, como app, no hay botón Atrás del sistema) */
  var back = '<button class="btn-back" type="button" data-back aria-label="Volver">' + ICON.back + '<span>Volver</span></button>';
  if (sp.kind === 'search' || sp.error) { bar.innerHTML = back + (sp.kind === 'search' ? '<p class="seeds">Resultados para <b>' + esc(sp.q) + '</b></p>' : ''); return; }
  if (sp.kind === 'person') {
    var tabs = sp.tabs ? ROLES.filter(function (t) { return sp.tabs[t].length; }) : [];
    bar.innerHTML = back + (tabs.length > 1 ? '<div class="seg seg-wrap" role="group" aria-label="Rol">' + tabs.map(function (t) { return '<button type="button" data-ptab="' + t + '" aria-pressed="' + (sp.tab === t) + '">' + ROLE_LABEL[t] + ' <span class="n">' + sp.tabs[t].length + '</span></button>'; }).join('') + '</div>' :
      tabs.length === 1 ? '<p class="seeds">' + ROLE_LABEL[tabs[0]] + ' · ' + sp.tabs[tabs[0]].length + (sp.tabs[tabs[0]].length === 1 ? ' título' : ' títulos') + '</p>' : '') +
      '<span class="grow"></span>' + (sp.loading ? '' : '<button class="btn btn-accent" type="button" data-pfest="retro">' + ICON.ticket + 'Retrospectiva</button><button class="btn" type="button" data-pfest="onda">Festival en su onda</button><button class="btn" type="button" data-pfilter>Filtrar mi cartelera por ' + esc(sp.title) + '</button>');
  } else if (sp.kind === 'reco') {
    bar.innerHTML = back + '<p class="seeds">A partir de ' + sp.seeds.map(function (s) { return '<b>' + esc(s.t) + '</b>'; }).join(', ') + '</p><span class="grow"></span>' +
      (sp.loading ? '' : '<button class="btn btn-accent" type="button" data-mkradio>Armar festival</button>');
  }
}

/* ---------- curaduría (etiquetas hechas a mano, en curaduria.json) ---------- */
var CUR = null;
var curMap = LS.get('curmap', {});
var saveCurMapSoon = debounce(function () { LS.set('curmap', curMap); }, 1500);
function curNorm(s) { return fold(s).replace(/[\s\-–—:;,.!?¡¿'"’‘“”()\[\]&\/·]+/g, ' ').trim(); }
function loadCuraduria() {
  return fetch('curaduria.json', { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !Array.isArray(j.films) || !j.labels) return;
    var byKey = new Map(), byId = new Map(), rel = new Map();
    var link = function (a, b) { if (!rel.has(a)) rel.set(a, new Set()); rel.get(a).add(b); };
    j.films.forEach(function (f) {
      if (!f || !f.id || !Array.isArray(f.sub) || !Array.isArray(f.tem) || !Array.isArray(f.ton)) return;
      byId.set(f.id, f);
      [f.t, f.ot].filter(Boolean).forEach(function (t) { byKey.set(curNorm(t) + '|' + f.y + '|' + (f.tv ? 't' : 'm'), f); });
    });
    byId.forEach(function (f) { (f.rel || []).forEach(function (r) { if (byId.has(r)) { link(f.id, r); link(r, f.id); } }); });
    var byTmdb = new Map();
    Object.keys(curMap).forEach(function (id) { var c = curMap[id]; if (c && c.k && byId.has(id)) byTmdb.set(c.k, byId.get(id)); });
    var secs = j.labels.sec || {};
    var groups = (Array.isArray(j.groups) ? j.groups : []).filter(function (g) { return Array.isArray(g) && typeof g[0] === 'string' && Array.isArray(g[1]); })
      .map(function (g) { return [g[0], g[1].filter(function (x) { return typeof x === 'string' && secs[x]; })]; });
    if (!groups.length) groups = [['Secciones', Object.keys(secs)]];
    CUR = { labels: j.labels, groups: groups, byKey: byKey, byId: byId, byTmdb: byTmdb, rel: rel, films: Array.from(byId.values()) };
  }).catch(function () {});
}
function curFind(it) {
  if (!CUR || !it) return null;
  if (it.k && CUR.byTmdb.has(it.k)) return CUR.byTmdb.get(it.k);
  var tp = it.type === 'tv' ? 't' : 'm', y = +it.y;
  var names = [it.ot, it.t].filter(Boolean).map(curNorm), ys = y ? [y, y - 1, y + 1] : [];
  for (var i = 0; i < names.length; i++) for (var j = 0; j < ys.length; j++) { var f = CUR.byKey.get(names[i] + '|' + ys[j] + '|' + tp); if (f) return f; }
  return null;
}
function curJac(x, y) { if (!x.length || !y.length) return 0; var s = new Set(x), i = y.filter(function (v) { return s.has(v); }).length; return i / new Set(x.concat(y)).size; }
function curSim(a, b) { return Math.min(1, 0.45 * curJac(a.sub, b.sub) + 0.35 * curJac(a.tem, b.tem) + 0.2 * curJac(a.ton, b.ton) + (a.sec === b.sec ? 0.15 : 0)); }
function curRel(a, b) { var s = CUR.rel.get(a.id); return !!(s && s.has(b.id)); }
function curShared(a, b) {
  var L = CUR.labels, out = [];
  a.sub.forEach(function (v) { if (b.sub.indexOf(v) >= 0) out.push(L.sub[v]); });
  a.tem.forEach(function (v) { if (b.tem.indexOf(v) >= 0) out.push(L.tem[v]); });
  return out;
}
async function curResolve(f) {
  var c = curMap[f.id];
  if (c) return c.none ? null : c;
  var type = f.tv ? 'tv' : 'movie', yk = f.tv ? 'first_air_date_year' : 'primary_release_year';
  var near = function (r) { var d = r.release_date || r.first_air_date || ''; var y = parseInt(d.slice(0, 4), 10); return y && Math.abs(y - f.y) <= 1; };
  var find = async function (query, withYear) {
    var p = { query: query, language: state.settings.lang, include_adult: 'false' };
    if (withYear) p[yk] = f.y;
    var d = await tmdb('/search/' + type, p);
    return (d.results || []).filter(near)[0] || null;
  };
  var r = await find(f.ot || f.t, true) || (f.ot ? await find(f.t, true) : null) || await find(f.ot || f.t, false);
  var it = r ? cleanSnap(norm(r, type), itemKey(type, r.id)) : null;
  curMap[f.id] = it || { none: 1 };
  if (it && CUR) CUR.byTmdb.set(it.k, f);
  saveCurMapSoon();
  return it;
}
/* las de una sección, primero las más conectadas (las que más parientes tienen) */
function curSectionFilms(sec) {
  var films = CUR.films.filter(function (f) { return f.sec === sec; });
  return films.sort(function (a, b) { return (CUR.rel.get(b.id) || new Set()).size - (CUR.rel.get(a.id) || new Set()).size; });
}
async function curSectionSeeds(sec, n) {
  var films = curSectionFilms(sec);
  var seeds = [];
  for (var i = 0; i < films.length && seeds.length < n; i++) {
    var it = await curResolve(films[i]);
    if (it && !seenNow(it.k)) seeds.push(it);
  }
  return seeds;
}

/* ---------- festivales por género (navegador de secciones) ---------- */
var LOCAL_SECS = ['argentino', 'latam', 'espanol'];
function curShownTitle(f) {
  var c = curMap[f.id];
  if (c && !c.none && c.t) return c.t;
  if (f.ot && LOCAL_SECS.indexOf(f.sec) >= 0 && /^[\u0000-\u024F]+$/.test(f.ot)) return f.ot;
  return f.t;
}
function festName(sec) { return ('Festival ' + (CUR.labels.sec[sec] || sec)).slice(0, 40); }
function festList(sec) { var n = festName(sec); return visibleLists().filter(function (l) { return l.name === n && isRadio(l); })[0] || null; }
function renderFest() {
  var body = $('#festBody'), nav = $('#festNav'), mine = $('#festMine');
  var fests = visibleLists().filter(isRadio);
  mine.innerHTML = fests.length ? '<section class="fest-sec" id="festMineSec"><h3 class="fest-h">Tus festivales</h3><p class="hint">Están también en Listas, junto a las demás.</p><div class="fest-mine">' +
    fests.map(function (l) { return '<button class="lpill is-fest" type="button" data-openlist="' + esc(l.id) + '">' + ICON.ticket + esc(l.name) + ' <span class="n">' + nf.format(listKeys(l).length) + '</span></button>'; }).join('') + '</div></section>' : '';
  var jumps = '<button type="button" class="pchip" data-fjump="festNew">Nuevo</button>' + (fests.length ? '<button type="button" class="pchip" data-fjump="festMineSec">Tus festivales</button>' : '');
  if (!CUR) { nav.innerHTML = jumps; body.innerHTML = '<p class="hint fest-sec">No pude cargar los festivales prearmados. Revisá la conexión y probá de nuevo.</p>'; return; }
  var L = CUR.labels.sec, counts = {};
  CUR.films.forEach(function (f) { counts[f.sec] = (counts[f.sec] || 0) + 1; });
  var groups = CUR.groups.map(function (g) { return [g[0], g[1].filter(function (x) { return counts[x]; })]; }).filter(function (g) { return g[1].length; });
  nav.innerHTML = jumps + groups.map(function (g, i) { return '<button type="button" class="pchip" data-fjump="fg' + i + '">' + esc(g[0]) + '</button>'; }).join('');
  body.innerHTML = '<div class="fest-sec" id="festPre"><h3 class="fest-h">Prearmados</h3><p class="hint">Secciones curadas a mano. Tocá una y la programo con sus títulos más representativos, más los parecidos que encuentre. El resultado es una lista más, igual que las que armás vos.</p></div>' +
    groups.map(function (g, i) {
      return '<section class="fest-g" id="fg' + i + '"><h3>' + esc(g[0]) + '</h3><div class="fest-secs">' + g[1].map(function (x) {
        var sample = curSectionFilms(x).slice(0, 4).map(curShownTitle).join(' · ');
        var on = festList(x);
        return '<button type="button" class="fsec" data-fsec="' + esc(x) + '"><span class="fsec-h"><span class="fsec-n">' + esc(L[x]) + '</span><span class="fsec-c">' + counts[x] + '</span></span>' +
          '<span class="fsec-s">' + esc(sample) + '</span>' + (on ? '<span class="fsec-on">Ya lo armaste · abrir</span>' : '') + '</button>';
      }).join('') + '</div></section>';
    }).join('');
}
function openFest() {
  var d = $('#dlgFest');
  (CUR ? Promise.resolve() : loadCuraduria()).then(function () { renderFest(); renderFestDraft(); openDialog(d); d.scrollTop = 0; });
}
/* armar un festival nuevo a mano: nombre opcional y hasta 8 títulos base */
function renderFestDraft() {
  var seeds = state.festDraft;
  $('#festSeeds').innerHTML = seeds.map(function (it) {
    return '<span class="pchip">' + esc(it.t) + (it.y ? ' (' + it.y + ')' : '') + '<button type="button" data-unseed="' + esc(it.k) + '" aria-label="Sacar ' + esc(it.t) + '">' + ICON.x + '</button></span>';
  }).join('');
  $('#festGo').disabled = !seeds.length;
  $('#festGo').textContent = seeds.length ? 'Armar festival con ' + seeds.length + (seeds.length === 1 ? ' título' : ' títulos') : 'Armar festival';
  $('#festTaste').disabled = !tasteSeeds(1).length;
  $('#festTaste').textContent = duoComp() ? 'Con lo que más nos gustó a ' + duoComp().name + ' y a mí' : 'Con lo que más me gustó';
  $('#festTaste').title = $('#festTaste').disabled ? 'Marcá como vistas o puntuá algunas pelis primero' : 'Usa lo que puntuaste con 4 y 5 estrellas';
}
var festSearch = debounce(async function (q) {
  var box = $('#festAc');
  if (q.length < 2) { box.hidden = true; return; }
  try {
    var d = await tmdb('/search/multi', { query: q, language: state.settings.lang, include_adult: 'false' });
    if ($('#festQ').value.trim() !== q) return;
    var res = (d.results || []).filter(function (r) { return (r.media_type === 'movie' || r.media_type === 'tv') && r.id && !r.adult; })
      .slice(0, 7).map(function (r) { return fromCatalog(norm(r, r.media_type)); });
    state.festAc = res;
    box.innerHTML = res.length ? res.map(function (it, i) {
      return '<button class="ac-item" type="button" role="option" data-fseed="' + i + '"><b>' + esc(it.t) + '</b><span>' + esc([it.type === 'tv' ? 'Serie' : 'Película', it.y].filter(Boolean).join(' · ')) + '</span></button>';
    }).join('') : '<p class="ac-empty">No encontré nada con ese nombre.</p>';
    box.hidden = false;
  } catch (e) { if (e.fatal) fatal(e); else toast(e.message); }
}, 300);
function festAddSeed(it) {
  if (!it) return;
  if (state.festDraft.some(function (x) { return x.k === it.k; })) { toast('Ya está entre las pelis base.'); return; }
  if (state.festDraft.length >= 8) { toast('Hasta 8 títulos base.'); return; }
  state.festDraft.push(it); renderFestDraft();
}
function festFromDraft() {
  var seeds = state.festDraft.slice(); if (!seeds.length) return;
  var name = $('#festNameInp').value.trim();
  state.festDraft = []; $('#festNameInp').value = ''; $('#festQ').value = ''; renderFestDraft();
  closeDialog($('#dlgFest'));
  createRadio(seeds, name || null);
}
function festFromTaste() {
  var seeds = tasteSeeds(6); if (!seeds.length) return;
  var name = forYouNames().fest;
  var ex = visibleLists().filter(function (l) { return l.name === name && isRadio(l); })[0];
  closeDialog($('#dlgFest'));
  if (ex) { openList(ex); toast('Ya tenías este festival. Con «Sumar 10 más» le agregás títulos.'); return; }
  createRadio(seeds, name);
}
function openList(l) {
  closeDialog($('#dlgFest')); closeDialog($('#dlgDetail'));
  state.special = null; state.ui.view = 'lists'; state.ui.list = l.id; state.listEdit = null;
  refresh(); window.scrollTo(0, 0);
}
function startSectionFestival(sec, btn) {
  if (!CUR || !btn || btn.disabled) return;
  var ex = festList(sec);
  if (ex) { openList(ex); toast('Ya tenías este festival. Con «Sumar 10 más» le agregás títulos.'); return; }
  var prev = btn.innerHTML, restore = function () { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = prev; };
  btn.disabled = true; btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = btn.classList.contains('fsec') ? '<span class="fsec-n">Eligiendo las pelis base…</span>' : 'Eligiendo las pelis base…';
  curSectionSeeds(sec, 6).then(function (seeds) {
    if (!seeds.length) { toast('No encontré títulos de esa sección en TMDB.'); restore(); return; }
    closeDialog($('#dlgFest'));
    createRadio(seeds, festName(sec));
  }, function (err) { restore(); if (err && err.fatal) fatal(err); else toast(err.message); });
}

/* ---------- recomendaciones ----------
   Para cada semilla junta candidatos de varias fuentes de TMDB (sus recomendaciones,
   títulos similares, la obra de su director y pelis que comparten palabras clave)
   y los puntúa: primero género, después temas y director, al final época y calidad. */
async function seedInfo(seed) {
  var c = state.seedCache[seed.k];
  if (c && Date.now() - c.at < DAY) return c;
  var lang = state.settings.lang, type = seed.type;
  var d = await tmdb('/' + type + '/' + seed.id, { language: lang, append_to_response: 'keywords,credits,recommendations,similar,external_ids,watch/providers' });
  state.details[seed.k] = liteFromFull(d, type); saveCachesSoon();
  var kws = ((type === 'movie' ? dig(d, 'keywords.keywords') : dig(d, 'keywords.results')) || [])
    .filter(function (k) { var n = String(k.name || '').toLowerCase(); return n && !KW_STOP.has(n) && n.indexOf('based on') !== 0; }).slice(0, 8);
  var dirs = (type === 'movie' ? (dig(d, 'credits.crew') || []).filter(function (x) { return x.job === 'Director'; }) : (d.created_by || [])).slice(0, 2);
  var date = d.release_date || d.first_air_date || '';
  var info = { at: Date.now(), k: seed.k, type: type, y: parseInt(date.slice(0, 4), 10) || null, genres: (d.genres || []).map(function (g) { return g.id; }), kws: kws.map(function (k) { return { id: k.id, name: String(k.name) }; }), dirs: dirs.map(function (x) { return { id: x.id, name: String(x.name) }; }) };
  info.cur = curFind({ t: d.title || d.name, ot: d.original_title || d.original_name, y: info.y, type: type }) || curFind(seed);
  var cands = new Map();
  var addIt = function (it, tag) {
    if (!it || it.k === seed.k) return;
    var c2 = cands.get(it.k); if (!c2) { c2 = { it: it, tags: {} }; cands.set(it.k, c2); }
    c2.tags[tag] = 1;
  };
  var add = function (r, t, tag) { if (r && r.id && !r.adult) addIt(norm(r, t), tag); };
  (dig(d, 'recommendations.results') || []).forEach(function (r) { add(r, type, 'rec'); });
  (dig(d, 'similar.results') || []).forEach(function (r) { add(r, type, 'sim'); });
  var soft = function (e) { if (e && e.fatal) throw e; };
  var jobs = [tmdb('/' + type + '/' + seed.id + '/recommendations', { language: lang, page: 2 }).then(function (r) { (r.results || []).forEach(function (x) { add(x, type, 'rec'); }); }, soft)];
  info.dirs.forEach(function (p) {
    jobs.push(loadPersonCredits(p.id).then(function (data) { data.items.forEach(function (it) { if ((data.roles[it.k] || {}).dir) add({ id: it.id, title: it.t, original_title: it.ot, original_language: it.l, release_date: it.y ? it.y + '-01-01' : '', genre_ids: it.g, vote_average: it.v, vote_count: it.vc, popularity: it.pop, poster_path: it.p }, it.type, 'dir:' + p.name); }); }, soft));
  });
  info.kws.forEach(function (kw) {
    jobs.push(tmdb('/discover/' + type, { with_keywords: kw.id, sort_by: 'vote_count.desc', 'vote_count.gte': type === 'movie' ? 60 : 20, include_adult: 'false', language: lang }).then(function (r) { (r.results || []).forEach(function (x) { add(x, type, 'kw:' + kw.name); }); }, soft));
  });
  if (info.genres.length && info.kws.length) {
    jobs.push(tmdb('/discover/' + type, { with_genres: info.genres.slice(0, 2).join(','), with_keywords: info.kws.slice(0, 4).map(function (k) { return k.id; }).join('|'), sort_by: 'vote_average.desc', 'vote_count.gte': type === 'movie' ? 300 : 80, include_adult: 'false', language: lang }).then(function (r) { (r.results || []).forEach(function (x) { add(x, type, 'gk'); }); }, soft));
  }
  if (info.cur) {
    var me = info.cur;
    var neigh = CUR.films.filter(function (f) { return f.id !== me.id; })
      .map(function (f) { return { f: f, s: curSim(me, f) + (curRel(me, f) ? 0.5 : 0) }; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, 18);
    jobs.push(pool(neigh, 4, async function (n) { var it = await curResolve(n.f); if (it) addIt(Object.assign({ s: [] }, it), 'cur'); }).catch(soft));
  }
  await Promise.all(jobs);
  info.cands = Array.from(cands.values()).map(function (x) { return { it: x.it, tags: Object.keys(x.tags) }; });
  if (CUR) state.seedCache[seed.k] = info;
  return info;
}
function scoreCand(c, info) {
  var g = c.it.g || [], sg = info.genres;
  var inter = g.filter(function (x) { return sg.indexOf(x) >= 0; }).length;
  var union = new Set(g.concat(sg)).size || 1;
  var genre = 0.6 * (inter / union) + 0.4 * (sg.length && g.indexOf(sg[0]) >= 0 ? 1 : 0);
  var kw = c.tags.filter(function (t) { return t.indexOf('kw:') === 0; }).map(function (t) { return t.slice(3); });
  var dir = c.tags.filter(function (t) { return t.indexOf('dir:') === 0; }).map(function (t) { return t.slice(4); })[0] || null;
  var gk = c.tags.indexOf('gk') >= 0, rec = c.tags.indexOf('rec') >= 0, sim = c.tags.indexOf('sim') >= 0;
  var theme = Math.min(1, kw.length / 3 + (gk ? 0.34 : 0));
  var recS = Math.min(1, (rec ? 0.7 : 0) + (sim ? 0.3 : 0));
  var era = c.it.y && info.y ? 1 - Math.min(1, Math.abs(c.it.y - info.y) / 40) : 0.5;
  var q = Math.max(0, Math.min(1, ((c.it.v || 0) - 5.5) / 3)) * Math.min(1, (c.it.vc || 0) / 400);
  var s = 0.32 * genre + 0.24 * theme + 0.16 * (dir ? 1 : 0) + 0.14 * recS + 0.06 * era + 0.08 * q;
  if (!inter) s *= 0.5;
  if ((c.it.vc || 0) < 30) s *= 0.6;
  var shared = [], relFlag = false;
  if (info.cur) {
    var cc = curFind(c.it);
    if (cc) {
      relFlag = curRel(info.cur, cc);
      shared = curShared(info.cur, cc);
      s = 0.45 * s + 0.4 * curSim(info.cur, cc) + (relFlag ? 0.2 : 0);
    } else s *= 0.85;
  }
  return { s: s, kw: kw, dir: dir, rec: rec || sim, genre: inter > 0, cur: shared, relFlag: relFlag };
}
async function recommend(seeds, progress) {
  var infos = [];
  for (var i = 0; i < seeds.length; i++) {
    if (progress) progress('analizando ' + seeds[i].t + '…');
    infos.push(await seedInfo(seeds[i]));
  }
  var seedKeys = new Set(seeds.map(function (s) { return s.k; }));
  var prof = tasteProfile();
  var agg = new Map();
  infos.forEach(function (info) {
    info.cands.forEach(function (c) {
      if (seedKeys.has(c.it.k)) return;
      var r = scoreCand(c, info);
      var a = agg.get(c.it.k);
      if (!a) { a = { it: c.it, sum: 0, hits: 0, kws: {}, dirs: {}, cur: {}, rel: false, rec: false, genre: false }; agg.set(c.it.k, a); }
      a.sum += r.s; if (r.s > 0.35) a.hits++;
      r.kw.forEach(function (k) { a.kws[k] = 1; }); if (r.dir) a.dirs[r.dir] = 1; if (r.rec) a.rec = true; if (r.genre) a.genre = true;
      r.cur.forEach(function (x) { a.cur[x] = 1; }); if (r.relFlag) a.rel = true;
    });
  });
  var out = [];
  var duo = duoComp();
  agg.forEach(function (a) {
    if (lowNow(a.it.k) || isHidden(a.it.k) || (state.f.noIndia && isIndian(a.it))) return;
    var parts = [], dirs = Object.keys(a.dirs), kws = Object.keys(a.kws), cur = Object.keys(a.cur);
    var ta = tasteAdj(a.it, prof, dirs, seedKeys), dn = duoNote(a.it.k);
    if (dn) { parts.push(dn); if (/encantó/.test(dn)) ta.d += 0.05; }
    if (ta.because) parts.push(becauseText(ta.because));
    if (a.rel) parts.push('Pariente directo');
    if (dirs.length) parts.push('De ' + dirs.slice(0, 2).join(' y '));
    if (cur.length) parts.push('Comparte: ' + cur.slice(0, 3).join(', '));
    else if (kws.length) parts.push('Temas: ' + kws.slice(0, 3).join(', '));
    if (a.rec && !cur.length) parts.push('TMDB la recomienda');
    if (!parts.length && a.genre) parts.push('Mismo género');
    out.push({ it: fromCatalog(a.it), match: a.sum / infos.length + 0.08 * Math.max(0, a.hits - 1) + ta.d, why: parts.slice(0, 3).join(' · ') });
  });
  /* de a dos: las semillas que vio uno solo y le gustaron también valen, para verlas juntos */
  if (duo && out.length) {
    var topM = Math.max.apply(null, out.map(function (x) { return x.match; }));
    seeds.forEach(function (sd) {
      var k = sd.k, a2 = iSaw(k), b2 = compSeen(duo, k);
      if (a2 === b2 || lowNow(k) || Math.max(starOf(k), compStar(duo, k)) < 4) return;
      out.push({ it: fromCatalog(sd), match: topM * 0.95, why: duoNote(k) });
    });
  }
  out.sort(function (x, y) { return y.match - x.match; });
  return out.slice(0, 120);
}
async function openReco(seeds, opts) {
  opts = opts || {};
  seeds = seeds.filter(Boolean).slice(0, 8);
  if (!seeds.length) return;
  closeDialog($('#dlgDetail')); closeDialog($('#dlgFest')); closeMenu(); closeRail();
  var title = opts.title || (seeds.length === 1 ? 'Parecidas a ' + seeds[0].t : 'Parecidas a tu selección');
  clearQuery();
  var sp = state.special = { kind: 'reco', title: title, festName: opts.festName || null, seeds: seeds, items: [], meta: new Map(), loading: true };
  state.ui.sortReco = 'match';
  refresh(); window.scrollTo(0, 0);
  try {
    var recs = await recommend(seeds, function (msg) { if (state.special === sp) { sp.progress = msg; renderCount(); } });
    if (state.special !== sp) return;
    sp.items = recs.map(function (r) { sp.meta.set(r.it.k, { match: r.match, why: r.why }); return r.it; });
    sp.loading = false;
    refresh();
    wantDetails(sp.items.slice(0, 80), 'lo');
  } catch (e) {
    if (e.fatal) { fatal(e); return; }
    if (state.special === sp) { sp.loading = false; sp.error = e.message; refresh(); }
  }
}

/* ---------- tu gusto ----------
   Las vistas y las estrellas arman un perfil: 5★ y 4★ suman, 2★ y 1★ restan, 3★ es neutro
   y una vista sin puntaje suma poquito. Ese perfil corrige el puntaje de cada recomendación
   (y de cada festival) según los géneros que te gustan, el parecido con lo que puntuaste
   alto o bajo (por la curaduría) y los directores de lo que te gustó. Pesa más cuantas
   más pelis puntuaste. */
/* 1 mala, 2 decente, 3 buena, 4 excelente, 5 increíble */
var TASTE_W = [0, -1, -0.3, 0.35, 0.75, 1];
/* ---------- de a dos ----------
   Gusto de otra persona guardado en este dispositivo (llega por un link que genera su
   WatchListo, o se arma a mano marcando en cada ficha lo que vio). Con el modo "de a dos"
   activo: se oculta solo lo que vieron los dos, lo que vio uno solo puede volver a salir
   (salvo que lo haya puntuado mal), y el perfil de gusto combina a los dos: lo que les
   gustó a ambos pesa más, y lo que a uno no le gustó resta aunque el otro no lo haya visto. */
var COMP = loadComps();
function loadComps() {
  var raw = LS.get('companions', []);
  return (Array.isArray(raw) ? raw : []).map(cleanComp).filter(Boolean).slice(0, 8);
}
function cleanComp(c) {
  if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !/^c:[a-z0-9-]{1,40}$/.test(c.id)) return null;
  var out = { id: c.id, name: String(c.name || 'Alguien').slice(0, 30), at: +c.at || 0, src: c.src === 'link' ? 'link' : 'manual', seen: tsMap(c.seen), stars: {}, items: {} };
  if (c.stars && typeof c.stars === 'object') Object.keys(c.stars).forEach(function (k) { var n = Math.round(+c.stars[k]); if (validKey(k) && n >= 1 && n <= 5) out.stars[k] = n; });
  if (c.items && typeof c.items === 'object') Object.keys(c.items).forEach(function (k) { if (validKey(k)) { var it = cleanSnap(c.items[k], k); if (it) out.items[k] = it; } });
  return out;
}
function saveComps() { LS.set('companions', COMP); }
/* gente para ver de a dos: la cargada en este dispositivo y los watch buddies de tu cuenta */
function allComps() { return COMP.concat(CLOUD && CLOUD.buddies ? CLOUD.buddies : []); }
var duoState = LS.get('duo', null);
state.duo = duoState && typeof duoState.id === 'string' && +duoState.until > Date.now() && COMP.some(function (c) { return c.id === duoState.id; }) ? duoState.id : null;
function duoComp() { return state.duo ? allComps().filter(function (c) { return c.id === state.duo; })[0] || null : null; }
function setDuo(id) {
  state.duo = id && allComps().some(function (c) { return c.id === id; }) ? id : null;
  if (state.duo) LS.set('duo', { id: state.duo, until: Date.now() + 10 * 3600 * 1000 }); else LS.del('duo');
  renderDuoBtn(); refresh();
}
function compSeen(c, k) { return !!(c && (c.seen[k] || c.stars[k])); }
function compStar(c, k) { return c ? c.stars[k] || 0 : 0; }
function iSaw(k) { return isSeen(k) || starOf(k) > 0; }
/* con el modo de a dos, "vista" es vista por los dos */
function seenNow(k) { var c = duoComp(); return c ? isSeen(k) && compSeen(c, k) : isSeen(k); }
function lowNow(k) { var a = starOf(k), c = duoComp(), b = compStar(c, k); return (a > 0 && a <= 2) || (b > 0 && b <= 2); }
function itemFor(k) {
  var type = typeOfKey(k), idx = catIndex(type), hit = idx && idx.get(k);
  if (hit) return hit;
  if (state.user.items[k]) return resolveItem(k);
  var cs = allComps(); for (var i = 0; i < cs.length; i++) if (cs[i].items[k]) return Object.assign({}, cs[i].items[k], { s: [], off: !!state.catalogs[type] });
  return resolveItem(k);
}
function duoNote(k) {
  var c = duoComp(); if (!c) return '';
  var a = iSaw(k), b = compSeen(c, k); if (a === b) return '';
  if (a) return starOf(k) >= 4 ? 'Ya la viste y te encantó; ' + c.name + ' no la vio' : 'Ya la viste; ' + c.name + ' no';
  return compStar(c, k) >= 4 ? c.name + ' la vio y le encantó; vos no' : c.name + ' ya la vio; vos no';
}
function mySignals() {
  var u = state.user, out = new Map();
  Object.keys(u.stars).filter(function (k) { return starOf(k) > 0; }).concat(seenKeys()).forEach(function (k) {
    if (out.has(k) || !u.items[k]) return;
    var n = starOf(k);
    out.set(k, { k: k, n: n, w: n ? TASTE_W[n] : 0.15, it: u.items[k], at: n ? u.stars[k].at : (u.seen[k] || 0) });
  });
  return out;
}
function compSignals(c) {
  var out = new Map();
  Object.keys(c.stars).concat(Object.keys(c.seen)).forEach(function (k) {
    if (out.has(k)) return;
    var n = c.stars[k] || 0, it = c.items[k] || state.user.items[k]; if (!it) return;
    out.set(k, { k: k, n: n, w: n ? TASTE_W[n] : 0.15, it: it, at: c.seen[k] || c.at || 0 });
  });
  return out;
}
/* señales con las que se arma el perfil: las tuyas o, de a dos, la combinación */
function tasteSignals() {
  var mine = mySignals(), c = duoComp();
  /* lo que ocultaste con «No me interesa» cuenta como un no suave */
  hiddenKeys().forEach(function (k) { if (!mine.has(k) && state.user.items[k]) mine.set(k, { k: k, n: 0, w: -0.5, it: state.user.items[k], at: state.user.hidden[k], hidden: true }); });
  if (!c) return Array.from(mine.values()).map(function (s) { s.who = 'me'; return s; });
  var theirs = compSignals(c), keys = new Set(Array.from(mine.keys()).concat(Array.from(theirs.keys()))), out = [];
  keys.forEach(function (k) {
    var a = mine.get(k), b = theirs.get(k), w, who;
    if (a && b) {
      who = 'both';
      if (a.w >= 0.6 && b.w >= 0.6) w = 1.2;
      else if (a.w < 0 || b.w < 0) w = Math.min(a.w, b.w);
      else w = (a.w + b.w) / 2;
    } else { var x = a || b; who = a ? 'me' : 'them'; w = x.w < 0 ? x.w : x.w * 0.6; }
    var s = a || b;
    out.push({ k: k, n: Math.max(a ? a.n : 0, b ? b.n : 0), w: w, it: s.it, at: Math.max(a ? a.at : 0, b ? b.at : 0), who: who, hidden: !!(a && a.hidden && !b) });
  });
  return out;
}
function tasteProfile() {
  var sig = tasteSignals(), duo = !!duoComp();
  var p = { genres: {}, dirs: {}, liked: [], disliked: [], rated: 0, seenOnly: 0, conf: 0, duo: duo };
  sig.forEach(function (s) {
    if (s.hidden) p.hiddenN = (p.hiddenN || 0) + 1; else if (s.n) p.rated++; else p.seenOnly++;
    var w = s.w; if (!w) return;
    (s.it.g || []).forEach(function (g) { p.genres[g] = (p.genres[g] || 0) + w; });
    var info = state.seedCache[s.k];
    if (info) info.dirs.forEach(function (d) { p.dirs[d.name] = (p.dirs[d.name] || 0) + w; });
    var e = { it: s.it, w: w, cf: curFind(s.it), at: s.at, who: s.who };
    if (w >= (duo ? 0.36 : 0.6)) p.liked.push(e); else if (w < 0) p.disliked.push(e);
  });
  var mx = 0; Object.keys(p.genres).forEach(function (g) { mx = Math.max(mx, Math.abs(p.genres[g])); });
  if (mx) Object.keys(p.genres).forEach(function (g) { p.genres[g] /= mx; });
  var rank = function (a, b) { return b.w - a.w || b.at - a.at; };
  p.liked = p.liked.sort(rank).slice(0, 80); p.disliked = p.disliked.sort(rank).slice(0, 80);
  p.conf = Math.min(1, (p.rated + 0.3 * p.seenOnly) / (duo ? 12 : 8));
  return p;
}
function becauseText(b) {
  if (!b) return '';
  var c = duoComp();
  if (b.who === 'both') return 'Porque a los dos les gustó ' + b.t;
  if (b.who === 'them' && c) return 'Porque a ' + c.name + ' le gustó ' + b.t;
  return 'Porque te gustó ' + b.t;
}
function tasteAdj(it, p, dirs, seedKeys) {
  if (!p || !p.conf) return { d: 0, because: null };
  var g = it.g || [], gs = 0;
  g.forEach(function (x) { gs += p.genres[x] || 0; });
  var d = 0.08 * (g.length ? gs / g.length : 0), because = null;
  var cf = curFind(it);
  if (cf) {
    var near = function (l) { return Math.min(1, curSim(l.cf, cf) + (curRel(l.cf, cf) ? 0.3 : 0)); };
    var best = 0, worst = 0;
    p.liked.forEach(function (l) {
      if (!l.cf || l.cf.id === cf.id) return;
      var s = near(l) * Math.min(1, l.w);
      if (s > best) { best = s; because = s >= 0.35 && !(seedKeys && seedKeys.has(l.it.k)) ? { t: l.it.t, who: l.who } : null; }
    });
    p.disliked.forEach(function (l) { if (!l.cf || l.cf.id === cf.id) return; var s = near(l) * -l.w; if (s > worst) worst = s; });
    d += 0.16 * best - 0.16 * worst;
  }
  (dirs || []).forEach(function (n) { var w = p.dirs[n]; if (w) d += 0.05 * Math.max(-1, Math.min(1, w)); });
  return { d: d * p.conf, because: because };
}
/* semillas para "Para vos" / "Para los dos": lo mejor puntuado, sin repetir demasiado el mismo género */
function tasteSeeds(n) {
  var duo = !!duoComp();
  var sig = tasteSignals().filter(function (s) { return s.w >= (duo ? 0.36 : 0.6); }).sort(function (a, b) { return b.w - a.w || b.at - a.at; });
  if (sig.length < 3) tasteSignals().forEach(function (s) { if (!s.n && s.w > 0 && sig.indexOf(s) < 0) sig.push(s); });
  var out = [], perGenre = {}, rest = [];
  sig.forEach(function (s) {
    var g = (s.it.g || [])[0] || 0;
    if (out.length < n && (perGenre[g] || 0) < 2) { out.push(s.k); perGenre[g] = (perGenre[g] || 0) + 1; } else rest.push(s.k);
  });
  rest.forEach(function (k) { if (out.length < n) out.push(k); });
  return out.map(itemFor);
}
function forYouNames() { var c = duoComp(); return c ? { title: 'Para vos y ' + c.name, fest: ('Festival con ' + c.name).slice(0, 40) } : { title: 'Para vos', fest: 'Festival a tu gusto' }; }
function openForYou() {
  var seeds = tasteSeeds(6);
  if (!seeds.length) { toast(duoComp() ? 'Todavía no tengo vistas ni puntajes de ninguno de los dos.' : 'Marcá como vistas o puntuá algunas y te recomiendo según eso.'); return; }
  var nm = forYouNames();
  openReco(seeds, { title: nm.title, festName: nm.fest });
}

/* --- compartir e importar el gusto (link con vistas y estrellas, comprimido; sin claves ni listas) --- */
function b64url(bytes) { var s = ''; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64url(str) { var s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)), out = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
function compId(name) { return 'c:' + (fold(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'alguien'); }
async function packTaste(name) {
  var rows = [];
  mySignals().forEach(function (s) { var it = s.it; rows.push([s.k, isSeen(s.k) ? 1 : 0, s.n, it.y || 0, (it.g || []).slice(0, 4), String(it.t || '').slice(0, 80), it.l || '', s.at]); });
  rows.sort(function (a, b) { return b[7] - a[7]; });
  var json = JSON.stringify({ v: 1, n: String(name || '').trim().slice(0, 30) || 'Alguien', at: Date.now(), e: rows.slice(0, 1500).map(function (r) { return r.slice(0, 7); }) });
  var bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'function') {
    try { return 'z' + b64url(new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())); } catch (e) {}
  }
  return 'u' + b64url(bytes);
}
async function unpackTaste(text) {
  var code = String(text || '').trim(), m = code.match(/taste=([A-Za-z0-9_-]+)/); if (m) code = m[1];
  var bad = function (msg) { return new Error(msg || 'El link está cortado o incompleto.'); };
  if (!/^[zu][A-Za-z0-9_-]{8,}$/.test(code) || code.length > 400000) throw bad('Eso no parece un link de gusto de WatchListo.');
  var bytes;
  try { bytes = unb64url(code.slice(1)); } catch (e) { throw bad(); }
  if (code.charAt(0) === 'z') {
    if (typeof DecompressionStream !== 'function') throw bad('Este navegador no puede leer ese link. Probá desde Chrome.');
    try {
      var reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(), parts = [], total = 0;
      for (;;) { var r = await reader.read(); if (r.done) break; total += r.value.length; if (total > 4e6) { reader.cancel(); throw bad(); } parts.push(r.value); }
      bytes = new Uint8Array(total); var off = 0; parts.forEach(function (p) { bytes.set(p, off); off += p.length; });
    } catch (e) { throw bad(); }
  }
  var obj; try { obj = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { throw bad(); }
  if (!obj || obj.v !== 1 || !Array.isArray(obj.e)) throw bad('Eso no parece un link de gusto de WatchListo.');
  var name = String(obj.n || 'Alguien').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 30) || 'Alguien';
  var at = Math.min(+obj.at || Date.now(), Date.now());
  var c = { id: compId(name), name: name, at: at, src: 'link', seen: {}, stars: {}, items: {} };
  obj.e.slice(0, 3000).forEach(function (r) {
    if (!Array.isArray(r) || !validKey(r[0])) return;
    var k = r[0], n = Math.round(+r[2]) || 0;
    if (r[1] || n) c.seen[k] = at;
    if (n >= 1 && n <= 5) c.stars[k] = n;
    var snap = cleanSnap({ t: String(r[5] || '').slice(0, 120), y: +r[3] || null, g: Array.isArray(r[4]) ? r[4].map(Number).filter(function (x) { return isFinite(x); }).slice(0, 6) : [], l: typeof r[6] === 'string' ? r[6] : '' }, k);
    if (snap) c.items[k] = snap;
  });
  if (!Object.keys(c.seen).length) throw bad('Ese gusto viene vacío: no tiene vistas ni puntajes.');
  return c;
}
function upsertComp(c) {
  var i = -1; COMP.forEach(function (x, j) { if (x.id === c.id) i = j; });
  if (i >= 0) COMP[i] = c; else { if (COMP.length >= 8) COMP.shift(); COMP.push(c); }
  saveComps();
}
function readTasteHash() {
  var h = location.hash || ''; if (h.indexOf('#taste=') !== 0) return;
  try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
  unpackTaste(h.slice(7)).then(function (c) { state.duoImport = c; openDuo(); }, function (e) { toast(e.message); });
}

/* --- diálogo "De a dos" --- */
var DUO_ICON = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.8-3.2 3.1-5 6-5s5.2 1.8 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.2c2.4.2 4 1.8 4.5 4.8"/></svg>';
function renderDuoBtn() {
  var b = $('#duoBtn'); if (!b) return; var c = duoComp();
  b.classList.toggle('on', !!c);
  b.innerHTML = DUO_ICON + (c ? '<span>' + esc(c.name) + '</span>' : '');
  b.setAttribute('aria-label', c ? 'Viendo con ' + c.name + '. Abrir De a dos' : 'Ver de a dos');
  b.title = c ? 'Viendo con ' + c.name : 'Ver de a dos';
}
function openDuo() { closeMenu(); closeRail(); renderDuo(); openDialog($('#dlgDuo')); $('#dlgDuo').scrollTop = 0; if (cloudIn() && CLOUD.buddies.some(function (c) { return c.pending; })) { CLOUD.retries = 0; loadBuddies(); } }
function duoTitles(keys, n) { return keys.slice(0, n || 6).map(function (k) { return esc(itemFor(k).t); }).join(' · '); }
function duoSummary(c) {
  var A = new Set(mySignals().keys()), B = new Set(Object.keys(c.seen).concat(Object.keys(c.stars)));
  var common = Array.from(A).filter(function (k) { return B.has(k); });
  var both = common.filter(function (k) { return starOf(k) >= 4 && compStar(c, k) >= 4; }).sort(function (x, y) { return starOf(y) + compStar(c, y) - starOf(x) - compStar(c, x); });
  var clash = common.filter(function (k) { var a = starOf(k), b = compStar(c, k); return a && b && Math.abs(a - b) >= 3; });
  var forThem = Array.from(A).filter(function (k) { return !B.has(k) && starOf(k) >= 4; }).sort(function (x, y) { return starOf(y) - starOf(x); });
  var forMe = Array.from(B).filter(function (k) { return !A.has(k) && compStar(c, k) >= 4; }).sort(function (x, y) { return compStar(c, y) - compStar(c, x); });
  var nm = esc(c.name.length > 12 ? c.name.slice(0, 11) + '…' : c.name);
  var venn = '<svg class="venn" viewBox="0 0 320 150" role="img" aria-label="Vistas: vos ' + A.size + ', ' + esc(c.name) + ' ' + B.size + ', en común ' + common.length + '">' +
    '<circle class="va" cx="124" cy="75" r="68"/><circle class="vb" cx="196" cy="75" r="68"/>' +
    '<text class="vl" x="86" y="64">Vos</text><text class="vn" x="86" y="92">' + (A.size - common.length) + '</text>' +
    '<text class="vn" x="160" y="84">' + common.length + '</text><text class="vs" x="160" y="102">en común</text>' +
    '<text class="vl" x="234" y="64">' + nm + '</text><text class="vn" x="234" y="92">' + (B.size - common.length) + '</text></svg>';
  var line = function (label, keys, empty) { return '<p class="duo-line"><b>' + label + '</b> ' + (keys.length ? duoTitles(keys) + (keys.length > 6 ? ' y ' + (keys.length - 6) + ' más' : '') : '<span class="muted">' + empty + '</span>') + '</p>'; };
  return '<section class="duo-sec"><div class="duo-venn">' + venn + '<div class="duo-lines">' +
    line('A los dos les encantaron:', both, 'Todavía ninguna en común con 4 o 5 estrellas.') +
    (clash.length ? line('No coinciden en:', clash, '') : '') +
    line('Para mostrarle a ' + esc(c.name) + ':', forThem, 'Puntuá con 4 o 5 las que te encantaron.') +
    line('Para que ' + esc(c.name) + ' te muestre:', forMe, 'No hay de las que le encantaron que no hayas visto.') +
    '</div></div><p class="hint">Mientras estén de a dos: se esconde solo lo que vieron los dos, lo que vio uno solo puede volver a aparecer (salvo que lo haya puntuado mal) y las recomendaciones mezclan los dos gustos, con más peso en lo que les gustó a ambos.</p>' +
    '<div class="fest-row"><button class="btn btn-accent" type="button" data-duo="foryou">Recomendaciones para los dos</button><button class="btn" type="button" data-duo="fest">Armar festival juntos</button><button class="btn" type="button" data-duo="guide">Que elija el acomodador</button></div></section>';
}
function buddiesHTML() {
  if (!cloudIn()) return '<section class="duo-sec"><h3 class="fest-h">Watch buddies</h3><p class="hint">Con tu cuenta de Google, tus buddies ven tu gusto y vos el de ellos sin pasarse links, y pueden tener listas y festivales compartidos.</p>' + cloudCardHTML() + '</section>';
  var bs = CLOUD.buddies;
  return '<section class="duo-sec"><h3 class="fest-h">Watch buddies</h3>' + (bs.length ? '<ul class="duo-people">' + bs.map(function (b) {
    return '<li><span><b>' + esc(b.name) + '</b><small>' + (b.pending ? 'Esperando que acepte' : nf.format(Object.keys(b.seen).length) + ' vistas · se actualiza solo') + '</small></span>' +
      '<button class="btn btn-ghost" type="button" data-duo="bremove" data-v="' + esc(b.uid) + '">' + (state.duoDel === b.uid ? 'Confirmar' : 'Quitar') + '</button></li>';
  }).join('') + '</ul>' : '<p class="hint">Todavía no tenés buddies. Invitá a alguien: le llega un link, entra con su Google y listo.</p>') +
    '<p class="hint">Cada uno decide quién ve su gusto: quitar a alguien le corta el acceso al tuyo.</p><div class="fest-row"><button class="btn btn-accent" type="button" data-duo="binvite">' + DUO_ICON + 'Invitar a un buddy</button></div></section>';
}
function renderDuo() {
  var c = duoComp(), imp = state.duoImport, h = '';
  var offer = state.buddyOffer;
  if (offer) h += '<div class="duo-imp"><p><b>' + esc(offer.name) + '</b> te invitó a ser su watch buddy. Al aceptar, cada uno ve lo que vio y puntuó el otro, y pueden compartir listas y festivales.</p><div class="fest-row"><button class="btn btn-accent" type="button" data-duo="baccept">Aceptar</button><button class="btn btn-ghost" type="button" data-duo="bdecline">Ahora no</button></div></div>';
  else if (CLOUD.pendingBuddy && !cloudIn()) h += '<div class="duo-imp"><p>Te invitaron a ser watch buddy. Entrá con tu cuenta de Google para aceptar.</p>' + cloudCardHTML() + '</div>';
  if (imp) {
    var ex = COMP.some(function (x) { return x.id === imp.id; });
    h += '<div class="duo-imp"><p><b>' + esc(imp.name) + '</b> te mandó su gusto: ' + nf.format(Object.keys(imp.seen).length) + ' vistas, ' + nf.format(Object.keys(imp.stars).length) + ' con estrellas.' + (ex ? ' Reemplaza al que ya tenías guardado con ese nombre.' : '') + '</p>' +
      '<div class="fest-row"><button class="btn btn-accent" type="button" data-duo="save">Guardar y ver con ' + esc(imp.name) + '</button><button class="btn btn-ghost" type="button" data-duo="discard">Ahora no</button></div></div>';
  }
  h += '<section class="duo-sec"><h3 class="fest-h">¿Con quién estás?</h3><div class="g-chips"><button class="g-chip" type="button" data-duo="with" data-v="" aria-pressed="' + !c + '">Solo</button>' +
    allComps().map(function (x) { return '<button class="g-chip" type="button" data-duo="with" data-v="' + esc(x.id) + '" aria-pressed="' + (!!c && c.id === x.id) + '"' + (x.pending ? ' disabled title="Todavía no aceptó"' : '') + '>Con ' + esc(x.name) + '</button>'; }).join('') + '</div>' +
    (allComps().length ? '' : '<p class="hint">Todavía no hay nadie. Más abajo podés sumar a alguien.</p>') + '</section>';
  if (c) h += duoSummary(c);
  h += buddiesHTML();
  if (COMP.length) h += '<section class="duo-sec"><h3 class="fest-h">Gente guardada en este dispositivo</h3><ul class="duo-people">' + COMP.map(function (x) {
    var n = Object.keys(x.seen).length, d = x.at ? new Date(x.at).toLocaleDateString('es-AR') : '';
    return '<li><span><b>' + esc(x.name) + '</b><small>' + nf.format(n) + ' vistas · ' + (x.src === 'link' ? 'por link del ' + d : 'marcado a mano') + '</small></span>' +
      '<button class="btn btn-ghost" type="button" data-duo="del" data-v="' + esc(x.id) + '">' + (state.duoDel === x.id ? 'Confirmar' : 'Borrar') + '</button></li>';
  }).join('') + '</ul><p class="hint">Se guardan solo en este dispositivo. Si te mandan un link nuevo, se actualiza.</p></section>';
  h += '<section class="duo-sec"><h3 class="fest-h">Sumar a alguien</h3>' +
    '<p class="hint">Si usa WatchListo: que abra <b>De a dos</b>, toque <b>Compartir mi gusto</b> y te mande el link. Lo abrís en este dispositivo o lo pegás acá:</p>' +
    '<div class="fest-form"><label class="sr" for="duoPaste">Link de gusto</label><textarea class="inp" id="duoPaste" rows="2" placeholder="Pegá el link que te mandaron"></textarea><div class="fest-row"><button class="btn" type="button" data-duo="paste">Leer link</button></div></div>' +
    '<p class="hint">Si no usa WatchListo: creale un perfil y, con el modo de a dos activo, marcá en cada ficha lo que vio y cuánto le gustó.</p>' +
    '<div class="duo-new"><label class="sr" for="duoNewName">Nombre</label><input class="inp" id="duoNewName" maxlength="30" placeholder="Nombre" autocomplete="off"><button class="btn" type="button" data-duo="new">Crear perfil</button></div></section>';
  h += '<section class="duo-sec"><h3 class="fest-h">Compartir mi gusto</h3><p class="hint">Arma un link con lo que viste y tus estrellas, sin claves ni listas, para que otra persona lo cargue en su WatchListo.</p>' +
    '<div class="duo-new"><label class="sr" for="duoMyName">Tu nombre</label><input class="inp" id="duoMyName" maxlength="30" placeholder="Tu nombre" autocomplete="off" value="' + esc(state.settings.myName || '') + '"><button class="btn btn-accent" type="button" data-duo="share">Compartir mi gusto</button></div>' +
    '<label class="sr" for="duoOut">Link para compartir</label><textarea class="inp" id="duoOut" rows="3" readonly hidden></textarea></section>';
  $('#duoBody').innerHTML = h;
}
async function duoAct(act, v, btn) {
  if (act === 'binvite') { await buddyInvite(btn); return; }
  if (act === 'baccept') { await buddyAccept(); return; }
  if (act === 'bdecline') { state.buddyOffer = null; renderDuo(); return; }
  if (act === 'bremove') {
    if (state.duoDel !== v) { state.duoDel = v; renderDuo(); setTimeout(function () { if (state.duoDel === v) { state.duoDel = null; if ($('#dlgDuo').open) renderDuo(); } }, 4000); return; }
    state.duoDel = null; await buddyRemove(v).catch(function () { toast('No pude quitarlo.'); }); return;
  }
  if (act === 'with') { setDuo(v || null); renderDuo(); return; }
  if (act === 'save') { var c = state.duoImport; state.duoImport = null; if (c) { upsertComp(c); setDuo(c.id); toast('Listo, ahora están de a dos con ' + c.name + '.'); } renderDuo(); return; }
  if (act === 'discard') { state.duoImport = null; renderDuo(); return; }
  if (act === 'del') {
    if (state.duoDel !== v) { state.duoDel = v; renderDuo(); setTimeout(function () { if (state.duoDel === v) { state.duoDel = null; if ($('#dlgDuo').open) renderDuo(); } }, 4000); return; }
    state.duoDel = null; COMP = COMP.filter(function (x) { return x.id !== v; }); saveComps(); if (state.duo === v) setDuo(null); renderDuo(); return;
  }
  if (act === 'paste') {
    try { state.duoImport = await unpackTaste($('#duoPaste').value); renderDuo(); $('#dlgDuo').scrollTop = 0; }
    catch (e) { toast(e.message); }
    return;
  }
  if (act === 'new') {
    var name = $('#duoNewName').value.replace(/[<>]/g, '').trim().slice(0, 30); if (!name) { $('#duoNewName').focus(); return; }
    var id = compId(name);
    if (!COMP.some(function (x) { return x.id === id; })) upsertComp({ id: id, name: name, at: Date.now(), src: 'manual', seen: {}, stars: {}, items: {} });
    setDuo(id); renderDuo(); toast('Perfil de ' + name + ' creado. Marcá en cada ficha lo que vio.'); return;
  }
  if (act === 'share') {
    var my = $('#duoMyName').value.replace(/[<>]/g, '').trim().slice(0, 30);
    if (!my) { toast('Poné tu nombre así la otra persona sabe de quién es.'); $('#duoMyName').focus(); return; }
    if (!mySignals().size) { toast('Todavía no marcaste nada como visto.'); return; }
    state.settings.myName = my; saveSettings();
    btn.disabled = true;
    try {
      var url = location.origin + location.pathname + '#taste=' + await packTaste(my);
      var out = $('#duoOut'); out.value = url; out.hidden = false;
      if (navigator.share) { try { await navigator.share({ title: 'Mi gusto en WatchListo', text: 'Mi gusto en WatchListo, para elegir qué ver juntos:', url: url }); } catch (e) { if (e && e.name !== 'AbortError') out.select(); } }
      else { try { await navigator.clipboard.writeText(url); toast('Link copiado. Mandáselo por donde quieras.'); } catch (e) { out.select(); toast('Copiá el link de abajo.'); } }
    } finally { btn.disabled = false; }
    return;
  }
  if (act === 'foryou') { closeDialog($('#dlgDuo')); openForYou(); return; }
  if (act === 'fest') { closeDialog($('#dlgDuo')); festFromTaste(); return; }
  if (act === 'guide') { closeDialog($('#dlgDuo')); state.guide = null; openGuide(); return; }
}
/* en la ficha, con el modo de a dos: marcar lo que vio la otra persona */
function compToggleSeen(it) {
  var c = duoComp(); if (!c) return;
  if (compSeen(c, it.k)) { delete c.seen[it.k]; delete c.stars[it.k]; }
  else { c.seen[it.k] = Date.now(); c.items[it.k] = snapshot(it); }
  saveComps();
}
function compSetStar(it, n) {
  var c = duoComp(); if (!c) return;
  if (!n || c.stars[it.k] === n) delete c.stars[it.k]; else c.stars[it.k] = n;
  if (n) c.seen[it.k] = c.seen[it.k] || Date.now();
  c.items[it.k] = snapshot(it); saveComps();
}

/* ---------- rumbo de un festival ----------
   Cada título tiene etiquetas: las de la curaduría si está en la base (subgénero, temas,
   tono) o, si no, las que salen de sus géneros de TMDB. El festival muestra las de sus pelis
   base; sacar una deja afuera los títulos en los que lo que sacaste pesa más que lo que
   dejaste. Ej.: base La lista de Schindler (histórico, bélico, drama) sin "bélico": se van
   las de guerra y acción, se quedan los dramas de guerra. Es reversible: no borra nada,
   oculta y orienta lo que se suma después. */
var GENRE_SUB = { 28: 'accion', 12: 'aventura', 16: 'animacion', 35: 'humor', 80: 'policial', 99: 'documental', 18: 'drama', 14: 'fantasia', 36: 'historico', 10402: 'musical', 10749: 'romance', 878: 'scifi', 53: 'thriller', 10752: 'belico', 37: 'western', 10759: 'accion', 10765: 'scifi', 10768: 'belico' };
var SKIP_GENRES = { 10770: 1, 10762: 1, 10763: 1, 10764: 1, 10766: 1, 10767: 1 };
function itemLabels(it) {
  var cf = curFind(it);
  if (cf) return { main: cf.sub.map(function (x) { return 's:' + x; }), rest: cf.tem.map(function (x) { return 't:' + x; }).concat(cf.ton.map(function (x) { return 'o:' + x; })) };
  var main = [];
  (it.g || []).forEach(function (g) { if (SKIP_GENRES[g]) return; var s = GENRE_SUB[g], key = s ? 's:' + s : 'g:' + g; if (main.indexOf(key) < 0) main.push(key); });
  return { main: main, rest: [] };
}
function labelName(key) {
  var p = key.slice(0, 1), v = key.slice(2), L = CUR && CUR.labels;
  if (p === 'g') { var id = +v; return state.genres.movie.get(id) || state.genres.tv.get(id) || 'Género ' + v; }
  var map = L ? (p === 's' ? L.sub : p === 't' ? L.tem : L.ton) : null;
  var n = map && map[v] ? map[v] : v.replace(/-/g, ' ');
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function rumboOf(l) {
  if (!l || !l.tags) return null;
  var out = new Set(); Object.keys(l.tags).forEach(function (k) { if (l.tags[k].v < 0) out.add(k); });
  if (!out.size) return null;
  var keep = new Set();
  seedKeys(l).forEach(function (k) { var L = itemLabels(resolveItem(k)); L.main.concat(L.rest).forEach(function (x) { if (!out.has(x)) keep.add(x); }); });
  return { out: out, keep: keep };
}
function rumboOut(R, it) {
  if (!R) return false;
  var L = itemLabels(it), m = L.main.length || 1;
  var h = L.main.filter(function (x) { return R.out.has(x); }).length / m, kp = L.main.filter(function (x) { return R.keep.has(x); }).length / m;
  if (h > kp) return true;
  var hr = L.rest.filter(function (x) { return R.out.has(x); }).length, kr = L.rest.filter(function (x) { return R.keep.has(x); }).length;
  return hr > kr;
}
/* chips del rumbo: las etiquetas de las pelis base y, aparte, las más frecuentes entre los títulos del festival */
function rumboChips(l) {
  var seeds = seedKeys(l), main = [], restN = {}, inBase = new Set();
  seeds.forEach(function (k) { var L = itemLabels(resolveItem(k)); L.main.forEach(function (x) { if (main.indexOf(x) < 0) main.push(x); }); L.rest.forEach(function (x) { restN[x] = (restN[x] || 0) + 1; }); });
  var rest = Object.keys(restN).sort(function (a, b) { return restN[b] - restN[a]; });
  var shared = rest.filter(function (x) { return restN[x] >= 2 || seeds.length === 1; }).slice(0, 8);
  var base = main.slice(0, 8).concat(shared);
  base.forEach(function (x) { inBase.add(x); });
  var freq = {};
  listKeys(l).forEach(function (k) { var L = itemLabels(resolveItem(k)); L.main.forEach(function (x) { if (!inBase.has(x)) freq[x] = (freq[x] || 0) + 1; }); });
  var more = Object.keys(freq).filter(function (x) { return freq[x] >= 2; }).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 8);
  main.slice(8).concat(rest.filter(function (x) { return !inBase.has(x); })).forEach(function (x) { if (more.indexOf(x) < 0 && more.length < 20) more.push(x); });
  Object.keys(l.tags || {}).forEach(function (x) { if (l.tags[x].v < 0 && !inBase.has(x) && more.indexOf(x) < 0) more.unshift(x); });
  return { base: base, more: more, freq: freq };
}
function setRumbo(l, key, off) {
  l.tags = l.tags || {};
  l.tags[key] = { v: off ? -1 : 0, at: now() };
  touchUser();
}

/* ---------- perfil: lo que viste, tus listas y un resumen de tu gusto ---------- */
var STAR_W = [1, 0.2, 0.5, 1, 1.6, 2.2];
function profileStats() {
  var u = state.user, keys = Array.from(mySignals().keys()), items = keys.map(function (k) { return { k: k, it: itemFor(k), n: starOf(k) }; });
  var st = { total: items.length, movies: 0, series: 0, rated: 0, sum: 0, dist: [0, 0, 0, 0, 0, 0], mins: 0, minsN: 0, genres: {}, subs: {}, tems: {}, tons: {}, secs: {}, decades: {}, year: 0, months: {}, gem: null, unpop: null, agree: null };
  var thisYear = new Date().getFullYear(), diffs = [];
  items.forEach(function (x) {
    var it = x.it, w = STAR_W[x.n] || 1;
    if (it.type === 'tv') st.series++; else st.movies++;
    if (x.n) { st.rated++; st.sum += x.n; st.dist[x.n]++; }
    var d = state.details[x.k]; if (it.type === 'movie' && d && d.rt) { st.mins += d.rt; st.minsN++; }
    (it.g || []).forEach(function (g) { if (!SKIP_GENRES[g]) st.genres[g] = (st.genres[g] || 0) + w; });
    if (it.y) { var dec = Math.floor(it.y / 10) * 10; st.decades[dec] = (st.decades[dec] || 0) + w; }
    var cf = curFind(it);
    if (cf) {
      cf.sub.forEach(function (v) { st.subs[v] = (st.subs[v] || 0) + w; });
      cf.tem.forEach(function (v) { st.tems[v] = (st.tems[v] || 0) + w; });
      cf.ton.forEach(function (v) { st.tons[v] = (st.tons[v] || 0) + w; });
      if (x.n >= 4) st.secs[cf.sec] = (st.secs[cf.sec] || 0) + w;
    }
    var at = u.seen[x.k] || (u.stars[x.k] && u.stars[x.k].at) || 0;
    if (at && new Date(at).getFullYear() === thisYear) { st.year++; var m = new Date(at).getMonth(); st.months[m] = (st.months[m] || 0) + 1; }
    if (x.n && it.v > 0 && (it.vc || 0) >= 50) {
      diffs.push(Math.abs(x.n * 2 - it.v));
      if (x.n >= 4 && (!st.gem || it.v < st.gem.it.v)) st.gem = x;
      if (x.n <= 2 && (!st.unpop || it.v > st.unpop.it.v)) st.unpop = x;
    }
  });
  if (st.gem && st.gem.it.v >= 7.6) st.gem = null;
  if (st.unpop && st.unpop.it.v < 6.8) st.unpop = null;
  if (diffs.length >= 5) st.agree = Math.max(0, Math.round(100 - diffs.reduce(function (a, b) { return a + b; }, 0) / diffs.length * 18));
  return st;
}
function topOf(map, n) { return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; }).slice(0, n || 3); }
var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function renderProfile() {
  var el = $('#profile'); if (!el) return;
  var name = state.settings.myName || '', st = profileStats(), L = CUR && CUR.labels, gname = function (id) { return state.genres.movie.get(+id) || state.genres.tv.get(+id) || ''; };
  var initial = (name || 'Vos').trim().charAt(0).toUpperCase();
  var lists = visibleLists(), fests = lists.filter(isRadio), plain = lists.filter(function (l) { return !isRadio(l); });
  var h = '<header class="pf-head"><span class="pf-avatar" aria-hidden="true">' + esc(initial) + '</span><div class="pf-id">' +
    '<form class="pf-name" id="pfNameForm" autocomplete="off"><label class="sr" for="pfName">Tu nombre</label><input class="pf-name-inp" id="pfName" maxlength="30" placeholder="Tu nombre" value="' + esc(name) + '"></form>' +
    '<p class="pf-sub">' + nf.format(st.total) + (st.total === 1 ? ' vista' : ' vistas') + ' · ' + nf.format(st.rated) + ' con estrellas · ' + nf.format(lists.length) + (lists.length === 1 ? ' lista' : ' listas') + '</p></div>' +
    '<div class="pf-actions"><button class="btn" type="button" data-pf="duo">' + DUO_ICON + 'De a dos</button><button class="btn" type="button" data-pf="settings">Ajustes</button></div></header>' +
    '<div class="pf-cloud">' + cloudCardHTML() + '</div>';
  if (CLOUD.admin && cloudIn() && CLOUD.requests && CLOUD.requests.length) {
    h += '<section class="pf-sec" id="pfReq"><h3 class="fest-h">Pedidos de acceso</h3><p class="hint">Entraron con Google sin estar invitados. Si los aprobás, entran solos y les llegan tus claves.</p><ul class="duo-people">' + CLOUD.requests.map(function (r) {
      return '<li><span><b>' + esc(r.name || r.email) + '</b><small>' + esc(r.email) + (r.at ? ' · ' + esc(new Date(r.at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })) : '') + '</small></span><span class="inv-acts"><button class="btn btn-accent" type="button" data-pf="reqok" data-v="' + esc(r.email) + '">Aprobar</button><button class="btn btn-ghost" type="button" data-pf="reqno" data-v="' + esc(r.email) + '">Rechazar</button></span></li>';
    }).join('') + '</ul></section>';
  }
  if (!st.total) {
    h += '<div class="pf-empty"><p>Todavía no marcaste nada como visto. Cuando lo hagas (o les pongas estrellas), acá aparece tu resumen: géneros, etiquetas y épocas favoritas, tu joya escondida y más.</p></div>';
  } else {
    var cards = [];
    var g = topOf(st.genres, 3);
    if (g.length) cards.push(['c1', 'Tu género', esc(gname(g[0])), g.slice(1).map(gname).filter(Boolean).length ? 'Después: ' + esc(g.slice(1).map(gname).filter(Boolean).join(' y ')) : '']);
    var sb = topOf(st.subs, 3);
    if (sb.length && L) cards.push(['c2', 'Tus etiquetas', esc(L.sub[sb[0]] || sb[0]), esc(sb.slice(1).map(function (x) { return L.sub[x] || x; }).join(' · '))]);
    var tn = topOf(st.tons, 2), tm = topOf(st.tems, 2);
    if (tn.length && L) cards.push(['c3', 'Tu tono', esc(L.ton[tn[0]] || tn[0]), tm.length ? 'Te tiran los temas de ' + esc(tm.map(function (x) { return L.tem[x] || x; }).join(' y ')) : '']);
    var dc = topOf(st.decades, 1);
    if (dc.length) cards.push(['c4', 'Tu década', 'Los ' + (+dc[0] >= 2000 ? dc[0] : String(dc[0]).slice(-2)), 'La época que más aparece en lo que viste']);
    if (st.minsN) cards.push(['c5', 'En pantalla', nf.format(Math.round(st.mins / 60)) + ' h', 'Sumando ' + st.minsN + ' pelis con duración conocida']);
    if (st.rated) cards.push(['c6', 'Tu promedio', (st.sum / st.rated).toFixed(1).replace('.', ',') + ' ★', st.agree != null ? 'Coincidís con TMDB en un ' + st.agree + ' %' : nf.format(st.rated) + ' títulos puntuados']);
    if (st.gem) cards.push(['c7', 'Tu joya escondida', esc(st.gem.it.t), 'Le diste ' + st.gem.n + '★ y en TMDB tiene ' + String(st.gem.it.v).replace('.', ',')]);
    if (st.unpop) cards.push(['c8', 'Opinión impopular', esc(st.unpop.it.t), 'Le diste ' + st.unpop.n + '★ y en TMDB tiene ' + String(st.unpop.it.v).replace('.', ',')]);
    if (st.year) { var bm = topOf(st.months, 1)[0]; cards.push(['c2', 'Este año', nf.format(st.year) + (st.year === 1 ? ' vista' : ' vistas'), bm != null ? 'El mes más cinéfilo: ' + MONTHS[bm] : '']); }
    h += '<section class="pf-sec"><h3 class="fest-h">Tu resumen</h3><div class="wr">' + cards.map(function (c) {
      var longest = String(c[2]).replace(/&[a-z#0-9]+;/g, 'x').split(/\s+/).reduce(function (m, w) { return Math.max(m, w.length); }, 0);
      return '<article class="wr-card ' + c[0] + (longest > 9 ? ' wr-long' : '') + '"><p class="wr-k">' + c[1] + '</p><p class="wr-v">' + c[2] + '</p>' + (c[3] ? '<p class="wr-s">' + c[3] + '</p>' : '') + '</article>';
    }).join('') + '</div>';
    if (st.rated) {
      var mx = Math.max.apply(null, st.dist.slice(1)) || 1;
      h += '<div class="pf-dist" aria-label="Cuántos títulos puntuaste con cada cantidad de estrellas">' + [5, 4, 3, 2, 1].map(function (n) {
        return '<div class="pf-bar"><span class="pf-bl">' + n + '★</span><span class="pf-track"><span class="pf-fill" data-w="' + Math.round(st.dist[n] / mx * 100) + '"></span></span><span class="pf-bn">' + st.dist[n] + '</span></div>';
      }).join('') + '</div>';
    }
    var sec = topOf(st.secs, 1)[0];
    if (sec && L && L.sec[sec]) h += '<p class="pf-ideal">Tu festival ideal: <b>' + esc(L.sec[sec]) + '</b> <button class="btn btn-accent" type="button" data-pf="ideal" data-v="' + esc(sec) + '">Armarlo</button></p>';
    h += '</section>';
  }
  var recent = seenKeys().slice(0, 12).map(itemFor);
  if (recent.length) h += '<section class="pf-sec"><div class="pf-row-h"><h3 class="fest-h">Vistas recientes</h3><button class="btn btn-ghost" type="button" data-pf="seen">Ver todas</button></div><div class="pf-strip">' + recent.map(function (it) {
    var p = safePath(it.p);
    return '<button class="pf-post" type="button" data-pf="open" data-v="' + esc(it.k) + '" title="' + esc(it.t) + '">' + (p ? '<img alt="" loading="lazy" src="' + IMG + 'w185' + p + '">' : '<span class="noposter">' + esc(it.t) + '</span>') + (starOf(it.k) ? '<span class="pf-st">' + starOf(it.k) + '★</span>' : '') + '</button>';
  }).join('') + '</div></section>';
  var pill = function (l) { return '<button class="lpill' + (isRadio(l) ? ' is-fest' : '') + '" type="button" data-pf="list" data-v="' + esc(l.id) + '">' + (isRadio(l) ? ICON.ticket : '') + esc(l.name) + ' <span class="n">' + nf.format(listKeys(l).length) + '</span></button>'; };
  h += '<section class="pf-sec"><h3 class="fest-h">Tus listas</h3><div class="fest-mine">' + plain.map(pill).join('') + '</div>' +
    (fests.length ? '<h3 class="fest-h pf-h2">Tus festivales</h3><div class="fest-mine">' + fests.map(pill).join('') + '</div>' : '') + '</section>';
  h += '<section class="pf-sec"><h3 class="fest-h">Watch buddies</h3>' + (allComps().length ? '<div class="fest-mine">' + allComps().map(function (c) {
    return '<button class="lpill" type="button" data-pf="buddy" data-v="' + esc(c.id) + '">' + DUO_ICON + esc(c.name) + ' <span class="n">' + nf.format(Object.keys(c.seen).length) + '</span></button>';
  }).join('') + '</div>' : '<p class="hint">Todavía no cargaste a nadie. Desde De a dos podés compartir tu gusto o sumar el de otra persona.</p>') + '</section>';
  h += svcSectionHTML();
  if (CLOUD.admin && cloudIn()) {
    var inv = CLOUD.invites;
    h += '<section class="pf-sec"><h3 class="fest-h">Invitados</h3><p class="hint">Solo estos mails pueden entrar con Google. Les llegan configuradas tus claves de TMDB y OMDb, y los puntajes de OMDb se comparten entre todos.</p>' +
      '<form class="duo-new inv-form" id="invForm" autocomplete="off"><label class="sr" for="invEmail">Mail</label><input class="inp" id="invEmail" type="email" placeholder="mail@gmail.com" required><label class="sr" for="invName">Nombre</label><input class="inp" id="invName" maxlength="40" placeholder="Nombre"><button class="btn btn-accent" type="submit">Invitar</button></form>' +
      (inv === null ? '<p class="hint">Cargando…</p>' : inv.length ? '<ul class="duo-people">' + inv.map(function (x) {
        return '<li><span><b>' + esc(x.name || x.email) + '</b><small>' + esc(x.email) + '</small></span><span class="inv-acts"><button class="btn" type="button" data-pf="invshare" data-v="' + esc(x.email) + '">Mandar link</button><button class="btn btn-ghost" type="button" data-pf="invdel" data-v="' + esc(x.email) + '">' + (state.invDel === x.email ? 'Confirmar' : 'Quitar') + '</button></span></li>';
      }).join('') + '</ul>' : '<p class="hint">Todavía no invitaste a nadie.</p>') + '</section>';
  }
  /* lo que estabas escribiendo (nombre, invitación) sobrevive a los repintados que llegan de la nube */
  var keep = {}, focused = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : '';
  $$('input[id]', el).forEach(function (i) { if (i.value !== i.defaultValue) keep[i.id] = i.value; });
  el.innerHTML = h;
  Object.keys(keep).forEach(function (id) { var i = document.getElementById(id); if (i) i.value = keep[id]; });
  if (focused) { var f = document.getElementById(focused); if (f) f.focus(); }
  $$('.pf-fill', el).forEach(function (f) { f.style.width = f.dataset.w + '%'; });
}
function svcSectionHTML() {
  var cat = serviceCatalog(), chosen = chosenServices(), on = new Set(chosen.map(function (x) { return x.key; }));
  if (cat.length <= CLASSIC_KEYS.length && !state.svcCatTried && state.settings.tmdbKey) {
    state.svcCatTried = true;
    loadServiceCatalog().then(function () { if (state.ui.view === 'profile') setTimeout(renderSvcSection, 0); }, function () {});
  }
  chosen.forEach(function (x) { if (x.key !== 'stremio' && !cat.some(function (c) { return c.key === x.key; })) cat.unshift(x); });
  var chip = function (x) {
    var logo = x.logo ? '<img alt="" loading="lazy" src="' + IMG + 'w92' + x.logo + '">' : '<span class="svc-ini ' + svcClass(x.key) + '" aria-hidden="true">' + esc(x.label.charAt(0)) + '</span>';
    return '<button class="svc-c" type="button" data-pf="svc" data-v="' + esc(x.key) + '" aria-pressed="' + on.has(x.key) + '">' + logo + '<span>' + esc(x.label) + '</span></button>';
  };
  var mine = cat.filter(function (x) { return on.has(x.key); }), rest = cat.filter(function (x) { return !on.has(x.key); });
  var stremio = '<button class="svc-c" type="button" data-pf="svc" data-v="stremio" aria-pressed="' + STREMIO_ON + '"><span class="svc-ini c-stremio" aria-hidden="true">S</span><span>Stremio <small>vía Torrentio</small></span></button>';
  return '<section class="pf-sec" id="pfSvc"><h3 class="fest-h">Tus servicios</h3>' +
    '<p class="hint">Tocá los que tenés. El catálogo, los filtros y el acomodador usan solo estos. Se guarda con tus datos, así que vale en todos tus dispositivos.</p>' +
    '<div class="svc-pick">' + mine.map(chip).join('') + stremio + '</div>' +
    (rest.length ? '<details class="svc-rest"' + (state.svcRestOpen ? ' open' : '') + '><summary data-pf="svcrest">Sumar otro servicio (' + rest.length + ')</summary><div class="svc-pick">' + rest.map(chip).join('') + '</div></details>'
      : state.svcCatLoading ? '<p class="hint">Cargando los servicios disponibles…</p>' : '') +
    '<p class="hint">Stremio no tiene catálogo propio: con el botón prendido, cada título te muestra si está en Torrentio, la mejor calidad y si hay audio latino o castellano.</p></section>';
}
function renderSvcSection() { var sec = $('#pfSvc'); if (sec) sec.outerHTML = svcSectionHTML(); }
function toggleService(key) {
  var chosen = chosenServices().slice(), i = -1;
  chosen.forEach(function (x, j) { if (x.key === key) i = j; });
  if (i >= 0) {
    if (key !== 'stremio' && chosen.filter(function (x) { return x.key !== 'stremio'; }).length <= 1) { toast('Dejá al menos un servicio prendido.'); return; }
    var gone = chosen.splice(i, 1)[0];
    setServiceChoice(chosen); toast(gone.label + ' fuera de tus servicios.');
  } else if (key === 'stremio') {
    chosen.push({ key: 'stremio', label: 'Stremio', ids: [], logo: '' }); setServiceChoice(chosen); toast('Stremio prendido: vas a ver qué hay en Torrentio.');
  } else {
    var x = serviceCatalog().filter(function (c) { return c.key === key; })[0]; if (!x) return;
    var at = chosen.length; chosen.forEach(function (c, j) { if (c.key === 'stremio') at = Math.min(at, j); });
    chosen.splice(at, 0, x); setServiceChoice(chosen); toast(x.label + ' sumado. Actualizo el catálogo.');
  }
  renderSvcSection();
}
function profileAct(act, v) {
  if (act === 'svc') { if (!chosenServices().some(function (x) { return x.key === v; })) state.svcRestOpen = true; toggleService(v); return; }
  if (act === 'svcrest') { state.svcRestOpen = !state.svcRestOpen; return; }
  if (act === 'reqok' || act === 'reqno') { accessDecide(v, act === 'reqok'); return; }
  if (act === 'duo') { openDuo(); return; }
  if (act === 'settings') { fillSettingsForm(); openDialog($('#dlgSettings')); return; }
  if (act === 'seen') { state.ui.list = 'seen'; setView('lists'); return; }
  if (act === 'list') { var l = getList(v); if (l) { state.ui.list = l.id; state.ui.view = 'lists'; state.special = null; refresh(); window.scrollTo(0, 0); } return; }
  if (act === 'open') { openDetail(itemFor(v)); return; }
  if (act === 'buddy') { setDuo(v); openDuo(); return; }
  if (act === 'ideal') { var b = $('#profile [data-pf="ideal"]'); startSectionFestival(v, b); return; }
  if (act === 'invshare') { var x = (CLOUD.invites || []).filter(function (i) { return i.email === v; })[0]; shareLink(appUrl(), invitePitch('invite', x && x.name, v), 'Mensaje y link copiados. Mandáselo y que entre con ' + v + '.'); return; }
  if (act === 'invdel') {
    if (state.invDel !== v) { state.invDel = v; renderProfile(); setTimeout(function () { if (state.invDel === v) { state.invDel = null; renderProfile(); } }, 4000); return; }
    state.invDel = null; inviteRemove(v).catch(function () { toast('No pude quitar la invitación.'); }); return;
  }
}

/* ---------- radios ---------- */
function isRadio(l) { return !!l && Object.keys(l.seeds || {}).length > 0; }
function radioContext() { if (state.special || state.ui.view !== 'lists') return null; var l = getList(state.ui.list); return isRadio(l) ? l : null; }
async function radioFill(l, n) {
  var seeds = seedKeys(l).map(resolveItem).filter(Boolean).slice(-8);
  /* lista compartida de a dos: se programa con el gusto de los dos y su regla de vistas */
  var sc = sharedCompanion(l), prevDuo = state.duo, added = 0;
  if (sc) state.duo = sc.id;
  try {
    var recs = await recommend(seeds), R = rumboOf(l), t = now();
    for (var i = 0; i < recs.length && added < n; i++) {
      var it = recs[i].it, k = it.k;
      if (isIn(l, k) || l.nos[k] || (l.seeds[k] && !duoComp()) || seenNow(k) || lowNow(k) || isHidden(k) || (l.rms[k] || 0) > 0 || rumboOut(R, it)) continue;
      l.adds[k] = t - added; state.user.items[k] = snapshot(it); added++;
    }
  } finally { if (sc) state.duo = prevDuo; }
  touchUser();
  return added;
}
async function createRadio(seeds, name) {
  seeds = seeds.filter(Boolean).slice(0, 8);
  if (!seeds.length) return;
  closeDialog($('#dlgDetail'));
  var l = createList(String(name || ('Festival ' + seeds[0].t + (seeds.length > 1 ? ' +' + (seeds.length - 1) : ''))).slice(0, 40));
  var t = now();
  seeds.forEach(function (s) { l.seeds[s.k] = t; state.user.items[s.k] = snapshot(s); });
  state.special = null; state.ui.view = 'lists'; state.ui.list = l.id; state.listEdit = null;
  state.radioBusy = true; refresh(); window.scrollTo(0, 0);
  toast('Armando el festival…');
  try { var n = await radioFill(l, 20); toast(n ? 'Festival armado: ' + n + ' títulos.' : 'No encontré parecidas nuevas.'); }
  catch (e) { if (e.fatal) fatal(e); else toast(e.message); }
  finally { state.radioBusy = false; refresh(true); }
}
async function radioMore(l) {
  if (state.radioBusy) return;
  state.radioBusy = true; renderListbar();
  try { var n = await radioFill(l, 10); toast(n ? 'Sumé ' + n + ' al festival.' : 'No encontré parecidas nuevas. Probá sumar otra peli base.'); }
  catch (e) { if (e.fatal) fatal(e); else toast(e.message); }
  finally { state.radioBusy = false; refresh(true); }
}

/* ---------- el acomodador: te ayuda a elegir con preguntas ----------
   Pregunta tipo, ganas y género; después hace duelos A/B entre títulos de la curaduría
   para ubicar subgénero y tono, y al final época, duración y dónde verla. Con eso arma un
   perfil de etiquetas con peso, elige títulos base y corre el mismo motor de
   recomendaciones, que ya tiene en cuenta tus vistas y estrellas. Con suficientes
   puntajes ofrece elegir "a ciegas", directo desde tu gusto. */
var GUIDE_MOODS = [
  { k: 'light', label: 'Algo liviano', sub: 'para reírme o pasarla bien', ton: ['luminoso', 'divertido', 'tierno', 'ingenioso', 'ludico', 'romantico'], g: { movie: [35, 10749, 16, 12, 10751], tv: [35, 16] } },
  { k: 'tense', label: 'Tensión', sub: 'que me tenga al borde del sillón', ton: ['tenso', 'angustiante', 'frenetico', 'visceral', 'sombrio'], g: { movie: [53, 27, 80, 28], tv: [80, 9648, 10759] } },
  { k: 'think', label: 'Para pensar', sub: 'que me deje dando vueltas', ton: ['cerebral', 'contemplativo', 'lento'], g: { movie: [18, 878, 9648, 99], tv: [18, 9648, 99] } },
  { k: 'heart', label: 'Emoción', sub: 'que me toque el corazón', ton: ['emotivo', 'agridulce', 'nostalgico', 'tierno', 'melancolico', 'romantico'], g: { movie: [18, 10749, 10402], tv: [18] } },
  { k: 'weird', label: 'Algo raro', sub: 'que me vuele la cabeza', ton: ['bizarro', 'onirico', 'perturbador'], subs: ['surrealista', 'absurdo', 'psicodelico', 'cosmico'], g: { movie: [14, 878, 27, 9648], tv: [10765, 9648] } },
  { k: 'any', label: 'Me da igual', sub: 'sorprendeme', ton: [], g: null }
];
var GUIDE_GROUP_GENRES = {
  'Terror': { movie: [27], tv: [9648, 10765] }, 'Ciencia ficción': { movie: [878], tv: [10765] },
  'Thriller y crimen': { movie: [53, 80, 9648], tv: [80, 9648] }, 'Drama': { movie: [18], tv: [18] },
  'Comedia': { movie: [35], tv: [35] }, 'Romance': { movie: [10749], tv: [18] }, 'Animación': { movie: [16], tv: [16] },
  'Acción y aventura': { movie: [28, 12], tv: [10759] }, 'Fantasía': { movie: [14], tv: [10765] },
  'Bélico': { movie: [10752], tv: [10768] }, 'Western': { movie: [37], tv: [37] }, 'Música': { movie: [10402], tv: [] },
  'Documental': { movie: [99], tv: [99] }
};
var GUIDE_ERAS = { any: {}, classic: { to: 1979 }, mid: { from: 1980, to: 1999 }, modern: { from: 2000 } };
var GUIDE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9.5h7l3.5-3v11l-3.5-3h-7z"/><path d="M17 8l3-2M17.5 12H21M17 16l3 2"/></svg>';
function guideNew() { return { at: Date.now(), step: 'start', type: 'movie', mood: null, group: null, round: 0, T: {}, used: [], picked: [], era: 'any', rt: 0, where: state.ui.source === 'all' ? 'all' : 'mine', blind: false, salt: String(Math.random()), hist: [], res: null, shown: 0 }; }
function guideSnap(g) { return JSON.stringify({ step: g.step, type: g.type, mood: g.mood, group: g.group, round: g.round, skips: g.skips || 0, T: g.T, used: g.used, picked: g.picked, era: g.era, rt: g.rt, where: g.where, blind: g.blind }); }
function guidePush() { var g = state.guide; g.hist.push(guideSnap(g)); }
function guideBack() { var g = state.guide, h = g.hist.pop(); if (!h) return; Object.assign(g, JSON.parse(h), { res: null, shown: 0 }); renderGuide(); }
function guideMood(k) { return GUIDE_MOODS.filter(function (m) { return m.k === k; })[0] || null; }
function guideSecs(g) { if (!g.group || !CUR) return null; var gr = CUR.groups.filter(function (x) { return x[0] === g.group; })[0]; return gr ? gr[1] : null; }
function guideGenres(g) { if (!g.group) return null; var x = GUIDE_GROUP_GENRES[g.group]; return x ? x[g.type] : null; }
function guidePool(g) {
  if (!CUR) return [];
  var secs = guideSecs(g);
  return CUR.films.filter(function (f) { return (g.type === 'tv') === !!f.tv && (!secs || secs.indexOf(f.sec) >= 0); });
}
function guideLabels(f) {
  var o = {};
  f.sub.forEach(function (v) { o['s:' + v] = 1; }); f.tem.forEach(function (v) { o['t:' + v] = 0.6; }); f.ton.forEach(function (v) { o['o:' + v] = 0.9; });
  return o;
}
function guideAdd(T, f, w) { var L = guideLabels(f); Object.keys(L).forEach(function (k) { T[k] = (T[k] || 0) + L[k] * w; }); }
function guideFit(T, f) { var L = guideLabels(f), ks = Object.keys(L), s = 0; ks.forEach(function (k) { s += (T[k] || 0) * L[k]; }); return s / Math.sqrt(ks.length || 1); }
function guideFame(f) { return Math.min(1, (CUR.rel.get(f.id) || new Set()).size / 8); }
function guideJit(g, id) { var h = 7, s = id + g.salt; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h % 1000) / 1000; }
/* títulos de la curaduría que ya conocés: los que viste (y cuánto te gustaron) y los que tenés guardados en listas */
function guideKnown() {
  var out = new Map(); if (!CUR) return out;
  mySignals().forEach(function (s) { var f = curFind(s.it); if (f) out.set(f.id, { seen: true, n: s.n, who: 'me' }); });
  var c = duoComp();
  if (c) Object.keys(c.seen).concat(Object.keys(c.stars)).forEach(function (k) { var it = c.items[k] || state.user.items[k], f = it && curFind(it); if (f && !out.has(f.id)) out.set(f.id, { seen: true, n: c.stars[k] || 0, who: 'them' }); });
  visibleLists().slice().sort(function (a, b) { return isRadio(a) - isRadio(b); }).forEach(function (l) { listKeys(l).forEach(function (k) { var f = curFind(resolveItem(k)); if (f && !out.has(f.id)) out.set(f.id, { list: l.name, fest: isRadio(l) }); }); });
  return out;
}
function knownBonus(x) { if (!x) return 0; if (x.seen) return x.n >= 4 ? (x.n === 5 ? 1.3 : 1.1) : x.n === 3 ? 0.6 : x.n ? 0.15 : 0.45; return x.list ? (x.fest ? 0.5 : 0.85) : 0; }
/* dos títulos bien distintos entre sí, entre los que mejor encajan; primero los que ya viste y te gustaron
   (sirven de vara para comparar) y los que tenés en alguna lista (de paso no se te olvidan) */
function guidePair(g) {
  var films = guidePool(g).filter(function (f) { return g.used.indexOf(f.id) < 0; });
  if (films.length < 2) return null;
  var K = g._known || (g._known = guideKnown());
  var top = films.map(function (f) { return { f: f, s: guideFit(g.T, f) + 0.6 * guideFame(f) + 0.3 * guideJit(g, f.id) + knownBonus(K.get(f.id)) }; })
    .sort(function (a, b) { return b.s - a.s; }).slice(0, 14);
  var best = null, bs = -Infinity;
  for (var i = 0; i < top.length; i++) for (var j = i + 1; j < top.length; j++) {
    var a = top[i].f, b = top[j].f;
    var d = 1 - curSim(a, b) + (a.sec !== b.sec ? 0.25 : 0) + 0.15 * (top[i].s + top[j].s) - (curRel(a, b) ? 0.3 : 0);
    if (d > bs) { bs = d; best = [a, b]; }
  }
  if (best && guideJit(g, best[0].id + best[1].id) > 0.5) best.reverse();
  return best;
}
function guideDuel(v) {
  var g = state.guide, pair = g.pair; if (!pair) return;
  guidePush();
  g.used.push(pair[0].id, pair[1].id);
  if (v === 'a' || v === 'b') {
    var win = v === 'a' ? pair[0] : pair[1], lose = v === 'a' ? pair[1] : pair[0];
    guideAdd(g.T, win, 1); guideAdd(g.T, lose, -0.5); g.picked.push(win.id);
    g.round++; g.skips = 0;
  } else if ((g.skips = (g.skips || 0) + 1) > 2) { g.round++; g.skips = 0; }
  g.step = g.round >= 3 ? 'details' : 'duel';
  renderGuide(); $('#dlgGuide').scrollTop = 0;
}
function openGuide() {
  var g = state.guide;
  if (!g || (g.step !== 'results' && g.step !== 'loading') || Date.now() - g.at > 30 * 60 * 1000) state.guide = guideNew();
  closeMenu(); closeRail();
  (CUR ? Promise.resolve() : loadCuraduria()).then(function () { renderGuide(); openDialog($('#dlgGuide')); $('#dlgGuide').scrollTop = 0; });
}
function guideStepNo(g) {
  var list = g.blind ? ['start', 'details'] : g.type === 'tv' ? ['start', 'mood', 'duel0', 'duel1', 'duel2', 'details'] : ['start', 'mood', 'genre', 'duel0', 'duel1', 'duel2', 'details'];
  var idx = list.indexOf(g.step === 'duel' ? 'duel' + g.round : g.step);
  return idx < 0 || g.step === 'start' ? '' : (idx + 1) + ' de ' + list.length;
}
function guideOpt(act, v, label, sub) { return '<button class="g-opt" type="button" data-g="' + act + '" data-v="' + esc(v) + '"><b>' + esc(label) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</button>'; }
function guideRow(label, key, opts, cur) {
  return '<div class="g-row"><span class="rlabel">' + esc(label) + '</span><div class="g-chips" role="group" aria-label="' + esc(label) + '">' + opts.map(function (o) {
    return '<button class="g-chip" type="button" data-g="set" data-key="' + key + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (String(cur) === o[0]) + '">' + esc(o[1]) + '</button>';
  }).join('') + '</div></div>';
}
function guideFilm(f, v) {
  var c = curMap[f.id], p = c && !c.none ? safePath(c.p) : null, L = CUR.labels, g = state.guide;
  var x = g && g._known ? g._known.get(f.id) : null, dc = duoComp();
  var badge = !x ? '' : x.seen ? (x.who === 'them' && dc ? esc(dc.name) + ' la vio' : 'La viste') + (x.n ? ' · ' + '★'.repeat(x.n) : '') : (x.fest ? 'En tu festival «' : 'En tu lista «') + esc(x.list) + '»';
  var tags = f.sub.slice(0, 2).map(function (t) { return L.sub[t]; }).concat(f.ton.slice(0, 2).map(function (t) { return L.ton[t]; }), f.tem.slice(0, 2).map(function (t) { return L.tem[t]; })).filter(Boolean);
  return '<button class="g-film" type="button" data-g="duel" data-v="' + v + '"><span class="g-poster">' + (p ? '<img alt="" src="' + IMG + 'w342' + p + '">' : '<span class="noposter">' + esc(curShownTitle(f)) + '</span>') +
    (badge ? '<span class="g-badge">' + badge + '</span>' : '') + '</span>' +
    '<b>' + esc(curShownTitle(f)) + '</b><span class="g-meta">' + esc([f.y, L.sec[f.sec]].filter(Boolean).join(' · ')) + '</span>' +
    '<span class="g-tags">' + tags.map(function (t) { return '<span class="g-tag">' + esc(t) + '</span>'; }).join('') + '</span></button>';
}
function guideGroups(g) {
  var m = guideMood(g.mood), tons = m ? m.ton : [];
  return CUR.groups.map(function (x) {
    var films = CUR.films.filter(function (f) { return !f.tv && x[1].indexOf(f.sec) >= 0; });
    var fit = tons.length ? films.filter(function (f) { return f.ton.some(function (t) { return tons.indexOf(t) >= 0; }); }).length / (films.length || 1) : 0;
    return { name: x[0], n: films.length, fit: fit };
  }).filter(function (x) { return x.n; }).sort(function (a, b) { return b.fit - a.fit; });
}
function guideCard(g, r, i) {
  var it = r.it, p = safePath(it.p), watch = inList('watchlist', it.k);
  return '<article class="g-card">' +
    '<button class="g-cposter" type="button" data-g="open" data-v="' + esc(it.k) + '" aria-label="Ver ficha de ' + esc(it.t) + '">' + (p ? '<img alt="" src="' + IMG + 'w342' + p + '">' : '<span class="noposter">' + esc(it.t) + '</span>') + '</button>' +
    '<div class="g-cmeta">' + (i === 0 && !g.shown ? '<p class="g-top">La que pondría yo</p>' : '') +
      '<h3>' + esc(it.t) + '</h3><p class="sub">' + subHTML(it) + '</p><p class="scores">' + scoresHTML(it) + '</p><p class="svcs">' + svcsHTML(it) + '</p>' +
      (r.why ? '<p class="why">' + esc(r.why) + '</p>' : '') +
      '<div class="g-cacts"><button class="btn btn-accent" type="button" data-g="open" data-v="' + esc(it.k) + '">Ver ficha</button>' +
      '<button class="btn" type="button" data-g="watch" data-v="' + esc(it.k) + '" aria-pressed="' + watch + '">' + (watch ? 'En Mi lista' : 'Sumar a Mi lista') + '</button>' +
      '<button class="btn btn-ghost" type="button" data-g="hide" data-v="' + esc(it.k) + '">No me interesa</button></div>' +
    '</div></article>';
}
function renderGuide() {
  var g = state.guide, body = $('#guideBody'); if (!g || !body) return;
  var say = '', main = '', foot = '';
  if (g.step === 'start') {
    var conf = tasteProfile().conf, dc = duoComp();
    say = dc ? 'Buenas, pasen, que quedan butacas. ¿Hoy es noche de película o de serie?' : 'Buenas. Pasá, que quedan butacas. ¿Hoy es noche de película o de serie?';
    main = '<div class="g-row g-with"><span class="rlabel">¿Con quién?</span><div class="g-chips"><button class="g-chip" type="button" data-g="with" data-v="" aria-pressed="' + !dc + '">Solo</button>' +
      allComps().filter(function (c) { return !c.pending; }).map(function (c) { return '<button class="g-chip" type="button" data-g="with" data-v="' + esc(c.id) + '" aria-pressed="' + (!!dc && dc.id === c.id) + '">Con ' + esc(c.name) + '</button>'; }).join('') +
      '<button class="g-chip" type="button" data-g="duo">' + (allComps().length ? '+ Otra persona' : '+ Con alguien') + '</button></div></div>' +
      '<div class="g-opts g-two">' + guideOpt('type', 'movie', 'Película', 'una sola sentada') + guideOpt('type', 'tv', 'Serie', 'para engancharse') + '</div>' +
      '<div class="g-alts">' + (conf >= 0.4 ? '<button class="g-alt" type="button" data-g="blind">' + (dc ? 'A ciegas, según lo que nos gustó' : 'A ciegas, según lo que me gustó') + '</button>' : '') +
      '<button class="g-alt" type="button" data-g="random">Una al azar de lo que estoy viendo</button></div>' +
      (conf < 0.4 ? '<p class="hint g-note">Cuantas más marques como vistas y puntúes, mejor te voy a conocer y más afinadas te van a salir.</p>' : '');
  } else if (g.step === 'mood') {
    say = 'Bien. ¿Y con qué ganas venís?';
    main = '<div class="g-opts">' + GUIDE_MOODS.map(function (m) { return guideOpt('mood', m.k, m.label, m.sub); }).join('') + '</div>';
  } else if (g.step === 'genre') {
    say = '¿Para qué lado de la cartelera agarramos?';
    var gs = guideGroups(g);
    main = '<div class="g-chips g-genres"><button class="g-chip lead" type="button" data-g="genre" data-v="">Sorprendeme</button>' +
      gs.map(function (x, i) { return '<button class="g-chip' + (i < 3 && x.fit > 0 ? ' lead' : '') + '" type="button" data-g="genre" data-v="' + esc(x.name) + '">' + esc(x.name) + '</button>'; }).join('') + '</div>' +
      (guideMood(g.mood) && guideMood(g.mood).ton.length ? '<p class="hint g-note">Los resaltados son los que mejor van con esas ganas.</p>' : '');
  } else if (g.step === 'duel') {
    var pair = g.pair = guidePair(g);
    if (!pair) { g.step = 'details'; renderGuide(); return; }
    var lead = ['Te pongo dos.', 'Ahora estas.', 'Última y te dejo tranquilo.'][Math.min(g.round, 2)];
    say = esc(lead) + ' ¿Más <em>' + esc(curShownTitle(pair[0])) + '</em> o más <em>' + esc(curShownTitle(pair[1])) + '</em>?';
    main = '<div class="g-duel">' + guideFilm(pair[0], 'a') + '<span class="g-vs">o</span>' + guideFilm(pair[1], 'b') + '</div>' +
      '<div class="g-alts g-center"><button class="g-alt" type="button" data-g="duel" data-v="none">Ninguna me convence: mostrame otras dos</button></div>';
  } else if (g.step === 'details') {
    say = g.blind ? 'Dale, te elijo yo. Decime nomás un par de cosas.' : 'Tres detalles y te acomodo.';
    main = '<div class="g-rows">' +
      (g.blind ? guideRow('Qué', 'type', [['movie', 'Película'], ['tv', 'Serie']], g.type) : '') +
      guideRow('Época', 'era', [['any', 'Me da igual'], ['classic', 'Clásicas, antes de 1980'], ['mid', '80 y 90'], ['modern', '2000 en adelante']], g.era) +
      (g.type === 'movie' ? guideRow('Duración', 'rt', [['0', 'Lo que dure'], ['105', 'Menos de 1 h 45'], ['135', 'Hasta 2 h 15']], g.rt) : '') +
      guideRow('Dónde', 'where', [['mine', 'En mis servicios'], ['all', 'Todo el cine']], g.where) + '</div>';
    foot = '<button class="btn btn-accent" type="button" data-g="go">Mostrame qué hay</button>';
  } else if (g.step === 'loading') {
    say = 'Dejame ver qué hay en sala…';
    main = '<p class="hint" id="guideProg">Eligiendo las pelis base…</p>';
  } else if (g.step === 'results') {
    var res = g.res, list = res.items.slice(g.shown, g.shown + 3);
    if (!res.items.length) {
      say = 'Con todo eso junto no me quedó nada.';
      main = '<p class="hint">Probá aflojar la época o la duración, o abrí a todo el cine.</p>';
    } else {
      say = g.shown ? (list.length === 3 ? 'Van otras tres.' : 'Estas son las últimas que tengo.') : list.length === 3 ? 'Te guardé estas tres. La primera es la que pondría yo.' : list.length === 2 ? 'Te guardé estas dos. La primera es la que pondría yo.' : 'Encontré una sola, pero va.';
      main = '<div class="g-res">' + list.map(function (r, i) { return guideCard(g, r, i); }).join('') + '</div>';
      foot = (res.items.length > g.shown + 3 ? '<button class="btn" type="button" data-g="more">Otras tres</button>' : '') +
        '<button class="btn" type="button" data-g="all">Ver todas (' + res.items.length + ')</button>' +
        '<button class="btn" type="button" data-g="fest">Armar festival con esto</button>';
    }
    foot += '<button class="btn btn-ghost" type="button" data-g="restart">Empezar de nuevo</button>';
  }
  var no = guideStepNo(g);
  var back = g.hist.length && g.step !== 'loading' ? '<button class="btn btn-ghost" type="button" data-g="back">Atrás</button>' : '';
  body.innerHTML = '<div class="g-head"><p class="g-who">' + GUIDE_ICON + 'El acomodador</p>' + (no ? '<p class="g-step">' + no + '</p>' : '') + '</div>' +
    '<h2 class="g-say" id="guideSay">' + say + '</h2>' + main + (foot || back ? '<div class="g-foot">' + back + foot + '</div>' : '');
  if (g.step === 'duel') {
    var miss = g.pair.filter(function (f) { return !curMap[f.id]; });
    if (miss.length) Promise.all(miss.map(curResolve)).then(function () { if (state.guide === g && g.step === 'duel' && g.pair && miss.every(function (f) { return g.pair.indexOf(f) >= 0; })) renderGuide(); }, function () {});
  }
  navSoon();
}
var guideRefreshSoon = debounce(function () { var g = state.guide; if (g && g.step === 'results' && $('#dlgGuide').open) renderGuide(); }, 600);
async function ensureDetails(items) {
  var need = items.filter(function (it) { return !hasDetails(it.k); });
  await pool(need, 6, async function (it) {
    try { var d = await tmdb('/' + it.type + '/' + it.id, { append_to_response: 'external_ids,watch/providers' }); state.details[it.k] = liteFromFull(d, it.type); }
    catch (e) { if (e.fatal) throw e; if (e.code === 'notfound') state.details[it.k] = { v: 2, at: Date.now(), rt: null, imdb: null, svc: [] }; }
  });
  saveCachesSoon();
}
function guideWhy(g, r) {
  var parts = [], near = null, ns = 0.3;
  if (r.cf) g.picked.forEach(function (id) {
    var f = CUR.byId.get(id); if (!f || f.id === r.cf.id) return;
    var s = curSim(f, r.cf) + (curRel(f, r.cf) ? 0.3 : 0); if (s > ns) { ns = s; near = f; }
  });
  var dn = duoNote(r.it.k); if (dn) parts.push(dn);
  if (near) parts.push('Va por el lado de ' + curShownTitle(near));
  if (r.why) parts.push(r.why);
  else if (r.cf) { var L = CUR.labels; parts.push([L.sub[r.cf.sub[0]], L.ton[r.cf.ton[0]]].filter(Boolean).join(', ')); }
  return parts.filter(function (x, i) { return parts.indexOf(x) === i; }).slice(0, 2).join(' · ');
}
async function guideCompute(g, progress) {
  var films = guidePool(g), era = GUIDE_ERAS[g.era] || {};
  var inEra = function (y) { return !y || ((!era.from || y >= era.from) && (!era.to || y <= era.to)); };
  var fits = new Map(), maxFit = 0;
  films.forEach(function (f) { var s = guideFit(g.T, f); fits.set(f.id, s); if (s > maxFit) maxFit = s; });
  var fitN = function (f) { var s = fits.has(f.id) ? fits.get(f.id) : guideFit(g.T, f); return maxFit > 0 ? Math.max(0, Math.min(1, s / maxFit)) : 0.5; };
  var byFit = films.slice().sort(function (a, b) { return fits.get(b.id) - fits.get(a.id) || guideFame(b) - guideFame(a); });
  var secs = guideSecs(g), gg = guideGenres(g), mood = guideMood(g.mood), mg = mood && mood.g ? mood.g[g.type] : null;
  progress('Eligiendo las pelis base…');
  var seeds = [], seedKeys = new Set();
  var addSeed = function (it) { if (it && it.type === g.type && !seedKeys.has(it.k) && seeds.length < 6) { seeds.push(it); seedKeys.add(it.k); } };
  var prof = tasteProfile();
  var resolveAll = function (fs) { return Promise.all(fs.map(function (f) { return curResolve(f).catch(function (e) { if (e && e.fatal) throw e; return null; }); })); };
  var picked = g.picked.map(function (id) { return CUR.byId.get(id); }).filter(Boolean);
  if (g.blind) tasteSeeds(12).forEach(addSeed);
  else (await resolveAll(picked)).forEach(addSeed);
  /* completa con los que mejor encajan; si alguno no aparece en TMDB, sigue con el próximo */
  for (var cur0 = 0; seeds.length < (g.blind ? 1 : 5) && cur0 < byFit.length && cur0 < 36; cur0 += 6) {
    var batch0 = byFit.slice(cur0, cur0 + 6).filter(function (f) { return inEra(f.y) && picked.indexOf(f) < 0; });
    (await resolveAll(batch0)).forEach(addSeed);
  }
  if (!g.blind) {
    if (prof.conf >= 0.4) {
      var extra = 0;
      tasteSeeds(12).forEach(function (it) {
        if (extra >= 2 || it.type !== g.type) return;
        var cf = curFind(it), ok = secs ? !!(cf && secs.indexOf(cf.sec) >= 0) || (!!gg && (it.g || []).some(function (x) { return gg.indexOf(x) >= 0; })) : true;
        if (ok && !seedKeys.has(it.k)) { addSeed(it); extra++; }
      });
    }
  }
  var recs = seeds.length ? await recommend(seeds, function (m) { progress('Buscando parecidas: ' + m); }) : [];
  var cands = new Map(), maxM = 0;
  recs.forEach(function (r) { if (r.match > maxM) maxM = r.match; });
  recs.forEach(function (r) { cands.set(r.it.k, { it: r.it, base: maxM ? r.match / maxM : 0.5, why: r.why }); });
  if (!g.blind) {
    var direct = byFit.filter(function (f) { return inEra(f.y); }).slice(0, 12);
    var dres = await Promise.all(direct.map(function (f) { return curResolve(f).catch(function () { return null; }); }));
    dres.forEach(function (it) { if (it && !cands.has(it.k)) cands.set(it.k, { it: fromCatalog(Object.assign({ s: [] }, it)), base: 0.55, why: '' }); });
  }
  /* los que perdieron o se saltearon no vuelven; los que elegiste en un duelo y no viste sí (y suman) */
  var usedKeys = new Set(g.used.filter(function (id) { return g.picked.indexOf(id) < 0; }).map(function (id) { var c = curMap[id]; return c && c.k; }).filter(Boolean));
  var pickedKeys = new Set(g.picked.map(function (id) { var c = curMap[id]; return c && c.k; }).filter(Boolean));
  pickedKeys.forEach(function (k) { if (!cands.has(k) && !seenNow(k)) { var sn = curMap[g.picked.filter(function (id) { return curMap[id] && curMap[id].k === k; })[0]]; if (sn) cands.set(k, { it: fromCatalog(Object.assign({ s: [] }, sn)), base: 0.9, why: '' }); } });
  var inList = new Map(); visibleLists().forEach(function (l) { listKeys(l).forEach(function (k) { if (!inList.has(k)) inList.set(k, l.name); }); });
  var out = [];
  cands.forEach(function (c) {
    var it = c.it;
    if (it.type !== g.type || seenNow(it.k) || !inEra(it.y) || usedKeys.has(it.k) || lowNow(it.k) || isHidden(it.k) || (state.f.noIndia && isIndian(it))) return;
    var cf = curFind(it), fit, gi = it.g || [];
    if (cf) { fit = fitN(cf); if (secs && secs.indexOf(cf.sec) < 0) fit *= 0.4; }
    else {
      if (secs && !gg) return;
      if (gg && gg.length && !gi.some(function (x) { return gg.indexOf(x) >= 0; })) return;
      fit = g.blind ? 0.5 : 0.35 + (mg && gi.some(function (x) { return mg.indexOf(x) >= 0; }) ? 0.15 : 0);
    }
    var q = Math.max(0, Math.min(1, ((it.v || 0) - 5.5) / 3)) * Math.min(1, (it.vc || 0) / 300);
    var r = { it: it, cf: cf, why: c.why, score: (g.blind ? 0.8 : 0.5) * c.base + (g.blind ? 0.1 : 0.42) * fit + 0.08 * q };
    r.why = guideWhy(g, r);
    if (pickedKeys.has(it.k)) { r.score += 0.15; r.why = 'La elegiste en un duelo y todavía no la viste' + (r.why ? ' · ' + r.why : ''); }
    else if (inList.has(it.k)) { r.score += 0.06; r.why = 'Está en tu lista «' + inList.get(it.k) + '»' + (r.why ? ' · ' + r.why : ''); }
    out.push(r);
  });
  out.sort(function (a, b) { return b.score - a.score; });
  var final = [];
  if (g.where === 'mine' || g.rt) {
    progress('Fijándome dónde se puede ver…');
    for (var i = 0; final.length < 24 && i < out.length && i < 160; i += 40) {
      var batch = out.slice(i, i + 40);
      await ensureDetails(batch.map(function (r) { return r.it; }));
      batch.forEach(function (r) {
        var d = state.details[r.it.k];
        if (g.where === 'mine' && !svcOf(r.it).length) return;
        if (g.rt && r.it.type === 'movie' && d && d.rt && d.rt > g.rt) return;
        final.push(r);
      });
    }
  } else { final = out.slice(0, 60); wantDetails(final.slice(0, 9).map(function (r) { return r.it; }), 'hi'); }
  /* si con todo eso quedó muy poco, se completa con lo mejor de ese género que tenés disponible */
  if (final.length < 3) {
    var have = new Set(final.map(function (r) { return r.it.k; })), cat = state.catalogs[g.type];
    var extra = (cat ? cat.items : []).filter(function (it) {
      var gi = it.g || [];
      return !have.has(it.k) && !seenNow(it.k) && !lowNow(it.k) && !isHidden(it.k) && inEra(it.y) && !usedKeys.has(it.k) && !(state.f.noIndia && isIndian(it)) &&
        (!gg || !gg.length || gi.some(function (x) { return gg.indexOf(x) >= 0; })) && (!secs || gg);
    }).sort(function (a, b) { return (b.v || 0) * Math.log10(10 + (b.vc || 0)) - (a.v || 0) * Math.log10(10 + (a.vc || 0)); }).slice(0, 12 - final.length);
    extra.forEach(function (it) { final.push({ it: it, cf: curFind(it), score: 0, why: g.group ? 'De lo mejor de ' + g.group.toLowerCase() + ' en tus servicios' : 'De lo mejor que tenés disponible' }); });
  }
  var byK = new Map(); final.forEach(function (r) { byK.set(r.it.k, r.it); });
  return { items: final, seeds: seeds, byK: byK };
}
async function guideRun(g) {
  try {
    var res = await guideCompute(g, function (msg) { var el = $('#guideProg'); if (el && state.guide === g && g.step === 'loading') el.textContent = msg; });
    if (state.guide !== g || g.step !== 'loading') return;
    g.res = res; g.shown = 0; g.step = 'results'; g.at = Date.now();
    renderGuide(); $('#dlgGuide').scrollTop = 0;
    wantRatings(res.items.slice(0, 6).map(function (r) { return r.it; })); wantStremio(res.items.slice(0, 3).map(function (r) { return r.it; }));
  } catch (e) {
    if (e && e.fatal) { fatal(e); return; }
    if (state.guide === g) { var h = g.hist.pop(); if (h) Object.assign(g, JSON.parse(h)); renderGuide(); toast((e && e.message) || 'Algo falló. Probá de nuevo.'); }
  }
}
function guideShowAll(g) {
  var r = g.res; if (!r) return;
  closeDialog($('#dlgGuide')); closeRail(); clearQuery();
  var meta = new Map(); r.items.forEach(function (x) { meta.set(x.it.k, { match: x.score, why: x.why }); });
  state.special = { kind: 'reco', title: 'Elegidas para hoy', festName: 'Festival de esta noche', seeds: r.seeds, items: r.items.map(function (x) { return x.it; }), meta: meta, loading: false };
  state.ui.sortReco = 'match';
  refresh(); window.scrollTo(0, 0);
}
function guideAct(act, v, b) {
  var g = state.guide; if (!g) return;
  if (act === 'back') { guideBack(); return; }
  if (act === 'restart') { state.guide = guideNew(); renderGuide(); return; }
  if (act === 'random') { closeDialog($('#dlgGuide')); state.guide = null; pickOne(); return; }
  if (act === 'with') { setDuo(v || null); renderGuide(); return; }
  if (act === 'duo') { closeDialog($('#dlgGuide')); openDuo(); return; }
  if (act === 'blind') { guidePush(); g.blind = true; g.step = 'details'; renderGuide(); return; }
  if (act === 'type') { guidePush(); g.type = v === 'tv' ? 'tv' : 'movie'; g.step = 'mood'; renderGuide(); return; }
  if (act === 'mood') {
    var m = guideMood(v); if (!m) return;
    guidePush(); g.mood = m.k;
    m.ton.forEach(function (t) { g.T['o:' + t] = (g.T['o:' + t] || 0) + 0.8; });
    (m.subs || []).forEach(function (s2) { g.T['s:' + s2] = (g.T['s:' + s2] || 0) + 0.8; });
    g.step = g.type === 'tv' ? 'duel' : 'genre'; renderGuide(); return;
  }
  if (act === 'genre') { guidePush(); g.group = v || null; g.step = 'duel'; renderGuide(); return; }
  if (act === 'duel') { guideDuel(v); return; }
  if (act === 'set') { var key = b.dataset.key; if (key === 'rt') g.rt = +v || 0; else if (key === 'type') g.type = v === 'tv' ? 'tv' : 'movie'; else if (key === 'era' && GUIDE_ERAS[v]) g.era = v; else if (key === 'where') g.where = v === 'all' ? 'all' : 'mine'; renderGuide(); return; }
  if (act === 'go') { guidePush(); g.step = 'loading'; renderGuide(); guideRun(g); return; }
  if (act === 'more') { g.shown += 3; renderGuide(); $('#dlgGuide').scrollTop = 0; var nx = g.res.items.slice(g.shown, g.shown + 3).map(function (r) { return r.it; }); wantRatings(nx); wantStremio(nx); return; }
  if (act === 'open') { var it = g.res && g.res.byK.get(v); if (it) { closeDialog($('#dlgGuide')); openDetail(it); } return; }
  if (act === 'watch') { var it2 = g.res && g.res.byK.get(v); if (it2) { var on = toggleList('watchlist', it2); toast(on ? 'Sumada a Mi lista.' : 'Sacada de Mi lista.'); renderGuide(); } return; }
  if (act === 'hide') {
    var it3 = g.res && g.res.byK.get(v); if (!it3) return;
    toggleHidden(it3, true); g.res.items = g.res.items.filter(function (r) { return r.it.k !== v; });
    toast('Oculta. No vuelve a aparecer; la recuperás en Listas › Ocultas.'); renderGuide(); refreshSoon(); return;
  }
  if (act === 'all') { guideShowAll(g); return; }
  if (act === 'fest') { if (g.res && g.res.seeds.length) { closeDialog($('#dlgGuide')); createRadio(g.res.seeds, 'Festival de esta noche'); } return; }
}

/* ---------- botón Atrás (Android) ----------
   Cada pantalla que se abre (una ficha, festivales, el acomodador, de a dos, ajustes, los
   filtros en el celu, o vistas como "Más como esta", una persona o una búsqueda) suma una
   entrada al historial del navegador. Atrás vuelve exactamente a la anterior, aunque eso
   signifique reabrir la ficha de la que venías. En la pantalla principal, el primer Atrás
   avisa y recién el segundo seguido sale de la app. */
var NAV = { entries: [], idx: 0, armed: false, skip: 0, applying: false, queued: false };
var NAV_DIALOGS = ['dlgDetail', 'dlgGuide', 'dlgFest', 'dlgDuo', 'dlgSettings'];
function navSnap() {
  var top = null;
  for (var i = 0; i < NAV_DIALOGS.length; i++) { var d = document.getElementById(NAV_DIALOGS[i]); if (d && d.open) { top = NAV_DIALOGS[i]; break; } }
  return { view: state.ui.view, special: state.special || null, dialog: top, detail: top === 'dlgDetail' && state.detail ? state.detail.it : null, rail: document.body.classList.contains('rail-open'), menu: !$('#listMenu').hidden, gstep: top === 'dlgGuide' && state.guide ? state.guide.hist.length : 0, y: 0 };
}
function navSame(a, b) { return !!a && !!b && (a.view || 'catalog') === (b.view || 'catalog') && a.special === b.special && a.dialog === b.dialog && a.rail === b.rail && !!a.menu === !!b.menu && (a.gstep || 0) === (b.gstep || 0) && (a.detail ? !!b.detail && a.detail.k === b.detail.k : !b.detail); }
function navSoon() {
  if (NAV.queued || NAV.applying || !NAV.armed) return;
  NAV.queued = true;
  Promise.resolve().then(function () { NAV.queued = false; navSync(); });
}
/* en la ficha, «Volver» aparece cuando atrás hay otra pantalla abierta (por ejemplo, el acomodador) */
function navPrevDialog() { var p = NAV.armed && NAV.idx > 1 ? NAV.entries[NAV.idx - 1] : null; return !!(p && p.dialog); }
function syncDlgBack() { $$('.dlg-back').forEach(function (b) { b.hidden = !navPrevDialog(); }); }
function navSync() {
  if (NAV.applying || !NAV.armed) return;
  var s = navSnap(), cur = NAV.entries[NAV.idx];
  if (navSame(s, cur)) { syncDlgBack(); return; }
  var prev = NAV.idx > 1 ? NAV.entries[NAV.idx - 1] : null;
  if (prev && navSame(s, prev)) { NAV.idx--; NAV.skip++; history.back(); return; }
  NAV.entries = NAV.entries.slice(0, NAV.idx + 1); NAV.entries.push(s); NAV.idx++;
  try { history.pushState({ wl: NAV.idx }, ''); } catch (e) {}
  syncDlgBack();
}
/* volver: lo mismo que el Atrás de Android; en iPhone instalada, también deslizando desde el borde izquierdo */
function goBack() {
  if (navBack()) return true;
  var top = null; NAV_DIALOGS.forEach(function (id) { var d = document.getElementById(id); if (!top && d && d.open) top = d; });
  if (top) { closeDialog(top); return true; }
  if (document.body.classList.contains('rail-open')) { closeRail(); return true; }
  if (state.special) { state.special = null; refresh(); window.scrollTo(0, 0); return true; }
  return false;
}
function edgeSwipeBack() {
  if (!(isIOS() && isStandalone())) return;
  var st = null;
  document.addEventListener('touchstart', function (e) { var t = e.touches[0]; st = t && e.touches.length === 1 && t.clientX < 24 ? { x: t.clientX, y: t.clientY, at: Date.now() } : null; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0]; if (!st || !t) return;
    var dx = t.clientX - st.x, dy = Math.abs(t.clientY - st.y), quick = Date.now() - st.at < 700; st = null;
    if (dx > 70 && dy < 60 && quick) goBack();
  }, { passive: true });
}
/* la primera entrada se crea con un toque del usuario (Chrome saltea las que se crean sin interacción) */
function navArm() {
  if (NAV.armed) return;
  NAV.armed = true;
  NAV.entries = [{ view: 'catalog', special: null, dialog: null, detail: null, rail: false, menu: false, y: 0 }, navSnap()];
  NAV.entries[1].y = window.scrollY;
  NAV.idx = 1;
  try { history.replaceState({ wl: 0 }, ''); history.pushState({ wl: 1 }, ''); } catch (e) {}
}
function navApply(s) {
  NAV.applying = true;
  try {
    closeMenu(); s.menu = false;
    if (s.rail) openRail(); else closeRail();
    NAV_DIALOGS.forEach(function (id) { var d = document.getElementById(id); if (d && d.open && id !== s.dialog) closeDialog(d); });
    var vchg = s.view && state.ui.view !== s.view;
    if (vchg) { state.ui.view = s.view; renderRail(); if (s.view === 'catalog') loadCatalogAndRefresh(state.ui.type); }
    if (state.special !== s.special || vchg) {
      state.special = s.special;
      refresh(true);
      var y = s.y || 0; requestAnimationFrame(function () { window.scrollTo(0, y); });
    }
    var dlg = s.dialog && document.getElementById(s.dialog);
    if (s.dialog === 'dlgDetail' && s.detail) { if (!dlg.open || !state.detail || state.detail.k !== s.detail.k) openDetail(s.detail); }
    else if (dlg && !dlg.open) {
      if (s.dialog === 'dlgGuide') { if (!state.guide) state.guide = guideNew(); renderGuide(); }
      else if (s.dialog === 'dlgFest') { renderFest(); renderFestDraft(); }
      else if (s.dialog === 'dlgDuo') renderDuo();
      else if (s.dialog === 'dlgSettings') fillSettingsForm();
      openDialog(dlg);
    }
    if (s.dialog === 'dlgGuide' && state.guide) {
      while (state.guide.hist.length > (s.gstep || 0)) guideBack();
      s.gstep = state.guide.hist.length;
    }
  } finally { NAV.applying = false; }
}
function navBack() { if (NAV.armed && NAV.idx > 1) { history.back(); return true; } return false; }
function navInit() {
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, navArm, true); });
  window.addEventListener('scroll', function () { var e = NAV.entries[NAV.idx]; if (e && !e.dialog) e.y = window.scrollY; }, { passive: true });
  NAV_DIALOGS.forEach(function (id) { var d = document.getElementById(id); if (d) d.addEventListener('close', navSoon); });
  window.addEventListener('popstate', function (e) {
    var st = e.state; if (!st || typeof st.wl !== 'number') return;
    if (NAV.skip) { NAV.skip--; return; }
    if (st.wl === 0 && NAV.armed) {
      var wasBase = navSame(NAV.entries[1], NAV.entries[0]);
      NAV.armed = false; NAV.idx = 0;
      navApply(NAV.entries[0]);
      if (wasBase) toast('Tocá Atrás otra vez para salir.');
      return;
    }
    var target = NAV.entries[st.wl]; if (!target) return;
    NAV.idx = st.wl; navApply(target);
  });
}

/* ---------- cuentas: login con Google y datos en la nube (Firebase) ----------
   Opcional y por invitación. Sin sesión la app funciona igual que siempre, todo en el
   dispositivo. Con sesión: tus listas, vistas y estrellas viven en tu cuenta (se mezclan
   con las del dispositivo sin pisar nada), las claves de los catálogos llegan solas, tus
   watch buddies ven tu gusto, las listas compartidas se editan entre varios y los
   puntajes de OMDb quedan guardados para todos. Quién puede leer y escribir qué lo deciden
   las reglas de Firestore (firestore.rules en el repo); esta configuración web no es secreta. */
var FB_CONFIG = {
  apiKey: 'AIzaSyCTPqv7a9eQepqnqDhhoRiB0NuvSyc22kg',
  authDomain: 'watchlisto-de547.firebaseapp.com',
  projectId: 'watchlisto-de547',
  storageBucket: 'watchlisto-de547.firebasestorage.app',
  messagingSenderId: '329902641670',
  appId: '1:329902641670:web:5395493de69053a2016987'
};
var FB_BASE = 'https://www.gstatic.com/firebasejs/12.11.0/';
var ADMIN_EMAIL = 'pfiguerero@gmail.com';
var CLOUD = { api: null, loading: null, authUnsub: null, user: null, status: 'off', admin: false, unsubs: [], shared: new Map(), buddies: [], buddyUids: [], invites: null, requests: null, requested: false, modelKey: '', tasteKey: '', pendingBuddy: null };
function cloudIn() { return CLOUD.status === 'in' && !!CLOUD.user; }
function cloudUid() { return CLOUD.user ? CLOUD.user.uid : ''; }
function randomCode(n) { var a = new Uint8Array(n), abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; crypto.getRandomValues(a); for (var i = 0; i < n; i++) s += abc.charAt(a[i] % abc.length); return s; }
function appUrl() { return location.origin + location.pathname; }
function myDisplayName() { return (state.settings.myName || (CLOUD.user && CLOUD.user.name) || 'Alguien').slice(0, 30); }
function isDenied(e) { return !!e && (e.code === 'permission-denied' || /permission/i.test(String(e.code || ''))); }
function cloudErrText(e) {
  var c = (e && e.code) || '';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return 'Cerraste la ventana de Google antes de terminar.';
  if (c === 'auth/network-request-failed' || c === 'unavailable') return 'Sin conexión. Probá de nuevo en un rato.';
  if (c === 'auth/unauthorized-domain') return 'Falta autorizar este dominio en Firebase (Authentication → Dominios autorizados).';
  if (c === 'auth/operation-not-allowed') return 'El acceso con Google no está habilitado en Firebase.';
  return 'No pude conectar con tu cuenta' + (c ? ' (' + c + ')' : '') + '.';
}

/* adaptador: Firebase de verdad o, solo en localhost para las pruebas, uno simulado */
async function loadCloudApi() {
  if (CLOUD.api) return CLOUD.api;
  if (!CLOUD.loading) CLOUD.loading = (async function () {
    if (window.__fbMock && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return (CLOUD.api = window.__fbMock);
    var mods = await Promise.all([import(FB_BASE + 'firebase-app.js'), import(FB_BASE + 'firebase-auth.js'), import(FB_BASE + 'firebase-firestore.js')]);
    var A = mods[0], Au = mods[1], F = mods[2];
    var app = A.initializeApp(FB_CONFIG);
    var auth = Au.initializeAuth(app, { persistence: [Au.indexedDBLocalPersistence, Au.browserLocalPersistence], popupRedirectResolver: Au.browserPopupRedirectResolver });
    var db = F.initializeFirestore(app, {});
    var ref = function (p) { return F.doc(db, p); };
    var val = function (v) { return v && v.__op === 'union' ? F.arrayUnion(v.v) : v && v.__op === 'remove' ? F.arrayRemove(v.v) : v === undefined ? F.deleteField() : v; };
    var obj = function (o) { var out = {}; Object.keys(o).forEach(function (k) { out[k] = val(o[k]); }); return out; };
    var docs = function (qs) { return qs.docs.map(function (d) { return { id: d.id, data: d.data() }; }); };
    CLOUD.api = {
      signIn: async function () {
        var p = new Au.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
        try { await Au.signInWithPopup(auth, p); }
        catch (e) { if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) await Au.signInWithRedirect(auth, p); else throw e; }
      },
      redirectResult: function () { return Au.getRedirectResult(auth).catch(function () { return null; }); },
      signOut: function () { return Au.signOut(auth); },
      onAuth: function (cb) { return Au.onAuthStateChanged(auth, function (u) { cb(u ? { uid: u.uid, email: String(u.email || '').toLowerCase(), name: u.displayName || '', photo: u.photoURL || '' } : null); }); },
      get: async function (p) { var s = await F.getDoc(ref(p)); return s.exists() ? s.data() : null; },
      list: async function (c) { return docs(await F.getDocs(F.collection(db, c))); },
      set: function (p, data, merge) { return F.setDoc(ref(p), obj(data), merge ? { merge: true } : {}); },
      update: function (p, pairs) { var args = [ref(p)]; pairs.forEach(function (x) { args.push(new F.FieldPath(...x[0]), val(x[1])); }); return F.updateDoc.apply(null, args); },
      del: function (p) { return F.deleteDoc(ref(p)); },
      watch: function (p, cb, err) { return F.onSnapshot(ref(p), function (s) { cb(s.exists() ? s.data() : null); }, err); },
      watchWhere: function (c, field, op, v, cb, err) { return F.onSnapshot(F.query(F.collection(db, c), F.where(field, op, v)), function (qs) { cb(docs(qs)); }, err); },
      tx: function (p, fn) { return F.runTransaction(db, async function (t) { var s = await t.get(ref(p)); var next = fn(s.exists() ? s.data() : null); if (next) t.set(ref(p), next); return next; }); },
      union: function (v) { return { __op: 'union', v: v }; },
      remove: function (v) { return { __op: 'remove', v: v }; }
    };
    return CLOUD.api;
  })().catch(function (e) { CLOUD.loading = null; throw e; });
  return CLOUD.loading;
}
async function cloudStart() {
  var api = await loadCloudApi();
  if (CLOUD.authUnsub) return api;
  if (api.redirectResult) api.redirectResult();
  CLOUD.authUnsub = api.onAuth(function (u) { onCloudUser(u).catch(function (e) { CLOUD.lastError = String((e && (e.code || e.message)) || e); if (e && e.fatal) fatal(e); else { CLOUD.status = 'error'; renderCloudUI(); } }); });
  return api;
}
function cloudBoot() { if (LS.get('cloudOn', false)) { CLOUD.status = 'checking'; cloudStart().catch(function () { CLOUD.status = 'error'; renderCloudUI(); }); } }
async function cloudSignIn() {
  CLOUD.status = 'checking'; renderCloudUI();
  try { var api = await cloudStart(); await api.signIn(); }
  catch (e) { CLOUD.status = CLOUD.user ? CLOUD.status : 'out'; renderCloudUI(); toast(cloudErrText(e)); }
}
async function cloudSignOut() {
  if (!CLOUD.api) return;
  if (CLOUD.inviteUnsub) { try { CLOUD.inviteUnsub(); } catch (e) {} CLOUD.inviteUnsub = null; }
  await CLOUD.api.signOut();
  LS.del('cloudOn');
  toast('Saliste de tu cuenta. Lo de este dispositivo queda acá.');
}
function cloudStopWatches() { CLOUD.unsubs.forEach(function (u) { try { u(); } catch (e) {} }); CLOUD.unsubs = []; }
async function onCloudUser(u) {
  cloudStopWatches();
  CLOUD.user = u; CLOUD.modelKey = ''; CLOUD.tasteKey = '';
  if (!u) { CLOUD.status = 'out'; CLOUD.shared.clear(); CLOUD.buddies = []; CLOUD.buddyUids = []; CLOUD.invites = null; CLOUD.requests = null; CLOUD.requested = false; renderReqBadge(); renderCloudUI(); renderDuoBtn(); refresh(true); return; }
  LS.set('cloudOn', true);
  CLOUD.status = 'checking'; CLOUD.admin = u.email === ADMIN_EMAIL; renderCloudUI();
  var keys;
  try { keys = await CLOUD.api.get('config/keys'); }
  catch (e) {
    CLOUD.lastErr = String((e && e.code) || '') + (e && e.message ? ': ' + String(e.message).slice(0, 200) : ''); CLOUD.status = isDenied(e) ? 'denied' : 'error'; renderCloudUI();
    if (CLOUD.status === 'denied' && !CLOUD.admin) accessCheck(u);
    return;
  }
  CLOUD.lastErr = '';
  CLOUD.status = 'in';
  await cloudApplyKeys(keys);
  await cloudSyncModel();
  CLOUD.api.set('users/' + u.uid, { name: myDisplayName(), photo: u.photo || '', at: Date.now() }, true).catch(function () {});
  cloudWatch();
  if (CLOUD.admin) cloudLoadInvites();
  renderCloudUI(); refresh(true);
  if (CLOUD.pendingBuddy || LS.get('pendingBuddy', null)) buddyOpenPending();
}
/* claves de catálogo: el administrador las publica, los invitados las reciben sin tocar nada */
async function cloudApplyKeys(keys) {
  var s = state.settings, changed = false, ok = function (v) { return typeof v === 'string' && v.length <= 400 && TOKEN_CHARS.test(v); };
  if (keys) {
    if (!s.tmdbKey && ok(keys.tmdb) && keys.tmdb) { s.tmdbKey = keys.tmdb; changed = true; }
    if (!s.omdbKey && ok(keys.omdb) && keys.omdb) { s.omdbKey = keys.omdb; changed = true; }
  }
  if (CLOUD.admin && s.tmdbKey && (!keys || keys.tmdb !== s.tmdbKey || (keys.omdb || '') !== (s.omdbKey || ''))) {
    await CLOUD.api.set('config/keys', { tmdb: s.tmdbKey, omdb: s.omdbKey || '', at: Date.now() }).catch(function () {});
  }
  if (changed) { saveSettings(); state.omdbStop = null; if (document.body.classList.contains('onboarding')) start(); }
}
/* tus datos: el mismo modelo que se sincroniza entre dispositivos, mezclado en una transacción */
var cloudPushSoon = debounce(function () { cloudSyncModel().catch(function () {}); }, 2500);
async function cloudSyncModel() {
  if (!cloudIn()) return;
  var path = 'users/' + cloudUid() + '/private/model', merged = null;
  await CLOUD.api.tx(path, function (cur) {
    var remote = null;
    try { remote = cur && typeof cur.json === 'string' ? normUser(JSON.parse(cur.json)) : null; } catch (e) { remote = null; }
    merged = remote ? mergeUsers(state.user, remote) : state.user;
    if (remote && contentKey(remote) === contentKey(merged)) return null;
    return { json: JSON.stringify(merged), at: Date.now() };
  });
  if (merged && contentKey(merged) !== contentKey(state.user)) { state.user = merged; LS.set('user', state.user); refresh(true); }
  CLOUD.modelKey = contentKey(state.user);
  await cloudPushTaste();
}
function onCloudModel(d) {
  if (!d || typeof d.json !== 'string') return;
  var remote; try { remote = normUser(JSON.parse(d.json)); } catch (e) { return; }
  var merged = mergeUsers(state.user, remote), key = contentKey(merged);
  if (key !== contentKey(state.user)) { state.user = merged; LS.set('user', state.user); refreshSoon(); }
  if (key !== contentKey(remote)) cloudPushSoon();
}
/* lo que ven tus watch buddies: vistas, estrellas y lo mínimo de cada título */
function tastePayload() {
  var seen = {}, stars = {}, items = {};
  mySignals().forEach(function (s) { seen[s.k] = isSeen(s.k) ? 1 : 0; if (s.n) stars[s.k] = s.n; var it = s.it; items[s.k] = [String(it.t || '').slice(0, 80), it.y || 0, (it.g || []).slice(0, 4), it.l || '', safePath(it.p) || '']; });
  return { seen: seen, stars: stars, items: items };
}
async function cloudPushTaste() {
  if (!cloudIn()) return;
  var json = JSON.stringify(tastePayload());
  if (json === CLOUD.tasteKey) return;
  await CLOUD.api.set('users/' + cloudUid() + '/private/taste', { json: json, name: myDisplayName(), at: Date.now() });
  CLOUD.tasteKey = json;
}
function cloudWatch() {
  var api = CLOUD.api, uid = cloudUid(), soft = function () {};
  CLOUD.unsubs.push(api.watch('users/' + uid + '/private/model', onCloudModel, soft));
  CLOUD.unsubs.push(api.watch('users/' + uid, function (d) { var b = d && Array.isArray(d.buddies) ? d.buddies.filter(function (x) { return typeof x === 'string' && x !== uid; }) : []; if (b.join() !== CLOUD.buddyUids.join()) { CLOUD.buddyUids = b; loadBuddies(); } }, soft));
  CLOUD.unsubs.push(api.watchWhere('lists', 'members', 'array-contains', uid, onSharedLists, soft));
  CLOUD.unsubs.push(api.watchWhere('buddyInvites', 'from', '==', uid, onMyBuddyInvites, soft));
  if (CLOUD.admin) CLOUD.unsubs.push(api.watchWhere('accessRequests', 'at', '>', 0, onAccessRequests, soft));
}

/* --- pedidos de acceso: quien entra con Google sin invitación lo pide desde la app y el
   administrador lo aprueba en Perfil. Al aprobarlo, la otra persona entra sola. --- */
function accessCheck(u) {
  CLOUD.api.get('accessRequests/' + u.email).then(function (d) { CLOUD.requested = !!d; if (d) accessWatch(u); renderCloudUI(); }, function () {});
}
async function accessRequest(btn) {
  var u = CLOUD.user; if (!u || !CLOUD.api) return;
  if (btn) btn.disabled = true;
  try {
    await CLOUD.api.set('accessRequests/' + u.email, { name: String(myDisplayName() || u.email).replace(/[<>]/g, '').slice(0, 60), uid: u.uid, at: Date.now() });
    CLOUD.requested = true; accessWatch(u); renderCloudUI();
    toast('Pedido enviado. Cuando te aprueben, entrás solo.');
  } catch (e) { toast('No pude mandar el pedido. Probá de nuevo.'); if (btn) btn.disabled = false; }
}
function accessWatch(u) {
  if (CLOUD.inviteUnsub) return;
  CLOUD.inviteUnsub = CLOUD.api.watch('invites/' + u.email, function (d) {
    if (!d || CLOUD.status !== 'denied' || !CLOUD.user || CLOUD.user.uid !== u.uid) return;
    var stop = CLOUD.inviteUnsub; CLOUD.inviteUnsub = null; if (stop) try { stop(); } catch (e) {}
    CLOUD.requested = false; toast('¡Te aprobaron! Entrando…');
    onCloudUser(u).catch(function (e) { CLOUD.lastErr = String((e && (e.code || e.message)) || e); CLOUD.status = 'error'; renderCloudUI(); });
  }, function () {});
}
function onAccessRequests(docs) {
  var prev = CLOUD.requests, list = docs.map(function (d) { return { email: d.id, name: String((d.data && d.data.name) || '').slice(0, 60), at: +(d.data && d.data.at) || 0 }; })
    .filter(function (r) { return /^[^\s@\/]+@[^\s@\/]+$/.test(r.email); }).sort(function (a, b) { return b.at - a.at; });
  if (prev) list.forEach(function (r) { if (!prev.some(function (x) { return x.email === r.email; })) toast((r.name || r.email) + ' pidió acceso. Lo aprobás en Perfil.'); });
  CLOUD.requests = list; renderReqBadge();
  if (state.ui.view === 'profile') renderProfile();
}
function renderReqBadge() {
  var n = CLOUD.requests ? CLOUD.requests.length : 0;
  $$('#tabbar [data-tab="profile"], #viewSeg [data-view="profile"]').forEach(function (b) { b.classList.toggle('has-badge', n > 0); b.dataset.badge = n ? String(Math.min(n, 9)) : ''; });
}
async function accessDecide(email, ok) {
  var r = (CLOUD.requests || []).filter(function (x) { return x.email === email; })[0]; if (!r) return;
  try {
    if (ok) await inviteAdd(email, r.name);
    await CLOUD.api.del('accessRequests/' + email);
    toast(ok ? (r.name || email) + ' ya puede entrar.' : 'Pedido rechazado.');
  } catch (e) { toast('No pude ' + (ok ? 'aprobar' : 'rechazar') + ' el pedido.'); }
}

/* --- watch buddies: invitación por link, cada uno decide quién ve su gusto --- */
async function loadBuddies() {
  var out = [];
  await Promise.all(CLOUD.buddyUids.map(async function (b) {
    var prof = null, taste = null;
    try { prof = await CLOUD.api.get('users/' + b); } catch (e) {}
    try { taste = await CLOUD.api.get('users/' + b + '/private/taste'); } catch (e) {}
    var c = { id: 'u:' + b, uid: b, name: String((prof && prof.name) || (taste && taste.name) || 'Buddy').slice(0, 30), photo: prof && prof.photo || '', at: (taste && taste.at) || 0, src: 'cloud', pending: !taste, seen: {}, stars: {}, items: {} };
    if (taste && typeof taste.json === 'string') {
      try {
        var t = JSON.parse(taste.json);
        Object.keys(t.seen || {}).forEach(function (k) { if (validKey(k)) c.seen[k] = c.at || 1; });
        Object.keys(t.stars || {}).forEach(function (k) { var n = Math.round(+t.stars[k]); if (validKey(k) && n >= 1 && n <= 5) c.stars[k] = n; });
        Object.keys(t.items || {}).forEach(function (k) { var r = t.items[k]; if (validKey(k) && Array.isArray(r)) { var s = cleanSnap({ t: r[0], y: r[1], g: Array.isArray(r[2]) ? r[2] : [], l: r[3], p: r[4] }, k); if (s) c.items[k] = s; } });
      } catch (e) {}
    }
    out.push(c);
  }));
  out.sort(function (a, b) { return a.name.localeCompare(b.name); });
  CLOUD.buddies = out;
  /* si la otra persona todavía no confirmó, se reintenta un rato */
  clearTimeout(CLOUD.retryT);
  if (out.some(function (c) { return c.pending; }) && (CLOUD.retries = (CLOUD.retries || 0) + 1) <= 12) CLOUD.retryT = setTimeout(function () { if (cloudIn()) loadBuddies(); }, 15000);
  else if (!out.some(function (c) { return c.pending; })) CLOUD.retries = 0;
  var ds = LS.get('duo', null);
  if (!state.duo && ds && +ds.until > Date.now() && out.some(function (c) { return c.id === ds.id; })) state.duo = ds.id;
  renderDuoBtn();
  if ($('#dlgDuo').open) renderDuo();
  if (state.ui.view === 'profile') renderProfile();
}
async function buddyInvite(btn) {
  if (!cloudIn()) { toast('Primero entrá con tu cuenta de Google.'); return; }
  if (btn) btn.disabled = true;
  try {
    var code = randomCode(20);
    await CLOUD.api.set('buddyInvites/' + code, { from: cloudUid(), fromName: myDisplayName(), at: Date.now() });
    await shareLink(appUrl() + '#buddy=' + code, invitePitch('buddy'), 'Mensaje y link copiados. Cuando lo acepte, aparece en tus buddies.');
  } catch (e) { toast(isDenied(e) ? 'Tu cuenta no tiene permiso para invitar.' : 'No pude crear la invitación.'); }
  finally { if (btn) btn.disabled = false; }
}
function readBuddyHash() {
  var h = location.hash || ''; if (h.indexOf('#buddy=') !== 0) return;
  try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
  var code = h.slice(7); if (!/^[A-Za-z0-9]{16,40}$/.test(code)) return;
  CLOUD.pendingBuddy = code; LS.set('pendingBuddy', code);
}
async function buddyOpenPending() {
  var code = CLOUD.pendingBuddy || LS.get('pendingBuddy', null); if (!code) return;
  if (!cloudIn()) { CLOUD.pendingBuddy = code; openDuo(); return; }
  var inv = null;
  try { inv = await CLOUD.api.get('buddyInvites/' + code); } catch (e) {}
  CLOUD.pendingBuddy = null; LS.del('pendingBuddy');
  if (!inv || typeof inv.from !== 'string') { toast('Esa invitación ya no existe o ya se usó.'); return; }
  if (inv.from === cloudUid()) { toast('Es tu propia invitación: mandásela a la otra persona.'); return; }
  state.buddyOffer = { code: code, from: inv.from, name: String(inv.fromName || 'Alguien').slice(0, 30) };
  openDuo();
}
async function buddyAccept() {
  var o = state.buddyOffer; if (!o || !cloudIn()) return;
  state.buddyOffer = null;
  try {
    await CLOUD.api.set('users/' + cloudUid(), { buddies: CLOUD.api.union(o.from), name: myDisplayName(), at: Date.now() }, true);
    await CLOUD.api.update('buddyInvites/' + o.code, [[['acceptedBy'], cloudUid()], [['acceptedName'], myDisplayName()]]);
    toast('Listo, ' + o.name + ' es tu watch buddy.');
  } catch (e) { toast('No pude aceptar la invitación.'); }
  renderDuo();
}
function onMyBuddyInvites(docs) {
  CLOUD.myInvites = docs.length;
  docs.forEach(function (d) {
    var a = d.data && d.data.acceptedBy;
    if (typeof a !== 'string' || !a || a === cloudUid()) return;
    CLOUD.api.set('users/' + cloudUid(), { buddies: CLOUD.api.union(a) }, true)
      .then(function () { return CLOUD.api.del('buddyInvites/' + d.id); })
      .then(function () { toast((d.data.acceptedName || 'Alguien') + ' aceptó ser tu watch buddy.'); }, function () {});
  });
}
async function buddyRemove(uid) {
  if (!cloudIn()) return;
  await CLOUD.api.set('users/' + cloudUid(), { buddies: CLOUD.api.remove(uid) }, true);
  if (state.duo === 'u:' + uid) setDuo(null);
}
/* el mensaje que acompaña el link al compartirlo (WhatsApp y demás): qué es y qué se puede hacer */
function invitePitch(kind, toName, email) {
  var me = myDisplayName(), hi = kind === 'buddy' ? me + ' te invita a ser su watch buddy en WatchListo 🍿' : (toName ? toName + ', te' : 'Te') + ' invito a WatchListo 🍿';
  return [hi, '',
    'Una app con búsqueda, listado y recomendación de pelis y series:', '',
    '• Filtra por streaming service (Netflix, Prime Video, Disney+, HBO Max, Stremio y los servicios que tengas) en un solo catálogo con puntajes de IMDb, Rotten Tomatoes y/o Metacritic.',
    '• Te dice en qué calidad y con qué idiomas está cada peli y en qué servicio.',
    '• Te permite guardar listas custom, a mano o generadas automáticamente con un recommendation engine personalizado a tus gustos.',
    '• Random te hace un par de preguntas y te recomienda según lo que ya viste y te gustó.',
    '• Festivales que se arman solos por género, director o a partir de tus favoritas (como las radios de Spotify, pero para pelis y series).',
    '• De a dos: recomendaciones que cruzan tu gusto con el de otra persona, y listas compartidas.', '',
    kind === 'buddy' ? 'Instalala desde el link y entrá con tu cuenta de Google. Si te dice que no estás invitado, tocá «Pedir acceso».'
      : 'Instalala desde el link y entrá con tu cuenta de Google' + (email ? ' (' + email + ')' : '') + ': te llega todo configurado.'
  ].join('\n');
}
async function shareLink(url, text, copiedMsg) {
  if (navigator.share) { try { await navigator.share({ title: 'WatchListo', text: text, url: url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  var all = text ? text + '\n' + url : url;
  try { await navigator.clipboard.writeText(all); toast(copiedMsg || 'Link copiado.'); } catch (e) { window.prompt('Copiá este mensaje:', all); }
}

/* --- listas compartidas: un documento por lista, con sus miembros; cada cambio es un campo,
   así dos personas pueden sumar y sacar a la vez sin pisarse --- */
var SHARED_MAPS = ['adds', 'rms', 'seeds', 'nos'];
function normShared(id, d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.members) || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) return null;
  var l = blankList(id, String(d.name || 'Lista').slice(0, 40), +d.nameAt || 0);
  l.createdAt = +d.createdAt || 0; l.deletedAt = +d.deletedAt || 0;
  SHARED_MAPS.forEach(function (f) { l[f] = tsMap(d[f]); });
  l.tags = tagMap(d.tags);
  l.shared = true; l.owner = String(d.owner || '');
  l.members = d.members.filter(function (x) { return typeof x === 'string'; }).slice(0, 20);
  l.memberNames = {}; if (d.memberNames && typeof d.memberNames === 'object') l.members.forEach(function (m) { if (typeof d.memberNames[m] === 'string') l.memberNames[m] = d.memberNames[m].slice(0, 30); });
  l.items = {}; if (d.items && typeof d.items === 'object') Object.keys(d.items).forEach(function (k) { if (validKey(k)) { var s = cleanSnap(d.items[k], k); if (s) l.items[k] = s; } });
  return l;
}
function cloneShared(l) { return JSON.parse(JSON.stringify({ name: l.name, nameAt: l.nameAt, deletedAt: l.deletedAt, adds: l.adds, rms: l.rms, seeds: l.seeds, nos: l.nos, tags: l.tags || {}, items: l.items || {} })); }
function onSharedLists(docs) {
  var seen = new Set();
  docs.forEach(function (d) {
    var srv = normShared(d.id, d.data); if (!srv) return;
    seen.add(d.id);
    var loc = CLOUD.shared.get(d.id);
    if (!loc) { loc = srv; CLOUD.shared.set(d.id, loc); }
    else {
      if (srv.nameAt > loc.nameAt) { loc.name = srv.name; loc.nameAt = srv.nameAt; }
      loc.deletedAt = Math.max(loc.deletedAt || 0, srv.deletedAt || 0);
      SHARED_MAPS.forEach(function (f) { maxInto(loc[f], srv[f]); });
      Object.keys(srv.tags).forEach(function (k) { var a = srv.tags[k], c = loc.tags[k]; if (!c || a.at > c.at) loc.tags[k] = a; });
      Object.keys(srv.items).forEach(function (k) { loc.items[k] = loc.items[k] || srv.items[k]; });
      loc.members = srv.members; loc.memberNames = srv.memberNames; loc.owner = srv.owner;
    }
    loc._synced = cloneShared(srv);
  });
  Array.from(CLOUD.shared.keys()).forEach(function (id) { if (!seen.has(id)) CLOUD.shared.delete(id); });
  pushShared();
  refreshSoon();
}
function sharedLists() { return Array.from(CLOUD.shared.values()); }
var pushSharedSoon = debounce(function () { pushShared(); }, 700);
function pushShared() {
  if (!cloudIn()) return;
  CLOUD.shared.forEach(function (l, id) {
    var s = l._synced; if (!s) return;
    var ups = [];
    SHARED_MAPS.forEach(function (f) { var a = l[f] || {}, b = s[f] || {}; Object.keys(a).forEach(function (k) { if (a[k] !== b[k]) ups.push([[f, k], a[k]]); }); });
    Object.keys(l.tags || {}).forEach(function (k) { var a = l.tags[k], b = (s.tags || {})[k]; if (!b || a.at !== b.at || a.v !== b.v) ups.push([['tags', k], { v: a.v, at: a.at }]); });
    if (l.nameAt !== s.nameAt) { ups.push([['name'], l.name]); ups.push([['nameAt'], l.nameAt]); }
    if ((l.deletedAt || 0) !== (s.deletedAt || 0)) ups.push([['deletedAt'], l.deletedAt || 0]);
    Object.keys(l.adds).concat(Object.keys(l.seeds)).forEach(function (k) {
      if ((s.items || {})[k]) return;
      var snap = state.user.items[k] || l.items[k] || (catIndex(typeOfKey(k)) || new Map()).get(k);
      if (snap) { snap = cleanSnap(snap, k); l.items[k] = snap; ups.push([['items', k], snap]); }
    });
    if (!ups.length) return;
    var prev = l._synced; l._synced = cloneShared(l);
    CLOUD.api.update('lists/' + id, ups.slice(0, 400)).catch(function (e) { l._synced = prev; toast(isDenied(e) ? 'Ya no tenés acceso a «' + l.name + '».' : 'No pude guardar «' + l.name + '». Reintento cuando vuelva la conexión.'); });
  });
}
function buddyName(uid) { var b = CLOUD.buddies.filter(function (c) { return c.uid === uid; })[0]; return b ? b.name : 'Buddy'; }
async function shareList(l, uids) {
  if (!cloudIn() || !uids.length) return;
  var me = cloudUid(), id = 's' + randomCode(16), t = now(), names = {};
  names[me] = myDisplayName(); uids.forEach(function (u) { names[u] = buddyName(u); });
  var items = {};
  Object.keys(l.adds).concat(Object.keys(l.seeds)).forEach(function (k) { var s = state.user.items[k] || resolveItem(k); if (s) { s = cleanSnap(s, k); if (s) items[k] = s; } });
  var doc = { name: l.name, nameAt: t, createdAt: t, deletedAt: 0, owner: me, members: [me].concat(uids), memberNames: names, adds: l.adds, rms: l.rms, seeds: l.seeds || {}, nos: l.nos || {}, tags: l.tags || {}, items: items };
  await CLOUD.api.set('lists/' + id, JSON.parse(JSON.stringify(doc)));
  var sl = normShared(id, doc); sl._synced = cloneShared(sl); CLOUD.shared.set(id, sl);
  if (l.id !== 'watchlist' && !l.shared) deleteList(l);
  state.ui.list = id; state.listEdit = null; refresh();
  toast('Listo, «' + l.name + '» ahora es compartida.');
}
async function sharedAddMembers(l, uids) {
  var ups = [[['members'], CLOUD.api.union(uids[0])]];
  uids.forEach(function (u) { ups.push([['memberNames', u], buddyName(u)]); });
  await CLOUD.api.update('lists/' + l.id, ups);
  for (var i = 1; i < uids.length; i++) await CLOUD.api.update('lists/' + l.id, [[['members'], CLOUD.api.union(uids[i])]]);
}
async function sharedLeave(l) {
  await CLOUD.api.update('lists/' + l.id, [[['members'], CLOUD.api.remove(cloudUid())]]);
  CLOUD.shared.delete(l.id); state.ui.list = 'watchlist'; refresh();
  toast('Saliste de «' + l.name + '».');
}
/* festival compartido de a dos: se programa con el gusto combinado */
function sharedCompanion(l) {
  if (!l || !l.shared) return null;
  var others = (l.members || []).filter(function (m) { return m !== cloudUid(); });
  for (var i = 0; i < others.length; i++) { var c = CLOUD.buddies.filter(function (b) { return b.uid === others[i] && !b.pending; })[0]; if (c) return c; }
  return null;
}

/* --- invitados (solo el administrador) --- */
async function cloudLoadInvites() {
  try { CLOUD.invites = (await CLOUD.api.list('invites')).map(function (d) { return { email: d.id, name: String((d.data && d.data.name) || '') }; }).sort(function (a, b) { return a.email.localeCompare(b.email); }); }
  catch (e) { CLOUD.invites = null; }
  if (state.ui.view === 'profile') renderProfile();
}
async function inviteAdd(email, name) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(email) || email.length > 120) { toast('Ese mail no parece válido.'); return false; }
  await CLOUD.api.set('invites/' + email, { name: String(name || '').replace(/[<>]/g, '').trim().slice(0, 40), by: cloudUid(), at: Date.now() });
  await cloudLoadInvites();
  return true;
}
async function inviteRemove(email) { await CLOUD.api.del('invites/' + email); await cloudLoadInvites(); }

/* --- OMDb compartido: cada puntaje se consulta una vez y queda para todos --- */
async function omdbFromCloud(imdb) {
  if (!cloudIn()) return null;
  try { var d = await CLOUD.api.get('omdb/' + imdb); if (d && d.r && typeof d.r === 'object' && +d.at > Date.now() - 45 * DAY) return cleanOmdb(d.r, +d.at); } catch (e) {}
  return null;
}
function cleanOmdb(r, at) {
  var o = { at: at || Date.now() }, n = function (v, lo, hi) { v = +v; return isFinite(v) && v >= lo && v <= hi ? v : null; };
  if (r.none) o.none = true;
  var a = n(r.imdb, 0, 10), b = n(r.votes, 0, 1e8), c = n(r.rt, 0, 100), d = n(r.mc, 0, 100);
  if (a != null) o.imdb = a; if (b != null) o.votes = b; if (c != null) o.rt = c; if (d != null) o.mc = d;
  return o;
}
function omdbToCloud(imdb, r) {
  if (!cloudIn() || !r) return;
  var o = {}; ['imdb', 'votes', 'rt', 'mc'].forEach(function (k) { if (r[k] != null) o[k] = r[k]; }); if (r.none) o.none = true;
  CLOUD.api.set('omdb/' + imdb, { r: o, at: Date.now() }).catch(function () {});
}

/* --- interfaz: estado de la cuenta en Perfil y en la bienvenida --- */
function cloudCardHTML() {
  var st = CLOUD.status, u = CLOUD.user;
  if (st === 'in' && u) return '<div class="cloud-card on"><span class="cloud-dot"></span><div><b>Conectado con Google</b><small>' + esc(u.email) + ' · tus datos se guardan en tu cuenta</small></div><button class="btn btn-ghost" type="button" data-cloud="out">Salir</button></div>';
  if (st === 'checking') return '<div class="cloud-card"><span class="cloud-dot busy"></span><div><b>Conectando con tu cuenta…</b></div></div>';
  var det = CLOUD.lastErr ? '<small class="cloud-err">Detalle: ' + esc(CLOUD.lastErr) + '</small>' : '';
  if (st === 'denied' && CLOUD.admin) return '<div class="cloud-card warn"><div><b>Firestore rechazó el acceso</b><small>' + esc(u ? u.email : '') + ' es la cuenta de administrador, así que no es un tema de invitación: Firestore no tiene publicadas las reglas de WatchListo (o el publicado falló). Revisá Firestore → Reglas, pegá el archivo completo, tocá Publicar, esperá un minuto y tocá Reintentar.</small>' + det + '</div><button class="btn btn-accent" type="button" data-cloud="retry">Reintentar</button></div>';
  if (st === 'denied' && CLOUD.requested) return '<div class="cloud-card"><span class="cloud-dot busy"></span><div><b>Pedido de acceso enviado</b><small>' + esc(u ? u.email : '') + '. Cuando lo aprueben entrás solo; podés dejar la app abierta o volver más tarde.</small></div><button class="btn btn-ghost" type="button" data-cloud="switch">Usar otra cuenta</button></div>';
  if (st === 'denied') return '<div class="cloud-card warn"><div><b>Tu cuenta todavía no está invitada</b><small>' + esc(u ? u.email : '') + '. Pedí acceso y te avisamos acá cuando te aprueben.</small></div><button class="btn btn-accent" type="button" data-cloud="request">Pedir acceso</button><button class="btn btn-ghost" type="button" data-cloud="switch">Usar otra cuenta</button></div>';
  if (st === 'error') return '<div class="cloud-card warn"><div><b>No pude conectar con tu cuenta</b><small>Puede ser la conexión o que la base de Firestore no esté creada. Lo de este dispositivo sigue funcionando.</small>' + det + '</div><button class="btn" type="button" data-cloud="' + (u ? 'retry' : 'in') + '">Reintentar</button></div>';
  return '<div class="cloud-card"><div><b>Guardá todo en tu cuenta</b><small>Entrá con Google para tener tus listas en cualquier dispositivo, watch buddies y listas compartidas. Si no te invitaron, desde ahí pedís acceso.</small></div><button class="btn btn-accent" type="button" data-cloud="in">Entrar con Google</button></div>';
}
function renderCloudUI() {
  var ob = $('#obCloud'); if (ob) ob.innerHTML = cloudCardHTML();
  /* se precarga para que el popup de Google abra en el mismo toque (si no, el navegador lo bloquea) */
  if ((CLOUD.status === 'off' || CLOUD.status === 'out') && canPair()) cloudStart().catch(function () {});
  if (state.ui.view === 'profile' && document.body.classList.contains('v-profile')) renderProfile();
  if ($('#dlgDuo') && $('#dlgDuo').open) renderDuo();
}
function cloudAct(act, btn) {
  if (act === 'in') { cloudSignIn(); return; }
  if (act === 'request') { accessRequest(btn); return; }
  if (act === 'retry') { if (CLOUD.user) { var u = CLOUD.user; onCloudUser(u).catch(function (e) { CLOUD.lastErr = String((e && (e.code || e.message)) || e); CLOUD.status = 'error'; renderCloudUI(); }); } else cloudSignIn(); return; }
  if (act === 'out' || act === 'switch') { cloudSignOut().then(function () { if (act === 'switch') cloudSignIn(); }); return; }
}

/* ---------- instalación: abierta desde el navegador del celu, primero se instala ----------
   Ningún link puede instalar una app solo: el navegador siempre pide un toque. En Android
   ese toque es el botón de acá (y una vez instalada, los links de WatchListo se abren en la
   app); en iPhone se hace desde Compartir. Se puede seguir en el navegador igual. */
var installEvt = null;
function isStandalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function isIOS() { var ua = navigator.userAgent || ''; return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); }
function isPhoneUA() { return isIOS() || /Android/i.test(navigator.userAgent || ''); }
function installSkipped() { try { return sessionStorage.getItem('wl.web') === '1'; } catch (e) { return false; } }
function renderInstall() {
  var g = $('#installGate'); if (!g) return;
  var show = isPhoneUA() && !isStandalone() && !installSkipped() && canPair();
  g.hidden = !show; document.body.classList.toggle('gated', show);
  if (!show) return;
  var btn = $('#instBtn'), steps = $('#instSteps'), txt = $('#instText');
  if (state.installed) { txt.textContent = 'Listo, ya está instalada. Abrila desde el ícono de WatchListo en tu pantalla de inicio.'; btn.hidden = true; steps.hidden = true; return; }
  if (isIOS()) {
    txt.textContent = 'Así queda como una app y tus listas no se borran aunque el teléfono limpie Safari.'; btn.hidden = true; steps.hidden = false;
    steps.innerHTML = '<li>Tocá <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li><li>Elegí <b>Agregar a inicio</b>.</li><li>Abrí WatchListo desde el ícono nuevo.</li>';
  } else if (installEvt) {
    txt.textContent = 'Un toque y queda como una app en tu pantalla de inicio. Después, los links de WatchListo se abren directo ahí.'; btn.hidden = false; steps.hidden = true;
  } else {
    txt.textContent = 'Así queda como una app y los links de WatchListo se abren directo ahí.'; btn.hidden = true; steps.hidden = false;
    steps.innerHTML = '<li>Tocá el menú <b>⋮</b> arriba a la derecha.</li><li>Elegí <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</li><li>Abrí WatchListo desde el ícono nuevo. Si ya la tenías instalada, abrila desde ahí.</li>';
  }
}
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; renderInstall(); });
window.addEventListener('appinstalled', function () { state.installed = true; installEvt = null; renderInstall(); });

/* las páginas con https (o localhost) pueden usar service worker, login y compartir */
function canPair() { return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'; }
/* los links viejos de vinculación (#pair=) traían claves: ya no se usan y se borran de la barra */
function dropLegacyHash() { if (/^#pair=/.test(location.hash || '')) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} } }

/* ---------- settings ---------- */
function applyTheme() {
  var t = state.settings.theme;
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
function fillSettingsForm() {
  var s = state.settings;
  $('#sTmdb').value = s.tmdbKey; $('#sOmdb').value = s.omdbKey; $('#sLang').value = s.lang; $('#sDepth').value = s.depth;
  $('#sMinVotes').value = s.minVotes; $('#sTheme').value = s.theme;
  /* con cuenta, las claves las administra solo el administrador: a los invitados les llegan solas */
  var guest = cloudIn() && !CLOUD.admin;
  $('#keysSet').hidden = guest;
  $('#keysHint').textContent = cloudIn() && CLOUD.admin ? 'Son las que usan todos tus invitados: si las cambiás acá, les llegan solas.' : 'Se guardan solo en este dispositivo. Si entrás con una cuenta invitada, llegan solas.';
  $$('[data-reveal]').forEach(function (b) { var inp = document.getElementById(b.dataset.reveal); inp.type = 'password'; b.textContent = 'Ver'; });
  showSetErr('');
}
function showSetErr(m) { var e = $('#setErr'); e.textContent = m; e.hidden = !m; }
async function saveSettingsFromForm() {
  var before = Object.assign({}, state.settings), s = state.settings;
  s.tmdbKey = $('#sTmdb').value.trim(); s.omdbKey = $('#sOmdb').value.trim();
  s.lang = $('#sLang').value; s.depth = $('#sDepth').value;
  s.minVotes = Math.max(0, Math.min(5000, parseInt($('#sMinVotes').value, 10) || 0)); s.theme = $('#sTheme').value;
  if (!s.tmdbKey) { showSetErr('La clave de TMDB es obligatoria.'); state.settings = before; return; }
  if (!TOKEN_CHARS.test(s.tmdbKey) || !TOKEN_CHARS.test(s.omdbKey)) { showSetErr('Alguna clave tiene caracteres raros. Copiala de nuevo, sin espacios.'); state.settings = before; return; }
  var btn = $('#saveSettings');
  if (s.tmdbKey !== before.tmdbKey) {
    btn.disabled = true; btn.textContent = 'Probando clave…';
    try { await tmdb('/configuration'); }
    catch (e) { showSetErr(e.code === 'tmdb-auth' ? 'TMDB rechazó esa clave.' : e.message); btn.disabled = false; btn.textContent = 'Guardar'; state.settings = before; return; }
    btn.disabled = false; btn.textContent = 'Guardar';
  }
  saveSettings(); applyTheme();
  if (cloudIn() && CLOUD.admin && (before.tmdbKey !== s.tmdbKey || before.omdbKey !== s.omdbKey)) CLOUD.api.set('config/keys', { tmdb: s.tmdbKey, omdb: s.omdbKey || '', at: Date.now() }).catch(function () { toast('No pude publicar las claves nuevas para tus invitados.'); });
  if (before.omdbKey !== s.omdbKey) state.omdbStop = null;
  var catChanged = before.lang !== s.lang || before.depth !== s.depth || before.minVotes !== s.minVotes || before.region !== s.region;
  var keyChanged = before.tmdbKey !== s.tmdbKey;
  closeDialog($('#dlgSettings'));
  if (keyChanged || state.fatal) { state.fatal = null; showBanner(''); }
  if (catChanged) { state.catalogs = { movie: null, tv: null }; if (before.lang !== s.lang) LS.del('genres'); }
  if (catChanged || keyChanged || !state.catalogs[state.ui.type]) start();
  else refresh(true);
}
function exportUser() {
  var data = JSON.stringify({ app: 'cartelera', v: 2, exportedAt: new Date().toISOString(), user: state.user }, null, 2);
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  a.download = 'watchlisto-listas-' + today() + '.json';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function importFile(file) {
  if (file.size > 5e6) { toast('Ese archivo es demasiado grande.'); return; }
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var j = JSON.parse(rd.result);
      var u = j && j.user ? j.user : j;
      if (!u || !Array.isArray(u.lists)) throw new Error('bad');
      state.user = mergeUsers(state.user, normUser(u)); touchUser();
      toast('Listas importadas.'); refresh(true);
    } catch (e) { toast('Ese archivo no parece una exportación de WatchListo.'); }
  };
  rd.readAsText(file);
}

/* ---------- boot ---------- */
async function start() {
  $('#onboard').hidden = true; $('#rail').hidden = false; $('#resbar').hidden = false; $('#foot').hidden = false;
  document.body.classList.remove('onboarding');
  state.fatal = null; state.booted = true;
  peekCatalog('movie'); peekCatalog('tv');
  refresh();
  try {
    await loadGenres();
    renderGenreChips();
    state.f.people.forEach(function (p) { loadPersonCredits(p.id).then(function () { refresh(true); }, function () {}); });
    if (state.ui.view === 'catalog') await ensureCatalog(state.ui.type);
  } catch (e) {
    if (e.fatal) { fatal(e); return; }
    showBanner('<p>' + esc(e.message) + '</p><button class="btn" type="button" data-retry>Reintentar</button>');
  }
  refresh();
}
function showOnboarding() {
  $('#onboard').hidden = false; $('#rail').hidden = true; $('#resbar').hidden = true; $('#grid').innerHTML = ''; $('#more').hidden = true; $('#empty').hidden = true;
  document.body.classList.add('onboarding');
  renderTop();
}

function setView(v) {
  if (['catalog', 'lists', 'profile'].indexOf(v) < 0) v = 'catalog';
  if (state.ui.view === v && !state.special) return;
  state.ui.view = v; state.special = null; closeRail();
  renderRail(); refresh(); window.scrollTo(0, 0);
  if (v === 'catalog') loadCatalogAndRefresh(state.ui.type);
}
function setType(t) {
  if (state.ui.type === t) return;
  state.ui.type = t; state.special = null;
  renderGenreChips(); refresh(); window.scrollTo(0, 0);
  loadCatalogAndRefresh(t);
}
function setSource(s) {
  if (state.ui.source === s) return;
  state.ui.source = s; state.special = null;
  refresh(); window.scrollTo(0, 0);
  if (s === 'mine') loadCatalogAndRefresh(state.ui.type);
}
function loadCatalogAndRefresh(t) {
  if (!state.settings.tmdbKey || state.fatal) return;
  ensureCatalog(t).then(function () { if (state.ui.type === t) { renderGenreChips(); refresh(); } }, function (e) { if (e.fatal) fatal(e); else showBanner('<p>' + esc(e.message) + '</p><button class="btn" type="button" data-retry>Reintentar</button>'); });
}
function openRail() { document.body.classList.add('rail-open'); $('#veil').hidden = false; navSoon(); }
function closeRail() { document.body.classList.remove('rail-open'); $('#veil').hidden = true; navSoon(); }
var refreshSoon = debounce(function () { refresh(); }, 160);
function clearFilters() {
  var keepSeen = state.f.hideSeen, keepIndia = state.f.noIndia;
  state.f = defaultFilters(); state.f.hideSeen = keepSeen; state.f.noIndia = keepIndia;
  renderRail(); refresh();
}
function radioAction(kind, it) {
  var l = radioContext(); if (!l) return;
  if (kind === 'seed') { l.seeds[it.k] = now(); state.user.items[it.k] = snapshot(it); touchUser(); toast('Ahora es base del festival. La próxima tanda la tiene en cuenta.'); renderDetail(); renderListbar(); }
  if (kind === 'nope') { l.nos[it.k] = now(); l.rms[it.k] = now(); touchUser(); closeDialog($('#dlgDetail')); toast('Sacada del festival. No vuelve a aparecer.'); refresh(true); }
}

function bind() {
  grid = $('#grid');
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      var vis = [];
      entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); var it = state.index.get(e.target.dataset.k); if (it) vis.push(it); } });
      if (vis.length) { wantDetails(vis, 'hi'); wantRatings(vis); wantStremio(vis); }
    }, { rootMargin: '400px 0px' });
    moreIo = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting && !$('#more').hidden) renderMore(); }, { rootMargin: '600px 0px' });
    moreIo.observe($('#more'));
  }

  var top = $('#top');
  var setH = function () { document.documentElement.style.setProperty('--header-h', top.offsetHeight + 'px'); };
  setH(); if ('ResizeObserver' in window) new ResizeObserver(setH).observe(top); else window.addEventListener('resize', setH);

  $('#viewSeg').addEventListener('click', function (e) { var b = e.target.closest('button[data-view]'); if (b) setView(b.dataset.view); });
  $('#typeSeg').addEventListener('click', function (e) { var b = e.target.closest('button[data-type]'); if (b) setType(b.dataset.type); });
  $('#q').addEventListener('input', function (e) { state.q = e.target.value.trim(); if (state.special && state.special.kind === 'search' && state.special.q !== state.q) state.special = null; refreshSoon(); });
  $('#q').addEventListener('keydown', function (e) { if (e.key === 'Enter' && state.ui.view === 'catalog' && !state.special && state.q.length >= 2 && !state.filtered.length) globalSearch(state.q); });
  $('#sort').addEventListener('change', function (e) { state.ui[sortKey()] = e.target.value; refresh(); });
  $('#pick').addEventListener('click', openGuide);
  $('#openSettings').addEventListener('click', function () { fillSettingsForm(); openDialog($('#dlgSettings')); });
  $('#openRail').addEventListener('click', openRail);
  $('#closeRail').addEventListener('click', closeRail);
  $('#veil').addEventListener('click', closeRail);
  $('#more').addEventListener('click', renderMore);
  $('#reflowBtn').addEventListener('click', function () { refresh(true); });
  $('#globalBtn').addEventListener('click', function (e) {
    if (e.currentTarget.dataset.mode === 'back') backFromSpecial();
    else if (state.q.length >= 2) globalSearch(state.q);
  });

  /* qué mostrar, personas y vistas especiales */
  $('#sourceSeg').addEventListener('click', function (e) { var b = e.target.closest('[data-source]'); if (b) setSource(b.dataset.source); });
  $('#onlyMine').addEventListener('change', function (e) {
    state.f.onlyMine = e.target.checked;
    if (state.f.onlyMine) wantDetails(currentPool().slice(0, 200), 'lo');
    refresh();
  });
  $('#personQ').addEventListener('input', function (e) { personSearch(e.target.value.trim()); });
  $('#personQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var first = $('#personAc .ac-item'); if (first) first.click(); } if (e.key === 'Escape') $('#personAc').hidden = true; });
  $('#personAc').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pid]'); if (!b) return;
    $('#personAc').hidden = true; $('#personQ').value = '';
    addPersonFilter(+b.dataset.pid, b.dataset.pname);
  });
  $('#peopleChips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-unperson]'); if (!b) return;
    var id = +b.dataset.unperson;
    state.f.people = state.f.people.filter(function (p) { return p.id !== id; });
    renderPeopleChips(); refresh();
  });
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest('.ac')) { $('#personAc').hidden = true; $('#festAc').hidden = true; } });
  $('#specialBar').addEventListener('click', function (e) {
    var sp = state.special; if (!sp) return;
    var tab = e.target.closest('[data-ptab]');
    if (tab && sp.tabs) { sp.tab = tab.dataset.ptab; sp.items = sp.tabs[sp.tab]; refresh(); wantDetails(sp.items.slice(0, 150), 'lo'); return; }
    var pf = e.target.closest('[data-pfest]');
    if (pf && sp.tabs) { personFestival(sp, pf.dataset.pfest); return; }
    if (e.target.closest('[data-pfilter]')) { var id = sp.id, name = sp.title; state.special = null; state.ui.view = 'catalog'; addPersonFilter(id, name); renderRail(); toast('Mostrando lo que hizo ' + name + '. Lo sacás desde Filtros.'); return; }
    if (e.target.closest('[data-mkradio]')) { createRadio(sp.seeds, sp.festName); }
  });

  /* rail */
  $('#svcToggles').addEventListener('click', function (e) {
    if (e.target.closest('[data-svcpick]')) { closeRail(); setView('profile'); setTimeout(function () { var sec = $('#pfSvc'); if (sec) sec.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); return; }
    var b = e.target.closest('[data-svc]'); if (!b) return;
    var k = b.dataset.svc, i = state.f.services.indexOf(k);
    if (i >= 0) state.f.services.splice(i, 1); else state.f.services.push(k);
    b.setAttribute('aria-pressed', i < 0); refresh();
  });
  $('#ratingSrc').addEventListener('change', function (e) {
    var prev = SRC[state.f.ratingSrc], next = SRC[e.target.value];
    var v = state.f.ratingMin ? state.f.ratingMin / prev.max * next.max : 0;
    state.f.ratingSrc = e.target.value;
    state.f.ratingMin = next.step < 1 ? Math.round(v * 10) / 10 : Math.round(v);
    renderRail(); refresh();
    if (e.target.value !== 'tmdb' && !state.settings.omdbKey) toast('Para IMDb, RT y Metacritic hace falta la clave de OMDb (Ajustes).');
  });
  $('#ratingMin').addEventListener('input', function (e) {
    state.f.ratingMin = parseFloat(e.target.value) || 0;
    $('#ratingVal').textContent = state.f.ratingMin > 0 ? fmtScore(state.f.ratingSrc, state.f.ratingMin) : '0';
    refreshSoon();
  });
  $('#incUnknown').addEventListener('change', function (e) { state.f.includeUnknown = e.target.checked; refresh(); });
  $('#genreMode').addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (!b) return; state.f.genreMode = b.dataset.mode; renderRail(); refresh(); });
  $('#genreChips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-genre]'); if (!b) return;
    var n = b.dataset.genre, st = state.f.genres[n] || 0, next = st === 0 ? 1 : st === 1 ? -1 : 0;
    if (next) state.f.genres[n] = next; else delete state.f.genres[n];
    b.dataset.state = next; b.setAttribute('aria-label', n + ': ' + (next === 1 ? 'incluido' : next === -1 ? 'excluido' : 'sin filtro'));
    refresh();
  });
  var yearChange = function () { state.f.yearFrom = $('#yFrom').value; state.f.yearTo = $('#yTo').value; refreshSoon(); };
  $('#yFrom').addEventListener('input', yearChange); $('#yTo').addEventListener('input', yearChange);
  $('#maxRt').addEventListener('change', function (e) {
    state.f.maxRuntime = parseInt(e.target.value, 10) || 0;
    if (state.f.maxRuntime) wantDetails(applyFilters(currentPool()), 'lo');
    refresh();
  });
  $('#hideSeen').addEventListener('change', function (e) { state.f.hideSeen = e.target.checked; refresh(); });
  $('#seenToggle').addEventListener('click', function () {
    state.f.hideSeen = !state.f.hideSeen; $('#hideSeen').checked = state.f.hideSeen; refresh();
    toast(state.f.hideSeen ? 'Ocultando lo que ya viste.' : 'Mostrando también lo que ya viste.');
  });
  $('#noIndia').addEventListener('change', function (e) { state.f.noIndia = e.target.checked; refresh(); });
  $('#clearFilters').addEventListener('click', clearFilters);

  /* delegated clicks */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-settings]')) { fillSettingsForm(); openDialog($('#dlgSettings')); return; }
    if (t.closest('[data-gocloud]')) { closeRail(); setView('profile'); window.scrollTo(0, 0); return; }
    if (t.closest('[data-reload]')) { var ty = state.ui.type; state.catalogs[ty] = null; LS.del('catalog.' + ty); refresh(); loadCatalogAndRefresh(ty); return; }
    if (t.closest('[data-fill]')) { wantRatings(state.filtered.slice(0, Math.max(0, 1000 - omdbUsage().n))); toast('Trayendo ratings de OMDb, empezando por las primeras de la lista.'); return; }
    if (t.closest('[data-clear]')) { clearFilters(); return; }
    if (t.closest('[data-incunk]')) { state.f.includeUnknown = true; $('#incUnknown').checked = true; refresh(); toast('Ahora también ves las que no tienen ese puntaje.'); return; }
    if (t.closest('[data-global]')) { globalSearch(state.q); return; }
    if (t.closest('[data-go="catalog"]')) { setView('catalog'); return; }
    if (t.closest('[data-retry]')) { showBanner(''); start(); return; }
    if (t.closest('[data-back]')) { backFromSpecial(); return; }
    if (t.closest('[data-goback]')) { goBack(); return; }
  });

  grid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var card = b.closest('.card'), it = card && state.index.get(card.dataset.k); if (!it) return;
    var act = b.dataset.act;
    if (act === 'open') openDetail(it);
    else if (act === 'watch') { var on = toggleList('watchlist', it); syncCardButtons(card, it); toast(on ? 'Sumada a Mi lista.' : 'Sacada de Mi lista.'); if (state.ui.view === 'lists') refreshSoon(); }
    else if (act === 'seen') { var s = toggleSeen(it); syncCardButtons(card, it); toast(s ? 'Marcada como vista.' : 'Desmarcada.'); }
    else if (act === 'lists') openMenu(b, it);
  });

  /* lists bar */
  var listbarClick = function (e) {
    var p = e.target.closest('[data-list]');
    if (p) { state.ui.list = p.dataset.list; state.listEdit = null; state.confirmDelete = null; refresh(); return; }
    var pk = e.target.closest('[data-pick]');
    if (pk) { state.shareSel = state.shareSel || new Set(); var u = pk.dataset.pick; if (state.shareSel.has(u)) state.shareSel.delete(u); else state.shareSel.add(u); renderListbar(); return; }
    var sm = e.target.closest('.rumbo-more summary');
    if (sm) { state.rumboMoreOpen = !sm.parentNode.open; return; }
    var rs = e.target.closest('summary.rumbo-s');
    if (rs) { state.rumboOpen = !rs.parentNode.open; return; }
    var rb = e.target.closest('[data-rumbo]');
    if (rb) {
      var rl = getList(state.ui.list); if (!rl) return;
      var key = rb.dataset.rumbo, off = !(rl.tags && rl.tags[key] && rl.tags[key].v < 0);
      var before = state.rumboHidden || 0;
      state.rumboMoreOpen = !!rb.closest('.rumbo-more');
      setRumbo(rl, key, off); refresh(true);
      var diff = (state.rumboHidden || 0) - before;
      toast(off ? (diff > 0 ? 'Saqué ' + diff + (diff === 1 ? ' título' : ' títulos') + ' que iban por el lado de ' + labelName(key) + '.' : 'Listo, ' + labelName(key) + ' queda fuera del rumbo.') : labelName(key) + ' vuelve al rumbo.');
      return;
    }
    var tool = e.target.closest('[data-tool]');
    if (tool) {
      var k = tool.dataset.tool, cur = getList(state.ui.list);
      if (k === 'radio-more' && cur) { radioMore(cur); return; }
      if (k === 'foryou') { openForYou(); return; }
      if ((k === 'share' || k === 'addmember') && cur) { state.listEdit = k; state.shareSel = new Set(); renderListbar(); return; }
      if (k === 'share-go' && cur) {
        var uids = Array.from(state.shareSel || []), mode = state.listEdit; if (!uids.length) return;
        state.listEdit = null; renderListbar();
        (mode === 'share' ? shareList(cur, uids) : sharedAddMembers(cur, uids).then(function () { toast('Listo, ya está en la lista.'); }))
          .catch(function (e) { toast(isDenied(e) ? 'No tenés permiso para compartir esa lista.' : 'No pude compartir la lista. Probá de nuevo.'); });
        return;
      }
      if (k === 'leave' && cur) {
        if (state.confirmDelete === cur.id) { state.confirmDelete = null; sharedLeave(cur).catch(function () { toast('No pude sacarte de la lista.'); }); }
        else { state.confirmDelete = cur.id; renderListbar(); setTimeout(function () { if (state.confirmDelete === cur.id) { state.confirmDelete = null; renderListbar(); } }, 4000); }
        return;
      }
      if (k === 'reco' && cur) { openReco(listKeys(cur).slice(0, 8).map(resolveItem)); return; }
      if (k === 'radio-from' && cur) { createRadio(listKeys(cur).slice(0, 8).map(resolveItem), 'Festival ' + cur.name); return; }
      if (k === 'new' || k === 'rename') { state.listEdit = k; renderListbar(); }
      if (k === 'delete') {
        var l = getList(state.ui.list); if (!l || l.id === 'watchlist') return;
        if (state.confirmDelete === l.id) {
          deleteList(l); state.confirmDelete = null; state.ui.list = 'watchlist'; toast('Lista borrada.'); refresh();
        } else { state.confirmDelete = l.id; renderListbar(); setTimeout(function () { if (state.confirmDelete === l.id) { state.confirmDelete = null; renderListbar(); } }, 4000); }
      }
      return;
    }
    if (e.target.closest('[data-cancel]')) { state.listEdit = null; renderListbar(); }
  };
  $('#listbar').addEventListener('click', listbarClick);
  $('#listtools').addEventListener('click', listbarClick);

  var listbarSubmit = function (e) {
    e.preventDefault();
    var form = e.target, inp = $('input', form), name = inp.value.trim(); if (!name) return;
    if (form.dataset.form === 'new') { var l = createList(name); if (l) state.ui.list = l.id; }
    else { var cur = getList(state.ui.list); if (cur) renameList(cur, name); }
    state.listEdit = null; refresh();
  };
  $('#listbar').addEventListener('submit', listbarSubmit);
  $('#listtools').addEventListener('submit', listbarSubmit);
  /* un toque afuera cierra el menú «⋯» de la lista */
  document.addEventListener('click', function (e) { var o = document.querySelector('details.lmore[open]'); if (o && e.target.isConnected && !o.contains(e.target)) { o.open = false; if (state.confirmDelete) { state.confirmDelete = null; renderListbar(); } } });

  /* list menu */
  $('#menuItems').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mlist]'); if (!b || !state.menuItem) return;
    var it = state.menuItem, on = toggleList(b.dataset.mlist, it);
    renderMenu(); var card = cardEl(it.k); if (card) syncCardButtons(card, it);
    var l = getList(b.dataset.mlist); toast(on ? 'Sumada a ' + l.name + '.' : 'Sacada de ' + l.name + '.');
    if (state.ui.view === 'lists') refreshSoon();
  });
  $('#menuNew').addEventListener('submit', function (e) {
    e.preventDefault(); var inp = $('#menuNewName'), it = state.menuItem; if (!it) return;
    var l = createList(inp.value); if (!l) return;
    toggleList(l.id, it, true); inp.value = ''; renderMenu(); var card = cardEl(it.k); if (card) syncCardButtons(card, it); toast('Lista «' + l.name + '» creada con este título.');
  });
  $('#menuHide').addEventListener('click', function () {
    var it = state.menuItem; if (!it) return;
    var on = toggleHidden(it); closeMenu();
    toast(on ? 'Oculta. No vuelve a aparecer; la recuperás en Listas › Ocultas.' : 'Vuelve a aparecer.');
    refresh(true);
  });
  document.addEventListener('pointerdown', function (e) { var m = $('#listMenu'); if (!m.hidden && !m.contains(e.target) && !e.target.closest('[data-act="lists"]')) closeMenu(); });
  var closeMenuUnlessTyping = function () { var m = $('#listMenu'); if (!m.contains(document.activeElement) || document.activeElement.tagName !== 'INPUT') closeMenu(); };
  window.addEventListener('resize', closeMenuUnlessTyping);
  window.addEventListener('scroll', closeMenuUnlessTyping, { passive: true });

  /* detail dialog */
  var dd = $('#dlgDetail');
  dd.addEventListener('click', function (e) {
    if (e.target === dd) { closeDialog(dd); return; }
    var D = state.detail; if (!D) return;
    var it = D.it;
    /* un toque afuera cierra el menú abierto (Agregar a / Más) */
    var openPop = $('details.dpop[open]', dd);
    if (openPop && !openPop.contains(e.target)) { openPop.open = false; D.pop = null; if (!e.target.closest('summary')) return; }
    if (e.target.closest('.dpop-panel [data-dact]')) D.pop = null;
    if (e.target.closest('[data-close]')) { closeDialog(dd); return; }
    if (e.target.closest('[data-repick]')) { pickOne(); return; }
    var pb = e.target.closest('[data-person]');
    if (pb) { openPerson(+pb.dataset.person, pb.dataset.pname); return; }
    var cs = e.target.closest('[data-cursec]');
    if (cs) { startSectionFestival(cs.dataset.cursec, cs); return; }
    var a = e.target.closest('[data-dact]');
    if (a) {
      var act = a.dataset.dact;
      if (act === 'reco') { openReco([it]); return; }
      if (act === 'radio') { createRadio([it]); return; }
      if (act === 'seed' || act === 'nope') { radioAction(act, it); return; }
      if (act === 'hide') {
        var hon = toggleHidden(it);
        toast(hon ? 'Oculta. No vuelve a aparecer; la recuperás en Listas › Ocultas.' : 'Vuelve a aparecer.');
        renderDetail(); refreshSoon(); return;
      }
      if (act === 'watch') toggleList('watchlist', it); else toggleSeen(it);
      renderDetail(); updateCard(it.k); if (state.ui.view === 'lists') refreshSoon(); return;
    }
    if (e.target.closest('[data-cseen]')) { compToggleSeen(it); renderDetail(); if (state.ui.view === 'lists' || state.special) refreshSoon(); return; }
    var cst = e.target.closest('[data-cstar]');
    if (cst) { compSetStar(it, +cst.dataset.cstar); renderDetail(); return; }
    var st = e.target.closest('[data-star]');
    if (st && Date.now() - (state.starTouchAt || 0) < 700) return;
    if (st) { var n = +st.dataset.star; if (setStar(it, starOf(it.k) === n ? 0 : n)) { D.autoSeen = it.k; toast('Puntuada y marcada como vista.'); } renderDetail(); updateCard(it.k); return; }
    var dl = e.target.closest('[data-dlist]');
    if (dl) { toggleList(dl.dataset.dlist, it); renderDetail(); updateCard(it.k); if (state.ui.view === 'lists') refreshSoon(); return; }
    if (e.target.closest('[data-dnewlist]')) { D.newList = true; D.focusNew = true; renderDetail(); return; }
    if (e.target.closest('[data-dnewcancel]')) { D.newList = false; renderDetail(); return; }
    var tb = e.target.closest('[data-trailer]');
    if (tb) { playTrailer(tb.dataset.trailer); return; }
    var rk = e.target.closest('[data-recok]');
    if (rk) { var rit = D.recoMap && D.recoMap.get(rk.dataset.recok); if (rit) openDetail(rit); return; }
    if (e.target.closest('[data-starclear]')) {
      setStar(it, 0);
      /* si la vista se había marcado sola al puntuar, se desmarca también */
      if (D.autoSeen === it.k && isSeen(it.k)) toggleSeen(it);
      D.autoSeen = null; toast('Puntaje quitado.'); renderDetail(); updateCard(it.k); return;
    }
  });
  dd.addEventListener('toggle', function (e) {
    var dt = e.target; if (!dt.matches || !dt.matches('details.dpop') || !state.detail) return;
    if (dt.open) { state.detail.pop = dt.dataset.pop; $$('details.dpop[open]', dd).forEach(function (o) { if (o !== dt) o.open = false; }); }
    else if (state.detail.pop === dt.dataset.pop) state.detail.pop = null;
  }, true);
  dd.addEventListener('submit', function (e) {
    var pf = e.target.closest('[data-dpopform]');
    if (pf) {
      e.preventDefault();
      var D0 = state.detail, pin = $('#dPopName'); if (!D0 || !pin) return;
      var nl = createList(pin.value); if (!nl) { pin.focus(); return; }
      toggleList(nl.id, D0.it, true); pin.value = '';
      toast('Lista «' + nl.name + '» creada con este título.');
      renderDetail(); updateCard(D0.it.k); if (state.ui.view === 'lists') refreshSoon();
      return;
    }
    var form = e.target.closest('[data-dnewform]'); if (!form) return;
    e.preventDefault();
    var D = state.detail, inp = $('#dNewName'); if (!D || !inp) return;
    var l = createList(inp.value); if (!l) { inp.focus(); return; }
    toggleList(l.id, D.it, true); inp.value = ''; D.newList = false;
    toast('Lista «' + l.name + '» creada con este título.');
    renderDetail(); updateCard(D.it.k); if (state.ui.view === 'lists') refreshSoon();
  });
  dd.addEventListener('close', function () { state.detail = null; if (state.recoIO) state.recoIO.disconnect(); resetDetailView(); });
  dd.addEventListener('mouseover', function (e) { var b = e.target.closest('#myStars [data-star]'); if (b) starPreview(+b.dataset.star); });
  dd.addEventListener('mouseout', function (e) { if (e.target.closest('#myStars') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('#myStars'))) starPreview(null); });
  /* con el dedo: se desliza sobre las estrellas viendo qué significa cada una y se suelta para puntuar */
  dd.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch' || !e.target.closest('#myStars')) return;
    state.starDrag = { n: starAt(e.clientX), moved: false };
    starPreview(state.starDrag.n);
  });
  dd.addEventListener('pointermove', function (e) {
    var g = state.starDrag; if (!g || e.pointerType !== 'touch') return;
    var n = starAt(e.clientX); if (n !== g.n) { g.n = n; g.moved = true; starPreview(n); }
  });
  var starEnd = function (e) {
    var g = state.starDrag; if (!g) return; state.starDrag = null;
    if (e.type === 'pointercancel') { starPreview(null); return; }
    var D = state.detail; if (!D) return;
    var cur = starOf(D.it.k), n = !g.moved && g.n === cur ? 0 : g.n;
    state.starTouchAt = Date.now();
    if (setStar(D.it, n)) { D.autoSeen = D.it.k; toast('Puntuada y marcada como vista.'); }
    renderDetail(); updateCard(D.it.k);
  };
  dd.addEventListener('pointerup', starEnd);
  dd.addEventListener('pointercancel', starEnd);

  /* festivales */
  $('#openFest').addEventListener('click', openFest);
  var df = $('#dlgFest');
  df.addEventListener('click', function (e) {
    if (e.target === df || e.target.closest('[data-close]')) { closeDialog(df); return; }
    var g = e.target.closest('[data-fjump]');
    if (g) { var sec = document.getElementById(g.dataset.fjump); if (sec) sec.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    var fs = e.target.closest('[data-fseed]');
    if (fs) { festAddSeed((state.festAc || [])[+fs.dataset.fseed]); $('#festAc').hidden = true; $('#festQ').value = ''; $('#festQ').focus(); return; }
    var us = e.target.closest('[data-unseed]');
    if (us) { state.festDraft = state.festDraft.filter(function (x) { return x.k !== us.dataset.unseed; }); renderFestDraft(); return; }
    var ol = e.target.closest('[data-openlist]');
    if (ol) { var l = getList(ol.dataset.openlist); if (l) openList(l); return; }
    var b = e.target.closest('[data-fsec]');
    if (b) startSectionFestival(b.dataset.fsec, b);
  });
  $('#festQ').addEventListener('input', function (e) { festSearch(e.target.value.trim()); });
  $('#festQ').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); var first = $('#festAc .ac-item'); if (first) first.click(); }
    if (e.key === 'Escape' && !$('#festAc').hidden) { e.preventDefault(); $('#festAc').hidden = true; }
  });
  $('#festGo').addEventListener('click', festFromDraft);
  $('#festTaste').addEventListener('click', festFromTaste);

  /* perfil y barra inferior */
  $('#profile').addEventListener('click', function (e) { var b = e.target.closest('[data-pf]'); if (b && !b.disabled) profileAct(b.dataset.pf, b.dataset.v || ''); });
  $('#profile').addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'invForm') { var em = $('#invEmail').value, nm = $('#invName').value; inviteAdd(em, nm).then(function (ok) { if (ok) { toast('Invitado. Ahora mandale el link.'); var a = $('#invEmail'), b = $('#invName'); if (a) a.value = ''; if (b) b.value = ''; } }, function (err) { toast(isDenied(err) ? 'Solo el administrador puede invitar.' : 'No pude guardar la invitación.'); }); return; }
    var inp = $('#pfName'); if (inp) { state.settings.myName = inp.value.replace(/[<>]/g, '').trim().slice(0, 30); saveSettings(); inp.blur(); toast('Listo.'); renderProfile(); } });
  $('#profile').addEventListener('focusout', function (e) { if (e.target.id === 'pfName') { var v = e.target.value.replace(/[<>]/g, '').trim().slice(0, 30); if (v !== (state.settings.myName || '')) { state.settings.myName = v; saveSettings(); } } });
  $('#tabbar').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (!b) return;
    var t = b.dataset.tab;
    if (t === 'pick') { openGuide(); return; }
    if (t === 'fest') { openFest(); return; }
    setView(t);
  });

  /* instalación */
  $('#instBtn').addEventListener('click', function () {
    if (!installEvt) return;
    var ev = installEvt; ev.prompt();
    ev.userChoice.then(function (c) { if (c && c.outcome === 'accepted') state.installed = true; installEvt = null; renderInstall(); }, function () {});
  });
  $('#instSkip').addEventListener('click', function () { try { sessionStorage.setItem('wl.web', '1'); } catch (e) {} renderInstall(); });

  /* cuenta */
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-cloud]'); if (b && !b.disabled) cloudAct(b.dataset.cloud, b); });

  /* de a dos */
  $('#duoBtn').addEventListener('click', openDuo);
  var du = $('#dlgDuo');
  du.addEventListener('click', function (e) {
    if (e.target === du || e.target.closest('[data-close]')) { closeDialog(du); return; }
    var b = e.target.closest('[data-duo]'); if (!b || b.disabled) return;
    duoAct(b.dataset.duo, b.dataset.v || '', b).catch(function (err) { if (err && err.fatal) fatal(err); else if (err) toast(err.message); });
  });

  /* el acomodador */
  var dg = $('#dlgGuide');
  dg.addEventListener('click', function (e) {
    if (e.target === dg || e.target.closest('[data-close]')) { closeDialog(dg); return; }
    var b = e.target.closest('[data-g]'); if (!b || b.disabled) return;
    guideAct(b.dataset.g, b.dataset.v || '', b);
  });

  /* settings dialog */
  var ds = $('#dlgSettings');
  ds.addEventListener('click', function (e) {
    if (e.target === ds || e.target.closest('[data-close]')) { closeDialog(ds); return; }
    var r = e.target.closest('[data-reveal]'); if (r) { var inp = document.getElementById(r.dataset.reveal); var show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; r.textContent = show ? 'Ocultar' : 'Ver'; }
  });
  $('#setForm').addEventListener('submit', function (e) { e.preventDefault(); saveSettingsFromForm(); });
  $('#exportBtn').addEventListener('click', exportUser);
  $('#importFile').addEventListener('change', function (e) { var f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; });
  $('#clearCache').addEventListener('click', function () {
    ['catalog.movie', 'catalog.tv', 'providers.movie', 'providers.tv', 'provraw.movie', 'provraw.tv', 'genres', 'details', 'omdb', 'stremio', 'jw'].forEach(function (k) { LS.del(k); });
    state.catalogs = { movie: null, tv: null }; state.providers = { movie: null, tv: null }; state.details = {}; state.omdb = {}; ST.cache = {}; JW.cache = {};
    closeDialog(ds); toast('Caché borrada. Vuelvo a leer el catálogo.'); start();
  });

  /* onboarding */
  $('#onboardForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var err = $('#obErr'), btn = $('#obSubmit');
    var tk = $('#obTmdb').value.trim(), ok = $('#obOmdb').value.trim();
    if (!TOKEN_CHARS.test(tk) || !TOKEN_CHARS.test(ok)) { err.textContent = 'La clave tiene caracteres raros. Copiala de nuevo, sin espacios.'; err.hidden = false; return; }
    state.settings.tmdbKey = tk; state.settings.omdbKey = ok;
    err.hidden = true; btn.disabled = true; btn.textContent = 'Probando la clave…';
    try { await tmdb('/configuration'); }
    catch (ex) { err.textContent = ex.code === 'tmdb-auth' ? 'TMDB rechazó esa clave. Copiá el token de lectura completo o la clave de 32 caracteres.' : ex.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Armar mi cartelera'; state.settings.tmdbKey = ''; return; }
    saveSettings(); btn.disabled = false; btn.textContent = 'Armar mi cartelera';
    start();
  });

  /* keyboard & lifecycle */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); closeRail(); }
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); $('#q').focus(); }
  });
  window.addEventListener('storage', function (e) {
    if (e.key === LS.p + 'user' && e.newValue) { try { state.user = mergeUsers(state.user, normUser(JSON.parse(e.newValue))); refresh(true); } catch (x) {} }
  });
}

function registerSW() {
  if (!('serviceWorker' in navigator) || !canPair()) return;
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () {});
}

function boot() {
  navInit();
  edgeSwipeBack();
  applyTheme();
  dropLegacyHash();
  renderDuoBtn();
  loadCuraduria();
  bind();
  renderRail();
  registerSW();
  readTasteHash();
  readBuddyHash();
  CLOUD.pendingBuddy = CLOUD.pendingBuddy || LS.get('pendingBuddy', null);
  cloudBoot();
  renderCloudUI();
  renderInstall();
  if (CLOUD.pendingBuddy && !LS.get('cloudOn', false)) openDuo();
  window.addEventListener('hashchange', function () {
    readTasteHash(); readBuddyHash();
    if (CLOUD.pendingBuddy) { if (cloudIn()) buddyOpenPending(); else openDuo(); }
  });
  if (!state.settings.tmdbKey) { showOnboarding(); return; }
  start();
}

if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window.__cartelera = { state: state, refresh: refresh, scoreFor: scoreFor, recommend: recommend, curFind: curFind, cur: function () { return CUR; }, openFest: openFest, openGuide: openGuide, rumboOf: rumboOf, rumboOut: rumboOut, itemLabels: itemLabels, openDuo: openDuo, packTaste: packTaste, unpackTaste: unpackTaste, comps: function () { return COMP; }, cloud: function () { return CLOUD; }, cloudSyncModel: cloudSyncModel, allComps: allComps, seenNow: seenNow, guide: function () { return state.guide; }, tasteProfile: tasteProfile, tasteSeeds: tasteSeeds, openReco: openReco, openPerson: openPerson, allSig: allSig, mergeUsers: mergeUsers, normUser: normUser, contentKey: contentKey, listKeys: listKeys, services: function () { return { list: SERVICES, stremio: STREMIO_ON, sig: SVC_SIG }; }, st: function () { return ST; }, isHidden: isHidden, hiddenKeys: hiddenKeys, serviceCatalog: serviceCatalog, summarizeStreams: summarizeStreams, createRadio: createRadio, seedKeys: seedKeys, ext: function () { return EXT; }, jw: function () { return JW; }, wd: function () { return WD; }, scoresOf: scoresOf };
boot();
})();

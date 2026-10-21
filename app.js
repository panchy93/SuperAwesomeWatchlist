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
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  x: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  ticket: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14.5 7.5v9" stroke-dasharray="1.6 2.2"/></svg>'
};

/* ---------- domain constants ---------- */
var SERVICES = [
  { key: 'netflix', label: 'Netflix', re: /netflix/i, fb: [8] },
  { key: 'prime', label: 'Prime Video', re: /prime video/i, fb: [119] },
  { key: 'disney', label: 'Disney+', re: /disney/i, fb: [337] },
  { key: 'hbo', label: 'HBO Max', re: /\bhbo\b|^max\b/i, fb: [1899, 384] }
];
var SVC = {}; SERVICES.forEach(function (s) { SVC[s.key] = s; });
var SRC = {
  tmdb: { label: 'TMDB', short: 'TMDB', max: 10, step: 0.1 },
  imdb: { label: 'IMDb', short: 'IMDb', max: 10, step: 0.1 },
  rt: { label: 'Rotten Tomatoes', short: 'RT', max: 100, step: 1 },
  mc: { label: 'Metacritic', short: 'MC', max: 100, step: 1 },
  avg: { label: 'Promedio de todos', short: 'Prom.', max: 100, step: 1 }
};
var SORTS_CATALOG = [['rating', 'Mejor rating'], ['popularity', 'Más populares'], ['year', 'Más nuevas'], ['title', 'Título A-Z']];
var SORTS_LISTS = [['added', 'Agregadas recién'], ['rating', 'Mejor rating'], ['popularity', 'Más populares'], ['year', 'Más nuevas'], ['title', 'Título A-Z']];
var SORTS_RECO = [['match', 'Más parecidas'], ['rating', 'Mejor rating'], ['popularity', 'Más populares'], ['year', 'Más nuevas']];
var SORTS_PERSON = [['year', 'Más nuevas'], ['rating', 'Mejor rating'], ['popularity', 'Más populares'], ['title', 'Título A-Z']];
var SORTS_SEARCH = [['relevance', 'Relevancia']];
var KW_STOP = new Set(['woman director', 'duringcreditsstinger', 'aftercreditsstinger', 'sequel', 'prequel', 'remake', 'independent film', 'live action remake', '3d', 'imax', 'short film', 'directorial debut', 'female protagonist', 'male protagonist', 'christmas', 'new year', 'anime', 'lgbt interest', 'shot on 35mm', 'black and white']);

var DEFAULT_SETTINGS = { tmdbKey: '', omdbKey: '', lang: 'es-MX', region: 'AR', depth: 'normal', minVotes: 30, theme: 'system', ghToken: '', gistId: '', myName: '' };
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
function blankUser() { return { v: 2, lists: [blankList('watchlist', 'Mi lista', 0)], seen: {}, unseen: {}, stars: {}, items: {}, updatedAt: 0 }; }
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
    Object.keys(u.stars).forEach(function (k) { var s = u.stars[k], c = out.stars[k]; if (!c || s.at > c.at || (s.at === c.at && s.n > c.n)) out.stars[k] = { n: s.n, at: s.at }; });
    Object.keys(u.items).forEach(function (k) { var s = u.items[k]; if (!out.items[k] || stable(s) > stable(out.items[k])) out.items[k] = s; });
  });
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return sortLists(out);
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
  omdbStop: null, fatal: null,
  sync: { status: 'Sin sincronizar.', s: 'off', last: 0 }
};
if (!Array.isArray(state.f.services)) state.f.services = defaultFilters().services;
if (!state.f.genres || typeof state.f.genres !== 'object') state.f.genres = {};
if (!SRC[state.f.ratingSrc]) state.f.ratingSrc = 'tmdb';
if (!Array.isArray(state.f.people)) state.f.people = [];
state.f.people = state.f.people.filter(function (p) { return p && +p.id > 0; }).map(function (p) { return { id: +p.id, name: String(p.name || '').slice(0, 80) }; }).slice(0, 5);
if (state.ui.source !== 'all') state.ui.source = 'mine';
LS.set('user', state.user);

function saveUi() { LS.set('ui', state.ui); LS.set('filters', state.f); }
function saveSettings() { LS.set('settings', state.settings); }
var saveCachesSoon = debounce(function () { LS.set('details', state.details); LS.set('omdb', state.omdb); }, 1500);
function touchUser() { state.user.updatedAt = now(); LS.set('user', state.user); syncSoon(); if (cloudIn()) { cloudPushSoon(); if (CLOUD.shared.size) pushSharedSoon(); } }

/* ---------- list accessors ---------- */
function visibleLists() { return state.user.lists.concat(CLOUD && CLOUD.shared ? sharedLists() : []).filter(function (l) { return !l.deletedAt; }); }
function getList(id) { return visibleLists().filter(function (l) { return l.id === id; })[0] || null; }
function isIn(l, k) { return !!l && (l.adds[k] || 0) > (l.rms[k] || 0); }
function inList(id, k) { return isIn(getList(id), k); }
function listKeys(l) { return Object.keys(l.adds).filter(function (k) { return isIn(l, k); }).sort(function (a, b) { return l.adds[b] - l.adds[a]; }); }
function isSeen(k) { return (state.user.seen[k] || 0) > (state.user.unseen[k] || 0); }
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
    if (/limit/i.test(m)) { state.omdbStop = 'OMDb llegó al tope de consultas de hoy. Mañana sigue solo.'; throw AppError('omdb-limit', state.omdbStop); }
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
function catSig() { var s = state.settings; return [s.region, s.lang, s.depth, s.minVotes, 'v2'].join('|'); }
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

async function loadProviders(type) {
  if (state.providers[type]) return state.providers[type];
  var c = LS.get('providers.' + type, null);
  if (c && c.region === state.settings.region && Date.now() - c.at < 7 * DAY) return (state.providers[type] = c.map);
  var map = {};
  try {
    var d = await tmdb('/watch/providers/' + type, { watch_region: state.settings.region });
    var list = d.results || [];
    SERVICES.forEach(function (s) {
      var ids = list.filter(function (p) { return !/channel/i.test(p.provider_name) && s.re.test(p.provider_name); }).map(function (p) { return p.provider_id; });
      map[s.key] = ids.length ? ids : s.fb.slice();
    });
  } catch (e) {
    if (e.fatal) throw e;
    SERVICES.forEach(function (s) { map[s.key] = s.fb.slice(); });
  }
  LS.set('providers.' + type, { region: state.settings.region, at: Date.now(), map: map });
  return (state.providers[type] = map);
}
function servicesForProviders(type, list) {
  var map = state.providers[type] || {};
  return SERVICES.filter(function (s) { return (map[s.key] || s.fb).some(function (id) { return list.some(function (p) { return p.provider_id === id; }); }); }).map(function (s) { return s.key; });
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
var Q = { hi: [], lo: [], queued: new Set(), running: 0, max: 6, om: [], omQueued: new Set(), omRunning: 0, omMax: 3, wantOm: new Set() };

function liteFromFull(d, type) {
  var imdb = d.imdb_id || dig(d, 'external_ids.imdb_id') || null;
  if (imdb && !/^tt\d{5,10}$/.test(imdb)) imdb = null;
  var wp = dig(d, 'watch/providers.results.' + state.settings.region) || {};
  var svc = servicesForProviders(type, (wp.flatrate || []).concat(wp.ads || [], wp.free || []));
  if (type === 'movie') return { v: 2, at: Date.now(), rt: +d.runtime || null, imdb: imdb, svc: svc };
  var ert = d.episode_run_time || [];
  var rt = ert.length ? ert[0] : (dig(d, 'last_episode_to_air.runtime') || null);
  return { v: 2, at: Date.now(), rt: +rt || null, imdb: imdb, svc: svc, seasons: +d.number_of_seasons || null };
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
function wantRatings(items) {
  if (!state.settings.omdbKey || state.omdbStop) return;
  var needDetails = [];
  items.forEach(function (it) {
    var d = state.details[it.k];
    if (d) { if (d.imdb && !state.omdb[d.imdb]) queueOmdb(d.imdb, it); }
    else { Q.wantOm.add(it.k); needDetails.push(it); }
  });
  if (needDetails.length) wantDetails(needDetails, 'hi');
  pumpOmdb();
}
function queueOmdb(imdb, it) { if (Q.omQueued.has(imdb) || state.omdb[imdb]) return; Q.omQueued.add(imdb); Q.om.push([imdb, it]); }
function pumpOmdb() {
  while (Q.omRunning < Q.omMax && Q.om.length && !state.omdbStop) {
    var job = Q.om.shift(); Q.omRunning++;
    (function (imdb, it) {
      fetchOmdb(imdb)
        .then(function (r) { state.omdb[imdb] = r; saveCachesSoon(); onEnriched(it); })
        .catch(function (e) { if (e.code === 'omdb-limit' || e.code === 'omdb-auth') { Q.om.length = 0; Q.omQueued.clear(); renderRailStatus(); toast(e.message); } })
        .then(function () { Q.omRunning--; Q.omQueued.delete(imdb); pumpOmdb(); progressNote(); });
    })(job[0], job[1]);
  }
  progressNote();
}
function onEnriched(it) {
  if (Q.wantOm.has(it.k)) { Q.wantOm.delete(it.k); var d = state.details[it.k]; if (d && d.imdb) { queueOmdb(d.imdb, it); pumpOmdb(); } }
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
  el.textContent = om ? 'Trayendo ratings… quedan ' + nf.format(om) : (pend > 8 ? 'Completando duraciones… quedan ' + nf.format(pend) : '');
}

/* ---------- scores ---------- */
function scoresOf(it) {
  var d = state.details[it.k]; var o = d && d.imdb ? state.omdb[d.imdb] : null;
  return {
    tmdb: it.vc > 0 ? it.v : null,
    imdb: o && nz(o.imdb) ? o.imdb : null, votes: o && o.votes ? o.votes : null,
    rt: o && nz(o.rt) ? o.rt : null, mc: o && nz(o.mc) ? o.mc : null,
    omdbDone: !!o, noImdb: !!(d && !d.imdb)
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
function svcOf(it) { if (it.s && it.s.length) return it.s; var d = state.details[it.k]; return d && d.v === 2 ? d.svc : []; }
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
  else { var l = getList(state.ui.list) || getList('watchlist'); state.ui.list = l.id; keys = listKeys(l); }
  var items = keys.map(resolveItem).filter(Boolean), R = l ? rumboOf(l) : null;
  if (R) { var vis = items.filter(function (it) { return !rumboOut(R, it); }); state.rumboHidden = items.length - vis.length; return vis; }
  state.rumboHidden = 0;
  return items;
}
function applyFilters(list) {
  var f = state.f, q = fold(state.q), mine = ctxMine(), open = ctxOpen();
  var services = new Set(f.services);
  var inc = [], exc = [];
  Object.keys(f.genres).forEach(function (n) { if (f.genres[n] === 1) inc.push(n); else if (f.genres[n] === -1) exc.push(n); });
  var yFrom = parseInt(f.yearFrom, 10) || 0, yTo = parseInt(f.yearTo, 10) || 0;
  var hideSeen = f.hideSeen && !(state.ui.view === 'lists' && state.ui.list === 'seen' && !state.special);
  var noIndia = f.noIndia && !(state.ui.view === 'lists' && !state.special) && !(state.special && state.special.kind === 'search');
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
    if (hideSeen && seenNow(it.k)) return false;
    if (noIndia && isIndian(it)) return false;
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
    if (f.ratingMin > 0) {
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
  if (state.settings.omdbKey && !s.omdbDone && !s.noImdb && !state.omdbStop) out.push('<span class="sc wait">IMDb…</span>');
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
function svcBadge(k) { return '<span class="sb c-' + k + '">' + esc(SVC[k].label) + '</span>'; }
function stremioHref(type, imdb, web) {
  if (!/^tt\d{5,10}$/.test(imdb || '')) return null;
  var path = type === 'tv' ? 'detail/series/' + imdb : 'detail/movie/' + imdb + '/' + imdb;
  return web ? 'https://web.stremio.com/#/' + path : 'stremio:///' + path;
}
function svcsHTML(it) {
  var list = svcOf(it), out = list.map(svcBadge);
  if (!out.length) {
    if (!availKnown(it)) out.push('<span class="sb dim">' + (it.off ? 'Fuera de tus servicios' : 'Buscando dónde verla…') + '</span>');
    else {
      var d = state.details[it.k], href = d && stremioHref(it.type, d.imdb);
      out.push(href ? '<a class="sb stremio" href="' + href + '" title="No está en tus servicios. Abrir en Stremio">Stremio ↗</a>' : '<span class="sb dim">Fuera de tus servicios</span>');
    }
  }
  return out.join('');
}
function whyHTML(it) {
  var meta = state.special && state.special.meta && state.special.meta.get(it.k);
  return meta && meta.why ? '<p class="why">' + esc(meta.why) + '</p>' : '';
}
function cardHTML(it) {
  var watch = inList('watchlist', it.k), seen = isSeen(it.k), t = esc(it.t), p = safePath(it.p);
  var img = p ? '<img loading="lazy" decoding="async" alt="" src="' + IMG + 'w342' + p + '" srcset="' + IMG + 'w185' + p + ' 185w, ' + IMG + 'w342' + p + ' 342w" sizes="(max-width: 480px) 46vw, 200px">' : '<span class="noposter">' + t + '</span>';
  return '<article class="card' + (seen ? ' is-seen' : '') + '" data-k="' + esc(it.k) + '">' +
    '<div class="poster-wrap"><button class="poster" type="button" data-act="open" aria-label="' + t + ': ver ficha">' + img + '</button>' +
    '<div class="quick">' +
      '<button class="q" type="button" data-act="watch" aria-pressed="' + watch + '" aria-label="Mi lista" title="Mi lista">' + (watch ? ICON.bookmarkOn : ICON.bookmark) + '</button>' +
      '<button class="q" type="button" data-act="seen" aria-pressed="' + seen + '" aria-label="Ya la vi" title="Ya la vi">' + ICON.eye + '</button>' +
      '<button class="q" type="button" data-act="lists" aria-haspopup="menu" aria-label="Agregar a otra lista" title="Agregar a otra lista">' + ICON.plus + '</button>' +
    '</div>' + (seen ? '<span class="seen-tag">Vista</span>' : '') + '</div>' +
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
  var watch = inList('watchlist', it.k), seen = isSeen(it.k);
  var bw = $('[data-act="watch"]', el); bw.setAttribute('aria-pressed', watch); bw.innerHTML = watch ? ICON.bookmarkOn : ICON.bookmark;
  $('[data-act="seen"]', el).setAttribute('aria-pressed', seen);
  el.classList.toggle('is-seen', seen);
  var tag = $('.seen-tag', el);
  if (seen && !tag) $('.poster-wrap', el).insertAdjacentHTML('beforeend', '<span class="seen-tag">Vista</span>');
  if (!seen && tag) tag.remove();
}

function refresh(keepLimit) {
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
    return;
  }
  empty.hidden = true;
  grid.innerHTML = list.slice(0, state.limit).map(cardHTML).join('');
  if (isAllMode()) {
    more.hidden = !(A && A.page < A.total);
    more.textContent = A && A.loading ? 'Cargando…' : 'Cargar más';
  } else {
    more.hidden = list.length <= state.limit;
    if (!more.hidden) more.textContent = 'Mostrar más (' + nf.format(list.length - state.limit) + ' restantes)';
  }
  observeCards();
  if (keepScroll) window.scrollTo(0, y);
}
function renderMore() {
  if (isAllMode()) { loadAll(true); return; }
  var list = state.filtered, from = state.limit;
  if (from >= list.length) return;
  state.limit += PAGE;
  grid.insertAdjacentHTML('beforeend', list.slice(from, state.limit).map(cardHTML).join(''));
  var more = $('#more'); more.hidden = list.length <= state.limit;
  if (!more.hidden) more.textContent = 'Mostrar más (' + nf.format(list.length - state.limit) + ' restantes)';
  observeCards();
}
function observeCards() {
  var cards = $$('.card[data-k]', grid).filter(function (c) { return !c.dataset.obs; });
  cards.forEach(function (c) { c.dataset.obs = '1'; });
  if (io) cards.forEach(function (c) { io.observe(c); });
  else {
    var items = cards.map(function (c) { return state.index.get(c.dataset.k); }).filter(Boolean);
    wantDetails(items, 'hi'); wantRatings(items);
  }
}
function emptyHTML() {
  var sp = state.special;
  if (sp && sp.kind === 'search') return '<strong>Sin resultados</strong><p>TMDB no encontró nada para «' + esc(sp.q) + '».</p>';
  if (sp && sp.error) return '<strong>No pude cargar esto</strong><p>' + esc(sp.error) + '</p><button class="btn" type="button" data-back>Volver</button>';
  if (sp) return '<strong>Nada coincide</strong><p>Hay ' + nf.format((sp.items || []).length) + ' títulos, pero ninguno pasa los filtros.</p><button class="btn" type="button" data-clear>Limpiar filtros</button>';
  if (state.ui.view === 'lists') {
    var l = state.ui.list === 'seen' ? null : getList(state.ui.list);
    var total = state.ui.list === 'seen' ? seenKeys().length : (l ? listKeys(l).length : 0);
    if (!total) return state.ui.list === 'seen'
      ? '<strong>Todavía no marcaste nada</strong><p>Tocá el ojo en cualquier póster para marcarla como vista.</p>'
      : '<strong>Esta lista está vacía</strong><p>Tocá el marcador de un póster para sumarla a Mi lista, o el + para elegir otra lista.</p><button class="btn" type="button" data-go="catalog">Ir al catálogo</button>';
    return '<strong>Nada coincide</strong><p>La lista tiene ' + nf.format(total) + ' títulos pero ninguno pasa los filtros.</p><button class="btn" type="button" data-clear>Limpiar filtros</button>';
  }
  if (state.ui.source !== 'all' && !state.catalogs[state.ui.type]) return '';
  var extra = state.q && state.q.length >= 2 ? '<button class="btn btn-accent" type="button" data-global>Buscar «' + esc(state.q) + '» en todo TMDB</button>' : '';
  return '<strong>Nada coincide</strong><p>Probá bajar el rating mínimo, sacar algún género o prender otro servicio.</p><div class="pick-bar">' + extra + '<button class="btn" type="button" data-clear>Limpiar filtros</button></div>';
}
function renderCount() {
  var el = $('#count'), n = state.filtered.length, gb = $('#globalBtn');
  var noun = function (type, c) { return type === 'movie' ? (c === 1 ? 'película' : 'películas') : (c === 1 ? 'serie' : 'series'); };
  var titles = function (c) { return nf.format(c) + (c === 1 ? ' título' : ' títulos'); };
  gb.hidden = true;
  var sp = state.special;
  if (sp) {
    gb.hidden = false; gb.textContent = 'Volver'; gb.dataset.mode = 'back';
    if (sp.kind === 'search') el.innerHTML = 'Resultados<small>para «' + esc(sp.q) + '» en todo TMDB</small>';
    else if (sp.kind === 'person') el.innerHTML = esc(sp.title) + '<small>' + (sp.loading ? 'cargando filmografía…' : titles(n)) + '</small>';
    else el.innerHTML = esc(sp.title) + '<small>' + (sp.loading ? (sp.progress || 'buscando parecidas…') : titles(n)) + '</small>';
    return;
  }
  if (state.ui.view === 'lists') {
    var name = state.ui.list === 'seen' ? 'Vistas' : (getList(state.ui.list) || {}).name;
    el.innerHTML = esc(name) + '<small>' + titles(n) + '</small>';
    return;
  }
  if (state.ui.source === 'all') {
    if (state.f.people.length) el.innerHTML = nf.format(n) + ' ' + noun(state.ui.type, n) + '<small>con ' + esc(state.f.people.map(function (p) { return p.name; }).join(' o ')) + '</small>';
    else {
      var A = state.all, ready = A && A.sig === allSig() && A.page > 0;
      el.innerHTML = ready ? nf.format(A.totalResults || n) + ' ' + noun(state.ui.type, A.totalResults || n) + '<small>en todo el cine</small>' : 'Todo el cine<small>buscando…</small>';
    }
  } else {
    if (!state.catalogs[state.ui.type]) { el.innerHTML = state.fatal ? 'WatchListo' : 'Armando tu cartelera<small>la primera vez tarda un poco</small>'; return; }
    el.innerHTML = nf.format(n) + ' ' + noun(state.ui.type, n) + '<small>en tus servicios</small>';
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
}
function rumboHTML(l) {
  var ch = rumboChips(l), tags = l.tags || {};
  if (!ch.base.length && !ch.more.length) return '';
  var chip = function (k, extra) {
    var off = tags[k] && tags[k].v < 0;
    return '<button class="rchip' + (off ? ' off' : '') + '" type="button" data-rumbo="' + esc(k) + '" aria-pressed="' + !off + '" title="' + (off ? 'Volver a incluir' : 'Sacar del rumbo') + '">' + esc(labelName(k)) + (extra ? ' <span class="n">' + extra + '</span>' : '') + '</button>';
  };
  var hidden = state.rumboHidden || 0;
  return '<div class="rumbo"><p class="rumbo-h"><b>Rumbo</b> Tocá una etiqueta para sacarla: el festival deja afuera lo que va más por ese lado que por el resto.' + (hidden ? ' <span class="rumbo-n">' + hidden + (hidden === 1 ? ' título oculto' : ' títulos ocultos') + ' por el rumbo</span>' : '') + '</p>' +
    '<div class="rumbo-chips">' + ch.base.map(function (k) { return chip(k); }).join('') + '</div>' +
    (ch.more.length ? '<details class="rumbo-more"' + (state.rumboMoreOpen ? ' open' : '') + '><summary>Más etiquetas</summary><div class="rumbo-chips">' + ch.more.map(function (k) { return chip(k, ch.freq[k]); }).join('') + '</div></details>' : '') + '</div>';
}
function shareCandidates(l) { return cloudIn() ? CLOUD.buddies.filter(function (b) { return !b.pending && (l.members || []).indexOf(b.uid) < 0; }) : []; }
function renderListbar() {
  var bar = $('#listbar');
  bar.hidden = state.ui.view !== 'lists' || !!state.special;
  if (bar.hidden) return;
  var cur = state.ui.list;
  if (cur !== 'seen' && !getList(cur)) cur = state.ui.list = 'watchlist';
  var pills = visibleLists().map(function (l) { var fest = isRadio(l); return '<button class="lpill' + (fest ? ' is-fest' : '') + (l.shared ? ' is-shared' : '') + '" type="button" data-list="' + esc(l.id) + '" aria-pressed="' + (l.id === cur) + '"' + (fest ? ' title="Festival: una lista que se completa sola"' : '') + '>' + (fest ? ICON.ticket : '') + (l.shared ? DUO_ICON : '') + esc(l.name) + ' <span class="n">' + nf.format(listKeys(l).length) + '</span></button>'; });
  pills.push('<button class="lpill" type="button" data-list="seen" aria-pressed="' + (cur === 'seen') + '">Vistas <span class="n">' + nf.format(seenKeys().length) + '</span></button>');
  var tools = '';
  var l = getList(cur);
  var editable = l && l.id !== 'watchlist';
  if (state.listEdit === 'new') tools = '<form class="inline-form" data-form="new"><label class="sr" for="newListInp">Nombre</label><input class="inp" id="newListInp" maxlength="40" placeholder="Nombre de la lista"><button class="btn btn-accent" type="submit">Crear</button><button class="btn btn-ghost" type="button" data-cancel>Cancelar</button></form>';
  else if ((state.listEdit === 'share' || state.listEdit === 'addmember') && l) {
    var pick = shareCandidates(l), sel = state.shareSel || new Set();
    tools = '<span class="share-pick"><span class="hint">' + (state.listEdit === 'share' ? 'Compartir con:' : 'Sumar a:') + '</span>' + pick.map(function (b) { return '<button class="g-chip" type="button" data-pick="' + esc(b.uid) + '" aria-pressed="' + sel.has(b.uid) + '">' + esc(b.name) + '</button>'; }).join('') +
      '<button class="btn btn-accent" type="button" data-tool="share-go"' + (sel.size ? '' : ' disabled') + '>' + (state.listEdit === 'share' ? 'Compartir' : 'Sumar') + '</button><button class="btn btn-ghost" type="button" data-cancel>Cancelar</button></span>';
  }
  else if (state.listEdit === 'rename' && editable) tools = '<form class="inline-form" data-form="rename"><label class="sr" for="renListInp">Nuevo nombre</label><input class="inp" id="renListInp" maxlength="40" value="' + esc(l.name) + '"><button class="btn btn-accent" type="submit">Guardar</button><button class="btn btn-ghost" type="button" data-cancel>Cancelar</button></form>';
  else {
    tools = '<button class="btn" type="button" data-tool="new"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Nueva lista</button>';
    var count = l ? listKeys(l).length : 0;
    if (l && isRadio(l)) tools += '<button class="btn btn-accent" type="button" data-tool="radio-more"' + (state.radioBusy ? ' disabled' : '') + '>' + (state.radioBusy ? 'Buscando…' : 'Sumar 10 más') + '</button>';
    else if (l && count) tools += '<button class="btn" type="button" data-tool="reco">Parecidas a esta lista</button><button class="btn" type="button" data-tool="radio-from">Armar festival</button>';
    if (cur === 'seen' && seenKeys().length) tools += '<button class="btn btn-accent" type="button" data-tool="foryou">' + (duoComp() ? esc(forYouNames().title) : 'Recomendaciones para vos') + '</button>';
    if (l && cloudIn() && shareCandidates(l).length) tools += '<button class="btn" type="button" data-tool="' + (l.shared ? 'addmember' : 'share') + '">' + DUO_ICON + (l.shared ? 'Sumar persona' : 'Compartir') + '</button>';
    if (editable) tools += '<button class="btn btn-ghost" type="button" data-tool="rename">Renombrar</button>' + (l.shared && l.owner !== cloudUid() ?
      '<button class="btn btn-ghost" type="button" data-tool="leave">' + (state.confirmDelete === l.id ? 'Confirmar salida' : 'Salir de la lista') + '</button>' :
      '<button class="btn btn-ghost" type="button" data-tool="delete">' + (state.confirmDelete === l.id ? 'Confirmar borrado' : 'Borrar lista') + '</button>');
  }
  var radioHint = '';
  if (l && isRadio(l) && !state.listEdit) {
    var seeds = Object.keys(l.seeds).map(resolveItem).filter(Boolean).map(function (s) { return s.t; });
    radioHint = '<p class="hint radio-hint"><span class="radio-tag">Festival</span> Una lista que se completa sola. Programado a partir de: ' + esc(seeds.join(', ')) + '. Abrí cualquier peli para usarla como base o sacarla del festival.</p>' + rumboHTML(l);
  }
  if (l && l.shared && !state.listEdit) {
    var others = (l.members || []).filter(function (m) { return m !== cloudUid(); }).map(function (m) { return l.memberNames[m] || 'alguien'; });
    radioHint = '<p class="hint share-hint">' + DUO_ICON + ' Compartida con ' + esc(others.join(', ') || 'nadie más') + '. Todos pueden sumar, sacar' + (isRadio(l) ? ', cambiar el rumbo y sumar más; el festival se programa con el gusto de los dos.' : ' y renombrar.') + '</p>' + radioHint;
  }
  bar.innerHTML = pills.join('') + '<span class="list-tools">' + tools + '</span>' + radioHint;
  var inp = $('#newListInp') || $('#renListInp'); if (inp) inp.focus();
}

function renderRail() {
  $('#svcToggles').innerHTML = SERVICES.map(function (s) {
    return '<button class="svc-t c-' + s.key + '" type="button" data-svc="' + s.key + '" aria-pressed="' + (state.f.services.indexOf(s.key) >= 0) + '"><span class="dot"></span>' + esc(s.label) + '</button>';
  }).join('');
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
  if (!state.settings.omdbKey) out.push('<p>Sumá una clave gratis de OMDb para ver IMDb, Rotten Tomatoes y Metacritic. <button class="linkbtn" type="button" data-settings>Configurar</button></p>');
  else if (state.omdbStop) out.push('<p>' + esc(state.omdbStop) + '</p>');
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
  if (state.settings.ghToken) out.push('<p class="sync-state" data-s="' + state.sync.s + '">' + esc(state.sync.status) + '</p>');
  else out.push('<p>Tus listas están solo en este dispositivo. <button class="linkbtn" type="button" data-settings>Sincronizar</button></p>');
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
    renderDetail();
    var imdb = state.details[it.k].imdb;
    if (state.settings.omdbKey && imdb && !state.omdb[imdb] && !state.omdbStop) {
      try { state.omdb[imdb] = await fetchOmdb(imdb); saveCachesSoon(); updateCard(it.k); if (state.detail && state.detail.k === it.k) renderDetail(); }
      catch (e) { if (e.code === 'omdb-limit' || e.code === 'omdb-auth') toast(e.message); }
    }
  } catch (e) {
    if (state.detail && state.detail.k === it.k) { state.detail.error = e.message; renderDetail(); }
  }
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
  var big = ['tmdb', 'imdb', 'rt', 'mc'].map(function (k) {
    var v = s[k];
    if (!nz(v) && k !== 'tmdb' && !state.settings.omdbKey) return '';
    return '<div class="bs' + (nz(v) ? '' : ' na') + '"><b>' + fmtScore(k, v) + '</b><span>' + SRC[k].label + '</span></div>';
  }).join('');
  var people = '';
  if (full) {
    var crew = dig(full, 'credits.crew') || [], cast = (dig(full, 'credits.cast') || []).slice(0, 8);
    var dir = it.type === 'movie' ? crew.filter(function (c) { return c.job === 'Director'; }) : (full.created_by || []);
    var wri = it.type === 'movie' ? crew.filter(function (c) { return c.job === 'Screenplay' || c.job === 'Writer'; }).slice(0, 3) : [];
    var pbtn = function (p) { return '<button class="plink" type="button" data-person="' + (+p.id) + '" data-pname="' + esc(p.name) + '">' + esc(p.name) + '</button>'; };
    var uniq = function (arr) { var s = {}; return arr.filter(function (p) { if (!p || !p.id || s[p.id]) return false; s[p.id] = 1; return true; }); };
    if (dir.length) people += '<dt>' + (it.type === 'movie' ? 'Dirección' : 'Creada por') + '</dt><dd>' + uniq(dir).map(pbtn).join(', ') + '</dd>';
    if (wri.length) people += '<dt>Guion</dt><dd>' + uniq(wri).map(pbtn).join(', ') + '</dd>';
    if (cast.length) people += '<dt>Reparto</dt><dd>' + uniq(cast).map(pbtn).join(', ') + '</dd>';
  }
  var wtw = '', mineHere = false;
  if (full) {
    var wp = dig(full, 'watch/providers.results.' + state.settings.region) || {};
    var flat = (wp.flatrate || []).concat(wp.ads || [], wp.free || []);
    var seenNames = {};
    var flatHtml = flat.filter(function (p) { if (seenNames[p.provider_name]) return false; seenNames[p.provider_name] = 1; return true; }).map(function (p) {
      var svc = servicesForProviders(it.type, [p]);
      return svc.length ? '<span class="sb c-' + svc[0] + '">' + esc(p.provider_name) + '</span>' : '<span class="sb dim">' + esc(p.provider_name) + '</span>';
    }).join('');
    mineHere = servicesForProviders(it.type, flat).length > 0;
    var stApp = stremioHref(it.type, lite.imdb), stWeb = stremioHref(it.type, lite.imdb, true);
    var stremioRow = !mineHere && stApp ? '<div class="actions-2"><a class="btn" href="' + stApp + '">Abrir en Stremio</a><a class="btn btn-ghost" href="' + stWeb + '" target="_blank" rel="noopener noreferrer">Stremio Web</a></div>' : '';
    wtw = '<div class="dsec"><h3>Dónde verla en Argentina</h3>' + (flatHtml ? '<div class="wtw">' + flatHtml + '</div>' : '<p class="hint">No está en ninguna plataforma de suscripción en Argentina.</p>') + stremioRow + '</div>';
  }
  var vids = full ? (dig(full, 'videos.results') || []).filter(function (v) { return v.site === 'YouTube' && /Trailer|Teaser/.test(v.type) && /^[A-Za-z0-9_-]{6,20}$/.test(v.key); }) : [];
  var lang2 = state.settings.lang.slice(0, 2);
  vids.sort(function (a, b) { return (b.iso_639_1 === lang2) - (a.iso_639_1 === lang2) || (b.type === 'Trailer') - (a.type === 'Trailer'); });
  var links = [];
  var ext = ' target="_blank" rel="noopener noreferrer"';
  if (vids[0]) links.push('<a href="https://www.youtube.com/watch?v=' + vids[0].key + '"' + ext + '>Ver tráiler</a>');
  links.push('<a href="https://www.themoviedb.org/' + it.type + '/' + (+it.id) + '/watch?locale=' + state.settings.region + '"' + ext + '>Dónde ver (TMDB)</a>');
  if (lite.imdb) links.push('<a href="https://www.imdb.com/title/' + lite.imdb + '/"' + ext + '>IMDb</a>');
  if (lite.imdb && mineHere) links.push('<a href="' + stremioHref(it.type, lite.imdb) + '">Stremio</a>');
  if (it.type === 'movie') links.push('<a href="https://letterboxd.com/tmdb/' + (+it.id) + '/"' + ext + '>Letterboxd</a>');
  var watch = inList('watchlist', it.k), seen = isSeen(it.k), stars = starOf(it.k), rctx = radioContext();
  var starBtns = ''; for (var i = 1; i <= 5; i++) starBtns += '<button class="star' + (i <= stars ? ' on' : '') + '" type="button" data-star="' + i + '" aria-label="' + i + (i === 1 ? ' estrella' : ' estrellas') + '" aria-pressed="' + (i === stars) + '">' + ICON.star + '</button>';
  var listChips = visibleLists().filter(function (l) { return l.id !== 'watchlist'; }).map(function (l) { return '<button class="chip" type="button" data-dlist="' + esc(l.id) + '" aria-pressed="' + isIn(l, it.k) + '">' + esc(l.name) + '</button>'; }).join('');
  var cf = curFind({ t: title, ot: orig, y: it.y, type: it.type }) || curFind(it), curHtml = '';
  if (cf) {
    var L = CUR.labels, tag = function (v) { return '<span class="ctag">' + esc(v) + '</span>'; };
    var rels = Array.from(CUR.rel.get(cf.id) || []).slice(0, 6).map(function (r) { var f = CUR.byId.get(r); return f.t + ' (' + f.y + ')'; });
    curHtml = '<div class="dsec cur"><h3>Curaduría</h3><p class="cur-sec">Sección <b>' + esc(L.sec[cf.sec]) + '</b></p>' +
      '<div class="ctags">' + cf.sub.map(function (v) { return tag(L.sub[v]); }).join('') + cf.tem.map(function (v) { return tag(L.tem[v]); }).join('') + cf.ton.map(function (v) { return tag(L.ton[v]); }).join('') + '</div>' +
      (rels.length ? '<p class="hint">Parientes: ' + esc(rels.join(' · ')) + '</p>' : '') +
      '<div class="actions-2"><button class="btn" type="button" data-cursec="' + esc(cf.sec) + '">Armar festival: ' + esc(L.sec[cf.sec]) + '</button></div></div>';
  }
  var dtddTitle = (cf && cf.t) || orig || title;
  links.push('<a href="https://www.doesthedogdie.com/search?q=' + encodeURIComponent(dtddTitle) + '"' + ext + '>Advertencias (Does the Dog Die)</a>');
  var html =
    '<button class="dlg-x" type="button" data-close aria-label="Cerrar">' + ICON.x + '</button>' +
    '<div class="det-hero"></div>' +
    '<div class="det-body">' +
      '<div class="det-poster">' + (poster ? '<img alt="" src="' + IMG + 'w500' + poster + '">' : '') + '</div>' +
      '<div class="det-main">' +
        (D.pick ? '<p class="eyebrow">Para esta noche</p>' : '') +
        '<h2 class="det-title">' + esc(title) + '</h2>' +
        (orig && fold(orig) !== fold(title) ? '<p class="det-orig">' + esc(orig) + '</p>' : '') +
        '<p class="det-facts">' + esc(facts.join(' · ')) + '</p>' +
        '<div class="bigscores">' + big + '</div>' +
        (D.pick ? '<div class="pick-bar"><button class="btn" type="button" data-repick>Otra opción</button></div>' : '') +
        '<div class="actions">' +
          '<button class="btn" type="button" data-dact="watch" aria-pressed="' + watch + '">' + (watch ? 'En Mi lista' : 'Sumar a Mi lista') + '</button>' +
          '<button class="btn" type="button" data-dact="seen" aria-pressed="' + seen + '">' + (seen ? 'Vista' : 'Marcar como vista') + '</button>' +
          '<span class="stars" role="group" aria-label="Tu puntaje" title="Tu puntaje: afina tus recomendaciones">' + starBtns + '</span>' +
        '</div>' + duoRowHTML(it) +
        '<div class="actions-2">' +
          '<button class="btn" type="button" data-dact="reco">Más como esta</button>' +
          '<button class="btn" type="button" data-dact="radio">Armar festival</button>' +
          (rctx && listKeys(rctx).indexOf(it.k) >= 0 ? (rctx.seeds[it.k] ? '<span class="hint">Es una de las pelis base de este festival.</span>' : '<button class="btn" type="button" data-dact="seed">Usar como base</button>') + '<button class="btn btn-ghost" type="button" data-dact="nope">Sacar del festival</button>' : '') +
        '</div>' +
        (listChips ? '<div class="dsec"><h3>Tus listas</h3><div class="chips">' + listChips + '</div></div>' : '') +
        curHtml +
        (full && full.tagline ? '<p class="tagline">' + esc(full.tagline) + '</p>' : '') +
        (full ? '<p class="overview">' + esc(full.overview || 'Sin sinopsis en este idioma.') + '</p>' : (D.error ? '<p class="err">' + esc(D.error) + '</p>' : '<p class="hint">Cargando la ficha…</p>')) +
        (people ? '<dl class="kv">' + people + '</dl>' : '') +
        wtw +
        '<div class="links">' + links.join('') + '</div>' +
      '</div>' +
    '</div>';
  $('#detail').innerHTML = html;
  if (backdrop) $('#detail .det-hero').style.backgroundImage = 'url("' + IMG + 'w1280' + backdrop + '")';
}

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

/* ---------- personas ---------- */
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
    (cc.crew || []).forEach(function (c) { if (c.job === 'Director' || c.job === 'Creator') add(c, 'dir'); else if (c.department === 'Writing') add(c, 'wri'); });
    var data = { items: Array.from(items.values()), keys: new Set(items.keys()), roles: roles };
    state.personData[id] = data; delete state.personLoading[id];
    return data;
  }, function (e) { delete state.personLoading[id]; throw e; });
  state.personLoading[id] = pr;
  return pr;
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
    var tabs = { dir: [], act: [], wri: [] };
    data.items.forEach(function (it) { var r = data.roles[it.k] || {}; ['dir', 'act', 'wri'].forEach(function (t) { if (r[t]) tabs[t].push(fromCatalog(it)); }); });
    sp.tabs = tabs;
    var pref = sp.dept === 'Directing' ? 'dir' : sp.dept === 'Writing' ? 'wri' : 'act';
    sp.tab = tabs[pref].length ? pref : (['dir', 'act', 'wri'].filter(function (t) { return tabs[t].length; })[0] || 'act');
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
var DEPT = { Directing: 'Dirección', Acting: 'Actuación', Writing: 'Guion', Production: 'Producción', Camera: 'Fotografía', Editing: 'Montaje', Sound: 'Sonido', Art: 'Arte' };
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
  bar.hidden = !sp || sp.kind === 'search' || !!sp.error;
  if (bar.hidden) { bar.innerHTML = ''; return; }
  if (sp.kind === 'person') {
    var labels = { dir: 'Dirección', act: 'Actuación', wri: 'Guion' };
    var tabs = sp.tabs ? ['dir', 'act', 'wri'].filter(function (t) { return sp.tabs[t].length; }) : [];
    bar.innerHTML = (tabs.length > 1 ? '<div class="seg" role="group" aria-label="Rol">' + tabs.map(function (t) { return '<button type="button" data-ptab="' + t + '" aria-pressed="' + (sp.tab === t) + '">' + labels[t] + ' <span class="n">' + sp.tabs[t].length + '</span></button>'; }).join('') + '</div>' : '') +
      '<span class="grow"></span>' + (sp.loading ? '' : '<button class="btn" type="button" data-pfilter>Filtrar mi cartelera por ' + esc(sp.title) + '</button>');
  } else if (sp.kind === 'reco') {
    bar.innerHTML = '<p class="seeds">A partir de ' + sp.seeds.map(function (s) { return '<b>' + esc(s.t) + '</b>'; }).join(', ') + '</p><span class="grow"></span>' +
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
    if (lowNow(a.it.k) || (state.f.noIndia && isIndian(a.it))) return;
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
var TASTE_W = [0, -1, -0.6, 0, 0.6, 1];
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
    out.push({ k: k, n: Math.max(a ? a.n : 0, b ? b.n : 0), w: w, it: s.it, at: Math.max(a ? a.at : 0, b ? b.at : 0), who: who });
  });
  return out;
}
function tasteProfile() {
  var sig = tasteSignals(), duo = !!duoComp();
  var p = { genres: {}, dirs: {}, liked: [], disliked: [], rated: 0, seenOnly: 0, conf: 0, duo: duo };
  sig.forEach(function (s) {
    if (s.n) p.rated++; else p.seenOnly++;
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
  Object.keys(l.seeds || {}).forEach(function (k) { var L = itemLabels(resolveItem(k)); L.main.concat(L.rest).forEach(function (x) { if (!out.has(x)) keep.add(x); }); });
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
  var seeds = Object.keys(l.seeds || {}), main = [], restN = {}, inBase = new Set();
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
  if (CLOUD.admin && cloudIn()) {
    var inv = CLOUD.invites;
    h += '<section class="pf-sec"><h3 class="fest-h">Invitados</h3><p class="hint">Solo estos mails pueden entrar con Google. Les llegan configuradas tus claves de TMDB y OMDb, y los puntajes de OMDb se comparten entre todos.</p>' +
      '<form class="duo-new inv-form" id="invForm" autocomplete="off"><label class="sr" for="invEmail">Mail</label><input class="inp" id="invEmail" type="email" placeholder="mail@gmail.com" required><label class="sr" for="invName">Nombre</label><input class="inp" id="invName" maxlength="40" placeholder="Nombre"><button class="btn btn-accent" type="submit">Invitar</button></form>' +
      (inv === null ? '<p class="hint">Cargando…</p>' : inv.length ? '<ul class="duo-people">' + inv.map(function (x) {
        return '<li><span><b>' + esc(x.name || x.email) + '</b><small>' + esc(x.email) + '</small></span><span class="inv-acts"><button class="btn" type="button" data-pf="invshare" data-v="' + esc(x.email) + '">Mandar link</button><button class="btn btn-ghost" type="button" data-pf="invdel" data-v="' + esc(x.email) + '">' + (state.invDel === x.email ? 'Confirmar' : 'Quitar') + '</button></span></li>';
      }).join('') + '</ul>' : '<p class="hint">Todavía no invitaste a nadie.</p>') + '</section>';
  }
  el.innerHTML = h;
  $$('.pf-fill', el).forEach(function (f) { f.style.width = f.dataset.w + '%'; });
}
function profileAct(act, v) {
  if (act === 'duo') { openDuo(); return; }
  if (act === 'settings') { fillSettingsForm(); openDialog($('#dlgSettings')); return; }
  if (act === 'seen') { state.ui.list = 'seen'; setView('lists'); return; }
  if (act === 'list') { var l = getList(v); if (l) { state.ui.list = l.id; state.ui.view = 'lists'; state.special = null; refresh(); window.scrollTo(0, 0); } return; }
  if (act === 'open') { openDetail(itemFor(v)); return; }
  if (act === 'buddy') { setDuo(v); openDuo(); return; }
  if (act === 'ideal') { var b = $('#profile [data-pf="ideal"]'); startSectionFestival(v, b); return; }
  if (act === 'invshare') { var x = (CLOUD.invites || []).filter(function (i) { return i.email === v; })[0]; shareLink(appUrl(), 'Te invité a WatchListo' + (x && x.name ? ', ' + x.name : '') + '. Instalala desde este link y entrá con tu cuenta de Google (' + v + '): te llega todo configurado.', 'Link copiado. Mandáselo y que entre con ' + v + '.'); return; }
  if (act === 'invdel') {
    if (state.invDel !== v) { state.invDel = v; renderProfile(); setTimeout(function () { if (state.invDel === v) { state.invDel = null; renderProfile(); } }, 4000); return; }
    state.invDel = null; inviteRemove(v).catch(function () { toast('No pude quitar la invitación.'); }); return;
  }
}

/* ---------- radios ---------- */
function isRadio(l) { return !!l && Object.keys(l.seeds || {}).length > 0; }
function radioContext() { if (state.special || state.ui.view !== 'lists') return null; var l = getList(state.ui.list); return isRadio(l) ? l : null; }
async function radioFill(l, n) {
  var seeds = Object.keys(l.seeds).sort(function (a, b) { return l.seeds[a] - l.seeds[b]; }).map(resolveItem).filter(Boolean).slice(-8);
  /* lista compartida de a dos: se programa con el gusto de los dos y su regla de vistas */
  var sc = sharedCompanion(l), prevDuo = state.duo, added = 0;
  if (sc) state.duo = sc.id;
  try {
    var recs = await recommend(seeds), R = rumboOf(l), t = now();
    for (var i = 0; i < recs.length && added < n; i++) {
      var it = recs[i].it, k = it.k;
      if (isIn(l, k) || l.nos[k] || (l.seeds[k] && !duoComp()) || seenNow(k) || lowNow(k) || (l.rms[k] || 0) > 0 || rumboOut(R, it)) continue;
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
function guideSnap(g) { return JSON.stringify({ step: g.step, type: g.type, mood: g.mood, group: g.group, round: g.round, T: g.T, used: g.used, picked: g.picked, era: g.era, rt: g.rt, where: g.where, blind: g.blind }); }
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
/* dos títulos conocidos, bien distintos entre sí, entre los que mejor encajan hasta ahora */
function guidePair(g) {
  var films = guidePool(g).filter(function (f) { return g.used.indexOf(f.id) < 0; });
  if (films.length < 2) return null;
  var top = films.map(function (f) { return { f: f, s: guideFit(g.T, f) + 0.6 * guideFame(f) + 0.3 * guideJit(g, f.id) }; })
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
  if (v === 'a' || v === 'b') {
    var win = v === 'a' ? pair[0] : pair[1], lose = v === 'a' ? pair[1] : pair[0];
    guideAdd(g.T, win, 1); guideAdd(g.T, lose, -0.5); g.picked.push(win.id);
  }
  g.used.push(pair[0].id, pair[1].id);
  g.round++;
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
  var c = curMap[f.id], p = c && !c.none ? safePath(c.p) : null, L = CUR.labels;
  var desc = [f.y, L.sub[f.sub[0]], L.ton[f.ton[0]]].filter(Boolean).join(' · ');
  return '<button class="g-film" type="button" data-g="duel" data-v="' + v + '"><span class="g-poster">' + (p ? '<img alt="" src="' + IMG + 'w342' + p + '">' : '<span class="noposter">' + esc(curShownTitle(f)) + '</span>') + '</span>' +
    '<b>' + esc(curShownTitle(f)) + '</b><span>' + esc(desc) + '</span></button>';
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
      '<button class="btn" type="button" data-g="watch" data-v="' + esc(it.k) + '" aria-pressed="' + watch + '">' + (watch ? 'En Mi lista' : 'Sumar a Mi lista') + '</button></div>' +
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
      '<div class="g-alts g-center"><button class="g-alt" type="button" data-g="duel" data-v="none">Me da igual, o no conozco ninguna</button></div>';
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
  if (!seeds.length) return { items: [], seeds: [], byK: new Map() };
  var recs = await recommend(seeds, function (m) { progress('Buscando parecidas: ' + m); });
  var cands = new Map(), maxM = 0;
  recs.forEach(function (r) { if (r.match > maxM) maxM = r.match; });
  recs.forEach(function (r) { cands.set(r.it.k, { it: r.it, base: maxM ? r.match / maxM : 0.5, why: r.why }); });
  if (!g.blind) {
    var direct = byFit.filter(function (f) { return inEra(f.y); }).slice(0, 12);
    var dres = await Promise.all(direct.map(function (f) { return curResolve(f).catch(function () { return null; }); }));
    dres.forEach(function (it) { if (it && !cands.has(it.k)) cands.set(it.k, { it: fromCatalog(Object.assign({ s: [] }, it)), base: 0.55, why: '' }); });
  }
  var usedKeys = new Set(g.used.map(function (id) { var c = curMap[id]; return c && c.k; }).filter(Boolean));
  var out = [];
  cands.forEach(function (c) {
    var it = c.it;
    if (it.type !== g.type || seenNow(it.k) || !inEra(it.y) || usedKeys.has(it.k) || lowNow(it.k) || (state.f.noIndia && isIndian(it))) return;
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
  var byK = new Map(); final.forEach(function (r) { byK.set(r.it.k, r.it); });
  return { items: final, seeds: seeds, byK: byK };
}
async function guideRun(g) {
  try {
    var res = await guideCompute(g, function (msg) { var el = $('#guideProg'); if (el && state.guide === g && g.step === 'loading') el.textContent = msg; });
    if (state.guide !== g || g.step !== 'loading') return;
    g.res = res; g.shown = 0; g.step = 'results'; g.at = Date.now();
    renderGuide(); $('#dlgGuide').scrollTop = 0;
    wantRatings(res.items.slice(0, 6).map(function (r) { return r.it; }));
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
  if (act === 'more') { g.shown += 3; renderGuide(); $('#dlgGuide').scrollTop = 0; wantRatings(g.res.items.slice(g.shown, g.shown + 3).map(function (r) { return r.it; })); return; }
  if (act === 'open') { var it = g.res && g.res.byK.get(v); if (it) { closeDialog($('#dlgGuide')); openDetail(it); } return; }
  if (act === 'watch') { var it2 = g.res && g.res.byK.get(v); if (it2) { var on = toggleList('watchlist', it2); toast(on ? 'Sumada a Mi lista.' : 'Sacada de Mi lista.'); renderGuide(); } return; }
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
function navSync() {
  if (NAV.applying || !NAV.armed) return;
  var s = navSnap(), cur = NAV.entries[NAV.idx];
  if (navSame(s, cur)) return;
  var prev = NAV.idx > 1 ? NAV.entries[NAV.idx - 1] : null;
  if (prev && navSame(s, prev)) { NAV.idx--; NAV.skip++; history.back(); return; }
  NAV.entries = NAV.entries.slice(0, NAV.idx + 1); NAV.entries.push(s); NAV.idx++;
  try { history.pushState({ wl: NAV.idx }, ''); } catch (e) {}
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
var CLOUD = { api: null, loading: null, authUnsub: null, user: null, status: 'off', admin: false, unsubs: [], shared: new Map(), buddies: [], buddyUids: [], invites: null, modelKey: '', tasteKey: '', pendingBuddy: null };
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
  await CLOUD.api.signOut();
  LS.del('cloudOn');
  toast('Saliste de tu cuenta. Lo de este dispositivo queda acá.');
}
function cloudStopWatches() { CLOUD.unsubs.forEach(function (u) { try { u(); } catch (e) {} }); CLOUD.unsubs = []; }
async function onCloudUser(u) {
  cloudStopWatches();
  CLOUD.user = u; CLOUD.modelKey = ''; CLOUD.tasteKey = '';
  if (!u) { CLOUD.status = 'out'; CLOUD.shared.clear(); CLOUD.buddies = []; CLOUD.buddyUids = []; CLOUD.invites = null; renderCloudUI(); renderDuoBtn(); refresh(true); return; }
  LS.set('cloudOn', true);
  CLOUD.status = 'checking'; CLOUD.admin = u.email === ADMIN_EMAIL; renderCloudUI();
  var keys;
  try { keys = await CLOUD.api.get('config/keys'); }
  catch (e) { CLOUD.status = isDenied(e) ? 'denied' : 'error'; renderCloudUI(); return; }
  CLOUD.status = 'in';
  await cloudApplyKeys(keys);
  await cloudSyncModel();
  CLOUD.api.set('users/' + u.uid, { name: myDisplayName(), photo: u.photo || '', at: Date.now() }, true).catch(function () {});
  cloudWatch();
  if (CLOUD.admin) cloudLoadInvites();
  renderCloudUI(); refresh(true);
  if (CLOUD.pendingBuddy) buddyOpenPending();
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
    await shareLink(appUrl() + '#buddy=' + code, myDisplayName() + ' te invita a ser su watch buddy en WatchListo', 'Link copiado. Cuando lo acepte, aparece en tus buddies.');
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
async function shareLink(url, text, copiedMsg) {
  if (navigator.share) { try { await navigator.share({ title: 'WatchListo', text: text, url: url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast(copiedMsg || 'Link copiado.'); } catch (e) { window.prompt('Copiá este link:', url); }
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
  if (st === 'denied') return '<div class="cloud-card warn"><div><b>Tu cuenta todavía no está invitada</b><small>' + esc(u ? u.email : '') + '. Pedile a quien te pasó la app que sume ese mail.</small></div><button class="btn" type="button" data-cloud="switch">Usar otra cuenta</button></div>';
  if (st === 'error') return '<div class="cloud-card warn"><div><b>No pude conectar con tu cuenta</b><small>Puede ser la conexión. Lo de este dispositivo sigue funcionando.</small></div><button class="btn" type="button" data-cloud="in">Reintentar</button></div>';
  return '<div class="cloud-card"><div><b>Guardá todo en tu cuenta</b><small>Entrá con Google para tener tus listas en cualquier dispositivo, watch buddies y listas compartidas. Por ahora es solo por invitación.</small></div><button class="btn btn-accent" type="button" data-cloud="in">Entrar con Google</button></div>';
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

/* ---------- sync (GitHub Gist) ---------- */
var GIST_FILE = 'cartelera.json';
async function gh(path, opts) {
  opts = opts || {};
  var headers = { Authorization: 'Bearer ' + state.settings.ghToken.trim(), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (opts.body) headers['Content-Type'] = 'application/json';
  var res;
  try { res = await fetch('https://api.github.com' + path, { method: opts.method || 'GET', headers: headers, body: opts.body, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' }); }
  catch (e) { throw AppError('gh-net', 'Sin conexión con GitHub. Tus cambios quedan guardados y se suben cuando vuelva la conexión.'); }
  if (res.status === 401) throw AppError('gh-auth', 'GitHub rechazó el token. Puede estar vencido o mal copiado.');
  if (res.status === 403) throw AppError('gh-perm', 'El token no tiene permiso sobre Gists. Revisá que tenga Gists: Read and write.');
  if (res.status === 404) throw AppError('gh-404', 'No encontré el Gist de WatchListo con este token.');
  if (!res.ok) throw AppError('gh', 'GitHub respondió con error ' + res.status + '.');
  return res.json();
}
function setSync(s, msg) { state.sync.s = s; state.sync.status = msg; var el = $('#syncState'); if (el) { el.dataset.s = s; el.textContent = msg; } railStatusSoon(); }
async function findOrCreateGist() {
  for (var page = 1; page <= 5; page++) {
    var list = await gh('/gists?per_page=100&page=' + page);
    var hit = (list || []).filter(function (g) { return g && g.files && g.files[GIST_FILE]; })[0];
    if (hit) { state.settings.gistId = hit.id; saveSettings(); return 'found'; }
    if (!list || list.length < 100) break;
  }
  var files = {}; files[GIST_FILE] = { content: JSON.stringify(state.user) };
  var g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'WatchListo: mis listas (no borrar)', public: false, files: files }) });
  state.settings.gistId = g.id; saveSettings();
  return 'created';
}
var syncChain = Promise.resolve();
function syncNow(opts) {
  var run = function () { return doSync(opts || {}); };
  syncChain = syncChain.then(run, run);
  return syncChain;
}
var syncSoon = debounce(function () { if (state.settings.ghToken) syncNow({ silent: true }); }, 1500);
async function doSync(opts) {
  if (!state.settings.ghToken) return;
  if (opts.silent && state.sync.blocked) return;
  if (!opts.silent) state.sync.blocked = false;
  if (!navigator.onLine) { setSync('err', 'Sin conexión. Tus cambios quedan guardados y se suben cuando vuelva.'); return; }
  setSync('busy', 'Sincronizando…');
  try {
    if (state.settings.gistId && !/^[0-9a-f]{20,40}$/i.test(state.settings.gistId)) { state.settings.gistId = ''; saveSettings(); }
    if (!state.settings.gistId) await findOrCreateGist();
    var g;
    try { g = await gh('/gists/' + state.settings.gistId); }
    catch (e) { if (e.code !== 'gh-404') throw e; state.settings.gistId = ''; saveSettings(); await findOrCreateGist(); g = await gh('/gists/' + state.settings.gistId); }
    var f = g.files && g.files[GIST_FILE], remote = null;
    if (f) {
      var content = f.content;
      if (f.truncated && typeof f.raw_url === 'string' && /^https:\/\/gist\.githubusercontent\.com\//.test(f.raw_url)) content = await (await fetch(f.raw_url, { credentials: 'omit', referrerPolicy: 'no-referrer' })).text();
      try { remote = normUser(JSON.parse(content)); } catch (e) { remote = null; }
    }
    var merged = remote ? mergeUsers(state.user, remote) : state.user;
    if (contentKey(merged) !== contentKey(state.user)) {
      state.user = merged; LS.set('user', state.user);
      refresh(true);
      if (state.detail) renderDetail();
    }
    if (!remote || contentKey(merged) !== contentKey(remote)) {
      var files = {}; files[GIST_FILE] = { content: JSON.stringify(merged) };
      await gh('/gists/' + state.settings.gistId, { method: 'PATCH', body: JSON.stringify({ files: files }) });
    }
    state.sync.last = Date.now();
    setSync('ok', 'Listas sincronizadas a las ' + hhmm() + '.');
    $('#syncOff').hidden = false;
  } catch (e) {
    if (e.code === 'gh-auth' || e.code === 'gh-perm') state.sync.blocked = true;
    setSync('err', e.message);
    if (!opts.silent) toast(e.message);
  }
}
function disconnectSync() {
  state.settings.ghToken = ''; state.settings.gistId = ''; saveSettings();
  $('#sGh').value = ''; $('#syncOff').hidden = true;
  setSync('off', 'Este dispositivo dejó de sincronizar. Tus listas siguen acá y en GitHub.');
}

/* ---------- pairing (QR) ---------- */
function canPair() { return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'; }
function pairUrl() {
  var s = state.settings;
  var parts = ['1', s.tmdbKey, s.omdbKey, s.ghToken, s.gistId, s.lang].map(function (x) { return String(x || '').trim(); });
  return location.origin + location.pathname + '#pair=' + parts.join('~');
}
function inviteUrl() {
  var s = state.settings, withOmdb = $('#inviteOmdb').checked;
  var parts = ['1', s.tmdbKey, withOmdb ? s.omdbKey : '', '', '', s.lang].map(function (x) { return String(x || '').trim(); });
  return location.origin + location.pathname + '#pair=' + parts.join('~');
}
function resetInvite() { $('#inviteOut').hidden = true; $('#inviteOut').value = ''; $('#inviteBox').hidden = true; $('#inviteQrBox').innerHTML = ''; }
function inviteCopy() {
  if (!state.settings.tmdbKey) { toast('Primero cargá la clave de TMDB.'); return; }
  var url = inviteUrl(), out = $('#inviteOut');
  out.value = url; out.hidden = false;
  var fallback = function () { out.focus(); out.select(); toast('Copiá el link del campo de abajo.'); };
  try { navigator.clipboard.writeText(url).then(function () { toast('Link de invitación copiado.'); }, fallback); } catch (e) { fallback(); }
}
function inviteQr() {
  if (!state.settings.tmdbKey) { toast('Primero cargá la clave de TMDB.'); return; }
  try { $('#inviteQrBox').innerHTML = window.CarteleraQR.toSvg(inviteUrl(), { label: 'Código de invitación a WatchListo' }); $('#inviteBox').hidden = false; }
  catch (e) { toast('No pude generar el código.'); }
}
var pairTimer;
function showPair() {
  if (!state.settings.tmdbKey) { toast('Primero cargá la clave de TMDB.'); return; }
  var box = $('#pairBox');
  try { $('#pairQr').innerHTML = window.CarteleraQR.toSvg(pairUrl(), { label: 'Código para vincular otro dispositivo' }); }
  catch (e) { toast('No pude generar el código.'); return; }
  box.hidden = false; $('#pairShow').hidden = true;
  clearTimeout(pairTimer); pairTimer = setTimeout(hidePair, 120000);
}
function hidePair() { clearTimeout(pairTimer); $('#pairQr').innerHTML = ''; $('#pairBox').hidden = true; $('#pairShow').hidden = false; }
function readPairHash() {
  var h = location.hash || '';
  if (h.indexOf('#pair=') !== 0) return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  var parts;
  try { parts = decodeURIComponent(h.slice(6)).split('~'); } catch (e) { parts = []; }
  if (parts[0] !== '1' || parts.length !== 6 || !parts.every(function (p) { return TOKEN_CHARS.test(p) && p.length <= 400; })) { toast('El código de vinculación no es válido.'); return false; }
  var s = state.settings;
  if (parts[1]) s.tmdbKey = parts[1];
  if (parts[2]) s.omdbKey = parts[2];
  if (parts[3]) s.ghToken = parts[3];
  if (parts[4]) s.gistId = parts[4];
  if (['es-MX', 'es-ES', 'en-US'].indexOf(parts[5]) >= 0) s.lang = parts[5];
  saveSettings();
  toast(parts[3] ? 'Dispositivo vinculado. Trayendo tus listas…' : '¡Listo! Ya tenés tu WatchListo. Tus listas se guardan en este dispositivo.');
  return true;
}

/* ---------- settings ---------- */
function applyTheme() {
  var t = state.settings.theme;
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
function fillSettingsForm() {
  var s = state.settings;
  $('#sTmdb').value = s.tmdbKey; $('#sOmdb').value = s.omdbKey; $('#sLang').value = s.lang; $('#sDepth').value = s.depth;
  $('#sMinVotes').value = s.minVotes; $('#sTheme').value = s.theme; $('#sGh').value = s.ghToken;
  $('#syncOff').hidden = !s.ghToken;
  var st = $('#syncState'); st.dataset.s = s.ghToken ? state.sync.s : 'off'; st.textContent = s.ghToken ? state.sync.status : 'Sin sincronizar.';
  var ok = canPair();
  $('#pairShow').disabled = !ok;
  $('#inviteCopy').disabled = !ok; $('#inviteQr').disabled = !ok;
  resetInvite();
  $('#pairHint').textContent = ok ? 'Muestra un código QR con tus claves y la conexión a GitHub. Lo escaneás con la cámara del otro dispositivo y queda listo, sin tipear nada.' : 'Disponible cuando abrís WatchListo desde su dirección web, no como archivo suelto.';
  hidePair();
  $$('[data-reveal]').forEach(function (b) { var inp = document.getElementById(b.dataset.reveal); inp.type = 'password'; b.textContent = 'Ver'; });
  showSetErr('');
}
function showSetErr(m) { var e = $('#setErr'); e.textContent = m; e.hidden = !m; }
async function saveSettingsFromForm() {
  var before = Object.assign({}, state.settings), s = state.settings;
  s.tmdbKey = $('#sTmdb').value.trim(); s.omdbKey = $('#sOmdb').value.trim();
  s.lang = $('#sLang').value; s.depth = $('#sDepth').value;
  s.minVotes = Math.max(0, Math.min(5000, parseInt($('#sMinVotes').value, 10) || 0)); s.theme = $('#sTheme').value;
  var gt = $('#sGh').value.trim();
  if (!s.tmdbKey) { showSetErr('La clave de TMDB es obligatoria.'); state.settings = before; return; }
  if (!TOKEN_CHARS.test(s.tmdbKey) || !TOKEN_CHARS.test(s.omdbKey) || !TOKEN_CHARS.test(gt)) { showSetErr('Alguna clave tiene caracteres raros. Copiala de nuevo, sin espacios.'); state.settings = before; return; }
  var btn = $('#saveSettings');
  if (s.tmdbKey !== before.tmdbKey) {
    btn.disabled = true; btn.textContent = 'Probando clave…';
    try { await tmdb('/configuration'); }
    catch (e) { showSetErr(e.code === 'tmdb-auth' ? 'TMDB rechazó esa clave.' : e.message); btn.disabled = false; btn.textContent = 'Guardar'; state.settings = before; return; }
    btn.disabled = false; btn.textContent = 'Guardar';
  }
  var ghChanged = gt !== before.ghToken;
  if (ghChanged) { s.ghToken = gt; s.gistId = ''; }
  saveSettings(); applyTheme();
  if (before.omdbKey !== s.omdbKey) state.omdbStop = null;
  var catChanged = before.lang !== s.lang || before.depth !== s.depth || before.minVotes !== s.minVotes || before.region !== s.region;
  var keyChanged = before.tmdbKey !== s.tmdbKey;
  closeDialog($('#dlgSettings'));
  if (keyChanged || state.fatal) { state.fatal = null; showBanner(''); }
  if (catChanged) { state.catalogs = { movie: null, tv: null }; if (before.lang !== s.lang) LS.del('genres'); }
  if (catChanged || keyChanged || !state.catalogs[state.ui.type]) start();
  else refresh(true);
  if (ghChanged && s.ghToken) syncNow({});
  if (ghChanged && !s.ghToken) setSync('off', 'Sin sincronizar.');
}
function connectFromForm() {
  var gt = $('#sGh').value.trim();
  if (!gt) { showSetErr('Pegá el token de GitHub primero.'); return; }
  if (!TOKEN_CHARS.test(gt)) { showSetErr('El token tiene caracteres raros. Copialo de nuevo, sin espacios.'); return; }
  showSetErr('');
  if (gt !== state.settings.ghToken) { state.settings.ghToken = gt; state.settings.gistId = ''; saveSettings(); }
  syncNow({}).then(function () { if (state.sync.s === 'ok') toast('Sincronización activada.'); });
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
  state.fatal = null;
  peekCatalog('movie'); peekCatalog('tv');
  refresh();
  if (state.settings.ghToken) syncNow({ silent: true });
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
      if (vis.length) { wantDetails(vis, 'hi'); wantRatings(vis); }
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
    if (e.target.closest('[data-pfilter]')) { var id = sp.id, name = sp.title; state.special = null; state.ui.view = 'catalog'; addPersonFilter(id, name); renderRail(); toast('Mostrando lo que hizo ' + name + '. Lo sacás desde Filtros.'); return; }
    if (e.target.closest('[data-mkradio]')) { createRadio(sp.seeds, sp.festName); }
  });

  /* rail */
  $('#svcToggles').addEventListener('click', function (e) {
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
  $('#noIndia').addEventListener('change', function (e) { state.f.noIndia = e.target.checked; refresh(); });
  $('#clearFilters').addEventListener('click', clearFilters);

  /* delegated clicks */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-settings]')) { fillSettingsForm(); openDialog($('#dlgSettings')); return; }
    if (t.closest('[data-reload]')) { var ty = state.ui.type; state.catalogs[ty] = null; LS.del('catalog.' + ty); refresh(); loadCatalogAndRefresh(ty); return; }
    if (t.closest('[data-fill]')) { wantRatings(state.filtered.slice(0, Math.max(0, 1000 - omdbUsage().n))); toast('Trayendo ratings de OMDb, empezando por las primeras de la lista.'); return; }
    if (t.closest('[data-clear]')) { clearFilters(); return; }
    if (t.closest('[data-global]')) { globalSearch(state.q); return; }
    if (t.closest('[data-go="catalog"]')) { setView('catalog'); return; }
    if (t.closest('[data-retry]')) { showBanner(''); start(); return; }
    if (t.closest('[data-back]')) { backFromSpecial(); return; }
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
  $('#listbar').addEventListener('click', function (e) {
    var p = e.target.closest('[data-list]');
    if (p) { state.ui.list = p.dataset.list; state.listEdit = null; state.confirmDelete = null; refresh(); return; }
    var pk = e.target.closest('[data-pick]');
    if (pk) { state.shareSel = state.shareSel || new Set(); var u = pk.dataset.pick; if (state.shareSel.has(u)) state.shareSel.delete(u); else state.shareSel.add(u); renderListbar(); return; }
    var sm = e.target.closest('.rumbo-more summary');
    if (sm) { state.rumboMoreOpen = !sm.parentNode.open; return; }
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
  });
  $('#listbar').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target, inp = $('input', form), name = inp.value.trim(); if (!name) return;
    if (form.dataset.form === 'new') { var l = createList(name); if (l) state.ui.list = l.id; }
    else { var cur = getList(state.ui.list); if (cur) renameList(cur, name); }
    state.listEdit = null; refresh();
  });

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
    toggleList(l.id, it, true); inp.value = ''; renderMenu(); toast('Lista «' + l.name + '» creada con este título.');
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
      if (act === 'watch') toggleList('watchlist', it); else toggleSeen(it);
      renderDetail(); updateCard(it.k); if (state.ui.view === 'lists') refreshSoon(); return;
    }
    if (e.target.closest('[data-cseen]')) { compToggleSeen(it); renderDetail(); if (state.ui.view === 'lists' || state.special) refreshSoon(); return; }
    var cst = e.target.closest('[data-cstar]');
    if (cst) { compSetStar(it, +cst.dataset.cstar); renderDetail(); return; }
    var st = e.target.closest('[data-star]');
    if (st) { var n = +st.dataset.star; if (setStar(it, starOf(it.k) === n ? 0 : n)) toast('Puntuada y marcada como vista.'); renderDetail(); updateCard(it.k); return; }
    var dl = e.target.closest('[data-dlist]');
    if (dl) { toggleList(dl.dataset.dlist, it); renderDetail(); if (state.ui.view === 'lists') refreshSoon(); }
  });
  dd.addEventListener('close', function () { state.detail = null; });

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
    if (e.target.id === 'invForm') { var em = $('#invEmail').value, nm = $('#invName').value; inviteAdd(em, nm).then(function (ok) { if (ok) toast('Invitado. Ahora mandale el link.'); }, function (err) { toast(isDenied(err) ? 'Solo el administrador puede invitar.' : 'No pude guardar la invitación.'); }); return; }
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
  $('#duoOpenFromSettings').addEventListener('click', function () { closeDialog($('#dlgSettings')); openDuo(); });

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
    if (e.target === ds || e.target.closest('[data-close]')) { hidePair(); closeDialog(ds); return; }
    var r = e.target.closest('[data-reveal]'); if (r) { var inp = document.getElementById(r.dataset.reveal); var show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; r.textContent = show ? 'Ocultar' : 'Ver'; }
  });
  ds.addEventListener('close', hidePair);
  $('#setForm').addEventListener('submit', function (e) { e.preventDefault(); saveSettingsFromForm(); });
  $('#syncNow').addEventListener('click', connectFromForm);
  $('#syncOff').addEventListener('click', disconnectSync);
  $('#pairShow').addEventListener('click', showPair);
  $('#inviteCopy').addEventListener('click', inviteCopy);
  $('#inviteQr').addEventListener('click', inviteQr);
  $('#inviteOmdb').addEventListener('change', resetInvite);
  $('#pairHide').addEventListener('click', hidePair);
  $('#exportBtn').addEventListener('click', exportUser);
  $('#importFile').addEventListener('change', function (e) { var f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; });
  $('#clearCache').addEventListener('click', function () {
    ['catalog.movie', 'catalog.tv', 'providers.movie', 'providers.tv', 'genres', 'details', 'omdb'].forEach(function (k) { LS.del(k); });
    state.catalogs = { movie: null, tv: null }; state.providers = { movie: null, tv: null }; state.details = {}; state.omdb = {};
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
  document.addEventListener('visibilitychange', function () { if (!document.hidden && state.settings.ghToken && Date.now() - state.sync.last > 20000) syncNow({ silent: true }); });
  window.addEventListener('online', function () { if (state.settings.ghToken) syncNow({ silent: true }); });
  setInterval(function () { if (!document.hidden && state.settings.ghToken && Date.now() - state.sync.last > 170000) syncNow({ silent: true }); }, 60000);
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
  applyTheme();
  readPairHash();
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

if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window.__cartelera = { state: state, refresh: refresh, scoreFor: scoreFor, recommend: recommend, curFind: curFind, cur: function () { return CUR; }, openFest: openFest, openGuide: openGuide, rumboOf: rumboOf, rumboOut: rumboOut, itemLabels: itemLabels, openDuo: openDuo, packTaste: packTaste, unpackTaste: unpackTaste, comps: function () { return COMP; }, cloud: function () { return CLOUD; }, cloudSyncModel: cloudSyncModel, allComps: allComps, seenNow: seenNow, guide: function () { return state.guide; }, tasteProfile: tasteProfile, tasteSeeds: tasteSeeds, inviteUrl: inviteUrl, openReco: openReco, openPerson: openPerson, allSig: allSig, mergeUsers: mergeUsers, normUser: normUser, contentKey: contentKey, listKeys: listKeys, pairUrl: pairUrl, syncNow: syncNow };
boot();
})();

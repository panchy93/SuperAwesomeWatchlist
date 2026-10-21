/* Cartelera: app principal. Sin dependencias externas. */
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
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>'
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

var DEFAULT_SETTINGS = { tmdbKey: '', omdbKey: '', lang: 'es-MX', region: 'AR', depth: 'normal', minVotes: 30, theme: 'system', ghToken: '', gistId: '' };
function defaultFilters() { return { services: SERVICES.map(function (s) { return s.key; }), ratingSrc: 'tmdb', ratingMin: 0, includeUnknown: false, genres: {}, genreMode: 'any', yearFrom: '', yearTo: '', maxRuntime: 0, hideSeen: true, people: [], onlyMine: false }; }

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
    t: String(s.t || 'Sin título').slice(0, 300), ot: String(s.ot || '').slice(0, 300),
    y: s.y ? parseInt(s.y, 10) || null : null,
    g: Array.isArray(s.g) ? s.g.filter(function (x) { return typeof x === 'number'; }).slice(0, 12) : [],
    v: num(s.v), vc: num(s.vc), pop: num(s.pop), p: safePath(s.p)
  };
}
function blankList(id, name, at) { return { id: id, name: name, nameAt: at || 0, createdAt: at || 0, deletedAt: 0, adds: {}, rms: {}, seeds: {}, nos: {} }; }
function blankUser() { return { v: 2, lists: [blankList('watchlist', 'Mi lista', 0)], seen: {}, unseen: {}, stars: {}, items: {}, updatedAt: 0 }; }
function upsertList(u, l) {
  var ex = u.lists.filter(function (x) { return x.id === l.id; })[0];
  if (!ex) { ex = blankList(l.id, l.name, 0); ex.createdAt = l.createdAt; ex.nameAt = -1; u.lists.push(ex); }
  if (l.nameAt > ex.nameAt || (l.nameAt === ex.nameAt && l.name > ex.name)) { ex.name = l.name; ex.nameAt = l.nameAt; }
  ex.createdAt = Math.min(ex.createdAt, l.createdAt);
  ex.deletedAt = ex.id === 'watchlist' ? 0 : Math.max(ex.deletedAt, l.deletedAt);
  maxInto(ex.adds, l.adds); maxInto(ex.rms, l.rms);
  maxInto(ex.seeds, l.seeds || {}); maxInto(ex.nos, l.nos || {});
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
      upsertList(out, { id: l.id, name: String(l.name || 'Lista').slice(0, 40), nameAt: +l.nameAt || 0, createdAt: +l.createdAt || 0, deletedAt: +l.deletedAt || 0, adds: tsMap(l.adds), rms: tsMap(l.rms), seeds: tsMap(l.seeds), nos: tsMap(l.nos) });
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
function touchUser() { state.user.updatedAt = now(); LS.set('user', state.user); syncSoon(); }

/* ---------- list accessors ---------- */
function visibleLists() { return state.user.lists.filter(function (l) { return !l.deletedAt; }); }
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
function setStar(it, n) { state.user.stars[it.k] = { n: n, at: now() }; state.user.items[it.k] = snapshot(it); touchUser(); }
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
function catSig() { var s = state.settings; return [s.region, s.lang, s.depth, s.minVotes, 'v1'].join('|'); }
function itemKey(type, id) { return (type === 'movie' ? 'm:' : 't:') + id; }
function typeOfKey(k) { return k.charAt(0) === 'm' ? 'movie' : 'tv'; }
function norm(r, type) {
  var date = r.release_date || r.first_air_date || '';
  return {
    k: itemKey(type, r.id), id: r.id, type: type,
    t: r.title || r.name || 'Sin título', ot: r.original_title || r.original_name || '',
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
  return keys.map(resolveItem).filter(Boolean);
}
function applyFilters(list) {
  var f = state.f, q = fold(state.q), mine = ctxMine(), open = ctxOpen();
  var services = new Set(f.services);
  var inc = [], exc = [];
  Object.keys(f.genres).forEach(function (n) { if (f.genres[n] === 1) inc.push(n); else if (f.genres[n] === -1) exc.push(n); });
  var yFrom = parseInt(f.yearFrom, 10) || 0, yTo = parseInt(f.yearTo, 10) || 0;
  var hideSeen = f.hideSeen && !(state.ui.view === 'lists' && state.ui.list === 'seen' && !state.special);
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
    if (hideSeen && isSeen(it.k)) return false;
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
  renderTop(); renderListbar(); renderSpecialBar(); renderCount(); renderGrid(keepLimit); renderRailStatus(); saveUi();
  if (state.menuItem) renderMenu();
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
    if (!state.catalogs[state.ui.type]) { el.innerHTML = state.fatal ? 'Cartelera' : 'Armando tu cartelera<small>la primera vez tarda un poco</small>'; return; }
    el.innerHTML = nf.format(n) + ' ' + noun(state.ui.type, n) + '<small>en tus servicios</small>';
  }
  if (state.q && state.q.length >= 2) { gb.hidden = false; gb.textContent = 'Buscar «' + state.q + '» en todo TMDB'; gb.dataset.mode = 'search'; }
}
function renderTop() {
  $$('#viewSeg button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === state.ui.view); });
  $$('#typeSeg button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.type === state.ui.type); });
  $('#typeSeg').hidden = state.ui.view === 'lists' || !!state.special;
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
function renderListbar() {
  var bar = $('#listbar');
  bar.hidden = state.ui.view !== 'lists' || !!state.special;
  if (bar.hidden) return;
  var cur = state.ui.list;
  if (cur !== 'seen' && !getList(cur)) cur = state.ui.list = 'watchlist';
  var pills = visibleLists().map(function (l) { return '<button class="lpill" type="button" data-list="' + esc(l.id) + '" aria-pressed="' + (l.id === cur) + '">' + esc(l.name) + ' <span class="n">' + nf.format(listKeys(l).length) + '</span></button>'; });
  pills.push('<button class="lpill" type="button" data-list="seen" aria-pressed="' + (cur === 'seen') + '">Vistas <span class="n">' + nf.format(seenKeys().length) + '</span></button>');
  var tools = '';
  var l = getList(cur);
  var editable = l && l.id !== 'watchlist';
  if (state.listEdit === 'new') tools = '<form class="inline-form" data-form="new"><label class="sr" for="newListInp">Nombre</label><input class="inp" id="newListInp" maxlength="40" placeholder="Nombre de la lista"><button class="btn btn-accent" type="submit">Crear</button><button class="btn btn-ghost" type="button" data-cancel>Cancelar</button></form>';
  else if (state.listEdit === 'rename' && editable) tools = '<form class="inline-form" data-form="rename"><label class="sr" for="renListInp">Nuevo nombre</label><input class="inp" id="renListInp" maxlength="40" value="' + esc(l.name) + '"><button class="btn btn-accent" type="submit">Guardar</button><button class="btn btn-ghost" type="button" data-cancel>Cancelar</button></form>';
  else {
    tools = '<button class="btn" type="button" data-tool="new"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Nueva lista</button>';
    var count = l ? listKeys(l).length : 0;
    if (l && isRadio(l)) tools += '<button class="btn btn-accent" type="button" data-tool="radio-more"' + (state.radioBusy ? ' disabled' : '') + '>' + (state.radioBusy ? 'Buscando…' : 'Sumar 10 más') + '</button>';
    else if (l && count) tools += '<button class="btn" type="button" data-tool="reco">Parecidas a esta lista</button><button class="btn" type="button" data-tool="radio-from">Armar festival</button>';
    if (editable) tools += '<button class="btn btn-ghost" type="button" data-tool="rename">Renombrar</button><button class="btn btn-ghost" type="button" data-tool="delete">' + (state.confirmDelete === l.id ? 'Confirmar borrado' : 'Borrar lista') + '</button>';
  }
  var radioHint = '';
  if (l && isRadio(l) && !state.listEdit) {
    var seeds = Object.keys(l.seeds).map(resolveItem).filter(Boolean).map(function (s) { return s.t; });
    radioHint = '<p class="hint radio-hint"><span class="radio-tag">Festival</span> Programado a partir de: ' + esc(seeds.join(', ')) + '. Abrí cualquier peli para usarla como base o sacarla del festival.</p>';
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
function openDialog(d) { if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else { d.setAttribute('open', ''); d.classList.add('fallback'); } }
function closeDialog(d) { if (typeof d.close === 'function') { if (d.open) d.close(); } else d.removeAttribute('open'); }

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
          '<span class="stars" role="group" aria-label="Tu puntaje">' + starBtns + '</span>' +
        '</div>' +
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
  var src = state.filtered.filter(function (it) { return !isSeen(it.k); });
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
}
function renderMenu() {
  var it = state.menuItem; if (!it) return;
  $('#menuItems').innerHTML = visibleLists().map(function (l) {
    return '<button class="mi" type="button" role="menuitemcheckbox" aria-checked="' + isIn(l, it.k) + '" data-mlist="' + esc(l.id) + '"><span class="box">' + ICON.check + '</span><span class="lname">' + esc(l.name) + '</span><span class="n">' + nf.format(listKeys(l).length) + '</span></button>';
  }).join('');
}
function closeMenu() { var m = $('#listMenu'); if (m && !m.hidden) { m.hidden = true; state.menuItem = null; } }

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
function backFromSpecial() { state.special = null; refresh(); window.scrollTo(0, 0); }

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
    CUR = { labels: j.labels, byKey: byKey, byId: byId, rel: rel, films: Array.from(byId.values()) };
  }).catch(function () {});
}
function curFind(it) {
  if (!CUR || !it) return null;
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
  saveCurMapSoon();
  return it;
}
async function curSectionSeeds(sec, n) {
  var films = CUR.films.filter(function (f) { return f.sec === sec; });
  films.sort(function (a, b) { return (CUR.rel.get(b.id) || new Set()).size - (CUR.rel.get(a.id) || new Set()).size; });
  var seeds = [];
  for (var i = 0; i < films.length && seeds.length < n; i++) {
    var it = await curResolve(films[i]);
    if (it && !isSeen(it.k)) seeds.push(it);
  }
  return seeds;
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
    jobs.push(loadPersonCredits(p.id).then(function (data) { data.items.forEach(function (it) { if ((data.roles[it.k] || {}).dir) add({ id: it.id, title: it.t, original_title: it.ot, release_date: it.y ? it.y + '-01-01' : '', genre_ids: it.g, vote_average: it.v, vote_count: it.vc, popularity: it.pop, poster_path: it.p }, it.type, 'dir:' + p.name); }); }, soft));
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
  agg.forEach(function (a) {
    var parts = [], dirs = Object.keys(a.dirs), kws = Object.keys(a.kws), cur = Object.keys(a.cur);
    if (a.rel) parts.push('Pariente directo');
    if (dirs.length) parts.push('De ' + dirs.slice(0, 2).join(' y '));
    if (cur.length) parts.push('Comparte: ' + cur.slice(0, 3).join(', '));
    else if (kws.length) parts.push('Temas: ' + kws.slice(0, 3).join(', '));
    if (a.rec && !cur.length) parts.push('TMDB la recomienda');
    if (!parts.length && a.genre) parts.push('Mismo género');
    out.push({ it: fromCatalog(a.it), match: a.sum / infos.length + 0.08 * Math.max(0, a.hits - 1), why: parts.join(' · ') });
  });
  out.sort(function (x, y) { return y.match - x.match; });
  return out.slice(0, 120);
}
async function openReco(seeds) {
  seeds = seeds.filter(Boolean).slice(0, 8);
  if (!seeds.length) return;
  closeDialog($('#dlgDetail')); closeMenu(); closeRail();
  var title = seeds.length === 1 ? 'Parecidas a ' + seeds[0].t : 'Parecidas a tu selección';
  clearQuery();
  var sp = state.special = { kind: 'reco', title: title, seeds: seeds, items: [], meta: new Map(), loading: true };
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

/* ---------- radios ---------- */
function isRadio(l) { return !!l && Object.keys(l.seeds || {}).length > 0; }
function radioContext() { if (state.special || state.ui.view !== 'lists') return null; var l = getList(state.ui.list); return isRadio(l) ? l : null; }
async function radioFill(l, n) {
  var seeds = Object.keys(l.seeds).sort(function (a, b) { return l.seeds[a] - l.seeds[b]; }).map(resolveItem).filter(Boolean).slice(-8);
  var recs = await recommend(seeds);
  var t = now(), added = 0;
  for (var i = 0; i < recs.length && added < n; i++) {
    var it = recs[i].it, k = it.k;
    if (isIn(l, k) || l.nos[k] || l.seeds[k] || isSeen(k) || (l.rms[k] || 0) > 0) continue;
    l.adds[k] = t - added; state.user.items[k] = snapshot(it); added++;
  }
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
  if (res.status === 404) throw AppError('gh-404', 'No encontré el Gist de Cartelera con este token.');
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
  var g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Cartelera: mis listas (no borrar)', public: false, files: files }) });
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
  try { $('#inviteQrBox').innerHTML = window.CarteleraQR.toSvg(inviteUrl(), { label: 'Código de invitación a Cartelera' }); $('#inviteBox').hidden = false; }
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
  toast(parts[3] ? 'Dispositivo vinculado. Trayendo tus listas…' : '¡Listo! Ya tenés tu Cartelera. Tus listas se guardan en este dispositivo.');
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
  $('#pairHint').textContent = ok ? 'Muestra un código QR con tus claves y la conexión a GitHub. Lo escaneás con la cámara del otro dispositivo y queda listo, sin tipear nada.' : 'Disponible cuando abrís Cartelera desde su dirección web, no como archivo suelto.';
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
  a.download = 'cartelera-listas-' + today() + '.json';
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
    } catch (e) { toast('Ese archivo no parece una exportación de Cartelera.'); }
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
function openRail() { document.body.classList.add('rail-open'); $('#veil').hidden = false; }
function closeRail() { document.body.classList.remove('rail-open'); $('#veil').hidden = true; }
var refreshSoon = debounce(function () { refresh(); }, 160);
function clearFilters() {
  var keepSeen = state.f.hideSeen;
  state.f = defaultFilters(); state.f.hideSeen = keepSeen;
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
  $('#pick').addEventListener('click', pickOne);
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
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest('.ac')) $('#personAc').hidden = true; });
  $('#specialBar').addEventListener('click', function (e) {
    var sp = state.special; if (!sp) return;
    var tab = e.target.closest('[data-ptab]');
    if (tab && sp.tabs) { sp.tab = tab.dataset.ptab; sp.items = sp.tabs[sp.tab]; refresh(); wantDetails(sp.items.slice(0, 150), 'lo'); return; }
    if (e.target.closest('[data-pfilter]')) { var id = sp.id, name = sp.title; state.special = null; state.ui.view = 'catalog'; addPersonFilter(id, name); renderRail(); toast('Mostrando lo que hizo ' + name + '. Lo sacás desde Filtros.'); return; }
    if (e.target.closest('[data-mkradio]')) { createRadio(sp.seeds); }
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
    var tool = e.target.closest('[data-tool]');
    if (tool) {
      var k = tool.dataset.tool, cur = getList(state.ui.list);
      if (k === 'radio-more' && cur) { radioMore(cur); return; }
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
    if (cs && CUR) {
      var sec = cs.dataset.cursec, label = CUR.labels.sec[sec] || sec;
      cs.disabled = true; cs.textContent = 'Eligiendo las pelis base…';
      curSectionSeeds(sec, 6).then(function (seeds) {
        if (!seeds.length) { toast('No encontré pelis de esa sección en TMDB.'); cs.disabled = false; cs.textContent = 'Armar festival: ' + label; return; }
        createRadio(seeds, 'Festival ' + label);
      }, function (err) { if (err && err.fatal) fatal(err); else toast(err.message); cs.disabled = false; cs.textContent = 'Armar festival: ' + label; });
      return;
    }
    var a = e.target.closest('[data-dact]');
    if (a) {
      var act = a.dataset.dact;
      if (act === 'reco') { openReco([it]); return; }
      if (act === 'radio') { createRadio([it]); return; }
      if (act === 'seed' || act === 'nope') { radioAction(act, it); return; }
      if (act === 'watch') toggleList('watchlist', it); else toggleSeen(it);
      renderDetail(); updateCard(it.k); if (state.ui.view === 'lists') refreshSoon(); return;
    }
    var st = e.target.closest('[data-star]');
    if (st) { var n = +st.dataset.star; setStar(it, starOf(it.k) === n ? 0 : n); renderDetail(); updateCard(it.k); return; }
    var dl = e.target.closest('[data-dlist]');
    if (dl) { toggleList(dl.dataset.dlist, it); renderDetail(); if (state.ui.view === 'lists') refreshSoon(); }
  });
  dd.addEventListener('close', function () { state.detail = null; });

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
  applyTheme();
  readPairHash();
  loadCuraduria();
  bind();
  renderRail();
  registerSW();
  if (!state.settings.tmdbKey) { showOnboarding(); return; }
  start();
}

if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window.__cartelera = { state: state, refresh: refresh, scoreFor: scoreFor, recommend: recommend, curFind: curFind, cur: function () { return CUR; }, inviteUrl: inviteUrl, openReco: openReco, openPerson: openPerson, allSig: allSig, mergeUsers: mergeUsers, normUser: normUser, contentKey: contentKey, listKeys: listKeys, pairUrl: pairUrl, syncNow: syncNow };
boot();
})();

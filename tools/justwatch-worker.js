/*
 * WatchListo · intermediario para JustWatch (Cloudflare Worker)
 *
 * JustWatch no deja que otras páginas lo consulten desde el navegador, así que la app le
 * pregunta a este Worker y el Worker le pregunta a JustWatch. Recibe, por ejemplo:
 *   GET /?tmdb=603&type=movie&ot=The%20Matrix&t=Matrix&y=1999
 * y devuelve, para Argentina, qué servicios de suscripción tienen ese título, en qué calidad
 * (SD, HD, 4K), con qué tecnología de imagen y sonido, y en qué idiomas de audio y subtítulos.
 * También devuelve los puntajes de IMDb y Rotten Tomatoes que tiene JustWatch: la app los usa
 * cuando OMDb se queda sin consultas del día.
 *
 * - No usa claves ni guarda nada tuyo.
 * - Solo responde a la página de WatchListo (ALLOWED_ORIGINS).
 * - Cada título se le pide a JustWatch como mucho una vez por día: después responde la caché
 *   de Cloudflare.
 * - Devuelve solo números, códigos de idioma y nombres de servicio validados.
 *
 * Versión 2 (puntajes). Si la app dice que el Worker está desactualizado, pegá este archivo
 * completo de nuevo en Cloudflare y tocá Deploy.
 */

const ALLOWED_ORIGINS = ['https://panchy93.github.io'];
const COUNTRY = 'AR';
const LANGUAGE = 'es';
const API = 'https://apis.justwatch.com/graphql';
const TTL = 60 * 60 * 24;

const QUERY = `query S($country: Country!, $language: Language!, $f: TitleFilter) {
  popularTitles(country: $country, filter: $f, first: 8, sortBy: POPULAR, sortRandomSeed: 0) {
    edges { node {
      objectType
      content(country: $country, language: $language) {
        originalReleaseYear
        externalIds { tmdbId imdbId }
        scoring { imdbScore imdbVotes tomatoMeter }
      }
      offers(country: $country, platform: WEB, filter: { bestOnly: false }) {
        monetizationType presentationType audioLanguages subtitleLanguages videoTechnology audioTechnology
        package { packageId clearName }
      }
    } }
  }
}`;

const KEEP = new Set(['FLATRATE', 'ADS', 'FREE']);
const QUALITY = { SD: 1, HD: 2, _4K: 3 };
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/;
const TECH = /^[A-Z0-9_]{2,30}$/;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = allowed ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: allowed ? 204 : 403, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    }
    if (!allowed) return json({ error: 'origin' }, 403, {});
    if (request.method !== 'GET') return json({ error: 'method' }, 405, cors);

    const u = new URL(request.url);
    const tmdb = u.searchParams.get('tmdb') || '';
    const type = u.searchParams.get('type') || '';
    const year = parseInt(u.searchParams.get('y') || '', 10);
    const titles = [...new Set([u.searchParams.get('ot'), u.searchParams.get('t')].map(cleanTitle).filter(Boolean))];
    if (!/^\d{1,10}$/.test(tmdb) || (type !== 'movie' && type !== 'tv') || !titles.length) return json({ error: 'params' }, 400, cors);

    const cache = caches.default;
    const key = new Request('https://watchlisto-jw.cache/v2/' + type + '/' + tmdb);
    const hit = await cache.match(key);
    if (hit) return withHeaders(hit, cors);

    let node = null;
    try {
      for (const t of titles) {
        node = await lookup(t, type, tmdb, year);
        if (node) break;
      }
    } catch (e) {
      return json({ error: 'upstream' }, 502, cors);
    }
    const body = { v: 2, found: !!node, offers: node ? summarize(node.offers || []) : [], sc: node ? scores(node.content) : null };
    const res = json(body, 200, { 'Cache-Control': 'public, max-age=' + TTL });
    ctx.waitUntil(cache.put(key, res.clone()));
    return withHeaders(res, cors);
  }
};

async function lookup(title, type, tmdb, year) {
  const f = { searchQuery: title, objectTypes: [type === 'tv' ? 'SHOW' : 'MOVIE'] };
  if (year > 1870 && year < 2100) f.releaseYear = { min: year - 1, max: year + 1 };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let r;
  try {
    r = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operationName: 'S', query: QUERY, variables: { country: COUNTRY, language: LANGUAGE, f } }),
      signal: ctrl.signal
    });
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) throw new Error('justwatch ' + r.status);
  const j = await r.json();
  const edges = (((j || {}).data || {}).popularTitles || {}).edges || [];
  return edges.map((e) => e && e.node).find((n) => n && n.content && n.content.externalIds && String(n.content.externalIds.tmdbId) === tmdb) || null;
}

/* puntajes de IMDb (nota y votos) y Rotten Tomatoes (Tomatometer), solo si son números válidos */
function scores(content) {
  const s = (content && content.scoring) || {}, ids = (content && content.externalIds) || {};
  const out = {};
  const i = Number(s.imdbScore), iv = Number(s.imdbVotes), rt = Number(s.tomatoMeter);
  if (Number.isFinite(i) && i > 0 && i <= 10) out.i = Math.round(i * 10) / 10;
  if (Number.isFinite(iv) && iv > 0 && iv < 1e8) out.iv = Math.round(iv);
  if (typeof s.tomatoMeter === 'number' && Number.isFinite(rt) && rt >= 0 && rt <= 100) out.rt = Math.round(rt);
  if (typeof ids.imdbId === 'string' && /^tt\d{5,10}$/.test(ids.imdbId)) out.m = ids.imdbId;
  return out.i !== undefined || out.rt !== undefined ? out : null;
}

/* agrupa por servicio: la mejor calidad y todos los idiomas y tecnologías que ofrece */
function summarize(offers) {
  const by = new Map();
  for (const o of offers) {
    if (!o || !KEEP.has(o.monetizationType) || !o.package) continue;
    const id = Number(o.package.packageId);
    if (!(id > 0 && id < 1e7)) continue;
    let g = by.get(id);
    if (!g) {
      g = { p: id, n: String(o.package.clearName || '').replace(/[<>&"']/g, '').slice(0, 60), q: 0, a: [], s: [], v: [], au: [] };
      by.set(id, g);
    }
    g.q = Math.max(g.q, QUALITY[o.presentationType] || 0);
    add(g.a, o.audioLanguages, LANG);
    add(g.s, o.subtitleLanguages, LANG);
    add(g.v, o.videoTechnology, TECH);
    add(g.au, o.audioTechnology, TECH);
  }
  return [...by.values()].slice(0, 30);
}
function add(arr, vals, re) {
  for (const v of Array.isArray(vals) ? vals : []) if (typeof v === 'string' && re.test(v) && !arr.includes(v) && arr.length < 40) arr.push(v);
}
function cleanTitle(s) { return typeof s === 'string' ? s.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120) : ''; }
function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
function withHeaders(res, headers) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
  return out;
}

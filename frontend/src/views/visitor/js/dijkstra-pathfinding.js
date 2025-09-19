// Utilities to fetch road plots and build a routed polyline (Dijkstra + OSRM)
// All path math + trimming lives here so the page can stay thin.

const API = import.meta.env.VITE_API_BASE_URL;

// ------------------------------- fetch ---------------------------------
async function tryJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

/** Fetch roads as GeoJSON FeatureCollection; returns features[] */
export async function fetchRoadPlots() {
  try {
    const url = `${API}/plot/road-plots`;
    const data = await tryJson(url);
    const features = Array.isArray(data?.features)
      ? data.features
      : Array.isArray(data) ? data : [];
    return features;
  } catch (err) {
    console.error("[RoadPlots] fetch error:", err);
    return [];
  }
}

// ------------------------------ geometry -------------------------------
export function haversineMetersObj(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  return haversineMetersObj({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
}

export const fmtDistance = (m) =>
  m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

/** project P onto infinite line AB; returns {t in R, point:{lat,lng}} */
function projectPoint(A, B, P) {
  const ax = A.lng, ay = A.lat;
  const bx = B.lng, by = B.lat;
  const px = P.lng, py = P.lat;
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const denom = vx * vx + vy * vy || 1e-12;
  const t = (wx * vx + wy * vy) / denom;
  return { t, point: { lat: ay + t * vy, lng: ax + t * vx } };
}

/** Closest point on a polyline to target */
function closestPointOnRoute(route, target) {
  let best = { dist: Infinity, idx: -1, t: 0, point: null };
  for (let i = 0; i < route.length - 1; i++) {
    const A = { lat: route[i][0], lng: route[i][1] };
    const B = { lat: route[i + 1][0], lng: route[i + 1][1] };
    const { t, point } = projectPoint(A, B, target);
    const clampedT = Math.max(0, Math.min(1, t));
    const onSeg = {
      lat: A.lat + (B.lat - A.lat) * clampedT,
      lng: A.lng + (B.lng - A.lng) * clampedT,
    };
    const d = haversineMetersObj(onSeg, target);
    if (d < best.dist) best = { dist: d, idx: i, t: clampedT, point: onSeg };
  }
  return best;
}

// ------------------------------- graph ---------------------------------
/**
 * Build adjacency list for Dijkstra from road features (GeoJSON)
 * - Connects consecutive vertices
 * - Adds local KNN shortcuts for better connectivity
 * - De-dups nodes with fixed precision
 */
export function buildGraph(features, opts = {}) {
  const K_NEIGHBORS = opts.k ?? 4;        // connect to 4 nearest
  const MAX_EDGE_M  = opts.maxDist ?? 80; // max shortcut length

  const graph = {};
  const ensureNode = (key) => { if (!graph[key]) graph[key] = {}; };
  const makeNodeKey = (lng, lat) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

  const addEdge = (a, b) => {
    const [lng1, lat1] = a;
    const [lng2, lat2] = b;
    const key1 = makeNodeKey(lng1, lat1);
    const key2 = makeNodeKey(lng2, lat2);
    const dist = haversineMeters(lat1, lng1, lat2, lng2);
    if (dist < 0.5 || dist > MAX_EDGE_M) return;
    ensureNode(key1); ensureNode(key2);
    graph[key1][key2] = Math.min(graph[key1][key2] ?? Infinity, dist);
    graph[key2][key1] = Math.min(graph[key2][key1] ?? Infinity, dist);
  };

  const coordSet = new Set();
  const coordArray = [];

  const processCoords = (coords) => {
    for (const c of coords) {
      if (!Array.isArray(c) || c.length < 2) continue;
      const key = makeNodeKey(c[0], c[1]); // lng, lat
      if (!coordSet.has(key)) {
        coordSet.add(key);
        coordArray.push([c[0], c[1]]);
      }
    }
  };

  for (const f of features) {
    const g = f?.geometry;
    if (!g) continue;
    if (g.type === "LineString") {
      const line = g.coordinates || [];
      for (let i = 0; i < line.length - 1; i++) addEdge(line[i], line[i + 1]);
      processCoords(line);
    } else if (g.type === "MultiLineString") {
      for (const line of g.coordinates || []) {
        for (let i = 0; i < line.length - 1; i++) addEdge(line[i], line[i + 1]);
        processCoords(line);
      }
    } else if (g.type === "Point") {
      processCoords([g.coordinates]);
    } else if (g.type === "MultiPoint") {
      processCoords(g.coordinates || []);
    }
  }

  // local KNN shortcuts
  for (let i = 0; i < coordArray.length; i++) {
    const [lng1, lat1] = coordArray[i];
    const candidates = [];
    for (let j = i + 1; j < coordArray.length; j++) {
      const [lng2, lat2] = coordArray[j];
      const d = haversineMeters(lat1, lng1, lat2, lng2);
      if (d <= MAX_EDGE_M) candidates.push({ j, d, coords: [lng2, lat2] });
    }
    candidates.sort((a, b) => a.d - b.d).slice(0, K_NEIGHBORS)
      .forEach((c) => addEdge(coordArray[i], c.coords));
  }

  // remove isolated
  const connected = {};
  for (const [node, nbrs] of Object.entries(graph)) {
    if (Object.keys(nbrs).length) connected[node] = nbrs;
  }
  return connected;
}

// ----------------------------- dijkstra -------------------------------
/** Returns ordered node keys from start->end (empty if none) */
export function dijkstra(graph, start, end) {
  if (!graph[start] || !graph[end]) return [];

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  class PQ {
    constructor(){ this.a=[]; }
    enq(x,p){ this.a.push({x,p}); this.a.sort((m,n)=>m.p-n.p); }
    deq(){ return this.a.shift()?.x; }
    empty(){ return this.a.length===0; }
  }

  const pq = new PQ();
  for (const n of Object.keys(graph)) { dist.set(n, Infinity); prev.set(n, null); }
  dist.set(start, 0); pq.enq(start, 0);

  while (!pq.empty()) {
    const cur = pq.deq();
    if (visited.has(cur)) continue;
    if (cur === end) break;
    visited.add(cur);

    for (const [nbr, w] of Object.entries(graph[cur] || {})) {
      if (visited.has(nbr)) continue;
      const nd = dist.get(cur) + w;
      if (nd < dist.get(nbr)) { dist.set(nbr, nd); prev.set(nbr, cur); pq.enq(nbr, nd); }
    }
  }

  const path = [];
  let cur = end;
  while (cur !== null) { path.unshift(cur); cur = prev.get(cur); }
  if (path[0] !== start) return [];
  return path;
}

// ------------------------------- OSRM ----------------------------------
const CACHE_NS = "osrm_leg_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const memCache = new Map();

function key5([lat, lng]) { return `${lat.toFixed(5)},${lng.toFixed(5)}`; }
function loadLocal(key) {
  try {
    const raw = localStorage.getItem(CACHE_NS);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const rec = store[key];
    if (!rec || Date.now() > rec.exp) return null;
    return rec.data;
  } catch { return null; }
}
function saveLocal(key, data) {
  try {
    const raw = localStorage.getItem(CACHE_NS);
    const store = raw ? JSON.parse(raw) : {};
    store[key] = { data, exp: Date.now() + CACHE_TTL_MS };
    const keys = Object.keys(store);
    if (keys.length > 300) keys.slice(0, keys.length - 300).forEach((k) => delete store[k]);
    localStorage.setItem(CACHE_NS, JSON.stringify(store));
  } catch (e) { console.error("localStorage write failed", e); }
}

async function getLegCached(a, b) {
  const k = `${key5(a)}|${key5(b)}`;
  if (memCache.has(k)) return memCache.get(k);
  const local = loadLocal(k);
  if (local) { memCache.set(k, local); return local; }
  const url =
    `https://router.project-osrm.org/route/v1/foot/${a[1]},${a[0]};${b[1]},${b[0]}` +
    `?overview=full&geometries=geojson&steps=false&continue_straight=true`;
  let result = null;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const coords = json?.routes?.[0]?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length) {
        result = coords.map(([lng, lat]) => [lat, lng]);
      }
    }
  } catch {}
  if (!result) result = [a, b];
  memCache.set(k, result);
  saveLocal(k, result);
  return result;
}

// -------------------------- Enhanced Trimming ---------------------------

function trimBehindAtUser(route, user, threshold = 20) {
  if (!route || route.length < 2) return route;
  
  const u = { lat: user.lat, lng: user.lng };
  let bestIdx = -1;
  let bestDist = Infinity;
  let bestPoint = null;
  
  // Find the closest point on the entire route
  for (let i = 0; i < route.length - 1; i++) {
    const A = { lat: route[i][0], lng: route[i][1] };
    const B = { lat: route[i + 1][0], lng: route[i + 1][1] };
    const { t, point } = projectPoint(A, B, u);
    const clampedT = Math.max(0, Math.min(1, t));
    const onSeg = {
      lat: A.lat + (B.lat - A.lat) * clampedT,
      lng: A.lng + (B.lng - A.lng) * clampedT,
    };
    const d = haversineMetersObj(onSeg, u);
    
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
      bestPoint = { ...onSeg, t: clampedT };
    }
  }
  
  if (bestIdx >= 0 && bestDist <= threshold) {
    // If we're very close to a segment, cut the route from that point
    const remaining = route.slice(bestIdx + 1);
    const result = [[u.lat, u.lng]];
    
    // If the projection isn't at the end of the segment, add the projected point
    if (bestPoint.t < 1.0) {
      result.push([bestPoint.lat, bestPoint.lng]);
    }
    
    return result.concat(remaining);
  }
  
  // If not close enough to any segment, just prepend user location
  return [[u.lat, u.lng], ...route];
}

// Replace the whole function with this version
function trimAheadAtDestination(route, destination, threshold = 25) {
  if (!route || route.length < 2) return route;

  const dest = { lat: destination.lat, lng: destination.lng };

  // 1) CUT AT THE FIRST SEGMENT THAT PASSES BY DEST
  // Walk forward along the polyline. As soon as DEST projects inside a segment
  // and within `threshold`, trim everything after that spot and end at DEST.
  for (let i = 0; i < route.length - 1; i++) {
    const A = { lat: route[i][0], lng: route[i][1] };
    const B = { lat: route[i + 1][0], lng: route[i + 1][1] };

    const { t, point } = projectPoint(A, B, dest);
    if (t >= 0 && t <= 1) {
      const d = haversineMetersObj(point, dest);
      if (d <= threshold) {
        const out = route.slice(0, i + 1);        // keep everything up to A
        if (t > 0) out.push([point.lat, point.lng]); // add projected point if not exactly A
        out.push([dest.lat, dest.lng]);            // end exactly at DEST
        return out;
      }
    }
  }

  // 2) Fallbacks (kept for robustness)
  const last = { lat: route.at(-1)[0], lng: route.at(-1)[1] };
  if (haversineMetersObj(last, dest) <= threshold) {
    const out = route.slice(0, -1);
    out.push([dest.lat, dest.lng]);
    return out;
  }

  // If we never passed near the destination along the path, leave route as is
  // (or append DEST if you prefer visual closure).
  return route;
}
function sumDistance(route) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += haversineMeters(
      route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]
    );
  }
  return total;
}

/**
 * Build the routed polyline from user -> dest using:
 * - nearest graph nodes + Dijkstra for topology
 * - OSRM for leg geometry
 * - Enhanced trimBehindAtUser + trimAheadAtDestination for clean path
 */
export async function buildRoutedPolyline(user, destination, graph, trim = { userM: 25, destM: 25 }) {
  const nodeKeys = Object.keys(graph || {});
  if (!nodeKeys.length) return { polyline: [], graphPath: [], distance: 0 };

  // nearest node (by Haversine)
  const nearestNode = (pt) => {
    let best = null, bestD = Infinity;
    for (const k of nodeKeys) {
      const [lat, lng] = k.split(",").map(Number);
      const d = haversineMetersObj(pt, { lat, lng });
      if (d < bestD) { bestD = d; best = k; }
    }
    return { key: best, distance: bestD };
  };

  const start = nearestNode(user);
  const end   = nearestNode(destination);

  const keys = dijkstra(graph, start.key, end.key);
  if (!keys.length) {
    // fall back to direct OSRM
    const route = await getLegCached([user.lat, user.lng], [destination.lat, destination.lng]);
    const r1 = trimBehindAtUser(route, user, trim.userM);
    const r2 = trimAheadAtDestination(r1, destination, trim.destM);
    return { polyline: r2, graphPath: [], distance: sumDistance(r2),
             debug: { startNodeDistance: start.distance, endNodeDistance: end.distance } };
  }

  const nodes = keys.map((k) => k.split(",").map(Number)).map(([lat, lng]) => [lat, lng]);

  // Build the complete route first
  const segments = [];
  if (start.distance > 2) segments.push(await getLegCached([user.lat, user.lng], nodes[0]));
  else segments.push([[user.lat, user.lng]]);
  
  for (let i = 0; i < nodes.length - 1; i++) {
    const seg = await getLegCached(nodes[i], nodes[i + 1]);
    segments.push(seg.slice(1)); // Skip first point to avoid duplication
  }
  
  if (nodes.length && end.distance > 2) {
    const last = await getLegCached(nodes.at(-1), [destination.lat, destination.lng]);
    segments.push(last.slice(1));
  }
  
  let route = segments.flat();

  // Apply enhanced trimming - order matters!
  // First trim behind user (removes passed sections)
  route = trimBehindAtUser(route, user, trim.userM);
  
  // Then trim ahead at destination (cuts off unnecessary future path)
  route = trimAheadAtDestination(route, destination, trim.destM);

  return {
    polyline: route,
    graphPath: nodes,
    distance: sumDistance(route),
    debug: { 
      startNodeDistance: start.distance, 
      endNodeDistance: end.distance,
      originalRouteLength: segments.flat().length,
      finalRouteLength: route.length
    },
  };
}
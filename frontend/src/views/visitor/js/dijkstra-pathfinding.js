// frontend/src/views/visitor/js/dijkstra-pathfinding.js
// Utilities to fetch road plots and prepare them for pathfinding

const API = import.meta.env.VITE_API_BASE_URL;

/** try a URL, return parsed JSON or null */
async function tryJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

/** Fetch roads as GeoJSON FeatureCollection; return features[] */
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

/** haversine distance in meters */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Build adjacency list for Dijkstra from road features (GeoJSON)
 * Supports:
 *  - LineString / MultiLineString (connect consecutive vertices)
 *  - Point collections (connect k nearest within max distance)
 *
 * Tunables for Points:
 *   K_NEIGHBORS: how many nearest neighbors to connect per point
 *   MAX_EDGE_M:  maximum allowed edge length (meters)
 */
export function buildGraph(features, opts = {}) {
  const K_NEIGHBORS = opts.k ?? 3;          // connect to 3 nearest by default
  const MAX_EDGE_M  = opts.maxDist ?? 35;   // ~ path segment length cap

  const graph = {};
  const ensureNode = (key) => { if (!graph[key]) graph[key] = {}; };

  const addEdge = (a, b) => {
    const [lng1, lat1] = a;
    const [lng2, lat2] = b;
    const key1 = `${lat1},${lng1}`;
    const key2 = `${lat2},${lng2}`;
    const dist = haversineMeters(lat1, lng1, lat2, lng2);
    ensureNode(key1); ensureNode(key2);
    // bidirectional, keep the shortest if duplicate
    graph[key1][key2] = Math.min(graph[key1][key2] ?? Infinity, dist);
    graph[key2][key1] = Math.min(graph[key2][key1] ?? Infinity, dist);
  };

  // Collect all point coords we see (for kNN later)
  const pointCoords = [];

  for (const f of features) {
    const geom = f?.geometry;
    if (!geom) continue;

    if (geom.type === "LineString" && Array.isArray(geom.coordinates)) {
      const coords = geom.coordinates;
      for (let i = 0; i < coords.length - 1; i++) addEdge(coords[i], coords[i + 1]);
      // Also collect as points for completeness
      for (const c of coords) pointCoords.push(c);
      continue;
    }

    if (geom.type === "MultiLineString" && Array.isArray(geom.coordinates)) {
      for (const line of geom.coordinates) {
        if (!Array.isArray(line)) continue;
        for (let i = 0; i < line.length - 1; i++) addEdge(line[i], line[i + 1]);
        for (const c of line) pointCoords.push(c);
      }
      continue;
    }

    if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
      pointCoords.push(geom.coordinates);
    }
  }

  // If we only have Points (or we want extra connectivity), connect k nearest within MAX_EDGE_M
  if (pointCoords.length) {
    // make unique by string key to avoid duplicates
    const uniq = new Map();
    for (const [lng, lat] of pointCoords) {
      uniq.set(`${lat},${lng}`, [lng, lat]);
    }
    const nodes = Array.from(uniq.values());

    for (let i = 0; i < nodes.length; i++) {
      const [lng1, lat1] = nodes[i];
      // compute distances to others
      const dists = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const [lng2, lat2] = nodes[j];
        const d = haversineMeters(lat1, lng1, lat2, lng2);
        if (d <= MAX_EDGE_M) dists.push({ j, d });
      }
      // take k nearest within cap
      dists.sort((a, b) => a.d - b.d);
      for (let m = 0; m < Math.min(K_NEIGHBORS, dists.length); m++) {
        const { j } = dists[m];
        addEdge(nodes[i], nodes[j]);
      }
    }
  }

  return graph;
}

/**
 * Run Dijkstra’s algorithm on an adjacency-list graph
 * @param {Object} graph - { nodeKey: { neighborKey: weight, ... }, ... }
 * @param {string} start - "lat,lng"
 * @param {string} end   - "lat,lng"
 * @returns {string[]} ordered node keys from start to end (empty if none)
 */
export function dijkstra(graph, start, end) {
  if (!graph[start] || !graph[end]) return [];

  const dist = {};
  const prev = {};
  const visited = new Set();

  for (const node of Object.keys(graph)) {
    dist[node] = Infinity;
    prev[node] = null;
  }
  dist[start] = 0;

  const pickMin = () => {
    let best = null, bestVal = Infinity;
    for (const n in dist) {
      if (visited.has(n)) continue;
      if (dist[n] < bestVal) { best = n; bestVal = dist[n]; }
    }
    return best;
  };

  while (true) {
    const u = pickMin();
    if (!u) break;
    if (u === end) break;
    visited.add(u);

    for (const [v, w] of Object.entries(graph[u])) {
      if (visited.has(v)) continue;
      const alt = dist[u] + w;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  const path = [];
  for (let cur = end; cur; cur = prev[cur]) path.unshift(cur);
  if (path[0] !== start) return [];
  return path;
}

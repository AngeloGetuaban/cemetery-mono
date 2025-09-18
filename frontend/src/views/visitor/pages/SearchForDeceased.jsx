// frontend/src/views/visitor/pages/SearchForDeceased.jsx
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { fetchRoadPlots, buildGraph, dijkstra } from "../js/dijkstra-pathfinding";

// --- Destination (grave location) ---
const DEST = { lat: 15.4950946637584, lng: 120.5548330086766 };

// --- 3-point mock "live" location series (cycles every 3s) ---
const MOCK_POINTS = [
  { lat: 15.4943159, lng: 120.5548342 },
  { lat: 15.4944027, lng: 120.5549954 },
  { lat: 15.4945023, lng: 120.5549123 },
];
const MOCK_INTERVAL_MS = 3000;

// ---------- helpers ----------
function haversineMeters(a, b) {
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
const fmt = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);

// project P onto infinite line AB; returns {t in R, point:{lat,lng}}
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

// ---------- tail cut ----------
function cutPolylineAtProjection(poly, dest, lookbackSegments = 8, maxPerpMeters = 12) {
  if (!poly || poly.length < 2) return poly;

  const startIdx = Math.max(0, poly.length - 1 - lookbackSegments);
  let best = null;
  for (let i = poly.length - 2; i >= startIdx; i--) {
    const A = { lat: poly[i][0], lng: poly[i][1] };
    const B = { lat: poly[i + 1][0], lng: poly[i + 1][1] };
    const { t, point } = projectPoint(A, B, dest);
    if (t >= 0 && t <= 1) {
      const perp = haversineMeters(point, dest);
      if (perp <= maxPerpMeters && (!best || perp < best.perp)) {
        best = { idx: i, point, perp };
      }
    }
  }

  if (!best) {
    const i = poly.length - 2;
    const A = { lat: poly[i][0], lng: poly[i][1] };
    const B = { lat: poly[i + 1][0], lng: poly[i + 1][1] };
    const dA = haversineMeters(A, dest);
    const dB = haversineMeters(B, dest);
    if (dB > dA) {
      const { t, point } = projectPoint(A, B, dest);
      const tc = Math.min(1, Math.max(0, t));
      const P = { lat: A.lat + (B.lat - A.lat) * tc, lng: A.lng + (B.lng - A.lng) * tc };
      const next = poly.slice(0, poly.length - 1);
      next[next.length - 1] = [P.lat, P.lng];
      return next;
    }
    return poly;
  }

  const trimmed = poly.slice(0, best.idx + 1);
  trimmed.push([best.point.lat, best.point.lng]);
  return trimmed;
}

// ---------- OSRM per-leg with cache ----------
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
    if (!rec) return null;
    if (Date.now() > rec.exp) return null;
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
  } catch (err) { console.error("localStorage write failed", err); }
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
      if (Array.isArray(coords) && coords.length) result = coords.map(([lng, lat]) => [lat, lng]);
    }
  } catch {}
  if (!result) result = [a, b];
  memCache.set(k, result);
  saveLocal(k, result);
  return result;
}

// ---------- NEW robust head builder ----------
/**
 * Build route from user to nodes:
 * 1) Build node→node OSRM polyline (legsNodes).
 * 2) Compute cumulative distance along legsNodes; use this to restrict to the
 *    first `lookaheadMeters` as the “early window”.
 * 3) Try to project USER onto any segment inside that early window (≤ projTolM).
 *    If found, splice USER→projection→(rest).
 * 4) Otherwise, OSRM USER→each node whose mapped along-route distance ≤ lookaheadMeters,
 *    pick the shortest leg, then join at the nearest vertex index on legsNodes.
 */
async function buildRouteFromUser(user, nodes, { lookaheadMeters = 140, projTolM = 22 } = {}) {
  // 1) node→node OSRM expanded polyline
  const legsNodes = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    // eslint-disable-next-line no-await-in-loop
    const seg = await getLegCached(nodes[i], nodes[i + 1]);
    if (i === 0) legsNodes.push(...seg);
    else legsNodes.push(...seg.slice(1));
  }

  // 2) cumulative along-route distance over legsNodes
  const cum = [0];
  for (let i = 1; i < legsNodes.length; i++) {
    cum[i] = cum[i - 1] + haversineMeters(
      { lat: legsNodes[i - 1][0], lng: legsNodes[i - 1][1] },
      { lat: legsNodes[i][0], lng: legsNodes[i][1] }
    );
  }

  // helper: find nearest vertex index on legsNodes to a point
  const nearestVertexIdx = (pt) => {
    let bestI = 0, bestD = Infinity;
    for (let i = 0; i < legsNodes.length; i++) {
      const d = haversineMeters({ lat: legsNodes[i][0], lng: legsNodes[i][1] }, pt);
      if (d < bestD) { bestD = d; bestI = i; }
      if (cum[i] > lookaheadMeters) break; // only need early window for attach
    }
    return bestI;
  };

  // 3) try projection onto early window of legsNodes
  for (let i = 0; i < legsNodes.length - 1; i++) {
    if (cum[i] > lookaheadMeters) break;
    const A = { lat: legsNodes[i][0], lng: legsNodes[i][1] };
    const B = { lat: legsNodes[i + 1][0], lng: legsNodes[i + 1][1] };
    const { t, point } = projectPoint(A, B, user);
    if (t >= 0 && t <= 1) {
      const perp = haversineMeters(point, user);
      if (perp <= projTolM) {
        const head = [[user.lat, user.lng], [point.lat, point.lng]];
        const tail = legsNodes.slice(i + 1);
        if (tail.length) tail[0] = [point.lat, point.lng];
        return [...head, ...tail];
      }
    }
  }

  // 4) fallback: OSRM to candidate nodes whose along-route position is early
  // map each node to its nearest vertex index to know its along-route distance
  const nodeToAlongDist = (node) => {
    const j = nearestVertexIdx({ lat: node[0], lng: node[1] });
    return { j, dist: cum[j] };
  };
  const candidates = [];
  for (let i = 0; i < nodes.length; i++) {
    const { j, dist } = nodeToAlongDist(nodes[i]);
    if (dist <= lookaheadMeters) candidates.push({ nodeIdx: i, vertexIdx: j });
    else break;
    if (candidates.length >= 6) break; // cap attempts
  }
  if (candidates.length === 0) candidates.push({ nodeIdx: 0, vertexIdx: 0 });

  let best = null; // {nodeIdx, vertexIdx, leg, length}
  for (const c of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const leg = await getLegCached([user.lat, user.lng], nodes[c.nodeIdx]);
    let len = 0;
    for (let k = 0; k < leg.length - 1; k++) {
      len += haversineMeters(
        { lat: leg[k][0], lng: leg[k][1] },
        { lat: leg[k + 1][0], lng: leg[k + 1][1] }
      );
    }
    if (!best || len < best.length) best = { ...c, leg, length: len };
  }

  // join at the *vertexIdx* (nearest vertex inside early window), not by exact coord
  const stitched = [...best.leg, ...legsNodes.slice(best.vertexIdx + 1)];
  return stitched;
}

export default function SearchForDeceased() {
  const mapRef = useRef(null);
  const refs = useRef({ L: null, map: null, startM: null, destM: null, line: null });
  const [status, setStatus] = useState("Loading…");
  const [distance, setDistance] = useState(0);
  const [location, setLocation] = useState(MOCK_POINTS[0]);
  const [idx, setIdx] = useState(0);

  // cycle through the 3 mock points every 3s
  useEffect(() => {
    setLocation(MOCK_POINTS[0]);
    setIdx(0);
    const t = setInterval(() => {
      setIdx((p) => {
        const next = (p + 1) % MOCK_POINTS.length;
        setLocation(MOCK_POINTS[next]);
        return next;
      });
    }, MOCK_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  async function ensureLeaflet() {
    if (!refs.current.L) {
      const mod = await import("leaflet");
      refs.current.L = mod.default || mod;
    }
    return refs.current.L;
  }

  // recompute route on every location update
  useEffect(() => {
    if (!location) return;
    let alive = true;

    (async () => {
      const L = await ensureLeaflet();
      if (!alive) return;

      // init map once
      if (!refs.current.map) {
        const map = L.map(mapRef.current).setView([location.lat, location.lng], 17);
        refs.current.map = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 20,
          attribution: "&copy; OpenStreetMap",
        }).addTo(map);
        refs.current.destM = L.marker([DEST.lat, DEST.lng]).addTo(map);
      }

      // move/update start marker
      if (refs.current.startM) refs.current.startM.setLatLng([location.lat, location.lng]);
      else {
        refs.current.startM = refs.current.L
          .circleMarker([location.lat, location.lng], {
            radius: 6,
            color: "#0ea5e9",
            weight: 2,
            fillOpacity: 0.6,
          })
          .addTo(refs.current.map);
      }

      // 1) build graph
      setStatus("Building cemetery graph…");
      const features = await fetchRoadPlots();
      const graph = buildGraph(features, { k: 7, maxDist: 110 });
      const nodeKeys = Object.keys(graph);
      if (!nodeKeys.length) return setStatus("No internal graph nodes.");

      const nearestKey = (pt) => {
        let best = null, bestD = Infinity;
        for (const k of nodeKeys) {
          const [lat, lng] = k.split(",").map(Number);
          const d = haversineMeters(pt, { lat, lng });
          if (d < bestD) { bestD = d; best = k; }
        }
        return best;
      };

      // 2) snap + dijkstra
      const startKey = nearestKey(location);
      const endKey = nearestKey(DEST);
      setStatus("Running Dijkstra…");
      const keys = dijkstra(graph, startKey, endKey);
      if (!keys.length) return setStatus("No internal path found.");

      const nodes = keys.map((k) => k.split(",").map(Number)).map(([lat, lng]) => [lat, lng]);

      // 3) Build head robustly (early-window projection; else best early node)
      setStatus("Stitching legs…");
      let legs = await buildRouteFromUser({ lat: location.lat, lng: location.lng }, nodes, {
        lookaheadMeters: 140,
        projTolM: 22,
      });

      // 4) Trim tail inline with destination
      legs = cutPolylineAtProjection(legs, DEST, 8, 12);

      // 5) distance + draw
      let meters = 0;
      for (let i = 0; i < legs.length - 1; i++) {
        meters += haversineMeters(
          { lat: legs[i][0], lng: legs[i][1] },
          { lat: legs[i + 1][0], lng: legs[i + 1][1] }
        );
      }
      setDistance(meters);

      if (refs.current.line) refs.current.map.removeLayer(refs.current.line);
      refs.current.line = refs.current.L
        .polyline(legs, { weight: 6, opacity: 0.95, color: "#059669" })
        .addTo(refs.current.map);

      refs.current.map.fitBounds(L.latLngBounds(legs), { padding: [24, 24] });
      setStatus("Route ready (stable head & trimmed tail)");
    })();

    return () => { alive = false; };
  }, [location]);

  // cleanup when unmount
  useEffect(() => {
    return () => {
      try { refs.current.map?.remove(); } catch {}
      refs.current.map = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="mb-2 text-sm text-slate-700">
          <b>User:</b>{" "}
          {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "—"}{" "}
          · <b>Dest:</b> {DEST.lat.toFixed(6)}, {DEST.lng.toFixed(6)} · {status}{" "}
          {distance > 0 && <> · <b>{fmt(distance)}</b></>}
          <div className="text-xs text-slate-500">
            Legs cached under <code>{CACHE_NS}</code>. Mock point {idx + 1}/{MOCK_POINTS.length}, changes every {Math.round(MOCK_INTERVAL_MS / 1000)}s.
          </div>
        </div>
        <div ref={mapRef} className="h-[520px] w-full rounded-md border bg-white" />
      </div>
    </div>
  );
}

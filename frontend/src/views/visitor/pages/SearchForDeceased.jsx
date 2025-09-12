// frontend/src/views/visitor/pages/SearchForDeceased.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import fetchBurialRecords from "../js/get-burial-records";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css"; // <-- add this

function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function parseLatLngFromToken(token) {
  if (!token) return null;
  const t = String(token);
  const mKVLat = t.match(/(?:^|\|)lat:([+-]?\d+(?:\.\d+)?)(?:\||$)/i);
  const mKVLng = t.match(/(?:^|\|)lng:([+-]?\d+(?:\.\d+)?)(?:\||$)/i);
  if (mKVLat && mKVLng) {
    const lat = Number(mKVLat[1]); const lng = Number(mKVLng[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const mUrlLat = t.match(/[?&]lat=([+-]?\d+(?:\.\d+)?)/i);
  const mUrlLng = t.match(/[?&]lng=([+-]?\d+(?:\.\d+)?)/i);
  if (mUrlLat && mUrlLng) {
    const lat = Number(mUrlLat[1]); const lng = Number(mUrlLng[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const mPoint = t.match(/POINT\s*\(\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\)/i);
  if (mPoint) {
    const lng = Number(mPoint[1]); const lat = Number(mPoint[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

export default function SearchForDeceased() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // scanning/result
  const [scanResult, setScanResult] = useState(null); // { token, coords? }

  const mapRef = useRef(null);
  const leafletRef = useRef({
    L: null,
    map: null,
    marker: null,
    routing: null,          // <-- keep routing control
    routingLoaded: false,   // <-- flag for dynamic import
  });

  // fixed starting point for route
  const START = { lat: 15.4953425, lng: 120.5560590 }; 

  // modal state
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanMode, setScanMode] = useState("choose"); // "choose" | "camera" | "upload"
  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState("");
  const videoRef = useRef(null);
  const rafRef = useRef(0);
  const fileRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    fetchBurialRecords()
      .then((data) => !ignore && setRows(Array.isArray(data) ? data : []))
      .catch((e) => !ignore && setError(e.message || "Failed to load"))
      .finally(() => !ignore && setLoading(false));
    return () => { ignore = true; };
  }, []);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter((r) => {
      const plot = String(r.plot_id ?? "").toLowerCase();
      const name = String(r.deceased_name ?? "").toLowerCase();
      const bd = String(formatDate(r.birth_date)).toLowerCase();
      const dd = String(formatDate(r.death_date)).toLowerCase();
      return plot.includes(text) || name.includes(text) || bd.includes(text) || dd.includes(text);
    });
  }, [rows, q]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  // cleanup (camera)
  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  function closeScanModal() {
    stopCamera();
    setScanErr("");
    setScanMode("choose");
    setScanModalOpen(false);
  }

  async function startCamera() {
    setScanErr("");
    setScanMode("camera");
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const v = videoRef.current; if (!v) return;
      v.srcObject = stream; await v.play();

      if ("BarcodeDetector" in window) {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          try {
            const codes = await detector.detect(v);
            if (codes && codes.length) {
              handleQrFound(codes[0].rawValue || "");
              return;
            }
          } catch {}
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        reader.decodeFromVideoDevice(null, v, (result) => {
          if (result) {
            reader.reset();
            handleQrFound(result.getText());
          }
        }).catch(() => {});
      }
    } catch (e) {
      setScanErr("Unable to access camera.");
      setScanning(false);
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) {
      v.srcObject.getTracks?.().forEach((t) => t.stop?.());
      v.srcObject = null;
    }
    setScanning(false);
  }

  async function handleUploadFile(file) {
    if (!file) return;
    setScanErr("");
    setScanMode("upload");
  
    // Create an HTMLImageElement and an ImageBitmap (crisper for detectors)
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
  
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not load image."));
        el.src = url; // blob is same-origin, safe for canvas
      });
  
      // Small helper to try BarcodeDetector across rotations & (optionally) scale
      const tryBarcodeDetector = async (source) => {
        if (!("BarcodeDetector" in window)) return null;
  
        // Some browsers expose the API but not the format; check it
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats?.();
          if (Array.isArray(supported) && !supported.includes("qr_code")) return null;
        } catch {
          // ignore and try anyway
        }
  
        const det = new window.BarcodeDetector({ formats: ["qr_code"] });
  
        // Build a function that returns an ImageBitmap or Canvas for a given rotation & scale
        const buildCanvas = (el, rotationDeg = 0, scale = 1) => {
          const w = (el.naturalWidth || el.width) * scale;
          const h = (el.naturalHeight || el.height) * scale;
          const canvas = document.createElement("canvas");
  
          // Swap w/h for 90/270 rotations
          const rot = ((rotationDeg % 360) + 360) % 360;
          const cw = rot === 90 || rot === 270 ? h : w;
          const ch = rot === 90 || rot === 270 ? w : h;
  
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = false;
  
          ctx.translate(cw / 2, ch / 2);
          ctx.rotate((rot * Math.PI) / 180);
          ctx.drawImage(el, -w / 2, -h / 2, w, h);
          return canvas;
        };
  
        // Try original image element first
        try {
          const codes = await det.detect(source);
          if (codes && codes.length) return codes[0].rawValue || null;
        } catch {}
  
        // Try a couple of scales & rotations on a canvas
        const scales = [1.5, 2];            // upscales help low-res screenshots
        const rotations = [0, 90, 180, 270];
        for (const s of scales) {
          for (const r of rotations) {
            try {
              const canvas = buildCanvas(source, r, s);
              const codes = await det.detect(canvas);
              if (codes && codes.length) return codes[0].rawValue || null;
            } catch {}
          }
        }
        return null;
      };
  
      // 1) BarcodeDetector on <img> / canvases / rotations
      const bdValue = await tryBarcodeDetector(img);
      if (bdValue) {
        handleQrFound(bdValue);
        cleanup();
        return;
      }
  
      // 2) ZXing on the actual <img> element (more reliable than decodeFromImageUrl for blobs)
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const zxing = new BrowserQRCodeReader();
        const result = await zxing.decodeFromImageElement(img);
        if (result?.getText) {
          handleQrFound(result.getText());
          cleanup();
          return;
        }
      } catch {
        // keep falling through
      }
  
      // 3) jsQR on raw pixels with simple pre-processing + rotations
      try {
        const jsqr = (await import("jsqr")).default;
  
        const scanWithJsQR = (canvas, invert = false, threshold = false) => {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
          // Optional: invert colors
          if (invert) {
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              d[i] = 255 - d[i];
              d[i + 1] = 255 - d[i + 1];
              d[i + 2] = 255 - d[i + 2];
            }
          }
  
          // Optional: quick threshold to boost contrast
          if (threshold) {
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
              const t = v > 160 ? 255 : 0;
              d[i] = d[i + 1] = d[i + 2] = t;
            }
          }
  
          // Put back (only needed after changes)
          if (invert || threshold) ctx.putImageData(imgData, 0, 0);
  
          const code = jsqr(imgData.data, canvas.width, canvas.height, {
            inversionAttempts: "attemptBoth",
          });
          return code?.data || null;
        };
  
        const makeCanvas = (el, rot = 0, scale = 1.5) => {
          const w = (el.naturalWidth || el.width) * scale;
          const h = (el.naturalHeight || el.height) * scale;
          const rotNorm = ((rot % 360) + 360) % 360;
  
          const cw = rotNorm === 90 || rotNorm === 270 ? h : w;
          const ch = rotNorm === 90 || rotNorm === 270 ? w : h;
  
          const c = document.createElement("canvas");
          c.width = cw;
          c.height = ch;
          const ctx = c.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.translate(cw / 2, ch / 2);
          ctx.rotate((rotNorm * Math.PI) / 180);
          ctx.drawImage(el, -w / 2, -h / 2, w, h);
          return c;
        };
  
        const rotations = [0, 90, 180, 270];
        const toggles = [
          { invert: false, threshold: false },
          { invert: false, threshold: true },
          { invert: true, threshold: false },
          { invert: true, threshold: true },
        ];
        for (const r of rotations) {
          const canvas = makeCanvas(img, r, 2);
          for (const t of toggles) {
            const val = scanWithJsQR(canvas, t.invert, t.threshold);
            if (val) {
              handleQrFound(val);
              cleanup();
              return;
            }
          }
        }
      } catch {
        // ignore and fall through
      }
  
      setScanErr("No QR code detected in the image.");
    } catch (e) {
      setScanErr(e?.message || "Failed to decode QR image.");
    } finally {
      cleanup();
    }
  }
  

  function handleQrFound(text) {
    stopCamera();
    setScanModalOpen(false);
    const coords = parseLatLngFromToken(text);
    setScanResult({ token: text, coords });
    setTimeout(() => initMap(coords), 0);
  }

  // Initialize map and draw/update route
  async function initMap(coords) {
    if (!coords) return;

    if (!leafletRef.current.L) {
      const L = (await import("leaflet")).default;
      leafletRef.current.L = L;
    }
    const L = leafletRef.current.L;
    if (!mapRef.current) return;

    // Create map if needed
    if (!leafletRef.current.map) {
      leafletRef.current.map = L.map(mapRef.current).setView([coords.lat, coords.lng], 18);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
        attribution: "&copy; OpenStreetMap",
      }).addTo(leafletRef.current.map);
    }

    // Destination marker
    if (leafletRef.current.marker) {
      leafletRef.current.marker.setLatLng([coords.lat, coords.lng]);
    } else {
      leafletRef.current.marker = L.marker([coords.lat, coords.lng]).addTo(leafletRef.current.map);
    }

    // Load routing plugin once then create/update control
    if (!leafletRef.current.routingLoaded) {
      await import("leaflet-routing-machine");
      leafletRef.current.routingLoaded = true;
    }

    // Build OSRM router (public demo server)
    const router = L.Routing.osrmv1({
      serviceUrl: "https://router.project-osrm.org/route/v1",
      profile: "foot", // or 'car' / 'driving'
    });

    const waypoints = [
      L.latLng(START.lat, START.lng),      // start (fixed)
      L.latLng(coords.lat, coords.lng),    // destination from QR
    ];

    if (!leafletRef.current.routing) {
      leafletRef.current.routing = L.Routing.control({
        waypoints,
        router,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false, // we’ll fit manually on routesfound
        show: false,              // hide the default panel UI
        lineOptions: {
          styles: [{ color: "#059669", weight: 6, opacity: 0.9 }], // emerald
        },
        createMarker: () => null, // don't add extra routing markers
      })
      .addTo(leafletRef.current.map)
      .on("routesfound", (e) => {
        // Fit bounds so the whole route is visible
        const route = e.routes?.[0];
        if (route?.coordinates?.length) {
          const bounds = L.latLngBounds(route.coordinates);
          leafletRef.current.map.fitBounds(bounds, { padding: [24, 24] });
        }
      });
    } else {
      leafletRef.current.routing.setWaypoints(waypoints);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-poppins">
      <section className="pt-24 pb-8">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="mb-2 text-sm text-slate-500">
            <NavLink to="/" className="hover:text-slate-700">Home</NavLink>
            &nbsp;›&nbsp;<span className="text-slate-700">Search For Deceased</span>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Search For Deceased</h1>
                <p className="mt-2 text-slate-600">Find loved ones by plot ID or name. Live data from the system.</p>
              </div>
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Search plot, name, birth or death date…"
                  className="w-full sm:w-80 rounded-xl border border-slate-300 bg-white/70 px-4 py-2.5 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-4.35-4.35m.6-5.4a6 6 0 11-12 0 6 6 0 0112 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* table */}
      <section className="pb-10">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left font-semibold text-slate-700 px-5 py-3">Plot ID</th>
                    <th className="text-left font-semibold text-slate-700 px-5 py-3">Name</th>
                    <th className="text-left font-semibold text-slate-700 px-5 py-3">Birth Date</th>
                    <th className="text-left font-semibold text-slate-700 px-5 py-3">Death Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (<tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>)}
                  {error && (<tr><td colSpan={4} className="px-5 py-10 text-center text-rose-600">{error}</td></tr>)}
                  {!loading && !error && pageRows.length === 0 && (<tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No records found.</td></tr>)}
                  {pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="px-5 py-3 text-slate-800">{row.plot_id}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{row.deceased_name || "—"}</td>
                      <td className="px-5 py-3 text-slate-700">{formatDate(row.birth_date)}</td>
                      <td className="px-5 py-3 text-slate-700">{formatDate(row.death_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-slate-200 bg-white text-sm">
              <div className="text-slate-600">
                Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong> result{total !== 1 ? "s" : ""}.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 disabled:opacity-50 hover:bg-slate-50"
                  aria-label="Previous"
                >◀</button>
                <span className="text-slate-600">Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 disabled:opacity-50 hover:bg-slate-50"
                  aria-label="Next"
                >▶</button>
              </div>
            </div>
          </div>

          {/* OR */}
          <div className="text-center text-slate-400 font-medium my-6">OR</div>
          <div className="flex justify-center">
            <button
              onClick={() => { setScanModalOpen(true); setScanMode("choose"); setScanErr(""); }}
              className="rounded-xl bg-slate-800 text-white px-5 py-3 hover:bg-slate-900 shadow-sm"
            >
              Scan a QR Code
            </button>
          </div>
        </div>
      </section>

      {/* map + res + rescan */}
      {scanResult && (
        <section className="pb-6">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-8 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600 break-all">
                <span className="font-semibold">QR:</span> {scanResult.token}
              </div>
            </div>
            {scanResult.coords ? (
              <>
                <div ref={mapRef} className="w-full h-[420px] rounded-xl overflow-hidden ring-1 ring-slate-200" />
                <div className="text-center">
                  <button
                    onClick={() => { setScanResult(null); setScanModalOpen(true); setScanMode("choose"); }}
                    className="rounded-xl bg-emerald-600 text-white px-5 py-3 hover:bg-emerald-700"
                  >
                    Scan another QR Code
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-slate-600 mb-3">This QR does not include coordinates.</p>
                <button
                  onClick={() => { setScanResult(null); setScanModalOpen(true); setScanMode("choose"); }}
                  className="rounded-xl bg-emerald-600 text-white px-5 py-3 hover:bg-emerald-700"
                >
                  Scan another QR Code
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Scan Modal */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-3 md:p-6" onClick={closeScanModal}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Scan a QR Code</h3>
              <button onClick={closeScanModal} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close">
                <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {scanMode === "choose" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={startCamera}
                    className="rounded-xl bg-slate-800 text-white px-4 py-3 hover:bg-slate-900"
                  >
                    Open Camera
                  </button>

                  <label className="rounded-xl border border-slate-300 px-4 py-3 text-slate-700 hover:bg-slate-50 cursor-pointer text-center">
                    Upload QR Image
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onClick={(e) => { e.currentTarget.value = ""; }}
                      onChange={(e) => handleUploadFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              )}

              {scanMode === "camera" && (
                <div className="space-y-3">
                  <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-black/5 w-full aspect-video">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { stopCamera(); setScanMode("choose"); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-slate-700 hover:bg-slate-50">Back</button>
                    <button onClick={closeScanModal} className="rounded-xl bg-slate-800 text-white px-4 py-2.5 hover:bg-slate-900">Close</button>
                  </div>
                </div>
              )}

              {scanMode === "upload" && (
                <div className="text-sm text-slate-600">
                  Processing image… {scanErr && <span className="text-rose-600 font-medium ml-2">{scanErr}</span>}
                </div>
              )}

              {scanErr && scanMode !== "upload" && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{scanErr}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

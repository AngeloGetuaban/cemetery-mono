// frontend/src/views/visitor/pages/SearchForDeceased.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import fetchBurialRecords from "../js/get-burial-records";

import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// shadcn/ui (only components you actually have)
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "../../../components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../../../components/ui/dialog";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";

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
    routing: null,
    routingLoaded: false,
  });

  // fixed starting point for route
  const START = { lat: 15.4953425, lng: 120.556059 };

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

    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);

    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not load image."));
        el.src = url;
      });

      const tryBarcodeDetector = async (source) => {
        if (!("BarcodeDetector" in window)) return null;
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats?.();
          if (Array.isArray(supported) && !supported.includes("qr_code")) return null;
        } catch {}
        const det = new window.BarcodeDetector({ formats: ["qr_code"] });

        const buildCanvas = (el, rotationDeg = 0, scale = 1) => {
          const w = (el.naturalWidth || el.width) * scale;
          const h = (el.naturalHeight || el.height) * scale;
          const canvas = document.createElement("canvas");
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

        try {
          const codes = await det.detect(source);
          if (codes && codes.length) return codes[0].rawValue || null;
        } catch {}

        const scales = [1.5, 2];
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

      const bdValue = await tryBarcodeDetector(img);
      if (bdValue) {
        handleQrFound(bdValue);
        cleanup();
        return;
      }

      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const zxing = new BrowserQRCodeReader();
        const result = await zxing.decodeFromImageElement(img);
        if (result?.getText) {
          handleQrFound(result.getText());
          cleanup();
          return;
        }
      } catch {}

      try {
        const jsqr = (await import("jsqr")).default;
        const scanWithJsQR = (canvas, invert = false, threshold = false) => {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          if (invert) {
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              d[i] = 255 - d[i];
              d[i + 1] = 255 - d[i + 1];
              d[i + 2] = 255 - d[i + 2];
            }
          }
          if (threshold) {
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
              const t = v > 160 ? 255 : 0;
              d[i] = d[i + 1] = d[i + 2] = t;
            }
          }
          if (invert || threshold) ctx.putImageData(imgData, 0, 0);
          const code = jsqr(imgData.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
          return code?.data || null;
        };

        const makeCanvas = (el, rot = 0, scale = 2) => {
          const w = (el.naturalWidth || el.width) * scale;
          const h = (el.naturalHeight || el.height) * scale;
          const rotNorm = ((rot % 360) + 360) % 360;
          const cw = rotNorm === 90 || rotNorm === 270 ? h : w;
          const ch = rotNorm === 90 || rotNorm === 270 ? w : h;
          const c = document.createElement("canvas");
          c.width = cw; c.height = ch;
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
      } catch {}

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

    if (!leafletRef.current.map) {
      leafletRef.current.map = L.map(mapRef.current).setView([coords.lat, coords.lng], 18);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
        attribution: "&copy; OpenStreetMap",
      }).addTo(leafletRef.current.map);
    }

    if (leafletRef.current.marker) {
      leafletRef.current.marker.setLatLng([coords.lat, coords.lng]);
    } else {
      leafletRef.current.marker = L.marker([coords.lat, coords.lng]).addTo(leafletRef.current.map);
    }

    if (!leafletRef.current.routingLoaded) {
      await import("leaflet-routing-machine");
      leafletRef.current.routingLoaded = true;
    }

    const router = L.Routing.osrmv1({
      serviceUrl: "https://router.project-osrm.org/route/v1",
      profile: "foot",
    });

    const waypoints = [L.latLng(START.lat, START.lng), L.latLng(coords.lat, coords.lng)];

    if (!leafletRef.current.routing) {
      leafletRef.current.routing = L.Routing.control({
        waypoints,
        router,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        show: false,
        lineOptions: { styles: [{ color: "#059669", weight: 6, opacity: 0.9 }] },
        createMarker: () => null,
      })
        .addTo(leafletRef.current.map)
        .on("routesfound", (e) => {
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
      {/* Page header */}
      <section className="pt-24 pb-8">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="mb-2 text-sm text-slate-500">
            <NavLink to="/" className="hover:text-slate-700">Home</NavLink>
            &nbsp;›&nbsp;<span className="text-slate-700">Search For Deceased</span>
          </div>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl sm:text-3xl">Search For Deceased</CardTitle>
              <CardDescription>Find loved ones by plot ID or name. Live data from the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">GP</AvatarFallback>
                  </Avatar>
                  <div className="text-sm text-slate-600">
                    Garden of Peace Cemetery
                  </div>
                </div>
                <div className="w-full sm:w-80">
                  {/* no Label import; using native label if needed */}
                  <div className="relative">
                    <Input
                      id="q"
                      value={q}
                      onChange={(e) => { setQ(e.target.value); setPage(1); }}
                      placeholder="Search plot, name, birth or death date…"
                      className="pr-10"
                    />
                    <svg
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-4.35-4.35m.6-5.4a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results */}
      <section className="pb-10">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <Card className="overflow-hidden border-slate-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plot ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Birth Date</TableHead>
                    <TableHead>Death Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-10">
                        Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {error && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-rose-600 py-10">
                        {error}
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && !error && pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-10">
                        No records found.
                      </TableCell>
                    </TableRow>
                  )}
                  {pageRows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-emerald-50/40">
                      <TableCell className="text-slate-800">{row.plot_id}</TableCell>
                      <TableCell className="font-medium text-slate-900">{row.deceased_name || "—"}</TableCell>
                      <TableCell className="text-slate-700">{formatDate(row.birth_date)}</TableCell>
                      <TableCell className="text-slate-700">{formatDate(row.death_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator />

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 text-sm">
                <div className="text-slate-600">
                  Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong> result{total !== 1 ? "s" : ""}.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous"
                  >
                    ◀
                  </Button>
                  <span className="text-slate-600">
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Next"
                  >
                    ▶
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-slate-400 font-medium my-6">OR</div>

          <div className="flex justify-center">
            <Button onClick={() => { setScanModalOpen(true); setScanMode("choose"); setScanErr(""); }} size="lg">
              Scan a QR Code
            </Button>
          </div>
        </div>
      </section>

      {/* map + res + rescan */}
      {scanResult && (
        <section className="pb-6">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-8 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 break-all">
                  <span className="font-semibold">QR:</span> {scanResult.token}
                </div>
              </CardContent>
            </Card>

            {scanResult.coords ? (
              <>
                <Card className="overflow-hidden">
                  <div ref={mapRef} className="w-full h-[420px]" />
                </Card>
                <div className="text-center">
                  <Button onClick={() => { setScanResult(null); setScanModalOpen(true); setScanMode("choose"); }}>
                    Scan another QR Code
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-slate-600 mb-3">This QR does not include coordinates.</p>
                  <Button onClick={() => { setScanResult(null); setScanModalOpen(true); setScanMode("choose"); }}>
                    Scan another QR Code
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Scan Modal (shadcn Dialog) */}
      <Dialog open={scanModalOpen} onOpenChange={(o) => (o ? setScanModalOpen(true) : closeScanModal())}>
        <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Scan a QR Code</DialogTitle>
            <DialogDescription>Use your camera or upload a QR image to locate a grave on the map.</DialogDescription>
          </DialogHeader>

          {scanMode === "choose" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={startCamera}>Open Camera</Button>

              <div className="flex items-center justify-center">
                {/* native label styled like shadcn button */}
                <label
                  htmlFor="qr-upload"
                  className="w-full cursor-pointer rounded-md border border-input bg-background px-4 py-2.5 text-center text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Upload QR Image
                </label>
                <input
                  id="qr-upload"
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onClick={(e) => { e.currentTarget.value = ""; }}
                  onChange={(e) => handleUploadFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          )}

          {scanMode === "camera" && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border">
                <div className="w-full aspect-video bg-muted/40">
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                </div>
              </div>

              {scanErr && (
                <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
                  {scanErr}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => { stopCamera(); setScanMode("choose"); }}>
                  Back
                </Button>
                <Button onClick={closeScanModal}>Close</Button>
              </DialogFooter>
            </div>
          )}

          {scanMode === "upload" && (
            <div className="text-sm text-slate-600">
              Processing image… {scanErr && <span className="text-rose-600 font-medium ml-2">{scanErr}</span>}
            </div>
          )}

          {scanErr && scanMode !== "upload" && scanMode !== "camera" && (
            <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
              {scanErr}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

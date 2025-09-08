// frontend/src/views/admin/pages/BuildingPlots.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import ViewModal from "../components/ViewModal";
import EditModal from "../components/EditModal";
import AddModal from "../components/AddModal";

import AlertsHost from "../../components/AlertsHost";
import { showSuccess, showError, confirmWarning } from "../../utitlities/alerts";

import { editBuildingPlot } from "../js/edit-building-plot";   // <— add file
import { addBuildingPlot } from "../js/add-building-plot";     // <— add file
import { getAuth } from "../../../utils/auth";
import { MapPin, Layers, Tag, Ruler, Crosshair, Plus } from "lucide-react";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

const GEOJSON_URL = `${API_BASE}/plot/building-plots`;
const DELETE_URL  = (id) => `${API_BASE}/admin/delete-building-plot/${encodeURIComponent(id)}`;

/* ---------------- utils ---------------- */
function centroidOfFeature(feature) {
  try {
    if (!feature?.geometry) return null;
    if (feature.geometry.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates || [];
      if (typeof lat === "number" && typeof lng === "number") return [lat, lng];
      return null;
    }
    const b = L.geoJSON(feature).getBounds().getCenter();
    return [b.lat, b.lng];
  } catch {
    return null;
  }
}

/* ---------------- pretty UI helpers (same as RoadPlots) ---------------- */
const btnBase =
  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2";
const btnGradGreen =
  "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:brightness-95 focus:ring-teal-300";
const btnGradBlue =
  "bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 text-white hover:brightness-95 focus:ring-indigo-300";
const btnGradRed =
  "bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white hover:brightness-95 focus:ring-rose-300";
const pill =
  "px-2 py-1 rounded-full text-xs font-semibold ring-1 ring-inset";

export default function BuildingPlots() {
  const [fc, setFc] = useState(null);
  const [error, setError] = useState(null);
  const [onlyAvailable, setOnlyAvailable] = useState(true);

  const [hoveredRow, setHoveredRow] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // modals
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [modalRow, setModalRow] = useState(null);
  const modalOpen = viewOpen || editOpen || addOpen;
  const [geoKey, setGeoKey] = useState(0);

  const mapRef = useRef(null);
  const center = useMemo(() => [15.49492, 120.55533], []);

  const auth = getAuth();
  const token = auth?.token;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  /* Fetch building plots */
  const fetchPlots = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(GEOJSON_URL);
      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const body = ct.includes("application/json") ? await res.json() : await res.text();
        throw new Error(ct.includes("application/json") ? JSON.stringify(body) : body.slice(0, 200));
      }
      const json = await res.json();
      setFc(json);

      // remount + cleanup
      setGeoKey((k) => k + 1);
      setHoveredRow(null);
      setSelectedRow(null);
      mapRef.current?.closePopup?.();
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => { fetchPlots(); }, [fetchPlots]);

  const rows = useMemo(() => {
    if (!fc?.features) return [];
    return fc.features
      .filter((f) => {
        if (!onlyAvailable) return true;
        const s = (f.properties?.status || "").toLowerCase();
        return s === "available";
      })
      .map((f) => {
        const p = f.properties || {};
        const c = centroidOfFeature(f);
        const idRaw = p.id ?? p.uid;
        return {
          id: idRaw != null ? String(idRaw) : undefined,
          plot_name: p.plot_name,
          plot_type: p.plot_type,
          size_sqm: p.size_sqm,
          status: p.status,
          lat: c ? c[0] : null,
          lng: c ? c[1] : null,
          _feature: f,
        };
      });
  }, [fc, onlyAvailable]);

  const baseStyle = (feature) => {
    const s = (feature?.properties?.status || "").toLowerCase();
    if (onlyAvailable && s !== "available")
      return { opacity: 0.15, fillOpacity: 0.08, color: "#94a3b8", weight: 2, dashArray: "4 3" };
    if (s === "available") return { color: "#10b981", weight: 2.5, fillOpacity: 0.35, opacity: 1 };
    if (s === "reserved") return { color: "#f59e0b", weight: 2.5, fillOpacity: 0.35, opacity: 1 };
    if (s === "occupied") return { color: "#ef4444", weight: 2.5, fillOpacity: 0.35, opacity: 1 };
    return { color: "#3b82f6", weight: 2.5, fillOpacity: 0.35, opacity: 1 };
  };

  const onEachFeature = (feature, layer) => {
    const p = feature.properties || {};
    const html = `
      <div style="min-width:220px;font-size:12.5px;line-height:1.35">
        <div><strong>Section:</strong> ${p.plot_name ?? "-"}</div>
        <div><strong>Type:</strong> ${p.plot_type ?? "-"}</div>
        <div><strong>Size:</strong> ${p.size_sqm ?? "-"} sqm</div>
        <div><strong>Status:</strong> ${p.status ?? "-"}</div>
      </div>
    `;
    layer.bindPopup(html);
  };

  const filteredFC = useMemo(() => {
    if (!fc?.features) return null;
    return {
      type: "FeatureCollection",
      features: (fc.features || []).filter((f) => {
        if (!onlyAvailable) return true;
        const s = (f.properties?.status || "").toLowerCase();
        return s === "available";
      }),
    };
  }, [fc, onlyAvailable]);

  // highlight + popup
  const highlightFeature = hoveredRow?._feature || null;
  const highlightStyle = {
    color: "#0ea5e9",
    weight: 4,
    opacity: 1,
    fillOpacity: 0.15,
    fillColor: "#38bdf8",
  };
  const popupRow = hoveredRow || selectedRow || null;
  const popupPos =
    popupRow && popupRow.lat != null && popupRow.lng != null ? [popupRow.lat, popupRow.lng] : null;

  const onRowClick = (row) => {
    setSelectedRow(row);
    const map = mapRef.current;
    if (!map) return;
    if (row.lat != null && row.lng != null) {
      map.flyTo([row.lat, row.lng], Math.max(map.getZoom(), 19), { duration: 0.7 });
    }
  };

  // helpers for modals
  const buildCoords = (r) => {
    if (r?.lat != null && r?.lng != null) return `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`;
    const g = r?._feature?.geometry;
    if (g?.type === "Point" && Array.isArray(g.coordinates)) {
      const [lng, lat] = g.coordinates;
      if (typeof lat === "number" && typeof lng === "number")
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    return undefined;
  };

  const openView = (r) => {
    const props = r?._feature?.properties || {};
    const coords = buildCoords(r);
    const viewData = {
      plot_name: { value: props.plot_name ?? r.plot_name ?? "—", icon: <Layers size={16} /> },
      status: { value: props.status ?? r.status ?? "—", icon: <Crosshair size={16} /> },
      plot_type: { value: props.plot_type ?? r.plot_type ?? "—", icon: <Layers size={16} /> },
      size_sqm: { value: props.size_sqm ?? r.size_sqm ?? "—", icon: <Ruler size={16} /> },
      coordinates: { value: coords ?? "—", icon: <MapPin size={16} /> },
    };
    setModalRow(viewData);
    setViewOpen(true);
  };

  const openEdit = (r) => {
    const props = r?._feature?.properties || {};

    let lat = r?.lat ?? null;
    let lng = r?.lng ?? null;
    if (lat == null || lng == null) {
      const g = r?._feature?.geometry;
      if (g?.type === "Point" && Array.isArray(g.coordinates)) {
        const [lngRaw, latRaw] = g.coordinates;
        if (typeof latRaw === "number" && typeof lngRaw === "number") {
          lat = latRaw;
          lng = lngRaw;
        }
      }
    }

    const editData = {
      id: props.id ?? r.id ?? "",
      uid: props.uid ?? "",
      plot_name: props.plot_name ?? r.plot_name ?? "",
      status: props.status ?? r.status ?? "",
      plot_type: props.plot_type ?? r.plot_type ?? "",
      size_sqm: props.size_sqm ?? r.size_sqm ?? "",
      latitude: lat != null ? lat.toFixed(6) : "",
      longitude: lng != null ? lng.toFixed(6) : "",
    };

    setModalRow(editData);
    setEditOpen(true);
  };

  const openAdd = () => {
    setModalRow({
      plot_name: "",
      plot_type: "",
      size_sqm: "",
      latitude: "",
      longitude: "",
    });
    setAddOpen(true);
  };

  // Submit from EditModal
  const handleEditSubmit = async (payload) => {
    try {
      await editBuildingPlot(payload);
      showSuccess("Building plot updated successfully.");
      await fetchPlots();
      setEditOpen(false);
    } catch (err) {
      showError(err?.message || "Failed to update building plot.");
    }
  };

  // Submit from AddModal
  const handleAddSubmit = async (payload) => {
    try {
      await addBuildingPlot(payload);
      showSuccess("Building plot added successfully.");
      await fetchPlots();
      setAddOpen(false);
    } catch (err) {
      showError(err?.message || "Failed to add building plot.");
    }
  };

  const deletePlotRequest = async (id) => {
    if (!token) {
      showError("You're not authenticated. Please sign in again.");
      throw new Error("Missing auth token");
    }

    let res = await fetch(DELETE_URL(id), {
      method: "DELETE",
      headers: { ...authHeader },
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(DELETE_URL(id), {
        method: "GET",
        headers: { ...authHeader },
      }).catch(() => null);
    }
    if (!res || !res.ok) {
      if (res && (res.status === 401 || res.status === 403)) {
        showError("Permission denied. Please sign in with an admin account.");
      }
      const msg = res ? await res.text().catch(() => "") : "Network error";
      throw new Error(msg || "Failed to delete building plot.");
    }
    try { return await res.json(); } catch { return {}; }
  };

  const handleDelete = async (row) => {
    const id = row?.id ?? row?._feature?.properties?.id ?? row?._feature?.properties?.uid;
    if (!id) { showError("Missing plot ID. Cannot delete."); return; }

    const ok = await confirmWarning({
      title: "Delete this building plot?",
      message: "This action cannot be undone. Do you want to proceed?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await deletePlotRequest(id);
      showSuccess("Building plot deleted successfully.");
      setHoveredRow((h) => (h?.id === id ? null : h));
      setSelectedRow((s) => (s?.id === id ? null : s));
      await fetchPlots();
    } catch (err) {
      showError(err?.message || "Failed to delete building plot.");
    }
  };

  return (
    <div className="p-6 space-y-4 bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-2xl">
      <AlertsHost />

      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Building Plots
          </h1>
          <p className="text-sm text-slate-500">
            View, manage, and map building parcels.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button className={`${btnBase} ${btnGradGreen}`} onClick={openAdd} title="Add building plot">
            <Plus size={16} />
            Add Plot
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 shadow-lg backdrop-blur-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 to-white">
          <div className="text-sm font-medium text-slate-800">Plots</div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 hidden sm:inline">Only Available</span>
              <button
                type="button"
                onClick={() => { setOnlyAvailable((v) => !v); setHoveredRow(null); setSelectedRow(null); }}
                className={
                  "relative inline-flex h-7 w-12 items-center rounded-full shadow-inner transition " +
                  (onlyAvailable ? "bg-emerald-500/90" : "bg-slate-300")
                }
                aria-pressed={onlyAvailable}
                title="Toggle availability filter"
              >
                <span
                  className={
                    "inline-block h-6 w-6 transform rounded-full bg-white shadow transition " +
                    (onlyAvailable ? "translate-x-6" : "translate-x-1")
                  }
                />
              </button>
            </div>

            <button className={`sm:hidden ${btnBase} ${btnGradGreen}`} onClick={openAdd}>
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        <div className="max-h-[34vh] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-slate-600 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 w-[22%]">Plot Name</th>
                <th className="px-4 py-3 w-[18%]">Type</th>
                <th className="px-4 py-3 w-[16%]">Size (sqm)</th>
                <th className="px-4 py-3 w-[14%]">Status</th>
                <th className="px-4 py-3 w-[20%]">Coordinates</th>
                <th className="px-4 py-3 w-[1%] whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No plots to display.</td>
                </tr>
              )}

              {rows.map((r, idx) => {
                const s = (r.status || "").toLowerCase();
                const badgeCls =
                  s === "available"
                    ? `${pill} bg-emerald-50 text-emerald-700 ring-emerald-200`
                    : s === "reserved"
                    ? `${pill} bg-amber-50 text-amber-700 ring-amber-200`
                    : s === "occupied"
                    ? `${pill} bg-rose-50 text-rose-700 ring-rose-200`
                    : `${pill} bg-slate-100 text-slate-700 ring-slate-200`;

                return (
                  <tr
                    key={r.id ?? `${r.plot_name}-${r.plot_type}-${idx}`}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onMouseEnter={() => setHoveredRow(r)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onRowClick(r)}
                  >
                    <td className="px-4 py-3 text-slate-800">{r.plot_name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{r.plot_type ?? "-"}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{r.size_sqm ?? "-"}</td>
                    <td className="px-4 py-3"><span className={badgeCls}>{r.status ?? "-"}</span></td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.lat != null && r.lng != null ? `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 flex-nowrap whitespace-nowrap">
                        <button
                          className={`${btnBase} ${btnGradBlue} !px-2.5 !py-1 text-[12px]`}
                          onClick={(e) => { e.stopPropagation(); openView(r); }}
                          title="View"
                        >
                          View
                        </button>
                        <button
                          className={`${btnBase} ${btnGradGreen} !px-2.5 !py-1 text-[12px]`}
                          onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className={`${btnBase} ${btnGradRed} !px-2.5 !py-1 text-[12px]`}
                          onClick={async (e) => { e.stopPropagation(); await handleDelete(r); }}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Map */}
      <div
        className={
          "w-full h-[58vh] rounded-2xl overflow-hidden shadow-xl border border-slate-200/70 bg-white/70 backdrop-blur-sm relative z-0" +
          (modalOpen ? " pointer-events-none" : "")
        }
      >
        {error && (
          <div className="p-4 text-rose-600 bg-rose-50 border-b border-rose-200">
            Failed to load building plots: {error}
          </div>
        )}
        <MapContainer
          center={center}
          zoom={19}
          minZoom={16}
          maxZoom={22}
          whenCreated={(map) => (mapRef.current = map)}
          style={{ width: "100%", height: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={22}
          />

          {filteredFC && (
            <GeoJSON
              key={`building-plots-${geoKey}-${onlyAvailable}`}
              data={filteredFC}
              style={baseStyle}
              onEachFeature={onEachFeature}
              pointToLayer={(feature, latlng) =>
                L.circleMarker(latlng, {
                  radius: 6,
                  weight: 2,
                  fillOpacity: 0.9,
                  color: "#3b82f6",
                })
              }
            />
          )}

          {highlightFeature && (
            <GeoJSON
              key={hoveredRow?.id || "hover-highlight"}
              data={highlightFeature}
              style={() => highlightStyle}
              pointToLayer={(feature, latlng) =>
                L.circleMarker(latlng, {
                  radius: 10,
                  weight: highlightStyle.weight,
                  color: highlightStyle.color,
                  opacity: highlightStyle.opacity,
                  fillOpacity: highlightStyle.fillOpacity,
                })
              }
            />
          )}

          {popupRow && popupPos && (
            <Popup position={popupPos} autoPan={false} closeButton={false}>
              <div className="min-w-[220px] space-y-1.5 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-600">
                    <Layers size={14} />
                  </span>
                  <span>Type: {popupRow.plot_type ?? "-"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-600">
                    <Tag size={14} />
                  </span>
                  <span>Section: {popupRow.plot_name ?? "-"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-600">
                    <Ruler size={14} />
                  </span>
                  <span>Size: {popupRow.size_sqm ?? "-"} sqm</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-600">
                    <MapPin size={14} />
                  </span>
                  <span>
                    Coords:{" "}
                    {popupRow.lat != null && popupRow.lng != null
                      ? `${popupRow.lat.toFixed(6)}, ${popupRow.lng.toFixed(6)}`
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-600">
                    <Crosshair size={14} />
                  </span>
                  <span>Status: {popupRow.status ?? "-"}</span>
                </div>
              </div>
            </Popup>
          )}
        </MapContainer>
      </div>

      {/* Modals */}
      <ViewModal open={viewOpen} onClose={() => setViewOpen(false)} data={modalRow} />
      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        data={modalRow}
        onSubmit={handleEditSubmit}
        title="Edit Building Plot"
      />
      <AddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        data={modalRow}
        onSubmit={handleAddSubmit}
        title="Add New Building Plot"
      />
    </div>
  );
}

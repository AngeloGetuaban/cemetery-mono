import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import ViewModal from "../components/ViewModal";
import EditModal from "../components/EditModal";
import AddModal from "../components/AddModal";

// shadcn/ui
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../../components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "../../../components/ui/alert-dialog";
import { Switch } from "../../../components/ui/switch";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";

// Sonner
import { Toaster, toast } from "sonner";

import { editBuildingPlot } from "../js/edit-building-plot";
import { addBuildingPlot } from "../js/add-building-plot";
import { getAuth } from "../../../utils/auth";
import {
  MapPin,
  Layers,
  Tag,
  Ruler,
  Crosshair,
  Plus,
  TriangleAlert,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

const GEOJSON_URL = `${API_BASE}/plot/building-plots`;
const DELETE_URL = (id) => `${API_BASE}/admin/delete-building-plot/${encodeURIComponent(id)}`;

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

/* ---------------- page ---------------- */
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

  // shadcn confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState({ title: "", message: "", onConfirm: null });

  function confirmWithAlertDialog({ title, message, onConfirm }) {
    setConfirmPayload({ title, message, onConfirm });
    setConfirmOpen(true);
  }

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

  useEffect(() => {
    fetchPlots();
  }, [fetchPlots]);

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

  const highlightFeature = hoveredRow?._feature || null;

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
      toast.success("Building plot updated successfully.");
      await fetchPlots();
      setEditOpen(false);
    } catch (err) {
      toast.error(err?.message || "Failed to update building plot.");
    }
  };

  // Submit from AddModal
  const handleAddSubmit = async (payload) => {
    try {
      await addBuildingPlot(payload);
      toast.success("Building plot added successfully.");
      await fetchPlots();
      setAddOpen(false);
    } catch (err) {
      toast.error(err?.message || "Failed to add building plot.");
    }
  };

  const deletePlotRequest = async (id) => {
    if (!token) {
      throw new Error("You're not authenticated. Please sign in again.");
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
        throw new Error("Permission denied. Please sign in with an admin account.");
      }
      const msg = res ? await res.text().catch(() => "") : "Network error";
      throw new Error(msg || "Failed to delete building plot.");
    }
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const handleDelete = (row) => {
    const id = row?.id ?? row?._feature?.properties?.id ?? row?._feature?.properties?.uid;
    if (!id) {
      toast.error("Missing plot ID. Cannot delete.");
      return;
    }

    confirmWithAlertDialog({
      title: "Delete this building plot?",
      message: "This action cannot be undone. Do you want to proceed?",
      onConfirm: async () => {
        try {
          await deletePlotRequest(id);
          toast.success("Building plot deleted successfully.");
          setHoveredRow((h) => (h?.id === id ? null : h));
          setSelectedRow((s) => (s?.id === id ? null : s));
          await fetchPlots();
        } catch (err) {
          toast.error(err?.message || "Failed to delete building plot.");
        }
      },
    });
  };

  return (
    <div className="p-6 space-y-4 bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-2xl">
      {/* sonner toaster */}
      <Toaster richColors expand={false} />

      {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Building Plots</CardTitle>
              <CardDescription>View, manage, and map building parcels.</CardDescription>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Button onClick={openAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Plot
              </Button>
            </div>
          </div>

      {/* Error alert (fetch/load) */}
      {error && (
        <Alert variant="destructive" className="border-rose-200">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Failed to load building plots</AlertTitle>
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Only Available</span>
            <Switch
              checked={onlyAvailable}
              onCheckedChange={(v) => {
                setOnlyAvailable(v);
                setHoveredRow(null);
                setSelectedRow(null);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {/* limit height + vertical scroll */}
          <div className="max-h-[420px] overflow-y-auto rounded-md border border-border">
            <Table className="min-w-full">
              {/* sticky header */}
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-[22%]">Plot Name</TableHead>
                  <TableHead className="w-[18%]">Type</TableHead>
                  <TableHead className="w-[16%]">Size (sqm)</TableHead>
                  <TableHead className="w-[14%]">Status</TableHead>
                  <TableHead className="w-[20%]">Coordinates</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No plots to display.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => {
                    const s = (r.status || "").toLowerCase();
                    const badgeVariant =
                      s === "available"
                        ? "success"
                        : s === "reserved"
                        ? "warning"
                        : s === "occupied"
                        ? "destructive"
                        : "secondary";

                    return (
                      <TableRow
                        key={r.id ?? `${r.plot_name}-${idx}`}
                        onMouseEnter={() => setHoveredRow(r)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onClick={() => onRowClick(r)}
                        className="cursor-pointer"
                      >
                        <TableCell>{r.plot_name ?? "-"}</TableCell>
                        <TableCell>{r.plot_type ?? "-"}</TableCell>
                        <TableCell className="tabular-nums">{r.size_sqm ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant}>{r.status ?? "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.lat != null && r.lng != null
                            ? `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openView(r);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(r);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDelete(r);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card
        className={
          "w-full h-[58vh] overflow-hidden border-slate-200/70 relative z-0 " +
          (modalOpen ? " pointer-events-none" : "")
        }
      >
        <div className="w-full h-full">
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
                style={() => ({
                  color: "#0ea5e9",
                  weight: 4,
                  opacity: 1,
                  fillOpacity: 0.15,
                  fillColor: "#38bdf8",
                })}
                pointToLayer={(feature, latlng) =>
                  L.circleMarker(latlng, {
                    radius: 10,
                    weight: 4,
                    color: "#0ea5e9",
                    opacity: 1,
                    fillOpacity: 0.15,
                  })
                }
              />
            )}

            {(() => {
              const popupRow = hoveredRow || selectedRow || null;
              const popupPos =
                popupRow && popupRow.lat != null && popupRow.lng != null
                  ? [popupRow.lat, popupRow.lng]
                  : null;
              if (!popupRow || !popupPos) return null;
              return (
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
              );
            })()}
          </MapContainer>
        </div>
      </Card>

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

      {/* Confirm Delete (shadcn AlertDialog) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmPayload.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmPayload.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const done = confirmPayload.onConfirm;
                setConfirmOpen(false);
                if (typeof done === "function") await done();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

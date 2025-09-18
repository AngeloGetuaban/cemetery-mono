// frontend/src/views/admin/pages/BurialRecords.jsx
import { useEffect, useMemo, useState } from "react";
import fetchBurialRecords from "../js/get-burial-records";
import { getAuth } from "../../../utils/auth";
import editBurialRecord from "../js/edit-burial-record";

// shadcn/ui
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Switch } from "../../../components/ui/switch";
import { Badge as ShadcnBadge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "../../../components/ui/alert";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
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

// icons
import { Eye, Pencil, Trash2, Download } from "lucide-react";

// toasts
import { Toaster, toast } from "sonner";

/* ---------------- constants + utils ---------------- */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

// Normalize various date formats to yyyy-mm-dd for <input type="date">
function toDateInputValue(s) {
  if (!s) return "";
  if (typeof s === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// Build the QR payload: prefer server-provided qr_token; fallback to a local build if missing.
function buildQrPayload(rec) {
  const token = typeof rec?.qr_token === "string" ? rec.qr_token.trim() : "";
  if (token) return token; // use backend-generated payload

  // --- Fallback only if qr_token is empty/unavailable ---
  const clean = (o) =>
    Object.fromEntries(
      Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );

  const payload = clean({
    _type: "burial_record",
    id: rec.id ?? rec.uid ?? null,
    uid: rec.uid ?? null,
    plot_id: rec.plot_id ?? null,
    deceased_name: rec.deceased_name ?? null,
    birth_date: rec.birth_date ?? null,
    death_date: rec.death_date ?? null,
    burial_date: rec.burial_date ?? null,
    family_contact: rec.family_contact ?? null,
    headstone_type: rec.headstone_type ?? null,
    memorial_text: rec.memorial_text ?? null,
    lat: rec.lat ?? null,
    lng: rec.lng ?? null,
    is_active: rec.is_active ?? null,
    created_at: rec.created_at ?? null,
    updated_at: rec.updated_at ?? null,
  });

  return JSON.stringify(payload);
}

// Small helper to build a QR image URL (PNG) from arbitrary data
function qrUrl(data, size = 160) {
  const s = Math.max(64, Math.min(1024, Number(size) || 160));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encodeURIComponent(
    String(data ?? "")
  )}`;
}

function StatusBadge({ ok }) {
  const variant = ok ? "success" : "destructive";
  return <ShadcnBadge variant={variant}>{ok ? "Active" : "Inactive"}</ShadcnBadge>;
}

function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

/* ---------------- component ---------------- */
export default function BurialRecords() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [error, setError] = useState("");

  // row selection
  const [viewRow, setViewRow] = useState(null);

  // plots data (id + plot_name)
  const [plots, setPlots] = useState([]); // [{id, name}]
  const [plotFilter, setPlotFilter] = useState("");

  // visitors for Family/Visitor Contact dropdown
  const [visitors, setVisitors] = useState([]); // [{id, name}]

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    plot_id: "",
    deceased_name: "",
    birth_date: "",
    death_date: "",
    burial_date: "",
    family_contact: "", // store visitor id here
    headstone_type: "",
    memorial_text: "",
    is_active: true,
  });

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    uid: "",
    plot_id: "",
    deceased_name: "",
    birth_date: "",
    death_date: "",
    burial_date: "",
    family_contact: "", // store visitor id here
    headstone_type: "",
    memorial_text: "",
    is_active: true,
  });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  // QR dialog state: { data, id, name }
  const [qrView, setQrView] = useState(null);

  const auth = getAuth();
  const token = auth?.token;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const DELETE_URL = (id) => `${API_BASE}/admin/delete-burial-record/${encodeURIComponent(id)}`;

  /* ---------- load records ---------- */
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    fetchBurialRecords()
      .then((data) => !ignore && setRows(Array.isArray(data) ? data : []))
      .catch((e) => !ignore && setError(e?.message || "Failed to load"))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, []);

  /* ---------- load plots (id + name) ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/plot/`);
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json") ? await res.json() : await res.text();
        if (!res.ok) throw new Error(typeof body === "string" ? body : JSON.stringify(body));

        const out = [];
        if (body && body.type === "FeatureCollection" && Array.isArray(body.features)) {
          for (const f of body.features) {
            const p = f?.properties || {};
            const id =
              p.id ??
              f?.id ??
              p.plot_id ??
              p.plotid ??
              null;
            if (id !== null && id !== undefined) {
              out.push({
                id: String(id),
                name: p.plot_name ? String(p.plot_name) : String(id),
              });
            }
          }
        }
        // dedupe by id, keep first name seen
        const map = new Map();
        for (const item of out) if (!map.has(item.id)) map.set(item.id, item);
        const list = Array.from(map.values()).sort((a, b) =>
          String(a.name).localeCompare(String(b.name))
        );
        if (!cancelled) setPlots(list);
      } catch {
        if (!cancelled) setPlots([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- load visitors for dropdown ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/users/visitors`, {
          headers: { ...authHeader },
        });
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json") ? await res.json() : await res.text();
        if (!res.ok) throw new Error(typeof body === "string" ? body : JSON.stringify(body));

        const list = Array.isArray(body)
          ? body
              .map((u) => {
                const id = u?.id ?? u?.uid ?? null;
                const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();
                return id != null
                  ? { id: String(id), name: name || String(id) }
                  : null;
              })
              .filter(Boolean)
              .sort((a, b) => a.name.localeCompare(b.name))
          : [];
        if (!cancelled) setVisitors(list);
      } catch {
        if (!cancelled) setVisitors([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [API_BASE]); // eslint-disable-line

  /* ---------- computed: available plots (exclude ones already in use) ---------- */
  const usedPlotIds = useMemo(
    () => new Set(rows.map((r) => String(r.plot_id)).filter(Boolean)),
    [rows]
  );

  // For Add
  const availablePlotsForAdd = useMemo(
    () => plots.filter((p) => !usedPlotIds.has(String(p.id))),
    [plots, usedPlotIds]
  );

  // For Edit (include the record's current plot_id so it remains selectable)
  const availablePlotsForEdit = useMemo(() => {
    if (!editOpen) return plots;
    const current = editForm.plot_id ? String(editForm.plot_id) : null;
    return plots.filter((p) => !usedPlotIds.has(String(p.id)) || String(p.id) === current);
  }, [plots, usedPlotIds, editOpen, editForm.plot_id]);

  /* ---------- filters ---------- */
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeOnly && !r.is_active) return false;
      if (plotFilter !== "" && String(r.plot_id) !== String(plotFilter)) return false;
      if (!text) return true;
      return (
        String(r.deceased_name || "").toLowerCase().includes(text) ||
        String(r.plot_id ?? "").toLowerCase().includes(text) ||
        String(r.uid || "").toLowerCase().includes(text) ||
        String(r.qr_token || "").toLowerCase().includes(text)
      );
    });
  }, [rows, q, activeOnly, plotFilter]);

  /* ---------- add handler ---------- */
  async function handleSubmit() {
    setFormError("");
    if (!form.plot_id || !form.deceased_name) {
      setFormError("Plot and Deceased Name are required.");
      return;
    }
    try {
      setSubmitting(true);
      const addBurialRecord = (await import("../js/add-burial-record")).default;
      const created = await addBurialRecord({
        plot_id: form.plot_id,
        deceased_name: form.deceased_name,
        birth_date: form.birth_date || null,
        death_date: form.death_date || null,
        burial_date: form.burial_date || null,
        family_contact: form.family_contact || null, // visitor id
        headstone_type: form.headstone_type || null,
        memorial_text: form.memorial_text || null,
        is_active: !!form.is_active,
      });

      // refresh table from source of truth (and dropdowns will auto-filter)
      const updated = await fetchBurialRecords();
      setRows(Array.isArray(updated) ? updated : []);

      setAddOpen(false);
      setForm({
        plot_id: "",
        deceased_name: "",
        birth_date: "",
        death_date: "",
        burial_date: "",
        family_contact: "",
        headstone_type: "",
        memorial_text: "",
        is_active: true,
      });
      toast.success("Burial record added.");
    } catch (e) {
      const msg = String(e?.message || e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- edit handler ---------- */
  const openEdit = (r) => {
    setEditError("");
    setEditForm({
      id: r.id ?? "",
      uid: r.uid ?? "",
      plot_id: r.plot_id ? String(r.plot_id) : "",
      deceased_name: r.deceased_name ?? "",
      birth_date: toDateInputValue(r.birth_date),
      death_date: toDateInputValue(r.death_date),
      burial_date: toDateInputValue(r.burial_date),
      family_contact_name: r.family_contact_name || "",
      family_contact: r.family_contact ? String(r.family_contact) : "",
      headstone_type: r.headstone_type ?? "",
      memorial_text: r.memorial_text ?? "",
      is_active: !!r.is_active,
    });
    setEditOpen(true);
  };

  async function submitEdit() {
    setEditError("");

    if (!editForm.id && !editForm.uid) {
      setEditError("Missing record ID/UID.");
      return;
    }

    try {
      setSavingEdit(true);

      await editBurialRecord({
        ...editForm,
        birth_date: editForm.birth_date || null,
        death_date: editForm.death_date || null,
        burial_date: editForm.burial_date || null,
      });

      // Refresh table after successful edit (keeps plot/visitor dropdowns correct)
      const updated = await fetchBurialRecords();
      setRows(Array.isArray(updated) ? updated : []);

      toast.success("Record updated.");
      setEditOpen(false);
    } catch (e) {
      const msg = String(e?.message || e);
      setEditError(msg);
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  }

  /* ---------- delete handler ---------- */
  const confirmDelete = (row) => {
    const id = row?.id ?? row?.uid;
    if (!id) {
      toast.error("Missing record ID. Cannot delete.");
      return;
    }
    setConfirmId(id);
    setConfirmOpen(true);
  };

  async function performDelete(id) {
    if (!token) throw new Error("You're not authenticated. Please sign in again.");

    const res = await fetch(DELETE_URL(id), {
      method: "DELETE",
      headers: { ...authHeader },
    });

    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      throw new Error(typeof body === "string" ? body : JSON.stringify(body));
    }

    // refresh table (this also re-computes available plots)
    const updated = await fetchBurialRecords();
    setRows(Array.isArray(updated) ? updated : []);

    return body;
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster richColors expand={false} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Burial Records</h1>
          <p className="text-sm text-muted-foreground">
            View and search records from the <span className="font-medium">graves</span> table.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Record</Button>
      </div>

      {/* Error banner */}
      {error && (
        <Alert variant="destructive" className="border-rose-200">
          <AlertTitle>Failed to load records</AlertTitle>
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters + Table */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, plot, QR, UID…"
                className="w-72 pr-10"
              />
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M21 21l-4.35-4.35m.6-5.4a6 6 0 11-12 0 6 6 0 0112 0z"
                />
              </svg>
            </div>

            {/* Plot filter (by id for now) */}
            <div className="grid gap-1">
              <select
                value={plotFilter}
                onChange={(e) => setPlotFilter(e.target.value)}
                className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-0"
                title="Filter by plot"
              >
                <option value="">All Plots</option>
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Active only toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
              <span className="text-sm text-muted-foreground">Active only</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {/* Loading state */}
          {loading ? (
            <div className="space-y-2 py-6">
              <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto rounded-md border border-border">
              <Table className="min-w-full">
                {/* sticky header */}
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-[110px]">Plot ID</TableHead>
                    <TableHead className="w-[26%]">Deceased Name</TableHead>
                    <TableHead className="w-[140px]">Death</TableHead>
                    <TableHead className="w-[140px]">Burial</TableHead>
                    <TableHead className="w-[120px] text-center">QR</TableHead>
                    <TableHead className="w-[120px] text-center">Status</TableHead>
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                        No records to display.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => {
                      const qrData = buildQrPayload(r);
                      return (
                        <TableRow key={r.id ?? r.uid}>
                          <TableCell className="font-medium">{r.plot_id ?? "—"}</TableCell>
                          <TableCell>{r.deceased_name || "—"}</TableCell>
                          <TableCell>{formatDate(r.death_date)}</TableCell>
                          <TableCell>{formatDate(r.burial_date)}</TableCell>
                          <TableCell className="text-center">
                            {qrData ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setQrView({
                                    data: qrData,
                                    id: String(r.uid || r.id || ""),
                                    name: r.deceased_name || "",
                                  })
                                }
                              >
                                View QR
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge ok={!!r.is_active} />
                          </TableCell>
                          <TableCell className="text-right space-x-2 whitespace-nowrap">
                            <Button variant="outline" size="sm" onClick={() => setViewRow(r)}>
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Button>
                            <Button size="sm" onClick={() => openEdit(r)}>
                              <Pencil className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => confirmDelete(r)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && (
            <div className="mt-3 text-sm text-muted-foreground">
              Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong>{" "}
              record{rows.length !== 1 ? "s" : ""}.
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Record Dialog */}
      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Burial Record</DialogTitle>
            <DialogDescription>Details of the selected record</DialogDescription>
          </DialogHeader>

          {viewRow && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <Field label="UID" value={viewRow.uid || "—"} mono />
                <Field label="Plot ID" value={viewRow.plot_id ?? "—"} />
                <Field label="Deceased Name" value={viewRow.deceased_name || "—"} wide />
                <Field label="Birth Date" value={formatDate(viewRow.birth_date)} />
                <Field label="Death Date" value={formatDate(viewRow.death_date)} />
                <Field label="Burial Date" value={formatDate(viewRow.burial_date)} />
                <Field label="Family/Visitor Contact" value={viewRow.family_contact_name || "—"} wide />
                <Field label="Headstone Type" value={viewRow.headstone_type || "—"} />
                <Field label="Active" value={<StatusBadge ok={!!viewRow.is_active} />} />
              </div>

              <div className="space-y-2">
                <Label>Memorial Text</Label>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {viewRow.memorial_text || "—"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>Created: {formatDate(viewRow.created_at)}</div>
                <div className="text-right">Updated: {formatDate(viewRow.updated_at)}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRow(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog — fixed height + scrollable body */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl !h-[65vh] p-0 flex flex-col">
          {/* Sticky header */}
          <div className="px-6 py-4 border-b">
            <DialogHeader className="space-y-1">
              <DialogTitle>Edit Burial Record</DialogTitle>
              <DialogDescription>Update burial record details</DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {editError && (
              <Alert variant="destructive" className="border-rose-200">
                <AlertTitle>Update error</AlertTitle>
                <AlertDescription className="break-words">{editError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Read-only IDs */}
              <div className="grid gap-1.5">
                <Label>Id</Label>
                <Input value={editForm.id ?? ""} readOnly className="text-slate-500 border-slate-200" />
              </div>
              <div className="grid gap-1.5">
                <Label>Uid</Label>
                <Input value={editForm.uid ?? ""} readOnly className="text-slate-500 border-slate-200" />
              </div>

              {/* Plot (label = plot_name, value = id), hides used plots except current */}
              <div className="grid gap-1.5">
                <Label>Plot</Label>
                <select
                  value={editForm.plot_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, plot_id: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-0"
                >
                  <option value="">Select a plot…</option>
                  {availablePlotsForEdit.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active */}
              <div className="grid gap-1.5">
                <Label>Active</Label>
                <div className="h-9 flex items-center">
                  <Switch
                    checked={!!editForm.is_active}
                    onCheckedChange={(v) => setEditForm((f) => ({ ...f, is_active: v }))}
                  />
                </div>
              </div>

              {/* Deceased Name */}
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Deceased Name</Label>
                <Input
                  value={editForm.deceased_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, deceased_name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>

              {/* Dates */}
              <div className="grid gap-1.5">
                <Label>Birth Date</Label>
                <Input
                  type="date"
                  value={editForm.birth_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, birth_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Death Date</Label>
                <Input
                  type="date"
                  value={editForm.death_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, death_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Burial Date</Label>
                <Input
                  type="date"
                  value={editForm.burial_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, burial_date: e.target.value }))}
                />
              </div>

              {/* Family/Visitor Contact (dropdown from visitors API) */}
              <div className="grid gap-1.5">
                <Label>Family/Visitor Contact</Label>
                <select
                  value={editForm.family_contact}
                  onChange={(e) => setEditForm((f) => ({ ...f, family_contact: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-0"
                >
                  <option value="">Select a visitor…</option>
                  {/* ensure the current selection is visible even if it's not in visitors[] */}
                  {editForm.family_contact &&
                    !visitors.some((v) => v.id === String(editForm.family_contact)) && (
                      <option value={String(editForm.family_contact)}>
                        {editForm.family_contact_name?.trim()
                          ? editForm.family_contact_name
                          : `ID ${String(editForm.family_contact)}`}
                      </option>
                    )}
                  {visitors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Headstone Type */}
              <div className="grid gap-1.5">
                <Label>Headstone Type</Label>
                <Input
                  value={editForm.headstone_type}
                  onChange={(e) => setEditForm((f) => ({ ...f, headstone_type: e.target.value }))}
                  placeholder="e.g., Upright, Flat, Ledger"
                />
              </div>

              {/* Memorial Text */}
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Memorial Text</Label>
                <textarea
                  rows={4}
                  value={editForm.memorial_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, memorial_text: e.target.value }))}
                  className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Record Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Burial Record</DialogTitle>
            <DialogDescription>Create a new burial record</DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive" className="border-rose-200">
              <AlertTitle>Submission error</AlertTitle>
              <AlertDescription className="break-words">{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plot (label = plot_name, value = id); hide used plots */}
            <div className="grid gap-1.5">
              <Label>Plot</Label>
              <select
                value={form.plot_id}
                onChange={(e) => setForm((f) => ({ ...f, plot_id: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-0"
              >
                <option value="">Select a plot…</option>
                {availablePlotsForAdd.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Active */}
            <div className="grid gap-1.5">
              <Label>Active</Label>
              <div className="h-9 flex items-center">
                <Switch
                  checked={!!form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
              </div>
            </div>

            {/* Deceased Name */}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Deceased Name</Label>
              <Input
                value={form.deceased_name}
                onChange={(e) => setForm((f) => ({ ...f, deceased_name: e.target.value }))}
                placeholder="Full name"
              />
            </div>

            {/* Dates */}
            <div className="grid gap-1.5">
              <Label>Birth Date</Label>
              <Input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Death Date</Label>
              <Input
                type="date"
                value={form.death_date}
                onChange={(e) => setForm((f) => ({ ...f, death_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Burial Date</Label>
              <Input
                type="date"
                value={form.burial_date}
                onChange={(e) => setForm((f) => ({ ...f, burial_date: e.target.value }))}
              />
            </div>

            {/* Family/Visitor Contact dropdown */}
            <div className="grid gap-1.5">
              <Label>Family/Visitor Contact</Label>
              <select
                value={form.family_contact}
                onChange={(e) => setForm((f) => ({ ...f, family_contact: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-0"
              >
                <option value="">Select a visitor…</option>
                {visitors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Headstone Type */}
            <div className="grid gap-1.5">
              <Label>Headstone Type</Label>
              <Input
                value={form.headstone_type}
                onChange={(e) => setForm((f) => ({ ...f, headstone_type: e.target.value }))}
                placeholder="e.g., Upright, Flat, Ledger"
              />
            </div>

            {/* Memorial Text (full width) */}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Memorial Text</Label>
              <textarea
                rows={4}
                value={form.memorial_text}
                onChange={(e) => setForm((f) => ({ ...f, memorial_text: e.target.value }))}
                className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-0"
                placeholder="Words engraved on the headstone"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Small Modal with Download */}
      <Dialog open={!!qrView} onOpenChange={(o) => !o && setQrView(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="truncate">
              QR Code {qrView?.name ? `– ${qrView.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Scan to view this burial record payload.
            </DialogDescription>
          </DialogHeader>

          {qrView && (
            <div className="flex flex-col items-center gap-3">
              <img
                src={qrUrl(qrView.data, 240)}
                alt="Burial record QR"
                className="rounded-md border"
                draggable={false}
              />
              <a
                href={qrUrl(qrView.data, 512)}
                download={`${qrView.id || "burial-record"}.png`}
                className="w-full"
              >
                <Button className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
                </Button>
              </a>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setQrView(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                const id = confirmId;
                setConfirmOpen(false);
                setConfirmId(null);
                try {
                  await performDelete(id);
                  setRows((prev) => prev.filter((r) => (r.id || r.uid) !== id));
                  toast.success("Record deleted successfully.");
                } catch (err) {
                  toast.error(err?.message || "Failed to delete record.");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- small field helper ---------------- */
function Field({ label, value, mono, wide }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label className="text-xs">{label}</Label>
      <div
        className={[
          "mt-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800",
          mono ? "font-mono" : "",
        ].join(" ")}
      >
        {typeof value === "undefined" || value === null || value === "" ? "—" : value}
      </div>
    </div>
  );
}

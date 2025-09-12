// frontend/src/views/admin/pages/BurialRecords.jsx
import { useEffect, useMemo, useState } from "react";
import UniversalTable, { Toggle } from "../../components/UniversalTable";
import fetchBurialRecords from "../js/get-burial-records";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

// Small helper to build a QR image URL (PNG)
function qrUrl(data, size = 120) {
  const s = Math.max(64, Math.min(1024, Number(size) || 120));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encodeURIComponent(
    String(data ?? "")
  )}`;
}

function Badge({ ok }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
      ].join(" ")}
    >
      {ok ? "Active" : "Inactive"}
    </span>
  );
}

function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function BurialRecords() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [view, setView] = useState(null);
  const [error, setError] = useState("");

  const [plots, setPlots] = useState([]);
  const [plotFilter, setPlotFilter] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    plot_id: "",
    deceased_name: "",
    birth_date: "",
    death_date: "",
    burial_date: "",
    family_contact: "",
    headstone_type: "",
    memorial_text: "",
  });
  const [formError, setFormError] = useState("");

  // QR modal state
  const [qrView, setQrView] = useState(null); // { token, id, name }

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/plot/`);
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json") ? await res.json() : await res.text();
        if (!res.ok) throw new Error(typeof body === "string" ? body : JSON.stringify(body));

        const ids = [];
        if (body && body.type === "FeatureCollection" && Array.isArray(body.features)) {
          for (const f of body.features) {
            const id = f?.properties?.id ?? f?.id ?? f?.properties?.plot_id ?? f?.properties?.plotid ?? null;
            if (id !== null && id !== undefined) ids.push(id);
          }
        }
        const unique = Array.from(new Set(ids));
        unique.sort((a, b) => {
          const na = Number(a), nb = Number(b);
          if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
          return String(a).localeCompare(String(b));
        });
        if (!cancelled) setPlots(unique);
      } catch {
        if (!cancelled) setPlots([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeOnly && !r.is_active) return false;
      if (plotFilter !== "" && String(r.plot_id) !== String(plotFilter)) return false;
      if (!text) return true;
      return (
        String(r.deceased_name || "").toLowerCase().includes(text) ||
        String(r.qr_token || "").toLowerCase().includes(text) ||
        String(r.plot_id ?? "").toLowerCase().includes(text) ||
        String(r.uid || "").toLowerCase().includes(text)
      );
    });
  }, [rows, q, activeOnly, plotFilter]);

  const columns = useMemo(
    () => [
      { key: "plot_id", label: "Plot ID", width: "100px" },
      { key: "deceased_name", label: "Deceased Name", width: "2fr" },
      { key: "death_date", label: "Death", width: "140px", render: (r) => <span>{formatDate(r.death_date)}</span> },
      { key: "burial_date", label: "Burial", width: "140px", render: (r) => <span>{formatDate(r.burial_date)}</span> },
      {
        key: "qr_token",
        label: "QR",
        width: "120px",
        align: "center",
        render: (r) =>
          r.qr_token ? (
            <button
              className="group inline-flex flex-col items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setQrView({ token: r.qr_token, id: r.uid || r.id, name: r.deceased_name });
              }}
              title="View QR"
            >
              <img
                src={qrUrl(r.qr_token, 60)}
                alt="QR"
                className="h-10 w-10 rounded border border-slate-200 shadow-sm group-hover:shadow-md transition"
              />
              <span className="text-[10px] text-slate-500 group-hover:text-slate-700">Open</span>
            </button>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          ),
      },
      { key: "is_active", label: "Status", width: "130px", render: (r) => <Badge ok={!!r.is_active} />, align: "center" },
    ],
    []
  );

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
        family_contact: form.family_contact || null,
        headstone_type: form.headstone_type || null,
        memorial_text: form.memorial_text || null,
      });
      setRows((prev) => [created, ...prev]);
      setShowAdd(false);
      setForm({
        plot_id: "",
        deceased_name: "",
        birth_date: "",
        death_date: "",
        burial_date: "",
        family_contact: "",
        headstone_type: "",
        memorial_text: "",
      });
    } catch (e) {
      setFormError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Burial Records</h1>
          <p className="text-sm text-slate-500 mt-1">View and search records from the <span className="font-medium">graves</span> table.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, plot, QR, UID…"
              className="w-72 rounded-xl border border-slate-300 bg-white/70 px-4 py-2.5 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-4.35-4.35m.6-5.4a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </div>

          <select
            value={plotFilter}
            onChange={(e) => setPlotFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white/70 px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
            title="Filter by plot"
          >
            <option value="">All Plots</option>
            {plots.map((id) => (
              <option key={String(id)} value={String(id)}>{String(id)}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <Toggle checked={activeOnly} onChange={setActiveOnly} label="Active only" />
            <span className="text-sm text-slate-600">Active only</span>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 hover:bg-emerald-700 shadow-sm"
          >
            Add Record
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{error}</div>}

        {loading ? (
          <div className="rounded-xl bg-white ring-1 ring-slate-200 p-6">
            <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-4" />
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />))}</div>
          </div>
        ) : (
          <UniversalTable columns={columns} data={filtered} rowKey="id" onRowClick={setView} />
        )}

        <div className="text-sm text-slate-500">
          Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> record{rows.length !== 1 ? "s" : ""}.
        </div>
      </div>

      {/* Record view modal */}
      {view && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-3 md:p-6" onClick={() => setView(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Burial Record</h3>
              <button onClick={() => setView(null)} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close">
                <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="UID" value={view.uid || "—"} mono />
                <Field label="Plot ID" value={view.plot_id ?? "—"} />
                <Field label="Deceased Name" value={view.deceased_name || "—"} wide />
                <Field label="Birth Date" value={formatDate(view.birth_date)} />
                <Field label="Death Date" value={formatDate(view.death_date)} />
                <Field label="Burial Date" value={formatDate(view.burial_date)} />
                <Field label="QR Token" value={view.qr_token || "—"} mono wide />
                <Field label="Family Contact" value={view.family_contact || "—"} wide />
                <Field label="Headstone Type" value={view.headstone_type || "—"} />
                <Field label="Status" value={<Badge ok={!!view.is_active} />} />
              </div>

              <div className="mt-5">
                <Label>Memorial Text</Label>
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {view.memorial_text || "—"}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-xs text-slate-500">
                <div>Created: {formatDate(view.created_at)}</div>
                <div className="text-right">Updated: {formatDate(view.updated_at)}</div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button onClick={() => setView(null)} className="rounded-xl bg-slate-800 text-white px-4 py-2.5 hover:bg-slate-900">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* QR large modal */}
      {qrView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setQrView(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-3 top-3 rounded-full p-2 hover:bg-slate-100"
              onClick={() => setQrView(null)}
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                QR Code {qrView.name ? `– ${qrView.name}` : ""}
              </h3>
              <div className="flex justify-center py-4">
                <img
                  src={qrUrl(qrView.token, 320)}
                  alt="QR Code"
                  className="w-72 h-72 rounded border border-slate-200 shadow"
                />
              </div>
              <a
                href={qrUrl(qrView.token, 1024)}
                download={`qr_${qrView.id || "record"}.png`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 hover:bg-emerald-700"
              >
                Save PNG
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-3 md:p-6" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Add Burial Record</h3>
              <button onClick={() => setShowAdd(false)} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close">
                <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{formError}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Plot">
                  <select
                    value={form.plot_id}
                    onChange={(e) => setForm((f) => ({ ...f, plot_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                  >
                    <option value="">Select a plot…</option>
                    {plots.map((id) => (
                      <option key={String(id)} value={String(id)}>{String(id)}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Deceased Name">
                  <input
                    value={form.deceased_name}
                    onChange={(e) => setForm((f) => ({ ...f, deceased_name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                    placeholder="Full name"
                  />
                </FormField>

                <FormField label="Birth Date">
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                  />
                </FormField>

                <FormField label="Death Date">
                  <input
                    type="date"
                    value={form.death_date}
                    onChange={(e) => setForm((f) => ({ ...f, death_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                  />
                </FormField>

                <FormField label="Burial Date">
                  <input
                    type="date"
                    value={form.burial_date}
                    onChange={(e) => setForm((f) => ({ ...f, burial_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                  />
                </FormField>

                <FormField label="Family Contact">
                  <input
                    value={form.family_contact}
                    onChange={(e) => setForm((f) => ({ ...f, family_contact: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                    placeholder="Name / phone / email"
                  />
                </FormField>

                <FormField label="Headstone Type">
                  <input
                    value={form.headstone_type}
                    onChange={(e) => setForm((f) => ({ ...f, headstone_type: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                    placeholder="e.g., Upright, Flat, Ledger"
                  />
                </FormField>

                <FormField label="Memorial Text" wide>
                  <textarea
                    value={form.memorial_text}
                    onChange={(e) => setForm((f) => ({ ...f, memorial_text: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                    placeholder="Words engraved on the headstone"
                  />
                </FormField>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }) {
  return <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{children}</div>;
}

function Field({ label, value, mono, wide }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label>{label}</Label>
      <div className={["mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800", mono ? "font-mono" : ""].join(" ")}>
        {typeof value === "undefined" || value === null || value === "" ? "—" : value}
      </div>
    </div>
  );
}

function FormField({ label, children, wide }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

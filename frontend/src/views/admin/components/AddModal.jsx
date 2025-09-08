// frontend/src/views/admin/components/AddModal.jsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function AddModal({ open, onClose, data, onSubmit, title = "Add Plot" }) {
  const [form, setForm] = useState(data || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setForm(data || {}); // fully dynamic like EditModal
  }, [open, data]);

  if (!open) return null;

  const handleChange = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    setError("");
    setSaving(true);
    try {
      await onSubmit(form); // parent decides API call + refresh + close
    } catch (err) {
      setError(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const HIDDEN_KEYS = new Set(["_feature", "created_at", "updated_at"]); // dynamic like EditModal

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[540px] max-w-[92vw] p-6 relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-800"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* When no data is provided, show a minimal helpful seed so user can type fields.
              Still remains dynamic: these keys become part of `form` once typed. */}
          {Object.keys(form).length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["plot_code", "plot_name", "plot_type", "size_sqm", "status", "latitude", "longitude"].map((k) => (
                <div key={k} className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1 capitalize">
                    {k.replaceAll("_", " ")}
                  </label>
                  {k === "status" ? (
                    <select
                      value={form[k] ?? ""}
                      onChange={(e) => handleChange(k, e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm border-slate-300 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    >
                      <option value="">— Select Status —</option>
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="occupied">Occupied</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form[k] ?? ""}
                      onChange={(e) => handleChange(k, e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm bg-white border-slate-300 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Dynamic renderer (same behavior pattern as EditModal) */}
          {Object.keys(form).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(form)
                .filter(([k]) => !HIDDEN_KEYS.has(k))
                .map(([k, v]) => {
                  if (k === "status") {
                    return (
                      <div key={k} className="flex flex-col">
                        <label className="text-xs font-medium text-slate-600 mb-1 capitalize">
                          {k.replaceAll("_", " ")}
                        </label>
                        <select
                          value={v ?? ""}
                          onChange={(e) => handleChange(k, e.target.value)}
                          className="border rounded-lg px-3 py-2 text-sm border-slate-300 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                        >
                          <option value="">— Select Status —</option>
                          <option value="available">Available</option>
                          <option value="reserved">Reserved</option>
                          <option value="occupied">Occupied</option>
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={k} className="flex flex-col">
                      <label className="text-xs font-medium text-slate-600 mb-1 capitalize">
                        {k.replaceAll("_", " ")}
                      </label>
                      <input
                        type="text"
                        value={v ?? ""}
                        onChange={(e) => handleChange(k, e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-white border-slate-300 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                      />
                    </div>
                  );
                })}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>

        <p className="mt-3 text-[11px] text-slate-500">
          Tip: You can fill <span className="font-medium">latitude</span> &amp;{" "}
          <span className="font-medium">longitude</span>, or provide a{" "}
          <span className="font-medium">coordinates</span> string like
          {' "15.495391, 120.555058" '} or {' "POINT (120.555058 15.495391)" '}.
        </p>
      </div>
    </div>
  );
}

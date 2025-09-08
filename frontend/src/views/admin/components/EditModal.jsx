// frontend/src/views/admin/components/EditModal.jsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function EditModal({ open, onClose, data, onSubmit, title = "Edit Plot" }) {
  const [form, setForm] = useState(data || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setForm(data || {});
  }, [open, data]);

  if (!open || !data) return null;

  const handleChange = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    setError("");
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(form).map(([k, v]) => {
              if (["_feature", "created_at", "updated_at"].includes(k)) return null;
              const readOnly = ["id", "uid"].includes(k);

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
                    readOnly={readOnly}
                    onChange={(e) => !readOnly && handleChange(k, e.target.value)}
                    className={
                      "border rounded-lg px-3 py-2 text-sm bg-white " +
                      (readOnly
                        ? "text-slate-500 border-slate-200"
                        : "border-slate-300 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400")
                    }
                  />
                </div>
              );
            })}
          </div>

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
      </div>
    </div>
  );
}

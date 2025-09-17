import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Object} props.data            // incoming plot
 * @param {(payload: any) => Promise<any>} props.onSubmit  // returns saved item or throws
 * @param {string} [props.title]
 */
export default function EditModal({ open, onClose, data, onSubmit, title = "Edit Plot" }) {
  const [form, setForm] = useState(() => data ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // fields to render, in order
  const fields = useMemo(
    () => [
      { key: "id", label: "Id", readOnly: true, type: "text" },
      { key: "uid", label: "Uid", readOnly: true, type: "text" },
      { key: "plot_name", label: "Plot Name", type: "text", fallback: "plot_name" in (data ?? {}) ? data.plot_name : "" },
      { key: "status", label: "Status", type: "select" },
      { key: "plot_type", label: "Plot Type", type: "text" },
      { key: "size_sqm", label: "Size Sqm", type: "number" },
      { key: "latitude", label: "Latitude", type: "number" },
      { key: "longitude", label: "Longitude", type: "number" },
    ],
    [data]
  );

  useEffect(() => {
    if (open) {
      setForm(data ?? {});
      setError("");
      setSaving(false);
    }
  }, [open, data]);

  if (!open || !data) return null;

  const handleChange = (key, value) => {
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // sanitize before submit (numbers as numbers, trim strings)
  const buildPayload = () => {
    const out = {};
    for (const f of fields) {
      const v = form[f.key];
      if (f.type === "number") {
        const n = typeof v === "number" ? v : parseFloat(String(v).trim());
        out[f.key] = Number.isFinite(n) ? n : null;
      } else if (f.type === "select") {
        out[f.key] = (v ?? "").toString().trim();
      } else {
        out[f.key] = (v ?? "").toString().trim();
      }
    }
    return out;
  };

  const extractErrMessage = (err) => {
    if (err?.response?.data) {
      const d = err.response.data;
      return d?.message || d?.error || d?.detail || JSON.stringify(d);
    }
    if (err?.data) {
      const d = err.data;
      return d?.message || d?.error || d?.detail || JSON.stringify(d);
    }
    return err?.message || String(err) || "Failed to save.";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return;

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload();
      const saved = await onSubmit(payload);
      onClose?.(saved);
    } catch (err) {
      setError(extractErrMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose?.() : null)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Edit the details for this plot record.</DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => {
              const v = form?.[f.key] ?? "";
              const readOnly = !!f.readOnly;

              if (f.type === "select") {
                return (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">{f.label}</label>
                    <select
                      value={v}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      disabled={readOnly}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-0 disabled:opacity-50"
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
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">{f.label}</label>
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={v}
                    readOnly={readOnly}
                    onChange={(e) => !readOnly && handleChange(f.key, e.target.value)}
                    className={readOnly ? "text-slate-500 border-slate-200" : ""}
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onClose?.()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

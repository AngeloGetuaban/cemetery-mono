import { getAuth } from "../../../utils/auth";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

export async function editBuildingPlot(payload) {
  const auth = getAuth();
  const token = auth?.token;

  const res = await fetch(`${API_BASE}/admin/edit-building-plot`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text();

  if (!res.ok) {
    const msg =
      (body && (body.message || body.error || body.detail)) ||
      (typeof body === "string" ? body : "Failed to update.");
    throw new Error(msg);
  }

  return body ?? { ok: true };
}

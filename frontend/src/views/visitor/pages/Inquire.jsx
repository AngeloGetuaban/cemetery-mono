// frontend/src/views/visitor/pages/Inquire.jsx
import { useState, useMemo } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Alert, AlertDescription } from "../../../components/ui/alert";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

export default function Inquire() {
  const authRaw = localStorage.getItem("auth");
  const auth = useMemo(() => {
    try { return authRaw ? JSON.parse(authRaw) : null; } catch { return null; }
  }, [authRaw]);

  const currentUser = auth?.user || {};
  const isVisitorLoggedIn = auth?.user && auth?.user.role === "visitor";

  const [formData, setFormData] = useState({
    requestType: "burial",
    deceasedName: "",
    birthDate: "",
    deathDate: "",
    burialDate: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const onChange = (e) => {
    setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVisitorLoggedIn) return;

    setMsg({ type: "", text: "" });

    // Basic checks
    if (!formData.deceasedName || !formData.birthDate || !formData.deathDate) {
      setMsg({ type: "error", text: "Please complete Deceased Name, Birth Date, and Death Date." });
      return;
    }
    if (formData.requestType === "burial" && !formData.burialDate) {
      setMsg({ type: "error", text: "Please provide a Burial Date for Burial Request." });
      return;
    }

    setSubmitting(true);
    try {
      const commonPayload = {
        deceased_name: formData.deceasedName,
        birth_date: formData.birthDate,
        death_date: formData.deathDate,
        family_contact: currentUser.id,
      };

      const endpoint =
        formData.requestType === "burial"
          ? "/visitor/request-burial"
          : "/visitor/request-maintenance";

      const payload =
        formData.requestType === "burial"
          ? { ...commonPayload, burial_date: formData.burialDate }
          : commonPayload;

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data = await res.json().catch(() => ({}));
      console.log("API response:", data);

      setMsg({
        type: "ok",
        text:
          formData.requestType === "burial"
            ? "Burial request submitted successfully!"
            : "Maintenance request submitted successfully!",
      });

      // Reset form
      setFormData({
        requestType: "burial",
        deceasedName: "",
        birthDate: "",
        deathDate: "",
        burialDate: "",
      });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed to submit request." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center font-poppins py-10 px-4">
      <div className="w-full max-w-2xl space-y-4">
        {!isVisitorLoggedIn && (
          <Alert variant="destructive">
            <AlertDescription>Please login to inquire a ticket.</AlertDescription>
          </Alert>
        )}

        {msg.text && (
          <Alert variant={msg.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{msg.text}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-emerald-700">Inquire a Ticket</CardTitle>
            <CardDescription>
              Please fill in the form below to request a burial schedule or maintenance service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Request Type */}
              <div className="grid gap-2">
                <Label>Request Type</Label>
                <Select
                  value={formData.requestType}
                  onValueChange={(v) => setFormData((f) => ({ ...f, requestType: v }))}
                  disabled={!isVisitorLoggedIn || submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="burial">Burial Request</SelectItem>
                    <SelectItem value="maintenance">Maintenance Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deceased info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Deceased Name</Label>
                  <Input
                    type="text"
                    name="deceasedName"
                    value={formData.deceasedName}
                    onChange={onChange}
                    placeholder="Full name"
                    disabled={!isVisitorLoggedIn || submitting}
                  />
                </div>
                <div>
                  <Label>Birth Date</Label>
                  <Input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={onChange}
                    disabled={!isVisitorLoggedIn || submitting}
                  />
                </div>
                <div>
                  <Label>Death Date</Label>
                  <Input
                    type="date"
                    name="deathDate"
                    value={formData.deathDate}
                    onChange={onChange}
                    disabled={!isVisitorLoggedIn || submitting}
                  />
                </div>
                {formData.requestType === "burial" && (
                  <div>
                    <Label>Burial Date</Label>
                    <Input
                      type="date"
                      name="burialDate"
                      value={formData.burialDate}
                      onChange={onChange}
                      disabled={!isVisitorLoggedIn || submitting}
                    />
                  </div>
                )}
              </div>

              {/* Family Contact */}
              <div className="grid gap-2">
                <Label>Family Contact</Label>
                <Input
                  type="text"
                  value={`${currentUser.first_name || ""} ${currentUser.last_name || ""}`}
                  disabled
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={!isVisitorLoggedIn || submitting}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

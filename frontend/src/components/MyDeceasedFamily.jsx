// frontend/src/components/MyDeceasedFamily.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import QRCode from "react-qr-code";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

// 🔧 date formatting helper
function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

// 🔧 reusable bordered field
function InfoField({ label, value, italic }) {
  return (
    <div className="p-3 border rounded-md bg-slate-50">
      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
        {label}
      </div>
      <div className={italic ? "italic text-slate-700" : "text-slate-800"}>
        {value || "—"}
      </div>
    </div>
  );
}

export default function MyDeceasedFamily({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [family, setFamily] = useState([]);

  const authRaw =
    typeof window !== "undefined" ? localStorage.getItem("auth") : null;
  const auth = useMemo(() => {
    try {
      return authRaw ? JSON.parse(authRaw) : null;
    } catch {
      return null;
    }
  }, [authRaw]);

  const userId = auth?.user?.id;

  useEffect(() => {
    if (!open || !userId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/graves/family/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch burial records");
        const data = await res.json();
        setFamily(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error("Error fetching burial:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open, userId]);

  // 🔧 handle QR download
  const handleDownloadQR = (value, id) => {
    try {
      const svg = document.getElementById(`qr-${id}`);
      if (!svg) return;
      const serializer = new XMLSerializer();
      const svgData = serializer.serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `qr_${id}.png`;
        link.href = pngFile;
        link.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    } catch (err) {
      console.error("QR download error:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>My Deceased Family</DialogTitle>
          <DialogDescription>
            View details of your loved ones below.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-6 text-muted-foreground">Loading...</div>
        ) : family.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No deceased records found.
          </div>
        ) : (
          <Tabs defaultValue={family[0]?.id?.toString()} className="w-full">
            {/* ✅ Visible container for tab names */}
            <div className="border rounded-md bg-slate-50 p-2 mb-4">
              <TabsList className="flex flex-wrap">
                {family.map((d) => (
                  <TabsTrigger key={d.id} value={d.id?.toString()}>
                    {d.deceased_name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {family.map((d) => (
              <TabsContent key={d.id} value={d.id?.toString()}>
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-emerald-700">
                      {d.deceased_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField label="Birth Date" value={formatDate(d.birth_date)} />
                    <InfoField label="Death Date" value={formatDate(d.death_date)} />
                    <InfoField label="Burial Date" value={formatDate(d.burial_date)} />
                    <InfoField label="Plot Name" value={d.plot_name} />
                    <InfoField label="Headstone Type" value={d.headstone_type} />
                    <InfoField label="Memorial Text" value={d.memorial_text} italic />

                    {/* ✅ QR code with download */}
                    <div className="p-3 border rounded-md bg-slate-50 flex flex-col items-center">
                      <div className="text-xs font-semibold text-slate-500 uppercase mb-2 self-start">
                        QR Token
                      </div>
                      {d.qr_token ? (
                        <>
                          <div className="bg-white p-2 border rounded-md">
                            <QRCode
                              id={`qr-${d.id}`}
                              value={d.qr_token}
                              size={120}
                            />
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleDownloadQR(d.qr_token, d.id)}
                          >
                            Download QR
                          </Button>
                        </>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

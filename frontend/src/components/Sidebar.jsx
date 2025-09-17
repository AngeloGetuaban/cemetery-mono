import { NavLink, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { getAuth } from "../utils/auth";
import {
  LayoutDashboard,
  Users2,
  ShieldCheck,
  Landmark,
  Wrench,
  ClipboardList,
  BookOpenCheck,
  CalendarCheck2,
  Ticket,
  Search,
  Menu,
  ChevronLeft,
  LogOut,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "../components/ui/card";

const W_FULL = 272;
const W_COLLAPSED = 120;
const cx = (...c) => c.filter(Boolean).join(" ");

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

export default function Sidebar({ base = "" }) {
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");

  const auth = getAuth();
  const user = auth?.user || {};
  const role = user?.role || "visitor";
  const fullName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "—";
  const initials =
    ((user?.first_name?.[0] || "") + (user?.last_name?.[0] || "") || "CL").toUpperCase();

  const prefix = String(base || "").replace(/\/+$/, "");
  const { pathname } = useLocation();

  const I = {
    dashboard: LayoutDashboard,
    admins: ShieldCheck,
    staff: Users2,
    visitors: Users2,
    setup: Landmark,
    plots: ClipboardList,
    records: BookOpenCheck,
    staffmgmt: Wrench,
    tickets: Ticket,
    burials: CalendarCheck2,
    maintenance: Wrench,
  };

  const items = useMemo(() => {
    if (role === "super_admin") {
      return [
        { to: "/setup", label: "Cemetery Setup", icon: I.setup },
        { to: "/admin", label: "Admins", icon: I.admins },
        { to: "/staff", label: "Staff", icon: I.staff },
        { to: "/visitor", label: "Visitors", icon: I.visitors },
      ];
    }
    if (role === "admin") {
      return [
        { to: "/plots", label: "Burial Plots", icon: I.plots },
        { to: "/road-plots", label: "Road Plots", icon: I.plots },
        { to: "/building-plots", label: "Building Plots", icon: I.plots },
        { to: "/records", label: "Burial Records", icon: I.records },
      ];
    }
    if (role === "staff") {
      return [
        { to: "/staff/dashboard", label: "Dashboard", icon: I.dashboard },
        { to: "/staff/tickets", label: "View Tickets", icon: I.tickets },
        { to: "/staff/burials", label: "Burial Schedule", icon: I.burials },
        { to: "/staff/maintenance", label: "Maintenance", icon: I.maintenance },
      ];
    }
    return [{ to: "/visitor/dashboard", label: "Dashboard", icon: I.dashboard }];
  }, [role]);

  const filtered = q
    ? items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
    : items;

  async function logout() {
    try {
      const token = auth?.token;
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }).catch(() => {});
    } finally {
      localStorage.removeItem("auth");
      window.location.href = "/visitor/login";
    }
  }

  return (
    <>
      <aside
        className={cx(
          "fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 flex flex-col",
          // whole sidebar shadow + subtle ring
          "shadow-[0_10px_40px_-12px_rgba(2,6,23,0.15)] ring-1 ring-slate-100"
        )}
        style={{ width: collapsed ? W_COLLAPSED : W_FULL }}
      >
        {/* Header card */}
        <Card className="m-4 rounded-2xl border-slate-200 shadow-[0_12px_30px_-12px_rgba(2,6,23,0.18)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                {initials}
              </div>
              {!collapsed && (
                <div className="leading-tight">
                  <div className="text-[13px] font-semibold text-slate-900">{fullName}</div>
                  <div className="text-[11px] text-slate-500">{role.replace("_", " ")}</div>
                </div>
              )}
            </div>

            {/* Bordered container for the three line / chevron */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Expand" : "Collapse"}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-[0_2px_10px_-2px_rgba(2,6,23,0.08)]"
            >
              {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
            </Button>
          </CardHeader>

          {!collapsed && (
            <CardContent>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <Search size={16} className="text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search..."
                  className="border-0 bg-transparent focus-visible:ring-0 text-sm"
                />
              </div>
            </CardContent>
          )}
        </Card>

        <Separator />

        {/* Scrollable nav */}
        <ScrollArea className="flex-1 px-3 pt-2">
          {filtered.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={`${prefix}${to}`}
              end
              className={({ isActive }) =>
                cx(
                  "group flex items-center gap-3 rounded-xl p-2 text-[14px] font-medium transition-all mb-1",
                  isActive
                    ? [
                        "text-white",
                        // active pill with ring + deep shadow + subtle green glow
                        "bg-gradient-to-r from-green-500 to-emerald-600",
                        "ring-1 ring-emerald-400/40",
                        "shadow-[0_14px_30px_-12px_rgba(16,185,129,0.55),0_6px_16px_-8px_rgba(2,6,23,0.25)]",
                      ].join(" ")
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      "grid place-items-center h-9 w-9 rounded-[12px] border transition-colors",
                      isActive
                        ? "bg-white/20 border-white/20 text-white"
                        : "bg-white border-slate-200 text-slate-600 group-hover:text-slate-900"
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
          <div className="h-6" />
        </ScrollArea>

        {/* Footer logout */}
        <div className="m-4">
          <Card className="rounded-2xl border-slate-200 shadow-[0_10px_24px_-12px_rgba(2,6,23,0.14)]">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 rounded-2xl px-3 py-3 text-[14px] font-medium text-slate-700 hover:bg-slate-100"
              onClick={logout}
            >
              <span className="grid place-items-center h-9 w-9 rounded-[12px] border border-slate-200 text-slate-600">
                <LogOut size={18} />
              </span>
              {!collapsed && <span>Logout</span>}
            </Button>
          </Card>
        </div>
      </aside>

      {/* spacer so main content doesn't slide under fixed sidebar */}
      <div aria-hidden style={{ width: collapsed ? W_COLLAPSED : W_FULL }} />
    </>
  );
}

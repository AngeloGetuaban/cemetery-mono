import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute";
import RoleLayout from "./layouts/RoleLayout";
import BareLayout from "./layouts/BareLayout";
import VisitorLayout from "./views/visitor/layouts/VisitorLayout";
import VisitorInquire from "./views/visitor/pages/Inquire";
import AlertsHost from "./views/components/AlertsHost";
import CemeterySetup from "./views/superadmin/pages/CemeterySetup";
import BurialPlots from "./views/admin/pages/BurialPlots";
import BurialRecords from "./views/admin/pages/BurialRecords";
import RoadPlots from "./views/admin/pages/RoadPlots";
import BuildingPlots from "./views/admin/pages/BuildingPlots";
import SearchForDeceased from "./views/visitor/pages/SearchForDeceased";
import { getAuth } from "./utils/auth";
import ViewTickets from "./views/staff/pages/ViewTickets";
import BurialSchedule from "./views/staff/pages/BurialSchedule";
import MaintenanceSchedules from "./views/staff/pages/MaintenanceSchedule";

const AdminSet   = lazy(() => import("./views/admin/pages/Settings"));

const VisitorHome  = lazy(() => import("./views/visitor/pages/Home"));
const VisitorLogin = lazy(() => import("./views/login/Login"));
const VisitorSet   = lazy(() => import("./views/visitor/pages/Settings"));

const SuperAdminAdmin   = lazy(() => import("./views/superadmin/pages/Admin"));
const SuperAdminStaff   = lazy(() => import("./views/superadmin/pages/Staff"));
const SuperAdminVisitor = lazy(() => import("./views/superadmin/pages/Visitor"));

function Loading() {
  return <div className="p-6">Loading…</div>;
}

/* ---------- helpers ---------- */
function defaultPathFor(role) {
  switch ((role || "").toLowerCase()) {
    case "admin":
      return "/admin/plots";
    case "staff":
      return "/staff/tickets";
    case "super_admin":
      return "/superadmin/setup";
    default:
      return "/visitor/home";
  }
}
function RoleLanding() {
  const auth = getAuth();
  const role = auth?.user?.role;
  return <Navigate to={defaultPathFor(role)} replace />;
}
function PortalGuard({ allow, children }) {
  const auth = getAuth();
  const role = auth?.user?.role;
  if (role && !allow.includes(role)) {
    return <Navigate to={defaultPathFor(role)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <AlertsHost />
        <Routes>
          {/* Root: Go to role-specific default if logged in, else visitor home */}
          <Route path="/" element={<RoleLanding />} />

          {/* Visitor (public, but redirect logged-in users of other roles to their portals) */}
          <Route
            path="/visitor"
            element={
              <PortalGuard allow={["visitor"]}>
                <VisitorLayout />
              </PortalGuard>
            }
          >
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<VisitorHome />} />
            <Route path="login" element={<VisitorLogin />} />
            <Route path="inquire" element={<VisitorInquire />} />
            <Route path="search" element={<SearchForDeceased />} />
            <Route path="settings" element={<VisitorSet />} />
            <Route path="*" element={<Navigate to="/visitor/home" replace />} />
          </Route>

          {/* Staff (protected + guard) */}
          <Route element={<ProtectedRoute allow={['staff']} />}>
            <Route
              path="/staff/*"
              element={
                <PortalGuard allow={["staff"]}>
                  <RoleLayout base="/staff">
                    <Routes>
                      <Route index element={<Navigate to="/staff/tickets" replace />} />
                      <Route path="tickets" element={<ViewTickets />} />
                      <Route path="burials" element={<BurialSchedule />} />
                      <Route path="maintenance" element={<MaintenanceSchedules />} />
                      {/* Any stray staff path → tickets */}
                      <Route path="*" element={<Navigate to="/staff/tickets" replace />} />
                    </Routes>
                  </RoleLayout>
                </PortalGuard>
              }
            />
          </Route>

          {/* Admin (protected + guard) */}
          <Route element={<ProtectedRoute allow={['admin']} />}>
            <Route
              path="/admin/*"
              element={
                <PortalGuard allow={["admin"]}>
                  <RoleLayout base="/admin">
                    <Routes>
                      {/* Default: plots */}
                      <Route index element={<Navigate to="/admin/plots" replace />} />
                      <Route path="plots" element={<BurialPlots />} />
                      <Route path="road-plots" element={<RoadPlots />} />
                      <Route path="building-plots" element={<BuildingPlots />} />
                      <Route path="records" element={<BurialRecords />} />
                      <Route path="settings" element={<AdminSet />} />
                      {/* Any stray admin path → plots */}
                      <Route path="*" element={<Navigate to="/admin/plots" replace />} />
                    </Routes>
                  </RoleLayout>
                </PortalGuard>
              }
            />
          </Route>

          {/* Super Admin (protected + guard) */}
          <Route element={<ProtectedRoute allow={['super_admin']} />}>
            <Route
              path="/superadmin/*"
              element={
                <PortalGuard allow={["super_admin"]}>
                  <RoleLayout base="/superadmin">
                    <Routes>
                      {/* Default: setup */}
                      <Route index element={<Navigate to="/superadmin/setup" replace />} />
                      <Route path="setup" element={<CemeterySetup />} />
                      <Route path="admin" element={<SuperAdminAdmin />} />
                      <Route path="staff" element={<SuperAdminStaff />} />
                      <Route path="visitor" element={<SuperAdminVisitor />} />
                      {/* Any stray superadmin path → setup */}
                      <Route path="*" element={<Navigate to="/superadmin/setup" replace />} />
                    </Routes>
                  </RoleLayout>
                </PortalGuard>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

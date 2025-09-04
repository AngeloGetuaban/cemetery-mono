import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleLayout from "./layouts/RoleLayout";
import BareLayout from "./layouts/BareLayout";
import VisitorLayout from "./views/visitor/layouts/VisitorLayout";
// Lazy-load role pages
const AdminDash = lazy(() => import("./views/admin/pages/Dashboard"));
const AdminSet  = lazy(() => import("./views/admin/pages/Settings"));

const StaffDash = lazy(() => import("./views/staff/pages/Dashboard"));
const StaffSet  = lazy(() => import("./views/staff/pages/Settings"));

const VisitorHome = lazy(() => import("./views/visitor/pages/Home"));
const VisitorLogin = lazy(() => import("./views/login/Login"));
const VisitorDash = lazy(() => import("./views/visitor/pages/Dashboard"));
const VisitorSet  = lazy(() => import("./views/visitor/pages/Settings"));

const SuperAdminDash = lazy(() => import("./views/superadmin/pages/Dashboard"));
const SuperAdminAdmin = lazy(() => import("./views/superadmin/pages/Admin"));
const SuperAdminStaff = lazy(() => import("./views/superadmin/pages/Staff"));
const SuperAdminVisitor = lazy(() => import("./views/superadmin/pages/Visitor"));
function Loading() { return <div className="p-6">Loading…</div>; }

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/visitor/home" replace />} />

          <Route path="/visitor" element={<VisitorLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<VisitorHome />} />
            <Route path="login" element={<VisitorLogin />} />
            <Route path="dashboard" element={<VisitorDash />} />
            <Route path="settings" element={<VisitorSet />} />
            <Route path="*" element={<Navigate to="home" replace />} />
          </Route>

          {/* Staff (protected) */}
          <Route element={<ProtectedRoute allow={['staff','admin','super_admin']} />}>
            <Route
              path="/staff/*"
              element={
                <RoleLayout base="/staff">
                  <Routes>
                    <Route path="dashboard" element={<StaffDash />} />
                    <Route path="settings" element={<StaffSet />} />
                    <Route path="*" element={<Navigate to="/staff/dashboard" replace />} />
                  </Routes>
                </RoleLayout>
              }
            />
          </Route>

          {/* Admin (protected) */}
          <Route element={<ProtectedRoute allow={['admin']} />}>
            <Route
              path="/admin/*"
              element={
                <RoleLayout base="/admin">
                  <Routes>
                    <Route path="dashboard" element={<AdminDash />} />
                    <Route path="settings" element={<AdminSet />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </RoleLayout>
              }
            />
          </Route>

          {/* Super Admin (protected) */}
          <Route element={<ProtectedRoute allow={['super_admin']} />}>
            <Route
              path="/superadmin/*"
              element={
                <RoleLayout base="/superadmin">
                  <Routes>
                    <Route path="dashboard" element={<SuperAdminDash />} />
                    <Route path="/admin" element={<SuperAdminAdmin />} />
                    <Route path="/staff" element={<SuperAdminStaff />} />
                    <Route path="/visitor" element={<SuperAdminVisitor />} />
                    <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
                  </Routes>
                </RoleLayout>
              }
            />
          </Route>


          <Route
            path="*"
            element={<BareLayout><div className="p-6">404 — Not Found</div></BareLayout>}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

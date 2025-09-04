import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthed, hasRole } from "../utils/auth";

export default function ProtectedRoute({ allow = [] }) {
  const loc = useLocation();
  if (!isAuthed()) return <Navigate to="/visitor/home" replace state={{ from: loc }} />;
  if (allow.length && !hasRole(...allow)) return <Navigate to="/visitor/home" replace />;
  return <Outlet />;
}
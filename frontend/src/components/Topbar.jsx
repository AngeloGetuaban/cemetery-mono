import { useEffect, useState, Fragment } from "react";
import { NavLink } from "react-router-dom";

export default function Topbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // get role from localStorage
  const authRaw = localStorage.getItem("auth");
  const auth = authRaw ? JSON.parse(authRaw) : null;
  const role = auth?.user?.role || null;

  // condition: show nav if visitor OR not logged in
  const showVisitorNav = !role || role === "visitor";

  return (
    <Fragment>
      <header
        className={[
          "fixed inset-x-0 top-0 z-40 transition-all duration-300 font-poppins",
          showVisitorNav
            ? scrolled
              ? "bg-white/70 backdrop-blur-md border-b border-slate-200 shadow-sm"
              : "bg-transparent border-transparent"
            : "bg-white", // plain white for logged-in non-visitors
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
          <div className="py-5 md:py-6 flex items-center justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-700">
              Garden Of Peace
            </span>

            {showVisitorNav && (
              <nav className="hidden md:flex items-center gap-8 text-[15px]">
                <NavItem to="/visitor/home" label="Home" activeColor />
                <NavItem to="/visitor/search" label="Search For Deceased" />
                <NavItem to="/visitor/inquire" label="Inquire" />
                <NavItem to="/visitor/login" label="Login" />
              </nav>
            )}
          </div>
        </div>
      </header>
      <div className="h-20" />
    </Fragment>
  );
}

function NavItem({ to, label, exact = false, activeColor = false }) {
  const base = "text-sm md:text-base transition hover:text-slate-900";
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        [
          base,
          isActive
            ? activeColor
              ? "text-emerald-700 font-semibold"
              : "text-emerald-900 font-medium"
            : "text-slate-600",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

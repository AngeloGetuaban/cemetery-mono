import { useEffect, useState, useRef, Fragment } from "react";
import { NavLink } from "react-router-dom";

export default function Topbar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

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

  // lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [drawerOpen]);

  // close on Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    if (drawerOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

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
            <div className="flex items-center gap-3">
              {/* Hamburger (mobile only) */}
              {showVisitorNav && (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex items-center justify-center -ml-1 mr-1 h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-700 md:hidden"
                  aria-label="Open menu"
                  aria-controls="mobile-drawer"
                  aria-expanded={drawerOpen}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
              )}

              <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-700">
                Garden Of Peace
              </span>
            </div>

            {/* Desktop nav */}
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

      {/* Spacer so content doesn’t hide under fixed header */}
      <div className="h-5" />

      {/* Mobile drawer + overlay */}
      {showVisitorNav && (
        <Fragment>
          {/* Overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            className={[
              "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden",
              drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            ].join(" ")}
          />

          {/* Drawer panel */}
          <aside
            id="mobile-drawer"
            ref={drawerRef}
            className={[
              "fixed top-0 left-0 z-50 h-full w-80 max-w-[85%] bg-white shadow-xl ring-1 ring-slate-200 md:hidden",
              "transition-transform duration-300 ease-out",
              drawerOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-drawer-title"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 id="mobile-drawer-title" className="text-base font-semibold text-slate-800">
                Menu
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-100"
                aria-label="Close menu"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="p-4">
              <DrawerLink to="/visitor/home" label="Home" onNavigate={() => setDrawerOpen(false)} />
              <DrawerLink to="/visitor/search" label="Search For Deceased" onNavigate={() => setDrawerOpen(false)} />
              <DrawerLink to="/visitor/inquire" label="Inquire" onNavigate={() => setDrawerOpen(false)} />
              <DrawerLink to="/visitor/login" label="Login" onNavigate={() => setDrawerOpen(false)} />
            </nav>
          </aside>
        </Fragment>
      )}
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

function DrawerLink({ to, label, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "block px-3 py-3 rounded-lg text-base font-medium",
          isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

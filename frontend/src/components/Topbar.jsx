import { Fragment, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "../components/ui/sheet";
import {
  NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList,
} from "../components/ui/navigation-menu";
import { Separator } from "../components/ui/separator";
import { Menu } from "lucide-react";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";
const IMG_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL_IMAGE) || API_BASE;

// Make relative asset paths absolute to IMG_BASE and encode safely.
const resolveAssetUrl = (p) => {
  if (!p) return null;
  try {
    // new URL handles absolute URLs and encodes spaces/parentheses in the path
    return new URL(p, IMG_BASE.replace(/\/+$/, "") + "/").toString();
  } catch {
    return p;
  }
};

export default function Topbar() {
  const [scrolled, setScrolled] = useState(false);
  const [siteName, setSiteName] = useState("Garden of Peace");
  const [siteLogoUrl, setSiteLogoUrl] = useState(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // fetch public cemetery info
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/cemetery-info/`);
        if (!r.ok) return;
        const j = await r.json().catch(() => null);
        const d = j?.data || j;
        if (!d || cancelled) return;
        if (d.name) setSiteName(d.name);
        if (d.logo_url) {
          setSiteLogoUrl(resolveAssetUrl(d.logo_url));
          setLogoError(false);
        }
      } catch {
        /* ignore; keep defaults */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const authRaw = localStorage.getItem("auth");
  const auth = authRaw ? JSON.parse(authRaw) : null;
  const role = auth?.user?.role || null;
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
            : "bg-white",
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
          <div className="py-5 md:py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showVisitorNav && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden -ml-1 mr-1 rounded-xl text-slate-700 hover:bg-slate-100"
                      aria-label="Open menu"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="left" className="p-0 w-80 max-w-[85%] bg-white">
                    <SheetHeader className="px-4 py-3 border-b border-slate-200">
                      <SheetTitle className="text-base">Menu</SheetTitle>
                    </SheetHeader>

                    <nav className="p-4">
                      <MobileLink to="/visitor/home" label="Home" />
                      <MobileLink to="/visitor/search" label="Search For Deceased" />
                      <MobileLink to="/visitor/inquire" label="Inquire" />
                      <MobileLink to="/visitor/login" label="Login" />
                      <Separator className="my-4" />
                      <div className="px-3 text-xs uppercase tracking-wider text-slate-500">Quick Actions</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 px-3">
                        <Button asChild variant="secondary" className="justify-center">
                          <NavLink to="/visitor/search">Search</NavLink>
                        </Button>
                        <Button asChild variant="outline" className="justify-center">
                          <NavLink to="/visitor/inquire">Request</NavLink>
                        </Button>
                      </div>
                    </nav>
                  </SheetContent>
                </Sheet>
              )}

              {/* Brand: logo + name */}
              <div className="flex items-center gap-2">
                {siteLogoUrl && !logoError ? (
                  <img
                    src={siteLogoUrl}
                    alt="Cemetery logo"
                    className="h-8 w-8 md:h-9 md:w-9 rounded-md border object-contain bg-white"
                    crossOrigin="anonymous"
                    onError={() => setLogoError(true)}
                  />
                ) : null}
                <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-700">
                  {siteName}
                </span>
              </div>
            </div>

            {showVisitorNav && (
              <div className="hidden md:flex items-center gap-2">
                <NavigationMenu>
                  <NavigationMenuList className="gap-1">
                    <NavButton to="/visitor/home" label="Home" />
                    <NavButton to="/visitor/search" label="Search For Deceased" />
                    <NavButton to="/visitor/inquire" label="Inquire" />
                    <NavButton to="/visitor/login" label="Login" />
                  </NavigationMenuList>
                </NavigationMenu>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="h-5" />
    </Fragment>
  );
}

function NavButton({ to, label }) {
  return (
    <NavigationMenuItem>
      <Button asChild variant="ghost" className="text-slate-600 hover:text-slate-900">
        <NavigationMenuLink asChild>
          <NavLink
            to={to}
            className={({ isActive }) =>
              ["px-3 py-2 rounded-lg text-sm", isActive ? "text-emerald-700 font-semibold" : ""].join(" ")
            }
          >
            {label}
          </NavLink>
        </NavigationMenuLink>
      </Button>
    </NavigationMenuItem>
  );
}

function MobileLink({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "block px-4 py-3 rounded-lg text-base font-medium",
          isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

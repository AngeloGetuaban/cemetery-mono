import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  Facebook,
  Twitter,
  Github,
  MapPin,
  Phone,
  Mail,
  Clock,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

export default function Footer() {
  const [siteName, setSiteName] = useState("Garden of Peace");
  const [siteDesc, setSiteDesc] = useState(
    "A sacred sanctuary where love transcends time. Our digital mapping system helps you navigate with ease while honoring cherished memories."
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/cemetery-info/`);
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const d = json?.data || json;
        if (!d || cancelled) return;
        if (d.name) setSiteName(d.name);
        if (d.description) setSiteDesc(d.description);
      } catch {
        // keep defaults on error
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white font-poppins">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Brand + Socials */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-3">
                {siteName}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {siteDesc}
              </p>
            </div>

            <TooltipProvider delayDuration={150}>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg bg-slate-800 border-slate-700 text-slate-200 hover:bg-emerald-600 hover:text-white"
                      aria-label="Visit us on Twitter"
                    >
                      <Twitter className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Twitter</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg bg-slate-800 border-slate-700 text-slate-200 hover:bg-emerald-600 hover:text-white"
                      aria-label="Visit us on Facebook"
                    >
                      <Facebook className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Facebook</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg bg-slate-800 border-slate-700 text-slate-200 hover:bg-emerald-600 hover:text-white"
                      aria-label="Visit our GitHub"
                    >
                      <Github className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>GitHub</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Services</h4>
            <ul className="space-y-3">
              <li>
                <NavLink
                  to="/visitor/search"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Search for Deceased
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/visitor/scan"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  QR Code Scanning
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/visitor/map"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Interactive Mapping
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/visitor/inquire"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Maintenance Requests
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/visitor/schedule"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Burial Scheduling
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <NavLink
                  to="/visitor/home"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/visitor/search"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Search For Deceased
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/visitor/inquire"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Inquire
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/visitor/login"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Login
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Contact Info</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-400 text-sm">
                  123 Memorial Drive
                  <br />
                  Tarlac City, Philippines 2300
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-slate-400 text-sm">+63 45 123 4567</p>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-slate-400 text-sm">info@gardenofpeace.ph</p>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-slate-400 text-sm">
                  Daily: 6:00 AM - 6:00 PM
                  <br />
                  Office: Mon–Fri 8:00 AM - 5:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <Separator className="bg-slate-800 mt-12" />

        {/* Bottom bar */}
        <div className="pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
              <p className="text-slate-400 text-sm">
                © {year} {siteName} Cemetery. All rights reserved.
              </p>
              <div className="flex gap-6">
                <NavLink
                  to="/privacy"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Privacy Policy
                </NavLink>
                <NavLink
                  to="/terms"
                  className={({ isActive }) =>
                    [
                      "transition-colors duration-200 text-sm",
                      isActive
                        ? "text-emerald-400 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    ].join(" ")
                  }
                >
                  Terms of Service
                </NavLink>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>Powered by</span>
              <span className="text-emerald-400 font-medium">
                Digital Cemetery Solutions
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

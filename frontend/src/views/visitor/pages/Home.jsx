import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

// shadcn/ui — import from the right files
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Separator } from "../../../components/ui/separator";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSecondSection, setShowSecondSection] = useState(false);
  const [showStatsSection, setShowStatsSection] = useState(false);
  const [showTestimonials, setShowTestimonials] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [counters, setCounters] = useState({
    visitors: 0,
    graves: 0,
    requests: 0,
    families: 0,
    years: 0,
  });

  const [siteName, setSiteName] = useState("Garden of Peace");
  const [siteSlogan, setSiteSlogan] = useState("Where memories bloom eternal");
  const [siteDesc, setSiteDesc] = useState(
    "A sacred sanctuary where love transcends time. Our digital mapping system helps you navigate with ease while honoring the cherished memories of your loved ones."
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
        if (d.slogan) setSiteSlogan(d.slogan);
        if (d.description) setSiteDesc(d.description);
      } catch {
        // keep defaults on error
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const testimonials = [
    {
      id: 1,
      text:
        "Finding my grandmother's grave was so much easier with this system. The QR code scanning and GPS navigation saved us hours of searching.",
      name: "Maria Santos",
      role: "Family Member",
      avatar: "MS",
    },
    {
      id: 2,
      text:
        "The digital mapping system helped us locate our father's resting place quickly during our visit. The technology is respectful and very helpful.",
      name: "Roberto Cruz",
      role: "Visitor",
      avatar: "RC",
    },
    {
      id: 3,
      text:
        "As a frequent visitor, I appreciate how easy it is to report maintenance issues through the app. The staff responds quickly to our concerns.",
      name: "Carmen Delgado",
      role: "Regular Visitor",
      avatar: "CD",
    },
    {
      id: 4,
      text:
        "The search feature is amazing. I was able to find my uncle's grave by just typing his name. Much better than the old paper records.",
      name: "Jose Reyes",
      role: "Family Member",
      avatar: "JR",
    },
  ];

  const targetNumbers = {
    visitors: 1247,
    graves: 892,
    requests: 156,
    families: 634,
    years: 25,
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    const handleScroll = () => {
      const y = window.scrollY;
      const h = window.innerHeight;
      if (y > h * 0.3) setShowSecondSection(true);
      if (y > h * 0.8) setShowStatsSection(true);
      if (y > h * 1.2) setShowTestimonials(true);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!showStatsSection) return;
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;
    Object.keys(targetNumbers).forEach((key) => {
      const target = targetNumbers[key];
      const inc = target / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const val = Math.min(Math.round(inc * step), target);
        setCounters((p) => ({ ...p, [key]: val }));
        if (step >= steps) clearInterval(timer);
      }, stepTime);
    });
  }, [showStatsSection]);

  useEffect(() => {
    if (!showTestimonials) return;
    const t = setInterval(() => {
      setCurrentTestimonial((prev) =>
        prev === testimonials.length - 1 ? 0 : prev + 1
      );
    }, 4000);
    return () => clearInterval(t);
  }, [showTestimonials, testimonials.length]);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden font-poppins h-[92vh] md:h-screen flex items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-white to-white">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Copy + CTAs */}
            <div
              className={[
                "transition-all duration-1000 ease-out",
                isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0",
              ].join(" ")}
            >
              <h1
                className={[
                  "text-4xl sm:text-5xl font-extrabold leading-tight text-slate-900",
                  "transition-all duration-1000 ease-out delay-150",
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
                ].join(" ")}
              >
                Welcome to
                <br />
                <span className="text-emerald-700">{siteName}</span>
              </h1>

              <p
                className={[
                  "mt-6 text-xl text-slate-600 font-medium italic",
                  "transition-all duration-1000 ease-out delay-300",
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
                ].join(" ")}
              >
                “{siteSlogan}”
              </p>

              <p
                className={[
                  "mt-4 text-lg text-slate-700 max-w-xl",
                  "transition-all duration-1000 ease-out delay-500",
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
                ].join(" ")}
              >
                {siteDesc}
              </p>

              <div
                className={[
                  "mt-8 flex flex-wrap gap-3",
                  "transition-all duration-1000 ease-out delay-700",
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
                ].join(" ")}
              >
                <Button asChild size="lg" className="rounded-full shadow-md hover:shadow-lg">
                  <NavLink to="/visitor/search">Find a Grave</NavLink>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="rounded-full bg-slate-700 text-white hover:bg-slate-800 shadow-md hover:shadow-lg"
                >
                  <NavLink to="/visitor/search">Scan QR Code</NavLink>
                </Button>
              </div>
            </div>

            {/* Hero image callouts */}
            <div
              className={[
                "relative transition-all duration-1000 ease-out delay-200",
                isVisible
                  ? "translate-x-0 opacity-100 scale-100"
                  : "translate-x-12 opacity-0 scale-[.97]",
              ].join(" ")}
            >
              <div className="relative mx-auto max-w-lg">
                <img
                  src="/hero-image.jpg"
                  alt="Garden of Peace Cemetery"
                  className={[
                    "w-full h-auto rounded-3xl border border-slate-200 shadow-[0_40px_80px_-24px_rgba(2,6,23,.25)]",
                    "transition-all duration-1000 ease-out delay-300",
                    isVisible ? "opacity-100 scale-100" : "opacity-0 scale-[.98]",
                  ].join(" ")}
                />
                {/* callout 1 */}
                <Card
                  className={[
                    "absolute -bottom-6 -left-6 w-max",
                    "transition-all duration-800 ease-out delay-700",
                    isVisible
                      ? "translate-y-0 translate-x-0 opacity-100"
                      : "translate-y-3 -translate-x-3 opacity-0",
                  ].join(" ")}
                >
                  <CardContent className="p-4">
                    <div className="text-base text-slate-700 font-medium">
                      Interactive Navigation
                    </div>
                  </CardContent>
                </Card>
                {/* callout 2 */}
                <Card
                  className={[
                    "absolute -top-6 -right-6 w-max",
                    "transition-all duration-800 ease-out delay-800",
                    isVisible
                      ? "translate-y-0 translate-x-0 opacity-100"
                      : "-translate-y-3 translate-x-3 opacity-0",
                  ].join(" ")}
                >
                  <CardContent className="p-4">
                    <div className="text-base text-slate-700 font-medium">
                      Easy Search
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* scroll cue */}
        <div
          className={[
            "absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-1000 ease-out delay-1000",
            isVisible ? "opacity-80 translate-y-0" : "opacity-0 translate-y-3",
          ].join(" ")}
        >
          <div className="animate-bounce">
            <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-slate-400 rounded-full mt-2 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        className={[
          "bg-slate-50 py-16 lg:py-24 font-poppins transition-all duration-1000 ease-out",
          showSecondSection ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div
            className={[
              "text-center mb-14",
              "transition-all duration-700 ease-out delay-150",
              showSecondSection ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
            ].join(" ")}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Simplify Your Visit
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              A seamless, respectful experience for families visiting their loved ones—powered by
              thoughtful technology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Easy Search",
                body:
                  "Find graves quickly by searching with names, dates, or plot numbers.",
                color: "emerald",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                ),
              },
              {
                title: "QR Code Integration",
                body:
                  "Scan QR codes on markers for instant memorial info and location details.",
                color: "violet",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
                    />
                  </svg>
                ),
              },
              {
                title: "Precise Mapping",
                body: "GPS-enabled maps show the shortest, clearest path to any plot.",
                color: "blue",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7"
                    />
                  </svg>
                ),
              },
              {
                title: "Maintenance Requests",
                body:
                  "Report needs directly so staff can respond quickly and respectfully.",
                color: "rose",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"
                    />
                  </svg>
                ),
              },
            ].map((f, i) => (
              <Card
                key={f.title}
                className={[
                  "rounded-2xl shadow-sm hover:shadow-md transition-all duration-300",
                  showSecondSection ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                ].join(" ")}
                style={{ transitionDelay: showSecondSection ? `${250 + i * 100}ms` : "0ms" }}
              >
                <CardContent className="p-7">
                  <div
                    className={`w-14 h-14 rounded-2xl mb-5 grid place-items-center bg-${f.color}-100 text-${f.color}-600`}
                  >
                    {f.icon}
                  </div>
                  <CardTitle className="text-xl mb-2">{f.title}</CardTitle>
                  <p className="text-slate-600">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section
        className={[
          "bg-white py-16 lg:py-20 font-poppins transition-all duration-1000 ease-out",
          showStatsSection ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5 text-center">
            {[
              { label: "Happy Visitors", value: counters.visitors.toLocaleString() },
              { label: "Graves Mapped", value: counters.graves.toLocaleString() },
              { label: "Requests Served", value: counters.requests },
              { label: "Families Helped", value: counters.families.toLocaleString() },
              { label: "Years of Service", value: `${counters.years}+` },
            ].map((s, i) => (
              <Card
                key={s.label}
                className="shadow-sm border-slate-200 transition-all"
                style={{ transitionDelay: showStatsSection ? `${150 + i * 100}ms` : "0ms" }}
              >
                <CardContent className="py-8">
                  <div className="text-4xl lg:text-5xl font-bold text-slate-900 mb-1">
                    {s.value}
                  </div>
                  <div className="text-slate-600 font-medium">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        className={[
          "bg-slate-50 py-16 lg:py-24 font-poppins transition-all duration-1000 ease-out",
          showTestimonials ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div
            className={[
              "text-center mb-14",
              "transition-all duration-700 ease-out",
              showTestimonials ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            ].join(" ")}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              What families say about {siteName}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Hear from the families who’ve experienced the peace of mind that comes with our
              digital cemetery management system.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* slider controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCurrentTestimonial(
                  currentTestimonial === 0 ? testimonials.length - 1 : currentTestimonial - 1
                )
              }
              className="absolute left-0 z-10 rounded-full bg-white shadow-md hover:shadow-lg -translate-x-1"
              aria-label="Previous testimonial"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCurrentTestimonial(
                  currentTestimonial === testimonials.length - 1 ? 0 : currentTestimonial + 1
                )
              }
              className="absolute right-0 z-10 rounded-full bg-white shadow-md hover:shadow-lg translate-x-1"
              aria-label="Next testimonial"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Button>

            {/* track */}
            <div className="overflow-hidden w-full mx-12">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
              >
                {testimonials.map((t) => (
                  <div key={t.id} className="w-full flex-shrink-0 px-4">
                    <Card className="shadow-lg">
                      <CardContent className="p-8 text-center max-w-2xl mx-auto">
                        <Avatar className="h-16 w-16 mx-auto mb-6">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                            {t.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-lg text-slate-700 mb-6 italic leading-relaxed">
                          “{t.text}”
                        </p>
                        <Separator className="my-5" />
                        <div>
                          <div className="font-semibold text-slate-900 text-lg">{t.name}</div>
                          <div className="text-slate-600 text-sm mt-1">{t.role}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* dots */}
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestimonial(i)}
                  className={[
                    "w-3 h-3 rounded-full transition-all",
                    i === currentTestimonial ? "bg-emerald-600" : "bg-slate-300 hover:bg-slate-400",
                  ].join(" ")}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

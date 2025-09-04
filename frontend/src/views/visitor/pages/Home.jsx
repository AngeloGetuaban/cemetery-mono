import { useEffect, useState } from 'react';

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
    years: 0
  });

  const testimonials = [
    {
      id: 1,
      text: "Finding my grandmother's grave was so much easier with this system. The QR code scanning and GPS navigation saved us hours of searching.",
      name: "Maria Santos",
      role: "Family Member",
      avatar: "MS"
    },
    {
      id: 2,
      text: "The digital mapping system helped us locate our father's resting place quickly during our visit. The technology is respectful and very helpful.",
      name: "Roberto Cruz",
      role: "Visitor",
      avatar: "RC"
    },
    {
      id: 3,
      text: "As a frequent visitor, I appreciate how easy it is to report maintenance issues through the app. The staff responds quickly to our concerns.",
      name: "Carmen Delgado",
      role: "Regular Visitor",
      avatar: "CD"
    },
    {
      id: 4,
      text: "The search feature is amazing. I was able to find my uncle's grave by just typing his name. Much better than the old paper records.",
      name: "Jose Reyes",
      role: "Family Member", 
      avatar: "JR"
    }
  ];

  const targetNumbers = {
    visitors: 1247,
    graves: 892,
    requests: 156,
    families: 634,
    years: 25
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      if (scrollY > windowHeight * 0.3) {
        setShowSecondSection(true);
      }
      
      if (scrollY > windowHeight * 0.8) {
        setShowStatsSection(true);
      }
      
      if (scrollY > windowHeight * 1.2) {
        setShowTestimonials(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (showStatsSection) {
      const duration = 2000;
      const steps = 60;
      const stepTime = duration / steps;

      Object.keys(targetNumbers).forEach((key) => {
        const target = targetNumbers[key];
        const increment = target / steps;
        let current = 0;
        let step = 0;

        const timer = setInterval(() => {
          step++;
          current = Math.min(Math.round(increment * step), target);
          
          setCounters(prev => ({
            ...prev,
            [key]: current
          }));

          if (step >= steps) {
            clearInterval(timer);
          }
        }, stepTime);
      });
    }
  }, [showStatsSection]);

  useEffect(() => {
    if (showTestimonials) {
      const interval = setInterval(() => {
        setCurrentTestimonial((prev) => 
          prev === testimonials.length - 1 ? 0 : prev + 1
        );
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [showTestimonials, testimonials.length]);

  return (
    <>
      <section className="relative overflow-hidden font-poppins h-screen flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className={`transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'
            }`}>
              <h1 className={`text-4xl sm:text-5xl font-extrabold leading-tight text-slate-900 transform transition-all duration-1200 ease-out delay-200 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                Welcome to
                <br />
                <span className="text-emerald-700">Garden of Peace</span>
              </h1>

              <p className={`mt-6 text-xl text-slate-600 font-medium italic transform transition-all duration-1000 ease-out delay-400 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}>
                "Where memories bloom eternal"
              </p>

              <p className={`mt-4 text-lg text-slate-700 max-w-xl transform transition-all duration-1000 ease-out delay-600 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}>
                A sacred sanctuary where love transcends time. Our digital mapping system 
                helps you navigate with ease while honoring the cherished memories of your loved ones.
              </p>

              <div className={`mt-8 flex flex-wrap gap-3 transform transition-all duration-1000 ease-out delay-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                <button className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-white font-semibold shadow-md hover:shadow-lg hover:bg-emerald-700 hover:scale-105 transition-all duration-300 transform">
                  <span>Find a Grave</span>
                </button>
                <button className="inline-flex items-center gap-2 rounded-full bg-slate-600 px-6 py-3 text-white font-semibold shadow-md hover:shadow-lg hover:bg-slate-700 hover:scale-105 transition-all duration-300 transform">
                  <span>Scan QR Code</span>
                </button>
              </div>
            </div>

            <div className={`relative transform transition-all duration-1200 ease-out delay-300 ${
              isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95'
            }`}>
              <div className="relative mx-auto max-w-lg">
                <img 
                  src="/hero-image.jpg" 
                  alt="Garden of Peace Cemetery" 
                  className={`w-full h-auto rounded-3xl shadow-2xl border border-slate-200 transition-all duration-1000 ease-out delay-600 ${
                    isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                  }`}
                />
                
                <div className={`absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border border-slate-200 transition-all duration-800 ease-out delay-1000 hover:scale-105 hover:shadow-xl ${
                  isVisible ? 'translate-y-0 translate-x-0 opacity-100' : 'translate-y-4 -translate-x-4 opacity-0'
                }`}>
                  <div className="flex items-center gap-2 text-base text-slate-700">
                    <span className="font-medium">Interactive Navigation</span>
                  </div>
                </div>
                
                <div className={`absolute -top-6 -right-6 bg-white rounded-xl shadow-lg p-4 border border-slate-200 transition-all duration-800 ease-out delay-1200 hover:scale-105 hover:shadow-xl ${
                  isVisible ? 'translate-y-0 translate-x-0 opacity-100' : '-translate-y-4 translate-x-4 opacity-0'
                }`}>
                  <div className="flex items-center gap-2 text-base text-slate-700">
                    <span className="font-medium">Easy Search</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-1000 ease-out delay-1500 ${
          isVisible ? 'opacity-70 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="animate-bounce">
            <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-slate-400 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      <section className={`bg-slate-50 py-16 lg:py-24 font-poppins transition-all duration-1200 ease-out transform ${
        showSecondSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}>
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-1000 ease-out delay-300 ${
            showSecondSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Simplify Your Visit
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Our advanced cemetery management system provides a seamless and respectful experience for families visiting their loved ones. Navigate with confidence using modern technology designed with care and compassion.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className={`bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 ${
              showSecondSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: showSecondSection ? '500ms' : '0ms' }}>
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Easy Search</h3>
              <p className="text-slate-600">
                Find graves quickly by searching with names, dates, or plot numbers through our intuitive search system.
              </p>
            </div>

            <div className={`bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 ${
              showSecondSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: showSecondSection ? '600ms' : '0ms' }}>
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" fill="none"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 9h.01M9 12h6M9 15h6"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">QR Code Integration</h3>
              <p className="text-slate-600">
                Scan QR codes on grave markers for instant access to memorial information and location details.
              </p>
            </div>

            <div className={`bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 ${
              showSecondSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: showSecondSection ? '700ms' : '0ms' }}>
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Precise Mapping</h3>
              <p className="text-slate-600">
                Navigate cemetery grounds with GPS-enabled mapping that shows the shortest path to your destination.
              </p>
            </div>

            <div className={`bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 ${
              showSecondSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: showSecondSection ? '800ms' : '0ms' }}>
              <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Maintenance Request</h3>
              <p className="text-slate-600">
                Report maintenance needs directly through the app to ensure proper care of memorial sites.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`bg-white py-16 lg:py-20 font-poppins transition-all duration-1200 ease-out transform ${
        showStatsSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}>
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            <div className={`transition-all duration-800 ease-out ${
              showStatsSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: showStatsSection ? '200ms' : '0ms' }}>
              <div className="text-4xl lg:text-5xl font-bold text-slate-900 mb-2">
                {counters.visitors.toLocaleString()}
              </div>
              <div className="text-slate-600 font-medium">Happy Visitors</div>
            </div>

            <div className={`transition-all duration-800 ease-out ${
              showStatsSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: showStatsSection ? '300ms' : '0ms' }}>
              <div className="text-4xl lg:text-5xl font-bold text-slate-900 mb-2">
                {counters.graves.toLocaleString()}
              </div>
              <div className="text-slate-600 font-medium">Graves Mapped</div>
            </div>

            <div className={`transition-all duration-800 ease-out ${
              showStatsSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: showStatsSection ? '400ms' : '0ms' }}>
              <div className="text-4xl lg:text-5xl font-bold text-slate-900 mb-2">
                {counters.requests}
              </div>
              <div className="text-slate-600 font-medium">Requests Served</div>
            </div>

            <div className={`transition-all duration-800 ease-out ${
              showStatsSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: showStatsSection ? '500ms' : '0ms' }}>
              <div className="text-4xl lg:text-5xl font-bold text-slate-900 mb-2">
                {counters.families.toLocaleString()}
              </div>
              <div className="text-slate-600 font-medium">Families Helped</div>
            </div>

            <div className={`transition-all duration-800 ease-out ${
              showStatsSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: showStatsSection ? '600ms' : '0ms' }}>
              <div className="text-4xl lg:text-5xl font-bold text-slate-900 mb-2">
                {counters.years}+
              </div>
              <div className="text-slate-600 font-medium">Years of Service</div>
            </div>
          </div>
        </div>
      </section>

      <section className={`bg-slate-50 py-16 lg:py-24 font-poppins transition-all duration-1200 ease-out transform ${
        showTestimonials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}>
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-1000 ease-out delay-300 ${
            showTestimonials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              What families say about Garden of Peace
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Hear from the families who have experienced the peace of mind that comes with our digital cemetery management system.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="flex items-center justify-center">
              <button 
                onClick={() => setCurrentTestimonial(currentTestimonial === 0 ? testimonials.length - 1 : currentTestimonial - 1)}
                className="absolute left-0 z-10 p-2 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button 
                onClick={() => setCurrentTestimonial(currentTestimonial === testimonials.length - 1 ? 0 : currentTestimonial + 1)}
                className="absolute right-0 z-10 p-2 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="overflow-hidden w-full mx-16">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
                >
                  {testimonials.map((testimonial, index) => (
                    <div key={testimonial.id} className="w-full flex-shrink-0 px-8">
                      <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-2xl mx-auto">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                          <span className="text-emerald-700 font-semibold text-lg">
                            {testimonial.avatar}
                          </span>
                        </div>
                        <p className="text-lg text-slate-700 mb-6 italic leading-relaxed">
                          "{testimonial.text}"
                        </p>
                        <div className="border-t border-slate-100 pt-6">
                          <h4 className="font-semibold text-slate-900 text-lg">
                            {testimonial.name}
                          </h4>
                          <p className="text-slate-600 text-sm mt-1">
                            {testimonial.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial ? 'bg-emerald-600' : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
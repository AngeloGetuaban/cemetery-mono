export default function Footer() {
    return (
      <footer className="bg-slate-900 text-white font-poppins">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 lg:gap-12">
            <div className="lg:col-span-1">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-3">
                  Garden of Peace
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  A sacred sanctuary where love transcends time. Our digital mapping system helps you navigate with ease while honoring cherished memories.
                </p>
              </div>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.404-5.965 1.404-5.965s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378 0 0-.599 2.282-.744 2.840-.282 1.084-1.064 2.456-1.549 3.235C9.584 23.815 10.77 24.001 12.017 24.001c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                </a>
              </div>
            </div>
  
            <div>
              <h4 className="text-lg font-semibold text-white mb-6">Services</h4>
              <ul className="space-y-3">
                <li>
                  <a href="/visitor/search" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Search for Deceased
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    QR Code Scanning
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Interactive Mapping
                  </a>
                </li>
                <li>
                  <a href="/visitor/inquire" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Maintenance Requests
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Burial Scheduling
                  </a>
                </li>
              </ul>
            </div>
  
            <div>
              <h4 className="text-lg font-semibold text-white mb-6">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <a href="/visitor/home" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Cemetery History
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Visiting Guidelines
                  </a>
                </li>
                <li>
                  <a href="/login" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Staff Login
                  </a>
                </li>
              </ul>
            </div>
  
            <div>
              <h4 className="text-lg font-semibold text-white mb-6">Contact Info</h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <div>
                    <p className="text-slate-400 text-sm">
                      123 Memorial Drive<br />
                      Tarlac City, Philippines 2300
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <p className="text-slate-400 text-sm">+63 45 123 4567</p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <p className="text-slate-400 text-sm">info@gardenofpeace.ph</p>
                </div>
  
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div>
                    <p className="text-slate-400 text-sm">
                      Daily: 6:00 AM - 6:00 PM<br />
                      Office: Mon-Fri 8:00 AM - 5:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <div className="border-t border-slate-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
                <p className="text-slate-400 text-sm">
                  © 2025 Garden of Peace Cemetery. All rights reserved.
                </p>
                <div className="flex space-x-6">
                  <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Privacy Policy
                  </a>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 text-sm">
                    Terms of Service
                  </a>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-slate-400 text-sm">
                <span>Powered by</span>
                <span className="text-emerald-400 font-medium">Digital Cemetery Solutions</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  }
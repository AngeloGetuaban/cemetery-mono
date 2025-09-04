import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer"; 

export default function RoleLayout({ base, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Topbar />
      <div className="flex flex-1">
        <Sidebar base={base} />
        <main className="flex-1 p-4 mb-20">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}

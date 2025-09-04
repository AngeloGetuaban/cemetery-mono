import { useState } from "react";
import UniversalTable from "../../components/UniversalTable";
import { Eye, Trash2 } from "lucide-react";

export default function VisitorManagement() {
  const [rows, setRows] = useState([
    { id: 1, name: "Ana Cruz",   email: "ana@gop.ph",   visits: 5, lastVisit: "2025-08-20" },
    { id: 2, name: "Pedro Gomez",email: "pedro@gop.ph", visits: 3, lastVisit: "2025-08-25" },
    { id: 3, name: "Luisa Ramos",email: "luisa@gop.ph", visits: 7, lastVisit: "2025-09-01" },
  ]);

  const handleView = (row) => console.log("View visitor:", row);
  const handleDelete = (row) => {
    if (confirm(`Delete visitor ${row.name}?`)) {
      setRows(prev => prev.filter(r => r.id !== row.id));
    }
  };

  // same gradient IconButton style as AdminManagement
  const IconButton = ({ onClick, children, variant }) => {
    const base = "p-2 rounded-full text-white shadow-sm hover:shadow transition";
    const colors =
      variant === "primary"
        ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
        : variant === "warning"
        ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
        : "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700";
    return (
      <button onClick={onClick} className={`${base} ${colors}`} type="button">
        {children}
      </button>
    );
  };

  const columns = [
    { key: "name",     label: "Name",       width: "1.4fr" },
    { key: "email",    label: "Email",      width: "1.6fr" },
    { key: "visits",   label: "Visits",     width: "0.8fr", align: "center" },
    { key: "lastVisit",label: "Last Visit", width: "1fr"   },
    {
      key: "actions",  label: "Actions",    width: "0.7fr",
      render: (r) => (
        <div className="flex gap-2">
          <IconButton variant="primary" onClick={() => handleView(r)}>
            <Eye size={16} />
          </IconButton>
          <IconButton variant="danger" onClick={() => handleDelete(r)}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      )
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">Visitors</h1>
      <UniversalTable columns={columns} data={rows} rowKey="id" className="mt-4" />
    </div>
  );
}

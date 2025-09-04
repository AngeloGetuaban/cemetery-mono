import { useState } from "react";
import UniversalTable, { Toggle } from "../../components/UniversalTable";
import { Pencil, Trash2 } from "lucide-react";

export default function StaffManagement() {
  const [rows, setRows] = useState([
    { id: 1, name: "Maria Santos", email: "maria@gop.ph", role: "Ground Staff", active: true,  hiredAt: "2023-11-10" },
    { id: 2, name: "Juan Cruz",   email: "juan@gop.ph",  role: "Maintenance",  active: false, hiredAt: "2024-01-04" },
    { id: 3, name: "Carlos Reyes",email: "carlos@gop.ph",role: "Ticketing",    active: true,  hiredAt: "2024-06-15" },
  ]);

  const updateActive = (id, next) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, active: next } : r)));

  const handleEdit = (row) => console.log("Edit staff:", row);
  const handleDelete = (row) => {
    if (confirm(`Delete staff ${row.name}?`)) {
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
    { key: "name",    label: "Name",  width: "1.4fr" },
    { key: "email",   label: "Email", width: "1.6fr" },
    { key: "role",    label: "Role",  width: "1fr"   },
    {
      key: "active",  label: "Status", width: "1fr",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Toggle checked={!!r.active} onChange={(next) => updateActive(r.id, next)} />
          <span className="text-xs text-slate-600">{r.active ? "active" : "inactive"}</span>
        </div>
      )
    },
    { key: "hiredAt", label: "Hired", width: "1fr" },
    {
      key: "actions", label: "Actions", width: "0.7fr",
      render: (r) => (
        <div className="flex gap-2">
          <IconButton variant="warning" onClick={() => handleEdit(r)}>
            <Pencil size={16} />
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
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">Staffs</h1>
      <UniversalTable columns={columns} data={rows} rowKey="id" className="mt-4" />
    </div>
  );
}

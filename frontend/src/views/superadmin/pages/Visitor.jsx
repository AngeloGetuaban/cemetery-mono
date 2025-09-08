import { useMemo, useState, useEffect } from "react";
import UniversalTable from "../../components/UniversalTable";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import AddModal from "../../components/AddModal";
import EditModal from "../../components/EditModal";
import DetailsModal from "../../components/DetailsModal";
import { deleteUser } from "../js/delete-user";
import { addUser } from "../js/add-user";
import { getUsers } from "../js/get-users";
import { updateUser } from "../js/update-user";
import { showSuccess, showError, confirmWarning } from "../../utitlities/alerts.js";

export default function VisitorManagement() {
  const [rows, setRows] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  const genPass = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    return Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
  };

  useEffect(() => {
    (async () => {
      const result = await getUsers();
      if (result.ok) setRows(result.data.filter((u) => u.role === "visitor"));
      else console.error(result.error);
    })();
  }, []);

  const refreshUsers = async () => {
    const res = await getUsers();
    if (res.ok) setRows(res.data.filter((u) => u.role === "visitor"));
  };

  const handleView = (row) => {
    setSelected(row);
    setShowView(true);
  };

  const handleEdit = (row) => {
    setSelected(row);
    setShowEdit(true);
  };

  const handleDelete = async (row) => {
    const ok = await confirmWarning({
      title: "Delete visitor?",
      message: `This will permanently remove "${row.first_name || row.username || "this user"}".`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    const res = await deleteUser(row.id);
    if (!res.ok) {
      showError(`Delete failed: ${res.error}`, { duration: 3000 });
      return;
    }
    await refreshUsers();
    showSuccess("User deleted.", { duration: 3000 });
  };

  const columns = [
    { key: "first_name", label: "First Name" },
    { key: "last_name", label: "Last Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "username", label: "Username" },
    { key: "password_str", label: "Password" },
    {
      key: "is_active",
      label: "Active",
      render: (r) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
          }`}
        >
          {r.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleView(r)}
            className="p-2 rounded-full bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleEdit(r)}
            className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDelete(r)}
            className="p-2 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-sm"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const addFields = useMemo(
    () => [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "first_name", label: "First Name", type: "text", required: true },
      { name: "last_name", label: "Last Name", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "address", label: "Address", type: "text" },
    ],
    []
  );

  const viewFields = useMemo(
    () => [
      { name: "username", label: "Username", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "first_name", label: "First Name", type: "text" },
      { name: "last_name", label: "Last Name", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "address", label: "Address", type: "textarea" },
      { name: "password_str", label: "Password", type: "text" },
      { name: "created_at", label: "Created At", type: "datetime" },
    ],
    []
  );

  const editFields = useMemo(
    () => [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "first_name", label: "First Name", type: "text", required: true },
      { name: "last_name", label: "Last Name", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "address", label: "Address", type: "text" },
      { name: "password_str", label: "New Password (optional)", type: "password", required: false },
    ],
    []
  );

  const handleAddSubmit = async (vals) => {
    setShowAdd(false);

    const payload = {
      ...vals,
      phone: vals.phone || "",
      address: vals.address || "",
      role: "visitor",
      is_active: 1,
      password_str: genPass(),
    };

    const result = await addUser(payload);
    if (!result.ok) {
      showError(`Add failed: ${result.error}`, { duration: 3000 });
      return;
    }
    await refreshUsers();
    showSuccess("User Added Successfully", { duration: 3000 });
  };

  const handleEditSubmit = async (vals, record) => {
    setShowEdit(false);
    setSelected(null);

    const payload = {
      username: (vals.username ?? record.username)?.trim(),
      email: (vals.email ?? record.email)?.trim(),
      first_name: (vals.first_name ?? record.first_name)?.trim(),
      last_name: (vals.last_name ?? record.last_name)?.trim(),
      phone: (vals.phone ?? record.phone ?? "").trim(),
      address: (vals.address ?? record.address ?? "").trim(),
      is_active:
        typeof vals.is_active !== "undefined" ? (vals.is_active ? 1 : 0) : (record?.is_active ?? 1),
      role: "visitor",
    };

    if (Object.prototype.hasOwnProperty.call(vals, "password_str")) {
      const pwd = `${vals.password_str}`.trim();
      if (pwd.length > 0) payload.password_str = pwd;
    }

    const res = await updateUser(record.id, payload);
    if (!res.ok) {
      showError(`Update failed: ${res.error}`, { duration: 3000 });
      return;
    }
    await refreshUsers();
    showSuccess("User updated successfully.", { duration: 3000 });
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Visitors</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-white"
        >
          <Plus size={16} /> Add New
        </button>
      </div>

      <UniversalTable columns={columns} data={rows} rowKey="id" />

      <AddModal
        open={showAdd}
        title="Add Visitor"
        fields={addFields}
        submitLabel="Create"
        onSubmit={handleAddSubmit}
        onClose={() => setShowAdd(false)}
      />
      <DetailsModal
        open={showView}
        title="Visitor Details"
        fields={viewFields}
        record={selected}
        onClose={() => setShowView(false)}
      />
      <EditModal
        open={showEdit}
        title="Edit Visitor"
        fields={editFields}
        record={selected}
        submitLabel="Update"
        onSubmit={handleEditSubmit}
        onClose={() => setShowEdit(false)}
      />
    </div>
  );
}

import { useMemo, useState, useEffect } from "react";
import UniversalTable from "../../components/UniversalTable";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import AddModal from "../../components/AddModal";
import EditModal from "../../components/EditModal";
import DetailsModal from "../../components/DetailsModal";

import { addUser } from "../js/add-user";
import { getUsers } from "../js/get-users";
import { updateUser } from "../js/update-user"; // <-- new

export default function AdminManagement() {
  const [rows, setRows] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      const result = await getUsers();
      if (result.ok) setRows(result.data);
      else console.error(result.error);
    })();
  }, []);

  // Debug
  useEffect(() => {
    console.log("Modal state - showView:", showView, "selected:", selected);
  }, [showView, selected]);

  const updateActive = (id, next) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, active: next, is_active: next ? 1 : 0 } : r
      )
    );

  const handleView = (row) => {
    console.log("handleView called with row:", row);
    setSelected(row);
    setShowView(true);
  };

  const handleEdit = (row) => {
    setSelected(row);
    setShowEdit(true);
  };

  const handleDelete = (row) => {
    if (confirm(`Delete ${row.name || row.username || "this user"}?`)) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    }
  };

  const handleCloseView = () => {
    setShowView(false);
    setSelected(null);
  };

  const handleCloseEdit = () => {
    setShowEdit(false);
    setSelected(null);
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

  const genPass = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    return Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
  };

  const handleAddSubmit = async (vals) => {
    const password_str = genPass();
    const payload = {
      username: vals.username,
      email: vals.email,
      first_name: vals.first_name,
      last_name: vals.last_name,
      phone: vals.phone || "",
      address: vals.address || "",
      role: "admin",
      is_active: 1,
      password_str,
    };

    const result = await addUser(payload);
    if (!result.ok) {
      alert(`❌ Add failed: ${result.error}`);
      return;
    }

    alert(`✅ User added successfully.\nTemporary password: ${password_str}`);

    const usersRes = await getUsers();
    if (usersRes.ok) setRows(usersRes.data);

    setShowAdd(false);
  };

  const handleEditSubmit = async (vals, record) => {
    // Build update payload
    const payload = {
      username: vals.username,
      email: vals.email,
      first_name: vals.first_name,
      last_name: vals.last_name,
      phone: vals.phone || "",
      address: vals.address || "",
      // send only if user typed a new password
      ...(vals.password_str ? { password_str: vals.password_str } : {}),
      is_active: vals.is_active ? 1 : 0,
      role: record?.role || "admin",
    };

    const res = await updateUser(record.id, payload);
    if (!res.ok) {
      alert(`❌ Update failed: ${res.error}`);
      return;
    }

    alert("✅ User updated successfully.");

    // Refresh rows
    const usersRes = await getUsers();
    if (usersRes.ok) setRows(usersRes.data);

    setShowEdit(false);
    setSelected(null);
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Admins</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-white"
        >
          <Plus size={16} /> Add New
        </button>
      </div>

      <UniversalTable columns={columns} data={rows} rowKey="id" />

      {/* Add Modal */}
      <AddModal
        open={showAdd}
        title="Add Admin"
        fields={addFields}
        submitLabel="Create"
        onSubmit={handleAddSubmit}
        onClose={() => setShowAdd(false)}
      />

      {/* View Modal */}
      <DetailsModal
        open={showView}
        title="Admin Details"
        fields={viewFields}
        record={selected}
        onClose={handleCloseView}
      />

      {/* Edit Modal */}
      <EditModal
        open={showEdit}
        title="Edit Admin"
        fields={editFields}
        record={selected}
        submitLabel="Update"
        onSubmit={handleEditSubmit}
        onClose={handleCloseEdit}
      />
    </div>
  );
}

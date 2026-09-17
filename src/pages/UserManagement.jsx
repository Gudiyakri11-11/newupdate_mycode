import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useRole } from "../../src/gurds/userRole";
import api from "../Api";

export default function UserManagement() {
  const { activeRole } = useRole();
  const isAdminOrGuides = activeRole === "admin" || activeRole === "guides"; // Only admins and guides can access this page

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modals State
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'ROLE', 'PASSWORD', or 'PASSWORD_SUCCESS'
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Password Copy State
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isAdminOrGuides) fetchUsers();
  }, [isAdminOrGuides]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await api.get("/api/auth/users");
      setUsers(response.data.data || []);
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const roleMatches = roleFilter === "all" || u.realRole === roleFilter;
    const textMatches =
      (u.name || "").toLowerCase().includes(q) ||
      (u.employeeId || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q);
    return roleMatches && textMatches;
  });

  const exportUsers = () => {
    const safeRows = users.map((u) => ({
      "Employee ID": u.employeeId || "",
      Name: u.name || "",
      Email: u.email || "",
      Role: u.realRole || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(safeRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(
      workbook,
      `User_Management_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }

  const openModal = (user, type) => {

    // ✅ UI GUARD: Prevent Guides from modifying an Admin's role
    if (type === "ROLE" && user.realRole === "admin" && activeRole === "guides") {
      alert("Access Denied: You cannot change the admin access.");
      return;
    }

    setSelectedUser(user);
    setActionType(type);
    setInputValue(type === "ROLE" ? user.realRole : "");
    setTempPassword("");
    setCopied(false);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActionType(null);
    setInputValue("");
    setTempPassword("");
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmAction = async () => {
    if (actionType === "ROLE" && !inputValue.trim()) return;
    setIsProcessing(true);

    try {
      if (actionType === "ROLE") {
        await api.put(`/api/auth/update-role`, {
          employeeId: selectedUser.employeeId,
          newRole: inputValue,
        });
        alert(`Role successfully updated to ${inputValue.toUpperCase()}`);
        closeModal();
        fetchUsers();
      } else if (actionType === "PASSWORD") {
        const res = await api.put(`/api/auth/dev-reset-password`, {
          employeeId: selectedUser.employeeId,
        });

        // Instead of alerting, update the modal UI to show the copyable password
        setTempPassword(res.data.tempPassword);
        setActionType("PASSWORD_SUCCESS");
        fetchUsers();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Action failed.";
      alert(`❌ ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAdminOrGuides) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-red-600">403 - Access Denied</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
              User Management
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Admin Control Center: Elevate roles and issue temporary passwords.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white md:w-44"
              aria-label="Filter users by role"
            >
              <option value="all">All roles</option>
              <option value="user">User</option>
              <option value="guides">Guides</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Search Name or Employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={exportUsers}
              disabled={loading || users.length === 0}
              className="whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">Loading users...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">{u.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{u.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${u.realRole === 'admin' ? 'bg-purple-100 text-purple-800' :
                            u.realRole === 'moderator' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {u.realRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => openModal(u, "ROLE")}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => openModal(u, "PASSWORD")}
                          className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                        >
                          Generate Temp Password
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl p-6 border border-gray-200 dark:border-gray-700">

              {actionType === "PASSWORD_SUCCESS" ? (
                /* ================= SUCCESS SCREEN ================= */
                <div className="animate-fadeIn">
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2 flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Password Reset Successful
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Please securely share this temporary password with <strong className="text-gray-900 dark:text-white">{selectedUser.name}</strong>:
                  </p>

                  <div className="flex items-center gap-2 mb-6">
                    <input
                      type="text"
                      readOnly
                      value={tempPassword}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-lg font-mono text-gray-900 dark:text-white outline-none selection:bg-blue-200 dark:selection:bg-blue-800"
                    />
                    <button
                      onClick={handleCopyPassword}
                      className={`px-4 py-3 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap ${copied ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  <div className="flex justify-end mt-2">
                    <button
                      onClick={closeModal}
                      className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-bold transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* ================= CONFIRMATION SCREEN ================= */
                <>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {actionType === "ROLE" ? "Change User Role" : "Reset User Password"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Target User: <strong className="text-gray-900 dark:text-white">{selectedUser.name} ({selectedUser.employeeId})</strong>
                  </p>

                  {actionType === "ROLE" ? (
                    <select
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="user">User</option>
                      <option value="guides">Guides</option>
                      <option value="moderator">Moderator</option>

                      {/* ✅ Only render Admin options if the active user is an Admin */}
                      {activeRole === "admin" && (


                        <option value="admin">Admin</option>

                      )}
                    </select>
                  ) : (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                        This will instantly overwrite the user's current password with a secure temporary password.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmAction}
                      disabled={isProcessing || (actionType === "ROLE" && !inputValue.trim())}
                      className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 ${actionType === "ROLE" ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700"
                        }`}
                    >
                      {isProcessing ? "Processing..." : "Confirm Action"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

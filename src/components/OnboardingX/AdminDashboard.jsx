import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import api from "../../Api"; // ✅ Centralized Axios security wrapper

export default function AdminDashboard() {
  const { user } = useApp();

  // =========================================================================
  // State Management
  // =========================================================================
  const [isModal, setIsmodal] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);

  const [addError, setAddError] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [employeeId, setEmployeeId] = useState("");

  const [milestones, setMilestones] = useState({
    milestone1Link: "",
    milestone1Name: "",
    milestone2Link: "",
    milestone2Name: "",
    milestone3Link: "",
    milestone3Name: "",
  });

  const [milestoneLinks, setMilestoneLinks] = useState({
    milestone1Link: [],
    milestone2Link: [],
    milestone3Link: [],
  });

  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );

  // =========================================================================
  // API Calls & Effects (Aggressive Cache-Busting Applied)
  // =========================================================================

  const fetchUsers = async () => {
    if (!user?.employeeId) return;
    try {
      // 1. URL-level cache buster
      const cacheBuster = new Date().getTime();

      const baseRole = (user?.realRole || user?.role || "").toLowerCase();
      const isPrivileged = baseRole === "admin" || baseRole === "moderator";

      const endpoint = isPrivileged
        ? `/api/onboard/all-progress?_cb=${cacheBuster}`
        : `/api/onboard/getUsers?_cb=${cacheBuster}`;

      // 2. Header-level cache busters to force real-time data retrieval
      const res = await api.get(endpoint, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (res.data) {
        let dataArray = Array.isArray(res.data)
          ? res.data
          : res.data.data || [];

        const formattedUsers = dataArray.map((emp) => ({
          ...emp,
          isMapped:
            emp.isMapped !== undefined
              ? emp.isMapped
              : emp.ManagerEmployeeId != null,
        }));

        setUsers(formattedUsers);
      }
    } catch (err) {
      console.error(
        "API error while extracting dashboard metadata resources:",
        err,
      );
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user?.employeeId, user?.role, user?.realRole]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const res = await api.get(
          `/api/onboard/getCatalog?_cb=${cacheBuster}`,
          {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          },
        );
        if (res.data && res.data.success) {
          setMilestoneLinks(res.data.catalog);
        }
      } catch (error) {
        console.error("Failed to fetch course catalog:", error);
      }
    };
    fetchCatalog();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleChange = (key, value) => {
    const nameKey = key.replace("Link", "Name");
    const selectedOption = milestoneLinks[key].find(
      (opt) => opt.value === value,
    );
    const label = selectedOption ? selectedOption.label : "";

    setMilestones((prev) => ({ ...prev, [key]: value, [nameKey]: label }));
  };

  const handleOpenOnboardModal = (empId) => {
    setEmployeeId(empId);
    setAddError("");
    setMilestones({
      milestone1Link: "",
      milestone1Name: "",
      milestone2Link: "",
      milestone2Name: "",
      milestone3Link: "",
      milestone3Name: "",
    });
    setIsmodal(true);
  };

  const handleAdd = async () => {
    setAddError("");
    const payload = {
      managerEmployeeId: user?.employeeId,
      employeeId: employeeId,
      ...milestones,
    };

    try {
      const res = await api.post("/api/onboard/addUser", payload);

      if (res.status === 201 || res.data?.success) {
        setIsmodal(false);
        await fetchUsers(); // Await the fetch to ensure UI updates synchronously
      }
    } catch (error) {
      console.error("Error adding user mapping configuration:", error);
      const serverMsg =
        error.response?.data?.message ||
        "Failed to add user context profile mapping.";
      setAddError(serverMsg);
    }
  };

  const initiateRemoveUser = (empId) => {
    setRemoveTarget(empId);
  };

  const confirmRemoveUser = async () => {
    if (!removeTarget) return;

    try {
      const res = await api.post("/api/onboard/removeUser", {
        managerEmployeeId: user?.employeeId,
        employeeId: removeTarget,
      });

      if (res.status === 200 || res.data?.success) {
        // Optimistically remove from UI for instant feedback, then re-sync with server
        setUsers((prev) =>
          prev.filter((emp) => emp.EmployeeId !== removeTarget),
        );
        setRemoveTarget(null);
        await fetchUsers();
      }
    } catch (error) {
      console.error("Error removing user:", error);
      setRemoveTarget(null);
    }
  };

  // =========================================================================
  // Render Data
  // =========================================================================

  const filteredData = users.filter(
    (emp) =>
      emp.EmployeeId?.toLowerCase().includes(search.toLowerCase()) ||
      emp.TechStack?.toLowerCase().includes(search.toLowerCase()),
  );

  return isModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none"></div>

      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden tech-bracket animate-fadeIn">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              Onboard Employee
            </h2>
            <div className="h-1 w-20 bg-blue-600 dark:bg-cyan-500 rounded-full"></div>
          </div>

          <div className="space-y-6">
            {addError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-bold border border-red-100 dark:border-red-800/30">
                ⚠️ {addError}
              </div>
            )}

            <div className="bg-blue-50 dark:bg-cyan-950/30 p-4 rounded-xl border border-blue-100 dark:border-cyan-900/50">
              <p className="text-sm text-blue-900 dark:text-cyan-100 font-medium leading-relaxed">
                Assign strategic courses to complete the mandatory onboarding
                process:
              </p>
            </div>

            <div className="group">
              <label className="block mb-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Employee Serial ID
              </label>
              <input
                type="text"
                value={employeeId}
                disabled
                className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl outline-none transition-all dark:text-gray-400 cursor-not-allowed font-bold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["milestone1Link", "milestone2Link", "milestone3Link"].map(
                (key, index) => (
                  <div key={key}>
                    <label className="block mb-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Milestone {index + 1}
                    </label>
                    <div className="relative">
                      <select
                        value={milestones[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="cyber-select w-full px-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 outline-none transition-all dark:text-white cursor-pointer appearance-none"
                      >
                        <option value="">Select Course</option>
                        {milestoneLinks[key]?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="flex items-center justify-end mt-10 gap-3">
            <button
              onClick={() => setIsmodal(false)}
              className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-8 py-3 bg-blue-600 dark:bg-cyan-600 hover:bg-blue-700 dark:hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all transform active:scale-95"
            >
              Deploy Onboarding
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="fixed inset-0 bg-cyber-grid opacity-30 dark:opacity-100 pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Manage workforce onboarding and assignments.
            </p>
          </div>

          <div className="relative flex-1 md:max-w-md">
            <input
              placeholder="Search ID or Tech Stack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 outline-none transition-all dark:text-white"
            />
            <svg
              className="absolute left-3 top-3 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  {[
                    "Employee ID",
                    "Tech Stack",
                    "Location",
                    "Milestones Progress",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-20 text-center text-gray-400 dark:text-gray-600 italic"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((emp) => (
                    <tr
                      key={emp.EmployeeId}
                      className="hover:bg-blue-50/30 dark:hover:bg-cyan-900/10 transition-colors group"
                    >
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">
                        {emp.EmployeeId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">
                          {emp.TechStack}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {emp.Location}
                      </td>

                      <td className="px-6 py-4">
                        {!emp.isMapped ? (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-xs font-bold uppercase">
                            Waiting to onboard
                          </span>
                        ) : (
                          <div className="flex gap-4">
                            {[1, 2, 3].map((num) => (
                              <div
                                key={num}
                                className="flex flex-col items-center"
                              >
                                <span
                                  className={`text-[10px] font-black uppercase ${emp[`Milestone${num}Score`] >= 70 ? "text-green-500" : "text-blue-500 dark:text-cyan-500"}`}
                                >
                                  M{num}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {emp[`Milestone${num}Score`]}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {!emp.isMapped ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleOpenOnboardModal(emp.EmployeeId)
                              }
                              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                            >
                              Add User
                            </button>
                            <button
                              onClick={() => initiateRemoveUser(emp.EmployeeId)}
                              className="px-4 py-2 bg-red-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelected(emp)}
                              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs font-bold transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => initiateRemoveUser(emp.EmployeeId)}
                              className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-xs font-bold transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Profile Detail Popup */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-fadeIn">
            <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-600 dark:to-blue-600"></div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                    Profile Detail
                  </h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-cyan-500 uppercase tracking-tighter mt-1">
                    Status: Active Sync
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Employee ID
                  </span>
                  <span className="font-bold dark:text-white">
                    {selected.EmployeeId}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Tech Stack
                  </span>
                  <span className="font-bold dark:text-white">
                    {selected.TechStack}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Base Location
                  </span>
                  <span className="font-bold dark:text-white">
                    {selected.Location}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Last Synced
                  </span>
                  <span className="font-mono text-xs dark:text-gray-300">
                    {selected.LastUpdated}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl mb-8">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                  Milestone Performance
                </h4>
                <div className="space-y-3">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        M{num}
                      </span>
                      <div className="flex-1 mx-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${selected[`Milestone${num}Score`] >= 70 ? "bg-green-500" : "bg-blue-500 dark:bg-cyan-500"}`}
                          style={{
                            width: `${selected[`Milestone${num}Score`]}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs font-mono dark:text-gray-400">
                        {selected[`Milestone${num}Score`]}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="w-full py-3 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white font-bold rounded-xl transition-all hover:opacity-90"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Popup for Removal */}
      {removeTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-red-100 dark:border-red-900/30 overflow-hidden animate-fadeIn">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                Remove User?
              </h3>
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to remove{" "}
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {removeTarget}
                </span>{" "}
                from your dashboard? This action will instantly reset their
                onboarding progress.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemoveTarget(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveUser}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-95"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

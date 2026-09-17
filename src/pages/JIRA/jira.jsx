import React, { useState, useEffect } from "react";
import { useRole } from "../../gurds/userRole";
import * as XLSX from "xlsx";
import { useApp } from "../../context/AppContext";
import api from "../../Api"; 

// 📥 Global Excel Export Helper Function
const exportToExcel = (items, sheetName, fileName, getName) => {
  if (!items || items.length === 0) return;

  const exportData = items.map((item) => ({
    "Task ID": item.id,
    "Task Title": item.title,
    Status: item.status?.trim() || "Unknown",
    Assignee: getName(item.assignee) || "Unassigned",
    "Task Details": item.task_details || "N/A",
    "Created Date": item.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : "N/A",
    "Created By": getName(item.createdBy) || "N/A",
    "Started Date (In Progress)": item.inProgressDate
      ? new Date(item.inProgressDate).toLocaleString()
      : "N/A",
    "Started By": getName(item.inProgressBy) || "N/A",
    "Completed Date (End Date)": item.endDate
      ? new Date(item.endDate).toLocaleDateString()
      : "N/A",
    "Completed By": getName(item.completedBy) || "N/A",
    "Accepted Date": item.acceptedDate
      ? new Date(item.acceptedDate).toLocaleString()
      : "N/A",
    "Accepted By": getName(item.acceptedBy) || "N/A",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

export default function AdminWorkspacePage() {
  const { activeRole } = useRole();
  const { user } = useApp(); // ✅ Removed getUserById

  const currentUserEmpId = user?.employeeId || "";

  const [activeTab, setActiveTab] = useState("pipeline");
  const [items, setItems] = useState([]);
  
  // ✅ NEW: Store live database users
  const [systemUsers, setSystemUsers] = useState([]);

  // ✅ NEW: Search and Assignee states
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    details: "",
    assignees: [], // ✅ Array for multiple assignees
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ✅ NEW: Enhanced getNames strictly maps against live SQL data
  const getNames = (idString) => {
    if (!idString || idString === "System" || idString === "Unassigned")
      return idString;
    return idString
      .split(",")
      .map((id) => {
        const cleanTargetId = String(id).trim().toLowerCase();
        const foundUser = systemUsers.find(
          (u) => String(u.employee_id).trim().toLowerCase() === cleanTargetId
        );
        return foundUser?.name ? `${foundUser.name} (${id.trim()})` : id.trim();
      })
      .join(", ");
  };

  const fetchItems = async () => {
    try {
      // ✅ Fetch both tasks and users concurrently
      const [itemsRes, usersRes] = await Promise.all([
        api.get(`/api/jira/items`),
        api.get(`/api/jira/users`),
      ]);

      setSystemUsers(usersRes.data);

      const sortedItems = itemsRes.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setItems(sortedItems);
    } catch (err) {
      console.error("Error loading dashboard data", err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeRole]);

  // ✅ NEW: Filter items based on search query
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.title || "").toLowerCase().includes(q) ||
      (item.task_details || "").toLowerCase().includes(q) ||
      (item.assignee || "").toLowerCase().includes(q) ||
      (getNames(item.assignee) || "").toLowerCase().includes(q)
    );
  });

  if (activeRole !== "admin") {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        ⚠️ Unauthorized Access. This workspace is restricted to Admins only.
      </div>
    );
  }

  const closeModal = () => {
    setSelectedTask(null);
    setIsRejecting(false);
    setRejectReason("");
  };

  const handleOpenCreate = () => {
    setTaskForm({ title: "", details: "", assignees: [] });
    setAssigneeInput("");
    setIsCreateOpen(true);
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    if (!currentUserEmpId) {
      alert("Error: Your user ID is missing. Please log in again.");
      return;
    }

    try {
      await api.post(`/api/jira/items`, {
        title: taskForm.title,
        task_details: taskForm.details || null,
        assignee: taskForm.assignees.join(",") || null, 
        section: "pipeline",
      });
      setTaskForm({ title: "", details: "", assignees: [] });
      setIsCreateOpen(false);
      fetchItems();
    } catch (err) {
      console.error("Error adding item:", err);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    try {
      await api.put(`/api/jira/items/${editId}`, {
        editData: {
          title: taskForm.title,
          details: taskForm.details || null,
          assignee: taskForm.assignees.join(",") || null, 
        },
      });
      setTaskForm({ title: "", details: "", assignees: [] });
      setIsEditOpen(false);
      setEditId(null);
      fetchItems();
    } catch (err) {
      console.error("Error editing item:", err);
    }
  };

  const deleteTask = async (id) => {
    if (
      !window.confirm("Are you sure you want to permanently delete this task?")
    )
      return;
    try {
      await api.delete(`/api/jira/items/${id}`);
      setTaskForm({ title: "", details: "", assignees: [] });
      setIsEditOpen(false);
      setEditId(null);
      fetchItems();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const openEdit = (task, e) => {
    e.stopPropagation();
    setEditId(task.id);
    setTaskForm({
      title: task.title,
      details: task.task_details || "",
      assignees: task.assignee ? task.assignee.split(",").map((i) => i.trim()) : [],
    });
    setAssigneeInput("");
    setIsEditOpen(true);
  };

  const updateStatus = async (id, newStatus, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/api/jira/items/${id}`, { status: newStatus });

      const res = await api.get(`/api/jira/items`);
      const sortedItems = res.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setItems(sortedItems);

      if (selectedTask && selectedTask.id === id) {
        setSelectedTask(sortedItems.find((t) => t.id === id));
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const addNote = async (id, noteText) => {
    if (!noteText.trim()) return;
    try {
      await api.put(`/api/jira/items/${id}`, { newNote: { text: noteText } });

      const res = await api.get(`/api/jira/items`);
      const sortedItems = res.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setItems(sortedItems);

      if (selectedTask) {
        setSelectedTask(sortedItems.find((t) => t.id === id));
      }
    } catch (err) {
      console.error("Error adding note:", err);
    }
  };

  const handleAcceptTask = async (e) => {
    e.stopPropagation();
    await updateStatus(selectedTask.id, "Accepted");
    closeModal();
  };

  const handleRejectConfirm = async (e) => {
    e.stopPropagation();
    if (!rejectReason.trim()) {
      return alert("Please provide a reason for rejecting this task.");
    }

    try {
      await api.put(`/api/jira/items/${selectedTask.id}`, {
        status: "In Progress",
        newNote: { text: `❌ Task Rejected: ${rejectReason}` },
      });

      await fetchItems();
      closeModal();
    } catch (err) {
      console.error("Error rejecting task:", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800 dark:text-slate-100 relative">
      {/* 🚀 TASK MODALS (CREATE & EDIT) */}
      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {isEditOpen ? "Edit Task" : "Create New Task"}
            </h3>
            <form
              onSubmit={isEditOpen ? saveEdit : addItem}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  className="w-full border dark:border-slate-700 bg-transparent rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Task Details
                </label>
                <textarea
                  value={taskForm.details}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, details: e.target.value })
                  }
                  className="w-full border dark:border-slate-700 bg-transparent rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                />
              </div>

              {/* ✅ Multi-Assignee Input Block */}
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium">Assignees</label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assigneeInput}
                    onChange={(e) => setAssigneeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault(); 
                        if (assigneeInput.trim() && !taskForm.assignees.includes(assigneeInput.trim())) {
                          setTaskForm({ ...taskForm, assignees: [...taskForm.assignees, assigneeInput.trim()] });
                          setAssigneeInput("");
                        }
                      }
                    }}
                    placeholder="Type EMP ID and press Enter or Add"
                    className="flex-1 border dark:border-slate-700 bg-transparent rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (assigneeInput.trim() && !taskForm.assignees.includes(assigneeInput.trim())) {
                        setTaskForm({ ...taskForm, assignees: [...taskForm.assignees, assigneeInput.trim()] });
                        setAssigneeInput("");
                      }
                    }}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-sm font-bold"
                  >
                    Add
                  </button>
                </div>

                {/* ✅ Live Name Preview from systemUsers */}
                {assigneeInput && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium ml-1">
                    ↳ Preview:{" "}
                    {systemUsers.find(
                      (u) => String(u.employee_id).trim().toLowerCase() === String(assigneeInput).trim().toLowerCase()
                    )?.name || "No exact match found in directory..."}
                  </div>
                )}

                {/* Selected Assignees Tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {taskForm.assignees.map((empId, index) => {
                    const cleanId = String(empId).trim().toLowerCase();
                    const empName = systemUsers.find(
                      (u) => String(u.employee_id).trim().toLowerCase() === cleanId
                    )?.name;
                    
                    return (
                      <span key={index} className="flex items-center gap-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        {empName ? `${empName} (${empId})` : empId}
                        <button
                          type="button"
                          onClick={() => setTaskForm({
                            ...taskForm,
                            assignees: taskForm.assignees.filter((id) => id !== empId)
                          })}
                          className="hover:text-red-500 transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div
                className={`flex ${isEditOpen ? "justify-between" : "justify-end"} gap-2 pt-4 border-t dark:border-slate-700 mt-4`}
              >
                {isEditOpen && (
                  <button
                    type="button"
                    onClick={() => deleteTask(editId)}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded"
                  >
                    Delete Task
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setIsEditOpen(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                  >
                    {isEditOpen ? "Save Changes" : "Save Task"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔍 TASK DETAILS MODAL */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-slate-900 border dark:border-slate-700 p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4 border-b dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                  <span>
                    Created:{" "}
                    {selectedTask.createdAt
                      ? new Date(selectedTask.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                  <span>
                    Assignees: {getNames(selectedTask.assignee) || "Unassigned"}
                  </span>
                  <span
                    className={`font-bold ${selectedTask.status?.trim() === "Completed" ? "text-emerald-500" : "text-blue-500"}`}
                  >
                    Status: {selectedTask.status}
                  </span>

                  {selectedTask.inProgressDate && (
                    <span className="text-blue-600 dark:text-cyan-400 font-bold">
                      Started By:{" "}
                      {getNames(selectedTask.inProgressBy) || "System"} on{" "}
                      {new Date(
                        selectedTask.inProgressDate,
                      ).toLocaleDateString()}
                    </span>
                  )}

                  {(selectedTask.status?.trim() === "Completed" ||
                    selectedTask.status?.trim() === "Accepted") &&
                    selectedTask.endDate && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Completed By:{" "}
                        {getNames(selectedTask.completedBy) || "System"} on{" "}
                        {new Date(selectedTask.endDate).toLocaleDateString()}
                      </span>
                    )}

                  {selectedTask.status?.trim() === "Accepted" && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Accepted By:{" "}
                      {getNames(selectedTask.acceptedBy) || "System"}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* Review/Reject Section */}
            {selectedTask.status?.trim() === "Completed" && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-lg">
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2">
                  Review Completed Task
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-500 mb-3">
                  This task has been marked as completed. Please review the
                  details below. If the work meets all requirements, you can
                  accept and close the ticket.
                </p>

                {!isRejecting ? (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleAcceptTask}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition-colors"
                    >
                      ✓ Accept & Archive
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRejecting(true);
                      }}
                      className="bg-white dark:bg-slate-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-4 py-2 rounded text-sm font-bold shadow-sm transition-colors"
                    >
                      ✕ Reject (Send to In Progress)
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/50 rounded shadow-sm">
                    <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                      Reason for Rejection *
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explain what needs to be fixed so the assignee knows what to do..."
                      className="w-full border dark:border-slate-700 bg-transparent rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 min-h-[60px] mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRejectConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setIsRejecting(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Status Updater */}
            {selectedTask.status?.trim() !== 'Accepted' && (
              <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border dark:border-slate-700/50">
                <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Update Status</h4>
                <div className="flex flex-wrap gap-2">
                  {['In Progress', 'Completed'].map(status => (
                    <button
                      key={status}
                      onClick={(e) => updateStatus(selectedTask.id, status, e)}
                      disabled={selectedTask.status?.trim() === status}
                      className={`px-4 py-1.5 text-xs font-bold rounded shadow-sm transition-colors ${
                        selectedTask.status?.trim() === status
                          ? 'bg-blue-600 text-white cursor-default'
                          : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Description
              </h4>
              <p className="text-sm whitespace-pre-wrap">
                {selectedTask.task_details || "No description provided."}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              <NotesSection
                item={selectedTask}
                onAddNote={addNote}
                getName={getNames}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parent Council</h1>
          <p className="text-sm text-slate-500">
            Parent Council Dashboard & Project Scopes
          </p>
        </div>
        <span className="px-3 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full font-semibold uppercase">
          {activeRole} view
        </span>
      </div>

      {/* ✅ Global Search Bar */}
      <div className="mb-6 max-w-md">
        <input
          type="text"
          placeholder="Search tasks by title, description, or assignee..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-max">
        {["pipeline", "dashboard", "accepted"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize rounded-md transition-all ${
              activeTab === tab
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {tab === "pipeline"
              ? "Pipeline & Current Items"
              : tab === "dashboard"
                ? "Dashboard View"
                : tab}
          </button>
        ))}
      </div>

      {/* Active View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm min-h-[400px]">
        {activeTab === "pipeline" && (
          <PipelineView
            items={filteredItems.filter(
              (i) => !i.status || i.status.trim() === "Not Started",
            )}
            onOpenCreate={handleOpenCreate}
            onOpenEdit={openEdit}
            onOpenDetails={setSelectedTask}
            onStatusChange={updateStatus}
            onAddNote={addNote}
            getName={getNames}
          />
        )}
        {activeTab === "dashboard" && (
          <DashboardView
            items={filteredItems}
            onOpenDetails={setSelectedTask}
            getName={getNames}
          />
        )}
        {activeTab === "accepted" && (
          <AcceptedView
            items={filteredItems.filter((i) => i.status?.trim() === "Accepted")}
            onOpenDetails={setSelectedTask}
            getName={getNames}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------- 1. PIPELINE VIEW -------------------- */
function PipelineView({
  items,
  onOpenCreate,
  onOpenEdit,
  onOpenDetails,
  onStatusChange,
  getName,
}) {
  const statuses = ["Not Started", "In Progress", "Completed", "Accepted"];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold">Pipeline & Current Items</h2>
          <p className="text-xs text-slate-500 mt-1">
            All active tasks and backlog items waiting for completion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              exportToExcel(
                items,
                "Pipeline Items",
                "Pipeline_Report.xlsx",
                getName,
              )
            }
            disabled={items.length === 0}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            Export to Excel
          </button>
          <button
            onClick={onOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
          >
            + Create Task
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm p-4 text-slate-400 border border-dashed rounded text-center">
            Pipeline is empty or no match found.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenDetails(item)}
              className="p-4 border dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-colors group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{item.title}</span>
                    <button
                      onClick={(e) => onOpenEdit(item, e)}
                      className="ml-2 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-300 transition-all"
                    >
                      Edit
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 block mt-1">
                    Assignee: {getName(item.assignee)} | Added:{" "}
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "Unknown"}
                  </span>
                </div>

                <div
                  className="flex flex-wrap gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {statuses.map((status) => {
                    const isPastNotStarted =
                      item.status?.trim() !== "Not Started";
                    const isDisabled =
                      status === "Not Started" && isPastNotStarted;

                    const handleStatusClick = (e) => {
                      e.stopPropagation();
                      if (isDisabled) return;

                      if (status === "Accepted") {
                        if (item.status?.trim() !== "Completed") {
                          alert(
                            "A task must be marked as 'Completed' before it can be accepted. Please mark it Completed to unlock the review popup.",
                          );
                        } else {
                          onOpenDetails(item);
                        }
                      } else {
                        onStatusChange(item.id, status, e);
                      }
                    };

                    return (
                      <button
                        key={status}
                        onClick={handleStatusClick}
                        disabled={isDisabled}
                        className={`px-3 py-1 text-[11px] font-semibold rounded border transition-colors ${
                          item.status?.trim() === status
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                            : isDisabled
                              ? "border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-600 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30"
                              : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotesSection({ item, onAddNote, getName }) {
  const [noteText, setNoteText] = useState("");

  const handleSubmit = () => {
    onAddNote(item.id, noteText);
    setNoteText("");
  };

  return (
    <div className="mt-2 pt-2 border-t dark:border-slate-700/50">
      <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
        Task Notes & Updates
      </h4>

      <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-2">
        {item.notes && item.notes.length > 0 ? (
          item.notes.map((note) => (
            <div
              key={note.id}
              className="text-sm bg-white dark:bg-slate-900 p-2.5 rounded border dark:border-slate-700/50"
            >
              <p className="text-slate-800 dark:text-slate-200">{note.text}</p>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                — User: {getName(note.author)} on{" "}
                {new Date(note.timestamp).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 italic">No notes added yet.</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Type a progress update..."
          className="flex-1 border dark:border-slate-700 bg-white dark:bg-slate-900 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded uppercase tracking-wider text-slate-600 dark:text-slate-300"
        >
          Add
        </button>
      </div>
    </div>
  );
}

/* -------------------- 2. JIRA DASHBOARD KANBAN VIEW -------------------- */
function DashboardView({ items, onOpenDetails, getName }) {
  const columns = {
    "Not Started": items.filter((i) => !i.status || i.status?.trim() === "Not Started"),
    "In Progress": items.filter((i) => i.status?.trim() === "In Progress"),
    Completed: items.filter((i) => i.status?.trim() === "Completed"),
    Accepted: items.filter((i) => i.status?.trim() === "Accepted"),
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Board Matrix</h2>
        <button
          onClick={() =>
            exportToExcel(
              items,
              "Dashboard Kanban",
              "Dashboard_Report.xlsx",
              getName,
            )
          }
          disabled={items.length === 0}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          Export to Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-[900px]">
        {Object.entries(columns).map(([colName, colItems]) => (
          <div
            key={colName}
            className="bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 p-3 rounded-xl min-h-[300px]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-xs tracking-wide text-slate-500 uppercase">
                {colName}
              </h3>
              <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold">
                {colItems.length}
              </span>
            </div>
            <div className="space-y-2">
              {colItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenDetails(item)}
                  className="p-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded shadow-xs text-sm border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="font-medium mb-1">{item.title}</div>
                  {item.assignee && (
                    <div className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded mb-1">
                      👤 {getName(item.assignee)}
                    </div>
                  )}
                  {item.notes?.length > 0 && (
                    <div className="text-[10px] text-slate-400 truncate mt-1 italic border-t dark:border-slate-800 pt-1">
                      📝 {item.notes[item.notes.length - 1].text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- 3. ACCEPTED VIEW -------------------- */
function AcceptedView({ items, onOpenDetails, getName }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1 text-emerald-600 dark:text-emerald-400">
            Accepted & Closed Tickets
          </h2>
          <p className="text-xs text-slate-400">
            Archive of all signed-off changes completed by the council.
          </p>
        </div>

        <button
          onClick={() =>
            exportToExcel(
              items,
              "Accepted Tasks",
              "Accepted_Tasks_Report.xlsx",
              getName,
            )
          }
          disabled={items.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export to Excel
        </button>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed dark:border-slate-800 rounded-lg">
            No tickets have moved to accepted status yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenDetails(item)}
              className="p-4 border border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              <div>
                <span className="text-sm font-medium decoration-slate-400 text-slate-500 block">
                  {item.title}
                </span>
                <span className="text-xs text-emerald-600/70 block mt-1">
                  Completed by: {getName(item.assignee) || "System"} | Created:{" "}
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "Unknown"}
                </span>
                {item.acceptedDate && (
                  <span className="text-[10px] text-emerald-700/60 block mt-1 font-bold">
                    ✓ Accepted by {getName(item.acceptedBy) || "System"} on{" "}
                    {new Date(item.acceptedDate).toLocaleString()}
                  </span>
                )}
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 self-start sm:self-auto">
                {item.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
// import React, { useEffect, useState, Fragment } from "react";
// import * as XLSX from "xlsx";
// import { Dialog, Transition } from "@headlessui/react";
// import { useRole } from "../../../src/gurds/userRole"; // Adjust path if needed
// import { useApp } from "../../../src/context/AppContext"; // ✅ IMPORT USEAPP
// import api from "../../Api";


// const FIELD_CONFIG = [
//   { key: "projectId", label: "Project ID", type: "select" },
//   { key: "project", label: "Project Name", type: "select" },
//   { key: "associateId", label: "Associate ID" },
//   { key: "associateName", label: "Associate Name" },
//   { key: "mipPlanDate", label: "MIP Plan Date", type: "date" },
//   { key: "executionDate", label: "Execution Date", type: "date" },
//   { key: "action", label: "Action" },
//   {
//     key: "lever",
//     label: "Lever",
//     type: "select",
//     options: [
//       "GenAI",
//       "Lean",
//       "Non-GenAI",
//       "Optimization",
//       "Release with backfil",
//       "Others",
//     ],
//   },
//   { key: "presentGrade", label: "Present Grade" },
//   { key: "replacementGrade", label: "Replacement Grade" },
//   { key: "updatedStatus", label: "Updated Status" },
//   { key: "internalTracking", label: "Internal Tracking" },
//   { key: "optimizationCategory", label: "Optimization Category" },
// ];

// export default function OptimizationTrackerPage() {
//   // ✅ FIX: Get canAtLeast from useRole, and user from useApp
//   const { canAtLeast } = useRole();
//   const { user } = useApp();

//   const isAdmin = canAtLeast("admin");
//   const currentRole = isAdmin ? "admin" : "moderator";

//   // ✅ FIX: Grab employeeId exactly as saved in your AppContext
//   const currentUserId = String(user?.employeeId || "").trim();

//   const [records, setRecords] = useState([]);
//   const [projectList, setProjectList] = useState([]);
//   const [formData, setFormData] = useState({});
//   const [editingId, setEditingId] = useState(null);
//   const [search, setSearch] = useState("");

//   // Modal State
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [recordToDelete, setRecordToDelete] = useState(null);

//   useEffect(() => {
//     fetchRecords();
//     fetchProjectList();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [search, currentRole, currentUserId]);

//   // --- API Sync Routines ---
//   const fetchRecords = async () => {
//     try {
//       // 🔒 Secured: Dropped client query parameters; backend handles multi-tenant role routing via cookies
//       let fetchUrl = `/api/optimization`;
//       if (search) {
//         fetchUrl += `&search=${encodeURIComponent(search)}`;
//       }

//       const res = await api.get(fetchUrl);
//       const data = res.data;

//       setRecords(
//         data.map((r) => ({
//           id: r.Id || r.id,
//           projectId: r.ProjectId || r.project_id,
//           project: r.Project || r.project_name || r.project,
//           associateId: r.AssociateId || r.associate_id,
//           associateName: r.AssociateName || r.associate_name,
//           mipPlanDate: r.MipPlanDate || r.mip_plan_date,
//           executionDate: r.ExecutionDate || r.execution_date,
//           action: r.Action || r.action,
//           lever: r.Lever || r.lever,
//           presentGrade: r.PresentGrade || r.present_grade,
//           replacementGrade: r.ReplacementGrade || r.replacement_grade,
//           updatedStatus: r.UpdatedStatus || r.updated_status,
//           internalTracking: r.InternalTracking || r.internal_tracking,
//           optimizationCategory:
//             r.OptimizationCategory || r.optimization_category,
//         })),
//       );
//     } catch (e) {
//       console.error(
//         "Records download failure configuration block checkpoint:",
//         e,
//       );
//     }
//   };

//   const fetchProjectList = async () => {
//     try {
//       // 🔒 Dispatched over unified protected layout instance channel
//       const res = await api.get("/api/addproject/project-list-admin");
//       const data = res.data;

//       const normalizedProjects = data.map((p) => ({
//         ProjectId: p.ProjectId || p.project_id,
//         ProjectName: p.ProjectName || p.project_name,
//         ManagerId: p.ManagerId || p.manager_id,
//         ProxyManagerId: p.ProxyManagerId || p.proxy_manager_id,
//       }));

//       setProjectList(normalizedProjects);
//     } catch (e) {
//       console.error(e);
//     }
//   };

//   const handleEdit = (record) => {
//     setEditingId(record.id);
//     const mappedData = { ...record };
//     if (record.mipPlanDate)
//       mappedData.mipPlanDate = record.mipPlanDate.split("T")[0];
//     if (record.executionDate)
//       mappedData.executionDate = record.executionDate.split("T")[0];
//     setFormData(mappedData);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const openDeleteModal = (id) => {
//     setRecordToDelete(id);
//     setIsModalOpen(true);
//   };

//   const confirmDelete = async () => {
//     if (!recordToDelete) return;
//     try {
//       // 🔒 Dispatched over structural secure API routes to support delete verbs cleanly
//       const res = await api.delete(`/api/optimization/${recordToDelete}`);
//       if (res.status === 200 || res.data?.success) {
//         fetchRecords();
//         if (editingId === recordToDelete) {
//           setEditingId(null);
//           setFormData({});
//         }
//       }
//     } catch (e) {
//       console.error(
//         "Failure to eliminate targeted tracking sequence context profile:",
//         e,
//       );
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const url = editingId
//       ? `/api/optimization/${editingId}`
//       : `/api/optimization`;

//     try {
//       // 🔒 Dispatched over proper semantic action paths to track background modifications safely
//       if (editingId) {
//         await api.put(url, formData);
//       } else {
//         await api.post(url, formData);
//       }

//       setFormData({});
//       setEditingId(null);
//       fetchRecords();
//     } catch (err) {
//       console.error("Payload commit transmission error:", err);
//     }
//   };

//   const handleProjectSync = (name, value) => {
//     let update = { [name]: value };
//     if (name === "projectId") {
//       const match = projectList.find(
//         (p) => String(p.ProjectId) === String(value),
//       );
//       if (match) update.project = match.ProjectName;
//     } else if (name === "project") {
//       const match = projectList.find(
//         (p) => String(p.ProjectName) === String(value),
//       );
//       if (match) update.projectId = match.ProjectId;
//     }
//     setFormData((prev) => ({ ...prev, ...update }));
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (name === "projectId" || name === "project")
//       handleProjectSync(name, value);
//     else setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const downloadExcel = () => {
//     const ws = XLSX.utils.json_to_sheet(records);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Tracker");
//     XLSX.writeFile(wb, "Optimization_Report.xlsx");
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-5 font-sans text-[14px]">
//       <div className="max-w-[1600px] mx-auto">
//         {/* HEADER */}
//         <div className="flex justify-between items-center mb-5 bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
//           <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">
//             Optimization Tracker
//           </h1>
//         </div>

//         {/* FORM SECTION */}
//         <div
//           className={`p-5 rounded-lg border mb-5 shadow-sm transition-all duration-300 ${editingId ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}
//         >
//           <div className="flex justify-between mb-4 items-center">
//             <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">
//               {editingId ? "⚠️ Modify Existing Record" : "New Entry"}
//             </h2>
//             {editingId && (
//               <button
//                 type="button"
//                 onClick={() => {
//                   setEditingId(null);
//                   setFormData({});
//                 }}
//                 className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-widest"
//               >
//                 Cancel Edit
//               </button>
//             )}
//           </div>

//           <form
//             onSubmit={handleSubmit}
//             className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4"
//           >
//             {FIELD_CONFIG.map((f) => (
//               <div key={f.key} className="flex flex-col">
//                 <label className="text-[11px] font-bold text-slate-500 mb-1 ml-0.5 uppercase tracking-wide">
//                   {f.label}
//                 </label>
//                 {f.type === "select" ? (
//                   <select
//                     name={f.key}
//                     value={formData[f.key] || ""}
//                     onChange={handleChange}
//                     className="h-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
//                   >
//                     <option value="">-- Select --</option>
//                     {f.options
//                       ? f.options.map((opt) => (
//                           <option key={opt} value={opt}>
//                             {opt}
//                           </option>
//                         ))
//                       : f.key === "projectId"
//                         ? projectList.map((p) => (
//                             <option key={p.ProjectId} value={p.ProjectId}>
//                               {p.ProjectId}
//                             </option>
//                           ))
//                         : f.key === "project"
//                           ? projectList.map((p) => (
//                               <option key={p.ProjectName} value={p.ProjectName}>
//                                 {p.ProjectName}
//                               </option>
//                             ))
//                           : null}
//                   </select>
//                 ) : (
//                   <input
//                     type={f.type || "text"}
//                     name={f.key}
//                     value={formData[f.key] || ""}
//                     onChange={handleChange}
//                     className="h-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
//                   />
//                 )}
//               </div>
//             ))}
//             <div className="md:col-span-3 lg:col-span-4 flex justify-end mt-4 border-t pt-4">
//               <button
//                 type="submit"
//                 className={`px-12 py-2.5 rounded font-black text-xs shadow-md transition-all active:scale-95 text-white ${editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
//               >
//                 {editingId ? "UPDATE RECORD" : "SAVE ENTRY"}
//               </button>
//             </div>
//           </form>
//         </div>

//         {/* TABLE SECTION */}
//         <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
//           <div className="p-3 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
//             <div className="relative">
//               <input
//                 className="h-9 border border-slate-300 dark:border-slate-700 rounded-full px-10 w-80 text-xs shadow-inner bg-white dark:bg-slate-800"
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Filter by Project ID or Associate ID..."
//               />
//               <span className="absolute left-4 top-2.5 opacity-30 italic">
//                 🔍
//               </span>
//             </div>
//             <button
//               onClick={downloadExcel}
//               className="text-indigo-600 font-black text-[15px] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-2 rounded-lg transition-all tracking-tighter uppercase"
//             >
//               EXPORT EXCEL REPORT
//             </button>
//           </div>

//           <div className="overflow-x-auto max-h-[500px]">
//             <table className="w-full text-left border-collapse">
//               <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 dark:border-slate-700">
//                 <tr>
//                   {FIELD_CONFIG.map((f) => (
//                     <th key={f.key} className="px-4 py-4">
//                       {f.label}
//                     </th>
//                   ))}
//                   <th className="px-4 py-4 text-center">MANAGE</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[13px]">
//                 {records.map((r) => (
//                   <tr
//                     key={r.id}
//                     className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all group"
//                   >
//                     {FIELD_CONFIG.map((f) => (
//                       <td
//                         key={f.key}
//                         className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap group-hover:text-black dark:group-hover:text-white transition-colors"
//                       >
//                         {f.type === "date"
//                           ? r[f.key]?.split("T")[0] || "-"
//                           : r[f.key] || "-"}
//                       </td>
//                     ))}
//                     <td className="px-4 py-3 text-center whitespace-nowrap bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky right-0 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.1)]">
//                       <button
//                         className="text-indigo-600 font-bold mr-4 hover:underline transition-all"
//                         onClick={() => handleEdit(r)}
//                       >
//                         Edit
//                       </button>
//                       <button
//                         className="text-rose-500 font-bold hover:text-rose-700 transition-all"
//                         onClick={() => openDeleteModal(r.id)}
//                       >
//                         Delete
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//                 {records.length === 0 && (
//                   <tr>
//                     <td
//                       colSpan={FIELD_CONFIG.length + 1}
//                       className="px-4 py-8 text-center text-slate-500 italic"
//                     >
//                       No records found.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* DELETE MODAL */}
//       <Transition appear show={isModalOpen} as={Fragment}>
//         <Dialog
//           as="div"
//           className="relative z-50"
//           onClose={() => setIsModalOpen(false)}
//         >
//           <Transition.Child
//             as={Fragment}
//             enter="ease-out duration-300"
//             enterFrom="opacity-0"
//             enterTo="opacity-100"
//             leave="ease-in duration-200"
//             leaveFrom="opacity-100"
//             leaveTo="opacity-0"
//           >
//             <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
//           </Transition.Child>
//           <div className="fixed inset-0 overflow-y-auto">
//             <div className="flex min-h-full items-center justify-center p-4 text-center">
//               <Transition.Child
//                 as={Fragment}
//                 enter="ease-out duration-300"
//                 enterFrom="opacity-0 scale-95"
//                 enterTo="opacity-100 scale-100"
//                 leave="ease-in duration-200"
//                 leaveFrom="opacity-100 scale-100"
//                 leaveTo="opacity-0 scale-95"
//               >
//                 <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800">
//                   <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 mb-5">
//                     <span className="text-2xl">🗑️</span>
//                   </div>
//                   <Dialog.Title
//                     as="h3"
//                     className="text-xl font-bold leading-6 text-slate-900 dark:text-white text-center"
//                   >
//                     Delete Record?
//                   </Dialog.Title>
//                   <div className="mt-3">
//                     <p className="text-sm text-slate-500 text-center">
//                       Are you sure you want to remove this project entry? This
//                       action is permanent and cannot be undone.
//                     </p>
//                   </div>
//                   <div className="mt-8 flex gap-3">
//                     <button
//                       type="button"
//                       className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
//                       onClick={() => setIsModalOpen(false)}
//                     >
//                       Go Back
//                     </button>
//                     <button
//                       type="button"
//                       className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/30 hover:bg-rose-700 transition-all"
//                       onClick={confirmDelete}
//                     >
//                       Yes, Delete
//                     </button>
//                   </div>
//                 </Dialog.Panel>
//               </Transition.Child>
//             </div>
//           </div>
//         </Dialog>
//       </Transition>
//     </div>
//   );
// }


import React, { useEffect, useState, Fragment } from "react";
import * as XLSX from "xlsx";
import { Dialog, Transition } from "@headlessui/react";
import { useRole } from "../../../src/gurds/userRole"; 
import { useApp } from "../../../src/context/AppContext";
import api from "../../Api";

const FIELD_CONFIG = [
  { key: "projectId", label: "Project ID", type: "select" },
  { key: "project", label: "Project Name", type: "select" },
  { key: "associateId", label: "Associate ID" },
  { key: "associateName", label: "Associate Name" },
  { key: "mipPlanDate", label: "MIP Plan Date", type: "date" },
  { key: "executionDate", label: "Execution Date", type: "date" },
  { key: "action", label: "Action" },
  {
    key: "lever",
    label: "Lever",
    type: "select",
    options: [
      "GenAI",
      "Lean",
      "Non-GenAI",
      "Optimization",
      "Release with backfil",
      "Others",
    ],
  },
  { key: "presentGrade", label: "Present Grade" },
  { key: "replacementGrade", label: "Replacement Grade" },
  { key: "updatedStatus", label: "Updated Status" },
  { key: "internalTracking", label: "Internal Tracking" },
  { key: "optimizationCategory", label: "Optimization Category" },
];

export default function OptimizationTrackerPage() {
  const { canAtLeast } = useRole();
  const { user, activeRole } = useApp(); // ✅ Extracted activeRole directly

  // 🛡️ SECURITY BLOCK: Prevent standard users from rendering the UI entirely
  if (activeRole === "user") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="p-10 text-center text-rose-500 font-bold bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-rose-200 dark:border-rose-900/50">
          <span className="text-4xl block mb-4">🚨</span>
          Access Denied. Admins and Moderators only.
        </div>
      </div>
    );
  }

  const currentUserId = String(user?.employeeId || "").trim();

  const [records, setRecords] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ type: "", message: "" });

  // 📉 PERFORMANCE FIX 1: Fetch Project List ONLY ONCE when the component mounts
  useEffect(() => {
    fetchProjectList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole, currentUserId]);

  // 📉 PERFORMANCE FIX 2: Debounced Search (Waits 300ms before hitting the DB)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRecords();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeRole, currentUserId]);

  // --- API Sync Routines ---
  const fetchRecords = async () => {
    try {
      let fetchUrl = `/api/optimization`;
      
      // 🚨 CRITICAL BUG FIX: Changed '&' to '?' for the initial query parameter
      if (search) {
        fetchUrl += `?search=${encodeURIComponent(search)}`;
      }

      const res = await api.get(fetchUrl);
      const data = res.data;

      setRecords(
        data.map((r) => ({
          id: r.Id || r.id,
          projectId: r.ProjectId || r.project_id,
          project: r.Project || r.project_name || r.project,
          associateId: r.AssociateId || r.associate_id,
          associateName: r.AssociateName || r.associate_name,
          mipPlanDate: r.MipPlanDate || r.mip_plan_date,
          executionDate: r.ExecutionDate || r.execution_date,
          action: r.Action || r.action,
          lever: r.Lever || r.lever,
          presentGrade: r.PresentGrade || r.present_grade,
          replacementGrade: r.ReplacementGrade || r.replacement_grade,
          updatedStatus: r.UpdatedStatus || r.updated_status,
          internalTracking: r.InternalTracking || r.internal_tracking,
          optimizationCategory: r.OptimizationCategory || r.optimization_category,
        }))
      );
    } catch (e) {
      console.error("Records download failure configuration block checkpoint:", e);
    }
  };

  const fetchProjectList = async () => {
    try {
      const res = await api.get("/api/addproject/project-list-admin");
      const data = res.data;

      const normalizedProjects = data.map((p) => ({
        ProjectId: p.ProjectId || p.project_id,
        ProjectName: p.ProjectName || p.project_name,
        ManagerId: p.ManagerId || p.manager_id,
        ProxyManagerId: p.ProxyManagerId || p.proxy_manager_id,
      }));

      setProjectList(normalizedProjects);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    const mappedData = { ...record };
    if (record.mipPlanDate) mappedData.mipPlanDate = record.mipPlanDate.split("T")[0];
    if (record.executionDate) mappedData.executionDate = record.executionDate.split("T")[0];
    setFormData(mappedData);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDeleteModal = (id) => {
    setRecordToDelete(id);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      const res = await api.delete(`/api/optimization/${recordToDelete}`);
      if (res.status === 200 || res.data?.success) {
        fetchRecords();
        if (editingId === recordToDelete) {
          setEditingId(null);
          setFormData({});
        }
        setIsModalOpen(false); // 🐛 UX BUG FIX: Close the modal on successful deletion!
      }
    } catch (e) {
      console.error("Failure to eliminate targeted tracking sequence context profile:", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId ? `/api/optimization/${editingId}` : `/api/optimization`;

    try {
      if (editingId) {
        await api.put(url, formData);
      } else {
        await api.post(url, formData);
      }

      setFormData({});
      setEditingId(null);
      fetchRecords();
    } catch (err) {
      console.error("Payload commit transmission error:", err);
    }
  };

  const handleProjectSync = (name, value) => {
    let update = { [name]: value };
    if (name === "projectId") {
      const match = projectList.find((p) => String(p.ProjectId) === String(value));
      if (match) update.project = match.ProjectName;
    } else if (name === "project") {
      const match = projectList.find((p) => String(p.ProjectName) === String(value));
      if (match) update.projectId = match.ProjectId;
    }
    setFormData((prev) => ({ ...prev, ...update }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "projectId" || name === "project") handleProjectSync(name, value);
    else setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tracker");
    XLSX.writeFile(wb, "Optimization_Report.xlsx");
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        projectId: "PROJ001",
        project: "Sample Project Name",
        associateId: "EMP123",
        associateName: "John Doe",
        mipPlanDate: "2026-08-24",
        executionDate: "2026-08-25",
        action: "Resource Optimization",
        lever: "GenAI",
        presentGrade: "L3",
        replacementGrade: "L2",
        updatedStatus: "Completed",
        internalTracking: "Track-001",
        optimizationCategory: "Cost Reduction",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "MIP_Upload_Template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadStatus({ type: "", message: "" });
    }
  };

  const processExcelUpload = async () => {
    if (!uploadFile) {
      setUploadStatus({ type: "error", message: "Please select a file first." });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          if (data.length === 0) {
            setUploadStatus({ type: "error", message: "Excel file is empty." });
            return;
          }

          // Validate and upload records
          let successCount = 0;
          let errorCount = 0;
          const errors = [];

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
              const payload = {
                projectId: row.projectId || row.ProjectId || row.project_id,
                project: row.project || row.Project || row.project_name,
                associateId: row.associateId || row.AssociateId || row.associate_id,
                associateName: row.associateName || row.AssociateName || row.associate_name,
                mipPlanDate: row.mipPlanDate || row.MipPlanDate || row.mip_plan_date,
                executionDate: row.executionDate || row.ExecutionDate || row.execution_date,
                action: row.action || row.Action,
                lever: row.lever || row.Lever,
                presentGrade: row.presentGrade || row.PresentGrade || row.present_grade,
                replacementGrade: row.replacementGrade || row.ReplacementGrade || row.replacement_grade,
                updatedStatus: row.updatedStatus || row.UpdatedStatus || row.updated_status,
                internalTracking: row.internalTracking || row.InternalTracking || row.internal_tracking,
                optimizationCategory: row.optimizationCategory || row.OptimizationCategory || row.optimization_category,
              };

              await api.post("/api/optimization", payload);
              successCount++;
            } catch (err) {
              errorCount++;
              errors.push(`Row ${i + 2}: ${err.response?.data?.message || err.message}`);
            }
          }

          if (errorCount === 0) {
            setUploadStatus({
              type: "success",
              message: `✅ Successfully uploaded ${successCount} records!`,
            });
          } else {
            setUploadStatus({
              type: "warning",
              message: `⚠️ Uploaded ${successCount} records. ${errorCount} failed. ${errors.slice(0, 3).join("; ")}`,
            });
          }

          fetchRecords();
          setUploadFile(null);
        } catch (parseError) {
          setUploadStatus({
            type: "error",
            message: "Failed to parse Excel file. Please check the format.",
          });
        }
      };
      reader.readAsBinaryString(uploadFile);
    } catch (error) {
      setUploadStatus({ type: "error", message: "Upload failed. Please try again." });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-5 font-sans text-[14px]">
      <div className="max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-5 bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">
            Optimization Tracker
          </h1>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-md transition-all active:scale-95 text-sm uppercase tracking-wide"
          >
            📤 Mass Upload Excel
          </button>
        </div>

        {/* FORM SECTION */}
        <div
          className={`p-5 rounded-lg border mb-5 shadow-sm transition-all duration-300 ${editingId ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}
        >
          <div className="flex justify-between mb-4 items-center">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">
              {editingId ? "⚠️ Modify Existing Record" : "New Entry"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({});
                }}
                className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {FIELD_CONFIG.map((f) => (
              <div key={f.key} className="flex flex-col">
                <label className="text-[11px] font-bold text-slate-500 mb-1 ml-0.5 uppercase tracking-wide">
                  {f.label}
                </label>
                {f.type === "select" ? (
                  <select
                    name={f.key}
                    value={formData[f.key] || ""}
                    onChange={handleChange}
                    className="h-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="">-- Select --</option>
                    {f.options
                      ? f.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))
                      : f.key === "projectId"
                        ? projectList.map((p) => (
                            <option key={p.ProjectId} value={p.ProjectId}>
                              {p.ProjectId}
                            </option>
                          ))
                        : f.key === "project"
                          ? projectList.map((p) => (
                              <option key={p.ProjectName} value={p.ProjectName}>
                                {p.ProjectName}
                              </option>
                            ))
                          : null}
                  </select>
                ) : (
                  <input
                    type={f.type || "text"}
                    name={f.key}
                    value={formData[f.key] || ""}
                    onChange={handleChange}
                    className="h-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                )}
              </div>
            ))}
            <div className="md:col-span-3 lg:col-span-4 flex justify-end mt-4 border-t pt-4">
              <button
                type="submit"
                className={`px-12 py-2.5 rounded font-black text-xs shadow-md transition-all active:scale-95 text-white ${editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {editingId ? "UPDATE RECORD" : "SAVE ENTRY"}
              </button>
            </div>
          </form>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-3 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <div className="relative">
              <input
                className="h-9 border border-slate-300 dark:border-slate-700 rounded-full px-10 w-80 text-xs shadow-inner bg-white dark:bg-slate-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by Project ID or Associate ID..."
              />
              <span className="absolute left-4 top-2.5 opacity-30 italic">
                🔍
              </span>
            </div>
            <button
              onClick={downloadExcel}
              className="text-indigo-600 font-black text-[15px] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-2 rounded-lg transition-all tracking-tighter uppercase"
            >
              EXPORT EXCEL REPORT
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {FIELD_CONFIG.map((f) => (
                    <th key={f.key} className="px-4 py-4">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-4 py-4 text-center">MANAGE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[13px]">
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all group"
                  >
                    {FIELD_CONFIG.map((f) => (
                      <td
                        key={f.key}
                        className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap group-hover:text-black dark:group-hover:text-white transition-colors"
                      >
                        {f.type === "date"
                          ? r[f.key]?.split("T")[0] || "-"
                          : r[f.key] || "-"}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center whitespace-nowrap bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky right-0 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.1)]">
                      <button
                        className="text-indigo-600 font-bold mr-4 hover:underline transition-all"
                        onClick={() => handleEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-rose-500 font-bold hover:text-rose-700 transition-all"
                        onClick={() => openDeleteModal(r.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td
                      colSpan={FIELD_CONFIG.length + 1}
                      className="px-4 py-8 text-center text-slate-500 italic"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 mb-5">
                    <span className="text-2xl">🗑️</span>
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-slate-900 dark:text-white text-center"
                  >
                    Delete Record?
                  </Dialog.Title>
                  <div className="mt-3">
                    <p className="text-sm text-slate-500 text-center">
                      Are you sure you want to remove this project entry? This
                      action is permanent and cannot be undone.
                    </p>
                  </div>
                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Go Back
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/30 hover:bg-rose-700 transition-all"
                      onClick={confirmDelete}
                    >
                      Yes, Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* UPLOAD MODAL */}
      <Transition appear show={isUploadModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsUploadModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-5">
                    <span className="text-2xl">📊</span>
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-slate-900 dark:text-white text-center mb-6"
                  >
                    Mass Upload Excel Data
                  </Dialog.Title>

                  {/* Instructions */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                      <span>📋</span> Excel Format Instructions:
                    </h4>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-6 list-decimal">
                      <li>Download the template below to see the required column headers</li>
                      <li>
                        <strong>Required columns:</strong> projectId, project, associateId, associateName, 
                        mipPlanDate, executionDate, action, lever, presentGrade, replacementGrade, 
                        updatedStatus, internalTracking, optimizationCategory
                      </li>
                      <li><strong>Date format:</strong> Use YYYY-MM-DD (e.g., 2026-08-24)</li>
                      <li><strong>Lever options:</strong> GenAI, Lean, Non-GenAI, Optimization, Release with backfil, Others</li>
                      <li>Do not modify column headers - they must match exactly</li>
                      <li>Remove the sample row before uploading your data</li>
                    </ol>
                  </div>

                  {/* Download Template Button */}
                  <div className="flex justify-center mb-6">
                    <button
                      onClick={downloadTemplate}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-md transition-all active:scale-95 text-sm uppercase"
                    >
                      ⬇️ Download Template
                    </button>
                  </div>

                  {/* File Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Select Excel File:
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900/50"
                    />
                    {uploadFile && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Selected: <strong>{uploadFile.name}</strong>
                      </p>
                    )}
                  </div>

                  {/* Status Message */}
                  {uploadStatus.message && (
                    <div
                      className={`mb-6 p-4 rounded-lg ${
                        uploadStatus.type === "success"
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                          : uploadStatus.type === "warning"
                            ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                            : "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                      }`}
                    >
                      <p className="text-sm font-medium">{uploadStatus.message}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      onClick={() => {
                        setIsUploadModalOpen(false);
                        setUploadFile(null);
                        setUploadStatus({ type: "", message: "" });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={processExcelUpload}
                      disabled={!uploadFile}
                    >
                      Upload & Process
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
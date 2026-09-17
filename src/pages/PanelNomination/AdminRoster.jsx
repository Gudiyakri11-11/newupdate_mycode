// import React, { useState, useEffect } from "react";
// import * as XLSX from "xlsx";
// import { useApp } from "../../context/AppContext";
// import api from "../../Api";

// const api_url = import.meta.env.VITE_API_URL;

// const AdminRoster = () => {
//   const { user } = useApp();
//   const todayObj = new Date();
//   const TODAY_STR = todayObj.toLocaleDateString("en-CA");

//   const [masterList, setMasterList] = useState([]);
//   const [expandedRow, setExpandedRow] = useState(null);
//   const [selectedAdminDate, setSelectedAdminDate] = useState(null);
//   const [isExporting, setIsExporting] = useState(false);

//   // --- Search & Pagination State ---
//   const [search, setSearch] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const pageSize = 4;

//   useEffect(() => {
//     fetchMasterList();
//   }, []);

//   const fetchMasterList = async () => {
//     try {
//       const cacheBuster = Date.now();
//       // 🔒 Switched to slot-bookings to get both nominations and their reservations
//       const res = await api.get(
//         `/api/panel/admin/slot-bookings?_t=${cacheBuster}`,
//       );

//       if (res.data && res.data.success) {
//         setMasterList(res.data.data);
//       }
//     } catch (err) {
//       console.error("Failed to fetch secure master panel inventory list:", err);
//     }
//   };

//   const handleExpandRow = (empId) => {
//     if (expandedRow === empId) {
//       setExpandedRow(null);
//       setSelectedAdminDate(null);
//     } else {
//       setExpandedRow(empId);
//       setSelectedAdminDate(null);
//     }
//   };

//   // --- Horizontal Calendar Logic ---
//   const getRollingDates = () => {
//     const today = new Date();
//     const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

//     // Calculate days remaining to reach the Sunday of the *next* week
//     const daysToFirstSunday = currentDay === 0 ? 0 : 14 - currentDay;
//     const totalDays = daysToFirstSunday + 7;

//     const dates = [];
//     for (let i = 0; i <= totalDays; i++) {
//       const d = new Date(today);
//       d.setDate(today.getDate() + i);
//       dates.push(d.toLocaleDateString("en-CA"));
//     }
//     return dates;
//   };

//   const visibleDates = getRollingDates();

//   // --- Excel Export (Fetches Audits in Background) ---
//   const handleExportExcel = async () => {
//     try {
//       setIsExporting(true);
//       const cacheBuster = Date.now();

//       // const sheet1Data = masterList.map((row) => {
//       //   let slotsString = "None";
//       //   try {
//       //     const parsedSlots = JSON.parse(row.booked_slots || "[]");
//       //     if (parsedSlots.length > 0) {
//       //       slotsString = parsedSlots
//       //         .map((s) => `${s.date} [${s.time}]`)
//       //         .join("; ");
//       //     }
//       //   } catch (e) { }

//       //   return {
//       //     Name: row.name,
//       //     "Employee ID": row.employeeId,
//       //     Grade: row.grade,
//       //     Location: row.location,
//       //     "Contact No": row.contactNo,
//       //     "Customer Account": row.parentCustomer,
//       //     "Skill Set Focus": row.interviewSkills,
//       //     "Booked Slots (Date & Time)": slotsString,
//       //   };

//       const sheet1Data = masterList.map((row) => {
//         let slotsString = "None";
//         try {
//           const parsedSlots = JSON.parse(row.booked_slots || "[]");
//           if (parsedSlots.length > 0) {
//             slotsString = parsedSlots.map((s) => {
//               // Check for leave status and format it nicely for the Excel sheet
//               if (s.time === "LEAVE") {
//                 return `${s.date} [On Leave]`;
//               }
//               return `${s.date} [${s.time}]`;
//             }).join("; ");
//           }
//         } catch (e) { }

//         return {
//           Name: row.name,
//           "Employee ID": row.employeeId,
//           Grade: row.grade,
//           Location: row.location,
//           "Contact No": row.contactNo,
//           "Customer Account": row.parentCustomer,
//           "Skill Set Focus": row.interviewSkills,
//           "Booked Slots (Date & Time)": slotsString,
//         };
//       });




//       // 🔒 Map audit logs across parallel matching secure API paths
//       const auditPromises = masterList.map((emp) =>
//         api
//           .get(`/api/panel/admin/audit/${emp.employeeId}?_t=${cacheBuster}`)
//           .then((res) => res.data)
//           .catch(() => null),
//       );

//       const auditsResults = await Promise.all(auditPromises);
//       const sheet2Data = [];

//       masterList.forEach((row, index) => {
//         const auditData = auditsResults[index];
//         if (
//           auditData &&
//           auditData.success &&
//           auditData.logs &&
//           auditData.logs.length > 0
//         ) {
//           const latestLog = auditData.logs[0];
//           let oldStr = "None",
//             newStr = "None",
//             addedStr = "None",
//             removedStr = "None";

//           try {
//             let oldSlots = JSON.parse(latestLog.OldSlots || "[]");
//             let newSlots = JSON.parse(latestLog.NewSlots || "[]");
//             if (!Array.isArray(oldSlots)) oldSlots = [];
//             if (!Array.isArray(newSlots)) newSlots = [];

//             if (oldSlots.length > 0)
//               oldStr = oldSlots.map((s) => `${s.date} [${s.time}]`).join("; ");
//             if (newSlots.length > 0)
//               newStr = newSlots.map((s) => `${s.date} [${s.time}]`).join("; ");

//             const oldSet = new Set(
//               oldSlots.map(
//                 (s) => `${(s.date || "").trim()} [${(s.time || "").trim()}]`,
//               ),
//             );
//             const newSet = new Set(
//               newSlots.map(
//                 (s) => `${(s.date || "").trim()} [${(s.time || "").trim()}]`,
//               ),
//             );

//             const added = [...newSet].filter((x) => !oldSet.has(x));
//             const removed = [...oldSet].filter((x) => !newSet.has(x));

//             if (added.length > 0) addedStr = added.join("; ");
//             if (removed.length > 0) removedStr = removed.join("; ");
//           } catch (e) { }

//           sheet2Data.push({
//             Name: row.name,
//             "Employee ID": row.employeeId,
//             "Action Date": new Date(latestLog.ModifiedAt).toLocaleString(),
//             "Old Slots": oldStr,
//             "New Slots": newStr,
//             "Added Slots": addedStr,
//             "Removed Slots": removedStr,
//           });
//         }
//       });

//       if (sheet2Data.length === 0)
//         sheet2Data.push({ Message: "No historical changes found." });

//       const workbook = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(
//         workbook,
//         XLSX.utils.json_to_sheet(sheet1Data),
//         "Master Panel List",
//       );
//       XLSX.utils.book_append_sheet(
//         workbook,
//         XLSX.utils.json_to_sheet(sheet2Data),
//         "Recent Modification",
//       );

//       XLSX.writeFile(workbook, `Master_Roster_${TODAY_STR}.xlsx`);
//     } catch (error) {
//       console.error("Error generating Excel:", error);
//       alert("Failed to export Excel file.");
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   // --- Search & Pagination Logic ---
//   const filteredList = masterList.filter(
//     (emp) =>
//       emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
//       emp.name.toLowerCase().includes(search.toLowerCase()),
//   );
//   const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
//   const paginatedData = filteredList.slice(
//     (currentPage - 1) * pageSize,
//     currentPage * pageSize,
//   );

//   return (
//     <div className="max-w-7xl mx-auto p-4 font-sans text-gray-800 animation-fadeIn">
//       <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
//         <div className="bg-gray-900 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
//           <div>
//             <h2 className="text-xl font-bold text-white">Master Roster</h2>
//             <p className="text-gray-400 text-xs">
//               Viewing all active panel associates.
//             </p>
//           </div>

//           <div className="flex items-center gap-4 w-full md:w-auto">
//             <input
//               type="text"
//               placeholder="Search Employee ID or Name..."
//               value={search}
//               onChange={(e) => {
//                 setSearch(e.target.value);
//                 setCurrentPage(1);
//               }}
//               className="px-4 py-2 w-full md:w-64 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 outline-none focus:border-blue-500 text-sm"
//             />
//             <button
//               onClick={handleExportExcel}
//               disabled={isExporting || masterList.length === 0}
//               className="px-4 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 whitespace-nowrap"
//             >
//               {isExporting ? "⏳ Exporting..." : "📥 Download Excel"}
//             </button>
//           </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
//             <thead>
//               <tr className="bg-gray-100 text-gray-700">
//                 <th className="p-4 font-bold border-b-2 border-gray-300">Name</th>
//                 <th className="p-4 font-bold border-b-2 border-gray-300">Emp ID</th>
//                 <th className="p-4 font-bold border-b-2 border-gray-300">Grade</th>
//                 <th className="p-4 font-bold border-b-2 border-gray-300">Location</th>
//                 <th className="p-4 font-bold border-b-2 border-gray-300">Customer Account</th>
//                 <th className="p-4 font-bold border-b-2 border-gray-300">Skill Set Focus</th>
//                 <th className="p-4 font-bold border-b-2 border-gray-300 text-right">Schedule</th>
//               </tr>
//             </thead>
//             <tbody>
//               {paginatedData.length === 0 ? (
//                 <tr>
//                   <td colSpan="7" className="p-8 text-center text-gray-500">
//                     No records found.
//                   </td>
//                 </tr>
//               ) : (
//                 paginatedData.map((row, index) => {
//                   let parsedSlots = [];
//                   try {
//                     parsedSlots = JSON.parse(row.booked_slots || "[]");
//                   } catch (e) { }

//                   // Get this user's specific reservations
//                   const userReservations = row.reservations || [];

//                   return (
//                     <React.Fragment key={row.NominationId}>
//                       <tr className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
//                         <td className="p-4 border-b border-gray-200 font-semibold text-gray-800">{row.name}</td>
//                         <td className="p-4 border-b border-gray-200 text-gray-600">{row.employeeId}</td>
//                         <td className="p-4 border-b border-gray-200 text-gray-700">{row.grade}</td>
//                         <td className="p-4 border-b border-gray-200 text-gray-700">{row.location}</td>
//                         <td className="p-4 border-b border-gray-200 text-gray-800">{row.parentCustomer}</td>
//                         <td className="p-4 border-b border-gray-200 text-blue-700 font-medium whitespace-normal min-w-[150px]">
//                           {row.interviewSkills}
//                         </td>
//                         <td className="p-4 border-b border-gray-200 text-right">
//                           <button
//                             onClick={() => handleExpandRow(row.employeeId)}
//                             className="px-4 py-2 bg-blue-50 border border-blue-200 rounded shadow-sm text-blue-700 font-bold hover:bg-blue-100 transition-colors"
//                           >
//                             {expandedRow === row.employeeId ? "Close Calendar" : "View Schedule"}
//                           </button>
//                         </td>
//                       </tr>

//                       {expandedRow === row.employeeId && (
//                         <tr>
//                           <td colSpan="7" className="p-0 border-b border-gray-300 bg-gray-100 shadow-inner">
//                             <div className="p-6 border-l-4 border-blue-500 m-4 bg-white rounded shadow-sm">
//                               <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-widest">
//                                 Active Schedule Calendar
//                               </h4>

//                               {/* --- Horizontal Calendar View --- */}
//                               <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
//                                 {visibleDates.map((d) => {
//                                   // Distinguish between leave days and normal availability days
//                                   const isLeaveDay = parsedSlots.some((s) => s.date === d && s.time === "LEAVE");
//                                   const hasNormalSlots = parsedSlots.some((s) => s.date === d && s.time !== "LEAVE");
//                                   const isSelected = selectedAdminDate === d;

//                                   return (
//                                     <button
//                                       key={d}
//                                       onClick={() => setSelectedAdminDate(d)}
//                                       className={`
//         flex-shrink-0 flex flex-col items-center justify-center p-2 mt-2 rounded-xl border-2 w-10 transition-all
//         ${isLeaveDay
//                                           ? "bg-rose-500 border-rose-600 text-white shadow-md" // 🔴 Red for Leave
//                                           : hasNormalSlots
//                                             ? "bg-blue-500 border-blue-600 text-white shadow-md" // 🔵 Blue for Normal Availability
//                                             : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100" // ⚪ Blank
//                                         }
//         ${isSelected ? "ring-2 ring-offset-2 ring-blue-500 transform scale-105" : ""}
//       `}
//                                     >
//                                       <span className="text-[10px] uppercase font-bold opacity-80">
//                                         {new Date(d).toLocaleDateString("en-US", { weekday: "short" })}
//                                       </span>
//                                       <span className="text-xl font-black">{d.split("-")[2]}</span>
//                                     </button>
//                                   );
//                                 })}
//                               </div>

//                               {/* --- Display Time Slots for Selected Date --- */}
//                               {selectedAdminDate && (
//                                 <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center gap-4 animation-fadeIn">
//                                   <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
//                                     Slots for {selectedAdminDate}:
//                                   </span>

//                                   <div className="flex flex-wrap gap-2">
//                                     {(() => {
//                                       const dateSlots = parsedSlots.filter((s) => s.date === selectedAdminDate);
//                                       const isLeave = dateSlots.some((s) => s.time === "LEAVE");

//                                       if (dateSlots.length === 0) {
//                                         return (
//                                           <span className="text-sm text-gray-500 italic">
//                                             No slots nominated on this day.
//                                           </span>
//                                         );
//                                       }

//                                       // 👉 NEW: Catch the leave status and render a single Out of Office badge
//                                       if (isLeave) {
//                                         return (
//                                           <span className="px-4 py-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded text-sm font-black shadow-sm">
//                                             🏖️ Out of Office / On Leave
//                                           </span>
//                                         );
//                                       }

//                                       // Otherwise, map normal times
//                                       return dateSlots.map((s, i) => {
//                                         // Check if this specific slot is reserved
//                                         const reservationData = userReservations.find(
//                                           (r) => r.date === s.date && r.time === s.time
//                                         );
//                                         const isReserved = !!reservationData;

//                                         return (
//                                           <span
//                                             key={i}
//                                             title={
//                                               isReserved
//                                                 ? `Reserved by ${reservationData.reserved_by_name} (${reservationData.reserved_by_id})`
//                                                 : "Available (Nominated)"
//                                             }
//                                             className={`px-3 py-1.5 border rounded text-xs font-black shadow-sm cursor-help transition-colors
//                 ${isReserved
//                                                 ? "bg-red-100 text-red-800 border-red-300"
//                                                 : "bg-green-100 text-green-800 border-green-300"
//                                               }
//               `}
//                                           >
//                                             🕒 {s.time}
//                                           </span>
//                                         );
//                                       });
//                                     })()}
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           </td>
//                         </tr>
//                       )}
//                     </React.Fragment>
//                   );
//                 })
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* --- Pagination Controls --- */}
//         {totalPages > 1 && (
//           <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
//             <button
//               disabled={currentPage === 1}
//               onClick={() => setCurrentPage((p) => p - 1)}
//               className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-100"
//             >
//               &laquo; Previous
//             </button>
//             <span className="text-sm font-medium text-gray-600">
//               Page {currentPage} of {totalPages}
//             </span>
//             <button
//               disabled={currentPage === totalPages}
//               onClick={() => setCurrentPage((p) => p + 1)}
//               className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-100"
//             >
//               Next &raquo;
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AdminRoster;



import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { useApp } from "../../context/AppContext";
import api from "../../Api";

const api_url = import.meta.env.VITE_API_URL;

const AdminRoster = () => {
  const { user } = useApp();
  const todayObj = new Date();
  const TODAY_STR = todayObj.toLocaleDateString("en-CA");

  const [masterList, setMasterList] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedAdminDate, setSelectedAdminDate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // --- Search & Filter State ---
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;

  useEffect(() => {
    fetchMasterList();
  }, []);

  const fetchMasterList = async () => {
    try {
      const cacheBuster = Date.now();
      const res = await api.get(
        `/api/panel/admin/slot-bookings?_t=${cacheBuster}`,
      );

      if (res.data && res.data.success) {
        setMasterList(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch secure master panel inventory list:", err);
    }
  };

  const handleExpandRow = (empId) => {
    if (expandedRow === empId) {
      setExpandedRow(null);
      setSelectedAdminDate(null);
    } else {
      setExpandedRow(empId);
      setSelectedAdminDate(null);
    }
  };

  // --- Dynamic Filtering Logic ---
  const filteredList = useMemo(() => {
    return masterList.map((emp) => {
      // 1. Text Search Filter
      const matchesSearch =
        emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        emp.name.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return null;

      // 2. Date Range Filter for Booked Slots
      let parsedSlots = [];
      try {
        parsedSlots = JSON.parse(emp.booked_slots || "[]");
      } catch (e) {}

      let validSlots = parsedSlots;
      
      if (fromDate) {
        validSlots = validSlots.filter((s) => s.date >= fromDate);
      }
      if (toDate) {
        validSlots = validSlots.filter((s) => s.date <= toDate);
      }

      // If a date filter is applied but the user has 0 slots in that range, remove them entirely
      if ((fromDate || toDate) && validSlots.length === 0) {
        return null;
      }

      // Return a cloned employee record with ONLY the valid slots in the requested date range
      return {
        ...emp,
        booked_slots: JSON.stringify(validSlots),
      };
    }).filter(Boolean); // Filter out the nulls
  }, [masterList, search, fromDate, toDate]);

  // --- Horizontal Calendar Logic ---
  const visibleDates = useMemo(() => {
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    let end = new Date(start);
    end.setDate(start.getDate() + (14 - start.getDay())); // Default logic (2 weeks)

    if (fromDate) {
      const [sy, sm, sd] = fromDate.split('-');
      start = new Date(sy, sm - 1, sd);

      if (toDate) {
        const [ey, em, ed] = toDate.split('-');
        end = new Date(ey, em - 1, ed);
      } else {
        end = new Date(start);
        end.setDate(start.getDate() + 14);
      }
    } else if (toDate) {
      const [ey, em, ed] = toDate.split('-');
      end = new Date(ey, em - 1, ed);
      start = new Date(end);
      start.setDate(end.getDate() - 14);
    }

    const dates = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toLocaleDateString("en-CA"));
      current.setDate(current.getDate() + 1);
      // Hard cap at 60 days to prevent browser lag if user selects a massive range
      if (dates.length > 60) break; 
    }
    return dates;
  }, [fromDate, toDate]);

  // --- Excel Export ---
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const cacheBuster = Date.now();

      // Ensure we export the filtered list, not the masterList
      const sheet1Data = filteredList.map((row) => {
        let slotsString = "None";

        try {
          const parsedSlots = JSON.parse(row.booked_slots || "[]");
          if (parsedSlots.length > 0) {
            slotsString = parsedSlots.map((s) => {
              if (s.time === "LEAVE") {
                return `${s.date} [On Leave]`;
              }
              
              let modeText = "";
              if (s.mode) {
                const isVirtual = s.mode.toLowerCase().includes('virtual') || s.mode.toLowerCase() === 'v';
                modeText = isVirtual ? " [Mode: V]" : " [Mode: F2F]";
              }

              return `${s.date} [${s.time}]${modeText}`;
            }).join("; ");
          }
        } catch (e) { }

        return {
          Name: row.name,
          "Employee ID": row.employeeId,
          Grade: row.grade,
          Location: row.location,
          "Contact No": row.contactNo,
          "Customer Account": row.parentCustomer,
          "Skill Set Focus": row.interviewSkills,
          "Booked Slots (Date & Time)": slotsString,
        };
      });

      const auditPromises = filteredList.map((emp) =>
        api
          .get(`/api/panel/admin/audit/${emp.employeeId}?_t=${cacheBuster}`)
          .then((res) => res.data)
          .catch(() => null),
      );

      const auditsResults = await Promise.all(auditPromises);
      const sheet2Data = [];

      filteredList.forEach((row, index) => {
        const auditData = auditsResults[index];
        if (
          auditData &&
          auditData.success &&
          auditData.logs &&
          auditData.logs.length > 0
        ) {
          const latestLog = auditData.logs[0];
          let oldStr = "None",
            newStr = "None",
            addedStr = "None",
            removedStr = "None";

          try {
            let oldSlots = JSON.parse(latestLog.OldSlots || "[]");
            let newSlots = JSON.parse(latestLog.NewSlots || "[]");
            if (!Array.isArray(oldSlots)) oldSlots = [];
            if (!Array.isArray(newSlots)) newSlots = [];

            if (oldSlots.length > 0)
              oldStr = oldSlots.map((s) => `${s.date} [${s.time}]`).join("; ");
            if (newSlots.length > 0)
              newStr = newSlots.map((s) => `${s.date} [${s.time}]`).join("; ");

            const oldSet = new Set(
              oldSlots.map(
                (s) => `${(s.date || "").trim()} [${(s.time || "").trim()}]`,
              ),
            );
            const newSet = new Set(
              newSlots.map(
                (s) => `${(s.date || "").trim()} [${(s.time || "").trim()}]`,
              ),
            );

            const added = [...newSet].filter((x) => !oldSet.has(x));
            const removed = [...oldSet].filter((x) => !newSet.has(x));

            if (added.length > 0) addedStr = added.join("; ");
            if (removed.length > 0) removedStr = removed.join("; ");
          } catch (e) { }

          sheet2Data.push({
            Name: row.name,
            "Employee ID": row.employeeId,
            "Action Date": new Date(latestLog.ModifiedAt).toLocaleString(),
            "Old Slots": oldStr,
            "New Slots": newStr,
            "Added Slots": addedStr,
            "Removed Slots": removedStr,
          });
        }
      });

      if (sheet2Data.length === 0)
        sheet2Data.push({ Message: "No historical changes found." });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(sheet1Data),
        "Master Panel List",
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(sheet2Data),
        "Recent Modification",
      );

      XLSX.writeFile(workbook, `Master_Roster_${TODAY_STR}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Failed to export Excel file.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedData = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="max-w-7xl mx-auto p-4 font-sans text-gray-800 animation-fadeIn">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        
        {/* --- Header & Filtering --- */}
        <div className="bg-gray-900 px-6 py-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Master Roster</h2>
            <p className="text-gray-400 text-xs">
              Viewing active panel associates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            {/* Date Filters */}
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded border border-gray-700 shadow-inner w-full md:w-auto">
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">From</span>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-sm text-white outline-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider ml-2">To</span>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-sm text-white outline-none cursor-pointer"
              />
            </div>

            <input
              type="text"
              placeholder="Search Employee ID or Name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 w-full md:w-56 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 outline-none focus:border-blue-500 text-sm"
            />

            {(fromDate || toDate || search) && (
              <button 
                onClick={() => { setFromDate(""); setToDate(""); setSearch(""); setCurrentPage(1); }} 
                className="text-gray-400 hover:text-white text-xs font-semibold underline transition-colors whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}

            <button
              onClick={handleExportExcel}
              disabled={isExporting || filteredList.length === 0}
              className="px-4 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 whitespace-nowrap w-full md:w-auto"
            >
              {isExporting ? "⏳ Exporting..." : "📥 Download Excel"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-4 font-bold border-b-2 border-gray-300">Name</th>
                <th className="p-4 font-bold border-b-2 border-gray-300">Emp ID</th>
                <th className="p-4 font-bold border-b-2 border-gray-300">Grade</th>
                <th className="p-4 font-bold border-b-2 border-gray-300">Location</th>
                <th className="p-4 font-bold border-b-2 border-gray-300">Customer Account</th>
                <th className="p-4 font-bold border-b-2 border-gray-300">Skill Set Focus</th>
                <th className="p-4 font-bold border-b-2 border-gray-300 text-right">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No records found matching your current filters.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => {
                  let parsedSlots = [];
                  try {
                    parsedSlots = JSON.parse(row.booked_slots || "[]");
                  } catch (e) { }

                  const userReservations = row.reservations || [];

                  return (
                    <React.Fragment key={row.NominationId}>
                      <tr className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="p-4 border-b border-gray-200 font-semibold text-gray-800">{row.name}</td>
                        <td className="p-4 border-b border-gray-200 text-gray-600">{row.employeeId}</td>
                        <td className="p-4 border-b border-gray-200 text-gray-700">{row.grade}</td>
                        <td className="p-4 border-b border-gray-200 text-gray-700">{row.location}</td>
                        <td className="p-4 border-b border-gray-200 text-gray-800">{row.parentCustomer}</td>
                        <td className="p-4 border-b border-gray-200 text-blue-700 font-medium whitespace-normal min-w-[150px]">
                          {row.interviewSkills}
                        </td>
                        <td className="p-4 border-b border-gray-200 text-right">
                          <button
                            onClick={() => handleExpandRow(row.employeeId)}
                            className="px-4 py-2 bg-blue-50 border border-blue-200 rounded shadow-sm text-blue-700 font-bold hover:bg-blue-100 transition-colors"
                          >
                            {expandedRow === row.employeeId ? "Close Calendar" : "View Schedule"}
                          </button>
                        </td>
                      </tr>

                      {expandedRow === row.employeeId && (
                        <tr>
                          <td colSpan="7" className="p-0 border-b border-gray-300 bg-gray-100 shadow-inner">
                            <div className="p-6 border-l-4 border-blue-500 m-4 bg-white rounded shadow-sm">
                              <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-widest">
                                Active Schedule Calendar
                              </h4>

                              <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                                {visibleDates.map((d) => {
                                  const isLeaveDay = parsedSlots.some((s) => s.date === d && s.time === "LEAVE");
                                  const hasNormalSlots = parsedSlots.some((s) => s.date === d && s.time !== "LEAVE");
                                  const isSelected = selectedAdminDate === d;

                                  return (
                                    <button
                                      key={d}
                                      onClick={() => setSelectedAdminDate(d)}
                                      className={`
                                        flex-shrink-0 flex flex-col items-center justify-center p-2 mt-2 rounded-xl border-2 w-10 transition-all
                                        ${isLeaveDay
                                          ? "bg-rose-500 border-rose-600 text-white shadow-md" 
                                          : hasNormalSlots
                                            ? "bg-blue-500 border-blue-600 text-white shadow-md" 
                                            : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100" 
                                        }
                                        ${isSelected ? "ring-2 ring-offset-2 ring-blue-500 transform scale-105" : ""}
                                      `}
                                    >
                                      <span className="text-[10px] uppercase font-bold opacity-80">
                                        {new Date(d).toLocaleDateString("en-US", { weekday: "short" })}
                                      </span>
                                      <span className="text-xl font-black">{d.split("-")[2]}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {selectedAdminDate && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center gap-4 animation-fadeIn">
                                  <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                                    Slots for {selectedAdminDate}:
                                  </span>

                                  <div className="flex flex-wrap gap-2">
                                    {(() => {
                                      const dateSlots = parsedSlots.filter((s) => s.date === selectedAdminDate);
                                      const isLeave = dateSlots.some((s) => s.time === "LEAVE");

                                      if (dateSlots.length === 0) {
                                        return (
                                          <span className="text-sm text-gray-500 italic">
                                            No slots nominated on this day.
                                          </span>
                                        );
                                      }

                                      if (isLeave) {
                                        return (
                                          <span className="px-4 py-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded text-sm font-black shadow-sm">
                                            🏖️ Out of Office / On Leave
                                          </span>
                                        );
                                      }

                                      return dateSlots.map((s, i) => {
                                        const reservationData = userReservations.find(
                                          (r) => r.date === s.date && r.time === s.time
                                        );
                                        const isReserved = !!reservationData;
                                        
                                        let modeBadge = "";
                                        if (s.mode) {
                                          const isVirtual = s.mode.toLowerCase().includes('virtual') || s.mode.toLowerCase() === 'v';
                                          modeBadge = isVirtual ? "[V]" : "[F2F]";
                                        }

                                        return (
                                          <span
                                            key={i}
                                            title={
                                              isReserved
                                                ? `Reserved by ${reservationData.reserved_by_name} (${reservationData.reserved_by_id}) | Mode: ${s.mode || 'Not Specified'}`
                                                : `Available (Nominated) | Mode: ${s.mode || 'Not Specified'}`
                                            }
                                            className={`px-3 py-1.5 border rounded text-xs font-black shadow-sm cursor-help transition-colors
                                              ${isReserved
                                                ? "bg-red-100 text-red-800 border-red-300"
                                                : "bg-green-100 text-green-800 border-green-300"
                                              }
                                            `}
                                          >
                                            🕒 {s.time} {modeBadge && <span className="ml-1 opacity-80">{modeBadge}</span>}
                                          </span>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-100"
            >
              &laquo; Previous
            </button>
            <span className="text-sm font-medium text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-100"
            >
              Next &raquo;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRoster;
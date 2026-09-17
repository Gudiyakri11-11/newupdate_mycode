// import React, { useState, useEffect, useMemo, useRef, Fragment } from "react";
// import * as XLSX from "xlsx";
// import { useApp } from "../../context/AppContext";
// import api from "../../Api";

// const SlotBooking = ({ currentUserDetails }) => {
//   const { user } = useApp();
//   const isAuthorized = true; // Assuming role checks handled upstream

//   const [rosterData, setRosterData] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // --- Filter State (Left Pane 30%) ---
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterGrade, setFilterGrade] = useState("Any");
//   const [filterLocation, setFilterLocation] = useState("Any");
//   const [filterCustomer, setFilterCustomer] = useState("Any");
//   const [filterSkill, setFilterSkill] = useState("Any");

//   // --- Horizontal Timeline State (Right Pane 70%) ---
//   const [weekOffset, setWeekOffset] = useState(0); // 0 is current week, -1 is last week, +1 is next week

//   // Modal & Export State
//   const [showReleaseModal, setShowReleaseModal] = useState(false);
//   const [pendingReservation, setPendingReservation] = useState(null);
//   const [isExporting, setIsExporting] = useState(false);

//   // --- Refs for Synchronized Vertical Scrolling ---
//   const leftPaneRef = useRef(null);
//   const rightPaneRef = useRef(null);

//   const handleLeftScroll = (e) => {
//     if (rightPaneRef.current && rightPaneRef.current.scrollTop !== e.currentTarget.scrollTop) {
//       rightPaneRef.current.scrollTop = e.currentTarget.scrollTop;
//     }
//   };

//   const handleRightScroll = (e) => {
//     if (leftPaneRef.current && leftPaneRef.current.scrollTop !== e.currentTarget.scrollTop) {
//       leftPaneRef.current.scrollTop = e.currentTarget.scrollTop;
//     }
//   };

//   // --- Options ---
//   const gradeOptions = ["SA", "M", "SM", "AD"];
//   const locationOptions = [
//     "Kolkata",
//     "Chennai",
//     "Bengaluru",
//     "Mumbai",
//     "Mangalore",
//     "Indore",
//     "Gurugram",
//     "Bhubaneshwar",
//     "Pune",
//     "Hyderabad",
//     "Coimbatore",
//     "Visakhapatnam",
//     "Kochi",
//     "Other PAN India",
//     "Canada",
//     "USA",
//     "Japan",
//     "Other Countries",
//   ];

//   const customerOptions = [
//     "MANULIFE", "TORONTO DOMINION BANK", "ROYAL BANK OF CANADA", "Coast Capital Savings",
//     "CITY NATIONAL BANK", "Navacord", "INTACT FINANCIAL CORPORATION", "CTS",
//     "Central 1 Credit Union", "CNO FINANCIAL", "GREAT-WEST LIFE", "BANK OF MONTREAL",
//     "UHG", "ROYAL CARIBBEAN", "PACIFIC LIFE", "WALMART", "ROCHE", "AMERICAN EXPRESS",
//     "Alphabet Inc.", "VERIZON"
//   ];

//   const techStackOptions = {
//     "Mainframe": ["COBOL", "JCL", "VSAM", "CICS", "DB2", "IMS", "REXX", "Endevor/Changeman", "File-Aid", "Abend Analysis", "Performance Tuning"],
//     "Java": ["Core Java", "OOPs", "Spring", "Spring Boot", "Hibernate/JPA", "REST APIs", "Microservices", "Kafka"],
//     ".NET": ["C#", "ASP.NET", "ASP.NET Core", "MVC", "Web API", "Entity Framework", "Azure Integration"],
//     "AI / ML": ["Python", "Machine Learning", "Deep Learning", "NLP", "TensorFlow", "PyTorch", "Prompt Engineering"],
//     "React": ["JavaScript (ES6)", "JSX", "Hooks", "Redux", "Context API", "React Router"],
//     "Cloud": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "DevOps"],
//     "Scrum Master": [
//       "Scrum Framework",
//       "Sprint Planning",
//       "Daily Scrum Facilitation",
//       "Sprint Review",
//       "Sprint Retrospective",
//       "Backlog Refinement",
//       "Agile Estimation",
//       "User Story Management",
//       "Jira Board Management",
//       "Impediment Removal",
//       "Stakeholder Communication",
//       "Team Facilitation",
//       "Agile Metrics",
//       "Servant Leadership",
//       "SAFe Agile",
//     ],
//     "Salesforce": ["SFDC Admin", "Apex", "LWC", "Visualforce"],
//     "ServiceNow": ["ITSM", "ITOM", "Service Portal", "GlideScript"],
//     "SAP": ["SAP ABAP", "SAP FICO", "SAP HANA", "SAP MM/SD"],
//   };

//   const availableTimeSlots = [
//     "09:00 AM - 10:00 AM",
//     "10:00 AM - 11:00 AM",
//     "11:00 AM - 12:00 PM",
//     "12:00 PM - 01:00 PM",
//     "01:00 PM - 02:00 PM",
//     "02:00 PM - 03:00 PM",
//     "03:00 PM - 04:00 PM",
//     "04:00 PM - 05:00 PM",
//     "05:00 PM - 06:00 PM",
//     "06:00 PM - 07:00 PM",
//   ];

//   const compactTime = (timeStr) => timeStr.replace(":00 ", "").replace(":00 ", "").replace(" - ", "-");

//   // --- Data Fetching ---
//   const fetchMasterData = async () => {
//     setLoading(true);
//     try {
//       const response = await api.get(`/api/panel/admin/slot-bookings`);
//       if (response.data.success) {
//         const formattedData = response.data.data.map((item) => ({
//           ...item,
//           parsedSlots: item.booked_slots ? JSON.parse(item.booked_slots) : [],
//         }));
//         setRosterData(formattedData);
//       }
//     } catch (error) {
//       console.error("Failed to load booking data", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isAuthorized) fetchMasterData();
//   }, [isAuthorized]);

//   // --- 7-Day Grid Calculation via Slider Offset ---
//   const displayDates = useMemo(() => {
//     const baseDate = new Date();
//     baseDate.setHours(0, 0, 0, 0);
//     baseDate.setDate(baseDate.getDate() + (weekOffset * 7));

//     return Array.from({ length: 7 }).map((_, i) => {
//       const d = new Date(baseDate);
//       d.setDate(d.getDate() + i);
//       return d;
//     });
//   }, [weekOffset]);

//   // --- Filtering Logic ---
//   const filteredPanelists = useMemo(() => {
//     // Get the string format (YYYY-MM-DD) of the currently visible 7 dates
//     const visibleDateStrs = displayDates.map(d => d.toLocaleDateString('en-CA'));

//     return rosterData.filter((panelist) => {
//       // 1. Text / Dropdown Filters
//       if (searchQuery) {
//         const query = searchQuery.toLowerCase();
//         if (!panelist.employeeId.toLowerCase().includes(query) && !panelist.name.toLowerCase().includes(query)) return false;
//       }
//       if (filterGrade !== "Any" && panelist.grade !== filterGrade) return false;
//       if (filterLocation !== "Any" && panelist.location !== filterLocation) return false;
//       if (filterCustomer !== "Any" && panelist.parentCustomer !== filterCustomer) return false;
//       if (filterSkill !== "Any" && !panelist.interviewSkills.includes(filterSkill)) return false;

//       // 2. Slider Date Range Filter
//       // Panelist MUST have at least one nominated slot (open or reserved) falling in the current visible 7-day range.
//       const slotsInVisibleRange = panelist.parsedSlots.filter(slot => visibleDateStrs.includes(slot.date));
//       if (slotsInVisibleRange.length === 0) return false;

//       return true;
//     });
//   }, [rosterData, searchQuery, filterGrade, filterLocation, filterCustomer, filterSkill, displayDates]);

//   const myBookings = useMemo(() => {
//     if (!user?.employeeId) return [];
//     return rosterData
//       .flatMap((p) =>
//         (p.reservations || [])
//           .filter((r) => r.reserved_by_id === user.employeeId)
//           .map((r) => ({ ...r, panelistName: p.name, panelistId: p.employeeId }))
//       ).sort((a, b) => new Date(a.date) - new Date(b.date));
//   }, [rosterData, user?.employeeId]);

//   // --- Action Handlers ---
//   const handleBookSlot = async () => {
//     if (!pendingReservation) return;
//     try {
//       await api.post("/api/panel/admin/reserve", {
//         nominationId: pendingReservation.panelist.NominationId,
//         targetEmployeeId: pendingReservation.panelist.employeeId,
//         date: pendingReservation.date,
//         time: pendingReservation.time,
//         taggedCandidates: null,
//       });
//       setPendingReservation(null);
//       fetchMasterData();
//     } catch (error) {
//       alert(error.response?.data?.message || "Booking failed.");
//     }
//   };

//   const handleRelease = async (reservationId) => {
//     if (!window.confirm("Are you sure you want to release this booked slot?")) return;
//     try {
//       await api.post("/api/panel/admin/release", { reservationId });
//       fetchMasterData();
//     } catch (error) {
//       alert("Release failed.");
//     }
//   };

//   const handleExportBookings = () => {
//     setIsExporting(true);
//     try {
//       if (myBookings.length === 0) return alert("No active bookings to export.");
//       const ws = XLSX.utils.json_to_sheet(myBookings.map(b => ({ Date: b.date, Time: b.time, Name: b.panelistName, EmpID: b.panelistId })));
//       const wb = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(wb, ws, "My Bookings");
//       XLSX.writeFile(wb, `Bookings_${new Date().toLocaleDateString("en-CA")}.xlsx`);
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   if (!isAuthorized) return <div className="p-10 text-center text-red-500 font-bold">Access Denied</div>;

//   return (
//     <div className="bg-white border border-slate-300 text-[11px] mt-6 max-w-full flex flex-col h-[85vh] shadow-sm select-none">

//       {/* CSS injection to hide left-pane scrollbar while preserving functionality */}
//       <style>{`
//         .hide-scrollbar::-webkit-scrollbar { display: none; }
//         .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
//       `}</style>

//       {/* HEADER & ACTIONS */}
//       <div className="flex justify-between items-center p-2 bg-slate-50 border-b border-slate-300 flex-shrink-0 z-50 relative">
//         <div className="flex items-center gap-4">
//           <h2 className="text-sm font-black text-slate-800 tracking-tight ml-2">Panelist Master Grid</h2>

//           {/* GREEN-YELLOW WEEK SLIDER */}
//           <div className="flex flex-col items-center justify-center px-4 py-1.5 bg-white border border-slate-300 rounded-lg shadow-sm">
//             <span className="text-[11px] font-bold text-slate-800 mb-1">
//               {displayDates[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {displayDates[6].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
//             </span>
//             <input
//               type="range" min="-12" max="12" step="1" value={weekOffset}
//               onChange={(e) => setWeekOffset(Number(e.target.value))}
//               title="Slide to change week"
//               className="w-48 h-1.5 bg-gradient-to-r from-yellow-400 to-emerald-500 rounded-lg appearance-none cursor-pointer accent-slate-800"
//             />
//           </div>
//         </div>
//         <div className="flex gap-2 mr-2">
//           <button onClick={handleExportBookings} disabled={isExporting || myBookings.length === 0} className="px-3 py-1 bg-emerald-600 text-white font-bold rounded shadow-sm hover:bg-emerald-700 disabled:opacity-50">
//             {isExporting ? "⏳..." : "📥 Export"}
//           </button>
//           <button onClick={() => setShowReleaseModal(true)} className="px-3 py-1 bg-slate-800 text-white font-bold rounded shadow-sm hover:bg-slate-900 flex items-center gap-1.5">
//             📋 My Bookings <span className="bg-rose-500 px-1.5 py-0 rounded text-[9px]">{myBookings.length}</span>
//           </button>
//         </div>
//       </div>

//       {/* --- SYNCHRONIZED SPLIT PANE WRAPPER --- */}
//       <div className="flex flex-1 overflow-hidden relative bg-slate-50/50">

//         {/* ================= LEFT PANE (FIXED & NON-HORIZONTAL SCROLLING) ================= */}
//         <div
//           ref={leftPaneRef}
//           onScroll={handleLeftScroll}
//           className="w-[590px] flex-shrink-0 overflow-y-auto overflow-x-hidden hide-scrollbar z-20 bg-white border-r-2 border-slate-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
//         >
//           <table className="w-full border-collapse">
//             <thead className="sticky top-0 z-30 bg-white">
//               {/* Exact height matching the right header (40px + 80px = 120px) */}
//               <tr className="h-[120px]">
//                 <th className="p-0 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)] bg-blue-200 border-b border-slate-300">
//                   <div className="flex flex-col h-[120px]">
//                     <div className="grid grid-cols-[160px_60px_90px_130px_150px] divide-x border-b border-slate-300 text-slate-800 font-bold tracking-tight h-[40px] bg-blue-200">
//                       <div className="p-1.5 px-2 text-[12px] flex items-center">Name / ID</div>
//                       <div className="p-1.5 px-2 text-[12px] flex items-center justify-center">Grade</div>
//                       <div className="p-1.5 px-2 text-[12px] flex items-center">Location</div>
//                       <div className="p-1.5 px-2 text-[12px] flex items-center truncate">Customer Account</div>
//                       <div className="p-1.5 px-2 text-[12px] flex items-center">Primary Skill</div>
//                     </div>
//                     <div className="grid grid-cols-[160px_60px_90px_130px_150px] divide-x text-slate-800 bg-blue-100 h-[80px] items-start pt-1.5">
//                       <div className="p-1"><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm px-1 py-0.5 outline-none focus:bg-white text-[10px]" /></div>
//                       <div className="p-1"><select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm outline-none px-0.5 py-0.5 text-[10px]"><option value="Any">All</option>{gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
//                       <div className="p-1"><select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm outline-none px-0.5 py-0.5 text-[10px]"><option value="Any">All</option>{locationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
//                       <div className="p-1"><select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm outline-none px-0.5 py-0.5 text-[10px]"><option value="Any">All</option>{customerOptions.map(opt => <option key={opt} value={opt} className="truncate">{opt}</option>)}</select></div>
//                       <div className="p-1"><select value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm outline-none px-0.5 py-0.5 text-[10px]"><option value="Any">All</option>{Object.entries(techStackOptions).map(([cat, skills]) => (<optgroup key={cat} label={`- ${cat} -`}>{skills.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>))}</select></div>
//                     </div>
//                   </div>
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-200">
//               {loading ? (
//                 <tr><td className="h-[64px] text-center font-medium text-slate-400 bg-white">Loading Panelists...</td></tr>
//               ) : filteredPanelists.length === 0 ? (
//                 <tr><td className="h-[64px] text-center font-medium text-slate-400 bg-white">No matching panelists found.</td></tr>
//               ) : (
//                 filteredPanelists.map((p, rowIndex) => (
//                   <tr key={p.NominationId} className={`h-[64px] hover:bg-indigo-50/50 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
//                     <td className="p-0 border-b border-slate-200 h-[64px]">
//                       <div className="grid grid-cols-[160px_60px_90px_130px_150px] divide-x divide-slate-200 h-full items-stretch">
//                         <div className="p-1.5 px-2 flex flex-col justify-center overflow-hidden">
//                           <span className="font-bold text-slate-800 leading-tight truncate" title={p.name}>{p.name}</span>
//                           <span className="font-mono text-slate-500 text-[9px] mt-0.5">{p.employeeId}</span>
//                         </div>
//                         <div className="p-1.5 px-2 flex items-center justify-center font-bold text-slate-700">{p.grade}</div>
//                         <div className="p-1.5 px-2 flex items-center truncate text-slate-700" title={p.location}>{p.location}</div>
//                         <div className="p-1.5 px-2 flex items-center truncate text-slate-700" title={p.parentCustomer}>{p.parentCustomer}</div>
//                         <div className="p-1.5 px-2 flex items-center text-slate-700 text-[10px] break-words whitespace-normal leading-tight" title={p.interviewSkills}>
//                           <span className="line-clamp-3">{p.interviewSkills}</span>
//                         </div>
//                       </div>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* ================= RIGHT PANE (HORIZONTALLY SCROLLABLE TIMELINE) ================= */}
//         <div
//           ref={rightPaneRef}
//           onScroll={handleRightScroll}
//           className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar"
//         >
//           <table className="w-max border-collapse">
//             <thead className="sticky top-0 z-30 bg-white shadow-[0_2px_5px_-2px_rgba(0,0,0,0.15)]">
//               {/* Row 1: Dates (Height: 40px) */}
//               <tr className="h-[40px]">
//                 {displayDates.map((date, idx) => (
//                   <th key={date.toISOString()} colSpan={availableTimeSlots.length} className={`text-center py-1 border border-slate-300 text-[11px] font-bold text-slate-800 ${idx % 2 === 0 ? 'bg-[#b2df8a]' : 'bg-[#fed7aa]'}`}>
//                     {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' })}
//                   </th>
//                 ))}
//               </tr>
//               {/* Row 2: Times (Height: 80px) */}
//               <tr className="h-[80px]">
//                 {displayDates.map(() => (
//                   availableTimeSlots.map(time => (
//                     <th key={time} className="border border-slate-300 bg-blue-50 text-blue-900 font-bold px-0.5 py-2 w-[32px] max-w-[32px] text-center whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
//                       {compactTime(time)}
//                     </th>
//                   ))
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-200">
//               {loading ? (
//                 <tr><td colSpan={displayDates.length * availableTimeSlots.length} className="h-[64px] bg-white text-center"></td></tr>
//               ) : filteredPanelists.length === 0 ? (
//                 <tr><td colSpan={displayDates.length * availableTimeSlots.length} className="h-[64px] bg-white"></td></tr>
//               ) : (
//                 filteredPanelists.map((p, rowIndex) => (
//                   <tr key={p.NominationId} className={`h-[64px] hover:bg-indigo-50/50 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
//                     {displayDates.map(date => {
//                       const dateStr = date.toLocaleDateString('en-CA');
//                       // 👉 NEW: Check if the entire day is marked as LEAVE
//                       const isLeaveDay = p.parsedSlots.some(s => s.date === dateStr && s.time === "LEAVE");
//                       return availableTimeSlots.map(time => {

//                         // 👉 NEW: If they are on leave, render a gray locked cell for all times
//                         if (isLeaveDay) {
//                           return (
//                             <td key={`${dateStr}-${time}`} className="border border-slate-200 bg-slate-100 p-0 text-center w-[32px] max-w-[32px] h-[64px]">
//                               <div className="w-full h-full flex items-center justify-center p-[2px]" title="Panelist is on leave">
//                                 <span className="text-slate-400 font-bold text-[10px]">L</span>
//                               </div>
//                             </td>
//                           );
//                         }
//                         // Check if the slot exists at all
//                         const isNominated = p.parsedSlots.some(s => s.date === dateStr && s.time === time);
//                         // Check if it's already reserved
//                         const reservation = p.reservations?.find(r => r.date === dateStr && r.time === time);

//                         return (

//                           <td key={`${dateStr}-${time}`} className="border border-slate-200 p-0 text-center w-[32px] max-w-[32px] h-[64px]">
//                             <div className="w-full h-full flex items-center justify-center p-[2px]">
//                               {reservation ? (
//                                 <div
//                                   className="w-full h-[40px] rounded-sm bg-rose-100 text-rose-700 font-bold flex items-center justify-center cursor-help border border-rose-200"
//                                   title={`Slot reserved by Employee ID: ${reservation.reserved_by_id || 'Unknown'}`}
//                                 >
//                                   R
//                                 </div>
//                               ) : isNominated ? (
//                                 <button
//                                   onClick={() => setPendingReservation({ panelist: p, date: dateStr, time })}
//                                   className="w-full h-[40px] rounded-sm bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700 font-bold transition-colors cursor-pointer"
//                                   title={`Reserve ${compactTime(time)} on ${dateStr}`}
//                                 >
//                                   Y
//                                 </button>
//                               ) : (
//                                 <span className="text-slate-300 font-bold">-</span>
//                               )}
//                             </div>
//                           </td>
//                         );
//                       });
//                     })}
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* POP-UP MODAL: Confirm Reservation */}
//       {pendingReservation && (
//         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
//             <div className="bg-slate-800 p-3"><h3 className="text-sm font-bold text-white text-center">Confirm Slot Booking</h3></div>
//             <div className="p-5">
//               <p className="text-[12px] text-slate-600 mb-4 text-center">Reserve this time slot for <span className="font-bold text-slate-800">{pendingReservation.panelist.name}</span>?</p>
//               <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[12px] space-y-2 font-medium">
//                 <div className="flex justify-between"><span className="text-slate-500">Date:</span> <span className="text-indigo-700">{pendingReservation.date}</span></div>
//                 <div className="flex justify-between"><span className="text-slate-500">Time:</span> <span className="text-indigo-700">{pendingReservation.time}</span></div>
//               </div>
//             </div>
//             <div className="p-3 bg-slate-100 flex justify-end gap-2 border-t border-slate-200">
//               <button onClick={() => setPendingReservation(null)} className="px-4 py-1.5 border border-slate-300 text-slate-700 font-bold rounded hover:bg-slate-200">Cancel</button>
//               <button onClick={handleBookSlot} className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-md">Confirm Booking</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* POP-UP MODAL: Manage Bookings */}
//       {showReleaseModal && (
//         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
//             <div className="flex justify-between items-center p-4 bg-slate-800 text-white"><h2 className="text-[14px] font-bold">📋 My Active Bookings</h2><button onClick={() => setShowReleaseModal(false)}>✕</button></div>
//             <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
//               {myBookings.length === 0 ? (
//                 <div className="text-center py-10 text-slate-500">No active reservations.</div>
//               ) : (
//                 <div className="space-y-2">
//                   {myBookings.map((b) => (
//                     <div key={b.ReservationId} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded shadow-sm">
//                       <div>
//                         <span className="font-bold text-[12px] text-slate-800">{b.panelistName}</span> <span className="text-[10px] text-slate-400">({b.panelistId})</span>
//                         <div className="text-[11px] font-bold text-indigo-700 mt-1">{b.date} | {b.time}</div>
//                       </div>
//                       <button onClick={() => handleRelease(b.ReservationId)} className="px-3 py-1.5 border border-rose-300 text-rose-700 font-bold text-[11px] rounded hover:bg-rose-50">Release Slot</button>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default SlotBooking;



import React, { useState, useEffect, useMemo, useRef, Fragment } from "react";
import * as XLSX from "xlsx";
import { useApp } from "../../context/AppContext";
import api from "../../Api";

const SlotBooking = ({ currentUserDetails }) => {
  const { user } = useApp();
  const isAuthorized = true; // Assuming role checks handled upstream

  const [rosterData, setRosterData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Filter State (Left Pane 30%) ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("Any");
  const [filterLocation, setFilterLocation] = useState("Any");
  const [filterCustomer, setFilterCustomer] = useState("Any");
  const [filterSkill, setFilterSkill] = useState("Any");

  // --- Horizontal Timeline State (Right Pane 70%) ---
  const [weekOffset, setWeekOffset] = useState(0); // 0 is current week, -1 is last week, +1 is next week

  // Modal & Export State
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // --- Refs for Synchronized Vertical Scrolling ---
  const leftPaneRef = useRef(null);
  const rightPaneRef = useRef(null);

  const handleLeftScroll = (e) => {
    if (rightPaneRef.current && rightPaneRef.current.scrollTop !== e.currentTarget.scrollTop) {
      rightPaneRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleRightScroll = (e) => {
    if (leftPaneRef.current && leftPaneRef.current.scrollTop !== e.currentTarget.scrollTop) {
      leftPaneRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // --- Options ---
  // Added PA and A to grades
  const gradeOptions = ["P","PAT","PT","PA", "A", "SA", "M", "SM", "AD"];
  
  const locationOptions = [
    "Kolkata", "Chennai", "Bengaluru", "Mumbai", "Mangalore", "Indore",
    "Gurugram", "Bhubaneshwar", "Pune", "Hyderabad", "Coimbatore",
    "Visakhapatnam", "Kochi", "Other PAN India", "Canada", "USA",
    "Japan", "Other Countries",
  ];

  const customerOptions = [
    "MANULIFE", "TORONTO DOMINION BANK", "ROYAL BANK OF CANADA", "Coast Capital Savings",
    "CITY NATIONAL BANK", "Navacord", "INTACT FINANCIAL CORPORATION", "CTS",
    "Central 1 Credit Union", "CNO FINANCIAL", "GREAT-WEST LIFE", "BANK OF MONTREAL",
    "UHG", "ROYAL CARIBBEAN", "PACIFIC LIFE", "WALMART", "ROCHE", "AMERICAN EXPRESS",
    "Alphabet Inc.", "VERIZON"
  ];

  const techStackOptions = {
    "Mainframe": ["COBOL", "JCL", "VSAM", "CICS", "DB2", "IMS", "REXX", "Endevor/Changeman", "File-Aid", "Abend Analysis", "Performance Tuning"],
    "Java": ["Core Java", "OOPs", "Spring", "Spring Boot", "Hibernate/JPA", "REST APIs", "Microservices", "Kafka"],
    ".NET": ["C#", "ASP.NET", "ASP.NET Core", "MVC", "Web API", "Entity Framework", "Azure Integration"],
    "AI / ML": ["Python", "Machine Learning", "Deep Learning", "NLP", "TensorFlow", "PyTorch", "Prompt Engineering"],
    "React": ["JavaScript (ES6)", "JSX", "Hooks", "Redux", "Context API", "React Router"],
    "Cloud": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "DevOps"],
    "Scrum Master": [
      "Scrum Framework", "Sprint Planning", "Daily Scrum Facilitation", "Sprint Review",
      "Sprint Retrospective", "Backlog Refinement", "Agile Estimation", "User Story Management",
      "Jira Board Management", "Impediment Removal", "Stakeholder Communication", "Team Facilitation",
      "Agile Metrics", "Servant Leadership", "SAFe Agile",
    ],
    "Salesforce": ["SFDC Admin", "Apex", "LWC", "Visualforce"],
    "ServiceNow": ["ITSM", "ITOM", "Service Portal", "GlideScript"],
    "SAP": ["SAP ABAP", "SAP FICO", "SAP HANA", "SAP MM/SD"],
  };

  const availableTimeSlots = [
    "09:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "12:00 PM - 01:00 PM",
    "01:00 PM - 02:00 PM",
    "02:00 PM - 03:00 PM",
    "03:00 PM - 04:00 PM",
    "04:00 PM - 05:00 PM",
    "05:00 PM - 06:00 PM",
    "06:00 PM - 07:00 PM",
  ];

  const compactTime = (timeStr) => timeStr.replace(":00 ", "").replace(":00 ", "").replace(" - ", "-");

  // --- Data Fetching ---
  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/panel/admin/slot-bookings`);
      if (response.data.success) {
        const formattedData = response.data.data.map((item) => ({
          ...item,
          parsedSlots: item.booked_slots ? JSON.parse(item.booked_slots) : [],
        }));
        setRosterData(formattedData);
      }
    } catch (error) {
      console.error("Failed to load booking data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) fetchMasterData();
  }, [isAuthorized]);

  // --- 7-Day Grid Calculation via Slider Offset ---
  const displayDates = useMemo(() => {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    baseDate.setDate(baseDate.getDate() + (weekOffset * 7));

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  // --- Filtering Logic ---
  const filteredPanelists = useMemo(() => {
    const visibleDateStrs = displayDates.map(d => d.toLocaleDateString('en-CA'));

    return rosterData.filter((panelist) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!panelist.employeeId.toLowerCase().includes(query) && !panelist.name.toLowerCase().includes(query)) return false;
      }
      if (filterGrade !== "Any" && panelist.grade !== filterGrade) return false;
      if (filterLocation !== "Any" && panelist.location !== filterLocation) return false;
      if (filterCustomer !== "Any" && panelist.parentCustomer !== filterCustomer) return false;
      if (filterSkill !== "Any" && !panelist.interviewSkills.includes(filterSkill)) return false;

      const slotsInVisibleRange = panelist.parsedSlots.filter(slot => visibleDateStrs.includes(slot.date));
      if (slotsInVisibleRange.length === 0) return false;

      return true;
    });
  }, [rosterData, searchQuery, filterGrade, filterLocation, filterCustomer, filterSkill, displayDates]);

  // Determine user's bookings, finding the mode (V/F) from the original slot data
  const myBookings = useMemo(() => {
    if (!user?.employeeId) return [];
    return rosterData
      .flatMap((p) =>
        (p.reservations || [])
          .filter((r) => r.reserved_by_id === user.employeeId)
          .map((r) => {
            const originalSlot = p.parsedSlots.find(s => s.date === r.date && s.time === r.time);
            const modeLabel = originalSlot?.mode === "F2F" ? "F" : "V"; // Defaulting to V for backwards compatibility
            return { ...r, panelistName: p.name, panelistId: p.employeeId, mode: modeLabel };
          })
      ).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [rosterData, user?.employeeId]);

  // --- Action Handlers ---
  const handleBookSlot = async () => {
    if (!pendingReservation) return;
    try {
      await api.post("/api/panel/admin/reserve", {
        nominationId: pendingReservation.panelist.NominationId,
        targetEmployeeId: pendingReservation.panelist.employeeId,
        date: pendingReservation.date,
        time: pendingReservation.time,
        taggedCandidates: null,
      });
      setPendingReservation(null);
      fetchMasterData();
    } catch (error) {
      alert(error.response?.data?.message || "Booking failed.");
    }
  };

  const handleRelease = async (reservationId) => {
    if (!window.confirm("Are you sure you want to release this booked slot?")) return;
    try {
      await api.post("/api/panel/admin/release", { reservationId });
      fetchMasterData();
    } catch (error) {
      alert("Release failed.");
    }
  };

  const handleExportBookings = () => {
    setIsExporting(true);
    try {
      if (myBookings.length === 0) return alert("No active bookings to export.");
      
      // Included Mode (V/F) in Excel Export
      const ws = XLSX.utils.json_to_sheet(myBookings.map(b => ({ 
        Date: b.date, 
        Time: b.time, 
        Mode: b.mode, // V or F
        Name: b.panelistName, 
        EmpID: b.panelistId 
      })));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "My Bookings");
      XLSX.writeFile(wb, `Bookings_${new Date().toLocaleDateString("en-CA")}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAuthorized) return <div className="p-10 text-center text-red-500 font-bold">Access Denied</div>;

  return (
    <div className="bg-white border border-slate-300 text-[11px] mt-6 max-w-full flex flex-col h-[85vh] shadow-sm select-none">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* HEADER & ACTIONS */}
      <div className="flex justify-between items-center p-2 bg-slate-50 border-b border-slate-300 flex-shrink-0 z-50 relative">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-slate-800 tracking-tight ml-2">Panelist Master Grid</h2>
          <div className="flex flex-col items-center justify-center px-4 py-1.5 bg-white border border-slate-300 rounded-lg shadow-sm">
            <span className="text-[11px] font-bold text-slate-800 mb-1">
              {displayDates[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {displayDates[6].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
            <input
              type="range" min="-12" max="12" step="1" value={weekOffset}
              onChange={(e) => setWeekOffset(Number(e.target.value))}
              title="Slide to change week"
              className="w-48 h-1.5 bg-gradient-to-r from-yellow-400 to-emerald-500 rounded-lg appearance-none cursor-pointer accent-slate-800"
            />
          </div>
        </div>
        <div className="flex gap-2 mr-2">
          <button onClick={handleExportBookings} disabled={isExporting || myBookings.length === 0} className="px-3 py-1 bg-emerald-600 text-white font-bold rounded shadow-sm hover:bg-emerald-700 disabled:opacity-50">
            {isExporting ? "⏳..." : "📥 Export"}
          </button>
          <button onClick={() => setShowReleaseModal(true)} className="px-3 py-1 bg-slate-800 text-white font-bold rounded shadow-sm hover:bg-slate-900 flex items-center gap-1.5">
            📋 My Bookings <span className="bg-rose-500 px-1.5 py-0 rounded text-[9px]">{myBookings.length}</span>
          </button>
        </div>
      </div>

      {/* --- SYNCHRONIZED SPLIT PANE WRAPPER --- */}
      <div className="flex flex-1 overflow-hidden relative bg-slate-50/50">

        {/* ================= LEFT PANE ================= */}
        <div
          ref={leftPaneRef}
          onScroll={handleLeftScroll}
          className="w-[590px] flex-shrink-0 overflow-y-auto overflow-x-hidden hide-scrollbar z-20 bg-white border-r-2 border-slate-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
        >
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-30 bg-white">
              <tr className="h-[120px]">
                <th className="p-0 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)] bg-blue-200 border-b border-slate-300">
                  <div className="flex flex-col h-[120px]">
                    <div className="grid grid-cols-[160px_60px_90px_130px_150px] divide-x border-b border-slate-300 text-slate-800 font-bold tracking-tight h-[40px] bg-blue-200">
                      <div className="p-1.5 px-2 text-[12px] flex items-center">Name / ID</div>
                      <div className="p-1.5 px-2 text-[12px] flex items-center justify-center">Grade</div>
                      <div className="p-1.5 px-2 text-[12px] flex items-center">Location</div>
                      <div className="p-1.5 px-2 text-[12px] flex items-center truncate">Customer Account</div>
                      <div className="p-1.5 px-2 text-[12px] flex items-center">Primary Skill</div>
                    </div>
                    <div className="grid grid-cols-[160px_60px_90px_130px_150px] divide-x text-slate-800 bg-blue-100 h-[80px] items-start pt-1.5">
                      <div className="p-1"><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm px-1 py-0.5 outline-none focus:bg-white text-[10px]" /></div>
                      <div className="p-1"><select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm outline-none px-0.5 py-0.5 text-[10px]"><option value="Any">All</option>{gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                      <div className="p-1"><select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm outline-none px-0.5 py-0.5 text-[10px]"><option value="Any">All</option>{locationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                      <div className="p-1"><select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm outline-none px-0.5 py-0.5 text-[10px]"><option value="Any">All</option>{customerOptions.map(opt => <option key={opt} value={opt} className="truncate">{opt}</option>)}</select></div>
                      <div className="p-1"><select value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)} className="w-full bg-white/80 border border-slate-300 rounded-sm outline-none px-0.5 py-0.5 text-[10px]"><option value="Any">All</option>{Object.entries(techStackOptions).map(([cat, skills]) => (<optgroup key={cat} label={`- ${cat} -`}>{skills.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>))}</select></div>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td className="h-[64px] text-center font-medium text-slate-400 bg-white">Loading Panelists...</td></tr>
              ) : filteredPanelists.length === 0 ? (
                <tr><td className="h-[64px] text-center font-medium text-slate-400 bg-white">No matching panelists found.</td></tr>
              ) : (
                filteredPanelists.map((p, rowIndex) => (
                  <tr key={p.NominationId} className={`h-[64px] hover:bg-indigo-50/50 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="p-0 border-b border-slate-200 h-[64px]">
                      <div className="grid grid-cols-[160px_60px_90px_130px_150px] divide-x divide-slate-200 h-full items-stretch">
                        <div className="p-1.5 px-2 flex flex-col justify-center overflow-hidden">
                          <span className="font-bold text-slate-800 leading-tight truncate" title={p.name}>{p.name}</span>
                          <span className="font-mono text-slate-500 text-[9px] mt-0.5">{p.employeeId}</span>
                        </div>
                        <div className="p-1.5 px-2 flex items-center justify-center font-bold text-slate-700">{p.grade}</div>
                        <div className="p-1.5 px-2 flex items-center truncate text-slate-700" title={p.location}>{p.location}</div>
                        <div className="p-1.5 px-2 flex items-center truncate text-slate-700" title={p.parentCustomer}>{p.parentCustomer}</div>
                        <div className="p-1.5 px-2 flex items-center text-slate-700 text-[10px] break-words whitespace-normal leading-tight" title={p.interviewSkills}>
                          <span className="line-clamp-3">{p.interviewSkills}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ================= RIGHT PANE ================= */}
        <div
          ref={rightPaneRef}
          onScroll={handleRightScroll}
          className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar"
        >
          <table className="w-max border-collapse">
            <thead className="sticky top-0 z-30 bg-white shadow-[0_2px_5px_-2px_rgba(0,0,0,0.15)]">
              <tr className="h-[40px]">
                {displayDates.map((date, idx) => (
                  <th key={date.toISOString()} colSpan={availableTimeSlots.length} className={`text-center py-1 border border-slate-300 text-[11px] font-bold text-slate-800 ${idx % 2 === 0 ? 'bg-[#b2df8a]' : 'bg-[#fed7aa]'}`}>
                    {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' })}
                  </th>
                ))}
              </tr>
              <tr className="h-[80px]">
                {displayDates.map(() => (
                  availableTimeSlots.map(time => (
                    <th key={time} className="border border-slate-300 bg-blue-50 text-blue-900 font-bold px-0.5 py-2 w-[32px] max-w-[32px] text-center whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      {compactTime(time)}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={displayDates.length * availableTimeSlots.length} className="h-[64px] bg-white text-center"></td></tr>
              ) : filteredPanelists.length === 0 ? (
                <tr><td colSpan={displayDates.length * availableTimeSlots.length} className="h-[64px] bg-white"></td></tr>
              ) : (
                filteredPanelists.map((p, rowIndex) => (
                  <tr key={p.NominationId} className={`h-[64px] hover:bg-indigo-50/50 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    {displayDates.map(date => {
                      const dateStr = date.toLocaleDateString('en-CA');
                      const isLeaveDay = p.parsedSlots.some(s => s.date === dateStr && s.time === "LEAVE");
                      return availableTimeSlots.map(time => {

                        if (isLeaveDay) {
                          return (
                            <td key={`${dateStr}-${time}`} className="border border-slate-200 bg-slate-100 p-0 text-center w-[32px] max-w-[32px] h-[64px]">
                              <div className="w-full h-full flex items-center justify-center p-[2px]" title="Panelist is on leave">
                                <span className="text-slate-400 font-bold text-[10px]">L</span>
                              </div>
                            </td>
                          );
                        }
                        
                        const slotDetails = p.parsedSlots.find(s => s.date === dateStr && s.time === time);
                        const reservation = p.reservations?.find(r => r.date === dateStr && r.time === time);
                        
                        // Extract mode, default to V if undefined for any old records
                        const slotMode = slotDetails?.mode === "F2F" ? "F" : "V";

                        return (
                          <td key={`${dateStr}-${time}`} className="border border-slate-200 p-0 text-center w-[32px] max-w-[32px] h-[64px]">
                            <div className="w-full h-full flex items-center justify-center p-[2px]">
                              {reservation ? (
                                <div
                                  className="w-full h-[40px] rounded-sm bg-rose-100 text-rose-700 font-bold flex items-center justify-center cursor-help border border-rose-200 text-[10px]"
                                  title={`Slot reserved by Employee ID: ${reservation.reserved_by_id || 'Unknown'}`}
                                >
                                  R ({slotMode})
                                </div>
                              ) : slotDetails ? (
                                <button
                                  onClick={() => setPendingReservation({ panelist: p, date: dateStr, time, mode: slotMode })}
                                  className="w-full h-[40px] rounded-sm bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700 font-bold transition-colors cursor-pointer text-[12px]"
                                  title={`Reserve ${compactTime(time)} on ${dateStr} (${slotMode === 'F' ? 'Face-to-Face' : 'Virtual'})`}
                                >
                                  {slotMode}
                                </button>
                              ) : (
                                <span className="text-slate-300 font-bold">-</span>
                              )}
                            </div>
                          </td>
                        );
                      });
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POP-UP MODAL: Confirm Reservation */}
      {pendingReservation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="bg-slate-800 p-3"><h3 className="text-sm font-bold text-white text-center">Confirm Slot Booking</h3></div>
            <div className="p-5">
              <p className="text-[12px] text-slate-600 mb-4 text-center">Reserve this time slot for <span className="font-bold text-slate-800">{pendingReservation.panelist.name}</span>?</p>
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[12px] space-y-2 font-medium">
                <div className="flex justify-between"><span className="text-slate-500">Date:</span> <span className="text-indigo-700">{pendingReservation.date}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Time:</span> <span className="text-indigo-700">{pendingReservation.time}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Mode:</span> <span className="text-emerald-700 font-bold">{pendingReservation.mode === 'F' ? "Face-to-Face" : "Virtual"}</span></div>
              </div>
            </div>
            <div className="p-3 bg-slate-100 flex justify-end gap-2 border-t border-slate-200">
              <button onClick={() => setPendingReservation(null)} className="px-4 py-1.5 border border-slate-300 text-slate-700 font-bold rounded hover:bg-slate-200">Cancel</button>
              <button onClick={handleBookSlot} className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-md">Confirm Booking</button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: Manage Bookings */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center p-4 bg-slate-800 text-white"><h2 className="text-[14px] font-bold">📋 My Active Bookings</h2><button onClick={() => setShowReleaseModal(false)}>✕</button></div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              {myBookings.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No active reservations.</div>
              ) : (
                <div className="space-y-2">
                  {myBookings.map((b) => (
                    <div key={b.ReservationId} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded shadow-sm">
                      <div>
                        <span className="font-bold text-[12px] text-slate-800">{b.panelistName}</span> <span className="text-[10px] text-slate-400">({b.panelistId})</span>
                        <div className="text-[11px] font-bold text-indigo-700 mt-1">{b.date} | {b.time} | <span className="text-emerald-600">Mode: {b.mode}</span></div>
                      </div>
                      <button onClick={() => handleRelease(b.ReservationId)} className="px-3 py-1.5 border border-rose-300 text-rose-700 font-bold text-[11px] rounded hover:bg-rose-50">Release Slot</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlotBooking;
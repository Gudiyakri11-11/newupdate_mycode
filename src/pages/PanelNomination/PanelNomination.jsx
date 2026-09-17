// import React, { useState, useEffect } from "react";
// import { useApp } from "../../context/AppContext";
// import MyRoster from "./MyRoster"; // Ensure this matches the filename created above
// import InterviewBookingTemplate from "./SlotBooking";
// const api_url = import.meta.env.VITE_API_URL;
// import AdminRoster from "./AdminRoster";
// import api from "../../Api";

// const PanelNomination = () => {
//   // --- Context & Date Logic ---
//   const { user } = useApp();
//   const employeeId = user?.employeeId || "";
//   const employeeName = user?.name || "";

//   const todayObj = new Date();
//   const TODAY_STR = todayObj.toLocaleDateString("en-CA");

//   const t1Obj = new Date(todayObj);
//   t1Obj.setDate(t1Obj.getDate() + 1);
//   const T1_STR = t1Obj.toLocaleDateString("en-CA");
//   const t2Obj = new Date(todayObj);
//   t2Obj.setDate(t2Obj.getDate() + 2);
//   const T2_STR = t2Obj.toLocaleDateString("en-CA");

//   // --- State Variables ---
//   const [activeTab, setActiveTab] = useState("self");
//   const [nominationId, setNominationId] = useState(null);
//   const [responseData, setResponseData] = useState(null);

//   const [formData, setFormData] = useState({
//     name: "",
//     grade: "",
//     location: "",
//     parentCustomer: "",
//     contactNo: "",
//     interviewSkills: "",
//   });

//   const allowedGrades = ["SA", "M", "SM", "AD", "D"];
//   const isAuthorized = true;
//   // const isAuthorized =
//   //   user?.activeRole === "moderator" ||
//   //   user?.activeRole === "admin" ||
//   //   allowedGrades.includes(formData.grade);


//   const [selectedDate, setSelectedDate] = useState(null);
//   const [bookedSlots, setBookedSlots] = useState([]);
//   const [savedBackupSlots, setSavedBackupSlots] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const [popupDialog, setPopupDialog] = useState({
//     isOpen: false,
//     type: "success", // can be 'success' or 'confirm'
//     title: "",
//     message: "",
//     onConfirm: null, // Function to execute if it's a confirmation
//   });
//   const [errorMessage, setErrorMessage] = useState("");

//   // --- Skills Modal State ---
//   const [showSkillsModal, setShowSkillsModal] = useState(false);
//   const [tempSkills, setTempSkills] = useState([]);
//   // Add this below your existing showSkillsModal state
//   const [customSkill, setCustomSkill] = useState("");
//   const skillOptions = ["Mainframe", ".NET", "JAVA", "AI", "Open"];

//   // --- Custom Calendar State ---
//   const [calendarBaseDate, setCalendarBaseDate] = useState(new Date());

//   // --- Static Options ---
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
//     "MANULIFE",
//     "TORONTO DOMINION BANK",
//     "ROYAL BANK OF CANADA",
//     "Coast Capital Savings",
//     "CITY NATIONAL BANK",
//     "Navacord",
//     "INTACT FINANCIAL CORPORATION",
//     "CTS",
//     "Central 1 Credit Union",
//     "CNO FINANCIAL",
//     "GREAT-WEST LIFE",
//     "BANK OF MONTREAL",
//     "NOT DEFINED",
//     "UHG",
//     "ROYAL CARIBBEAN",
//     "PACIFIC LIFE",
//     "WALMART",
//     "ROCHE",
//     "AMERICAN EXPRESS",
//     "Alphabet Inc.",
//     "VERIZON",
//   ];
//   // Nested Tech Stack Mapping
//   const techStackOptions = {
//     Mainframe: [
//       "COBOL",
//       "JCL",
//       "VSAM",
//       "CICS",
//       "DB2",
//       "IMS",
//       "REXX",
//       "Endevor/Changeman",
//       "File-Aid",
//       "Abend Analysis",
//       "Performance Tuning",
//       "Batch & Online Processing",
//     ],
//     Java: [
//       "Core Java",
//       "OOPs",
//       "Spring",
//       "Spring Boot",
//       "Hibernate/JPA",
//       "REST APIs",
//       "Microservices",
//       "Maven/Gradle",
//       "Multithreading",
//       "JVM Tuning",
//       "Unit Testing (JUnit/Mockito)",
//       "Kafka",
//     ],
//     ".NET": [
//       "C#",
//       "ASP.NET",
//       "ASP.NET Core",
//       "MVC",
//       "Web API",
//       "Entity Framework",
//       "LINQ",
//       "Blazor",
//       "WCF",
//       "Windows Services",
//       "Unit Testing (xUnit/NUnit)",
//       "Azure Integration",
//     ],
//     "AI / ML": [
//       "Python",
//       "Machine Learning",
//       "Deep Learning",
//       "NLP",
//       "Computer Vision",
//       "TensorFlow",
//       "PyTorch",
//       "Scikit-learn",
//       "Data Pre-processing",
//       "Model Training & Evaluation",
//       "MLOps",
//       "Prompt Engineering",
//     ],
//     React: [
//       "JavaScript (ES6)",
//       "JSX",
//       "Functional Components",
//       "Hooks",
//       "Redux",
//       "Context API",
//       "React Router",
//       "State Management",
//       "API Integration",
//       "Unit Testing (Jest)",
//       "Performance Optimisation",
//     ],
//     Cloud: [
//       "AWS",
//       "Azure",
//       "GCP",
//       "Virtual Machines",
//       "Storage",
//       "Networking",
//       "IAM",
//       "Docker",
//       "Kubernetes",
//       "CI/CD",
//       "DevOps",
//       "Serverless",
//       "Monitoring & Logging",
//       "Cloud Security",
//     ],
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
//     Salesforce: [
//       "SFDC Admin",
//       "Apex",
//       "LWC",
//       "Visualforce",
//       "Sales/Service Cloud",
//     ],
//     ServiceNow: ["ITSM", "ITOM", "Service Portal", "GlideScript"],
//     SAP: ["SAP ABAP", "SAP FICO", "SAP HANA", "SAP MM/SD"],
//     "C / C++ / Embedded": ["C", "C++", "Embedded Systems", "RTOS"],
//     "PHP / Laravel": ["PHP", "Laravel", "Symfony", "CodeIgniter"],
//     "Ruby on Rails": ["Ruby", "Rails", "RSpec"],
//     Other: ["Other Tools/Frameworks"],
//   };

//   useEffect(() => {
//     if (employeeId) {
//       setFormData((prev) => ({ ...prev, name: employeeName }));
//       autoLoadCalendarMarkers(employeeId);

//       // Trigger the auto-fill silently in the background
//       handleLoadFormMetadata(true);

//       setErrorMessage("");
//     } else {
//       setErrorMessage(
//         "🚨 Access Warning: Unable to identify logged-in employee context.",
//       );
//     }
//   }, [employeeId, employeeName]);

//   // --- Fetch Operations ---
//   const autoLoadCalendarMarkers = async (targetId) => {
//     if (!targetId) return;
//     try {
//       const cacheBuster = Date.now();
//       // 🔒 Dispatched over the secure config wrapper channel
//       const response = await api.get(
//         `/api/panel/nominations/${targetId}?_t=${cacheBuster}`,
//       );
//       const data = response.data;

//       if (data.success && data.data.length > 0) {
//         let consolidatedSlots = [];
//         data.data.forEach((record) => {
//           try {
//             const parsed = JSON.parse(record.booked_slots);
//             if (Array.isArray(parsed)) {
//               parsed.forEach((slot) => {
//                 const isDuplicate = consolidatedSlots.some(
//                   (s) => s.date === slot.date && s.time === slot.time,
//                 );
//                 if (!isDuplicate) consolidatedSlots.push(slot);
//               });
//             }
//           } catch (e) { }
//         });
//         setBookedSlots(consolidatedSlots);
//         setSavedBackupSlots(consolidatedSlots);
//       } else {
//         setBookedSlots([]);
//         setSavedBackupSlots([]);
//       }
//     } catch (error) {
//       console.error("Failed to load calendar markers safely:", error);
//     }
//   };

//   const handleLoadFormMetadata = async (isSilentLoad = false) => {
//     if (!employeeId) return;

//     if (!isSilentLoad) {
//       setLoading(true);
//       setErrorMessage("");
//     }

//     try {
//       const cacheBuster = Date.now();
//       // 🔒 Dispatched over unified protected layout instance channel
//       const response = await api.get(
//         `/api/panel/nominations/${employeeId}?_t=${cacheBuster}`,
//       );
//       const data = response.data;

//       if (data.success && data.data.length > 0) {
//         const baseRecord = data.data[0];
//         setNominationId(baseRecord.NominationId);
//         setFormData((prev) => ({
//           ...prev,
//           grade: baseRecord.grade,
//           location: baseRecord.location,
//           parentCustomer: baseRecord.parentCustomer,
//           contactNo: baseRecord.contactNo,
//           interviewSkills: baseRecord.interviewSkills,
//         }));
//       } else {
//         if (!isSilentLoad) {
//           setErrorMessage("ℹ️ No previous form details found.");
//         }
//       }
//     } catch (error) {
//       if (!isSilentLoad) {
//         setErrorMessage(
//           "❌ Failed to pull form settings from server securely.",
//         );
//       }
//     } finally {
//       if (!isSilentLoad) setLoading(false);
//     }
//   };
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     if (name === "contactNo") {
//       setFormData((prev) => ({ ...prev, [name]: value.replace(/\D/g, "") }));
//       return;
//     }
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const openSkillsModal = () => {
//     const currentSkills = formData.interviewSkills
//       ? formData.interviewSkills.split(", ")
//       : [];
//     setTempSkills(currentSkills);
//     setShowSkillsModal(true);
//   };

//   const toggleSkill = (skill) => {
//     setTempSkills((prev) =>
//       prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
//     );
//   };

//   const saveSkills = () => {
//     setPopupDialog({
//       isOpen: true,
//       type: "confirm",
//       title: "Confirm Skills",
//       message:
//         "Are you sure that you will be able to evaluate the candidate on the selected skills?",
//       onConfirm: () => {
//         setFormData((prev) => ({
//           ...prev,
//           interviewSkills: tempSkills.join(", "),
//         }));
//         setShowSkillsModal(false);
//         setPopupDialog((prev) => ({ ...prev, isOpen: false })); // Close dialog
//       },
//     });
//   };

//   // --- Calendar Handlers ---
//   const getRollingDates = () => {
//     const today = new Date();
//     const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

//     // Calculate days remaining to reach the Sunday of the *next* week
//     const daysToFirstSunday = currentDay === 0 ? 0 : 14 - currentDay;
//     const totalDays = daysToFirstSunday + 7; // Adds another week to ensure a ~2 week window ending on Sunday

//     const dates = [];
//     for (let i = 0; i <= totalDays; i++) {
//       const d = new Date(today);
//       d.setDate(today.getDate() + i);
//       dates.push(d.toLocaleDateString("en-CA"));
//     }
//     return dates;
//   };

//   // Replace the old visibleDates declaration with this:
//   const visibleDates = getRollingDates();

//   const handleTimeSlotToggle = (time) => {
//     if (!selectedDate) return;
//     const isPreviouslySaved = savedBackupSlots.some(
//       (s) => s.date === selectedDate && s.time === time,
//     );

//     if (!isPreviouslySaved && selectedDate < T1_STR) {
//       alert(
//         "🔒 You can only schedule new interview slots for tomorrow or later.",
//       );
//       return;
//     }

//     if (isPreviouslySaved && selectedDate < T2_STR) {
//       alert(
//         "🔒 You cannot cancel this slot. Cancellations require at least 2 days' advance notice.",
//       );
//       return;
//     }

//     const slotExists = bookedSlots.some(
//       (s) => s.date === selectedDate && s.time === time,
//     );
//     if (slotExists) {
//       setBookedSlots(
//         bookedSlots.filter(
//           (s) => !(s.date === selectedDate && s.time === time),
//         ),
//       );
//     } else {
//       setBookedSlots([...bookedSlots, { date: selectedDate, time: time }]);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!employeeId)
//       return alert("Unable to identify logged-in employee context");
//     if (formData.contactNo.length < 10)
//       return setErrorMessage("🚨 Contact number must be at least 10 digits.");
//     if (bookedSlots.length === 0)
//       return setErrorMessage(
//         "🚨 Please select at least one calendar slot block.",
//       );
//     if (!formData.interviewSkills)
//       return setErrorMessage("🚨 Please select your interview skills.");

//     setLoading(true);
//     setErrorMessage("");
//     try {
//       // 🔒 Swapped native fetch for structural api methods to handle mutations safely
//       const response = await api.post("/api/panel/nomination", {
//         nominationId,
//         employeeId,
//         ...formData,
//         bookedSlots,
//       });
//       const data = response.data;
//       setResponseData(data);

//       setPopupDialog({
//         isOpen: true,
//         type: "success",
//         title: "Success!",
//         message: data.message || "Schedule updated successfully.",
//         onConfirm: null,
//       });

//       setNominationId(null);
//       setFormData((prev) => ({
//         ...prev,
//         grade: "",
//         location: "",
//         parentCustomer: "",
//         contactNo: "",
//         interviewSkills: "",
//       }));
//       setSelectedDate(null);

//       autoLoadCalendarMarkers(employeeId);
//       handleLoadFormMetadata(true);
//     } catch (error) {
//       const errMsg =
//         error.response?.data?.message ||
//         "❌ Connection dropped or unauthorized action.";
//       setErrorMessage(errMsg);
//     } finally {
//       setLoading(false);
//     }
//   };
//   // const visibleDates = getTwoWeekDates(new Date(calendarBaseDate));
//   const newlyAddedSlots = bookedSlots.filter(
//     (b) =>
//       !savedBackupSlots.some((s) => s.date === b.date && s.time === b.time),
//   );
//   const removedSlots = savedBackupSlots.filter(
//     (s) => !bookedSlots.some((b) => b.date === s.date && b.time === s.time),
//   );

//   return (
//     <div className="max-w-6xl mx-auto p-4 font-sans text-gray-800 animation-fadeIn">
//       {/* --- Navigation Tabs --- */}
//       {/* --- Navigation Tabs (3 Tabs Now visible to everyone) --- */}
//       <div className="flex flex-wrap gap-2 border-b border-gray-300 mb-6 pb-2">
//         <button
//           onClick={() => setActiveTab("self")}
//           className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "self" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
//         >
//           User Panel Entry (Self)
//         </button>
//         <button
//           onClick={() => setActiveTab("myRoster")}
//           className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "myRoster" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
//         >
//           My Roster
//         </button>
//         <button
//           onClick={() => setActiveTab("masterRoster")}
//           className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "masterRoster" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
//         >
//           Master Roster
//         </button>
//         {isAuthorized && (
//           <button
//             onClick={() => setActiveTab("InterviewBookingTemplate")}
//             className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "InterviewBookingTemplate" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
//           >
//             Reserve/Release Panelist (SA+ Only)
//           </button>
//         )}
//       </div>

//       {/* =========================================
//                 SELF NOMINATION VIEW (Compacted)
//             ========================================= */}
//       {activeTab === "self" && (
//         <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden text-sm">
//           {/* Compact Banner */}
//           <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
//             <div>
//               <h2 className="text-lg font-bold text-blue-900">
//                 {nominationId
//                   ? "✏️ Edit Existing Panel Entry"
//                   : "Register New Panel Entry"}
//               </h2>
//               <p className="text-gray-600 mt-1 text-xs">
//                 Today is: <strong>{TODAY_STR}</strong> | Add new slots:{" "}
//                 <strong>Tomorrow onwards</strong> | Cancellations:{" "}
//                 <strong>Requires 2 days notice</strong>
//               </p>
//             </div>
//             {/* {nominationId && (
//                             <button type="button" onClick={() => { setNominationId(null); autoLoadCalendarMarkers(employeeId); }} className="text-l px-4 py-2 bg-white text-red-600 border border-red-200 font-medium rounded shadow-sm hover:bg-red-50 transition">
//                                 Register a New Entry
//                             </button>
//                         )} */}
//             {!nominationId && employeeId && (
//               <button
//                 type="button"
//                 onClick={handleLoadFormMetadata}
//                 disabled={loading}
//                 className="px-4 py-2 bg-gray-100 text-gray-700 font-medium text-sm rounded border border-gray-300 hover:bg-gray-200 transition-colors"
//               >
//                 ✏️ Load Previous Schedule
//               </button>
//             )}
//           </div>

//           {errorMessage && (
//             <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mx-4 mt-4 rounded text-sm">
//               {errorMessage}
//             </div>
//           )}

//           <form onSubmit={handleSubmit} className="p-4 space-y-4">
//             {/* Profile Info - 2 Col Grid */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded border border-gray-100">
//               <div className="flex flex-col">
//                 <label className="text-gray-700 font-bold mb-1 text-xs">
//                   Employee ID
//                 </label>
//                 <input
//                   type="text"
//                   value={employeeId || "Not Logged In"}
//                   disabled
//                   className="p-2 bg-gray-200 border border-gray-300 rounded text-gray-600 cursor-not-allowed"
//                 />
//               </div>
//               <div className="flex flex-col">
//                 <label className="text-gray-700 font-bold mb-1 text-xs">
//                   Full Name
//                 </label>
//                 <input
//                   type="text"
//                   value={formData.name || "Anonymous User"}
//                   disabled
//                   className="p-2 bg-gray-200 border border-gray-300 rounded text-gray-600 cursor-not-allowed"
//                 />
//               </div>
//             </div>

//             {/* Editable Form Grid - 4 Col Grid to save vertical space */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//               <div>
//                 <label className="block text-gray-700 font-bold mb-1 text-xs">
//                   Designation *
//                 </label>
//                 <select
//                   name="grade"
//                   required
//                   value={formData.grade}
//                   onChange={handleInputChange}
//                   className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
//                 >
//                   <option value="" disabled>
//                     -- Select --
//                   </option>
//                   {gradeOptions.map((g) => (
//                     <option key={g} value={g}>
//                       {g}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-gray-700 font-bold mb-1 text-xs">
//                   Customer Account *
//                 </label>
//                 <select
//                   name="parentCustomer"
//                   required
//                   value={formData.parentCustomer}
//                   onChange={handleInputChange}
//                   className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
//                 >
//                   <option value="" disabled>
//                     -- Select --
//                   </option>
//                   {customerOptions.map((cust) => (
//                     <option key={cust} value={cust}>
//                       {cust}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-gray-700 font-bold mb-1 text-xs">
//                   Location *
//                 </label>
//                 <select
//                   name="location"
//                   required
//                   value={formData.location}
//                   onChange={handleInputChange}
//                   className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
//                 >
//                   <option value="" disabled>
//                     -- Select --
//                   </option>
//                   {locationOptions.map((loc) => (
//                     <option key={loc} value={loc}>
//                       {loc}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-gray-700 font-bold mb-1 text-xs">
//                   Contact Number *
//                 </label>
//                 <input
//                   type="text"
//                   name="contactNo"
//                   required
//                   maxLength="12"
//                   value={formData.contactNo}
//                   onChange={handleInputChange}
//                   placeholder="e.g. 9876543210"
//                   className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
//                 />
//               </div>
//             </div>

//             {/* Skills Selection */}
//             <div>
//               <label className="block text-gray-700 font-bold mb-1 text-xs">
//                 Technical Interview Skills *
//               </label>
//               <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded border border-gray-200">
//                 <input
//                   type="text"
//                   readOnly
//                   required
//                   value={formData.interviewSkills}
//                   placeholder="No skills selected."
//                   className="flex-1 p-2 bg-transparent text-sm text-blue-800 font-semibold border-none focus:ring-0 cursor-default"
//                 />
//                 <button
//                   type="button"
//                   onClick={openSkillsModal}
//                   className="px-4 py-2 bg-indigo-600 text-white font-medium rounded shadow hover:bg-indigo-700 transition-colors whitespace-nowrap text-xs"
//                 >
//                   + Select Skills
//                 </button>
//               </div>
//             </div>

//             {/* Calendar & Slots */}
//             <div className="border-t border-gray-200 pt-4">
//               <label className="block text-gray-700 font-bold mb-2 text-sm">
//                 Assign Availability Schedule
//               </label>

//               <div className="flex flex-col lg:flex-row gap-4">
//                 {/* CALENDAR WIDGET */}
//                 {/* CALENDAR WIDGET */}
//                 <div className="flex-1 bg-white border border-gray-300 rounded shadow-sm p-4">
//                   <div className="flex justify-center items-center mb-4 bg-gray-100 p-2 rounded">
//                     <span className="text-sm font-bold text-gray-800">
//                       Current Booking Window
//                     </span>
//                   </div>
//                   <div className="grid grid-cols-7 gap-2">
//                     {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
//                       (day) => (
//                         <div
//                           key={day}
//                           className="text-center font-bold text-gray-500 uppercase text-[10px] tracking-wider"
//                         >
//                           {day}
//                         </div>
//                       ),
//                     )}

//                     {/* Blank spaces to align the first day to the correct weekday column */}
//                     {Array.from({
//                       length: new Date(visibleDates[0]).getDay(),
//                     }).map((_, i) => (
//                       <div key={`blank-${i}`} />
//                     ))}

//                     {visibleDates.map((d) => {
//                       // Check specifically for LEAVE or Normal slots
//                       const isLeaveDay = bookedSlots.some((s) => s.date === d && s.time === "LEAVE");
//                       const hasNormalSlots = bookedSlots.some((s) => s.date === d && s.time !== "LEAVE");
//                       const isSelected = selectedDate === d;

//                       return (
//                         <button
//                           type="button"
//                           key={d}
//                           onClick={() => setSelectedDate(d)}
//                           className={`
//         p-2 rounded text-sm font-semibold border transition-all
//         ${isSelected
//                               ? "bg-blue-100 border-blue-500 text-blue-900 shadow-sm"
//                               : isLeaveDay
//                                 ? "bg-rose-100 border-rose-400 text-rose-800" // 🔴 Red for Leave
//                                 : hasNormalSlots
//                                   ? "bg-green-50 border-green-400 text-green-900" // 🟢 Green for Normal Availability
//                                   : "bg-white border-gray-200 text-gray-700 hover:border-blue-300" // ⚪ Blank
//                             }
//       `}
//                         >
//                           {d.split("-")[2]}
//                         </button>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 {/* TIME PICKER */}
//                 {/* <div className="flex-1 bg-gray-50 border border-gray-300 rounded shadow-sm p-4">
//                   <h4 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
//                     Time Slots for:{" "}
//                     <span className="text-blue-600">
//                       {selectedDate || "Select a date"}
//                     </span>
//                   </h4>

//                   {selectedDate ? (
//                     <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
//                       {availableTimeSlots.map((time) => {
//                         const isSelected = bookedSlots.some(
//                           (s) => s.date === selectedDate && s.time === time,
//                         );
//                         const isPreviouslySaved = savedBackupSlots.some(
//                           (s) => s.date === selectedDate && s.time === time,
//                         );

//                         // 👉 NEW LOGIC: Check if today is marked as a leave day
//                         const isLeaveDay = bookedSlots.some(
//                           (s) => s.date === selectedDate && s.time === "LEAVE"
//                         );

//                         let isLocked = false;
//                         let lockReason = "";
//                         if (isLeaveDay) {
//                           isLocked = true;
//                           lockReason = "On Leave";
//                         } else if (!isPreviouslySaved && selectedDate < T1_STR) {
//                           isLocked = true;
//                           lockReason = "Too soon";
//                         } else if (isPreviouslySaved && selectedDate < T2_STR) {
//                           isLocked = true;
//                           lockReason = "Cannot cancel";
//                         }

//                         return (
//                           <button
//                             type="button"
//                             key={time}
//                             disabled={isLocked}
//                             onClick={() => handleTimeSlotToggle(time)}
//                             className={`
//                                                             px-2 py-2 rounded text-xs font-semibold border transition-all flex flex-col items-center justify-center text-center
//                                                             ${isLocked
//                                 ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed opacity-70"
//                                 : isSelected
//                                   ? "bg-blue-600 border-blue-700 text-white shadow-sm"
//                                   : "bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400 cursor-pointer"
//                               }
//                                                         `}
//                           >
//                             <span>{time}</span>
//                             {lockReason && (
//                               <span className="text-[10px] font-normal mt-0.5 block opacity-80">
//                                 {lockReason}
//                               </span>
//                             )}
//                           </button>
//                         );
//                       })}
//                     </div>
//                   ) : (
//                     <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
//                       Click a date in the calendar to view slots.
//                     </div>
//                   )}
//                 </div> */}


//                 <div className="flex-1 bg-gray-50 border border-gray-300 rounded shadow-sm p-4 flex flex-col">
//                   <h4 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
//                     Time Slots for:{" "}
//                     <span className="text-blue-600">
//                       {selectedDate || "Select a date"}
//                     </span>
//                   </h4>

//                   {selectedDate ? (
//                     <div className="flex flex-col h-full justify-between">
//                       {/* Time Slot Grid */}
//                       <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
//                         {availableTimeSlots.map((time) => {
//                           const isSelected = bookedSlots.some(
//                             (s) => s.date === selectedDate && s.time === time,
//                           );
//                           const isPreviouslySaved = savedBackupSlots.some(
//                             (s) => s.date === selectedDate && s.time === time,
//                           );

//                           // Check if today is marked as a leave day
//                           const isLeaveDay = bookedSlots.some(
//                             (s) => s.date === selectedDate && s.time === "LEAVE"
//                           );

//                           let isLocked = false;
//                           let lockReason = "";

//                           if (isLeaveDay) {
//                             isLocked = true;
//                             lockReason = "On Leave";
//                           } else if (!isPreviouslySaved && selectedDate < T1_STR) {
//                             isLocked = true;
//                             lockReason = "Too soon";
//                           } else if (isPreviouslySaved && selectedDate < T2_STR) {
//                             isLocked = true;
//                             lockReason = "Cannot cancel";
//                           }

//                           return (
//                             <button
//                               type="button"
//                               key={time}
//                               disabled={isLocked}
//                               onClick={() => handleTimeSlotToggle(time)}
//                               className={`
//                     px-2 py-2 rounded text-xs font-semibold border transition-all flex flex-col items-center justify-center text-center
//                     ${isLocked && isLeaveDay
//                                   ? "bg-rose-100 border-rose-200 text-rose-500 cursor-not-allowed opacity-80"
//                                   : isLocked
//                                     ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed opacity-70"
//                                     : isSelected
//                                       ? "bg-blue-600 border-blue-700 text-white shadow-sm"
//                                       : "bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400 cursor-pointer"
//                                 }
//                   `}
//                             >
//                               <span>{time}</span>
//                               {lockReason && (
//                                 <span className="text-[10px] font-normal mt-0.5 block opacity-80">
//                                   {lockReason}
//                                 </span>
//                               )}
//                             </button>
//                           );
//                         })}
//                       </div>

//                       {/* Compact Leave Toggle */}
//                       <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
//                         <label className="flex items-center gap-2 cursor-pointer bg-rose-50 px-3 py-1.5 rounded border border-rose-200 hover:bg-rose-100 transition-colors w-max shadow-sm">
//                           <input
//                             type="checkbox"
//                             checked={bookedSlots.some((s) => s.date === selectedDate && s.time === "LEAVE")}
//                             onChange={(e) => {
//                               if (e.target.checked) {
//                                 // Wipe normal times, insert "LEAVE" slot
//                                 setBookedSlots((prev) => [
//                                   ...prev.filter((s) => s.date !== selectedDate),
//                                   { date: selectedDate, time: "LEAVE" },
//                                 ]);
//                               } else {
//                                 // Remove "LEAVE" slot
//                                 setBookedSlots((prev) =>
//                                   prev.filter((s) => !(s.date === selectedDate && s.time === "LEAVE"))
//                                 );
//                               }
//                             }}
//                             className="w-3.5 h-3.5 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
//                           />
//                           <span className="text-xs font-bold text-rose-800">
//                             🏖️ Mark as On Leave
//                           </span>
//                         </label>
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="h-full flex items-center justify-center text-gray-400 text-xs italic pb-6">
//                       Click a date in the calendar to view slots.
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* AUDIT SUMMARY DISPLAY */}
//               <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
//                 <h4 className="text-sm font-bold text-blue-900 mb-2">
//                   Live Session Agenda Summary
//                 </h4>
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <div className="bg-white p-3 rounded shadow-sm border border-gray-200">
//                     <strong className="text-gray-700 block mb-1 border-b pb-1 text-xs">
//                       Saved (Historical)
//                     </strong>
//                     <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 text-xs no-scrollbar">
//                       {savedBackupSlots.length === 0 ? (
//                         <li className="text-gray-400 italic">None</li>
//                       ) : (
//                         savedBackupSlots.map((s, i) => (
//                           <li
//                             key={i}
//                             className="text-gray-700 py-1 border-l-2 border-gray-400 pl-2"
//                           >
//                             {s.date}{" "}
//                             <span className="text-gray-500">[{s.time}]</span>
//                           </li>
//                         ))
//                       )}
//                     </ul>
//                   </div>
//                   <div className="bg-green-50 p-3 rounded shadow-sm border border-green-200">
//                     <strong className="text-green-800 block mb-1 border-b border-green-200 pb-1 text-xs">
//                       New (Pending)
//                     </strong>
//                     <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 text-xs no-scrollbar">
//                       {newlyAddedSlots.length === 0 ? (
//                         <li className="text-green-600/50 italic">None</li>
//                       ) : (
//                         newlyAddedSlots.map((s, i) => (
//                           <li
//                             key={i}
//                             className="text-green-700 font-semibold py-1 border-l-2 border-green-500 pl-2"
//                           >
//                             + {s.date}{" "}
//                             <span className="opacity-80 font-normal">
//                               [{s.time}]
//                             </span>
//                           </li>
//                         ))
//                       )}
//                     </ul>
//                   </div>
//                   <div className="bg-red-50 p-3 rounded shadow-sm border border-red-200">
//                     <strong className="text-red-800 block mb-1 border-b border-red-200 pb-1 text-xs">
//                       Removing (Pending)
//                     </strong>
//                     <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 text-xs no-scrollbar">
//                       {removedSlots.length === 0 ? (
//                         <li className="text-red-600/50 italic">None</li>
//                       ) : (
//                         removedSlots.map((s, i) => (
//                           <li
//                             key={i}
//                             className="text-red-700 font-semibold py-1 border-l-2 border-red-500 pl-2 line-through opacity-80"
//                           >
//                             - {s.date} [{s.time}]
//                           </li>
//                         ))
//                       )}
//                     </ul>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Form Actions */}
//             <div className="flex justify-end items-center gap-3 border-t border-gray-200 pt-4 mt-2">
//               {/* {!nominationId && employeeId && (
//                                 <button type="button" onClick={handleLoadFormMetadata} disabled={loading} className="px-4 py-2 bg-gray-100 text-gray-700 font-medium text-sm rounded border border-gray-300 hover:bg-gray-200 transition-colors">
//                                     ✏️ Load Previous Schedule
//                                 </button>
//                             )} */}
//               <button
//                 type="submit"
//                 disabled={loading || !employeeId}
//                 className="px-6 py-2 bg-blue-600 text-white font-bold text-sm rounded shadow hover:bg-blue-700 transition-colors disabled:opacity-50"
//               >
//                 {nominationId
//                   ? "💾 Save Modifications"
//                   : "🚀 Submit Availability"}
//               </button>
//             </div>
//           </form>
//         </div>
//       )}

//       {/* =========================================
//                 TAB 2: MY ROSTER VIEW 
//             ========================================= */}
//       {activeTab === "myRoster" && <MyRoster />}

//       {/* =========================================
//                 TAB 3: MASTER ROSTER VIEW (Shows Everyone)
//             ========================================= */}
//       {activeTab === "masterRoster" && <AdminRoster />}

//       {activeTab === "InterviewBookingTemplate" && (
//         <InterviewBookingTemplate
//           currentUserDetails={{
//             employeeId: employeeId,
//             name: employeeName,
//             grade: formData.grade,
//             location: formData.location,
//             parentCustomer: formData.parentCustomer,
//             contactNo: formData.contactNo,
//           }}
//         />
//       )}

//       {/* =========================================
//                 MODALS & POPUPS
//             ========================================= */}
//       {/* SKILLS MODAL */}
//       {showSkillsModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animation-fadeIn">
//           <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full border border-gray-200 flex flex-col max-h-[90vh]">
//             <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex-shrink-0">
//               Select Specific Interview Competencies
//             </h3>

//             <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
//               {/* {Object.entries(techStackOptions).map(([category, subSkills]) => (
//                 <div
//                   key={category}
//                   className="bg-gray-50 border border-gray-200 rounded p-3"
//                 >
//                   <h4 className="text-sm font-bold text-gray-800 mb-2">
//                     {category}
//                   </h4>
//                   <div className="flex flex-wrap gap-2">
//                     {subSkills.map((skill) => (
//                       <label key={skill} className="custom-pill-label relative">
//                         <input
//                           type="checkbox"
//                           className="custom-pill-input sr-only"
//                           checked={tempSkills.includes(skill)}
//                           onChange={() => toggleSkill(skill)}
//                         />
//                         <div className="custom-pill-bg px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 font-medium text-xs hover:border-blue-400 bg-white">
//                           {skill}
//                         </div>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               ))} */}

//               {Object.entries(techStackOptions).map(([category, subSkills]) => (
//                 <div
//                   key={category}
//                   className="bg-gray-50 border border-gray-200 rounded p-3"
//                 >
//                   <h4 className="text-sm font-bold text-gray-800 mb-2">
//                     {category}
//                   </h4>

//                   {category === "Other" ? (
//                     <div className="flex flex-col gap-3">
//                       {/* Dynamically display added custom skills so they can be removed */}
//                       <div className="flex flex-wrap gap-2">
//                         {tempSkills
//                           .filter(
//                             (skill) =>
//                               !Object.values(techStackOptions)
//                                 .flat()
//                                 .includes(skill),
//                           )
//                           .map((customAddedSkill) => (
//                             <label
//                               key={customAddedSkill}
//                               className="custom-pill-label relative cursor-pointer"
//                             >
//                               <input
//                                 type="checkbox"
//                                 className="custom-pill-input sr-only"
//                                 checked={true}
//                                 onChange={() => toggleSkill(customAddedSkill)}
//                               />
//                               <div className="custom-pill-bg px-3 py-1.5 rounded-full border border-blue-400 bg-blue-50 text-blue-800 font-medium text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-400 transition-colors">
//                                 {customAddedSkill} ✕
//                               </div>
//                             </label>
//                           ))}
//                       </div>

//                       {/* Input box for new custom skills */}
//                       <div className="flex items-center gap-2">
//                         <input
//                           type="text"
//                           value={customSkill}
//                           onChange={(e) => setCustomSkill(e.target.value)}
//                           placeholder="Type preferred tech stack & press Enter..."
//                           className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
//                           onKeyDown={(e) => {
//                             if (e.key === "Enter") {
//                               e.preventDefault();
//                               const newSkill = customSkill.trim();
//                               if (newSkill && !tempSkills.includes(newSkill)) {
//                                 toggleSkill(newSkill);
//                                 setCustomSkill("");
//                               }
//                             }
//                           }}
//                         />
//                         <button
//                           type="button"
//                           onClick={() => {
//                             const newSkill = customSkill.trim();
//                             if (newSkill && !tempSkills.includes(newSkill)) {
//                               toggleSkill(newSkill);
//                               setCustomSkill("");
//                             }
//                           }}
//                           className="px-4 py-2 bg-gray-800 text-white font-medium rounded shadow hover:bg-gray-900 transition-colors text-xs"
//                         >
//                           Add
//                         </button>
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="flex flex-wrap gap-2">
//                       {subSkills.map((skill) => (
//                         <label
//                           key={skill}
//                           className="custom-pill-label relative cursor-pointer"
//                         >
//                           <input
//                             type="checkbox"
//                             className="custom-pill-input sr-only"
//                             checked={tempSkills.includes(skill)}
//                             onChange={() => toggleSkill(skill)}
//                           />
//                           <div className="custom-pill-bg px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 font-medium text-xs hover:border-blue-400 bg-white transition-colors">
//                             {skill}
//                           </div>
//                         </label>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>

//             <div className="flex gap-3 justify-end pt-3 border-t border-gray-200 flex-shrink-0">
//               <button
//                 type="button"
//                 onClick={() => setShowSkillsModal(false)}
//                 className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded hover:bg-gray-200 text-sm"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="button"
//                 onClick={saveSkills}
//                 className="px-4 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700 text-sm"
//               >
//                 Confirm & Save
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* SUCCESS POPUP */}
//       {/* REUSABLE DIALOG POPUP */}
//       {popupDialog.isOpen && (
//         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animation-fadeIn">
//           <div
//             className={`bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border-t-4 ${popupDialog.type === "success" ? "border-green-500" : "border-blue-500"}`}
//           >
//             {/* Dynamic Icon */}
//             <div
//               className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 shadow-inner ${popupDialog.type === "success" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}
//             >
//               {popupDialog.type === "success" ? "✓" : "?"}
//             </div>

//             <h2 className="text-xl font-bold text-gray-800 mb-2">
//               {popupDialog.title}
//             </h2>
//             <p className="text-gray-600 text-sm mb-6">{popupDialog.message}</p>

//             {/* Dynamic Buttons based on 'type' */}
//             {popupDialog.type === "confirm" ? (
//               <div className="flex gap-3 justify-center">
//                 <button
//                   type="button"
//                   className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold text-sm rounded hover:bg-gray-200 transition-colors"
//                   onClick={() =>
//                     setPopupDialog((prev) => ({ ...prev, isOpen: false }))
//                   }
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="button"
//                   className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded shadow hover:bg-blue-700 transition-colors"
//                   onClick={popupDialog.onConfirm}
//                 >
//                   Yes, I'm sure
//                 </button>
//               </div>
//             ) : (
//               <button
//                 type="button"
//                 className="w-full px-4 py-2 bg-gray-900 text-white font-bold text-sm rounded shadow hover:bg-gray-800 transition-colors"
//                 onClick={() =>
//                   setPopupDialog((prev) => ({ ...prev, isOpen: false }))
//                 }
//               >
//                 Close
//               </button>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PanelNomination;


import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import MyRoster from "./MyRoster";
import InterviewBookingTemplate from "./SlotBooking";
const api_url = import.meta.env.VITE_API_URL;
import AdminRoster from "./AdminRoster";
import api from "../../Api";

const PanelNomination = () => {
  // --- Context & Date Logic ---
  const { user } = useApp();
  const employeeId = user?.employeeId || "";
  const employeeName = user?.name || "";

  const todayObj = new Date();
  const TODAY_STR = todayObj.toLocaleDateString("en-CA");

  const t1Obj = new Date(todayObj);
  t1Obj.setDate(t1Obj.getDate() + 1);
  const T1_STR = t1Obj.toLocaleDateString("en-CA");
  const t2Obj = new Date(todayObj);
  t2Obj.setDate(t2Obj.getDate() + 2);
  const T2_STR = t2Obj.toLocaleDateString("en-CA");

  // --- State Variables ---
  const [activeTab, setActiveTab] = useState("self");
  const [nominationId, setNominationId] = useState(null);
  const [responseData, setResponseData] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    location: "",
    parentCustomer: "",
    contactNo: "",
    interviewSkills: "",
  });

  const allowedGrades = ["P","PAT","PT","PA", "A", "SA", "M", "SM", "AD"];
  const isAuthorized = true; 

  const [selectedDate, setSelectedDate] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [savedBackupSlots, setSavedBackupSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // New State for Default Mode (Virtual vs F2F)
  const [defaultMode, setDefaultMode] = useState("Virtual");

  const [popupDialog, setPopupDialog] = useState({
    isOpen: false,
    type: "success", 
    title: "",
    message: "",
    onConfirm: null, 
  });
  const [errorMessage, setErrorMessage] = useState("");

  // --- Skills Modal State ---
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [tempSkills, setTempSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState("");

  const gradeOptions = ["P","PAT","PT","PA", "A", "SA", "M", "SM", "AD"];

  // --- Static Options ---
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

  const locationOptions = [
    "Kolkata", "Chennai", "Bengaluru", "Mumbai", "Mangalore", "Indore", 
    "Gurugram", "Bhubaneshwar", "Pune", "Hyderabad", "Coimbatore", 
    "Visakhapatnam", "Kochi", "Other PAN India", "Canada", "USA", "Japan", "Other Countries"
  ];

  const customerOptions = [
    "MANULIFE", "TORONTO DOMINION BANK", "ROYAL BANK OF CANADA", "Coast Capital Savings",
    "CITY NATIONAL BANK", "Navacord", "INTACT FINANCIAL CORPORATION", "CTS", "Central 1 Credit Union",
    "CNO FINANCIAL", "GREAT-WEST LIFE", "BANK OF MONTREAL", "NOT DEFINED", "UHG", "ROYAL CARIBBEAN",
    "PACIFIC LIFE", "WALMART", "ROCHE", "AMERICAN EXPRESS", "Alphabet Inc.", "VERIZON",
  ];

  const techStackOptions = {
    Mainframe: ["COBOL", "JCL", "VSAM", "CICS", "DB2", "IMS", "REXX", "Endevor/Changeman", "File-Aid", "Abend Analysis", "Performance Tuning", "Batch & Online Processing"],
    Java: ["Core Java", "OOPs", "Spring", "Spring Boot", "Hibernate/JPA", "REST APIs", "Microservices", "Maven/Gradle", "Multithreading", "JVM Tuning", "Unit Testing (JUnit/Mockito)", "Kafka"],
    ".NET": ["C#", "ASP.NET", "ASP.NET Core", "MVC", "Web API", "Entity Framework", "LINQ", "Blazor", "WCF", "Windows Services", "Unit Testing (xUnit/NUnit)", "Azure Integration"],
    "AI / ML": ["Python", "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Scikit-learn", "Data Pre-processing", "Model Training & Evaluation", "MLOps", "Prompt Engineering"],
    React: ["JavaScript (ES6)", "JSX", "Functional Components", "Hooks", "Redux", "Context API", "React Router", "State Management", "API Integration", "Unit Testing (Jest)", "Performance Optimisation"],
    Cloud: ["AWS", "Azure", "GCP", "Virtual Machines", "Storage", "Networking", "IAM", "Docker", "Kubernetes", "CI/CD", "DevOps", "Serverless", "Monitoring & Logging", "Cloud Security"],
    "Scrum Master": ["Scrum Framework", "Sprint Planning", "Daily Scrum Facilitation", "Sprint Review", "Sprint Retrospective", "Backlog Refinement", "Agile Estimation", "User Story Management", "Jira Board Management", "Impediment Removal", "Stakeholder Communication", "Team Facilitation", "Agile Metrics", "Servant Leadership", "SAFe Agile"],
    Salesforce: ["SFDC Admin", "Apex", "LWC", "Visualforce", "Sales/Service Cloud"],
    ServiceNow: ["ITSM", "ITOM", "Service Portal", "GlideScript"],
    SAP: ["SAP ABAP", "SAP FICO", "SAP HANA", "SAP MM/SD"],
    "C / C++ / Embedded": ["C", "C++", "Embedded Systems", "RTOS"],
    "PHP / Laravel": ["PHP", "Laravel", "Symfony", "CodeIgniter"],
    "Ruby on Rails": ["Ruby", "Rails", "RSpec"],
    Other: ["Other Tools/Frameworks"],
  };

  useEffect(() => {
    if (employeeId) {
      setFormData((prev) => ({ ...prev, name: employeeName }));
      autoLoadCalendarMarkers(employeeId);
      handleLoadFormMetadata(true);
      setErrorMessage("");
    } else {
      setErrorMessage("🚨 Access Warning: Unable to identify logged-in employee context.");
    }
  }, [employeeId, employeeName]);

  // --- Fetch Operations ---
  const autoLoadCalendarMarkers = async (targetId) => {
    if (!targetId) return;
    try {
      const cacheBuster = Date.now();
      const response = await api.get(`/api/panel/nominations/${targetId}?_t=${cacheBuster}`);
      const data = response.data;

      if (data.success && data.data.length > 0) {
        let consolidatedSlots = [];
        data.data.forEach((record) => {
          try {
            const parsed = JSON.parse(record.booked_slots);
            if (Array.isArray(parsed)) {
              parsed.forEach((slot) => {
                const isDuplicate = consolidatedSlots.some(
                  (s) => s.date === slot.date && s.time === slot.time
                );
                if (!isDuplicate) {
                  consolidatedSlots.push({
                    ...slot,
                    mode: slot.mode || "Virtual" // Backwards compatibility for old records
                  });
                }
              });
            }
          } catch (e) {}
        });
        setBookedSlots(consolidatedSlots);
        setSavedBackupSlots(consolidatedSlots);
      } else {
        setBookedSlots([]);
        setSavedBackupSlots([]);
      }
    } catch (error) {
      console.error("Failed to load calendar markers safely:", error);
    }
  };

  const handleLoadFormMetadata = async (isSilentLoad = false) => {
    if (!employeeId) return;
    if (!isSilentLoad) {
      setLoading(true);
      setErrorMessage("");
    }
    try {
      const cacheBuster = Date.now();
      const response = await api.get(`/api/panel/nominations/${employeeId}?_t=${cacheBuster}`);
      const data = response.data;

      if (data.success && data.data.length > 0) {
        const baseRecord = data.data[0];
        setNominationId(baseRecord.NominationId);
        setFormData((prev) => ({
          ...prev,
          grade: baseRecord.grade,
          location: baseRecord.location,
          parentCustomer: baseRecord.parentCustomer,
          contactNo: baseRecord.contactNo,
          interviewSkills: baseRecord.interviewSkills,
        }));
      } else {
        if (!isSilentLoad) setErrorMessage("ℹ️ No previous form details found.");
      }
    } catch (error) {
      if (!isSilentLoad) setErrorMessage("❌ Failed to pull form settings from server securely.");
    } finally {
      if (!isSilentLoad) setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "contactNo") {
      setFormData((prev) => ({ ...prev, [name]: value.replace(/\D/g, "") }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openSkillsModal = () => {
    const currentSkills = formData.interviewSkills ? formData.interviewSkills.split(", ") : [];
    setTempSkills(currentSkills);
    setShowSkillsModal(true);
  };

  const toggleSkill = (skill) => {
    setTempSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  const saveSkills = () => {
    setPopupDialog({
      isOpen: true,
      type: "confirm",
      title: "Confirm Skills",
      message: "Are you sure that you will be able to evaluate the candidate on the selected skills?",
      onConfirm: () => {
        setFormData((prev) => ({ ...prev, interviewSkills: tempSkills.join(", ") }));
        setShowSkillsModal(false);
        setPopupDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // --- Calendar Handlers ---
  const getRollingDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToFirstSunday = currentDay === 0 ? 0 : 14 - currentDay;
    const totalDays = daysToFirstSunday + 7;
    const dates = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toLocaleDateString("en-CA"));
    }
    return dates;
  };

  const visibleDates = getRollingDates();

  const handleTimeSlotToggle = (time) => {
    if (!selectedDate) return;
    const isPreviouslySaved = savedBackupSlots.some((s) => s.date === selectedDate && s.time === time);

    if (!isPreviouslySaved && selectedDate < T1_STR) {
      return alert("🔒 You can only schedule new interview slots for tomorrow or later.");
    }
    if (isPreviouslySaved && selectedDate < T2_STR) {
      return alert("🔒 You cannot cancel this slot. Cancellations require at least 2 days' advance notice.");
    }

    const slotExists = bookedSlots.some((s) => s.date === selectedDate && s.time === time);
    if (slotExists) {
      setBookedSlots(bookedSlots.filter((s) => !(s.date === selectedDate && s.time === time)));
    } else {
      setBookedSlots([...bookedSlots, { date: selectedDate, time: time, mode: defaultMode }]);
    }
  };

  const handleSlotModeChange = (time, newMode) => {
    setBookedSlots((prev) =>
      prev.map((s) =>
        s.date === selectedDate && s.time === time ? { ...s, mode: newMode } : s
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId) return alert("Unable to identify logged-in employee context");
    if (formData.contactNo.length < 10) return setErrorMessage("🚨 Contact number must be at least 10 digits.");
    if (bookedSlots.length === 0) return setErrorMessage("🚨 Please select at least one calendar slot block.");
    if (!formData.interviewSkills) return setErrorMessage("🚨 Please select your interview skills.");

    setLoading(true);
    setErrorMessage("");
    try {
      const response = await api.post("/api/panel/nomination", {
        nominationId,
        employeeId,
        ...formData,
        bookedSlots,
      });
      const data = response.data;
      setResponseData(data);

      setPopupDialog({
        isOpen: true,
        type: "success",
        title: "Success!",
        message: data.message || "Schedule updated successfully.",
        onConfirm: null,
      });

      setNominationId(null);
      setFormData((prev) => ({
        ...prev,
        grade: "",
        location: "",
        parentCustomer: "",
        contactNo: "",
        interviewSkills: "",
      }));
      setSelectedDate(null);

      autoLoadCalendarMarkers(employeeId);
      handleLoadFormMetadata(true);
    } catch (error) {
      const errMsg = error.response?.data?.message || "❌ Connection dropped or unauthorized action.";
      setErrorMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const newlyAddedSlots = bookedSlots.filter((b) => !savedBackupSlots.some((s) => s.date === b.date && s.time === b.time));
  const removedSlots = savedBackupSlots.filter((s) => !bookedSlots.some((b) => b.date === s.date && b.time === s.time));

  // Determine if Grade restrictions apply (PA and A -> Saturdays only)
  const isPAorA = ["P","PAT","PT","PA", "A"].includes(formData.grade);

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans text-gray-800 animation-fadeIn">
      {/* --- Navigation Tabs --- */}
      <div className="flex flex-wrap gap-2 border-b border-gray-300 mb-6 pb-2">
        <button
          onClick={() => setActiveTab("self")}
          className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "self" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          User Panel Entry (Self)
        </button>
        <button
          onClick={() => setActiveTab("myRoster")}
          className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "myRoster" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          My Roster
        </button>
        <button
          onClick={() => setActiveTab("masterRoster")}
          className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "masterRoster" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Master Roster
        </button>
        {isAuthorized && (
          <button
            onClick={() => setActiveTab("InterviewBookingTemplate")}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "InterviewBookingTemplate" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Reserve/Release Panelist (SA+ Only)
          </button>
        )}
      </div>

      {/* =========================================
                SELF NOMINATION VIEW
            ========================================= */}
      {activeTab === "self" && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden text-sm">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-blue-900">
                {nominationId ? "✏️ Edit Existing Panel Entry" : "Register New Panel Entry"}
              </h2>
              <p className="text-gray-600 mt-1 text-xs">
                Today is: <strong>{TODAY_STR}</strong> | Add new slots:{" "}
                <strong>Tomorrow onwards</strong> | Cancellations:{" "}
                <strong>Requires 2 days notice</strong>
              </p>
            </div>
            {!nominationId && employeeId && (
              <button
                type="button"
                onClick={handleLoadFormMetadata}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium text-sm rounded border border-gray-300 hover:bg-gray-200 transition-colors"
              >
                ✏️ Load Previous Schedule
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mx-4 mt-4 rounded text-sm">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded border border-gray-100">
              <div className="flex flex-col">
                <label className="text-gray-700 font-bold mb-1 text-xs">Employee ID</label>
                <input
                  type="text"
                  value={employeeId || "Not Logged In"}
                  disabled
                  className="p-2 bg-gray-200 border border-gray-300 rounded text-gray-600 cursor-not-allowed"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-gray-700 font-bold mb-1 text-xs">Full Name</label>
                <input
                  type="text"
                  value={formData.name || "Anonymous User"}
                  disabled
                  className="p-2 bg-gray-200 border border-gray-300 rounded text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Editable Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">Designation *</label>
                <select
                  name="grade"
                  required
                  value={formData.grade}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>-- Select --</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">Customer Account *</label>
                <select
                  name="parentCustomer"
                  required
                  value={formData.parentCustomer}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>-- Select --</option>
                  {customerOptions.map((cust) => (
                    <option key={cust} value={cust}>{cust}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">Location *</label>
                <select
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>-- Select --</option>
                  {locationOptions.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">Contact Number *</label>
                <input
                  type="text"
                  name="contactNo"
                  required
                  maxLength="12"
                  value={formData.contactNo}
                  onChange={handleInputChange}
                  placeholder="e.g. 9876543210"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Skills Selection */}
            <div>
              <label className="block text-gray-700 font-bold mb-1 text-xs">Technical Interview Skills *</label>
              <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded border border-gray-200">
                <input
                  type="text"
                  readOnly
                  required
                  value={formData.interviewSkills}
                  placeholder="No skills selected."
                  className="flex-1 p-2 bg-transparent text-sm text-blue-800 font-semibold border-none focus:ring-0 cursor-default"
                />
                <button
                  type="button"
                  onClick={openSkillsModal}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded shadow hover:bg-indigo-700 transition-colors whitespace-nowrap text-xs"
                >
                  + Select Skills
                </button>
              </div>
            </div>

            {/* Calendar & Slots */}
            <div className="border-t border-gray-200 pt-4">
              
              {/* NEW HIGHLIGHTED INSTRUCTIONAL BANNER */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div>
                  <label className="block text-gray-800 font-bold text-sm">
                    Assign Availability Schedule
                  </label>
                  <p className="text-[11px] lg:text-xs text-gray-600 mt-1">
                    💡 <strong>Note:</strong> Selected time slots are saved as <strong>Virtual</strong> by default. Check the <strong>F2F</strong> box under a time slot to make it Face-to-Face, or change your default mode here 👉
                  </p>
                </div>
                
                {/* GLOBAL TOGGLE FOR DEFAULT MODE */}
                <label className="flex items-center gap-2 text-xs font-bold bg-white border border-blue-300 px-3 py-2 rounded shadow-sm cursor-pointer hover:bg-blue-50 transition shrink-0">
                  <input
                    type="checkbox"
                    checked={defaultMode === "F2F"}
                    onChange={(e) => setDefaultMode(e.target.checked ? "F2F" : "Virtual")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  Default to Face-to-Face (F2F)
                </label>
              </div>

              <div className="flex flex-col lg:flex-row gap-4">
                {/* CALENDAR WIDGET */}
                <div className="flex-1 bg-white border border-gray-300 rounded shadow-sm p-4">
                  <div className="flex justify-center items-center mb-4 bg-gray-100 p-2 rounded">
                    <span className="text-sm font-bold text-gray-800">Current Booking Window</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center font-bold text-gray-500 uppercase text-[10px] tracking-wider">
                        {day}
                      </div>
                    ))}

                    {Array.from({ length: new Date(visibleDates[0]).getDay() }).map((_, i) => (
                      <div key={`blank-${i}`} />
                    ))}

                    {visibleDates.map((d) => {
                      const isLeaveDay = bookedSlots.some((s) => s.date === d && s.time === "LEAVE");
                      const hasNormalSlots = bookedSlots.some((s) => s.date === d && s.time !== "LEAVE");
                      const isSelected = selectedDate === d;
                      
                      // Day blocking logic for PA and A
                      const isSaturday = new Date(d).getDay() === 6;
                      const isDisabledByGrade = isPAorA && !isSaturday;

                      return (
                        <button
                          type="button"
                          key={d}
                          disabled={isDisabledByGrade}
                          onClick={() => setSelectedDate(d)}
                          className={`
                            p-2 rounded text-sm font-semibold border transition-all
                            ${isDisabledByGrade 
                                ? "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed" // Disabled Styling
                                : isSelected
                                ? "bg-blue-100 border-blue-500 text-blue-900 shadow-sm"
                                : isLeaveDay
                                ? "bg-rose-100 border-rose-400 text-rose-800"
                                : hasNormalSlots
                                ? "bg-green-50 border-green-400 text-green-900"
                                : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                            }
                          `}
                          title={isDisabledByGrade ? "P, PAT, PT, PA and A can only book slots on Saturdays." : ""}
                        >
                          {d.split("-")[2]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TIME PICKER */}
                <div className="flex-1 bg-gray-50 border border-gray-300 rounded shadow-sm p-4 flex flex-col">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
                    Time Slots for: <span className="text-blue-600">{selectedDate || "Select a date"}</span>
                  </h4>

                  {selectedDate ? (
                    <div className="flex flex-col h-full justify-between">
                      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                        {availableTimeSlots.map((time) => {
                          const slotObj = bookedSlots.find((s) => s.date === selectedDate && s.time === time);
                          const isSelected = !!slotObj;
                          const isPreviouslySaved = savedBackupSlots.some((s) => s.date === selectedDate && s.time === time);
                          const isLeaveDay = bookedSlots.some((s) => s.date === selectedDate && s.time === "LEAVE");

                          let isLocked = false;
                          let lockReason = "";

                          if (isLeaveDay) {
                            isLocked = true;
                            lockReason = "On Leave";
                          } else if (!isPreviouslySaved && selectedDate < T1_STR) {
                            isLocked = true;
                            lockReason = "Too soon";
                          } else if (isPreviouslySaved && selectedDate < T2_STR) {
                            isLocked = true;
                            lockReason = "Cannot cancel";
                          }

                          return (
                            <div key={time} className="flex flex-col">
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleTimeSlotToggle(time)}
                                className={`
                                  px-2 py-2 rounded text-xs font-semibold border transition-all flex flex-col items-center justify-center text-center
                                  ${isLocked && isLeaveDay
                                    ? "bg-rose-100 border-rose-200 text-rose-500 cursor-not-allowed opacity-80"
                                    : isLocked
                                    ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed opacity-70"
                                    : isSelected
                                    ? "bg-blue-600 border-blue-700 text-white shadow-sm"
                                    : "bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400 cursor-pointer"
                                  }
                                `}
                              >
                                <span>{time}</span>
                                {lockReason && (
                                  <span className="text-[10px] font-normal mt-0.5 block opacity-80">
                                    {lockReason}
                                  </span>
                                )}
                              </button>
                              
                              {/* INDIVIDUAL SLOT TOGGLE: Only visible if slot is selected and not locked by leave */}
                              {isSelected && !isLeaveDay && (
                                <label className="text-[10px] flex items-center justify-center mt-1.5 gap-1.5 cursor-pointer bg-white border border-gray-200 rounded px-1.5 py-0.5 w-max mx-auto shadow-sm hover:bg-gray-50 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={slotObj.mode === "F2F"}
                                    disabled={isLocked && isPreviouslySaved}
                                    onChange={(e) => handleSlotModeChange(time, e.target.checked ? "F2F" : "Virtual")}
                                    className="w-2.5 h-2.5 text-blue-600 rounded border-gray-300 cursor-pointer disabled:opacity-50"
                                  />
                                  <span className={slotObj.mode === "F2F" ? "font-bold text-blue-700" : "text-gray-500"}>F2F</span>
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                        <label className="flex items-center gap-2 cursor-pointer bg-rose-50 px-3 py-1.5 rounded border border-rose-200 hover:bg-rose-100 transition-colors w-max shadow-sm">
                          <input
                            type="checkbox"
                            checked={bookedSlots.some((s) => s.date === selectedDate && s.time === "LEAVE")}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBookedSlots((prev) => [
                                  ...prev.filter((s) => s.date !== selectedDate),
                                  { date: selectedDate, time: "LEAVE" },
                                ]);
                              } else {
                                setBookedSlots((prev) => prev.filter((s) => !(s.date === selectedDate && s.time === "LEAVE")));
                              }
                            }}
                            className="w-3.5 h-3.5 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-rose-800">🏖️ Mark as On Leave</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs italic pb-6">
                      Click a date in the calendar to view slots.
                    </div>
                  )}
                </div>
              </div>

              {/* AUDIT SUMMARY DISPLAY */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="text-sm font-bold text-blue-900 mb-2">Live Session Agenda Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded shadow-sm border border-gray-200">
                    <strong className="text-gray-700 block mb-1 border-b pb-1 text-xs">Saved (Historical)</strong>
                    <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 text-xs no-scrollbar">
                      {savedBackupSlots.length === 0 ? (
                        <li className="text-gray-400 italic">None</li>
                      ) : (
                        savedBackupSlots.map((s, i) => (
                          <li key={i} className="text-gray-700 py-1 border-l-2 border-gray-400 pl-2 flex flex-wrap gap-1 items-center">
                            <span>{s.date}</span> <span className="text-gray-500">[{s.time}]</span>
                            {s.time !== "LEAVE" && <span className="text-[9px] font-bold px-1 rounded bg-gray-200">{s.mode || "Virtual"}</span>}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="bg-green-50 p-3 rounded shadow-sm border border-green-200">
                    <strong className="text-green-800 block mb-1 border-b border-green-200 pb-1 text-xs">New (Pending)</strong>
                    <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 text-xs no-scrollbar">
                      {newlyAddedSlots.length === 0 ? (
                        <li className="text-green-600/50 italic">None</li>
                      ) : (
                        newlyAddedSlots.map((s, i) => (
                          <li key={i} className="text-green-700 font-semibold py-1 border-l-2 border-green-500 pl-2 flex flex-wrap gap-1 items-center">
                            <span>+ {s.date}</span> <span className="opacity-80 font-normal">[{s.time}]</span>
                            {s.time !== "LEAVE" && <span className="text-[9px] font-bold px-1 rounded bg-green-200 text-green-800">{s.mode}</span>}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="bg-red-50 p-3 rounded shadow-sm border border-red-200">
                    <strong className="text-red-800 block mb-1 border-b border-red-200 pb-1 text-xs">Removing (Pending)</strong>
                    <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 text-xs no-scrollbar">
                      {removedSlots.length === 0 ? (
                        <li className="text-red-600/50 italic">None</li>
                      ) : (
                        removedSlots.map((s, i) => (
                          <li key={i} className="text-red-700 font-semibold py-1 border-l-2 border-red-500 pl-2 line-through opacity-80 flex flex-wrap gap-1 items-center">
                            <span>- {s.date}</span> <span>[{s.time}]</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end items-center gap-3 border-t border-gray-200 pt-4 mt-2">
              <button
                type="submit"
                disabled={loading || !employeeId}
                className="px-6 py-2 bg-blue-600 text-white font-bold text-sm rounded shadow hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {nominationId ? "💾 Save Modifications" : "🚀 Submit Availability"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================
                TAB 2: MY ROSTER VIEW 
            ========================================= */}
      {activeTab === "myRoster" && <MyRoster />}

      {/* =========================================
                TAB 3: MASTER ROSTER VIEW (Shows Everyone)
            ========================================= */}
      {activeTab === "masterRoster" && <AdminRoster />}

      {activeTab === "InterviewBookingTemplate" && (
        <InterviewBookingTemplate
          currentUserDetails={{
            employeeId: employeeId,
            name: employeeName,
            grade: formData.grade,
            location: formData.location,
            parentCustomer: formData.parentCustomer,
            contactNo: formData.contactNo,
          }}
        />
      )}

      {/* =========================================
                MODALS & POPUPS
            ========================================= */}
      {showSkillsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animation-fadeIn">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full border border-gray-200 flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex-shrink-0">
              Select Specific Interview Competencies
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
              {Object.entries(techStackOptions).map(([category, subSkills]) => (
                <div key={category} className="bg-gray-50 border border-gray-200 rounded p-3">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">{category}</h4>
                  {category === "Other" ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        {tempSkills
                          .filter((skill) => !Object.values(techStackOptions).flat().includes(skill))
                          .map((customAddedSkill) => (
                            <label key={customAddedSkill} className="custom-pill-label relative cursor-pointer">
                              <input
                                type="checkbox"
                                className="custom-pill-input sr-only"
                                checked={true}
                                onChange={() => toggleSkill(customAddedSkill)}
                              />
                              <div className="custom-pill-bg px-3 py-1.5 rounded-full border border-blue-400 bg-blue-50 text-blue-800 font-medium text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-400 transition-colors">
                                {customAddedSkill} ✕
                              </div>
                            </label>
                          ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customSkill}
                          onChange={(e) => setCustomSkill(e.target.value)}
                          placeholder="Type preferred tech stack & press Enter..."
                          className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const newSkill = customSkill.trim();
                              if (newSkill && !tempSkills.includes(newSkill)) {
                                toggleSkill(newSkill);
                                setCustomSkill("");
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newSkill = customSkill.trim();
                            if (newSkill && !tempSkills.includes(newSkill)) {
                              toggleSkill(newSkill);
                              setCustomSkill("");
                            }
                          }}
                          className="px-4 py-2 bg-gray-800 text-white font-medium rounded shadow hover:bg-gray-900 transition-colors text-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {subSkills.map((skill) => (
                        <label key={skill} className="custom-pill-label relative cursor-pointer">
                          <input
                            type="checkbox"
                            className="custom-pill-input sr-only"
                            checked={tempSkills.includes(skill)}
                            onChange={() => toggleSkill(skill)}
                          />
                          <div className="custom-pill-bg px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 font-medium text-xs hover:border-blue-400 bg-white transition-colors">
                            {skill}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-3 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowSkillsModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSkills}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700 text-sm"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {popupDialog.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animation-fadeIn">
          <div className={`bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border-t-4 ${popupDialog.type === "success" ? "border-green-500" : "border-blue-500"}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 shadow-inner ${popupDialog.type === "success" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
              {popupDialog.type === "success" ? "✓" : "?"}
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{popupDialog.title}</h2>
            <p className="text-gray-600 text-sm mb-6">{popupDialog.message}</p>
            {popupDialog.type === "confirm" ? (
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold text-sm rounded hover:bg-gray-200 transition-colors"
                  onClick={() => setPopupDialog((prev) => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded shadow hover:bg-blue-700 transition-colors"
                  onClick={popupDialog.onConfirm}
                >
                  Yes, I'm sure
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full px-4 py-2 bg-gray-900 text-white font-bold text-sm rounded shadow hover:bg-gray-800 transition-colors"
                onClick={() => setPopupDialog((prev) => ({ ...prev, isOpen: false }))}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelNomination;
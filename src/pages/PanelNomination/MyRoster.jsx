import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { useApp } from "../../context/AppContext";
import api from "../../Api";

const MyRoster = () => {
  const { user } = useApp(); // Get the logged-in user
  const todayObj = new Date();
  const TODAY_STR = todayObj.toLocaleDateString("en-CA");

  const [masterList, setMasterList] = useState([]);
  const [expandedAudit, setExpandedAudit] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchMasterList();
  }, []);

  const fetchMasterList = async () => {
    try {
      const cacheBuster = Date.now();
      // 🔒 Shifted to slot-bookings endpoint to retrieve reservation details & tagged candidates
      const res = await api.get(`/api/panel/admin/slot-bookings?_t=${cacheBuster}`);
      if (res.data && res.data.success) {
        setMasterList(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch secure master list info:", err);
    }
  };

  const handleViewAudit = async (empId) => {
    if (expandedAudit === empId) {
      setExpandedAudit(null);
      return;
    }
    try {
      const cacheBuster = Date.now();
      const res = await api.get(`/api/panel/admin/audit/${empId}?_t=${cacheBuster}`);
      const data = res.data;
      if (data.success) {
        setAuditLogs(data.logs);
        setExpandedAudit(empId);
      }
    } catch (err) {
      console.error("Failed to view audit log securely:", err);
    }
  };

  const renderParsedSlots = (jsonString) => {
    try {
      const slots = JSON.parse(jsonString);
      if (!slots || slots.length === 0)
        return <span className="text-gray-500 italic text-sm">None</span>;
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {slots.map((s, i) => (
            <span
              key={i}
              className="inline-block bg-blue-50 text-blue-800 border border-blue-200 text-xs px-2 py-1 rounded shadow-sm"
            >
              <span className="font-semibold">{s.date}</span> | {s.time}
            </span>
          ))}
        </div>
      );
    } catch (e) {
      return <span className="text-red-500 text-sm">Error parsing data</span>;
    }
  };

  // ✅ Filter the list to ONLY show the currently logged-in user's data
  const myRosterData = masterList.filter((emp) => emp.employeeId === user?.employeeId);

  // ✅ Extract Reservations where I am the Panelist/Interviewer
  const myInterviewerSlots = myRosterData.length > 0 && myRosterData[0].reservations
    ? myRosterData[0].reservations
    : [];

  // ✅ Extract Reservations where I am the Tagged Candidate
  const myCandidateSlots = useMemo(() => {
    if (!user?.employeeId || masterList.length === 0) return [];

    return masterList.flatMap(nom => {
      if (!nom.reservations) return [];
      return nom.reservations
        .filter(res => res.tagged_candidates && res.tagged_candidates.includes(user.employeeId))
        .map(res => ({
          ...res,
          interviewerName: nom.name,
          interviewerId: nom.employeeId,
          interviewerSkills: nom.interviewSkills,
          interviewerLocation: nom.location
        }));
    });
  }, [masterList, user?.employeeId]);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const cacheBuster = Date.now();

      // --- 1. PREPARE SHEET 1 (MY ROSTER) ---
      // const sheet1Data = myRosterData.map((row) => {
      //   let slotsString = "None";
      //   try {
      //     const parsedSlots = JSON.parse(row.booked_slots || "[]");
      //     if (parsedSlots.length > 0) {
      //       slotsString = parsedSlots.map((s) => `${s.date} [${s.time}]`).join("; ");
      //     }
      //   } catch (e) {}

      //   return {
      //     Name: row.name,
      //     "Employee ID": row.employeeId,
      //     Grade: row.grade,
      //     Location: row.location,
      //     "Contact No": row.contactNo,
      //     "Customer Account": row.parentCustomer,
      //     "Skill Set Focus": row.interviewSkills,
      //     "Booked Slots (Date & Time)": slotsString,
      //   };
      // });
      const sheet1Data = myRosterData.map((row) => {
        let slotsString = "None";
        try {
          const parsedSlots = JSON.parse(row.booked_slots || "[]");
          if (parsedSlots.length > 0) {
            slotsString = parsedSlots.map((s) => {
              // 👉 NEW: Check for leave status and format it nicely for the Excel sheet
              if (s.time === "LEAVE") {
                return `${s.date} [On Leave]`;
              }
              return `${s.date} [${s.time}]`;
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

      // --- 2. PREPARE SHEET 2 (AUDIT HISTORY / CHANGES) ---
      let sheet2Data = [];
      const auditPromises = myRosterData.map((emp) =>
        api.get(`/api/panel/admin/audit/${emp.employeeId}?_t=${cacheBuster}`)
          .then((res) => res.data)
          .catch(() => null)
      );

      const auditsResults = await Promise.all(auditPromises);

      myRosterData.forEach((row, index) => {
        const auditData = auditsResults[index];
        if (auditData && auditData.success && auditData.logs && auditData.logs.length > 0) {
          const latestLog = auditData.logs[0];
          let oldStr = "None", newStr = "None", addedStr = "None", removedStr = "None";

          try {
            let oldSlots = JSON.parse(latestLog.OldSlots || "[]");
            let newSlots = JSON.parse(latestLog.NewSlots || "[]");
            if (!Array.isArray(oldSlots)) oldSlots = [];
            if (!Array.isArray(newSlots)) newSlots = [];

            if (oldSlots.length > 0) oldStr = oldSlots.map((s) => `${s.date} [${s.time}]`).join("; ");
            if (newSlots.length > 0) newStr = newSlots.map((s) => `${s.date} [${s.time}]`).join("; ");

            const oldSet = new Set(oldSlots.map((s) => `${(s.date || "").trim()} [${(s.time || "").trim()}]`));
            const newSet = new Set(newSlots.map((s) => `${(s.date || "").trim()} [${(s.time || "").trim()}]`));

            const added = [...newSet].filter((x) => !oldSet.has(x));
            const removed = [...oldSet].filter((x) => !newSet.has(x));

            if (added.length > 0) addedStr = added.join("; ");
            if (removed.length > 0) removedStr = removed.join("; ");
          } catch (e) {
            console.error("Parse error on logs", e);
          }

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

      if (sheet2Data.length === 0) {
        sheet2Data.push({ Message: "No historical changes found." });
      }

      // --- 3. GENERATE MULTI-SHEET WORKBOOK ---
      const workbook = XLSX.utils.book_new();
      const worksheet1 = XLSX.utils.json_to_sheet(sheet1Data);
      XLSX.utils.book_append_sheet(workbook, worksheet1, "My Roster");
      const worksheet2 = XLSX.utils.json_to_sheet(sheet2Data);
      XLSX.utils.book_append_sheet(workbook, worksheet2, "Recent Modification");

      // --- 4. TRIGGER DOWNLOAD ---
      XLSX.writeFile(workbook, `My_Roster_${TODAY_STR}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Failed to export Excel file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animation-fadeIn">

      {/* ==============================================
          RESERVATION VIEW: AS INTERVIEWER / PANELIST
          ============================================== */}
      {myInterviewerSlots.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-blue-200 pb-2">
            <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path></svg>
            <h3 className="text-lg font-bold text-blue-900">Your Booked Interview Slots (As Panelist)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myInterviewerSlots.map((slot) => (
              <div key={slot.ReservationId} className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <p className="text-sm text-gray-700 leading-relaxed pl-2">
                  <strong className="text-gray-900">{slot.reserved_by_name}</strong> has reserved your slot on <strong className="text-blue-700">{slot.date}</strong> at <strong className="text-blue-700">{slot.time}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================
          RESERVATION VIEW: AS TAGGED CANDIDATE
          ============================================== */}
      {myCandidateSlots.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-green-200 pb-2">
            <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
            <h3 className="text-lg font-bold text-green-900">Your Scheduled Interviews (As Candidate)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCandidateSlots.map((slot) => (
              <div key={slot.ReservationId} className="bg-white p-4 rounded-lg shadow-sm border border-green-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                <div className="pl-2">
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    You have an interview scheduled with <strong className="text-gray-900">{slot.interviewerName}</strong> <span className="text-xs text-gray-500">({slot.interviewerId})</span> on <strong className="text-green-700">{slot.date}</strong> at <strong className="text-green-700">{slot.time}</strong>.
                  </p>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                    <strong className="text-gray-800">Panelist Skills:</strong> <br />
                    <span className="text-indigo-600 font-medium">{slot.interviewerSkills}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================
          MAIN ROSTER OVERVIEW TABLE
          ============================================== */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">My Nomination Roster Overview</h2>
          <button
            onClick={handleExportExcel}
            disabled={isExporting || myRosterData.length === 0}
            className="px-4 py-2 bg-green-600 text-white font-semibold rounded shadow hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <span>⏳ Generating...</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download Excel
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-3 font-bold border-b-2 border-gray-300">Name</th>
                <th className="p-3 font-bold border-b-2 border-gray-300">Emp ID</th>
                <th className="p-3 font-bold border-b-2 border-gray-300">Grade</th>
                <th className="p-3 font-bold border-b-2 border-gray-300">Location</th>
                <th className="p-3 font-bold border-b-2 border-gray-300">Contact No</th>
                <th className="p-3 font-bold border-b-2 border-gray-300">Customer Account</th>
                <th className="p-3 font-bold border-b-2 border-gray-300">Skill Set Focus</th>
                <th className="p-3 font-bold border-b-2 border-gray-300 text-right">Audit Action</th>
              </tr>
            </thead>
            <tbody>
              {myRosterData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No active roster records found for your account.
                  </td>
                </tr>
              ) : (
                myRosterData.map((row, index) => (
                  <React.Fragment key={row.NominationId}>
                    <tr className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="p-3 border-b border-gray-200 font-semibold text-gray-800">{row.name}</td>
                      <td className="p-3 border-b border-gray-200 text-gray-600">{row.employeeId}</td>
                      <td className="p-3 border-b border-gray-200 text-gray-700">{row.grade}</td>
                      <td className="p-3 border-b border-gray-200 text-gray-700">{row.location}</td>
                      <td className="p-3 border-b border-gray-200 text-gray-700">{row.contactNo}</td>
                      <td className="p-3 border-b border-gray-200 text-gray-800">{row.parentCustomer}</td>
                      <td className="p-3 border-b border-gray-200 text-blue-700 font-medium whitespace-normal min-w-[150px]">
                        {row.interviewSkills}
                      </td>
                      <td className="p-3 border-b border-gray-200 text-right">
                        <button
                          onClick={() => handleViewAudit(row.employeeId)}
                          className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors"
                        >
                          {expandedAudit === row.employeeId ? "Hide Logs" : "Latest Modification"}
                        </button>
                      </td>
                    </tr>
                    {expandedAudit === row.employeeId && (
                      <tr>
                        <td colSpan="8" className="p-0 border-b border-gray-300 bg-gray-100 shadow-inner">
                          <div className="p-4 border-l-4 border-blue-500 m-3 bg-white rounded shadow-sm">
                            <h4 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b">
                              Recent Modification Log
                            </h4>
                            {auditLogs.length === 0 ? (
                              <p className="text-gray-500 italic text-sm">No historical changes found.</p>
                            ) : (
                              <div className="space-y-4">
                                {auditLogs.slice(0, 1).map((log) => {
                                  let addedArray = [], removedArray = [];
                                  try {
                                    const oldSlots = JSON.parse(log.OldSlots || "[]");
                                    const newSlots = JSON.parse(log.NewSlots || "[]");
                                    const oldSet = new Set(oldSlots.map((s) => JSON.stringify(s)));
                                    const newSet = new Set(newSlots.map((s) => JSON.stringify(s)));

                                    addedArray = [...newSet].filter((x) => !oldSet.has(x));
                                    removedArray = [...oldSet].filter((x) => !newSet.has(x));
                                  } catch (e) { }

                                  return (
                                    <div key={log.HistoryId} className="bg-gray-50 p-3 rounded border border-gray-200">
                                      <div className="text-xs text-gray-500 mb-4 font-semibold bg-gray-200 inline-block px-2 py-1 rounded">
                                        Timestamp: {new Date(log.ModifiedAt).toLocaleString()}
                                      </div>

                                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                          <strong className="text-gray-800 block mb-1 text-sm border-b pb-1">Old Slots:</strong>
                                          {renderParsedSlots(log.OldSlots)}
                                        </div>
                                        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                          <strong className="text-gray-800 block mb-1 text-sm border-b pb-1">New Slots:</strong>
                                          {renderParsedSlots(log.NewSlots)}
                                        </div>
                                        <div className="bg-green-50 p-3 rounded border border-green-200 shadow-sm">
                                          <strong className="text-green-800 block mb-1 text-sm border-b border-green-200 pb-1">Added:</strong>
                                          {renderParsedSlots(`[${addedArray.join(",")}]`)}
                                        </div>
                                        <div className="bg-red-50 p-3 rounded border border-red-200 shadow-sm">
                                          <strong className="text-red-800 block mb-1 text-sm border-b border-red-200 pb-1">Removed:</strong>
                                          {renderParsedSlots(`[${removedArray.join(",")}]`)}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyRoster;
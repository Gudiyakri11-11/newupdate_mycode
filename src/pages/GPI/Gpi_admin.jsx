import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { pageContainer } from "../../styles";
import { useRole } from "../../../src/gurds/userRole";
import { useApp } from "../../../src/context/AppContext"; // ✅ Add this import
import api from "../../Api";
const api_url = import.meta.env.VITE_API_URL;

export default function Gpi_admin() {
  const { activeRole } = useRole();
  
  const isStrictAdmin = activeRole === "admin";
  const isGuides = activeRole === "guides";
  const isModeratorRole = activeRole === "moderator";

  // Controls dashboard visibility
  const isAdmin = isStrictAdmin || isGuides || isModeratorRole; 
  // Treats Guides like an Admin so they see ALL departments & projects
  const isSuperAdmin = isStrictAdmin || isGuides; 
  // Keeps true moderators restricted to their own projects
  const isModerator = isModeratorRole;
  const { user } = useApp(); // ✅ Grab the logged-in user here

  const [gpiData, setGpiData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Table Search State
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Defaulter Report State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departmentList, setDepartmentList] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  const [projectList, setProjectList] = useState([]);
  const today = new Date();
  const maxDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [popup, setPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // ✅ Fetch data securely
  const getAssociateId = (associate) => {
    const id =
      associate.AssociateID ||
      associate.associateId ||
      associate.associateid ||
      associate.employeeId ||
      associate.employee_id;
    return String(id || "").trim();
  };

  const getFileSegment = (value) =>
    String(value || "All")
      .trim()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "");

  const fetchDepartmentAssociates = async () => {
    const params = new URLSearchParams();

    if (selectedDepartment) {
      params.set("department", selectedDepartment);
    }

    if (selectedProject && selectedProject !== "ALL") {
      params.set("projectName", selectedProject);
    }

    const response = await api.get(`/api/efforts/associates?${params.toString()}`);
    return response.data || [];
  };

  const fetchReportAssociates = async () => {
    if (isSuperAdmin || selectedProject) {
      return fetchDepartmentAssociates();
    }

    const allocRes = await api.get("/api/allocation/download", {
      responseType: "arraybuffer",
    });

    const workbook = XLSX.read(allocRes.data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    return rawData
      .map((row) => {
        const cleanRow = {};
        for (const key in row) {
          cleanRow[key.replace(/\s+/g, "").toLowerCase()] = row[key];
        }
        return cleanRow;
      })
      .filter((row) => {
        if (selectedProject === "ALL") return true;
        return (
          row.projectname &&
          String(row.projectname).trim() === selectedProject
        );
      });
  };

  useEffect(() => {
    if (!isAdmin) return;

    const fetchDepartments = async () => {
      if (isModerator && !selectedProject) {
        setDepartmentList([]);
        setSelectedDepartment("");
        return;
      }

      try {
        const params = new URLSearchParams();
        if (selectedProject && selectedProject !== "ALL") {
          params.set("projectName", selectedProject);
        }
        const endpoint = params.toString()
          ? `/api/efforts/departments?${params.toString()}`
          : "/api/efforts/departments";
        const res = await api.get(endpoint);
        setDepartmentList(res.data || []);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
        setDepartmentList([]);
      }
    };

    fetchDepartments();
  }, [isAdmin, isModerator, selectedProject]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchGpi = async () => {
      if (isSuperAdmin && !selectedDepartment) {
        setGpiData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 🔒 Added explicit global scope parameter to pass the role verification gate
        const params = new URLSearchParams();
        if (isSuperAdmin) {
          params.set("department", selectedDepartment);
        } else {
          if (selectedProject && selectedProject !== "ALL") {
            params.set("projectName", selectedProject);
          }
          if (selectedDepartment) {
            params.set("department", selectedDepartment);
          }
        }
        const endpoint = params.toString()
          ? `/api/gpi/all?${params.toString()}`
          : "/api/gpi/all";
        const res = await api.get(endpoint);
        setGpiData(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch GPI data securely:", err);
        setGpiData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGpi();
  }, [isAdmin, isSuperAdmin, selectedDepartment, selectedProject]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (isSuperAdmin && !selectedDepartment) {
        setProjectList([]);
        setSelectedProject("");
        return;
      }

      try {
        // 🔒 Routed through secure configuration instance channel
        const endpoint = isSuperAdmin
          ? `/api/addproject/project-list-admin?department=${encodeURIComponent(selectedDepartment)}`
          : "/api/addproject/project-list-admin";
        const response = await api.get(endpoint);
        const data = response.data;

        let filteredData = data;

        // ✅ If user is a Moderator (but NOT a Super Admin), filter by their Employee ID
        if (isAdmin && !isSuperAdmin && user?.employeeId) {
          const userId = String(user.employeeId).trim();
          filteredData = data.filter(
            (p) =>
              String(p.ManagerId).trim() === userId ||
              String(p.ProxyManagerId).trim() === userId,
          );
        }

        const dynamicProjectNames = Array.from(
          new Set(filteredData.map((p) => p.ProjectName).filter(Boolean)),
        );
        setProjectList(dynamicProjectNames);
      } catch (error) {
        console.error("Error fetching project list secure metadata:", error);
        setProjectList([]);
      }
    };

    fetchProjects();
  }, [isAdmin, isSuperAdmin, user?.employeeId, selectedDepartment]);

  // ✅ Search / Filter logic
  const filteredData = useMemo(() => {
    return gpiData.filter((item) => {
      const itemStart = item.Start_Date?.split("T")[0] || "";
      const itemEnd = item.End_Date?.split("T")[0] || "";

      const matchEmp =
        !employeeSearch ||
        item.Employee_ID?.toLowerCase().includes(employeeSearch.toLowerCase());
      const matchStart = !filterStartDate || itemStart === filterStartDate;
      const matchEnd = !filterEndDate || itemEnd === filterEndDate;

      return matchEmp && matchStart && matchEnd;
    });
  }, [gpiData, employeeSearch, filterStartDate, filterEndDate]);

  // ✅ Admin Upload Handler
  // ✅ Admin Upload Handler (Axios Refactored)
  const handleAdminUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("allocationReport", file);

    setPopup({
      isOpen: true,
      title: "Uploading...",
      message: "Uploading the master allocation report to the server.",
      type: "info",
    });

    try {
      // 🔒 Dispatched over secure channels to stream multi-part payloads cleanly
      await api.post("/api/allocation/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPopup({
        isOpen: true,
        title: "Upload Successful",
        message:
          "The master allocation report has been saved and is now active for all moderators.",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setPopup({
        isOpen: true,
        title: "Upload Failed",
        message:
          "Failed to upload the allocation report. Please check the backend connection.",
        type: "error",
      });
    }
    e.target.value = null;
  };

  const generateDefaulterList = async () => {
    const missingFields = [];
    if (isSuperAdmin && !selectedDepartment) missingFields.push("Department");
    if (!selectedProject) missingFields.push("Project Selection");
    if (!startDate) missingFields.push("Start Date");
    if (!endDate) missingFields.push("To Date");

    if (missingFields.length > 0) {
      setPopup({
        isOpen: true,
        title: "Missing Required Fields",
        message: `Please fill in the following before generating the report:\n\n• ${missingFields.join("\n• ")}`,
        type: "warning",
      });
      return;
    }

    try {
      // 🔒 Pull master file downstream explicitly mapping as an arraybuffer block response channel
      const projectAssociates = await fetchReportAssociates();
      const employeeIds = projectAssociates
        .map(getAssociateId)
        .filter((id) => id && id !== "undefined");

      if (employeeIds.length === 0) {
        setPopup({
          isOpen: true,
          title: "No Associates Found",
          message: `We couldn't find any associates assigned to ${selectedProject === "ALL" ? "the selected department" : selectedProject}.`,
          type: "warning",
        });
        return;
      }

      // 🔒 Pipeline processing block request sent over secure Axios client instance
      const response = await api.post("/api/gpi/defaulters-check", {
        employeeIds,
        startDate,
        endDate,
      });
      const activeEmployees = response.data;
      const defaulterReport = [];

      projectAssociates.forEach((associate) => {
        const empId = getAssociateId(associate);
        if (!empId || empId === "undefined") return;

        if (!activeEmployees.includes(empId)) {
          defaulterReport.push({
            ProjectID: associate.ProjectID || associate.projectid || "N/A",
            ProjectName: associate.ProjectName || associate.projectname || "N/A",
            Department: associate.Department || associate.department || "N/A",
            AccountName: associate.AccountName || associate.accountname || "N/A",
            "Employee ID": empId,
            Email: `${empId}@cognizant.com`,
            Name: associate.AssociateName || associate.associatename || associate.name || "N/A",
            SupervisorName:
              associate.SupervisorName || associate.supervisorname || associate.managername || "N/A",
            Designation: associate.designation || associate.role || "N/A",
            "Missing Period": `${startDate} to ${endDate}`,
          });
        }
      });

      if (defaulterReport.length === 0) {
        setPopup({
          isOpen: true,
          title: "All Clear!",
          message: "Great news! There are no defaulters for this date range.",
          type: "success",
        });
        return;
      }

      const ws = XLSX.utils.json_to_sheet(defaulterReport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Defaulter List");

      const fileNameStr =
        selectedProject === "ALL" ? "All_Projects" : selectedProject;
      const departmentSegment = selectedDepartment
        ? `${getFileSegment(selectedDepartment)}_`
        : "";
      XLSX.writeFile(
        wb,
        `GPI_Defaulters_${departmentSegment}${getFileSegment(fileNameStr)}.xlsx`,
      );

      setPopup({
        isOpen: true,
        title: "Report Generated",
        message: `The defaulter report for ${fileNameStr} has been downloaded successfully.`,
        type: "success",
      });
    } catch (err) {
      console.error("Defaulter report generation failed", err);
      setPopup({
        isOpen: true,
        title: "Generation Failed",
        message:
          "An error occurred while generating the report. Please check the console for details.",
        type: "error",
      });
    }
  };

  // ✅ Standard Excel download
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map((item) => ({
        GPI_ID: item.GPI_ID,
        Employee_ID: item.Employee_ID,
        // 👇 ADD THIS NEW LINE 👇
        Employee_Name:
          item.Employee_Name || item.EmployeeName || item.Name || "N/A",
        Department: item.Department || item.department || "-",
        Start_Date: item.Start_Date?.split("T")[0],
        End_Date: item.End_Date?.split("T")[0],
        Squad_Name: item.Squad_Name,
        Sprint_Name: item.Sprint_Name,
        Committed_Story_Points_Without_GenAI:
          item.Committed_Story_Points_Without_GenAI,
        Actual_Delivered_Story_Points_With_GenAI:
          item.Actual_Delivered_Story_Points_With_GenAI,
        Note: item.Note || item.note || "",
      })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GPI Data");
    XLSX.writeFile(workbook, "GPI_Admin_Report.xlsx");
  };

  const inputBase =
    "w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors";

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleResetFilters = () => {
    setSelectedDepartment("");
    setSelectedProject("");
    setStartDate("");
    setEndDate("");
    setEmployeeSearch("");
    setFilterStartDate("");
    setFilterEndDate("");
    setCurrentPage(1);
  };

  return (
    <div className={`${pageContainer} max-w-7xl mx-auto p-4 md:p-6 lg:p-8`}>
      {/* ✅ ADMIN DASHBOARD */}
      {isAdmin && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* ✅ NEW: Admin Dedicated Upload Section */}
          {isSuperAdmin && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Admin Controls
                </h3>
                <p className="text-sm mt-1 text-slate-600 dark:text-slate-400">
                  Upload the master allocation report. Once uploaded, moderators
                  can generate reports without needing the file.
                </p>
              </div>
              <label className="cursor-pointer whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-lg active:scale-95">
                Upload Master Allocation
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleAdminUpload}
                />
              </label>
            </div>
          )}

          {/* Header Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border border-blue-100 dark:border-slate-700 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                GPI Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                Monitor and export GenAI Productivity Index metrics across all
                squads and sprints.
              </p>
            </div>
          </div>

          {/* Generate Defaulter Report Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Generate Defaulter Report
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {isSuperAdmin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Department
                  </label>
                  <select
                    className={inputBase}
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedProject("");
                    }}
                  >
                    <option value="">-- Select Department --</option>
                    {departmentList.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Project
                </label>
                <select
                  className={inputBase}
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    if (isModerator) {
                      setSelectedDepartment("");
                    }
                  }}
                  disabled={isSuperAdmin && !selectedDepartment}
                >
                  <option value="">
                    {isSuperAdmin && !selectedDepartment
                      ? "-- Select Department First --"
                      : "-- Select Project --"}
                  </option>
                  {isSuperAdmin && selectedDepartment && (
                    <option
                      value="ALL"
                      className="font-bold text-blue-600 dark:text-blue-400"
                    >
                      All Projects in Department
                    </option>
                  )}
                  {/* <option value="ALL" className="font-bold text-blue-600 dark:text-blue-400">All Projects (Master)</option> */}
                  {projectList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {isModerator && selectedProject && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Department
                  </label>
                  <select
                    className={inputBase}
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {departmentList.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  From Date
                </label>
                <input
                  type="date"
                  max={maxDateString}
                  className={inputBase}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  To Date
                </label>
                <input
                  type="date"
                  max={maxDateString}
                  className={inputBase}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-between items-center">
              <p className="text-xs italic text-gray-500 dark:text-gray-400">
                {isSuperAdmin ? (
                  <>
                    * Report will be generated for associates within{" "}
                    <strong>{selectedDepartment || "selected department"}</strong>.
                  </>
                ) : (
                  <>
                    * Report will be generated using the master allocation report on
                    the server.
                  </>
                )}
              </p>
              <button
                onClick={generateDefaulterList}
                className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-rose-500/20 active:scale-95"
              >
                Generate Defaulter List
              </button>
            </div>
          </div>

          {/* Filters & Data Table Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col">
            {/* 🔍 Search Filters - UPDATED LAYOUT */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                {/* Inputs Section */}
                <div className="flex flex-col md:flex-row items-end gap-4 flex-1">
                  {/* Employee ID */}
                  <div className="w-full md:w-56 space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      EMPLOYEE ID
                    </label>
                    <input
                      className="block w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Ex: Employee ID..."
                      value={employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  {/* Start Date */}
                  <div className="w-full md:w-48 space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      START DATE
                    </label>
                    <input
                      type="date"
                      className="block w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
                      value={filterStartDate}
                      onChange={(e) => {
                        setFilterStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  {/* End Date */}
                  <div className="w-full md:w-48 space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      END DATE
                    </label>
                    <input
                      type="date"
                      className="block w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
                      value={filterEndDate}
                      onChange={(e) => {
                        setFilterEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadExcel}
                    disabled={filteredData.length === 0}
                    className="inline-flex items-center justify-center bg-[#00966b] hover:bg-[#00805a] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm whitespace-nowrap active:scale-95"
                  >
                    Export Excel
                  </button>
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 dark:bg-transparent dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 border border-gray-300 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap active:scale-95"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* 📊 Table Wrapper matching Code A structure */}
            <div className="mx-6 mb-6 mt-6 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden relative min-h-[400px]">
              <div
                className="overflow-x-auto overflow-y-auto custom-scrollbar"
                style={{ maxHeight: "650px" }}
              >
                {loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10 backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin dark:border-gray-700 dark:border-t-blue-500"></div>
                    <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Fetching metrics...
                    </p>
                  </div>
                ) : (
                  <table className="w-full min-w-[1000px] border-collapse text-sm">
                    <thead className="bg-slate-100 dark:bg-[#1C2534] text-xs uppercase text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-4 font-semibold tracking-wider">
                          Employee ID
                        </th>
                        <th className="p-4 font-semibold tracking-wider">
                          Employee Name
                        </th>
                        <th className="p-4 font-semibold tracking-wider">
                          Department
                        </th>
                        <th className="p-4 font-semibold tracking-wider">
                          Squad
                        </th>
                        <th className="p-4 font-semibold tracking-wider">
                          Sprint
                        </th>
                        <th className="p-4 font-semibold tracking-wider">
                          Start Date
                        </th>
                        <th className="p-4 font-semibold tracking-wider">
                          End Date
                        </th>
                        <th className="p-4 text-center font-semibold tracking-wider">
                          Committed
                        </th>
                        <th className="p-4 text-center font-semibold tracking-wider">
                          Delivered
                        </th>
                        {/* 👇 ADD THIS NEW HEADER 👇 */}
                        <th className="p-4 font-semibold tracking-wider">
                          Note
                        </th>
                        {/* <th className="p-4 text-center font-semibold tracking-wider">
                          Status
                        </th> */}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {paginatedData.map((row) => (
                        <tr
                          key={row.GPI_ID}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                        >
                          <td className="p-4 font-mono font-medium text-gray-900 dark:text-white">
                            {row.Employee_ID}
                          </td>
                          <td className="p-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                            {row.Employee_Name ||
                              row.EmployeeName ||
                              row.Name ||
                              "-"}
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            {row.Department || row.department || "-"}
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            <span className="px-3 py-1 rounded-md text-xs inline-block bg-blue-50 dark:bg-blue-900/20 text-green-600 dark:text-green-300 font-medium">
                              {row.Squad_Name}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            <span className="px-3 py-1 rounded-md text-xs inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-medium">
                              {row.Sprint_Name}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            {row.Start_Date?.split("T")[0] || "-"}
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            {row.End_Date?.split("T")[0] || "-"}
                          </td>
                          <td className="p-4 text-center font-bold text-gray-900 dark:text-white">
                            {row.Committed_Story_Points_Without_GenAI}
                          </td>
                          <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {row.Actual_Delivered_Story_Points_With_GenAI}
                          </td>

                          <td
                            className="p-4 text-slate-600 dark:text-slate-400 text-xs max-w-[150px] truncate"
                            title={row.Note || row.note || ""}
                          >
                            {row.Note || row.note || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {!loading && filteredData.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-16 text-center">
                    <div className="text-5xl mb-4 opacity-50">📭</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {isSuperAdmin && !selectedDepartment
                        ? "Select a Department"
                        : "No records found"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                      {isSuperAdmin && !selectedDepartment
                        ? "Choose a Department to view GPI records."
                        : "We couldn't find any data matching your current filters. Try adjusting your search terms."}
                    </p>
                    {(selectedDepartment ||
                      selectedProject ||
                      startDate ||
                      endDate ||
                      employeeSearch ||
                      filterStartDate ||
                      filterEndDate) && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-4 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Table Footer with Pagination */}
            <div className="bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {filteredData.length > 0
                    ? (currentPage - 1) * itemsPerPage + 1
                    : 0}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.min(currentPage * itemsPerPage, filteredData.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {filteredData.length}
                </span>{" "}
                entries
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Previous
                  </button>
                  <div className="px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white border-x border-gray-200 dark:border-gray-700">
                    {currentPage}{" "}
                    <span className="text-gray-400 font-normal">
                      / {totalPages}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- BEAUTIFUL POPUP OVERLAY --- */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 transform transition-all">
            <div
              className={`p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 rounded-t-2xl ${
                popup.type === "error"
                  ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                  : popup.type === "warning"
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {/* Icon based on type */}
              <span className="text-xl">
                {popup.type === "error"
                  ? "❌"
                  : popup.type === "warning"
                    ? "⚠️"
                    : "✅"}
              </span>
              <h3 className="font-bold text-lg">{popup.title}</h3>
            </div>

            <div className="p-5 text-slate-600 dark:text-slate-300 whitespace-pre-line text-sm leading-relaxed">
              {popup.message}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setPopup({ ...popup, isOpen: false })}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-md"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { act, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import EffortForm from "../../components/EffortForm/EffortComponent";
import api from "../../Api";
import {
  pageContainer,
  surface,
  textPrimary,
  textSecondary,
  textMuted,
  hoverSurface,
  sectionTitle,
  cardRing,
} from "../../styles";
import { useRole } from "../../../src/gurds/userRole";
import { useApp } from "../../../src/context/AppContext";
import { getWorkingDateStrings } from "../../data/workingDays";

const API_BASE = import.meta.env.VITE_API_URL;

export default function Gauge() {
  const { canAtLeast, activeRole } = useRole();
  const isStrictAdmin = activeRole === "admin";
  const isGuides = activeRole === "guides";
  const isModerator = activeRole === "moderator";

  const showScripts = canAtLeast("guides");
  const isAdmin = isStrictAdmin || isGuides;

  const { user } = useApp();
  if (activeRole === "user") {
    return <EffortForm />;
  }
  // --- State ---
  const [efforts, setEfforts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeNameSearch, setEmployeeNameSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [excludeDates, setExcludeDates] = useState(""); // Comma separated dates
  const [departmentList, setDepartmentList] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [projectList, setProjectList] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");

  const today = new Date();
  const maxDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // ✅ Popup State
  const [popup, setPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // --- Helpers ---
  const getActivityText = (row) => {
    return (
      row.business_requirements_activity ||
      row.code_build_activity ||
      row.design_activity ||
      row.test_review_activity ||
      row.deploy_hypercare_activity ||
      row.domain_usecase_activity ||
      row.other_activity ||
      "N/A"
    );
  };

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

    const response = await api.get(
      `/api/efforts/associates?${params.toString()}`,
    );
    return response.data || [];
  };

  const fetchReportAssociates = async () => {
    if (isAdmin || selectedProject) {
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
        Object.keys(row).forEach((key) => {
          cleanRow[key.replace(/\s+/g, "").toLowerCase()] = row[key];
        });
        return cleanRow;
      })
      .filter((row) => {
        if (selectedProject === "ALL") return true;
        return (
          row.projectname && String(row.projectname).trim() === selectedProject
        );
      });
  };

  // --- Effects ---
  useEffect(() => {
    if (!showScripts) return;

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
        console.error("Failed to fetch departments", error);
        setDepartmentList([]);
      }
    };

    fetchDepartments();
  }, [showScripts, isModerator, selectedProject]);

  useEffect(() => {
    if (!showScripts) return;
    const fetchEfforts = async () => {
      if (isAdmin && !selectedDepartment) {
        setEfforts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 🔒 Dispatched over the secure client wrapper channel
        const params = new URLSearchParams();
        if (isAdmin) {
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
          ? `/api/efforts/all?${params.toString()}`
          : "/api/efforts/all";
        const res = await api.get(endpoint);
        setEfforts(res.data || []);
      } catch (error) {
        console.error("Failed to fetch efforts", error);
        setEfforts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEfforts();
  }, [showScripts, isAdmin, selectedDepartment, selectedProject]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (isAdmin && !selectedDepartment) {
        setProjectList([]);
        setSelectedProject("");
        return;
      }

      try {
        // 🔒 Routed through secure configuration instance channel
        const endpoint = isAdmin
          ? `/api/addproject/project-list-admin?department=${encodeURIComponent(selectedDepartment)}`
          : "/api/addproject/project-list-admin";
        const response = await api.get(endpoint);
        const data = response.data;

        let filteredData = data;

        // ✅ If user is a Moderator (but NOT an Admin), filter by their Employee ID
        if (showScripts && !isAdmin && user?.employeeId) {
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
  }, [showScripts, isAdmin, user?.employeeId, selectedDepartment]);

// --- Memoized Filters ---
  const filteredEfforts = useMemo(() => {
    return efforts.filter((item) => {
      // ID Match (Safely cast to string)
      const idMatch = String(item.employee_id || "")
        .toLowerCase()
        .includes(employeeSearch.toLowerCase());
      
      // Name Match (Safely cast to string)
      const rawName = item.name || item.Name || item.employee_name || item.associatename || "";
      const nameMatch = String(rawName)
        .toLowerCase()
        .includes(employeeNameSearch.toLowerCase());

      // Date Match
      const itemDate = item.date ? new Date(item.date) : null;
      const startMatch = startDate ? itemDate >= new Date(startDate) : true;
      const endMatch = endDate ? itemDate <= new Date(endDate) : true;
      
      return idMatch && nameMatch && startMatch && endMatch;
    });
  }, [efforts, employeeSearch, employeeNameSearch, startDate, endDate]);

  // --- Handlers ---

  // ✅ Admin Upload Handler (Axios Transitioned)
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
      // 🔒 Dispatched over the secure wrapper channel to stream multi-part payloads cleanly
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

  const downloadGaugeExclusionReport = (exclusions) => {
    if (!Array.isArray(exclusions) || exclusions.length === 0) return;
    const reportRows = exclusions.map((item) => ({
      "Excel Row": item.excelRow,
      "Source ID": item.sourceId ?? "",
      "Employee ID": item.employeeId || "",
      "Employee Name": item.employeeName || "",
      Date: item.date || "",
      Stage: item.stage || "",
      "Affected Columns": item.columns || "",
      "Exclusion Reasons": item.reasons || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(reportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Excluded Gauge Rows");
    XLSX.writeFile(
      workbook,
      `Gauge_Excluded_Rows_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleGaugeBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("gaugeFile", file);
    setPopup({
      isOpen: true,
      title: "Uploading Gauge data",
      message: "Validating every workbook row before inserting any data.",
      type: "info",
    });

    try {
      const response = await api.post(
        "/api/efforts/gauge-bulk-upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const exclusions = response.data?.exclusions || [];
      downloadGaugeExclusionReport(exclusions);
      setPopup({
        isOpen: true,
        title:
          exclusions.length > 0
            ? "Gauge upload completed with exclusions"
            : "Gauge upload successful",
        message:
          exclusions.length > 0
            ? `${response.data?.message}\n\nAn Excel exclusion report has been downloaded.`
            : response.data?.message ||
              `${response.data?.insertedCount || 0} Gauge records were inserted.`,
        type: exclusions.length > 0 ? "warning" : "success",
      });
    } catch (error) {
      const exclusions = error.response?.data?.exclusions || [];
      downloadGaugeExclusionReport(exclusions);
      const details = exclusions
        .slice(0, 12)
        .map((item) => `Row ${item.excelRow}: ${item.reasons}`)
        .join("\n");
      const remaining =
        exclusions.length > 12
          ? `\n...and ${exclusions.length - 12} more excluded record(s).`
          : "";
      setPopup({
        isOpen: true,
        title: "Gauge upload rejected",
        message: [
          error.response?.data?.error ||
            "The Gauge workbook could not be uploaded.",
          details,
          remaining,
          exclusions.length > 0
            ? "An Excel exclusion report has been downloaded."
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        type: "error",
      });
    } finally {
      event.target.value = "";
    }
  };

  const generatePulseReport = async () => {
    const missingFields = [];
    if (isAdmin && !selectedDepartment) missingFields.push("Department");
    if (!selectedProject) missingFields.push("Project Name");
    if (!startDate) missingFields.push("From Date");
    if (!endDate) missingFields.push("To Date");

    if (missingFields.length > 0) {
      setPopup({
        isOpen: true,
        title: "Missing Required Fields",
        message: `Please fill in the following before generating the Pulse Report:\n\n• ${missingFields.join("\n• ")}`,
        type: "warning",
      });
      return;
    }

    try {
      // 🔒 Pull master file downstream explicitly mapping as an arraybuffer block response channel
      const associates = await fetchReportAssociates();
      const targetAssociateIds = associates
        .map(getAssociateId)
        .filter((id) => id !== "undefined" && id !== "");

      if (targetAssociateIds.length === 0) {
        setPopup({
          isOpen: true,
          title: "No Associates Found",
          message: `We couldn't find any associates assigned to ${selectedProject === "ALL" ? "the selected department" : selectedProject}.`,
          type: "warning",
        });
        return;
      }

      // 🔒 Pipeline calculation engine request forwarded cleanly across secure parameters
      const response = await api.post("/api/efforts/pulse-data", {
        employeeIds: targetAssociateIds,
        startDate,
        endDate,
      });

      const reportData = response.data;

      const wsMain = XLSX.utils.json_to_sheet(reportData.mainTable);
      const wsSummary = XLSX.utils.json_to_sheet(reportData.summaryTable);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsMain, "Pulse Report");
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      const fileNameStr =
        selectedProject === "ALL" ? "All_Projects" : selectedProject;
      const departmentSegment = selectedDepartment
        ? `${getFileSegment(selectedDepartment)}_`
        : "";
      XLSX.writeFile(
        wb,
        `Pulse_Report_${departmentSegment}${getFileSegment(fileNameStr)}.xlsx`,
      );

      setPopup({
        isOpen: true,
        title: "Report Generated",
        message: `The Pulse Report for ${fileNameStr} has been downloaded successfully.`,
        type: "success",
      });
    } catch (err) {
      console.error("Pulse report generation failed", err);
      setPopup({
        isOpen: true,
        title: "Generation Failed",
        message:
          "Failed to generate Pulse Report. Please check the console for details.",
        type: "error",
      });
    }
  };

  const handleAddExcludeDate = (e) => {
    const newDate = e.target.value;
    if (!newDate) return;

    let currentDates = excludeDates
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d !== "");

    if (!currentDates.includes(newDate)) {
      currentDates.push(newDate);
      currentDates.sort();
      setExcludeDates(currentDates.join(", "));
    }
    e.target.value = "";
  };
  const generateDefaulterList = async () => {
    const missingFields = [];
    if (isAdmin && !selectedDepartment) missingFields.push("Department");
    if (!selectedProject) missingFields.push("Project Name");
    if (!startDate) missingFields.push("From Date");
    if (!endDate) missingFields.push("To Date");

    if (missingFields.length > 0) {
      setPopup({
        isOpen: true,
        title: "Missing Required Fields",
        message: `Please fill in the following before generating the Defaulter List:\n\n• ${missingFields.join("\n• ")}`,
        type: "warning",
      });
      return;
    }

    const excludeArr = excludeDates
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d !== "");
    const validWorkingDays = getWorkingDateStrings(
      startDate,
      endDate,
      excludeArr,
    );

    if (validWorkingDays.length === 0) {
      setPopup({
        isOpen: true,
        title: "Invalid Date Range",
        message: "No valid working days found in the selected date range.",
        type: "warning",
      });
      return;
    }

    try {
      // 🔒 Download allocation sheet payload directly as an array buffer stream layout via context wrapper
      const projectAssociates = await fetchReportAssociates();
      const employeeIds = projectAssociates
        .map(getAssociateId)
        .filter((id) => id !== "undefined" && id !== "");

      if (employeeIds.length === 0) {
        setPopup({
          isOpen: true,
          title: "No Associates Found",
          message: `We couldn't find any associates assigned to ${selectedProject === "ALL" ? "the selected department" : selectedProject}.`,
          type: "warning",
        });
        return;
      }

      // 🔒 Query system matching indices utilizing context API channels
      const response = await api.post("/api/efforts/submitted-dates", {
        employeeIds,
        startDate,
        endDate,
      });
      const submittedDatesMap = response.data;

      const defaulterReport = [];

      projectAssociates.forEach((associate) => {
        const empId = getAssociateId(associate);
        if (empId === "undefined" || empId === "") return;

        const submittedEntry = submittedDatesMap[empId];
        const submittedDates = Array.isArray(submittedEntry)
          ? submittedEntry
          : submittedEntry?.dates || [];
        const missingDates = validWorkingDays.filter(
          (date) => !submittedDates.includes(date),
        );

        if (missingDates.length > 0) {
          defaulterReport.push({
            ProjectID: associate.ProjectID || associate.projectid || "N/A",
            ProjectName:
              associate.ProjectName || associate.projectname || "N/A",
            Department: associate.Department || associate.department || "N/A",
            AccountName:
              associate.AccountName || associate.accountname || "N/A",
            "Employee ID": empId,
            Email: `${empId}@cognizant.com`,
            Name: associate.AssociateName || associate.associatename || "N/A",
            SupervisorName:
              associate.SupervisorName || associate.supervisorname || "N/A",
            "Missing date(s)": missingDates.join(", "),
            "Missing days": missingDates.length,
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
        `Defaulter_List_${departmentSegment}${getFileSegment(fileNameStr)}.xlsx`,
      );

      setPopup({
        isOpen: true,
        title: "Report Generated",
        message: `The Defaulter List for ${fileNameStr} has been downloaded successfully.`,
        type: "success",
      });
    } catch (err) {
      console.error("Defaulter report generation failed", err);
      setPopup({
        isOpen: true,
        title: "An Error Occurred",
        message:
          "An error occurred while generating the report. Please check the console for details.",
        type: "error",
      });
    }
  };

  const downloadExcel = () => {
    const exportData = filteredEfforts.map((item) => {
      // 1. Grab the name
      const rawName =
        item.name || item.Name || item.employee_name || item.associatename;

      // 2. Force to string, remove leading commas, and trim whitespace
      let finalName = rawName
        ? String(rawName).replace(/^,\s*/, "").trim()
        : "";

      // 3. Force N/A if empty
      if (!finalName) {
        finalName = "N/A";
      }

      return {
        "Employee ID": item.employee_id,
        "Associate Name": finalName,
        Department: item.Department || item.department || "-",
        Date: item.date?.split("T")[0],
        "On Leave?": item.is_on_leave,
        Stage: item.stage,
        Activity: getActivityText(item),
        "GenAI Used?": item.using_genai_tools,
        "Tools Selection": item.which_genai_tool || "-",
        "Items (GenAI)": item.items_with_genai_tools,
        "Hours (GenAI)": item.hours_with_genai_tools,
        "Items (No GenAI)": item.items_without_genai_tools,
        "Hours (No GenAI)": item.hours_without_genai_tools,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Effort Data");
    XLSX.writeFile(
      workbook,
      `Effort_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };
  return (
    <div className={`${pageContainer} transition-colors duration-500 relative`}>
      <header className="mb-4">
        <h5 className={`${sectionTitle} text-xl sm:text-4xl`}>
          Gauge Dashboard
        </h5>
        <p className={`mt-2 ${textSecondary}`}>
          Comprehensive monitoring of GenAI tool adoption and effort metrics.
        </p>
      </header>

      <div className="space-y-8">
        {showScripts && (
          <>
            {/* ✅ NEW: Admin Dedicated Upload Section */}
            {isAdmin && (
              <div
                className={`${surface} ${cardRing} rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm`}
              >
                <div>
                  <h3 className={`text-lg font-bold ${textPrimary}`}>
                    Admin Controls
                  </h3>
                  <p className={`text-sm mt-1 ${textSecondary}`}>
                    Upload the master allocation report. Once uploaded,
                    moderators can generate reports without needing the file.
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  {isStrictAdmin && (
                    <label className="cursor-pointer whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-lg active:scale-95">
                      Bulk Upload Gauge Data
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleGaugeBulkUpload}
                      />
                    </label>
                  )}
                  <label className="cursor-pointer whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-lg active:scale-95">
                    Upload Master Allocation
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleAdminUpload}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* --- PULSE REPORT SECTION --- */}
            <div
              className={`${surface} ${cardRing} rounded-2xl overflow-hidden shadow-xl p-6`}
            >
              <h2 className={sectionTitle}>
                Generate Pulse & Defaulter Report
              </h2>

              {/* Filter Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 items-end">
                {isAdmin && (
                  <div className="space-y-2 lg:col-span-1">
                    <label className={textMuted}>Department</label>
                    <select
                      className={`w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-brand-500 outline-none transition-all ${surface}`}
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

                {/* Project Selection */}
                <div className="space-y-2 lg:col-span-1">
                  <label className={textMuted}>Project Name</label>
                  <select
                    className={`w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-brand-500 outline-none transition-all ${surface}`}
                    value={selectedProject}
                    onChange={(e) => {
                      setSelectedProject(e.target.value);
                      if (isModerator) {
                        setSelectedDepartment("");
                      }
                    }}
                    disabled={isAdmin && !selectedDepartment}
                  >
                    <option value="">
                      {isAdmin && !selectedDepartment
                        ? "-- Select Department First --"
                        : "-- Select Project --"}
                    </option>
                    {isAdmin && selectedDepartment && (
                      <option value="ALL" className="font-bold text-brand-600">
                        All Projects in Department
                      </option>
                    )}
                    {/* <option value="ALL" className="font-bold text-brand-600">All Projects (Master)</option> */}
                    {projectList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {isModerator && selectedProject && (
                  <div className="space-y-2 lg:col-span-1">
                    <label className={textMuted}>Department</label>
                    <select
                      className={`w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-brand-500 outline-none transition-all ${surface}`}
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

                {/* Date Range - From */}
                <div className="space-y-2 lg:col-span-1">
                  <label className={textMuted}>From Date</label>
                  <input
                    type="date"
                    max={maxDateString}
                    className={`w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-brand-500 outline-none transition-all ${surface}`}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* Date Range - To */}
                <div className="space-y-2 lg:col-span-1">
                  <label className={textMuted}>To Date</label>
                  <input
                    type="date"
                    max={maxDateString}
                    className={`w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-brand-500 outline-none transition-all ${surface}`}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Exclude Dates (With Calendar Appender) */}
                <div className="space-y-2 lg:col-span-1">
                  <label className={textMuted}>Exclude Dates (Holidays)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: 2026-05-01"
                      className={`flex-1 p-2.5 rounded-lg border focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm ${surface}`}
                      value={excludeDates}
                      onChange={(e) => setExcludeDates(e.target.value)}
                      title="You can manually type dates or use the calendar icon to add them."
                    />
                    <input
                      type="date"
                      className={`p-2.5 rounded-lg border cursor-pointer hover:bg-gray-50 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm ${surface}`}
                      onChange={handleAddExcludeDate}
                      title="Click here to pick a date from the calendar"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Container */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={generatePulseReport}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-lg font-bold transition shadow-lg active:scale-95 flex justify-center items-center gap-2"
                >
                  Generate Pulse Report
                </button>
                <button
                  onClick={generateDefaulterList}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg font-bold transition shadow-lg active:scale-95 flex justify-center items-center gap-2"
                >
                  Generate Defaulter List
                </button>
              </div>

              <p className="mt-4 text-xs italic text-gray-500 dark:text-gray-400">
                * Weekends are automatically excluded from the Defaulter List.
                Use the 'Exclude Dates' field for public holidays.
              </p>
              <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">
                * Pulse will be calculated for associates in{" "}
                <strong>{selectedProject || "selected project"}</strong> between{" "}
                <strong>{startDate || "start"}</strong> and{" "}
                <strong>{endDate || "end"}</strong>
                {isAdmin ? (
                  <>
                    {" "}
                    within{" "}
                    <strong>
                      {selectedDepartment || "selected department"}
                    </strong>
                    .
                  </>
                ) : (
                  <> using the master allocation report on the server.</>
                )}
              </p>
            </div>

            {/* --- EFFORT RECORDS SECTION --- */}
            <div
              className={`${surface} ${cardRing} rounded-2xl overflow-hidden shadow-xl`}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className={sectionTitle}>Admin Effort Records</h2>
              </div>
              <div className="p-6 flex gap-4 flex-wrap items-end bg-transparent">
                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}
                  >
                    Employee ID
                  </label>
                  <input
                    className={`block w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-brand-500 outline-none transition-all ${surface}`}
                    placeholder="Ex: Employee ID..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                  />
                </div>
                {/* NEW: Employee Name Filter */}
                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}
                  >
                    Employee Name
                  </label>
                  <input
                    className={`block w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-brand-500 outline-none transition-all ${surface}`}
                    placeholder="Ex: Employee Name..."
                    value={employeeNameSearch}
                    onChange={(e) => setEmployeeNameSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    max={maxDateString}
                    className={`block p-2.5 rounded-lg border ${surface}`}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    max={maxDateString}
                    className={`block p-2.5 rounded-lg border ${surface}`}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={downloadExcel}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    Export Excel
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDepartment("");
                      setSelectedProject("");
                      setEmployeeSearch("");
                      setEmployeeNameSearch(""); // <-- Added to reset
                      setStartDate("");
                      setEndDate("");
                    }}
                    className={`px-6 py-2.5 rounded-lg border font-medium transition-all ${hoverSurface} ${textSecondary} border-gray-300 dark:border-gray-600`}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              <div
                className={`mx-6 mb-6 rounded-xl border overflow-hidden ${cardRing}`}
              >
                <div
                  className="overflow-x-auto overflow-y-auto custom-scrollbar"
                  style={{ maxHeight: "650px" }}
                >
                  {loading ? (
                    <p className="p-10 text-center">Loading efforts...</p>
                  ) : isAdmin && !selectedDepartment ? (
                    <p className={`p-10 text-center ${textSecondary}`}>
                      Select a Department to view Gauge effort records.
                    </p>
                  ) : (
                    <table className="min-w-[1600px] w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-20">
                        <tr className="bg-gray-100 dark:bg-gray-800 backdrop-blur-md">
                          <th
                            className={`p-4 text-left font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Employee ID
                          </th>
                          <th
                            className={`p-4 text-left font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Name
                          </th>
                          <th
                            className={`p-4 text-left font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Department
                          </th>
                          <th
                            className={`p-4 text-left font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Date
                          </th>
                          <th
                            className={`p-4 text-left font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Status
                          </th>
                          <th
                            className={`p-4 text-left font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Stage
                          </th>
                          <th
                            className={`p-4 text-left font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Activity Details
                          </th>
                          <th
                            className={`p-4 text-left font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            GenAI
                          </th>
                          <th
                            className={`p-4 text-left font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Tools
                          </th>
                          <th
                            className={`p-4 text-center font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Items (AI)
                          </th>
                          <th
                            className={`p-4 text-center font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Hrs (AI)
                          </th>
                          <th
                            className={`p-4 text-center font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Items (No)
                          </th>
                          <th
                            className={`p-4 text-center font-semibold border-b dark:border-gray-700 ${textPrimary}`}
                          >
                            Hrs (No)
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y dark:divide-gray-800`}>
                        {filteredEfforts.map((row) => (
                          <tr
                            key={row.gauge_id}
                            className={`${hoverSurface} transition-colors group`}
                          >
                            <td
                              className={`p-4 font-mono font-medium ${textPrimary}`}
                            >
                              {row.employee_id}
                            </td>
                            <td className={`p-4 ${textSecondary}`}>
                              {row.name || "—"}
                            </td>
                            <td className={`p-4 ${textSecondary}`}>
                              {row.Department || row.department || "-"}
                            </td>
                            <td className={`p-4 ${textSecondary}`}>
                              {row.date?.split("T")[0]}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                                  row.is_on_leave === "Yes"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                }`}
                              >
                                {row.is_on_leave === "Yes"
                                  ? "On Leave"
                                  : "Active"}
                              </span>
                            </td>
                            <td className="p-4">
                              <div
                                className={`px-3 py-1 rounded-md text-xs inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-medium`}
                              >
                                {row.stage}
                              </div>
                            </td>
                            <td
                              className={`p-4 max-w-xs truncate italic ${textSecondary}`}
                              title={getActivityText(row)}
                            >
                              {getActivityText(row)}
                            </td>
                            <td className={`p-4 ${textPrimary}`}>
                              {row.using_genai_tools}
                            </td>
                            <td className="p-4">
                              <span className="text-brand-600 dark:text-brand-400 font-semibold">
                                {row.which_genai_tool || "-"}
                              </span>
                            </td>
                            <td className={`p-4 text-center ${textPrimary}`}>
                              {row.items_with_genai_tools}
                            </td>
                            <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {row.hours_with_genai_tools}
                            </td>
                            <td className={`p-4 text-center ${textPrimary}`}>
                              {row.items_without_genai_tools}
                            </td>
                            <td
                              className={`p-4 text-center font-bold ${textPrimary}`}
                            >
                              {row.hours_without_genai_tools}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ✅ BEAUTIFUL POPUP OVERLAY */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 transform transition-all overflow-hidden">
            <div
              className={`p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 ${
                popup.type === "error"
                  ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                  : popup.type === "warning"
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              }`}
            >
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

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end">
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

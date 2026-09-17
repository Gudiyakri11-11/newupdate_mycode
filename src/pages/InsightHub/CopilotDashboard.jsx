import React, { useState, useEffect, useRef } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { useRole } from "../../gurds/userRole";
import api, { initializeAppSecurity } from '../../Api';
import axios from 'axios';
import ExcelJS from 'exceljs';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const CopilotDashboard = () => {
    const { activeRole } = useRole();

    const isAdmin = activeRole === 'admin';
    const isModerator = activeRole === 'moderator';
    const hasAccess = isAdmin || isModerator;

    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
    const [filters, setFilters] = useState({ parentCustomers: [], accounts: [], projects: [], departments: [], squads: [] });

    // Filter states
    const [selectedParentCustomer, setSelectedParentCustomer] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedSquads, setSelectedSquads] = useState([]);
    const [isSquadDropdownOpen, setIsSquadDropdownOpen] = useState(false);

    // Calendar timelines
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const chartRef = useRef(null);
    const squadDropdownRef = useRef(null);
    const fileInputRef = useRef(null);

    // NEW: Dashboard Display & Validation States
    const [showDashboard, setShowDashboard] = useState(false);
    const [isFetchingMetrics, setIsFetchingMetrics] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    
    const [metrics, setMetrics] = useState({ 
        licenseData: [], 
        projectLicenseData: [], 
        exclusionData: [], 
        velocityData: [], 
        usageTrendData: [],
        tokenTeamUsage: [],
        tokenMonthlyTrend: [],
        tokenZeroReasons: [],
        tokenSummary: {}
    });
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Helper to prettify the strict backend format
    const formatLabel = (str) => {
        if (!str) return '';
        if (str === 'OTHER') return 'Other';
        return str.replace(/_/g, ' ');
    };

    // Dark Mode Observer
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Close Dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (squadDropdownRef.current && !squadDropdownRef.current.contains(event.target)) {
                setIsSquadDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initialization session based on role switching
    useEffect(() => {
        setLoading(true);
        setSelectedParentCustomer('');
        setSelectedAccount('');
        setSelectedProject('');
        setSelectedDepartment('');
        setSelectedSquads([]);
        setStartDate('');
        setEndDate('');
        setShowDashboard(false);
        setValidationErrors([]);
        setFilters({ parentCustomers: [], accounts: [], projects: [], departments: [], squads: [] });

        if (!hasAccess) {
            setLoading(false);
            return;
        }

        const initializeDashboardSession = async () => {
            try {
                await initializeAppSecurity();
                const filterRes = await api.get(`/api/copilot-insights/filters?role=${activeRole}`);
                setFilters(filterRes.data);

                if (activeRole === 'moderator' && filterRes.data.projects?.length > 0) {
                    setSelectedProject(filterRes.data.projects[0].id);
                }
                setLoading(false);
            } catch (err) {
                console.error("Dashboard session sync setup error:", err);
                setLoading(false);
            }
        };

        initializeDashboardSession();
    }, [activeRole, hasAccess]);

    // Fetch Cascading Filters with Debounce
    useEffect(() => {
        if (!hasAccess || loading) return;

        const abortController = new AbortController();
        const signal = abortController.signal;

        const fetchCascadingFilters = async () => {
            try {
                const res = await api.get(`/api/copilot-insights/filters?role=${activeRole}&parentCustomer=${selectedParentCustomer}&account=${selectedAccount}&projectId=${selectedProject}`, { signal });
                
                let squadsList = res.data.squads || [];
                if (!squadsList.includes('OTHER')) {
                    squadsList.push('OTHER'); 
                }
                
                setFilters(prev => ({ 
                    ...prev, 
                    parentCustomers: res.data.parentCustomers || prev.parentCustomers,
                    accounts: res.data.accounts || [],
                    projects: res.data.projects || [],
                    squads: squadsList 
                }));
            } catch (err) {
                if (err.name !== 'CanceledError' && err.message !== 'canceled' && !axios.isCancel(err)) {
                    console.error("Error refreshing cascading filters:", err);
                }
            }
        };

        const timer = setTimeout(() => {
            fetchCascadingFilters();
        }, 400);

        return () => {
            clearTimeout(timer);
            abortController.abort();
        };
    }, [selectedParentCustomer, selectedAccount, selectedProject, hasAccess, activeRole, loading]);

    // --- Handlers ---
    const handleParentCustomerChange = (e) => {
        setSelectedParentCustomer(e.target.value);
        setSelectedAccount('');
        setSelectedProject('');
        setSelectedSquads([]);
        setShowDashboard(false); // Hide stale data
    };

    const handleAccountChange = (e) => {
        setSelectedAccount(e.target.value);
        setSelectedProject('');
        setSelectedSquads([]);
        setShowDashboard(false);
    };

    const handleProjectChange = (e) => {
        setSelectedProject(e.target.value);
        setSelectedSquads([]);
        setShowDashboard(false);
    };

    const handleDepartmentChange = (e) => {
        setSelectedDepartment(e.target.value);
        setShowDashboard(false);
    };

    const handleStartDateChange = (e) => {
        setStartDate(e.target.value);
        setShowDashboard(false);
    };

    const handleEndDateChange = (e) => {
        setEndDate(e.target.value);
        setShowDashboard(false);
    };

    const toggleSquadSelection = (squad) => {
        setSelectedSquads(prev =>
            prev.includes(squad) ? prev.filter(item => item !== squad) : [...prev, squad]
        );
        setShowDashboard(false);
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setIsUploading(true);
        try {
            await api.post("/api/copilot-insights/upload-client-hierarchy", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            alert("Client hierarchy uploaded and updated successfully!");
            window.location.reload();
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload Excel file. Check permissions and file format.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // NEW: Handle Excel Export
    const handleExportToExcel = async () => {
        try {
            const response = await api.post('/api/efforts/token-usage/export-excel', {
                projectId: selectedProject,
                squads: selectedSquads,
                startDate: startDate,
                endDate: endDate
            });

            const { dataByMonth } = response.data;

            if (!dataByMonth || dataByMonth.length === 0) {
                alert('No data available to export for the selected filters');
                return;
            }

            // Create workbook
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'GenAI Buddy Dashboard';
            workbook.created = new Date();

            // Add sheet for each month
            dataByMonth.forEach((monthData) => {
                const sheet = workbook.addWorksheet(monthData.name, {
                    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
                });

                // Define columns
                sheet.columns = [
                    { header: 'Associate ID', key: 'Associate ID', width: 15 },
                    { header: 'Associate Name', key: 'Associate Name', width: 25 },
                    { header: 'Grade', key: 'Grade', width: 12 },
                    { header: 'Supervisor ID', key: 'Supervisor ID', width: 15 },
                    { header: 'Supervisor Name', key: 'Supervisor Name', width: 25 },
                    { header: 'AI Tool Used', key: 'AI Tool Used', width: 30 },
                    { header: 'Token Consumption', key: 'Token Consumption', width: 20 },
                    { header: 'Token Unit (Original)', key: 'Token Unit (Original)', width: 22 },
                    { header: 'Zero Reason', key: 'Zero Reason', width: 35 },
                    { header: 'Last Submitted Date', key: 'Last Submitted Date', width: 18 }
                ];

                // Style header row
                sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                sheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF0D47A1' }
                };
                sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
                sheet.getRow(1).height = 25;

                // Add data rows
                monthData.data.forEach(row => {
                    const addedRow = sheet.addRow(row);
                    
                    // Highlight zero consumption rows
                    if (row['Token Consumption'] === 0) {
                        addedRow.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFF3CD' }
                        };
                    }
                });

                // Add borders to all cells
                sheet.eachRow((row) => {
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });
            });

            // Generate Excel file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            // Download file
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Token_Usage_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Excel export failed:', error);
            alert('Failed to export data. Please try again.');
        }
    };

    // NEW: Handle Apply Filters & Validation
    const handleApplyFilters = async () => {
        const errors = [];
        
        // Role-based validation
        if (isAdmin) {
            if (!selectedParentCustomer) errors.push("Parent Customer");
            if (!selectedAccount) errors.push("Account Name");
            if (!selectedDepartment) errors.push("Department");
        }
        
        // Common validations
        if (!selectedProject) errors.push("Project Name");
        if (selectedSquads.length === 0) errors.push("Squad Teams (Select at least one)");
        if (!startDate) errors.push("Start Date");
        if (!endDate) errors.push("End Date");

        if (errors.length > 0) {
            setValidationErrors(errors);
            setShowDashboard(false);
            return;
        }

        // Pass validation
        setValidationErrors([]);
        setIsFetchingMetrics(true);

        try {
            // Fetch copilot insights metrics
            const copilotRes = await api.post('/api/copilot-insights/dashboard-metrics', {
                parentCustomer: selectedParentCustomer,
                account: selectedAccount,
                projectId: selectedProject,
                department: selectedDepartment,
                squads: selectedSquads,
                startDate: startDate,
                endDate: endDate
            });

            // Fetch token usage metrics
            const tokenRes = await api.post('/api/efforts/token-usage/dashboard-metrics', {
                projectId: selectedProject,
                squads: selectedSquads,
                startDate: startDate,
                endDate: endDate
            });
            
            setMetrics({
                ...copilotRes.data,
                tokenTeamUsage: tokenRes.data.teamUsageData || [],
                tokenMonthlyTrend: tokenRes.data.monthlyTrendData || [],
                tokenZeroReasons: tokenRes.data.zeroReasonsData || [],
                tokenSummary: tokenRes.data.summaryStats || {}
            });
            setShowDashboard(true);
        } catch (err) {
            console.error("Error evaluating target metrics calculations:", err);
            alert("Failed to load dashboard metrics. Please try again.");
        } finally {
            setIsFetchingMetrics(false);
        }
    };

    if (loading) {
        return (
            <div className="p-12 text-center font-sans text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-950 min-h-screen">
                Loading Filters and Setup...
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex justify-center items-center h-[80vh] font-sans bg-gray-50 dark:bg-zinc-900 transition-colors duration-200">
                <div className="text-center p-10 bg-white dark:bg-zinc-800 rounded-xl shadow-sm max-w-md border border-gray-100 dark:border-zinc-700">
                    <span className="text-5xl block mb-4">🔒</span>
                    <h2 className="text-red-600 dark:text-red-500 font-bold text-2xl mb-2">Access Denied</h2>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm">This dashboard is restricted to System Administrators and Designated Project Moderators.</p>
                </div>
            </div>
        );
    }

    const commonOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { boxWidth: 12, color: isDarkMode ? '#e5e7eb' : '#1f2937', font: { family: 'Segoe UI', size: 11, weight: '500' } }
            },
            tooltip: { enabled: true },
            title: { display: false }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' } },
            y: { grid: { color: isDarkMode ? '#27272a' : '#f3f4f6' }, ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' } }
        }
    };

    const colorSpectrumPalette = isDarkMode
        ? ['#60a5fa', '#f97316', '#94a3b8', '#facc15', '#38bdf8', '#4ade80']
        : ['#1565c0', '#ef6c00', '#78909c', '#fbc02d', '#0288d1', '#2e7d32'];

    const barCounterPlugin = {
        id: 'barCounter',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            ctx.save();
            ctx.font = 'bold 10px Segoe UI';
            ctx.fillStyle = isDarkMode ? '#ffffff' : '#222222';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                const isStacked = chart.options.scales.x.stacked || chart.options.scales.y.stacked;

                meta.data.forEach((bar, index) => {
                    const value = dataset.data[index];
                    if (value > 0) {
                        const x = bar.x;
                        const isPercentageChart = chart.canvas.id === 'trendChartCanvas' || dataset.label?.includes('Effort');
                        const outputLabel = isPercentageChart ? `${value}%` : value;

                        if (isStacked) {
                            const y = bar.y + (bar.height / 2);
                            if (bar.height > 14) { ctx.fillText(outputLabel, x, y); }
                        } else {
                            ctx.fillText(outputLabel, x, bar.y - 8);
                        }
                    }
                });
            });
            ctx.restore();
        }
    };

    // --- Chart Formats ---
    const licenseChartData = {
        labels: metrics.licenseData?.length ? metrics.licenseData.map(d => formatLabel(d.Squad)) : ['No Data Available'],
        datasets: [
            { label: 'Team Member having GHCP Licenses', data: metrics.licenseData?.map(d => d.HasLicense) || [0], backgroundColor: isDarkMode ? '#3b82f6' : '#1565c0', borderRadius: 4 },
            { label: "Team Members doesn't have GHCP license", data: metrics.licenseData?.map(d => d.NoLicense) || [0], backgroundColor: '#ffb300', borderRadius: 4 }
        ]
    };

    const projectLicenseRows = metrics.projectLicenseData || [];
    const projectLicenseChartData = {
        labels: projectLicenseRows.length ? projectLicenseRows.map(d => formatLabel(d.ProjectName || d.ProjectID)) : ['No Data Available'],
        datasets: [
            { label: 'Team Member having GHCP Licenses', data: projectLicenseRows.length ? projectLicenseRows.map(d => d.HasLicense) : [0], backgroundColor: isDarkMode ? '#3b82f6' : '#1565c0', borderRadius: 4 },
            { label: "Team Members doesn't have GHCP license", data: projectLicenseRows.length ? projectLicenseRows.map(d => d.NoLicense) : [0], backgroundColor: '#ffb300', borderRadius: 4 }
        ]
    };

    const squadsList = [...new Set(metrics.exclusionData?.map(d => d.Squad_Name) || [])];
    const exclusionReasonsList = [...new Set(metrics.exclusionData?.map(d => d.Exclusion_Reason) || [])];

    const exclusionChartData = {
        labels: squadsList.length ? squadsList.map(formatLabel) : ['No Data Available'],
        datasets: exclusionReasonsList.length ? exclusionReasonsList.map((reason, index) => ({
            label: reason,
            data: squadsList.map(squad => {
                const row = metrics.exclusionData.find(d => d.Squad_Name === squad && d.Exclusion_Reason === reason);
                return row ? row.TotalStoryPoints : 0;
            }),
            backgroundColor: colorSpectrumPalette[index % colorSpectrumPalette.length]
        })) : [{ label: 'Empty Metric', data: [0], backgroundColor: '#eee' }]
    };

    const velocitySquadsList = [...new Set(metrics.velocityData?.map(d => d.Squad_Name) || [])];
    const uniqueSprintsList = [...new Set(metrics.velocityData?.map(d => d.Sprint_Name) || [])];

    const velocityChartData = {
        labels: velocitySquadsList.length ? velocitySquadsList.map(formatLabel) : ['No Data Available'],
        datasets: uniqueSprintsList.length ? uniqueSprintsList.map((sprintName, index) => ({
            label: formatLabel(sprintName), 
            data: velocitySquadsList.map(squad => {
                const matchingRows = metrics.velocityData?.filter(d => d.Squad_Name === squad && d.Sprint_Name === sprintName) || [];
                return matchingRows.reduce((sum, row) => sum + (row.DeliveredPoints || 0), 0);
            }),
            backgroundColor: colorSpectrumPalette[index % colorSpectrumPalette.length],
            borderRadius: 4
        })) : [{ label: 'Empty Metric', data: [0], backgroundColor: '#eee' }]
    };

    const allStagesList = ['BUSINESS REQUIREMENT', 'CODE & BUILD', 'DESIGN', 'TEST & REVIEW', 'DEPLOY & HYPERCARE', 'DOMAIN OR BUSINESS USE CASE', 'OTHER'];
    
    const usageTrendChartData = {
        labels: allStagesList.map(stage => {
            if (stage === 'BUSINESS REQUIREMENT') return 'Business Requirements';
            if (stage === 'DOMAIN OR BUSINESS USE CASE') return 'Domain/Business Use Case';
            return stage.charAt(0) + stage.slice(1).toLowerCase().replace(/& (\w)/g, (_, c) => `& ${c.toUpperCase()}`);
        }),
        datasets: [
            {
                label: 'Human Pulse %',
                data: allStagesList.map(stage => {
                    const row = metrics.usageTrendData?.find(d => d.StageName === stage);
                    return row ? row.HumanPercent : 0;
                }),
                backgroundColor: isDarkMode ? '#3b82f6' : '#1565c0',
                borderRadius: 4
            },
            {
                label: 'Machine Pulse %',
                data: allStagesList.map(stage => {
                    const row = metrics.usageTrendData?.find(d => d.StageName === stage);
                    return row ? row.MachinePercent : 0;
                }),
                backgroundColor: '#f97316',
                borderRadius: 4
            }
        ]
    };

    // Token Usage Chart Data
    const tokenTeamChartData = {
        labels: metrics.tokenTeamUsage?.map(d => d.EmployeeName) || ['No Data'],
        datasets: [{
            label: 'AI Tokens Used',
            data: metrics.tokenTeamUsage?.map(d => d.TotalTokens) || [0],
            backgroundColor: isDarkMode ? '#a78bfa' : '#7c3aed',
            borderRadius: 4
        }]
    };

    const tokenTrendChartData = {
        labels: metrics.tokenMonthlyTrend?.map(d => `${d.Month}/${d.Year}`) || ['No Data'],
        datasets: [{
            label: 'Total Tokens Used',
            data: metrics.tokenMonthlyTrend?.map(d => d.TotalTokens) || [0],
            borderColor: isDarkMode ? '#a78bfa' : '#7c3aed',
            backgroundColor: isDarkMode ? 'rgba(167, 139, 250, 0.1)' : 'rgba(124, 58, 237, 0.1)',
            borderWidth: 2,
            tension: 0.4
        }]
    };

    const tokenZeroReasonsData = {
        labels: metrics.tokenZeroReasons?.map(d => d.Reason) || ['No Data'],
        datasets: [{
            data: metrics.tokenZeroReasons?.map(d => d.Count) || [0],
            backgroundColor: [
                isDarkMode ? '#a78bfa' : '#7c3aed',
                '#f97316',
                '#94a3b8',
                '#facc15',
                '#38bdf8',
                '#4ade80'
            ]
        }]
    };

    return (
        <div className="p-8 font-sans bg-gray-100 dark:bg-zinc-950 min-h-screen text-gray-800 dark:text-zinc-100 transition-colors duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[#0d47a1] dark:text-blue-400 font-bold text-2xl">Copilot Adoption and Usage Dashboard</h2>

                {isAdmin && (
                    <div className="flex gap-3 items-center">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                        />
                        <button 
                            onClick={() => fileInputRef.current.click()} 
                            disabled={isUploading}
                            className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isUploading ? 'Uploading...' : 'Upload Client Mapping (Excel)'}
                        </button>
                    </div>
                )}
            </div>
            <hr className="border-gray-200 dark:border-zinc-800 mb-6" />

            {/* Filter Card Row */}
            <div className="flex flex-col gap-4 p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm mb-8">
                
                {/* Warning Banner for missing fields */}
                {validationErrors.length > 0 && (
                    <div className="w-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-md text-sm border border-red-200 dark:border-red-800/50">
                        <span className="font-bold">Missing Required Fields:</span> Please complete the following filters to apply: 
                        <span className="font-medium ml-1">{validationErrors.join(', ')}</span>
                    </div>
                )}

                <div className="flex gap-5 flex-wrap items-center">
                    {isAdmin && (
                        <>
                            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                                <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                                    Parent Customer Name <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    className={`p-2 border rounded-md text-sm bg-white dark:bg-zinc-800 focus:outline-none ${validationErrors.includes("Parent Customer") ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100'}`} 
                                    onChange={handleParentCustomerChange} 
                                    value={selectedParentCustomer}
                                >
                                    <option value="">Select Parent Customer</option>
                                    {filters.parentCustomers?.map(pc => <option key={pc} value={pc}>{pc}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 flex-1 min-w-[160px] justify-end">
                                <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                                    Account Name <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    className={`p-2 border rounded-md text-sm bg-white dark:bg-zinc-800 focus:outline-none ${validationErrors.includes("Account Name") ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100'}`} 
                                    onChange={handleAccountChange} 
                                    value={selectedAccount}
                                >
                                    <option value="">Select Account</option>
                                    {filters.accounts?.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 flex-1 min-w-[160px] justify-end">
                                <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                                    Project Name <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    list="projects-list"
                                    placeholder="Search Project..."
                                    className={`p-2 border rounded-md text-sm bg-white dark:bg-zinc-800 focus:outline-none w-full ${validationErrors.includes("Project Name") ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100'}`}
                                    onChange={handleProjectChange} 
                                    value={selectedProject}
                                />
                                <datalist id="projects-list">
                                    <option value="">Select Project</option>
                                    {filters.projects?.map(p => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
                                </datalist>
                            </div>

                            <div className="flex flex-col gap-1 flex-1 min-w-[160px] justify-end">
                                <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    className={`p-2 border rounded-md text-sm bg-white dark:bg-zinc-800 focus:outline-none ${validationErrors.includes("Department") ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100'}`} 
                                    onChange={handleDepartmentChange} 
                                    value={selectedDepartment}
                                >
                                    <option value="">Select Department</option>
                                    {filters.departments?.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {isModerator && (
                        <div className="flex flex-col gap-1 flex-1 max-w-xs">
                            <label className="text-xs font-bold text-[#0d47a1] dark:text-blue-400 uppercase tracking-wide">
                                Your Assigned Project <span className="text-red-500">*</span>
                            </label>
                            <select 
                                className={`p-2 border rounded-md text-sm font-semibold bg-white dark:bg-zinc-800 focus:outline-none w-full ${validationErrors.includes("Project Name") ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100'}`} 
                                onChange={handleProjectChange} 
                                value={selectedProject}
                            >
                                {filters.projects?.length > 1 && <option value="">-- Select Project --</option>}
                                {filters.projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Squad Dropdown Options */}
                    <div className="flex flex-col gap-1 flex-1 min-w-[200px] relative" ref={squadDropdownRef}>
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                            Squad Teams <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsSquadDropdownOpen(!isSquadDropdownOpen)}
                            className={`p-2 border rounded-md text-sm bg-white dark:bg-zinc-800 text-left focus:outline-none flex justify-between items-center w-full min-h-[38px] ${validationErrors.some(e => e.includes("Squad Teams")) ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100'}`}
                        >
                            <span className="truncate">
                                {selectedSquads.length === 0
                                    ? 'Select Squads...'
                                    : selectedSquads.length === filters.squads?.length
                                        ? 'All Squads Selected'
                                        : `${selectedSquads.length} Squad(s) Selected`
                                }
                            </span>
                            <span className="text-xs text-gray-400">▼</span>
                        </button>

                        {isSquadDropdownOpen && (
                            <div className="absolute top-[100%] left-0 w-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto z-50 p-2 flex flex-col gap-1.5">
                                {filters.squads?.length === 0 ? (
                                    <span className="text-xs text-gray-400 p-1 italic">No squads matching context</span>
                                ) : (
                                    <>
                                        <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded cursor-pointer text-sm font-semibold border-b border-gray-200 dark:border-zinc-700 pb-1.5 text-gray-900 dark:text-zinc-100 selection:bg-transparent">
                                            <input
                                                type="checkbox"
                                                className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-zinc-600"
                                                checked={filters.squads.length > 0 && selectedSquads.length === filters.squads.length}
                                                onChange={() => {
                                                    if (selectedSquads.length === filters.squads.length) {
                                                        setSelectedSquads([]);
                                                    } else {
                                                        setSelectedSquads([...filters.squads]);
                                                    }
                                                    setShowDashboard(false);
                                                }}
                                            />
                                            <span>Select All</span>
                                        </label>

                                        {filters.squads.map(squad => (
                                            <label key={squad} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded cursor-pointer text-sm text-gray-800 dark:text-zinc-200 selection:bg-transparent">
                                                <input
                                                    type="checkbox"
                                                    className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-zinc-600"
                                                    checked={selectedSquads.includes(squad)}
                                                    onChange={() => toggleSquadSelection(squad)}
                                                />
                                                <span className="truncate">{formatLabel(squad)}</span>
                                            </label>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Date Inputs */}
                    <div className="flex gap-4 items-center border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-zinc-700 pt-4 lg:pt-0 lg:pl-4 flex-wrap sm:flex-nowrap">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="date" 
                                className={`p-1.5 border rounded-md text-sm bg-white dark:bg-zinc-800 focus:outline-none ${validationErrors.includes("Start Date") ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100'}`} 
                                value={startDate} 
                                onChange={handleStartDateChange} 
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                                End Date <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="date" 
                                className={`p-1.5 border rounded-md text-sm bg-white dark:bg-zinc-800 focus:outline-none ${validationErrors.includes("End Date") ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100'}`} 
                                value={endDate} 
                                onChange={handleEndDateChange} 
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Row */}
                <div className="w-full flex justify-end mt-2 pt-4 border-t border-gray-200 dark:border-zinc-800">
                    <button
                        onClick={handleApplyFilters}
                        disabled={isFetchingMetrics}
                        className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md shadow-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isFetchingMetrics ? 'Generating Dashboard...' : 'Apply Filters'}
                    </button>
                </div>
            </div>

            {/* Render Dashboard Or Placeholder */}
            {showDashboard ? (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                            <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">Squad-wise GHCP License Adaptation</h3>
                            <Bar data={licenseChartData} options={{ ...commonOptions, scales: { x: { ...commonOptions.scales.x, stacked: true }, y: { ...commonOptions.scales.y, stacked: true } } }} plugins={[barCounterPlugin]} />
                        </div>
                        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                            <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">Project-wise GHCP License Adaptation</h3>
                            <Bar data={projectLicenseChartData} options={{ ...commonOptions, scales: { x: { ...commonOptions.scales.x, stacked: true }, y: { ...commonOptions.scales.y, stacked: true } } }} plugins={[barCounterPlugin]} />
                        </div>
                        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                            <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">Copilot Exclusion</h3>
                            <Bar data={exclusionChartData} options={{ ...commonOptions, scales: { x: { ...commonOptions.scales.x, stacked: true }, y: { ...commonOptions.scales.y, stacked: true } } }} plugins={[barCounterPlugin]} />
                        </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm mb-6">
                        <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">Sprint Velocity</h3>
                        <Bar data={velocityChartData} options={commonOptions} plugins={[barCounterPlugin]} />
                    </div>

                    <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                                GenAI Usage Trend ─ Standard Workspace Overview
                            </h3>
                        </div>
                        <div>
                            <Bar 
                                id="trendChartCanvas" 
                                ref={chartRef} 
                                data={usageTrendChartData} 
                                options={{ 
                                    ...commonOptions, 
                                    plugins: { ...commonOptions.plugins, legend: { ...commonOptions.plugins.legend, position: 'top' } } 
                                }} 
                                plugins={[barCounterPlugin]} 
                            />
                        </div>
                    </div>

                    {/* AI TOKEN USAGE SECTION */}
                    <div className="mt-8 mb-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-[#0d47a1] dark:text-blue-400 flex items-center gap-2">
                                <span>🤖</span> AI Token Usage Analytics
                            </h2>
                            <button
                                onClick={handleExportToExcel}
                                disabled={!showDashboard || isFetchingMetrics}
                                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md shadow-md transition-colors flex items-center gap-2"
                            >
                                <span>📥</span> Export Token Data to Excel
                            </button>
                        </div>
                        <hr className="border-gray-200 dark:border-zinc-800 mt-2 mb-6" />
                    </div>

                    {/* Token Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-xl shadow-sm">
                            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1">
                                Total Users
                            </p>
                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                {metrics.tokenSummary?.TotalUsers || 0}
                            </p>
                        </div>
                        <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-xl shadow-sm">
                            <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">
                                Active Submissions
                            </p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                {metrics.tokenSummary?.ActiveSubmissions || 0}
                            </p>
                        </div>
                        <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-800 rounded-xl shadow-sm">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">
                                Zero Submissions
                            </p>
                            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                                {metrics.tokenSummary?.ZeroSubmissions || 0}
                            </p>
                        </div>
                        <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
                                Avg Token Usage (Thousand)
                            </p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {metrics.tokenSummary?.AvgTokenUsage ? (metrics.tokenSummary.AvgTokenUsage / 1000).toFixed(2) : 0}
                            </p>
                        </div>
                    </div>

                    {/* Token Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                            <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">
                                Token Usage by Team Member
                            </h3>
                            <Bar data={tokenTeamChartData} options={commonOptions} plugins={[barCounterPlugin]} />
                        </div>

                        {metrics.tokenZeroReasons?.length > 0 && (
                            <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">
                                    Zero Token Usage Reasons
                                </h3>
                                <div className="h-80 flex items-center justify-center">
                                    <Doughnut 
                                        data={tokenZeroReasonsData} 
                                        options={{
                                            ...commonOptions,
                                            scales: undefined,
                                            plugins: {
                                                ...commonOptions.plugins,
                                                legend: { position: 'bottom', labels: { color: isDarkMode ? '#e5e7eb' : '#1f2937' } }
                                            }
                                        }} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {metrics.tokenMonthlyTrend?.length > 0 && (
                        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                            <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">
                                Monthly Token Usage Trend
                            </h3>
                            <Line 
                                data={tokenTrendChartData} 
                                options={{
                                    ...commonOptions,
                                    plugins: {
                                        ...commonOptions.plugins,
                                        legend: { position: 'top' }
                                    }
                                }} 
                            />
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm text-center">
                    <span className="text-4xl mb-4 text-gray-300 dark:text-zinc-600">📊</span>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-zinc-300 mb-2">Dashboard Not Configured</h3>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm max-w-md">
                        Please select all mandatory fields in the filter section above and click <strong>"Apply Filters"</strong> to generate your metrics.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CopilotDashboard;
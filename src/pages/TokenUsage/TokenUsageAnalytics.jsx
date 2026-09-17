import React, { useState, useEffect } from 'react';
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
import api from '../../Api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function TokenUsageAnalytics() {
  const { activeRole } = useRole();
  const isAdmin = activeRole === 'admin';
  const isModerator = activeRole === 'moderator';
  const hasAccess = isAdmin || isModerator;

  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [view, setView] = useState('individual'); // 'individual' or 'project'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [availableProjects, setAvailableProjects] = useState([]);

  // Data states
  const [individualData, setIndividualData] = useState([]);
  const [projectData, setProjectData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});

  // Dark mode observer
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Fetch available projects for admin/moderator
  useEffect(() => {
    if (hasAccess && view === 'project') {
      const fetchProjects = async () => {
        try {
          const response = await api.get('/api/efforts/projects');
          setAvailableProjects(response.data || []);
        } catch (err) {
          console.error('Failed to fetch projects:', err);
        }
      };
      fetchProjects();
    }
  }, [hasAccess, view]);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      if (view === 'individual') {
        const response = await api.get('/api/efforts/token-usage/analytics/individual', { params });
        setIndividualData(response.data || []);
      } else if (view === 'project' && selectedProject) {
        params.projectId = selectedProject;
        const response = await api.get('/api/efforts/token-usage/analytics/project', { params });
        setProjectData(response.data || []);
      }

      // Fetch summary stats
      if (view === 'project' && selectedProject) {
        params.projectId = selectedProject;
      }
      const summaryResponse = await api.get('/api/efforts/token-usage/analytics/summary', { params });
      setSummaryStats(summaryResponse.data || {});
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'individual') {
      fetchAnalytics();
    } else if (view === 'project' && selectedProject) {
      fetchAnalytics();
    }
  }, [view, startDate, endDate, selectedProject]);

  // Chart configurations
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDarkMode ? '#e5e7eb' : '#1f2937',
          font: { family: 'Segoe UI', size: 12, weight: '500' }
        }
      },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' }
      },
      y: {
        grid: { color: isDarkMode ? '#27272a' : '#f3f4f6' },
        ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' }
      }
    }
  };

  // Individual usage trend chart
  const individualTrendData = {
    labels: individualData.map(d => `${d.submission_month}/${d.submission_year}`),
    datasets: [{
      label: 'Token Usage Over Time',
      data: individualData.map(d => d.token_usage),
      borderColor: isDarkMode ? '#60a5fa' : '#1565c0',
      backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(21, 101, 192, 0.1)',
      borderWidth: 2,
      tension: 0.4
    }]
  };

  // Project-wise usage by employee
  const projectEmployeeData = {
    labels: [...new Set(projectData.map(d => d.name))],
    datasets: [{
      label: 'Token Usage by Team Member',
      data: [...new Set(projectData.map(d => d.name))].map(name => {
        return projectData.filter(d => d.name === name).reduce((sum, d) => sum + d.token_usage, 0);
      }),
      backgroundColor: isDarkMode ? '#60a5fa' : '#1565c0',
      borderRadius: 4
    }]
  };

  // Zero usage reasons breakdown
  const zeroReasonData = {
    labels: [...new Set(individualData.filter(d => d.zero_reason).map(d => d.zero_reason))],
    datasets: [{
      data: [...new Set(individualData.filter(d => d.zero_reason).map(d => d.zero_reason))].map(reason => {
        return individualData.filter(d => d.zero_reason === reason).length;
      }),
      backgroundColor: [
        isDarkMode ? '#60a5fa' : '#1565c0',
        '#f97316',
        '#94a3b8',
        '#facc15',
        '#38bdf8'
      ]
    }]
  };

  if (!hasAccess && view === 'project') {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-zinc-900">
        <div className="text-center p-10 bg-white dark:bg-zinc-800 rounded-xl shadow-sm max-w-md">
          <span className="text-5xl block mb-4">🔒</span>
          <h2 className="text-red-600 dark:text-red-500 font-bold text-2xl mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-zinc-400 text-sm">
            Project-wise analytics are available to Admins and Moderators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 font-sans bg-gray-100 dark:bg-zinc-950 min-h-screen text-gray-800 dark:text-zinc-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[#0d47a1] dark:text-blue-400 font-bold text-2xl">
          🤖 AI Token Usage Analytics
        </h2>
        
        {hasAccess && (
          <div className="flex gap-2">
            <button
              onClick={() => setView('individual')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                view === 'individual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-300 dark:border-zinc-700'
              }`}
            >
              My Usage
            </button>
            <button
              onClick={() => setView('project')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                view === 'project'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-300 dark:border-zinc-700'
              }`}
            >
              Project Analytics
            </button>
          </div>
        )}
      </div>
      <hr className="border-gray-200 dark:border-zinc-800 mb-6" />

      {/* Filters */}
      <div className="flex flex-col gap-4 p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm mb-6">
        <div className="flex gap-5 flex-wrap items-center">
          {view === 'project' && hasAccess && (
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                Select Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="p-2 border rounded-md text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="">-- Select a project --</option>
                {availableProjects.map((proj) => (
                  <option key={proj.project_id} value={proj.project_id}>
                    {proj.project_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-4 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 border rounded-md text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border rounded-md text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
            Total Users
          </p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {summaryStats.totalUsers || 0}
          </p>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
            Active Submissions
          </p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {summaryStats.activeSubmissions || 0}
          </p>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
            Zero Submissions
          </p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {summaryStats.zeroSubmissions || 0}
          </p>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
            Avg Token Usage
          </p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {summaryStats.avgTokenUsage ? Math.round(summaryStats.avgTokenUsage) : 0}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 mb-6">
          ❌ {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      )}

      {/* Charts */}
      {!loading && !error && (
        <>
          {view === 'individual' && individualData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">
                  My Token Usage Trend
                </h3>
                <div className="h-80">
                  <Line data={individualTrendData} options={commonOptions} />
                </div>
              </div>

              {individualData.filter(d => d.zero_reason).length > 0 && (
                <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                  <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">
                    Zero Usage Reasons
                  </h3>
                  <div className="h-80 flex items-center justify-center">
                    <Doughnut 
                      data={zeroReasonData} 
                      options={{
                        ...commonOptions,
                        scales: undefined,
                        plugins: {
                          ...commonOptions.plugins,
                          legend: { position: 'bottom' }
                        }
                      }} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'project' && projectData.length > 0 && (
            <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm mb-6">
              <h3 className="text-center text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">
                Token Usage by Team Member
              </h3>
              <div className="h-96">
                <Bar data={projectEmployeeData} options={commonOptions} />
              </div>
            </div>
          )}

          {/* Data Table */}
          {((view === 'individual' && individualData.length > 0) || (view === 'project' && projectData.length > 0)) && (
            <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-x-auto">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">
                Detailed Records
              </h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Project</th>
                    <th className="px-4 py-3 text-left font-semibold">Month/Year</th>
                    <th className="px-4 py-3 text-right font-semibold">Token Usage</th>
                    <th className="px-4 py-3 text-left font-semibold">Unit</th>
                    <th className="px-4 py-3 text-left font-semibold">Zero Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                  {(view === 'individual' ? individualData : projectData).map((record, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3">{record.name}</td>
                      <td className="px-4 py-3">{record.project_name || 'N/A'}</td>
                      <td className="px-4 py-3">{record.submission_month}/{record.submission_year}</td>
                      <td className="px-4 py-3 text-right font-semibold">{record.token_usage.toFixed(2)}</td>
                      <td className="px-4 py-3">{record.token_unit}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400">
                        {record.zero_reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {((view === 'individual' && individualData.length === 0) || (view === 'project' && projectData.length === 0)) && !loading && (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <span className="text-4xl mb-4">📊</span>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-zinc-300 mb-2">No Data Available</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-sm text-center max-w-md">
                {view === 'project' && !selectedProject
                  ? 'Please select a project to view analytics'
                  : 'No token usage records found for the selected criteria'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

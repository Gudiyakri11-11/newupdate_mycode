import React, { useEffect, useMemo, useState } from 'react';
import api from '../Api'; // ✅ Centralized Axios security client wrapper
import { navigate } from '../router/miniRouter';
import { useRole } from '../gurds/userRole';

const AddProject = () => {
    // ✅ ACCESS CONTROL: Only Admins AND Guides can view this page
    const { activeRole } = useRole();
    const isStrictAdmin = activeRole === "admin";
    const isGuides = activeRole === "guides";

    // Treat Guides like an Admin so they bypass the restricted view block
    const isAdmin = isStrictAdmin || isGuides;

    const [project, setProject] = useState({
        projectId: '',
        projectName: '',
        projectManager: '',
        managerId: '',
        proxyManagerName: '',
        proxyManagerId: ''
    });

    const [projectList, setProjectList] = useState([]);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingList, setFetchingList] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // State for Search Query
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch project list on mount
    useEffect(() => {
        if (isAdmin) {
            fetchProjects();
        }
    }, [isAdmin]);

    const fetchProjects = async () => {
        setFetchingList(true);
        try {
            // 🔒 Dispatched over the secure config wrapper channel
            const response = await api.get('/api/addProject/project-list-admin');
            setProjectList(response.data);
        } catch (err) {
            console.error("Failed to fetch projects", err);
        } finally {
            setFetchingList(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                // 🔒 Secured PUT request containing dynamic CSRF verification headers
                const response = await api.put(`/api/addProject/edit/${project.projectId}`, project);
                setMessage({ text: response.data.message || 'Project updated successfully', type: 'success' });
            } else {
                // 🔒 Secured POST request containing dynamic CSRF verification headers
                const response = await api.post('/api/addProject/post', project);
                setMessage({ text: response.data.message, type: 'success' });
            }

            fetchProjects();
            handleReset();
        } catch (err) {
            setMessage({ text: err.response?.data?.error || 'Error saving project context records', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (proj) => {
        setIsEditing(true);
        setMessage(null);
        setProject({
            projectId: proj.ProjectId || '',
            projectName: proj.ProjectName || '',
            projectManager: proj.ProjectManager || '',
            managerId: proj.ManagerId || '',
            proxyManagerName: proj.ProxyManagerName || '',
            proxyManagerId: proj.ProxyManagerId || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleReset = () => {
        setIsEditing(false);
        setMessage(null);
        setProject({
            projectId: '',
            projectName: '',
            projectManager: '',
            managerId: '',
            proxyManagerName: '',
            proxyManagerId: ''
        });
    };

    // Filtered Project List based on Search Query
    const filteredProjectList = useMemo(() => {
        if (!searchQuery.trim()) return projectList;
        return projectList.filter(proj =>
            String(proj.ProjectId || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [projectList, searchQuery]);

    // ✅ UNAUTHORIZED VIEW
    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-xl text-center max-w-md border border-slate-200 dark:border-slate-800">
                    <span className="text-5xl mb-4 block">⛔</span>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Restricted</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">
                        You do not have the required administrator privileges to view or manage the master project list.
                    </p>
                    <button
                        onClick={() => navigate("/")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all w-full shadow-lg shadow-blue-500/30"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ✅ AUTHORIZED ADMIN VIEW
    return (
        <div className="min-h-screen flex justify-center p-6 ai-bg-animated relative overflow-x-hidden">
            <div className="ai-orb ai-orb-1"></div>
            <div className="ai-orb ai-orb-2"></div>

            <div className="w-full max-w-5xl z-10 animation-fadeIn flex flex-col gap-6 mt-10">

                {/* TOP SECTION: FORM */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6 md:p-8">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
                                {isEditing ? 'Edit Project Data' : 'Onboard New Project'}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {isEditing ? 'Modify the details of the selected project below.' : 'Add a new project to the GenAI Buddy.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="hidden md:block rounded-lg bg-slate-600 dark:bg-slate-700 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-slate-700 dark:hover:bg-slate-600 shadow-md"
                            onClick={() => navigate("/")}
                        >
                            DASHBOARD
                        </button>
                    </div>

                    {message && (
                        <div className={`p-4 mb-6 rounded-xl text-sm font-bold flex items-center gap-3 animate-in fade-in
                            ${message.type === 'success'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            <span className="text-lg">{message.type === 'success' ? '✅' : '⚠️'}</span>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Project ID *</label>
                                <input
                                    required
                                    disabled={isEditing}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900 shadow-sm"
                                    value={project.projectId}
                                    onChange={(e) => setProject({ ...project, projectId: e.target.value })}
                                    placeholder="e.g. PRJ-01"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Project Name *</label>
                                <input
                                    required
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
                                    value={project.projectName}
                                    onChange={(e) => setProject({ ...project, projectName: e.target.value })}
                                    placeholder="Enter Project Name"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Manager Name *</label>
                                <input
                                    required
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
                                    value={project.projectManager}
                                    onChange={(e) => setProject({ ...project, projectManager: e.target.value })}
                                    placeholder="Full Name"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Manager ID *</label>
                                <input
                                    required
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
                                    value={project.managerId}
                                    onChange={(e) => setProject({ ...project, managerId: e.target.value })}
                                    placeholder="Employee ID"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Proxy Name <span className="lowercase font-normal opacity-70">(opt)</span></label>
                                <input
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
                                    value={project.proxyManagerName}
                                    onChange={(e) => setProject({ ...project, proxyManagerName: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Proxy ID <span className="lowercase font-normal opacity-70">(opt)</span></label>
                                <input
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
                                    value={project.proxyManagerId}
                                    onChange={(e) => setProject({ ...project, proxyManagerId: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-end gap-3">
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="rounded-xl bg-slate-200 dark:bg-slate-800 px-6 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-300 dark:hover:bg-slate-700"
                                >
                                    CANCEL EDIT
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="relative overflow-hidden rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px]"
                            >
                                {loading ? (
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    isEditing ? 'UPDATE RECORD' : 'SAVE NEW PROJECT'
                                )}
                            </button>
                            <button
                                type="button"
                                className="md:hidden rounded-xl bg-slate-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-700"
                                onClick={() => navigate("/")}
                            >
                                DASHBOARD
                            </button>
                        </div>
                    </form>
                </div>

                {/* BOTTOM SECTION: PROJECT LIST TABLE */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6 flex flex-col h-[500px]">
                    <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">All Projects</h3>

                        {/* Search Bar & Refresh Button */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">🔍</span>
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                    placeholder="Search Project ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={fetchProjects}
                                className="text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                            >
                                ↻ REFRESH
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 custom-scrollbar">
                        {fetchingList ? (
                            <div className="h-full flex items-center justify-center">
                                <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                            </div>
                        ) : filteredProjectList.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                                <span className="text-4xl mb-2">📭</span>
                                {searchQuery ? 'No projects match your search.' : 'No projects currently exist in the database.'}
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                                    <tr>
                                        <th className="px-5 py-4 font-bold">Project ID</th>
                                        <th className="px-5 py-4 font-bold">Project Name</th>
                                        <th className="px-5 py-4 font-bold">Manager ID</th>
                                        <th className="px-5 py-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                                    {filteredProjectList.map((proj, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                                            <td className="px-5 py-3.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                                {proj.ProjectId}
                                            </td>
                                            <td className="px-5 py-3.5 font-medium max-w-[300px] truncate" title={proj.ProjectName}>
                                                {proj.ProjectName}
                                            </td>
                                            <td className="px-5 py-3.5 opacity-80">
                                                {proj.ManagerId}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    onClick={() => handleEditClick(proj)}
                                                    className="inline-flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-4 py-1.5 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors border border-amber-200 dark:border-amber-800/50"
                                                >
                                                    EDIT
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AddProject;
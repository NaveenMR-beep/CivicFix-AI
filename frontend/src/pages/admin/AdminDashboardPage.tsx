import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Building, Sliders, FileText, Download,
  BarChart3, RefreshCw, CheckCircle, AlertCircle, Plus,
  Calendar, Check, X, Edit2, Power, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'analytics' | 'departments' | 'users' | 'priority' | 'audit'>('analytics');

  // Date range filters for Analytics & Export
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Analytics states
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [priorityDist, setPriorityDist] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Priority formula config state
  const [priorityConfig, setPriorityConfig] = useState<{
    severity_weight: number;
    safety_risk_weight: number;
    community_impact_weight: number;
  }>({
    severity_weight: 0.40,
    safety_risk_weight: 0.35,
    community_impact_weight: 0.25
  });
  const [configSavedMsg, setConfigSavedMsg] = useState<string | null>(null);

  // Departments & Users states
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // New staff user form
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('Staff123!');
  const [newStaffRole, setNewStaffRole] = useState<'staff' | 'admin'>('staff');
  const [newStaffDept, setNewStaffDept] = useState<number | undefined>();
  const [userCreatedMsg, setUserCreatedMsg] = useState<string | null>(null);

  // New Department form
  const [showNewDeptModal, setShowNewDeptModal] = useState<boolean>(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptEmail, setNewDeptEmail] = useState('');
  const [deptCreatedMsg, setDeptCreatedMsg] = useState<string | null>(null);

  // Edit Department modal
  const [editingDept, setEditingDept] = useState<any | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [sumData, catData, statData, prioData, trendData, hotData, cfgData, deptData, userData, auditData] = await Promise.all([
        api.getAnalyticsSummary(dateFrom || undefined, dateTo || undefined).catch(() => null),
        api.getCategoryDistribution(dateFrom || undefined, dateTo || undefined).catch(() => []),
        api.getStatusDistribution(dateFrom || undefined, dateTo || undefined).catch(() => []),
        api.getPriorityDistribution(dateFrom || undefined, dateTo || undefined).catch(() => []),
        api.getTrends(7).catch(() => []),
        api.getHotspots(dateFrom || undefined, dateTo || undefined).catch(() => []),
        api.getPriorityConfig().catch(() => null),
        api.listDepartments(true).catch(() => []),
        api.listUsers(userRoleFilter || undefined).catch(() => []),
        api.getAuditLogs(100).catch(() => [])
      ]);

      setSummary(sumData);
      setCategories(catData || []);
      setStatusDist(statData || []);
      setPriorityDist(prioData || []);
      setTrends(trendData || []);
      setHotspots(hotData || []);
      if (cfgData) {
        setPriorityConfig({
          severity_weight: cfgData.severity_weight,
          safety_risk_weight: cfgData.safety_risk_weight,
          community_impact_weight: cfgData.community_impact_weight
        });
      }
      setDepartments(deptData || []);
      setUsers(userData || []);
      setAuditLogs(auditData || []);
    } catch (e) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [dateFrom, dateTo, userRoleFilter]);

  const handleSavePriorityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSavedMsg(null);
    try {
      await api.updatePriorityConfig(priorityConfig);
      setConfigSavedMsg('Formula weights updated successfully! Recalculated priorities across open tickets.');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update priority configuration');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreatedMsg(null);
    try {
      await api.createUser({
        email: newStaffEmail.trim(),
        full_name: newStaffName.trim(),
        password: newStaffPassword,
        role: newStaffRole,
        department_id: newStaffDept
      });
      setUserCreatedMsg(`Account for ${newStaffEmail} created successfully!`);
      setNewStaffEmail('');
      setNewStaffName('');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Error creating user');
    }
  };

  const handleToggleUserStatus = async (targetUser: any) => {
    if (targetUser.id === user?.id && targetUser.is_active) {
      alert('Administrators cannot deactivate their own account.');
      return;
    }
    const confirmMsg = targetUser.is_active
      ? `Are you sure you want to deactivate ${targetUser.email}?`
      : `Re-activate ${targetUser.email}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateUserStatus(targetUser.id, !targetUser.is_active);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleAssignUserDept = async (userId: number, deptId: number | null) => {
    try {
      await api.assignStaffDepartment(userId, deptId);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update department assignment');
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptCreatedMsg(null);
    try {
      await api.createDepartment({
        name: newDeptName.trim(),
        code: newDeptCode.trim().toUpperCase(),
        description: newDeptDesc.trim(),
        contact_email: newDeptEmail.trim() || undefined
      });
      setDeptCreatedMsg(`Department ${newDeptName} created successfully!`);
      setNewDeptName('');
      setNewDeptCode('');
      setNewDeptDesc('');
      setNewDeptEmail('');
      setShowNewDeptModal(false);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to create department');
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    try {
      await api.updateDepartment(editingDept.id, {
        name: editingDept.name,
        description: editingDept.description,
        contact_email: editingDept.contact_email,
        is_active: editingDept.is_active
      });
      setEditingDept(null);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update department');
    }
  };

  const handleDeactivateDepartment = async (dept: any) => {
    if (!window.confirm(`Are you sure you want to deactivate department '${dept.name}'?`)) return;
    try {
      await api.deactivateDepartment(dept.id);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate department');
    }
  };

  const handleExportCsv = async () => {
    try {
      await api.downloadExportCsv(dateFrom || undefined, dateTo || undefined);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    }
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  return (
    <div className="flex-1 bg-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER BANNER ================= */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Municipal Administrator Console
              </span>
              <span className="text-xs text-slate-500 font-mono">Logged in as {user?.email}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Municipal Governance & Citywide Redressal Intelligence
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchAdminData}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ================= NAVIGATION TABS ================= */}
        <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics & Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'departments'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Departments ({departments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User & Staff Management ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('priority')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'priority'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Priority Formula Weights</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>
        </div>

        {/* ================= TAB 1: ANALYTICS & REPORTS ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Date Range Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-600" />
                Filter Analytics & Reports by Date Range:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">From:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">To:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">Total Complaints</span>
                <div className="text-3xl font-black text-slate-900 mt-1">{summary?.total_complaints || 0}</div>
                <span className="text-[10px] text-slate-400">All registered</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-amber-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 block">Pending</span>
                <div className="text-3xl font-black text-amber-700 mt-1">{summary?.pending_complaints || 0}</div>
                <span className="text-[10px] text-amber-600/80">Awaiting assignment</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-blue-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 block">In Progress</span>
                <div className="text-3xl font-black text-blue-700 mt-1">{summary?.in_progress_complaints || 0}</div>
                <span className="text-[10px] text-blue-600/80">Active field repairs</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-emerald-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 block">Resolved</span>
                <div className="text-3xl font-black text-emerald-700 mt-1">{summary?.resolved_complaints || 0}</div>
                <span className="text-[10px] text-emerald-600/80">Completed work</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-rose-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 block">Critical</span>
                <div className="text-3xl font-black text-rose-700 mt-1">{summary?.critical_priority_count || 0}</div>
                <span className="text-[10px] text-rose-600/80">Urgent safety hazard</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-indigo-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 block">Avg Resolution</span>
                <div className="text-3xl font-black text-indigo-700 mt-1">{summary?.average_resolution_hours || 0}h</div>
                <span className="text-[10px] text-indigo-600/80">Turnaround hours</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-teal-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-600 block">Resolution Rate</span>
                <div className="text-3xl font-black text-teal-700 mt-1">{summary?.resolution_rate_percent || 0}%</div>
                <span className="text-[10px] text-teal-600/80">Closed vs total</span>
              </div>
            </div>

            {/* Charts Row 1: Category Distribution & Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown Bar Chart */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-black text-slate-900 mb-1">Complaints by Problem Category</h3>
                <p className="text-xs text-slate-500 mb-4">Volume breakdown across civic categories</p>
                <div className="h-64">
                  {categories.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">No records available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categories}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Total" />
                        <Bar dataKey="resolved" fill="#10b981" radius={[6, 6, 0, 0]} name="Resolved" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-black text-slate-900 mb-1">Complaints by Lifecycle Status</h3>
                <p className="text-xs text-slate-500 mb-4">Current distribution across resolution pipeline</p>
                <div className="h-64">
                  {statusDist.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">No records available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusDist}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Row 2: 7-Day Trends & Recurring Hotspots */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trends Line Chart */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-black text-slate-900 mb-1">7-Day Complaint Velocity & Resolutions</h3>
                <p className="text-xs text-slate-500 mb-4">New citizen reports vs completed field work</p>
                <div className="h-64">
                  {trends.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">No records available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="reported" stroke="#ef4444" strokeWidth={2} name="Reported" />
                        <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Recurring Hotspots Table */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-black text-slate-900 mb-1">Recurring Problem Hotspots</h3>
                <p className="text-xs text-slate-500 mb-4">Clusters of repeated citizen complaints</p>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-bold uppercase text-[10px] text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Location / Area</th>
                        <th className="py-2.5 px-3">Total Issues</th>
                        <th className="py-2.5 px-3">Critical Risk</th>
                        <th className="py-2.5 px-3">Dominant Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hotspots.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No clustered hotspots detected.
                          </td>
                        </tr>
                      ) : (
                        hotspots.map((h, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 truncate max-w-[180px]">{h.address}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{h.complaint_count}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                {h.critical_count} Critical
                              </span>
                            </td>
                            <td className="py-2.5 px-3 capitalize font-semibold">{h.dominant_category}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: DEPARTMENTS MANAGEMENT ================= */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Municipal Departments</h3>
                <p className="text-xs text-slate-500">Manage municipal departments, contact emails, and operational status.</p>
              </div>
              <button
                onClick={() => setShowNewDeptModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Department</span>
              </button>
            </div>

            {deptCreatedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                ✓ {deptCreatedMsg}
              </div>
            )}

            {/* Department Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((d) => (
                <div key={d.id} className={`p-5 rounded-3xl border transition-all ${d.is_active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-100 border-slate-300 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-black text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-md">
                      {d.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${d.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {d.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900">{d.name}</h4>
                  <p className="text-xs text-slate-600 mt-1 min-h-[36px] line-clamp-2">{d.description || 'No description provided.'}</p>
                  <span className="text-xs font-mono text-slate-500 block mt-2">{d.contact_email || 'No email configured'}</span>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setEditingDept({ ...d })}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {d.is_active && (
                      <button
                        onClick={() => handleDeactivateDepartment(d)}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Create Department Modal */}
            {showNewDeptModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-lg font-black text-slate-900">Create New Department</h3>
                    <button onClick={() => setShowNewDeptModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateDepartment} className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Department Name *</label>
                      <input
                        type="text"
                        required
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        placeholder="e.g., Stormwater Drainage & Flood Control"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Department Code *</label>
                      <input
                        type="text"
                        required
                        value={newDeptCode}
                        onChange={(e) => setNewDeptCode(e.target.value)}
                        placeholder="e.g., DRAINAGE"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={newDeptEmail}
                        onChange={(e) => setNewDeptEmail(e.target.value)}
                        placeholder="drainage@civicfix.gov"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={newDeptDesc}
                        onChange={(e) => setNewDeptDesc(e.target.value)}
                        placeholder="Responsibilities and jurisdiction..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowNewDeptModal(false)}
                        className="px-4 py-2 text-slate-600 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm"
                      >
                        Create Department
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Department Modal */}
            {editingDept && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-lg font-black text-slate-900">Edit Department: {editingDept.code}</h3>
                    <button onClick={() => setEditingDept(null)} className="p-1 text-slate-400 hover:text-slate-700">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateDepartment} className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Department Name</label>
                      <input
                        type="text"
                        value={editingDept.name}
                        onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={editingDept.contact_email || ''}
                        onChange={(e) => setEditingDept({ ...editingDept, contact_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={editingDept.description || ''}
                        onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={editingDept.is_active}
                        onChange={(e) => setEditingDept({ ...editingDept, is_active: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-bold text-slate-700">Department is Active</span>
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingDept(null)}
                        className="px-4 py-2 text-slate-600 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: USER & STAFF MANAGEMENT ================= */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Create Staff Form */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Register Municipal Account
              </h3>

              {userCreatedMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl">
                  ✓ {userCreatedMsg}
                </div>
              )}

              <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g., Ramesh Kumar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="officer@civicfix.gov"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Account Role *</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as 'staff' | 'admin')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="staff">Municipal Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Department</label>
                  <select
                    value={newStaffDept || ''}
                    onChange={(e) => setNewStaffDept(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="">Select department...</option>
                    {departments.filter(d => d.is_active).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                >
                  Create Account
                </button>
              </form>
            </div>

            {/* Users Table */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <h3 className="text-base font-black text-slate-900">
                  Registered Accounts ({users.length})
                </h3>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="">All Roles</option>
                  <option value="staff">Staff Only</option>
                  <option value="admin">Admins Only</option>
                  <option value="citizen">Citizens Only</option>
                </select>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 font-black uppercase text-[10px] text-slate-500">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const userDept = departments.find(d => d.id === u.department_id);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <strong className="text-slate-900 block">{u.full_name}</strong>
                            <span className="text-slate-500 font-mono text-[11px]">{u.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'staff'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.role === 'staff' ? (
                              <select
                                value={u.department_id || ''}
                                onChange={(e) => handleAssignUserDept(u.id, e.target.value ? Number(e.target.value) : null)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                              >
                                <option value="">Unassigned</option>
                                {departments.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {u.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                u.is_active
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: PRIORITY WEIGHTS ================= */}
        {activeTab === 'priority' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Calibrate Priority & Severity Weights
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure the multi-factor mathematical weights. Recalculates prioritization across all open municipal complaints.
              </p>
            </div>

            {configSavedMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                ✓ {configSavedMsg}
              </div>
            )}

            <form onSubmit={handleSavePriorityConfig} className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Physical Severity Weight (W₁)</span>
                  <span className="font-mono text-purple-700 font-black">
                    {(priorityConfig.severity_weight * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={priorityConfig.severity_weight}
                  onChange={(e) =>
                    setPriorityConfig((prev) => ({ ...prev, severity_weight: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-purple-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Public Safety Risk Weight (W₂)</span>
                  <span className="font-mono text-purple-700 font-black">
                    {(priorityConfig.safety_risk_weight * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={priorityConfig.safety_risk_weight}
                  onChange={(e) =>
                    setPriorityConfig((prev) => ({ ...prev, safety_risk_weight: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-purple-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Community Impact Weight (W₃)</span>
                  <span className="font-mono text-purple-700 font-black">
                    {(priorityConfig.community_impact_weight * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={priorityConfig.community_impact_weight}
                  onChange={(e) =>
                    setPriorityConfig((prev) => ({ ...prev, community_impact_weight: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-purple-600"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex justify-between items-center">
                <span className="font-bold text-slate-700">Weights Sum Total:</span>
                <span
                  className={`font-mono font-black text-sm ${
                    Math.abs(priorityConfig.severity_weight + priorityConfig.safety_risk_weight + priorityConfig.community_impact_weight - 1.0) < 0.01
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {(
                    (priorityConfig.severity_weight + priorityConfig.safety_risk_weight + priorityConfig.community_impact_weight) *
                    100
                  ).toFixed(0)}% {Math.abs(priorityConfig.severity_weight + priorityConfig.safety_risk_weight + priorityConfig.community_impact_weight - 1.0) >= 0.01 && '(Must sum to 100%)'}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-md transition-all text-xs"
              >
                Save & Recalculate City Priority
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 5: AUDIT LOGS ================= */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Immutable Governance Audit Logs
              </h3>
              <p className="text-xs text-slate-500">
                Comprehensive activity trail recording every administrative modification, status change, and ticket assignment.
              </p>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase font-black text-[10px] text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No audit actions logged yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600">{log.action}</td>
                        <td className="py-3 px-4 text-slate-800">{log.entity_type} #{log.entity_id}</td>
                        <td className="py-3 px-4 text-slate-600">User #{log.user_id}</td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

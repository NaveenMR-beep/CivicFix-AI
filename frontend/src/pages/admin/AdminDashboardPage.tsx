import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Building, Sliders, FileText, Download,
  BarChart3, RefreshCw, CheckCircle, AlertCircle, Plus
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

  const [activeTab, setActiveTab] = useState<'analytics' | 'priority' | 'users' | 'departments' | 'audit'>('analytics');

  // Analytics states
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // New staff user form modal
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('Staff123!');
  const [newStaffDept, setNewStaffDept] = useState<number | undefined>();
  const [userCreatedMsg, setUserCreatedMsg] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [sumData, catData, trendData, hotData, cfgData, deptData, auditData] = await Promise.all([
        api.getAnalyticsSummary().catch(() => null),
        api.getCategoryDistribution().catch(() => []),
        api.getTrends().catch(() => []),
        api.getHotspots().catch(() => []),
        api.getPriorityConfig().catch(() => null),
        api.listDepartments().catch(() => []),
        api.getAuditLogs().catch(() => [])
      ]);

      setSummary(sumData);
      setCategories(catData || []);
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
      setAuditLogs(auditData || []);
    } catch (e) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSavePriorityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSavedMsg(null);
    try {
      await api.updatePriorityConfig(priorityConfig);
      setConfigSavedMsg('Formula weights updated successfully! Recalculated priorities across open tickets.');
    } catch (err: any) {
      alert(err.message || 'Failed to update priority configuration');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreatedMsg(null);
    try {
      const res = await fetch('http://localhost:8000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('civicfix_token')}`
        },
        body: JSON.stringify({
          email: newStaffEmail,
          full_name: newStaffName,
          password: newStaffPassword,
          role: 'staff',
          department_id: newStaffDept
        })
      });
      if (!res.ok) throw new Error('User creation failed');
      setUserCreatedMsg(`Staff member ${newStaffEmail} created!`);
      setNewStaffEmail('');
      setNewStaffName('');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Error creating user');
    }
  };

  const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div className="flex-1 bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-300 gap-4 mb-6">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase">
              Administrator Console
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Municipal Governance & City Analytics
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={api.exportCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{t.exportCsv}</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-3">
          {[
            { id: 'analytics', label: '📊 City Analytics & Charts', icon: BarChart3 },
            { id: 'priority', label: '⚖️ AI Priority Weights', icon: Sliders },
            { id: 'departments', label: '🏛️ Departments', icon: Building },
            { id: 'users', label: '👥 Staff Management', icon: Users },
            { id: 'audit', label: '📜 Audit Trail', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ================= TAB 1: ANALYTICS & CHARTS ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top KPI Cards */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase">Resolution Rate</span>
                  <div className="text-3xl font-black text-emerald-600 mt-1">
                    {summary.resolution_rate_percent}%
                  </div>
                  <span className="text-xs text-slate-400">Total closed vs reported</span>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase">Avg Resolution Time</span>
                  <div className="text-3xl font-black text-indigo-600 mt-1">
                    {summary.average_resolution_hours} hrs
                  </div>
                  <span className="text-xs text-slate-400">Time from report to repair</span>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase">Critical Backlog</span>
                  <div className="text-3xl font-black text-rose-600 mt-1">
                    {summary.critical_priority_count}
                  </div>
                  <span className="text-xs text-slate-400">Immediate attention needed</span>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase">Open Active Tickets</span>
                  <div className="text-3xl font-black text-amber-600 mt-1">
                    {summary.pending_complaints + summary.in_progress_complaints}
                  </div>
                  <span className="text-xs text-slate-400">Under investigation or repair</span>
                </div>
              </div>
            )}

            {/* Recharts Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Complaint Trends */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 mb-4">
                  Daily Complaint Trends (Past 7 Days)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="reported" stroke="#ef4444" strokeWidth={3} name="Reported" />
                      <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} name="Resolved" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 mb-4">
                  Complaints by Category (Resolved vs Pending)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="category" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="resolved" fill="#10b981" name="Resolved" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recurring Hotspots Table */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900 mb-4">
                Repeated Problem Locations & Geographic Clusters
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Location / Area</th>
                      <th className="py-3 px-4">Dominant Category</th>
                      <th className="py-3 px-4">Total Reports</th>
                      <th className="py-3 px-4">Critical Hazards</th>
                      <th className="py-3 px-4">Coordinates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hotspots.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{h.address}</td>
                        <td className="py-3 px-4 capitalize font-semibold">{h.dominant_category}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-800">
                            {h.complaint_count}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                            {h.critical_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-400">
                          {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: AI PRIORITY WEIGHTS ================= */}
        {activeTab === 'priority' && (
          <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              Configure Explainable Priority Scoring Weights
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Formula: <code>Priority = (W₁ × Severity) + (W₂ × Safety Risk) + (W₃ × Community Impact)</code>.
              Weights must sum to 1.00 (100%).
            </p>

            {configSavedMsg && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-xs mb-6 font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>{configSavedMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePriorityConfig} className="space-y-6">
              {/* Severity Weight */}
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-800 mb-1">
                  <span>Severity Weight (W₁)</span>
                  <span className="font-mono text-emerald-700">
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
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* Safety Risk Weight */}
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-800 mb-1">
                  <span>Safety Risk Weight (W₂)</span>
                  <span className="font-mono text-emerald-700">
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
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* Community Impact Weight */}
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-800 mb-1">
                  <span>Community Impact Weight (W₃)</span>
                  <span className="font-mono text-emerald-700">
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
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* Sum verification */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex justify-between items-center">
                <span className="font-bold text-slate-700">Current Total:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    Math.abs(priorityConfig.severity_weight + priorityConfig.safety_risk_weight + priorityConfig.community_impact_weight - 1.0) < 0.01
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {(
                    (priorityConfig.severity_weight + priorityConfig.safety_risk_weight + priorityConfig.community_impact_weight) *
                    100
                  ).toFixed(0)}%
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl shadow-md transition-all"
              >
                Save & Recalculate City Priority
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 3: DEPARTMENTS ================= */}
        {activeTab === 'departments' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-extrabold text-slate-900 mb-6">
              Municipal Departments & Automated Ticket Routing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((d) => (
                <div key={d.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      {d.code}
                    </span>
                    <span className="text-xs text-slate-400">{d.contact_email}</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{d.name}</h4>
                  <p className="text-xs text-slate-600 mt-1">{d.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: USERS & STAFF ================= */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Staff Creation Form */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Register New Municipal Officer
              </h3>

              {userCreatedMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl mb-4">
                  ✓ {userCreatedMsg}
                </div>
              )}

              <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g., Rajesh Gowda"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Official Email</label>
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
                  <label className="font-bold text-slate-700 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Department</label>
                  <select
                    value={newStaffDept || ''}
                    onChange={(e) => setNewStaffDept(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="">Select department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                >
                  Create Staff Account
                </button>
              </form>
            </div>

            {/* Existing Accounts List */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Active System Accounts
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 block">Municipal Commissioner Office</strong>
                    <span className="text-slate-500 font-mono">admin@civicfix.gov</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold uppercase text-[10px]">
                    Admin
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 block">Suresh Rao (Asst. Executive Engineer)</strong>
                    <span className="text-slate-500 font-mono">staff.roads@civicfix.gov • Roads</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold uppercase text-[10px]">
                    Staff
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 block">Priya Patil (Chief Health Inspector)</strong>
                    <span className="text-slate-500 font-mono">staff.swm@civicfix.gov • Solid Waste</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold uppercase text-[10px]">
                    Staff
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 block">Ramesh Kumar (Citizen)</strong>
                    <span className="text-slate-500 font-mono">citizen@civicfix.gov</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                    Citizen
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: AUDIT LOGS ================= */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-extrabold text-slate-900 mb-4">
              Immutable Audit Logs & Accountability Trail
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase font-bold text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No audit actions logged yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600">{log.action}</td>
                        <td className="py-3 px-4 text-slate-800">{log.entity_type} #{log.entity_id}</td>
                        <td className="py-3 px-4 text-slate-700">{log.details}</td>
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

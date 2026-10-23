import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, CheckCircle2, Clock, AlertTriangle, Filter, Search,
  Wrench, Upload, Eye, RefreshCw, X, ChevronRight, UserCheck, Sparkles, MapPin,
  Calendar, Building, User as UserIcon, LogOut, ChevronLeft, ArrowUpDown, FileText,
  AlertCircle, CheckSquare, Layers, Map as MapIcon, SlidersHorizontal, Edit3
} from 'lucide-react';
import L from 'leaflet';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { MapView } from '../../components/MapView';

interface StaffDashboardPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const StaffDashboardPage: React.FC<StaffDashboardPageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { user, logout } = useAuth();

  // Navigation tab: 'dashboard' | 'complaints' | 'map' | 'assigned' | 'profile'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'complaints' | 'map' | 'assigned' | 'profile'>('dashboard');

  // Real Database Statistics
  const [stats, setStats] = useState<{
    total_assigned: number;
    new_awaiting_review: number;
    high_priority: number;
    in_progress: number;
    resolved: number;
    overdue: number;
  }>({
    total_assigned: 0,
    new_awaiting_review: 0,
    high_priority: 0,
    in_progress: 0,
    resolved: 0,
    overdue: 0
  });

  const [complaints, setComplaints] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Table Filters & Sorting
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Selected complaint for full details view
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // Status & Note update form inside modal
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [internalNote, setInternalNote] = useState<string>('');
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);

  // Assignment form inside modal
  const [assignDeptId, setAssignDeptId] = useState<number | undefined>();
  const [assignStaffId, setAssignStaffId] = useState<number | undefined>();
  const [assignNotes, setAssignNotes] = useState<string>('');
  const [assignDueDate, setAssignDueDate] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Priority override inside modal
  const [showPriorityModal, setShowPriorityModal] = useState<boolean>(false);
  const [overrideSeverity, setOverrideSeverity] = useState<number>(75);
  const [overrideSafety, setOverrideSafety] = useState<number>(75);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isOverridingPriority, setIsOverridingPriority] = useState<boolean>(false);

  // Repair evidence file
  const [repairFile, setRepairFile] = useState<File | null>(null);
  const [repairPreview, setRepairPreview] = useState<string | null>(null);
  const [repairNotes, setRepairNotes] = useState<string>('');
  const [isUploadingRepair, setIsUploadingRepair] = useState<boolean>(false);
  const [repairSuccessMsg, setRepairSuccessMsg] = useState<string | null>(null);

  // Profile update form
  const [profileName, setProfileName] = useState<string>(user?.full_name || '');
  const [profilePhone, setProfilePhone] = useState<string>(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Mini-map ref for Complaint Details Modal
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<L.Map | null>(null);

  const fetchStats = async () => {
    try {
      const summary = await api.getStaffDashboardSummary();
      setStats(summary);
    } catch (e) {
      // Fallback
    }
  };

  const fetchDepartmentsAndStaff = async () => {
    try {
      const depts = await api.listDepartments(false);
      setDepartments(depts || []);
      const staff = await api.listStaff();
      setStaffList(staff || []);
    } catch (e) {
      //
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getStaffComplaints({
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        department_id: departmentFilter ? Number(departmentFilter) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: searchQuery || undefined,
        assigned_to_me: activeTab === 'assigned',
        sort_by: sortBy,
        sort_order: sortOrder,
        skip: 0,
        limit: 200
      });
      setComplaints(data);
    } catch (e: any) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDepartmentsAndStaff();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [
    activeTab, categoryFilter, statusFilter, priorityFilter,
    departmentFilter, dateFrom, dateTo, sortBy, sortOrder
  ]);

  // Mini-map setup when ticket is opened in modal
  useEffect(() => {
    if (!selectedTicket || !miniMapContainerRef.current) return;

    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.remove();
      miniMapInstanceRef.current = null;
    }

    if (selectedTicket.latitude && selectedTicket.longitude) {
      const map = L.map(miniMapContainerRef.current).setView(
        [selectedTicket.latitude, selectedTicket.longitude],
        15
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const marker = L.marker([selectedTicket.latitude, selectedTicket.longitude]).addTo(map);
      marker.bindPopup(`<b>${selectedTicket.tracking_number}</b><br/>${selectedTicket.address}`).openPopup();

      miniMapInstanceRef.current = map;
    }

    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, [selectedTicket]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTickets();
  };

  const handleUpdateStatus = async (targetStatus: string) => {
    if (!selectedTicket) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updateComplaintStatus(selectedTicket.id, targetStatus, statusNotes);
      setSelectedTicket(updated);
      setStatusNotes('');
      fetchTickets();
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !internalNote.trim()) return;
    setIsAddingNote(true);
    try {
      const updated = await api.addComplaintNote(selectedTicket.id, internalNote.trim());
      setSelectedTicket(updated);
      setInternalNote('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to add internal note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleAssignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setIsAssigning(true);
    try {
      const updated = await api.assignComplaint(
        selectedTicket.id,
        assignDeptId,
        assignStaffId,
        assignNotes,
        assignDueDate
      );
      setSelectedTicket(updated);
      setAssignNotes('');
      fetchTickets();
      fetchStats();
      alert('Complaint assigned successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to assign complaint');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOverridePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !overrideReason.trim()) {
      alert('Please provide a recorded reason for overriding priority.');
      return;
    }
    setIsOverridingPriority(true);
    try {
      const updated = await api.overridePriority(
        selectedTicket.id,
        overrideSeverity,
        overrideSafety,
        overrideReason.trim()
      );
      setSelectedTicket(updated);
      setShowPriorityModal(false);
      setOverrideReason('');
      fetchTickets();
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to override priority');
    } finally {
      setIsOverridingPriority(false);
    }
  };

  const handleUploadRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !repairFile) return;
    setIsUploadingRepair(true);
    setRepairSuccessMsg(null);
    try {
      const updated = await api.uploadRepairEvidence(selectedTicket.id, repairFile, repairNotes);
      setSelectedTicket(updated);
      setRepairSuccessMsg('Repair evidence uploaded and verified! Ticket marked as resolved.');
      setRepairFile(null);
      setRepairPreview(null);
      setRepairNotes('');
      fetchTickets();
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Evidence upload failed');
    } finally {
      setIsUploadingRepair(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await api.updateProfile({ full_name: profileName, phone: profilePhone });
      setProfileMsg('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(complaints.length / pageSize));
  const paginatedComplaints = complaints.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Department name lookup
  const getDeptName = (deptId?: number) => {
    if (!deptId) return 'Unassigned';
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : `Dept #${deptId}`;
  };

  return (
    <div className="flex-1 bg-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= TOP BRANDING & ACTION HEADER ================= */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-black tracking-wide uppercase flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Municipal Staff Operations
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {user?.full_name} • {getDeptName(user?.department_id)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Municipal Operations & Grievance Dispatch
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { fetchStats(); fetchTickets(); }}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Refresh</span>
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => onNavigate('admin-dashboard')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Admin Console</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= SECTION 2: NAVIGATION MENU TABS ================= */}
        <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'complaints'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Manage Complaints</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'map'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Map View</span>
          </button>

          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'assigned'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>My Assigned Work</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <div className="ml-auto">
            <button
              onClick={() => {
                logout();
                onNavigate('citizen-home');
              }}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: DASHBOARD METRICS ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">Total Assigned</span>
                <div className="text-3xl font-black text-slate-900 mt-1">{stats.total_assigned}</div>
                <span className="text-[10px] text-slate-400">Department workload</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-amber-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 block">Awaiting Review</span>
                <div className="text-3xl font-black text-amber-700 mt-1">{stats.new_awaiting_review}</div>
                <span className="text-[10px] text-amber-600/80">Submitted complaints</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-rose-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 block">High Priority</span>
                <div className="text-3xl font-black text-rose-700 mt-1">{stats.high_priority}</div>
                <span className="text-[10px] text-rose-600/80">Critical & High risk</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-blue-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 block">In Progress</span>
                <div className="text-3xl font-black text-blue-700 mt-1">{stats.in_progress}</div>
                <span className="text-[10px] text-blue-600/80">Active crew dispatch</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-emerald-200 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 block">Resolved</span>
                <div className="text-3xl font-black text-emerald-700 mt-1">{stats.resolved}</div>
                <span className="text-[10px] text-emerald-600/80">Repaired & verified</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-red-300 shadow-sm bg-red-50/40">
                <span className="text-[11px] font-black uppercase tracking-wider text-red-600 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  Overdue
                </span>
                <div className="text-3xl font-black text-red-700 mt-1">{stats.overdue}</div>
                <span className="text-[10px] text-red-600/80">Breached SLA deadline</span>
              </div>
            </div>

            {/* Quick High-Priority Alert Banner if Overdue */}
            {stats.overdue > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-bold">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-red-900">
                      {stats.overdue} Complaint{stats.overdue > 1 ? 's are' : ' is'} Overdue
                    </h3>
                    <p className="text-xs text-red-700">
                      SLA resolution deadlines have passed. Please review and dispatch field crews immediately.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStatusFilter('in_progress');
                    setActiveTab('complaints');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm whitespace-nowrap"
                >
                  View Overdue Items
                </button>
              </div>
            )}

            {/* Recent Pending Review Queue */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  High Priority Complaints Awaiting Review
                </h2>
                <button
                  onClick={() => setActiveTab('complaints')}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  View All Complaints →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {complaints
                  .filter(c => c.status !== 'resolved' && (c.priority_level === 'Critical' || c.priority_level === 'High'))
                  .slice(0, 5)
                  .map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedTicket(c);
                        setAssignDeptId(c.assigned_department_id || undefined);
                        setAssignStaffId(c.assigned_staff_id || undefined);
                      }}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-sm">
                            ⚠️
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-slate-900">{c.tracking_number}</span>
                            <PriorityBadge level={c.priority_level} score={c.priority_score} />
                            <StatusBadge status={c.status} size="sm" />
                          </div>
                          <p className="text-xs text-slate-700 font-semibold line-clamp-1 mt-0.5">{c.title}</p>
                          <span className="text-[11px] text-slate-400">{c.address}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold shrink-0"
                      >
                        Action
                      </button>
                    </div>
                  ))}

                {complaints.filter(c => c.status !== 'resolved' && (c.priority_level === 'Critical' || c.priority_level === 'High')).length === 0 && (
                  <p className="py-8 text-center text-slate-400 text-sm">
                    No urgent pending complaints right now. All high-priority issues are under control!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MANAGE COMPLAINTS TABLE ================= */}
        {(activeTab === 'complaints' || activeTab === 'assigned') && (
          <div className="space-y-6">
            {/* Search & Comprehensive Filters */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search complaint ID, category, location, or citizen description..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-sm"
                >
                  Search
                </button>
              </form>

              {/* Filter Controls Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="pothole">Broken Road / Pothole</option>
                  <option value="garbage">Garbage Problem</option>
                  <option value="streetlight">Streetlight Not Working</option>
                  <option value="water_leak">Water Leakage</option>
                  <option value="other">Other Problem</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>

                {/* Department Filter */}
                <select
                  value={departmentFilter}
                  onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                {/* Date From */}
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  title="From Date"
                />

                {/* Date To */}
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  title="To Date"
                />
              </div>

              {/* Sorting Bar */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
                <span className="font-semibold">Showing {complaints.length} registered complaint{complaints.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="priority">Priority</option>
                    <option value="date">Submission Date</option>
                    <option value="status">Status</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 font-bold"
                    title="Toggle Sort Order"
                  >
                    {sortOrder === 'asc' ? '▲ ASC' : '▼ DESC'}
                  </button>
                </div>
              </div>
            </div>

            {/* Complaint Management Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-4 px-6">Complaint ID</th>
                      <th className="py-4 px-6">Problem Category</th>
                      <th className="py-4 px-6">Photo</th>
                      <th className="py-4 px-6">Location</th>
                      <th className="py-4 px-6">Priority</th>
                      <th className="py-4 px-6">Submission Date</th>
                      <th className="py-4 px-6">Department</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedComplaints.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          No complaints match the specified search or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedComplaints.map((c) => (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedTicket(c);
                            setAssignDeptId(c.assigned_department_id || undefined);
                            setAssignStaffId(c.assigned_staff_id || undefined);
                            setRepairSuccessMsg(null);
                          }}
                        >
                          <td className="py-4 px-6 font-mono text-xs font-black text-slate-900">
                            {c.tracking_number}
                          </td>

                          <td className="py-4 px-6 font-semibold text-slate-800 text-xs">
                            <span className="capitalize">{c.category.replace('_', ' ')}</span>
                          </td>

                          <td className="py-4 px-6">
                            {c.image_url ? (
                              <img
                                src={c.image_url}
                                alt={c.title}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-sm">
                                📷
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <span className="font-semibold text-slate-800 block truncate max-w-[180px] text-xs">
                              {c.address}
                            </span>
                            {c.landmark && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                                Near: {c.landmark}
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <PriorityBadge level={c.priority_level} score={c.priority_score} />
                          </td>

                          <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>

                          <td className="py-4 px-6 text-xs font-semibold text-slate-700">
                            {getDeptName(c.assigned_department_id)}
                          </td>

                          <td className="py-4 px-6">
                            <StatusBadge status={c.status} size="sm" />
                          </td>

                          <td className="py-4 px-6 text-right">
                            <button
                              type="button"
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 font-bold"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 font-bold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: INTERACTIVE MAP VIEW ================= */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-indigo-600" />
                  Interactive Geographic Work Orders Map
                </h2>
                <p className="text-xs text-slate-500">
                  Real GPS coordinates of citizen reports. Click any marker to view details and take municipal action.
                </p>
              </div>

              {/* Map Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="pothole">Broken Road</option>
                  <option value="garbage">Garbage</option>
                  <option value="streetlight">Streetlight</option>
                  <option value="water_leak">Water Leak</option>
                  <option value="other">Other</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-slate-200">
              <MapView
                complaints={complaints.map(c => ({
                  id: c.id,
                  tracking_number: c.tracking_number,
                  category: c.category,
                  title: c.title,
                  latitude: c.latitude,
                  longitude: c.longitude,
                  address: c.address,
                  status: c.status,
                  priority_level: c.priority_level,
                  image_url: c.image_url,
                  created_at: c.created_at
                }))}
                onSelectComplaint={(cMarker) => {
                  const fullTicket = complaints.find(c => c.id === cMarker.id);
                  if (fullTicket) {
                    setSelectedTicket(fullTicket);
                    setAssignDeptId(fullTicket.assigned_department_id || undefined);
                    setAssignStaffId(fullTicket.assigned_staff_id || undefined);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* ================= TAB 5: STAFF PROFILE VIEW ================= */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl font-black text-indigo-700">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'S'}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{user?.full_name}</h2>
                <span className="text-xs font-mono text-slate-500 block">{user?.email}</span>
                <span className="px-2.5 py-0.5 mt-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase inline-block">
                  Role: {user?.role} • {getDeptName(user?.department_id)}
                </span>
              </div>
            </div>

            {profileMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                ✓ {profileMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                Note: Roles and departmental assignments are strictly managed by Municipal Administrators for administrative audit compliance.
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm"
              >
                Save Profile
              </button>
            </form>
          </div>
        )}

        {/* ================= COMPLAINT DETAILS MODAL ================= */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">

              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-black text-slate-600">
                      {selectedTicket.tracking_number}
                    </span>
                    <PriorityBadge level={selectedTicket.priority_level} score={selectedTicket.priority_score} />
                    <StatusBadge status={selectedTicket.status} size="sm" />
                    {selectedTicket.due_date && new Date(selectedTicket.due_date) < new Date() && selectedTicket.status !== 'resolved' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase tracking-wide">
                        ⚠️ SLA Overdue
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {selectedTicket.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Top Details Grid: Photo + Location Map Marker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Citizen Photo */}
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Citizen Photograph
                  </span>
                  {selectedTicket.image_url ? (
                    <img
                      src={selectedTicket.image_url}
                      alt="Complaint"
                      className="w-full h-52 rounded-2xl object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-52 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
                      No citizen photo attached
                    </div>
                  )}
                </div>

                {/* Interactive Mini Location Map */}
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Location & Map Marker
                  </span>
                  <div
                    ref={miniMapContainerRef}
                    className="w-full h-52 rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  />
                </div>
              </div>

              {/* Description & Metadata Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Category</span>
                  <span className="font-semibold text-slate-900 text-sm capitalize">{selectedTicket.category.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Address</span>
                  <span className="font-semibold text-slate-900">{selectedTicket.address}</span>
                  {selectedTicket.landmark && <span className="text-slate-500 block">Near: {selectedTicket.landmark}</span>}
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Reported Timestamp</span>
                  <span className="text-slate-700">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block">SLA Due Date</span>
                  <span className={`font-semibold ${selectedTicket.due_date && new Date(selectedTicket.due_date) < new Date() && selectedTicket.status !== 'resolved' ? 'text-red-600' : 'text-slate-700'}`}>
                    {selectedTicket.due_date ? new Date(selectedTicket.due_date).toLocaleString() : 'Not Set'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-bold text-slate-500 uppercase block">Citizen Description</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                    {selectedTicket.description || 'No additional citizen remarks provided.'}
                  </p>
                </div>
              </div>

              {/* Priority Explanation & Manual Override Option */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs flex flex-col sm:flex-row items-start justify-between gap-3">
                <div>
                  <span className="font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Priority Calculation & Explainability
                  </span>
                  <p className="text-amber-950 font-mono mt-1">
                    {selectedTicket.priority_explanation || 'Rule-based evaluation based on severity and road safety hazards.'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-slate-600">
                    <span>Severity: <strong>{Math.round(selectedTicket.severity_score)}/100</strong></span>
                    <span>Safety Risk: <strong>{Math.round(selectedTicket.safety_risk_score)}/100</strong></span>
                    <span>Community: <strong>{Math.round(selectedTicket.community_impact_score)}/100</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPriorityModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold whitespace-nowrap shadow-sm"
                >
                  Override Priority
                </button>
              </div>

              {/* Priority Override Modal */}
              {showPriorityModal && (
                <div className="p-4 bg-white rounded-2xl border-2 border-amber-400 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase">Override Recommended Priority</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Severity Score (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={overrideSeverity}
                        onChange={(e) => setOverrideSeverity(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Safety Risk (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={overrideSafety}
                        onChange={(e) => setOverrideSafety(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block">Recorded Justification / Reason *</label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g., On-site physical inspection revealed hazardous pipeline damage..."
                      className="w-full px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isOverridingPriority}
                      onClick={handleOverridePriority}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      {isOverridingPriority ? 'Calibrating...' : 'Confirm Priority Override'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPriorityModal(false)}
                      className="px-3 py-2 text-slate-500 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Status History Timeline */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase block">
                  Complaint Status & Progress History
                </span>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 max-h-44 overflow-y-auto">
                  {selectedTicket.status_history && selectedTicket.status_history.length > 0 ? (
                    selectedTicket.status_history.map((h: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 text-xs border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                        <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 uppercase text-[10px]">
                              Status: {h.new_status || h.status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(h.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-700 mt-0.5">{h.notes || h.comment || 'Status updated.'}</p>
                          {h.changed_by && (
                            <span className="text-[10px] text-indigo-600 font-semibold block">
                              Updated by: {h.changed_by.full_name} ({h.changed_by.role})
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center">No history recorded yet.</p>
                  )}
                </div>
              </div>

              {/* ACTION SECTION 1: Status Transitions & Note */}
              <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-3">
                <h3 className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Quick Status Transitions
                </h3>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingStatus || selectedTicket.status === 'under_review'}
                    onClick={() => handleUpdateStatus('under_review')}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Mark as Under Review
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingStatus || selectedTicket.status === 'in_progress'}
                    onClick={() => handleUpdateStatus('in_progress')}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Mark as In Progress
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingStatus || selectedTicket.status === 'resolved'}
                    onClick={() => handleUpdateStatus('resolved')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Mark as Resolved
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Optional comment/notes accompanying status change..."
                    className="flex-1 px-3 py-2 bg-white rounded-xl border border-indigo-200 text-xs"
                  />
                </div>
              </div>

              {/* ACTION SECTION 2: Department & Staff Assignment */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-600" />
                  Assign to Department & Field Staff
                </h3>

                <form onSubmit={handleAssignTicket} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Department</label>
                      <select
                        value={assignDeptId || ''}
                        onChange={(e) => setAssignDeptId(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                      >
                        <option value="">Select Department...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Responsible Staff</label>
                      <select
                        value={assignStaffId || ''}
                        onChange={(e) => setAssignStaffId(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                      >
                        <option value="">Select Staff Member...</option>
                        {staffList
                          .filter(s => !assignDeptId || s.department_id === assignDeptId)
                          .map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Custom Due Date</label>
                      <input
                        type="datetime-local"
                        value={assignDueDate}
                        onChange={(e) => setAssignDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    placeholder="Work order assignment instructions or dispatch guidance..."
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs"
                  />

                  <button
                    type="submit"
                    disabled={isAssigning}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    {isAssigning ? 'Assigning...' : 'Save Department & Staff Assignment'}
                  </button>
                </form>
              </div>

              {/* ACTION SECTION 3: Internal Note */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  Add Internal Note (Staff Only)
                </h4>
                <form onSubmit={handleAddInternalNote} className="flex gap-2">
                  <input
                    type="text"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Add an internal observation, contractor note, or update..."
                    className="flex-1 px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isAddingNote || !internalNote.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                  >
                    {isAddingNote ? 'Saving...' : 'Add Note'}
                  </button>
                </form>
              </div>

              {/* ACTION SECTION 4: Repair Evidence Upload */}
              <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-300 space-y-3">
                <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  Upload After-Repair Photograph & Close Ticket
                </h3>
                <p className="text-xs text-emerald-800">
                  Upload a photo of the completed repair. The system logs the repair evidence, performs verification, and marks the ticket resolved.
                </p>

                {repairSuccessMsg && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-300 text-xs text-emerald-800 font-bold">
                    ✓ {repairSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleUploadRepair} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setRepairFile(e.target.files[0]);
                          setRepairPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                      className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                    />

                    {repairPreview && (
                      <img
                        src={repairPreview}
                        alt="Repair preview"
                        className="w-16 h-16 rounded-xl object-cover border border-emerald-300 shadow-sm"
                      />
                    )}
                  </div>

                  <input
                    type="text"
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    placeholder="Brief description of repair work performed..."
                    className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-200 text-xs text-slate-800"
                  />

                  <button
                    type="submit"
                    disabled={!repairFile || isUploadingRepair}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
                  >
                    {isUploadingRepair ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying & Resolving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Upload Evidence & Resolve Complaint</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

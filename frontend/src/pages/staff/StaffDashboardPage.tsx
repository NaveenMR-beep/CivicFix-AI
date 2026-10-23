import React, { useState, useEffect } from 'react';
import {
  Shield, CheckCircle2, Clock, AlertTriangle, Filter, Search,
  Wrench, Upload, Eye, RefreshCw, X, ChevronRight, UserCheck, Sparkles, MapPin
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';

interface StaffDashboardPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const StaffDashboardPage: React.FC<StaffDashboardPageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();

  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assignedOnly, setAssignedOnly] = useState<boolean>(false);

  // Selected complaint for drawer/modal
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // Status update form inside modal
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Repair evidence file
  const [repairFile, setRepairFile] = useState<File | null>(null);
  const [repairPreview, setRepairPreview] = useState<string | null>(null);
  const [repairNotes, setRepairNotes] = useState<string>('');
  const [isUploadingRepair, setIsUploadingRepair] = useState<boolean>(false);
  const [repairSuccessMsg, setRepairSuccessMsg] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getStaffComplaints({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: searchQuery || undefined,
        assigned_to_me: assignedOnly
      });
      setComplaints(data);
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, assignedOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket || !newStatus) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updateComplaintStatus(selectedTicket.id, newStatus, statusNotes);
      setSelectedTicket(updated);
      fetchTickets();
      setStatusNotes('');
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setIsUpdatingStatus(false);
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
    } catch (err: any) {
      alert(err.message || 'Evidence upload failed');
    } finally {
      setIsUploadingRepair(false);
    }
  };

  // KPI Metrics Calculation
  const totalCount = complaints.length;
  const pendingCount = complaints.filter(c => ['submitted', 'under_review', 'assigned'].includes(c.status)).length;
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
  const criticalCount = complaints.filter(c => c.priority_level === 'Critical' || c.priority_level === 'High').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length;

  return (
    <div className="flex-1 bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-300 gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold uppercase">
                Staff Operations Portal
              </span>
              <span className="text-xs text-slate-500 font-mono">Logged in as {user?.email || 'Municipal Staff'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {t.staffDashboardTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchTickets}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => onNavigate('admin-dashboard')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm shadow-sm"
            >
              Admin Mode
            </button>
          </div>
        </div>

        {/* KPI Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Work Orders</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{totalCount}</div>
            <span className="text-xs text-slate-400">All registered tickets</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-amber-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Pending Review</span>
            <div className="text-3xl font-black text-amber-700 mt-1">{pendingCount}</div>
            <span className="text-xs text-amber-600/80">Requires dispatch</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-rose-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Critical & High</span>
            <div className="text-3xl font-black text-rose-700 mt-1">{criticalCount}</div>
            <span className="text-xs text-rose-600/80">Hazardous safety risk</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-blue-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">In Progress</span>
            <div className="text-3xl font-black text-blue-700 mt-1">{inProgressCount}</div>
            <span className="text-xs text-blue-600/80">Active field crew</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-emerald-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Resolved</span>
            <div className="text-3xl font-black text-emerald-700 mt-1">{resolvedCount}</div>
            <span className="text-xs text-emerald-600/80">Repaired & verified</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket ID, road name, description, or landmark..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="Critical">Critical (80-100)</option>
              <option value="High">High (60-79)</option>
              <option value="Medium">Medium (35-59)</option>
              <option value="Low">Low (0-34)</option>
            </select>

            {/* Assigned to me toggle */}
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={assignedOnly}
                onChange={(e) => setAssignedOnly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Assigned to me</span>
            </label>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-4 px-6">ID & Category</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Reported</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No complaints match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedTicket(c);
                        setNewStatus(c.status);
                        setRepairSuccessMsg(null);
                      }}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {c.image_url ? (
                            <img
                              src={c.image_url}
                              alt={c.title}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg">
                              🛣️
                            </div>
                          )}
                          <div>
                            <span className="font-mono text-xs font-extrabold text-slate-900 block">
                              {c.tracking_number}
                            </span>
                            <span className="text-xs text-slate-500">{c.title}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-800 block truncate max-w-xs">
                          {c.address}
                        </span>
                        {c.landmark && (
                          <span className="text-xs text-slate-400 block truncate max-w-xs">
                            Near: {c.landmark}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <PriorityBadge level={c.priority_level} score={c.priority_score} />
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-6">
                        <StatusBadge status={c.status} size="sm" />
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                        >
                          Review & Action
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= COMPLAINT DETAILS MODAL / DRAWER ================= */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {selectedTicket.tracking_number}
                    </span>
                    <PriorityBadge level={selectedTicket.priority_level} score={selectedTicket.priority_score} />
                    <StatusBadge status={selectedTicket.status} size="sm" />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {selectedTicket.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photos & Evidence section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Citizen Photo
                  </span>
                  {selectedTicket.image_url ? (
                    <img
                      src={selectedTicket.image_url}
                      alt="Before"
                      className="w-full h-44 rounded-2xl object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-44 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
                      No citizen photo attached
                    </div>
                  )}
                </div>

                {/* AI Computer Vision & Explainability breakdown */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 flex items-center gap-1 mb-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      AI Explainable Assessment
                    </span>
                    <p className="text-slate-600 mb-2">
                      Predicted Category: <strong>{selectedTicket.ai_category || selectedTicket.category}</strong> (Confidence: {Math.round((selectedTicket.ai_confidence || 0.8) * 100)}%)
                    </p>
                    <p className="text-slate-700 leading-relaxed font-mono bg-white p-2.5 rounded-xl border border-slate-200 mb-2">
                      {selectedTicket.priority_explanation || t.priorityFormulaExplain}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-3 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Severity</span>
                      <strong className="text-slate-900">{Math.round(selectedTicket.severity_score)}/100</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Safety</span>
                      <strong className="text-slate-900">{Math.round(selectedTicket.safety_risk_score)}/100</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Community</span>
                      <strong className="text-slate-900">{Math.round(selectedTicket.community_impact_score)}/100</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Citizen description & Address */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 mb-6">
                <p><strong>Location:</strong> {selectedTicket.address} {selectedTicket.landmark && `(Near: ${selectedTicket.landmark})`}</p>
                <p><strong>Citizen Description:</strong> {selectedTicket.description || 'No additional remarks.'}</p>
                <p><strong>Confirmations:</strong> {selectedTicket.confirmations_count || 0} residents confirmed this issue.</p>
              </div>

              {/* Status Update Form */}
              <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-200 mb-6">
                <h3 className="text-sm font-extrabold text-indigo-950 mb-3 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Update Complaint Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="px-3 py-2 bg-white rounded-xl border border-indigo-200 text-xs font-bold text-slate-800"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="assigned">Assigned to Crew</option>
                    <option value="in_progress">Work In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>

                  <input
                    type="text"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Enter status notes or dispatch instructions..."
                    className="sm:col-span-2 px-3 py-2 bg-white rounded-xl border border-indigo-200 text-xs text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  disabled={isUpdatingStatus || newStatus === selectedTicket.status}
                  onClick={handleUpdateStatus}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {isUpdatingStatus ? 'Saving...' : 'Confirm Status Update'}
                </button>
              </div>

              {/* Repair Evidence Upload & AI Verification Section */}
              <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-300">
                <h3 className="text-sm font-extrabold text-emerald-950 mb-1 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  {t.uploadRepairEvidence} & {t.aiVerifyRepair}
                </h3>
                <p className="text-xs text-emerald-800 mb-4">
                  Take a photo of the completed repair. The AI engine will compare it against the original complaint photo to evaluate repair completion.
                </p>

                {repairSuccessMsg && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-300 text-xs text-emerald-800 mb-3 font-semibold">
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
                    placeholder="Brief description of repair work (e.g., asphalt patch completed, trash cleared)"
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
                        <span>Upload Evidence & Close Ticket</span>
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

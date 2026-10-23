import React, { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle2, MapPin, ArrowRight, Plus, Filter, Calendar } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';

interface MyComplaintsPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const MyComplaintsPage: React.FC<MyComplaintsPageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (isAuthenticated) {
      api.getMyComplaints()
        .then(setComplaints)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex-1 bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <Shield className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Please Log In</h2>
          <p className="text-sm text-slate-600 mb-6">
            Log in to view the history and current progress of your civic reports.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Filter logic
  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'submitted') return c.status === 'submitted';
    if (statusFilter === 'in_progress') {
      return ['under_review', 'assigned', 'in_progress'].includes(c.status);
    }
    if (statusFilter === 'resolved') return c.status === 'resolved';
    return true;
  });

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      pothole: 'Broken Road / Pothole',
      garbage: 'Garbage Problem',
      streetlight: 'Streetlight Not Working',
      water_leak: 'Water Leakage',
      other: 'Other Problem'
    };
    return map[cat.toLowerCase()] || cat;
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              My Complaints History
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Welcome back, {user?.full_name}. Track status and official updates for your submitted reports.
            </p>
          </div>
          <button
            onClick={() => onNavigate('wizard')}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Report a Problem</span>
          </button>
        </div>

        {/* Filter Controls: All, Submitted, In Progress, Resolved */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'all', label: `All (${complaints.length})` },
            { id: 'submitted', label: `Submitted (${complaints.filter(c => c.status === 'submitted').length})` },
            { id: 'in_progress', label: `In Progress (${complaints.filter(c => ['under_review', 'assigned', 'in_progress'].includes(c.status)).length})` },
            { id: 'resolved', label: `Resolved (${complaints.filter(c => c.status === 'resolved').length})` }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
                statusFilter === f.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Complaints List */}
        {loading ? (
          <p className="text-slate-500 text-center py-12">Loading your reports...</p>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
              📋
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {complaints.length === 0
                ? "You haven't reported any problems yet"
                : "No complaints found under this filter"}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              {complaints.length === 0
                ? "Help improve your community by reporting your first issue. Our municipal team will inspect it and take action."
                : "Try selecting a different filter above to view your other reports."}
            </p>
            {complaints.length === 0 && (
              <button
                onClick={() => onNavigate('wizard')}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm shadow-md transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Report a Problem Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComplaints.map((c) => (
              <div
                key={c.id}
                onClick={() => onNavigate('track', { trackingNumber: c.tracking_number || c.public_complaint_id })}
                className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  {/* Thumbnail */}
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">
                      🏛️
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {/* Public Complaint ID */}
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {c.public_complaint_id || c.tracking_number}
                      </span>
                      {/* Problem Category */}
                      <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        {getCategoryLabel(c.category)}
                      </span>
                      <PriorityBadge level={c.priority_level} />
                    </div>

                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {c.title}
                    </h3>

                    {/* Location Summary */}
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </p>

                    {/* Submission Date */}
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Submitted on {new Date(c.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <StatusBadge status={c.status} />
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

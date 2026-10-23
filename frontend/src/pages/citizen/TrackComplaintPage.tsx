import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle2, Clock, AlertCircle, MapPin,
  Calendar, Shield, Users, ArrowRight, Image as ImageIcon
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';

interface TrackComplaintPageProps {
  initialTrackingNumber?: string;
  onNavigate: (view: string, params?: any) => void;
}

export const TrackComplaintPage: React.FC<TrackComplaintPageProps> = ({
  initialTrackingNumber = '',
  onNavigate
}) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [searchInput, setSearchInput] = useState(initialTrackingNumber);
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchComplaint = async (trackingNum: string) => {
    if (!trackingNum.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.trackComplaint(trackingNum.trim());
      setComplaint(data);
    } catch (err: any) {
      setComplaint(null);
      setError(err.message || 'Could not find complaint. Please check the ID.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingNumber) {
      fetchComplaint(initialTrackingNumber);
    }
  }, [initialTrackingNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaint(searchInput);
  };

  const handleConfirmAffected = async () => {
    if (!complaint) return;
    if (!isAuthenticated) {
      onNavigate('login');
      return;
    }
    setConfirming(true);
    try {
      const updated = await api.confirmComplaint(complaint.id, 'impacts_me');
      setComplaint(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to register confirmation');
    } finally {
      setConfirming(false);
    }
  };

  // Timeline Stage helper
  const stages = [
    { key: 'submitted', label: t.statusSubmitted },
    { key: 'under_review', label: t.statusUnderReview },
    { key: 'assigned', label: t.statusAssigned },
    { key: 'in_progress', label: t.statusInProgress },
    { key: 'resolved', label: t.statusResolved }
  ];

  const getStageIndex = (status: string) => {
    const map: Record<string, number> = {
      submitted: 0,
      under_review: 1,
      assigned: 2,
      in_progress: 3,
      resolved: 4,
      rejected: 4
    };
    return map[status] ?? 0;
  };

  const currentStageIdx = complaint ? getStageIndex(complaint.status) : 0;

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            {t.trackingTitle}
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {t.trackExplanation}
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t.enterComplaintId}
              className="w-full py-4 pl-5 pr-32 bg-white rounded-2xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-base shadow-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all"
            >
              {loading ? 'Searching...' : t.searchButton}
            </button>
          </div>
          {/* Quick Demo ID links */}
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
            <span>Try sample ID:</span>
            <button
              type="button"
              onClick={() => {
                setSearchInput('CF-2026-000101');
                fetchComplaint('CF-2026-000101');
              }}
              className="font-mono text-blue-600 hover:underline font-bold"
            >
              CF-2026-000101
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setSearchInput('CF-2026-000099');
                fetchComplaint('CF-2026-000099');
              }}
              className="font-mono text-emerald-600 hover:underline font-bold"
            >
              CF-2026-000099 (Resolved)
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div className="max-w-xl mx-auto p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm mb-6 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Complaint Details & Timeline */}
        {complaint && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
            {/* Header: Tracking Number, Badges, Created Date */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4 mb-6">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Complaint ID
                </span>
                <h2 className="text-2xl font-mono font-black text-slate-900">
                  {complaint.tracking_number}
                </h2>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {complaint.title}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={complaint.status} size="lg" />
                <PriorityBadge level={complaint.priority_level} score={complaint.priority_score} />
              </div>
            </div>

            {/* Visual 5-Stage Timeline */}
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">
                {t.timelineTitle}
              </h3>

              <div className="relative">
                {/* Horizontal Progress bar for desktop */}
                <div className="hidden sm:block absolute top-1/2 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 z-0" />
                <div
                  className="hidden sm:block absolute top-1/2 left-4 h-1 bg-emerald-600 -translate-y-1/2 transition-all duration-500 z-0"
                  style={{
                    width: `${Math.min(100, (currentStageIdx / (stages.length - 1)) * 92)}%`
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                  {stages.map((stage, idx) => {
                    const isPassed = idx <= currentStageIdx;
                    const isCurrent = idx === currentStageIdx;

                    return (
                      <div key={stage.key} className="flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                            isPassed
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          } ${isCurrent ? 'ring-4 ring-emerald-200 scale-110' : ''}`}
                        >
                          {isPassed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                        </div>
                        <div>
                          <p className={`text-xs font-extrabold ${isPassed ? 'text-slate-900' : 'text-slate-400'}`}>
                            {stage.label}
                          </p>
                          {isCurrent && (
                            <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-0.5">
                              Current Stage
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left Column: Location & Meta */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Location</span>
                    <p className="text-sm font-bold text-slate-900">{complaint.address}</p>
                    {complaint.landmark && (
                      <p className="text-xs text-slate-600 mt-0.5">Landmark: {complaint.landmark}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Submission Date</span>
                    <p className="text-sm font-semibold text-slate-800">
                      {new Date(complaint.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {complaint.assigned_department && (
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Assigned Department</span>
                      <p className="text-sm font-bold text-indigo-900">
                        {complaint.assigned_department.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Community Confirmation Widget */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">
                      Community Impact ({complaint.confirmations_count || 0} {t.confirmCount})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmAffected}
                    disabled={confirming || complaint.has_confirmed}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      complaint.has_confirmed
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm'
                    }`}
                  >
                    {complaint.has_confirmed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t.confirmedAffected}</span>
                      </>
                    ) : (
                      <span>{t.confirmAffected}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Photos (Before & After) */}
              <div className="space-y-4">
                {complaint.image_url && (
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                      Reported Issue Photo
                    </span>
                    <img
                      src={complaint.image_url}
                      alt="Reported problem"
                      className="w-full h-44 rounded-2xl object-cover border border-slate-200 shadow-sm"
                    />
                  </div>
                )}

                {/* Completed Repair Evidence Photos */}
                {complaint.repair_evidence && complaint.repair_evidence.length > 0 && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300">
                    <span className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Work Completed Photo Evidence
                    </span>
                    <img
                      src={complaint.repair_evidence[0].image_url}
                      alt="Completed repair"
                      className="w-full h-40 rounded-xl object-cover border border-emerald-200 shadow-sm mb-2"
                    />
                    <p className="text-xs text-emerald-800">
                      {complaint.repair_evidence[0].notes || 'Repair completed and inspected by municipal staff.'}
                    </p>
                    {complaint.repair_evidence[0].ai_verification_details && (
                      <p className="text-[11px] text-emerald-700 font-mono mt-1">
                        ✓ {complaint.repair_evidence[0].ai_verification_details}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Official Status History Log */}
            {complaint.status_history && complaint.status_history.length > 0 && (
              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Status History & Officer Notes
                </h3>
                <div className="space-y-3">
                  {complaint.status_history.map((hist: any) => (
                    <div key={hist.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 uppercase">
                          {hist.new_status.replace('_', ' ')}
                        </span>
                        <span className="text-slate-400">
                          {new Date(hist.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700">{hist.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

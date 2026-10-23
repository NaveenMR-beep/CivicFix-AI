import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle2, Clock, AlertCircle, MapPin,
  Calendar, Shield, Users, ArrowRight, ArrowLeft, Image as ImageIcon, MessageSquare
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
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchComplaint = async (trackingNum: string) => {
    if (!trackingNum.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.trackComplaint(trackingNum.trim());
      setComplaint(data);

      // Fetch official history timeline
      try {
        const historyData = await api.getComplaintHistory(trackingNum.trim());
        setHistoryList(historyData || []);
      } catch (histErr) {
        setHistoryList(data.status_history || []);
      }
    } catch (err: any) {
      setComplaint(null);
      setHistoryList([]);
      setError(err.message || 'No complaint found matching this ID or access is unauthorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingNumber) {
      setSearchInput(initialTrackingNumber);
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

  // 5 Formal Lifecycle Timeline Stages
  const stages = [
    { key: 'submitted', label: '1. Complaint Submitted' },
    { key: 'under_review', label: '2. Under Review' },
    { key: 'assigned', label: '3. Assigned to Department' },
    { key: 'in_progress', label: '4. Work in Progress' },
    { key: 'resolved', label: '5. Resolved' }
  ];

  // Helper to find actual database history event for each stage
  const getStageEvent = (stageKey: string) => {
    if (!historyList || historyList.length === 0) return null;
    return historyList.find((h) => h.new_status === stageKey);
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Track Complaint Status
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Enter your public complaint ID to check live inspection and resolution milestones.
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g., CF-2026-123456"
              className="w-full py-4 pl-5 pr-32 bg-white rounded-2xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-base shadow-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
            >
              {loading ? 'Searching...' : 'Search'}
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
            {/* Header: Tracking Number, Badges, Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4 mb-6">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Public Complaint ID
                </span>
                <h2 className="text-2xl font-mono font-black text-slate-900">
                  {complaint.public_complaint_id || complaint.tracking_number}
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

            {/* Visual 5-Stage Timeline — STRICTLY ACCORDING TO OCCURRED EVENTS */}
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">
                Official Progress Timeline
              </h3>

              <div className="space-y-6">
                {stages.map((stage, idx) => {
                  const event = getStageEvent(stage.key);
                  const isCompleted = !!event;
                  const isCurrent = complaint.status === stage.key;

                  return (
                    <div key={stage.key} className="flex items-start gap-4">
                      {/* Step Marker Indicator */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-md'
                            : isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md'
                            : 'bg-white border-2 border-slate-300 text-slate-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className={`text-sm font-extrabold ${isCompleted ? 'text-slate-900' : isCurrent ? 'text-blue-900' : 'text-slate-400'}`}>
                            {stage.label}
                          </h4>
                          {isCurrent && (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                              Active Stage
                            </span>
                          )}
                          {event && (
                            <span className="text-xs font-semibold text-slate-500">
                              {new Date(event.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>

                        {/* Display Timestamp and Officer Comment if occurred */}
                        {event ? (
                          <div className="mt-1 text-xs text-slate-600">
                            <p className="bg-white p-2.5 rounded-xl border border-slate-200 mt-1">
                              {event.comment || event.notes || 'Status confirmed by municipal department.'}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5 italic">
                            Awaiting prior stage completion.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details Grid: Location, Dates, and Photos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left Column: Location & Meta */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Location Summary</span>
                    <p className="text-sm font-bold text-slate-900">{complaint.address}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Coordinates: {complaint.latitude?.toFixed(4)}, {complaint.longitude?.toFixed(4)}
                    </p>
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

                {/* Community Confirmation Impact Widget */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">
                      Community Impact ({complaint.confirmations_count || 0} Citizens Affected)
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
                        <span>You Confirmed This Issue Affects You</span>
                      </>
                    ) : (
                      <span>I Am Affected By This Issue Too</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Photos (Reported vs Repaired) */}
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
                  </div>
                )}
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-6 border-t border-slate-200 flex justify-between">
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'my-complaints' : 'citizen-home')}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('wizard')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm"
              >
                Report Another Problem
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

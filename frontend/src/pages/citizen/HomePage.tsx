import React, { useEffect, useState } from 'react';
import { Camera, Search, Map, CheckCircle2, Clock, Shield, Plus, ChevronRight, FileText, MapPin } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';

interface HomePageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  
  const [stats, setStats] = useState<{
    total_complaints: number;
    pending_complaints: number;
    resolved_complaints: number;
    recent_complaints: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      api.getDashboardSummary()
        .then((data) => setStats(data))
        .catch(() => {
          // Fallback if summary endpoint encounters issue
          api.getMyComplaints()
            .then((complaints) => {
              const total = complaints.length;
              const resolved = complaints.filter((c: any) => c.status === 'resolved').length;
              const pending = complaints.filter((c: any) => c.status !== 'resolved' && c.status !== 'rejected').length;
              setStats({
                total_complaints: total,
                pending_complaints: pending,
                resolved_complaints: resolved,
                recent_complaints: complaints.slice(0, 4)
              });
            })
            .catch(() => {});
        })
        .finally(() => setLoading(false));
    } else {
      setStats({
        total_complaints: 0,
        pending_complaints: 0,
        resolved_complaints: 0,
        recent_complaints: []
      });
    }
  }, [isAuthenticated]);

  return (
    <div className="flex-1 bg-white">
      {/* Hero Welcome Banner */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold mb-6">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Official Public Grievance Portal</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
          Welcome to CivicFix AI
        </h1>

        <p className="text-lg sm:text-2xl font-bold text-slate-700 max-w-2xl mx-auto mb-2">
          See a problem in your area? Let us know.
        </p>

        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto mb-10">
          Report broken roads, uncollected waste, dark streetlights, or water leakage directly to city authorities.
        </p>

        {/* 3 Primary Action Buttons (Large, high-contrast, touch-friendly) */}
        <div className="flex flex-col gap-4 max-w-md mx-auto mb-12">
          {/* Button 1: Report a Problem */}
          <button
            onClick={() => onNavigate('wizard')}
            className="w-full py-5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xl font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Camera className="w-7 h-7 shrink-0" />
            <span>Report a Problem</span>
          </button>

          {/* Button 2: Track My Complaints */}
          <button
            onClick={() => onNavigate(isAuthenticated ? 'my-complaints' : 'track')}
            className="w-full py-5 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xl font-extrabold rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Search className="w-7 h-7 shrink-0" />
            <span>Track My Complaints</span>
          </button>

          {/* Button 3: View Problems Near Me */}
          <button
            onClick={() => onNavigate('nearby')}
            className="w-full py-5 px-6 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 text-xl font-extrabold rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Map className="w-7 h-7 shrink-0" />
            <span>View Problems Near Me</span>
          </button>
        </div>

        {/* Citizen Complaint Statistics Loaded Directly from Backend */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="text-left mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isAuthenticated ? `${user?.full_name}'s Complaint Statistics` : 'Your Complaint Statistics'}
            </span>
            {isAuthenticated && stats && stats.total_complaints > 0 && (
              <button
                onClick={() => onNavigate('my-complaints')}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span>View all ({stats.total_complaints})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
            {/* Total Complaints */}
            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-2xl sm:text-4xl font-black text-slate-900">
                {stats ? stats.total_complaints : 0}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600 mt-1 block">
                Total Complaints
              </span>
            </div>

            {/* Pending Complaints */}
            <div className="p-4 sm:p-5 bg-amber-50/60 rounded-2xl border border-amber-200 shadow-sm">
              <span className="block text-2xl sm:text-4xl font-black text-amber-600">
                {stats ? stats.pending_complaints : 0}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-amber-800 mt-1 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500 hidden sm:inline" />
                Pending Complaints
              </span>
            </div>

            {/* Resolved Complaints */}
            <div className="p-4 sm:p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-sm">
              <span className="block text-2xl sm:text-4xl font-black text-emerald-600">
                {stats ? stats.resolved_complaints : 0}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-emerald-800 mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 hidden sm:inline" />
                Resolved Complaints
              </span>
            </div>
          </div>
        </div>

        {/* Recent Complaints OR Empty State */}
        <div className="max-w-2xl mx-auto mb-10 text-left">
          {isAuthenticated && stats && stats.recent_complaints && stats.recent_complaints.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Recent Complaints
                </h3>
                <button
                  onClick={() => onNavigate('my-complaints')}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  View full history
                </button>
              </div>

              <div className="space-y-3">
                {stats.recent_complaints.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => onNavigate('track', { trackingNumber: c.tracking_number })}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt="Report thumbnail"
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                          📌
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-400">
                            {c.tracking_number}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {c.title}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <StatusBadge status={c.status} size="sm" />
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Helpful Empty State */
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 text-center shadow-sm">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
                🌱
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Help improve your neighborhood
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
                You haven't reported any problems yet. Help improve your community by reporting your first issue.
              </p>
              <button
                onClick={() => onNavigate('wizard')}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold rounded-xl text-sm shadow-md transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Report a Problem</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* How Reporting Works Section (Visual, clean, accessible) */}
      <section className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-8">
            How CivicFix Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold">
                📸
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">1. Snap a Photo</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Take a quick picture of the broken road, trash heap, or streetlight.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
                📍
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">2. Pin Location</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Use your device GPS or select the exact street manually on our map.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-bold">
                ⚡
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">3. Track to Resolution</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Follow real-time status updates as city crews inspect and complete repairs.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

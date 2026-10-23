import React, { useEffect, useState } from 'react';
import { Camera, Search, Map, CheckCircle2, Clock, Wrench, Shield, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

interface HomePageProps {
  onNavigate: (view: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [userStats, setUserStats] = useState<{ total: number; resolved: number; inProgress: number } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      api.getMyComplaints()
        .then((complaints) => {
          const total = complaints.length;
          const resolved = complaints.filter((c: any) => c.status === 'resolved').length;
          const inProgress = complaints.filter((c: any) => c.status !== 'resolved').length;
          setUserStats({ total, resolved, inProgress });
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <div className="flex-1 bg-white">
      {/* Hero Welcome Banner */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold mb-6">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Official Public Grievance Portal</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          {t.appName}
        </h1>

        <p className="text-xl sm:text-2xl font-bold text-slate-700 max-w-2xl mx-auto mb-2">
          {t.subtagline}
        </p>

        <p className="text-base text-slate-500 max-w-xl mx-auto mb-10">
          {t.togetherText}
        </p>

        {/* 3 Primary Action Buttons (Extremely large, high-contrast, touch-friendly) */}
        <div className="flex flex-col gap-4 max-w-md mx-auto mb-12">
          {/* Button 1: Report a Problem */}
          <button
            onClick={() => onNavigate('wizard')}
            className="w-full py-5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xl font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Camera className="w-7 h-7 shrink-0" />
            <span>{t.reportProblem}</span>
          </button>

          {/* Button 2: Track My Complaint */}
          <button
            onClick={() => onNavigate('track')}
            className="w-full py-5 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xl font-extrabold rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Search className="w-7 h-7 shrink-0" />
            <span>{t.trackComplaint}</span>
          </button>

          {/* Button 3: View Problems Near Me */}
          <button
            onClick={() => onNavigate('nearby')}
            className="w-full py-5 px-6 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 text-xl font-extrabold rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Map className="w-7 h-7 shrink-0" />
            <span>{t.problemsNearMe}</span>
          </button>
        </div>

        {/* Citizen Complaints Status Summary Banner (if logged in or reported) */}
        {isAuthenticated && userStats && userStats.total > 0 && (
          <div className="max-w-md mx-auto mb-12 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Your Reports Status
              </span>
              <button
                onClick={() => onNavigate('my-complaints')}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
              >
                View all ({userStats.total}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="block text-2xl font-black text-amber-600">{userStats.inProgress}</span>
                <span className="text-xs font-semibold text-slate-600 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Active
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="block text-2xl font-black text-emerald-600">{userStats.resolved}</span>
                <span className="text-xs font-semibold text-slate-600 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Resolved
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* How Reporting Works Section (Visual, clean, friendly) */}
      <section className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-8">
            {t.howItWorks}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold">
                📸
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.step1Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.step1Desc}</p>
            </div>

            {/* Step 2 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
                📍
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.step2Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.step2Desc}</p>
            </div>

            {/* Step 3 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-bold">
                ⚡
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.step3Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

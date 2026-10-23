import React, { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle2, MapPin, ArrowRight, Plus } from 'lucide-react';
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
            Log in to view the history of complaints you have reported.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.myComplaints}
            </h1>
            <p className="text-sm text-slate-600">
              Welcome back, {user?.full_name}. Here are your submitted reports.
            </p>
          </div>
          <button
            onClick={() => onNavigate('wizard')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Report</span>
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-8">Loading your reports...</p>
        ) : complaints.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
            <p className="text-base font-bold text-slate-800">You haven't reported any problems yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Help make your neighborhood safer by reporting issues you notice.
            </p>
            <button
              onClick={() => onNavigate('wizard')}
              className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-sm"
            >
              Report a Problem Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => onNavigate('track', { trackingNumber: c.tracking_number })}
                className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                      🛣️
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {c.tracking_number}
                      </span>
                      <PriorityBadge level={c.priority_level} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.address}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
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

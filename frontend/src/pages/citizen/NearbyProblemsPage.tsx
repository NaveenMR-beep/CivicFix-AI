import React, { useState, useEffect } from 'react';
import { MapPin, Filter, Navigation, Users, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { MapView } from '../../components/MapView';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';

interface NearbyProblemsPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const NearbyProblemsPage: React.FC<NearbyProblemsPageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: 12.9716, // Bangalore default
    lon: 77.5946
  });
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  const fetchNearby = async (lat: number, lon: number, cat?: string) => {
    setLoading(true);
    try {
      const data = await api.getNearbyComplaints(lat, lon, 5000, cat || undefined);
      setComplaints(data);
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCoords({ lat, lon });
          fetchNearby(lat, lon, categoryFilter);
        },
        () => {
          fetchNearby(coords.lat, coords.lon, categoryFilter);
        }
      );
    } else {
      fetchNearby(coords.lat, coords.lon, categoryFilter);
    }
  }, []);

  const handleFilterChange = (cat: string) => {
    setCategoryFilter(cat);
    fetchNearby(coords.lat, coords.lon, cat);
  };

  const handleConfirm = async (complaintId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onNavigate('login');
      return;
    }
    try {
      await api.confirmComplaint(complaintId, 'impacts_me');
      fetchNearby(coords.lat, coords.lon, categoryFilter);
    } catch (err: any) {
      alert(err.message || 'Already confirmed');
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.problemsNearMe}
            </h1>
            <p className="text-sm text-slate-600">
              Interactive map of reported issues in your neighborhood.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: '', label: 'All Issues' },
              { id: 'pothole', label: '🛣️ Roads' },
              { id: 'garbage', label: '🗑️ Waste' },
              { id: 'streetlight', label: '💡 Lighting' },
              { id: 'water_leak', label: '💧 Water' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => handleFilterChange(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  categoryFilter === f.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Layout: Map (Left) & Ticket List (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-7 h-[420px] lg:h-[650px] sticky top-24">
            <MapView
              complaints={complaints}
              center={[coords.lat, coords.lon]}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
            />
          </div>

          {/* Cards List Section */}
          <div className="lg:col-span-5 space-y-4 max-h-[650px] overflow-y-auto pr-1">
            {loading && (
              <p className="text-sm text-slate-500 text-center py-8">
                Loading nearby reports...
              </p>
            )}

            {!loading && complaints.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <p className="text-base font-bold text-slate-800">No issues found in this radius</p>
                <p className="text-xs text-slate-500 mt-1">
                  Your neighborhood looks clean and safe! If you spot an issue, be the first to report it.
                </p>
                <button
                  onClick={() => onNavigate('wizard')}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Report a Problem
                </button>
              </div>
            )}

            {complaints.map((c) => {
              const isSelected = selectedComplaint?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white shadow-sm flex flex-col gap-3 ${
                    isSelected ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {c.tracking_number} • {c.distance_meters}m away
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">
                        {c.title}
                      </h4>
                    </div>
                    <StatusBadge status={c.status} size="sm" />
                  </div>

                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt={c.title}
                      className="w-full h-32 rounded-xl object-cover border border-slate-100"
                    />
                  )}

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {c.description || 'Reported civic issue.'}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <PriorityBadge level={c.priority_level} />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleConfirm(c.id, e)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1"
                        title="Confirm you are affected too"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{c.confirmations_count || 0} Affected</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('track', { trackingNumber: c.tracking_number });
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="View Full Tracking Details"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

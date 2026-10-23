import React from 'react';
import { Shield, Phone, Heart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 py-12 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* App Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">{t.appName}</span>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              {t.togetherText}
            </p>
            <p className="text-xs text-slate-500">
              Designed for ease of use by all citizens, senior residents, and municipal teams.
            </p>
          </div>

          {/* Municipal Emergency Helplines */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              City Emergency Helplines
            </h4>
            <ul className="text-sm space-y-2 text-slate-400">
              <li>• Emergency Services: <strong className="text-white">112</strong></li>
              <li>• BBMP Municipal Grievances: <strong className="text-white">1533</strong></li>
              <li>• Water Supply & Sewerage: <strong className="text-white">1916</strong></li>
              <li>• BESCOM Power & Streetlights: <strong className="text-white">1912</strong></li>
            </ul>
          </div>

          {/* AI Ethics & Transparency Note */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-3">
              AI Transparency & Governance
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              AI predictions, severity estimates, and duplicate detections are decision-support recommendations. Official status updates and completion sign-offs are inspected and verified by municipal officers.
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span>● System operational & connected to live municipal dispatch</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 {t.appName}. Open Municipal Innovation Platform.</p>
          <p className="flex items-center gap-1">
            Built with care for citizen empowerment <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};

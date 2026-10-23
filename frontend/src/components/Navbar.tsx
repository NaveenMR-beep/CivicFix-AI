import React from 'react';
import { Shield, Globe, User, LogOut, CheckCircle, MapPin, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo & App Title */}
          <button
            onClick={() => setCurrentView('citizen-home')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                {t.appName}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  AI
                </span>
              </span>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {t.tagline}
              </p>
            </div>
          </button>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick Links for Desktop */}
            <div className="hidden md:flex items-center gap-1 text-sm font-semibold">
              <button
                onClick={() => setCurrentView('citizen-home')}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  currentView === 'citizen-home' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.citizenPortal}
              </button>
              <button
                onClick={() => setCurrentView('track')}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  currentView === 'track' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.trackComplaint}
              </button>
              <button
                onClick={() => setCurrentView('nearby')}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  currentView === 'nearby' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.problemsNearMe}
              </button>

              {/* Staff Portal Tab */}
              <button
                onClick={() => setCurrentView('staff-dashboard')}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  currentView === 'staff-dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.staffPortal}
              </button>

              {/* Admin Portal Tab */}
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  currentView === 'admin-dashboard' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.adminPortal}
              </button>
            </div>

            {/* Language Switcher Button (Large and prominent) */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-800 text-sm font-bold shadow-sm transition-all active:scale-95"
              title="Switch language between English and Kannada"
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>{language === 'en' ? 'ಕನ್ನಡ (KN)' : 'English (EN)'}</span>
            </button>

            {/* User Account / Auth */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('my-complaints')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                  title="View my reported complaints"
                >
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span className="truncate max-w-[120px]">{user.full_name}</span>
                </button>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title={t.logout}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCurrentView('login')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                {t.login}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

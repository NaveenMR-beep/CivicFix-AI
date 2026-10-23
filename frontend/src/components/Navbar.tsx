import React, { useState } from 'react';
import { Shield, Globe, User, LogOut, Camera, Search, Map, Menu, X, PlusCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: string) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo & App Title */}
          <button
            onClick={() => handleNav('citizen-home')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                CivicFix
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  AI
                </span>
              </span>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Citizen Reporting & Grievance Redressal
              </p>
            </div>
          </button>

          {/* Simple Navigation Menu (Section 12: Home, Report a Problem, My Complaints, Problems Near Me) */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold">
            <button
              onClick={() => handleNav('citizen-home')}
              className={`px-3.5 py-2 rounded-xl transition-colors ${
                currentView === 'citizen-home' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('wizard')}
              className={`px-3.5 py-2 rounded-xl transition-colors ${
                currentView === 'wizard' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Report a Problem
            </button>
            <button
              onClick={() => handleNav(isAuthenticated ? 'my-complaints' : 'login')}
              className={`px-3.5 py-2 rounded-xl transition-colors ${
                currentView === 'my-complaints' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Complaints
            </button>
            <button
              onClick={() => handleNav('nearby')}
              className={`px-3.5 py-2 rounded-xl transition-colors ${
                currentView === 'nearby' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Problems Near Me
            </button>

            {user?.role === 'staff' && (
              <button
                onClick={() => handleNav('staff-dashboard')}
                className={`px-3.5 py-2 rounded-xl transition-colors ${
                  currentView === 'staff-dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff Portal
              </button>
            )}
            {user?.role === 'admin' && (
              <>
                <button
                  onClick={() => handleNav('staff-dashboard')}
                  className={`px-3.5 py-2 rounded-xl transition-colors ${
                    currentView === 'staff-dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Staff Portal
                </button>
                <button
                  onClick={() => handleNav('admin-dashboard')}
                  className={`px-3.5 py-2 rounded-xl transition-colors ${
                    currentView === 'admin-dashboard' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admin Portal
                </button>
              </>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Button */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold shadow-sm transition-all"
              title="Toggle English / Kannada"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'en' ? 'ಕನ್ನಡ' : 'EN'}</span>
            </button>

            {/* Profile & Logout (Section 12) */}
            {isAuthenticated && user ? (
              <div className="hidden sm:flex items-center gap-2">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold"
                  title="Citizen Profile"
                >
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="truncate max-w-[120px]">{user.full_name}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('login')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
              >
                Log In
              </button>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => handleNav('citizen-home')}
              className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'citizen-home' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('wizard')}
              className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'wizard' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Report a Problem
            </button>
            <button
              onClick={() => handleNav(isAuthenticated ? 'my-complaints' : 'login')}
              className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'my-complaints' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              My Complaints
            </button>
            <button
              onClick={() => handleNav('nearby')}
              className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'nearby' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Problems Near Me
            </button>

            {(user?.role === 'staff' || user?.role === 'admin') && (
              <button
                onClick={() => handleNav('staff-dashboard')}
                className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                  currentView === 'staff-dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Staff Portal
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => handleNav('admin-dashboard')}
                className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                  currentView === 'admin-dashboard' ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Admin Portal
              </button>
            )}

            {isAuthenticated && user && (
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Profile: {user.full_name}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/citizen/HomePage';
import { ReportWizardPage } from './pages/citizen/ReportWizardPage';
import { TrackComplaintPage } from './pages/citizen/TrackComplaintPage';
import { NearbyProblemsPage } from './pages/citizen/NearbyProblemsPage';
import { MyComplaintsPage } from './pages/citizen/MyComplaintsPage';
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

export function AppContent() {
  const [currentView, setCurrentView] = useState<string>('citizen-home');
  const [viewParams, setViewParams] = useState<any>({});

  const handleNavigate = (view: string, params: any = {}) => {
    setViewParams(params);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar currentView={currentView} setCurrentView={handleNavigate} />

      <main className="flex-1 flex flex-col">
        {currentView === 'citizen-home' && <HomePage onNavigate={handleNavigate} />}
        {currentView === 'wizard' && <ReportWizardPage onNavigate={handleNavigate} />}
        {currentView === 'track' && (
          <TrackComplaintPage
            initialTrackingNumber={viewParams.trackingNumber || ''}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'nearby' && <NearbyProblemsPage onNavigate={handleNavigate} />}
        {currentView === 'my-complaints' && <MyComplaintsPage onNavigate={handleNavigate} />}
        {currentView === 'staff-dashboard' && <StaffDashboardPage onNavigate={handleNavigate} />}
        {currentView === 'admin-dashboard' && <AdminDashboardPage />}
        {currentView === 'login' && <LoginPage onNavigate={handleNavigate} />}
        {currentView === 'register' && <RegisterPage onNavigate={handleNavigate} />}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}

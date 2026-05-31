import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Login } from './components/Login';
import { LanguageProvider } from './context/LanguageContext';
import { BookingProvider } from './context/BookingContext';
import { invalidateAdminTenantCache } from './utils/tenantScope';
import { DashboardLayout } from './layouts/DashboardLayout';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    invalidateAdminTenantCache();
    setIsAuthenticated(false);
  }, []);

  if (!isAuthenticated) {
    return (
      <LanguageProvider>
        <Login onLoginSuccess={() => setIsAuthenticated(true)} />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <BookingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<DashboardLayout onLogout={handleLogout} />} />
            <Route path="/login" element={<Navigate to="/overview" replace />} />
          </Routes>
        </BrowserRouter>
      </BookingProvider>
    </LanguageProvider>
  );
}

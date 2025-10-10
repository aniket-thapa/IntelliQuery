import { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { LoaderCircle } from 'lucide-react';

// Layouts
import AppLayout from '../layouts/AppLayout';

// Public Pages
import HomePage from '../pages/public/HomePage';
import LoginPage from '../pages/public/LoginPage';
import SignupPage from '../pages/public/SignupPage';
import RequestPasswordResetPage from '../pages/public/RequestPasswordResetPage';
import ResetPasswordPage from '../pages/public/ResetPasswordPage';
import AcceptInvitePage from '../pages/public/AcceptInvitePage';
import NotFoundPage from '../pages/public/NotFoundPage';

// App Pages
import OnboardingPage from '../pages/app/OnboardingPage';
import DashboardPage from '../pages/app/DashboardPage';
import SettingsLayout from '../pages/app/settings/SettingsLayout';
import TeamPage from '../pages/app/settings/TeamPage';
import DatabasePage from '../pages/app/settings/DatabasePage';
import SchemaPage from '../pages/app/settings/SchemaPage';

function PrivateRoute({ children }) {
  const { token, onboardingStatus } = useAuth();
  const location = useLocation();

  if (onboardingStatus === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  const isFullyOnboarded = onboardingStatus === 'onboarded';
  const isOnboardingPage = location.pathname === '/app/onboarding';

  if (isFullyOnboarded && isOnboardingPage) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (!isFullyOnboarded && !isOnboardingPage) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';
  return isAdmin ? children : <Navigate to="/app/dashboard" replace />;
}

export default function AppRouter() {
  const { token } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes - redirect if logged in */}
        <Route
          path="/"
          element={token ? <Navigate to="/app" /> : <HomePage />}
        />
        <Route
          path="/login"
          element={token ? <Navigate to="/app" /> : <LoginPage />}
        />
        <Route
          path="/signup"
          element={token ? <Navigate to="/app" /> : <SignupPage />}
        />
        <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />

        {/* --- Main Application Routes --- */}
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          {/* Index route for /app */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="settings"
            element={
              <AdminRoute>
                <SettingsLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="team" replace />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="database" element={<DatabasePage />} />
            <Route path="schema" element={<SchemaPage />} />
          </Route>
        </Route>

        {/* Onboarding route is special - it's private but outside the main AppLayout */}
        <Route
          path="/app/onboarding"
          element={
            <PrivateRoute>
              <OnboardingPage />
            </PrivateRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

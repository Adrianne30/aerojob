// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

// Import pages
import Login from './pages/Login';
import Register from './pages/Register';
import OTPVerification from './pages/OTPVerification';
import Dashboard from './pages/Dashboard';
import JobSearch from './pages/JobSearch';
import Profile from './pages/Profile';
import CompanyManagement from './pages/CompanyManagement';
import JobManagement from './pages/JobManagement';
import Home from './pages/Home';
import AdminCreateUser from './pages/AdminCreateUser';
import ManageUsers from './pages/ManageUsers';
import RequireAdmin from './components/RequireAdmin';
import SurveyList from './pages/admin/SurveyList';
import SurveyBuilder from './pages/admin/SurveyBuilder';
import SurveyResponses from './pages/admin/SurveyResponses';
import SurveyResponsesPage from './pages/SurveyResponsesPage';

import './styles/globals.css';

// Protected Route component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (adminOnly && !isAdmin()) return <Navigate to="/dashboard" replace />;

  return children;
};

// Public Route component (redirect if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return children;
};

// Main App component
const AppContent = () => {
  const { loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/verify-otp"
            element={
              <PublicRoute>
                <OTPVerification />
              </PublicRoute>
            }
          />

          {/* Protected routes - for all authenticated users */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <JobSearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* ✅ NEW: Authenticated users can view survey responses page */}
          <Route
            path="/surveys/:id/responses"
            element={
              <ProtectedRoute>
                <SurveyResponsesPage />
              </ProtectedRoute>
            }
          />

          {/* Admin only routes */}
          <Route
            path="/admin/companies"
            element={
              <ProtectedRoute adminOnly={true}>
                <CompanyManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs"
            element={
              <ProtectedRoute adminOnly={true}>
                <JobManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly={true}>
                <ManageUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/create-user"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminCreateUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/surveys"
            element={
              <RequireAdmin>
                <SurveyList />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/surveys/new"
            element={
              <RequireAdmin>
                <SurveyBuilder />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/surveys/:id/edit"
            element={
              <RequireAdmin>
                <SurveyBuilder />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/surveys/:id/responses"
            element={
              <RequireAdmin>
                <SurveyResponses />
              </RequireAdmin>
            }
          />

          {/* 404 route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

// App wrapper
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#363636', color: '#fff' },
            success: { duration: 3000, iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error: { duration: 5000, iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;

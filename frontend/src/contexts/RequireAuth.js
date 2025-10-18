// src/components/RequireAuth.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null; // or a spinner
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}
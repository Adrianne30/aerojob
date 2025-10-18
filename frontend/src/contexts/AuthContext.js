// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { authAPI, setAuthToken } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_ERROR: 'SET_ERROR',
};

const initial = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    case ACTIONS.UPDATE_USER:
      return { ...state, user: action.payload };
    case ACTIONS.LOGOUT:
      return { ...initial, loading: false };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

function normalizeError(err, fallback = 'Something went wrong') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return fallback;
}

const getRoleFromUser = (u) => u?.role || u?.userType || u?.type || null;

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      return;
    }

    // Set auth header globally
    setAuthToken(token);

    // Try fetching current user
    authAPI
      .me()
      .then((user) => {
        dispatch({ type: ACTIONS.LOGIN_SUCCESS, payload: { user, token } });
      })
      .catch((err) => {
        console.warn('[AuthContext] /auth/me failed, clearing token', err);
        localStorage.removeItem('token');
        setAuthToken(null);
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      });
  }, []);

  async function login({ email, password }) {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const { user, token } = await authAPI.login({ email, password });

      // Save to localStorage
      localStorage.setItem('token', token);

      // Attach to axios globally
      setAuthToken(token);

      dispatch({ type: ACTIONS.LOGIN_SUCCESS, payload: { user, token } });
      toast.success('Logged in successfully');
      return { success: true, user };
    } catch (err) {
      const msg = normalizeError(err, 'Login failed');
      dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
      toast.error(msg);
      return { success: false, error: msg };
    }
  }

  function logout(showToast = true) {
    localStorage.removeItem('token');
    setAuthToken(null);
    dispatch({ type: ACTIONS.LOGOUT });
    if (showToast) toast('Logged out');
  }

  async function refreshMe() {
    try {
      const user = await authAPI.me();
      dispatch({ type: ACTIONS.UPDATE_USER, payload: user });
      return user;
    } catch {
      return null;
    }
  }

  function updateUser(patchOrFn) {
    const next =
      typeof patchOrFn === 'function'
        ? patchOrFn(state.user)
        : { ...(state.user || {}), ...(patchOrFn || {}) };
    dispatch({ type: ACTIONS.UPDATE_USER, payload: next });
    return next;
  }

  // Role helpers
  const role = getRoleFromUser(state.user);
  const hasRole = (...roles) => roles.includes(role);
  const isAdmin = () => role === 'admin';
  const isStudentOrAlumni = () => role === 'student' || role === 'alumni';

  const value = {
    ...state,
    login,
    logout,
    refreshMe,
    updateUser,
    role,
    hasRole,
    isAdmin,
    isStudentOrAlumni,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

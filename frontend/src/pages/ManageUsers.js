import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, Search, ShieldCheck, GraduationCap, User as UserIcon,
  Mail, ToggleLeft, ToggleRight, Trash2, RefreshCw
} from 'lucide-react';
import { usersAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const RoleBadge = ({ role }) => {
  const classMap = {
    admin: 'bg-purple-100 text-purple-700',
    student: 'bg-blue-100 text-blue-700',
    alumni: 'bg-amber-100 text-amber-700'
  };
  const Icon = role === 'admin' ? ShieldCheck : role === 'student' ? GraduationCap : UserIcon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${classMap[role] || 'bg-gray-100 text-gray-700'}`}>
      <Icon className="w-3.5 h-3.5" />
      {role?.charAt(0).toUpperCase() + role?.slice(1)}
    </span>
  );
};

const StatusBadge = ({ active }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
    {active ? 'Active' : 'Inactive'}
  </span>
);

export default function ManageUsers() {
  const location = useLocation();
  const navigate = useNavigate();

  
  const [banner, setBanner] = useState(() =>
    location.state?.message
      ? { type: location.state.success ? 'success' : 'error', text: location.state.message }
      : { type: null, text: '' }
  );
  const [serverError, setServerError] = useState('');

  // raw + ui state
  const [loading, setLoading] = useState(true);
  const [usersAll, setUsersAll] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');    
  const [selectedCourse, setSelectedCourse] = useState('all'); 
  const [courseOptions, setCourseOptions] = useState([]);     

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);


  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setServerError('');
        const arr = await usersAPI.list();
        setUsersAll(Array.isArray(arr) ? arr:[]);
      } catch (err) {
        console.error('Failed to fetch users', err);
        setServerError('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (location.state?.message) navigate(location.pathname, { replace: true });
  }, [location, navigate]);

  /* ---------- Course derivation (from current users) ---------- */
  const getCourseOf = (u) => {
    if (!u || (u.userType !== 'student' && u.userType !== 'alumni')) return '';
    if (u.course?.name) return String(u.course.name).trim();
    if (typeof u.course === 'string' && u.course.trim()) return u.course.trim();
    if (typeof u.yearCourse === 'string' && u.yearCourse.includes('•')) {
  
      const right = u.yearCourse.split('•')[1];
      return right ? right.trim() : '';
    }
    return '';
  };

  useEffect(() => {
    const uniq = Array.from(new Set(usersAll.map(getCourseOf).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    setCourseOptions(uniq);

    if (selectedCourse !== 'all' && !uniq.includes(selectedCourse)) {
      setSelectedCourse('all');
    }
  }, [usersAll]); 

  /* ---------- Filtering + pagination (client-side) ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usersAll.filter(u => {
      const matchSearch =
        !q ||
        `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q);

      const matchRole = !role || u.userType === role;

      const matchStatus =
        !status ||
        (status === 'active' ? !!u.isActive : !u.isActive);

      const course = getCourseOf(u);
      const matchCourse =
        selectedCourse === 'all' || selectedCourse === '' || course === selectedCourse;

      return matchSearch && matchRole && matchStatus && matchCourse;
    });
  }, [usersAll, search, role, status, selectedCourse]); // eslint-disable-line

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  /* ---------- Actions ---------- */
  const handleToggleActive = async (user) => {
    const want = !user.isActive;
    if (!window.confirm(`${want ? 'Activate' : 'Deactivate'} ${user.firstName} ${user.lastName}?`)) return;

    try {
      setServerError('');
      // optimistic update
      setUsersAll(prev => prev.map(u => (u._id === user._id ? { ...u, isActive: want } : u)));
      await usersAPI.update(user._id, { isActive: want });
      setBanner({ type: 'success', text: `User has been ${want ? 'activated' : 'deactivated'} successfully` });
    } catch (err) {
      console.error('Toggle active failed', err);
      // revert
      setUsersAll(prev => prev.map(u => (u._id === user._id ? { ...u, isActive: user.isActive } : u)));
      setBanner({ type: 'error', text: 'Error updating user status' });
      setServerError('Failed to update user status');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
    try {
      setServerError('');
      const before = usersAll;
      setUsersAll(prev => prev.filter(u => u._id !== user._id)); // optimistic
      await usersAPI.remove(user._id);
      setBanner({ type: 'success', text: 'User deleted successfully' });
    } catch (err) {
      console.error('Delete user failed', err);
      setServerError('Failed to delete user');
      setBanner({ type: 'error', text: 'Error deleting user' });
    }
  };

  const handleReset = () => {
    setSearch('');
    setRole('');
    setStatus('');
    setSelectedCourse('all'); // NEW
    setPage(1);
  };

  /* ---------- Render ---------- */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600" />
            Manage Users
          </h1>
          <p className="text-sm text-gray-600">
            View, search, and manage all users in the platform
          </p>
        </div>
        <Link to="/admin/create-user" className="btn btn-primary inline-flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Create User
        </Link>
      </div>

      {/* Banner */}
      {banner.type && banner.text && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            banner.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {banner.text}
        </div>
      )}
      {serverError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="form-label">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="input pl-10"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="form-label">Role</label>
            <select
              className="input"
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
            >
              <option value="">All roles</option>
              <option value="student">Student</option>
              <option value="alumni">Alumni</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="form-label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* NEW row: Course + rows per page + reset */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Course */}
          <div className="md:col-span-2">
            <label className="form-label">Course</label>
            <select
              className="input"
              value={selectedCourse}
              onChange={(e) => { setSelectedCourse(e.target.value); setPage(1); }}
            >
              <option value="all">All</option>
              {courseOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Rows per page */}
          <div>
            <label className="form-label">Rows per page</label>
            <select
              className="input"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Reset */}
          <div className="flex items-end">
            <button
              type="button"
              className="btn btn-outline inline-flex items-center gap-2"
              onClick={handleReset}
              title="Reset filters"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-base">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Year/Course</th>
                <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-8">
                    <div className="flex items-center justify-center">
                      <LoadingSpinner text="Loading users..." />
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-8 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                paginated.map((u) => (
                  <tr key={u._id}>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {`${u.firstName || ''} ${u.lastName || ''}`.trim() || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-gray-700">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {u.email || '—'}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <RoleBadge role={u.userType} />
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-gray-700">
                      {u.userType === 'student' || u.userType === 'alumni'
                        ? [u.yearLevel, u.course?.name || u.course || getCourseOf(u)].filter(Boolean).join(' • ')
                        : '—'}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <StatusBadge active={!!u.isActive} />
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="text-gray-600 hover:text-primary-600 inline-flex items-center gap-1"
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {u.isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4" /> Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" /> Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        {!loading && (
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pageSafe} of {totalPages} • {total} total
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-outline btn-sm"
                disabled={pageSafe <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="btn btn-outline btn-sm"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

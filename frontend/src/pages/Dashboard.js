// src/pages/Dashboard.js
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Building2,
  BarChart3,
  TrendingUp,
  FileText,
  UserCheck,
  Paintbrush,
  ClipboardList,
  Eye,
  ListChecks,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, usersAPI, surveysAPI, studentAPI } from '../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

// Charts
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* -------------------- Theme colors for charts -------------------- */
const THEME_COLORS = {
  default: { primary: 'rgba(37, 99, 235, 0.72)', secondary: 'rgba(96, 165, 250, 0.62)' },
  emerald: { primary: 'rgba(5, 150, 105, 0.72)', secondary: 'rgba(52, 211, 153, 0.62)' },
  rose: { primary: 'rgba(225, 29, 72, 0.72)', secondary: 'rgba(251, 113, 133, 0.62)' },
  philsca: { primary: 'rgba(217, 119, 6, 0.72)', secondary: 'rgba(251, 191, 36, 0.62)' },
};

const THEMES = [
  { id: 'default', name: 'Default (Blue)', className: 'theme-default' },
  { id: 'emerald', name: 'Emerald', className: 'theme-emerald' },
  { id: 'rose', name: 'Rose', className: 'theme-rose' },
  { id: 'philsca', name: 'PhilSCA (Gold)', className: 'theme-philsca' },
];

const initialStats = {
  totalJobs: 0,
  totalCompanies: 0,
  totalUsers: 0,
  pendingApproval: 0,
  newUsers: 0,
  // Optional analytics
  roleCounts: { students: 0, alumni: 0, admins: 0 },
  topSearches: [],
  studentsByCourse: [], 
};

export default function Dashboard() {
  const { user, isAdmin, isStudentOrAlumni } = useAuth();
  const [stats, setStats] = useState(initialStats);
  const [studentStats, setStudentStats] = useState({
  availableJobs: 0,
  jobsViewed: 0,
  companies: 0,
});

  const [loading, setLoading] = useState(true);

  // === Student Surveys modal state (no impact to admin) ===
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [pendingSurveys, setPendingSurveys] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(null);
  const openBtnRef = useRef(null);

  // Theme state (admins can switch; stored locally)
  const [adminTheme, setAdminTheme] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('admin_theme')) || 'default'
  );
  const themeClass = THEMES.find(t => t.id === adminTheme)?.className || 'theme-default';
  const themeColors = THEME_COLORS[adminTheme] || THEME_COLORS.default;

  useEffect(() => {
    if (isAdmin()) localStorage.setItem('admin_theme', adminTheme);
  }, [adminTheme, isAdmin]);

  /* -------------------- Fetch counts + users (build charts client-side) -------------------- */
  useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      setLoading(true);

      if (isAdmin()) {
        // 🧠 ADMIN DASHBOARD
        const [s, users] = await Promise.all([
          adminAPI.getStats().catch(() => null),
          usersAPI.list().catch(() => []),
        ]);
        // Try to safely fetch jobs list from common adminAPI methods (optional chaining to avoid runtime errors).
        let jobsList = null;
        try {
          jobsList =
            (await adminAPI.listJobs?.().catch(() => null)) ||
            (await adminAPI.getJobs?.().catch(() => null)) ||
            (await adminAPI.list?.().catch(() => null)) ||
            null;
        } catch (e) {
          jobsList = null;
        }
        if (!mounted) return;
 
        const nextStats = {
          // prefer server value, otherwise fall back to jobsList length (if available)
          totalJobs: Number(s?.totalJobs ?? (Array.isArray(jobsList) ? jobsList.length : 0)),
          totalCompanies: Number(s?.totalCompanies || 0),
          totalUsers: Number(s?.totalUsers || 0),
          pendingApproval: Number(s?.pendingApproval || 0),
          // prefer server value, otherwise compute from users list (last 30 days)
          newUsers: Number(s?.newUsers ?? 0),
          roleCounts: s?.roleCounts || { students: 0, alumni: 0, admins: 0 },
          topSearches: Array.isArray(s?.topSearches) ? s.topSearches : [],
          studentsByCourse: Array.isArray(s?.studentsByCourse)
            ? s.studentsByCourse
            : [],
        };
 
        // If server didn't provide newUsers, compute from users list (createdAt / created_at / created)
        if (!Number(s?.newUsers) && Array.isArray(users)) {
          const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const computedNewUsers = users.reduce((acc, u) => {
            const created = u?.createdAt ?? u?.created_at ?? u?.created ?? null;
            if (!created) return acc;
            const ts = new Date(created).getTime();
            return acc + (isNaN(ts) ? 0 : ts >= cutoff ? 1 : 0);
          }, 0);
          nextStats.newUsers = Number(computedNewUsers || 0);
        }
 
         // 🧮 Compute fallback role counts if not included in API
         const computedRoleCounts = (() => {
           const counts = { admins: 0, students: 0, alumni: 0 };
           if (Array.isArray(users)) {
             for (const u of users) {
               const role = (u?.role || u?.userType || '').toLowerCase();
               if (role === 'admin') counts.admins += 1;
               else if (role === 'student') counts.students += 1;
               else if (role === 'alumni') counts.alumni += 1;
             }
           }
           return counts;
         })();
 
        // 🧮 Compute fallback students-by-course if missing
        const computedStudentsByCourse = (() => {
          const map = {};
          if (Array.isArray(users)) {
            for (const u of users) {
              const role = (u?.role || u?.userType || '').toLowerCase();
              if (role !== 'student') continue;
              const course =
                u?.course || u?.program || u?.degree || 'Unknown';
              map[course] = (map[course] || 0) + 1;
            }
          }
          return Object.entries(map)
            .map(([course, total]) => ({ course, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 15);
        })();
 
        nextStats.roleCounts =
          Object.values(nextStats.roleCounts || {}).some((v) => Number(v) > 0)
            ? nextStats.roleCounts
            : computedRoleCounts;
 
        nextStats.studentsByCourse =
          Array.isArray(nextStats.studentsByCourse) &&
          nextStats.studentsByCourse.length > 0
            ? nextStats.studentsByCourse
            : computedStudentsByCourse;
 
        if (!nextStats.totalUsers && Array.isArray(users)) {
          nextStats.totalUsers = users.length;
        }
 
        setStats(nextStats);
      } else if (isStudentOrAlumni()) {
        // 🧠 STUDENT / ALUMNI DASHBOARD
        const s = await studentAPI.getStats().catch(() => null);
        if (!mounted) return;
 
        setStudentStats({
          availableJobs: s?.availableJobs || 0,
          jobsViewed: s?.jobsViewed || 0,
          companies: s?.companies || 0,
        });
      }
    } catch (e) {
      console.error('Failed to load dashboard:', e);
      if (isAdmin()) setStats(initialStats);
    } finally {
      if (mounted) setLoading(false);
    }
  })();

  return () => {
    mounted = false;
  };
  // changed dependencies: ensure we re-run when auth/user state or these helpers change
}, [isAdmin, isStudentOrAlumni, user]);


  /* -------------------- Helpers: open/close surveys modal -------------------- */
  const openSurveysModal = async () => {
    setSurveyModalOpen(true);
    setPendingLoading(true);
    setPendingError(null);
    try {
      const list = await surveysAPI.forMe();
      setPendingSurveys(Array.isArray(list) ? list : []);
    } catch (e) {
      const msg = e?.message || 'Failed to load surveys';
      setPendingError(msg);
      toast.error(msg);
    } finally {
      setPendingLoading(false);
    }
  };

  const closeSurveysModal = () => {
    setSurveyModalOpen(false);
    // return focus to opener for accessibility
    if (openBtnRef.current) {
      openBtnRef.current.focus();
    }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  /* -------------------- Small UI helpers -------------------- */
  const StatCard = ({ icon: Icon, title, value }) => (
    <div className="stats-card p-4 text-center">
      <div className="w-9 h-9 bg-primary-100 text-primary-600 rounded-md flex items-center justify-center mb-2 mx-auto">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xl font-semibold text-gray-900">{value ?? 0}</div>
      <div className="text-xs text-gray-600">{title}</div>
    </div>
  );

  const hasRoleData = Object.values(stats.roleCounts || {}).some(v => Number(v) > 0);
  const hasSearchData = Array.isArray(stats.topSearches) && stats.topSearches.length > 0;
  const hasCourseData = Array.isArray(stats.studentsByCourse) && stats.studentsByCourse.length > 0;

  const roleData = {
    labels: ['Students', 'Alumni', 'Admins'],
    datasets: [
      {
        label: 'Users',
        data: [
          Number(stats.roleCounts?.students || 0),
          Number(stats.roleCounts?.alumni || 0),
          Number(stats.roleCounts?.admins || 0),
        ],
        backgroundColor: themeColors.primary,
        borderRadius: 6,
      },
    ],
  };

  const searchesData = {
    labels: stats.topSearches.map(s => s.term),
    datasets: [
      {
        label: 'Searches',
        data: stats.topSearches.map(s => Number(s.total || s.count || 0)),
        backgroundColor: themeColors.secondary,
        borderRadius: 6,
      },
    ],
  };

  const coursesData = {
    labels: stats.studentsByCourse.map(c => c.course || 'Unknown'),
    datasets: [
      {
        label: 'Students',
        data: stats.studentsByCourse.map(c => Number(c.total || c.count || 0)),
        backgroundColor: themeColors.primary,
        borderRadius: 6,
      },
    ],
  };

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { titleFont: { size: 12 }, bodyFont: { size: 11 } } },
    scales: {
      x: { ticks: { font: { size: 11 }, color: '#4B5563' }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { font: { size: 11 }, color: '#4B5563', stepSize: 1 }, grid: { color: '#E5E7EB' } },
    },
    elements: { bar: { borderSkipped: false } },
  };

  const verticalOptions = baseOptions;
  const horizontalOptions = { ...baseOptions, indexAxis: 'y' };

  /* -------------------- Admin wrapper adds CSS variables per theme -------------------- */
  const AdminWrapper = ({ children }) => (
    <div className={`admin-portal ${themeClass}`}>
      <style>{`
        .admin-portal.theme-default { --primary-100: 219 234 254; --primary-400: 96 165 250; --primary-600: 37 99 235; --primary-700: 29 78 216; }
        .admin-portal.theme-emerald { --primary-100: 209 250 229; --primary-400: 52 211 153; --primary-600: 5 150 105; --primary-700: 4 120 87; }
        .admin-portal.theme-rose    { --primary-100: 255 228 230; --primary-400: 251 113 133; --primary-600: 225 29 72;  --primary-700: 190 18 60; }
        .admin-portal.theme-philsca { --primary-100: 254 243 199; --primary-400: 251 191 36;  --primary-600: 217 119 6;  --primary-700: 180 83 9; }
        .admin-portal .text-primary-600 { color: rgb(var(--primary-600)) !important; }
        .admin-portal .bg-primary-100 { background-color: rgb(var(--primary-100)) !important; }
        .admin-portal .btn-primary { background-color: rgb(var(--primary-600)) !important; }
        .admin-portal .btn-primary:hover { background-color: rgb(var(--primary-700)) !important; }
      `}</style>
      {children}
    </div>
  );
  /* -------------------- Admin page -------------------- */
  const adminPage = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            Welcome back, {user?.firstName || 'Admin'}!
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage the AeroJob platform and monitor system activity.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-gray-700">
          <Paintbrush className="w-4 h-4 text-primary-600" />
          <span>Theme</span>
          <select
            value={adminTheme}
            onChange={(e) => setAdminTheme(e.target.value)}
            className="input w-auto py-1 px-2 text-xs"
          >
            {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Briefcase} title="Total Jobs" value={stats.totalJobs} />
        <StatCard icon={FileText} title="Pending Approval" value={stats.pendingApproval} />
        <StatCard icon={Users} title="Total Users" value={stats.totalUsers} />
        <StatCard icon={UserCheck} title="New Users (30d)" value={stats.newUsers} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-primary-600" />
              Total Users by Role
            </h3>
          </div>
          <div className="p-4 h-48">
            {hasRoleData ? (
              <Bar data={roleData} options={verticalOptions} />
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">No data available</div>
            )}
          </div>
          <div className="px-4 py-2 text-[11px] text-gray-500 border-t">
            Shows current totals per role.
          </div>
        </div>

        <div className="card">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-primary-600" />
              Most Searched Jobs
            </h3>
          </div>
          <div className="p-4 h-48">
            {hasSearchData ? (
              <Bar data={searchesData} options={{ ...horizontalOptions, indexAxis: 'y' }} />
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">No data available</div>
            )}
          </div>
          <div className="px-4 py-2 text-[11px] text-gray-500 border-t">
            Aggregated searches by users & alumni.
          </div>
        </div>
      </div>

      {/* Charts Row 2 - Students per Course */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-primary-600" />
              Students per Course
            </h3>
          </div>
          <div className="p-4 h-56">
            {hasCourseData ? (
              <Bar data={coursesData} options={{ ...horizontalOptions, indexAxis: 'y' }} />
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">No data available</div>
            )}
          </div>
          <div className="px-4 py-2 text-[11px] text-gray-500 border-t">
            Counts include users with the Student role. “Unknown” means no course set.
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link to="/admin/jobs" className="card p-5 text-center hover:shadow-sm transition-shadow">
            <Briefcase className="w-7 h-7 text-primary-600 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Manage Jobs</h4>
            <p className="text-gray-600 text-xs">Approve and manage job postings</p>
          </Link>
          <Link to="/admin/companies" className="card p-5 text-center hover:shadow-sm transition-shadow">
            <Building2 className="w-7 h-7 text-primary-600 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Manage Companies</h4>
            <p className="text-gray-600 text-xs">View and manage company profiles</p>
          </Link>
          <Link to="/admin/users" className="card p-5 text-center hover:shadow-sm transition-shadow">
            <Users className="w-7 h-7 text-primary-600 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 text-sm mb-1">View Users</h4>
            <p className="text-gray-600 text-xs">Monitor user activity and statistics</p>
          </Link>
          <Link to="/admin/surveys" className="card hover:shadow-md transition">
            <div className="card-body flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gray-100">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold">Survey</div>
                <div className="text-xs opacity-70">Create questions & view responses</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );

  /* -------------------- Student/Alumni page with Surveys modal button -------------------- */
  const userPage = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            Welcome back, {user?.firstName || user?.name || 'there'}!
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Discover new opportunities and track your job search progress.
          </p>
        </div>

        {/* Surveys trigger (students/alumni only) */}
        {isStudentOrAlumni() && (
          <button
            ref={openBtnRef}
            onClick={openSurveysModal}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:shadow-sm"
            aria-haspopup="dialog"
            aria-expanded={surveyModalOpen}
          >
            <ListChecks className="w-4 h-4 text-primary-600" />
            Surveys
            {pendingSurveys?.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary-100 text-primary-600 text-[11px]">
                {pendingSurveys.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Use studentStats (was using admin `stats` that remained zero) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Briefcase} title="Available Jobs" value={studentStats.availableJobs} />
        <StatCard icon={Eye} title="Jobs Viewed" value={studentStats.jobsViewed} />
        <StatCard icon={Building2} title="Companies" value={studentStats.companies} />
      </div>

      {/* Modal */}
      {surveyModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closeSurveysModal}
          />
          {/* modal panel */}
          <div className="relative z-[101] w-full sm:max-w-md mx-3 sm:mx-0 rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary-600" />
                <h3 className="text-sm font-semibold text-gray-900">Available Surveys</h3>
              </div>
              <button
                onClick={closeSurveysModal}
                className="p-1 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-auto">
              {pendingLoading && (
                <div className="text-sm text-gray-600">Loading surveys…</div>
              )}

              {!pendingLoading && pendingError && (
                <div className="text-sm text-red-600">{pendingError}</div>
              )}

              {!pendingLoading && !pendingError && (
                <>
                  {pendingSurveys.length === 0 ? (
                    <div className="text-sm text-gray-600">No surveys to answer 🎉</div>
                  ) : (
                    <ul className="space-y-2">
                      {pendingSurveys.map((s) => (
                        <li key={s._id} className="border rounded-md p-3">
                          <div className="font-medium text-gray-900">
                            {s.title || 'Untitled survey'}
                          </div>
                          {s.description && (
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {s.description}
                            </div>
                          )}
                          <div className="mt-2">
                            <Link
                              to={`/surveys/${s._id}`}
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                              onClick={closeSurveysModal}
                            >
                              Take survey
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return isAdmin() ? <AdminWrapper>{adminPage}</AdminWrapper> : userPage;
}

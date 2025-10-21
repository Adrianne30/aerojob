// src/pages/JobManagement.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Filter,
  Trash2,
  CheckCircle2,
  Pencil,
  PauseCircle,
  PlayCircle,
  ArchiveRestore
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { jobsAPI, companiesAPI } from '../utils/api';
import { Briefcase } from "lucide-react"; 

const PAGE_SIZES = [10, 25, 50];

// Use lowercase values (match Mongoose enum); keep nice labels for UI
const JOB_TYPES = [
  { value: 'internship', label: 'Internship' },
  { value: 'ojt', label: 'OJT' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'contract', label: 'Contract' }
];
const jobTypeLabel = (val) => JOB_TYPES.find(t => t.value === (val || ''))?.label || (val || '—');

// Match your model enum exactly (no "archived")
const STATUS_STATES = ['active', 'inactive', 'closed', 'draft'];

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

export default function JobManagement() {
  // Data
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Filters & table state
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');       // holds lowercase values or 'all'
  const [category, setCategory] = useState('all');

  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Modal / form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    company: '',
    jobType: 'internship', // lowercase value
    location: '',
    category: '',          // UI single-select; we’ll map to categories[]
    shortDescription: '',
    description: '',
    status: 'active',
    approvalStatus: 'pending', // UI only; maps to isApproved
  });

  const resetForm = () => {
    setEditing(null);
    setForm({
      title: '',
      company: '',
      jobType: 'internship',
      location: '',
      category: '',
      shortDescription: '',
      description: '',
      status: 'active',
      approvalStatus: 'pending',
    });
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (job) => {
    setEditing(job);
    setForm({
      title: job.title || '',
      company: job.company?._id || job.company || '',
      jobType: String(job.jobType || 'internship').toLowerCase(),
      location: job.location || '',
      category: Array.isArray(job.categories) ? (job.categories[0] || '') : '',
      shortDescription: job.shortDescription || '',
      description: job.description || '',
      status: job.status || 'active',
      approvalStatus: job.isApproved ? 'approved' : 'pending',
    });
    setShowForm(true);
  };

  // Fetch data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [jobsRaw, catsRaw, compsRaw] = await Promise.all([
          jobsAPI.list?.({ includeCompany: true }).catch(() => []),
          jobsAPI.get('/jobs/categories').then(r => Array.isArray(r?.data) ? r.data : []).catch(() => []),
          companiesAPI.list?.().catch?.(() => []) || Promise.resolve([]),
        ]);
        setJobs(Array.isArray(jobsRaw) ? jobsRaw : jobsRaw?.jobs || []);
        setCategories(Array.isArray(catsRaw) ? catsRaw : []);
        setCompanies(Array.isArray(compsRaw) ? compsRaw : compsRaw?.companies || []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = async () => {
    try {
      setLoading(true);
      const jobsRaw = await (jobsAPI.list?.({ includeCompany: true }) ?? jobsAPI.get('/jobs').then(r => r.data));
      setJobs(Array.isArray(jobsRaw) ? jobsRaw : jobsRaw?.jobs || []);
      toast.success('Refreshed');
    } catch (e) {
      console.error(e);
      toast.error('Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  // Derived rows
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return jobs
      .filter(j => {
        if (status !== 'all' && (j.status || 'active') !== status) return false;
        if (type !== 'all' && String(j.jobType || '').toLowerCase() !== type) return false;
        if (category !== 'all') {
          const arr = Array.isArray(j.categories) ? j.categories : [];
          if (!arr.includes(category)) return false;
        }
        if (!k) return true;
        const hay = [
          j.title,
          j.shortDescription,
          j.description,
          j.location,
          ...(Array.isArray(j.categories) ? j.categories : []),
          j.jobType,
          j.company?.name
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(k);
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        let av = a[sortKey];
        let bv = b[sortKey];
        if (sortKey === 'company') {
          av = a.company?.name || '';
          bv = b.company?.name || '';
        }
        if (sortKey === 'createdAt' || sortKey === 'updatedAt') {
          return (new Date(av || 0) - new Date(bv || 0)) * dir;
        }
        return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
      });
  }, [jobs, q, status, type, category, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const rows = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const onHeaderClick = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Actions
  const confirm = (msg) =>
    new Promise((res) => (window.confirm(msg) ? res(true) : res(false)));

  const setApproval = async (job, approved = true) => {
    try {
      await jobsAPI.update(job._id, { isApproved: approved });
      setJobs((prev) =>
        prev.map((j) => (j._id === job._id ? { ...j, isApproved: approved } : j))
      );
      toast.success(approved ? 'Job approved' : 'Approval removed');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update approval');
    }
  };

  const toggleActive = async (job) => {
    const next = (job.status || 'active') === 'active' ? 'inactive' : 'active';
    try {
      await jobsAPI.update(job._id, { status: next });
      toast.success(next === 'active' ? 'Job reactivated' : 'Job set to inactive');
      setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, status: next } : j)));
    } catch (e) {
      console.error(e);
      toast.error('Failed to toggle status');
    }
  };

  const removeJob = async (job) => {
    const ok = await confirm(`Delete “${job.title}”? This cannot be undone.`);
    if (!ok) return;
    try {
      await jobsAPI.remove(job._id);
      setJobs((prev) => prev.filter((j) => j._id !== job._id));
      toast.success('Job deleted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete');
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();

    // Normalize payload to match your model (keep optional fields optional)
    const payload = {
      title: form.title,
      company: form.company,
      jobType: String(form.jobType).toLowerCase(),     // lowercase
      location: form.location || undefined,
      categories: form.category ? [form.category] : undefined, // array if chosen
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      status: form.status,
      isApproved: form.approvalStatus === 'approved',
    };

    // remove undefined keys
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    try {
      if (editing) {
        const updated = await jobsAPI.update(editing._id, payload);
        const job = updated?.job || updated;
        setJobs((prev) =>
          prev.map((j) =>
            j._id === editing._id
              ? {
                  ...j,
                  ...job, // trust server echo
                  company:
                    companies.find((c) => c._id === (job.company || payload.company)) ||
                    j.company,
                }
              : j
          )
        );
        toast.success('Job updated');
      } else {
        const created = await jobsAPI.create(payload);
        const newJob = created?.job || created;
        setJobs((prev) => [
          {
            ...newJob,
            company:
              companies.find((c) => c._id === (newJob.company || payload.company)) ||
              null,
          },
          ...prev,
        ]);
        toast.success('Job created');
      }
      setShowForm(false);
      resetForm();
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.message || 'Save failed (check enum values & required fields)'
      );
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold"> <Briefcase className="h-6 w-6 text-blue-600" /> Job Management</h1>
          <p className="text-sm text-gray-500">Create, approve, and manage all job postings.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Job
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 md:gap-3 mb-4">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search title, company, location…"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-gray-500 md:col-span-1">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-2 py-2 text-sm"
        >
          <option value="all">All Status</option>
          {STATUS_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-2 py-2 text-sm"
        >
          <option value="all">All Types</option>
          {JOB_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 md:justify-end md:col-span-1">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded-lg px-2 py-2 text-sm"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {[
                  ['title', 'Title'],
                  ['company', 'Company'],
                  ['jobType', 'Type'],
                  ['location', 'Location'],
                  ['categories', 'Category'],
                  ['createdAt', 'Posted'],
                  ['status', 'Status'],
                  ['isApproved', 'Approval'],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => onHeaderClick(key)}
                    className="px-3 py-2 font-medium text-left cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center gap-1">
                      {label}
                      {sortKey === key && (
                        <span className="text-xs">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10">
                    <div className="flex justify-center">
                      <LoadingSpinner />
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-gray-500">
                    No jobs found.
                  </td>
                </tr>
              ) : (
                rows.map((j) => (
                  <tr key={j._id} className="border-t hover:bg-gray-50/60">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 line-clamp-1">{j.title}</div>
                      {j.shortDescription && (
                        <div className="text-gray-500 line-clamp-1">{j.shortDescription}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">{j.company?.name || '—'}</td>
                    <td className="px-3 py-2">{jobTypeLabel(j.jobType)}</td>
                    <td className="px-3 py-2">{j.location || '—'}</td>
                    <td className="px-3 py-2">
                      {Array.isArray(j.categories) && j.categories.length > 0
                        ? j.categories.join(', ')
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {j.createdAt ? new Date(j.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {(j.status || 'active') === 'active' ? (
                        <Badge className="bg-green-100 text-green-700">active</Badge>
                      ) : j.status === 'draft' ? (
                        <Badge className="bg-amber-100 text-amber-700">draft</Badge>
                      ) : j.status === 'inactive' ? (
                        <Badge className="bg-gray-100 text-gray-700">inactive</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">{j.status}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {j.isApproved ? (
                        <Badge className="bg-blue-100 text-blue-700">approved</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">pending</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Edit"
                          onClick={() => openEdit(j)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {!j.isApproved ? (
                          <button
                            title="Approve"
                            onClick={() => setApproval(j, true)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            title="Remove approval"
                            onClick={() => setApproval(j, false)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          title={(j.status || 'active') === 'active' ? 'Set inactive' : 'Activate'}
                          onClick={() => toggleActive(j)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          {(j.status || 'active') === 'active' ? (
                            <PauseCircle className="w-4 h-4" />
                          ) : (
                            <PlayCircle className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          title="Delete"
                          onClick={() => removeJob(j)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
          <div className="text-gray-500">
            Page <span className="font-medium">{pageSafe}</span> of{' '}
            <span className="font-medium">{totalPages}</span> · Showing{' '}
            <span className="font-medium">{rows.length}</span> of{' '}
            <span className="font-medium">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pageSafe === 1}
              onClick={() => setPage(1)}
              className="px-2 py-1 rounded border disabled:opacity-50"
            >
              ⟪
            </button>
            <button
              disabled={pageSafe === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border disabled:opacity-50"
            >
              ‹
            </button>
            <button
              disabled={pageSafe === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded border disabled:opacity-50"
            >
              ›
            </button>
            <button
              disabled={pageSafe === totalPages}
              onClick={() => setPage(totalPages)}
              className="px-2 py-1 rounded border disabled:opacity-50"
            >
              ⟫
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Job' : 'New Job'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <form onSubmit={submitForm} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <select
                  required
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select company</option>
                  {companies?.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={form.jobType}
                  onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {JOB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Short Description</label>
                <input
                  value={form.shortDescription}
                  onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={5}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {STATUS_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Approval</label>
                <select
                  value={form.approvalStatus}
                  onChange={(e) => setForm((f) => ({ ...f, approvalStatus: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg border">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  {editing ? 'Save changes' : 'Create job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

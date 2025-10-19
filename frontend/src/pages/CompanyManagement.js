import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, Search, ExternalLink, Image as ImageIcon, Pencil } from 'lucide-react';
import { companiesAPI, jobsAPI, uploadsAPI, absoluteUrl } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Building2 } from "lucide-react";

const defaultForm = {
  _id: '',
  name: '',
  location: '',
  website: '',
  email: '',
  phone: '',
  description: '',
  logoUrl: '',
};

const CompanyManagement = () => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch companies + jobs
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [compRaw, jobRaw] = await Promise.all([
          companiesAPI.list(),
          jobsAPI.list().catch(() => []),
        ]);

        const compList = Array.isArray(compRaw) ? compRaw : compRaw?.companies || [];
        const jobList = Array.isArray(jobRaw) ? jobRaw : jobRaw?.jobs || [];

        setCompanies(compList);
        setJobs(jobList);
      } catch (e) {
        console.error('CompanyManagement load fail:', e);
        toast.error(e?.message || 'Failed to load companies');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const jobsPerCompany = useMemo(() => {
    const map = {};
    for (const j of jobs || []) {
      const cid = typeof j.company === 'object' ? j.company?._id : j.company;
      if (!cid) continue;
      map[cid] = (map[cid] || 0) + 1;
    }
    return map;
  }, [jobs]);

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.website?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [companies, query]);

  const openModal = (company = null) => {
    if (company) {
      setForm({ ...company });
      setIsEditing(true);
    } else {
      setForm(defaultForm);
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(defaultForm);
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Upload logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadsAPI.uploadCompanyLogo(file);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      toast.success('Logo uploaded');
    } catch (err) {
      console.error('Logo upload failed:', err);
      toast.error(err?.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Company name is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name?.trim(),
        location: form.location?.trim() || '',
        website: form.website?.trim() || '',
        email: form.email?.trim() || '',
        phone: form.phone?.trim() || '',
        description: form.description?.trim() || '',
        logoUrl: form.logoUrl || '',
      };

      let updatedCompany;
      if (isEditing && form._id) {
        const updatedRaw = await companiesAPI.update(form._id, payload);
        updatedCompany = updatedRaw?.company || updatedRaw;
        setCompanies((prev) =>
          prev.map((c) => (c._id === form._id ? updatedCompany : c))
        );
        toast.success('Company updated');
      } else {
        const createdRaw = await companiesAPI.create(payload);
        const created = createdRaw?.company || createdRaw;
        setCompanies((prev) => [created, ...prev]);
        toast.success('Company added');
      }

      closeModal();
    } catch (err) {
      console.error('Save company failed:', err);
      toast.error(err?.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Building2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-semibold"> <Building2 className="h-6 w-6 text-blue-600" /> Company Management</h1>
          <p className="text-sm text-gray-500">
            Manage all partner companies in the system
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Add Company
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200"
            placeholder="Search companies by name, location, website, email…"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Website</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Jobs</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.map((c) => (
              <tr key={c._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  {c.logoUrl && (
                    <img
                      src={absoluteUrl(c.logoUrl)}
                      alt="logo"
                      className="h-8 w-8 object-contain rounded bg-gray-50 border"
                    />
                  )}
                  {c.name || '-'}
                </td>
                <td className="px-4 py-3">{c.location || '-'}</td>
                <td className="px-4 py-3">
                  {c.website ? (
                    <a
                      href={
                        /^https?:\/\//i.test(c.website)
                          ? c.website
                          : `https://${c.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      Visit <ExternalLink size={14} />
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-3">{c.email || '-'}</td>
                <td className="px-4 py-3">{c.phone || '-'}</td>
                <td className="px-4 py-3">{jobsPerCompany[c._id] || 0}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => openModal(c)}
                    className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    <Pencil size={16} /> Edit
                  </button>
                </td>
              </tr>
            ))}
            {filteredCompanies.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                  No companies found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {isEditing ? 'Edit Company' : 'Add New Company'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Logo upload */}
              <div>
                <label className="text-sm font-medium">Company Logo</label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
                    <ImageIcon size={16} /> {uploading ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                  </label>
                  {form.logoUrl && (
                    <img
                      src={absoluteUrl(form.logoUrl)}
                      alt="preview"
                      className="h-10 w-10 object-contain rounded border"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Company Name *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Website</label>
                  <input
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
                >
                  {saving
                    ? 'Saving…'
                    : isEditing
                    ? 'Save Changes'
                    : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;

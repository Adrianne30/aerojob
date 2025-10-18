import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { surveysAPI } from '../../utils/api';
import { Eye, Edit3, Trash2 } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const active = String(status).toLowerCase() === 'active';
  const cls = active
    ? 'text-green-700 bg-green-50 ring-1 ring-inset ring-green-200'
    : 'text-red-700 bg-red-50 ring-1 ring-inset ring-red-200';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
};

export default function SurveyList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await surveysAPI.list(); // GET /api/surveys
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial fetch
  useEffect(() => {
    load();
  }, [load]);

  // refetch when navigating back or when a child page asks to refresh
  useEffect(() => {
    load();
  }, [location.key, location.state?.refresh, load]);

  // bonus: refetch when the window regains focus
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          Surveys
        </h1>
        <Link to="/admin/surveys/new" className="btn btn-primary">
          + New Survey
        </Link>
      </div>

      <div className="grid gap-4">
        {items.map((s) => (
          <div key={s._id} className="card">
            <div className="card-body flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{s.title}</h2>
                  <StatusBadge status={s.status} />
                </div>
                {s.description && (
                  <div className="text-gray-600">{s.description}</div>
                )}
                <div className="text-sm opacity-70 mt-1">
                  Audience: {String(s.audience || '').toUpperCase()} •{' '}
                  {s.questions?.length || 0} questions
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={`/admin/surveys/${s._id}/responses`}
                  className="btn btn-outline"
                >
                  <Eye className="w-4 h-4 mr-1" /> Responses
                </Link>
                <Link
                  to={`/admin/surveys/${s._id}/edit`}
                  className="btn btn-outline"
                >
                  <Edit3 className="w-4 h-4 mr-1" /> Edit
                </Link>
                <button
                  className="btn btn-ghost text-error"
                  onClick={async () => {
                    if (!window.confirm('Delete this survey?')) return;
                    await surveysAPI.remove(s._id);
                    load();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {!items.length && (
          <div className="text-center opacity-70">No surveys yet.</div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { surveysAPI } from '../../utils/api';

export default function SurveyResponses() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await surveysAPI.get(id);
      setSurvey(s);
      const data = await surveysAPI.responses(id, {
        role: filters.role || undefined,
      });
      setResponses(data);
    } finally {
      setLoading(false);
    }
  }, [id, filters.role]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header with Back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <h1 className="text-xl font-semibold">
          Responses — {survey?.title || 'Survey'}
        </h1>

        <div className="ml-auto flex items-center gap-2">
          <select
            className="input"
            value={filters.role}
            onChange={(e) =>
              setFilters((f) => ({ ...f, role: e.target.value }))
            }
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="alumni">Alumni</option>
          </select>

          <Link
            to="/admin/surveys"
            className="text-sm text-primary-600 hover:underline"
          >
            All Surveys
          </Link>
        </div>
      </div>

      {/* Responses list */}
      <div className="grid gap-4">
        {responses.map((r) => (
          <div key={r._id} className="card">
            <div className="card-body">
              <div className="text-sm opacity-70 mb-2">
                <b>{r.userId?.name || r.userId?.email || 'Anonymous'}</b> •{' '}
                {r.role} • {new Date(r.createdAt).toLocaleString()}
              </div>

              <div className="grid gap-3">
                {survey?.questions?.map((q) => {
                  const ans = r.answers.find(
                    (a) => String(a.questionId) === String(q._id)
                  );
                  return (
                    <div key={q._id}>
                      <div className="font-medium">
                        Q: {q.text}{' '}
                        {q.required && <span className="text-red-500">*</span>}
                      </div>
                      <div className="opacity-80">
                        {Array.isArray(ans?.value)
                          ? ans.value.join(', ')
                          : ans?.value ?? <i className="opacity-50">—</i>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {!responses.length && (
          <div className="text-center opacity-70">No responses yet.</div>
        )}
      </div>
    </div>
  );
}

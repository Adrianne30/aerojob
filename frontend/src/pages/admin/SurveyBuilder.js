import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { surveysAPI } from '../../utils/api';
import Toggle from '../../components/Toggle';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'rating', label: 'Rating' },
];

const emptyQuestion = () => ({
  text: '',
  type: 'short_text',
  required: false,
  options: [],
  optionsText: '', // <-- keep raw text for MCQ/checkbox while typing
});

export default function SurveyBuilder() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    audience: 'all',
    status: 'draft',
    questions: [emptyQuestion()],
  });

  const isActive = useMemo(() => form.status === 'active', [form.status]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const data = await surveysAPI.get(id);
        setForm({
          title: data.title || '',
          description: data.description || '',
          audience: (data.audience || 'all').toLowerCase(),
          status: (data.status || 'draft').toLowerCase(),
          questions: Array.isArray(data.questions) && data.questions.length
            ? data.questions.map(q => ({
                _id: q._id,
                text: q.text || '',
                type: (q.type || 'short_text').toLowerCase(),
                required: !!q.required,
                options: Array.isArray(q.options) ? q.options : [],
                optionsText: Array.isArray(q.options) ? q.options.join('\n') : '', // <-- hydrate text
              }))
            : [emptyQuestion()],
        });
      } catch (err) {
        console.error(err);
        alert('Failed to load survey.');
        navigate('/admin/surveys');
      }
    })();
  }, [id, isEdit, navigate]);

  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));
  const updateQ = (idx, patch) =>
    setForm(prev => {
      const next = [...prev.questions];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, questions: next };
    });

  const addQuestion = () =>
    setForm(prev => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }));

  const removeQuestion = (idx) =>
    setForm(prev => {
      const next = prev.questions.filter((_, i) => i !== idx);
      return { ...prev, questions: next.length ? next : [emptyQuestion()] };
    });

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        status: form.status === 'active' ? 'active' : 'draft',
        questions: form.questions.map(q => {
          const isChoice = q.type === 'multiple_choice' || q.type === 'checkbox';
          // Clean ONLY on save
          const cleanedOptions = isChoice
            ? String(q.optionsText ?? '')
                .split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0)
            : [];
          return {
            _id: q._id,
            text: q.text,
            type: q.type,
            required: !!q.required,
            options: cleanedOptions,
          };
        }),
      };

      if (isEdit) await surveysAPI.update(id, payload);
      else await surveysAPI.create(payload);

      navigate('/admin/surveys');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to save survey.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <h1 className="text-xl font-semibold">
          {isEdit ? 'Edit Survey' : 'New Survey'}
        </h1>

        <div className="ml-auto">
          <button
            disabled={saving}
            onClick={save}
            className="btn btn-primary btn-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main form */}
      <div className="card mb-6">
        <div className="card-body grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="label">Title</label>
            <input
              className="input w-full"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Survey title"
            />
          </div>

          <div className="">
            <label className="label">Audience</label>
            <select
              className="input w-full"
              value={form.audience}
              onChange={(e) => update({ audience: e.target.value })}
            >
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="textarea w-full"
              rows={3}
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Describe this survey"
            />
          </div>

          <div className="flex md:col-span-1 md:items-start md:justify-end">
            <div className="text-right">
              <label className="label mb-1 block text-right">Status</label>
              <div className="flex items-center justify-end gap-3">
                <Toggle
                  checked={isActive}
                  onChange={(on) => update({ status: on ? 'active' : 'draft' })}
                />
                <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs opacity-70 mt-1 max-w-[18rem] ml-auto">
                When Active, eligible students/alumni will be prompted to answer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Questions</h2>
        <button onClick={addQuestion} className="btn btn-ghost btn-sm inline-flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add question
        </button>
      </div>

      <div className="grid gap-4">
        {form.questions.map((q, i) => (
          <div key={q._id || i} className="card">
            <div className="card-body grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 flex items-center justify-between">
                <div className="text-sm font-medium">Q{i + 1}</div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Required</span>
                    <Toggle
                      checked={q.required}
                      onChange={(on) => updateQ(i, { required: on })}
                    />
                    <span className="text-sm opacity-80">
                      {q.required ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeQuestion(i)}
                    className="btn btn-ghost btn-xs text-error inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="label">Question Text</label>
                <input
                  className="input w-full"
                  value={q.text}
                  onChange={(e) => updateQ(i, { text: e.target.value })}
                  placeholder="Write your question"
                />
              </div>

              <div>
                <label className="label">Type</label>
                <select
                  className="input w-full"
                  value={q.type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    // if switching away from choice types, keep options but also set optionsText for future
                    updateQ(i, {
                      type: nextType,
                      optionsText:
                        nextType === 'multiple_choice' || nextType === 'checkbox'
                          ? (q.optionsText ?? (q.options || []).join('\n'))
                          : (q.optionsText ?? ''),
                    });
                  }}
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div />

              {(q.type === 'multiple_choice' || q.type === 'checkbox') && (
                <div className="md:col-span-2">
                  <label className="label">Options (one per line)</label>
                  <textarea
                    className="textarea w-full"
                    rows={3}
                    value={q.optionsText ?? (q.options || []).join('\n')}
                    onChange={(e) =>
                      // DO NOT trim/filter while typing; keep raw text
                      updateQ(i, {
                        optionsText: e.target.value,
                        options: e.target.value.split('\n'), // keep lines as-is during edit
                      })
                    }
                    placeholder={`e.g. Option A
Option B
Option C`}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

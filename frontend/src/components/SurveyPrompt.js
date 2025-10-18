// src/components/SurveyPrompt.js
import React, { useEffect, useMemo, useState } from 'react';
import { surveysAPI } from '../utils/api';
import { X, Star } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Props (optional; if omitted, it auto-fetches one eligible survey and opens)
 * - open?: boolean
 * - onClose?: () => void
 * - survey?: object
 * - onSubmitted?: () => void
 */
export default function SurveyPrompt(props) {
  const controlled = typeof props.open === 'boolean' || !!props.survey;

  const [internalOpen, setInternalOpen] = useState(false);
  const [internalSurvey, setInternalSurvey] = useState(null);

  const open = controlled ? props.open : internalOpen;
  const survey = controlled ? props.survey : internalSurvey;

  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  // Auto-prompt mode: fetch first eligible survey
  useEffect(() => {
    if (controlled) return;
    (async () => {
      try {
        const result = (surveysAPI.eligibleActive?.() || surveysAPI.forMe());
        const data = await result;
        const s = Array.isArray(data) ? data[0] : data;
        if (s) {
          setInternalSurvey(s);
          setInternalOpen(true);
        }
      } catch {/* ignore */}
    })();
  }, [controlled]);

  const questions = useMemo(() => {
    const arr = Array.isArray(survey?.questions) ? survey.questions : [];
    const sorted = [...arr].sort((a, b) => (a.order || 0) - (b.order || 0));
    return sorted.map((q, idx) => ({
      ...q,
      _qid: q._id || q.id || q.key || `q${idx}`,
      type: String(q.type || '').toLowerCase(),
      text: q.text || q.label || `Question ${idx + 1}`,
      options: Array.isArray(q.options) ? q.options : [],
      scaleMax: Number(q.scaleMax) > 0 ? Number(q.scaleMax) : 5,
    }));
  }, [survey]);

  // init/reset answers when survey/questions change
  useEffect(() => {
    const init = {};
    questions.forEach((q) => {
      if (q.type === 'checkbox' || q.type === 'multi') init[q._qid] = [];
      else init[q._qid] = '';
    });
    setAnswers(init);
  }, [questions]);

  if (!survey || !open) return null;

  const close = () => {
    if (controlled) props.onClose?.();
    else setInternalOpen(false);
  };

  const setAnswer = (qid, val) => setAnswers((a) => ({ ...a, [qid]: val }));

  const requiredMissing = () => {
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q._qid];
      if ((q.type === 'checkbox' || q.type === 'multi') && (!Array.isArray(v) || v.length === 0)) return q;
      if (q.type === 'rating' && (!v || Number(v) <= 0)) return q;
      if (!(q.type === 'checkbox' || q.type === 'multi' || q.type === 'rating') && (v === '' || v == null)) return q;
    }
    return null;
  };

  const submit = async () => {
    const miss = requiredMissing();
    if (miss) {
      toast.error(`Please answer: ${miss.text}`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        answers: questions.map((q) => ({
          questionId: q._id || q.id || q._qid,
          type: q.type,
          label: q.text,
          value: answers[q._qid],
        })),
      };
      const submitFn = surveysAPI.submit || surveysAPI.submitResponse;
      await submitFn(survey._id, payload);
      toast.success('Thanks! Your response has been submitted.');
      props.onSubmitted?.();
      close();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Submission failed');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Renderers ----------
  const Rating = ({ q }) => {
    const val = Number(answers[q._qid] || 0);
    const max = q.scaleMax || 5;
    return (
      <div className="flex items-center gap-2">
        {Array.from({ length: max }).map((_, i) => {
          const n = i + 1;
          const active = val >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setAnswer(q._qid, n)}
              className={`p-2 rounded-md border transition ${active ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}
            >
              <Star className={`w-5 h-5 ${active ? 'fill-yellow-400' : ''}`} />
            </button>
          );
        })}
        {val ? <span className="ml-2 text-sm opacity-70">{val}/{max}</span> : null}
      </div>
    );
  };

  const Question = ({ q }) => {
    const t = q.type;
    const val = answers[q._qid];

    if (t === 'text' || t === 'short' || t === 'short_text') {
      return (
        <input
          className="input w-full"
          type="text"
          value={val ?? ''}
          onChange={(e) => setAnswer(q._qid, e.target.value)}
          onKeyDownCapture={(e) => e.stopPropagation()}
        />
      );
    }
    if (t === 'textarea' || t === 'essay' || t === 'paragraph' || t === 'short_essay' || t === 'long_text') {
      return (
        <textarea
          className="textarea w-full"
          rows={3}
          value={val ?? ''}
          onChange={(e) => setAnswer(q._qid, e.target.value)}
          onKeyDownCapture={(e) => e.stopPropagation()}
        />
      );
    }
    if (t === 'radio' || t === 'choice' || t === 'single' || t === 'multiple_choice') {
      return (
        <div className="flex flex-col gap-2" onKeyDownCapture={(e) => e.stopPropagation()}>
          {q.options.map((opt) => {
            const id = `${q._qid}-${opt}`;
            return (
              <label key={id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={q._qid}
                  checked={val === opt}
                  onChange={() => setAnswer(q._qid, opt)}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }
    if (t === 'checkbox' || t === 'multi') {
      const arr = Array.isArray(val) ? val : [];
      const toggle = (opt) => {
        if (arr.includes(opt)) setAnswer(q._qid, arr.filter((x) => x !== opt));
        else setAnswer(q._qid, [...arr, opt]);
      };
      return (
        <div className="flex flex-col gap-2" onKeyDownCapture={(e) => e.stopPropagation()}>
          {q.options.map((opt) => {
            const id = `${q._qid}-${opt}`;
            const checked = arr.includes(opt);
            return (
              <label key={id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }
    if (t === 'rating') {
      return <Rating q={q} />;
    }
    // default -> text
    return (
      <input
        className="input w-full"
        type="text"
        value={val ?? ''}
        onChange={(e) => setAnswer(q._qid, e.target.value)}
        onKeyDownCapture={(e) => e.stopPropagation()}
      />
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      onKeyDownCapture={(e) => {
        // prevent backdrop/global listeners from eating Space/Enter
        e.stopPropagation();
      }}
    >
      {/* Panel */}
      <div
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-xl"
        onKeyDownCapture={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">{survey.title}</h3>
          <button type="button" onClick={close} className="btn btn-ghost" aria-label="Close">
            <X />
          </button>
        </div>

        <div className="p-4">
          {survey.description && <p className="mb-3 opacity-80">{survey.description}</p>}

          <div className="grid gap-4">
            {questions.map((q, idx) => (
              <div key={q._qid}>
                <div className="font-medium mb-1">
                  Q{idx + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}
                </div>
                <Question q={q} />
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <button type="button" className="btn btn-primary" disabled={saving} onClick={submit}>
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

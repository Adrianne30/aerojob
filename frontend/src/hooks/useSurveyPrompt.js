import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { surveysAPI } from '../utils/api';

export function useSurveyPrompt({ onFound, throttleMinutes = 60 } = {}) {
  const { isAuthenticated, isStudentOrAlumni } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !isStudentOrAlumni()) return;

    const now = Date.now();
    const last = Number(localStorage.getItem('survey_last_check') || 0);
    if (now - last < throttleMinutes * 60_000) return; // throttle checks

    (async () => {
      try {
        const list = await surveysAPI.eligible();
        localStorage.setItem('survey_last_check', String(Date.now()));

        // pick the first eligible survey not prompted this session
        const prompted = JSON.parse(localStorage.getItem('survey_prompted_ids') || '[]');
        const first = Array.isArray(list) ? list.find(s => !prompted.includes(s._id)) : null;
        if (!first) return;

        // remember we prompted it (so no spam if user bounces)
        localStorage.setItem('survey_prompted_ids', JSON.stringify([...prompted, first._id]));

        onFound?.(first);
      } catch (e) {
        // ignore failures silently
        console.warn('survey check failed:', e?.message || e);
      }
    })();
  }, [isAuthenticated, isStudentOrAlumni, onFound, throttleMinutes]);
}

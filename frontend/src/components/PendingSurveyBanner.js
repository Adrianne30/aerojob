// src/components/surveys/PendingSurveysBanner.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { surveysAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function PendingSurveysBanner() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await surveysAPI.forMe(); // GET /surveys/active/eligible
        setPending(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load surveys');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  if (!pending.length) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="font-semibold mb-2">
        You have {pending.length} survey{pending.length > 1 ? 's' : ''} to answer
      </div>
      <ul className="list-disc pl-5 space-y-1">
        {pending.map(s => (
          <li key={s._id}>
            <Link to={`/surveys/${s._id}`} className="text-blue-600 underline">
              {s.title || 'Untitled survey'}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

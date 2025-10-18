import { useParams } from 'react-router-dom';
import { surveysAPI } from '../utils/api';
import { useEffect, useState } from 'react';

export default function SurveyResponsesPage() {
  const { id } = useParams(); // path="/surveys/:id/responses"
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    if (!id) {
      console.error('Missing survey id in route');
      return;
    }
    (async () => {
      try {
        const rows = await surveysAPI.responses(id);
        console.log('responses:', rows);
        setResponses(rows);
      } catch (e) {
        console.error('load responses failed:', e?.response?.data || e.message);
      }
    })();
  }, [id]);

  return (
    <div>
      <h2>Survey Responses</h2>
      <pre>{JSON.stringify(responses, null, 2)}</pre>
    </div>
  );
}

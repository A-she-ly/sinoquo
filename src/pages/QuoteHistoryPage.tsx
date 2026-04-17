import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { databaseService } from '../services/database';

const QuoteHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      const rows = await databaseService.getQuoteHeadersByUser(session.user.id);
      setList(rows || []);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-lg font-bold">Quote History</h1>
        <button onClick={() => navigate('/my-zone')} className="text-sm text-blue-600">My Zone</button>
      </div>
      <div className="p-4 space-y-3">
        {list.length === 0 && <div className="text-gray-500 text-sm text-center">No saved quotes yet.</div>}
        {list.map((q) => {
          const customerName = (q.customers && q.customers.name) || 'Unknown';
          return (
            <div key={q.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50 flex justify-between items-center">
              <div className="min-w-0">
                <div className="text-sm font-medium text-black truncate">{customerName}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(q.created_at).toLocaleString()} • {q.currency} {q.total_amount} • {q.item_count} item(s)
                </div>
                <div className="text-[10px] text-gray-400">m:{q.margin} • ex:{q.exchange_rate}</div>
              </div>
              <button
                onClick={() => navigate(`/quotes/${q.id}`)}
                className="shrink-0 bg-blue-600 text-white text-xs px-3 py-1.5 rounded"
              >
                View
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuoteHistoryPage;


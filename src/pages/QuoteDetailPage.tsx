import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { databaseService } from '../services/database';

const QuoteDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      const res = await databaseService.getQuoteDetail(id);
      setData(res);
      setLoading(false);
    };
    run();
  }, [id]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!data) return <div className="p-6 text-center">Not found.</div>;

  const { header, items } = data;
  const customerName = (header.customers && header.customers.name) || 'Unknown';

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">Quote #{header.id.slice(0, 8)}</div>
          <div className="text-xs text-gray-500">{new Date(header.created_at).toLocaleString()} • {customerName}</div>
        </div>
        <button onClick={() => navigate('/quotes')} className="text-sm text-blue-600">Back</button>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-600 mb-2">Currency: {header.currency} • Margin: {header.margin} • Ex: {header.exchange_rate}</div>
        <div className="border border-black text-black text-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black p-2 w-10">No.</th>
                <th className="border-r border-black p-2">Items & Descriptions</th>
                <th className="border-r border-black p-2 w-16">Qty</th>
                <th className="border-r border-black p-2 w-24">Unit</th>
                <th className="p-2 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-b border-black">
                  <td className="border-r border-black p-2 text-center">{it.line_no}</td>
                  <td className="border-r border-black p-2">
                    <div className="font-mono text-[10px] text-gray-600 bg-gray-50 px-1 rounded inline-block mb-1">{it.product_code}</div>
                    <div>{it.description}</div>
                  </td>
                  <td className="border-r border-black p-2 text-center">{it.quantity}</td>
                  <td className="border-r border-black p-2 text-center">{it.unit_price}</td>
                  <td className="p-2 text-center">{it.amount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="border-r border-black p-2 font-bold" colSpan={4}>Total</td>
                <td className="p-2 text-center font-bold">{header.total_amount}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailPage;


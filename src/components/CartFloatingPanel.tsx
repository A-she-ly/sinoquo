import React from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export const CartFloatingPanel: React.FC = () => {
  const { cart, margin, exchangeRate } = useStore();
  const navigate = useNavigate();

  if (cart.length === 0) return null;

  // Calculate total across all items
  const totalAmount = cart.reduce((sum, item) => {
    const cost = item.costItem?.cost_price || item.cost_cny || 0;
    const calculatedPrice = item.guide_price_usd || Math.round((cost * (1 + margin)) / exchangeRate);
    const unitPrice = item.custom_price ?? calculatedPrice;
    return sum + (unitPrice * item.quantity);
  }, 0);

  // Get the description of the latest modified/added item, or just the first one
  // For simplicity, let's show the first item's description or "X items"
  const description = `${cart.length} items in quotation`;

  return (
    <div 
      onClick={() => navigate('/quotation')}
      className="fixed top-24 right-4 w-48 bg-cyan-100 p-3 rounded shadow-lg border-l-4 border-cyan-300 text-xs opacity-90 cursor-pointer z-50 font-sans hover:bg-cyan-200 transition-colors"
    >
      <div className="mb-1 font-bold truncate">{description}</div>
      <div>Total: ${totalAmount}</div>
    </div>
  );
};

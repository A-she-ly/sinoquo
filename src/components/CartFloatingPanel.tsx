import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export const CartFloatingPanel: React.FC = () => {
  const { cart, margin, exchangeRate } = useStore();
  const navigate = useNavigate();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  if (cart.length === 0) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = false;
    startPosRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };

    const handleMouseMove = (e: MouseEvent) => {
      isDraggingRef.current = true;
      setPosition({
        x: e.clientX - startPosRef.current.x,
        y: e.clientY - startPosRef.current.y,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) {
      navigate('/quotation');
    }
  };

  // Calculate total across all items
  const totalAmount = cart.reduce((sum, item) => {
    const cost = item.costItem?.cost_price || item.cost_cny || 0;
    const calculatedPrice = item.guide_price_usd || Math.round((cost * (1 + margin)) / exchangeRate);
    const unitPrice = item.custom_price ?? calculatedPrice;
    return sum + (unitPrice * item.quantity);
  }, 0);

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const description = `${totalQuantity} items in quotation`;

  return (
    <div 
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: 'none'
      }}
      className="fixed top-24 right-4 w-48 bg-cyan-100 p-3 rounded shadow-lg border-l-4 border-cyan-300 text-xs opacity-90 cursor-move z-50 font-sans hover:bg-cyan-200 transition-colors select-none"
    >
      <div className="mb-1 font-bold truncate">{description}</div>
      <div>Total: ${totalAmount}</div>
    </div>
  );
};

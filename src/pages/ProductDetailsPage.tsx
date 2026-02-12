import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { databaseService } from '../services/database';
import { CostItem } from '../types';
import { CartFloatingPanel } from '../components/CartFloatingPanel';

import ReactMarkdown from 'react-markdown';

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, selectedProduct, allProducts, cart, initializeProducts } = useStore();
  const [cost, setCost] = useState<CostItem | undefined>(undefined);
  const [loadingCost, setLoadingCost] = useState(false);

  // Initialize products if not loaded (e.g. direct access or refresh)
  useEffect(() => {
    if (allProducts.length === 0) {
      initializeProducts();
    }
  }, [allProducts.length, initializeProducts]);

  // Find product from store or search in allProducts
  // Also check if product is in cart (since we navigate from Quotation page now)
  const product = selectedProduct || 
                  allProducts.find(p => p.id === id) || 
                  cart.find(p => p.id === id);

  // Fetch cost asynchronously
  useEffect(() => {
    if (product?.id) {
      setLoadingCost(true);
      // Try fetching cost from Supabase (using Product Code as ID)
      databaseService.getCostItem(product.id)
        .then(item => {
          setCost(item);
        })
        .finally(() => setLoadingCost(false));
    }
  }, [product?.id]);

  if (!product && allProducts.length > 0) {
    return <div>Product not found</div>;
  } else if (!product) {
    return <div className="p-6 text-center">Loading product details...</div>;
  }

  const handleQuoteClick = () => {
    // DO NOT clear previous cart items here, to support adding multiple products.
    // If user wants to clear, they can do it in QuotationPage or manually.
    // useStore.getState().clearCart(); 
    
    // Ensure we pass the latest fetched cost if available
    const productToAdd = {
      ...product,
      cost_cny: cost?.cost_price || product.cost_cny, // Prioritize fetched cost
      // We can also pass other latest fields if needed
    };
    
    addToCart(productToAdd);
    navigate('/quotation');
  };

  // Determine display values
  // If we have cost_cny directly on product (from search list), use it as fallback
  const displayCost = cost?.cost_price || product.cost_cny;
  const displayGuidePrice = product.guide_price_usd; // Assuming guide price is on product object

  return (
    <div className="p-6 max-w-md mx-auto bg-white min-h-screen shadow-sm relative">
      <CartFloatingPanel />
      <button onClick={() => navigate(-1)} className="absolute top-4 right-4 text-gray-400">
        <span className="sr-only">Back</span>
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">A</div>
      </button>

      {/* Main Title (Description) - Boldest */}
      <h1 className="text-xl font-extrabold text-black mt-8 mb-2 break-words leading-snug">
        {product.specs || product.name}
      </h1>
      
      {/* Product Code (Sub-header) */}
      <div className="text-sm text-gray-500 mb-8 font-mono bg-gray-100 inline-block px-2 py-1 rounded">
        {product.name}
      </div>

      <div className="space-y-6 mb-8">
        {/* Dynamic Cost Display */}
        <div className="border-b border-gray-100 pb-4">
          <div className="text-sm text-gray-500 mb-1">成本 CNY</div>
          {loadingCost ? (
            <div className="text-gray-400 text-sm">Loading...</div>
          ) : displayCost ? (
            <div className="text-2xl font-bold text-blue-600">
              ¥{displayCost}
            </div>
          ) : (
            <div className="text-gray-400 italic">暂无数据</div>
          )}
        </div>

        {/* Dynamic Guide Price Display */}
        <div className="border-b border-gray-100 pb-4">
          <div className="text-sm text-gray-500 mb-1">指导价 USD</div>
          {displayGuidePrice ? (
            <div className="text-2xl font-bold text-green-600">
              ${displayGuidePrice}
            </div>
          ) : (
            <div className="text-gray-400 italic">暂无数据</div>
          )}
        </div>

        {/* Product Details Display */}
        {product.details && (
          <div className="border-b border-gray-100 pb-4">
            <div className="text-sm text-gray-500 mb-1">详情</div>
            <div className="text-black prose max-w-none">
              <ReactMarkdown 
                components={{
                  img: ({node, ...props}) => <img {...props} className="w-full h-auto rounded-lg my-2" />,
                  a: ({node, ...props}) => <a {...props} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer" />,
                  p: ({node, ...props}) => <p {...props} className="mb-2 whitespace-pre-wrap" />
                }}
              >
                {product.details}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center mt-12">
        <button
          onClick={handleQuoteClick}
          className="bg-primary text-white px-8 py-2 rounded shadow-sm font-medium active:bg-blue-700 transition-colors"
        >
          To Quote
        </button>
      </div>
    </div>
  );
};

export default ProductDetailsPage;

import React, { useEffect } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { storageService } from '../services/storage';
import { CartFloatingPanel } from '../components/CartFloatingPanel';

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    searchQuery, 
    setSearchQuery, 
    searchResults, 
    searchProducts, 
    setSelectedProduct,
    addToCart,
    initializeProducts,
    isLoading,
    error // Get error from store
  } = useStore();

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 20;

  // 1. Initialize products on mount (fetches from Supabase or Mock)
  useEffect(() => {
    initializeProducts();
  }, [initializeProducts]);

  // 2. Filter locally when search query changes
  useEffect(() => {
    searchProducts(searchQuery);
    setCurrentPage(1); // Reset to first page on new search
  }, [searchQuery, searchProducts]);

  // Calculate pagination
  const totalItems = searchResults.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentItems = searchResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    navigate(`/details/${encodeURIComponent(product.id)}`);
  };

  const handleAddToQuote = (e: React.MouseEvent, product: any) => {
    e.stopPropagation(); // Prevent navigation to details page
    // Ensure we have cost_cny from the product object if available
    const productToAdd = {
        ...product,
        // If the product in list already has cost_cny (which it does from getProducts), use it.
        // The store's addToCart handles fetching if missing, but we should pass what we have.
    };
    addToCart(productToAdd);
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen shadow-sm relative">
      {/* Search Header */}
      <div className="relative mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for products..."
          className="w-full border-b border-gray-300 py-2 pl-2 pr-10 focus:outline-none focus:border-primary text-lg"
        />
        <Search className="absolute right-2 top-2 text-yellow-500 w-6 h-6 stroke-[3]" />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error Message Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-xs break-all">
          <strong>Error:</strong> {error}
          <br/>
          <span className="text-gray-500 mt-1 block">
             Please check your Supabase Table Name ("wk_top_hammer_bits") and RLS Policies.
          </span>
        </div>
      )}

      {/* Debug Info (Optional - remove in production) */}
      <div className="text-[10px] text-gray-300 absolute top-2 left-2">
        {import.meta.env.VITE_SUPABASE_URL ? 'Connected' : 'Mock Mode'}
      </div>

      {/* Manual Button */}
      <button 
        onClick={() => navigate('/manual')}
        className="absolute top-2 left-16 text-[10px] text-gray-400 flex items-center gap-1 hover:text-gray-600"
      >
        <BookOpen className="w-3 h-3" />
        Manual
      </button>

      {/* Floating Panel (Panel 5) */}
      <CartFloatingPanel />

      {/* Product List */}
      {!isLoading && (
        <div className="space-y-4 pb-20">
          {currentItems.map((product) => {
            return (
            <div 
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="py-3 border-b border-gray-100 cursor-pointer active:bg-gray-50 flex justify-between items-center"
            >
              <div className="flex-1 min-w-0 pr-4">
                {/* Main Description (Large) */}
                <div className="text-base font-medium text-black break-words mb-1">
                  {product.specs || product.name}
                </div>
                
                {/* Product Code & Details (Small, Gray) */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                   <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">
                     {product.name}
                   </span>
                   
                   {/* Cost & Price Display */}
                   {product.cost_cny && (
                     <span className="text-blue-600 font-medium">
                       ¥{product.cost_cny}
                     </span>
                   )}
                   {product.guide_price_usd && (
                     <span className="text-green-600 font-medium">
                       ${product.guide_price_usd}
                     </span>
                   )}

                   {product.category !== 'General' && (
                     <span className="text-gray-400">• {product.category}</span>
                   )}
                </div>
              </div>

              {/* Add to Quote Button */}
              <button
                onClick={(e) => handleAddToQuote(e, product)}
                className="shrink-0 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow hover:bg-blue-700 active:bg-blue-800 transition-colors"
              >
                To Quote
              </button>
            </div>
          );
        })}
        
        {searchResults.length === 0 && !searchQuery.trim() && (
          <div className="text-center mt-20 px-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Sinoquo</h2>
            <p className="text-gray-500">Type it and see it pops up!</p>
          </div>
        )}

        {searchResults.length === 0 && searchQuery.trim() && (
          <div className="text-gray-400 text-sm mt-4">No products found.</div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-8">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Prev
            </button>
            
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default SearchPage;

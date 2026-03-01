import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CostItem, QuotationItem } from '../types';
import { databaseService } from '../services/database';

interface CartItem extends Product {
  quantity: number;
  costItem?: CostItem;
  custom_price?: number; // Allow manual override of the unit price
  custom_description?: string; // Allow manual override of the description
}

interface AppState {
  // Search
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  allProducts: Product[];
  searchResults: Product[];
  
  // Actions
  initializeProducts: () => Promise<void>;
  searchProducts: (query: string) => void;

  // Cart / Quotation Builder
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  setQuantity: (productId: string, quantity: number) => void; // Add setQuantity
  updateCartItemPrice: (productId: string, price: number) => void;
  updateCartItemDescription: (productId: string, description: string) => void;
  reorderCart: (newOrder: CartItem[]) => void;
  clearCart: () => void;
  addCustomItem: () => void;

  // Quotation Settings
  margin: number;
  exchangeRate: number;
  setMargin: (margin: number) => void;
  setExchangeRate: (rate: number) => void;

  isQuoteStarted: boolean; // Track if user has clicked "Continue" to start quote
  setQuoteStarted: (started: boolean) => void;

  // Selected Product (for details view)
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      error: null,
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      allProducts: [], // Initially empty, populated by initializeProducts
      searchResults: [],

      initializeProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          // 1. Try to fetch from Supabase
          console.log('Fetching products from Supabase...');
          // Ensure we fetch all products without limit
          const dbProducts = await databaseService.getProducts();
          
          if (dbProducts && dbProducts.length > 0) {
            console.log(`Loaded ${dbProducts.length} products from Supabase`);
            // Check if there is an active search query (e.g., from page reload)
            const currentQuery = get().searchQuery;
            
            set({ 
              allProducts: dbProducts,
              // If there is a query, filter immediately; otherwise, keep empty
              searchResults: currentQuery.trim() ? dbProducts.filter(p => {
                 const terms = currentQuery.toLowerCase().split(/\s+/).filter(Boolean);
                 const searchString = `${p.name.toLowerCase()} ${p.specs.toLowerCase()} ${p.description ? p.description.toLowerCase() : ''}`;
                 return terms.every(term => searchString.includes(term));
              }) : [], 
              isLoading: false,
              error: null
            });
          } else {
            set({ 
              allProducts: [],
              searchResults: [],
              isLoading: false,
              error: 'No products found in Supabase.'
            });
          }
        } catch (error: any) {
          console.error('Failed to initialize products:', error);
          set({ 
            allProducts: [],
            searchResults: [],
            isLoading: false,
            error: `Connection Error: ${error.message || 'Unknown error'}`
          });
        }
      },

      searchProducts: (query) => {
        const { allProducts } = get();
        
        // If query is empty, clear search results to show welcome message
        if (!query.trim()) {
          set({ searchResults: [] }); 
          return;
        }

        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

        const results = allProducts.filter(p => {
          const searchString = `
            ${p.name.toLowerCase()} 
            ${p.specs.toLowerCase()} 
            ${p.description ? p.description.toLowerCase() : ''}
          `;
          
          // All terms must be present in the search string
          return terms.every(term => searchString.includes(term));
        });

        // Limit search results to 50 items to prevent rendering lag
        // set({ searchResults: results.slice(0, 50) }); 
        set({ searchResults: results }); // Return ALL matching results, pagination handles the slice
      },

      cart: [],
      addToCart: async (product) => {
        const { cart } = get();
        // Use product.cost_cny if available (passed from details page), otherwise fetch
        // But since we pass the product with cost_cny from details page, we should use it.
        
        // Check if we need to fetch cost again. 
        // If product.cost_cny is present, we can construct a costItem from it.
        // Cast to any to safely access optional costItem that might be passed
        let costItem = (product as any).costItem as CostItem | undefined;

        if (!costItem && product.cost_cny) {
            costItem = {
               id: `cost_${product.id}`,
               supplier_id: 'default',
               product_id: product.id,
               internal_code: product.id,
               cost_price: product.cost_cny,
               currency: 'CNY',
               effective_date: new Date().toISOString()
            };
        }
        
        // If still no cost, try fetching
        if (!costItem) {
          costItem = await databaseService.getCostItem(product.id);
        }
        
        // If still no cost, just proceed without cost (no mock fallback)
        
        const existing = cart.find(item => item.id === product.id);
        
        if (existing) {
          set({
            cart: cart.map(item => 
              item.id === product.id ? { ...item, quantity: item.quantity + ((product as any).quantity || 1), costItem: costItem || item.costItem } : item
            )
          });
        } else {
          set({ cart: [...cart, { ...product, quantity: (product as any).quantity || 1, costItem }] });
        }
      },
      removeFromCart: (productId) => {
        set({ cart: get().cart.filter(item => item.id !== productId) });
      },
      updateQuantity: (productId, delta) => {
        const { cart } = get();
        const newCart = cart.map(item => {
          if (item.id === productId) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        });
        set({ cart: newCart });
      },
      setQuantity: (productId, quantity) => {
        const { cart } = get();
        const newCart = cart.map(item => {
          if (item.id === productId) {
            // Ensure quantity is at least 1
            const newQty = Math.max(1, quantity);
            return { ...item, quantity: newQty };
          }
          return item;
        });
        set({ cart: newCart });
      },
      updateCartItemPrice: (productId, price) => {
        const { cart } = get();
        const newCart = cart.map(item => {
          if (item.id === productId) {
            return { ...item, custom_price: price };
          }
          return item;
        });
        set({ cart: newCart });
      },
      updateCartItemDescription: (productId, description) => {
        const { cart } = get();
        const newCart = cart.map(item => {
          if (item.id === productId) {
            return { ...item, custom_description: description };
          }
          return item;
        });
        set({ cart: newCart });
      },
      reorderCart: (newOrder) => set({ cart: newOrder }),
      clearCart: () => set({ cart: [] }),
      addCustomItem: () => {
        const { cart } = get();
        const id = `custom-${Date.now()}`;
        const newItem: CartItem = {
          id,
          name: 'Extra Item / Service Fee',
          specs: '',
          category: 'Custom',
          quantity: 1,
          cost_cny: 0,
          guide_price_usd: 0,
          custom_price: 0,
          custom_description: 'Type details here...'
        };
        set({ cart: [...cart, newItem] });
      },

      margin: 0.2, // Default 20%
      exchangeRate: 7.0, // Default USD/CNY
      setMargin: (margin) => set({ margin }),
      setExchangeRate: (exchangeRate) => set({ exchangeRate }),

      isQuoteStarted: false,
      setQuoteStarted: (started) => set({ isQuoteStarted: started }),

      selectedProduct: null,
      setSelectedProduct: async (product) => {
        // When selecting a product, we might want to ensure we have its latest cost
        // But for now, just setting the state is enough, the details page can fetch cost if needed
        set({ selectedProduct: product });
      },
    }),
    {
      name: 'sinoquo-storage', // unique name
      partialize: (state) => ({ 
        cart: state.cart, 
        // isQuoteStarted: state.isQuoteStarted, // Don't persist quote started state
        margin: state.margin,
        exchangeRate: state.exchangeRate
      }), // only persist cart and settings
    }
  )
);

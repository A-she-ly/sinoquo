import { Supplier, Product, CostItem, Quotation } from '../types';
import { initialSuppliers, initialProducts, initialCostItems } from './mockData';

const KEYS = {
  SUPPLIERS: 'sinoquo_suppliers',
  PRODUCTS: 'sinoquo_products',
  COST_ITEMS: 'sinoquo_cost_items',
  QUOTATIONS: 'sinoquo_quotations',
};

// Helper to get data or initialize
const getOrInit = <T>(key: string, initialData: T[]): T[] => {
  const stored = localStorage.getItem(key);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(key, JSON.stringify(initialData));
  return initialData;
};

export const storageService = {
  // Always return fresh mock data for master data (Products, Suppliers, Costs)
  // This ensures edits in mockData.ts are reflected immediately
  getSuppliers: (): Supplier[] => initialSuppliers,
  
  getProducts: (): Product[] => initialProducts,
  
  getCostItems: (): CostItem[] => initialCostItems,
  
  getQuotations: (): Quotation[] => {
    const stored = localStorage.getItem(KEYS.QUOTATIONS);
    return stored ? JSON.parse(stored) : [];
  },

  saveQuotation: (quotation: Quotation) => {
    const quotations = storageService.getQuotations();
    quotations.unshift(quotation);
    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(quotations));
  },

  // Mock search functionality
  searchProducts: (keyword: string): Product[] => {
    const products = storageService.getProducts();
    const lowerKeyword = keyword.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerKeyword) || 
      p.id.toLowerCase().includes(lowerKeyword) ||
      p.specs.toLowerCase().includes(lowerKeyword)
    );
  },

  getProductCost: (productId: string, supplierId?: string): CostItem | undefined => {
    const costs = storageService.getCostItems();
    // Default to first cost item found if no supplier specified
    if (!supplierId) {
      return costs.find(c => c.product_id === productId);
    }
    return costs.find(c => c.product_id === productId && c.supplier_id === supplierId);
  }
};

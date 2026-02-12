import { Supplier, Product, CostItem } from '../types';

export const initialSuppliers: Supplier[] = [
  {
    id: 's_001',
    name: 'Black Diamond (Heijingang)',
    contact: 'sales@blackdiamond.com',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 's_002',
    name: 'Teamwhole',
    contact: 'info@teamwhole.com',
    updated_at: '2025-01-15T00:00:00Z',
  },
];

export const initialProducts: Product[] = [
  {
    id: 'DHD360',
    name: 'DHD360 Hammer',
    specs: '3 1/2 AR pin',
    category: 'Hammer',
    description: 'High performance DTH hammer',
    technical_specs: {
      'Thread': '3 1/2 AR pin',
      'Weight': '25kg',
      'Length': '1020mm',
      'Air Consumption': '12m3/min',
    },
  },
  {
    id: 'DHD350',
    name: 'DHD350 Hammer',
    specs: '3 1/2 Reg pin',
    category: 'Hammer',
    description: 'Standard DTH hammer',
    technical_specs: {
      'Thread': '3 1/2 Reg pin',
      'Weight': '22kg',
    },
  },
  {
    id: 'DHD355',
    name: 'DHD355 Hammer',
    specs: 'API 2 3/8 Reg',
    category: 'Hammer',
    description: 'Small diameter hammer',
    technical_specs: {
      'Thread': 'API 2 3/8 Reg',
      'Weight': '15kg',
    },
  },
];

export const initialCostItems: CostItem[] = [
  {
    id: 'ci_001',
    supplier_id: 's_001',
    product_id: 'DHD360',
    internal_code: 'DHD360-H-BD',
    cost_price: 20000,
    currency: 'CNY',
    effective_date: '2025-01-01',
  },
  {
    id: 'ci_002',
    supplier_id: 's_001',
    product_id: 'DHD350',
    internal_code: 'DHD350-H-BD',
    cost_price: 15000,
    currency: 'CNY',
    effective_date: '2025-01-01',
  },
  {
    id: 'ci_003',
    supplier_id: 's_001',
    product_id: 'DHD3.5',
    internal_code: 'DHD35-H-BD',
    cost_price: 10000,
    currency: 'CNY',
    effective_date: '2025-01-01',
  },
];

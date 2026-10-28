export type UserRole = 'patronne' | 'vendeur';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  cost_price?: number | null; // Masqué pour les vendeurs
  stock_quantity: number;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  seller_id: string;
  total_amount: number;
  status: 'validee' | 'annulee';
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  created_at: string;
  // Données jointes
  seller?: {
    id: string;
    full_name: string;
    email: string;
  };
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_cost_price?: number | null; // Masqué pour les vendeurs
  product?: {
    name: string;
    category: string;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DailyReport {
  date: string;
  total_sales_amount: number;
  sales_count: number;
  estimated_profit?: number | null; // Uniquement pour la patronne
  top_products: {
    product_id: string;
    product_name: string;
    category: string;
    total_quantity: number;
    total_revenue: number;
  }[];
  seller_rankings: {
    seller_id: string;
    seller_name: string;
    sales_count: number;
    total_revenue: number;
  }[];
}

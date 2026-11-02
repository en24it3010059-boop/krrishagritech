export type Role = 'farmer' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  soil_type: string;
  size_acres: number | null;
  created_at: string;
}

export type CropStage = 'planned' | 'planted' | 'growing' | 'harvested';
export type CropHealth = 'good' | 'watch' | 'critical';

export interface Crop {
  id: string;
  user_id: string;
  name: string;
  variety: string;
  planted_on: string | null;
  stage: CropStage;
  health: CropHealth;
  notes: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price_cents: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  order_items: OrderItem[];
}

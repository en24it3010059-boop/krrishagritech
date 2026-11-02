import type { CropHealth, CropStage, OrderStatus } from '@/lib/types';

export const CROP_STAGES: { value: CropStage; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'planted', label: 'Planted' },
  { value: 'growing', label: 'Growing' },
  { value: 'harvested', label: 'Harvested' },
];

export const CROP_HEALTH: { value: CropHealth; label: string }[] = [
  { value: 'good', label: 'Healthy' },
  { value: 'watch', label: 'Needs watching' },
  { value: 'critical', label: 'Critical' },
];

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const SOIL_TYPES = ['Loam', 'Clay', 'Sandy', 'Silt', 'Peat', 'Chalk', 'Not sure'];

export const PRODUCT_CATEGORIES = [
  'Seeds',
  'Fertiliser',
  'Irrigation',
  'Soil Health',
  'Pest Control',
  'Equipment',
  'General',
];

export type Pharmacy = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMiles: number | null;
  openNow: boolean | null;
  phone: string | null;
  mapsUrl: string | null;
  stockStatus: 'In Stock' | 'Limited' | 'Unknown';
  priceLabel: string | null;
};
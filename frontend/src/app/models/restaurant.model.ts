export interface Location {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  number: string;
  cityId: string; 
  city?: string;
  province?: string;
  department?: string;
  location: Location;
}

export interface Menu {
  id: number;
  name: string;
  imageUrl: string;
  restaurantId: number;
  category?: string;
  description: string;
  price: number;
}

export interface Restaurant {
  id: number;
  name: string;
  description?: string;
  address: Address;
  imageUrl: string;
  userId: number;
  menus?: Menu[];
}
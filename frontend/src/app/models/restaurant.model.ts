// src/app/models/restaurant.model.ts

// Interfaz para las coordenadas de ubicación (latitud y longitud)
export interface Location {
  lat: number;
  lng: number;
}

// Interfaz para la información de la dirección de un restaurante
export interface Address {
  street: string;
  number: string;
  cityId: string; // <-- ¡CORREGIDO: Ahora es string!
  city?: string;
  province?: string;
  department?: string;
  location: Location;
}

// Interfaz para un elemento del menú de un restaurante
export interface Menu {
  id: number;
  name: string;
  imageUrl: string;
  restaurantId: number;
  category?: string;
  description: string;
  price: number;
}

// Interfaz principal para la entidad Restaurant
export interface Restaurant {
  id: number;
  name: string;
  description?: string;
  address: Address;
  imageUrl: string;
  userId: number;
  menus?: Menu[];
}
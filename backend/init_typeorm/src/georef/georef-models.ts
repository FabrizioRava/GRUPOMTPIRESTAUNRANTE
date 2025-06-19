// --- Archivo Modificado: src/app/models/georef-models.ts (Frontend) ---

export interface Centroide {
  lat: number;
  lon: number;
}

export interface GeorefEntityRef {
  id: string;
  nombre: string;
  interseccion?: number; // Puede estar presente en algunas entidades
}

export interface GeorefProvince extends GeorefEntityRef {
  centroide: Centroide;
  // Otros campos específicos de provincia si se usan:
  // nombre_completo?: string;
  // fuente?: string;
  // categoria?: string;
  // iso_id?: string;
  // iso_nombre?: string;
}

// ELIMINADO: GeorefDepartment
// ELIMINADO: GeorefDepartmentsResponse

export interface GeorefMunicipality extends GeorefEntityRef {
  categoria: string;
  centroide: Centroide;
  // departamento?: GeorefEntityRef; // ELIMINADO: Ya no necesitamos departamento aquí
  provincia: GeorefEntityRef;
  // Otros campos específicos de municipio si se usan:
  // nombre_completo?: string;
  // fuente?: string;
}

export interface GeorefDireccion {
  altura?: {
    unidad?: string;
    valor: number;
  };
  calle: GeorefEntityRef;
  // departamento?: GeorefEntityRef; // ELIMINADO: Ya no necesitamos departamento aquí
  localidad?: GeorefEntityRef;
  municipio?: GeorefEntityRef;
  localidad_censal?: GeorefEntityRef;
  nombre_completo: string;
  pais: GeorefEntityRef;
  piso?: string;
  codigo_postal?: string;
  provincia: GeorefEntityRef;
  ubicacion?: Centroide;
}

// Interfaces para las respuestas completas de la API de GeoRef
export interface GeorefProvincesResponse {
  cantidad: number;
  inicio: number;
  parametros: { max: number };
  provincias: GeorefProvince[];
  total: number;
}

// ELIMINADO: GeorefDepartmentsResponse

export interface GeorefMunicipalitiesResponse {
  cantidad: number;
  inicio: number;
  parametros: { max: number; /* departamento?: string; */ }; // Comentado por si acaso estaba en uso aquí, pero no en el backend
  municipios: GeorefMunicipality[];
  total: number;
}

export interface GeorefDireccionesResponse {
  cantidad: number;
  inicio: number;
  parametros: {
    calle?: string;
    altura?: number;
    provincia?: string;
    // departamento?: string; // ELIMINADO: Ya no necesitamos departamento aquí
    municipio?: string;
    max?: number;
    lat?: number;
    lon?: number;
  };
  direcciones: GeorefDireccion[];
  total: number;
}
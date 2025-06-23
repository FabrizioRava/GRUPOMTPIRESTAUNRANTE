export interface Centroide {
  lat: number;
  lon: number;
}

export interface GeorefEntityRef {
  id: string;
  nombre: string;
  interseccion?: number;
}

export interface GeorefProvince extends GeorefEntityRef {
  centroide: Centroide;
}

export interface GeorefMunicipality extends GeorefEntityRef {
  categoria?: string; 
  centroide?: Centroide; 
  provincia: GeorefEntityRef;
}

export interface GeorefLocalidad extends GeorefEntityRef {
  categoria?: string; 
  centroide?: Centroide; 
  provincia: GeorefEntityRef;
  departamento?: GeorefEntityRef;
  municipio?: GeorefEntityRef;
}

export interface GeorefDireccion {
  altura?: {
    unidad?: string;
    valor: number;
  };
  calle: GeorefEntityRef;
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

export interface GeorefProvincesResponse {
  cantidad: number;
  inicio: number;
  parametros: { max: number };
  provincias: GeorefProvince[];
  total: number;
}

export interface GeorefMunicipalitiesResponse {
  cantidad: number;
  inicio: number;
  parametros: { max: number; };
  municipios: GeorefMunicipality[];
  total: number;
}

export interface GeorefLocalidadesResponse {
  cantidad: number;
  inicio: number;
  parametros: { max: number; provincia?: string; };
  localidades: GeorefLocalidad[];
  total: number;
}

export interface GeorefDireccionesResponse {
  cantidad: number;
  inicio: number;
  parametros: {
    calle?: string;
    altura?: number;
    provincia?: string;
    municipio?: string;
    max?: number;
    lat?: number;
    lon?: number;
  };
  direcciones: GeorefDireccion[];
  total: number;
}
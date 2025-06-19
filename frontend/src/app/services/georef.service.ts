// --- Archivo Modificado: src/app/services/georef.service.ts (Frontend) ---

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  GeorefProvince,
  // GeorefDepartment, // ELIMINADO: Ya no se usa
  GeorefMunicipality,
  GeorefDireccion,
  GeorefProvincesResponse,
  // GeorefDepartmentsResponse, // ELIMINADO: Ya no se usa
  GeorefMunicipalitiesResponse,
  GeorefDireccionesResponse
} from '../models/georef-models';

@Injectable({
  providedIn: 'root'
})
export class GeorefService {
  private apiUrl = 'http://localhost:3000/georef';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la lista de provincias de Argentina desde el backend.
   * @returns Un Observable que emite un array de provincias.
   */
  getProvinces(): Observable<GeorefProvince[]> {
    return this.http.get<GeorefProvincesResponse | GeorefProvince[]>(`${this.apiUrl}/provincias`).pipe(
      map(response => {
        console.log('[GeorefService Frontend] Respuesta Cruda del Backend para /provincias:', response);
        if (Array.isArray(response)) {
          console.log('[GeorefService Frontend] Provincias extraídas (respuesta directa array):', response.length);
          return response as GeorefProvince[];
        }
        else if (response && 'provincias' in response && Array.isArray(response.provincias)) {
          console.log('[GeorefService Frontend] Provincias extraídas (respuesta con .provincias):', response.provincias.length);
          return response.provincias as GeorefProvince[];
        }
        else {
          console.warn('[GeorefService Frontend] Estructura inesperada en la respuesta de provincias del backend:', response);
          return [];
        }
      }),
      catchError((error: any) => {
        console.error('[GeorefService Frontend] Error al obtener provincias del backend:', error);
        return of([]);
      })
    );
  }

  // ELIMINADO: getDepartments()
  // ELIMINADO: getDepartmentsByProvince()

  /**
   * Obtiene la lista de todos los municipios de Argentina desde el backend.
   * @returns Un Observable que emite un array de municipios.
   */
  getMunicipalities(): Observable<GeorefMunicipality[]> {
    return this.http.get<GeorefMunicipalitiesResponse | GeorefMunicipality[]>(`${this.apiUrl}/municipios`).pipe(
      map(response => {
        console.log('[GeorefService Frontend] Respuesta Cruda del Backend para /municipios:', response);
        if (Array.isArray(response)) {
          console.log('[GeorefService Frontend] Municipios extraídos (respuesta directa array):', response.length);
          return response as GeorefMunicipality[];
        } else if (response && 'municipios' in response && Array.isArray(response.municipios)) {
          console.log('[GeorefService Frontend] Municipios extraídos (respuesta con .municipios):', response.municipios.length);
          return response.municipios as GeorefMunicipality[];
        } else {
          console.warn('[GeorefService Frontend] Estructura inesperada en la respuesta de municipios del backend:', response);
          return [];
        }
      }),
      catchError((error: any) => {
        console.error('[GeorefService Frontend] Error al obtener municipios del backend:', error);
        return of([]);
      })
    );
  }

  // ELIMINADO: getMunicipalitiesByDepartment()

  /**
   * Realiza una geocodificación (busca una dirección) usando el backend, que ahora usa Nominatim.
   * Se envían los NOMBRES de provincia y municipio.
   * @param streetName El nombre de la calle.
   * @param streetNumber El número de altura (puede ser string o number).
   * @param provinceName El NOMBRE de la provincia.
   * @param municipalityName El NOMBRE del municipio.
   * @returns Un Observable que emite un array de objetos de dirección.
   */
  buscarDireccion(
    streetName: string,
    streetNumber: string | number | null,
    provinceName: string, // <-- Ahora es el nombre
    municipalityName: string // <-- Ahora es el nombre
  ): Observable<GeorefDireccion[]> {
    let params = new HttpParams()
      .set('calle', streetName);

    if (streetNumber !== null && streetNumber !== undefined) {
      params = params.set('altura', String(streetNumber));
    }

    if (provinceName) { // No son IDs, son nombres
      params = params.set('provinciaNombre', provinceName);
    }
    if (municipalityName) { // No son IDs, son nombres
      params = params.set('municipioNombre', municipalityName);
    }

    return this.http.get<GeorefDireccionesResponse | GeorefDireccion[]>(`${this.apiUrl}/buscar-direccion`, { params }).pipe(
      map(response => {
        console.log('[GeorefService Frontend] Respuesta Cruda del Backend para /buscar-direccion (Nominatim):', response);
        if (Array.isArray(response)) {
          console.log('[GeorefService Frontend] Direcciones buscadas extraídas (respuesta directa array):', response.length);
          return response as GeorefDireccion[];
        } else if (response && 'direcciones' in response && Array.isArray(response.direcciones)) {
          console.log('[GeorefService Frontend] Direcciones buscadas extraídas (respuesta con .direcciones):', response.direcciones.length);
          return response.direcciones as GeorefDireccion[];
        } else {
          console.warn('[GeorefService Frontend] Estructura inesperada en la respuesta de buscar-direccion del backend:', response);
          return [];
        }
      }),
      catchError((error: any) => {
        console.error('[GeorefService Frontend] Error al buscar dirección del backend:', error);
        return of([]);
      })
    );
  }

  /**
   * Realiza una geocodificación inversa (obtiene una dirección a partir de coordenadas) usando el backend.
   * Delega al backend, que usará Nominatim y luego buscará los IDs de GeoRef.
   * @param lat La latitud.
   * @param lng La longitud.
   * @returns Un Observable que emite un array de objetos de dirección.
   */
  getDireccionPorCoordenadas(lat: number, lng: number): Observable<GeorefDireccion[]> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lng.toString());

    return this.http.get<GeorefDireccionesResponse | GeorefDireccion[]>(`${this.apiUrl}/direccion-por-coordenadas`, { params }).pipe(
      map(response => {
        console.log('[GeorefService Frontend] Respuesta Cruda del Backend para /direccion-por-coordenadas:', response);
        if (Array.isArray(response)) {
          console.log('[GeorefService Frontend] Direcciones por coordenadas extraídas (respuesta directa array):', response.length);
          return response as GeorefDireccion[];
        } else if (response && 'direcciones' in response && Array.isArray(response.direcciones)) {
          console.log('[GeorefService Frontend] Direcciones por coordenadas extraídas (respuesta con .direcciones):', response.direcciones.length);
          return response.direcciones as GeorefDireccion[];
        } else {
          console.warn('[GeorefService Frontend] Estructura inesperada en la respuesta de direccion-por-coordenadas del backend:', response);
          return [];
        }
      }),
      catchError((error: any) => {
        console.error('[GeorefService Frontend] Error al obtener dirección por coordenadas del backend:', error);
        return of([]);
      })
    );
  }
}
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  GeorefProvince,
  GeorefMunicipality,
  GeorefDireccion,
  GeorefProvincesResponse,
  GeorefMunicipalitiesResponse,
  GeorefDireccionesResponse
} from '../models/georef-models';

@Injectable({
  providedIn: 'root'
})
export class GeorefService {
  private apiUrl = 'http://localhost:3000/georef';

  constructor(private http: HttpClient) {}

  getProvinces(): Observable<GeorefProvince[]> {
    return this.http.get<GeorefProvincesResponse | GeorefProvince[]>(`${this.apiUrl}/provincias`).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response as GeorefProvince[];
        }
        else if (response && 'provincias' in response && Array.isArray(response.provincias)) {
          return response.provincias as GeorefProvince[];
        }
        else {
          return [];
        }
      }),
      catchError((error: any) => {
        console.error('Error al obtener provincias del backend:', error);
        return of([]);
      })
    );
  }

  getMunicipalities(): Observable<GeorefMunicipality[]> {
    return this.http.get<GeorefMunicipalitiesResponse | GeorefMunicipality[]>(`${this.apiUrl}/municipios`).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response as GeorefMunicipality[];
        } else if (response && 'municipios' in response && Array.isArray(response.municipios)) {
          return response.municipios as GeorefMunicipality[];
        } else {
          return [];
        }
      }),
      catchError((error: any) => {
        console.error('Error al obtener municipios del backend:', error);
        return of([]);
      })
    );
  }

  getMunicipalitiesByProvinceId(provinceId: string): Observable<GeorefMunicipality[]> {
    const params = new HttpParams().set('provinciaId', provinceId);
    return this.http.get<GeorefMunicipalitiesResponse | GeorefMunicipality[]>(`${this.apiUrl}/municipios`, { params }).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response as GeorefMunicipality[];
        } else if (response && 'municipios' in response && Array.isArray(response.municipios)) {
          return response.municipios as GeorefMunicipality[];
        } else {
          return [];
        }
      }),
      catchError((error: any) => {
        console.error(`Error al obtener municipios/localidades para provincia ${provinceId} del backend:`, error);
        return of([]);
      })
    );
  }

  buscarDireccion(
    streetName: string,
    streetNumber: string | number | null,
    provinceName: string,
    municipalityName: string
  ): Observable<GeorefDireccion[]> {
    let params = new HttpParams()
      .set('calle', streetName);

    if (streetNumber !== null && streetNumber !== undefined) {
      params = params.set('altura', String(streetNumber));
    }

    if (provinceName) {
      params = params.set('provinciaNombre', provinceName);
    }
    if (municipalityName) {
      params = params.set('municipioNombre', municipalityName);
    }

    return this.http.get<GeorefDireccionesResponse | GeorefDireccion[]>(`${this.apiUrl}/buscar-direccion`, { params }).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response as GeorefDireccion[];
        } else if (response && 'direcciones' in response && Array.isArray(response.direcciones)) {
          return response.direcciones as GeorefDireccion[];
        } else {
          return [];
        }
      }),
      catchError((error: any) => {
        console.error('Error al buscar dirección del backend:', error);
        return of([]);
      })
    );
  }

  getDireccionPorCoordenadas(lat: number, lng: number): Observable<GeorefDireccion[]> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lng.toString());

    return this.http.get<GeorefDireccionesResponse | GeorefDireccion[]>(`${this.apiUrl}/direccion-por-coordenadas`, { params }).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response as GeorefDireccion[];
        } else if (response && 'direcciones' in response && Array.isArray(response.direcciones)) {
          return response.direcciones as GeorefDireccion[];
        } else {
          return [];
        }
      }),
      catchError((error: any) => {
        console.error('Error al obtener dirección por coordenadas del backend:', error);
        return of([]);
      })
    );
  }
}
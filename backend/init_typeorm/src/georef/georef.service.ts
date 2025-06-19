// --- Archivo Modificado: src/georef/georef.service.ts (Backend) ---

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

// Interfaces de modelos GeoRef (asegúrate de que son las mismas que en el frontend)
import {
  Centroide,
  GeorefEntityRef,
  GeorefProvince,
  // GeorefDepartment, // ELIMINADO: Ya no se usa
  GeorefMunicipality,
  GeorefDireccion,
  GeorefProvincesResponse,
  // GeorefDepartmentsResponse, // ELIMINADO: Ya no se usa
  GeorefMunicipalitiesResponse,
  GeorefDireccionesResponse
} from './georef-models'; // Importa de tu propio archivo de modelos

// Interfaz AMPLADA para la respuesta de Nominatim Reverse
interface NominatimAddress {
  road?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  county?: string;
  state?: string;
  province?: string;
  country?: string;
  country_code?: string;
  locality?: string;
  local_administrative_area?: string;
  hamlet?: string;
  // Puedes añadir más campos si los necesitas y Nominatim los devuelve
}

interface NominatimReverseResponse {
  lat: string;
  lon: string;
  display_name: string;
  address: NominatimAddress; // Usar la interfaz NominatimAddress
  osm_id: number;
  osm_type: string;
  // Otros campos de la respuesta reverse si son necesarios
}

// Interfaz AMPLIADA para la respuesta de Nominatim Search
interface NominatimSearchResponse {
  lat: string;
  lon: string;
  display_name: string;
  osm_id: number;
  osm_type: string;
  boundingbox: [string, string, string, string];
  type: string;
  class: string;
  address?: NominatimAddress; // Usar la interfaz NominatimAddress aquí también
  // Otros campos de la respuesta search si son necesarios
}

@Injectable()
export class GeorefService {
  private readonly GEOREF_API_BASE_URL = 'https://apis.datos.gob.ar/georef/api';
  private readonly NOMINATIM_API_BASE_URL = 'https://nominatim.openstreetmap.org';
  private readonly MAX_RESULTS = 5000;
  private readonly logger = new Logger(GeorefService.name);

  // Cache para las provincias y municipios de GeoRef para evitar llamadas repetitivas
  private cachedProvinces: GeorefProvince[] | null = null;
  private cachedMunicipalities: GeorefMunicipality[] | null = null;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Obtiene todas las provincias de Argentina desde la API de GeoRef.
   * Utiliza caché para evitar llamadas repetitivas.
   * @returns Una promesa que resuelve con un array de objetos GeorefProvince.
   */
  async getProvinces(): Promise<GeorefProvince[]> {
    if (this.cachedProvinces) {
      this.logger.debug('[GeorefService Backend] Returning provinces from cache.');
      return this.cachedProvinces;
    }
    try {
      this.logger.debug('[GeorefService Backend] Fetching provinces from GeoRef API...');
      const response = await firstValueFrom(this.httpService.get<GeorefProvincesResponse>(`${this.GEOREF_API_BASE_URL}/provincias?max=${this.MAX_RESULTS}`));
      this.cachedProvinces = response.data.provincias || [];
      this.logger.debug(`[GeorefService Backend] Provincias fetched: ${this.cachedProvinces.length} items.`);
      return this.cachedProvinces;
    } catch (error: any) {
      this.handleHttpError(error, 'obtener provincias');
    }
  }

  // ELIMINADO: getDepartments()
  /*
  async getDepartments(): Promise<GeorefDepartment[]> {
    try {
      this.logger.debug('[GeorefService Backend] Fetching all departments from GeoRef API...');
      const response = await firstValueFrom(this.httpService.get<GeorefDepartmentsResponse>(`${this.GEOREF_API_BASE_URL}/departamentos?max=${this.MAX_RESULTS}`));
      return response.data.departamentos || [];
    } catch (error: any) {
      this.handleHttpError(error, 'obtener todos los departamentos');
    }
  }
  */

  // ELIMINADO: getDepartmentsByProvince()
  /*
  async getDepartmentsByProvince(provinciaId: string): Promise<GeorefDepartment[]> {
    try {
      this.logger.debug(`[GeorefService Backend] Fetching departments for province ID: ${provinciaId}...`);
      const response = await firstValueFrom(this.httpService.get<GeorefDepartmentsResponse>(
        `${this.GEOREF_API_BASE_URL}/departamentos?provincia=${provinciaId}&max=${this.MAX_RESULTS}`
      ));
      return response.data.departamentos || [];
    } catch (error: any) {
      this.handleHttpError(error, `obtener departamentos para provincia ID ${provinciaId}`);
    }
  }
  */

  /**
   * Obtiene todos los municipios de Argentina desde la API de GeoRef.
   * Utiliza caché para evitar llamadas repetitivas.
   * @returns Una promesa que resuelve con un array de objetos GeorefMunicipality.
   */
  async getMunicipalities(): Promise<GeorefMunicipality[]> {
    if (this.cachedMunicipalities) {
      this.logger.debug('[GeorefService Backend] Returning municipalities from cache.');
      return this.cachedMunicipalities;
    }
    try {
      this.logger.debug('[GeorefService Backend] Fetching municipalities from GeoRef API...');
      const response = await firstValueFrom(this.httpService.get<GeorefMunicipalitiesResponse>(`${this.GEOREF_API_BASE_URL}/municipios?max=${this.MAX_RESULTS}`));
      this.cachedMunicipalities = response.data.municipios || [];
      this.logger.debug(`[GeorefService Backend] Municipios fetched: ${this.cachedMunicipalities.length} items.`);
      return this.cachedMunicipalities;
    } catch (error: any) {
      this.handleHttpError(error, 'obtener todos los municipios');
    }
  }

  // ELIMINADO: getMunicipalitiesByDepartment()
  /*
  async getMunicipalitiesByDepartment(departamentoId: string): Promise<GeorefMunicipality[]> {
    try {
      this.logger.debug(`[GeorefService Backend] Fetching municipalities for department ID: ${departamentoId}...`);
      const response = await firstValueFrom(this.httpService.get<GeorefMunicipalitiesResponse>(
        `${this.GEOREF_API_BASE_URL}/municipios?departamento=${departamentoId}&max=${this.MAX_RESULTS}`
      ));
      return response.data.municipios || [];
    } catch (error: any) {
      this.handleHttpError(error, `obtener municipios para departamento ID ${departamentoId}`);
    }
  }
  */

  /**
   * Realiza una geocodificación (búsqueda de dirección) usando la API de NOMINATIM.
   * Esta es la función principal para obtener coordenadas de una dirección textual.
   * @param street La calle a buscar.
   * @param number La altura de la calle (opcional).
   * @param provinceName El nombre de la provincia.
   * @param municipalityName El nombre del municipio/ciudad.
   * @returns Un array de objetos de dirección coincidentes (mapeado a GeorefDireccion).
   */
  async buscarDireccion(
    street: string,
    number: number | undefined,
    provinceName: string,
    municipalityName: string
  ): Promise<GeorefDireccion[]> {
    // Construimos la consulta para Nominatim search
    let query = `${street}`;
    if (number) {
        query += ` ${number}`;
    }
    if (municipalityName) {
        query += `, ${municipalityName}`;
    }
    if (provinceName) {
        query += `, ${provinceName}`;
    }
    query += `, Argentina`; // Asegurar que la búsqueda es en Argentina

    const nominatimUrl = `${this.NOMINATIM_API_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    this.logger.debug(`[GeorefService Backend] Iniciando búsqueda de dirección con Nominatim Search: ${nominatimUrl}`);

    try {
        const response = await firstValueFrom(this.httpService.get<NominatimSearchResponse[]>(nominatimUrl, {
            headers: { 'User-Agent': 'RestoFinderApp/1.0 (contact@example.com)' }
        }));
        const data = response.data;

        if (data && data.length > 0) {
            const result = data[0]; // Tomamos el primer y más relevante resultado
            this.logger.debug(`[GeorefService Backend] Resultado Nominatim Search:`, result);

            // Mapeamos el resultado de Nominatim a la interfaz GeorefDireccion
            // Intentaremos poblar los IDs de GeoRef si tenemos los nombres
            const allProvinces = await this.getProvinces();
            const allMunicipalities = await this.getMunicipalities();

            let georefProvince: GeorefEntityRef | undefined;
            let georefMunicipality: GeorefEntityRef | undefined;

            const detectedProvinceName = result.address?.state || result.address?.province || provinceName;
            if (detectedProvinceName) {
                const foundProv = allProvinces.find(p => this.normalizeName(p.nombre) === this.normalizeName(detectedProvinceName));
                if (foundProv) {
                    georefProvince = { id: foundProv.id, nombre: foundProv.nombre };
                }
            }

            const detectedMunicipalityName = this.cleanMunicipalityName(result.address?.city || result.address?.town || result.address?.village || result.address?.suburb || result.address?.county || municipalityName);
            if (detectedMunicipalityName) {
                const possibleMunicipalities = georefProvince ? allMunicipalities.filter(m => m.provincia.id === georefProvince?.id) : allMunicipalities;
                const foundMun = possibleMunicipalities.find(m => this.normalizeName(m.nombre) === this.normalizeName(detectedMunicipalityName));
                if (foundMun) {
                    georefMunicipality = { id: foundMun.id, nombre: foundMun.nombre };
                }
            }


            const mappedDireccion: GeorefDireccion = {
                nombre_completo: result.display_name,
                calle: { id: result.address?.road || '', nombre: result.address?.road || '' },
                altura: result.address?.house_number ? { valor: Number(result.address.house_number) } : undefined,
                provincia: georefProvince || { id: '', nombre: detectedProvinceName || provinceName || '' },
                municipio: georefMunicipality || { id: '', nombre: detectedMunicipalityName || municipalityName || '' },
                localidad: georefMunicipality || { id: '', nombre: detectedMunicipalityName || municipalityName || '' },
                pais: { id: result.address?.country_code || '', nombre: result.address?.country || 'Argentina' },
                codigo_postal: result.address?.postcode || undefined,
                ubicacion: { lat: Number(result.lat), lon: Number(result.lon) }
            };
            return [mappedDireccion];
        } else {
            this.logger.warn(`[GeorefService Backend] No se encontraron resultados de Nominatim Search para la dirección: ${query}`);
            return [];
        }

    } catch (error: any) {
      this.handleHttpError(error, `buscar dirección con Nominatim Search: ${query}`);
    }
  }


  /**
   * Realiza una geocodificación inversa (obtener dirección a partir de coordenadas) usando la API de NOMINATIM.
   * Luego, intenta mapear la provincia y el municipio a los IDs de GeoRef.
   * @param lat La latitud.
   * @param lon La Longitud.
   * @returns Una promesa que resuelve con un array de objetos GeorefDireccion.
   */
  async getDireccionPorCoordenadas(lat: number, lon: number): Promise<GeorefDireccion[]> {
    try {
      this.logger.debug(`[GeorefService Backend] Iniciando geocodificación inversa con Nominatim para lat: ${lat}, lon: ${lon}`);
      const nominatimUrl = `${this.NOMINATIM_API_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

      const response = await firstValueFrom(this.httpService.get<NominatimReverseResponse>(nominatimUrl, {
        headers: {
          'User-Agent': 'RestoFinderApp/1.0 (contact@example.com)' // Política de uso de Nominatim
        }
      }));

      const data = response.data;
      if (data && data.address) {
        const address = data.address;

        let georefProvinceId: string | undefined;
        let georefProvinceName: string | undefined;
        let georefMunicipalityId: string | undefined;
        let georefMunicipalityName: string | undefined;

        // 1. Obtener todas las provincias y municipios de GeoRef (con caché)
        const allProvinces = await this.getProvinces();
        const allMunicipalities = await this.getMunicipalities();

        // 2. Intentar encontrar la provincia de GeoRef usando el nombre de Nominatim
        const nominatimStateName = address.state || address.province;
        if (nominatimStateName) {
            const foundProvince = allProvinces.find(p => this.normalizeName(p.nombre) === this.normalizeName(nominatimStateName));
            if (foundProvince) {
                georefProvinceId = foundProvince.id;
                georefProvinceName = foundProvince.nombre;
            } else {
                this.logger.warn(`[GeorefService Backend] No se encontró provincia GeoRef para el estado de Nominatim: "${nominatimStateName}"`);
            }
        } else {
            this.logger.warn(`[GeorefService Backend] La respuesta de Nominatim no contenía 'state' o 'province' para geocodificación inversa.`);
        }

        // 3. Intentar encontrar el municipio de GeoRef usando el nombre de Nominatim.
        // Se limpian los nombres de los candidatos de ciudad de Nominatim antes de comparar.
        const nominatimCityCandidateNames = [
          address.city, address.town, address.village, address.suburb, address.county, address.local_administrative_area, address.hamlet
        ].filter(Boolean).map(name => this.cleanMunicipalityName(name!));

        for (const candidateName of nominatimCityCandidateNames) {
            let possibleMunicipalities = allMunicipalities;
            if (georefProvinceId) {
                possibleMunicipalities = allMunicipalities.filter(m => m.provincia.id === georefProvinceId);
            }

            const foundMunicipality = possibleMunicipalities.find(m => this.normalizeName(m.nombre) === this.normalizeName(candidateName));
            if (foundMunicipality) {
                georefMunicipalityId = foundMunicipality.id;
                georefMunicipalityName = foundMunicipality.nombre;
                if (!georefProvinceId && foundMunicipality.provincia?.id) {
                    georefProvinceId = foundMunicipality.provincia.id;
                    georefProvinceName = foundMunicipality.provincia.nombre;
                }
                break;
            }
        }
        if (!georefMunicipalityId) {
            this.logger.warn(`[GeorefService Backend] No se encontró municipio GeoRef para los candidatos de ciudad de Nominatim (limpiados): ${nominatimCityCandidateNames.join(', ')}`);
        }


        // Mapear la respuesta de Nominatim a GeorefDireccion, usando los IDs de GeoRef encontrados
        const mappedDireccion: GeorefDireccion = {
          nombre_completo: data.display_name || 'Dirección no disponible',
          calle: {
            id: address.road || '',
            nombre: address.road || '',
          },
          altura: address.house_number ? { valor: Number(address.house_number) } : undefined,
          provincia: {
            id: georefProvinceId || '',
            nombre: georefProvinceName || nominatimStateName || '',
          },
          municipio: {
            id: georefMunicipalityId || '',
            nombre: georefMunicipalityName || nominatimCityCandidateNames[0] || '',
          },
          localidad: {
            id: georefMunicipalityId || '',
            nombre: georefMunicipalityName || nominatimCityCandidateNames[0] || '',
          },
          localidad_censal: {
            id: address.suburb || '',
            nombre: address.suburb || '',
          },
          pais: {
            id: address.country_code || '',
            nombre: address.country || '',
          },
          codigo_postal: address.postcode || undefined,
          ubicacion: {
            lat: Number(data.lat),
            lon: Number(data.lon)
          }
        };
        this.logger.debug(`[GeorefService Backend] Dirección geocodificada por Nominatim & GeoRef: ${mappedDireccion.nombre_completo}`);
        this.logger.debug(`[GeorefService Backend] ID Provincia GeoRef: ${mappedDireccion.provincia.id}, Nombre Provincia GeoRef: ${mappedDireccion.provincia.nombre}`);
        this.logger.debug(`[GeorefService Backend] ID Municipio GeoRef: ${mappedDireccion.municipio?.id}, Nombre Municipio GeoRef: ${mappedDireccion.municipio?.nombre}`);
        return [mappedDireccion];
      } else {
        this.logger.warn(`[GeorefService Backend] No se encontró dirección en la respuesta de Nominatim para: ${lat}, ${lon}`);
        return [];
      }
    } catch (error: any) {
      this.handleHttpError(error, `geocodificación inversa con Nominatim/GeoRef lookup para lat ${lat}, lon ${lon}`);
    }
  }

  /**
   * Helper para normalizar nombres (eliminar acentos, convertir a minúsculas, trim) para comparaciones.
   * @param name El nombre a normalizar.
   * @returns El nombre normalizado.
   */
  private normalizeName(name: string): string {
    if (typeof name !== 'string' || !name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  /**
   * Helper para limpiar nombres de municipios de prefijos no deseados.
   * @param name El nombre del municipio.
   * @returns El nombre limpio.
   */
  private cleanMunicipalityName(name: string): string {
    if (typeof name !== 'string' || !name) return '';
    let cleaned = name.replace(/^municipio\s+de\s+/i, ''); // Eliminar "Municipio de " (case-insensitive)
    cleaned = cleaned.replace(/^partido\s+de\s+/i, '');   // Eliminar "Partido de " (por si acaso)
    return cleaned.trim();
  }

  /**
   * Manejador de errores centralizado para las solicitudes HTTP.
   * @param error El error de Axios o genérico.
   * @param context Un mensaje que describe la operación que falló.
   */
  private handleHttpError(error: unknown, context: string): never {
    if (error instanceof AxiosError) {
      this.logger.error(`[GeorefService] Error al ${context}:`, error.response?.data || error.message);
      throw new InternalServerErrorException({
        message: `Error al contactar al servicio externo para ${context}`,
        details: error.response?.data || error.message,
        statusCode: error.response?.status || 500,
      });
    } else {
      this.logger.error(`[GeorefService] Error inesperado al ${context}:`, error);
      throw new InternalServerErrorException(`Error interno del servidor al ${context}.`);
    }
  }
}
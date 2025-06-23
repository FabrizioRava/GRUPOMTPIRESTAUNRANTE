import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

import {
  Centroide,
  GeorefEntityRef,
  GeorefProvince,
  GeorefMunicipality,
  GeorefDireccion,
  GeorefProvincesResponse,
  GeorefMunicipalitiesResponse,
  GeorefLocalidadesResponse,
  GeorefDireccionesResponse
} from './georef-models';

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
}

interface NominatimReverseResponse {
  lat: string;
  lon: string;
  display_name: string;
  address: NominatimAddress;
  osm_id: number;
  osm_type: string;
}

interface NominatimSearchResponse {
  lat: string;
  lon: string;
  display_name: string;
  osm_id: number;
  osm_type: string;
  boundingbox: [string, string, string, string];
  type: string;
  class: string;
  address?: NominatimAddress;
}

@Injectable()
export class GeorefService {
  private readonly GEOREF_API_BASE_URL = 'https://apis.datos.gob.ar/georef/api';
  private readonly NOMINATIM_API_BASE_URL = 'https://nominatim.openstreetmap.org';
  private readonly MAX_RESULTS = 5000;
  private readonly logger = new Logger(GeorefService.name);

  private cachedProvinces: GeorefProvince[] | null = null;
  private cachedMunicipalities: GeorefMunicipality[] | null = null;
  private cachedLocalidadesAsMunicipalities: GeorefMunicipality[] | null = null;

  constructor(private readonly httpService: HttpService) {}

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

  async getMunicipalities(provinciaId?: string): Promise<GeorefMunicipality[]> {
    const allProvinces = await this.getProvinces();
    const santiagoDelEstero = allProvinces.find(p => this.normalizeName(p.nombre) === this.normalizeName('Santiago del Estero'));
    const santaCruz = allProvinces.find(p => this.normalizeName(p.nombre) === this.normalizeName('Santa Cruz'));

    let useLocalidadesEndpoint = false;
    let endpointUrl: string;
    let cacheToUse: GeorefMunicipality[] | null = null;
    let updateMainMunicipalitiesCache = false;

    if (provinciaId && (provinciaId === santiagoDelEstero?.id || provinciaId === santaCruz?.id)) {
      useLocalidadesEndpoint = true;
      endpointUrl = `${this.GEOREF_API_BASE_URL}/localidades?provincia=${provinciaId}&max=${this.MAX_RESULTS}`;
      cacheToUse = this.cachedLocalidadesAsMunicipalities;
      this.logger.debug(`[GeorefService Backend] Requesting LOCALIDADES for provinciaId: ${provinciaId}`);
    } else if (provinciaId) {
      endpointUrl = `${this.GEOREF_API_BASE_URL}/municipios?provincia=${provinciaId}&max=${this.MAX_RESULTS}`;
      cacheToUse = this.cachedMunicipalities;
      this.logger.debug(`[GeorefService Backend] Requesting MUNICIPIOS for provinciaId: ${provinciaId}`);
    } else {
      endpointUrl = `${this.GEOREF_API_BASE_URL}/municipios?max=${this.MAX_RESULTS}`;
      cacheToUse = this.cachedMunicipalities;
      updateMainMunicipalitiesCache = true;
      this.logger.debug('[GeorefService Backend] Fetching ALL municipalities (no provinciaId specified).');
    }

    if (cacheToUse) {
        if (!provinciaId && updateMainMunicipalitiesCache) {
            this.logger.debug('[GeorefService Backend] Returning all municipalities from cache.');
            return cacheToUse;
        } else if (provinciaId) {
            const filteredFromCache = cacheToUse.filter(m => m.provincia.id === provinciaId);
            if (filteredFromCache.length > 0) {
                this.logger.debug(`[GeorefService Backend] Returning cached data for provinciaId ${provinciaId}.`);
                return filteredFromCache;
            }
        }
    }

    try {
      const response = await firstValueFrom(this.httpService.get<any>(endpointUrl));

      let result: GeorefMunicipality[];

      if (useLocalidadesEndpoint) {
        const localidadesRaw = (response.data as GeorefLocalidadesResponse).localidades || [];
        result = localidadesRaw.map(localidad => ({
          id: localidad.id,
          nombre: localidad.nombre,
          provincia: {
            id: localidad.provincia.id,
            nombre: localidad.provincia.nombre
          },
          centroide: localidad.centroide ? { lat: localidad.centroide.lat, lon: localidad.centroide.lon } : undefined,
          categoria: localidad.categoria || undefined
        }));
        this.logger.debug(`[GeorefService Backend] Localidades fetched and mapped: ${result.length} items for provinciaId: ${provinciaId}.`);

        result.forEach(loc => {
            if (loc.centroide) {
                this.logger.debug(`  - Localidad: ${loc.nombre}, Centroide: Lat ${loc.centroide.lat}, Lon ${loc.centroide.lon}`);
            } else {
                this.logger.warn(`  - Localidad: ${loc.nombre}, SIN CENTROIDE`);
            }
        });

        if (this.cachedLocalidadesAsMunicipalities) {
            this.cachedLocalidadesAsMunicipalities = [
                ...this.cachedLocalidadesAsMunicipalities.filter(loc => loc.provincia.id !== provinciaId),
                ...result
            ];
        } else {
            this.cachedLocalidadesAsMunicipalities = result;
        }

      } else {
        result = (response.data as GeorefMunicipalitiesResponse).municipios || [];
        this.logger.debug(`[GeorefService Backend] Municipios fetched: ${result.length} items (for provinciaId: ${provinciaId || 'all'}).`);
        if (updateMainMunicipalitiesCache) {
            this.cachedMunicipalities = result;
        }
      }

      return result;

    } catch (error: any) {
      this.handleHttpError(error, `obtener ${useLocalidadesEndpoint ? 'localidades' : 'municipios'}`);
    }
  }

  async buscarDireccion(
    street: string,
    number: number | undefined,
    provinceName: string,
    municipalityName: string
  ): Promise<GeorefDireccion[]> {
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
    query += `, Argentina`;

    const nominatimUrl = `${this.NOMINATIM_API_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    this.logger.debug(`[GeorefService Backend] Iniciando búsqueda de dirección con Nominatim Search: ${nominatimUrl}`);

    try {
        const response = await firstValueFrom(this.httpService.get<NominatimSearchResponse[]>(nominatimUrl, {
            headers: { 'User-Agent': 'RestoFinderApp/1.0 (contact@example.com)' }
        }));
        const data = response.data;

        if (data && data.length > 0) {
            const result = data[0];
            this.logger.debug(`[GeorefService Backend] Resultado Nominatim Search:`, result);

            const allProvinces = await this.getProvinces();
            const santiagoDelEstero = allProvinces.find(p => this.normalizeName(p.nombre) === this.normalizeName('Santiago del Estero'));
            const santaCruz = allProvinces.find(p => this.normalizeName(p.nombre) === this.normalizeName('Santa Cruz'));

            const allMunicipalities = await this.getMunicipalities();
            const santiagoLocalidades = santiagoDelEstero ? await this.getMunicipalities(santiagoDelEstero.id) : [];
            const santaCruzLocalidades = santaCruz ? await this.getMunicipalities(santaCruz.id) : [];

            const combinedLocations = [
                ...allMunicipalities,
                ...santiagoLocalidades,
                ...santaCruzLocalidades
            ].filter((v, i, a) => a.findIndex(t => (t.id === v.id && t.nombre === v.nombre && t.provincia.id === v.provincia.id)) === i);

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
                const possibleLocations = georefProvince ? combinedLocations.filter(m => m.provincia.id === georefProvince?.id) : combinedLocations;
                const foundLoc = possibleLocations.find(loc => this.normalizeName(loc.nombre) === this.normalizeName(detectedMunicipalityName));
                if (foundLoc) {
                    georefMunicipality = { id: foundLoc.id, nombre: foundLoc.nombre };
                }
            }

            const mappedDireccion: GeorefDireccion = {
                nombre_completo: result.display_name,
                calle: { id: result.address?.road || '', nombre: result.address?.road || '' },
                altura: result.address?.house_number ? { valor: Number(result.address.house_number) } : undefined,
                provincia: georefProvince || { id: '', nombre: detectedProvinceName || provinceName || '' },
                municipio: georefMunicipality || { id: '', nombre: detectedMunicipalityName || municipalityName || '' },
                localidad: georefMunicipality || { id: '', nombre: detectedMunicipalityName || municipalityName || '' },
                localidad_censal: georefMunicipality || { id: '', nombre: detectedMunicipalityName || municipalityName || '' },
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

  async getDireccionPorCoordenadas(lat: number, lon: number): Promise<GeorefDireccion[]> {
    try {
      this.logger.debug(`[GeorefService Backend] Iniciando geocodificación inversa con Nominatim para lat: ${lat}, lon: ${lon}`);
      const nominatimUrl = `${this.NOMINATIM_API_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

      const response = await firstValueFrom(this.httpService.get<NominatimReverseResponse>(nominatimUrl, {
        headers: { 'User-Agent': 'RestoFinderApp/1.0 (contact@example.com)' }
      }));

      const data = response.data;
      if (data && data.address) {
        const address = data.address;

        let georefProvinceId: string | undefined;
        let georefProvinceName: string | undefined;
        let georefMunicipalityId: string | undefined;
        let georefMunicipalityName: string | undefined;

        const allProvinces = await this.getProvinces();
        const santiagoDelEstero = allProvinces.find(p => this.normalizeName(p.nombre) === this.normalizeName('Santiago del Estero'));
        const santaCruz = allProvinces.find(p => this.normalizeName(p.nombre) === this.normalizeName('Santa Cruz'));

        const allMunicipalities = await this.getMunicipalities();
        const santiagoLocalidades = santiagoDelEstero ? await this.getMunicipalities(santiagoDelEstero.id) : [];
        const santaCruzLocalidades = santaCruz ? await this.getMunicipalities(santaCruz.id) : [];

        const combinedLocations = [
            ...allMunicipalities,
            ...santiagoLocalidades,
            ...santaCruzLocalidades
        ].filter((v, i, a) => a.findIndex(t => (t.id === v.id && t.nombre === v.nombre && t.provincia.id === v.provincia.id)) === i);


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

        const nominatimCityCandidateNames = [
          address.city, address.town, address.village, address.suburb, address.county, address.local_administrative_area, address.hamlet
        ].filter(Boolean).map(name => this.cleanMunicipalityName(name!));

        for (const candidateName of nominatimCityCandidateNames) {
            let possibleLocationsForProvince = combinedLocations;
            if (georefProvinceId) {
                possibleLocationsForProvince = combinedLocations.filter(loc => loc.provincia.id === georefProvinceId);
            }

            const foundLocation = possibleLocationsForProvince.find(loc => this.normalizeName(loc.nombre) === this.normalizeName(candidateName));
            if (foundLocation) {
                georefMunicipalityId = foundLocation.id;
                georefMunicipalityName = foundLocation.nombre;
                if (!georefProvinceId && foundLocation.provincia?.id) {
                    georefProvinceId = foundLocation.provincia.id;
                    georefProvinceName = foundLocation.provincia.nombre;
                }
                break;
            }
        }
        if (!georefMunicipalityId) {
            this.logger.warn(`[GeorefService Backend] No se encontró municipio/localidad GeoRef para los candidatos de ciudad de Nominatim (limpiados): ${nominatimCityCandidateNames.join(', ')}`);
        }

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
            id: address.suburb || georefMunicipalityId || '',
            nombre: address.suburb || georefMunicipalityName || nominatimCityCandidateNames[0] || '',
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
        this.logger.debug(`[GeorefService Backend] ID Municipio/Localidad GeoRef: ${mappedDireccion.municipio?.id}, Nombre Municipio/Localidad GeoRef: ${mappedDireccion.municipio?.nombre}`);
        return [mappedDireccion];
      } else {
        this.logger.warn(`[GeorefService Backend] No se encontró dirección en la respuesta de Nominatim para: ${lat}, ${lon}`);
        return [];
      }
    } catch (error: any) {
      this.handleHttpError(error, `geocodificación inversa con Nominatim/GeoRef lookup para lat ${lat}, lon ${lon}`);
    }
  }

  private normalizeName(name: string): string {
    if (typeof name !== 'string' || !name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  private cleanMunicipalityName(name: string): string {
    if (typeof name !== 'string' || !name) return '';
    let cleaned = name.replace(/^municipio\s+de\s+/i, '');
    cleaned = cleaned.replace(/^partido\s+de\s+/i, '');
    cleaned = cleaned.replace(/^ciudad de\s/i, '');
    cleaned = cleaned.replace(/\s*\(capital\)$/i, '');
    return cleaned.trim();
  }

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
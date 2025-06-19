// --- Archivo Modificado: src/georef/georef.controller.ts (Backend) ---

import { Controller, Get, Query, InternalServerErrorException, Param, HttpStatus } from '@nestjs/common';
import { GeorefService } from './georef.service';
import { // Importa los modelos necesarios
  GeorefProvince,
  // GeorefDepartment, // ELIMINADO: Ya no se usa
  GeorefMunicipality,
  GeorefDireccion,
  GeorefProvincesResponse,
  // GeorefDepartmentsResponse, // ELIMINADO: Ya no se usa
  GeorefMunicipalitiesResponse,
  GeorefDireccionesResponse
} from './georef-models';

@Controller('georef')
export class GeorefController {
  constructor(private readonly georefService: GeorefService) {}

  /**
   * Endpoint para obtener todas las provincias de Argentina desde la API de GeoRef.
   * GET /georef/provincias
   */
  @Get('provincias')
  async getProvincias(): Promise<GeorefProvince[]> {
    try {
      return await this.georefService.getProvinces();
    } catch (error: any) {
      throw error;
    }
  }

  // ELIMINADO: getDepartamentos()
  /*
  @Get('departamentos')
  async getDepartamentos(): Promise<GeorefDepartment[]> {
    try {
      return await this.georefService.getDepartments();
    } catch (error: any) {
      throw error;
    }
  }
  */

  // ELIMINADO: getDepartamentosPorProvinciaId()
  /*
  @Get('departamentos/por-provincia')
  async getDepartamentosPorProvinciaId(@Query('provinciaId') provinciaId: string): Promise<GeorefDepartment[]> {
    if (!provinciaId) {
      throw new InternalServerErrorException('El parámetro "provinciaId" es requerido para filtrar departamentos.');
    }
    try {
      return await this.georefService.getDepartmentsByProvince(provinciaId);
    } catch (error: any) {
      throw error;
    }
  }
  */

  /**
   * Endpoint para obtener todos los municipios de Argentina desde la API de GeoRef.
   * GET /georef/municipios
   */
  @Get('municipios')
  async getMunicipalities(): Promise<GeorefMunicipality[]> {
    try {
      return await this.georefService.getMunicipalities();
    } catch (error: any) {
      throw error;
    }
  }

  // ELIMINADO: getMunicipalitiesByDepartmentId()
  /*
  @Get('municipios/por-departamento')
  async getMunicipalitiesByDepartmentId(@Query('departamentoId') departamentoId: string): Promise<GeorefMunicipality[]> {
    if (!departamentoId) {
      throw new InternalServerErrorException('El parámetro "departamentoId" es requerido para filtrar municipios.');
    }
    try {
      return await this.georefService.getMunicipalitiesByDepartment(departamentoId);
    } catch (error: any) {
      throw error;
    }
  }
  */

  /**
   * Endpoint para buscar una dirección (geocodificación directa) utilizando Nominatim.
   * Ahora espera nombres de provincia y municipio.
   * GET /georef/buscar-direccion?calle={calle}&altura={altura?}&provinciaNombre={nombreProv}&municipioNombre={nombreMun}
   * @param calle El nombre de la calle.
   * @param altura El número de altura (opcional).
   * @param provinciaNombre El nombre de la provincia.
   * @param municipioNombre El nombre del municipio.
   */
  @Get('buscar-direccion')
  async buscarDireccion(
    @Query('calle') calle: string,
    @Query('altura') altura?: string, // Hacemos altura opcional y lo pasamos como string para el servicio
    @Query('provinciaNombre') provinciaNombre?: string, // Nuevo parámetro
    @Query('municipioNombre') municipioNombre?: string // Nuevo parámetro
  ): Promise<GeorefDireccion[]> {
    if (!calle) {
        throw new InternalServerErrorException('El parámetro "calle" es requerido para buscar dirección.');
    }
    try {
      const alturaNum = altura ? Number(altura) : undefined;
      return await this.georefService.buscarDireccion(calle, alturaNum, provinciaNombre || '', municipioNombre || '');
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Endpoint para obtener una dirección a partir de coordenadas (geocodificación inversa).
   * Ahora usa Nominatim a través del servicio y limpia los nombres.
   * GET /georef/direccion-por-coordenadas?lat={latitud}&lon={longitud}
   * @param lat La latitud.
   * @param lon La Longitud.
   */
  @Get('direccion-por-coordenadas')
  async getDireccionPorCoordenadas(
    @Query('lat') lat: string,
    @Query('lon') lon: string
  ): Promise<GeorefDireccion[]> {
    if (!lat || !lon) {
      throw new InternalServerErrorException('Los parámetros "lat" y "lon" son requeridos.');
    }
    try {
      return await this.georefService.getDireccionPorCoordenadas(Number(lat), Number(lon));
    } catch (error: any) {
      throw error;
    }
  }
}
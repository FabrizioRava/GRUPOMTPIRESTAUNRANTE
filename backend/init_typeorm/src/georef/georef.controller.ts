import { Controller, Get, Query, InternalServerErrorException, Param, HttpStatus } from '@nestjs/common';
import { GeorefService } from './georef.service';
import {
  GeorefProvince,
  GeorefMunicipality,
  GeorefDireccion,
  GeorefProvincesResponse,
  GeorefMunicipalitiesResponse,
  GeorefDireccionesResponse
} from './georef-models';

@Controller('georef')
export class GeorefController {
  constructor(private readonly georefService: GeorefService) {}

  @Get('provincias')
  async getProvincias(): Promise<GeorefProvince[]> {
    try {
      return await this.georefService.getProvinces();
    } catch (error: any) {
      throw error;
    }
  }

  @Get('municipios')
  async getMunicipalities(@Query('provinciaId') provinciaId?: string): Promise<GeorefMunicipality[]> {
    try {
      return await this.georefService.getMunicipalities(provinciaId);
    } catch (error: any) {
      throw error;
    }
  }

  @Get('buscar-direccion')
  async buscarDireccion(
    @Query('calle') calle: string,
    @Query('altura') altura?: string,
    @Query('provinciaNombre') provinciaNombre?: string,
    @Query('municipioNombre') municipioNombre?: string
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
// --- Archivo Modificado: src/georef/georef.module.ts (Backend) ---

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeorefController } from './georef.controller';
import { GeorefService } from './georef.service';

@Module({
  imports: [HttpModule],
  controllers: [GeorefController],
  providers: [GeorefService],
  exports: [GeorefService]
})
export class GeorefModule {}
import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GeorefService } from '../../services/georef.service';
import { GeorefProvince, GeorefMunicipality } from '../../models/georef-models';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-location-dropdowns',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './location-dropdowns.component.html',
  styleUrls: ['./location-dropdowns.component.css']
})
export class LocationDropdownsComponent implements OnInit, OnChanges {
  @Input() selectedProvinceId: string | null = null;
  @Input() selectedCityId: string | null = null;
  @Input() forceLoadMunicipalities: boolean = false;

  @Output() provinceChange = new EventEmitter<string | null>();
  @Output() cityChange = new EventEmitter<string | null>();
  @Output() provincesLoaded = new EventEmitter<GeorefProvince[]>();

  provinces: GeorefProvince[] = [];
  municipalities: GeorefMunicipality[] = [];
  isLoadingMunicipalities: boolean = false;
  disableCity: boolean = true;
  isLoadingProvinces: boolean = false; 

  constructor(private georefService: GeorefService) {}

  ngOnInit(): void {
    this.loadProvinces();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedProvinceId'] && changes['selectedProvinceId'].currentValue !== changes['selectedProvinceId'].previousValue) {
        if (this.selectedProvinceId) {
            this.loadMunicipalitiesByProvince(this.selectedProvinceId);
        } else {
            this.municipalities = [];
            this.disableCity = true;
        }
    }

    if (changes['forceLoadMunicipalities'] && changes['forceLoadMunicipalities'].currentValue === true && this.selectedProvinceId) {
      if (!this.isLoadingProvinces) {
         if (this.municipalities.length === 0 || !this.municipalities.some(m => m.provincia.id === this.selectedProvinceId)) {
             this.loadMunicipalitiesByProvince(this.selectedProvinceId);
         }
      }
    }
  }

  async loadProvinces(): Promise<void> {
    if (this.isLoadingProvinces || this.provinces.length > 0) {
      return;
    }

    this.isLoadingProvinces = true;
    try {
      const provinces = await firstValueFrom(this.georefService.getProvinces().pipe(
        catchError(error => {
          console.error('Error al cargar provincias:', error);
          return of([]);
        })
      ));
      this.provinces = provinces.sort((a, b) => a.nombre.localeCompare(b.nombre));
      this.provincesLoaded.emit(this.provinces);

      if (this.selectedProvinceId) {
        this.loadMunicipalitiesByProvince(this.selectedProvinceId);
      }
    } catch (error) {
      console.error('Error al cargar provincias:', error);
    } finally {
      this.isLoadingProvinces = false;
    }
  }

  async loadMunicipalitiesByProvince(provinceId: string): Promise<void> {
    this.isLoadingMunicipalities = true;
    this.municipalities = [];
    this.disableCity = true;

    try {
      const municipalities = await firstValueFrom(this.georefService.getMunicipalitiesByProvinceId(provinceId).pipe(
        catchError(error => {
          console.error('Error al cargar municipios:', error);
          return of([]);
        })
      ));
      this.municipalities = municipalities.sort((a, b) => a.nombre.localeCompare(b.nombre));
      this.disableCity = false;
    } catch (error) {
      console.error('Error al cargar municipios:', error);
    } finally {
      this.isLoadingMunicipalities = false;
    }
  }

  onProvinceChange(newProvinceId: string | null): void {
    this.selectedProvinceId = newProvinceId;
    this.selectedCityId = null;

    this.provinceChange.emit(newProvinceId);
    this.cityChange.emit(null);

    if (newProvinceId) {
      this.loadMunicipalitiesByProvince(newProvinceId);
    } else {
      this.municipalities = [];
      this.disableCity = true;
    }
  }

  onCityChange(newCityId: string | null): void {
    this.selectedCityId = newCityId;
    this.cityChange.emit(newCityId);
  }
}
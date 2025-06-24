import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { debounceTime, distinctUntilChanged, catchError, filter, tap } from 'rxjs/operators';
import { of, Subscription, firstValueFrom } from 'rxjs';

import { GeorefService } from '../../../services/georef.service';
import { LocationPickerComponent, LocationSelectedEvent } from '../../../shared/location-picker/location-picker.component';
import { RestaurantService, CreateRestaurantPayloadForService } from '../../../services/restaurant.service';
import { AuthService } from '../../../services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';
import { LocationDropdownsComponent } from '../../../shared/location-dropdowns/location-dropdowns.component';

import { GeorefProvince, GeorefMunicipality, GeorefDireccion } from '../../../models/georef-models';

interface RestaurantFormValue {
  name: string;
  imageUrl: string;
  description: string;
  address: {
    street: string;
    number: string;
    province: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

@Component({
  selector: 'app-add-restaurant',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LocationPickerComponent,
    LoadingSpinnerComponent,
    LocationDropdownsComponent
  ],
  templateUrl: './add-restaurant.component.html',
  styleUrls: ['./add-restaurant.component.css']
})
export class AddRestaurantComponent implements OnInit, OnDestroy, AfterViewInit {

  restaurantForm!: FormGroup;
  @ViewChild(LocationPickerComponent) locationPicker!: LocationPickerComponent;
  @ViewChild(LocationDropdownsComponent) locationDropdowns!: LocationDropdownsComponent;

  allProvinces: GeorefProvince[] = [];
  allMunicipalitiesForMatching: GeorefMunicipality[] = [];

  private subscriptions = new Subscription();
  private formListenersActive = true;

  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  isEditMode = false;
  restaurantId: number | null = null;

  selectedProvinceForDropdown: string | null = null;
  selectedCityForDropdown: string | null = null;
  forceLoadMunicipalitiesForDropdown = false;
  
  constructor(
    private fb: FormBuilder,
    private georefService: GeorefService,
    private restaurantService: RestaurantService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.setupFormListeners();
    }, 0);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  initForm(): void {
    this.restaurantForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      imageUrl: ['', [Validators.required, Validators.pattern('https?://.+')]],
      description: ['', Validators.maxLength(500)],
      address: this.fb.group({
        street: [{ value: '', disabled: true }, [Validators.required, Validators.maxLength(100)]],
        number: [{ value: '', disabled: true }, [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.maxLength(20)]],
        province: [null as string | null, Validators.required],
        city: [{ value: null as string | null, disabled: true }, Validators.required],
        latitude: [null as number | null, Validators.required],
        longitude: [null as number | null, Validators.required],
      })
    });
  }

  onProvincesLoaded(provinces: GeorefProvince[]): void {
    this.allProvinces = provinces;
    if (!this.isEditMode) {
      this.loadDefaultLocationForNewRestaurant();
    } else if (this.restaurantId) {
      this.loadRestaurantData(this.restaurantId);
    }
  }

  async loadDefaultLocationForNewRestaurant(): Promise<void> {
    this.isLoading = true;
    try {
      const userCityId = String(this.authService.getLoggedInUserCityId());
      let defaultMunicipality: GeorefMunicipality | undefined = undefined;

      if (userCityId) {
        this.allMunicipalitiesForMatching = await firstValueFrom(this.georefService.getMunicipalities().pipe(
          catchError(error => {
            this.handleError('Error al cargar todos los municipios/localidades.', error);
            return of([]);
          })
        ));
        defaultMunicipality = this.allMunicipalitiesForMatching.find(m => m.id === userCityId);
      }

      if (defaultMunicipality && defaultMunicipality.centroide) {
        const lat = defaultMunicipality.centroide.lat;
        const lng = defaultMunicipality.centroide.lon;
        this.locationPicker.setMapCenterAndMarker(lat, lng, 15);
        
        this.onLocationSelected({
          lat: lat,
          lng: lng,
          zoom: this.locationPicker?.map?.getZoom() || 13,
          georefAddress: {
            provinceId: defaultMunicipality.provincia.id,
            provinceName: defaultMunicipality.provincia.nombre,
            municipalityId: defaultMunicipality.id,
            municipalityName: defaultMunicipality.nombre,
            street: undefined,
            number: undefined
          },
          fullGeorefResponse: undefined
        });
      }
      this.isLoading = false;
    } catch (err: any) {
      this.handleError('Error al cargar la ubicación predeterminada.', err);
      this.isLoading = false;
    }
  }

  public cleanName(name: string | null | undefined, type: 'province' | 'city'): string | null {
    if (!name) return null;
    let cleaned = name.trim();

    cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    if (type === 'province') {
      cleaned = cleaned.replace(/^provincia de /i, '');
      if (cleaned === 'ciudad autonoma de buenos aires') {
        return 'caba';
      }
    } else if (type === 'city') {
      cleaned = cleaned.replace(/^(municipio de |partido de |pedania |departamento |ciudad de |localidad |barrio |comision municipal de )/i, '');
      cleaned = cleaned.replace(/\s+-\s*capital$/i, '');
      cleaned = cleaned.replace(/\s*\(capital\)$/i, '');
      cleaned = cleaned.replace(/\s*central(?: de)?/i, '');
      cleaned = cleaned.replace(/\s*y localidades/i, '');
      cleaned = cleaned.replace(/\s*eje vial/i, '');
      cleaned = cleaned.replace(/^ciudad de\s/i, '');
      cleaned = cleaned.replace(/\s*\(.*\)$/, '');
    }

    cleaned = cleaned.replace(/^[-\s]+|[-\s]+$/g, '');

    if (type === 'city' && cleaned === 'capital federal') {
      return 'caba';
    }

    return cleaned.trim();
  }

  private checkEditMode(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.restaurantId = +id;
        }
      })
    );
  }

  setupFormListeners(): void {
    const addressGroup = this.restaurantForm.get('address') as FormGroup;
    const streetControl = addressGroup.get('street');
    const numberControl = addressGroup.get('number');

    this.subscriptions.add(
      addressGroup.valueChanges.pipe(
        debounceTime(1000),
        distinctUntilChanged((prev, curr) => {
          return prev.street === curr.street &&
                 prev.number === curr.number &&
                 prev.province === curr.province &&
                 prev.city === curr.city;
        }),
        filter(() => this.formListenersActive &&
          !!this.locationPicker &&
          !!streetControl?.value &&
          !!numberControl?.value &&
          !!this.restaurantForm.get('address.province')?.value &&
          !!this.restaurantForm.get('address.city')?.value
        )
      ).subscribe(() => {
        this.geocodeManualAddress();
      })
    );
  }

  onProvinceSelected(provinceId: string | null): void {
    this.formListenersActive = false;
    this.restaurantForm.get('address.province')?.setValue(provinceId, { emitEvent: false });
    this.restaurantForm.get('address.city')?.setValue(null, { emitEvent: false });
    this.selectedProvinceForDropdown = provinceId;
    this.selectedCityForDropdown = null;

    if (provinceId) {
      const selectedProvince = this.allProvinces.find(p => p.id === provinceId);
      if (selectedProvince && selectedProvince.centroide && this.locationPicker) {
        this.locationPicker.setMapCenterAndMarker(selectedProvince.centroide.lat, selectedProvince.centroide.lon, 9);
      }
      this.toggleAddressFields(false);
    } else {
      this.toggleAddressFields(false);
    }
    this.formListenersActive = true;
  }

  onCitySelected(cityId: string | null): void {
    this.formListenersActive = false;
    this.restaurantForm.get('address.city')?.setValue(cityId, { emitEvent: false });
    this.selectedCityForDropdown = cityId;

    if (cityId) {
      this.georefService.getMunicipalitiesByProvinceId(this.selectedProvinceForDropdown!).pipe(
        catchError(error => {
          this.handleError('Error al cargar municipios para centrar el mapa.', error);
          return of([]);
        })
      ).subscribe(municipalities => {
        const municipality = municipalities.find(m => m.id === cityId);
        if (municipality && municipality.centroide && this.locationPicker) {
          this.locationPicker.setMapCenterAndMarker(municipality.centroide.lat, municipality.centroide.lon, 15);
          this.toggleAddressFields(true);
        } else {
          this.toggleAddressFields(false);
          this.restaurantForm.patchValue({ address: { latitude: null, longitude: null } }, { emitEvent: false });
        }
        this.formListenersActive = true;
      });
    } else {
      this.toggleAddressFields(false);
      this.restaurantForm.patchValue({ address: { latitude: null, longitude: null } }, { emitEvent: false });
      this.formListenersActive = true;
    }
  }

  private toggleAddressFields(enable: boolean): void {
    const streetControl = this.restaurantForm.get('address.street');
    const numberControl = this.restaurantForm.get('address.number');
    if (enable) {
      streetControl?.enable({ emitEvent: false });
      numberControl?.enable({ emitEvent: false });
    } else {
      streetControl?.disable({ emitEvent: false });
      numberControl?.disable({ emitEvent: false });
    }
  }

  async onLocationSelected(event: LocationSelectedEvent): Promise<void> {
    this.formListenersActive = false;

    this.restaurantForm.patchValue({
      address: {
        latitude: event.lat,
        longitude: event.lng
      }
    }, { emitEvent: false });

    if (!event.fullGeorefResponse) {
      this.clearAddressFields();
      this.selectedProvinceForDropdown = null;
      this.selectedCityForDropdown = null;
      this.toggleAddressFields(false);
      this.formListenersActive = true;
      this.restaurantForm.updateValueAndValidity();
      return;
    }

    this.isLoading = true;

    try {
      const direcciones: GeorefDireccion[] = await firstValueFrom(
        this.georefService.getDireccionPorCoordenadas(event.lat, event.lng).pipe(
          catchError(error => {
            this.handleError('No se pudo obtener la dirección completa para esta ubicación desde el mapa.', error);
            this.clearAddressFields();
            this.selectedProvinceForDropdown = null;
            this.selectedCityForDropdown = null;
            this.toggleAddressFields(false);
            return of([]);
          })
        )
      );

      this.isLoading = false;
      if (!direcciones || direcciones.length === 0) {
        this.errorMessage = 'No se encontraron detalles de dirección para las coordenadas seleccionadas.';
        this.clearAddressFields();
        this.selectedProvinceForDropdown = null;
        this.selectedCityForDropdown = null;
        this.toggleAddressFields(false);
        this.formListenersActive = true;
        this.restaurantForm.updateValueAndValidity();
        return;
      }

      const georefDireccion = direcciones[0];

      let provinceIdToSet: string | null = null;
      let municipalityIdToSet: string | null = null;

      if (georefDireccion.provincia?.id) {
        const matchedProvinceById = this.allProvinces.find(p => p.id === georefDireccion.provincia?.id);
        if (matchedProvinceById) {
          provinceIdToSet = matchedProvinceById.id;
        }
      }
      if (!provinceIdToSet && georefDireccion.provincia?.nombre) {
        const cleanedGeoRefProvinceName = this.cleanName(georefDireccion.provincia.nombre, 'province');
        const matchedProvinceByName = this.allProvinces.find(
          p => this.cleanName(p.nombre, 'province')?.toLowerCase() === cleanedGeoRefProvinceName?.toLowerCase()
        );
        if (matchedProvinceByName) {
          provinceIdToSet = matchedProvinceByName.id;
        }
      }

      if (!provinceIdToSet) {
          this.clearAddressFields();
          this.selectedProvinceForDropdown = null;
          this.selectedCityForDropdown = null;
          this.toggleAddressFields(false);
          this.formListenersActive = true;
          this.restaurantForm.updateValueAndValidity();
          return;
      }

      let potentialNamesFromGeoRef: string[] = [];

      if (georefDireccion.municipio?.nombre) {
        potentialNamesFromGeoRef.push(georefDireccion.municipio.nombre);
      }
      if (georefDireccion.localidad?.nombre) {
        potentialNamesFromGeoRef.push(georefDireccion.localidad.nombre);
      }
      if (georefDireccion.localidad_censal?.nombre) {
          potentialNamesFromGeoRef.push(georefDireccion.localidad_censal.nombre);
      }

      const fullAddress = georefDireccion.nombre_completo || '';

      const regexMatchPrimaryCity = /^(?:[^,]+,\s*)*(?:Ciudad de\s*)?([^,]+?)(?:,\s*(?:Departamento|Partido|Pedanía|Barrio|Comuna|Localidad Censal|Provincia de))?/i;
      const primaryCityMatch = fullAddress.match(regexMatchPrimaryCity);

      if (primaryCityMatch && primaryCityMatch[1]) {
          const extractedPrimaryCity = primaryCityMatch[1].trim();
          if (this.cleanName(extractedPrimaryCity, 'city') !== this.cleanName(georefDireccion.provincia?.nombre, 'province')) {
              potentialNamesFromGeoRef.push(extractedPrimaryCity);
          }
      }

      const municipalityMatchFromFull = fullAddress.match(/Municipio de ([^,]+)/i);
      if (municipalityMatchFromFull && municipalityMatchFromFull[1]) {
          potentialNamesFromGeoRef.push(municipalityMatchFromFull[1].trim());
      }

      potentialNamesFromGeoRef = Array.from(new Set(potentialNamesFromGeoRef.filter(name => name && name.trim() !== '')));

      let matchedMunicipality: GeorefMunicipality | undefined;
      const municipalitiesInProvince = await firstValueFrom(this.georefService.getMunicipalitiesByProvinceId(provinceIdToSet));

      if (georefDireccion.municipio?.id) {
          matchedMunicipality = municipalitiesInProvince.find(m => m.id === georefDireccion.municipio?.id);
      }

      if (!matchedMunicipality) {
        for (const nameRaw of potentialNamesFromGeoRef) {
            const searchNameCleaned = this.cleanName(nameRaw, 'city');
            if (searchNameCleaned) {
                matchedMunicipality = municipalitiesInProvince.find(
                    m => {
                        const cleanedMuniName = this.cleanName(m.nombre, 'city');
                        return cleanedMuniName?.toLowerCase() === searchNameCleaned.toLowerCase();
                    }
                );
                if (matchedMunicipality) {
                    break;
                }
            }
        }
      }

      if (!matchedMunicipality) {
          const selectedProvinceGeoRef = this.allProvinces.find(p => p.id === provinceIdToSet);
          const cleanedProvinceName = this.cleanName(selectedProvinceGeoRef?.nombre, 'province');
          const capitalMunicipality = municipalitiesInProvince.find(
              m => this.cleanName(m.nombre, 'city')?.toLowerCase() === 'capital' ||
                   this.cleanName(m.nombre, 'city')?.toLowerCase() === cleanedProvinceName ||
                   this.cleanName(m.nombre, 'city')?.toLowerCase() === `ciudad de ${cleanedProvinceName}` ||
                   (cleanedProvinceName === 'santiago del estero' && this.cleanName(m.nombre, 'city') === 'santiago del estero')
          );
          if (capitalMunicipality) {
              matchedMunicipality = capitalMunicipality;
          }
      }

      if (!matchedMunicipality) {
        for (const nameRaw of potentialNamesFromGeoRef) {
            const searchNameCleaned = this.cleanName(nameRaw, 'city');
            if (searchNameCleaned) {
                matchedMunicipality = municipalitiesInProvince.find(m => {
                    const cleanedMuniName = this.cleanName(m.nombre, 'city');
                    return cleanedMuniName && cleanedMuniName.includes(searchNameCleaned);
                });
                if (matchedMunicipality) {
                    break;
                }
            }
        }
      }

      if (matchedMunicipality) {
        municipalityIdToSet = matchedMunicipality.id;
      } else {
        municipalityIdToSet = null;
      }

      this.selectedProvinceForDropdown = provinceIdToSet;
      this.selectedCityForDropdown = municipalityIdToSet;

      this.restaurantForm.patchValue({
        address: {
          street: georefDireccion.calle?.nombre || '',
          number: georefDireccion.altura?.valor !== undefined && georefDireccion.altura.valor !== null ? String(georefDireccion.altura.valor) : null,
          province: provinceIdToSet,
          city: municipalityIdToSet
        }
      }, { emitEvent: false });

      this.toggleAddressFields(!!municipalityIdToSet);

      if (georefDireccion.ubicacion && (georefDireccion.ubicacion.lat !== event.lat || georefDireccion.ubicacion.lon !== event.lng)) {
          this.locationPicker.setMapCenterAndMarker(georefDireccion.ubicacion.lat, georefDireccion.ubicacion.lon, 17);
      } else {
          this.locationPicker.setMapCenterAndMarker(event.lat, event.lng, 17);
      }

      this.successMessage = 'Ubicación actualizada desde el mapa.';
      this.formListenersActive = true;
      this.restaurantForm.updateValueAndValidity();
    } catch (err: any) {
      this.handleError('Error en la obtención de dirección inversa desde GeoRef', err);
      this.clearAddressFields();
      this.selectedProvinceForDropdown = null;
      this.selectedCityForDropdown = null;
      this.toggleAddressFields(false);
      this.formListenersActive = true;
      this.restaurantForm.updateValueAndValidity();
    }
  }

  private geocodeManualAddress(): void {
    const { street, number, province, city } = this.restaurantForm.get('address')?.getRawValue();

    const selectedProvince = this.allProvinces.find(p => p.id === province);
    let selectedMunicipality: GeorefMunicipality | undefined;

    this.georefService.getMunicipalitiesByProvinceId(province).pipe(
        catchError(error => {
            this.handleError('Error al buscar municipios para geocodificación manual.', error);
            return of([]);
        })
    ).subscribe(municipalities => {
        selectedMunicipality = municipalities.find(m => m.id === city);

        if (street && number && selectedProvince && selectedMunicipality && this.formListenersActive && this.locationPicker) {
            this.isLoading = true;

            const selectedProvinceName = selectedProvince.nombre;
            const selectedMunicipalityName = selectedMunicipality.nombre;

            this.subscriptions.add(
                this.georefService.buscarDireccion(street, number, selectedProvinceName, selectedMunicipalityName).pipe(
                    catchError(error => {
                        this.errorMessage = 'Error al buscar la dirección en el mapa.';
                        this.isLoading = false;
                        return of([]);
                    })
                ).subscribe((direcciones: GeorefDireccion[] | null) => {
                    this.isLoading = false;
                    if (direcciones && direcciones.length > 0) {
                        const primeraDireccion = direcciones[0];
                        const lat = primeraDireccion.ubicacion?.lat;
                        const lon = primeraDireccion.ubicacion?.lon;

                        if (lat !== undefined && lon !== undefined && lat !== null && lon !== null) {
                            this.formListenersActive = false;
                            if (this.restaurantForm.get('address.latitude')?.value !== lat || this.restaurantForm.get('address.longitude')?.value !== lon) {
                                this.restaurantForm.get('address.latitude')?.setValue(lat, { emitEvent: false });
                                this.restaurantForm.get('address.longitude')?.setValue(lon, { emitEvent: false });
                            }
                            this.formListenersActive = true;
                            this.locationPicker.setMapCenterAndMarker(lat, lon);
                            this.successMessage = 'Mapa actualizado con la dirección del formulario.';
                        } else {
                            this.errorMessage = 'Dirección encontrada pero sin coordenadas válidas.';
                        }
                    } else {
                        this.errorMessage = 'No se encontró una dirección precisa para los datos ingresados.';
                    }
                })
            );
        }
    });
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.restaurantForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos obligatorios correctamente.';
      this.markFormGroupTouched(this.restaurantForm);
      return;
    }

    const formValue = this.restaurantForm.getRawValue() as RestaurantFormValue;

    const selectedProvince = this.allProvinces.find(p => p.id === formValue.address.province);
    
    let selectedMunicipality: GeorefMunicipality | undefined;
    if (formValue.address.city && this.locationDropdowns.municipalities) {
      selectedMunicipality = this.locationDropdowns.municipalities.find(m => m.id === formValue.address.city);
    }
    
    if (!selectedProvince || !selectedMunicipality ||
      formValue.address.latitude === null || formValue.address.longitude === null) {
      this.errorMessage = 'Error en la selección de ubicación o coordenadas. Por favor, asegúrese de que la dirección está completa y las coordenadas están en el mapa.';
      return;
    }

    this.isLoading = true;

    const payload: CreateRestaurantPayloadForService = {
      name: formValue.name,
      imageUrl: formValue.imageUrl,
      description: formValue.description || '',
      address: {
        street: formValue.address.street,
        number: formValue.address.number,
        cityId: Number(selectedMunicipality.id),
        city: selectedMunicipality.nombre,
        location: {
          lat: formValue.address.latitude,
          lng: formValue.address.longitude
        }
      },
    };

    const operation = this.isEditMode && this.restaurantId ?
      this.restaurantService.update(this.restaurantId, payload) :
      this.restaurantService.create(payload);

    this.subscriptions.add(
      operation.subscribe({
        next: () => {
          this.handleSuccess();
        },
        error: (err: any) => {
          this.handleError(`Error al ${this.isEditMode ? 'actualizar' : 'crear'} el restaurante`, err);
        }
      })
    );
  }

  private handleSuccess(): void {
    this.isLoading = false;
    this.successMessage = `Restaurante ${this.isEditMode ? 'actualizado' : 'creado'} correctamente!`;
    setTimeout(() => {
      this.router.navigate(['/my-restaurants']);
    }, 1500);
  }

  private handleError(message: string, error: any): void {
    this.isLoading = false;
    this.errorMessage = message;
    if (error) {
      this.errorMessage += `: ${error.error?.message || error.message || 'Error del servidor'}`;
    }
  }

  onCancel(): void {
    if (this.restaurantForm.dirty) {
      if (confirm('¿Está seguro que desea cancelar? Los cambios no guardados se perderán.')) {
        this.router.navigate(['/my-restaurants']);
      }
    } else {
      this.router.navigate(['/my-restaurants']);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  private clearAddressFields(): void {
    this.restaurantForm.patchValue({
      address: {
        street: '',
        number: null,
        latitude: null,
        longitude: null,
      }
    }, { emitEvent: false });
  }

  private async loadRestaurantData(id: number): Promise<void> {
    this.isLoading = true;
    try {
        const restaurant = await firstValueFrom(this.restaurantService.getById(id));
        this.formListenersActive = false;

        const cityIdFromDb = String(restaurant.address.cityId);
        let foundMunicipality: GeorefMunicipality | undefined;
        let foundProvinceId: string | null = null;
        
        // Cargar todos los municipios para la lógica de coincidencia
        this.allMunicipalitiesForMatching = await firstValueFrom(this.georefService.getMunicipalities().pipe(
            catchError(error => {
                this.handleError('Error al cargar todos los municipios para edición.', error);
                return of([]);
            })
        ));

        foundMunicipality = this.allMunicipalitiesForMatching.find(m => m.id === cityIdFromDb);

        if (foundMunicipality) {
            foundProvinceId = foundMunicipality.provincia.id;
        } else {
            const cleanedCityName = this.cleanName(restaurant.address.city, 'city');
            const cleanedProvinceName = this.cleanName(restaurant.address.province, 'province');

            const provinceFromDb = this.allProvinces.find(p =>
                this.cleanName(p.nombre, 'province')?.toLowerCase() === cleanedProvinceName?.toLowerCase()
            );

            if (provinceFromDb) {
                const municipalitiesForProvince = await firstValueFrom(this.georefService.getMunicipalitiesByProvinceId(provinceFromDb.id));
                foundMunicipality = municipalitiesForProvince.find(
                    m => this.cleanName(m.nombre, 'city')?.toLowerCase() === cleanedCityName?.toLowerCase()
                );
                if (foundMunicipality) {
                    foundProvinceId = provinceFromDb.id;
                } else if (cleanedCityName === cleanedProvinceName) {
                    foundMunicipality = municipalitiesForProvince.find(
                        m => this.cleanName(m.nombre, 'city')?.toLowerCase() === 'capital' ||
                             this.cleanName(m.nombre, 'city')?.toLowerCase() === cleanedProvinceName ||
                             this.cleanName(m.nombre, 'city')?.toLowerCase() === `ciudad de ${cleanedProvinceName}`
                    );
                    if (foundMunicipality) {
                        foundProvinceId = provinceFromDb.id;
                    }
                }
            }
        }

        this.selectedProvinceForDropdown = foundProvinceId;
        this.selectedCityForDropdown = foundMunicipality ? foundMunicipality.id : null;
        this.forceLoadMunicipalitiesForDropdown = true; 

        this.restaurantForm.patchValue({
            name: restaurant.name,
            imageUrl: restaurant.imageUrl,
            description: restaurant.description || '',
            address: {
                street: restaurant.address.street,
                number: restaurant.address.number,
                province: foundProvinceId,
                city: foundMunicipality ? foundMunicipality.id : null,
                latitude: restaurant.address.location.lat,
                longitude: restaurant.address.location.lng
            }
        }, { emitEvent: false });

        this.toggleAddressFields(true);

        if (this.locationPicker && restaurant.address.location.lat && restaurant.address.location.lng) {
            setTimeout(() => {
                this.locationPicker.setMapCenterAndMarker(restaurant.address.location.lat, restaurant.address.location.lng, 16);
                this.formListenersActive = true;
                this.restaurantForm.updateValueAndValidity();
            }, 0);
        } else {
            this.formListenersActive = true;
            this.restaurantForm.updateValueAndValidity();
        }
        this.isLoading = false;
    } catch (err: any) {
        this.handleError('Error al cargar los datos del restaurante para edición', err);
        this.isLoading = false;
        this.formListenersActive = true;
    }
  }
}
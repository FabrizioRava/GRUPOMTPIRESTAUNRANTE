import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

import { debounceTime, distinctUntilChanged, catchError, filter, tap } from 'rxjs/operators';
import { of, Subscription, forkJoin, firstValueFrom } from 'rxjs';

import { GeorefService } from '../services/georef.service';
import { LocationPickerComponent, LocationSelectedEvent, GeorefAddressDetailsFromPicker } from '../shared/location-picker/location-picker.component';
import { RestaurantService, CreateRestaurantPayloadForService } from '../services/restaurant.service';
import { AuthService } from '../services/auth.service';
import { LoadingSpinnerComponent } from '../shared/loading-spinner/loading-spinner.component';

import {
  Centroide,
  GeorefEntityRef,
  GeorefProvince,
  GeorefMunicipality,
  GeorefDireccion,
  GeorefProvincesResponse,
  GeorefMunicipalitiesResponse,
  GeorefDireccionesResponse
} from '../models/georef-models';

interface RestaurantFormValue {
  name: string;
  imageUrl: string;
  description: string;
  address: {
    street: string;
    number: string;
    apartment: string; // Keep as string | null
    province: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

interface CreateRestaurantPayload {
  name: string;
  imageUrl: string;
  description: string;
  address: {
    street: string;
    number: string;
    apartment?: string;
    cityId: number;
    city?: string;
    location: {
      lat: number;
      lng: number;
    };
  };
}


@Component({
  selector: 'app-add-restaurant',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LocationPickerComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './add-restaurant.component.html',
  styleUrls: ['./add-restaurant.component.css']
})
export class AddRestaurantComponent implements OnInit, OnDestroy, AfterViewInit {

  restaurantForm!: FormGroup;
  @ViewChild(LocationPickerComponent) locationPicker!: LocationPickerComponent;

  allProvinces: GeorefProvince[] = [];
  allMunicipalities: GeorefMunicipality[] = [];

  filteredMunicipalities: GeorefMunicipality[] = [];

  private subscriptions = new Subscription();
  private formListenersActive = true; // Controla si los listeners del formulario están activos

  isLoading: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  isEditMode: boolean = false;
  restaurantId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private georefService: GeorefService,
    private restaurantService: RestaurantService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.initForm();
    // La carga inicial de datos geográficos no debe activar la lógica de ubicación por defecto si es modo edición
    this.loadInitialGeorefData();
    this.checkEditMode(); // Esta función activará loadRestaurantData si es edición
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
        street: ['', [Validators.required, Validators.maxLength(100)]],
        number: ['', [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.maxLength(20)]],
        // Eliminado: apartment: [''], // Ya fue eliminado del HTML
        province: [null as string | null, Validators.required],
        city: [null as string | null, Validators.required],
        latitude: [null as number | null, Validators.required],
        longitude: [null as number | null, Validators.required],
      })
    });
  }

  async loadInitialGeorefData(): Promise<void> {
    this.isLoading = true;
    try {
      const [provinces, municipalities] = await firstValueFrom(
        forkJoin([
          this.georefService.getProvinces(),
          this.georefService.getMunicipalities()
        ]).pipe(
          catchError((error: any) => {
            console.error('[AddRestaurant] Error en forkJoin de datos iniciales:', error);
            return of([]);
          })
        )
      );

      this.allProvinces = provinces;
      this.allMunicipalities = municipalities;

      console.log('[AddRestaurant] Datos iniciales de GeoRef cargados. Provincias (allProvinces):', this.allProvinces);
      console.log('[AddRestaurant] Cantidad de provincias cargadas:', this.allProvinces.length);
      console.log('[AddRestaurant] Cantidad de municipios cargados (allMunicipalities):', this.allMunicipalities.length);

      this.isLoading = false;

      // SOLO si NO estamos en modo edición, se carga la ubicación por defecto del usuario o Bs An.
      // En modo edición, la ubicación la establecerá loadRestaurantData.
      if (!this.isEditMode && this.locationPicker) { // Asegurarse de que locationPicker esté disponible
        const userCityId = String(this.authService.getLoggedInUserCityId());
        const defaultMunicipality = userCityId ? this.allMunicipalities.find(m => m.id === userCityId) : null;

        if (defaultMunicipality && defaultMunicipality.centroide) {
          const lat = defaultMunicipality.centroide.lat;
          const lng = defaultMunicipality.centroide.lon;
          this.locationPicker.setMapCenterAndMarker(lat, lng, 15);
          // Usar 'undefined' para georefAddress
          this.onLocationSelected({ lat: lat, lng: lng, georefAddress: undefined });
        } else {
          const defaultLat = -34.6037;
          const defaultLng = -58.3816;
          this.locationPicker.setMapCenterAndMarker(defaultLat, defaultLng, 13);
          // Usar 'undefined' para georefAddress
          this.onLocationSelected({ lat: defaultLat, lng: defaultLng, georefAddress: undefined });
        }
      }

    } catch (err: any) {
      this.handleError('Error al cargar datos de ubicación desde la API de GeoRef', err);
    }
  }

  private checkEditMode(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.restaurantId = +id;
          // Si estamos en modo edición, cargamos los datos del restaurante
          this.loadRestaurantData(+id);
        }
      })
    );
  }

  setupFormListeners(): void {
    const addressGroup = this.restaurantForm.get('address') as FormGroup;

    this.subscriptions.add(
      addressGroup.valueChanges.pipe(
        // Reduce la frecuencia de las geocodificaciones al escribir
        debounceTime(1000),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        tap(val => console.log('DEBUG: Address group value changed to:', val)),
        filter(() => this.formListenersActive), // Solo si los listeners están activos
        filter(() => !!this.locationPicker) // Solo si el componente del mapa está disponible
      ).subscribe((addressValues) => {
        const { street, number, province, city } = addressValues;

        console.log('DEBUG: Attempting to geocode from address group change. Current form values:', { street, number, province, city });

        // CAMBIO CLAVE AQUÍ: Llama a geocodeManualAddress() si todos los campos de dirección requeridos están presentes.
        // Esto permite que el mapa se actualice al cambiar la calle, número, provincia o ciudad,
        // sin importar si ya hay coordenadas en el formulario.
        if (street && number && province && city) {
            console.log('[AddRestaurant] All required address fields present. Calling geocodeManualAddress().');
            this.geocodeManualAddress();
        } else {
            console.warn('[AddRestaurant] Cannot geocode from address change: Missing data in form controls. Street:', street, 'Number:', number, 'Province:', province, 'City:', city);
        }
      })
    );

    const provinceControl = addressGroup.get('province');
    const cityControl = addressGroup.get('city');

    this.subscriptions.add(
      provinceControl?.valueChanges.pipe(
        distinctUntilChanged(),
        tap(val => console.log('DEBUG: Province value changed to (dropdown):', val))
      ).subscribe(async (provinceId: string | null) => {
        if (!this.formListenersActive) return;

        this.resetDependentFields(['city']); // Reiniciar solo la ciudad
        this.filteredMunicipalities = []; // Limpiar municipios filtrados

        if (provinceId) {
          this.filteredMunicipalities = this.allMunicipalities
            .filter(m => m.provincia.id === provinceId)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
          console.log(`[AddRestaurant] Municipios filtrados por provincia ID ${provinceId} (en memoria):`, this.filteredMunicipalities.length);
        }
      })
    );

    this.subscriptions.add(
      cityControl?.valueChanges.pipe(
        distinctUntilChanged(),
        tap(val => console.log('DEBUG: City value changed to (dropdown):', val))
      ).subscribe(async (municipalityId: string | null) => {
        if (!this.formListenersActive) return;

        const municipality = municipalityId ? this.allMunicipalities.find(m => m.id === municipalityId) : null;
        if (municipality && municipality.centroide && this.locationPicker) {
          this.formListenersActive = false; // Desactivar listeners antes de parchar
          addressGroup.patchValue({
            latitude: municipality.centroide.lat,
            longitude: municipality.centroide.lon
          }, { emitEvent: false });
          this.formListenersActive = true; // Reactivar listeners

          // Centramos el mapa si se selecciona una ciudad
          this.locationPicker.setMapCenterAndMarker(municipality.centroide.lat, municipality.centroide.lon, 15);
        } else if (!municipalityId) {
          console.log('Ciudad/Municipio vaciado o no encontrado, reseteando ubicación.');
          this.formListenersActive = false;
          addressGroup.patchValue({ latitude: null, longitude: null }, { emitEvent: false });
          this.formListenersActive = true;
        }
      })
    );
  }

  onLocationSelected(event: LocationSelectedEvent): void {
    console.log('Evento locationSelected recibido en AddRestaurantComponent (desde mapa):', event);

    this.formListenersActive = false; // Desactivar listeners para evitar bucles de geocodificación

    this.restaurantForm.patchValue({
      address: {
        latitude: event.lat,
        longitude: event.lng
      }
    }, { emitEvent: false });

    // Si el evento ya trae la información georeferenciada
    if (event.georefAddress) {
      console.log('DEBUG: Setting address fields directly from map event. ProvinceId:', event.georefAddress.provinceId, 'MunicipalityId:', event.georefAddress.municipalityId);
      this.restaurantForm.patchValue({
        address: {
          street: event.georefAddress?.street || '',
          number: event.georefAddress?.number !== null && event.georefAddress?.number !== undefined ? String(event.georefAddress.number) : null,
          province: event.georefAddress.provinceId || null,
          city: event.georefAddress.municipalityId || null
        }
      }, { emitEvent: false });

      if (event.georefAddress.provinceId) {
        this.filteredMunicipalities = this.allMunicipalities
          .filter(m => m.provincia.id === event.georefAddress?.provinceId)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
      } else {
        this.filteredMunicipalities = [];
      }
    } else {
      // Si el evento no trae georefAddress, realizamos una geocodificación inversa
      console.log('DEBUG: No georefAddress from map event, performing reverse geocoding for:', event.lat, event.lng);
      this.isLoading = true;
      this.georefService.getDireccionPorCoordenadas(event.lat, event.lng).pipe(
        catchError((error: any) => {
          console.error('[AddRestaurant] Error en getDireccionPorCoordenadas desde onLocationSelected:', error);
          this.errorMessage = 'No se pudo obtener la dirección completa para esta ubicación.';
          this.isLoading = false;
          this.restaurantForm.patchValue({
              address: {
                  street: '',
                  number: '',
                  province: null,
                  city: null
              }
          }, { emitEvent: false });
          this.filteredMunicipalities = [];
          return of([]); // Devolver un array vacío para que coincida con el tipo de GeorefDireccion[]
        })
      ).subscribe((direcciones: GeorefDireccion[]) => {
        this.isLoading = false;
        if (direcciones && direcciones.length > 0) {
          const georefDireccion = direcciones[0];
          console.log('[AddRestaurant] Reverse geocoding exitoso:', georefDireccion);

          const mappedGeorefAddress: GeorefAddressDetailsFromPicker = {
              street: georefDireccion.calle?.nombre || '',
              number: georefDireccion.altura?.valor !== undefined && georefDireccion.altura.valor !== null ? String(georefDireccion.altura.valor) : null,
              provinceId: georefDireccion.provincia?.id || undefined,
              municipalityId: georefDireccion.municipio?.id || georefDireccion.localidad?.id || georefDireccion.localidad_censal?.id || undefined,
              provinceName: georefDireccion.provincia?.nombre || undefined,
              municipalityName: georefDireccion.municipio?.nombre || georefDireccion.localidad?.nombre || georefDireccion.localidad_censal?.nombre || undefined,
          };

          this.restaurantForm.patchValue({
            address: {
              street: mappedGeorefAddress.street,
              number: mappedGeorefAddress.number,
              province: mappedGeorefAddress.provinceId || null,
              city: mappedGeorefAddress.municipalityId || null
            }
          }, { emitEvent: false });

          if (mappedGeorefAddress.provinceId) {
            this.filteredMunicipalities = this.allMunicipalities
              .filter(m => m.provincia.id === mappedGeorefAddress.provinceId)
              .sort((a, b) => a.nombre.localeCompare(b.nombre));
          } else {
            this.filteredMunicipalities = [];
          }
        } else {
          console.warn('[AddRestaurant] Reverse geocoding no retornó datos de dirección.');
          this.errorMessage = 'No se encontraron detalles de dirección para las coordenadas seleccionadas.';
          this.restaurantForm.patchValue({
              address: {
                  street: '',
                  number: '',
                  province: null,
                  city: null
              }
          }, { emitEvent: false });
          this.filteredMunicipalities = [];
        }
      });
    }

    setTimeout(() => {
      this.formListenersActive = true; // Reactivar listeners después de un pequeño retraso
      this.restaurantForm.updateValueAndValidity();
      this.successMessage = 'Ubicación actualizada desde el mapa.';
    }, 100);
  }

  private geocodeManualAddress(): void {
    const { street, number, province, city } = this.restaurantForm.get('address')?.value;

    console.log('DEBUG: geocodeManualAddress() called. Current values:');
    console.log('  street:', street, ' (valid:', !!street, ')');
    console.log('  number:', number, ' (valid:', !!number, ')');
    console.log('  province:', province, ' (valid:', !!province, ')');
    console.log('  city:', city, ' (valid:', !!city, ')');
    console.log('  formListenersActive:', this.formListenersActive);
    console.log('  locationPicker (exists):', !!this.locationPicker);

    if (street && number && province && city && this.formListenersActive && this.locationPicker) {
      console.log('[AddRestaurant] Iniciando búsqueda de dirección manual con Nominatim Search...');
      this.isLoading = true;

      const selectedProvinceName = this.allProvinces.find(p => p.id === province)?.nombre || '';
      const selectedMunicipalityName = this.allMunicipalities.find(m => m.id === city)?.nombre || '';

      this.subscriptions.add(
        this.georefService.buscarDireccion(street, number, selectedProvinceName, selectedMunicipalityName).pipe(
          catchError((error: any) => {
            console.error('[AddRestaurant] Error al buscar dirección (manual) con Nominatim Search:', error);
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
                console.log(`[AddRestaurant] Dirección encontrada en Nominatim. Lat: ${lat}, Lon: ${lon}`);
                this.formListenersActive = false;
                if (this.restaurantForm.get('address.latitude')?.value !== lat || this.restaurantForm.get('address.longitude')?.value !== lon) {
                    this.restaurantForm.get('address.latitude')?.setValue(lat, { emitEvent: false });
                    this.restaurantForm.get('address.longitude')?.setValue(lon, { emitEvent: false });
                }
                this.formListenersActive = true;

                this.locationPicker.setMapCenterAndMarker(lat, lon);
                this.successMessage = 'Mapa actualizado con la dirección del formulario.';
            } else {
                console.warn('[AddRestaurant] Dirección encontrada pero sin coordenadas válidas.');
                this.errorMessage = 'Dirección encontrada, pero no se pudieron obtener las coordenadas.';
            }
          } else {
            console.warn('[AddRestaurant] No se encontró una dirección precisa para los datos del formulario.');
            this.errorMessage = 'No se encontró una dirección precisa para los datos ingresados.';
          }
        })
      );
    } else {
      console.log('[AddRestaurant] geocodeManualAddress(): Condiciones no cumplidas para geocodificar. Revise los logs DEBUG anteriores.');
    }
  }

  private resetDependentFields(fields: ('province' | 'city')[]): void {
    this.formListenersActive = false;
    fields.forEach(field => {
      const control = this.restaurantForm.get(`address.${field}`);
      if (control) {
        control.reset(null, { emitEvent: false });
      }

      if (field === 'city') {
        this.restaurantForm.get('address.latitude')?.reset(null, { emitEvent: false });
        this.restaurantForm.get('address.longitude')?.reset(null, { emitEvent: false });
      }
    });
    this.formListenersActive = true;
  }

  onSubmit(): void {
    console.log('Intentando enviar formulario. Estado del formulario:', this.restaurantForm.value);
    if (this.restaurantForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos obligatorios correctamente.';
      this.markFormGroupTouched(this.restaurantForm);
      console.warn('Formulario inválido al intentar enviar:', this.restaurantForm.errors);
      return;
    }

    const formValue = this.restaurantForm.getRawValue() as RestaurantFormValue;

    const selectedProvince = this.allProvinces.find(p => p.id === formValue.address.province);
    const selectedMunicipality = this.allMunicipalities.find(m => m.id === formValue.address.city);

    if (!selectedProvince || !selectedMunicipality ||
        formValue.address.latitude === null || formValue.address.longitude === null) {
      this.errorMessage = 'Error en la selección de ubicación o coordenadas. Por favor, asegúrese de que la dirección está completa y las coordenadas están en el mapa.';
      console.warn('Validación de ubicación fallida: selección incompleta o coordenadas nulas.', formValue);
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
        apartment: formValue.address.apartment || undefined, // Ya no se usa, pero si existe en el modelo backend se dejaría para el payload
        cityId: Number(selectedMunicipality.id),
        city: selectedMunicipality.nombre,
        location: {
          lat: formValue.address.latitude,
          lng: formValue.address.longitude
        }
      },
    };

    console.log('Payload a enviar:', payload);

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
    console.log('Operación exitosa, redirigiendo...');
    setTimeout(() => {
      this.router.navigate(['/my-restaurants']);
    }, 1500);
  }

  private handleError(message: string, error: any): void {
    this.isLoading = false;
    this.errorMessage = message;
    if (error) {
      console.error(error);
      this.errorMessage += `: ${error.error?.message || error.message || 'Error del servidor'}`;
    }
    console.error('Error manejado:', this.errorMessage);
  }

  onCancel(): void {
    console.log('Botón Cancelar presionado.');
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
    this.clearLocationDropdowns('all');
  }

  private clearLocationDropdowns(level: ('province' | 'city' | 'all')): void {
    this.formListenersActive = false;

    if (level === 'all' || level === 'province') {
      this.restaurantForm.get('address.province')?.setValue(null, { emitEvent: false });
      this.filteredMunicipalities = [];
    }
    if (level === 'all' || level === 'province' || level === 'city') {
      this.restaurantForm.get('address.city')?.setValue(null, { emitEvent: false });
    }
    this.formListenersActive = true;
  }

  // ** MODIFICACIÓN CLAVE: Esta función ahora parchea directamente los campos de la dirección **
  private loadRestaurantData(id: number): void {
    this.isLoading = true;
    this.restaurantService.getById(id).subscribe({
      next: async (restaurant) => {
        console.log('Datos de restaurante cargados para edición:', restaurant);
        this.formListenersActive = false; // Desactivar listeners para evitar que patchValue active geocodificación

        // Encontrar la provincia y municipio correspondientes a los IDs/nombres del restaurante
        // Asegúrate de que los IDs del backend coinciden con los IDs de GeoRef que tienes
        const cityIdFromDb = String(restaurant.address.cityId); // Asegúrate de que sea string para la búsqueda
        let foundMunicipality = this.allMunicipalities.find(m => m.id === cityIdFromDb);
        let foundProvinceId: string | null = null;

        if (foundMunicipality) {
          foundProvinceId = foundMunicipality.provincia.id;
        } else {
          // Fallback si no se encuentra por ID, intentar por nombre si es posible (menos robusto)
          const foundByName = this.allMunicipalities.find(m => m.nombre === restaurant.address.city && m.provincia.nombre === restaurant.address.province);
          if (foundByName) {
            foundMunicipality = foundByName;
            foundProvinceId = foundByName.provincia.id;
          }
        }

        // 1. Parchear TODOS los campos del formulario de dirección directamente con los datos del restaurante
        this.restaurantForm.patchValue({
          name: restaurant.name,
          imageUrl: restaurant.imageUrl,
          description: restaurant.description || '',
          address: {
            street: restaurant.address.street,
            number: restaurant.address.number,
            province: foundProvinceId, // Establecer el ID de la provincia
            city: foundMunicipality ? foundMunicipality.id : null, // Establecer el ID del municipio
            latitude: restaurant.address.location.lat,
            longitude: restaurant.address.location.lng
          }
        }, { emitEvent: false }); // emitEvent: false es crucial aquí para no disparar listeners

        // 2. Filtrar los municipios para el dropdown de la ciudad, basándose en la provincia del restaurante
        if (foundProvinceId) {
          this.filteredMunicipalities = this.allMunicipalities
            .filter(m => m.provincia.id === foundProvinceId)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
          console.log(`[AddRestaurant] Municipios cargados para edición por provincia ID ${foundProvinceId}: ${this.filteredMunicipalities.length}`);
        } else {
          this.filteredMunicipalities = [];
        }

        // 3. Centrar el mapa en las coordenadas del restaurante y emitir un evento
        if (this.locationPicker && restaurant.address.location.lat && restaurant.address.location.lng) {
          setTimeout(() => {
            console.log('Centrando mapa en las coordenadas del restaurante editado:', restaurant.address.location.lat, restaurant.address.location.lng);
            this.locationPicker.setMapCenterAndMarker(restaurant.address.location.lat, restaurant.address.location.lng, 16);
            // Ya no es necesario llamar a onLocationSelected aquí con undefined para geocodificar,
            // porque los campos ya se han parcheado directamente desde 'restaurant'.
            // Solo se haría si quisiéramos 'validar' que las coordenadas corresponden a la dirección (redundante).
            // this.onLocationSelected({ lat: restaurant.address.location.lat, lng: restaurant.address.location.lng, georefAddress: undefined });
            this.formListenersActive = true; // Reactivar listeners después del setTimeout del mapa
            this.restaurantForm.updateValueAndValidity(); // Recalcular validez del formulario
          }, 0);
        } else {
            console.warn('[AddRestaurant] No se pudo centrar el mapa: locationPicker no disponible o coordenadas faltantes.');
            this.formListenersActive = true; // Reactivar listeners si no se pudo centrar el mapa
            this.restaurantForm.updateValueAndValidity(); // Recalcular validez del formulario
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        this.handleError('Error al cargar el restaurante', err);
        this.formListenersActive = true; // Asegurarse de reactivar los listeners incluso si hay un error
        this.restaurantForm.updateValueAndValidity(); // Recalcular validez del formulario
      }
    });
  }
}

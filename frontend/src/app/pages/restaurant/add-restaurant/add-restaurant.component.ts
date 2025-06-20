import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { debounceTime, distinctUntilChanged, catchError, filter, tap } from 'rxjs/operators';
import { of, Subscription, forkJoin, firstValueFrom } from 'rxjs';

import { GeorefService } from '../../../services/georef.service';
import { LocationPickerComponent, LocationSelectedEvent, GeorefAddressDetailsFromPicker } from '../../../shared/location-picker/location-picker.component';
import { RestaurantService, CreateRestaurantPayloadForService } from '../../../services/restaurant.service';
import { AuthService }
from '../../../services/auth.service';

import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

import {
  GeorefProvince,
  GeorefMunicipality,
  GeorefDireccion
} from '../../../models/georef-models';

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
  private formListenersActive = true;

  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  isEditMode = false;
  restaurantId: number | null = null;

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
    this.loadInitialGeorefData();
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

  async loadInitialGeorefData(): Promise<void> {
    this.isLoading = true;
    try {
      const [provinces, municipalities] = await firstValueFrom(
        forkJoin([
          this.georefService.getProvinces(),
          this.georefService.getMunicipalities()
        ]).pipe(
          catchError(error => {
            console.error('Error en forkJoin de datos iniciales:', error);
            this.handleError('Error al cargar datos iniciales de GeoRef.', error);
            return of([[], []]);
          })
        )
      );

      this.allProvinces = provinces;
      this.allMunicipalities = municipalities;

      console.log('Datos iniciales de GeoRef cargados. Provincias:', this.allProvinces.length);
      console.log('Cantidad de municipios cargados:', this.allMunicipalities.length);

      // --- DEBUGGING: Verify Santiago del Estero and Santa Cruz municipalities ---
      const santiagoDelEsteroProvince = this.allProvinces.find(p => this.cleanName(p.nombre, 'province') === 'santiago del estero');
      if (santiagoDelEsteroProvince) {
        const santiagoMuni = this.allMunicipalities.filter(m => m.provincia.id === santiagoDelEsteroProvince.id);
        console.log(`DEBUG: Municipios para Santiago del Estero (ID: ${santiagoDelEsteroProvince.id}):`, santiagoMuni.length, santiagoMuni.map(m => m.nombre));
      } else {
        console.warn('DEBUG: Provincia de Santiago del Estero no encontrada en allProvinces.');
      }

      const santaCruzProvince = this.allProvinces.find(p => this.cleanName(p.nombre, 'province') === 'santa cruz');
      if (santaCruzProvince) {
        const santaCruzMuni = this.allMunicipalities.filter(m => m.provincia.id === santaCruzProvince.id);
        console.log(`DEBUG: Municipios para Santa Cruz (ID: ${santaCruzProvince.id}):`, santaCruzMuni.length, santaCruzMuni.map(m => m.nombre));
      } else {
        console.warn('DEBUG: Provincia de Santa Cruz no encontrada en allProvinces.');
      }
      // --- END DEBUGGING BLOCK ---


      this.isLoading = false;

      if (!this.isEditMode && this.locationPicker) {
        const userCityId = String(this.authService.getLoggedInUserCityId());
        let defaultMunicipality: GeorefMunicipality | undefined = undefined;

        if (userCityId) {
            defaultMunicipality = this.allMunicipalities.find(m => m.id === userCityId);
        }

        if (defaultMunicipality && defaultMunicipality.centroide) {
          const lat = defaultMunicipality.centroide.lat;
          const lng = defaultMunicipality.centroide.lon;
          this.locationPicker.setMapCenterAndMarker(lat, lng, 15);

          const georefAddressForEvent: GeorefAddressDetailsFromPicker = {
            provinceId: defaultMunicipality.provincia.id,
            provinceName: defaultMunicipality.provincia.nombre,
            municipalityId: defaultMunicipality.id,
            municipalityName: defaultMunicipality.nombre,
            street: undefined,
            number: undefined
          };

          this.onLocationSelected({
            lat: lat,
            lng: lng,
            georefAddress: georefAddressForEvent,
            fullGeorefResponse: undefined
          });
        } else {
          const defaultLat = -32.407; // Villa María, Córdoba
          const defaultLng = -63.249;
          this.locationPicker.setMapCenterAndMarker(defaultLat, defaultLng, 13);
          this.onLocationSelected({
            lat: defaultLat,
            lng: defaultLng,
            georefAddress: undefined,
            fullGeorefResponse: undefined
          });
        }
      }

    } catch (err: any) {
      this.handleError('Error al cargar datos de ubicación desde la API de GeoRef', err);
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
      cleaned = cleaned.replace(/\s*rural/i, '');
      cleaned = cleaned.replace(/^ciudad de\s/i, '');
      cleaned = cleaned.replace(/\s*\(.*\)$/, '');

      // Specific for Santiago del Estero City: GeoRef might return "Santiago del Estero" for city
      // while our data might have "Santiago del Estero - Capital" or just "Capital"
      if (cleaned === 'santiago del estero' && type === 'city') {
          // Keep it as "santiago del estero" for direct comparison first.
          // The capital matching logic handles the "capital" part.
      }
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
          if (this.allProvinces.length > 0 && this.allMunicipalities.length > 0) {
            this.loadRestaurantData(+id);
          } else {
            this.subscriptions.add(
                of(null).pipe(
                    filter(() => !this.isLoading),
                    tap(() => this.loadRestaurantData(+id))
                ).subscribe()
            );
          }
        }
      })
    );
  }

  setupFormListeners(): void {
    const addressGroup = this.restaurantForm.get('address') as FormGroup;
    const provinceControl = addressGroup.get('province');
    const cityControl = addressGroup.get('city');
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
          !!provinceControl?.value &&
          !!cityControl?.value
        )
      ).subscribe(() => {
        this.geocodeManualAddress();
      })
    );

    this.subscriptions.add(
      provinceControl?.valueChanges.pipe(
        distinctUntilChanged(),
        filter(() => this.formListenersActive)
      ).subscribe((provinceId: string | null) => {
        this.formListenersActive = false;
        this.resetDependentFields(['city']);
        this.filteredMunicipalities = [];

        if (provinceId) {
          this.filteredMunicipalities = this.allMunicipalities
            .filter(m => m.provincia.id === provinceId)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
          cityControl?.enable({ emitEvent: false });
        } else {
          cityControl?.disable({ emitEvent: false });
        }
        this.toggleAddressFields(false);
        this.formListenersActive = true;
      })
    );

    this.subscriptions.add(
      cityControl?.valueChanges.pipe(
        distinctUntilChanged(),
        filter(() => this.formListenersActive)
      ).subscribe((municipalityId: string | null) => {
        const municipality = municipalityId ? this.allMunicipalities.find(m => m.id === municipalityId) : null;
        if (municipality && municipality.centroide && this.locationPicker) {
          this.locationPicker.setMapCenterAndMarker(municipality.centroide.lat, municipality.centroide.lon, 15);
          this.toggleAddressFields(true);
        } else {
          this.toggleAddressFields(false);
          this.formListenersActive = false;
          addressGroup.patchValue({ latitude: null, longitude: null }, { emitEvent: false });
          this.formListenersActive = true;
        }
      })
    );
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
    console.log('Evento locationSelected recibido en AddRestaurantComponent (desde mapa):', event);

    this.formListenersActive = false;

    this.restaurantForm.patchValue({
      address: {
        latitude: event.lat,
        longitude: event.lng
      }
    }, { emitEvent: false });

    if (!event.fullGeorefResponse) {
      console.warn('No full GeoRef response received for location selected event. Clearing address fields.');
      this.clearAddressFields();
      this.clearLocationDropdowns('all');
      this.toggleAddressFields(false);
      this.formListenersActive = true;
      this.restaurantForm.updateValueAndValidity();
      return;
    }

    console.log('Realizando geocodificación inversa con GeoRef API para:', event.lat, event.lng);
    this.isLoading = true;

    try {
      const direcciones: GeorefDireccion[] = await firstValueFrom(
        this.georefService.getDireccionPorCoordenadas(event.lat, event.lng).pipe(
          catchError(error => {
            console.error('Error en getDireccionPorCoordenadas (GeoRef) desde onLocationSelected:', error);
            this.handleError('No se pudo obtener la dirección completa para esta ubicación desde el mapa.', error);
            this.clearAddressFields();
            this.clearLocationDropdowns('all');
            this.toggleAddressFields(false);
            return of([]);
          })
        )
      );

      this.isLoading = false;
      if (!direcciones || direcciones.length === 0) {
        console.warn('Reverse geocoding (GeoRef) no retornó datos de dirección.');
        this.errorMessage = 'No se encontraron detalles de dirección para las coordenadas seleccionadas.';
        this.clearAddressFields();
        this.clearLocationDropdowns('all');
        this.toggleAddressFields(false);
        this.formListenersActive = true;
        this.restaurantForm.updateValueAndValidity();
        return;
      }

      const georefDireccion = direcciones[0];
      console.log('Datos GeoRef (reverse geocoding):', georefDireccion);

      let provinceIdToSet: string | null = null;
      let municipalityIdToSet: string | null = null;

      // 1. Match province based on ID or Name
      if (georefDireccion.provincia?.id) {
        const matchedProvinceById = this.allProvinces.find(p => p.id === georefDireccion.provincia?.id);
        if (matchedProvinceById) {
          provinceIdToSet = matchedProvinceById.id;
          console.log('Provincia matcheada por ID:', matchedProvinceById.nombre);
        }
      }
      if (!provinceIdToSet && georefDireccion.provincia?.nombre) {
        const cleanedGeoRefProvinceName = this.cleanName(georefDireccion.provincia.nombre, 'province');
        const matchedProvinceByName = this.allProvinces.find(
          p => this.cleanName(p.nombre, 'province')?.toLowerCase() === cleanedGeoRefProvinceName?.toLowerCase()
        );
        if (matchedProvinceByName) {
          provinceIdToSet = matchedProvinceByName.id;
          console.log('Provincia matcheada por nombre (limpio):', matchedProvinceByName.nombre);
        }
      }

      if (!provinceIdToSet) {
          console.warn('No se pudo matchear la provincia. Abortando búsqueda de municipio.');
          this.clearAddressFields();
          this.clearLocationDropdowns('all');
          this.toggleAddressFields(false);
          this.formListenersActive = true;
          this.restaurantForm.updateValueAndValidity();
          return;
      }

      // 2. Prepare potential municipality names for matching
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

      // --- DEBUGGING: Log fullAddress for Hernando ---
      if (fullAddress.includes('Hernando')) {
        console.log(`DEBUG: fullAddress for Hernando check: "${fullAddress}"`);
      }
      // --- END DEBUGGING ---

      // Extract primary city part from the beginning of full_name, before administrative divisions
      const regexMatchPrimaryCity = /^(?:[^,]+,\s*)*(?:Ciudad de\s*)?([^,]+?)(?:,\s*(?:Departamento|Partido|Pedanía|Barrio|Comuna|Localidad Censal|Provincia de))?/i;
      const primaryCityMatch = fullAddress.match(regexMatchPrimaryCity);

      if (primaryCityMatch && primaryCityMatch[1]) {
          const extractedPrimaryCity = primaryCityMatch[1].trim();
          // Avoid adding the province name if it's identical
          if (this.cleanName(extractedPrimaryCity, 'city') !== this.cleanName(georefDireccion.provincia?.nombre, 'province')) {
              potentialNamesFromGeoRef.push(extractedPrimaryCity);
          }
      }

      // Explicitly look for "Municipio de XXXXX"
      const municipalityMatchFromFull = fullAddress.match(/Municipio de ([^,]+)/i);
      if (municipalityMatchFromFull && municipalityMatchFromFull[1]) {
          potentialNamesFromGeoRef.push(municipalityMatchFromFull[1].trim());
      }

      potentialNamesFromGeoRef = Array.from(new Set(potentialNamesFromGeoRef.filter(name => name && name.trim() !== '')));
      console.log('Nombres potenciales de GeoRef para la localidad (después de parsing nombre_completo):', potentialNamesFromGeoRef);

      // 3. Match the municipality
      let matchedMunicipality: GeorefMunicipality | undefined;
      const municipalitiesInProvince = this.allMunicipalities.filter(m => m.provincia.id === provinceIdToSet);

      // a. Try to match by GeoRef ID (if available and reliable for municipality)
      if (georefDireccion.municipio?.id) {
          matchedMunicipality = municipalitiesInProvince.find(m => m.id === georefDireccion.municipio?.id);
          if (matchedMunicipality) {
              console.log(`DEBUG: Match por ID de municipio de GeoRef: ${matchedMunicipality.nombre}`);
          }
      }

      // b. Iterate over potential names and look for an exact clean name match
      if (!matchedMunicipality) {
        for (const nameRaw of potentialNamesFromGeoRef) {
            const searchNameCleaned = this.cleanName(nameRaw, 'city');
            if (searchNameCleaned) {
                // --- DEBUGGING: Log comparisons for Hernando ---
                if (fullAddress.includes('Hernando')) {
                    console.log(`DEBUG: Trying to match clean GeoRef name "${searchNameCleaned}"`);
                }
                // --- END DEBUGGING ---
                matchedMunicipality = municipalitiesInProvince.find(
                    m => {
                        const cleanedMuniName = this.cleanName(m.nombre, 'city');
                        // --- DEBUGGING: Log comparisons for Hernando ---
                        if (fullAddress.includes('Hernando')) {
                            console.log(`DEBUG: Comparing with local muni "${cleanedMuniName}"`);
                        }
                        // --- END DEBUGGING ---
                        return cleanedMuniName?.toLowerCase() === searchNameCleaned.toLowerCase();
                    }
                );
                if (matchedMunicipality) {
                    console.log(`Match por nombre limpio: '${searchNameCleaned}' (original: '${nameRaw}'). Matched: ${matchedMunicipality.nombre}`);
                    break;
                }
            }
        }
      }

      // c. Special case for Provincial Capitals
      if (!matchedMunicipality && georefDireccion.provincia?.nombre) {
          const cleanedProvinceName = this.cleanName(georefDireccion.provincia.nombre, 'province');
          const isProvinceNameAlsoLocalityGuess = potentialNamesFromGeoRef.some(name => this.cleanName(name, 'city') === cleanedProvinceName);

          if (isProvinceNameAlsoLocalityGuess) {
              const capitalMunicipality = municipalitiesInProvince.find(
                  m => this.cleanName(m.nombre, 'city')?.toLowerCase() === 'capital' ||
                       this.cleanName(m.nombre, 'city')?.toLowerCase() === cleanedProvinceName ||
                       this.cleanName(m.nombre, 'city')?.toLowerCase() === `ciudad de ${cleanedProvinceName}` ||
                       // Adding specific check for Santiago del Estero City's common name in GeoRef vs local data
                       (cleanedProvinceName === 'santiago del estero' && this.cleanName(m.nombre, 'city') === 'santiago del estero')
              );
              if (capitalMunicipality) {
                  matchedMunicipality = capitalMunicipality;
                  console.log(`Match por caso "Capital" para provincia: '${georefDireccion.provincia.nombre}'. Matched: ${capitalMunicipality.nombre}`);
              }
          }
      }

      // d. Fallback: Partial match (less precise, last resort)
      if (!matchedMunicipality) {
        for (const nameRaw of potentialNamesFromGeoRef) {
            const searchNameCleaned = this.cleanName(nameRaw, 'city');
            if (searchNameCleaned) {
                matchedMunicipality = municipalitiesInProvince.find(m => {
                    const cleanedMuniName = this.cleanName(m.nombre, 'city');
                    return cleanedMuniName && cleanedMuniName.includes(searchNameCleaned);
                });
                if (matchedMunicipality) {
                    console.log(`Match parcial por nombre: '${searchNameCleaned}' con '${matchedMunicipality.nombre}'.`);
                    break;
                }
            }
        }
      }


      if (matchedMunicipality) {
        municipalityIdToSet = matchedMunicipality.id;
        console.log('Ciudad/Municipio matcheado final:', matchedMunicipality.nombre, 'ID:', matchedMunicipality.id);
      } else {
        console.warn(`No se pudo matchear la localidad/municipio para la provincia ${provinceIdToSet} y nombres potenciales: ${potentialNamesFromGeoRef.join(', ')}.`);
        municipalityIdToSet = null;
      }

      this.restaurantForm.patchValue({
        address: {
          street: georefDireccion.calle?.nombre || '',
          number: georefDireccion.altura?.valor !== undefined && georefDireccion.altura.valor !== null ? String(georefDireccion.altura.valor) : null,
          province: provinceIdToSet,
          city: municipalityIdToSet
        }
      }, { emitEvent: false });

      if (provinceIdToSet) {
        this.filteredMunicipalities = this.allMunicipalities
          .filter(m => m.provincia.id === provinceIdToSet)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.restaurantForm.get('address.city')?.enable({ emitEvent: false });
      } else {
        this.filteredMunicipalities = [];
        this.restaurantForm.get('address.city')?.disable({ emitEvent: false });
      }

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
      this.clearLocationDropdowns('all');
      this.toggleAddressFields(false);
      this.formListenersActive = true;
      this.restaurantForm.updateValueAndValidity();
    }
  }


  private geocodeManualAddress(): void {
    const { street, number, province, city } = this.restaurantForm.get('address')?.getRawValue();

    const selectedProvince = this.allProvinces.find(p => p.id === province);
    const selectedMunicipality = this.allMunicipalities.find(m => m.id === city);

    if (street && number && selectedProvince && selectedMunicipality && this.formListenersActive && this.locationPicker) {
      this.isLoading = true;

      const selectedProvinceName = selectedProvince.nombre;
      const selectedMunicipalityName = selectedMunicipality.nombre;

      this.subscriptions.add(
        this.georefService.buscarDireccion(street, number, selectedProvinceName, selectedMunicipalityName).pipe(
          catchError(error => {
            console.error('Error al buscar dirección (manual) con Nominatim Search:', error);
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
  }

  private resetDependentFields(fields: ('province' | 'city')[]): void {
    this.formListenersActive = false;
    fields.forEach(field => {
      const control = this.restaurantForm.get(`address.${field}`);
      if (control) {
        control.reset(null, { emitEvent: false });
        if (field === 'city') {
          control.disable({ emitEvent: false });
        }
      }

      if (field === 'city') {
        this.restaurantForm.get('address.latitude')?.reset(null, { emitEvent: false });
        this.restaurantForm.get('address.longitude')?.reset(null, { emitEvent: false });
      }
    });
    this.formListenersActive = true;
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
    const selectedMunicipality = this.allMunicipalities.find(m => m.id === formValue.address.city);

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

  private clearLocationDropdowns(level: ('province' | 'city' | 'all')): void {
    this.formListenersActive = false;
    if (level === 'all' || level === 'province') {
      this.restaurantForm.get('address.province')?.setValue(null, { emitEvent: false });
      this.filteredMunicipalities = [];
    }
    if (level === 'all' || level === 'city') {
      this.restaurantForm.get('address.city')?.setValue(null, { emitEvent: false });
      this.restaurantForm.get('address.city')?.disable({ emitEvent: false });
    }
    this.formListenersActive = true;
  }

  private async loadRestaurantData(id: number): Promise<void> {
    this.isLoading = true;
    try {
        const restaurant = await firstValueFrom(this.restaurantService.getById(id));
        this.formListenersActive = false;

        const cityIdFromDb = String(restaurant.address.cityId);
        let foundMunicipality = this.allMunicipalities.find(m => m.id === cityIdFromDb);
        let foundProvinceId: string | null = null;

        if (foundMunicipality) {
            foundProvinceId = foundMunicipality.provincia.id;
        } else {
            const cleanedCityName = this.cleanName(restaurant.address.city, 'city');
            const cleanedProvinceName = this.cleanName(restaurant.address.province, 'province');

            const provinceFromDb = this.allProvinces.find(p =>
                this.cleanName(p.nombre, 'province')?.toLowerCase() === cleanedProvinceName?.toLowerCase()
            );

            if (provinceFromDb) {
                foundMunicipality = this.allMunicipalities.find(
                    m => m.provincia.id === provinceFromDb.id &&
                         this.cleanName(m.nombre, 'city')?.toLowerCase() === cleanedCityName?.toLowerCase()
                );
                if (foundMunicipality) {
                    foundProvinceId = provinceFromDb.id;
                } else if (cleanedCityName === cleanedProvinceName) {
                    foundMunicipality = this.allMunicipalities.find(
                        m => m.provincia.id === provinceFromDb.id &&
                             (this.cleanName(m.nombre, 'city')?.toLowerCase() === 'capital' ||
                              this.cleanName(m.nombre, 'city')?.toLowerCase() === `ciudad de ${cleanedProvinceName}` ||
                              (cleanedProvinceName === 'santiago del estero' && this.cleanName(m.nombre, 'city') === 'santiago del estero'))
                    );
                    if (foundMunicipality) {
                        foundProvinceId = provinceFromDb.id;
                    }
                }
            }
        }

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

        if (foundProvinceId) {
            this.filteredMunicipalities = this.allMunicipalities
                .filter(m => m.provincia.id === foundProvinceId)
                .sort((a, b) => a.nombre.localeCompare(b.nombre));
            this.restaurantForm.get('address.city')?.enable({ emitEvent: false });
        } else {
            this.filteredMunicipalities = [];
            this.restaurantForm.get('address.city')?.disable({ emitEvent: false });
        }

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
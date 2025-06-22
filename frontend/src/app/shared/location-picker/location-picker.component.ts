import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { GeorefService } from '../../services/georef.service';
import { GeorefDireccion } from '../../models/georef-models';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface GeorefAddressDetailsFromPicker {
  street?: string;
  number?: string | null;
  provinceId?: string;
  municipalityId?: string;
  provinceName?: string;
  municipalityName?: string;
}

export interface LocationSelectedEvent {
  lat: number;
  lng: number;
  zoom: number; // Agregamos la propiedad zoom aquí
  georefAddress?: GeorefAddressDetailsFromPicker;
  fullGeorefResponse?: GeorefDireccion;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.css']
})
export class LocationPickerComponent implements OnInit, OnDestroy, AfterViewInit {
  @Output() locationSelected = new EventEmitter<LocationSelectedEvent>();

  @Input() initialLat: number = -34.6037;
  @Input() initialLng: number = -58.3816;
  @Input() initialZoom: number = 6;
  @Input() enableMarker: boolean = true;

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  public map?: L.Map;
  public currentMarker?: L.Marker;
  public isMapReady = false;

  // Propiedad para almacenar el zoom actual del mapa
  private currentMapZoom: number = this.initialZoom;

  constructor(private georefService: GeorefService) { }

  ngOnInit(): void {
    const defaultIcon = L.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });

    L.Marker.prototype.options.icon = defaultIcon;
  }

  ngAfterViewInit(): void {
    // Inicializamos el mapa solo si no está listo
    // Damos un pequeño respiro para que el DOM se asiente
    setTimeout(() => {
      if (!this.map) {
        this.initializeMap();
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.cleanupMap();
  }

  private initializeMap(): void {
    // Solo inicializa el mapa si no existe
    if (this.mapContainer && this.mapContainer.nativeElement && !this.map) {
      const lat = this.initialLat ?? -34.6037;
      const lng = this.initialLng ?? -58.3816;

      this.map = L.map(this.mapContainer.nativeElement).setView(
        [lat, lng],
        this.initialZoom // Usamos el initialZoom en la primera carga
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.map);

      this.map.invalidateSize();
      this.isMapReady = true;

      if (this.enableMarker && (this.initialLat !== 0 || this.initialLng !== 0) && (this.initialLat !== null && this.initialLng !== null)) {
        this.addOrUpdateMarker(this.initialLat, this.initialLng);
      }

      this.setupMapClickHandler();
      this.setupMapZoomHandler(); // Añadir un manejador para capturar cambios de zoom
    }
  }

  private setupMapClickHandler(): void {
    if (!this.map) return;

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.enableMarker) {
        this.addOrUpdateMarker(e.latlng.lat, e.latlng.lng);
        this.reverseGeocodeAndEmit(e.latlng.lat, e.latlng.lng);
      }
    });
  }

  // Nuevo manejador de eventos para el zoom del mapa
  private setupMapZoomHandler(): void {
    if (!this.map) return;
    this.map.on('zoomend', () => {
      this.currentMapZoom = this.map!.getZoom(); // Actualizar el zoom actual al finalizar el zoom
      console.log('Map zoom changed to:', this.currentMapZoom); // Para depuración
    });
  }


  private cleanupMap(): void {
    if (this.map) {
      this.map.off(); // Desactiva todos los eventos
      this.map.remove();
      this.map = undefined;
    }

    if (this.currentMarker) {
      this.currentMarker.off();
      this.currentMarker.remove();
      this.currentMarker = undefined;
    }
  }

  public setMapCenterAndMarker(lat: number, lng: number, zoom?: number): void {
    if (!this.isMapReady || !this.map) {
      // Si el mapa no está listo, intentamos de nuevo después de un pequeño retraso
      // Esto es crucial para cuando se llama desde el padre antes de que initializeMap haya terminado
      setTimeout(() => this.setMapCenterAndMarker(lat, lng, zoom), 100);
      return;
    }

    // Usamos el zoom pasado o el zoom actual del mapa
    const effectiveZoom = zoom !== undefined ? zoom : this.currentMapZoom;

    this.map.setView([lat, lng], effectiveZoom);
    if (this.enableMarker) {
      this.addOrUpdateMarker(lat, lng);
    }
    this.map.invalidateSize(); // Asegurarse de que el mapa se redibuje correctamente
  }

  private addOrUpdateMarker(lat: number, lng: number): void {
    if (!this.enableMarker || !this.map) return;

    if (this.currentMarker) {
      this.currentMarker.setLatLng([lat, lng]);
    } else {
      this.currentMarker = L.marker([lat, lng], {
        draggable: true,
        autoPan: true
      }).addTo(this.map);

      this.setupMarkerDragHandler();
    }
  }

  private setupMarkerDragHandler(): void {
    if (!this.currentMarker) return;

    this.currentMarker.on('dragend', (e: L.LeafletEvent) => {
      const marker = e.target as L.Marker;
      const position = marker.getLatLng();
      this.reverseGeocodeAndEmit(position.lat, position.lng);
    });
  }

  private async reverseGeocodeAndEmit(lat: number, lng: number): Promise<void> {
    try {
      const direcciones: GeorefDireccion[] = await firstValueFrom(
        this.georefService.getDireccionPorCoordenadas(lat, lng).pipe(
          catchError(error => {
            console.error('Error en geocodificación inversa de GeoRef:', error);
            return of([]);
          })
        )
      );

      let georefAddress: GeorefAddressDetailsFromPicker | undefined;
      let fullGeorefResponse: GeorefDireccion | undefined;

      if (direcciones && direcciones.length > 0) {
        fullGeorefResponse = direcciones[0];

        georefAddress = {
          street: fullGeorefResponse.calle?.nombre || '',
          number: fullGeorefResponse.altura?.valor !== undefined && fullGeorefResponse.altura.valor !== null
                    ? String(fullGeorefResponse.altura.valor)
                    : null,
          municipalityId: fullGeorefResponse.municipio?.id || fullGeorefResponse.localidad?.id || fullGeorefResponse.localidad_censal?.id || undefined,
          provinceId: fullGeorefResponse.provincia?.id || undefined,
          provinceName: fullGeorefResponse.provincia?.nombre || undefined,
          municipalityName: fullGeorefResponse.municipio?.nombre || fullGeorefResponse.localidad?.nombre || fullGeorefResponse.localidad_censal?.nombre || undefined,
        };
      } else {
        console.warn('No se encontró dirección precisa para las coordenadas en GeoRef:', lat, lng);
        georefAddress = {};
      }

      this.locationSelected.emit({
        lat,
        lng,
        zoom: this.currentMapZoom, // Incluir el zoom actual al emitir el evento
        georefAddress,
        fullGeorefResponse
      });

    } catch (error) {
      console.error('Error inesperado durante reverseGeocodeAndEmit:', error);
      this.locationSelected.emit({ lat, lng, zoom: this.currentMapZoom, georefAddress: {}, fullGeorefResponse: undefined });
    }
  }

  public async geocodeAddress(
    streetName: string,
    streetNumber: string | number | null,
    provinceName: string,
    municipalityName: string
  ): Promise<boolean> {
    try {
      const direcciones: GeorefDireccion[] = await firstValueFrom(
        this.georefService.buscarDireccion(streetName, streetNumber, provinceName, municipalityName).pipe(
          catchError(error => {
            console.error('Error en geocodificación directa de Nominatim:', error);
            return of([]);
          })
        )
      );

      if (direcciones && direcciones.length > 0) {
        const primeraDireccion = direcciones[0];
        const lat = primeraDireccion.ubicacion?.lat;
        const lng = primeraDireccion.ubicacion?.lon;

        if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
          // Llamar a setMapCenterAndMarker con el zoom actual del mapa
          this.setMapCenterAndMarker(lat, lng, this.currentMapZoom);
          this.locationSelected.emit({
            lat,
            lng,
            zoom: this.currentMapZoom, // Incluir el zoom actual
            georefAddress: {
              street: primeraDireccion.calle?.nombre || '',
              number: primeraDireccion.altura?.valor !== undefined && primeraDireccion.altura.valor !== null ? String(primeraDireccion.altura.valor) : null,
              provinceId: primeraDireccion.provincia?.id || undefined,
              municipalityId: primeraDireccion.municipio?.id || primeraDireccion.localidad?.id || primeraDireccion.localidad_censal?.id || undefined,
              provinceName: primeraDireccion.provincia?.nombre || undefined,
              municipalityName: primeraDireccion.municipio?.nombre || primeraDireccion.localidad?.nombre || primeraDireccion.localidad_censal?.nombre || undefined,
            },
            fullGeorefResponse: primeraDireccion
          });
          return true;
        } else {
          console.warn('Dirección encontrada en Nominatim, pero sin coordenadas válidas.');
          return false;
        }
      } else {
        console.warn('No se encontró una dirección precisa para los datos proporcionados en Nominatim.');
        return false;
      }
    } catch (error) {
      console.error('Error inesperado durante geocodeAddress:', error);
      return false;
    }
  }

  public clearMarker(): void {
    if (this.currentMarker) {
      this.currentMarker.remove();
      this.currentMarker = undefined;
    }
  }
}
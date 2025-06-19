import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { GeorefService } from '../../services/georef.service';
import { GeorefDireccion } from '../../models/georef-models';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// --- NUEVA INTERFAZ LOCAL ---
// Definimos la interfaz aquí mismo para el objeto georefAddress
// Esto resuelve el error de tipo implícito sin modificar georef-models.ts
export interface GeorefAddressDetailsFromPicker {
  street?: string;
  number?: string | null;
  provinceId?: string;
  municipalityId?: string;
  provinceName?: string;
  municipalityName?: string;
}

/**
 * Interfaz para el evento que se emite cuando una ubicación es seleccionada o actualizada en el mapa.
 * Incluye las coordenadas y, opcionalmente, los detalles de la dirección geocodificada por GeoRef.
 */
export interface LocationSelectedEvent {
  lat: number;
  lng: number;
  // Usamos la interfaz local aquí
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

  @Input() initialLat: number = -34.6037; // Latitud por defecto (Buenos Aires, Argentina)
  @Input() initialLng: number = -58.3816; // Longitud por defecto (Buenos Aires, Argentina)
  @Input() initialZoom: number = 6;
  @Input() enableMarker: boolean = true;

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map?: L.Map;
  // CAMBIO: Hacer currentMarker público para acceso desde el componente padre si es necesario
  public currentMarker?: L.Marker;
  // CAMBIO: Hacer isMapReady público para acceso desde el componente padre
  public isMapReady = false;

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
    setTimeout(() => {
      this.initializeMap();
    }, 0);
  }

  ngOnDestroy(): void {
    this.cleanupMap();
  }

  private initializeMap(): void {
    if (this.map) {
      this.map.remove();
    }

    const lat = this.initialLat ?? -34.6037;
    const lng = this.initialLng ?? -58.3816;

    this.map = L.map(this.mapContainer.nativeElement).setView(
      [lat, lng],
      this.initialZoom
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    this.map?.invalidateSize();
    this.isMapReady = true;

    if (this.enableMarker && (this.initialLat !== 0 || this.initialLng !== 0) && (this.initialLat !== null && this.initialLng !== null)) {
      this.addOrUpdateMarker(this.initialLat, this.initialLng);
      // CAMBIO CLAVE: ELIMINAR esta línea para evitar la emisión inicial no deseada
      // this.reverseGeocodeAndEmit(this.initialLat, this.initialLng);
    }

    this.setupMapClickHandler();
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

  private cleanupMap(): void {
    if (this.map) {
      this.map.off();
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
      setTimeout(() => this.setMapCenterAndMarker(lat, lng, zoom), 100);
      return;
    }

    const currentZoom = this.map.getZoom();
    const effectiveZoom = zoom !== undefined ? zoom : currentZoom;

    this.map.setView([lat, lng], effectiveZoom);
    if (this.enableMarker) {
      this.addOrUpdateMarker(lat, lng);
    }
    this.map.invalidateSize();
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
        georefAddress,
        fullGeorefResponse
      });

    } catch (error) {
      console.error('Error inesperado durante reverseGeocodeAndEmit:', error);
      this.locationSelected.emit({ lat, lng, georefAddress: {}, fullGeorefResponse: undefined });
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
          this.setMapCenterAndMarker(lat, lng);
          this.locationSelected.emit({
            lat,
            lng,
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
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink } from 'lucide-react';

// Fix default marker icons under Vite (default uses webpack URLs)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Configure once
const DefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  height?: number;
}

export function LocationMap({ latitude, longitude, address, height = 160 }: LocationMapProps) {
  // Force re-init on lat/lng change by using key
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-card">
      <div style={{ height }} className="relative w-full">
        <MapContainer
          key={`${latitude}-${longitude}`}
          center={[latitude, longitude]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <Marker position={[latitude, longitude]} />
        </MapContainer>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 bg-card px-3 py-2 text-xs font-medium text-primary hover:bg-secondary/50 transition-colors"
      >
        <span className="truncate">{address || 'View location'}</span>
        <span className="flex items-center gap-1 flex-shrink-0">
          Open in Google Maps <ExternalLink className="h-3 w-3" />
        </span>
      </a>
    </div>
  );
}

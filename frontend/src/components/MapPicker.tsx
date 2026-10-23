import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Fix Leaflet default marker icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  initialLat?: number;
  initialLon?: number;
  onLocationSelect: (lat: number, lon: number, address: string) => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  initialLat = 12.9716, // Default Bangalore center
  initialLon = 77.5946,
  onLocationSelect
}) => {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({
    lat: initialLat,
    lon: initialLon
  });
  const [resolvedAddress, setResolvedAddress] = useState<string>('Bangalore Central Area');

  // Reverse geocoding helper
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood || '';
        const city = data.address?.city || data.address?.town || 'Bengaluru';
        const fullAddr = data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `${road}, ${city}`;
        setResolvedAddress(fullAddr);
        onLocationSelect(lat, lon, fullAddr);
        return;
      }
    } catch (e) {
      // Fallback
    }
    const fallback = `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}, Bengaluru`;
    setResolvedAddress(fallback);
    onLocationSelect(lat, lon, fallback);
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLon], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker([initialLat, initialLon], { draggable: true }).addTo(map);

      marker.on('dragend', (e) => {
        const markerPos = e.target.getLatLng();
        setCurrentCoords({ lat: markerPos.lat, lon: markerPos.lng });
        reverseGeocode(markerPos.lat, markerPos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setCurrentCoords({ lat: e.latlng.lat, lon: e.latlng.lng });
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;

      // Initial reverse geocode
      reverseGeocode(initialLat, initialLon);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Please tap the map to choose location.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentCoords({ lat: latitude, lon: longitude });
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        alert("Unable to retrieve GPS coordinates. You can move the map pin directly to your location.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* GPS Button */}
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={isLocating}
        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-75"
      >
        <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
        <span>{isLocating ? t.gettingLocation : t.useMyLocation}</span>
      </button>

      {/* Interactive Map Box */}
      <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs text-slate-700 flex items-center gap-2 z-[1000]">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate font-medium">{resolvedAddress}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 text-center">
        💡 Tap anywhere on the map or drag the blue marker to pin the exact location.
      </p>
    </div>
  );
};

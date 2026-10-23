import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, MapPin, Edit3 } from 'lucide-react';
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
  initialAddress?: string;
  onLocationSelect: (lat: number, lon: number, address: string) => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  initialLat = 12.9716, // Default Bangalore center
  initialLon = 77.5946,
  initialAddress = 'MG Road, Bangalore Central Area',
  onLocationSelect
}) => {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({
    lat: initialLat,
    lon: initialLon
  });
  const [manualAddress, setManualAddress] = useState<string>(initialAddress);

  // Reverse geocoding helper (with polite OpenStreetMap Nominatim request headers)
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'CivicFix-AI-CitizenPortal' } }
      );
      if (res.ok) {
        const data = await res.json();
        const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood || '';
        const city = data.address?.city || data.address?.town || 'Bengaluru';
        const fullAddr = data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `${road}, ${city}`;
        setManualAddress(fullAddr);
        onLocationSelect(lat, lon, fullAddr);
        return;
      }
    } catch (e) {
      // Fallback
    }
    const fallback = `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}, Bengaluru`;
    setManualAddress(fallback);
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

      // Initialize
      onLocationSelect(initialLat, initialLon, manualAddress);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleUseMyLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. You can pin the map or enter your address manually.");
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
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location permission was denied. You can manually enter your address below or drag the map pin.");
        } else {
          setLocationError("Unable to retrieve GPS coordinates right now. Please enter your address or move the map marker.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleManualAddressChange = (newAddr: string) => {
    setManualAddress(newAddr);
    onLocationSelect(currentCoords.lat, currentCoords.lon, newAddr);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* GPS Button */}
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={isLocating}
        className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-75"
      >
        <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
        <span>{isLocating ? t.gettingLocation : 'Use My Current Location'}</span>
      </button>

      {locationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
          {locationError}
        </div>
      )}

      {/* Interactive Map Box */}
      <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 shadow text-[11px] font-mono font-bold text-slate-700 z-[1000]">
          {currentCoords.lat.toFixed(4)}, {currentCoords.lon.toFixed(4)}
        </div>
      </div>
      
      <p className="text-xs text-slate-500 text-center">
        💡 Drag the blue map marker or tap anywhere to place the pin precisely.
      </p>

      {/* Manual Address Entry Field */}
      <div className="mt-1">
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            Manual Address / Street Name
          </span>
          <span className="text-slate-400 font-normal lowercase">(editable)</span>
        </label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
          <input
            type="text"
            required
            value={manualAddress}
            onChange={(e) => handleManualAddressChange(e.target.value)}
            placeholder="e.g., 5th Main Road, Near Metro Station, Indiranagar"
            className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900"
          />
        </div>
      </div>
    </div>
  );
};

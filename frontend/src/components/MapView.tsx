import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface ComplaintMarker {
  id: number;
  tracking_number: string;
  category: string;
  title: string;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  priority_level: string;
  image_url?: string;
  confirmations_count?: number;
}

interface MapViewProps {
  complaints: ComplaintMarker[];
  center?: [number, number];
  zoom?: number;
  onSelectComplaint?: (complaint: ComplaintMarker) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  complaints,
  center = [12.9716, 77.5946],
  zoom = 12,
  onSelectComplaint
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when complaints change
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const categoryIcons: Record<string, string> = {
      pothole: '🛣️',
      garbage: '🗑️',
      streetlight: '💡',
      water_leak: '💧',
      other: '⚠️'
    };

    complaints.forEach((c) => {
      const iconEmoji = categoryIcons[c.category] || '⚠️';
      const isCritical = c.priority_level === 'Critical';
      const isResolved = c.status === 'resolved';

      const markerHtml = `
        <div style="
          background-color: ${isResolved ? '#10b981' : isCritical ? '#ef4444' : '#3b82f6'};
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border: 3px solid white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          transform: translate(-50%, -50%);
          cursor: pointer;
        ">
          ${iconEmoji}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 200px; padding: 2px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #0f172a;">${c.title}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">ID: ${c.tracking_number}</div>
          <div style="display: flex; gap: 6px; margin-bottom: 8px;">
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 12px; background: #e0f2fe; color: #0369a1; font-weight: 600;">
              ${c.status.toUpperCase()}
            </span>
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 12px; background: ${isCritical ? '#ffe4e6' : '#fef3c7'}; color: ${isCritical ? '#be123c' : '#b45309'}; font-weight: 600;">
              ${c.priority_level}
            </span>
          </div>
          <div style="font-size: 12px; color: #334155; margin-bottom: 6px;">${c.address}</div>
          ${c.confirmations_count ? `<div style="font-size: 11px; color: #16a34a; font-weight: 600;">👥 ${c.confirmations_count} verified affected</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      if (onSelectComplaint) {
        marker.on('click', () => onSelectComplaint(c));
      }
      marker.addTo(markersLayerRef.current!);
    });

    if (complaints.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(complaints.map(c => [c.latitude, c.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [complaints]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

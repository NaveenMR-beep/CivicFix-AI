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
  created_at?: string;
  confirmations_count?: number;
}

interface MapViewProps {
  complaints: ComplaintMarker[];
  center?: [number, number];
  zoom?: number;
  onSelectComplaint?: (complaint: ComplaintMarker) => void;
  onViewDetails?: (trackingNumber: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  complaints,
  center = [12.9716, 77.5946],
  zoom = 13,
  onSelectComplaint,
  onViewDetails
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

    const categoryIcons: Record<string, { emoji: string; color: string; label: string }> = {
      pothole: { emoji: '🛣️', color: '#f59e0b', label: 'Road / Pothole' },
      garbage: { emoji: '🗑️', color: '#10b981', label: 'Garbage' },
      streetlight: { emoji: '💡', color: '#eab308', label: 'Streetlight' },
      water_leak: { emoji: '💧', color: '#3b82f6', label: 'Water Leak' },
      other: { emoji: '⚠️', color: '#8b5cf6', label: 'Other Issue' }
    };

    const validComplaints = complaints.filter(c => c.latitude && c.longitude && !isNaN(c.latitude) && !isNaN(c.longitude));

    validComplaints.forEach((c) => {
      const catConfig = categoryIcons[c.category?.toLowerCase()] || categoryIcons.other;
      const isResolved = c.status === 'resolved';
      const bgColor = isResolved ? '#059669' : catConfig.color;

      const markerHtml = `
        <div style="
          background-color: ${bgColor};
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transform: translate(-50%, -50%);
          cursor: pointer;
        ">
          ${catConfig.emoji}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

      const dateStr = c.created_at
        ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Recently';

      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; padding: 4px;">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px; color: #0f172a;">${c.title}</div>
          <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: #64748b; margin-bottom: 6px;">ID: ${c.tracking_number}</div>
          
          <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="font-size: 10px; padding: 2px 7px; border-radius: 999px; background: ${isResolved ? '#d1fae5' : '#e0f2fe'}; color: ${isResolved ? '#065f46' : '#0369a1'}; font-weight: 700; text-transform: uppercase;">
              ${c.status.replace('_', ' ')}
            </span>
            <span style="font-size: 10px; padding: 2px 7px; border-radius: 999px; background: #f1f5f9; color: #475569; font-weight: 600;">
              ${catConfig.label}
            </span>
          </div>

          <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">
            📍 <strong>Location:</strong> ${c.address}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            📅 <strong>Submitted:</strong> ${dateStr}
          </div>

          ${c.confirmations_count ? `<div style="font-size: 11px; color: #16a34a; font-weight: 700; margin-bottom: 8px;">👥 ${c.confirmations_count} citizens affected</div>` : ''}

          <a href="#track" id="btn-details-${c.tracking_number}" style="display: block; text-align: center; padding: 6px 12px; background: #059669; color: white; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none;">
            View Complaint Details →
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);
      
      marker.on('popupopen', () => {
        const link = document.getElementById(`btn-details-${c.tracking_number}`);
        if (link && onViewDetails) {
          link.onclick = (e) => {
            e.preventDefault();
            onViewDetails(c.tracking_number);
          };
        }
      });

      if (onSelectComplaint) {
        marker.on('click', () => onSelectComplaint(c));
      }
      marker.addTo(markersLayerRef.current!);
    });

    if (validComplaints.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(validComplaints.map(c => [c.latitude, c.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [complaints]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-md text-[11px] z-[1000] space-y-1">
        <span className="font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
          Map Legend
        </span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0 inline-block" />
            <span>Pothole / Road</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 inline-block" />
            <span>Garbage</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0 inline-block" />
            <span>Streetlight</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0 inline-block" />
            <span>Water Leak</span>
          </div>
        </div>
      </div>
    </div>
  );
};

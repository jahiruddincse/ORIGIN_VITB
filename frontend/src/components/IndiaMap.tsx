import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Claim } from '../types';
import { ClaimMapPopup } from './ClaimMapPopup';

const SEVERITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#3b82f6',
  Normal: '#6b7280',
};

function MapViewRecenter({ lat, lng, zoom }: { lat: number, lng: number, zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
}

export function IndiaMap({ claims, className = 'h-[500px]' }: { claims: Claim[], className?: string }) {
  const navigate = useNavigate();

  return (
    <div className={`w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm ${className}`}>
      <MapContainer center={[22.5, 82]} zoom={5} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {claims.map((claim) => (
          <CircleMarker
            key={claim.claim_id}
            center={[claim.latitude, claim.longitude]}
            radius={claim.severity === 'Critical' || claim.severity === 'High' ? 8 : 5}
            pathOptions={{
              color: SEVERITY_COLORS[claim.severity as keyof typeof SEVERITY_COLORS] || '#6b7280',
              fillColor: SEVERITY_COLORS[claim.severity as keyof typeof SEVERITY_COLORS] || '#6b7280',
              fillOpacity: 0.7,
              weight: 2
            }}
            eventHandlers={{
              click: () => navigate(`/claims/${claim.claim_id}`),
            }}
          >
            <Popup>
              <ClaimMapPopup claim={claim} />
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

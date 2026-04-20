import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Office } from "../types";

interface MapViewProps {
  offices: Office[];
  center: [number, number];
  zoom?: number;
}

export function MapView({ offices, center, zoom = 3 }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const effectiveZoom = zoom ?? 3;
    // Initialize the map
    const map = L.map(containerRef.current, {
      center: center as L.LatLngExpression,
      zoom: effectiveZoom,
    });

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Initialize marker cluster group
    const markers = L.markerClusterGroup();

    // Add markers for each office that has coordinates
    offices
      .filter((office): office is Office & { latitude: number; longitude: number } => 
        office.latitude !== undefined && office.longitude !== undefined)
      .forEach((office) => {
        const marker = L.marker([office.latitude, office.longitude]).bindPopup(`
          <div>
            <h4>${office.companyId}</h4>
            <p><strong>${office.city}, ${office.country}</strong></p>
            <p>${office.address}</p>
            ${office.contactUrl ? `<a href="${office.contactUrl}" target="_blank" rel="noopener noreferrer">Visit website</a>` : ""}
            <br/>
            <a href="/company/${office.companyId}" target="_blank" rel="noopener noreferrer">View company details</a>
          </div>
        `);
        markers.addLayer(marker);
      });

    // Add the marker cluster group to the map
    map.addLayer(markers);

    // Store reference
    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [offices, center, zoom]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import type { Office } from "../types";
import { sanitizeUrl } from "../utils/data";

interface MapViewProps {
  offices: Office[];
  center: [number, number];
  zoom?: number;
  height?: string;
}

export function MapView({ offices, center, zoom = 2, height = "400px" }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize map and tile layer once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: center as L.LatLngExpression,
      zoom,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const cluster = L.markerClusterGroup();
    map.addLayer(cluster);

    mapRef.current = map;
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  // center and zoom are intentionally read only at mount; a separate effect handles updates
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update map view when center or zoom change
  useEffect(() => {
    mapRef.current?.setView(center as L.LatLngExpression, zoom);
  }, [center, zoom]);

  // Update markers when offices change
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();

    offices
      .filter(
        (office): office is Office & { latitude: number; longitude: number } =>
          office.latitude !== undefined && office.longitude !== undefined
      )
      .forEach((office) => {
        const container = document.createElement("div");

        const title = document.createElement("h4");
        title.textContent = office.companyId;
        container.appendChild(title);

        const location = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = `${office.city}, ${office.country}`;
        location.appendChild(strong);
        container.appendChild(location);

        const addressEl = document.createElement("p");
        addressEl.textContent = office.address;
        container.appendChild(addressEl);

        const safeContactUrl = sanitizeUrl(office.contactUrl);
        if (safeContactUrl) {
          const link = document.createElement("a");
          link.href = safeContactUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Visit website";
          container.appendChild(link);
          container.appendChild(document.createElement("br"));
        }

        const detailsLink = document.createElement("a");
        detailsLink.href = `${import.meta.env.BASE_URL}company/${encodeURIComponent(office.companyId)}`;
        detailsLink.textContent = "View company details";
        container.appendChild(detailsLink);

        L.marker([office.latitude, office.longitude])
          .bindPopup(container)
          .addTo(cluster);
      });
  }, [offices]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}

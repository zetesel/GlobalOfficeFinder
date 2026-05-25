import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Office } from "../types";
import { sanitizeUrl } from "../utils/data";

// Fix for default marker icon issues with Vite/Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

const AUTO_FIT_MAX_ZOOM = 12;
const AUTO_FIT_PADDING: L.PointExpression = [24, 24];

type CoordinateOffice = Office & { latitude: number; longitude: number };

type DefaultMapView =
  | { type: "center"; center: [number, number]; zoom: number }
  | { type: "bounds"; bounds: L.LatLngBounds; maxZoom: number };

interface MapViewProps {
  offices: Office[];
  center: [number, number];
  zoom?: number;
  height?: string;
  autoFit?: boolean;
  companyName?: string;
  companyNamesById?: Record<string, string>;
  focus?: { lat: number; lng: number; zoom: number };
  onReset?: () => void;
  showResetButton?: boolean;
  overviewAutoFit?: boolean;
}

function buildDefaultView(
  coordinateOffices: CoordinateOffice[],
  center: [number, number],
  zoom: number,
  autoFit: boolean,
): DefaultMapView {
  if (autoFit && coordinateOffices.length > 0) {
    if (coordinateOffices.length === 1) {
      const office = coordinateOffices[0];
      return {
        type: "center",
        center: [office.latitude, office.longitude],
        zoom,
      };
    }
    const bounds = L.latLngBounds(
      coordinateOffices.map((office) => [office.latitude, office.longitude] as [number, number]),
    );
    return {
      type: "bounds",
      bounds,
      maxZoom: Math.min(zoom, AUTO_FIT_MAX_ZOOM),
    };
  }
  return { type: "center", center, zoom };
}

function applyDefaultView(map: L.Map, view: DefaultMapView): void {
  if (view.type === "bounds") {
    map.fitBounds(view.bounds, {
      padding: AUTO_FIT_PADDING,
      maxZoom: view.maxZoom,
    });
    return;
  }
  map.setView(view.center as L.LatLngExpression, view.zoom);
}

export function MapView({
  offices,
  center,
  zoom = 2,
  height = "400px",
  autoFit = false,
  companyName,
  companyNamesById = {},
  focus,
  onReset,
  showResetButton = true,
  overviewAutoFit,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const defaultViewRef = useRef<DefaultMapView>(
    buildDefaultView([], center, zoom, autoFit),
  );
  const overviewViewRef = useRef<DefaultMapView>(
    buildDefaultView([], center, zoom, autoFit),
  );

  const handleReset = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (focus) {
      const focusedView: DefaultMapView = {
        type: "center",
        center: [focus.lat, focus.lng],
        zoom: focus.zoom,
      };
      defaultViewRef.current = focusedView;
      applyDefaultView(map, focusedView);
      return;
    }

    onReset?.();
    defaultViewRef.current = overviewViewRef.current;
    applyDefaultView(map, overviewViewRef.current);
  }, [focus, onReset]);

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

  // Update map view when center or zoom change; respect focus when provided
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focus) {
      defaultViewRef.current = {
        type: "center",
        center: [focus.lat, focus.lng],
        zoom: focus.zoom,
      };
      map.setView([focus.lat, focus.lng], focus.zoom);
      return;
    }
    defaultViewRef.current = overviewViewRef.current;
    if (autoFit) return;
    map.setView(center as L.LatLngExpression, zoom);
  }, [center, zoom, autoFit, focus]);

  // Update markers when offices change
  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!cluster) return;

    cluster.clearLayers();

    const coordinateOffices = offices.filter(
      (office): office is CoordinateOffice =>
        typeof office.latitude === "number" && typeof office.longitude === "number",
    );

    overviewViewRef.current = buildDefaultView(
      coordinateOffices,
      center,
      zoom,
      overviewAutoFit ?? autoFit,
    );
    if (!focus) {
      defaultViewRef.current = overviewViewRef.current;
    }

    coordinateOffices.forEach((office) => {
      const container = document.createElement("div");

      const title = document.createElement("h4");
      title.textContent = companyName || companyNamesById[office.companyId] || office.companyId;
      title.style.margin = "0 0 5px 0";
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

    if (focus) return;

    if (autoFit && map && coordinateOffices.length > 0) {
      applyDefaultView(map, defaultViewRef.current);
    }
  }, [offices, autoFit, overviewAutoFit, zoom, center, companyName, companyNamesById, focus]);

  return (
    <div className="map-view" style={{ height, width: "100%" }}>
      {showResetButton ? (
        <button
          type="button"
          className="map-view-reset"
          aria-label="Reset map to default view"
          title="Reset map view"
          onClick={handleReset}
        >
          Reset view
        </button>
      ) : null}
      <div ref={containerRef} className="map-view-canvas" />
    </div>
  );
}

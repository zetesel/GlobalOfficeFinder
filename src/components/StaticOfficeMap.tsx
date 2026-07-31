import { useEffect, useRef, useState, type ReactNode } from "react";
import L from "leaflet";
import type { Company, Office } from "../types";

export interface StaticOfficeMapProps {
  office?: Office;
  offices?: Office[];
  company?: Company;
  zoom?: number;
  className?: string;
  children?: ReactNode;
}

function hasCoords(o: Office): o is Office & { latitude: number; longitude: number } {
  return typeof o.latitude === "number" && typeof o.longitude === "number";
}

export default function StaticOfficeMap({
  office,
  offices,
  zoom = 14,
  className = "",
  children,
}: StaticOfficeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  // Lazy init: true immediately when IntersectionObserver is unavailable (happy-dom / SSR)
  const [isVisible, setIsVisible] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  const positionedOffices: (Office & { latitude: number; longitude: number })[] = [];

  if (office && hasCoords(office)) {
    positionedOffices.push(office);
  }

  if (offices) {
    for (const o of offices) {
      if (hasCoords(o) && !positionedOffices.some((p) => p.id === o.id)) {
        positionedOffices.push(o);
      }
    }
  }

  const primary = positionedOffices[0];

  const officesKey = positionedOffices
    .map((o) => `${o.id}:${o.latitude},${o.longitude}`)
    .join("|");

  useEffect(() => {
    // When IO unavailable, isVisible already initialized to true — nothing to observe
    if (typeof IntersectionObserver === "undefined") return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !primary || !isVisible) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
      },
    ).addTo(map);

    map.setView([primary.latitude, primary.longitude], zoom);

    positionedOffices.forEach((o) => {
      const icon = L.divIcon({
        className: "gof-pin-wrap",
        html: `<div class="gof-pin is-active"><span class="gof-pin-dot"></span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([o.latitude, o.longitude], { icon }).addTo(map);
    });

    mapRef.current = map;
    const tid = window.setTimeout(() => map.invalidateSize(), 60);

    return () => {
      window.clearTimeout(tid);
      map.remove();
      mapRef.current = null;
    };
  }, [isVisible, primary?.latitude, primary?.longitude, zoom, officesKey]);

  return (
    <div className={`gof-static-map ${className}`}>
      <div ref={containerRef} className="gof-static-map-canvas" />
      <div className="gof-photo-grad" />
      <span className="gof-photo-badge is-real" style={{ cursor: "default" }}>
        <span className="gof-photo-badge-ic" aria-hidden="true">📍</span>
        <span className="gof-photo-badge-panel">
          <span className="gof-photo-badge-line">
            Map location{office ? ` · ${office.city}` : ""}
          </span>
        </span>
      </span>
      {children}
    </div>
  );
}

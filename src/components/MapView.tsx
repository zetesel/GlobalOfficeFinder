import { useEffect, useLayoutEffect, useRef } from "react";
import L from "leaflet";
import type { Company, Office } from "../types";

export interface MapFocus {
  id?: string;
  fit?: boolean;
}

interface MapViewProps {
  offices: Office[];
  companyById: Record<string, Company>;
  activeId?: string | null;
  hoverId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (office: Office) => void;
  onResetView?: () => void;
  onBackgroundClick?: () => void;
  focus?: MapFocus;
  padding?: [number, number];
}

function hasCoords(
  o: Office,
): o is Office & { latitude: number; longitude: number } {
  return typeof o.latitude === "number" && typeof o.longitude === "number";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function MapView({
  offices,
  companyById,
  activeId,
  hoverId,
  onHover,
  onSelect,
  onResetView,
  onBackgroundClick,
  focus,
  padding,
}: MapViewProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const onBackgroundClickRef =
    useRef<typeof onBackgroundClick>(onBackgroundClick);
  useLayoutEffect(() => {
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onBackgroundClick]);

  useEffect(() => {
    if (!elRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
      worldCopyJump: true,
      minZoom: 2,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        // Larger buffer keeps neighbouring tiles painted during pan/zoom,
        // and updateWhenZooming smooths the in-flight scale transition.
        keepBuffer: 4,
        updateWhenZooming: true,
      },
    ).addTo(map);
    map.setView([28, 8], 2);
    map.on("click", () => onBackgroundClickRef.current?.());
    mapRef.current = map;
    const tid = window.setTimeout(() => map.invalidateSize(), 60);
    return () => {
      window.clearTimeout(tid);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    const positioned = offices.filter(hasCoords);
    positioned.forEach((o) => {
      const co = companyById[o.companyId];
      const icon = L.divIcon({
        className: "gof-pin-wrap",
        html: `<div class="gof-pin" data-id="${escapeHtml(o.id)}"><span class="gof-pin-dot"></span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const m = L.marker([o.latitude, o.longitude], {
        icon,
        riseOnHover: true,
      }).addTo(map);
      m.on("mouseover", () => onHover?.(o.id));
      m.on("mouseout", () => onHover?.(null));
      m.on("click", () => onSelect?.(o));
      m.bindTooltip(
        `<strong>${escapeHtml(co ? co.name : "")}</strong><br>${escapeHtml(o.city)}, ${escapeHtml(o.country)}`,
        { direction: "top", offset: [0, -12], className: "gof-tip" },
      );
      markersRef.current[o.id] = m;
    });
    if (positioned.length) {
      const b = L.latLngBounds(
        positioned.map((o) => [o.latitude, o.longitude] as [number, number]),
      );
      map.fitBounds(b, {
        padding: padding || [60, 60],
        maxZoom: 11,
        animate: true,
      });
    }
    // hover/select handlers are stable refs from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offices, companyById]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focus?.id && markersRef.current[focus.id]) {
      const o = offices.find((x) => x.id === focus.id);
      if (o && hasCoords(o)) {
        const target = L.latLng(o.latitude, o.longitude);
        const targetZoom = Math.max(map.getZoom(), 10);
        const center = map.getCenter();
        const close =
          center.distanceTo(target) < 50 &&
          Math.abs(map.getZoom() - targetZoom) < 0.25;
        const marker = markersRef.current[o.id];
        if (!close) {
          // Slightly longer duration + gentle easing gives the tile pyramid
          // time to fetch and crossfade, eliminating the mid-flight label
          // stretching that's visible with a steeper curve.
          map.flyTo(target, targetZoom, { duration: 1.0, easeLinearity: 0.25 });
          // Defer the tooltip until the animation settles so it doesn't
          // float over still-loading tiles.
          map.once("moveend", () => marker.openTooltip());
        } else {
          marker.openTooltip();
        }
      }
    } else if (focus?.fit) {
      const positioned = offices.filter(hasCoords);
      if (positioned.length) {
        const b = L.latLngBounds(
          positioned.map((o) => [o.latitude, o.longitude] as [number, number]),
        );
        map.fitBounds(b, {
          padding: padding || [60, 60],
          maxZoom: 11,
          animate: true,
        });
      } else {
        map.setView([28, 8], 2, { animate: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, m]) => {
      const el = m.getElement();
      if (!el) return;
      const pin = el.querySelector(".gof-pin");
      if (!pin) return;
      pin.classList.toggle("is-active", id === activeId);
      pin.classList.toggle("is-hover", id === hoverId);
      if (id === activeId || id === hoverId) m.setZIndexOffset(1000);
      else m.setZIndexOffset(0);
    });
  }, [activeId, hoverId, offices]);

  return (
    <>
      <div
        ref={elRef}
        className="gof-map"
        role="region"
        aria-label="Map of offices"
      />
      {onResetView && (
        <button
          type="button"
          className="gof-resetview"
          aria-label="Reset map view"
          title="Reset view"
          onClick={onResetView}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3.5 8a4.5 4.5 0 1 1 1.32 3.18"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M3 4v3.2h3.2"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </>
  );
}

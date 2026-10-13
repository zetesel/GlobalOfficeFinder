import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router";
import L from "leaflet";
import type { Company, Office } from "../types";
import Monogram from "./Monogram";
import FlagChip from "./FlagChip";
import { truncate } from "../utils/typeTag";
import { sanitizeUrl } from "../utils/sanitizeUrl";
import { OSM_TILE_URL, OSM_TILE_OPTIONS } from "../utils/mapTiles";

export interface MapFocus {
  id?: string;
  fit?: boolean;
  zoom?: number;
}

interface MapViewProps {
  offices: Office[];
  companyById: Record<string, Company>;
  currentCompanyId?: string;
  activeId?: string | null;
  hoverId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (office: Office) => void;
  onResetView?: () => void;
  onBackgroundClick?: () => void;
  focus?: MapFocus;
  padding?: [number, number];
  showPopup?: boolean;
  maxFitZoom?: number;
  focusZoom?: number;
}

interface RemovableTooltip extends L.Tooltip {
  _removeTimeout?: ReturnType<typeof setTimeout>;
  _container?: HTMLElement;
}

function hasCoords(o: Office): o is Office & { latitude: number; longitude: number } {
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

function getTooltipHtml(
  o: Office,
  co: Company | undefined,
  currentCompanyId?: string,
): string {
  const website = co ? sanitizeUrl(co.website) : "";
  const isCurrentCompany = Boolean(
    currentCompanyId && co && currentCompanyId === co.id,
  );

  const primaryBtn = isCurrentCompany
    ? o.country
      ? `<button type="button" class="gof-tip-btn gof-tip-btn--primary" data-href="/country/${encodeURIComponent(o.country)}">View country<svg width="11" height="11" viewBox="0 0 12 12" style="margin-left:3px" aria-hidden="true"><path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`
      : ""
    : co
      ? `<button type="button" class="gof-tip-btn gof-tip-btn--primary" data-href="/company/${encodeURIComponent(co.id)}">View company<svg width="11" height="11" viewBox="0 0 12 12" style="margin-left:3px" aria-hidden="true"><path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`
      : "";

  return `
    <div class="gof-tip-content">
      <strong class="gof-tip-name">${escapeHtml(co ? co.name : "")}</strong>
      <div class="gof-tip-loc">${escapeHtml(o.city)}, ${escapeHtml(o.country)}</div>
      <div class="gof-tip-actions">
        ${primaryBtn}
        ${website ? `<a class="gof-tip-btn gof-tip-btn--ext" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Visit website<svg width="10" height="10" viewBox="0 0 13 13" style="margin-left:3px" aria-hidden="true"><path d="M4 9L9 4H5M9 4V8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></a>` : ""}
      </div>
    </div>
  `;
}

export default function MapView({
  offices,
  companyById,
  currentCompanyId,
  activeId,
  hoverId,
  onHover,
  onSelect,
  onResetView,
  onBackgroundClick,
  focus,
  padding,
  showPopup = true,
  maxFitZoom = 18,
  focusZoom = 18,
}: MapViewProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const popupRef = useRef<L.Popup | null>(null);
  const popupContainerRef = useRef<HTMLDivElement | null>(null);
  const prevActiveIdRef = useRef<string | null | undefined>(null);

  const [popupNode, setPopupNode] = useState<HTMLDivElement | null>(null);

  const navigate = useNavigate();
  const onBackgroundClickRef = useRef<typeof onBackgroundClick>(onBackgroundClick);
  useLayoutEffect(() => {
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onBackgroundClick]);

  const activeIdRef = useRef<string | null | undefined>(activeId);
  useLayoutEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!elRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
      worldCopyJump: true,
      minZoom: 1,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(OSM_TILE_URL, {
      ...OSM_TILE_OPTIONS,
      keepBuffer: 4,
      updateWhenZooming: true,
    }).addTo(map);
    map.setView([28, 8], 1);
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
    const mapEl = elRef.current;
    if (!mapEl) return;
    const handleTipClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(".gof-tip-btn[data-href]");
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const href = btn.getAttribute("data-href");
        if (href) {
          navigate(href);
        }
      }
    };
    mapEl.addEventListener("click", handleTipClick);
    return () => {
      mapEl.removeEventListener("click", handleTipClick);
    };
  }, [navigate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    const positioned = offices.filter(hasCoords);
    positioned.forEach((o) => {
      const co = companyById[o.companyId];
      const isActive = o.id === activeIdRef.current;
      const icon = L.divIcon({
        className: "gof-pin-wrap",
        html: `<div class="gof-pin${isActive ? " is-active" : ""}" data-id="${escapeHtml(o.id)}"><span class="gof-pin-dot"></span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const m = L.marker([o.latitude, o.longitude], { icon, riseOnHover: true }).addTo(map);
      m.on("mouseover", () => {
        if (o.id !== activeIdRef.current) {
          onHover?.(o.id);
        }
      });
      m.on("mouseout", () => {
        if (o.id !== activeIdRef.current) {
          onHover?.(null);
        }
      });
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        const target = L.latLng(o.latitude, o.longitude);
        const targetZoom = focusZoom || 16;
        map.flyTo(target, targetZoom, { duration: 0.8, easeLinearity: 0.25 });
        onSelect?.(o);
      });
      const tooltipHtml = getTooltipHtml(o, co, currentCompanyId);
      m.bindTooltip(tooltipHtml, {
        direction: "top",
        offset: [0, -12],
        className: "gof-tip",
        permanent: isActive,
        interactive: true,
      });
      if (isActive) {
        m.openTooltip();
        m.setZIndexOffset(1000);
      }
      markersRef.current[o.id] = m;
    });
    if (positioned.length) {
      const b = L.latLngBounds(positioned.map((o) => [o.latitude, o.longitude] as [number, number]));
      map.fitBounds(b, { padding: padding || [30, 30], maxZoom: maxFitZoom, animate: true });
    }
  }, [offices, companyById, currentCompanyId, maxFitZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focus?.id && markersRef.current[focus.id]) {
      const o = offices.find((x) => x.id === focus.id);
      if (o && hasCoords(o)) {
        const target = L.latLng(o.latitude, o.longitude);
        const targetZoom = focus.zoom ?? Math.max(map.getZoom(), focusZoom);
        const center = map.getCenter();
        const close = center.distanceTo(target) < 50 && Math.abs(map.getZoom() - targetZoom) < 0.25;
        if (!close) {
          map.flyTo(target, targetZoom, { duration: 1.0, easeLinearity: 0.25 });
        }
      }
    } else if (focus?.fit) {
      const positioned = offices.filter(hasCoords);
      if (positioned.length) {
        const b = L.latLngBounds(
          positioned.map((o) => [o.latitude, o.longitude] as [number, number]),
        );
        map.fitBounds(b, { padding: padding || [30, 30], maxZoom: maxFitZoom, animate: true });
      } else {
        map.setView([28, 8], 1, { animate: true });
      }
    }
  }, [focus, showPopup, focusZoom, maxFitZoom]);

  useEffect(() => {
    const prevId = prevActiveIdRef.current;
    prevActiveIdRef.current = activeId;

    if (prevId && prevId !== activeId && markersRef.current[prevId]) {
      const prevM = markersRef.current[prevId];
      const prevO = offices.find((x) => x.id === prevId);
      if (prevO) {
        const co = companyById[prevO.companyId];
        const tooltipHtml = getTooltipHtml(prevO, co, currentCompanyId);
        const prevTip = prevM.getTooltip?.() as RemovableTooltip | undefined;
        if (prevTip) {
          if (prevTip._removeTimeout) clearTimeout(prevTip._removeTimeout);
          prevTip._container?.remove();
        }
        if (typeof prevM.unbindTooltip === "function") {
          prevM.unbindTooltip();
        }
        prevM.bindTooltip(tooltipHtml, {
          direction: "top",
          offset: [0, -12],
          className: "gof-tip",
          permanent: false,
          interactive: true,
        });
        prevM.closeTooltip();
      }
    }

    if (activeId && markersRef.current[activeId]) {
      const curM = markersRef.current[activeId];
      const curO = offices.find((x) => x.id === activeId);
      if (curO) {
        const co = companyById[curO.companyId];
        const tooltipHtml = getTooltipHtml(curO, co, currentCompanyId);
        const curTip = curM.getTooltip?.() as RemovableTooltip | undefined;
        if (curTip) {
          if (curTip._removeTimeout) clearTimeout(curTip._removeTimeout);
          curTip._container?.remove();
        }
        if (typeof curM.unbindTooltip === "function") {
          curM.unbindTooltip();
        }
        curM.bindTooltip(tooltipHtml, {
          direction: "top",
          offset: [0, -12],
          className: "gof-tip",
          permanent: true,
          interactive: true,
        });
        curM.openTooltip();
      }
    }

    Object.entries(markersRef.current).forEach(([id, m]) => {
      const el = m.getElement();
      if (!el) return;
      const pin = el.querySelector(".gof-pin");
      if (!pin) return;
      const isActive = id === activeId;
      const isHover = id === hoverId;
      pin.classList.toggle("is-active", isActive);
      pin.classList.toggle("is-hover", isHover);
      m.setZIndexOffset(isActive || isHover ? 1000 : 0);
    });
  }, [activeId, hoverId, offices, companyById, currentCompanyId]);

  // Leaflet popup anchored directly above the active pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeOffice = activeId ? offices.find((o) => o.id === activeId) : null;

    if (showPopup && activeOffice && hasCoords(activeOffice)) {
      const marker = markersRef.current[activeOffice.id];
      if (marker) {
        marker.closeTooltip();
      }

      if (!popupContainerRef.current) {
        const container = document.createElement("div");
        popupContainerRef.current = container;
      }

      if (!popupRef.current) {
        popupRef.current = L.popup({
          autoPan: true,
          closeButton: false,
          offset: [0, -14],
          className: "gof-map-popup",
        });
      }

      const popup = popupRef.current;
      popup
        .setLatLng([activeOffice.latitude, activeOffice.longitude])
        .setContent(popupContainerRef.current)
        .openOn(map);

      setPopupNode(popupContainerRef.current);
    } else {
      if (popupRef.current) {
        map.closePopup(popupRef.current);
        popupRef.current = null;
      }
      setPopupNode(null);
    }
  }, [activeId, offices, showPopup]);

  const activeOffice = activeId ? offices.find((o) => o.id === activeId) : null;
  const activeCompany = activeOffice ? companyById[activeOffice.companyId] : null;

  return (
    <>
      <div ref={elRef} className="gof-map" role="region" aria-label="Map of offices" />
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
      {showPopup &&
        popupNode &&
        activeOffice &&
        activeCompany &&
        createPortal(
          <AnchoredPopupCard
            office={activeOffice}
            company={activeCompany}
            onClose={() => onBackgroundClickRef.current?.()}
            onReadMore={() =>
              navigate(`/company/${encodeURIComponent(activeCompany.id)}`)
            }
          />,
          popupNode,
        )}
    </>
  );
}

interface AnchoredPopupCardProps {
  office: Office;
  company: Company;
  onClose: () => void;
  onReadMore: () => void;
}

function AnchoredPopupCard({
  office,
  company,
  onClose,
  onReadMore,
}: AnchoredPopupCardProps) {
  const { tag } = office;
  const summary = truncate(company.description, 150);
  return (
    <div
      className="gof-mapcard gof-mapcard-anchored"
      role="dialog"
      aria-label={`${company.name} — ${office.city}`}
    >
      <div className="gof-mapcard-body">
        <div className="gof-mapcard-head">
          <Monogram name={company.name} size={40} square />
          <div className="gof-flex-body">
            <div className="gof-mapcard-name-row">
              <span className="gof-mapcard-name">{company.name}</span>
              <span className={"gof-tag tag-" + tag.tone}>{tag.short}</span>
            </div>
            <div className="gof-mapcard-loc">
              <FlagChip code={office.countryCode} />
              <span>
                {office.city}, {office.country}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="gof-mapcard-close-inline"
            aria-label="Close office details"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {summary && <p className="gof-mapcard-desc">{summary}</p>}
        <div className="gof-mapcard-actions">
          <button type="button" className="gof-btn" onClick={onReadMore}>
            Read more
          </button>
          <Link
            to={`/country/${encodeURIComponent(office.country)}`}
            className="gof-mapcard-country"
          >
            View country
          </Link>
        </div>
      </div>
    </div>
  );
}

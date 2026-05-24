import { useEffect, useState } from "react";
import { MapView } from "../MapView";
import type { Office } from "../../types";
import {
  geocodeAddress,
  geocodeCacheKey,
  readGeocodeCache,
  resolveCoordinatesFromCatalog,
  writeGeocodeCache,
} from "../../utils/resolveOfficeCoordinates";

interface MiniMapViewProps {
  office: Office;
  companyName?: string;
  enabled?: boolean;
}

export default function MiniMapView({ office, companyName, enabled = true }: MiniMapViewProps) {
  const [geocoded, setGeocoded] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  const cacheKey = geocodeCacheKey(office);
  const cachedCoords = readGeocodeCache(cacheKey);
  const catalogCoords = resolveCoordinatesFromCatalog(office);
  const latitude =
    office.latitude ??
    catalogCoords?.latitude ??
    geocoded?.latitude ??
    cachedCoords?.latitude;
  const longitude =
    office.longitude ??
    catalogCoords?.longitude ??
    geocoded?.longitude ??
    cachedCoords?.longitude;
  const hasCoords = typeof latitude === "number" && typeof longitude === "number";

  useEffect(() => {
    if (!enabled || hasCoords || geocodeFailed || catalogCoords) return;

    const pollCache = () => {
      const cached = readGeocodeCache(cacheKey);
      if (cached) {
        setGeocoded({ latitude: cached.latitude, longitude: cached.longitude });
        setGeocodeFailed(false);
      }
    };

    const id = window.setInterval(pollCache, 1500);
    return () => window.clearInterval(id);
  }, [enabled, hasCoords, geocodeFailed, catalogCoords, cacheKey]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof office.latitude === "number" && typeof office.longitude === "number") return;
    if (catalogCoords) return;

    const cached = readGeocodeCache(cacheKey);
    if (cached) {
      setGeocoded({ latitude: cached.latitude, longitude: cached.longitude });
      setGeocodeFailed(false);
      return;
    }

    let cancelled = false;
    setGeocodeFailed(false);
    setGeocoded(null);

    geocodeAddress(office)
      .then((result) => {
        if (result) {
          writeGeocodeCache(cacheKey, result);
          if (!cancelled) {
            setGeocoded({ latitude: result.latitude, longitude: result.longitude });
            setGeocodeFailed(false);
          }
        } else if (!cancelled) {
          setGeocodeFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setGeocodeFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    cacheKey,
    catalogCoords,
    office.id,
    office.companyId,
    office.city,
    office.address,
    office.postalCode,
    office.latitude,
    office.longitude,
  ]);

  if (!enabled) {
    return <div className="mini-map-placeholder muted">Map loading…</div>;
  }

  if (!hasCoords) {
    return (
      <div className="mini-map-placeholder muted">
        {geocodeFailed
          ? "Could not resolve map location for this address."
          : "Resolving map location…"}
      </div>
    );
  }

  const mapOffice: Office = { ...office, latitude, longitude };

  return (
    <MapView
      offices={[mapOffice]}
      center={[latitude, longitude]}
      zoom={14}
      height="160px"
      autoFit
      companyName={companyName}
    />
  );
}

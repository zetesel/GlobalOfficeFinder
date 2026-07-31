import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import MapView from "../../src/components/MapView";
import type { Company, Office } from "../../src/types";

// Mock Leaflet properly for both default and named imports
vi.mock("leaflet", () => {
  const mapMock = {
    setView: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    once: vi.fn(),
    on: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    getZoom: vi.fn(() => 5),
    getCenter: vi.fn(() => ({ distanceTo: () => 1000 })),
    closePopup: vi.fn(),
  };

  const markerMock = {
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn(),
    bindTooltip: vi.fn(),
    openTooltip: vi.fn(),
    closeTooltip: vi.fn(),
    setZIndexOffset: vi.fn(),
    getElement: vi.fn(() => null),
    remove: vi.fn(),
  };

  const popupMock = {
    setLatLng: vi.fn().mockReturnThis(),
    setContent: vi.fn(function (content: HTMLElement) {
      if (content instanceof HTMLElement && !document.body.contains(content)) {
        document.body.appendChild(content);
      }
      return popupMock;
    }),
    openOn: vi.fn().mockReturnThis(),
  };

  const LMock = {
    map: vi.fn(() => mapMock),
    control: { zoom: vi.fn(() => ({ addTo: vi.fn() })) },
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    divIcon: vi.fn(() => ({})),
    marker: vi.fn(() => markerMock),
    latLngBounds: vi.fn(() => ({})),
    latLng: vi.fn(() => ({})),
    popup: vi.fn(() => popupMock),
  };

  return {
    default: LMock,
    ...LMock,
  };
});

const sampleCompany: Company = {
  id: "nestle",
  name: "Nestle S.A.",
  website: "https://nestle.com",
  industry: "Food & Beverage",
  description: "Swiss multinational conglomerate",
};

const sampleOffice: Office = {
  id: "vevey-hq",
  companyId: "nestle",
  country: "Switzerland",
  countryCode: "CH",
  region: "Europe",
  city: "Vevey",
  address: "Avenue Nestle 55",
  postalCode: "1800",
  officeType: "Headquarters",
  latitude: 46.46,
  longitude: 6.84,
  tag: { tone: "purple", short: "HQ" },
};

const companyById = { [sampleCompany.id]: sampleCompany };
const offices = [sampleOffice];

describe("MapView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders popup card when showPopup is true and activeId is set", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <MapView
          offices={offices}
          companyById={companyById}
          activeId="vevey-hq"
          showPopup={true}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Nestle S.A.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read more" })).toBeInTheDocument();
  });

  it("does NOT render popup card when showPopup is false", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <MapView
          offices={offices}
          companyById={companyById}
          activeId="vevey-hq"
          showPopup={false}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "Read more" })).not.toBeInTheDocument();
  });

  it("navigates to /company/:id without ?office= search param when clicking Read more", () => {
    let currentPath = "";

    function LocationTracker() {
      const loc = useLocation();
      currentPath = loc.pathname + loc.search;
      return <div>Path: {currentPath}</div>;
    }

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <MapView
                  offices={offices}
                  companyById={companyById}
                  activeId="vevey-hq"
                  showPopup={true}
                />
                <LocationTracker />
              </>
            }
          />
          <Route
            path="/company/:id"
            element={
              <>
                <div>Company Page Target</div>
                <LocationTracker />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const readMoreBtn = screen.getByRole("button", { name: "Read more" });
    fireEvent.click(readMoreBtn);

    expect(screen.getByText("Company Page Target")).toBeInTheDocument();
    expect(currentPath).toBe("/company/nestle");
    expect(currentPath).not.toContain("?office=");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StaticOfficeMap from "../../src/components/StaticOfficeMap";
import type { Office } from "../../src/types";

const mockOffice: Office = {
  id: "test-office-1",
  companyId: "test-co",
  country: "Poland",
  countryCode: "PL",
  region: "Europe",
  city: "Warsaw",
  address: "Aleje Jerozolimskie 100",
  postalCode: "00-001",
  officeType: "Headquarters",
  tone: "hq",
  tag: { short: "HQ", tone: "hq" },
  latitude: 52.2297,
  longitude: 21.0122,
};

describe("StaticOfficeMap", () => {
  it("renders map location container and badge", () => {
    const { container } = render(<StaticOfficeMap office={mockOffice} />);
    expect(container.querySelector(".gof-static-map")).toBeTruthy();
    expect(screen.getByText(/Map location · Warsaw/i)).toBeInTheDocument();
  });

  it("renders children overlayed on top of map", () => {
    render(
      <StaticOfficeMap office={mockOffice}>
        <span data-testid="custom-child">Overlay Tag</span>
      </StaticOfficeMap>,
    );
    expect(screen.getByTestId("custom-child")).toBeInTheDocument();
    expect(screen.getByText("Overlay Tag")).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FlagChip from "../../src/components/FlagChip";

describe("FlagChip", () => {
  it("renders the provided country code", () => {
    render(<FlagChip code="US" />);
    expect(screen.getByText("US")).toBeInTheDocument();
  });

  it("has the correct aria-label", () => {
    render(<FlagChip code="GB" />);
    const chip = screen.getByLabelText("Country code GB");
    expect(chip).toBeInTheDocument();
  });

  it("renders with different codes", () => {
    const { rerender } = render(<FlagChip code="FR" />);
    expect(screen.getByText("FR")).toBeInTheDocument();

    rerender(<FlagChip code="DE" />);
    expect(screen.getByText("DE")).toBeInTheDocument();
    expect(screen.getByLabelText("Country code DE")).toBeInTheDocument();
  });

  it("applies the gof-flagchip class", () => {
    render(<FlagChip code="JP" />);
    const chip = screen.getByText("JP");
    expect(chip).toHaveClass("gof-flagchip");
  });

  it("applies correct inline styles", () => {
    render(<FlagChip code="IT" />);
    const chip = screen.getByText("IT");

    const styleAttr = chip.getAttribute("style") || "";

    // Check key properties in style attribute string
    expect(styleAttr).toContain("display: inline-flex");
    expect(styleAttr).toContain("align-items: center");
    expect(styleAttr).toContain("justify-content: center");
    expect(styleAttr).toContain("min-width: 30px");
    expect(styleAttr).toContain("height: 20px");
    expect(styleAttr).toContain("font-weight: 700");
    expect(styleAttr).toContain("font-size: 11px");
    expect(styleAttr).toContain("color: #fff");
    expect(styleAttr).toContain("background: var(--ink)");
    expect(styleAttr).toContain("font-family: var(--font-head)");
  });
});

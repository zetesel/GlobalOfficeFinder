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

  it("has the correct CSS class name", () => {
    render(<FlagChip code="US" />);
    const chip = screen.getByText("US");
    expect(chip).toHaveClass("gof-flagchip");
  });

  it("applies the expected inline styles", () => {
    render(<FlagChip code="CA" />);
    const chip = screen.getByText("CA");

    // Using getAttribute('style') as it seems more reliable in this environment
    const style = chip.getAttribute("style");
    expect(style).toContain("display: inline-flex");
    expect(style).toContain("min-width: 30px");
    expect(style).toContain("height: 20px");
    expect(style).toContain("border-radius: 4px");
    expect(style).toContain("background: var(--ink)");
    expect(style).toContain("color: #fff");
    expect(style).toContain("font-family: var(--font-head)");
    expect(style).toContain("font-weight: 700");
    expect(style).toContain("font-size: 11px");
    expect(style).toContain("padding: 0px 6px");
  });

  it("renders correctly with an empty code", () => {
    const { container } = render(<FlagChip code="" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.getAttribute("aria-label")).toBe("Country code ");
    expect(chip.textContent).toBe("");
  });
});

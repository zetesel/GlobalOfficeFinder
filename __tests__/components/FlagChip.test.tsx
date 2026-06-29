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

  it("renders as a span with the correct class", () => {
    render(<FlagChip code="CA" />);
    const chip = screen.getByText("CA");
    expect(chip.tagName).toBe("SPAN");
    expect(chip).toHaveClass("gof-flagchip");
  });

  it("applies basic inline styles", () => {
    render(<FlagChip code="JP" />);
    const chip = screen.getByText("JP");

    expect(chip).toHaveStyle({
      display: "inline-flex",
      color: "#fff",
    });
  });
});

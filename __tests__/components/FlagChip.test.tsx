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
});

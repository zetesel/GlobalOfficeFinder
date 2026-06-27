import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Monogram from "../../src/components/Monogram";

describe("Monogram", () => {
  it("renders initials for a single word name", () => {
    render(<Monogram name="Google" />);
    expect(screen.getByText("GO")).toBeInTheDocument();
  });

  it("renders initials for a two-word name", () => {
    render(<Monogram name="Google Search" />);
    expect(screen.getByText("GS")).toBeInTheDocument();
  });

  it("renders initials for a name with more than two words", () => {
    render(<Monogram name="Google Search Engine" />);
    expect(screen.getByText("GS")).toBeInTheDocument();
  });

  it("handles delimiters in names", () => {
    const { rerender } = render(<Monogram name="Google-Search" />);
    expect(screen.getByText("GS")).toBeInTheDocument();

    rerender(<Monogram name="Google/Search" />);
    expect(screen.getByText("GS")).toBeInTheDocument();

    rerender(<Monogram name="Google&Search" />);
    expect(screen.getByText("GS")).toBeInTheDocument();
  });

  it("renders with default size", () => {
    render(<Monogram name="Google" />);
    const monogram = screen.getByText("GO");
    expect(monogram).toHaveStyle({
      width: "44px",
      height: "44px",
      fontSize: `${44 * 0.36}px`,
    });
  });

  it("renders with custom size", () => {
    render(<Monogram name="Google" size={100} />);
    const monogram = screen.getByText("GO");
    expect(monogram).toHaveStyle({
      width: "100px",
      height: "100px",
      fontSize: "36px",
    });
  });

  it("renders as a circle by default", () => {
    render(<Monogram name="Google" />);
    const monogram = screen.getByText("GO");
    expect(monogram).toHaveStyle({
      borderRadius: "50%",
    });
  });

  it("renders as a square with rounded corners when square prop is true", () => {
    const size = 100;
    render(<Monogram name="Google" size={size} square />);
    const monogram = screen.getByText("GO");
    expect(monogram).toHaveStyle({
      borderRadius: `${Math.round(size * 0.26)}px`,
    });
  });

  it("generates consistent styles for the same name", () => {
    const { rerender } = render(<Monogram name="Google" />);
    const firstRender = screen.getByText("GO");
    const firstStyle = firstRender.getAttribute("style");

    rerender(<Monogram name="Google" />);
    const secondRender = screen.getByText("GO");
    const secondStyle = secondRender.getAttribute("style");
    expect(secondStyle).toBe(firstStyle);
  });
});

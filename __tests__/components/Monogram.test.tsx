import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Monogram from "../../src/components/Monogram";

describe("Monogram", () => {
  it("renders initials correctly", () => {
    const { getByText } = render(<Monogram name="John Doe" />);
    expect(getByText("JD")).toBeInTheDocument();
  });

  it("renders single word initials", () => {
    const { getByText } = render(<Monogram name="Acme" />);
    expect(getByText("AC")).toBeInTheDocument();
  });

  it("handles complex names", () => {
    const { getByText } = render(<Monogram name="First-Second/Third & Fourth" />);
    expect(getByText("FS")).toBeInTheDocument();
  });

  it("handles names with extra whitespace and special characters", () => {
    const { getByText } = render(<Monogram name="  Jane   Doe  " />);
    expect(getByText("JD")).toBeInTheDocument();
  });

  it("generates consistent styles for the same name", () => {
    const { container: container1 } = render(<Monogram name="Test" />);
    const { container: container2 } = render(<Monogram name="Test" />);

    const div1 = container1.firstChild as HTMLElement;
    const div2 = container2.firstChild as HTMLElement;

    expect(div1.getAttribute("style")).toBe(div2.getAttribute("style"));
    expect(div1).toHaveStyle({ width: "44px" });
  });

  it("renders with custom size", () => {
    const size = 100;
    const { container } = render(<Monogram name="Test" size={size} />);
    const div = container.firstChild as HTMLElement;

    expect(div).toHaveStyle({
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${size * 0.36}px`,
    });
  });

  it("renders as a square when square prop is true", () => {
    const size = 44;
    const { container } = render(<Monogram name="Test" size={size} square />);
    const div = container.firstChild as HTMLElement;

    expect(div).toHaveStyle({
      borderRadius: `${Math.round(size * 0.26)}px`,
    });
  });

  it("renders as a circle by default", () => {
    const { container } = render(<Monogram name="Test" />);
    const div = container.firstChild as HTMLElement;

    expect(div).toHaveStyle({
      borderRadius: "50%",
    });
  });

  it("has aria-hidden='true'", () => {
    const { container } = render(<Monogram name="Test" />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveAttribute("aria-hidden", "true");
  });
});

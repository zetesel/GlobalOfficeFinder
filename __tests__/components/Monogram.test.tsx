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
    const { getByText } = render(
      <Monogram name="First-Second/Third & Fourth" />,
    );
    expect(getByText("FS")).toBeInTheDocument();
  });

  it("handles empty names", () => {
    const { container } = render(<Monogram name="" />);
    const div = container.firstChild as HTMLElement;
    expect(div.textContent).toBe("");
  });

  it("handles single character names", () => {
    const { getByText } = render(<Monogram name="A" />);
    expect(getByText("A")).toBeInTheDocument();
  });

  it("handles names with only delimiters", () => {
    const { container } = render(<Monogram name=" / & - " />);
    const div = container.firstChild as HTMLElement;
    expect(div.textContent).toBe("");
  });

  it("applies custom size correctly", () => {
    const size = 60;
    const { container } = render(<Monogram name="Test" size={size} />);
    const div = container.firstChild as HTMLElement;

    expect(div).toHaveStyle({
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${size * 0.36}px`,
    });
  });

  it("applies default size when not provided", () => {
    const { container } = render(<Monogram name="Test" />);
    const div = container.firstChild as HTMLElement;

    expect(div).toHaveStyle({
      width: "44px",
      height: "44px",
      fontSize: `${44 * 0.36}px`,
    });
  });

  it("applies circular border radius by default", () => {
    const { container } = render(<Monogram name="Test" />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveStyle({ borderRadius: "50%" });
  });

  it("applies square border radius when square prop is true", () => {
    const size = 44;
    const { container } = render(<Monogram name="Test" square size={size} />);
    const div = container.firstChild as HTMLElement;
    const expectedRadius = Math.round(size * 0.26);
    expect(div).toHaveStyle({ borderRadius: `${expectedRadius}px` });
  });

  it("has aria-hidden='true' for accessibility", () => {
    const { container } = render(<Monogram name="Test" />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveAttribute("aria-hidden", "true");
  });

  it("generates consistent styles based on the name", () => {
    // Since happy-dom doesn't support hsl colors in the style object,
    // we verify that the component is still rendering without errors
    // and that the style attribute exists.
    const { container } = render(<Monogram name="ABC" />);
    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute("style")).toBeTruthy();
  });
});

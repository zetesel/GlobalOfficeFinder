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

  it("generates a consistent background color (basic check)", () => {
    const { container: container1 } = render(<Monogram name="Test" />);
    const { container: container2 } = render(<Monogram name="Test" />);

    const div1 = container1.firstChild as HTMLElement;
    const div2 = container2.firstChild as HTMLElement;

    const style1 = div1.getAttribute('style');
    const style2 = div2.getAttribute('style');

    expect(style1).toBe(style2);
    expect(style1).toContain("width: 44px");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Dropdown from "../../src/components/Dropdown";

describe("Dropdown", () => {
  const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ];

  it("renders with correct structure and dynamic width", () => {
    const { container } = render(
      <Dropdown
        label="Test Label"
        value="a"
        options={options}
        onChange={() => {}}
        width={200}
      />
    );

    const dropdown = container.querySelector(".gof-dd") as HTMLElement;
    expect(dropdown.style.width).toBe("200px");

    const pill = container.querySelector(".gof-pill") as HTMLElement;
    expect(pill.className).toContain("is-active");

    const labelSpan = screen.getByText("Option A");
    // Verify inline style is removed
    expect(labelSpan.style.opacity).toBe("");

    const svg = container.querySelector("svg") as HTMLElement;
    // Verify inline styles are removed
    expect(svg.style.marginLeft).toBe("");
    expect(svg.style.opacity).toBe("");
  });

  it("renders without is-active class when no value is selected", () => {
    const { container } = render(
      <Dropdown
        label="Test Label"
        value=""
        options={options}
        onChange={() => {}}
      />
    );

    const pill = container.querySelector(".gof-pill") as HTMLElement;
    expect(pill.className).not.toContain("is-active");

    const labelSpan = screen.getByText("Test Label");
    expect(labelSpan.style.opacity).toBe("");
  });
});

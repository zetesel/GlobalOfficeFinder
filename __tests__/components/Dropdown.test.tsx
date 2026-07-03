import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Dropdown from "../../src/components/Dropdown";

describe("Dropdown", () => {
  const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ];
  const onChange = vi.fn();

  it("renders correctly with label", () => {
    const { getByText } = render(
      <Dropdown label="Test Dropdown" value="" options={options} onChange={onChange} />
    );
    expect(getByText("Test Dropdown")).toBeInTheDocument();
  });

  it("renders correctly with selected value", () => {
    const { getByText } = render(
      <Dropdown label="Test Dropdown" value="a" options={options} onChange={onChange} />
    );
    expect(getByText("Option A")).toBeInTheDocument();
  });

  it("applies the correct classes to label and chevron", () => {
    const { container } = render(
      <Dropdown label="Test Dropdown" value="" options={options} onChange={onChange} />
    );

    const labelSpan = container.querySelector(".gof-dd-label");
    expect(labelSpan).toBeInTheDocument();
    expect(labelSpan?.tagName.toLowerCase()).toBe("span");

    const chevronSvg = container.querySelector(".gof-dd-chevron");
    expect(chevronSvg).toBeInTheDocument();
    expect(chevronSvg?.tagName.toLowerCase()).toBe("svg");
  });

  it("does not have inline opacity or margin styles on label and chevron", () => {
    const { container } = render(
      <Dropdown label="Test Dropdown" value="" options={options} onChange={onChange} />
    );

    const labelSpan = container.querySelector(".gof-dd-label") as HTMLElement;
    expect(labelSpan.style.opacity).toBe("");

    const chevronSvg = container.querySelector(".gof-dd-chevron") as HTMLElement;
    expect(chevronSvg.style.marginLeft).toBe("");
    expect(chevronSvg.style.opacity).toBe("");
  });

  it("applies is-active class to button when value is present", () => {
    const { getByRole } = render(
      <Dropdown label="Test Dropdown" value="a" options={options} onChange={onChange} />
    );
    const button = getByRole("button");
    expect(button.className).toContain("is-active");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Dropdown from "../../src/components/Dropdown";

const options = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B", count: 5 },
];

describe("Dropdown", () => {
  it("renders with label when no value is selected", () => {
    render(
      <Dropdown
        label="Select something"
        value=""
        options={options}
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Select something")).toBeInTheDocument();
  });

  it("renders selected option label", () => {
    render(
      <Dropdown
        label="Select something"
        value="a"
        options={options}
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Option A")).toBeInTheDocument();
  });

  it("toggles menu on click", () => {
    render(
      <Dropdown
        label="Select something"
        value=""
        options={options}
        onChange={() => {}}
      />
    );
    const button = screen.getByRole("button", { name: "Select something" });
    fireEvent.click(button);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("calls onChange and closes menu when an option is clicked", () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        label="Select something"
        value=""
        options={options}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Select something" }));
    // The option text includes the count if present
    fireEvent.click(screen.getByRole("option", { name: /Option B/ }));

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes menu on Escape key", () => {
    render(
      <Dropdown
        label="Select something"
        value=""
        options={options}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Select something" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes menu on click outside", () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <Dropdown
          label="Select something"
          value=""
          options={options}
          onChange={() => {}}
        />
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: "Select something" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("applies width correctly for numeric values", () => {
    const { container } = render(
      <Dropdown
        label="Test"
        value=""
        options={options}
        onChange={() => {}}
        width={300}
      />
    );
    const element = container.firstChild as HTMLElement;
    expect(element.style.getPropertyValue("--dd-width")).toBe("300px");
  });

  it("applies width correctly for string values", () => {
    const { container } = render(
      <Dropdown
        label="Test"
        value=""
        options={options}
        onChange={() => {}}
        width="50%"
      />
    );
    const element = container.firstChild as HTMLElement;
    expect(element.style.getPropertyValue("--dd-width")).toBe("50%");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EndSearchModal from "../../src/components/EndSearchModal";

describe("EndSearchModal", () => {
  it("renders with the correct content", () => {
    render(<EndSearchModal onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("End discovery?")).toBeInTheDocument();
    expect(
      screen.getByText(/These results were discovered live/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yes, end search" }),
    ).toBeInTheDocument();
  });

  it("calls onConfirm when 'Yes, end search' is clicked", () => {
    const onConfirm = vi.fn();
    render(<EndSearchModal onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Yes, end search" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when 'Cancel' is clicked", () => {
    const onCancel = vi.fn();
    render(<EndSearchModal onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the backdrop is clicked", () => {
    const onCancel = vi.fn();
    render(<EndSearchModal onConfirm={vi.fn()} onCancel={onCancel} />);

    // The backdrop has role="presentation" and the onClick handler
    const backdrop = screen.getByRole("presentation");
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not call onCancel when the modal content is clicked", () => {
    const onCancel = vi.fn();
    render(<EndSearchModal onConfirm={vi.fn()} onCancel={onCancel} />);

    const modalContent = screen.getByRole("dialog");
    fireEvent.click(modalContent);
    expect(onCancel).not.toHaveBeenCalled();
  });
});

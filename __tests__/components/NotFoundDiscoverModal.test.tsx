import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotFoundDiscoverModal from "../../src/components/NotFoundDiscoverModal";

describe("NotFoundDiscoverModal", () => {
  it("renders the company name and both actions", () => {
    render(
      <NotFoundDiscoverModal
        companyName="Stripe"
        onConfirm={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText(/Stripe/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /discover offices/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /not now/i })).toBeInTheDocument();
  });

  it("fires onConfirm when the primary action is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <NotFoundDiscoverModal
        companyName="Klarna"
        onConfirm={onConfirm}
        onDismiss={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /discover offices/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("fires onDismiss on 'Not now' and on backdrop click", () => {
    const onDismiss = vi.fn();
    render(
      <NotFoundDiscoverModal
        companyName="Klarna"
        onConfirm={() => {}}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /not now/i }));
    // Backdrop is the presentation wrapper around the dialog.
    const backdrop = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("does not dismiss when clicking inside the dialog", () => {
    const onDismiss = vi.fn();
    render(
      <NotFoundDiscoverModal
        companyName="Klarna"
        onConfirm={() => {}}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

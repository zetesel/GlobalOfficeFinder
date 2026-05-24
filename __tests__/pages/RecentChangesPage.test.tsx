import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import RecentChangesPage from "../../src/pages/RecentChangesPage";
import reviewQueue from "../../data/scraper/review-queue.json";

function renderPage() {
  return render(
    <BrowserRouter>
      <RecentChangesPage />
    </BrowserRouter>,
  );
}

describe("RecentChangesPage", () => {
  it("shows operator-oriented summary and review queue CTA", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Recent Changes" })).toBeInTheDocument();
    expect(screen.getByText(/scraper discovers offices/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Review Queue" })).toHaveAttribute(
      "href",
      "/review-queue",
    );
  });

  it("shows human-readable stage labels", () => {
    renderPage();

    expect(screen.getAllByText("Companies scanned").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In review queue").length).toBeGreaterThan(0);
    expect(screen.queryByText("discoveredCompanies")).not.toBeInTheDocument();
  });

  it("explains when nothing was auto-published", () => {
    renderPage();

    expect(screen.getByText(/No offices were auto-published/i)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${reviewQueue.items.length} offices are waiting in the`)),
    ).toBeInTheDocument();
  });
});

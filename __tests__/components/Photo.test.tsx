import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Photo from "../../src/components/Photo";
import type { CompanyPhoto } from "../../src/types";

const realPhoto: CompanyPhoto = {
  url: "https://upload.wikimedia.org/example.jpg",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  author: "Jane Doe",
  license: "CC-BY-SA-4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  title: "Example HQ",
};

function renderPhoto(props: Parameters<typeof Photo>[0]) {
  return render(
    <MemoryRouter>
      <Photo {...props} />
    </MemoryRouter>,
  );
}

describe("Photo", () => {
  it("renders the real-photo badge with author + license when a photo is provided", () => {
    renderPhoto({ seed: "acme", photo: realPhoto, subject: "Acme" });
    expect(screen.getByText(/Photo: Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText(/CC-BY-SA-4\.0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Source" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "License" })).toBeInTheDocument();
  });

  it("renders the sample badge with subject when no photo is provided", () => {
    renderPhoto({ seed: "acme", subject: "Acme Corp" });
    expect(screen.getByText(/Sample image — does not depict Acme Corp/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /about the photos/i })).toBeInTheDocument();
  });

  it("uses Wikimedia URL when photo is provided", () => {
    const { container } = renderPhoto({ seed: "acme", photo: realPhoto });
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toBe(realPhoto.url);
  });

  it("uses Pexels CDN URL when no photo is provided", () => {
    const { container } = renderPhoto({ seed: "acme" });
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toMatch(/^https:\/\/images\.pexels\.com\/photos\/\d+/);
  });
});

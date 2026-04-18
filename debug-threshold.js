import Fuse from "fuse.js";

const companies = [
  {
    id: "amazon",
    name: "Amazon",
    website: "https://www.aboutamazon.com",
    industry: "E-Commerce / Cloud",
    description:
      "Amazon.com, Inc. is an American multinational technology company focusing on e-commerce, cloud computing, online advertising, digital streaming, and artificial intelligence.",
    logo: "",
  },
];

console.log('Testing different thresholds for Amazon + "technology":');

[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach((threshold) => {
  const fuse = new Fuse(companies, {
    keys: ["description"],
    threshold: threshold,
    includeScore: true,
  });

  const results = fuse.search("technology");
  console.log(
    `Threshold ${threshold}: ${results.length} matches${results.length > 0 ? ` (score: ${results[0].score.toFixed(4)})` : ""}`,
  );
});

import Fuse from "fuse.js";

const companies = [
  {
    id: "google",
    name: "Google",
    website: "https://about.google",
    industry: "Technology",
    description:
      "Google LLC is an American multinational technology company focusing on search engine technology, online advertising, cloud computing, computer software, quantum computing, e-commerce, and artificial intelligence.",
    logo: "",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    website: "https://www.microsoft.com",
    industry: "Technology",
    description:
      "Microsoft Corporation is an American multinational technology corporation which produces computer software, consumer electronics, personal computers, and related services.",
    logo: "",
  },
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

const fuse = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.2,
  includeScore: true,
});

console.log('Searching for "technology" in individual companies:');
companies.forEach((company) => {
  const result = fuse.search("technology", { limit: 1, includeMatches: true });
  const match = result.find((r) => r.item.id === company.id);
  if (match) {
    console.log(`✓ ${company.id} matches with score ${match.score.toFixed(4)}`);
  } else {
    console.log(`✗ ${company.id} does not match`);
    // Let's see what it DOES match
    const allResults = fuse.search("technology");
    console.log(
      `  All matches: ${allResults.map((r) => r.item.id).join(", ")}`,
    );
  }
});

console.log("\n--- Direct search results ---");
const allResults = fuse.search("technology");
console.log(`Total matches: ${allResults.length}`);
allResults.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
});

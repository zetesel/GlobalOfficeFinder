import Fuse from "fuse.js";

// Test Amazon's description in isolation
const amazonDesc =
  "Amazon.com, Inc. is an American multinational technology company focusing on e-commerce, cloud computing, online advertising, digital streaming, and artificial intelligence.";
console.log(`Amazon description: "${amazonDesc}"`);
console.log(`Contains "technology": ${amazonDesc.includes("technology")}`);

// Test with Fuse
const fuseAmazon = new Fuse([{ description: amazonDesc }], {
  keys: ["description"],
  threshold: 0.2,
  includeScore: true,
});

console.log('\nFuse search for "technology" in Amazon description alone:');
const amazonResults = fuseAmazon.search("technology");
console.log(`Matches: ${amazonResults.length}`);
amazonResults.forEach((r, i) => {
  console.log(`${i + 1}. Score: ${r.score.toFixed(4)}`);
});

// Test with lower threshold
const fuseAmazonLow = new Fuse([{ description: amazonDesc }], {
  keys: ["description"],
  threshold: 0.5,
  includeScore: true,
});

console.log(
  '\nFuse search for "technology" in Amazon description alone (threshold 0.5):',
);
const amazonResultsLow = fuseAmazonLow.search("technology");
console.log(`Matches: ${amazonResultsLow.length}`);
amazonResultsLow.forEach((r, i) => {
  console.log(`${i + 1}. Score: ${r.score.toFixed(4)}`);
});

// Test with the actual companies array but just Amazon
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

const fuseFull = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.2,
  includeScore: true,
});

console.log(
  '\nFuse search for "technology" in full Amazon object (threshold 0.2):',
);
const fullResults = fuseFull.search("technology");
console.log(`Matches: ${fullResults.length}`);
fullResults.forEach((r, i) => {
  console.log(`${i + 1}. ${r.item.id} - Score: ${r.score.toFixed(4)}`);
});

const fuseFullLow = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.5,
  includeScore: true,
});

console.log(
  '\nFuse search for "technology" in full Amazon object (threshold 0.5):',
);
const fullResultsLow = fuseFullLow.search("technology");
console.log(`Matches: ${fullResultsLow.length}`);
fullResultsLow.forEach((r, i) => {
  console.log(`${i + 1}. ${r.item.id} - Score: ${r.score.toFixed(4)}`);
});

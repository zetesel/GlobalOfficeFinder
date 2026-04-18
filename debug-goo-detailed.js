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
    id: "unilever",
    name: "Unilever",
    website: "https://www.unilever.com",
    industry: "Consumer Goods",
    description:
      "Unilever plc is a British multinational consumer goods company headquartered in London, England.",
    logo: "",
  },
];

const fuse = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.2,
  includeScore: true,
});

console.log('Searching for "Goo":');
const results = fuse.search("Goo");
console.log(`Found ${results.length} matches:`);
results.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
  console.log(`   Name: ${result.item.name}`);
  console.log(`   Industry: ${result.item.industry}`);
  console.log(`   Description: ${result.item.description}`);
  console.log("");

  // Check what's in each field that might match
  const nameLower = result.item.name.toLowerCase();
  const industryLower = result.item.industry.toLowerCase();
  const descLower = result.item.description.toLowerCase();
  const queryLower = "goo";

  console.log(`   Checking fields for "${queryLower}":`);
  console.log(
    `   - Name "${nameLower}" contains "${queryLower}": ${nameLower.includes(queryLower)}`,
  );
  console.log(
    `   - Industry "${industryLower}" contains "${queryLower}": ${industryLower.includes(queryLower)}`,
  );
  console.log(
    `   - Description "${descLower}" contains "${queryLower}": ${descLower.includes(queryLower)}`,
  );
  console.log("");
});

// Let's also try with a higher threshold to see if we can filter out Unilever
console.log("\n--- Trying threshold 0.5 ---");
const fuse2 = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.5,
  includeScore: true,
});

const results2 = fuse2.search("Goo");
console.log(`Found ${results2.length} matches with threshold 0.5:`);
results2.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
});

// And with even higher threshold
console.log("\n--- Trying threshold 0.8 ---");
const fuse3 = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.8,
  includeScore: true,
});

const results3 = fuse3.search("Goo");
console.log(`Found ${results3.length} matches with threshold 0.8:`);
results3.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
});

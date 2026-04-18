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

const fuse = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.2,
  includeScore: true,
});

console.log('Searching for "technology" in Amazon:');
const results = fuse.search("technology");
console.log(`Total matches: ${results.length}`);
results.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
  console.log(`   Name: ${result.item.name}`);
  console.log(`   Industry: ${result.item.industry}`);
  console.log(`   Description: ${result.item.description}`);
  console.log("");
});

// Let's also try with a higher threshold
console.log("\n--- Trying threshold 0.5 ---");
const fuse2 = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.5,
  includeScore: true,
});

const results2 = fuse2.search("technology");
console.log(`Total matches with threshold 0.5: ${results2.length}`);
results2.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
});

// And let's try searching for just "tech"
console.log('\n--- Searching for "tech" ---');
const fuse3 = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.2,
  includeScore: true,
});

const results3 = fuse3.search("tech");
console.log(`Total matches for "tech": ${results3.length}`);
results3.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
});

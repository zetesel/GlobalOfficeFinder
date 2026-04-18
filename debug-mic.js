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

console.log('Searching for "Mic":');
const resultsMic = fuse.search("Mic");
console.log(`Found ${resultsMic.length} matches for "Mic":`);
resultsMic.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
  console.log(`   Name: ${result.item.name}`);
  console.log(`   Industry: ${result.item.industry}`);
  console.log(
    `   Description: ${result.item.description.substring(0, 100)}...`,
  );
  console.log("");
});

console.log('Searching for "Goo":');
const resultsGoo = fuse.search("Goo");
console.log(`Found ${resultsGoo.length} matches for "Goo":`);
resultsGoo.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
  console.log(`   Name: ${result.item.name}`);
  console.log(`   Industry: ${result.item.industry}`);
  console.log(
    `   Description: ${result.item.description.substring(0, 100)}...`,
  );
  console.log("");
});

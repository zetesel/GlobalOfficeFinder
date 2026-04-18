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
  {
    id: "meta",
    name: "Meta",
    website: "https://about.meta.com",
    industry: "Technology / Social Media",
    description:
      "Meta Platforms, Inc. is an American multinational technology conglomerate that owns and operates Facebook, Instagram, Threads, and WhatsApp.",
    logo: "",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    website: "https://www.salesforce.com",
    industry: "Enterprise Software",
    description:
      "Salesforce, Inc. is an American cloud-based software company headquartered in San Francisco, California, providing customer relationship management software and applications.",
    logo: "",
  },
  {
    id: "ibm",
    name: "IBM",
    website: "https://www.ibm.com",
    industry: "Technology / Consulting",
    description:
      "International Business Machines Corporation is an American multinational technology company headquartered in Armonk, New York.",
    logo: "",
  },
  {
    id: "siemens",
    name: "Siemens",
    website: "https://www.siemens.com",
    industry: "Industrial / Technology",
    description:
      "Siemens AG is a German multinational conglomerate corporation and the largest industrial manufacturing company in Europe.",
    logo: "",
  },
  {
    id: "toyota",
    name: "Toyota",
    website: "https://global.toyota",
    industry: "Automotive",
    description:
      "Toyota Motor Corporation is a Japanese multinational automotive manufacturer headquartered in Toyota City, Aichi, Japan.",
    logo: "",
  },
  {
    id: "hsbc",
    name: "HSBC",
    website: "https://www.hsbc.com",
    industry: "Banking / Finance",
    description:
      "HSBC Holdings plc is a British universal bank and financial services holding company headquartered in London.",
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

console.log('Searching for "technology":');
const results = fuse.search("technology");
results.forEach((result, index) => {
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

console.log(`Total matches: ${results.length}`);

// Also let's check what happens with a lower threshold
console.log("\n--- Lowering threshold to 0.3 ---");
const fuse2 = new Fuse(companies, {
  keys: ["name", "industry", "description"],
  threshold: 0.3,
  includeScore: true,
});

const results2 = fuse2.search("technology");
console.log(`Total matches with threshold 0.3: ${results2.length}`);
results2.forEach((result, index) => {
  console.log(
    `${index + 1}. ${result.item.id} (score: ${result.score.toFixed(4)})`,
  );
});

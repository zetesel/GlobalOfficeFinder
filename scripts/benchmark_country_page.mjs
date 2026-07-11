import { readFileSync } from 'fs';
import { performance } from 'perf_hooks';

const offices = JSON.parse(readFileSync('./data/offices.json', 'utf8'));
const companies = JSON.parse(readFileSync('./data/companies.json', 'utf8'));

const countryCode = 'United States'; // Example country with many offices
const countryOffices = offices.filter(o => o.country === countryCode);
const uniqueCompanyIds = [...new Set(countryOffices.map(o => o.companyId))];

function originalLogic() {
    const results = [];
    for (const cid of uniqueCompanyIds) {
        const list = countryOffices.filter(o => o.companyId === cid);
        results.push({ cid, count: list.length });
    }
    return results;
}

function optimizedLogic() {
    const officesByCompany = Map.groupBy(countryOffices, o => o.companyId);
    const results = [];
    for (const cid of uniqueCompanyIds) {
        const list = officesByCompany.get(cid) || [];
        results.push({ cid, count: list.length });
    }
    return results;
}

// Warmup
for (let i = 0; i < 100; i++) {
    originalLogic();
    optimizedLogic();
}

const iterations = 1000;

let start = performance.now();
for (let i = 0; i < iterations; i++) {
    originalLogic();
}
let end = performance.now();
console.log(`Original Logic: ${(end - start).toFixed(4)}ms total for ${iterations} iterations (${((end - start) / iterations).toFixed(4)}ms per iteration)`);

start = performance.now();
for (let i = 0; i < iterations; i++) {
    optimizedLogic();
}
end = performance.now();
console.log(`Optimized Logic: ${(end - start).toFixed(4)}ms total for ${iterations} iterations (${((end - start) / iterations).toFixed(4)}ms per iteration)`);

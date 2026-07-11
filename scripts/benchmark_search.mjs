import { readFileSync } from 'fs';

const companies = JSON.parse(readFileSync('./data/companies.json', 'utf8'));
const offices = JSON.parse(readFileSync('./data/offices.json', 'utf8'));

const companyById = {};
for (const c of companies) companyById[c.id] = c;

const needles = ['london', 'tech', 'san francisco', 'software', 'paris', 'unknown'];

function baseline() {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
        for (const needle of needles) {
            offices.filter(o => {
                const co = companyById[o.companyId];
                if (!co) return false;
                const s = (
                    co.name +
                    " " +
                    co.industry +
                    " " +
                    o.city +
                    " " +
                    o.country
                ).toLowerCase();
                return s.includes(needle);
            });
        }
    }
    const end = performance.now();
    return end - start;
}

const enrichedOffices = offices.map(o => {
    const co = companyById[o.companyId];
    if (!co) return { ...o, searchText: '' };
    const searchText = (
        co.name +
        " " +
        co.industry +
        " " +
        o.city +
        " " +
        o.country
    ).toLowerCase();
    return { ...o, searchText };
});

function optimized() {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
        for (const needle of needles) {
            enrichedOffices.filter(o => o.searchText.includes(needle));
        }
    }
    const end = performance.now();
    return end - start;
}

const b = baseline();
console.log(`Baseline: ${b.toFixed(2)}ms`);
const o = optimized();
console.log(`Optimized: ${o.toFixed(2)}ms`);
console.log(`Improvement: ${((b - o) / b * 100).toFixed(2)}%`);

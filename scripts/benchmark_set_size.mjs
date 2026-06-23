const count = 1000000;
const data = Array.from({ length: count }, (_, i) => ({
  country: "Country " + (i % 100),
}));

console.log(`Benchmarking with ${count} items...`);

function original() {
  const t0 = performance.now();
  const size = new Set(data.map((o) => o.country)).size;
  const t1 = performance.now();
  return { size, time: t1 - t0 };
}

function optimized() {
  const t0 = performance.now();
  const set = new Set();
  for (let i = 0; i < data.length; i++) {
    set.add(data[i].country);
  }
  const size = set.size;
  const t1 = performance.now();
  return { size, time: t1 - t0 };
}

// Warmup
original();
optimized();

const runs = 10;
let totalOriginal = 0;
let totalOptimized = 0;

for (let i = 0; i < runs; i++) {
  totalOriginal += original().time;
  totalOptimized += optimized().time;
}

console.log(`Original average: ${(totalOriginal / runs).toFixed(4)}ms`);
console.log(`Optimized average: ${(totalOptimized / runs).toFixed(4)}ms`);
console.log(`Improvement: ${(((totalOriginal - totalOptimized) / totalOriginal) * 100).toFixed(2)}%`);

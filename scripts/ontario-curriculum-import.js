
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "data", "curriculum-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

let checked = 0;
let expectations = 0;
let errors = 0;

function report(message) {
  console.error("ERROR:", message);
  errors++;
}

for (const entry of manifest.shards) {
  if (!entry.filters?.jurisdictionIds?.includes("ca-on")) {
    continue;
  }

  const filePath = path.join(root, entry.path);

  if (!fs.existsSync(filePath)) {
    report(`Missing file: ${entry.path}`);
    continue;
  }

  const shard = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const standards = shard.standards || [];

  checked++;
  expectations += standards.length;

  if (standards.length !== entry.standardCount) {
    report(`${entry.id}: Manifest count does not match`);
  }

  const seen = new Set();

  for (const item of standards) {
    const code = String(item.standardCode || "");

    if (!/^[A-Z]\d+$/.test(code)) {
      report(`${entry.id}: Invalid overall expectation code ${code}`);
    }

    if (seen.has(code)) {
      report(`${entry.id}: Duplicate code ${code}`);
    }
    seen.add(code);

    if (!item.officialOutcomeText?.trim()) {
      report(`${entry.id}: Missing expectation wording for ${code}`);
    }

    const document = shard.documents?.[item.sourceDocumentId];

    if (!document?.sourceUrl?.startsWith("https://")) {
      report(`${entry.id}: Missing source URL for ${code}`);
    }

    if (typeof item.moduleSequence !== "number") {
      report(`${entry.id}: Missing moduleSequence for ${code}`);
    }
  }

  console.log(`CHECKED: ${entry.id} (${standards.length} expectations)`);
}
  

const kindergarten = manifest.shards.find(
  entry => entry.id === "ca-on-en-core-kindergarten-jk-sk"
);

if (kindergarten) {
  const filePath = path.join(root, kindergarten.path);

  if (fs.existsSync(filePath)) {
    const shard = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const standards = shard.standards || [];

    const expectedCodes = [
      ...Array.from({ length: 10 }, (_, i) => `A${i + 1}`),
      ...Array.from({ length: 3 }, (_, i) => `B${i + 11}`),
      ...Array.from({ length: 5 }, (_, i) => `C${i + 14}`),
      ...Array.from({ length: 7 }, (_, i) => `D${i + 19}`)
    ];

    const actualCodes = standards.map(item => item.standardCode);

    if (JSON.stringify(actualCodes) !== JSON.stringify(expectedCodes)) {
      report("Kindergarten expectations must be ordered A1–A10, B11–B13, C14–C18, D19–D25");
    }

    console.log("Kindergarten strand and expectation ordering checked.");
  }
}

console.log("\nOntario curriculum validation");
console.log("Files checked:", checked);
console.log("Overall expectations:", expectations);
console.log("Errors:", errors);

if (errors > 0) {
  process.exitCode = 1;
} else {
  console.log("PASS: Structural validation completed.");
}


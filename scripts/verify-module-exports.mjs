import fs from "node:fs";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const productionPath = "src/services/modules/production.service.ts";
if (!fs.existsSync(productionPath)) {
  fail(`Missing file: ${productionPath}`);
}

const source = fs.readFileSync(productionPath, "utf8");

const requiredExports = [
  "export function addProductionEvent",
  "export const createProductionEvent = addProductionEvent",
];

for (const token of requiredExports) {
  if (!source.includes(token)) {
    fail(`Required export contract missing in ${productionPath}: ${token}`);
  }
}

console.log("✅ Module export contract verified: production.service.ts");

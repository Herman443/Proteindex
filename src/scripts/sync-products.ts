import { loadEnvConfig } from "@next/env";
import { runProductSync } from "../lib/sync-products";
import { seedDemoData } from "../lib/demo-seed";

loadEnvConfig(process.cwd());

async function main() {
  const useDemo = process.argv.includes("--demo");

  if (useDemo) {
    console.log("Using demo dataset for MVP testing...");
    const result = await seedDemoData();
    console.log(JSON.stringify(result, null, 2));
  } else {
    const summary = await runProductSync();
    console.log(JSON.stringify(summary, null, 2));

    if (summary.status === "failed") {
      process.exitCode = 1;
    }
  }
}

void main();

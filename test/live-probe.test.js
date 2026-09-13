import test from "node:test";
import assert from "node:assert/strict";
import { WebSearchPlusProvider } from "../lib/provider.js";

test("Live probe against GCP free CPA endpoint returns full content and sources", async () => {
  const apiKey = process.env.CPA_API_KEY;
  if (!apiKey) {
    console.log("Skipping live probe: CPA_API_KEY is not set");
    return;
  }

  const provider = new WebSearchPlusProvider(() => ({
    baseURL: "http://100.78.146.24:8317/v1",
    apiKey,
    model: "gemini-3.7-flash-high",
    maxTokens: 2048,
    maxUses: 4
  }));

  const res = await provider.search({ query: "current UTC date time" });

  assert.ok(res.sources && res.sources.length > 0, "Should return search sources");
  assert.ok(res.content && res.content.length > 10, "Should return rich synthesized content");
  assert.equal(res.truncated, false);

  console.log("\n--- Live Probe Result ---");
  console.log("Sources Count:", res.sources.length);
  console.log("First Source:", res.sources[0]);
  console.log("Content Preview:", res.content.slice(0, 150).replace(/\n/g, " "));
  console.log("-------------------------\n");
});

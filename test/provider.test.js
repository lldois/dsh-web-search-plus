import test from "node:test";
import assert from "node:assert/strict";
import { WebSearchPlusProvider } from "../lib/provider.js";

test("WebSearchPlusProvider availability check", () => {
  const p1 = new WebSearchPlusProvider(() => ({ baseURL: "http://localhost", apiKey: "secret" }));
  assert.equal(p1.available(), true);

  const p2 = new WebSearchPlusProvider(() => ({ baseURL: "", apiKey: "secret" }));
  assert.equal(p2.available(), false);

  const p3 = new WebSearchPlusProvider(() => ({ baseURL: "http://localhost", resolveApiKey: () => "key" }));
  assert.equal(p3.available(), true);
});

test("WebSearchPlusProvider resolves API key from resolveApiKey or env", async () => {
  const p = new WebSearchPlusProvider();

  const key1 = await p.apiKey({ resolveApiKey: async () => "dynamic-key" });
  assert.equal(key1, "dynamic-key");

  process.env.TEST_CUSTOM_KEY = "env-secret-123";
  const key2 = await p.apiKey({ apiKeyEnv: "TEST_CUSTOM_KEY" });
  assert.equal(key2, "env-secret-123");
  delete process.env.TEST_CUSTOM_KEY;
});

test("WebSearchPlusProvider sends correct payload and parses response", async () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequest = null;

  globalThis.fetch = async (url, init) => {
    interceptedRequest = { url, init, body: JSON.parse(init.body) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          {
            type: "web_search_tool_result",
            content: [{ type: "web_search_result", url: "https://test.com", title: "Test Title" }]
          },
          {
            type: "text",
            text: "Mocked search answer"
          }
        ]
      })
    };
  };

  try {
    const provider = new WebSearchPlusProvider(() => ({
      baseURL: "https://proxy.example.com/v1",
      apiKey: "test-token",
      model: "gemini-test",
      maxTokens: 4096,
      maxUses: 8
    }));

    const result = await provider.search({ query: "deepseek news" });

    assert.ok(interceptedRequest);
    assert.equal(interceptedRequest.url, "https://proxy.example.com/v1/messages");
    assert.equal(interceptedRequest.init.headers["x-api-key"], "test-token");
    assert.equal(interceptedRequest.init.headers["authorization"], "Bearer test-token");
    assert.equal(interceptedRequest.body.model, "gemini-test");
    assert.equal(interceptedRequest.body.max_tokens, 4096);
    assert.equal(interceptedRequest.body.tools[0].max_uses, 8);
    assert.equal(interceptedRequest.body.tools[0].type, "web_search_20250305");

    assert.equal(result.content, "Mocked search answer");
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].url, "https://test.com");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

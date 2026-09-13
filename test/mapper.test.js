import test from "node:test";
import assert from "node:assert/strict";
import { mapAnthropicResponse, citationSnippets } from "../lib/mapper.js";

test("citationSnippets extracts cited_text by url", () => {
  const blocks = [
    {
      type: "text",
      text: "Some text",
      citations: [
        { type: "web_search_result_location", url: "https://example.com", cited_text: "Example snippet" },
        { type: "web_search_result_location", url: "https://foo.com", cited_text: "Foo snippet" }
      ]
    },
    {
      type: "text",
      text: "More text",
      citations: [
        { type: "web_search_result_location", url: "https://example.com", cited_text: "Duplicate url should not overwrite" }
      ]
    }
  ];

  const map = citationSnippets(blocks);
  assert.equal(map.get("https://example.com"), "Example snippet");
  assert.equal(map.get("https://foo.com"), "Foo snippet");
});

test("mapAnthropicResponse parses real CPA/Gemini web search response with full content and sources", () => {
  const cpaResponse = {
    id: "msg_12345",
    type: "message",
    role: "assistant",
    model: "gemini-3.7-flash",
    content: [
      {
        type: "server_tool_use",
        id: "srv_1",
        name: "web_search",
        input: { query: "current date" }
      },
      {
        type: "web_search_tool_result",
        tool_use_id: "srv_1",
        content: [
          {
            type: "web_search_result",
            title: "Time.gov Official Clock",
            url: "https://time.gov",
            page_age: "2026-09-13"
          },
          {
            type: "web_search_result",
            title: "TimeandDate UTC",
            url: "https://timeanddate.com/utc",
            page_age: null
          }
        ]
      },
      {
        type: "text",
        text: "Today's current UTC date is Sunday, September 13, 2026.",
        citations: [
          {
            type: "web_search_result_location",
            url: "https://time.gov",
            cited_text: "Official atomic clock source"
          }
        ]
      },
      {
        type: "text",
        text: "\n\n### Sources\n- [Time.gov](https://time.gov)"
      }
    ]
  };

  const result = mapAnthropicResponse(cpaResponse);

  assert.equal(result.truncated, false);
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].url, "https://time.gov");
  assert.equal(result.sources[0].title, "Time.gov Official Clock");
  assert.equal(result.sources[0].snippet, "Official atomic clock source");
  assert.equal(result.sources[0].publishedAt, "2026-09-13");

  assert.equal(result.sources[1].url, "https://timeanddate.com/utc");
  assert.equal(result.sources[1].title, "TimeandDate UTC");

  assert.ok(result.content);
  assert.ok(result.content.includes("Today's current UTC date is Sunday, September 13, 2026."));
  assert.ok(result.content.includes("### Sources"));
});

test("mapAnthropicResponse dedupes sources across multiple search tool results", () => {
  const multiSearchResponse = {
    content: [
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://a.com", title: "A1" }
        ]
      },
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://a.com", title: "A2 duplicate" },
          { type: "web_search_result", url: "https://b.com", title: "B" }
        ]
      },
      {
        type: "text",
        text: "Summary of multiple searches"
      }
    ]
  };

  const result = mapAnthropicResponse(multiSearchResponse);
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].url, "https://a.com");
  assert.equal(result.sources[0].title, "A1");
  assert.equal(result.sources[1].url, "https://b.com");
  assert.equal(result.content, "Summary of multiple searches");
});

test("mapAnthropicResponse throws on completely empty response", () => {
  assert.throws(() => {
    mapAnthropicResponse({ content: [] });
  }, /neither web_search_tool_result blocks nor synthesized text/);
});

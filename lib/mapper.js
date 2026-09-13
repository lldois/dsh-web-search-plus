/**
 * Map Anthropic-compatible Messages responses (Claude, CPA, Gemini reverse proxies, OneAPI)
 * to normalized DSH WebSearchResult objects, preserving both synthesized summary text and sources.
 */

export function citationSnippets(blocks = []) {
  const map = new Map();
  for (const block of blocks) {
    if (!block || block.type !== "text" || !Array.isArray(block.citations)) continue;
    for (const cite of block.citations) {
      if (cite.url && cite.cited_text && !map.has(cite.url)) {
        map.set(cite.url, cite.cited_text);
      }
    }
  }
  return map;
}

export function mapAnthropicResponse(response) {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid response body from web search endpoint");
  }

  const blocks = Array.isArray(response.content) ? response.content : [];
  const resultBlocks = blocks.filter((b) => b && b.type === "web_search_tool_result");

  const snippets = citationSnippets(blocks);

  const seen = new Set();
  const sources = [];

  for (const block of resultBlocks) {
    const items = Array.isArray(block.content) ? block.content : [];
    for (const item of items) {
      if (!item || item.type !== "web_search_result" || !item.url) continue;
      if (seen.has(item.url)) continue;
      seen.add(item.url);

      const snippet = snippets.get(item.url);
      sources.push({
        url: item.url,
        ...(item.title ? { title: item.title } : {}),
        ...(snippet ? { snippet } : {}),
        ...(item.page_age ? { publishedAt: item.page_age } : {}),
      });
    }
  }

  const contentBlocks = blocks
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text);

  const content = contentBlocks.join("").trim();

  if (resultBlocks.length === 0 && content.length === 0) {
    throw new Error(
      "Web search response contained neither web_search_tool_result blocks nor synthesized text content"
    );
  }

  return {
    ...(content.length > 0 ? { content } : {}),
    sources,
    truncated: false,
  };
}

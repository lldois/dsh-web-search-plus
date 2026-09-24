import { mapAnthropicResponse } from "./mapper.js";

let WebErrorClass = Error;
try {
  const mod = await import("@deepseek-ai/dsh-web");
  if (mod && mod.WebError) WebErrorClass = mod.WebError;
} catch {
  // Fallback when standalone
}

export class WebSearchPlusProvider {
  id = "web-search-plus";
  resolveOptions;

  constructor(resolveOptions) {
    this.resolveOptions = resolveOptions;
  }

  available() {
    const options = this.resolveOptions ? this.resolveOptions() : {};
    const key = (options.apiKey && options.apiKey.length > 0) || options.resolveApiKey !== undefined;
    const url = Boolean(options.baseURL && (typeof URL.canParse === "function" ? URL.canParse(options.baseURL) : options.baseURL.length > 0));
    return Boolean(key && url);
  }

  async apiKey(options, signal) {
    if (signal?.aborted) throw new WebErrorClass("Web search aborted", "WEB_ABORTED");
    if (options.apiKey && options.apiKey.length > 0) return options.apiKey;
    if (options.resolveApiKey) {
      const res = await options.resolveApiKey();
      if (res && res.length > 0) return res;
    }
    const envKey =
      process.env[options.apiKeyEnv || "WEB_SEARCH_API_KEY"] ||
      process.env.WEB_SEARCH_API_KEY ||
      process.env.CPA_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.DEEPSEEK_API_KEY;

    if (envKey && envKey.length > 0) return envKey;

    throw new WebErrorClass(
      `Web search plus has no API key. Please configure apiKey or set ${options.apiKeyEnv || "WEB_SEARCH_API_KEY"}`,
      "WEB_PROVIDER_CREDENTIAL_MISSING"
    );
  }

  async search(request, signal) {
    if (signal?.aborted) throw new WebErrorClass("Web search aborted", "WEB_ABORTED");

    const options = this.resolveOptions ? this.resolveOptions() : {};
    const apiKey = await this.apiKey(options, signal);

    if (signal?.aborted) throw new WebErrorClass("Web search aborted", "WEB_ABORTED");

    let baseURL =
      options.baseURL ||
      process.env.WEB_SEARCH_BASE_URL ||
      process.env.CPA_BASE_URL ||
      "https://api.anthropic.com/v1";
    baseURL = baseURL.replace(/\/+$/, "");

    const endpoint = baseURL.endsWith("/messages")
      ? baseURL
      : `${baseURL}/messages`;

    const model = options.model || process.env.WEB_SEARCH_MODEL || "gemini-3.7-flash-high";
    const maxTokens = options.maxTokens || 8192;
    const maxUses = options.maxUses || 8;
    const apiVersion = options.apiVersion || "2023-06-01";

    const body = {
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Perform a web search for the query: ${request.query}`,
            },
          ],
        },
      ],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: maxUses,
        },
      ],
    };

    options.recordRequest?.({
      endpoint,
      apiVersion,
      body,
    });

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        redirect: "error",
        headers: {
          "x-api-key": apiKey,
          authorization: `Bearer ${apiKey}`,
          "anthropic-version": apiVersion,
          "content-type": "application/json",
          accept: "application/json",
          "user-agent": "dsh-web-search-plus/0.1.0",
        },
        body: JSON.stringify(body),
        ...(signal ? { signal } : {}),
      });
    } catch (err) {
      if (signal?.aborted) throw new WebErrorClass("Web search aborted", "WEB_ABORTED", { cause: err });
      throw new WebErrorClass(`Web search request failed: ${String(err)}`, "WEB_PROVIDER_ERROR", { cause: err });
    }

    if (!response.ok) {
      let errDetail = "";
      try {
        const errJson = await response.json();
        errDetail = typeof errJson.error === "string" ? errJson.error : errJson.error?.message ?? errJson.message ?? "";
      } catch {
        // ignore
      }
      throw new WebErrorClass(
        `Web search endpoint returned HTTP ${response.status}${errDetail ? `: ${errDetail}` : ""}`,
        "WEB_PROVIDER_ERROR"
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new WebErrorClass(`Failed to parse web search response JSON: ${String(err)}`, "WEB_PROVIDER_ERROR", { cause: err });
    }

    try {
      return mapAnthropicResponse(data);
    } catch (err) {
      if (err instanceof WebErrorClass) throw err;
      throw new WebErrorClass(err.message, "WEB_PROVIDER_ERROR", { cause: err });
    }
  }
}
